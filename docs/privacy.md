# Privacy: every stored field and why

This file must list every piece of data the app stores. Any PR that adds a field updates
this file in the same PR.

## Today (step 1)

The app stores **nothing**. No cookies, no browser storage, no database, no analytics, no
third party requests. Fonts are served from our own site. The Content Security Policy
blocks scripts, fonts and connections to other sites.

## Planned

### On the board (browser storage, step 2)

| Data                                      | Why                        | Leaves the board?                                                |
| ----------------------------------------- | -------------------------- | ---------------------------------------------------------------- |
| Sound, read aloud speed, team mode on/off | Settings                   | Synced in step 3                                                 |
| Team names (max 14 characters)            | Shown in team mode         | Synced in step 3                                                 |
| Current level per skill                   | Adaptive difficulty        | Synced in step 3                                                 |
| Trail progress and badge count            | The class's shared reward  | Synced in step 3                                                 |
| Queue of unsynced results                 | So the board works offline | Yes, then deleted locally                                        |
| Trail Leader class list                   | Name picker                | **No**, unless Lauren decides otherwise (see plan.md, section 3) |

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
