/**
 * Stats & Progression System
 * Manages all character statistics, Power Level, and progression
 */

class StatsSystem {
  constructor() {
    this.reset();
  }

  reset() {
    // Core stats (all start at 1, cap at 50)
    this.strength  = 1;
    this.speed     = 1;
    this.endurance = 1;
    this.technique = 0;
    this.kiControl = 0;   // Unlocks at PL 40

    // Derived stats
    this.powerLevel = C.STAT.PL_BASE;
    this.maxHP      = C.STAT.HP_BASE;
    this.maxStamina = C.STAT.STAMINA_BASE;
    this.maxKi      = 0;   // starts at 0

    // Current values
    this.hp      = this.maxHP;
    this.stamina = this.maxStamina;
    this.ki      = 0;

    // Personality/honor systems
    this.honor       = 50;
    this.determination = 0;
    this.wisdom      = 0;

    // Zeni (currency)
    this.zeni = 0;

    // Visual stage (0-3)
    this.stage = 0;

    // Stat caps
    this.statCap = C.STAT.MAX;

    // Bonuses (from titles, traits, items)
    this.bonuses = {
      allStats:   0,  // % bonus to all stats
      strength:   0,
      speed:      0,
      endurance:  0,
      technique:  0,
      kiControl:  0,
      trainGain:  0,  // % bonus to all training gains
    };

    // Active status effects
    this.effects = [];

    // Injury state
    this.injuries = [];

    // Training proficiency levels (per exercise)
    this.proficiency = {};

    // Unlocked techniques/traits
    this.techniques = new Set();
    this.traits     = new Set();
    this.titles     = new Set();

    // Experience tracking for achievements
    this.stats = {
      totalPunches: 0,
      totalTrainingSessions: 0,
      totalCombatWins: 0,
      totalCombatLosses: 0,
      longestCombo: 0,
      totalDistanceTraveled: 0,
      totalFoodEaten: 0,
    };
  }

  // Recalculate Power Level and derived stats
  recalculate() {
    const str = this.getEffectiveStat('strength');
    const spd = this.getEffectiveStat('speed');
    const end = this.getEffectiveStat('endurance');
    const tec = this.getEffectiveStat('technique');
    const ki  = this.getEffectiveStat('kiControl');

    this.powerLevel = Math.floor(
      (str * 2 + spd * 2 + end * 1.5 + tec * 1.5 + ki) * 0.5 + 3
    );

    const prevMaxHP = this.maxHP;
    const prevMaxStamina = this.maxStamina;

    this.maxHP      = C.STAT.HP_BASE + end * 10;
    this.maxStamina = C.STAT.STAMINA_BASE + end * 8;
    this.maxKi      = ki * 20;

    // Scale current HP/stamina if max changed
    if (prevMaxHP > 0) {
      this.hp = Math.min(this.hp + (this.maxHP - prevMaxHP), this.maxHP);
    }
    if (prevMaxStamina > 0) {
      this.stamina = Math.min(this.stamina + (this.maxStamina - prevMaxStamina), this.maxStamina);
    }

    // Update visual stage
    this.stage = this.getStage();

    return this.powerLevel;
  }

  // Get stat with bonuses applied
  getEffectiveStat(stat) {
    const base = this[stat] || 0;
    const bonusPct = (this.bonuses[stat] || 0) + this.bonuses.allStats;
    const injury = this.getInjuryPenalty(stat);
    const effect = this.getEffectBonus(stat);
    return Math.max(0, base * (1 + bonusPct / 100) * (1 - injury) + effect);
  }

  // Visual stage based on PL
  getStage() {
    const pl = this.powerLevel;
    if (pl >= 81) return 3;
    if (pl >= 41) return 2;
    if (pl >= 16) return 1;
    return 0;
  }

  // Gain a stat with diminishing returns
  gainStat(stat, amount, conditions = {}) {
    const current = this[stat] || 0;
    if (current >= this.statCap) return 0;

    // Diminishing returns
    let gain = MathUtil.diminish(amount, current, C.TRAINING.DIMINISHING);

    // Training gain bonus
    gain *= (1 + this.bonuses.trainGain / 100);

    // Proficiency bonus handled in training system

    // Condition bonuses
    if (conditions.timeBonus)   gain *= conditions.timeBonus;
    if (conditions.weatherBonus) gain *= conditions.weatherBonus;
    if (conditions.locationBonus) gain *= conditions.locationBonus;
    if (conditions.qualityBonus) gain *= conditions.qualityBonus;

    // Apply
    this[stat] = Math.min(this.statCap, current + gain);

    // Recalculate PL
    this.recalculate();

    return gain;
  }

  // Apply damage
  takeDamage(amount, type = 'physical') {
    const prevHP = this.hp;
    this.hp = Math.max(0, this.hp - amount);
    return prevHP - this.hp; // actual damage dealt
  }

  // Heal
  heal(amount) {
    const prevHP = this.hp;
    this.hp = Math.min(this.maxHP, this.hp + amount);
    return this.hp - prevHP;
  }

  // Drain stamina
  drainStamina(amount) {
    this.stamina = Math.max(0, this.stamina - amount);
    return this.stamina <= 10; // returns true if exhausted
  }

  // Restore stamina
  restoreStamina(amount) {
    this.stamina = Math.min(this.maxStamina, this.stamina + amount);
  }

  // Drain ki
  drainKi(amount) {
    if (this.ki < amount) return false; // not enough ki
    this.ki = Math.max(0, this.ki - amount);
    return true;
  }

  // Regen ki
  regenKi(amount) {
    this.ki = Math.min(this.maxKi, this.ki + amount);
  }

  // Check if exhausted
  isExhausted() {
    return this.stamina <= 10;
  }

