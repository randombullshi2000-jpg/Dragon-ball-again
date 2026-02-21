/**
 * Story Data - Dialogue, Encounters, and Story Beats
 */

// Story flag keys
const FLAGS = {
  // Act 1
  MET_MERCHANT:        'met_merchant',
  DEFEATED_HUNTER:     'defeated_hunter',
  SURVIVED_WOLF_PACK:  'survived_wolf_pack',
  DECIDED_TO_JOURNEY:  'decided_journey',

  // Act 2
  FOUND_DOJO:          'found_dojo',
  MET_LAUNCH:          'met_launch',
  EXPOSED_CHARLATAN:   'exposed_charlatan',
  SAVED_CHILD:         'saved_child',
  WON_TOURNAMENT:      'won_tournament',
  HELPED_WARRIOR:      'helped_warrior',
  MET_YAMCHA:          'met_yamcha',
  HELPED_YAMCHA:       'helped_yamcha',
  ROSHI_OLD_MAN_TEST:  'roshi_old_man_test',  // did you help old man?
  ARRIVED_COAST:       'arrived_coast',

  // Act 3
  MILK_DELIVERY_DONE:  'milk_delivery_done',
  BANDIT_KING_DEFEATED:'bandit_king_defeated',
  YAMCHA_RIVAL:        'yamcha_rival',
  KI_UNLOCKED:         'ki_unlocked',
  KAMEHAMEHA_LEARNED:  'kamehameha_learned',

  // Act 4
  SHEN_DELIVERY_DONE:  'shen_delivery_done',
  ROSHI_FORMAL_STUDENT:'roshi_formal_student',
  TOURNAMENT_READY:    'tournament_ready',
};

// Dialogue entry format:
// { speaker, text, choices? }
// choices: [{ text, action, flag }]

