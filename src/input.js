/**
 * Input Handler – Keyboard + Touch + Gamepad
 * Mobile-first: virtual joystick + on-screen buttons
 */

const Input = {
  _keys: {},
  _justPressed: {},
  _justReleased: {},
  _prevKeys: {},

  mouse: { x: 0, y: 0, buttons: 0 },

  axis: { x: 0, y: 0 },

  // Joystick state
  _joystick: {
    active: false,
    id: null,
    baseX: 0, baseY: 0,
    x: 0, y: 0,
    dx: 0, dy: 0,
    radius: 55,
  },

  // Active touch tracking
  _touches: {},

  // Button touch tracking (which touchId is on which button)
  _btnTouch: {},

  // Hold timers
  _holdTimers: {},

  // Gamepad
  _gamepad: null,

  // Canvas ref for coordinate mapping
  _canvas: null,

  init(canvas) {
    this._canvas = canvas;

    // Keyboard
    window.addEventListener('keydown', e => {
      const k = e.key;
      if (!this._keys[k]) this._justPressed[k] = true;
      this._keys[k] = true;
      if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(k)) e.preventDefault();
    });
    window.addEventListener('keyup', e => {
      this._keys[e.key] = false;
      this._justReleased[e.key] = true;
    });

    // Touch – joystick zone
    const joystickZone = document.getElementById('joystick-zone');
    if (joystickZone) {
      joystickZone.addEventListener('touchstart', e => this._joystickStart(e), { passive: false });
      joystickZone.addEventListener('touchmove',  e => this._joystickMove(e),  { passive: false });
      joystickZone.addEventListener('touchend',   e => this._joystickEnd(e),   { passive: false });
      joystickZone.addEventListener('touchcancel',e => this._joystickEnd(e),   { passive: false });
    }

    // Virtual buttons
    const btnMap = {
      'btn-a':      C.KEY.A,
      'btn-b':      C.KEY.B,
      'btn-x':      C.KEY.X,
      'btn-y':      C.KEY.Y,
      'btn-l':      C.KEY.L,
      'btn-r':      C.KEY.R,
      'btn-ki':     C.KEY.KI,
      'btn-sprint': C.KEY.SPRINT,
      'btn-menu':   C.KEY.MENU,
      'btn-stats':  C.KEY.SELECT,
    };

    for (const [id, key] of Object.entries(btnMap)) {
      const el = document.getElementById(id);
      if (!el) continue;
      el.addEventListener('touchstart', e => {
        e.preventDefault();
        e.stopPropagation();
        this._setKey(key, true);
        el.classList.add('pressed');
      }, { passive: false });
      el.addEventListener('touchend', e => {
        e.preventDefault();
        this._setKey(key, false);
        el.classList.remove('pressed');
      }, { passive: false });
      el.addEventListener('touchcancel', e => {
        this._setKey(key, false);
        el.classList.remove('pressed');
      }, { passive: false });
      // Also mouse for desktop testing
      el.addEventListener('mousedown', e => { e.preventDefault(); this._setKey(key, true); el.classList.add('pressed'); });
      el.addEventListener('mouseup',   e => { this._setKey(key, false); el.classList.remove('pressed'); });
    }

    // Canvas mouse (for desktop testing)
    canvas.addEventListener('mousemove', e => {
      const r = canvas.getBoundingClientRect();
      const sx = canvas.width / r.width;
      const sy = canvas.height / r.height;
      this.mouse.x = (e.clientX - r.left) * sx;
      this.mouse.y = (e.clientY - r.top)  * sy;
    });
    canvas.addEventListener('mousedown', e => { this.mouse.buttons |= (1 << e.button); });
    canvas.addEventListener('mouseup',   e => { this.mouse.buttons &= ~(1 << e.button); });

    // Canvas touch → mouse coords (for tap on canvas itself)
    canvas.addEventListener('touchstart', e => {
      e.preventDefault();
      const t = e.changedTouches[0];
      const r = canvas.getBoundingClientRect();
      const sx = canvas.width / r.width;
      const sy = canvas.height / r.height;
      this.mouse.x = (t.clientX - r.left) * sx;
      this.mouse.y = (t.clientY - r.top)  * sy;
      this.mouse.buttons = 1;
      this._justPressed['tap'] = true;
    }, { passive: false });
    canvas.addEventListener('touchend', e => {
      e.preventDefault();
      this.mouse.buttons = 0;
    }, { passive: false });

    // Gamepad
    window.addEventListener('gamepadconnected',    e => { this._gamepad = e.gamepad; });
    window.addEventListener('gamepaddisconnected', () => { this._gamepad = null; });
  },

  _setKey(key, down) {
    if (down && !this._keys[key]) this._justPressed[key] = true;
    if (!down && this._keys[key]) this._justReleased[key] = true;
    this._keys[key] = down;
  },

  // ─── Joystick handlers ───
  _joystickStart(e) {
    e.preventDefault();
    const t = e.changedTouches[0];
    if (this._joystick.active) return;
    const base = document.getElementById('joystick-base');
    const r = base.getBoundingClientRect();
    this._joystick.active = true;
    this._joystick.id     = t.identifier;
    this._joystick.baseX  = r.left + r.width / 2;
    this._joystick.baseY  = r.top  + r.height / 2;
    this._joystickUpdate(t);
  },

  _joystickMove(e) {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.identifier === this._joystick.id) {
        this._joystickUpdate(t);
      }
    }
  },

  _joystickEnd(e) {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.identifier === this._joystick.id) {
        this._joystick.active = false;
        this._joystick.id     = null;
        this._joystick.dx     = 0;
        this._joystick.dy     = 0;
        this._updateJoystickNub(0, 0);
      }
    }
  },

  _joystickUpdate(touch) {
    const dx = touch.clientX - this._joystick.baseX;
    const dy = touch.clientY - this._joystick.baseY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxR = this._joystick.radius;
    const clamped = Math.min(dist, maxR);
    const angle = Math.atan2(dy, dx);
    const nx = clamped > 4 ? Math.cos(angle) * (clamped / maxR) : 0;
    const ny = clamped > 4 ? Math.sin(angle) * (clamped / maxR) : 0;
    this._joystick.dx = nx;
    this._joystick.dy = ny;
    this._updateJoystickNub(nx * maxR * 0.45, ny * maxR * 0.45);
  },

  _updateJoystickNub(offsetX, offsetY) {
    const nub = document.getElementById('joystick-nub');
    if (nub) {
      nub.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`;
    }
  },

  // ─── Per-frame update ───
  update(dt) {
    // Poll gamepad
    if (this._gamepad) {
      const gp = navigator.getGamepads ? navigator.getGamepads()[this._gamepad.index] : null;
      if (gp) this._pollGamepad(gp);
    }

    // Merge joystick into axis
    const kbX = (this.held('ArrowLeft') || this.held('a') ? -1 : 0) +
                (this.held('ArrowRight') || this.held('d') ? 1 : 0);
    const kbY = (this.held('ArrowUp') || this.held('w') ? -1 : 0) +
                (this.held('ArrowDown') ? 1 : 0);

    if (this._joystick.active) {
      this.axis.x = this._joystick.dx;
      this.axis.y = this._joystick.dy;
    } else {
      this.axis.x = MathUtil.clamp(kbX, -1, 1);
      this.axis.y = MathUtil.clamp(kbY, -1, 1);
    }

    // Hold timers
    for (const key of Object.keys(this._keys)) {
      if (this._keys[key]) this._holdTimers[key] = (this._holdTimers[key] || 0) + dt;
      else delete this._holdTimers[key];
    }

    // Rotate frame state
    this._prevKeys   = { ...this._keys };
    this._justPressed  = {};
    this._justReleased = {};
  },

  _pollGamepad(gp) {
    const map = {
      'ArrowLeft':  gp.axes[0] < -0.4 || gp.buttons[14]?.pressed,
      'ArrowRight': gp.axes[0] >  0.4 || gp.buttons[15]?.pressed,
      'ArrowUp':    gp.axes[1] < -0.4 || gp.buttons[12]?.pressed,
      'ArrowDown':  gp.axes[1] >  0.4 || gp.buttons[13]?.pressed,
      [C.KEY.A]:    gp.buttons[0]?.pressed,
      [C.KEY.B]:    gp.buttons[1]?.pressed,
      [C.KEY.X]:    gp.buttons[2]?.pressed,
      [C.KEY.Y]:    gp.buttons[3]?.pressed,
      [C.KEY.L]:    gp.buttons[4]?.pressed,
      [C.KEY.R]:    gp.buttons[5]?.pressed,
      'Enter':      gp.buttons[9]?.pressed,
      'Escape':     gp.buttons[8]?.pressed,
    };
    for (const [key, val] of Object.entries(map)) this._setKey(key, !!val);
    if (Math.abs(gp.axes[0]) > 0.15 || Math.abs(gp.axes[1]) > 0.15) {
      this.axis.x = Math.abs(gp.axes[0]) > 0.15 ? gp.axes[0] : this.axis.x;
      this.axis.y = Math.abs(gp.axes[1]) > 0.15 ? gp.axes[1] : this.axis.y;
    }
  },

  held(key)     { return !!this._keys[key]; },
  pressed(key)  { return !!this._justPressed[key]; },
  released(key) { return !!this._justReleased[key]; },
  holdDuration(key) { return this._holdTimers[key] || 0; },

  anyDir()     { return Math.abs(this.axis.x) > 0.1 || Math.abs(this.axis.y) > 0.1; },
  anyPressed() { return Object.keys(this._justPressed).length > 0; },

  // Show/hide virtual controls
  showControls() {
    const el = document.getElementById('controls-overlay');
    if (el) el.style.display = 'block';
  },
  hideControls() {
    const el = document.getElementById('controls-overlay');
    if (el) el.style.display = 'none';
  },
};
