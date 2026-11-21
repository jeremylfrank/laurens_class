"use client";
import { useEffect, useRef, useState } from "react";
import { removeStored } from "@/lib/storage";
import { DEFAULT_PROGRESS, useProgress, type Settings } from "./settings";
import { hasLocalVoice, hush } from "./sound";

interface Props {
  settings: Settings;
  onChange: (s: Settings) => void;
  onClose: () => void;
}

export function SettingsPanel({ settings, onChange, onClose }: Props) {
  const [, setProgress] = useProgress();
  const [done, setDone] = useState<string | null>(null);
  const [voiceOk] = useState(() => hasLocalVoice());
  const closeRef = useRef<HTMLButtonElement>(null);
  const set = (patch: Partial<Settings>) => onChange({ ...settings, ...patch });

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const teamName = (i: 0 | 1, v: string) => {
    const names: [string, string] = [...settings.teamNames];
    names[i] = v.slice(0, 14);
    set({ teamNames: names });
  };

  return (
    <div
      className="modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="set-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="panel">
        <h2 className="slab" id="set-title">
          Teacher settings
        </h2>
        <label className="field">
          Board title
          <input value={settings.title} maxLength={40} onChange={(e) => set({ title: e.target.value })} />
        </label>
        <label className="chk">
          <input
            type="checkbox"
            checked={settings.sound}
            onChange={(e) => {
              if (!e.target.checked) hush();
              set({ sound: e.target.checked });
            }}
          />
          Sound and read aloud
        </label>
        {!voiceOk ? (
          <p className="note">
            Read aloud needs a voice installed on this computer. None was found, so questions won&apos;t be
            read aloud. Sound effects still work.
          </p>
        ) : null}
        <label className="chk">
          <input type="checkbox" checked={settings.slow} onChange={(e) => set({ slow: e.target.checked })} />
          Slower reading voice
        </label>
        <label className="chk">
          <input
            type="checkbox"
            checked={settings.teams}
            onChange={(e) => set({ teams: e.target.checked })}
          />
          Team mode (two teams take turns, a miss lets the other team steal)
        </label>
        <div className="row">
          <label className="field">
            Team 1
            <input
              value={settings.teamNames[0]}
              maxLength={14}
              onChange={(e) => teamName(0, e.target.value)}
            />
          </label>
          <label className="field">
            Team 2
            <input
              value={settings.teamNames[1]}
              maxLength={14}
              onChange={(e) => teamName(1, e.target.value)}
            />
          </label>
        </div>
        <div className="row">
          <button
            className="btn"
            onClick={() => {
              setProgress((p) => ({ ...p, score: [0, 0] }));
              setDone("Team scores reset");
            }}
          >
            Reset team scores
          </button>
          <button
            className="btn"
            onClick={() => {
              setProgress(DEFAULT_PROGRESS);
              setDone("Badges and trail reset");
            }}
          >
            Reset badges and trail
          </button>
          <button
            className="btn"
            onClick={() => {
              removeStored("levels");
              removeStored("review");
              setDone("Levels reset to the start");
            }}
          >
            Reset levels
          </button>
        </div>
        {done ? (
          <p className="note" role="status">
            {done}
          </p>
        ) : null}
        <p className="note">Settings and results save on this board. Nothing leaves the classroom yet.</p>
        <button ref={closeRef} className="btn main" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}
