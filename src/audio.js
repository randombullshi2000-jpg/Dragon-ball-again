/**
 * Audio System - Procedural sound effects using Web Audio API
 */

const Audio = {
  _ctx: null,
  _masterGain: null,
  _sfxGain: null,
  _musicGain: null,
  _enabled: true,
  _musicEnabled: true,
  _currentMusic: null,
  _musicNodes: [],

  init() {
    try {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
      this._masterGain = this._ctx.createGain();
      this._masterGain.gain.value = 0.6;
      this._masterGain.connect(this._ctx.destination);

      this._sfxGain = this._ctx.createGain();
      this._sfxGain.gain.value = 0.8;
      this._sfxGain.connect(this._masterGain);

      this._musicGain = this._ctx.createGain();
      this._musicGain.gain.value = 0.4;
      this._musicGain.connect(this._masterGain);

      // Resume on user interaction
      document.addEventListener('click', () => {
        if (this._ctx.state === 'suspended') this._ctx.resume();
      }, { once: true });
      document.addEventListener('keydown', () => {
        if (this._ctx.state === 'suspended') this._ctx.resume();
      }, { once: true });
    } catch (e) {
      console.warn('Web Audio not available:', e);
      this._enabled = false;
    }
  },

  _beep(freq, type, duration, gain = 0.3, startTime = 0) {
    if (!this._enabled || !this._ctx) return;
    const now = this._ctx.currentTime + startTime;
    const osc = this._ctx.createOscillator();
    const g = this._ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    g.gain.setValueAtTime(gain, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(g);
    g.connect(this._sfxGain);
    osc.start(now);
    osc.stop(now + duration);
  },

  _noise(duration, gain = 0.3, startTime = 0) {
    if (!this._enabled || !this._ctx) return;
    const now = this._ctx.currentTime + startTime;
    const bufSize = this._ctx.sampleRate * duration;
    const buf = this._ctx.createBuffer(1, bufSize, this._ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const src = this._ctx.createBufferSource();
    src.buffer = buf;
    const g = this._ctx.createGain();
    g.gain.setValueAtTime(gain, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + duration);
    src.connect(g);
    g.connect(this._sfxGain);
    src.start(now);
  },

  // SFX Methods
  punch() {
    this._noise(0.08, 0.5);
    this._beep(80, 'square', 0.1, 0.2);
  },

  kick() {
    this._noise(0.12, 0.6);
    this._beep(60, 'square', 0.15, 0.3);
  },

  block() {
    this._beep(440, 'square', 0.05, 0.2);
    this._beep(220, 'square', 0.08, 0.15, 0.02);
  },

  dodge() {
    this._beep(600, 'sine', 0.08, 0.15);
    this._beep(800, 'sine', 0.06, 0.1, 0.03);
  },

  hurt() {
    this._noise(0.15, 0.4);
    this._beep(200, 'sawtooth', 0.2, 0.3);
  },

  ko() {
    this._noise(0.3, 0.5);
    this._beep(150, 'sawtooth', 0.5, 0.4);
    this._beep(100, 'sawtooth', 0.8, 0.3, 0.1);
  },

  kiCharge() {
    if (!this._enabled || !this._ctx) return;
    const now = this._ctx.currentTime;
    const osc = this._ctx.createOscillator();
    const g = this._ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.linearRampToValueAtTime(600, now + 0.5);
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.3, now + 0.1);
    g.gain.linearRampToValueAtTime(0.15, now + 0.5);
    osc.connect(g);
    g.connect(this._sfxGain);
    osc.start(now);
    osc.stop(now + 0.5);
  },

  kamehameha() {
    if (!this._enabled || !this._ctx) return;
    const now = this._ctx.currentTime;
    // Charge up
    for (let i = 0; i < 3; i++) {
      this._beep(200 + i * 100, 'sine', 0.3, 0.2, i * 0.15);
    }
    // Fire
    const osc = this._ctx.createOscillator();
    const g = this._ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, now + 0.4);
    osc.frequency.linearRampToValueAtTime(120, now + 1.4);
    g.gain.setValueAtTime(0.5, now + 0.4);
    g.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
    osc.connect(g);
    g.connect(this._sfxGain);
    osc.start(now + 0.4);
    osc.stop(now + 1.5);
  },

  levelUp() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      this._beep(freq, 'sine', 0.2, 0.3, i * 0.1);
    });
  },

  statUp() {
    this._beep(880, 'sine', 0.1, 0.2);
    this._beep(1100, 'sine', 0.15, 0.25, 0.08);
  },

  menuSelect() {
    this._beep(880, 'square', 0.05, 0.15);
  },

  menuConfirm() {
    this._beep(660, 'sine', 0.1, 0.2);
    this._beep(880, 'sine', 0.1, 0.2, 0.08);
  },

  menuBack() {
    this._beep(440, 'square', 0.1, 0.15);
  },

  step() {
    this._noise(0.05, 0.15);
  },

  coin() {
    this._beep(880, 'sine', 0.08, 0.2);
    this._beep(1100, 'sine', 0.12, 0.25, 0.06);
  },

  eat() {
    this._noise(0.1, 0.2);
    this._beep(300, 'sine', 0.1, 0.1, 0.05);
  },

  critHit() {
    this._noise(0.05, 0.7);
    this._beep(150, 'square', 0.25, 0.4);
  },

  training() {
    this._beep(440, 'sine', 0.1, 0.1);
  },

  // Simple procedural music loops
  playMusic(type) {
    if (!this._musicEnabled || !this._enabled || !this._ctx) return;
    this.stopMusic();
    this._currentMusic = type;
    this._playMusicLoop(type);
  },

  stopMusic() {
    this._musicNodes.forEach(n => { try { n.stop(); } catch(e) {} });
    this._musicNodes = [];
    this._currentMusic = null;
  },

  _playMusicLoop(type) {
    // Simple ambient music using oscillators
    // Not full songs, just atmospheric tones
    if (!this._ctx) return;
    const now = this._ctx.currentTime;
    const patterns = {
      title: { notes: [261, 329, 392, 523], dur: 0.5, tempo: 1.2 },
      overworld: { notes: [220, 277, 330, 415], dur: 0.4, tempo: 0.9 },
      combat: { notes: [164, 195, 246, 311], dur: 0.2, tempo: 0.5 },
      training: { notes: [196, 247, 294, 370], dur: 0.6, tempo: 1.0 },
    };
    const pat = patterns[type] || patterns.overworld;
    // Just play a gentle drone chord for now
    pat.notes.forEach((freq, i) => {
      const osc = this._ctx.createOscillator();
      const g = this._ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      g.gain.value = 0.04 / (i + 1);
      osc.connect(g);
      g.connect(this._musicGain);
      osc.start(now);
      this._musicNodes.push(osc);
    });
  },

  setVolume(vol) {
    if (this._masterGain) this._masterGain.gain.value = MathUtil.clamp(vol, 0, 1);
  },

  setSfxVolume(vol) {
    if (this._sfxGain) this._sfxGain.gain.value = MathUtil.clamp(vol, 0, 1);
  },

  setMusicVolume(vol) {
    if (this._musicGain) this._musicGain.gain.value = MathUtil.clamp(vol, 0, 1);
  },
};
