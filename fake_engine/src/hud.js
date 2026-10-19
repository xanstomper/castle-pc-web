// hud.js — Authentic Castle Crashers HUD & Combat Text Renderer
// Renders the iconic gold-leaf P1 crest, dynamic HP/Mana/XP bars, coin counter,
// combo hit announcer, boss health bar, and floating combat damage numbers.

export class Hud {
  constructor() {
    this.damageNumbers = [];
    this.announcements = [];
    this.missionText = '';
    this.missionTimer = 0;
  }

  addDamageNumber(x, y, amount, isCrit = false, color = '#fbbf24') {
    this.damageNumbers.push({
      x: x + (Math.random() - 0.5) * 20,
      y: y - 20,
      amount: typeof amount === 'number' ? Math.round(amount) : amount,
      isCrit: !!isCrit,
      color: color,
      vy: -4.5,
      scale: isCrit ? 1.4 : 1.0,
      life: 1.0,
      decay: 0.025
    });
  }

  setMission(text, durationFrames = 180) {
    this.missionText = text;
    this.missionTimer = durationFrames;
  }

  update() {
    // Update floating damage numbers
    for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
      const n = this.damageNumbers[i];
      n.y += n.vy;
      n.vy += 0.15;
      n.life -= n.decay;
      if (n.life <= 0) {
        this.damageNumbers.splice(i, 1);
      }
    }

    if (this.missionTimer > 0) {
      this.missionTimer--;
    }
  }

  draw(ctx, player, currentStageName, boss = null) {
    ctx.save();

    // 1. P1 Gold Crest Banner (Top Left)
    this.drawPlayerBanner(ctx, player);

    // 2. Stage & Mission Banner (Top Center)
    this.drawStageHeader(ctx, currentStageName);

    // 3. Combo Hit Counter
    this.drawComboCounter(ctx, player);

    // 4. Boss Health Bar (if active)
    if (boss && !boss.isDead) {
      this.drawBossHealthBar(ctx, boss);
    }

    // 5. Floating Damage Numbers
    this.drawDamageNumbers(ctx);

    ctx.restore();
  }

  drawPlayerBanner(ctx, p) {
    const k = p.knight;
    const hudX = 24;
    const hudY = 22;

    // Outer Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.beginPath();
    ctx.roundRect(hudX - 2, hudY - 2, 340, 72, 12);
    ctx.fill();

    // Inner Dark Slate Body
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(hudX, hudY, 336, 68, 10);
    ctx.fill();

    // Gold Leaf Border
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Circular Knight Portrait Badge
    const portraitX = hudX + 38;
    const portraitY = hudY + 34;

    ctx.fillStyle = k.darkColor;
    ctx.beginPath();
    ctx.arc(portraitX, portraitY, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 3.5;
    ctx.stroke();

    // Cross Visor Icon
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(portraitX - 4, portraitY - 14, 8, 28);
    ctx.fillRect(portraitX - 14, portraitY - 4, 28, 8);

    // Knight Name & Level
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 13px system-ui, -apple-system, sans-serif';
    ctx.letterSpacing = '1px';
    ctx.fillText(`${k.name} · LV ${p.level}`, hudX + 74, hudY + 20);

    // HP Bar
    const barX = hudX + 74;
    const barY = hudY + 27;
    const barW = 160;
    const barH = 13;

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(barX, barY, barW, barH);
    const hpRatio = Math.max(0, p.hp / p.maxHp);
    ctx.fillStyle = hpRatio > 0.4 ? '#22c55e' : (hpRatio > 0.2 ? '#f59e0b' : '#ef4444');
    ctx.fillRect(barX, barY, barW * hpRatio, barH);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(barX, barY, barW, barH);

    // Magic Mana Bar
    const magicY = barY + 16;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(barX, magicY, barW, 8);
    const manaRatio = Math.max(0, p.mana / p.maxMana);
    ctx.fillStyle = k.lightColor;
    ctx.fillRect(barX, magicY, barW * manaRatio, 8);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(barX, magicY, barW, 8);

    // XP Mini-Bar (Thin gold line under magic)
    const xpY = magicY + 10;
    const xpRatio = Math.min(1, p.xp / 100);
    ctx.fillStyle = '#475569';
    ctx.fillRect(barX, xpY, barW, 3);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(barX, xpY, barW * xpRatio, 3);

    // Gold Coins Counter
    ctx.fillStyle = '#facc15';
    ctx.font = '900 16px system-ui, -apple-system, sans-serif';
    ctx.fillText(`🪙 ${p.coins}`, hudX + 248, hudY + 44);
  }

  drawStageHeader(ctx, stageName) {
    if (this.missionTimer > 0 && this.missionText) {
      ctx.save();
      ctx.textAlign = 'center';
      const alpha = Math.min(1, this.missionTimer / 30);
      ctx.globalAlpha = alpha;

      // Dark Banner Pill
      ctx.fillStyle = 'rgba(10, 15, 26, 0.9)';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(1280 / 2 - 220, 24, 440, 36, 18);
      ctx.fill();
      ctx.stroke();

      ctx.font = '900 13px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#fbbf24';
      ctx.fillText(this.missionText, 1280 / 2, 47);
      ctx.restore();
    }
  }

  drawComboCounter(ctx, p) {
    if (p.comboCount >= 2 && p.comboTimer > 0) {
      ctx.save();
      ctx.textAlign = 'center';

      const scale = 1.0 + Math.sin(p.comboTimer * 0.2) * 0.08;
      ctx.translate(1280 / 2, 100);
      ctx.scale(scale, scale);

      ctx.font = '900 32px system-ui, -apple-system, sans-serif';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 6;
      ctx.strokeText(`${p.comboCount} HITS!`, 0, 0);

      ctx.fillStyle = p.comboCount >= 5 ? '#f43f5e' : '#fbbf24';
      ctx.fillText(`${p.comboCount} HITS!`, 0, 0);

      if (p.comboCount >= 5) {
        ctx.font = '800 14px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('MEGA COMBO!', 0, 24);
      }
      ctx.restore();
    }
  }

  drawBossHealthBar(ctx, boss) {
    ctx.save();
    const barW = 560;
    const barH = 18;
    const barX = (1280 - barW) / 2;
    const barY = 670;

    // Background Container
    ctx.fillStyle = 'rgba(10, 15, 26, 0.92)';
    ctx.beginPath();
    ctx.roundRect(barX - 14, barY - 26, barW + 28, barH + 34, 12);
    ctx.fill();
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Boss Name
    ctx.font = '900 13px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#fca5a5';
    ctx.textAlign = 'center';
    ctx.fillText(`☠ ${boss.name.toUpperCase()} ☠`, 1280 / 2, barY - 8);

    // HP Bar Fill
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(barX, barY, barW, barH);
    const ratio = Math.max(0, boss.hp / boss.maxHp);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(barX, barY, barW * ratio, barH);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);

    ctx.restore();
  }

  drawDamageNumbers(ctx) {
    ctx.save();
    ctx.textAlign = 'center';
    for (const n of this.damageNumbers) {
      ctx.globalAlpha = Math.max(0, n.life);
      const fontSize = Math.round((n.isCrit ? 26 : 20) * n.scale);
      ctx.font = `900 ${fontSize}px system-ui, -apple-system, sans-serif`;
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#000000';
      ctx.strokeText(n.amount, n.x, n.y);
      ctx.fillStyle = n.color;
      ctx.fillText(n.amount, n.x, n.y);
    }
    ctx.restore();
  }
}
