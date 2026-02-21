/**
 * Overworld State — exploration map
 */

class OverworldState {
  constructor(game) {
    this.game      = game;
    this.name      = C.STATE.OVERWORLD;
    this._particles = new ParticleSystem();
    this._menuOpen  = false;
    this._statsOpen = false;
    this._pauseAnim = 0;
    this._interactPrompt = null;  // NPC/zone currently in range
    this._footstepTimer  = 0;
    this._transitionAlpha = 0;    // fade in/out
    this._transitioning   = false;
    this._rain = [];
  }

  enter() {
    Audio.playMusic('overworld');
    Input.showControls();
    this._transitionAlpha = 1;
    this._transitioning = true;
  }

  exit() {
    Audio.stopMusic();
  }

  update(dt) {
    const game    = this.game;
    const player  = game.player;
    const world   = game.world;
    const weather = game.weather;
    const story   = game.story;

    // Fade in
    if (this._transitioning) {
      this._transitionAlpha = Math.max(0, this._transitionAlpha - dt * 2);
      if (this._transitionAlpha <= 0) this._transitioning = false;
    }

    this._pauseAnim += dt;

    // Handle menu/stats buttons
    if (Input.pressed('m') || Input.pressed('Escape')) {
      this._menuOpen = !this._menuOpen;
      this._statsOpen = false;
      Audio.menuSelect();
    }
    if (Input.pressed('i')) {
      this._statsOpen = !this._statsOpen;
      this._menuOpen = false;
      Audio.menuSelect();
    }

    if (this._menuOpen || this._statsOpen) {
      this._handleMenu(dt);
      return;
    }

    // Player movement + physics
    player.overworldUpdate(dt, world, Input);
    world.updateCamera(player.x, player.y, C.W, C.H);

    // Weather particles
    weather.update(dt);
    if (weather.type === 'rain' || weather.type === 'storm') {
      if (Math.random() < 0.6) {
        this._particles.rain(Math.random() * C.W, 0);
      }
    }
    if (weather.type === 'snow') {
      if (Math.random() < 0.3) {
        this._particles.snow(Math.random() * C.W, 0);
      }
    }
    this._particles.update(dt);

    // Dust clouds while running
    if (player.isRunning && Math.abs(player.vx) > 10 && Math.random() < 0.3) {
      const screenX = player.x - world.cameraX;
      const screenY = player.y - world.cameraY;
      this._particles.dust(screenX, screenY + player.h * 0.5, '#b8a090');
    }

    // Footstep audio
    if (player.isMoving && player.onGround) {
      this._footstepTimer -= dt;
      if (this._footstepTimer <= 0) {
        this._footstepTimer = player.isRunning ? 0.25 : 0.40;
        Audio.step && Audio.step();
      }
    }

    // NPC proximity check
    this._interactPrompt = null;
    for (const npc of world.npcs) {
      npc.update(dt);
      const sx = npc.x - world.cameraX;
      const sy = npc.y - world.cameraY;
      const dx = (player.x + player.w / 2) - npc.x;
      const dy = (player.y + player.h / 2) - npc.y;
      if (Math.sqrt(dx * dx + dy * dy) < 100) {
        this._interactPrompt = npc;
        break;
      }
    }

    // Interact
    if (Input.pressed(C.KEY.A) || Input.pressed('f') || Input.pressed('Enter')) {
      if (this._interactPrompt) {
        this._handleInteract(this._interactPrompt);
      }
    }

    // Zone transition triggers
    this._checkZoneTransitions(player, world);

    // Story encounter checks
    const encounters = story.checkZoneEncounters(world.currentZoneId);
    for (const enc of encounters) {
      this._triggerEncounter(enc);
    }

    // Ki sparks (if ki > 50%)
    if (player.ki > player.stats.maxKi * 0.5 && Math.random() < 0.15) {
      const sx = player.x - world.cameraX + player.w / 2;
      const sy = player.y - world.cameraY + player.h / 2;
      this._particles.kiAura(sx, sy, C.COL.KI_BLUE, 0.5);
    }

    // Hunger drain
    game.hunger.update(dt, 'overworld');
  }

  _handleMenu(dt) {
    if (Input.pressed('Escape') || Input.pressed(C.KEY.B)) {
      this._menuOpen = false;
      this._statsOpen = false;
      Audio.menuBack && Audio.menuBack();
    }
  }

  _handleInteract(npc) {
    Audio.menuConfirm();
    const result = npc.interact(this.game.story);
    if (!result) return;

    if (result.type === 'dialogue') {
      this.game.pushDialogue(
        result.speaker,
        result.lines,
        result.choices,
        result.onDone
      );
    } else if (result.type === 'shop') {
      this.game.openInventory({ shopMode: true, shopId: result.shopId });
    } else if (result.type === 'training') {
      this.game.enterTraining(result.trainerId);
    } else if (result.type === 'rest') {
      this.game.doRest();
    }
  }

  _checkZoneTransitions(player, world) {
    const zone = world.zone;
    if (!zone || !zone.exits) return;

    for (const exit of zone.exits) {
      const px = player.x + player.w / 2;
      const py = player.y + player.h / 2;
      if (MathUtil.rectOverlap(px, py, 1, 1, exit.x, exit.y, exit.w, exit.h)) {
        this.game.travelToZone(exit.toZone, exit.spawnX, exit.spawnY);
        break;
      }
    }
  }

