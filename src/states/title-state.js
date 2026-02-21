/**
 * Title Screen State
 */

class TitleState {
  constructor(game) {
    this.game    = game;
    this.name    = C.STATE.TITLE;
    this._timer  = 0;
    this._blink  = 0;
    this._stars  = Array.from({length:60}, () => ({
      x: Math.random() * 960,
      y: Math.random() * 540,
      s: Math.random(),
      b: Math.random() * Math.PI * 2,
    }));
    this._particles = new ParticleSystem();
    this._menu   = 0;   // selected menu item
    this._items  = ['NEW GAME', 'CONTINUE', 'HOW TO PLAY'];
    this._hasSave = !!localStorage.getItem('dragonball_save');
    this._mode   = 'title';  // title | instructions
  }

  enter() {
    Audio.playMusic('title');
    Input.hideControls();
  }

  exit() {
    Audio.stopMusic();
  }

  update(dt) {
    this._timer += dt;
    this._blink  = (this._blink + dt * 2) % (Math.PI * 2);
    this._particles.update(dt);

    // Spawn ki particles
    if (Math.random() < 0.3) {
      this._particles.kiAura(480 + (Math.random() - 0.5) * 200,
                             300 + (Math.random() - 0.5) * 80, '#f4d03f', 1);
    }

    if (this._mode === 'instructions') {
      if (Input.pressed(C.KEY.B) || Input.pressed('Escape') || Input.pressed(C.KEY.A)) {
        this._mode = 'title';
        Audio.menuBack();
      }
      return;
    }

    // Menu navigation
    if (Input.pressed('ArrowUp') || Input.axis.y < -0.5) {
      this._menu = Math.max(0, this._menu - 1);
      Audio.menuSelect();
    }
    if (Input.pressed('ArrowDown') || Input.axis.y > 0.5) {
      this._menu = Math.min(this._items.length - 1, this._menu + 1);
      Audio.menuSelect();
    }

    // Touch: tap anywhere to advance
    if (Input.pressed('tap') || Input.pressed(C.KEY.A) || Input.pressed('Enter')) {
      this._selectMenu();
    }
  }

  _selectMenu() {
    const sel = this._items[this._menu];
    Audio.menuConfirm();
    if (sel === 'NEW GAME') {
      this.game.newGame();
    } else if (sel === 'CONTINUE') {
      if (this._hasSave) this.game.loadGame();
      else               this.game.newGame();
    } else if (sel === 'HOW TO PLAY') {
      this._mode = 'instructions';
    }
  }

