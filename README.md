# Classcade

Touchscreen learning games for a 2nd grade classroom, played on an interactive
projector. National parks theme: every right answer moves the class's hiker up the trail.

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

No environment variables are needed until step 3.

## Project rules

`CLAUDE.md` holds the rules for this repo: the bar every game must meet, privacy, and how
we work. Anyone (or any AI assistant) changing code should read it first.
