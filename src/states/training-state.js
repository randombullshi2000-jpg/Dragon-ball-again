/**
 * Training State — select and perform training exercises
 */

class TrainingState {
  constructor(game) {
    this.game       = game;
    this.name       = C.STATE.TRAINING;
    this._mode      = 'select';   // select | active | result
    this._menuIdx   = 0;
    this._category  = null;       // filtered category or null = all
    this._exercises = [];
    this._activeExercise = null;
    this._result    = null;
    this._resultTimer = 0;
    this._particles = new ParticleSystem();
    this._timer     = 0;
    this._inputCooldown = 0;
    this._blink     = 0;
    // Mini-game state for active training
    this._tapCount  = 0;
    this._tapTarget = 10;
    this._tapWindow = 3.0;
    this._tapTimer  = 0;
    this._flowMeter = 0; // 0-1, built by timely taps
    this._sweatAnim = 0;
  }

  setup(trainerId) {
    this._trainerId = trainerId;
    this._mode      = 'select';
    this._menuIdx   = 0;
    this._result    = null;
    this._refreshExercises();
  }

  _refreshExercises() {
    const act = this.game.story.act;
    this._exercises = getAvailableExercises
      ? getAvailableExercises(this.game.stats, act)
      : TRAINING_EXERCISES.slice(0, 10);
  }

  enter() {
    Audio.playMusic('training');
    Input.showControls();
  }

  exit() {
    Audio.stopMusic();
  }

  update(dt) {
    this._timer += dt;
    this._blink = (this._blink + dt * 2) % (Math.PI * 2);
    this._inputCooldown = Math.max(0, this._inputCooldown - dt);

    this._particles.update(dt);

    if (this._mode === 'select') this._updateSelect(dt);
    else if (this._mode === 'active') this._updateActive(dt);
    else if (this._mode === 'result') this._updateResult(dt);
  }

  _updateSelect(dt) {
    const exList = this._exercises;
    if (!exList || exList.length === 0) return;

    if (this._inputCooldown > 0) return;

    if (Input.pressed('ArrowUp') || Input.axis.y < -0.5) {
      this._menuIdx = Math.max(0, this._menuIdx - 1);
      Audio.menuSelect();
      this._inputCooldown = 0.15;
    }
    if (Input.pressed('ArrowDown') || Input.axis.y > 0.5) {
      this._menuIdx = Math.min(exList.length - 1, this._menuIdx + 1);
      Audio.menuSelect();
      this._inputCooldown = 0.15;
    }

    if (Input.pressed(C.KEY.A) || Input.pressed('Enter')) {
      this._startExercise(exList[this._menuIdx]);
    }

    if (Input.pressed(C.KEY.B) || Input.pressed('Escape')) {
      Audio.menuBack && Audio.menuBack();
      this.game.popState();
    }
  }

  _startExercise(ex) {
    Audio.menuConfirm();
    this._activeExercise = ex;
    this._mode = 'active';
    this._tapCount  = 0;
    this._tapTarget = ex.taps || 15;
    this._tapWindow = ex.duration || 5.0;
    this._tapTimer  = this._tapWindow;
    this._flowMeter = 0;
    this._sweatAnim = 0;

    this.game.training.start(ex.id, {
      location: this.game.world.currentZoneId,
      weather:  this.game.weather.type,
      timeOfDay: this.game.weather.hour,
      equipment: this.game.player.equipment,
    });
  }

