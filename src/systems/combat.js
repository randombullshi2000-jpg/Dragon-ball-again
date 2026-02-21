/**
 * Combat System – Real-time combat mechanics
 */

class CombatSystem {
  constructor(player, enemies, particles) {
    this.player    = player;
    this.enemies   = enemies;
    this.particles = particles;

    // Combo state
    this.comboCount  = 0;
    this.comboTimer  = 0;   // resets combo if > 1s
    this.maxCombo    = 0;

    // Guard meter
    this.playerGuard = C.COMBAT.GUARD_METER;

    // Combat timers
    this.slowMotion  = 0;   // seconds of slow-mo remaining
    this.flashTimer  = 0;

    // Lock-on target
    this.lockedEnemy = null;

    // Win/loss state
    this.result   = null;   // null | 'win' | 'loss'
    this.over     = false;

    // Win condition for scripted fights
    this.winCondition   = null;   // null | 'survive_N_sec' | 'last_N_sec' | 'land_N_hits'
    this.winTarget      = 0;
    this.winAccumulator = 0;
    this.survivedSecs   = 0;
    this.hitsLanded     = 0;
    this.fightTimer     = 0;
  }

  // Re-initialise for a new combat encounter (called by CombatState)
  reset(player, enemies, conditions) {
    this.player      = player;
    this.enemies     = enemies || [];
    this.comboCount  = 0;
    this.comboTimer  = 0;
    this.maxCombo    = 0;
    this.playerGuard = C.COMBAT.GUARD_METER;
    this.slowMotion  = 0;
    this.flashTimer  = 0;
    this.lockedEnemy = null;
    this.result      = null;
    this.over        = false;
    this.hitsLanded  = 0;
    this.survivedSecs = 0;
    this.fightTimer  = 0;
    const cond = conditions || {};
    this.winCondition = cond.winCondition || null;
    this.winTarget    = cond.winTarget    || 0;
  }

  setWinCondition(cond, target) {
    this.winCondition = cond;
    this.winTarget    = target;
  }

  update(dt) {
    if (this.over) return;
    const speed = this.slowMotion > 0 ? 0.3 : 1.0;
    const adt   = dt * speed;

    if (this.slowMotion > 0) this.slowMotion -= dt;
    if (this.flashTimer  > 0) this.flashTimer  -= dt;

    this.fightTimer += dt;
    this.comboTimer  -= dt;
    if (this.comboTimer <= 0) this.comboCount = 0;

    // Guard meter regen
    if (!this.player.blocking) {
      this.playerGuard = Math.min(C.COMBAT.GUARD_METER,
        this.playerGuard + 15 * dt);
    }

    // Update entities
    this.player.combatUpdate(adt, this.enemies);
    for (const e of this.enemies) e.combatUpdate(adt, this.player);

    // Win condition tracking
    if (this.winCondition) {
      this._checkWinCondition(dt);
    } else {
      // Default: all enemies dead
      if (this.enemies.every(e => e.hp <= 0)) {
        this._win();
      }
    }

    // Lose condition
    if (this.player.hp <= 0) {
      this._lose();
    }

    // Auto lock-on nearest
    this._updateLockOn();
  }

  _checkWinCondition(dt) {
    switch (this.winCondition) {
      case 'survive_N_sec':
      case 'last_N_sec':
        this.survivedSecs += dt;
        if (this.survivedSecs >= this.winTarget) this._win();
        break;
      case 'land_N_hits':
        if (this.hitsLanded >= this.winTarget) this._win();
        break;
      case 'reduce_stamina_50pct': {
        const e = this.enemies[0];
        if (e && e.stamina <= e.maxStamina * 0.5) this._win();
        break;
      }
    }
    // Also check max fight duration
    const maxDur = this.enemies[0]?.def?.maxFightDuration;
    if (maxDur && this.fightTimer >= maxDur) this._win();
  }

  _win() {
    if (this.over) return;
    this.over   = true;
    this.result = 'win';
    Audio.levelUp();
  }

  _lose() {
    if (this.over) return;
    this.over   = true;
    this.result = 'loss';
    Audio.ko();
  }

  _updateLockOn() {
    if (!this.enemies.length) { this.lockedEnemy = null; return; }
    if (!this.lockedEnemy || this.lockedEnemy.hp <= 0) {
      this.lockedEnemy = this.enemies.find(e => e.hp > 0) || null;
    }
  }

