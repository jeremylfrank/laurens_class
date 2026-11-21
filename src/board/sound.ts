"use client";
/* Sound effects and read aloud. Read aloud only uses voices installed on this computer,
   so question text never goes to an online speech service, and it works offline. */

let ctx: AudioContext | null = null;

export function tone(freqs: number[], dur: number, type: OscillatorType, pan = 0): void {
  try {
    ctx = ctx ?? new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    const t = ctx.currentTime;
    freqs.forEach((f, i) => {
      const c = ctx!;
      const o = c.createOscillator();
      const g = c.createGain();
      const p = c.createStereoPanner();
      p.pan.value = pan;
      o.type = type;
      o.frequency.value = f;
      const s = t + i * dur;
      g.gain.setValueAtTime(0.0001, s);
      g.gain.exponentialRampToValueAtTime(0.2, s + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, s + dur * 1.6);
      o.connect(g).connect(p).connect(c.destination);
      o.start(s);
      o.stop(s + dur * 1.8);
    });
  } catch {
    // No audio on this device.
  }
}

export const yay = (pan = 0) => tone([523, 659, 784, 1047], 0.09, "triangle", pan);
export const nope = (pan = 0) => tone([260, 190], 0.14, "sine", pan);

function localVoice(): SpeechSynthesisVoice | null {
  try {
    const voices = speechSynthesis.getVoices().filter((v) => v.localService);
    return (
      voices.find((v) => v.lang.startsWith("en") && v.default) ??
      voices.find((v) => v.lang.startsWith("en")) ??
      null
    );
  } catch {
    return null;
  }
}

export function hasLocalVoice(): boolean {
  return localVoice() !== null;
}

export function say(text: string, slow: boolean): void {
  try {
    speechSynthesis.cancel();
    const voice = localVoice();
    if (!voice || !text) return;
    const u = new SpeechSynthesisUtterance(text);
    u.voice = voice;
    u.rate = slow ? 0.72 : 0.9;
    u.pitch = 1.05;
    speechSynthesis.speak(u);
  } catch {
    // No speech on this device.
  }
}

export function hush(): void {
  try {
    speechSynthesis.cancel();
  } catch {
    // ignore
  }
}
