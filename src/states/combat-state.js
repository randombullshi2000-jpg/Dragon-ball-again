/**
 * Combat State — real-time fighting
 */

class CombatState {
  constructor(game) {
    this.game       = game;
    this.name       = C.STATE.COMBAT;
    this._enemies   = [];
    this._conditions = {};
    this._particles  = new ParticleSystem();
    this._projectiles = [];
    this._timer      = 0;
    this._phase      = 'intro';  // intro | fight | win | lose | transition
    this._introTimer = 2.0;
    this._endTimer   = 0;
    this._result     = null;   // 'win' | 'lose'
    this._bgColor    = '#1a0820';
    this._flashTimer = 0;
    this._shakeX = 0;
    this._shakeY = 0;
    this._hitStopTimer = 0;
    this._blink = 0;
  }

  setup(enemyId, conditions) {
    const player = this.game.player;
    this._conditions = conditions || {};
    this._enemies = [];
    this._projectiles = [];
    this._timer  = 0;
    this._phase  = 'intro';
    this._introTimer = 2.0;
    this._result = null;

    const enemyDef = ENEMIES[enemyId];
    if (!enemyDef) {
      console.warn('Unknown enemy:', enemyId);
      this._phase = 'win';
      return;
    }

    // Spawn enemy (or pack) — Enemy(defId, x, y, combatSystem)
    const count = (enemyDef.behavior === 'pack') ? (enemyDef.groupSize || 2) : 1;
    for (let i = 0; i < count; i++) {
      const ex = C.W * 0.70 + i * 80;
      const ey = C.H * 0.55;
      const e  = new Enemy(enemyId, ex, ey, this.game.combat);
      this._enemies.push(e);
    }

    // Scale difficulty if adjustToPL flag
    if (enemyDef.adjustToPL) {
      const targetPL = player.stats.powerLevel * 1.5;
      const ratio    = targetPL / enemyDef.pl;
      for (const en of this._enemies) {
        en.hp = en.maxHP = Math.round(enemyDef.hp * ratio);
        en.powerLevel = Math.round(enemyDef.pl * ratio);
      }
    }

    // Choose background based on zone
    const zone = this.game.world.currentZoneId;
    this._bgColor = zone === 'mountain' ? '#0a0010'
      : zone === 'coast' ? '#001a20'
      : zone === 'desert' ? '#1a1000'
      : '#0a0820';

    // Combat system reset
    this.game.combat.reset(player, this._enemies, conditions);
    Audio.playMusic('combat');
    Input.showControls();
  }

  enter() {}

  exit() {
    Audio.stopMusic();
    this._enemies = [];
    this._projectiles = [];
  }

  update(dt) {
    this._timer += dt;
    this._blink = (this._blink + dt * 3) % (Math.PI * 2);

    // Hit stop
    if (this._hitStopTimer > 0) {
      this._hitStopTimer -= dt;
      return;
    }

    // Screen shake decay
    this._shakeX *= 0.85;
    this._shakeY *= 0.85;

    this._particles.update(dt);

    if (this._phase === 'intro') {
      this._introTimer -= dt;
      if (this._introTimer <= 0) this._phase = 'fight';
      return;
    }

    if (this._phase === 'fight') {
      this._updateFight(dt);
    } else if (this._phase === 'win' || this._phase === 'lose') {
      this._endTimer -= dt;
      if (this._endTimer <= 0) this._endCombat();
    }
  }

