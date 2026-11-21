"use client";
import { useState } from "react";
import { tone } from "./sound";

type Points = Map<number, { x: number; y: number }>;

/** Shows every finger the browser can see at once, so Lauren can check the board does multi touch. */
export function TouchTest({ onDone }: { onDone: () => void }) {
  const [points, setPoints] = useState<Points>(() => new Map());
  const [best, setBest] = useState(0);
  const [kind, setKind] = useState("");

  const change = (fn: (m: Points) => void) =>
    setPoints((prev) => {
      const m = new Map(prev);
      fn(m);
      setBest((b) => Math.max(b, m.size));
      return m;
    });

  const message =
    best >= 2
      ? `Most at once: ${best}. Two team races will work on this board.`
      : kind === "mouse"
        ? "The board is sending mouse clicks, not touches. Switch the projector to touch interactive mode, or check the USB cable to the computer."
        : `Most at once: ${best}. Have two kids touch the board at the same time.`;

  return (
    <div
      className="touchtest"
      onPointerDown={(e) => {
        if ((e.target as Element).closest(".done")) return;
        setKind(e.pointerType);
        change((m) => m.set(e.pointerId, { x: e.clientX, y: e.clientY }));
        tone([380], 0.06, "triangle");
      }}
      onPointerMove={(e) =>
        change((m) => {
          if (m.has(e.pointerId)) m.set(e.pointerId, { x: e.clientX, y: e.clientY });
        })
      }
      onPointerUp={(e) => change((m) => m.delete(e.pointerId))}
      onPointerCancel={(e) => change((m) => m.delete(e.pointerId))}
      onPointerLeave={(e) => change((m) => m.delete(e.pointerId))}
    >
      <div className="info">
        <b data-testid="touch-count">{points.size}</b>
        <span>fingers on the board right now</span>
      </div>
      <div className="best" data-testid="touch-best">
        {message}
      </div>
      {[...points.values()].map((p, i) => (
        <div key={i} className="dot" style={{ left: p.x, top: p.y }}>
          {i + 1}
        </div>
      ))}
      <button className="done slab" onClick={onDone}>
        Done
      </button>
    </div>
  );
}
