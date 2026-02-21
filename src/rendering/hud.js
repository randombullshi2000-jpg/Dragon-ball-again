/**
 * HUD – heads-up display drawn on canvas (mobile-friendly sizing)
 */

const HUD = {
  // Draw the full in-game HUD
  draw(ctx, player, stats, hunger, weather, story, combat = null) {
    const W = C.W, H = C.H;

    // ── Top-left: Player status ──
    this._drawPlayerStatus(ctx, player, stats, hunger, 12, 14);

    // ── Top-right: Time / Weather / Act ──
    this._drawInfo(ctx, weather, story, W - 12, 14);

    // ── Top-center: Combo (combat only) ──
    if (combat) {
      Effects.drawCombo(ctx, combat.comboCount, combat.getComboLabel(),
                        combat.getComboColor(), W / 2, 90);
    }

    // ── Bottom bar: PL + Zeni ──
    this._drawBottomBar(ctx, stats, W, H);
  },

  _drawPlayerStatus(ctx, player, stats, hunger, x, y) {
    const BAR_W = 160, BAR_H = 12, GAP = 18;
    let cy = y;

    // HP
    this._bar(ctx, x, cy, BAR_W, BAR_H, player.hp / player.maxHP,
              ColorUtil.statusColor(player.hp / player.maxHP), '#1a0000', '❤️ HP');
    cy += GAP;

    // Stamina
    this._bar(ctx, x, cy, BAR_W, BAR_H, player.stamina / player.maxStamina,
              '#3498db', '#00111a', '⚡ STA');
    cy += GAP;

    // Ki (if unlocked)
    if (player.maxKi > 0) {
      this._bar(ctx, x, cy, BAR_W, BAR_H, player.ki / player.maxKi,
                '#9b59b6', '#0d0014', '✨ KI');
      cy += GAP;
    }

    // Hunger
    this._bar(ctx, x, cy, BAR_W * 0.6, BAR_H * 0.7, hunger.hunger / C.STAT.HUNGER_MAX,
              hunger.getColor(), '#0a0a00', '🍚');
    cy += GAP * 0.8;

    // PL badge
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x, cy, 100, 20);
    ctx.fillStyle = '#f4d03f';
    ctx.font      = 'bold 13px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`PL: ${Math.floor(player.powerLevel)}`, x + 4, cy + 14);
    ctx.restore();
  },

  _bar(ctx, x, y, w, h, pct, color, bgColor, label) {
    const p = MathUtil.clamp(pct, 0, 1);
    ctx.save();

    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x, y, w + 28, h + 4);
    ctx.fillStyle = bgColor;
    ctx.fillRect(x + 24, y + 2, w, h);

    // Fill
    ctx.fillStyle = color;
    ctx.fillRect(x + 24, y + 2, w * p, h);

    // Highlight stripe
    ctx.fillStyle = ColorUtil.hexAlpha('#ffffff', 0.15);
    ctx.fillRect(x + 24, y + 2, w * p, h * 0.4);

    // Border
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth   = 1;
    ctx.strokeRect(x + 24, y + 2, w, h);

    // Label
    ctx.font      = '10px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText(label, x, y + h - 1);

    ctx.restore();
  },

  _drawInfo(ctx, weather, story, rightX, y) {
    ctx.save();
    ctx.textAlign   = 'right';
    ctx.font        = '11px monospace';
    ctx.fillStyle   = 'rgba(0,0,0,0.55)';
    ctx.fillRect(rightX - 130, y, 130, 50);

    ctx.fillStyle = '#f0f0f0';
    ctx.fillText(weather.getTimeLabel(),   rightX - 4, y + 14);
    ctx.fillStyle = '#aaaaaa';
    ctx.fillText(`${weather.getWeatherIcon()} Day ${weather.day}`, rightX - 4, y + 28);
    ctx.fillStyle = '#f4d03f';
    ctx.fillText(story.getActName(), rightX - 4, y + 42);
    ctx.restore();
  },

  _drawBottomBar(ctx, stats, W, H) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(W / 2 - 120, H - 30, 240, 26);
    ctx.font      = '11px monospace';
    ctx.fillStyle = '#f4d03f';
    ctx.textAlign = 'center';
    ctx.fillText(`💰 ${MathUtil.formatNum(stats.zeni)} Zeni  |  ${story.getActName()}`, W / 2, H - 13);
    ctx.restore();
  },

  // Mini-map (overworld)
  drawMinimap(ctx, world, playerX, W, H) {
    const MW = 80, MH = 20;
    const mx = W - MW - 8, my = H - MH - 36;

    ctx.save();
    ctx.fillStyle   = 'rgba(0,0,0,0.6)';
    ctx.fillRect(mx, my, MW, MH);
    ctx.strokeStyle = '#f4d03f';
    ctx.lineWidth   = 1;
    ctx.strokeRect(mx, my, MW, MH);

    // Player dot
    const px = MathUtil.map(playerX, 0, world.zoneWidth, mx, mx + MW);
    ctx.fillStyle = '#f4d03f';
    ctx.beginPath();
    ctx.arc(MathUtil.clamp(px, mx+2, mx+MW-2), my + MH / 2, 3, 0, Math.PI * 2);
    ctx.fill();

    // Zone name
    ctx.fillStyle   = '#aaa';
    ctx.font        = '9px monospace';
    ctx.textAlign   = 'right';
    ctx.fillText(world.zone?.name?.slice(0, 16) || '', mx + MW - 2, my - 2);
    ctx.restore();
  },

  // Training progress bar (full-width)
  drawTrainingProgress(ctx, progress, exerciseName, W, H) {
    const BW = W - 40, BH = 20;
    const bx = 20, by = H - 60;

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(bx - 4, by - 24, BW + 8, BH + 32);

    ctx.fillStyle = '#f4d03f';
    ctx.font      = 'bold 13px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(exerciseName, bx, by - 8);

    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(bx, by, BW, BH);
    ctx.fillStyle = '#f39c12';
    ctx.fillRect(bx, by, BW * progress, BH);

    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(bx, by, BW * progress, BH * 0.4);

    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth   = 1;
    ctx.strokeRect(bx, by, BW, BH);

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'right';
    ctx.font      = '11px monospace';
    ctx.fillText(`${Math.floor(progress * 100)}%`, bx + BW - 4, by + 14);
    ctx.restore();
  },

  // Combat guard meter
  drawGuardMeter(ctx, guardMeter, x = 12, y = 100) {
    if (guardMeter >= C.COMBAT.GUARD_METER) return;
    const w = 80;
    const p = guardMeter / C.COMBAT.GUARD_METER;
    ctx.save();
    ctx.fillStyle = '#1a0000';
    ctx.fillRect(x, y, w, 6);
    ctx.fillStyle = p > 0.5 ? '#ff9900' : '#ff3300';
    ctx.fillRect(x, y, w * p, 6);
    ctx.strokeStyle = '#666';
    ctx.lineWidth   = 1;
    ctx.strokeRect(x, y, w, 6);
    ctx.fillStyle   = '#fff';
    ctx.font        = '8px monospace';
    ctx.textAlign   = 'left';
    ctx.fillText('GUARD', x, y - 1);
    ctx.restore();
  },

  // Enemy HP bar (big – for boss)
  drawBossHP(ctx, enemy, W, H) {
    const BW = W * 0.6, BH = 14;
    const bx = (W - BW) / 2, by = H - 50;
    const p  = enemy.hp / enemy.maxHP;

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(bx - 4, by - 20, BW + 8, BH + 28);

    ctx.fillStyle = '#cc2222';
    ctx.font      = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(enemy.name.toUpperCase(), W / 2, by - 6);

    ctx.fillStyle = '#220000';
    ctx.fillRect(bx, by, BW, BH);
    ctx.fillStyle = ColorUtil.statusColor(p);
    ctx.fillRect(bx, by, BW * p, BH);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(bx, by, BW * p, BH * 0.4);
    ctx.strokeStyle = '#666';
    ctx.lineWidth   = 1;
    ctx.strokeRect(bx, by, BW, BH);

    ctx.fillStyle = '#fff';
    ctx.font      = '10px monospace';
    ctx.fillText(`${Math.floor(p * 100)}%`, W / 2, by + BH + 12);
    ctx.restore();
  },

  // Dialogue box
  drawDialogueBox(ctx, speaker, text, choices, W, H) {
    const BH  = choices?.length ? 160 : 100;
    const by  = H - BH - 8;
    const bw  = W - 20;
    const bx  = 10;

    ctx.save();
    ctx.fillStyle = 'rgba(8,8,20,0.92)';
    ctx.fillRect(bx, by, bw, BH);
    ctx.strokeStyle = '#f4d03f';
    ctx.lineWidth   = 2;
    ctx.strokeRect(bx, by, bw, BH);

    // Speaker name tab
    if (speaker) {
      const tw  = ctx.measureText(speaker).width + 16;
      ctx.fillStyle   = '#f4d03f';
      ctx.fillRect(bx + 10, by - 18, tw, 18);
      ctx.fillStyle   = '#0a0a1e';
      ctx.font        = 'bold 12px monospace';
      ctx.textAlign   = 'left';
      ctx.fillText(speaker, bx + 18, by - 4);
    }

    // Main text (word-wrapped)
    ctx.fillStyle = '#f0f0f0';
    ctx.font      = '13px monospace';
    ctx.textAlign = 'left';
    this._wrapText(ctx, text, bx + 14, by + 22, bw - 28, 20);

    // Choices
    if (choices?.length) {
      const startY = by + 70;
      for (let i = 0; i < choices.length; i++) {
        const chy = startY + i * 24;
        ctx.fillStyle = i === 0 ? 'rgba(244,208,63,0.15)' : 'rgba(255,255,255,0.05)';
        ctx.fillRect(bx + 10, chy - 14, bw - 20, 20);
        ctx.fillStyle = i === 0 ? '#f4d03f' : '#cccccc';
        ctx.font      = '12px monospace';
        ctx.fillText(`${i + 1}. ${choices[i].text}`, bx + 18, chy);
      }
      ctx.fillStyle = '#888';
      ctx.font      = '10px monospace';
      ctx.fillText('Tap to choose', bx + bw - 100, by + BH - 6);
    } else {
      // Continue prompt
      ctx.fillStyle = '#f4d03f';
      ctx.font      = '10px monospace';
      ctx.textAlign = 'right';
      const pulse = Math.abs(Math.sin(Date.now() * 0.003));
      ctx.globalAlpha = 0.5 + pulse * 0.5;
      ctx.fillText('▶ TAP TO CONTINUE', bx + bw - 10, by + BH - 8);
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  },

  _wrapText(ctx, text, x, y, maxW, lineH) {
    const words   = text.split(' ');
    let line      = '';
    let lineCount = 0;
    const maxLines = 3;
    for (const word of words) {
      const test  = line ? line + ' ' + word : word;
      const { width } = ctx.measureText(test);
      if (width > maxW && line) {
        if (lineCount < maxLines) ctx.fillText(line, x, y + lineCount * lineH);
        line = word;
        lineCount++;
      } else {
        line = test;
      }
    }
    if (line && lineCount < maxLines) ctx.fillText(line, x, y + lineCount * lineH);
  },

  // Training result overlay
  drawTrainingResult(ctx, result, W, H) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.80)';
    ctx.fillRect(W / 2 - 180, H / 2 - 100, 360, 200);
    ctx.strokeStyle = '#f4d03f';
    ctx.lineWidth   = 2;
    ctx.strokeRect(W / 2 - 180, H / 2 - 100, 360, 200);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#f4d03f';
    ctx.font      = 'bold 18px monospace';
    ctx.fillText(result.name, W / 2, H / 2 - 74);

    let dy = H / 2 - 50;
    ctx.font      = '12px monospace';
    for (const [stat, gain] of Object.entries(result.gains)) {
      if (gain > 0) {
        ctx.fillStyle = { strength:'#ff6b35',speed:'#4db8ff',endurance:'#2ecc71',
                          technique:'#f4d03f',kiControl:'#9b59b6' }[stat] || '#fff';
        ctx.fillText(`+${gain.toFixed(3)} ${stat.toUpperCase()}`, W / 2, dy);
        dy += 18;
      }
    }

    if (result.injured) {
      ctx.fillStyle = '#e74c3c';
      ctx.fillText(`⚠️ INJURED: ${result.injuryType}`, W / 2, dy);
      dy += 18;
    }

    for (const msg of (result.messages || [])) {
      ctx.fillStyle = '#88ffaa';
      ctx.fillText(msg, W / 2, dy);
      dy += 18;
    }

    ctx.fillStyle = '#888';
    ctx.font      = '11px monospace';
    ctx.fillText('Tap to continue', W / 2, H / 2 + 84);
    ctx.restore();
  },
};