  _updateFight(dt) {
    const player  = this.game.player;
    const combat  = this.game.combat;
    const enemies = this._enemies.filter(e => e.alive);

    // Player combat input + update
    const attacks = player.combatUpdate(dt, enemies, Input);
    if (attacks && attacks.length > 0) {
      for (const atk of attacks) {
        this._resolvePlayerAttack(atk, enemies);
      }
    }

    // Projectile update
    for (const proj of this._projectiles) {
      proj.update(dt);
    }
    this._projectiles = this._projectiles.filter(p => p.alive);

    // Enemy AI updates
    for (const enemy of enemies) {
      const result = enemy.combatUpdate(dt, player);
      if (result && result.attack) {
        this._resolveEnemyAttack(result.attack, enemy, player);
      }
      if (result && result.projectile) {
        this._projectiles.push(result.projectile);
      }
    }

    // Check win condition
    const winCond = this._conditions.winCondition;
    const allDead = enemies.length === 0;

    if (winCond === 'land_10_hits' && combat.hitsLanded >= 10) {
      this._triggerWin();
    } else if (winCond && winCond.startsWith('last_')) {
      const seconds = parseInt(winCond.split('_')[1]);
      if (this._timer >= seconds && player.hp > 0) this._triggerWin();
    } else if (winCond === 'survive_3_min') {
      if (this._timer >= 180 && player.hp > 0) this._triggerWin();
    } else if (allDead) {
      this._triggerWin();
    }

    // Lose
    if (player.hp <= 0) {
      this._triggerLose();
    }

    // Hunger drain
    this.game.hunger.update(dt, 'combat');

    // Ki aura when charged
    if (player.ki > player.stats.maxKi * 0.7 && Math.random() < 0.2) {
      const sx = player.x + player.w / 2;
      const sy = player.y + player.h / 2;
      this._particles.kiAura(sx, sy, C.COL.KI_BLUE, 0.7);
    }
  }

