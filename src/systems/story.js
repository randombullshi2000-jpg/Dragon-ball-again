/**
 * Story / Progression System
 * Manages flags, acts, and encounter triggers
 */

class StorySystem {
  constructor(stats) {
    this.stats        = stats;
    this.act          = C.ACT.SURVIVAL;
    this.flags        = new Set();
    this.relationships = {};   // npcId → 0-100
    this._doneEncounters = new Set();
    this.pendingDialogue = null;    // dialogue key to trigger
    this.pendingCombat   = null;    // combat data to trigger

    // Init NPC relationships
    for (const [id, npc] of Object.entries(NPC_DATA)) {
      this.relationships[id] = npc.baseRelationship;
    }
  }

  setFlag(flag) {
    this.flags.add(flag);
    this._checkActProgress();
  }

  hasFlag(flag) { return this.flags.has(flag); }

  _checkActProgress() {
    const pl = this.stats.powerLevel;
    if      (this.act < C.ACT.PROVING  && pl >= C.ACT_PL[2] && this.hasFlag(FLAGS.SHEN_DELIVERY_DONE)) {
      this.act = C.ACT.PROVING;
    } else if (this.act < C.ACT.TEST    && pl >= C.ACT_PL[1] && this.hasFlag(FLAGS.ARRIVED_COAST)) {
      this.act = C.ACT.TEST;
    } else if (this.act < C.ACT.JOURNEY && pl >= C.ACT_PL[0] && this.hasFlag(FLAGS.DECIDED_TO_JOURNEY)) {
      this.act = C.ACT.JOURNEY;
    }
  }

  // Check encounters for a zone entry
  checkZoneEncounters(zoneId) {
    const triggered = [];
    for (const enc of STORY_ENCOUNTERS) {
      if (this._doneEncounters.has(enc.id)) continue;
      if (enc.act > this.act) continue;
      if (enc.trigger.type === 'zone' && enc.trigger.zone === zoneId) {
        triggered.push(enc);
      }
    }
    return triggered;
  }

  // Check PL-triggered encounters
  checkPLEncounters() {
    const pl = this.stats.powerLevel;
    const triggered = [];
    for (const enc of STORY_ENCOUNTERS) {
      if (this._doneEncounters.has(enc.id)) continue;
      if (enc.act > this.act) continue;
      if (enc.trigger.type === 'pl' && pl >= enc.trigger.value) {
        triggered.push(enc);
      }
    }
    return triggered;
  }

  // Check flag-triggered encounters
  checkFlagEncounters() {
    const triggered = [];
    for (const enc of STORY_ENCOUNTERS) {
      if (this._doneEncounters.has(enc.id)) continue;
      if (enc.act > this.act) continue;
      if (enc.trigger.type === 'flag' && this.hasFlag(enc.trigger.flag)) {
        triggered.push(enc);
      }
    }
    return triggered;
  }

  markDone(encounterId) {
    this._doneEncounters.add(encounterId);
  }

  // Relationship management
  changeRelationship(npcId, delta) {
    const current = this.relationships[npcId] || 0;
    this.relationships[npcId] = MathUtil.clamp(current + delta, 0, 100);
  }

  getRelationship(npcId) {
    return this.relationships[npcId] || 0;
  }

  getRelationshipLabel(npcId) {
    const v = this.getRelationship(npcId);
    if (v >= 80) return 'Deeply Trusted';
    if (v >= 60) return 'Good Friend';
    if (v >= 40) return 'Friendly';
    if (v >= 20) return 'Acquainted';
    return 'Stranger';
  }

  // Honor mutations
  changeHonor(delta) {
    this.stats.honor = MathUtil.clamp(this.stats.honor + delta, 0, 100);
  }

  changeDetermination(delta) {
    this.stats.determination = MathUtil.clamp(this.stats.determination + delta, 0, 50);
  }

  changeWisdom(delta) {
    this.stats.wisdom = MathUtil.clamp(this.stats.wisdom + delta, 0, 50);
  }

  getActName() {
    return ['Act 1: Survival', 'Act 2: The Journey', 'Act 3: The Test', 'Act 4: The Proving'][this.act];
  }

  // Roshi relationship level text
  getRoshiStatus() {
    const rel = this.getRelationship('roshi');
    if (rel < 20) return 'Skeptical';
    if (rel < 40) return 'Warming Up';
    if (rel < 60) return 'Trusting';
    if (rel < 80) return 'Father Figure';
    return 'Master & Student';
  }

  serialize() {
    return {
      act: this.act,
      flags: [...this.flags],
      relationships: this.relationships,
      doneEncounters: [...this._doneEncounters],
    };
  }

  deserialize(d) {
    this.act           = d.act;
    this.flags         = new Set(d.flags || []);
    this.relationships = d.relationships || {};
    this._doneEncounters = new Set(d.doneEncounters || []);
  }
}
