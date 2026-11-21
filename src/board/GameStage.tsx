"use client";
import { useEffect, useRef, useState } from "react";
import { createRng, type Rng } from "@/lib/rng";
import { localDay, recordResult, startSession, START_LEVEL } from "@/engine/adaptive";
import { nextDue, recordMiss, recordRight } from "@/engine/review-queue";
import { firstTryRight, nextTurn, startRound, tap, type RoundState, type Team } from "@/engine/round";
import type { Item, MissAnimation } from "@/engine/types";
import type { BoardGame } from "@/games/registry";
import { logAttempt, newSessionId } from "@/data/attempts";
import { MissView } from "./miss/MissView";
import { Trail } from "./Trail";
import { burstAt } from "./fx";
import { nope, say, yay } from "./sound";
import {
  TRAIL_STOPS,
  levelKey,
  readReview,
  readRounds,
  useLevels,
  useProgress,
  useReview,
  writeRounds,
  type Settings,
} from "./settings";
import { SpeakIcon } from "./icons";

const NEXT_AFTER_RIGHT_MS = 1600;
const NEXT_AFTER_SUMMIT_MS = 3800;
const EXPLAIN_MS = 4200;
const PRAISE = ["Great job!", "You got it!", "Way to go, rangers!", "Awesome!", "Super climbing!"];

interface Props {
  game: BoardGame;
  modeId: string;
  settings: Settings;
  onSummit: () => void;
}

/** Re-show a returning item with its choices in a new order. */
function reshuffle(item: Item, rng: Rng): Item {
  return { ...item, choices: rng.shuffle(item.choices) };
}

