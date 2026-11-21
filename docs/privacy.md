# Privacy: every stored field and why

This file must list every piece of data the app stores. Any PR that adds a field updates
this file in the same PR.

## On the board

Everything below lives in the browser storage of the board's computer (keys start with
`classcade:`). Only results and board settings are sent, and only to the signed in teacher's account. There are no cookies, no analytics and no third
party requests; the Content Security Policy blocks connections to other sites.

| Key             | What it holds                                                                                                                                                                                              | Why                                                                                                                                                |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `settings`      | Board title (max 40 characters), sound on/off, slow voice, team mode on/off, two team names (max 14 characters each)                                                                                       | Teacher settings                                                                                                                                   |
| `progress`      | Trail stop (0 to 9), badge count, two team scores                                                                                                                                                          | The class's shared reward                                                                                                                          |
| `levels`        | For each game mode: current level, the last few right/wrong results (true/false), the last day played                                                                                                      | Adaptive difficulty for the whole class                                                                                                            |
| `review`        | For each game mode: up to 20 missed problems (numbers only, e.g. 38 + 25), when each comes back, and how many times it has been answered right since                                                       | Missed items come back                                                                                                                             |
| `rounds:<mode>` | A count of rounds played                                                                                                                                                                                   | Timing for when missed items come back                                                                                                             |
| `mode:<game>`   | Which mode was last picked                                                                                                                                                                                 | Convenience                                                                                                                                        |
| `attempts`      | One row per tap: time, a random session id, game, mode, play style (board, teams, split), the problem (e.g. `add:38+25`), the standard, right or wrong, the mistake if wrong, and team 0 or 1 in team play | Waiting to be saved to the teacher's account; removed from the board once saved. If nobody signs in, kept at most 13 months and at most 3,000 rows |

**No names of students are stored anywhere.** Results belong to the class or to a team.

The service worker also keeps a copy of the app itself (the page, scripts, styles and
fonts) so the board loads with no internet. It never stores answers.

Read aloud only uses voices installed on the computer, so question text is never sent to
an online speech service.

**To wipe the board:** in the browser's settings, clear site data for this site. Teacher
settings also has buttons to reset scores, badges and levels.

## Planned

### Trail Leader (name picker, step 4)

The class list for the name picker stays on the board only, unless Lauren decides
otherwise (see plan.md, section 3).

### In the database (Supabase, step 3)

Only when someone signs in. Defined in `supabase/migrations/0001_init.sql`.

| Table            | Fields                                                                                                                                                  | Why                                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `allowed_emails` | email, role (teacher or admin), created                                                                                                                 | Only these Google accounts can sign in                                                                 |
| `teachers`       | id, email, display name (optional, max 60), admin yes/no, created                                                                                       | The signed in teacher                                                                                  |
| `classrooms`     | id, teacher, name (max 60), theme, board settings (title, sound, slow voice, team mode, team names), when settings changed, created                     | One class per teacher for now                                                                          |
| `students`       | id, class, teacher, first name (max 20), optional last initial                                                                                          | **Not used.** The class list stays on the board (plan.md, section 3). Kept so the data model is ready. |
| `custom_content` | id, class, teacher, game, type, content, created, updated                                                                                               | Lauren's own word lists and questions (later games)                                                    |
| `sessions`       | id, class, teacher, game, mode, play style, started                                                                                                     | Groups results                                                                                         |
| `item_attempts`  | id, session, class, teacher, problem (e.g. `add:38+25`), standard, right/wrong, mistake if wrong, team 0/1 (optional), student (optional, unused), time | The "this week" page                                                                                   |

Who can see what (row level security, proven by `supabase/tests/rls.test.ts`):

- A teacher reads and writes only their own rows.
- **An admin can read every teacher's rows (read only)**, and manage the allowlist. Any
  teacher who joins should be told this.
- Signed out visitors can read nothing. They can only call `ping()`, which returns 1.
- Removing an email from the allowlist cuts off that person's access immediately.

Deleting:

- Teacher page > **Delete all class results**: removes every session and result.
- Teacher page > **Delete my account**: removes the account, class, settings and results.
- Results older than 13 months are deleted every night (`0002_retention.sql`).
- Supabase keeps its own short term backups on the free plan (about a day or a week depending on plan). Deleted data ages out of those on Supabase's schedule.

Sign in: Google tells Supabase the teacher's email address and name. Only the email is stored in our tables. Supabase's own `auth.users` table also keeps the email and sign in times.
