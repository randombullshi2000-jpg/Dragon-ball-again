/**
 * Player Entity – Kaze
 * Handles movement, animations, and combat actions
 */

class Player {
  constructor(stats, hunger) {
    this.stats  = stats;
    this.hunger = hunger;

    // World position
    this.x  = 200;
    this.y  = 380;
    this.vx = 0;
    this.vy = 0;

    // Dimensions (canvas pixels)
    this.w  = 32 * C.SPRITE_SCALE;   // 96px
    this.h  = 32 * C.SPRITE_SCALE;   // 96px

    // Physics
    this.onGround    = true;
    this._gravity    = C.WORLD.GRAVITY;
    this._jumpHeld   = false;

    // Combat state
    this.hp          = stats.hp;
    this.stamina     = stats.stamina;
    this.ki          = stats.ki;
    this.maxHP       = stats.maxHP;
    this.maxStamina  = stats.maxStamina;
    this.maxKi       = stats.maxKi;
    this.powerLevel  = stats.powerLevel;

    this.blocking    = false;
    this.parryWindow = 0;
    this.hitStun     = 0;
    this.isAttacking = false;
    this.attackTimer = 0;
    this.facing      = 1;   // 1=right, -1=left

    // Ki charge
    this.kiCharging   = false;
    this.kiChargeTime = 0;

    // Status effects
    this.statusEffects = [];

    // Combo state (tracked by CombatSystem)
    this.currentCombo = 0;

    // Animation
    this.animState    = 'idle';   // idle|walk|run|jump|attack|block|hurt|dead|powerup|kamehameha
    this.animFrame    = 0;
    this.animTimer    = 0;
    this._animLoops   = { idle:8, walk:8, run:6, jump:5, attack:4, block:3, hurt:4, powerup:12 };
    this._shakeX      = 0;
    this._aura        = 0;   // 0-1 aura intensity

    // Stage-dependent sprite keys
    this._spriteMap   = this._buildSpriteMap();

    // Cooldowns
    this._lightCD   = 0;
    this._medCD     = 0;
    this._heavyCD   = 0;
    this._dodgeCD   = 0;
    this._dodgeI    = 0;   // invincibility frames

    // Danger / comeback state
    this._secondWindUsed = false;

    // Sprint state
    this.isSprinting = false;

    // Footstep timer
    this._stepTimer  = 0;
  }

  _buildSpriteMap() {
    const stage = this.stats.stage;
    if (stage >= 3) {
      return { idle:'KAZE_OGI_IDLE', run:'KAZE_OGI_RUN1', attack:'KAZE_OGI_KICK',
               hurt:'KAZE_HURT', jump:'KAZE_JUMP', block:'KAZE_OGI_IDLE',
               powerup:'KAZE_POWERUP', kamehameha:'KAZE_KAMEHAMEHA' };
    }
    if (stage >= 1) {
      return { idle:'KAZE_GI_IDLE', run:'KAZE_OGI_RUN1', attack:'KAZE_PUNCH',
               hurt:'KAZE_HURT', jump:'KAZE_JUMP', block:'KAZE_GI_IDLE',
               powerup:'KAZE_POWERUP', kamehameha:'KAZE_KAMEHAMEHA' };
    }
    return { idle:'KAZE_IDLE', run:'KAZE_RUN1', attack:'KAZE_PUNCH',
             hurt:'KAZE_HURT', jump:'KAZE_JUMP', block:'KAZE_IDLE',
             powerup:'KAZE_POWERUP', kamehameha:'KAZE_KAMEHAMEHA' };
  }

  // ─── Overworld update ───
  overworldUpdate(dt, world, input) {
    this._syncFromStats();
    this._handleOverworldInput(dt, input, world);
    this._applyPhysics(dt, world);
    this._regenStamina(dt);
    this._updateStatus(dt);
    this._updateAnim(dt);
    this._shakeX *= 0.7;
    if (this.hunger) this.hunger.setMode(this.isSprinting || this.isAttacking ? 'training' : 'idle');
  }

