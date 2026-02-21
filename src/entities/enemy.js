/**
 * Enemy Entity
 */

class Enemy {
  constructor(defId, x, y, combatSystem) {
    const def = ENEMIES[defId] || ENEMIES.bandit_grunt;
    this.def      = def;
    this.id       = def.id;
    this.name     = def.name;
    this.sprite   = def.sprite;
    this.color    = def.color || '#cc4422';

    this.x  = x;
    this.y  = y;
    this.vx = 0;
    this.vy = 0;
    this.w  = 48;
    this.h  = 80;

    // Stats scaled from def
    this.powerLevel = def.pl;
    this.hp         = def.hp;
    this.maxHP      = def.hp;
    this.stamina    = 100;
    this.maxStamina = 100;

    this.combatSystem = combatSystem;

    // Combat state
    this.blocking    = false;
    this.parryWindow = 0;
    this.hitStun     = 0;
    this.statusEffects = [];
    this.facing      = -1;   // faces left (toward player)

    // AI state machine
    this.aiState     = 'approach';   // approach | attack | dodge | stagger | stunned | knockdown | dead
    this._aiTimer    = 0;
    this._attackCooldown = 0;
    this._phase      = 0;

    // Animation
    this.animFrame   = 0;
    this.animTimer   = 0;
    this._shakeX     = 0;

    // Physics
    this.onGround    = true;
    this._gravity    = C.WORLD.GRAVITY;
  }

  takeDamage(amount, type = 'physical') {
    if (this.hp <= 0) return 0;
    const actual = Math.max(0, amount);
    this.hp = Math.max(0, this.hp - actual);
    this._shakeX = 6;

    // Phase check
    if (this.def.phases) {
      const pct = this.hp / this.maxHP;
      for (let i = this._phase; i < this.def.phases.length; i++) {
        if (pct <= this.def.phases[i].hpThreshold) {
          this._triggerPhase(i);
          this._phase = i + 1;
        }
      }
    }
    return actual;
  }

  _triggerPhase(phaseIdx) {
    const phase = this.def.phases[phaseIdx];
    if (phase.speedMult)  this._speedMult  = phase.speedMult;
    if (phase.damageMult) this._damageMult = phase.damageMult;
    // Emit phase message via combat system if available
    if (this.combatSystem?.onPhaseChange) {
      this.combatSystem.onPhaseChange(this, phase.message || '');
    }
  }

  applyHitStun(duration) {
    this.hitStun  = Math.max(this.hitStun, duration);
    this.aiState  = 'stagger';
    this._aiTimer = duration;
  }

  applyStatus(type, duration, tickDmg = 0) {
    this.statusEffects = this.statusEffects.filter(e => e.type !== type);
    this.statusEffects.push({ type, duration, tickDmg, tickTimer: 0 });
    if (type === 'stunned' || type === 'knockdown') {
      this.aiState  = type;
      this._aiTimer = duration;
    }
  }

