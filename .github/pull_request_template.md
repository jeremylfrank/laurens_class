## What this changes

<!-- Plain language. What will Lauren notice on the board or her laptop? -->

## How I tested it

- [ ] `pnpm typecheck && pnpm lint && pnpm test && pnpm build`
- [ ] `pnpm e2e` (touch emulation)
- [ ] Tried it at board size (1920x1080) with touch

## Learning game bar (game PRs only)

- [ ] Tagged with exactly one standard
- [ ] Every distractor names the real mistake it models
- [ ] A miss shows _why_ in 2 to 3 seconds (no bare "Try again")
- [ ] Missed items come back until answered right twice
- [ ] Difficulty adapts
- [ ] Works in team mode and split screen (if the game supports them)

## Privacy checklist

- [ ] No new stored field, **or** `docs/privacy.md` lists it and why
- [ ] No student names in logs, errors, URLs, or analytics (there is no analytics)
- [ ] No third party scripts, fonts, images, or requests
- [ ] New tables carry `teacher_id` and `classroom_id` with row level security, and a test proves it
- [ ] Hard delete still removes everything for a student, a class, or a teacher
- [ ] No secrets committed (`.env.example` uses placeholders only)
- [ ] Board still works with the internet unplugged