const DIALOGUES = {

  // ========================
  // ACT 1: SURVIVAL
  // ========================

  intro: {
    speaker: 'Narrator',
    lines: [
      { text: 'In the mountains far from civilization, a boy lives alone.' },
      { text: 'His name is Kaze. For three years, he has survived by his own strength.' },
      { text: 'But survival alone... is that really living?' },
      { text: '...The last rabbit escaped again. Stomach growls.' },
      { text: '"I need to get stronger. Strong enough to never be helpless again."' },
    ],
  },

  meet_hunter: {
    speaker: 'Hunter (Bandit)',
    lines: [
      { text: 'Well, well. A little mountain rat with food.' },
      { text: 'Hand it over, kid. You can go hungry tonight.' },
    ],
    choices: [
      { text: 'Fight him!', outcome: 'fight', enemy: 'bandit_grunt' },
      { text: 'Run away', outcome: 'run', flag: null, penalty: 'lose_food' },
      { text: '"Take half. I haven\'t eaten either."', outcome: 'negotiate', honorGain: 5 },
    ],
  },

  hunter_defeated: {
    speaker: 'Hunter',
    lines: [
      { text: '*groans* Strong for a kid. Where\'d you learn to fight?' },
      { text: 'There\'s a Turtle Hermit... lives on an island. They say he can make anyone strong.' },
      { text: 'Kame House, they call it. Look for the ocean.' },
    ],
  },

  hunter_negotiated: {
    speaker: 'Hunter',
    lines: [
      { text: '...' },
      { text: 'Fine. Thanks, kid. Not many people would share in your position.' },
      { text: 'Listen - there\'s a master out on the coast. Kame House. Worth looking into.' },
    ],
  },

  meet_merchant: {
    speaker: 'Old Merchant',
    lines: [
      { text: 'Oh dear, oh dear! Cart\'s stuck in the mud!' },
    ],
    choices: [
      { text: 'Help push the cart', outcome: 'help', honorGain: 5 },
      { text: 'Keep walking', outcome: 'ignore' },
    ],
  },

  merchant_helped: {
    speaker: 'Old Merchant',
    lines: [
      { text: 'Thank you, young man! My old back couldn\'t take it.' },
      { text: 'You\'re from the mountains? You\'ve never heard of martial arts? Here, take this.' },
      { text: '*gives tattered martial arts magazine* It\'s about techniques, training, organized fighting.' },
      { text: '"The greatest martial arts master lives in a house shaped like a turtle shell. They call him the Turtle Hermit."' },
    ],
    items: [{ id: 'martial_arts_magazine', effect: { wisdomGain: 2 } }],
    flag: FLAGS.MET_MERCHANT,
  },

  wolf_pack_intro: {
    speaker: 'Narrator',
    lines: [
      { text: 'Night falls. Three wolves emerge from the treeline.' },
      { text: 'They\'re hungry too. But so are you.' },
      { text: 'Survive until dawn, or drive them away.' },
    ],
  },

  wolf_pack_victory: {
    speaker: 'Kaze',
    lines: [
      { text: '...Hah. Not this time.' },
      { text: 'I\'m getting stronger every day. But it\'s not enough.' },
      { text: 'There has to be someone out there who can teach me properly.' },
      { text: '"Turtle Hermit... I\'ll find you."' },
    ],
    flag: FLAGS.DECIDED_TO_JOURNEY,
  },

  // ========================
  // ACT 2: THE JOURNEY
  // ========================

  act2_start: {
    speaker: 'Narrator',
    lines: [
      { text: 'Weeks pass. The mountains shrink behind you.' },
      { text: 'Villages appear. People. Strange customs. Strange food.' },
      { text: 'But also... gyms. Schools. People who train with purpose.' },
    ],
  },

  meet_launch: {
    speaker: 'Launch (Blue)',
    lines: [
      { text: 'Excuse me! I\'m a bit lost. Have you seen any towns nearby?' },
    ],
    choices: [
      { text: '"Follow me, I\'ll show you."', outcome: 'help', honorGain: 3 },
      { text: '"Sorry, I\'m in a hurry."', outcome: 'refuse' },
    ],
  },

  launch_sneeze: {
    speaker: 'Narrator',
    lines: [
      { text: 'She freezes. Her hair turns blonde. Her expression... changes.' },
      { text: '*ACHOO*' },
      { text: '"Stay still! This money is mine now!"' },
      { text: '...That was not the same person.' },
    ],
  },

  launch_after: {
    speaker: 'Launch (Blue)',
    lines: [
      { text: 'Oh no... did I hurt you? I\'m so sorry, my other self...' },
      { text: 'I have... two personalities. When I sneeze, I change.' },
    ],
    choices: [
      { text: '"It\'s fine. Want some food?"', outcome: 'befriend', honorGain: 5 },
      { text: '"Keep your distance."', outcome: 'dismiss' },
    ],
  },

  meet_charlatan: {
    speaker: 'Fake Roshi',
    lines: [
      { text: 'You there! Seeking the legendary Master Roshi? You\'ve FOUND him!' },
      { text: 'For just 5000 Zeni, I will teach you the ultimate secret technique!' },
    ],
    choices: [
      { text: 'Pay 5000 Zeni', outcome: 'pay', cost: 5000 },
      { text: 'Investigate first', outcome: 'investigate', wisdomGain: 3 },
      { text: '"Something\'s off. Walk away."', outcome: 'leave' },
    ],
  },

  charlatan_exposed: {
    speaker: 'Villager',
    lines: [
      { text: 'That\'s not Master Roshi! He\'s a fraud! He\'s been scamming people for months!' },
      { text: 'The real Kame House is by the shore, south of here. Turtle symbol on the roof.' },
    ],
    flag: FLAGS.EXPOSED_CHARLATAN,
  },

  wounded_warrior: {
    speaker: 'Wounded Warrior',
    lines: [
      { text: '*coughs* The Bandit King... he broke two of my ribs...' },
      { text: 'I was PL 40. Didn\'t matter.' },
    ],
    choices: [
      { text: 'Help him (500 Zeni)', outcome: 'help', cost: 500, honorGain: 10 },
      { text: 'Leave him', outcome: 'leave' },
      { text: 'Rob him', outcome: 'rob', honorLoss: 20 },
    ],
  },

  warrior_healed: {
    speaker: 'Wounded Warrior',
    lines: [
      { text: 'You\'re kind, kid. Here - I want to teach you something.' },
      { text: '"Pressure Point Strike" - hit here, and the body seizes up for a second.' },
      { text: 'Also... be careful. The Bandit King is hunting strong fighters. He heard about you.' },
    ],
    flag: FLAGS.HELPED_WARRIOR,
  },

  meet_yamcha: {
    speaker: 'Yamcha',
    lines: [
      { text: 'Hah! You must be that "Mountain Kid" everyone\'s talking about.' },
      { text: 'I\'m heading to Kame House too. Race you to the coast?' },
    ],
    choices: [
      { text: '"You\'re on!"', outcome: 'race_accept' },
      { text: '"I\'m not interested in games."', outcome: 'race_decline' },
    ],
    flag: FLAGS.MET_YAMCHA,
  },

  yamcha_race_win: {
    speaker: 'Yamcha',
    lines: [
      { text: 'What?! You\'re faster than you look!' },
      { text: '...Not bad, Mountain Kid. I\'m Yamcha.' },
    ],
  },

  yamcha_race_lose: {
    speaker: 'Yamcha',
    lines: [
      { text: 'Ha! Better luck next time!' },
      { text: 'Name\'s Yamcha. Don\'t feel too bad - speed is my specialty.' },
    ],
  },

  help_yamcha_bandits: {
    speaker: 'Yamcha',
    lines: [
      { text: '*panting* Six on one... even I have limits.' },
    ],
    choices: [
      { text: 'Jump in and fight!', outcome: 'help', flag: FLAGS.HELPED_YAMCHA },
      { text: 'Watch to gauge his strength', outcome: 'watch' },
    ],
  },

  yamcha_after: {
    speaker: 'Yamcha',
    lines: [
      { text: 'Tch. I had them.' },
      { text: '...Thanks anyway. I owe you one.' },
      { text: 'Here - I\'ll teach you what I know about the Wolf Fang Fist.' },
      { text: 'You\'d need to be stronger to actually use it, but at least you\'ll know the concept.' },
    ],
    flag: FLAGS.HELPED_YAMCHA,
  },

  old_man_roshi: {
    speaker: 'Old Man',
    lines: [
      { text: 'Oh! Dropped my groceries! What a disaster for these old hands...' },
    ],
    choices: [
      { text: 'Help pick up groceries (no reward needed)', outcome: 'help_free', honorGain: 5, roshiRel: 10 },
      { text: 'Help, but ask for payment', outcome: 'help_pay', roshiRel: -5 },
      { text: 'Walk past', outcome: 'ignore', roshiRel: -15 },
    ],
    flag: FLAGS.ROSHI_OLD_MAN_TEST,
  },

  roshi_reveal: {
    speaker: 'Old Man (Roshi)',
    lines: [
      { text: '...' },
      { text: 'Hmhm. Helped without asking for anything.' },
      { text: 'You might be worth the trouble after all.' },
      { text: 'My name is Muten Roshi. You\'ve been looking for me, haven\'t you?' },
    ],
  },

  coast_tournament_intro: {
    speaker: 'Announcer',
    lines: [
      { text: 'Welcome to the Annual Coastal Strength Contest!' },
      { text: 'Five rounds! Last fighter standing wins 10,000 Zeni and a special prize!' },
    ],
  },

  // ========================
  // ACT 3: THE TEST
  // ========================

  roshi_meets_kaze: {
    speaker: 'Master Roshi',
    lines: [
      { text: 'So you want to train with me.' },
      { text: 'First - I need fresh milk from the village. 5 kilometers away.' },
      { text: 'Every morning. For one week.' },
      { text: 'Oh, and you\'ll be wearing this.' },
      { text: '*holds out turtle shell* 20 kilograms. It\'ll feel lighter by the end.' },
    ],
  },

  milk_delivery_start: {
    speaker: 'Master Roshi',
    lines: [
      { text: 'Wake up. It\'s 5 AM. Milk won\'t deliver itself.' },
      { text: 'The route has hills. And stairs. And Mrs. Takahashi\'s dog.' },
      { text: 'Don\'t spill a drop.' },
    ],
  },

  milk_delivery_complete: {
    speaker: 'Master Roshi',
    lines: [
      { text: 'Seven days. You didn\'t quit.' },
      { text: 'The shell gets heavier now. 40 kilograms.' },
      { text: 'Real training starts today.' },
    ],
    flag: FLAGS.MILK_DELIVERY_DONE,
  },

  roshi_question: {
    speaker: 'Master Roshi',
    lines: [
      { text: 'Before we go further... I want to ask you something.' },
      { text: 'Why do you seek strength?' },
    ],
    choices: [
      { text: '"To survive."', outcome: 'survival', roshiRel: 3 },
      { text: '"To protect others."', outcome: 'protect', roshiRel: 10 },
      { text: '"To be the strongest!"', outcome: 'strongest', roshiRel: 1 },
      { text: '"I don\'t know yet."', outcome: 'unknown', roshiRel: 7 },
    ],
  },

  roshi_answer_survival: {
    speaker: 'Master Roshi',
    lines: [
      { text: 'Survival. Hmm. That\'s honest.' },
      { text: 'But a life spent only surviving... is that truly living?' },
    ],
  },

  roshi_answer_protect: {
    speaker: 'Master Roshi',
    lines: [
      { text: '*smiles* A good answer.' },
      { text: 'That\'s the right spirit. Strength that protects something precious... that\'s worth cultivating.' },
    ],
  },

  roshi_answer_strongest: {
    speaker: 'Master Roshi',
    lines: [
      { text: 'Strength without purpose is just violence.' },
      { text: 'I hope you find your "why" before your strength outgrows you.' },
    ],
  },

  roshi_answer_unknown: {
    speaker: 'Master Roshi',
    lines: [
      { text: 'Honest, at least.' },
      { text: 'Then we\'ll find out together. That\'s what training is for.' },
    ],
  },

  ki_awakening: {
    speaker: 'Master Roshi',
    lines: [
      { text: 'Your body is ready. Now we work on something different.' },
      { text: 'Ki. Life energy. It exists inside you.' },
      { text: 'Close your eyes. Feel your heartbeat. Feel the warmth in your chest.' },
      { text: 'That warmth... that\'s the beginning.' },
    ],
    flag: FLAGS.KI_UNLOCKED,
  },

  kamehameha_intro: {
    speaker: 'Master Roshi',
    lines: [
      { text: 'The Kamehameha. My signature technique.' },
      { text: 'Fifty years to master. I\'ll give you as long as it takes.' },
      { text: 'But first: feel your ki. Not just sense it. Move it.' },
    ],
  },

  kamehameha_learned: {
    speaker: 'Master Roshi',
    lines: [
      { text: '...You actually did it.' },
      { text: 'Most students take years. You... you have a gift.' },
      { text: 'Don\'t let it go to your head.' },
    ],
    flag: FLAGS.KAMEHAMEHA_LEARNED,
  },

  bandit_king_appears: {
    speaker: 'Bandit King',
    lines: [
      { text: 'So you\'re the brat training with Turtle Hermit.' },
      { text: 'You beat my men. Made me look weak.' },
      { text: 'That ends today.' },
    ],
  },

  bandit_king_defeated: {
    speaker: 'Master Roshi',
    lines: [
      { text: 'Not bad.' },
      { text: 'You\'re becoming strong, kid.' },
    ],
    flag: FLAGS.BANDIT_KING_DEFEATED,
  },

  yamcha_arrives: {
    speaker: 'Yamcha',
    lines: [
      { text: 'Heard you were here. Thought I\'d drop by for some training.' },
      { text: 'Don\'t take it personally, but I need to know: are you strong enough to be worth training with?' },
    ],
  },

  yamcha_draw: {
    speaker: 'Yamcha',
    lines: [
      { text: 'A draw. Heh.' },
      { text: 'Alright. You\'ve earned my respect.' },
      { text: 'Old man - take both of us!' },
    ],
    flag: FLAGS.YAMCHA_RIVAL,
  },

  // ========================
  // ACT 4: THE PROVING
  // ========================

  roshi_errand: {
    speaker: 'Master Roshi',
    lines: [
      { text: 'I need you to deliver a package to Master Shen in the mountains.' },
      { text: 'Should take about three days.' },
      { text: 'Don\'t open it.' },
    ],
  },

  shen_meeting: {
    speaker: 'Master Shen',
    lines: [
      { text: 'Roshi\'s student. I expected... more.' },
      { text: 'Tell me, child. Would you like to truly become strong?' },
      { text: 'I could teach you things that old man never would. Faster. More direct.' },
    ],
    choices: [
      { text: '"I\'ll stay loyal to Master Roshi."', outcome: 'loyal', honorGain: 10 },
      { text: '"What would you teach me?"', outcome: 'listen', honorLoss: 5 },
    ],
  },

  shen_fight_intro: {
    speaker: 'Master Shen',
    lines: [
      { text: 'Roshi trained you well... if you can walk away from this.' },
      { text: 'Don\'t hold back. I won\'t.' },
    ],
  },

  shen_impressed: {
    speaker: 'Master Shen',
    lines: [
      { text: 'Hmm. You didn\'t last three minutes, but... you kept fighting.' },
      { text: 'That\'s something.' },
      { text: 'Tell Roshi his students should meet mine. Properly.' },
    ],
    flag: FLAGS.SHEN_DELIVERY_DONE,
  },

  roshi_reveal_package: {
    speaker: 'Master Roshi',
    lines: [
      { text: 'You want to know what was in the package?' },
      { text: '*opens it: training weights inside*' },
      { text: 'Nothing. Just the weights you\'ve been carrying for three days.' },
      { text: 'You carried 50 kilograms through monster forest without complaint.' },
      { text: 'You\'re ready.' },
    ],
    flag: FLAGS.ROSHI_FORMAL_STUDENT,
  },

  receive_turtle_gi: {
    speaker: 'Master Roshi',
    lines: [
      { text: 'From today, you wear this.' },
      { text: '*presents orange gi with turtle school symbol*' },
      { text: '"Turtle School" - you represent it now. Don\'t disgrace it.' },
      { text: 'And don\'t let me down at the tournament.' },
    ],
  },

  tournament_announcement: {
    speaker: 'Master Roshi',
    lines: [
      { text: 'In 30 days, the 21st World Martial Arts Tournament begins.' },
      { text: 'You and Yamcha will both enter.' },
      { text: 'Now. Use what time remains. Train.' },
    ],
    flag: FLAGS.TOURNAMENT_READY,
  },

  roshi_final_test: {
    speaker: 'Master Roshi',
    lines: [
      { text: 'Come then. Show me everything you\'ve learned.' },
      { text: '*removes disguise power*' },
      { text: 'I won\'t hold back this time.' },
    ],
  },

  roshi_final_result: {
    speaker: 'Master Roshi',
    lines: [
      { text: 'You\'re not the wild mountain boy anymore.' },
      { text: 'You\'re a martial artist.' },
      { text: 'Go get some rest. The tournament starts soon.' },
    ],
  },

  // ========================
  // GENERIC / SYSTEM
  // ========================

  training_complete: {
    speaker: 'Kaze',
    lines: [
      { text: '*wipes sweat* That\'s... one more step.' },
    ],
  },

  level_up: {
    speaker: 'Narrator',
    lines: [
      { text: 'Power Level increased!' },
    ],
  },

  injury_warning: {
    speaker: 'Kaze',
    lines: [
      { text: 'Ugh... I pushed too hard. Something\'s not right.' },
    ],
  },

  hunger_warning: {
    speaker: 'Kaze',
    lines: [
      { text: '...My stomach won\'t stop growling. Need to eat something.' },
    ],
  },

  hunger_critical: {
    speaker: 'Kaze',
    lines: [
      { text: 'Can\'t... can\'t keep going without food.' },
    ],
  },
};