  _handleOverworldInput(dt, input, world) {
    const ax = input.axis.x;
    const ay = input.axis.y;
    const spd = this.isSprinting
      ? C.WORLD.SPRINT_SPEED + this.stats.speed * 3
      : C.WORLD.WALK_SPEED  + this.stats.speed * 2;

    if (Math.abs(ax) > 0.1) {
      this.vx = ax * spd;
      this.facing = ax > 0 ? 1 : -1;
    } else {
      this.vx *= 0.75;
    }

    // Sprint
    this.isSprinting = input.held(C.KEY.SPRINT) && this.stamina > 5;
    if (this.isSprinting) {
      this.stats.drainStamina(C.WORLD.SPRINT_DRAIN * dt);
    }

    // Jump
    if ((input.pressed('ArrowUp') || input.pressed('w')) && this.onGround) {
      this.vy = C.WORLD.JUMP_FORCE;
      this.onGround = false;
    }

    // Footstep sound
    if (Math.abs(this.vx) > 20 && this.onGround) {
      this._stepTimer -= dt;
      if (this._stepTimer <= 0) {
        this._stepTimer = this.isSprinting ? 0.25 : 0.40;
        Audio.step();
      }
    }
  }

  // ─── Combat update ───
  combatUpdate(dt, enemies) {
    this._syncFromStats();
    this._handleCombatInput(dt, enemies);
    this._applyCombatPhysics(dt);
    this._regenStamina(dt);
    this._updateStatus(dt);
    this._updateAnim(dt);
    this._shakeX *= 0.7;
    this.hunger.setMode('combat');
  }

  _handleCombatInput(dt, enemies) {
    if (this.hitStun > 0) {
      this.hitStun  -= dt;
      this.isAttacking = false;
      this.animState   = 'hurt';
      return;
    }

    const ax = Input.axis.x;

    // Movement (limited in combat)
    if (!this.isAttacking && !this.blocking) {
      this.vx = ax * (C.WORLD.WALK_SPEED + this.stats.speed * 2);
      if (Math.abs(ax) > 0.1) this.facing = ax > 0 ? 1 : -1;
    }

    // Block
    this.blocking = Input.held(C.KEY.L) && this.stamina > 5;
    if (this.blocking) {
      this.animState = 'block';
      this.stats.drainStamina(C.COMBAT.BLOCK_COST * dt);
      this.parryWindow = Math.max(0, this.parryWindow - dt);
    } else {
      this.parryWindow = 0;
    }

    // Dodge
    if (Input.pressed(C.KEY.R) && this._dodgeCD <= 0 && this.stamina >= C.COMBAT.DODGE_COST) {
      this.vx       = this.facing * 320;
      this.vy       = -80;
      this._dodgeI  = 0.3;
      this._dodgeCD = 0.6;
      this.stats.drainStamina(C.COMBAT.DODGE_COST);
      Audio.dodge();
    }
    this._dodgeCD  = Math.max(0, this._dodgeCD - dt);
    this._dodgeI   = Math.max(0, this._dodgeI  - dt);

    if (!this.isAttacking && !this.blocking) {
      // Light attack
      if (Input.pressed(C.KEY.A) && this._lightCD <= 0) {
        this._doAttack('light', enemies, dt);
      }
      // Medium attack
      else if (Input.pressed(C.KEY.X) && this._medCD <= 0) {
        this._doAttack('medium', enemies, dt);
      }
      // Heavy attack
      else if (Input.pressed(C.KEY.Y) && this._heavyCD <= 0) {
        this._doAttack('heavy', enemies, dt);
      }
    }
    this._lightCD = Math.max(0, this._lightCD - dt);
    this._medCD   = Math.max(0, this._medCD   - dt);
    this._heavyCD = Math.max(0, this._heavyCD - dt);

    // Ki charge
    if (Input.held(C.KEY.KI) && this.maxKi > 0) {
      this.kiCharging   = true;
      this.kiChargeTime += dt;
      this._aura = MathUtil.clamp(this.kiChargeTime / 5, 0, 1);
      this.animState = 'powerup';
    } else if (this.kiCharging) {
      // Release ki
      this.kiCharging = false;
      if (this.kiChargeTime >= 0.5 && this.stats.hasTechnique('kamehameha')) {
        this.animState = 'kamehameha';
        this.attackTimer = 0.6;
        this.isAttacking = true;
        // Actual beam fired by combat state
        this._pendingKamehameha = this.kiChargeTime;
      }
      this.kiChargeTime = 0;
      this._aura = 0;
    }

    // Attack timer
    if (this.isAttacking) {
      this.attackTimer -= dt;
      if (this.attackTimer <= 0) {
        this.isAttacking = false;
        this.animState   = 'idle';
      }
    }

    // Jump in combat
    if ((Input.pressed('ArrowUp') || Input.pressed('w')) && this.onGround) {
      this.vy = C.WORLD.JUMP_FORCE * 0.75;
      this.onGround = false;
    }

    // Parry window: pressing block just as an attack lands
    if (Input.pressed(C.KEY.L)) {
      this.parryWindow = C.COMBAT.PARRY_WINDOW;
    }

    // Danger state
    if (this.hp < this.maxHP * 0.20 && !this._secondWindUsed) {
      this._secondWindUsed = true;
      this.stats.heal(this.maxHP * 0.30);
      this.hp = this.stats.hp;
    }
  }