  // Add injury
  addInjury(type) {
    const injuryData = INJURY_TYPES[type];
    if (!injuryData) return;
    // Don't stack same injury
    if (this.injuries.find(i => i.type === type)) return;
    this.injuries.push({
      type,
      timer: injuryData.duration,
      ...injuryData
    });
  }

  // Get injury penalty for a stat
  getInjuryPenalty(stat) {
    let penalty = 0;
    for (const injury of this.injuries) {
      if (injury.affects && injury.affects[stat]) {
        penalty += injury.affects[stat];
      }
    }
    return MathUtil.clamp(penalty, 0, 0.8);
  }

  // Update injuries (call each frame)
  updateInjuries(dt) {
    this.injuries = this.injuries.filter(inj => {
      inj.timer -= dt;
      return inj.timer > 0;
    });
  }

  // Add status effect
  addEffect(effect) {
    // Remove existing of same type
    this.effects = this.effects.filter(e => e.type !== effect.type);
    this.effects.push({ ...effect });
  }

  // Get effect bonus for stat
  getEffectBonus(stat) {
    return this.effects.reduce((sum, e) => sum + (e.stats?.[stat] || 0), 0);
  }

  // Update effects
  updateEffects(dt) {
    this.effects = this.effects.filter(e => {
      if (e.duration !== undefined) {
        e.duration -= dt;
        return e.duration > 0;
      }
      return true;
    });
  }

  // Get proficiency level for exercise
  getProficiency(exerciseId) {
    return this.proficiency[exerciseId] || 0;
  }

  // Add proficiency XP
  addProficiency(exerciseId, xp = 1) {
    const current = this.proficiency[exerciseId] || 0;
    const newVal = current + xp;
    this.proficiency[exerciseId] = newVal;
    // Level thresholds: 10,25,50,85,130,185,250,325,410,500
    const THRESHOLDS = [0,10,25,50,85,130,185,250,325,410,500];
    for (let lvl = 10; lvl >= 1; lvl--) {
      if (newVal >= THRESHOLDS[lvl]) return lvl;
    }
    return 0;
  }

  // Get proficiency level (1-10) from XP
  getProficiencyLevel(exerciseId) {
    const xp = this.proficiency[exerciseId] || 0;
    const THRESHOLDS = [0,10,25,50,85,130,185,250,325,410,500];
    for (let lvl = 10; lvl >= 1; lvl--) {
      if (xp >= THRESHOLDS[lvl]) return lvl;
    }
    return 0;
  }

  // Gain proficiency multiplier
  getProficiencyMultiplier(exerciseId) {
    const lvl = this.getProficiencyLevel(exerciseId);
    const MULT = [1.0, 1.0, 1.0, 1.5, 1.5, 2.0, 2.0, 2.5, 2.5, 3.0, 3.0];
    return MULT[lvl] || 1.0;
  }

  // Unlock technique
  unlockTechnique(id) {
    this.techniques.add(id);
  }

  hasTechnique(id) {
    return this.techniques.has(id);
  }

  // Unlock trait
  unlockTrait(id) {
    this.traits.add(id);
  }

  hasTrait(id) {
    return this.traits.has(id);
  }

  // Add title
  addTitle(id) {
    this.titles.add(id);
  }

  // Determination bonuses
  getDeterminationBonuses() {
    const bonuses = [];
    if (this.determination >= 10) bonuses.push('never_give_up');
    if (this.determination >= 20) bonuses.push('second_wind');
    if (this.determination >= 30) bonuses.push('comeback_king');
    if (this.determination >= 40) bonuses.push('unbreakable_will');
    if (this.determination >= 50) bonuses.push('zenkai_boost');
    return bonuses;
  }

  // Honor effects
  getHonorTitle() {
    if (this.honor >= 80) return 'Hero';
    if (this.honor >= 50) return 'Honorable';
    if (this.honor >= 20) return 'Questionable';
    return 'Dishonorable';
  }

  getShopDiscount() {
    if (this.honor >= 80) return 0.20;
    if (this.honor < 20)  return -0.30; // 30% more expensive
    return 0;
  }

  // Serialize to JSON for save
  serialize() {
    return {
      strength: this.strength,
      speed: this.speed,
      endurance: this.endurance,
      technique: this.technique,
      kiControl: this.kiControl,
      powerLevel: this.powerLevel,
      hp: this.hp,
      stamina: this.stamina,
      ki: this.ki,
      honor: this.honor,
      determination: this.determination,
      wisdom: this.wisdom,
      zeni: this.zeni,
      techniques: [...this.techniques],
      traits: [...this.traits],
      titles: [...this.titles],
      proficiency: this.proficiency,
      stats: this.stats,
    };
  }

  // Restore from JSON
  deserialize(data) {
    Object.assign(this, data);
    this.techniques = new Set(data.techniques || []);
    this.traits     = new Set(data.traits || []);
    this.titles     = new Set(data.titles || []);
    this.effects    = [];
    this.injuries   = [];
    this.recalculate();
  }
}

// Injury type definitions
const INJURY_TYPES = {
  sprain: {
    label: 'Sprained',
    duration: 7200,  // 2 hours in seconds
    affects: { speed: 0.20 }
  },
  pulled_muscle: {
    label: 'Pulled Muscle',
    duration: 14400,
    affects: { strength: 0.30 }
  },
  exhaustion: {
    label: 'Exhaustion',
    duration: 21600,
    affects: {}  // stamina regen penalty handled separately
  },
  fracture: {
    label: 'Fracture',
    duration: 43200,
    affects: { strength: 0.20, speed: 0.20, endurance: 0.20, technique: 0.20 }
  },
  concussion: {
    label: 'Concussion',
    duration: 28800,
    affects: { technique: 0.30, kiControl: 0.20 }
  },
};
