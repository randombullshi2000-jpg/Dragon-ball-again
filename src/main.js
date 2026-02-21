/**
 * Entry point — loading screen → game boot
 */

(function () {
  'use strict';

  const loadingScreen = document.getElementById('loading-screen');
  const loadingBar    = document.getElementById('loading-bar');
  const loadingText   = document.getElementById('loading-text');
  const canvas        = document.getElementById('game-canvas');

  function setProgress(pct, label) {
    loadingBar.style.width = pct + '%';
    loadingText.textContent = label;
  }

  function hideLoading() {
    loadingScreen.style.transition = 'opacity 0.5s';
    loadingScreen.style.opacity = '0';
    setTimeout(() => { loadingScreen.style.display = 'none'; }, 520);
  }

  // ── Boot sequence ────────────────────────────────────────────────────────

  async function boot() {
    setProgress(5, 'Initializing...');

    // Ensure canvas resolution matches design
    canvas.width  = 960;
    canvas.height = 540;

    // Give browser a frame to paint loading screen
    await frame();
    setProgress(15, 'Loading sprites...');
    await frame();

    // Validate sprites parsed correctly
    const spriteCount = Object.keys(SPRITES).length;
    setProgress(30, `${spriteCount} sprites loaded`);
    await frame();

    setProgress(45, 'Building world...');
    await frame();

    // Init Audio (must be after user gesture on iOS — deferred to first tap)
    // Audio.init() called lazily inside Audio methods
    setProgress(60, 'Loading audio system...');
    await frame();

    setProgress(75, 'Preparing game engine...');
    await frame();

    // Create game instance
    let game;
    try {
      game = new Game(canvas);
    } catch (e) {
      console.error('Game init failed:', e);
      setProgress(100, 'Error! Check console.');
      return;
    }

    setProgress(90, 'Almost ready...');
    await frame();

    setProgress(100, 'Let\'s go!');
    await frame();
    await delay(300);

    hideLoading();
    await delay(200);

    // Wire up virtual button handlers to Input
    _wireVirtualButtons();

    // Start the game
    game.start();

    // Expose for debugging
    if (typeof window !== 'undefined') window._game = game;
  }

  // ── Virtual button wiring ─────────────────────────────────────────────────
  // Supplement the touch listeners in Input.js with the top-bar buttons

  function _wireVirtualButtons() {
    const btnMenu  = document.getElementById('btn-menu');
    const btnStats = document.getElementById('btn-stats');

    if (btnMenu) {
      btnMenu.addEventListener('touchstart', (e) => {
        e.preventDefault();
        // Simulate pressing 'm'
        Input._setKey && Input._setKey('m', true);
        setTimeout(() => Input._setKey && Input._setKey('m', false), 80);
      }, { passive: false });
    }

    if (btnStats) {
      btnStats.addEventListener('touchstart', (e) => {
        e.preventDefault();
        Input._setKey && Input._setKey('i', true);
        setTimeout(() => Input._setKey && Input._setKey('i', false), 80);
      }, { passive: false });
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  function frame() {
    return new Promise(resolve => requestAnimationFrame(resolve));
  }

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ── Error handling ────────────────────────────────────────────────────────

  window.addEventListener('error', (evt) => {
    console.error('Uncaught:', evt.error || evt.message);
    if (loadingScreen && loadingScreen.style.display !== 'none') {
      setProgress(100, 'Error: ' + (evt.message || 'unknown'));
    }
  });

  // ── Orientation handling ──────────────────────────────────────────────────

  function onOrientationChange() {
    const hint = document.getElementById('rotate-hint');
    if (!hint) return;
    const landscape = window.matchMedia('(orientation: landscape)').matches;
    hint.style.display = landscape ? 'none' : 'flex';
  }

  window.addEventListener('resize', onOrientationChange);
  window.addEventListener('orientationchange', onOrientationChange);
  onOrientationChange();

  // ── Prevent default touch behaviour on canvas (no scrolling/zoom) ─────────

  canvas.addEventListener('touchstart',  e => e.preventDefault(), { passive: false });
  canvas.addEventListener('touchmove',   e => e.preventDefault(), { passive: false });
  canvas.addEventListener('touchend',    e => e.preventDefault(), { passive: false });
  canvas.addEventListener('contextmenu', e => e.preventDefault());

  // ── Kick off ──────────────────────────────────────────────────────────────

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
