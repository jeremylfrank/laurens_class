"use client";
import { useCallback, useEffect, useState } from "react";
import { useMounted, usePersisted } from "@/lib/storage";
import { GAMES, findGame } from "@/games/registry";
import { Badge, GAME_ICONS, Scene } from "@/themes/national-parks/art";
import { GameStage } from "./GameStage";
import { RaceStage } from "./RaceStage";
import { TouchTest } from "./TouchTest";
import { SettingsPanel } from "./SettingsPanel";
import { attachCanvas, burst } from "./fx";
import { hush, say } from "./sound";
import { FullIcon, GearIcon, HomeIcon, MuteIcon, SpeakIcon } from "./icons";
import { useProgress, useSettings } from "./settings";
import { useBoardSync } from "@/data/sync";

type View = { name: "home" } | { name: "game"; id: string } | { name: "race" } | { name: "touch" };
const HOME: View = { name: "home" };

export function BoardApp() {
  const mounted = useMounted();
  return (
    <>
      <Scene />
      {mounted ? <Board /> : null}
    </>
  );
}

function Board() {
  const [view, setView] = useState<View>(HOME);
  const [settings, setSettings] = useSettings();
  const [progress] = useProgress();
  const [showSettings, setShowSettings] = useState(false);
  useBoardSync();
  const [cheer, setCheer] = useState(false);
  const game = view.name === "game" ? findGame(view.id) : view.name === "race" ? GAMES[0] : undefined;
  const [modeId, setModeId] = usePersisted<string>(
    `mode:${game?.def.id ?? "none"}`,
    game?.def.modes[0]?.id ?? "",
  );

  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const block = (e: MouseEvent) => {
      if (!(e.target as Element).closest("input, textarea")) e.preventDefault();
    };
    window.addEventListener("contextmenu", block);
    return () => window.removeEventListener("contextmenu", block);
  }, []);

  const onSummit = useCallback(() => {
    setTimeout(() => {
      setCheer(true);
      burst(window.innerWidth / 2, window.innerHeight / 2, 180);
      if (settings.sound) say("Summit! You earned a Junior Ranger badge!", settings.slow);
      setTimeout(() => setCheer(false), 3200);
    }, 700);
  }, [settings.sound, settings.slow]);

  const goHome = () => {
    hush();
    setView(HOME);
  };

  const fullscreen = () => {
    try {
      if (document.fullscreenElement) void document.exitFullscreen();
      else void document.documentElement.requestFullscreen();
    } catch {
      // not supported
    }
  };

  if (view.name === "touch") return <TouchTest onDone={goHome} />;

  const title = view.name === "game" && game ? game.def.title : settings.title;

  return (
    <div className="app">
      {view.name !== "race" ? (
        <header className="bar">
          <h1 className="slab">{title}</h1>
          {view.name === "game" && game ? (
            <div className="modes" role="group" aria-label="Level">
              {game.def.modes.map((m) => (
                <button key={m.id} aria-pressed={m.id === modeId} onClick={() => setModeId(m.id)}>
                  {m.label}
                </button>
              ))}
            </div>
          ) : null}
          {settings.teams && view.name === "game" ? (
            <div className="teams" aria-live="polite">
              {settings.teamNames.map((n, i) => (
                <span key={i} className={`pill team${i}`}>
                  {n} <b data-testid={`team-score-${i}`}>{progress.score[i]}</b>
                </span>
              ))}
            </div>
          ) : null}
          <span className="pill badges" title="Junior Ranger badges earned">
            <Badge />
            <b>{progress.badges}</b>
          </span>
          <button
            className="pill"
            aria-pressed={settings.sound}
            onClick={() => {
              if (settings.sound) hush();
              setSettings({ ...settings, sound: !settings.sound });
            }}
          >
            {settings.sound ? <SpeakIcon /> : <MuteIcon />}
            <span className="lbl">{settings.sound ? "Sound on" : "Sound off"}</span>
          </button>
          <button className="pill" aria-label="Teacher settings" onClick={() => setShowSettings(true)}>
            <GearIcon />
            <span className="lbl">Teacher</span>
          </button>
          <button className="pill" aria-label="Full screen" onClick={fullscreen}>
            <FullIcon />
          </button>
          {view.name !== "home" ? (
            <button className="pill" onClick={goHome}>
              <HomeIcon />
              <span className="lbl">Trailhead</span>
            </button>
          ) : null}
        </header>
      ) : null}

      {view.name === "home" ? (
        <main>
          <div className="hero">
            <div className="sign">
              <h2 className="slab">{settings.title}</h2>
              <p>Pick a trail, Junior Rangers!</p>
            </div>
          </div>
          <div className="tiles">
            {GAMES.map((g) => (
              <button
                key={g.def.id}
                className="gtile sign"
                onClick={() => setView({ name: "game", id: g.def.id })}
              >
                <span className="gico">{GAME_ICONS[g.def.id]}</span>
                <span>
                  <span className="gname slab">{g.def.title}</span>
                  <span className="gblurb">{g.def.blurb}</span>
                </span>
              </button>
            ))}
            <button className="gtile sign" onClick={() => setView({ name: "race" })}>
              <span className="gico">{GAME_ICONS.race}</span>
              <span>
                <span className="gname slab">Summit Race</span>
                <span className="gblurb">Two teams, two trails, tap at once</span>
              </span>
            </button>
            <button className="gtile sign" onClick={() => setView({ name: "touch" })}>
              <span className="gico">{GAME_ICONS.touch}</span>
              <span>
                <span className="gname slab">Touch Test</span>
                <span className="gblurb">Check the board sees two hands</span>
              </span>
            </button>
          </div>
          <p className="foot">
            Every right answer moves your hiker up the trail. Reach the summit to earn a Junior Ranger badge.
          </p>
        </main>
      ) : null}

      {view.name === "game" && game ? (
        <GameStage
          key={`${game.def.id}:${modeId}:${settings.teams}`}
          game={game}
          modeId={modeId}
          settings={settings}
          onSummit={onSummit}
        />
      ) : null}

      {view.name === "race" && game ? (
        <RaceStage key={modeId} game={game} modeId={modeId} settings={settings} onExit={goHome} />
      ) : null}
      {view.name === "race" && game ? (
        <div className="race-modes modes" role="group" aria-label="Level">
          {game.def.modes.map((m) => (
            <button key={m.id} aria-pressed={m.id === modeId} onClick={() => setModeId(m.id)}>
              {m.label}
            </button>
          ))}
        </div>
      ) : null}

      <canvas className="fx" ref={attachCanvas} aria-hidden="true" />
      {cheer ? (
        <div className="cheer">
          <div className="sign slab">
            <Badge size={80} />
            Summit!
            <small>You earned a Junior Ranger badge</small>
          </div>
        </div>
      ) : null}
      {showSettings ? (
        <SettingsPanel settings={settings} onChange={setSettings} onClose={() => setShowSettings(false)} />
      ) : null}
    </div>
  );
}
