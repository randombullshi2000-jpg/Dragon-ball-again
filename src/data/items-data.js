/**
 * Items & Equipment Database
 */

const ITEM_TYPE = {
  CONSUMABLE: 'consumable',
  EQUIPMENT:  'equipment',
  QUEST:      'quest',
  MATERIAL:   'material',
  KEY:        'key',
};

const EQUIPMENT_SLOT = {
  HEAD:    'head',
  BODY:    'body',
  HANDS:   'hands',
  FEET:    'feet',
  BACK:    'back',
  EXTRA:   'extra',
};

const ITEMS = {

  // ========================
  // CONSUMABLES - FOOD
  // ========================

  bread: {
    id: 'bread',
    name: 'Bread',
    type: ITEM_TYPE.CONSUMABLE,
    desc: 'Simple bread. Fills the stomach.',
    icon: '🍞',
    value: 10,
    effect: { hunger: 25 },
    spoilDays: 3,
    stackable: true,
    maxStack: 10,
  },

  rice: {
    id: 'rice',
    name: 'Cooked Rice',
    type: ITEM_TYPE.CONSUMABLE,
    desc: 'Filling staple food.',
    icon: '🍚',
    value: 15,
    effect: { hunger: 30 },
    spoilDays: 1,
    stackable: true,
    maxStack: 5,
  },

  meat: {
    id: 'meat',
    name: 'Cooked Meat',
    type: ITEM_TYPE.CONSUMABLE,
    desc: 'Hearty protein. Best cooked.',
    icon: '🍖',
    value: 50,
    effect: { hunger: 40, statBonus: { strength: 0.05 }, duration: 3600 },
    spoilDays: 1,
    stackable: true,
    maxStack: 5,
    requireCook: true,
    rawId: 'raw_meat',
  },

  raw_meat: {
    id: 'raw_meat',
    name: 'Raw Meat',
    type: ITEM_TYPE.CONSUMABLE,
    desc: 'Needs cooking. Eating raw risks illness.',
    icon: '🥩',
    value: 25,
    effect: { hunger: 20, sickChance: 0.40 },
    spoilDays: 2,
    stackable: true,
    maxStack: 10,
    cookResult: 'meat',
  },

  wild_berries: {
    id: 'wild_berries',
    name: 'Wild Berries',
    type: ITEM_TYPE.CONSUMABLE,
    desc: 'Fresh berries from the forest.',
    icon: '🫐',
    value: 5,
    effect: { hunger: 10, hpRegen: 0.1, regenDuration: 1800 },
    spoilDays: 2,
    stackable: true,
    maxStack: 20,
  },

  mushroom: {
    id: 'mushroom',
    name: 'Forest Mushroom',
    type: ITEM_TYPE.CONSUMABLE,
    desc: 'Could be safe. Could be poisonous.',
    icon: '🍄',
    value: 8,
    effect: { hunger: 15, poisonChance: 0.10 },  // 10% poison if wisdom < 10
    spoilDays: 2,
    stackable: true,
    maxStack: 10,
    wisdomSafeThreshold: 10,  // no poison risk if wisdom >= this
  },

  fish: {
    id: 'fish',
    name: 'Grilled Fish',
    type: ITEM_TYPE.CONSUMABLE,
    desc: 'Fresh caught and grilled.',
    icon: '🐟',
    value: 30,
    effect: { hunger: 35, statBonus: { endurance: 0.03 }, duration: 1800 },
    spoilDays: 1,
    stackable: true,
    maxStack: 5,
    requireCook: true,
    rawId: 'raw_fish',
  },

  raw_fish: {
    id: 'raw_fish',
    name: 'Raw Fish',
    type: ITEM_TYPE.CONSUMABLE,
    desc: 'Caught fresh. Cook before eating.',
    icon: '🐠',
    value: 15,
    effect: { hunger: 15, sickChance: 0.20 },
    spoilDays: 1,
    stackable: true,
    maxStack: 10,
    cookResult: 'fish',
  },

  rice_ball: {
    id: 'rice_ball',
    name: 'Rice Ball',
    type: ITEM_TYPE.CONSUMABLE,
    desc: 'Portable energy food.',
    icon: '🍙',
    value: 25,
    effect: { hunger: 40, statBonus: { speed: 0.05 }, duration: 7200 },
    spoilDays: 2,
    stackable: true,
    maxStack: 10,
  },

  hunter_feast: {
    id: 'hunter_feast',
    name: "Hunter's Feast",
    type: ITEM_TYPE.CONSUMABLE,
    desc: 'Meat + vegetables + herbs. Full meal bonus.',
    icon: '🍲',
    value: 200,
    effect: { hunger: 70, statBonus: { all: 0.15 }, duration: 7200 },
    spoilDays: 1,
    stackable: false,
    recipe: ['meat', 'vegetables', 'herbs'],
  },

  meditation_tea: {
    id: 'meditation_tea',
    name: 'Meditation Tea',
    type: ITEM_TYPE.CONSUMABLE,
    desc: 'Calms the mind. Enhances ki training.',
    icon: '🍵',
    value: 100,
    effect: { hunger: 10, kiRegen: 2.0, regenDuration: 3600 },
    stackable: true,
    maxStack: 5,
    recipe: ['special_leaves', 'mountain_water'],
  },

  potion: {
    id: 'potion',
    name: 'Healing Potion',
    type: ITEM_TYPE.CONSUMABLE,
    desc: 'Restores 50 HP.',
    icon: '🧴',
    value: 200,
    effect: { hp: 50 },
    stackable: true,
    maxStack: 5,
  },

  antidote: {
    id: 'antidote',
    name: 'Antidote',
    type: ITEM_TYPE.CONSUMABLE,
    desc: 'Cures poison.',
    icon: '💊',
    value: 150,
    effect: { curePoison: true },
    stackable: true,
    maxStack: 5,
  },

  senzu_bean: {
    id: 'senzu_bean',
    name: 'Senzu Bean',
    type: ITEM_TYPE.CONSUMABLE,
    desc: 'Legendary recovery. Full heal + all injuries removed. +100% gains for 4 hours.',
    icon: '🫘',
    value: 50000,
    effect: { hp: 9999, stamina: 9999, ki: 9999, removeInjuries: true, trainBonus: 1.0, duration: 14400 },
    stackable: true,
    maxStack: 3,
    rare: true,
  },

  medicine: {
    id: 'medicine',
    name: 'Medicine',
    type: ITEM_TYPE.CONSUMABLE,
    desc: 'Reduces injury recovery time by 50%.',
    icon: '💉',
    value: 200,
    effect: { injuryTimerReduce: 0.50 },
    stackable: true,
    maxStack: 5,
  },

  // ========================
  // EQUIPMENT
  // ========================

  gi_torn: {
    id: 'gi_torn',
    name: 'Torn Clothes',
    type: ITEM_TYPE.EQUIPMENT,
    slot: EQUIPMENT_SLOT.BODY,
    desc: 'Barely clothes. No protection.',
    icon: '👕',
    value: 0,
    stats: {},
    durability: 100,
    stageRequired: 0,
  },

  gi_blue_patched: {
    id: 'gi_blue_patched',
    name: 'Patched Blue Gi',
    type: ITEM_TYPE.EQUIPMENT,
    slot: EQUIPMENT_SLOT.BODY,
    desc: 'First proper martial arts outfit. Faded but functional.',
    icon: '🥋',
    value: 500,
    stats: { defense: 5 },
    durability: 100,
    stageRequired: 1,
  },

  gi_orange: {
    id: 'gi_orange',
    name: 'Orange Training Gi',
    type: ITEM_TYPE.EQUIPMENT,
    slot: EQUIPMENT_SLOT.BODY,
    desc: 'Clean orange gi for serious training.',
    icon: '🥋',
    value: 1000,
    stats: { defense: 8, allStats: 3 },
    durability: 100,
    stageRequired: 2,
  },

  gi_turtle_school: {
    id: 'gi_turtle_school',
    name: 'Turtle School Gi',
    type: ITEM_TYPE.EQUIPMENT,
    slot: EQUIPMENT_SLOT.BODY,
    desc: 'Official Turtle School uniform. A badge of honor.',
    icon: '🥋',
    value: 0,  // cannot be bought, only earned
    stats: { defense: 12, allStats: 5 },
    durability: 100,
    stageRequired: 3,
    special: 'Turtle School training gains +15%',
  },

  wrist_bands: {
    id: 'wrist_bands',
    name: 'Wrist Bands (10kg)',
    type: ITEM_TYPE.EQUIPMENT,
    slot: EQUIPMENT_SLOT.HANDS,
    desc: 'Heavy wrist bands. Slows you down, but strength training improves faster.',
    icon: '🏋️',
    value: 500,
    stats: { speed: -3 },
    trainBonus: { strength: 0.50 },
    removeCombatBonus: { speed: 10 },  // bonus when removed in combat
    durability: 200,
  },

  ankle_weights: {
    id: 'ankle_weights',
    name: 'Ankle Weights (15kg)',
    type: ITEM_TYPE.EQUIPMENT,
    slot: EQUIPMENT_SLOT.FEET,
    desc: 'Ironic but effective: ankle weights improve speed training.',
    icon: '🏋️',
    value: 500,
    stats: { speed: -5 },
    trainBonus: { speed: 0.50 },
    removeCombatBonus: { speed: 15 },
    durability: 200,
  },

  weighted_gi: {
    id: 'weighted_gi',
    name: 'Weighted Gi (30kg)',
    type: ITEM_TYPE.EQUIPMENT,
    slot: EQUIPMENT_SLOT.BODY,
    desc: 'Heavy weighted training gi.',
    icon: '🏋️',
    value: 2000,
    stats: { speed: -8 },
    trainBonus: { endurance: 0.50 },
    removeCombatBonus: { all: 5 },
    durability: 200,
  },

  turtle_shell: {
    id: 'turtle_shell',
    name: 'Roshi\'s Turtle Shell (40kg)',
    type: ITEM_TYPE.EQUIPMENT,
    slot: EQUIPMENT_SLOT.BACK,
    desc: 'Roshi\'s legendary training tool. Indestructible.',
    icon: '🐢',
    value: 0,
    stats: { speed: -10 },
    trainBonus: { all: 0.75 },
    removeCombatBonus: { all: 8, duration: 30 },
    durability: 9999,
    special: 'Unlocks milk delivery training',
  },

  headband: {
    id: 'headband',
    name: 'Headband',
    type: ITEM_TYPE.EQUIPMENT,
    slot: EQUIPMENT_SLOT.HEAD,
    desc: 'Keeps the hair back. Looks determined.',
    icon: '🎗️',
    value: 50,
    stats: {},
    durability: 200,
  },

  champion_headband: {
    id: 'champion_headband',
    name: 'Champion\'s Headband',
    type: ITEM_TYPE.EQUIPMENT,
    slot: EQUIPMENT_SLOT.HEAD,
    desc: 'Won in a tournament. +5% to all stats.',
    icon: '🏆',
    value: 5000,
    stats: { allStats: 5 },
    durability: 500,
  },

  // ========================
  // QUEST / KEY ITEMS
  // ========================

  martial_arts_magazine: {
    id: 'martial_arts_magazine',
    name: 'Martial Arts Magazine',
    type: ITEM_TYPE.QUEST,
    desc: 'Tattered but informative. Contains training tips and mention of legendary masters.',
    icon: '📰',
    value: 0,
    effect: { wisdomGain: 2 },
    unique: true,
  },

  tiger_fang: {
    id: 'tiger_fang',
    name: 'Mountain Tiger Fang',
    type: ITEM_TYPE.MATERIAL,
    desc: 'Proof of an impressive hunt.',
    icon: '🦷',
    value: 500,
    stackable: false,
  },

  stolen_goods: {
    id: 'stolen_goods',
    name: 'Stolen Goods (Return to owner)',
    type: ITEM_TYPE.QUEST,
    desc: 'Items stolen by the Bandit King. Find the owners.',
    icon: '📦',
    value: 1000,
    unique: false,
  },

  // ========================
  // MATERIALS
  // ========================

  fur: {
    id: 'fur',
    name: 'Wolf Fur',
    type: ITEM_TYPE.MATERIAL,
    desc: 'Can be sold or traded.',
    icon: '🐺',
    value: 50,
    stackable: true,
    maxStack: 10,
  },

  vegetables: {
    id: 'vegetables',
    name: 'Vegetables',
    type: ITEM_TYPE.CONSUMABLE,
    desc: 'Nutritious greens.',
    icon: '🥦',
    value: 20,
    effect: { hunger: 20, hpRegen: 0.05, duration: 1800 },
    spoilDays: 2,
    stackable: true,
    maxStack: 10,
  },

  herbs: {
    id: 'herbs',
    name: 'Medicinal Herbs',
    type: ITEM_TYPE.MATERIAL,
    desc: 'Useful for cooking and medicine.',
    icon: '🌿',
    value: 30,
    stackable: true,
    maxStack: 20,
  },

  special_leaves: {
    id: 'special_leaves',
    name: 'Special Leaves',
    type: ITEM_TYPE.MATERIAL,
    desc: 'Rare leaves for meditation tea.',
    icon: '🍃',
    value: 80,
    stackable: true,
    maxStack: 10,
  },

  mountain_water: {
    id: 'mountain_water',
    name: 'Mountain Spring Water',
    type: ITEM_TYPE.CONSUMABLE,
    desc: 'Pure water from a mountain spring.',
    icon: '💧',
    value: 5,
    effect: { hunger: 5 },
    stackable: true,
    maxStack: 20,
  },
};

