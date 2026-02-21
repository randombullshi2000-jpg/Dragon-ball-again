/**
 * Training System – handles exercise execution, gains, injury rolls
 */

class TrainingSystem {
  constructor(stats, hunger) {
    this.stats  = stats;
    this.hunger = hunger;

    this.activeExercise = null;  // currently performing exercise
    this.progress       = 0;     // 0-1 through duration
    this.quality        = 0;     // 0-100 kata quality
    this.restTimer      = 0;     // time until next training allowed
    this.flowState      = false; // doubled gains on next session
    this._usedLimitBreak = {};   // exerciseId → bool (reset on rest)

    // Daily training log
    this.dailyLog   = {};
    this.totalSessions = 0;
  }

  // Start an exercise. Returns { ok, reason }
  start(exerciseId, conditions = {}) {
    const ex = EXERCISE_BY_ID[exerciseId];
    if (!ex) return { ok: false, reason: 'Unknown exercise' };

    // Check requirements
    if (ex.requires) {
      for (const [req, val] of Object.entries(ex.requires)) {
        if (req.startsWith('proficiency_')) {
          const pid = req.replace('proficiency_', '');
          if (this.stats.getProficiencyLevel(pid) < val)
            return { ok: false, reason: `Need proficiency level ${val} in ${pid}` };
        } else if (req === 'powerLevel') {
          if (this.stats.powerLevel < val)
            return { ok: false, reason: `Need Power Level ${val}` };
        } else {
          if ((this.stats[req] || 0) < val)
            return { ok: false, reason: `Need ${req} ${val}` };
        }
      }
    }

    // Limit break check
    if (ex.oncePerRest && this._usedLimitBreak[exerciseId]) {
      return { ok: false, reason: 'Already used this training today – rest first' };
    }

    // Stamina check (unless negative = restores)
    const staminaCost = ex.stamina > 0 ? ex.stamina : 0;
    if (staminaCost > 0 && this.stats.stamina < staminaCost * 0.3) {
      return { ok: false, reason: 'Too exhausted to train!' };
    }

    // Hunger check
    if (!this.hunger.canTrain()) {
      return { ok: false, reason: 'Too hungry to train – eat something first' };
    }

    this.activeExercise = ex;
    this.progress       = 0;
    this.quality        = 50 + Math.random() * 30; // base kata quality
    this._conditions    = conditions;
    return { ok: true };
  }

  // Update training progress (call each frame)
  // Returns: null (ongoing) | result object (complete)
  update(dt) {
    if (!this.activeExercise) return null;
    const ex = this.activeExercise;

    this.progress += dt / ex.duration;

    // Drain stamina proportionally
    if (ex.stamina > 0) {
      this.stats.drainStamina(ex.stamina * dt / ex.duration);
    }

    // Injury risk during progress if stamina is low
    if (this.stats.stamina < 30 && Math.random() < C.TRAINING.INJURY_LOW_STAMINA * dt) {
      this._inflictInjury(ex);
    }

    if (this.progress >= 1) {
      return this._complete();
    }
    return null;
  }

  // Force complete current exercise
  _complete() {
    const ex = this.activeExercise;
    this.activeExercise = null;
    this.progress = 0;
    this.totalSessions++;
    this.stats.stats.totalTrainingSessions++;

    const result = {
      exerciseId: ex.id,
      name:       ex.name,
      gains:      {},
      profGain:   0,
      injured:    false,
      injuryType: null,
      messages:   [],
    };

    // Injury roll at limit break
    if (ex.tier === TRAIN_TIER.LIMIT_BREAK || ex.injuryRisk > 0) {
      const risk = ex.injuryRisk + (this.stats.stamina < 15 ? 0.30 : 0);
      if (Math.random() < risk) {
        const injured = this._inflictInjury(ex);
        result.injured    = true;
        result.injuryType = injured;
        result.messages.push(`Injured: ${INJURY_TYPES[injured]?.label || injured}!`);
      }
    }

    // Track limit break
    if (ex.oncePerRest) {
      this._usedLimitBreak[ex.id] = true;
    }

    // Calculate gains
    const profMult  = this.stats.getProficiencyMultiplier(ex.id);
    const flowMult  = this.flowState ? 2.0 : 1.0;
    const timeMult  = this._getTimeMult();
    const locMult   = this._conditions.locationBonus || 1.0;
    const weatherMult = this._conditions.weatherBonus || 1.0;
    const qualMult  = ex.isKata ? this._getQualityMult() : 1.0;

    for (const [stat, baseGain] of Object.entries(ex.gains)) {
      let gain = baseGain * profMult * flowMult * timeMult * locMult * weatherMult * qualMult;
      gain = this.stats.gainStat(stat, gain);
      result.gains[stat] = gain;

      if (stat !== 'kiControl' || this.stats.powerLevel >= 40) {
        // ki only if unlocked
      }
    }

    // Stamina restore for recovery exercises
    if (ex.staminaRestore) {
      this.stats.restoreStamina(ex.staminaRestore);
    }
    if (ex.fullHeal) {
      this.stats.heal(this.stats.maxHP);
    }

    // Add proficiency XP
    const newLevel = this.stats.addProficiency(ex.id, 1);
    result.profGain = newLevel;
    if (newLevel > 0 && newLevel % 2 === 0) {
      result.messages.push(`Proficiency Level ${newLevel} reached!`);
    }

    // Check flow state quality (kata)
    if (ex.isKata && this.quality >= 95) {
      this.flowState = true;
      result.messages.push('Flow State! Next training doubled!');
    } else if (ex.isKata) {
      this.flowState = false;
    }

    // Unlock techniques
    if (ex.unlock && !this.stats.hasTechnique(ex.unlock)) {
      this.stats.unlockTechnique(ex.unlock);
      result.messages.push(`Unlocked technique: ${ex.unlock}!`);
    }

    // Daily log
    this.dailyLog[ex.id] = (this.dailyLog[ex.id] || 0) + 1;

    this.hunger.setMode('idle');
    Audio.statUp();
    return result;
  }

  _getTimeMult() {
    // Would check game time-of-day here; placeholder
    return 1.0;
  }

  _getQualityMult() {
    if (this.quality >= 95) return 2.0;
    if (this.quality >= 85) return 1.5;
    if (this.quality >= 70) return 1.0;
    return 0;  // no gains below threshold
  }

  _inflictInjury(ex) {
    const types = ['sprain', 'pulled_muscle', 'exhaustion', 'fracture'];
    // Heavier exercises → worse injuries
    const severe = ex.stamina > 60 || ex.tier === TRAIN_TIER.LIMIT_BREAK;
    const candidates = severe
      ? ['pulled_muscle', 'fracture', 'exhaustion']
      : ['sprain', 'pulled_muscle', 'exhaustion'];
    const type = RNG_LIVE.pick(candidates);
    this.stats.addInjury(type);
    return type;
  }

  // Call after full rest
  onRest() {
    this._usedLimitBreak = {};
    this.dailyLog = {};
  }

  // Set kata quality (called by minigame)
  setKataQuality(q) {
    this.quality = MathUtil.clamp(q, 0, 100);
  }

  // Cancel current training
  cancel() {
    this.activeExercise = null;
    this.progress       = 0;
  }

  // Get available exercises
  getAvailable(act = 0) {
    return getAvailableExercises(this.stats, act);
  }
}
