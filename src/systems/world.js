/**
 * World / Zone System
 * Manages zones, NPCs, and overworld state
 */

const ZONES = [
  {
    id: 0, name: 'Wild Mountain Cave', act: 0,
    type: 'wilderness',
    bg: 'mountain',
    npcs: [],
    enemies: ['wolf', 'wolf_pack'],
    forage: 'mountain',
    hasCampfire: true,
    trainingSites: ['rock_face', 'tree_grove'],
    next: [1],
    music: 'overworld',
    ambiance: 'wind',
  },
  {
    id: 1, name: 'Forest Path', act: 0,
    type: 'wilderness',
    bg: 'forest',
    npcs: ['old_merchant'],
    enemies: ['wolf', 'bandit_grunt'],
    forage: 'forest',
    hasCampfire: true,
    trainingSites: ['tree_grove', 'stream'],
    next: [2],
    music: 'overworld',
  },
  {
    id: 2, name: 'River Village', act: 1,
    type: 'village',
    bg: 'village',
    npcs: ['shopkeeper', 'dojo_master', 'villager_1'],
    enemies: ['bandit_grunt', 'bandit_tough'],
    forage: null,
    hasGym: true,
    hasShop: true,
    shopInventory: 'village_general',
    trainingSites: ['village_gym', 'river'],
    next: [3],
    music: 'overworld',
    encounters: ['meet_launch'],
  },
  {
    id: 3, name: 'Desert Crossing', act: 1,
    type: 'wilderness',
    bg: 'desert',
    npcs: ['yamcha'],
    enemies: ['bandit_tough', 'bandit_leader'],
    forage: null,
    hasCampfire: true,
    trainingSites: ['sand_dunes'],
    next: [4],
    music: 'overworld',
    encounters: ['yamcha_first', 'charlatan'],
    heatEffect: true,
  },
  {
    id: 4, name: 'Mountain Town', act: 1,
    type: 'village',
    bg: 'village',
    npcs: ['shopkeeper', 'tournament_organizer', 'wounded_warrior_npc'],
    enemies: [],
    forage: null,
    hasGym: true,
    hasShop: true,
    shopInventory: 'city_market',
    hasTournament: true,
    trainingSites: ['town_gym', 'mountain_trail'],
    next: [5],
    music: 'overworld',
    encounters: ['wounded_warrior_encounter'],
  },
  {
    id: 5, name: 'Coastal Village', act: 1,
    type: 'village',
    bg: 'coast',
    npcs: ['old_man_roshi_disguised', 'shopkeeper', 'fisherman'],
    enemies: [],
    forage: 'coast',
    hasGym: true,
    hasShop: true,
    shopInventory: 'coast_village',
    hasTournament: true,
    trainingSites: ['beach', 'pier'],
    next: [6],
    music: 'overworld',
    encounters: ['old_man_roshi', 'coast_tournament'],
  },
  {
    id: 6, name: 'Kame House Island', act: 2,
    type: 'special',
    bg: 'island',
    npcs: ['roshi', 'turtle'],
    enemies: [],
    forage: 'coast',
    trainingSites: ['kame_house_grounds', 'ocean', 'waterfall'],
    isRoshiBase: true,
    next: [7],
    music: 'training',
    encounters: ['roshi_formal', 'milk_training', 'ki_awakening', 'bandit_king'],
  },
  {
    id: 7, name: 'Mountain Forest (Delivery)', act: 3,
    type: 'wilderness',
    bg: 'mountain_forest',
    npcs: ['master_shen'],
    enemies: ['wild_boar', 'mountain_tiger'],
    forage: 'forest',
    hasCampfire: true,
    trainingSites: ['ancient_dojo_ruins'],
    next: [6],
    music: 'overworld',
    encounters: ['shen_encounter'],
    isDelivery: true,
  },
];

const ZONE_BY_ID = {};
for (const z of ZONES) ZONE_BY_ID[z.id] = z;

class WorldSystem {
  constructor() {
    this.currentZoneId = 0;
    this.visitedZones  = new Set([0]);
    this.cameraX       = 0;
    this.cameraY       = 0;
    this.zoneWidth     = 3840;   // pixels wide per zone
    this.zoneHeight    = 540;

    // Tile map (generated per zone)
    this._tileMap  = [];
    this._zoneData = null;

    // NPC entity instances for current zone
    this.npcs = [];

    this.generateZone(0);
  }

  get zone()     { return ZONE_BY_ID[this.currentZoneId]; }

  travelTo(zoneId) {
    if (!ZONE_BY_ID[zoneId]) return false;
    this.currentZoneId = zoneId;
    this.visitedZones.add(zoneId);
    this.cameraX = 0;
    this.generateZone(zoneId);
    return true;
  }

  generateZone(zoneId) {
    const zone = ZONE_BY_ID[zoneId];
    if (!zone) return;
    this._zoneData = zone;
    this._tileMap  = this._buildTileMap(zone);
    this._spawnNPCs(zone);
  }

