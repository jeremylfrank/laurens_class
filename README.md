# Classcade

Touchscreen learning games for a 2nd grade classroom, played on an interactive
projector. National parks theme: every right answer moves the class's hiker up the trail.

Live at https://classcade-app.vercel.app (pull requests also get their own preview links).

See `docs/plan.md` for the plan and `docs/privacy.md` for what data is stored.

## Run it on your computer

You need Node 22 and pnpm.

```bash
pnpm install
```

```bash
pnpm dev
```

Then open http://localhost:3000.

## Checks (CI runs all of these on every PR)

```bash
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm build
```

```bash
pnpm e2e
```

`pnpm e2e` runs the browser tests at board size (1920x1080) with touch turned on. The first
time, install the browser with `pnpm exec playwright install chromium`.

## Deploy a preview (one time setup)

1. Sign in at vercel.com with GitHub (free Hobby plan).
2. Add New, Project, import this repository. Vercel detects Next.js; keep the defaults.
3. Every PR then gets its own preview link, posted on the PR.

The board works with no environment variables. Accounts need the Supabase setup below.

## Project rules

`CLAUDE.md` holds the rules for this repo: the bar every game must meet, privacy, and how
we work. Anyone (or any AI assistant) changing code should read it first.

## Set up Supabase and Google sign in (one time)

Do these in order. Steps 1 to 4 take about 20 minutes. Nothing here goes in the code.

### 1. Create the database tables

1. Supabase dashboard > **Database > Extensions**: search for `pg_cron` and enable it.
2. **SQL Editor > New query**: paste all of `supabase/migrations/0001_init.sql`, click **Run**.
3. New query: paste `supabase/migrations/0002_retention.sql`, click **Run**. This deletes results older than 13 months every night.
4. New query: add yourself as the admin and Lauren as a teacher (use the real Google addresses):

```sql
insert into public.allowed_emails (email, role) values
  ('your.address@gmail.com', 'admin'),
  ('laurens.address@gmail.com', 'teacher');
```

Use lowercase. After this you can add or remove people from the Teacher page instead.

### 2. Make Google sign in keys

1. Go to console.cloud.google.com and create a project called Classcade.
2. **APIs & Services > OAuth consent screen**: choose **External**, app name Classcade, your email as support and developer contact. Save.
3. On the same screen, under **Test users** (or **Audience**), add your Google address and Lauren's. While the app is in "Testing", only these people can sign in, which is what we want.
4. **APIs & Services > Credentials > Create credentials > OAuth client ID** > Web application.
   Under **Authorized redirect URIs** add `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`
   (Supabase shows this exact address on its Google provider page). Create, then copy the **Client ID** and **Client secret**.

### 3. Turn on Google in Supabase

1. **Authentication > Sign In / Providers > Google**: turn on, paste the Client ID and Client secret, save.
2. **Authentication > URL Configuration**:
   - Site URL: `https://classcade-app.vercel.app`
   - Redirect URLs: add `https://classcade-app.vercel.app/**`, `http://localhost:3000/**`, and for PR previews `https://*-jeremylfranks-projects.vercel.app/**`

### 4. Give Vercel the two public values

1. Supabase > **Project Settings > API** (or **API Keys**): copy the Project URL and the anon (or publishable) key.
2. Vercel > Classcade > **Settings > Environment Variables**: add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for Production and Preview.
3. Vercel > **Deployments** > the latest one > **Redeploy**. The values are built into the app, so this step is required.

Never paste a "secret" or "service_role" key anywhere. This app doesn't use one.

### 5. Keep the database awake over breaks

GitHub > this repo > **Settings > Secrets and variables > Actions** > add `SUPABASE_URL` and
`SUPABASE_ANON_KEY` (same two values). The "Keep Supabase awake" workflow then pings twice a week.
You can run it by hand from the **Actions** tab to check it works.

### If Supabase pauses

The board keeps working; results wait on the board. To wake it: Supabase dashboard > the project > **Restore project**. It takes a few minutes. Then open the board once while online and results catch up.

### Using it

- On **Lauren's laptop**: open `/teacher`, sign in. That's where "This week" lives.
- On **the board's computer**: open `/teacher` once and sign in too, then go back to the board. Results from the board then save to her account. Teacher > settings on the board shows whether results are saving.
- As **admin** you can pick any teacher on the Teacher page and read their class results (read only), and manage who can sign in.
