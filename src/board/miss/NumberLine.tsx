"use client";
import { useSteps } from "./useSteps";

/** A number line with hops drawn one after another, e.g. 8 → 10 → 13 for 8 + 5 (make ten). */
interface Props {
  start: number;
  jumps: number[];
  compact?: boolean;
}

const W = 1000;
const H = 220;
const Y = 150;

export function NumberLine({ start, jumps, compact }: Props) {
  const stops = jumps.reduce<number[]>((acc, j) => [...acc, acc[acc.length - 1]! + j], [start]);
  const lo = Math.max(0, Math.min(...stops) - 1);
  const hi = Math.max(...stops) + 1;
  const x = (n: number) => 40 + ((n - lo) / (hi - lo)) * (W - 80);
  const step = useSteps(jumps.length + 1, compact ? 650 : 850);

  return (
    <svg
      className={`nl${compact ? " compact" : ""}`}
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Number line from ${start}`}
    >
      <line x1={20} x2={W - 20} y1={Y} y2={Y} className="nl-axis" />
      {Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).map((n) => (
        <g key={n}>
          <line
            x1={x(n)}
            x2={x(n)}
            y1={Y - 12}
            y2={Y + 12}
            className={n === 10 ? "nl-tick ten" : "nl-tick"}
          />
          <text
            x={x(n)}
            y={Y + 46}
            className={`nl-num${stops.slice(0, step + 1).includes(n) ? " on" : ""}${n === 10 ? " ten" : ""}`}
          >
            {n}
          </text>
        </g>
      ))}
      {jumps.map((j, i) => {
        if (i >= step) return null;
        const x1 = x(stops[i]!);
        const x2 = x(stops[i + 1]!);
        const mid = (x1 + x2) / 2;
        const lift = Math.min(110, 40 + Math.abs(x2 - x1) * 0.35);
        return (
          <g key={i} className="nl-hop">
            <path d={`M${x1} ${Y} Q${mid} ${Y - lift * 2} ${x2} ${Y}`} pathLength={1} />
            <text x={mid} y={Y - lift - 14}>
              {j > 0 ? `+${j}` : `−${-j}`}
            </text>
          </g>
        );
      })}
      <circle cx={x(stops[Math.min(step, jumps.length)]!)} cy={Y} r={14} className="nl-dot" />
    </svg>
  );
}