  _spawnNPCs(zone) {
    this.npcs = [];
    const groundY = this.zoneHeight * 0.75 - 80;
    const npcIds  = zone.npcs || [];
    npcIds.forEach((npcId, i) => {
      const raw = (typeof NPC_DATA !== 'undefined' && NPC_DATA[npcId]) || {};
      const def = Object.assign({ id: npcId, name: npcId }, raw);
      const npc = new NPC(def, 400 + i * 300, groundY);
      this.npcs.push(npc);
    });
  }

  _buildTileMap(zone) {
    const cols = Math.ceil(this.zoneWidth  / C.TILE_PX);
    const rows = Math.ceil(this.zoneHeight / C.TILE_PX);
    const map  = [];

    const groundRow = Math.floor(rows * 0.75);  // ground at 75% height

    for (let r = 0; r < rows; r++) {
      map.push([]);
      for (let c = 0; c < cols; c++) {
        let tile = 0;  // 0=air
        if (r === groundRow) {
          tile = zone.bg === 'desert' ? 3 : 1;    // 1=grass, 3=sand
        } else if (r > groundRow) {
          tile = zone.bg === 'desert' ? 4 : 2;    // 2=dirt, 4=sand deep
        } else if (zone.bg === 'mountain' || zone.bg === 'mountain_forest') {
          // Scattered platforms
          if (r === groundRow - 3 && (c % 12 < 5)) tile = 5;  // 5=stone
          if (r === groundRow - 6 && (c % 15 < 4)) tile = 5;
        } else if (zone.bg === 'coast' || zone.bg === 'island') {
          if (r > groundRow && c > cols * 0.6) tile = 6;       // 6=water
        }
        map[r].push(tile);
      }
    }
    return map;
  }

  getTile(worldX, worldY) {
    const c = Math.floor(worldX / C.TILE_PX);
    const r = Math.floor(worldY / C.TILE_PX);
    if (r < 0 || r >= this._tileMap.length || c < 0 || c >= (this._tileMap[0]?.length || 0))
      return -1;
    return this._tileMap[r][c];
  }

  // Is position solid ground?
  isSolid(worldX, worldY) {
    const t = this.getTile(worldX, worldY);
    return t > 0 && t !== 6;  // 6=water = not solid
  }

  getGroundY(worldX) {
    // Scan downward from top
    for (let y = 0; y < this.zoneHeight; y += 4) {
      if (this.isSolid(worldX, y)) return y;
    }
    return this.zoneHeight - 48;
  }

  updateCamera(targetX, targetY, canvasW, canvasH) {
    const tx = targetX - canvasW * 0.4;
    const ty = targetY - canvasH * 0.6;
    this.cameraX = MathUtil.clamp(tx, 0, Math.max(0, this.zoneWidth - canvasW));
    this.cameraY = MathUtil.clamp(ty, 0, Math.max(0, this.zoneHeight - canvasH));
  }

  worldToScreen(wx, wy) {
    return { x: wx - this.cameraX, y: wy - this.cameraY };
  }

  screenToWorld(sx, sy) {
    return { x: sx + this.cameraX, y: sy + this.cameraY };
  }

  getTileColor(tile) {
    return ['transparent','#4a8c3f','#7d5a3c','#d4b96a','#c4a55a','#888888','#2980b9'][tile] || '#000';
  }

  // Draw the tile map onto canvas (called by OverworldState.render)
  draw(ctx, W, H) {
    if (!this._tileMap || !this._tileMap.length) return;
    const map    = this._tileMap;
    const tileW  = C.TILE_PX;
    const startC = Math.max(0, Math.floor(this.cameraX / tileW));
    const endC   = Math.min(map[0].length, Math.ceil((this.cameraX + W) / tileW) + 1);
    const startR = Math.max(0, Math.floor(this.cameraY / tileW));
    const endR   = Math.min(map.length, Math.ceil((this.cameraY + H) / tileW) + 1);

    for (let r = startR; r < endR; r++) {
      for (let c = startC; c < endC; c++) {
        const tile = map[r]?.[c];
        if (!tile) continue;
        const sx = c * tileW - this.cameraX;
        const sy = r * tileW - this.cameraY;
        const key = ['','TILE_GRASS','TILE_DIRT','TILE_STONE','TILE_DIRT','TILE_STONE','TILE_WATER'][tile];
        const sp  = key && SPRITES[key];
        if (sp) {
          drawTile(ctx, sp, sx, sy, 3);
        } else {
          ctx.fillStyle = this.getTileColor(tile);
          ctx.fillRect(sx, sy, tileW, tileW);
        }
      }
    }
  }

  serialize() {
    return { currentZoneId: this.currentZoneId, visitedZones: [...this.visitedZones] };
  }
  deserialize(d) {
    this.currentZoneId = d.currentZoneId;
    this.visitedZones  = new Set(d.visitedZones);
    this.generateZone(this.currentZoneId);
  }
}