  _doAttack(type, enemies, dt) {
    const defs = {
      light:  { key: C.KEY.A,  cd: '_lightCD', dur: 0.30, attack: ATTACKS.punch,       staminaCost: C.COMBAT.STAMINA_LIGHT  },
      medium: { key: C.KEY.X,  cd: '_medCD',   dur: 0.50, attack: ATTACKS.kick,        staminaCost: C.COMBAT.STAMINA_MEDIUM },
      heavy:  { key: C.KEY.Y,  cd: '_heavyCD', dur: 0.90, attack: ATTACKS.heavy_punch, staminaCost: C.COMBAT.STAMINA_HEAVY  },
    };
    const def = defs[type];
    if (!def) return;
    if (this.stats.stamina < def.staminaCost) return;

    this.stats.drainStamina(def.staminaCost);
    this.isAttacking  = true;
    this.attackTimer  = def.dur;
    this[def.cd]      = def.dur + 0.1;
    this.animState    = 'attack';
    this.stats.stats.totalPunches++;

    // Hit detection (simple range check)
    for (const e of enemies) {
      if (e.hp <= 0) continue;
      const dist = Math.abs(this.x - e.x);
      const range = (def.attack.range || 1.0) * 60;
      if (dist <= range) {
        this.combatSystem?.resolveHit(this, e, def.attack);
      }
    }
  }

