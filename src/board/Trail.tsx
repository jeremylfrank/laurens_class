import { Flag, Hiker } from "@/themes/national-parks/art";
import { TRAIL_STOPS } from "./settings";

export function Trail({ steps }: { steps: number }) {
  return (
    <div className="trail" aria-label={`Trail: ${steps} of ${TRAIL_STOPS} stops`} role="img">
      <div className="path" />
      <div className="dots">
        {Array.from({ length: TRAIL_STOPS }, (_, i) => (
          <i key={i} className={i < steps ? "done" : ""} />
        ))}
      </div>
      <Flag />
      <div className="hiker-wrap" style={{ ["--p" as string]: steps / TRAIL_STOPS }}>
        <Hiker />
      </div>
    </div>
  );
}