  _updateActive(dt) {
    this._tapTimer  -= dt;
    this._sweatAnim += dt;

    const ex = this._activeExercise;

    // Tap-based mini-game: press A rapidly
    if (Input.pressed(C.KEY.A) || Input.pressed(' ') || Input.pressed('Enter')) {
      this._tapCount++;
      // Flow meter: reward evenly spaced taps
      const idealInterval = this._tapWindow / this._tapTarget;
      const timeSinceLast = this._tapWindow - this._tapTimer;
      const err = Math.abs((timeSinceLast % idealInterval) - idealInterval / 2);
      const flowGain = 1.0 - MathUtil.clamp(err / (idealInterval / 2), 0, 1);
      this._flowMeter = MathUtil.clamp(this._flowMeter + flowGain * 0.15, 0, 1);

      // Particle burst on tap
      this._particles.burst(480, 300, '#f4d03f', 4, 30);
      Audio.punch && Audio.punch();
    }

    // Decrement flow if not tapping
    this._flowMeter = Math.max(0, this._flowMeter - dt * 0.08);

    // Ki aura particle
    if (Math.random() < 0.2) {
      this._particles.kiAura(480 + (Math.random() - 0.5) * 150,
                              300 + (Math.random() - 0.5) * 60,
                              '#f4d03f', 0.5);
    }

    // Cancel
    if (Input.pressed(C.KEY.B) || Input.pressed('Escape')) {
      this._mode = 'select';
      this.game.training.cancel && this.game.training.cancel();
      Audio.menuBack && Audio.menuBack();
      return;
    }

    // Time up → compute result
    if (this._tapTimer <= 0) {
      this._finishTraining();
    }
  }

  _finishTraining() {
    const ex     = this._activeExercise;
    const flow   = this._flowMeter;
    const taps   = this._tapCount;
    const target = this._tapTarget;

    const completionRatio = MathUtil.clamp(taps / target, 0, 1.5);
    const result = this.game.training.complete(ex.id, {
      completionRatio,
      flowMeter: flow,
    });

    this._result = result || { gains: {}, message: 'Training complete.' };
    this._mode   = 'result';
    this._resultTimer = 4.0;

    // Visual fanfare
    this._particles.levelUpBurst && this._particles.levelUpBurst(480, 270);
    Effects.flash('#f4d03f', 0.3);
    Audio.statUp && Audio.statUp();

    // Drain player stamina/hunger
    const player = this.game.player;
    const drain  = (ex.staminaCost || 30) * (1 + completionRatio * 0.5);
    player.stamina = Math.max(0, player.stamina - drain);
    this.game.hunger.update(ex.duration || 5, 'training');
  }

  _updateResult(dt) {
    this._resultTimer -= dt;
    if (this._resultTimer <= 0 ||
        Input.pressed(C.KEY.A) || Input.pressed('Enter') || Input.pressed(C.KEY.B)) {
      this._mode = 'select';
      this._refreshExercises();
      Audio.menuConfirm();
    }
  }

