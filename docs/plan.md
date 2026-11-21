# Classcade plan

Status: step 1 (foundation) in review. Written after reading `prototypes/mrs-frank-games.html`
and `prototypes/summit-race.html` in full, and skimming the school portal mockup, which
we are not using.

## 1. What the prototypes give us

The look and feel is good and we keep it: wood signs, layered mountains and pines, the
hiker climbing a 10 stop trail to a summit badge, huge touch targets, read aloud, and
reduced motion support. Summit Race already does what matters most for split screen: it
handles answers on `pointerdown` separately for each half, so two kids can tap at the
same moment, and a wrong tap locks only that half for 1.2 seconds. Its touch test screen
is worth keeping as a teacher tool.

Measured against the bar, here is where each game stands today:

| Game               | Standard                         | Distractors today                         | On a miss today     | Work needed                                                                                                                                                                                                                                                                                                                                          |
| ------------------ | -------------------------------- | ----------------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Summit Math        | 2.OA.B.2, 2.NBT.B.5              | answer ±1, ±2, ±10 (random)               | "Try again!"        | New generator that controls regrouping; real mistake distractors; base ten and number line miss animations. **Two standards, so we split it**: facts (2.OA.B.2) and two digit (2.NBT.B.5) become separate skills.                                                                                                                                    |
| Campfire Clock     | 2.MD.C.7                         | ±1 hour, ±15/30/45 min, **swapped hands** | "Try again!"        | Good start: swapped hands is a real mistake. Add "hour hand read as next hour" (2:45 read as 3:45) and "minute number read as minutes" (hand on 3 read as :03). Miss animation: hands sweep to the real time.                                                                                                                                        |
| Log Count          | 2.NBT.A.1                        | **reversed tens and ones**, ±1, ±10, ±100 | "Try again!"        | Keep the reversal. Add "dropped the zero" (305 read as 35) and "counted every piece as one". Miss animation: logs group into tens and hundreds.                                                                                                                                                                                                      |
| Wildlife Words     | RF.2.3, L.2.2                    | none (tap letters in order)               | wrong letter shakes | **Does not meet the bar yet.** Unscrambling letters isn't how 2nd graders get spelling wrong, so a wrong tap tells us nothing. Proposal: hear the word, pick the right spelling from phonics pattern errors (trail / trale / trayl), one pattern family per level. Also two standards, so pick one: RF.2.3 (decoding) or L.2.2d (spelling patterns). |
| Junior Ranger Quiz | NGSS 2-LS4-1, 2-ESS1-1 (partial) | joke answers ("Steamy Joe")               | "Try again!"        | **Does not meet the bar.** Most questions are park trivia, not the science standard. Proposal: rebuild as a habitats game for 2-LS4-1 ("Which animal lives here?") with distractors from real misconceptions, or keep the trivia as a just-for-fun extra with no tracking. Lauren's call.                                                            |
| Trail Leader       | none                             | n/a                                       | n/a                 | Classroom tool, not a learning game, so the bar doesn't apply. Port as is.                                                                                                                                                                                                                                                                           |
| Summit Race        | same as Summit Math              | answer ±1, ±2, ±10                        | half locks 1.2 s    | Becomes the "split" play mode of the engine, so any game with tap choices can be raced.                                                                                                                                                                                                                                                              |

Other things in the prototypes we must change: game logic uses `Math.random()` (not
testable), fonts load from Google Fonts (third party), the title "Mrs. Frank's Trail
Games" is hard coded (becomes a classroom setting), and everything lives in
`localStorage` on one board.

## 2. Architecture

```
src/
  engine/        GameDefinition types, item scheduler (missed items return), adaptive level
  games/<id>/    one folder per game: definition.ts, definition.test.ts, MissAnimation.tsx
  themes/        national-parks/ (tokens, scene art, hiker, badges). Only theme shipped.
  board/         the board UI: home, stage, trail, team bar, split screen, touch test
  data/          local queue (IndexedDB) and sync to Supabase (step 3)
  app/           routes: / (board), /teacher (step 3)
```

**Items and keys.** `makeItem(level, rng)` is pure. Each item has a stable `key` that
describes the problem itself (for example `add:38+25`), so a missed item can be brought
back exactly, and the teacher page can group misses by skill and mistake.

**Missed items come back.** A small queue per session: a miss schedules the item 3 rounds
later; it leaves the queue after two correct answers. The scheduler is pure and unit
tested.

