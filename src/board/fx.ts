"use client";
/* Confetti on a full screen canvas. Decoration only, so Math.random is fine here. */

interface Part {
  x: number;
  y: number;
  vx: number;
  vy: number;
  c: string;
  s: number;
  r: number;
  life: number;
}

const COLORS = ["#e8692b", "#f6c344", "#2e9e55", "#6a86ad", "#a597c9", "#fff1d6", "#2f7cf6"];
let canvas: HTMLCanvasElement | null = null;
let parts: Part[] = [];
let raf = 0;

export function attachCanvas(el: HTMLCanvasElement | null): void {
  canvas = el;
  if (el) fit();
}

function fit() {
  if (!canvas) return;
  const d = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * d;
  canvas.height = window.innerHeight * d;
  canvas.getContext("2d")?.setTransform(d, 0, 0, d, 0, 0);
}
if (typeof window !== "undefined") window.addEventListener("resize", fit);

const calm = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function burst(x: number, y: number, n: number): void {
  if (!canvas || calm()) return;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = 4 + Math.random() * 10;
    parts.push({
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v - 7,
      c: COLORS[Math.floor(Math.random() * COLORS.length)]!,
      s: 7 + Math.random() * 9,
      r: Math.random() * 6,
      life: 100,
    });
  }
  if (!raf) raf = requestAnimationFrame(tick);
}

export function burstAt(el: Element | null, n = 70): void {
  if (!el) return;
  const r = el.getBoundingClientRect();
  burst(r.left + r.width / 2, r.top + r.height / 2, n);
}

function tick() {
  const g = canvas?.getContext("2d");
  if (!g) {
    raf = 0;
    return;
  }
  g.clearRect(0, 0, window.innerWidth, window.innerHeight);
  parts = parts.filter((p) => p.life-- > 0);
  for (const p of parts) {
    p.vy += 0.35;
    p.vx *= 0.99;
    p.x += p.vx;
    p.y += p.vy;
    p.r += 0.15;
    g.save();
    g.translate(p.x, p.y);
    g.rotate(p.r);
    g.globalAlpha = Math.min(1, p.life / 30);
    g.fillStyle = p.c;
    g.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
    g.restore();
  }
  raf = parts.length ? requestAnimationFrame(tick) : 0;
}
