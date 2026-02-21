/**
 * Game — central state machine and systems orchestrator
 */

class Game {
  constructor(canvas) {
    this._canvas  = canvas;
    this._ctx     = canvas.getContext('2d');
    this._W       = canvas.width;
    this._H       = canvas.height;

    // Core systems (order matters: hunger needs stats, training needs both)
    this.stats    = new StatsSystem();
    this.hunger   = new HungerSystem(this.stats);
    this.training = new TrainingSystem(this.stats, this.hunger);
    this.combat   = new CombatSystem();
    this.world    = new WorldSystem();
    this.story    = new StorySystem();
    this.weather  = new WeatherSystem();
    this.renderer = new Renderer(canvas);

    // Entities
    this.player   = new Player(this.stats, this.hunger);

    // Inventory: { itemId: { id, qty } }
    this.inventory = {};

    // State stack (top = current active state)
    this._states  = {};
    this._stack   = [];

    // Register all states
    this._registerState(new TitleState(this));
    this._registerState(new DialogueState(this));
    this._registerState(new OverworldState(this));
    this._registerState(new TrainingState(this));
    this._registerState(new CombatState(this));
    this._registerState(new InventoryState(this));

    // Timing
    this._lastTime  = 0;
    this._rafHandle = null;
    this._running   = false;
  }

  _registerState(state) {
    this._states[state.name] = state;
  }

  // ── State machine ──────────────────────────────────────────────────────────

  get currentState() {
    return this._stack.length ? this._stack[this._stack.length - 1] : null;
  }

  _pushState(name, setupFn) {
    const state = this._states[name];
    if (!state) { console.warn('Unknown state:', name); return; }
    if (setupFn) setupFn(state);
    this._stack.push(state);
    state.enter && state.enter();
  }

  popState() {
    const state = this._stack.pop();
    state && state.exit && state.exit();
    const next = this.currentState;
    // Re-show controls if returning to overworld
    if (next && next.name === C.STATE.OVERWORLD) {
      Input.showControls();
    }
  }

  _switchState(name, setupFn) {
    while (this._stack.length > 0) {
      const s = this._stack.pop();
      s.exit && s.exit();
    }
    this._pushState(name, setupFn);
  }

  // ── Public game flow ───────────────────────────────────────────────────────

  newGame() {
    this.stats.reset();
    this.hunger.reset();
    this.world.travelTo(0);
    this.story.reset();
    this.weather.reset();
    this.player.reset(this.stats);
    this.inventory = {};

    this.player.x = 200;
    this.player.y = 340;

    // Opening dialogue sequence
    this._switchState(C.STATE.OVERWORLD);
    setTimeout(() => {
      this.pushDialogue(
        'Kaze',
        [
          "I'm hungry... again.",
          "Master said to find food before training. Fine.",
          "But one day — I'll be the strongest in the world.",
        ],
        [],
        null
      );
    }, 500);
  }

  loadGame() {
    try {
      const raw = localStorage.getItem('dragonball_save');
      if (!raw) { this.newGame(); return; }
      const data = JSON.parse(raw);
      this.stats.deserialize(data.stats);
      this.hunger.deserialize && this.hunger.deserialize(data.hunger);
      this.story.deserialize && this.story.deserialize(data.story);
      this.weather.deserialize && this.weather.deserialize(data.weather);
      this.inventory = data.inventory || {};
      this.world.travelTo(data.zoneId || 0);
      this.player.reset(this.stats);
      this.player.x = data.playerX || 200;
      this.player.y = data.playerY || 300;
      this._switchState(C.STATE.OVERWORLD);
    } catch (e) {
      console.error('Save load failed:', e);
      this.newGame();
    }
  }

  saveGame() {
    try {
      const data = {
        stats:     this.stats.serialize(),
        hunger:    this.hunger.serialize ? this.hunger.serialize() : {},
        story:     this.story.serialize ? this.story.serialize() : {},
        weather:   this.weather.serialize ? this.weather.serialize() : {},
        inventory: this.inventory,
        zoneId:    this.world.currentZoneId,
        playerX:   this.player.x,
        playerY:   this.player.y,
        timestamp: Date.now(),
      };
      localStorage.setItem('dragonball_save', JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('Save failed:', e);
      return false;
    }
  }

  // ── Convenience push methods ───────────────────────────────────────────────

  pushDialogue(speaker, lines, choices, onDone) {
    this._pushState(C.STATE.DIALOGUE, (state) => {
      state.setup(speaker, lines, choices, onDone);
    });
  }

  enterTraining(trainerId) {
    this._pushState(C.STATE.TRAINING, (state) => {
      state.setup(trainerId);
    });
  }

  enterCombat(enemyId, conditions) {
    this._pushState(C.STATE.COMBAT, (state) => {
      state.setup(enemyId, conditions || {});
    });
  }

  openInventory(opts) {
    this._pushState(C.STATE.INVENTORY, (state) => {
      state.setup(opts || {});
    });
  }

  travelToZone(zoneId, spawnX, spawnY) {
    this.world.travelTo(zoneId);
    this.player.x = spawnX || 200;
    this.player.y = spawnY || 340;
    // Re-enter overworld with fade
    const ow = this._states[C.STATE.OVERWORLD];
    if (ow) {
      ow._transitionAlpha = 1;
      ow._transitioning   = true;
    }
    // Check story encounters for new zone
    this.story.checkZoneEncounters && this.story.checkZoneEncounters(zoneId);
  }

  doRest() {
    // Advance time to next morning, restore stamina/hp, heal minor injuries
    this.weather.advanceToMorning && this.weather.advanceToMorning();
    this.player.hp = Math.min(this.player.stats.maxHp, this.player.hp + 50);
    this.player.stamina = this.player.stats.maxStamina;
    this.training.onRest && this.training.onRest();
    this.saveGame();
    this.pushDialogue('', ['Rested. Morning has come.', `Power Level: ${this.stats.powerLevel}`], [], null);
  }

  // ── Inventory helpers ──────────────────────────────────────────────────────

  addItem(id, qty) {
    qty = qty || 1;
    if (this.inventory[id]) {
      const def = ITEMS[id];
      const maxStack = (def && def.maxStack) ? def.maxStack : 99;
      this.inventory[id].qty = Math.min(this.inventory[id].qty + qty, maxStack);
    } else {
      this.inventory[id] = { id, qty };
    }
  }

  removeItem(id, qty) {
    qty = qty || 1;
    if (!this.inventory[id]) return false;
    this.inventory[id].qty -= qty;
    if (this.inventory[id].qty <= 0) delete this.inventory[id];
    return true;
  }

  hasItem(id, qty) {
    return this.inventory[id] && this.inventory[id].qty >= (qty || 1);
  }

  // ── Main game loop ─────────────────────────────────────────────────────────

  start() {
    this._running  = true;
    this._lastTime = performance.now();
    this._switchState(C.STATE.TITLE);
    this._loop();
  }

  stop() {
    this._running = false;
    cancelAnimationFrame(this._rafHandle);
  }

  _loop() {
    if (!this._running) return;
    this._rafHandle = requestAnimationFrame((now) => {
      const rawDt = Math.min((now - this._lastTime) / 1000, 0.05); // cap at 50ms
      this._lastTime = now;

      const state = this.currentState;
      if (state) {
        state.update(rawDt);
        state.render(this._ctx, this._W, this._H, rawDt);
      }

      // Update input AFTER state reads it so _justPressed is available
      // for the full frame before being cleared
      Input.update(rawDt);
      Effects.update && Effects.update(rawDt);

      this._loop();
    });
  }
}
