-- Classcade database, step 3.
-- Every row a teacher owns carries teacher_id (and classroom_id where it belongs to a class).
-- Row level security lets a signed in teacher read and write only their own rows.
-- Admins can also manage who may sign in, and can READ (never change) every teacher's rows.
-- Paste this whole file into the Supabase SQL editor once. See README "Set up Supabase".

-- ---------------------------------------------------------------------------
-- Who may sign in
-- ---------------------------------------------------------------------------
create table public.allowed_emails (
  email text primary key check (email = lower(email) and email like '%@%' and char_length(email) <= 254),
  role text not null default 'teacher' check (role in ('teacher', 'admin')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Teachers and their classes
-- ---------------------------------------------------------------------------
create table public.teachers (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text check (char_length(display_name) <= 60),
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.classrooms (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers (id) on delete cascade,
  name text not null default 'My class' check (char_length(name) between 1 and 60),
  theme text not null default 'national-parks' check (char_length(theme) <= 40),
  settings jsonb not null default '{}'::jsonb check (pg_column_size(settings) < 8000),
  settings_updated_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, teacher_id)
);

-- First name (max 20) and optional last initial. Nothing else about a student, ever.
-- Not used yet: the class list stays on the board for now (docs/plan.md, section 3).
create table public.students (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null,
  teacher_id uuid not null,
  first_name text not null check (char_length(first_name) between 1 and 20),
  last_initial text check (last_initial ~ '^[A-Za-z]$'),
  created_at timestamptz not null default now(),
  unique (id, classroom_id),
  foreign key (classroom_id, teacher_id) references public.classrooms (id, teacher_id) on delete cascade
);

-- Lauren's own spelling lists and questions (used by later games).
create table public.custom_content (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null,
  teacher_id uuid not null,
  game text not null check (char_length(game) <= 40),
  type text not null check (char_length(type) <= 40),
  payload jsonb not null check (pg_column_size(payload) < 20000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (classroom_id, teacher_id) references public.classrooms (id, teacher_id) on delete cascade
);

-- ---------------------------------------------------------------------------
-- Results from the board. Ids are made on the board so a retry never duplicates.
-- ---------------------------------------------------------------------------
create table public.sessions (
  id uuid primary key,
  classroom_id uuid not null,
  teacher_id uuid not null,
  game text not null check (char_length(game) <= 40),
  mode text not null check (char_length(mode) <= 40),
  play text not null check (play in ('board', 'teams', 'split')),
  started_at timestamptz not null,
  unique (id, classroom_id, teacher_id),
  foreign key (classroom_id, teacher_id) references public.classrooms (id, teacher_id) on delete cascade
);

create table public.item_attempts (
  id uuid primary key,
  session_id uuid not null,
  classroom_id uuid not null,
  teacher_id uuid not null,
  item_key text not null check (char_length(item_key) <= 60),
  skill text not null check (char_length(skill) <= 20),
  correct boolean not null,
  mistake text check (char_length(mistake) <= 40),
  team smallint check (team in (0, 1)),
  student_id uuid,
  at timestamptz not null,
  foreign key (session_id, classroom_id, teacher_id)
    references public.sessions (id, classroom_id, teacher_id) on delete cascade,
  foreign key (student_id, classroom_id) references public.students (id, classroom_id) on delete cascade
);
create index item_attempts_teacher_at on public.item_attempts (teacher_id, at);
create index item_attempts_classroom_at on public.item_attempts (classroom_id, at);

-- ---------------------------------------------------------------------------
-- Helpers (security definer so policies can use them without exposing tables)
-- ---------------------------------------------------------------------------

-- Signed in AND still on the allowlist. Removing an email cuts off access right away.
create or replace function public.is_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.teachers t
    join public.allowed_emails a on a.email = lower(t.email)
    where t.id = auth.uid()
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.teachers t
    join public.allowed_emails a on a.email = lower(t.email)
    where t.id = auth.uid() and a.role = 'admin'
  );
$$;

-- Block sign up for anyone not on the allowlist.
create or replace function public.check_allowed_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.allowed_emails where email = lower(new.email)) then
    raise exception 'This email is not approved for Classcade.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

-- New teacher: create their teacher row and a first class.
create or replace function public.handle_new_teacher()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.teachers (id, email, is_admin)
  values (
    new.id,
    lower(new.email),
    exists (select 1 from public.allowed_emails where email = lower(new.email) and role = 'admin')
  );
  insert into public.classrooms (teacher_id) values (new.id);
  return new;
end;
$$;

create trigger before_auth_user_created
  before insert on auth.users
  for each row execute function public.check_allowed_email();

create trigger after_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_teacher();

-- Hard delete of everything for the signed in teacher: account, classes, results.
create or replace function public.delete_my_account()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.users where id = auth.uid();
$$;

-- Results older than 13 months are deleted. Scheduled nightly in 0002_retention.sql.
create or replace function public.purge_old_attempts()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.item_attempts where at < now() - interval '13 months';
  delete from public.sessions s
  where s.started_at < now() - interval '13 months'
    and not exists (select 1 from public.item_attempts a where a.session_id = s.id);
$$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.allowed_emails enable row level security;
alter table public.teachers enable row level security;
alter table public.classrooms enable row level security;
alter table public.students enable row level security;
alter table public.custom_content enable row level security;
alter table public.sessions enable row level security;
alter table public.item_attempts enable row level security;

create policy admins_manage_allowlist on public.allowed_emails
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy own_teacher_row on public.teachers
  for select to authenticated
  using (id = auth.uid() and public.is_active());
create policy update_own_teacher_row on public.teachers
  for update to authenticated
  using (id = auth.uid() and public.is_active())
  with check (id = auth.uid());

create policy own_rows on public.classrooms
  for all to authenticated
  using (teacher_id = auth.uid() and public.is_active())
  with check (teacher_id = auth.uid() and public.is_active());
create policy own_rows on public.students
  for all to authenticated
  using (teacher_id = auth.uid() and public.is_active())
  with check (teacher_id = auth.uid() and public.is_active());
create policy own_rows on public.custom_content
  for all to authenticated
  using (teacher_id = auth.uid() and public.is_active())
  with check (teacher_id = auth.uid() and public.is_active());
create policy own_rows on public.sessions
  for all to authenticated
  using (teacher_id = auth.uid() and public.is_active())
  with check (teacher_id = auth.uid() and public.is_active());
create policy own_rows on public.item_attempts
  for all to authenticated
  using (teacher_id = auth.uid() and public.is_active())
  with check (teacher_id = auth.uid() and public.is_active());

-- Admins can READ every teacher's rows (to help and to check things are working).
-- They cannot change or delete another teacher's data. Policies combine with OR.
create policy admin_read on public.teachers for select to authenticated using (public.is_admin());
create policy admin_read on public.classrooms for select to authenticated using (public.is_admin());
create policy admin_read on public.students for select to authenticated using (public.is_admin());
create policy admin_read on public.custom_content for select to authenticated using (public.is_admin());
create policy admin_read on public.sessions for select to authenticated using (public.is_admin());
create policy admin_read on public.item_attempts for select to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Grants: nothing for signed out visitors; signed in teachers go through the policies above.
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;

grant select, insert, update, delete on
  public.allowed_emails, public.classrooms, public.students, public.custom_content,
  public.sessions, public.item_attempts
  to authenticated;
grant select on public.teachers to authenticated;
-- Teachers can change their display name, never their admin flag.
grant update (display_name) on public.teachers to authenticated;

grant execute on function public.is_active() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.delete_my_account() to authenticated;

-- Keep alive: a scheduled GitHub Action calls this twice a week so the free project
-- doesn't pause from inactivity. It reads no data.
create or replace function public.ping()
returns integer
language sql
stable
set search_path = ''
as $$
  select 1;
$$;
grant execute on function public.ping() to anon, authenticated;
