/**
 * NPC Entity (non-combat characters)
 */

class NPC {
  constructor(def, x, y) {
    this.id     = def.id;
    this.name   = def.name;
    this.sprite = def.sprite;
    this.color  = def.color || '#ffffff';
    this.x      = x;
    this.y      = y;
    this.w      = 32 * C.SPRITE_SCALE;
    this.h      = 32 * C.SPRITE_SCALE;

    // Schedule / AI
    this.schedule    = def.schedule || null;
    this.dialogue    = def.dialogue || null;
    this.shopId      = def.shopId   || null;

    // Walk path
    this.walkPath    = def.walkPath || null;
    this._pathIdx    = 0;
    this._walkTimer  = 0;

    // Animation
    this.animFrame   = 0;
    this.animTimer   = 0;
    this.facing      = 1;
    this._idleWiggle = Math.random() * Math.PI * 2;

    // Interaction bubble
    this.showPrompt  = false;
  }

  update(dt, playerX, playerY) {
    // Check if player is nearby
    const dist = MathUtil.dist(this.x, this.y, playerX, playerY);
    this.showPrompt = dist < 100;

    // Simple idle animation
    this.animTimer += dt;
    if (this.animTimer > 0.25) {
      this.animTimer  = 0;
      this.animFrame  = (this.animFrame + 1) % 4;
    }

    // Wander slightly
    this._idleWiggle += dt * 0.5;
  }

  draw(ctx) {
    const sp = SPRITES[this.sprite];
    if (sp) {
      drawSprite(ctx, sp, this.x - sp[0].length * C.SPRITE_SCALE / 2,
                 this.y - sp.length * C.SPRITE_SCALE, C.SPRITE_SCALE, this.facing < 0);
    } else {
      // Fallback colored rect
      ctx.fillStyle = this.color;
      ctx.fillRect(this.x - 16, this.y - 48, 32, 48);
    }

    // Name label
    ctx.font        = '11px monospace';
    ctx.fillStyle   = '#f0f0f0';
    ctx.textAlign   = 'center';
    ctx.textShadow  = '1px 1px 0 #000';
    ctx.fillText(this.name, this.x, this.y - 54);

    // Interaction prompt
    if (this.showPrompt) {
      const bw = 80, bh = 22;
      const bx = this.x - bw / 2, by = this.y - 76;
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.fillRect(bx, by, bw, bh);
      ctx.strokeStyle = '#f4d03f';
      ctx.lineWidth   = 1;
      ctx.strokeRect(bx, by, bw, bh);
      ctx.fillStyle   = '#f4d03f';
      ctx.font        = '10px monospace';
      ctx.fillText('👆 TALK', this.x, by + 14);
    }
  }

  interact() {
    // Returns dialogue key or shop id
    if (this.dialogue) return { type: 'dialogue', key: this.dialogue };
    if (this.shopId)   return { type: 'shop',     id: this.shopId };
    return null;
  }
}