  _resolvePlayerAttack(atk, enemies) {
    const player  = this.game.player;
    const combat  = this.game.combat;

    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      const dx = Math.abs((atk.x || player.x) - enemy.x);
      const range = atk.def ? atk.def.range * 64 : 80;
      if (dx > range) continue;

      // resolveHit handles takeDamage, hitStun, combo count internally
      const result = combat.resolveHit(player, enemy, atk.def || { damage: 0.08, range: 1.0 });
      if (!result) continue;  // parried

      const hitX = atk.x || player.x + player.w;
      const hitY = atk.y || enemy.y + enemy.h / 2;

      // Screen shake + hit stop
      this._doShake(result.damage * 0.2);
      this._hitStopTimer = 0.05;

      // Particles
      this._particles.impact(hitX, hitY, result.crit ? '#ff8800' : '#ffffff');
      if (result.crit && this._particles.critBurst) this._particles.critBurst(hitX, hitY);

      // Damage number
      Effects.spawnDamageNumber(hitX, hitY - 30, result.damage, result.crit, false);

      // Audio
      if (atk.type === 'ki') Audio.kiCharge && Audio.kiCharge();
      else if (result.crit) Audio.critHit && Audio.critHit();
      else Audio.punch && Audio.punch();

      // Check enemy death
      if (enemy.hp <= 0) {
        enemy.alive = false;
        this._particles.burst(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, '#ff4400', 25, 100);
        Effects.flash('#ff4400', 0.4);
        Audio.ko && Audio.ko();
        this._doShake(8);
      }
    }
  }

  _resolveEnemyAttack(atk, enemy, player) {
    const combat = this.game.combat;
    // resolveHit handles takeDamage and hit-stun internally
    const result = combat.resolveHit(enemy, player, atk || { damage: 0.06, range: 1.0 });
    if (!result) return;  // parried

    this._doShake(result.damage * 0.15);
    this._hitStopTimer = 0.04;

    this._particles.impact(
      player.x + player.w / 2,
      player.y + player.h / 2,
      '#ff2222'
    );

    Effects.spawnDamageNumber(
      player.x + player.w / 2,
      player.y,
      result.damage,
      false,
      true
    );

    Audio.hurt && Audio.hurt();

    if (player.hp <= 0) {
      Audio.ko && Audio.ko();
      Effects.flash('#ff0000', 0.8);
    }
  }

  _doShake(intensity) {
    const i = Math.min(intensity, 12);
    this._shakeX = (Math.random() - 0.5) * i * 2;
    this._shakeY = (Math.random() - 0.5) * i;
  }

  _triggerWin() {
    if (this._phase !== 'fight') return;
    this._phase    = 'win';
    this._result   = 'win';
    this._endTimer = 3.5;
    Effects.flash('#f4d03f', 0.6);
    Audio.levelUp && Audio.levelUp();

    // Rewards
    const xpTotal = this._enemies.reduce((s, e) => s + (e.xpZeni || e.def && e.def.xpZeni || 0), 0);
    this.game.stats.zeni = (this.game.stats.zeni || 0) + xpTotal;
    this.game.story.onCombatWin && this.game.story.onCombatWin(this._enemies.map(e => e.id));

    // Drops
    for (const enemy of this._enemies) {
      const drops = enemy.drops || (enemy.def && enemy.def.drops) || [];
      for (const drop of drops) {
        if (Math.random() < drop.chance) {
          this.game.addItem(drop.item, drop.amount || 1);
        }
      }
    }
  }

  _triggerLose() {
    if (this._phase !== 'fight') return;
    this._phase    = 'lose';
    this._result   = 'lose';
    this._endTimer = 3.0;
    Effects.flash('#ff0000', 1.0);
  }

  _endCombat() {
    const cb = this._conditions.onEnd;
    if (cb) cb(this._result);
    this.game.popState();
  }

  render(ctx, W, H, dt) {
    ctx.save();
    ctx.translate(Math.round(this._shakeX), Math.round(this._shakeY));

    // Background
    ctx.fillStyle = this._bgColor;
    ctx.fillRect(-8, -8, W + 16, H + 16);

    // Ground line
    const groundY = H * 0.72;
    ctx.fillStyle = '#1a1020';
    ctx.fillRect(0, groundY, W, H - groundY);
    ctx.strokeStyle = 'rgba(244,208,63,0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(W, groundY);
    ctx.stroke();

    // Particles behind characters
    this._particles.draw(ctx);

    // Projectiles
    for (const proj of this._projectiles) {
      proj.draw(ctx);
    }

    // Enemies
    for (const enemy of this._enemies) {
      if (!enemy.alive) continue;
      enemy.draw(ctx, enemy.x, enemy.y, this._timer);
      // HP bar
      HUD.drawBossHP && HUD.drawBossHP(ctx, enemy, W, H);
    }

    // Player
    const player = this.game.player;
    player.draw(ctx, player.x, player.y, this._timer);

    // Effects overlay
    Effects.draw(ctx, W, H, dt);

    // Intro banner
    if (this._phase === 'intro') {
      ctx.fillStyle = `rgba(0,0,0,${Math.min(1, this._introTimer)})`;
      ctx.fillRect(0, H * 0.38, W, 80);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#f4d03f';
      ctx.font = 'bold 28px monospace';
      ctx.shadowColor = '#f4d03f';
      ctx.shadowBlur = 15;
      const enemyName = this._enemies[0] ? this._enemies[0].name : 'FIGHT';
      ctx.fillText(enemyName, W / 2, H * 0.45);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 20px monospace';
      ctx.shadowBlur = 0;
      ctx.fillText('FIGHT!', W / 2, H * 0.45 + 34);
      ctx.shadowBlur = 0;
    }

    // Win overlay
    if (this._phase === 'win') {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, H * 0.35, W, 90);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#f4d03f';
      ctx.font = 'bold 32px monospace';
      ctx.shadowColor = '#f4d03f';
      ctx.shadowBlur  = 20;
      ctx.fillText('VICTORY!', W / 2, H * 0.47);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#cccccc';
      ctx.font = '14px monospace';
      const zeni = this._enemies.reduce((s, e) => s + (e.xpZeni || 0), 0);
      ctx.fillText(`+${zeni} ZENI`, W / 2, H * 0.47 + 30);
    }

    // Lose overlay
    if (this._phase === 'lose') {
      ctx.fillStyle = 'rgba(0,0,0,0.70)';
      ctx.fillRect(0, H * 0.35, W, 90);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ff3333';
      ctx.font = 'bold 32px monospace';
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur  = 20;
      ctx.fillText('DEFEATED', W / 2, H * 0.47);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#888';
      ctx.font = '13px monospace';
      ctx.fillText('Train harder...', W / 2, H * 0.47 + 30);
    }

    // HUD (HP bars, stamina, ki, combo)
    HUD.draw(ctx, player, this.game.stats, this.game.hunger, this.game.weather, this.game.story, this.game.combat, W, H);
    HUD.drawGuardMeter && HUD.drawGuardMeter(ctx, this.game.combat.playerGuard);

    ctx.restore();
  }
}
