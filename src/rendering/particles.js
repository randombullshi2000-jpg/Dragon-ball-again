/**
 * Particle System
 */

class ParticleSystem {
  constructor() {
    this._pool    = [];   // inactive particles
    this._active  = [];   // active particles
    this._maxPool = 400;
  }

  _get() {
    return this._pool.pop() || {};
  }

  _emit(x, y, vx, vy, color, life, size = 3, glow = false) {
    const p    = this._get();
    p.x        = x;
    p.y        = y;
    p.vx       = vx;
    p.vy       = vy;
    p.color    = color;
    p.life     = life;
    p.maxLife  = life;
    p.size     = size;
    p.glow     = glow;
    p.gravity  = 400;
    p.fade     = true;
    this._active.push(p);
  }

  // Burst of particles (generic)
  burst(x, y, color = '#ffffff', count = 8) {
    for (let i = 0; i < count; i++) {
      const angle  = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed  = 80 + Math.random() * 160;
      this._emit(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed - 50,
                 color, 0.4 + Math.random() * 0.3, 3 + Math.random() * 3);
    }
  }

  // Impact sparks
  impact(x, y, color = '#ffffff') {
    for (let i = 0; i < 5; i++) {
      const angle = (Math.random() - 0.5) * Math.PI;
      const speed = 60 + Math.random() * 120;
      this._emit(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed - 80,
                 color, 0.2 + Math.random() * 0.2, 2 + Math.random() * 2);
    }
  }

  // Critical hit burst
  critBurst(x, y) {
    this.burst(x, y, '#ffff00', 16);
    this.burst(x, y, '#ff8800', 8);
    this.burst(x, y, '#ffffff', 4);
  }

  // Ki aura particles
  kiAura(x, y, color = '#4db8ff', count = 3) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r     = 20 + Math.random() * 30;
      this._emit(x + Math.cos(angle) * r, y + Math.sin(angle) * r - 10,
                 (Math.random() - 0.5) * 30, -60 - Math.random() * 80,
                 color, 0.5 + Math.random() * 0.4, 2 + Math.random() * 2, true);
    }
  }

  // Dust (running)
  dust(x, y, dir = 1) {
    for (let i = 0; i < 2; i++) {
      this._emit(x, y, dir * -(40 + Math.random() * 60), -(10 + Math.random() * 30),
                 '#c8a875', 0.3 + Math.random() * 0.2, 2 + Math.random() * 2);
    }
  }

  // Rain drops
  rain(canvasW, canvasH, intensity = 100, windX = 0) {
    const count = Math.ceil(intensity * (1/60));
    for (let i = 0; i < count; i++) {
      const p       = this._get();
      p.x           = Math.random() * canvasW + windX * 30;
      p.y           = -10;
      p.vx          = windX * 80;
      p.vy          = 400 + Math.random() * 200;
      p.color       = ColorUtil.hexAlpha('#88bbff', 0.4 + Math.random() * 0.3);
      p.life        = 1.5;
      p.maxLife     = 1.5;
      p.size        = 1;
      p.glow        = false;
      p.gravity     = 0;
      p.fade        = true;
      p.isRain      = true;
      this._active.push(p);
    }
  }

  // Snow flakes
  snow(canvasW, intensity = 40) {
    const count = Math.ceil(intensity * (1/60));
    for (let i = 0; i < count; i++) {
      const p   = this._get();
      p.x       = Math.random() * canvasW;
      p.y       = -10;
      p.vx      = (Math.random() - 0.5) * 30;
      p.vy      = 40 + Math.random() * 60;
      p.color   = 'rgba(220,240,255,0.7)';
      p.life    = 8;
      p.maxLife = 8;
      p.size    = 1.5 + Math.random() * 2;
      p.glow    = false;
      p.gravity = 0;
      p.fade    = false;
      p.isSnow  = true;
      this._active.push(p);
    }
  }

  // Fire embers
  embers(x, y, count = 2) {
    for (let i = 0; i < count; i++) {
      this._emit(x + (Math.random() - 0.5) * 12,
                 y,
                 (Math.random() - 0.5) * 30,
                 -80 - Math.random() * 80,
                 Math.random() < 0.5 ? '#ff6b35' : '#f4d03f',
                 0.8 + Math.random() * 0.8, 1 + Math.random() * 2, true);
    }
  }

  // Level-up stars
  levelUpBurst(x, y) {
    for (let i = 0; i < 30; i++) {
      const angle = (Math.PI * 2 * i) / 30;
      const speed = 100 + Math.random() * 200;
      this._emit(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed - 100,
                 ['#f4d03f','#ff8800','#ff4444','#4db8ff','#ffffff'][Math.floor(Math.random() * 5)],
                 0.6 + Math.random() * 0.5, 3 + Math.random() * 4, true);
    }
  }

  update(dt) {
    for (let i = this._active.length - 1; i >= 0; i--) {
      const p = this._active[i];
      p.life -= dt;
      if (p.life <= 0) {
        this._active.splice(i, 1);
        if (this._pool.length < this._maxPool) this._pool.push(p);
        continue;
      }
      p.x  += p.vx * dt;
      p.y  += p.vy * dt;
      if (!p.isRain && !p.isSnow) p.vy += p.gravity * dt;
      if (p.isSnow) p.vx += (Math.random() - 0.5) * 10 * dt;
    }
  }

  draw(ctx, offsetX = 0, offsetY = 0) {
    ctx.save();
    for (const p of this._active) {
      const alpha = p.fade ? MathUtil.clamp(p.life / p.maxLife, 0, 1) : 1;
      ctx.globalAlpha = alpha;
      if (p.glow) {
        ctx.shadowColor = p.color;
        ctx.shadowBlur  = p.size * 3;
      }
      ctx.fillStyle = p.color;

      if (p.isRain) {
        ctx.fillRect(p.x - offsetX, p.y - offsetY, 1, p.size * 6);
      } else {
        ctx.beginPath();
        ctx.arc(p.x - offsetX, p.y - offsetY, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      if (p.glow) ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  get count() { return this._active.length; }
}