  // ─── Attack resolution ───
  resolveHit(attacker, defender, attackDef) {
    if (!attackDef) return { damage: 0, crit: false };
    const isPlayer = attacker === this.player || attacker.type === 'player';
    const dmgMult  = this.getComboMult();

    // Support both entity objects (powerLevel) and plain descriptors (pl)
    const atkPL = attacker.powerLevel || attacker.pl || 1;

    // Base damage
    let dmg = attackDef.damage * atkPL * dmgMult;

    // Crit check
    let crit = false;
    const critChance = (attacker.stats?.technique || attacker.technique || 0) * 0.015;
    if (Math.random() < critChance) {
      dmg *= C.COMBAT.CRIT_MULT;
      crit = true;
      this.flashTimer = 0.08;
    }

    // Blocked?
    if (defender.blocking && !attackDef.unblockable) {
      // Perfect block?
      const parried = defender.parryWindow > 0;
      if (parried) {
        this._resolveParry(attacker, defender);
        return;
      }
      // Normal block - chip damage
      dmg *= C.COMBAT.CHIP_DAMAGE;
      this.playerGuard -= (attackDef.guardDamage || 20);
      if (this.playerGuard <= 0) {
        this.playerGuard = 0;
        defender.applyStatus('stunned', 2.0);
        if (this.particles) this.particles.burst(defender.x, defender.y, '#ff4444', 8);
      }
      Audio.block();
    } else {
      // Hit!
      defender.takeDamage(dmg, attackDef.type || 'physical');

      // Multi-hit
      if (attackDef.hits > 1) {
        for (let h = 1; h < attackDef.hits; h++) {
          setTimeout(() => {
            if (defender.hp > 0) {
              const subDmg = attackDef.damage * attacker.powerLevel;
              defender.takeDamage(subDmg, 'physical');
              if (this.particles) this.particles.impact(defender.x, defender.y, '#ffaa00');
            }
          }, h * 80);
        }
      }

      // Hit stun
      const stun = attackDef.hitstun || 0.2;
      defender.applyHitStun(stun);

      // Knockback
      if (attackDef.knockback) {
        const dir = attacker.x < defender.x ? 1 : -1;
        defender.vx = attackDef.knockback * 200 * dir;
        defender.vy = -100;
      }

      // Launch
      if (attackDef.launch) {
        defender.vy = -400;
        defender.vx = (attacker.x < defender.x ? 1 : -1) * 150;
      }

      // Status effect
      if (attackDef.statusEffect) {
        defender.applyStatus(attackDef.statusEffect.type, attackDef.statusEffect.duration,
          attackDef.statusEffect.damage);
      }

      // Particles
      if (this.particles) {
        if (crit) {
          this.particles.critBurst(defender.x, defender.y);
          this.slowMotion = 0.15;
        } else {
          this.particles.impact(defender.x, defender.y, '#ffffff');
        }
      }

      // Combo tracking (player only)
      if (isPlayer) {
        this.comboCount++;
        this.comboTimer = 1.0;
        this.maxCombo   = Math.max(this.maxCombo, this.comboCount);
        this.hitsLanded++;

        if (this.comboCount > 0) {
          this.player.stats.stats.totalPunches++;
        }

        // Combo effects
        const tier = this._getComboTier(this.comboCount);
        if (tier >= 3) this.slowMotion = Math.max(this.slowMotion, 0.1);
      } else {
        // Enemy hit breaks player combo
        this.comboCount = 0;
      }

      // KO check
      if (defender.hp <= 0) {
        if (this.particles) this.particles.burst(defender.x, defender.y - 20, '#f4d03f', 20);
        defender.applyStatus('knockdown', 99);
      }

      Audio[crit ? 'critHit' : isPlayer ? 'punch' : 'hurt']?.();
    }

    return { damage: dmg, crit };
  }

  _resolveParry(attacker, defender) {
    const dir = defender.x < attacker.x ? 1 : -1;
    attacker.applyHitStun(1.0);
    attacker.vx = dir * 300;
    if (this.particles) this.particles.burst(attacker.x, attacker.y, '#00aaff', 6);
    Audio.block();
  }

  getComboMult() {
    return C.COMBAT.COMBO_BONUSES[this._getComboTier(this.comboCount)] || 1.0;
  }

  _getComboTier(count) {
    for (let i = C.COMBAT.COMBO_THRESHOLDS.length - 1; i >= 0; i--) {
      if (count >= C.COMBAT.COMBO_THRESHOLDS[i]) return i;
    }
    return 0;
  }

  getComboLabel() {
    if (this.comboCount < 3)   return '';
    if (this.comboCount < 6)   return 'GOOD!';
    if (this.comboCount < 10)  return 'GREAT!';
    if (this.comboCount < 15)  return 'EXCELLENT!';
    if (this.comboCount < 20)  return 'AMAZING!';
    if (this.comboCount < 26)  return 'INCREDIBLE!';
    return 'LEGENDARY!';
  }

  getComboColor() {
    if (this.comboCount < 6)  return '#ffff00';
    if (this.comboCount < 10) return '#ff9900';
    if (this.comboCount < 15) return '#ff6600';
    if (this.comboCount < 20) return '#ff4400';
    if (this.comboCount < 26) return '#ff00aa';
    return '#aa00ff';
  }

  // Ki Blast / Kamehameha resolution
  resolveKiHit(attacker, defender, chargeTime) {
    const baseDmg = attacker.powerLevel;
    let dmgMult;
    if      (chargeTime >= 5) dmgMult = 7.0;
    else if (chargeTime >= 4) dmgMult = 5.0;
    else if (chargeTime >= 3) dmgMult = 3.5;
    else if (chargeTime >= 2) dmgMult = 2.0;
    else                       dmgMult = 1.0;

    const dmg = baseDmg * dmgMult;
    defender.takeDamage(dmg, 'ki');
    if (this.particles) {
      this.particles.burst(defender.x, defender.y, '#4db8ff', 15);
    }
    this.slowMotion = chargeTime >= 3 ? 0.3 : 0.15;
    Audio.kamehameha();
    return dmg;
  }

  // Summary stats for end screen
  getSummary() {
    return {
      result:      this.result,
      comboMax:    this.maxCombo,
      hitsLanded:  this.hitsLanded,
      fightTime:   this.fightTimer,
      playerHP:    this.player.hp,
      playerHPMax: this.player.maxHP,
    };
  }
}