  _triggerEncounter(enc) {
    if (enc.type === 'dialogue') {
      this.game.pushDialogue(enc.speaker, enc.lines, enc.choices, enc.onDone);
    } else if (enc.type === 'combat') {
      this.game.enterCombat(enc.enemy, enc.conditions);
    } else if (enc.type === 'cutscene') {
      // Mark as seen + show dialogue sequence
      if (enc.dialogues) {
        this.game.pushDialogue(enc.dialogues[0].speaker, enc.dialogues[0].lines, [], null);
      }
    }
  }

  render(ctx, W, H, dt) {
    const game    = this.game;
    const player  = game.player;
    const world   = game.world;
    const weather = game.weather;

    // Background color based on time of day
    const skyCol = weather.getSkyColor();
    ctx.fillStyle = skyCol;
    ctx.fillRect(0, 0, W, H);

    // Parallax layers via Renderer
    game.renderer.renderOverworldLayers(ctx, world, weather, W, H, dt);

    // Tile map
    world.draw(ctx, W, H);

    // NPCs
    for (const npc of world.npcs) {
      const sx = npc.x - world.cameraX;
      const sy = npc.y - world.cameraY;
      npc.draw(ctx, sx, sy, this._pauseAnim);
    }

    // Player
    const px = player.x - world.cameraX;
    const py = player.y - world.cameraY;
    player.draw(ctx, px, py, this._pauseAnim);

    // Particles (world-space, already converted)
    this._particles.draw(ctx, 0, 0);

    // Interact prompt
    if (this._interactPrompt) {
      const npc = this._interactPrompt;
      const sx = npc.x - world.cameraX;
      const sy = npc.y - world.cameraY - 40;
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(sx - 40, sy - 14, 80, 18);
      ctx.fillStyle = '#f4d03f';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('[A] Talk', sx, sy);
    }

    // HUD
    HUD.draw(ctx, player, game.stats, game.hunger, weather, game.story, null, W, H);

    // Pause menu overlay
    if (this._menuOpen) this._renderMenu(ctx, W, H);
    if (this._statsOpen) this._renderStats(ctx, W, H);

    // Fade overlay (transition)
    if (this._transitioning || this._transitionAlpha > 0) {
      ctx.fillStyle = `rgba(0,0,0,${this._transitionAlpha})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  _renderMenu(ctx, W, H) {
    ctx.fillStyle = 'rgba(0,0,0,0.80)';
    ctx.fillRect(W / 2 - 130, H / 2 - 110, 260, 220);
    ctx.strokeStyle = '#f4d03f';
    ctx.lineWidth = 2;
    ctx.strokeRect(W / 2 - 130, H / 2 - 110, 260, 220);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#f4d03f';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('MENU', W / 2, H / 2 - 85);

    const items = ['RESUME', 'INVENTORY', 'SAVE GAME', 'TITLE SCREEN'];
    items.forEach((item, i) => {
      ctx.fillStyle = '#cccccc';
      ctx.font = '14px monospace';
      ctx.fillText(item, W / 2, H / 2 - 50 + i * 36);
    });

    ctx.fillStyle = '#666';
    ctx.font = '10px monospace';
    ctx.fillText('ESC / B to close', W / 2, H / 2 + 95);
  }

  _renderStats(ctx, W, H) {
    const stats = this.game.stats;
    const pl    = stats.powerLevel;

    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(30, 30, W - 60, H - 60);
    ctx.strokeStyle = '#f4d03f';
    ctx.lineWidth = 2;
    ctx.strokeRect(30, 30, W - 60, H - 60);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#f4d03f';
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`KAZE  ·  PL ${pl}`, W / 2, 56);

    const statKeys = ['strength', 'speed', 'endurance', 'technique', 'kiControl'];
    const labels   = ['STR', 'SPD', 'END', 'TEC', 'KI'];

    let y = 85;
    ctx.textAlign = 'left';
    statKeys.forEach((k, i) => {
      const val = stats[k] || 0;
      const bar = Math.round(val / 50 * 100);
      ctx.fillStyle = '#888';
      ctx.font = '11px monospace';
      ctx.fillText(labels[i], 50, y);
      ctx.fillStyle = '#222';
      ctx.fillRect(90, y - 10, 200, 12);
      ctx.fillStyle = '#f4d03f';
      ctx.fillRect(90, y - 10, bar * 2, 12);
      ctx.fillStyle = '#fff';
      ctx.fillText(val.toFixed(1), 298, y);
      y += 26;
    });

    // Injuries
    if (stats.injuries.length > 0) {
      ctx.fillStyle = '#ff4444';
      ctx.font = 'bold 11px monospace';
      ctx.fillText('INJURIES:', 50, y + 10);
      y += 26;
      for (const inj of stats.injuries) {
        ctx.fillStyle = '#ff8888';
        ctx.font = '10px monospace';
        const rem = Math.ceil(inj.timeRemaining / 3600);
        ctx.fillText(`  ${inj.type} (${rem}h remaining)`, 50, y);
        y += 18;
      }
    }

    ctx.fillStyle = '#666';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ESC / B to close', W / 2, H - 48);
  }
}
