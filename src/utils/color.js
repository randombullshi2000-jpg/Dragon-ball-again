/**
 * Color Utilities
 */

const ColorUtil = {
  // Parse hex color to [r,g,b]
  hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b];
  },

  // Convert [r,g,b] to hex
  rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(v => Math.floor(MathUtil.clamp(v, 0, 255))
      .toString(16).padStart(2, '0')).join('');
  },

  // Lerp between two hex colors
  lerpColor(hexA, hexB, t) {
    const [ar, ag, ab] = ColorUtil.hexToRgb(hexA);
    const [br, bg, bb] = ColorUtil.hexToRgb(hexB);
    return ColorUtil.rgbToHex(
      MathUtil.lerp(ar, br, t),
      MathUtil.lerp(ag, bg, t),
      MathUtil.lerp(ab, bb, t)
    );
  },

  // Add alpha to hex color -> rgba string
  hexAlpha(hex, alpha) {
    const [r, g, b] = ColorUtil.hexToRgb(hex);
    return `rgba(${r},${g},${b},${alpha})`;
  },

  // Darken a color by factor (0-1)
  darken(hex, factor) {
    const [r, g, b] = ColorUtil.hexToRgb(hex);
    return ColorUtil.rgbToHex(r * (1 - factor), g * (1 - factor), b * (1 - factor));
  },

  // Lighten a color by factor (0-1)
  lighten(hex, factor) {
    const [r, g, b] = ColorUtil.hexToRgb(hex);
    return ColorUtil.rgbToHex(
      r + (255 - r) * factor,
      g + (255 - g) * factor,
      b + (255 - b) * factor
    );
  },

  // Generate color based on HP/stamina percentage (green -> yellow -> red)
  statusColor(pct) {
    if (pct > 0.5) {
      return ColorUtil.lerpColor('#f1c40f', '#2ecc71', (pct - 0.5) * 2);
    } else {
      return ColorUtil.lerpColor('#e74c3c', '#f1c40f', pct * 2);
    }
  },

  // Sky color based on time of day (0-1)
  skyColor(timePct) {
    // 0=midnight, 0.25=dawn, 0.5=noon, 0.75=dusk, 1=midnight
    const colors = [
      [0.0,  '#050510'],
      [0.2,  '#0a0820'],
      [0.25, '#1a0830'],
      [0.28, '#5c2a5c'],
      [0.32, '#e06030'],
      [0.38, '#87ceeb'],
      [0.5,  '#5db8ff'],
      [0.62, '#87ceeb'],
      [0.68, '#e08030'],
      [0.72, '#5c2a5c'],
      [0.75, '#1a0830'],
      [0.8,  '#0a0820'],
      [1.0,  '#050510'],
    ];
    for (let i = 0; i < colors.length - 1; i++) {
      const [t0, c0] = colors[i];
      const [t1, c1] = colors[i + 1];
      if (timePct >= t0 && timePct <= t1) {
        const t = (timePct - t0) / (t1 - t0);
        return ColorUtil.lerpColor(c0, c1, t);
      }
    }
    return '#050510';
  },
};
