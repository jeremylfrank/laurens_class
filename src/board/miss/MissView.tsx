"use client";
import type { MissAnimation } from "@/engine/types";
import { BaseTen } from "./BaseTen";
import { NumberLine } from "./NumberLine";

/** The teach-on-the-miss panel: animation, one plain sentence, and the full answer. */
export function MissView({ anim, compact }: { anim: MissAnimation; compact?: boolean }) {
  return (
    <div className={`miss${compact ? " compact" : ""}`} role="status" aria-live="polite">
      <div className="miss-art">
        {anim.kind === "baseTen" ? (
          <BaseTen op={anim.op} a={anim.a} b={anim.b} regroup={anim.regroup} compact={compact} />
        ) : (
          <NumberLine start={anim.start} jumps={anim.jumps} compact={compact} />
        )}
      </div>
      <p className="miss-caption">{anim.caption}</p>
      <p className="miss-answer">{anim.answerText}</p>
    </div>
  );
}