**Adapting.** One level per skill for the class (not per kid). Within a session: move up
after 4 of the last 5 right, down after 2 misses in the last 3. The level is saved and
the next session starts one notch below where the last one ended. Numbers are a starting
point; we tune them with Lauren.

**Teach on the miss.** `explainMiss(item, chosen)` returns plain data (for example
`{ kind: "regroup", a: 38, b: 25 }`), and a React component per animation kind plays it in
2 to 3 seconds. Keeping it as data means it is testable and the same animation can serve
several games.

**Offline.** The board is a client side app. A service worker caches the app so it loads
with no internet. Results go into an IndexedDB queue first; once Lauren is signed in (step 3) the queue syncs whenever the connection is back. Step 2 works with no account at all.

**Hosting.** Recommend **Vercel's free plan** for now: it is the simplest home for
Next.js, and the non commercial clause is fine while this is one classroom. Cloudflare
Pages needs an extra adapter (OpenNext) for Next.js; worth it only if this becomes a
product, and that move is straightforward.

## 3. Things in the brief I'd push back on

You asked me to say so. None of these block step 1 or 2.

1. **Storing student names in the cloud.** Even first names in an outside database can
   count as student records. Many schools and districts want a data privacy agreement
   with a vendor before student information goes into an outside service, and California
   has specific student privacy laws (SOPIPA). Suggestion: the class list for Trail
   Leader stays **on the board only**, and results are recorded per team or for the
   whole class, never per kid. That also makes "nothing ranks individual kids" true by
   design. If Lauren needs names synced across devices, check with the school first.
   Until then I'll build `students` and the optional student link on `item_attempts`, but
   leave them unused.
2. **Google sign in with a school account.** School Google Workspace admins often block
   sign in to outside apps that haven't been approved. If Lauren's school account is
   blocked, she can use a personal Google account. Worth knowing before step 3.
3. **The keep alive ping.** Supabase pauses free projects after about a week with no
   use. A scheduled GitHub Action can ping it, but GitHub turns off scheduled workflows
   in repos with no activity for 60 days, which is exactly what happens over summer.
   Plan: add the ping **and** document the one click unpause in the README. The board
   keeps working while the database is paused because results queue locally.
4. **Two standards on one game.** Summit Math and Wildlife Words each list two. The bar
   says one per game, so I'll split Summit Math into two skills and ask Lauren which one
   Wildlife Words should be.
5. **Dark mode on a projector.** The prototype has a dark night sky theme. Projectors
   wash out dark colors in a lit room, so the board will default to light mode. Dark
   stays for the laptop.

## 4. Order of work

1. **Foundation (this PR).** Next.js + TypeScript strict, ESLint, Prettier, Vitest,
   Playwright at 1920x1080 with touch, CI (typecheck, lint, format, unit, build, e2e),
   Dependabot, PR template with privacy checklist, strict Content Security Policy,
   self hosted fonts, seeded RNG. A placeholder home page.
   _Deploy preview:_ needs a Vercel account connected to this repo (steps in README).
2. **Engine + Summit Math.** Engine types, scheduler, adaptive levels, the national parks
   theme as a separate module, the board shell (home, stage, trail, badges, teams, read
   aloud, settings), Summit Math with regrouping distractors (forgot to regroup, wrote
   the whole column sum, subtracted the smaller digit from the larger, added instead of
   subtracted, off by one when counting on) and base ten / number line miss animations,
   team mode with steals, split screen race, touch test. Offline, no login.
3. **Lauren's account.** Supabase schema with row level security and a test that proves
   one teacher can't see another's rows (runs against a local Supabase in CI), email
   allowlist, Google sign in, settings and custom content synced, results synced from the
   offline queue, 13 month cleanup job, hard delete, the "this week" page, keep alive.
4. **Port the other games**, one PR each, starting with the skill Lauren says her class
   struggles with most.

## 5. Questions for Lauren

1. Which skill does the class struggle with most right now? That game is ported first in step 4.
2. Wildlife Words: phonics decoding (RF.2.3) or spelling patterns (L.2.2)? Which patterns is the class on?
3. Junior Ranger Quiz: rebuild as a habitats science game, or keep it as untracked trivia?
4. Does the class list need to leave the board (point 1 above)?
5. Will she sign in with a school or a personal Google account?