// Story encounter trigger definitions
const STORY_ENCOUNTERS = [
  {
    id: 'hunter_bandit',
    act: C.ACT.SURVIVAL,
    trigger: { type: 'event', after: 'tutorial_complete' },
    dialogue: 'meet_hunter',
    required: true,
  },
  {
    id: 'old_merchant',
    act: C.ACT.SURVIVAL,
    trigger: { type: 'event', after: 'hunter_bandit' },
    dialogue: 'meet_merchant',
    required: true,
  },
  {
    id: 'wolf_pack_attack',
    act: C.ACT.SURVIVAL,
    trigger: { type: 'pl', value: 12 },
    dialogue: 'wolf_pack_intro',
    combat: { enemies: ['wolf', 'wolf', 'wolf'], winCondition: 'survive_10_turns' },
    required: true,
  },
  {
    id: 'launch_meeting',
    act: C.ACT.JOURNEY,
    trigger: { type: 'zone', zone: 2 },
    dialogue: 'meet_launch',
    required: false,
  },
  {
    id: 'charlatan',
    act: C.ACT.JOURNEY,
    trigger: { type: 'zone', zone: 3 },
    dialogue: 'meet_charlatan',
    required: false,
  },
  {
    id: 'wounded_warrior_encounter',
    act: C.ACT.JOURNEY,
    trigger: { type: 'zone', zone: 4 },
    dialogue: 'wounded_warrior',
    required: false,
  },
  {
    id: 'yamcha_first',
    act: C.ACT.JOURNEY,
    trigger: { type: 'zone', zone: 5 },
    dialogue: 'meet_yamcha',
    required: true,
  },
  {
    id: 'old_man_roshi',
    act: C.ACT.JOURNEY,
    trigger: { type: 'zone', zone: 5 },
    dialogue: 'old_man_roshi',
    required: true,
  },
  {
    id: 'roshi_formal',
    act: C.ACT.TEST,
    trigger: { type: 'event', after: 'arrived_coast' },
    dialogue: 'roshi_meets_kaze',
    required: true,
  },
  {
    id: 'milk_training',
    act: C.ACT.TEST,
    trigger: { type: 'event', after: 'roshi_formal' },
    training: 'milk_delivery',
    required: true,
  },
  {
    id: 'ki_awakening',
    act: C.ACT.TEST,
    trigger: { type: 'pl', value: 40 },
    dialogue: 'ki_awakening',
    required: true,
  },
  {
    id: 'bandit_king',
    act: C.ACT.TEST,
    trigger: { type: 'flag', flag: FLAGS.MILK_DELIVERY_DONE },
    dialogue: 'bandit_king_appears',
    combat: { enemies: ['bandit_king', 'bandit_tough', 'bandit_tough'] },
    required: true,
  },
  {
    id: 'roshi_errand',
    act: C.ACT.PROVING,
    trigger: { type: 'pl', value: 80 },
    dialogue: 'roshi_errand',
    required: true,
  },
  {
    id: 'shen_encounter',
    act: C.ACT.PROVING,
    trigger: { type: 'flag', flag: FLAGS.SHEN_DELIVERY_DONE },
    dialogue: 'shen_meeting',
    required: true,
  },
  {
    id: 'receive_gi',
    act: C.ACT.PROVING,
    trigger: { type: 'flag', flag: FLAGS.ROSHI_FORMAL_STUDENT },
    dialogue: 'receive_turtle_gi',
    required: true,
  },
];

// NPC data
const NPC_DATA = {
  roshi: {
    id: 'roshi',
    name: 'Master Roshi',
    sprite: 'ROSHI_IDLE',
    color: '#336699',
    baseRelationship: 0,
    maxRelationship: 100,
    unlocks: {
      20: 'teaches_fundamentals',
      40: 'teaches_advanced',
      60: 'father_figure',
      80: 'teaches_ultimate',
    },
  },
  yamcha: {
    id: 'yamcha',
    name: 'Yamcha',
    sprite: 'YAMCHA_IDLE',
    color: '#224466',
    baseRelationship: 0,
    maxRelationship: 100,
    unlocks: {
      20: 'train_together',
      40: 'share_techniques',
      60: 'best_friend',
      80: 'brother_in_arms',
    },
  },
  launch_blue: {
    id: 'launch_blue',
    name: 'Launch (Blue)',
    sprite: 'ROSHI_IDLE', // placeholder
    color: '#3399cc',
    baseRelationship: 0,
    maxRelationship: 100,
  },
};
