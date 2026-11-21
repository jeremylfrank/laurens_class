/**
 * Seeded pseudo random number generator (mulberry32).
 * Every game's makeItem() takes an Rng so items are reproducible in tests
 * and a missed item can be regenerated exactly from its seed.
 */
export interface Rng {
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [0, n). */
  int(n: number): number;
  /** Integer in [min, max], inclusive. */
  range(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  shuffle<T>(items: readonly T[]): T[];
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (n: number) => {
    if (!Number.isInteger(n) || n <= 0) throw new RangeError(`int(n) needs a positive integer, got ${n}`);
    return Math.floor(next() * n);
  };
  return {
    next,
    int,
    range: (min, max) => min + int(max - min + 1),
    pick: (items) => {
      if (items.length === 0) throw new RangeError("pick() from an empty list");
      return items[int(items.length)] as (typeof items)[number];
    },
    shuffle: (items) => {
      const out = [...items];
      for (let i = out.length - 1; i > 0; i--) {
        const j = int(i + 1);
        [out[i], out[j]] = [out[j] as (typeof out)[number], out[i] as (typeof out)[number]];
      }
      return out;
    },
  };
}
