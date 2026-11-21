"use client";
import { useEffect, useState } from "react";
import { getSupabase } from "@/data/supabase";
import { summarize, weekStart, type ResultRow, type Summary } from "@/data/summary";
import { GAMES } from "@/games/registry";

const MISTAKE_NAMES: Record<string, string> = Object.assign({}, ...GAMES.map((g) => g.def.mistakes));
const PAGE = 1000;

async function fetchRows(teacherId: string, from: Date, to: Date): Promise<ResultRow[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const out: ResultRow[] = [];
  for (let page = 0; page < 50; page++) {
    const { data, error } = await sb
      .from("item_attempts")
      .select("item_key, skill, correct, mistake, at")
      .eq("teacher_id", teacherId)
      .gte("at", from.toISOString())
      .lt("at", to.toISOString())
      .order("at")
      .range(page * PAGE, page * PAGE + PAGE - 1);
    if (error) throw error;
    out.push(...(data as ResultRow[]));
    if (data.length < PAGE) break;
  }
  return out;
}

const STATUS_TEXT = {
  strong: "Strong",
  growing: "Growing",
  "needs-work": "Needs work",
  "too-few": "Not enough tries yet",
} as const;

const pct = (n: number) => `${Math.round(n * 100)}%`;

export function WeekReport({ teacherId }: { teacherId: string }) {
  const [weeksAgo, setWeeksAgo] = useState(0);
  const [result, setResult] = useState<{ key: string; summary?: Summary; error?: string } | null>(null);
  const key = `${teacherId}:${weeksAgo}`;

  useEffect(() => {
    let alive = true;
    const from = weekStart(new Date(), weeksAgo);
    const to = weekStart(new Date(), weeksAgo - 1);
    fetchRows(teacherId, from, to)
      .then((rows) => alive && setResult({ key, summary: summarize(rows, MISTAKE_NAMES) }))
      .catch(
        () => alive && setResult({ key, error: "Couldn't load results. Check the internet and try again." }),
      );
    return () => {
      alive = false;
    };
  }, [teacherId, weeksAgo, key]);

  const loading = !result || result.key !== key;
  const s = loading ? undefined : result.summary;

  return (
    <section className="t-card" aria-labelledby="week-title">
      <div className="t-row">
        <h2 id="week-title" className="slab">
          {weeksAgo === 0 ? "This week" : "Last week"}
        </h2>
        <div className="modes" role="group" aria-label="Week">
          <button aria-pressed={weeksAgo === 0} onClick={() => setWeeksAgo(0)}>
            This week
          </button>
          <button aria-pressed={weeksAgo === 1} onClick={() => setWeeksAgo(1)}>
            Last week
          </button>
        </div>
      </div>

      {loading ? <p className="t-muted">Loading…</p> : null}
      {!loading && result.error ? <p className="t-error">{result.error}</p> : null}
      {s && s.tries === 0 ? (
        <p className="t-muted">
          No answers yet {weeksAgo === 0 ? "this week" : "last week"}. Results show up here after the class
          plays on a board that is signed in.
        </p>
      ) : null}

      {s && s.tries > 0 ? (
        <>
          <p className="t-big">
            <b>{s.tries}</b> answers, <b>{pct(s.right / s.tries)}</b> right
          </p>

          <h3>Skills</h3>
          <ul className="t-skills">
            {s.skills.map((k) => (
              <li key={k.key} className={`st-${k.status}`}>
                <div className="t-skill-head">
                  <span>
                    {k.label} <span className="t-code">{k.skill}</span>
                  </span>
                  <span className="t-badge">{STATUS_TEXT[k.status]}</span>
                </div>
                <div className="t-bar" aria-hidden="true">
                  <i style={{ width: pct(k.share) }} />
                </div>
                <div className="t-muted">
                  {k.right} of {k.tries} right ({pct(k.share)})
                </div>
              </li>
            ))}
          </ul>

          <div className="t-cols">
            <div>
              <h3>Most common mistakes</h3>
              {s.mistakes.length === 0 ? <p className="t-muted">No mistakes to show.</p> : null}
              <ol className="t-list">
                {s.mistakes.map((m) => (
                  <li key={m.id}>
                    <b>{m.name}</b> <span className="t-muted">({m.count}×)</span>
                    {m.examples.length ? <div className="t-muted">e.g. {m.examples.join(", ")}</div> : null}
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <h3>Problems missed most</h3>
              {s.hardest.length === 0 ? <p className="t-muted">Nothing missed.</p> : null}
              <ol className="t-list">
                {s.hardest.map((h) => (
                  <li key={h.key}>
                    <b>{h.label}</b>{" "}
                    <span className="t-muted">
                      missed {h.misses} of {h.tries}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
          <p className="t-muted">Results are for the whole class. Nothing here is about one child.</p>
        </>
      ) : null}
    </section>
  );
}
