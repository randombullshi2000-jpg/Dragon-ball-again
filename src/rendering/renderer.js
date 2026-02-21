/**
 * Main Renderer – draws background layers, world, entities
 */

class Renderer {
  constructor(canvas) {
    // Accept either a canvas element or a CanvasRenderingContext2D
    if (canvas && typeof canvas.getContext === 'function') {
      this.canvas = canvas;
      this.ctx    = canvas.getContext('2d');
      this.W      = canvas.width;
      this.H      = canvas.height;
    } else if (canvas && canvas.canvas) {
      // Was passed a context
      this.ctx    = canvas;
      this.canvas = canvas.canvas;
      this.W      = this.canvas.width;
      this.H      = this.canvas.height;
    } else {
      this.canvas = document.getElementById('game-canvas') || { width: 960, height: 540 };
      this.ctx    = this.canvas.getContext ? this.canvas.getContext('2d') : null;
      this.W      = this.canvas.width  || 960;
      this.H      = this.canvas.height || 540;
    }

    // Parallax layer offsets (set from camera)
    this._camX = 0;
    this._camY = 0;

    // Background cloud positions
    this._clouds = Array.from({ length: 5 }, (_, i) => ({
      x: i * 200 + Math.random() * 100,
      y: 30 + Math.random() * 60,
      w: 80 + Math.random() * 100,
      h: 30 + Math.random() * 20,
      speed: 8 + Math.random() * 12,
    }));

    // Background trees (parallax decoration)
    this._trees = Array.from({ length: 8 }, (_, i) => ({
      x: i * 500 + 100 + Math.random() * 200,
      y: this.H * 0.52,
      h: 80 + Math.random() * 80,
      color: i % 2 === 0 ? '#2d6a2d' : '#3a8a3a',
    }));
  }

  setCamera(x, y) {
    this._camX = x;
    this._camY = y;
  }

  // Called by OverworldState to draw background parallax layers only
  renderOverworldLayers(ctx, world, weather, W, H, dt) {
    const camX = world.cameraX || world.camX || 0;
    const bg   = world.zone && world.zone.bg;
    this._drawMountains(ctx, camX * 0.10, weather);
    this._drawClouds(ctx, camX * 0.25, weather, dt || 0.016);
    this._drawMidTrees(ctx, camX * 0.50, weather, bg);
    this._drawNearBg(ctx, camX * 0.75, bg);
  }