  render(ctx, W, H, dt) {
    // Starfield background
    ctx.fillStyle = '#05050f';
    ctx.fillRect(0, 0, W, H);

    for (const s of this._stars) {
      const bright = 0.3 + 0.7 * Math.abs(Math.sin(s.b + this._timer * 1.5));
      ctx.fillStyle = `rgba(200,220,255,${bright * s.s})`;
      ctx.fillRect(s.x, s.y, 1 + s.s, 1 + s.s);
    }

    this._particles.draw(ctx);

    // Dragon silhouettes (decorative)
    this._drawDragonSilhouette(ctx, W, H);

    if (this._mode === 'instructions') {
      this._renderInstructions(ctx, W, H);
      return;
    }

    // Main title
    ctx.textAlign = 'center';

    // Shadow glow
    ctx.save();
    ctx.shadowColor = '#f4d03f';
    ctx.shadowBlur  = 30 + Math.sin(this._timer * 2) * 10;
    ctx.fillStyle   = '#f4d03f';
    ctx.font        = 'bold 52px monospace';
    ctx.fillText('DRAGON BALL', W / 2, H * 0.28);
    ctx.shadowBlur  = 0;
    ctx.restore();

    ctx.fillStyle = '#ff8800';
    ctx.font      = 'bold 22px monospace';
    ctx.fillText('PATH OF THE YOUNG WARRIOR', W / 2, H * 0.38);

    ctx.fillStyle = '#888888';
    ctx.font      = '13px monospace';
    ctx.fillText('A pixel art martial arts RPG', W / 2, H * 0.44);

    // Kaze sprite (title screen)
    const sp = SPRITES['KAZE_OGI_IDLE'] || SPRITES['KAZE_IDLE'];
    if (sp) {
      const sx = W / 2 - sp[0].length * 5 / 2;
      const sy = H * 0.52 - sp.length * 5;
      drawSpriteGlow(ctx, sp, sx, sy, 5, '#f4d03f', 5);
    }

    // Menu items
    for (let i = 0; i < this._items.length; i++) {
      const item  = this._items[i];
      const my    = H * 0.72 + i * 36;
      const sel   = i === this._menu;

      if (sel) {
        const bw  = 220, bh = 30;
        const bx  = W / 2 - bw / 2;
        ctx.fillStyle = 'rgba(244,208,63,0.15)';
        ctx.fillRect(bx, my - 22, bw, bh);
        ctx.strokeStyle = '#f4d03f';
        ctx.lineWidth   = 1;
        ctx.strokeRect(bx, my - 22, bw, bh);
      }

      const disabled = item === 'CONTINUE' && !this._hasSave;
      ctx.fillStyle = disabled ? '#444' : sel ? '#f4d03f' : '#cccccc';
      ctx.font      = sel ? 'bold 16px monospace' : '14px monospace';
      ctx.fillText(item, W / 2, my);
    }

    // Version / credits
    ctx.fillStyle = '#333';
    ctx.font      = '10px monospace';
    ctx.fillText('v1.0 · Tap a menu item to select', W / 2, H - 16);

    // Blinking tap prompt (if no input yet)
    if (this._timer < 3) {
      ctx.fillStyle   = `rgba(200,200,200,${Math.abs(Math.sin(this._blink))})`;
      ctx.font        = '13px monospace';
      ctx.fillText('TAP TO START', W / 2, H * 0.96);
    }
  }

  _drawDragonSilhouette(ctx, W, H) {
    // Simple wave-like dragon silhouette decoration
    ctx.strokeStyle = 'rgba(244,208,63,0.08)';
    ctx.lineWidth   = 3;
    ctx.beginPath();
    const t = this._timer * 0.3;
    for (let x = 0; x < W; x += 4) {
      const y = H * 0.58 + Math.sin(x * 0.02 + t) * 20 + Math.sin(x * 0.008 + t * 0.7) * 30;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  _renderInstructions(ctx, W, H) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(30, 30, W - 60, H - 60);
    ctx.strokeStyle = '#f4d03f';
    ctx.lineWidth   = 2;
    ctx.strokeRect(30, 30, W - 60, H - 60);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#f4d03f';
    ctx.font      = 'bold 18px monospace';
    ctx.fillText('HOW TO PLAY', W / 2, 62);

    const lines = [
      ['MOVEMENT', 'Virtual joystick (left side)'],
      ['LIGHT ATK', 'ATK button (green)'],
      ['MEDIUM ATK','MED button (blue)'],
      ['HEAVY ATK', 'HVY button (yellow)'],
      ['BLOCK',     'BLK shoulder button'],
      ['DODGE',     'DGE shoulder button'],
      ['KI CHARGE', 'Hold KI button to charge'],
      ['SPRINT',    'Hold RUN button'],
      ['MENU',      '☰ MENU top-left'],
      ['STATS',     '📊 STATS top-right'],
      ['', ''],
      ['GOAL', 'Train, explore, and find Master Roshi'],
      ['',     'Increase Power Level to unlock new abilities'],
    ];

    let y = 90;
    ctx.textAlign = 'left';
    for (const [label, desc] of lines) {
      if (!label && !desc) { y += 8; continue; }
      ctx.fillStyle = '#f4d03f';
      ctx.font      = 'bold 11px monospace';
      ctx.fillText(label, 50, y);
      ctx.fillStyle = '#cccccc';
      ctx.font      = '11px monospace';
      ctx.fillText(desc, 200, y);
      y += 20;
    }

    ctx.fillStyle   = '#888';
    ctx.font        = '12px monospace';
    ctx.textAlign   = 'center';
    ctx.fillText('Tap / B to go back', W / 2, H - 48);
    ctx.restore();
  }
}