  combatUpdate(dt, player) {
    if (this.hp <= 0) {
      this.aiState = 'dead';
      return;
    }

    // Physics
    if (!this.onGround) {
      this.vy += this._gravity * dt;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vx *= Math.pow(0.85, dt * 60);

    // Simple ground collision
    if (this.y >= 400) {
      this.y       = 400;
      this.vy      = 0;
      this.onGround = true;
    }

    // Status effects
    for (const eff of this.statusEffects) {
      eff.duration -= dt;
      if (eff.tickDmg > 0) {
        eff.tickTimer += dt;
        if (eff.tickTimer >= 1) {
          eff.tickTimer -= 1;
          this.takeDamage(eff.tickDmg, 'status');
        }
      }
    }
    this.statusEffects = this.statusEffects.filter(e => e.duration > 0);

    // Shake decay
    this._shakeX *= 0.7;
    if (Math.abs(this._shakeX) < 0.5) this._shakeX = 0;

    // Hit stun
    if (this.hitStun > 0) {
      this.hitStun -= dt;
      return;
    }

    // AI timers
    this._attackCooldown = Math.max(0, this._attackCooldown - dt);
    this._aiTimer        = Math.max(0, this._aiTimer - dt);

    // AI state machine
    this._aiThink(dt, player);

    // Animation
    this.animTimer += dt;
    if (this.animTimer > 0.15) {
      this.animTimer = 0;
      this.animFrame = (this.animFrame + 1) % 4;
    }

    // Face player
    this.facing = player.x < this.x ? -1 : 1;
  }

  _aiThink(dt, player) {
    const dist = Math.abs(this.x - player.x);
    const DIFF_REACT = { easy:0.5, normal:0.3, hard:0.15, master:0.05 };
    const react = DIFF_REACT['normal'];

    switch (this.aiState) {
      case 'approach': {
        // Move toward player
        const speed = (C.WORLD.WALK_SPEED + this.def.spd * 8) * (this._speedMult || 1.0);
        this.vx = (player.x > this.x ? 1 : -1) * speed * 0.6;
        if (dist < 80) { this.aiState = 'attack'; this._aiTimer = react; }
        break;
      }
      case 'attack': {
        if (this._aiTimer <= 0 && this._attackCooldown <= 0) {
          this._doAttack(player);
        }
        if (dist > 160) this.aiState = 'approach';
        break;
      }
      case 'stagger': {
        this.vx *= 0.8;
        if (this._aiTimer <= 0) this.aiState = 'approach';
        break;
      }
      case 'stunned':
      case 'knockdown': {
        if (this._aiTimer <= 0) {
          this.aiState = 'approach';
          this._attackCooldown = 1.0;
        }
        break;
      }
      case 'dodge': {
        this.vx = (player.x > this.x ? -1 : 1) * 300;
        if (this._aiTimer <= 0) this.aiState = 'approach';
        break;
      }
    }

    // Randomly dodge if player is attacking
    if (player.isAttacking && this.aiState === 'approach' && Math.random() < 0.02) {
      this.aiState  = 'dodge';
      this._aiTimer = 0.3;
    }
  }

  _doAttack(player) {
    const attackKeys = this.def.attacks || ['punch'];
    const key = RNG_LIVE.pick(attackKeys);
    const attackDef = ATTACKS[key];
    if (!attackDef) return;

    // Scale damage
    const scaledDef = { ...attackDef, damage: attackDef.damage * (this._damageMult || 1.0) };

    // Only hit if in range
    const dist = Math.abs(this.x - player.x);
    const range = (attackDef.range || 1.0) * 60;
    if (dist <= range) {
      this.combatSystem?.resolveHit(this, player, scaledDef);
    }

    // Cooldown scales with speed stat
    this._attackCooldown = 1.5 - Math.min(this.def.spd * 0.03, 0.8);
    this._aiTimer        = 0.3;
  }

  draw(ctx) {
    const sp   = SPRITES[this.sprite];
    const sx   = this.x + this._shakeX - (sp?.[0].length || 32) * C.SPRITE_SCALE / 2;
    const sy   = this.y - (sp?.length   || 32) * C.SPRITE_SCALE;

    ctx.save();

    if (this.hp <= 0) ctx.globalAlpha = 0.4;

    if (sp) {
      drawSprite(ctx, sp, sx, sy, C.SPRITE_SCALE, this.facing < 0);
    } else {
      ctx.fillStyle = this.color;
      ctx.fillRect(sx, sy, 32 * C.SPRITE_SCALE, 32 * C.SPRITE_SCALE);
    }

    // Status flash
    if (this.hitStun > 0 && Math.floor(this.hitStun * 20) % 2 === 0) {
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#ffffff';
      if (sp) drawSprite(ctx, sp, sx, sy, C.SPRITE_SCALE, this.facing < 0);
    }

    ctx.globalAlpha = 1;
    ctx.restore();

    // HP bar above enemy
    if (this.hp > 0) {
      const bw = 64, bh = 7;
      const bx = this.x - bw / 2;
      const by = sy - 12;
      ctx.fillStyle = '#220000';
      ctx.fillRect(bx, by, bw, bh);
      const hpPct = this.hp / this.maxHP;
      ctx.fillStyle = ColorUtil.statusColor(hpPct);
      ctx.fillRect(bx, by, bw * hpPct, bh);
      ctx.strokeStyle = '#666';
      ctx.lineWidth   = 1;
      ctx.strokeRect(bx, by, bw, bh);

      // Name
      ctx.font      = '10px monospace';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText(this.name, this.x, by - 2);
    }
  }

  get isDead() { return this.hp <= 0; }
}