  // ─── Full frame render ───
  render(gameState, dt) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.W, this.H);

    switch (gameState.name) {
      case C.STATE.TITLE:
        gameState.render(ctx, this.W, this.H, dt);
        break;

      case C.STATE.OVERWORLD:
        this._renderOverworld(ctx, gameState, dt);
        break;

      case C.STATE.COMBAT:
        this._renderCombat(ctx, gameState, dt);
        break;

      case C.STATE.TRAINING:
        this._renderTraining(ctx, gameState, dt);
        break;

      case C.STATE.DIALOGUE:
        this._renderDialogue(ctx, gameState, dt);
        break;

      case C.STATE.INVENTORY:
        gameState.render(ctx, this.W, this.H, dt);
        break;

      default:
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, this.W, this.H);
    }
  }

  _renderOverworld(ctx, state, dt) {
    const weather = state.game.weather;
    const world   = state.game.world;
    const player  = state.game.player;
    const camX    = world.cameraX;
    const camY    = world.cameraY;

    // Sky
    ctx.fillStyle = weather.getSkyColor();
    ctx.fillRect(0, 0, this.W, this.H);

    // Distant mountains (far parallax 0.1x)
    this._drawMountains(ctx, camX * 0.10, weather);

    // Clouds (0.25x parallax)
    this._drawClouds(ctx, camX * 0.25, weather, dt);

    // Mid bg trees (0.5x)
    this._drawMidTrees(ctx, camX * 0.50, weather, world.zone?.bg);

    // Near bg (0.75x)
    this._drawNearBg(ctx, camX * 0.75, world.zone?.bg);

    // Tile map (1.0x)
    this._drawTileMap(ctx, world, camX, camY);

    // NPCs
    for (const npc of (state.npcs || [])) npc.draw(ctx);

    // Player
    if (player) player.draw(ctx);

    // Foreground (1.25x)
    this._drawForeground(ctx, camX * 1.25, world.zone?.bg);

    // Weather particles
    if (state.particles) state.particles.draw(ctx, 0, 0);

    // Effects
    Effects.drawDamageNumbers(ctx, camX, camY);
    Effects.drawFlash(ctx, this.W, this.H);

    // HUD
    HUD.draw(ctx, player, state.game.stats, state.game.hunger, weather, state.game.story);
    HUD.drawMinimap(ctx, world, player?.x || 0, this.W, this.H);
  }

  _renderCombat(ctx, state, dt) {
    const weather = state.game.weather;
    const combat  = state.combatSystem;

    // Sky
    ctx.fillStyle = weather.getSkyColor();
    ctx.fillRect(0, 0, this.W, this.H);

    // Simple combat background
    this._drawCombatBg(ctx, state.zoneBg || 'forest', weather);

    // Shade for combat arena
    const groundY = 400;
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, groundY, this.W, this.H - groundY);
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(0, groundY, this.W, 2);

    // Enemies
    for (const e of state.enemies) e.draw(ctx);

    // Player
    state.player.draw(ctx);

    // Projectiles
    for (const p of (state.projectiles || [])) p.draw(ctx);

    // Particles
    if (state.particles) state.particles.draw(ctx);

    // Effects / combo
    Effects.drawDamageNumbers(ctx);
    Effects.drawFlash(ctx, this.W, this.H);
    Effects.drawCombo(ctx, combat?.comboCount || 0, combat?.getComboLabel() || '',
                      combat?.getComboColor() || '#fff', this.W / 2, 90);

    // HUD
    HUD.draw(ctx, state.player, state.game.stats, state.game.hunger, weather, state.game.story, combat);
    HUD.drawGuardMeter(ctx, combat?.playerGuard ?? C.COMBAT.GUARD_METER);

    // Boss HP bar if one boss
    if (state.enemies.length === 1 && state.enemies[0].maxHP > 300) {
      HUD.drawBossHP(ctx, state.enemies[0], this.W, this.H);
    } else if (state.enemies.length > 0) {
      // Multi enemy: each draws their own HP bar
    }

    // Win/loss overlay
    if (combat?.over) {
      this._drawCombatResult(ctx, combat, this.W, this.H);
    }
  }

  _renderTraining(ctx, state, dt) {
    const weather = state.game.weather;

    // Training background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, this.W, this.H);
    this._drawTrainingBg(ctx, state.site);

    // Training minigame content
    state.render(ctx, this.W, this.H, dt);

    // HUD
    HUD.draw(ctx, state.player, state.game.stats, state.game.hunger, weather, state.game.story);

    // Progress bar
    const training = state.game.training;
    if (training.activeExercise) {
      HUD.drawTrainingProgress(ctx, training.progress, training.activeExercise.name, this.W, this.H);
    }

    // Result overlay
    if (state.result) {
      HUD.drawTrainingResult(ctx, state.result, this.W, this.H);
    }
  }

  _renderDialogue(ctx, state, dt) {
    // Background (whatever was behind)
    if (state.background) {
      state.background(ctx, this.W, this.H, dt);
    } else {
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, this.W, this.H);
    }

    // Dialogue box
    const dlg = state.currentLine;
    if (dlg) {
      HUD.drawDialogueBox(ctx, dlg.speaker, dlg.text, state.currentChoices, this.W, this.H);
    }
  }

  // ─── Background helpers ───

  _drawMountains(ctx, offX, weather) {
    const light = weather.getAmbientLight();
    const col   = ColorUtil.darken('#6b7e8c', 1 - light * 0.8);
    ctx.fillStyle = col;
    for (let i = 0; i < 6; i++) {
      const mx = ((i * 200 - offX) % (this.W + 200)) - 100;
      const mh = 100 + (i % 3) * 50;
      ctx.beginPath();
      ctx.moveTo(mx - 80, this.H * 0.55);
      ctx.lineTo(mx, this.H * 0.55 - mh);
      ctx.lineTo(mx + 80, this.H * 0.55);
      ctx.closePath();
      ctx.fill();
    }
  }

  _drawClouds(ctx, offX, weather, dt) {
    if (weather.weather === 'storm' || weather.weather === 'rain') {
      ctx.fillStyle = 'rgba(60,60,80,0.5)';
      ctx.fillRect(0, 0, this.W, this.H * 0.3);
    }
    for (const c of this._clouds) {
      c.x -= c.speed * dt * 0.5;
      if (c.x + c.w < 0) c.x = this.W + 50;
      const cx = (c.x - offX * 0.3) % (this.W + c.w);
      ctx.fillStyle = 'rgba(200,220,240,0.7)';
      ctx.beginPath();
      ctx.ellipse(cx, c.y, c.w / 2, c.h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _drawMidTrees(ctx, offX, weather, bg) {
    if (bg === 'desert') return;
    const light = weather.getAmbientLight();
    const col   = ColorUtil.darken('#2d6a2d', 1 - light * 0.7);
    ctx.fillStyle = col;
    for (let i = 0; i < this._trees.length; i++) {
      const t = this._trees[i];
      const tx = ((t.x - offX) % (this.W * 2 + 200)) - 100;
      // Trunk
      ctx.fillStyle = ColorUtil.darken('#5a3a1a', 1 - light * 0.5);
      ctx.fillRect(tx - 5, t.y - 20, 10, 20);
      // Canopy
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(tx, t.y - 20 - t.h * 0.3, 35, t.h * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _drawNearBg(ctx, offX, bg) {
    // Just draw ground color variation
    if (bg === 'coast' || bg === 'island') {
      ctx.fillStyle = '#2980b9';
      ctx.fillRect(0, this.H * 0.7, this.W, this.H * 0.3);
    }
  }

  _drawForeground(ctx, offX, bg) {
    // Hanging vines / branches in forest
    if (bg !== 'forest' && bg !== 'mountain_forest') return;
    ctx.fillStyle = 'rgba(20,50,20,0.4)';
    for (let i = 0; i < 3; i++) {
      const fx = ((i * 350 - offX) % (this.W + 100));
      ctx.fillRect(fx - 3, 0, 6, 80 + (i % 3) * 30);
    }
  }

  _drawTileMap(ctx, world, camX, camY) {
    if (!world._tileMap?.length) return;
    const map    = world._tileMap;
    const tileW  = C.TILE_PX;
    const startC = Math.floor(camX / tileW);
    const endC   = Math.min(map[0].length, Math.ceil((camX + this.W) / tileW) + 1);
    const startR = Math.floor(camY / tileW);
    const endR   = Math.min(map.length, Math.ceil((camY + this.H) / tileW) + 1);

    for (let r = startR; r < endR; r++) {
      for (let c = startC; c < endC; c++) {
        const tile = map[r]?.[c];
        if (!tile) continue;
        const sx = c * tileW - camX;
        const sy = r * tileW - camY;
        const sp = SPRITES[['','TILE_GRASS','TILE_DIRT','TILE_STONE','TILE_DIRT','TILE_STONE','TILE_WATER'][tile]];
        if (sp) {
          drawTile(ctx, sp, sx, sy, 3);
        } else {
          ctx.fillStyle = world.getTileColor(tile);
          ctx.fillRect(sx, sy, tileW, tileW);
        }
      }
    }
  }

  _drawCombatBg(ctx, bg, weather) {
    const light = weather.getAmbientLight();
    // Simple gradient bg for combat
    const grad = ctx.createLinearGradient(0, 0, 0, this.H * 0.7);
    const sky  = weather.getSkyColor();
    grad.addColorStop(0, sky);
    grad.addColorStop(1, ColorUtil.darken(sky, 0.3));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.W, this.H * 0.7);

    // Draw some bg trees
    ctx.fillStyle = ColorUtil.darken('#2d6a2d', 1 - light * 0.7);
    for (let i = 0; i < 8; i++) {
      const tx = i * 130 + 30;
      const th = 60 + (i % 3) * 30;
      ctx.beginPath();
      ctx.ellipse(tx, 360 - th, 30, th * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _drawTrainingBg(ctx, site) {
    // Gradient background for training screen
    const grad = ctx.createLinearGradient(0, 0, 0, this.H);
    grad.addColorStop(0, '#0a1a10');
    grad.addColorStop(1, '#0a0a0a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.W, this.H);

    // Ground line
    ctx.fillStyle = '#1a2a1a';
    ctx.fillRect(0, 400, this.W, this.H - 400);
    ctx.fillStyle = '#2a4a2a';
    ctx.fillRect(0, 398, this.W, 3);
  }

  _drawCombatResult(ctx, combat, W, H) {
    const win = combat.result === 'win';
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'center';
    ctx.font      = 'bold 48px monospace';
    ctx.fillStyle = win ? '#f4d03f' : '#e74c3c';
    ctx.shadowColor = win ? '#f4d03f' : '#e74c3c';
    ctx.shadowBlur  = 20;
    ctx.fillText(win ? 'VICTORY!' : 'DEFEATED', W / 2, H / 2 - 30);
    ctx.shadowBlur = 0;

    const sum = combat.getSummary();
    ctx.font      = '14px monospace';
    ctx.fillStyle = '#cccccc';
    ctx.fillText(`Time: ${MathUtil.formatTime(sum.fightTime)}   Combo: ${sum.comboMax}`, W / 2, H / 2 + 10);
    ctx.fillText(`Hits: ${sum.hitsLanded}   HP Remaining: ${Math.floor(sum.playerHP)}`, W / 2, H / 2 + 30);

    ctx.fillStyle = '#f4d03f';
    ctx.font      = '12px monospace';
    const pulse   = 0.6 + 0.4 * Math.abs(Math.sin(Date.now() * 0.003));
    ctx.globalAlpha = pulse;
    ctx.fillText('Tap to continue', W / 2, H / 2 + 70);
    ctx.restore();
  }
}