export function GameStage({ game, modeId, settings, onSummit }: Props) {
  const mode = game.def.modes.find((m) => m.id === modeId) ?? game.def.modes[0]!;
  const key = levelKey(game.def.id, mode.id);
  const [levels, setLevels] = useLevels();
  const [, setReview] = useReview();
  const [progress, setProgress] = useProgress();

  // Per session, created once when the stage opens.
  const [session] = useState(() => {
    const seed = Math.floor(Math.random() * 2 ** 31);
    return { id: newSessionId(), rng: createRng(seed) };
  });
  const [firstRound] = useState(() => readRounds(key));
  const roundNo = useRef(firstRound);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const makeRound = (turn: Team, level: number, atRound: number, prevKey?: string): RoundState => {
    const due = nextDue(readReview()[key] ?? [], atRound);
    let item = due && due.item.key !== prevKey ? reshuffle(due.item, session.rng) : null;
    for (let i = 0; !item && i < 5; i++) {
      const fresh = game.def.makeItem(level, session.rng, mode.id);
      if (fresh.key !== prevKey) item = fresh;
    }
    return startRound(item ?? game.def.makeItem(level, session.rng, mode.id), settings.teams, turn);
  };

  const [level, setLevel] = useState(() => {
    const saved = levels[key] ?? START_LEVEL;
    return startSession(saved, mode.levels, localDay(new Date())).level;
  });
  const [round, setRound] = useState<RoundState>(() => makeRound(0, level, firstRound));
  const [view, setView] = useState<"ask" | "right" | "explain">("ask");
  const [explain, setExplain] = useState<MissAnimation | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      const who = round.teams && round.turn !== null ? `${settings.teamNames[round.turn]}. ` : "";
      if (settings.sound) say(who + round.item.speech, settings.slow);
    }, 300);
    return () => clearTimeout(t);
    // Read the question once per new round.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round.item]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const later = (ms: number, fn: () => void) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(fn, ms);
  };

  const finish = (state: RoundState, button: Element | null) => {
    const right = firstTryRight(state);
    const day = localDay(new Date());
    const nextLevelState = recordResult(levels[key] ?? { ...START_LEVEL, level }, right, mode.levels, day);
    setLevels((all) => ({ ...all, [key]: nextLevelState }));
    setLevel(nextLevelState.level);
    setReview((all) => {
      const q = all[key] ?? [];
      const nextQ =
        state.wrong.length > 0
          ? recordMiss(q, state.item, roundNo.current)
          : recordRight(q, state.item.key, roundNo.current);
      return { ...all, [key]: nextQ };
    });
    roundNo.current += 1;
    writeRounds(key, roundNo.current);

    let summit = false;
    if (state.solved) {
      yay();
      burstAt(button);
      const steps = progress.trail + 1;
      summit = steps >= TRAIL_STOPS;
      setProgress((p) => {
        const score: [number, number] = [...p.score];
        if (state.scorer !== null) score[state.scorer] += 1;
        return summit ? { trail: 0, badges: p.badges + 1, score } : { ...p, trail: p.trail + 1, score };
      });
      if (summit) onSummit();
    }

    const advance = () => {
      setExplain(null);
      setView("ask");
      setRound(makeRound(nextTurn(state), nextLevelState.level, roundNo.current, state.item.key));
    };

    if (state.firstMiss) {
      const anim = game.def.explainMiss(state.item, state.firstMiss);
      const show = () => {
        setExplain(anim);
        setView("explain");
        if (settings.sound) say(anim.caption, settings.slow);
        later(EXPLAIN_MS, advance);
      };
      if (state.solved) {
        setView("right");
        later(1100, show);
      } else show();
    } else {
      setView("right");
      if (!summit && settings.sound)
        setTimeout(() => say(PRAISE[roundNo.current % PRAISE.length]!, settings.slow), 250);
      later(summit ? NEXT_AFTER_SUMMIT_MS : NEXT_AFTER_RIGHT_MS, advance);
    }
  };

  const onTap = (index: number, button: Element) => {
    if (view !== "ask") return;
    const res = tap(round, index);
    if (!res) return;
    const choice = round.item.choices[index]!;
    logAttempt({
      at: new Date().toISOString(),
      session: session.id,
      game: game.def.id,
      mode: mode.id,
      play: round.teams ? "teams" : "board",
      itemKey: round.item.key,
      skill: round.item.skill,
      correct: res.correct,
      ...(choice.mistake ? { mistake: choice.mistake } : {}),
      ...(res.by !== null ? { team: res.by } : {}),
    });
    setRound(res.state);
    if (!res.correct && res.state.phase === "steal") {
      nope();
      if (settings.sound && res.state.turn !== null)
        say(`${settings.teamNames[res.state.turn]}, can you steal it?`, settings.slow);
      return;
    }
    if (!res.correct) nope();
    finish(res.state, button);
  };

  const { Prompt } = game;
  const turnName = round.teams && round.turn !== null ? settings.teamNames[round.turn] : null;

  return (
    <main className="stage">
      <div className="prompt sign slab">
        {turnName ? (
          <span className={`turn team${round.turn}`}>
            {round.phase === "steal" ? `Steal: ${turnName}` : `Turn: ${turnName}`}
          </span>
        ) : null}
        <span>{game.sign}</span>
        <button
          className="say"
          aria-label="Read it again"
          onClick={() => say(round.item.speech, settings.slow)}
        >
          <SpeakIcon />
        </button>
      </div>
      <div className={`play${view === "explain" ? " explaining" : ""}`}>
        <Prompt item={round.item} />
        {view === "explain" && explain ? (
          <MissView anim={explain} />
        ) : (
          <div className="opts" data-level={level}>
            {round.item.choices.map((c, i) => {
              const isAnswer = c.value === round.item.answer;
              const wrong = round.wrong.includes(i);
              const cls = ["opt num", wrong ? "wrong" : "", view === "right" && isAnswer ? "right" : ""].join(
                " ",
              );
              return (
                <button
                  key={`${round.item.key}-${i}`}
                  className={cls}
                  disabled={wrong}
                  aria-label={String(c.value)}
                  onClick={(e) => onTap(i, e.currentTarget)}
                >
                  {c.value}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <Trail steps={progress.trail} />
    </main>
  );
}
