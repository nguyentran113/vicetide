// rng.js — deterministic randomness for Vicetide (round 5 design).
// A string seed is folded into four 32-bit words by two interleaved
// multiply-xor mixers, then a xorshift128 core produces the stream.
// Every procedural choice in Port Solano draws from one of these, so a
// given seed always rebuilds the same city.

function foldSeed(text) {
  const s = String(text);
  let p = 0x2545f491;
  let q = 0x6a09e667;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i) + i;
    p = Math.imul(p ^ c, 0x9e3779b1);
    p = (p << 7) | (p >>> 25);
    q = Math.imul(q ^ (c * 31), 0x85ebca6b);
    q = (q << 11) | (q >>> 21);
  }
  return [p >>> 0, q >>> 0, (p ^ 0x27d4eb2d) >>> 0, (q ^ 0x165667b1) >>> 0];
}

export function makeRng(seedText) {
  let [x, y, z, w] = foldSeed(seedText);
  if ((x | y | z | w) === 0) { x = 0x12345678; y = 0x9abcdef0; z = 0x0badf00d; w = 0xdeadbeef; }

  function next() {
    const t = (x ^ ((x << 11) | 0)) | 0;
    x = y; y = z; z = w;
    w = (w ^ (w >>> 19) ^ t ^ (t >>> 8)) | 0;
    return (w >>> 0) / 4294967296;
  }

  return {
    next,
    range(lo, hi) { return lo + (hi - lo) * next(); },
    int(lo, hi) { return lo + Math.floor(next() * (hi - lo + 1)); },
    pick(arr) { return arr[Math.floor(next() * arr.length)]; },
    chance(p) { return next() < p; },
    jitter(amount) { return (next() * 2 - 1) * amount; },
  };
}
