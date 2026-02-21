/**
 * Dialogue State
 */

class DialogueState {
  constructor(game) {
    this.game   = game;
    this.name   = C.STATE.DIALOGUE;
    this._lines = [];
    this._speaker = '';
    this._lineIdx = 0;
    this._choices = [];
    this._onDone  = null;
    this._charIdx = 0;    // typewriter progress
    this._charTimer = 0;
    this._CHAR_SPEED = 0.03; // seconds per character
    this._done = false;    // last line reached
    this._blink = 0;
  }

  // Call before entering: configure the dialogue
  setup(speaker, lines, choices, onDone) {
    this._speaker  = speaker;
    this._lines    = lines;
    this._choices  = choices || [];
    this._onDone   = onDone || null;
    this._lineIdx  = 0;
    this._charIdx  = 0;
    this._charTimer = 0;
    this._done     = false;
  }

  enter() {
    Input.hideControls();
  }

  exit() {}

  update(dt) {
    this._blink = (this._blink + dt * 2) % (Math.PI * 2);

    const currentLine = this._lines[this._lineIdx] || '';

    // Typewriter effect
    if (this._charIdx < currentLine.length) {
      this._charTimer += dt;
      while (this._charTimer >= this._CHAR_SPEED && this._charIdx < currentLine.length) {
        this._charTimer -= this._CHAR_SPEED;
        this._charIdx++;
        if (currentLine[this._charIdx - 1] !== ' ') {
          // slight blip sound on non-space chars (throttled)
          if (this._charIdx % 4 === 0) Audio.menuSelect && Audio.menuSelect();
        }
      }
    }

    const confirmed = Input.pressed('Enter') || Input.pressed(C.KEY.A) || Input.pressed('tap');
    const backed    = Input.pressed(C.KEY.B) || Input.pressed('Escape');

    if (!confirmed && !backed) return;

    // If typewriter not done, finish instantly
    if (this._charIdx < currentLine.length) {
      this._charIdx = currentLine.length;
      return;
    }

    // On the last line with choices, A = choice 0, B = dismiss
    const isLast = this._lineIdx >= this._lines.length - 1;

    if (isLast && this._choices.length > 0) {
      // Show choices – wait for separate choice press
      // choices handled in render; A picks highlighted, nav with Up/Down
      // For now: pressing A selects first choice; TODO: proper choice nav
      const chosen = backed ? this._choices.length - 1 : 0;
      if (this._onDone) this._onDone(this._choices[chosen]);
      this.game.popState();
    } else if (isLast) {
      if (this._onDone) this._onDone(null);
      this.game.popState();
    } else {
      this._lineIdx++;
      this._charIdx = 0;
      this._charTimer = 0;
    }
  }

  render(ctx, W, H) {
    // Dim the background
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, W, H);

    const currentLine = (this._lines[this._lineIdx] || '').slice(0, this._charIdx);
    const isLast = this._lineIdx >= this._lines.length - 1;

    HUD.drawDialogueBox(
      ctx,
      this._speaker,
      currentLine,
      isLast ? this._choices : [],
      W, H,
      Math.abs(Math.sin(this._blink))
    );
  }
}
