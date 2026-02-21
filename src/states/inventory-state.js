/**
 * Inventory / Shop State
 */

class InventoryState {
  constructor(game) {
    this.game      = game;
    this.name      = C.STATE.INVENTORY;
    this._shopMode = false;
    this._shopId   = null;
    this._tab      = 'items';   // items | equipment | key
    this._cursorIdx = 0;
    this._inputCooldown = 0;
    this._confirmPending = false;  // waiting for confirm on use/buy
    this._message = '';
    this._messageTimer = 0;
  }

  setup(opts) {
    this._shopMode  = !!(opts && opts.shopMode);
    this._shopId    = (opts && opts.shopId) || null;
    this._tab       = 'items';
    this._cursorIdx = 0;
    this._confirmPending = false;
    this._message   = '';
  }

  enter() {
    Input.showControls();
  }

  exit() {}

  update(dt) {
    this._inputCooldown = Math.max(0, this._inputCooldown - dt);
    if (this._messageTimer > 0) {
      this._messageTimer -= dt;
      if (this._messageTimer <= 0) this._message = '';
    }

    if (this._inputCooldown > 0) return;

    const list = this._getList();

    // Nav
    if (Input.pressed('ArrowUp') || Input.axis.y < -0.5) {
      this._cursorIdx = Math.max(0, this._cursorIdx - 1);
      this._inputCooldown = 0.15;
      Audio.menuSelect();
    }
    if (Input.pressed('ArrowDown') || Input.axis.y > 0.5) {
      this._cursorIdx = Math.min(Math.max(list.length - 1, 0), this._cursorIdx + 1);
      this._inputCooldown = 0.15;
      Audio.menuSelect();
    }

    // Tab switch with L/R
    if (Input.pressed(C.KEY.L) || Input.pressed('ArrowLeft') || Input.axis.x < -0.5) {
      this._switchTab(-1);
      this._inputCooldown = 0.20;
    }
    if (Input.pressed(C.KEY.R) || Input.pressed('ArrowRight') || Input.axis.x > 0.5) {
      this._switchTab(1);
      this._inputCooldown = 0.20;
    }

    // Use / Buy
    if (Input.pressed(C.KEY.A) || Input.pressed('Enter')) {
      const item = list[this._cursorIdx];
      if (item) this._useItem(item);
    }

    // Drop / Sell
    if (Input.pressed(C.KEY.X)) {
      const item = list[this._cursorIdx];
      if (item) this._dropItem(item);
    }

    // Back
    if (Input.pressed(C.KEY.B) || Input.pressed('Escape')) {
      Audio.menuBack && Audio.menuBack();
      this.game.popState();
    }
  }

  _switchTab(dir) {
    const tabs = ['items', 'equipment', 'key'];
    const idx  = tabs.indexOf(this._tab);
    this._tab  = tabs[MathUtil.clamp(idx + dir, 0, tabs.length - 1)];
    this._cursorIdx = 0;
    Audio.menuSelect();
  }

  _getList() {
    if (this._shopMode && this._shopId) {
      const shopItems = SHOP_INVENTORY[this._shopId] || [];
      return shopItems.map(id => ({ id, ...(ITEMS[id] || { name: id }) }));
    }

    const inv = this.game.inventory || {};
    const all = Object.values(inv);

    if (this._tab === 'items') {
      return all.filter(i => {
        const def = ITEMS[i.id];
        return !def || def.type === ITEM_TYPE.CONSUMABLE || def.type === ITEM_TYPE.MATERIAL;
      });
    } else if (this._tab === 'equipment') {
      return all.filter(i => {
        const def = ITEMS[i.id];
        return def && def.type === ITEM_TYPE.EQUIPMENT;
      });
    } else {
      return all.filter(i => {
        const def = ITEMS[i.id];
        return def && (def.type === ITEM_TYPE.QUEST || def.type === ITEM_TYPE.KEY);
      });
    }
  }

  _useItem(item) {
    const def = ITEMS[item.id];
    if (!def) return;

    if (this._shopMode) {
      // Buy
      const cost = def.value || 0;
      if ((this.game.stats.zeni || 0) < cost) {
        this._showMessage("Not enough ZENI!");
        return;
      }
      this.game.stats.zeni -= cost;
      this.game.addItem(item.id, 1);
      this._showMessage(`Bought ${def.name}!`);
      Audio.menuConfirm();
    } else {
      // Use consumable
      if (def.type === ITEM_TYPE.CONSUMABLE) {
        const used = this.game.hunger.eat(item.id, this.game.player);
        if (used) {
          this.game.removeItem(item.id, 1);
          this._showMessage(`Used ${def.name}.`);
          Audio.eat && Audio.eat();
        }
      } else if (def.type === ITEM_TYPE.EQUIPMENT) {
        this.game.player.equip(item.id);
        this._showMessage(`Equipped ${def.name}.`);
        Audio.menuConfirm();
      } else {
        this._showMessage(`${def.name}: ${def.desc}`);
      }
    }
  }

  _dropItem(item) {
    if (this._shopMode) {
      // Sell
      const def  = ITEMS[item.id];
      const sell = Math.floor((def ? def.value : 0) * 0.5);
      this.game.removeItem(item.id, 1);
      this.game.stats.zeni = (this.game.stats.zeni || 0) + sell;
      this._showMessage(`Sold for ${sell} ZENI.`);
      Audio.menuConfirm();
    } else {
      this.game.removeItem(item.id, 1);
      this._showMessage('Discarded.');
      Audio.menuBack && Audio.menuBack();
    }
  }

