/**
 * Math Utilities
 */

const MathUtil = {
  clamp(val, min, max) {
    return Math.min(max, Math.max(min, val));
  },

  lerp(a, b, t) {
    return a + (b - a) * t;
  },

  // Smooth lerp (ease in-out)
  smoothstep(a, b, t) {
    t = MathUtil.clamp(t, 0, 1);
    t = t * t * (3 - 2 * t);
    return a + (b - a) * t;
  },

  dist(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  },

  dist2(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return dx * dx + dy * dy;
  },

  angle(x1, y1, x2, y2) {
    return Math.atan2(y2 - y1, x2 - x1);
  },

  // Power Level formula from stats
  calcPL(str, spd, end, tech, ki) {
    return Math.floor((str * 2 + spd * 2 + end * 1.5 + tech * 1.5 + ki) * 0.5 + 3);
  },

  // Diminishing returns formula
  diminish(baseGain, currentStat, factor = 0.02) {
    return baseGain / (1 + currentStat * factor);
  },

  // Percent display helper
  pct(val, max) {
    return MathUtil.clamp(val / max, 0, 1);
  },

  // Sign of number (-1, 0, 1)
  sign(n) {
    return n < 0 ? -1 : n > 0 ? 1 : 0;
  },

  // Approach target value by step
  approach(current, target, step) {
    if (current < target) return Math.min(current + step, target);
    if (current > target) return Math.max(current - step, target);
    return target;
  },

  // Random integer in [min, max)
  randInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
  },

  // Random float in [0, 1)
  rand() {
    return Math.random();
  },

  // Map value from one range to another
  map(val, inMin, inMax, outMin, outMax) {
    return outMin + (outMax - outMin) * ((val - inMin) / (inMax - inMin));
  },

  // Rectangular AABB collision
  rectOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  },

  // Wrap value within range
  wrap(val, min, max) {
    const range = max - min;
    while (val < min) val += range;
    while (val >= max) val -= range;
    return val;
  },

  // Format number with commas
  formatNum(n) {
    return Math.floor(n).toLocaleString();
  },

  // Format seconds as mm:ss
  formatTime(secs) {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  },

  // Format in-game time as HH:MM AM/PM
  formatGameTime(secs) {
    const totalMins = Math.floor(secs / 60);
    const hours = Math.floor(totalMins / 60) % 24;
    const mins = totalMins % 60;
    const ampm = hours < 12 ? 'AM' : 'PM';
    const h = hours % 12 || 12;
    return `${h}:${mins.toString().padStart(2, '0')} ${ampm}`;
  },
};
