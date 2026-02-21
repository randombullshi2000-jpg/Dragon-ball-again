/**
 * Seeded random number generator (Xorshift32)
 * For deterministic procedural generation
 */

class SeededRandom {
  constructor(seed = Date.now()) {
    this.seed = seed >>> 0;
    if (this.seed === 0) this.seed = 1;
  }

  next() {
    let x = this.seed;
    x ^= x << 13;
    x ^= x >> 17;
    x ^= x << 5;
    this.seed = x >>> 0;
    return (this.seed >>> 0) / 4294967296;
  }

  int(min, max) {
    return Math.floor(this.next() * (max - min)) + min;
  }

  bool(prob = 0.5) {
    return this.next() < prob;
  }

  pick(arr) {
    return arr[this.int(0, arr.length)];
  }

  shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = this.int(0, i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}

// Global RNG instances
const RNG = new SeededRandom(42);          // world generation (stable)
const RNG_LIVE = new SeededRandom(Date.now()); // live randomness (varies)
