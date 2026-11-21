/* Scene and sprite art for the national parks theme. Decorative: hidden from screen readers. */
import type { ReactNode } from "react";

export function Scene() {
  return (
    <div className="scene" aria-hidden="true">
      <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice">
        <defs>
          <g id="pine">
            <rect x="-5" y="-6" width="10" height="16" fill="#3a2410" />
            <path d="M0-100 24-56H12L32-24H16L38 4H-38L-16-24H-32L-12-56H-24Z" />
          </g>
        </defs>
        <circle cx="1290" cy="250" r="110" fill="var(--sun)" />
        <circle cx="1290" cy="250" r="160" fill="var(--sun)" opacity=".2" />
        <path
          d="M0 520 180 360 320 470 520 270 700 450 880 330 1060 470 1250 290 1440 440 1600 350V900H0Z"
          fill="var(--m1)"
        />
        <path
          d="M470 320 520 270 575 324 548 314 522 332 496 314ZM1200 340 1250 290 1302 342 1276 330 1250 348 1226 330Z"
          fill="var(--snow)"
          opacity=".9"
        />
        <path d="M0 640Q200 500 420 600T820 560T1220 610T1600 540V900H0Z" fill="var(--m2)" />
        <path d="M0 740Q300 650 640 728T1300 704T1600 690V900H0Z" fill="var(--m3)" />
        <g fill="var(--m4)">
          {[
            [70, 770, 1],
            [150, 800, 1.3],
            [250, 790, 1],
            [420, 820, 1],
            [1180, 800, 1],
            [1290, 830, 1.35],
            [1400, 790, 1],
            [1530, 815, 1.2],
          ].map(([x, y, s]) => (
            <use key={`${x}`} href="#pine" transform={`translate(${x} ${y}) scale(${s})`} />
          ))}
        </g>
        <path d="M0 850Q400 800 800 850T1600 840V900H0Z" fill="var(--m4)" />
      </svg>
    </div>
  );
}

export function Hiker({
  shirt = "var(--accent)",
  className = "hiker",
}: {
  shirt?: string;
  className?: string;
}) {
  return (
    <svg className={className} viewBox="0 0 40 50" aria-hidden="true">
      <path d="M31 17l5 31" stroke="var(--wood)" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="21" y="16" width="9" height="15" rx="3" fill="var(--wood)" />
      <rect x="11" y="15" width="14" height="19" rx="5" fill={shirt} />
      <path d="M15 33l-4 14M21 33l4 14" stroke="var(--ink)" strokeWidth="4" strokeLinecap="round" />
      <circle cx="18" cy="9" r="6" fill="#f0c49a" />
      <ellipse cx="18" cy="5" rx="10" ry="2.4" fill="#5b7a3c" />
      <path d="M13 5q5-7 10 0" fill="#5b7a3c" />
    </svg>
  );
}

export function Flag({ className = "flag" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 52" aria-hidden="true">
      <path d="M2 50 20 20 38 50Z" fill="var(--m2)" />
      <path d="M14 30 20 20 26 30 20 27Z" fill="var(--snow)" />
      <path d="M20 20V2" stroke="var(--edge)" strokeWidth="2.5" />
      <path d="M20 3h14l-4 5 4 5H20Z" fill="var(--accent)" />
    </svg>
  );
}

export function Badge({ size = 38 }: { size?: number }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden="true">
      <circle cx="20" cy="20" r="18" fill="#2f5d4a" stroke="var(--gold)" strokeWidth="3" />
      <path d="M7 28 16 15l5 7 4-5 8 11Z" fill="var(--woodInk)" />
      <circle cx="27" cy="12" r="3" fill="var(--gold)" />
    </svg>
  );
}

export const GAME_ICONS: Record<string, ReactNode> = {
  "summit-math": (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <path d="M6 86 40 30 58 58 70 42 94 86Z" fill="var(--m3)" />
      <path d="M32 44 40 30 48 44 40 40Z" fill="var(--snow)" />
      <path d="M40 30V8" stroke="var(--edge)" strokeWidth="3" />
      <rect x="40" y="8" width="22" height="16" rx="2" fill="var(--accent)" />
      <path d="M51 11v10M46 16h10" stroke="var(--snow)" strokeWidth="3" />
    </svg>
  ),
  race: (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <path d="M4 88 30 34 50 70 70 34 96 88Z" fill="var(--m3)" />
      <path d="M30 34V12M70 34V12" stroke="var(--edge)" strokeWidth="3" />
      <rect x="30" y="12" width="16" height="12" rx="2" fill="var(--team0)" />
      <rect x="70" y="12" width="16" height="12" rx="2" fill="var(--team1)" />
    </svg>
  ),
  touch: (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="36" cy="44" r="16" fill="var(--team0)" opacity=".85" />
      <circle cx="64" cy="58" r="16" fill="var(--team1)" opacity=".85" />
      <circle cx="50" cy="28" r="10" fill="var(--gold)" />
    </svg>
  ),
};
