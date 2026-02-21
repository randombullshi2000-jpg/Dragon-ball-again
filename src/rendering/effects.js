/**
 * Visual Effects – screen shake, flash, slow-mo, damage numbers
 */

const Effects = {
  _shakeX:  0,
  _shakeY:  0,
  _shakeT:  0,
  _flashAlpha: 0,
  _flashColor: '#ffffff',
  _slowMoT:  0,

  _damageNumbers: [],   // { x, y, text, color, life, vy }

  screenShake(intensity = 8, duration = 0.25) {
    this._shakeX = intensity;
    this._shakeY = intensity * 0.5;
    this._shakeT = duration;
  },

  screenFlash(color = '#ffffff', alpha = 0.6) {
    this._flashColor = color;
    this._flashAlpha = alpha;
  },

  slowMo(duration = 0.3) {
    this._slowMoT = duration;
  },

  // Floating damage/stat numbers
  spawnNumber(x, y, text, color = '#ffffff') {
    this._damageNumbers.push({
      x, y, text, color,
      life: 1.2,
      vy: -60,
      vx: (Math.random() - 0.5) * 20,
    });
  },

  spawnStatGain(x, y, stat, value) {
    const colors = {
      strength:'#ff6b35', speed:'#4db8ff', endurance:'#2ecc71',
      technique:'#f4d03f', kiControl:'#9b59b6',
    };
    const label = { strength:'STR', speed:'SPD', endurance:'END', technique:'TEC', kiControl:'KI' };
    const sign  = value >= 0 ? '+' : '';
    this.spawnNumber(x, y, `${sign}${value.toFixed(2)} ${label[stat] || stat}`,
                     colors[stat] || '#ffffff');
  },

  update(dt) {
    if (this._shakeT > 0) {
      this._shakeT -= dt;
      this._shakeX *= 0.85;
      this._shakeY *= 0.85;
    } else {
      this._shakeX = this._shakeY = 0;
    }

    if (this._flashAlpha > 0) this._flashAlpha = Math.max(0, this._flashAlpha - 3 * dt);
    if (this._slowMoT   > 0) this._slowMoT    = Math.max(0, this._slowMoT    - dt);

    for (let i = this._damageNumbers.length - 1; i >= 0; i--) {
      const n  = this._damageNumbers[i];
      n.life  -= dt;
      n.y     += n.vy * dt;
      n.x     += n.vx * dt;
      n.vy    *= 0.96;
      if (n.life <= 0) this._damageNumbers.splice(i, 1);
    }
  },

  getShakeOffset() {
    return {
      x: (Math.random() - 0.5) * this._shakeX * 2,
      y: (Math.random() - 0.5) * this._shakeY * 2,
    };
  },

  drawFlash(ctx, w, h) {
    if (this._flashAlpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = this._flashAlpha;
    ctx.fillStyle   = this._flashColor;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  },

  drawDamageNumbers(ctx, camX = 0, camY = 0) {
    ctx.save();
    for (const n of this._damageNumbers) {
      const alpha = MathUtil.clamp(n.life / 1.2, 0, 1);
      ctx.globalAlpha   = alpha;
      ctx.font          = `bold ${12 + Math.floor((1 - alpha) * 4)}px monospace`;
      ctx.textAlign     = 'center';
      ctx.strokeStyle   = '#000000';
      ctx.lineWidth     = 3;
      ctx.strokeText(n.text, n.x - camX, n.y - camY);
      ctx.fillStyle     = n.color;
      ctx.fillText(n.text, n.x - camX, n.y - camY);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  },

  // Aliases used by state files
  flash(color, alpha) { this.screenFlash(color, alpha); },

  spawnDamageNumber(x, y, damage, isCrit, isEnemy) {
    const text  = Math.round(damage).toString();
    const color = isEnemy ? '#ff4444' : isCrit ? '#ff8800' : '#ffffff';
    this.spawnNumber(x, y, text, color);
  },

  // Composite draw — call once per frame from states
  draw(ctx, W, H) {
    this.drawFlash(ctx, W, H);
    this.drawDamageNumbers(ctx);
  },

  drawCombo(ctx, count, label, color, x = 480, y = 120) {
    if (count < 3 || !label) return;
    ctx.save();
    const scale = 1 + Math.min(0.5, count * 0.015);
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.textAlign     = 'center';
    ctx.font          = `bold 28px monospace`;
    ctx.strokeStyle   = '#000';
    ctx.lineWidth     = 4;
    ctx.strokeText(label, 0, 0);
    ctx.fillStyle     = color;
    ctx.fillText(label, 0, 0);
    ctx.font          = '14px monospace';
    ctx.fillStyle     = '#ffffff';
    ctx.strokeText(`${count} HITS`, 0, 22);
    ctx.fillText(`${count} HITS`, 0, 22);
    ctx.restore();
  },
};
