/**
 * Proves the database privacy rules, using the real migration in an in-memory Postgres (PGlite).
 * Supabase's auth schema is stubbed with the same shape: auth.users and auth.uid().
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { beforeEach, describe, expect, it } from "vitest";

const MIGRATION = readFileSync(join(__dirname, "../migrations/0001_init.sql"), "utf8");

const AUTH_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text not null);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claims', true)::json->>'sub', '')::uuid
  $$;
  grant usage on schema auth to anon, authenticated;
  grant usage on schema public to anon, authenticated;
`;

let db: PGlite;

async function asSuper() {
  await db.exec("reset role; select set_config('request.jwt.claims', '', false);");
}
async function asUser(id: string) {
  await db.exec(`set role authenticated; select set_config('request.jwt.claims', '{"sub":"${id}"}', false);`);
}
async function asAnon() {
  await db.exec("set role anon; select set_config('request.jwt.claims', '', false);");
}

async function signUp(email: string): Promise<string> {
  await asSuper();
  const r = await db.query<{ id: string }>("insert into auth.users (email) values ($1) returning id", [
    email,
  ]);
  return r.rows[0]!.id;
}
async function allow(email: string, role = "teacher") {
  await asSuper();
  await db.query("insert into public.allowed_emails (email, role) values ($1, $2)", [email, role]);
}
async function classroomOf(id: string): Promise<string> {
  await asSuper();
  const r = await db.query<{ id: string }>("select id from public.classrooms where teacher_id = $1", [id]);
  return r.rows[0]!.id;
}
async function addResult(teacher: string, classroom: string, at = "now()") {
  const session = crypto.randomUUID();
  await db.query(
    `insert into public.sessions (id, classroom_id, teacher_id, game, mode, play, started_at)
     values ($1, $2, $3, 'summit-math', 'add', 'board', ${at})`,
    [session, classroom, teacher],
  );
  await db.query(
    `insert into public.item_attempts (id, session_id, classroom_id, teacher_id, item_key, skill, correct, mistake, at)
     values ($1, $2, $3, $4, 'add:38+25', '2.NBT.B.5', false, 'forgot-to-regroup', ${at})`,
    [crypto.randomUUID(), session, classroom, teacher],
  );
  return session;
}
const count = async (sql: string) =>
  (await db.query<{ n: number }>(`select count(*)::int as n from ${sql}`)).rows[0]!.n;

let lauren: string;
let other: string;
let admin: string;
let laurenClass: string;
let otherClass: string;

beforeEach(async () => {
  db = new PGlite();
  await db.exec(AUTH_STUB);
  await db.exec(MIGRATION);
  await allow("lauren@example.com");
  await allow("other@example.com");
  await allow("admin@example.com", "admin");
  lauren = await signUp("Lauren@Example.com");
  other = await signUp("other@example.com");
  admin = await signUp("admin@example.com");
  laurenClass = await classroomOf(lauren);
  otherClass = await classroomOf(other);
  await asUser(lauren);
  await addResult(lauren, laurenClass);
  await asUser(other);
  await addResult(other, otherClass);
}, 30_000);

describe("sign up", () => {
  it("blocks emails that are not on the allowlist", async () => {
    await expect(signUp("stranger@example.com")).rejects.toThrow(/not approved/);
  });

  it("creates a teacher row and a first class for approved emails", async () => {
    await asSuper();
    expect(await count(`public.teachers where id = '${lauren}' and not is_admin`)).toBe(1);
    expect(await count(`public.teachers where id = '${admin}' and is_admin`)).toBe(1);
    expect(laurenClass).toBeTruthy();
  });
});

describe("a teacher sees only their own rows", () => {
  for (const table of ["classrooms", "sessions", "item_attempts", "teachers"]) {
    it(`${table}: only their own`, async () => {
      await asUser(lauren);
      const col = table === "teachers" ? "id" : "teacher_id";
      expect(await count(`public.${table}`)).toBe(1);
      expect(await count(`public.${table} where ${col} = '${other}'`)).toBe(0);
    });
  }

  it("cannot write results into another teacher's class", async () => {
    await asUser(lauren);
    // Claiming to be the other teacher: blocked by row level security.
    await expect(addResult(other, otherClass)).rejects.toThrow(/row-level security/);
    // Their own id with someone else's class: blocked because the class isn't theirs.
    await expect(addResult(lauren, otherClass)).rejects.toThrow();
  });

  it("cannot change or delete another teacher's rows", async () => {
    await asUser(lauren);
    await db.exec(`update public.classrooms set name = 'hacked' where id = '${otherClass}'`);
    await db.exec(`delete from public.item_attempts where teacher_id = '${other}'`);
    await asSuper();
    expect(await count(`public.classrooms where name = 'hacked'`)).toBe(0);
    expect(await count(`public.item_attempts where teacher_id = '${other}'`)).toBe(1);
  });

  it("cannot make themselves an admin", async () => {
    await asUser(lauren);
    await expect(
      db.exec(`update public.teachers set is_admin = true where id = '${lauren}'`),
    ).rejects.toThrow(/permission denied/);
  });

  it("cannot read or change the allowlist", async () => {
    await asUser(lauren);
    expect(await count("public.allowed_emails")).toBe(0);
    await expect(
      db.exec("insert into public.allowed_emails (email) values ('friend@example.com')"),
    ).rejects.toThrow(/row-level security/);
  });
});

describe("admin", () => {
  it("can manage the allowlist", async () => {
    await asUser(admin);
    expect(await count("public.allowed_emails")).toBe(3);
    await db.exec("insert into public.allowed_emails (email) values ('new@example.com')");
    expect(await count("public.allowed_emails")).toBe(4);
  });

  it("can read every teacher's results", async () => {
    await asUser(admin);
    expect(await count("public.item_attempts")).toBe(2);
    expect(await count("public.teachers")).toBe(3);
  });

  it("cannot change or delete another teacher's results", async () => {
    await asUser(admin);
    await db.exec(`delete from public.item_attempts where teacher_id = '${lauren}'`);
    await db.exec(`update public.classrooms set name = 'changed' where id = '${laurenClass}'`);
    await asSuper();
    expect(await count(`public.item_attempts where teacher_id = '${lauren}'`)).toBe(1);
    expect(await count(`public.classrooms where name = 'changed'`)).toBe(0);
  });
});

describe("signed out visitors", () => {
  it("can read nothing", async () => {
    await asAnon();
    for (const t of ["teachers", "classrooms", "item_attempts", "allowed_emails"]) {
      await expect(db.exec(`select * from public.${t}`)).rejects.toThrow(/permission denied/);
    }
  });
});

describe("keep alive ping", () => {
  it("anyone can call it, and it reveals nothing", async () => {
    await asAnon();
    const r = await db.query<{ ping: number }>("select public.ping()");
    expect(r.rows[0]!.ping).toBe(1);
  });
});

describe("removing someone from the allowlist", () => {
  it("cuts off their access right away", async () => {
    await asSuper();
    await db.exec("delete from public.allowed_emails where email = 'lauren@example.com'");
    await asUser(lauren);
    expect(await count("public.item_attempts")).toBe(0);
    expect(await count("public.classrooms")).toBe(0);
  });
});

describe("deleting", () => {
  it("deleting a class removes its results", async () => {
    await asUser(lauren);
    await db.exec(`delete from public.classrooms where id = '${laurenClass}'`);
    await asSuper();
    expect(await count(`public.item_attempts where teacher_id = '${lauren}'`)).toBe(0);
    expect(await count(`public.sessions where teacher_id = '${lauren}'`)).toBe(0);
  });

  it("delete my account removes everything for that teacher only", async () => {
    await asUser(lauren);
    await db.exec("select public.delete_my_account()");
    await asSuper();
    for (const t of ["teachers where id", "classrooms where teacher_id", "item_attempts where teacher_id"]) {
      expect(await count(`public.${t} = '${lauren}'`)).toBe(0);
    }
    expect(await count(`auth.users where id = '${lauren}'`)).toBe(0);
    expect(await count(`public.item_attempts where teacher_id = '${other}'`)).toBe(1);
  });

  it("results older than 13 months are purged", async () => {
    await asUser(lauren);
    await addResult(lauren, laurenClass, "now() - interval '14 months'");
    await addResult(lauren, laurenClass, "now() - interval '12 months'");
    await asSuper();
    await db.exec("select public.purge_old_attempts()");
    expect(await count(`public.item_attempts where teacher_id = '${lauren}'`)).toBe(2);
    expect(await count(`public.sessions where started_at < now() - interval '13 months'`)).toBe(0);
  });

  it("teachers cannot run the purge themselves", async () => {
    await asUser(lauren);
    await expect(db.exec("select public.purge_old_attempts()")).rejects.toThrow(/permission denied/);
  });
});

describe("student privacy limits", () => {
  it("first name max 20 characters, last initial one letter", async () => {
    await asUser(lauren);
    const insert = (name: string, initial: string | null) =>
      db.query(
        "insert into public.students (classroom_id, teacher_id, first_name, last_initial) values ($1, $2, $3, $4)",
        [laurenClass, lauren, name, initial],
      );
    await expect(insert("Ava", "F")).resolves.toBeTruthy();
    await expect(insert("A".repeat(21), null)).rejects.toThrow(/check/);
    await expect(insert("Ava", "Fr")).rejects.toThrow(/check/);
  });
});