  render(ctx, W, H, dt) {
    // Background
    ctx.fillStyle = '#0a1520';
    ctx.fillRect(0, 0, W, H);

    // Animated grid pattern
    ctx.strokeStyle = 'rgba(244,208,63,0.05)';
    ctx.lineWidth = 1;
    const off = (this._timer * 20) % 40;
    for (let x = -40 + off; x < W + 40; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = off; y < H; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    this._particles.draw(ctx);

    if (this._mode === 'select') this._renderSelect(ctx, W, H);
    else if (this._mode === 'active') this._renderActive(ctx, W, H);
    else if (this._mode === 'result') this._renderResult(ctx, W, H);
  }

  _renderSelect(ctx, W, H) {
    const exList = this._exercises;

    ctx.textAlign = 'center';
    ctx.fillStyle = '#f4d03f';
    ctx.font = 'bold 18px monospace';
    ctx.fillText('TRAINING', W / 2, 36);

    ctx.fillStyle = '#888';
    ctx.font = '11px monospace';
    ctx.fillText('Select an exercise  ·  B = Back', W / 2, 54);

    if (!exList || exList.length === 0) {
      ctx.fillStyle = '#666';
      ctx.font = '13px monospace';
      ctx.fillText('No exercises available yet.', W / 2, H / 2);
      return;
    }

    const visCount = 10;
    const startIdx = Math.max(0, this._menuIdx - Math.floor(visCount / 2));
    const endIdx   = Math.min(exList.length, startIdx + visCount);
    let y = 78;

    for (let i = startIdx; i < endIdx; i++) {
      const ex  = exList[i];
      const sel = i === this._menuIdx;

      if (sel) {
        ctx.fillStyle = 'rgba(244,208,63,0.12)';
        ctx.fillRect(20, y - 14, W - 40, 20);
        ctx.strokeStyle = '#f4d03f';
        ctx.lineWidth = 1;
        ctx.strokeRect(20, y - 14, W - 40, 20);
      }

      ctx.textAlign = 'left';
      ctx.fillStyle = sel ? '#f4d03f' : '#cccccc';
      ctx.font = sel ? 'bold 12px monospace' : '12px monospace';
      ctx.fillText(ex.name || ex.id, 30, y);

      // Category tag
      ctx.textAlign = 'right';
      ctx.fillStyle = sel ? '#f4d03f' : '#666';
      ctx.font = '10px monospace';
      ctx.fillText(ex.category || '', W - 30, y);

      y += 22;
    }

    // Selected exercise detail
    if (exList[this._menuIdx]) {
      const ex = exList[this._menuIdx];
      const dy = H - 90;
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(20, dy, W - 40, 75);
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 1;
      ctx.strokeRect(20, dy, W - 40, 75);

      ctx.textAlign = 'left';
      ctx.fillStyle = '#f4d03f';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(ex.name || ex.id, 30, dy + 16);

      ctx.fillStyle = '#aaa';
      ctx.font = '10px monospace';
      ctx.fillText(ex.desc || '', 30, dy + 32);

      const gainStr = ex.primaryStat ? `Trains: ${ex.primaryStat.toUpperCase()}` : '';
      ctx.fillStyle = '#88aaff';
      ctx.fillText(gainStr, 30, dy + 48);

      const profLv = this.game.stats.getProficiencyLevel(ex.id);
      ctx.fillStyle = '#f4d03f';
      ctx.fillText(`Proficiency Lv.${profLv}`, 30, dy + 62);
    }
  }

  _renderActive(ctx, W, H) {
    const ex = this._activeExercise;
    if (!ex) return;

    ctx.textAlign = 'center';
    ctx.fillStyle = '#f4d03f';
    ctx.font = 'bold 20px monospace';
    ctx.fillText(ex.name || 'Training...', W / 2, 50);

    // Timer bar
    const progress = this._tapTimer / (ex.duration || 5.0);
    const barW = 400, barH = 18;
    const bx = W / 2 - barW / 2, by = 70;
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(bx, by, barW, barH);
    ctx.fillStyle = progress > 0.3 ? '#f4d03f' : '#ff4444';
    ctx.fillRect(bx, by, barW * progress, barH);
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, barW, barH);

    ctx.fillStyle = '#888';
    ctx.font = '11px monospace';
    ctx.fillText(`${Math.ceil(this._tapTimer)}s remaining`, W / 2, 102);

    // Tap counter
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 36px monospace';
    ctx.fillText(`${this._tapCount} / ${this._tapTarget}`, W / 2, H / 2 - 30);

    ctx.fillStyle = `rgba(200,200,200,${0.6 + 0.4 * Math.abs(Math.sin(this._blink * 3))})`;
    ctx.font = 'bold 18px monospace';
    ctx.fillText('TAP A!', W / 2, H / 2 + 10);

    // Flow meter
    const fw = 280, fh = 14;
    const fx = W / 2 - fw / 2, fy = H / 2 + 35;
    ctx.fillStyle = '#111';
    ctx.fillRect(fx, fy, fw, fh);
    const flowColor = this._flowMeter > 0.7 ? '#00ffcc'
      : this._flowMeter > 0.4 ? '#f4d03f' : '#ff6600';
    ctx.fillStyle = flowColor;
    ctx.fillRect(fx, fy, fw * this._flowMeter, fh);
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.strokeRect(fx, fy, fw, fh);
    ctx.fillStyle = '#888';
    ctx.font = '10px monospace';
    ctx.fillText('FLOW', W / 2, fy + fh + 14);

    // Kaze sprite animation
    const sp = SPRITES['KAZE_OGI_IDLE'] || SPRITES['KAZE_IDLE'];
    if (sp) {
      const sweatBob = Math.sin(this._sweatAnim * 8) * 3;
      const sx = W / 2 - sp[0].length * 4 / 2;
      const sy = H * 0.7 - sp.length * 4 + sweatBob;
      drawSpriteGlow(ctx, sp, sx, sy, 4, '#f4d03f', 3);
    }

    ctx.fillStyle = '#555';
    ctx.font = '10px monospace';
    ctx.fillText('B = Cancel', W / 2, H - 20);
  }

  _renderResult(ctx, W, H) {
    if (!this._result) return;
    HUD.drawTrainingResult(ctx, this._result, W, H);
  }
}
