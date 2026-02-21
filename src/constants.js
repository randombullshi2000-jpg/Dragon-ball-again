/**
 * DRAGON BALL: PATH OF THE YOUNG WARRIOR
 * Core Game Constants
 */

const C = {
  // Canvas
  W: 960,
  H: 540,
  SCALE: 3,          // logical pixel scale (1 logical px = 3 canvas px)
  SPRITE_SCALE: 3,   // sprite pixel scale
  TILE: 16,          // tile size in logical pixels
  TILE_PX: 48,       // tile size in canvas pixels (16 * 3)

  // Target FPS
  FPS: 60,
  DT: 1 / 60,

  // Colors (hex)
  COL: {
    TRANSPARENT: null,
    BLACK:       '#0a0a0a',
    WHITE:       '#f0f0f0',
    YELLOW:      '#f4d03f',
    ORANGE:      '#e76f51',
    RED:         '#c0392b',
    BLUE:        '#2b4999',
    BLUE_LIGHT:  '#5b8dd9',
    GREEN:       '#27ae60',
    PURPLE:      '#8e44ad',
    BROWN:       '#7d5a3c',
    TAN:         '#d4a477',
    SKIN:        '#f4a261',
    SKIN_DARK:   '#c47a3a',
    SKIN_SHADOW: '#a05c28',
    HAIR_BLACK:  '#1a1a2e',
    HAIR_DARK:   '#2c2c3e',
    GI_ORANGE:   '#e8772c',
    GI_ORANGE_D: '#bf5e1a',
    GI_BLUE:     '#3d6fbc',
    GI_BLUE_D:   '#2b4d8a',
    DIRT:        '#8b6914',
    GRASS:       '#4a8c3f',
    GRASS_LIGHT: '#6ab05f',
    SKY:         '#87ceeb',
    SKY_DARK:    '#1a1a4e',
    CLOUD:       '#d4e8f0',
    MOUNTAIN:    '#6b7e8c',
    WATER:       '#2980b9',
    KI_BLUE:     '#4db8ff',
    KI_GLOW:     '#a8d8ff',
    AURA:        '#64c8ff',
    FIRE:        '#ff6b35',
    UI_BG:       '#0d0d1a',
    UI_BORDER:   '#f4d03f',
    UI_TEXT:     '#f0f0f0',
    UI_DIM:      '#888888',
    HP_GREEN:    '#2ecc71',
    HP_YELLOW:   '#f1c40f',
    HP_RED:      '#e74c3c',
    STAMINA:     '#3498db',
    KI_BAR:      '#9b59b6',
    EXP:         '#f39c12',
  },

  // Stats
  STAT: {
    MAX: 50,
    PL_BASE: 3,         // Starting power level
    HP_BASE: 100,       // Base HP
    STAMINA_BASE: 100,  // Base stamina
    KI_BASE: 0,         // Base ki (unlock at PL 40)
    HUNGER_MAX: 100,
    HUNGER_START: 70,
  },

  // Combat
  COMBAT: {
    LIGHT_DMG: 0.08,          // damage as fraction of PL
    MEDIUM_DMG: 0.15,
    HEAVY_DMG: 0.28,
    CRIT_MULT: 1.8,
    COMBO_THRESHOLDS: [3, 6, 10, 15, 20, 26],
    COMBO_BONUSES: [1.2, 1.5, 1.75, 2.0, 2.5, 3.0],
    STAMINA_LIGHT: 8,
    STAMINA_MEDIUM: 15,
    STAMINA_HEAVY: 30,
    STAMINA_REGEN_IDLE: 20,     // per second
    STAMINA_REGEN_MOVE: 5,
    STAMINA_REGEN_BLOCK: 0,
    STAMINA_REGEN_STILL: 20,
    BLOCK_COST: 3,              // per second
    DODGE_COST: 15,
    PARRY_WINDOW: 0.12,         // seconds
    PERFECT_DODGE_WINDOW: 0.1,
    GUARD_METER: 100,
    CHIP_DAMAGE: 0.10,          // 10% damage through block
  },

  // Training
  TRAINING: {
    DIMINISHING: 0.02,          // diminishing returns factor
    INJURY_LOW_STAMINA: 0.20,   // 20% risk below 30 stamina
    INJURY_CRITICAL: 0.50,      // 50% risk below 15 stamina
    STAMINA_REGEN_REST: 8,      // per second while resting
  },

  // World / Physics
  WORLD: {
    GRAVITY: 1200,
    JUMP_FORCE: -520,
    WALK_SPEED: 140,
    RUN_SPEED: 260,
    SPRINT_SPEED: 400,
    SPRINT_DRAIN: 5,  // stamina/sec
  },

  // Hunger
  HUNGER: {
    DRAIN_IDLE:   0.3,   // per second
    DRAIN_TRAIN:  0.8,
    DRAIN_COMBAT: 1.2,
    WELL_FED:     80,
    NORMAL:       50,
    HUNGRY:       30,
    STARVING:     10,
    CRITICAL:     0,
  },

  // Time of day (in-game seconds per real second)
  TIME: {
    SPEED: 60,          // 1 real sec = 60 in-game secs (1 min per real sec)
    DAY_LENGTH: 86400,  // in-game seconds per day
    DAWN: 5 * 3600,
    MORNING: 7 * 3600,
    NOON: 12 * 3600,
    AFTERNOON: 14 * 3600,
    EVENING: 18 * 3600,
    NIGHT: 20 * 3600,
  },

  // Story Acts
  ACT: {
    SURVIVAL: 0,
    JOURNEY: 1,
    TEST: 2,
    PROVING: 3,
  },

  // PL thresholds for act transitions
  ACT_PL: [15, 40, 80, 120],

  // Stage visual thresholds
  STAGE_PL: [15, 40, 80],     // thresholds for stages 2,3,4

  // Game states
  STATE: {
    TITLE: 'title',
    OVERWORLD: 'overworld',
    TRAINING: 'training',
    COMBAT: 'combat',
    DIALOGUE: 'dialogue',
    INVENTORY: 'inventory',
    CUTSCENE: 'cutscene',
    GAME_OVER: 'gameover',
  },

  // Input keys
  KEY: {
    LEFT:   'ArrowLeft',
    RIGHT:  'ArrowRight',
    UP:     'ArrowUp',
    DOWN:   'ArrowDown',
    A:      'a', // light attack / confirm
    B:      'b', // cancel / back
    X:      'x', // medium attack
    Y:      'y', // heavy attack
    L:      'q', // block
    R:      'e', // dodge
    START:  'Enter',
    SELECT: 'Shift',
    MENU:   'Escape',
    SPRINT: 'z',
    KI:     's', // ki charge
    PAUSE:  'p',
  },
};

// Freeze to prevent accidental modification
Object.freeze(C);
Object.freeze(C.COL);
Object.freeze(C.STAT);
Object.freeze(C.COMBAT);
Object.freeze(C.TRAINING);
Object.freeze(C.WORLD);
Object.freeze(C.HUNGER);
Object.freeze(C.TIME);
Object.freeze(C.ACT);
Object.freeze(C.STATE);
Object.freeze(C.KEY);
