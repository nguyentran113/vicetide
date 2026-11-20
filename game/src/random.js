// Deterministic randomness for world generation.
//
// Port Solano is built from a single seeded stream: feed the same seed
// in and the same city, traffic and crowd come out, which is what lets
// the staged screenshot scenes be re-shot identically at any time.
//
// The generator is a splitmix-style counter hash: the state advances
// by a fixed odd increment and is then scrambled with two xorshift /
// multiply rounds. Period is 2^32, plenty for one city's worth of
// coin flips.

export function createRandom(seed = 1) {
  let counter = (seed >>> 0) || 1;

  function next() {
    counter = (counter + 0x9e3779b9) >>> 0;
    let z = counter;
    z = Math.imul(z ^ (z >>> 16), 0x21f0aaad);
    z = Math.imul(z ^ (z >>> 15), 0x735a2d97);
    z = (z ^ (z >>> 15)) >>> 0;
    return z / 4294967296;
  }

  function range(lo, hi) {
    return lo + (hi - lo) * next();
  }

  function int(lo, hi) {
    return lo + Math.floor(next() * (hi - lo + 1));
  }

  function pick(list) {
    return list[Math.floor(next() * list.length)];
  }

  return { next, range, int, pick };
}
