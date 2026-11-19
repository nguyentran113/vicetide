// A small deterministic random generator (mulberry32 family).
// The city builder and the traffic spawner draw from one seeded stream so
// that a given seed always produces the same Port Solano — that is what
// makes the staged screenshot scenes reproducible.

export function createRandom(seed = 1) {
  let state = (seed >>> 0) || 1;

  function next() {
    state = (state + 0x6d2b79f5) | 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function range(lo, hi) {
    return lo + next() * (hi - lo);
  }

  function int(lo, hi) {
    return Math.floor(range(lo, hi + 1));
  }

  function pick(arr) {
    return arr[Math.floor(next() * arr.length)];
  }

  return { next, range, int, pick };
}
