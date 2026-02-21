/**
 * Hunger & Nutrition System
 */

class HungerSystem {
  constructor(stats) {
    this.stats = stats;
    this.hunger = C.STAT.HUNGER_START;
    this.mode   = 'idle';    // idle | training | combat
    this._warnedHungry   = false;
    this._warnedStarving = false;
  }

  setMode(mode) { this.mode = mode; }

  update(dt) {
    const rate = {
      idle:     C.HUNGER.DRAIN_IDLE,
      training: C.HUNGER.DRAIN_TRAIN,
      combat:   C.HUNGER.DRAIN_COMBAT,
    }[this.mode] || C.HUNGER.DRAIN_IDLE;

    this.hunger = Math.max(0, this.hunger - rate * dt);

    // Apply stat effects
    this._applyEffects();
  }

  _applyEffects() {
    // Remove any old hunger effects
    this.stats.effects = this.stats.effects.filter(e => e.source !== 'hunger');

    if (this.hunger >= C.HUNGER.WELL_FED) {
      this.stats.addEffect({ type: 'well_fed', source: 'hunger',
        stats: { strength: 1, speed: 1, endurance: 1 },
        trainBonus: 10,
      });
    } else if (this.hunger < C.HUNGER.HUNGRY) {
      const sev = this.hunger < C.HUNGER.STARVING ? 30 : 10;
      this.stats.addEffect({ type: 'hungry', source: 'hunger',
        stats: { strength: -sev * 0.05, speed: -sev * 0.05, endurance: -sev * 0.05 },
        trainPenalty: sev,
      });
    }

    // Critical: lose HP
    if (this.hunger <= C.HUNGER.CRITICAL) {
      this.stats.takeDamage(5 * (1 / 60));  // approx per frame at 60fps
    }
  }

  // Eat a food item, returns { hungGain, effects }
  eat(itemId) {
    const item = ITEMS[itemId];
    if (!item || item.type !== ITEM_TYPE.CONSUMABLE) return null;

    const result = { messages: [], statChanges: {} };

    // Hunger restore
    if (item.effect.hunger) {
      const prev = this.hunger;
      this.hunger = Math.min(C.STAT.HUNGER_MAX, this.hunger + item.effect.hunger);
      result.hungGain = this.hunger - prev;
    }

    // HP restore
    if (item.effect.hp) {
      result.statChanges.hp = this.stats.heal(item.effect.hp);
    }

    // Stamina restore
    if (item.effect.stamina) {
      this.stats.restoreStamina(item.effect.stamina);
      result.statChanges.stamina = item.effect.stamina;
    }

    // Ki restore
    if (item.effect.ki) {
      this.stats.ki = Math.min(this.stats.maxKi, this.stats.ki + item.effect.ki);
    }

    // Remove injuries
    if (item.effect.removeInjuries) {
      this.stats.injuries = [];
      result.messages.push('All injuries healed!');
    }

    // Cure poison
    if (item.effect.curePoison) {
      this.stats.effects = this.stats.effects.filter(e => e.type !== 'poison');
      result.messages.push('Poison cured!');
    }

    // Injury timer reduce
    if (item.effect.injuryTimerReduce) {
      for (const inj of this.stats.injuries) {
        inj.timer *= (1 - item.effect.injuryTimerReduce);
      }
    }

    // Stat bonuses (timed)
    if (item.effect.statBonus && item.effect.duration) {
      const bonus = { source: 'food', type: 'food_bonus', duration: item.effect.duration, stats: {} };
      for (const [stat, val] of Object.entries(item.effect.statBonus)) {
        bonus.stats[stat] = val;
      }
      if (item.effect.statBonus.all) {
        bonus.stats.strength = bonus.stats.speed = bonus.stats.endurance =
        bonus.stats.technique = bonus.stats.kiControl = item.effect.statBonus.all;
      }
      this.stats.addEffect(bonus);
    }

    // Training bonus
    if (item.effect.trainBonus && item.effect.duration) {
      this.stats.addEffect({
        source: 'food', type: 'train_food', duration: item.effect.duration,
        trainBonus: item.effect.trainBonus * 100,
      });
    }

    // Ki regen bonus
    if (item.effect.kiRegen && item.effect.regenDuration) {
      this.stats.addEffect({
        source: 'food', type: 'ki_food', duration: item.effect.regenDuration,
        kiRegen: item.effect.kiRegen,
      });
    }

    // Sick chance
    if (item.effect.sickChance && Math.random() < item.effect.sickChance) {
      this.stats.addEffect({ type: 'sick', source: 'food', duration: 7200,
        stats: { strength: -0.2, speed: -0.2, endurance: -0.2 },
      });
      result.messages.push('You feel sick...');
    }

    // Poison chance (mushrooms)
    if (item.effect.poisonChance) {
      const safeThresh = item.wisdomSafeThreshold || 999;
      if (this.stats.wisdom < safeThresh && Math.random() < item.effect.poisonChance) {
        this.stats.addEffect({ type: 'poison', source: 'food', duration: 10,
          tickDamage: 3, tickRate: 1,
        });
        result.messages.push('Poisonous mushroom!');
      }
    }

    Audio.eat();
    return result;
  }

  getLabel() {
    if (this.hunger >= C.HUNGER.WELL_FED) return 'Well Fed';
    if (this.hunger >= C.HUNGER.NORMAL)   return 'Normal';
    if (this.hunger >= C.HUNGER.HUNGRY)   return 'Hungry';
    if (this.hunger >= C.HUNGER.STARVING) return 'Starving';
    return 'Critical';
  }

  getColor() {
    if (this.hunger >= C.HUNGER.WELL_FED) return '#2ecc71';
    if (this.hunger >= C.HUNGER.NORMAL)   return '#f4d03f';
    if (this.hunger >= C.HUNGER.HUNGRY)   return '#e67e22';
    if (this.hunger >= C.HUNGER.STARVING) return '#e74c3c';
    return '#8e1515';
  }

  canTrain() { return this.hunger >= C.HUNGER.STARVING; }
  canFight()  { return this.hunger >  0; }

  serialize()   { return { hunger: this.hunger }; }
  deserialize(d){ this.hunger = d.hunger; }
}
