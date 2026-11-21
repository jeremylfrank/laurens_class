"use client";
import { useSteps } from "./useSteps";

/**
 * Base ten blocks that show regrouping.
 * Add:      a and b side by side → ones slide together → 10 ones become a new ten → total.
 * Subtract: a → (if needed) one ten breaks into 10 ones → b is taken away → what's left.
 */
interface Props {
  op: "+" | "-";
  a: number;
  b: number;
  regroup: boolean;
  compact?: boolean;
}

const t = (n: number) => Math.floor(n / 10);
const o = (n: number) => n % 10;

function Rods({ n, fresh = 0, gone = 0 }: { n: number; fresh?: number; gone?: number }) {
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <span
          key={i}
          className={`bt-rod${i >= n - fresh ? " fresh" : ""}${i >= n - gone && gone > 0 ? " gone" : ""}`}
        />
      ))}
    </>
  );
}

function Cubes({ n, glow = 0, gone = 0 }: { n: number; glow?: number; gone?: number }) {
  return (
    <span className="bt-cubes">
      {Array.from({ length: n }, (_, i) => (
        <span
          key={i}
          className={`bt-cube${i < glow ? " glow" : ""}${i >= n - gone && gone > 0 ? " gone" : ""}`}
        />
      ))}
    </span>
  );
}

function Group({ tens, ones, label }: { tens: React.ReactNode; ones: React.ReactNode; label?: string }) {
  return (
    <div className="bt-group">
      <div className="bt-place">
        <div className="bt-rods">{tens}</div>
        <span className="bt-lab">tens</span>
      </div>
      <div className="bt-place">
        {ones}
        <span className="bt-lab">ones</span>
      </div>
      {label ? <div className="bt-num">{label}</div> : null}
    </div>
  );
}

export function BaseTen({ op, a, b, regroup, compact }: Props) {
  const steps = op === "+" ? 3 : 3;
  const step = useSteps(steps, compact ? 700 : 900);
  const cls = `bt${compact ? " compact" : ""}`;

  if (op === "+") {
    const onesSum = o(a) + o(b);
    if (step === 0) {
      return (
        <div className={cls} data-step={step}>
          <Group tens={<Rods n={t(a)} />} ones={<Cubes n={o(a)} />} label={String(a)} />
          <span className="bt-op">+</span>
          <Group tens={<Rods n={t(b)} />} ones={<Cubes n={o(b)} />} label={String(b)} />
        </div>
      );
    }
    if (step === 1 || !regroup) {
      return (
        <div className={cls} data-step={step}>
          <Group tens={<Rods n={t(a) + t(b)} />} ones={<Cubes n={onesSum} glow={regroup ? 10 : 0} />} />
        </div>
      );
    }
    return (
      <div className={cls} data-step={step}>
        <Group tens={<Rods n={t(a) + t(b) + 1} fresh={1} />} ones={<Cubes n={onesSum - 10} />} />
      </div>
    );
  }

  // Subtract
  const tensAfterBreak = regroup ? t(a) - 1 : t(a);
  const onesAfterBreak = regroup ? o(a) + 10 : o(a);
  if (step === 0) {
    return (
      <div className={cls} data-step={step}>
        <Group tens={<Rods n={t(a)} fresh={regroup ? 1 : 0} />} ones={<Cubes n={o(a)} />} label={String(a)} />
      </div>
    );
  }
  if (step === 1) {
    return (
      <div className={cls} data-step={step}>
        <Group
          tens={<Rods n={tensAfterBreak} />}
          ones={<Cubes n={onesAfterBreak} glow={regroup ? 10 : 0} />}
        />
      </div>
    );
  }
  return (
    <div className={cls} data-step={step}>
      <Group tens={<Rods n={tensAfterBreak} gone={t(b)} />} ones={<Cubes n={onesAfterBreak} gone={o(b)} />} />
    </div>
  );
}
