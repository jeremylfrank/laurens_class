# Privacy: every stored field and why

This file must list every piece of data the app stores. Any PR that adds a field updates
this file in the same PR.

## Today (step 2): on the board only

Everything below lives in the browser storage of the board's computer (keys start with
`classcade:`). Nothing is sent anywhere. There are no cookies, no analytics and no third
party requests; the Content Security Policy blocks connections to other sites.

| Key             | What it holds                                                                                                                                                                                              | Why                                                                                             |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `settings`      | Board title (max 40 characters), sound on/off, slow voice, team mode on/off, two team names (max 14 characters each)                                                                                       | Teacher settings                                                                                |
| `progress`      | Trail stop (0 to 9), badge count, two team scores                                                                                                                                                          | The class's shared reward                                                                       |
| `levels`        | For each game mode: current level, the last few right/wrong results (true/false), the last day played                                                                                                      | Adaptive difficulty for the whole class                                                         |
| `review`        | For each game mode: up to 20 missed problems (numbers only, e.g. 38 + 25), when each comes back, and how many times it has been answered right since                                                       | Missed items come back                                                                          |
| `rounds:<mode>` | A count of rounds played                                                                                                                                                                                   | Timing for when missed items come back                                                          |
| `mode:<game>`   | Which mode was last picked                                                                                                                                                                                 | Convenience                                                                                     |
| `attempts`      | One row per tap: time, a random session id, game, mode, play style (board, teams, split), the problem (e.g. `add:38+25`), the standard, right or wrong, the mistake if wrong, and team 0 or 1 in team play | The teacher page in step 3. Kept at most 13 months and at most 3,000 rows, oldest removed first |

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

| Table            | Fields                                                                                                                               | Why                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `teachers`       | id, email, display name, created                                                                                                     | Sign in. Only allowlisted emails can create an account.                            |
| `classrooms`     | id, teacher_id, name, theme, settings                                                                                                | One teacher can have more than one class later.                                    |
| `students`       | id, classroom_id, teacher_id, first name (max 20), optional last initial                                                             | Only if Lauren chooses to sync the class list. Nothing else about a student, ever. |
| `custom_content` | id, classroom_id, teacher_id, game, type, payload                                                                                    | Lauren's spelling lists and questions.                                             |
| `sessions`       | id, classroom_id, teacher_id, game, mode, started                                                                                    | Groups results for the "this week" page.                                           |
| `item_attempts`  | id, session_id, classroom_id, teacher_id, item key, skill/standard, correct, mistake type, team (optional), student (optional), time | Shows which skills and mistakes need work.                                         |

Rules:

- Row level security on every table: a teacher can read and write only rows with their own `teacher_id`.
- No student accounts, no student logins. Students never type anything personal.
- No names in logs or error reports.
- Hard delete for one student, one class, or the whole teacher account.
- `item_attempts` older than 13 months are deleted automatically by a nightly job.
