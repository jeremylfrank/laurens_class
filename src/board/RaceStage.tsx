"use client";
import { useEffect, useRef, useState } from "react";
import { createRng, type Rng } from "@/lib/rng";
import { START_LEVEL } from "@/engine/adaptive";
import { recordMiss } from "@/engine/review-queue";
import type { Item, MissAnimation } from "@/engine/types";
import type { BoardGame } from "@/games/registry";
import { logAttempt, newSessionId } from "@/data/attempts";
import { Flag, Hiker } from "@/themes/national-parks/art";
import { MissView } from "./miss/MissView";
import { burst, burstAt } from "./fx";
import { nope, say, tone, yay } from "./sound";
import { levelKey, readRounds, useLevels, useReview, type Settings } from "./settings";
import { HomeIcon } from "./icons";

/**
 * Split screen race: two halves, two teams, tapping at the same time.
 * Answers use pointerdown so two kids' taps never block each other.
 * A wrong tap locks only that half while the explanation plays there.
 */
export const RACE_GOAL = 10;
const MISS_LOCK_MS = 2800;
const SIDES = [0, 1] as const;
type Side = (typeof SIDES)[number];
const PAN: Record<Side, number> = { 0: -0.7, 1: 0.7 };

interface HalfState {
  item: Item;
  score: number;
  explain: MissAnimation | null;
  right: number | null;
  wrong: number | null;
}

interface Props {
  game: BoardGame;
  modeId: string;
  settings: Settings;
  onExit: () => void;
}

export function RaceStage({ game, modeId, settings, onExit }: Props) {
  const mode = game.def.modes.find((m) => m.id === modeId) ?? game.def.modes[0]!;
  const key = levelKey(game.def.id, mode.id);
  const [levels] = useLevels();
  const [, setReview] = useReview();
  const level = (levels[key] ?? START_LEVEL).level;
  const [ctx] = useState(() => ({
    id: newSessionId(),
    rng: createRng(Math.floor(Math.random() * 2 ** 31)) as Rng,
  }));
  const make = () => game.def.makeItem(level, ctx.rng, mode.id);
  const fresh = (): HalfState => ({ item: make(), score: 0, explain: null, right: null, wrong: null });
  const [halves, setHalves] = useState<[HalfState, HalfState]>(() => [fresh(), fresh()]);
  const [winner, setWinner] = useState<Side | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (settings.sound) say("Ready, set, climb!", settings.slow);
    const ts = timers.current;
    return () => ts.forEach(clearTimeout);
    // Once at the start.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = (side: Side, fn: (h: HalfState) => HalfState) =>
    setHalves((hs) => {
      const next: [HalfState, HalfState] = [hs[0], hs[1]];
      next[side] = fn(hs[side]);
      return next;
    });

  const after = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms));

  const onPointer = (side: Side, e: React.PointerEvent) => {
    const btn = (e.target as Element).closest<HTMLButtonElement>("button[data-i]");
    if (!btn || winner !== null) return;
    e.preventDefault();
    const h = halves[side];
    if (h.explain || h.right !== null) return;
    const i = Number(btn.dataset.i);
    const choice = h.item.choices[i];
    if (!choice) return;
    const correct = choice.value === h.item.answer;
    logAttempt({
      at: new Date().toISOString(),
      session: ctx.id,
      game: game.def.id,
      mode: mode.id,
      play: "split",
      itemKey: h.item.key,
      skill: h.item.skill,
      correct,
      team: side,
      ...(choice.mistake ? { mistake: choice.mistake } : {}),
    });
    if (correct) {
      const score = h.score + 1;
      yay(PAN[side]);
      burstAt(btn, 40);
      update(side, (s) => ({ ...s, score, right: i }));
      if (score >= RACE_GOAL) {
        setWinner(side);
        after(500, () => {
          burst(window.innerWidth / 2, window.innerHeight / 2, 200);
          tone([523, 659, 784, 1047, 1319], 0.11, "triangle");
          if (settings.sound) say(`${settings.teamNames[side]} reach the summit first!`, settings.slow);
        });
        return;
      }
      after(450, () => update(side, (s) => ({ ...s, item: make(), right: null, wrong: null })));
    } else {
      nope(PAN[side]);
      setReview((all) => ({ ...all, [key]: recordMiss(all[key] ?? [], h.item, readRounds(key)) }));
      const anim = game.def.explainMiss(h.item, choice);
      update(side, (s) => ({ ...s, wrong: i, explain: anim }));
      after(MISS_LOCK_MS, () => update(side, (s) => ({ ...s, item: make(), explain: null, wrong: null })));
    }
  };

  const restart = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setWinner(null);
    setHalves([fresh(), fresh()]);
  };

  const { Prompt } = game;
  return (
    <div className="race">
      {SIDES.map((side) => {
        const h = halves[side];
        return (
          <section key={side} className={`half team${side}`} aria-label={settings.teamNames[side]}>
            <div className="race-team slab">
              <span>{settings.teamNames[side]}</span>
              <b data-testid={`score-${side}`}>{h.score}</b>
            </div>
            <Prompt item={h.item} compact />
            {h.explain ? (
              <MissView anim={h.explain} compact />
            ) : (
              <div className="race-ans" onPointerDown={(e) => onPointer(side, e)}>
                {h.item.choices.map((c, i) => (
                  <button
                    key={`${h.item.key}-${i}`}
                    data-i={i}
                    className={`opt num${h.right === i ? " right" : ""}`}
                    aria-label={String(c.value)}
                  >
                    {c.value}
                  </button>
                ))}
              </div>
            )}
            <div className="race-trail" style={{ ["--p" as string]: h.score / RACE_GOAL }}>
              <div className="line" />
              <Flag className="race-flag" />
              <div className="race-hiker">
                <Hiker shirt={side === 0 ? "var(--team0)" : "var(--team1)"} />
              </div>
            </div>
          </section>
        );
      })}
      <button className="race-quit" aria-label="Back to the trailhead" onClick={onExit}>
        <HomeIcon />
      </button>
      {winner !== null ? (
        <div className="win">
          <div className="sign slab">
            <span>{settings.teamNames[winner]} win!</span>
            <small>
              {settings.teamNames[0]} {halves[0].score}, {settings.teamNames[1]} {halves[1].score}
            </small>
            <div className="win-btns">
              <button className="big go slab" onClick={restart}>
                Race again
              </button>
              <button className="big alt slab" onClick={onExit}>
                Trailhead
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