  _applyPhysics(dt, world) {
    // Gravity
    if (!this.onGround) {
      this.vy += this._gravity * dt;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // World bounds
    this.x = MathUtil.clamp(this.x, 48, world?.zoneWidth - 48 || 3792);

    // Ground collision (simplified flat ground for now)
    const groundY = world?.getGroundY(this.x) || 400;
    if (this.y >= groundY) {
      this.y        = groundY;
      this.vy       = 0;
      this.onGround = true;
    } else {
      this.onGround = false;
    }
  }

  _applyCombatPhysics(dt) {
    if (!this.onGround) this.vy += this._gravity * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vx *= Math.pow(0.80, dt * 60);

    const groundY = 400;
    if (this.y >= groundY) {
      this.y = groundY; this.vy = 0; this.onGround = true;
    } else {
      this.onGround = false;
    }
    this.x = MathUtil.clamp(this.x, 60, 900);
  }

  _regenStamina(dt) {
    let regen = 0;
    if (this.blocking)              regen = C.COMBAT.STAMINA_REGEN_BLOCK;
    else if (this.isAttacking)      regen = 0;
    else if (Math.abs(this.vx) > 5) regen = C.COMBAT.STAMINA_REGEN_MOVE;
    else                            regen = C.COMBAT.STAMINA_REGEN_IDLE;

    this.stats.restoreStamina(regen * dt);
    this.stamina = this.stats.stamina;

    // Ki passive regen
    if (this.stats.kiControl > 0) {
      this.stats.regenKi((this.stats.kiControl * 0.3) * dt);
      this.ki = this.stats.ki;
    }
  }

  _updateStatus(dt) {
    this.stats.updateEffects(dt);
    this.stats.updateInjuries(dt);
    for (const eff of this.statusEffects) {
      eff.duration -= dt;
      if (eff.tickDmg && (eff.tickTimer = (eff.tickTimer || 0) + dt) >= 1) {
        eff.tickTimer -= 1;
        this.takeDamage(eff.tickDmg, 'status');
      }
    }
    this.statusEffects = this.statusEffects.filter(e => e.duration > 0);
  }

  _updateAnim(dt) {
    // Determine animation state if not forced
    if (!this.isAttacking && !this.blocking && this.hitStun <= 0 && !this.kiCharging) {
      if (!this.onGround)            this.animState = 'jump';
      else if (Math.abs(this.vx) > C.WORLD.WALK_SPEED * 0.6) this.animState = this.isSprinting ? 'run' : 'walk';
      else                           this.animState = 'idle';
    }

    // Sprite map may need rebuild after stage change
    if (this.stats.stage !== this._lastStage) {
      this._lastStage  = this.stats.stage;
      this._spriteMap  = this._buildSpriteMap();
    }

    this.animTimer += dt;
    const fps = this.animState === 'run' ? 10 : this.animState === 'idle' ? 4 : 8;
    if (this.animTimer >= 1 / fps) {
      this.animTimer = 0;
      const frames = this._animLoops[this.animState] || 4;
      this.animFrame = (this.animFrame + 1) % frames;
    }
  }

  _syncFromStats() {
    this.maxHP       = this.stats.maxHP;
    this.maxStamina  = this.stats.maxStamina;
    this.maxKi       = this.stats.maxKi;
    this.powerLevel  = this.stats.powerLevel;
    this.hp          = this.stats.hp;
    this.stamina     = this.stats.stamina;
    this.ki          = this.stats.ki;
  }

  takeDamage(amount, type = 'physical') {
    if (this._dodgeI > 0) return 0;   // invincible during dodge
    const actual = this.stats.takeDamage(amount, type);
    this.hp      = this.stats.hp;
    this._shakeX = 8;
    this.animState = 'hurt';
    return actual;
  }

  applyHitStun(duration) {
    this.hitStun = Math.max(this.hitStun, duration);
  }

  applyStatus(type, duration, tickDmg = 0) {
    this.statusEffects = this.statusEffects.filter(e => e.type !== type);
    this.statusEffects.push({ type, duration, tickDmg, tickTimer: 0 });
  }

  // Reset player state for new game (or after load)
  reset(stats) {
    if (stats) this.stats = stats;
    this._syncFromStats();
    this.vx = 0; this.vy = 0;
    this.onGround = true;
    this.blocking = false; this.hitStun = 0; this.isAttacking = false;
    this.kiCharging = false; this.kiChargeTime = 0;
    this.statusEffects = [];
    this._secondWindUsed = false;
    this._dodgeCD = 0; this._dodgeI = 0;
    this.animState = 'idle'; this.animFrame = 0;
    this._spriteMap = this._buildSpriteMap();
  }

  draw(ctx, screenX, screenY) {
    const spKey = this._spriteMap[this.animState] || this._spriteMap.idle;
    const sp    = SPRITES[spKey];
    const sw    = (sp?.[0].length || 32) * C.SPRITE_SCALE;
    const sh    = (sp?.length    || 32) * C.SPRITE_SCALE;
    // If screenX/Y provided (overworld), use them; otherwise use world coords directly
    const sx    = (screenX !== undefined ? screenX : this.x) + this._shakeX - sw / 2;
    const sy    = (screenY !== undefined ? screenY : this.y) - sh;

    ctx.save();

    // Aura glow
    if (this._aura > 0 || this.kiCharging) {
      ctx.shadowColor = '#4db8ff';
      ctx.shadowBlur  = 20 * (this._aura || 0.3);
    }

    // Draw sprite
    if (sp) {
      drawSprite(ctx, sp, sx, sy, C.SPRITE_SCALE, this.facing < 0);
    } else {
      ctx.fillStyle = '#f4a261';
      ctx.fillRect(sx, sy, sw, sh);
    }

    // Flash on hurt
    if (this.hitStun > 0 && Math.floor(this.hitStun * 20) % 2 === 0) {
      ctx.globalAlpha = 0.6;
      ctx.fillStyle   = '#ffffff';
      if (sp) drawSprite(ctx, sp, sx, sy, C.SPRITE_SCALE, this.facing < 0);
    }

    // Dodge invincibility sparkle
    if (this._dodgeI > 0) {
      ctx.globalAlpha = 0.4 + 0.4 * Math.sin(Date.now() * 0.02);
      ctx.fillStyle   = '#a8d8ff';
      if (sp) drawSprite(ctx, sp, sx, sy, C.SPRITE_SCALE, this.facing < 0);
    }

    ctx.globalAlpha = 1;
    ctx.shadowBlur  = 0;
    ctx.restore();

    // Ki charge beam preview
    if (this.kiCharging && this.kiChargeTime > 0.3) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, this.kiChargeTime / 5);
      ctx.fillStyle   = '#4db8ff';
      ctx.shadowColor = '#4db8ff';
      ctx.shadowBlur  = 12;
      const bx = this.facing > 0 ? this.x + sw / 2 : this.x - sw / 2 - 60;
      ctx.fillRect(bx, this.y - 30, 60, 12);
      ctx.restore();
    }
  }

  setCombatSystem(cs) { this.combatSystem = cs; }

  get isDead()    { return this.hp <= 0; }
  get isMoving()  { return Math.abs(this.vx) > 10; }
  get isRunning() { return this.isSprinting; }
}
