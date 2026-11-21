# Classcade: rules for working in this repo

Touchscreen learning games for one 2nd grade classroom (Lauren Frank), played on an
Epson BrightLink multi touch projector. Built so more teachers could be added later, but
build only what Lauren needs now. Running costs near zero.

## The bar for every game

1. One standard per game, done deep. Tag it with the standard code.
2. Teach on the miss: show _why_, visually, in 2 to 3 seconds. Never just "Try again."
3. Distractors model real 2nd grade mistakes, and each records which mistake (`mistake` field).
   No random plus or minus one.
4. Missed items come back a few rounds later until answered right twice.
5. Difficulty adapts within a session and across sessions.
6. Whole class at the board: team mode (turns and steals) and split screen races.
7. The teacher page shows class strengths, weaknesses and common mistakes. It never ranks kids.

If a feature doesn't serve one of these, skip it.

## Engine contract

- `makeItem(level, rng)` is pure and seeded. Never call `Math.random()` in game logic; use `Rng` from `src/lib/rng.ts`.
- Every game has unit tests: answer is correct, choices are distinct, every distractor has a named mistake.
- Themes are separate from games. Games use theme tokens, never hard coded colors. Only the national parks theme ships.

## Privacy (non negotiable)

- No student accounts or logins. Students never type personal information.
- Students: first name (max 20 chars) and optional last initial. Nothing else.
- No names in logs, errors, or URLs.
- Every table has `teacher_id` and `classroom_id` with row level security. Tests prove isolation.
- Hard delete for a student, a class, or everything. Attempt data older than 13 months is deleted automatically.
- Any new stored field goes in `docs/privacy.md` with the reason, in the same PR.
- No analytics, ads, or third party scripts, fonts, or requests. Fonts are self hosted from npm.
- The board must work offline: queue results locally and sync later.
- Do not use the school's name, logo or colors anywhere. `prototypes/st-hedwig-classrooms.html` is not committed.

## Working style

- Small PRs with plain language descriptions; the owner is not a full time developer.
- Never commit secrets. Use `.env.example` with placeholders.
- If a request is a bad idea, say so instead of working around it.
- Before pushing: `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm build`.

## Layout

- `src/app/` Next.js App Router routes
- `src/lib/` shared utilities (seeded RNG)
- `e2e/` Playwright tests, run at 1920x1080 with touch
- `prototypes/` the original single file prototypes, for reference only. Not built, not linted.
- `docs/plan.md` the plan; `docs/privacy.md` every stored field and why