// Shop inventories by location
const SHOP_INVENTORY = {
  village_general: ['bread', 'rice', 'vegetables', 'medicine', 'antidote'],
  city_market: ['rice_ball', 'fish', 'potion', 'medicine', 'antidote', 'headband'],
  martial_arts_shop: ['wrist_bands', 'ankle_weights', 'gi_blue_patched', 'gi_orange'],
  restaurant: ['rice', 'meat', 'fish', 'vegetables', 'hunter_feast'],
  coast_village: ['rice_ball', 'fish', 'raw_fish', 'potion', 'meditation_tea'],
};

// Forage tables by zone
const FORAGE_TABLES = {
  forest: [
    { item: 'wild_berries', chance: 0.60, amount: [2, 5] },
    { item: 'mushroom',     chance: 0.40, amount: [1, 3] },
    { item: 'herbs',        chance: 0.30, amount: [1, 2] },
    { item: 'special_leaves', chance: 0.10, amount: [1, 1] },
  ],
  mountain: [
    { item: 'herbs',          chance: 0.50, amount: [1, 3] },
    { item: 'mountain_water', chance: 0.80, amount: [3, 8] },
    { item: 'special_leaves', chance: 0.20, amount: [1, 2] },
    { item: 'wild_berries',   chance: 0.30, amount: [1, 3] },
  ],
  coast: [
    { item: 'raw_fish',      chance: 0.70, amount: [1, 3] },
    { item: 'mountain_water', chance: 0.60, amount: [3, 6] },
    { item: 'wild_berries',  chance: 0.20, amount: [1, 2] },
  ],
};