  _showMessage(msg) {
    this._message      = msg;
    this._messageTimer = 2.5;
  }

  render(ctx, W, H, dt) {
    ctx.fillStyle = 'rgba(0,0,0,0.92)';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#f4d03f';
    ctx.lineWidth   = 2;
    ctx.strokeRect(20, 20, W - 40, H - 40);

    // Title
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f4d03f';
    ctx.font = 'bold 16px monospace';
    const title = this._shopMode ? `SHOP · ${this._shopId || ''}` : 'INVENTORY';
    ctx.fillText(title, W / 2, 44);

    // Zeni
    ctx.textAlign = 'right';
    ctx.fillStyle = '#f4d03f';
    ctx.font = '12px monospace';
    ctx.fillText(`💰 ${this.game.stats.zeni || 0} ZENI`, W - 30, 44);

    // Tabs (only in inventory mode)
    if (!this._shopMode) {
      const tabs   = ['ITEMS', 'EQUIP', 'KEY'];
      const tabW   = 100;
      const tabX   = W / 2 - (tabs.length * tabW) / 2;
      tabs.forEach((t, i) => {
        const active = (i === 0 && this._tab === 'items') ||
                       (i === 1 && this._tab === 'equipment') ||
                       (i === 2 && this._tab === 'key');
        ctx.fillStyle = active ? '#f4d03f' : '#444';
        ctx.fillRect(tabX + i * tabW, 54, tabW - 4, 20);
        ctx.fillStyle = active ? '#000' : '#888';
        ctx.font = '11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(t, tabX + i * tabW + tabW / 2 - 2, 67);
      });
    }

    // Item list
    const list    = this._getList();
    const startY  = this._shopMode ? 62 : 85;
    const rowH    = 28;
    const visRows = Math.floor((H - startY - 80) / rowH);
    const startIdx = Math.max(0, this._cursorIdx - Math.floor(visRows / 2));

    ctx.textAlign = 'left';
    for (let i = startIdx; i < Math.min(list.length, startIdx + visRows); i++) {
      const item = list[i];
      const def  = ITEMS[item.id] || item;
      const y    = startY + (i - startIdx) * rowH + rowH;
      const sel  = i === this._cursorIdx;

      if (sel) {
        ctx.fillStyle = 'rgba(244,208,63,0.15)';
        ctx.fillRect(25, y - rowH + 6, W - 50, rowH - 2);
        ctx.strokeStyle = '#f4d03f';
        ctx.lineWidth   = 1;
        ctx.strokeRect(25, y - rowH + 6, W - 50, rowH - 2);
      }

      // Icon + name
      ctx.fillStyle = sel ? '#f4d03f' : '#cccccc';
      ctx.font = sel ? 'bold 12px monospace' : '12px monospace';
      const icon = def.icon || '?';
      ctx.fillText(`${icon} ${def.name || item.id}`, 36, y);

      // Count
      const qty = item.qty || 1;
      ctx.textAlign = 'right';
      ctx.fillStyle = '#888';
      ctx.font = '11px monospace';
      if (qty > 1) ctx.fillText(`x${qty}`, W - 36, y);

      // Value
      const val = this._shopMode ? `${def.value || 0}💰` : '';
      if (val) {
        ctx.textAlign = 'right';
        ctx.fillStyle = '#f4d03f';
        ctx.fillText(val, W - 80, y);
      }
      ctx.textAlign = 'left';
    }

    if (list.length === 0) {
      ctx.fillStyle = '#444';
      ctx.font = '13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Nothing here.', W / 2, H / 2);
    }

    // Selected item detail
    const selItem = list[this._cursorIdx];
    if (selItem) {
      const def = ITEMS[selItem.id] || selItem;
      const dy  = H - 80;
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(25, dy, W - 50, 55);
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      ctx.strokeRect(25, dy, W - 50, 55);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#f4d03f';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(def.name || selItem.id, 35, dy + 16);
      ctx.fillStyle = '#aaa';
      ctx.font = '10px monospace';
      ctx.fillText(def.desc || '', 35, dy + 30);
      if (def.effect) {
        const effStr = Object.entries(def.effect).map(([k, v]) => `${k}:${v}`).join(' ');
        ctx.fillStyle = '#88ffcc';
        ctx.fillText(effStr.slice(0, 60), 35, dy + 44);
      }
    }

    // Action hints
    ctx.textAlign = 'center';
    ctx.fillStyle = '#555';
    ctx.font = '10px monospace';
    const hint = this._shopMode
      ? 'A=Buy  X=Sell  B=Close'
      : 'A=Use  X=Drop  B=Close  L/R=Tab';
    ctx.fillText(hint, W / 2, H - 26);

    // Message toast
    if (this._message) {
      ctx.fillStyle = 'rgba(0,0,0,0.85)';
      ctx.fillRect(W / 2 - 140, H / 2 - 20, 280, 36);
      ctx.strokeStyle = '#f4d03f';
      ctx.lineWidth = 1;
      ctx.strokeRect(W / 2 - 140, H / 2 - 20, 280, 36);
      ctx.fillStyle = '#f4d03f';
      ctx.font = '13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(this._message, W / 2, H / 2 + 3);
    }
  }
}
