/**
 * Projectile Entity (ki blasts, Kamehameha beam, etc.)
 */

class Projectile {
  constructor(x, y, vx, vy, owner, def, particles) {
    this.x    = x;
    this.y    = y;
    this.vx   = vx;
    this.vy   = vy;
    this.owner = owner;
    this.def  = def;
    this.particles = particles;

    this.w    = def.wide ? 80 : 16;
    this.h    = def.wide ? 24 : 16;
    this.alive = true;
    this.age  = 0;
    this.maxAge = def.maxAge || 3.0;

    // Visual trail
    this.trail = [];
    this.color = def.color || '#4db8ff';
    this.glowColor = def.glowColor || '#a8d8ff';
  }

  update(dt, targets) {
    if (!this.alive) return;
    this.age += dt;
    if (this.age >= this.maxAge) { this.alive = false; return; }

    // Store trail
    this.trail.push({ x: this.x, y: this.y, age: 0 });
    for (const t of this.trail) t.age += dt;
    this.trail = this.trail.filter(t => t.age < 0.15);

    // Move
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Gravity for thrown objects
    if (this.def.gravity) this.vy += 600 * dt;

    // Hit detection
    for (const target of targets) {
      if (target === this.owner || target.hp <= 0) continue;
      if (MathUtil.rectOverlap(this.x - this.w/2, this.y - this.h/2, this.w, this.h,
                               target.x - 24, target.y - 64, 48, 64)) {
        this._onHit(target);
        break;
      }
    }

    // Off-screen
    if (this.x < -200 || this.x > 4200 || this.y < -200 || this.y > 800) {
      this.alive = false;
    }
  }

  _onHit(target) {
    const dmg = (this.def.damage || 0) * (this.owner.powerLevel || 10);
    target.takeDamage(dmg, 'ki');
    target.applyHitStun(0.4);

    if (this.particles) {
      this.particles.burst(this.x, this.y, this.glowColor, 12);
    }
    Audio.hurt?.();
    this.alive = false;
  }

  draw(ctx) {
    if (!this.alive) return;
    const s = C.SCALE;

    // Draw trail
    ctx.save();
    for (let i = 0; i < this.trail.length; i++) {
      const t = this.trail[i];
      const alpha = (1 - t.age / 0.15) * 0.4;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = this.glowColor;
      ctx.beginPath();
      ctx.arc(t.x, t.y, (this.w / 2) * (1 - t.age / 0.15), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Glow
    ctx.shadowColor = this.glowColor;
    ctx.shadowBlur  = 16;

    ctx.fillStyle = this.color;
    if (this.def.wide) {
      // Beam projectile
      ctx.fillRect(this.x - this.w / 2, this.y - this.h / 2, this.w, this.h);
    } else {
      // Ball
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.w / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

// Factory functions
function makeKiBlast(x, y, dir, owner, particles) {
  return new Projectile(x, y, dir * 480, -20, owner, {
    damage: 0.12,
    color:  '#4db8ff',
    glowColor: '#a8d8ff',
    maxAge: 2.0,
  }, particles);
}

function makeKamehameha(x, y, dir, owner, chargeTime, particles) {
  const mult = [1,1,2,3.5,5,7][Math.floor(MathUtil.clamp(chargeTime,0,5))];
  return new Projectile(x, y, dir * 800, 0, owner, {
    damage: 0.12 * mult,
    color:  '#88ccff',
    glowColor: '#ffffff',
    maxAge: 1.5,
    wide: true,
    gravity: false,
  }, particles);
}
