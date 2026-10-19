// cc_game.js — Authentic 1:1 Castle Crashers 60 FPS Browser Beat-Em-Up Engine
// High-performance canvas-based arcade engine with authentic physics, combos,
// magic, enemies, audio, and HUD.

(function () {
  'use strict';

  // --- Constants & Config ---
  const CANVAS_W = 1280;
  const CANVAS_H = 720;
  const FLOOR_TOP = 420;
  const FLOOR_BOTTOM = 680;
  const GRAVITY = 0.72;
  const JUMP_IMPULSE = 14.5;

  // Knight Archetypes
  const KNIGHTS = {
    1: {
      id: 1,
      name: 'GREEN KNIGHT',
      element: 'poison',
      mainColor: '#22c55e',
      darkColor: '#15803d',
      lightColor: '#4ade80',
      magicName: 'POISON MIST',
      magicSfx: 'sounds/sound_magic_poison.wav',
      jumpSfx: 'sounds/sound_jump_poison.wav',
      damageType: 'DMG_POISON'
    },
    2: {
      id: 2,
      name: 'RED KNIGHT',
      element: 'lightning',
      mainColor: '#ef4444',
      darkColor: '#b91c1c',
      lightColor: '#f87171',
      magicName: 'THUNDERBOLT',
      magicSfx: 'sounds/sound_magic_lightning.wav',
      jumpSfx: 'sounds/sound_jump_lightning.wav',
      damageType: 'DMG_ELEC'
    },
    3: {
      id: 3,
      name: 'BLUE KNIGHT',
      element: 'ice',
      mainColor: '#38bdf8',
      darkColor: '#0284c7',
      lightColor: '#7dd3fc',
      magicName: 'FROST SHARD',
      magicSfx: 'sounds/sound_magic_ice.wav',
      jumpSfx: 'sounds/sound_jump_ice.wav',
      damageType: 'DMG_ICE'
    },
    4: {
      id: 4,
      name: 'ORANGE KNIGHT',
      element: 'fire',
      mainColor: '#f97316',
      darkColor: '#c2410c',
      lightColor: '#fb923c',
      magicName: 'FIRE BURST',
      magicSfx: 'sounds/sound_magic_fire.wav',
      jumpSfx: 'sounds/sound_jump_fire.wav',
      damageType: 'DMG_FIRE'
    }
  };

  // --- Sound & Audio Engine ---
  class SoundManager {
    constructor() {
      this.bgm = null;
      this.bgmVol = 0.55;
      this.sfxVol = 0.75;
      this.cache = {};
      this.unlocked = false;
    }

    unlock() {
      if (this.unlocked) return;
      this.unlocked = true;
      this.playSfx('sounds/PBP_01.wav', 0.2);
    }

    playBgm(url, loop = true) {
      if (this.bgm) {
        try { this.bgm.pause(); } catch (e) {}
        this.bgm = null;
      }
      if (!url) return;
      try {
        const audio = new Audio(url);
        audio.loop = !!loop;
        audio.volume = this.bgmVol;
        audio.play().catch(() => {});
        this.bgm = audio;
      } catch (e) {}
    }

    playSfx(url, volScale = 1.0) {
      if (!url) return;
      try {
        let pool = this.cache[url];
        if (!pool) {
          pool = [new Audio(url), new Audio(url), new Audio(url)];
          this.cache[url] = pool;
        }
        const a = pool.find(item => item.paused || item.ended) || pool[0];
        a.currentTime = 0;
        a.volume = Math.max(0, Math.min(1, this.sfxVol * volScale));
        a.play().catch(() => {});
      } catch (e) {}
    }
  }

  // --- Particle & FX Engine ---
  class ParticleEngine {
    constructor() {
      this.particles = [];
      this.numbers = [];
      this.slashes = [];
    }

    addSpark(x, y, color = '#ffdf20', count = 8) {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const spd = 2 + Math.random() * 6;
        this.particles.push({
          x, y,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd - 2,
          radius: 2 + Math.random() * 3,
          color: color,
          life: 1.0,
          decay: 0.04 + Math.random() * 0.04
        });
      }
    }

    addBlood(x, y, count = 6) {
      for (let i = 0; i < count; i++) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.5;
        const spd = 3 + Math.random() * 5;
        this.particles.push({
          x, y,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd,
          radius: 2.5 + Math.random() * 2.5,
          color: '#dc2626',
          gravity: 0.4,
          life: 1.0,
          decay: 0.035
        });
      }
    }

    addDust(x, y) {
      for (let i = 0; i < 4; i++) {
        this.particles.push({
          x: x + (Math.random() - 0.5) * 20,
          y: y,
          vx: (Math.random() - 0.5) * 2,
          vy: -0.5 - Math.random() * 1.5,
          radius: 4 + Math.random() * 4,
          color: 'rgba(180, 160, 130, 0.5)',
          life: 1.0,
          decay: 0.05
        });
      }
    }

    addDamageNumber(x, y, amount, isCrit = false, color = '#fbbf24') {
      this.numbers.push({
        x: x + (Math.random() - 0.5) * 20,
        y: y - 20,
        amount: typeof amount === 'number' ? Math.round(amount) : amount,
        isCrit: isCrit,
        color: color,
        vy: -4.5,
        scale: isCrit ? 1.4 : 1.0,
        life: 1.0,
        decay: 0.025
      });
    }

    addSlash(x, y, dir, color = '#ffffff', scale = 1.0) {
      this.slashes.push({
        x, y, dir, color, scale,
        life: 1.0,
        decay: 0.12
      });
    }

    update() {
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.gravity) p.vy += p.gravity;
        p.life -= p.decay;
        if (p.life <= 0) this.particles.splice(i, 1);
      }
      for (let i = this.numbers.length - 1; i >= 0; i--) {
        const n = this.numbers[i];
        n.y += n.vy;
        n.vy += 0.15;
        n.life -= n.decay;
        if (n.life <= 0) this.numbers.splice(i, 1);
      }
      for (let i = this.slashes.length - 1; i >= 0; i--) {
        const s = this.slashes[i];
        s.life -= s.decay;
        if (s.life <= 0) this.slashes.splice(i, 1);
      }
    }

    draw(ctx) {
      // Draw Slashes
      for (const s of this.slashes) {
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.scale(s.dir * s.scale, s.scale);
        ctx.globalAlpha = Math.max(0, s.life);
        ctx.beginPath();
        ctx.arc(0, 0, 52, -Math.PI * 0.45, Math.PI * 0.45);
        ctx.lineWidth = 14;
        ctx.strokeStyle = s.color;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, 50, -Math.PI * 0.35, Math.PI * 0.35);
        ctx.lineWidth = 6;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
        ctx.restore();
      }

      // Draw Particles
      for (const p of this.particles) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * p.life, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Draw Damage Numbers
      ctx.save();
      ctx.textAlign = 'center';
      for (const n of this.numbers) {
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

  // --- Entity: Dropped Item (Coins / Food) ---
  class Item {
    constructor(x, y, type = 'coin', value = 1) {
      this.x = x;
      this.y = y;
      this.z = 18;
      this.vz = 5 + Math.random() * 3;
      this.vx = (Math.random() - 0.5) * 3;
      this.vy = (Math.random() - 0.5) * 1.5;
      this.type = type; // 'coin', 'meat'
      this.value = value;
      this.life = 600; // 10s
      this.collected = false;
      this.animTick = Math.random() * 100;
    }

    update(player, game) {
      this.animTick++;
      this.x += this.vx;
      this.y += this.vy;
      this.vx *= 0.95;
      this.vy *= 0.95;

      this.z += this.vz;
      this.vz -= GRAVITY;
      if (this.z <= 0) {
        this.z = 0;
        this.vz = -this.vz * 0.5;
        if (Math.abs(this.vz) < 0.8) this.vz = 0;
      }

      // Attraction towards player
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 120 && player.hp > 0) {
        this.x += (dx / dist) * 6;
        this.y += (dy / dist) * 6;
      }

      if (dist < 40 && Math.abs(player.z - this.z) < 50) {
        this.collected = true;
        if (this.type === 'coin') {
          player.coins += this.value;
          game.audio.playSfx('sounds/sound_coin1.wav', 0.8);
          game.fx.addSpark(this.x, this.y - this.z, '#facc15', 6);
        } else if (this.type === 'meat') {
          player.hp = Math.min(player.maxHp, player.hp + 35);
          game.audio.playSfx('sounds/sound_gemhitground.wav', 0.9);
          game.fx.addSpark(this.x, this.y - this.z, '#22c55e', 8);
          game.fx.addDamageNumber(player.x, player.y - player.z - 60, '+35 HP', false, '#22c55e');
        }
      }

      this.life--;
    }

    draw(ctx) {
      // Floor Shadow
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(this.x, this.y, 10, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const drawY = this.y - this.z;

      if (this.type === 'coin') {
        const spin = Math.sin(this.animTick * 0.15);
        ctx.save();
        ctx.translate(this.x, drawY);
        ctx.scale(spin, 1);
        ctx.fillStyle = '#facc15';
        ctx.strokeStyle = '#854d0e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (this.type === 'meat') {
        ctx.save();
        ctx.translate(this.x, drawY);
        ctx.fillStyle = '#b45309';
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, 14, 9, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Bone end
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.arc(14, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  // --- Entity: Target Practice Dummy ---
  class TargetDummy {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.z = 0;
      this.hp = 9999;
      this.wobble = 0;
      this.wobbleSpeed = 0;
      this.hitstun = 0;
    }

    takeDamage(amount, game, isCrit = false) {
      this.wobble = (Math.random() > 0.5 ? 1 : -1) * 0.35;
      this.wobbleSpeed = -this.wobble * 0.4;
      this.hitstun = 6;
      game.fx.addSpark(this.x, this.y - 50, '#f59e0b', 8);
      game.fx.addDamageNumber(this.x, this.y - 70, amount, isCrit, '#fef08a');
      game.audio.playSfx('sounds/sound_meatypunch4.wav', 0.85);

      // Drops practice coins occasionally
      if (Math.random() < 0.4) {
        game.items.push(new Item(this.x, this.y, 'coin', 1));
      }
    }

    update() {
      if (this.hitstun > 0) this.hitstun--;
      this.wobble += this.wobbleSpeed;
      this.wobbleSpeed -= this.wobble * 0.15;
      this.wobbleSpeed *= 0.88;
    }

    draw(ctx) {
      // Floor Shadow
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(this.x, this.y, 24, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.wobble);

      // Wooden pole
      ctx.fillStyle = '#78350f';
      ctx.strokeStyle = '#291e0a';
      ctx.lineWidth = 3;
      ctx.fillRect(-6, -80, 12, 80);
      ctx.strokeRect(-6, -80, 12, 80);

      // Cross wooden support
      ctx.fillRect(-28, -60, 56, 8);
      ctx.strokeRect(-28, -60, 56, 8);

      // Burlap Body
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.ellipse(0, -50, 22, 28, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Red Bullseye Target on Chest
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(0, -50, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, -50, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(0, -50, 4, 0, Math.PI * 2);
      ctx.fill();

      // Straw Head with X stitched eyes
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.arc(0, -90, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Eye crosses
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#1e1b18';
      [-6, 6].forEach(ex => {
        ctx.beginPath();
        ctx.moveTo(ex - 3, -93); ctx.lineTo(ex + 3, -87);
        ctx.moveTo(ex + 3, -93); ctx.lineTo(ex - 3, -87);
        ctx.stroke();
      });

      ctx.restore();
    }
  }

  // --- Entity: Hostile Barbarian Enemy ---
  class Barbarian {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.z = 0;
      this.vx = 0;
      this.vy = 0;
      this.vz = 0;
      this.dir = -1;
      this.hp = 85;
      this.maxHp = 85;
      this.state = 'walk'; // 'walk', 'attack', 'hurt', 'juggle', 'dead'
      this.stateTimer = 0;
      this.attackCooldown = 40 + Math.random() * 50;
      this.hitstun = 0;
      this.isDead = false;
      this.animTick = Math.random() * 100;
    }

    takeDamage(amount, game, knockVx = 4, knockVz = 0, isCrit = false, element = 'normal') {
      if (this.isDead) return;
      this.hp -= amount;
      this.hitstun = 14;
      this.state = knockVz > 4 ? 'juggle' : 'hurt';
      this.stateTimer = 18;
      this.vx = knockVx;
      this.vz = knockVz;

      game.fx.addBlood(this.x, this.y - this.z - 45, 7);
      game.fx.addDamageNumber(this.x, this.y - this.z - 65, amount, isCrit, isCrit ? '#ef4444' : '#fef08a');
      game.audio.playSfx('sounds/sound_meatypunch7.wav', 0.9);

      if (this.hp <= 0) {
        this.die(game);
      }
    }

    die(game) {
      this.isDead = true;
      this.state = 'dead';
      this.stateTimer = 45;
      this.vz = 8;
      this.vx = -this.dir * 3;
      game.audio.playSfx('sounds/sound_antliondie.wav', 0.9);
      game.fx.addSpark(this.x, this.y - 30, '#f97316', 12);

      // Drop Coins and chance for Food
      const coinCount = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < coinCount; i++) {
        game.items.push(new Item(this.x, this.y, 'coin', 1));
      }
      if (Math.random() < 0.35) {
        game.items.push(new Item(this.x, this.y, 'meat', 1));
      }
    }

    update(player, game) {
      this.animTick++;

      // Physics
      this.x += this.vx;
      this.y += this.vy;
      this.z += this.vz;

      this.vx *= 0.9;
      this.vy *= 0.9;

      if (this.z > 0) {
        this.vz -= GRAVITY;
      } else {
        this.z = 0;
        this.vz = 0;
        if (this.state === 'juggle') {
          this.state = 'hurt';
          this.stateTimer = 10;
          game.fx.addDust(this.x, this.y);
        }
      }

      // Keep within arena bounds
      this.y = Math.max(FLOOR_TOP, Math.min(FLOOR_BOTTOM, this.y));

      if (this.isDead) {
        this.stateTimer--;
        return;
      }

      if (this.hitstun > 0) {
        this.hitstun--;
        return;
      }

      // AI Decision Making
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const dist = Math.hypot(dx, dy);

      this.dir = dx > 0 ? 1 : -1;

      if (this.attackCooldown > 0) this.attackCooldown--;

      if (dist < 65 && Math.abs(dy) < 25 && this.attackCooldown <= 0 && player.hp > 0) {
        // Strike player with spiked club
        this.state = 'attack';
        this.stateTimer = 22;
        this.attackCooldown = 70 + Math.random() * 40;
        game.audio.playSfx('sounds/sound_meatypunch5.wav', 0.7);

        // Deal damage if player is within range
        setTimeout(() => {
          if (!this.isDead && Math.hypot(player.x - this.x, player.y - this.y) < 70) {
            player.takeDamage(12, this.dir, game);
          }
        }, 160);
      } else if (dist < 450 && this.state !== 'attack') {
        // Approach player in 2.5D space
        const speed = 2.2;
        this.vx = (dx / dist) * speed;
        this.vy = (dy / dist) * (speed * 0.7);
        this.state = 'walk';
      } else {
        this.state = 'idle';
      }
    }

    draw(ctx) {
      // Floor Shadow
      ctx.save();
      const shadowScale = Math.max(0.3, 1 - this.z / 180);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(this.x, this.y, 22 * shadowScale, 9 * shadowScale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const drawY = this.y - this.z;

      ctx.save();
      ctx.translate(this.x, drawY);
      ctx.scale(this.dir, 1);

      if (this.state === 'hurt' || this.state === 'juggle') {
        ctx.rotate(-0.25 * this.dir);
      }

      // Walk cycle bobbing
      const bob = this.state === 'walk' ? Math.sin(this.animTick * 0.28) * 3 : 0;

      // Barbarian Legs
      ctx.fillStyle = '#451a03';
      ctx.strokeStyle = '#1c0d02';
      ctx.lineWidth = 3;
      ctx.fillRect(-12, -22 + bob, 8, 22);
      ctx.fillRect(4, -22 - bob, 8, 22);
      ctx.strokeRect(-12, -22 + bob, 8, 22);
      ctx.strokeRect(4, -22 - bob, 8, 22);

      // Barbarian Fur Tunic
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.rect(-16, -54 + bob, 32, 34);
      ctx.fill();
      ctx.stroke();

      // Spiked Leather Belt
      ctx.fillStyle = '#292524';
      ctx.fillRect(-16, -34 + bob, 32, 8);
      ctx.strokeRect(-16, -34 + bob, 32, 8);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(-2, -33 + bob, 6, 6);

      // Barbarian Head & Fur Helmet
      ctx.fillStyle = '#a8a29e'; // Horned metal skullcap
      ctx.beginPath();
      ctx.arc(0, -68 + bob, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Horns
      ctx.fillStyle = '#fef3c7';
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 2.5;
      // Left horn
      ctx.beginPath();
      ctx.moveTo(-12, -74 + bob);
      ctx.quadraticCurveTo(-26, -92 + bob, -22, -98 + bob);
      ctx.quadraticCurveTo(-14, -86 + bob, -8, -80 + bob);
      ctx.fill();
      ctx.stroke();
      // Right horn
      ctx.beginPath();
      ctx.moveTo(12, -74 + bob);
      ctx.quadraticCurveTo(26, -92 + bob, 22, -98 + bob);
      ctx.quadraticCurveTo(14, -86 + bob, 8, -80 + bob);
      ctx.fill();
      ctx.stroke();

      // Glowing Eyes
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-9, -70 + bob, 6, 4);
      ctx.fillRect(3, -70 + bob, 6, 4);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(-7, -69 + bob, 3, 3);
      ctx.fillRect(5, -69 + bob, 3, 3);

      // Weapon: Spiked Club
      ctx.save();
      const clubAngle = this.state === 'attack' ? -Math.PI * 0.4 : 0.3;
      ctx.translate(14, -42 + bob);
      ctx.rotate(clubAngle);
      ctx.fillStyle = '#57300a';
      ctx.strokeStyle = '#1f0f03';
      ctx.lineWidth = 3;
      ctx.fillRect(-5, -42, 10, 42);
      ctx.strokeRect(-5, -42, 10, 42);
      // Spikes
      ctx.fillStyle = '#cbd5e1';
      [-36, -26, -16].forEach(sy => {
        ctx.beginPath();
        ctx.moveTo(5, sy); ctx.lineTo(12, sy + 3); ctx.lineTo(5, sy + 6);
        ctx.moveTo(-5, sy); ctx.lineTo(-12, sy + 3); ctx.lineTo(-5, sy + 6);
        ctx.fill();
      });
      ctx.restore();

      ctx.restore();

      // Small Health Bar Above Head
      if (this.hp < this.maxHp && !this.isDead) {
        ctx.save();
        const barW = 38;
        const barH = 5;
        const barX = this.x - barW / 2;
        const barY = drawY - 96;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
        const hpPct = Math.max(0, this.hp / this.maxHp);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(barX, barY, barW * hpPct, barH);
        ctx.restore();
      }
    }
  }

  // --- Entity: Playable Knight (Player) ---
  class Player {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.z = 0;
      this.vx = 0;
      this.vy = 0;
      this.vz = 0;
      this.dir = 1;
      this.speed = 5.2;

      this.hp = 100;
      this.maxHp = 100;
      this.mana = 100;
      this.maxMana = 100;
      this.coins = 0;
      this.xp = 0;
      this.level = 1;

      this.selectedKnight = 1; // 1: Green, 2: Red, 3: Blue, 4: Orange

      this.state = 'idle'; // 'idle', 'walk', 'jump', 'attack1', 'attack2', 'attack3', 'heavy', 'shield', 'magic', 'hurt'
      this.stateTimer = 0;
      this.comboCount = 0;
      this.comboTimer = 0;
      this.attackCooldown = 0;
      this.isShielding = false;
      this.hitstun = 0;
      this.animTick = 0;
    }

    setKnight(id) {
      if (KNIGHTS[id]) {
        this.selectedKnight = id;
      }
    }

    takeDamage(amount, enemyDir, game) {
      if (this.hp <= 0) return;

      if (this.isShielding && enemyDir !== this.dir) {
        // Blocked by shield!
        amount = Math.max(1, Math.round(amount * 0.1));
        game.fx.addSpark(this.x + this.dir * 20, this.y - 45, '#38bdf8', 10);
        game.audio.playSfx('sounds/sound_meatypunch4.wav', 0.6);
      } else {
        this.hp = Math.max(0, this.hp - amount);
        this.hitstun = 12;
        this.state = 'hurt';
        this.stateTimer = 14;
        this.vx = -this.dir * 4.5;
        game.fx.addBlood(this.x, this.y - this.z - 45, 8);
        game.audio.playSfx('sounds/sound_meatypunch7.wav', 0.95);
      }

      game.fx.addDamageNumber(this.x, this.y - this.z - 75, amount, false, '#ef4444');
    }

    attackLight(game) {
      if (this.attackCooldown > 0 || this.state === 'hurt' || this.isShielding) return;

      const knight = KNIGHTS[this.selectedKnight];
      this.attackCooldown = 14;

      if (this.comboTimer > 0 && this.comboCount < 3) {
        this.comboCount++;
      } else {
        this.comboCount = 1;
      }
      this.comboTimer = 35;

      this.state = `attack${this.comboCount}`;
      this.stateTimer = 16;
      this.vx = this.dir * (this.comboCount === 3 ? 5 : 3);

      game.audio.playSfx('sounds/sound_meatypunch4.wav', 0.85);

      const slashY = this.y - this.z - 45;
      const slashX = this.x + this.dir * 35;
      game.fx.addSlash(slashX, slashY, this.dir, knight.lightColor, this.comboCount === 3 ? 1.3 : 1.0);

      // Hitbox Detection
      const hitRadius = 75;
      const damage = this.comboCount === 3 ? 28 : (this.comboCount === 2 ? 18 : 14);
      const isFinisher = this.comboCount === 3;
      const knockVz = isFinisher ? 12 : (this.z > 0 ? 5 : 0);

      this.checkCombatHits(game, slashX, this.y, hitRadius, damage, isFinisher, knockVz);
    }

    attackHeavy(game) {
      if (this.attackCooldown > 0 || this.state === 'hurt' || this.isShielding) return;

      const knight = KNIGHTS[this.selectedKnight];
      this.attackCooldown = 26;
      this.state = 'heavy';
      this.stateTimer = 24;

      game.audio.playSfx('sounds/sound_meatypunch8.wav', 1.0);
      game.fx.addSlash(this.x, this.y - this.z - 45, this.dir, '#f59e0b', 1.6);
      game.fx.addSlash(this.x, this.y - this.z - 45, -this.dir, '#f59e0b', 1.6);

      this.checkCombatHits(game, this.x, this.y, 95, 36, true, 9);
    }

    castMagic(game) {
      if (this.mana < 25 || this.state === 'hurt' || this.attackCooldown > 0) return;

      const knight = KNIGHTS[this.selectedKnight];
      this.mana -= 25;
      this.attackCooldown = 30;
      this.state = 'magic';
      this.stateTimer = 22;

      game.audio.playSfx(knight.magicSfx, 1.0);

      // Element specific spellcast
      if (knight.element === 'poison') {
        for (let i = 0; i < 4; i++) {
          setTimeout(() => {
            const mx = this.x + this.dir * (40 + i * 45);
            game.fx.addSpark(mx, this.y - 20, '#22c55e', 14);
            this.checkCombatHits(game, mx, this.y, 60, 22, false, 4, true, 'poison');
          }, i * 80);
        }
      } else if (knight.element === 'lightning') {
        const mx = this.x + this.dir * 110;
        for (let i = 0; i < 15; i++) {
          game.fx.addSpark(mx + (Math.random() - 0.5) * 30, this.y - i * 30, '#ef4444', 5);
        }
        this.checkCombatHits(game, mx, this.y, 90, 42, true, 14, true, 'lightning');
      } else if (knight.element === 'ice') {
        const mx = this.x + this.dir * 100;
        game.fx.addSpark(mx, this.y - 30, '#38bdf8', 20);
        this.checkCombatHits(game, mx, this.y, 85, 30, true, 6, true, 'ice');
      } else if (knight.element === 'fire') {
        const mx = this.x + this.dir * 95;
        game.fx.addSpark(mx, this.y - 30, '#f97316', 22);
        this.checkCombatHits(game, mx, this.y, 90, 38, true, 10, true, 'fire');
      }
    }

    checkCombatHits(game, hitX, hitY, radius, damage, isCrit = false, knockVz = 0) {
      // Check Dummy
      if (game.dummy) {
        const dist = Math.hypot(game.dummy.x - hitX, game.dummy.y - hitY);
        if (dist < radius) {
          game.dummy.takeDamage(damage, game, isCrit);
          this.xp += 5;
        }
      }

      // Check Barbarians
      for (const enemy of game.enemies) {
        if (enemy.isDead) continue;
        const dist = Math.hypot(enemy.x - hitX, enemy.y - hitY);
        if (dist < radius && Math.abs(enemy.y - hitY) < 40) {
          enemy.takeDamage(damage, game, this.dir * (isCrit ? 8 : 4), knockVz, isCrit);
          this.xp += 15;
          if (this.xp >= 100) {
            this.level++;
            this.xp = 0;
            this.hp = this.maxHp;
            game.audio.playSfx('sounds/sound_gemshatter.wav', 1.0);
            game.fx.addSpark(this.x, this.y - 60, '#38bdf8', 25);
            game.fx.addDamageNumber(this.x, this.y - 110, 'LEVEL UP!', true, '#38bdf8');
          }
        }
      }
    }

    update(input, game) {
      this.animTick++;

      // Mana Regeneration
      if (this.mana < this.maxMana) {
        this.mana = Math.min(this.maxMana, this.mana + 0.25);
      }

      // Attack cooldowns
      if (this.attackCooldown > 0) this.attackCooldown--;
      if (this.comboTimer > 0) {
        this.comboTimer--;
        if (this.comboTimer <= 0) this.comboCount = 0;
      }

      // Hitstun recovery
      if (this.hitstun > 0) {
        this.hitstun--;
        this.x += this.vx;
        this.vx *= 0.85;
        return;
      }

      // State timer
      if (this.stateTimer > 0) {
        this.stateTimer--;
        if (this.stateTimer <= 0) {
          this.state = this.z > 0 ? 'jump' : 'idle';
        }
      }

      // Shield Handling
      this.isShielding = input.shield && this.z === 0 && !this.state.startsWith('attack');

      // Movement Input (if not attacking or shielding)
      const canMove = !this.state.startsWith('attack') && this.state !== 'heavy' && !this.isShielding;

      if (canMove) {
        let mx = 0;
        let my = 0;
        if (input.left) mx -= 1;
        if (input.right) mx += 1;
        if (input.up) my -= 1;
        if (input.down) my += 1;

        if (mx !== 0 && my !== 0) {
          mx *= 0.707;
          my *= 0.707;
        }

        this.vx = mx * this.speed;
        this.vy = my * (this.speed * 0.7);

        if (mx !== 0) this.dir = mx > 0 ? 1 : -1;

        if (mx !== 0 || my !== 0) {
          if (this.z === 0) {
            this.state = 'walk';
            if (this.animTick % 12 === 0) {
              game.fx.addDust(this.x, this.y);
            }
          }
        } else if (this.z === 0 && this.state === 'walk') {
          this.state = 'idle';
        }

        // Jump
        if (input.jump && this.z === 0) {
          this.vz = JUMP_IMPULSE;
          this.state = 'jump';
          const knight = KNIGHTS[this.selectedKnight];
          game.audio.playSfx(knight.jumpSfx, 0.85);
          game.fx.addDust(this.x, this.y);
        }
      } else {
        this.vx *= 0.75;
        this.vy *= 0.75;
      }

      // Physics
      this.x += this.vx;
      this.y += this.vy;
      this.z += this.vz;

      if (this.z > 0) {
        this.vz -= GRAVITY;
      } else {
        this.z = 0;
        this.vz = 0;
        if (this.state === 'jump') this.state = 'idle';
      }

      // Boundary clamp
      this.x = Math.max(80, Math.min(CANVAS_W - 80, this.x));
      this.y = Math.max(FLOOR_TOP, Math.min(FLOOR_BOTTOM, this.y));

      // Trigger Actions
      if (input.light) this.attackLight(game);
      if (input.heavy) this.attackHeavy(game);
      if (input.magic) this.castMagic(game);
    }

    draw(ctx) {
      const knight = KNIGHTS[this.selectedKnight];

      // Floor Shadow
      ctx.save();
      const shadowScale = Math.max(0.35, 1 - this.z / 200);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.ellipse(this.x, this.y, 26 * shadowScale, 11 * shadowScale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const drawY = this.y - this.z;

      ctx.save();
      ctx.translate(this.x, drawY);
      ctx.scale(this.dir, 1);

      if (this.state === 'hurt') {
        ctx.rotate(-0.25 * this.dir);
      }

      const bob = (this.state === 'walk' && this.z === 0) ? Math.sin(this.animTick * 0.3) * 3 : 0;

      // Knight Legs
      ctx.fillStyle = '#475569';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 3;
      ctx.fillRect(-12, -22 + bob, 8, 22);
      ctx.fillRect(4, -22 - bob, 8, 22);
      ctx.strokeRect(-12, -22 + bob, 8, 22);
      ctx.strokeRect(4, -22 - bob, 8, 22);

      // Chainmail Torso
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.rect(-16, -56 + bob, 32, 36);
      ctx.fill();
      ctx.stroke();

      // Colored Tunic Stripe
      ctx.fillStyle = knight.mainColor;
      ctx.fillRect(-16, -42 + bob, 32, 14);
      ctx.strokeRect(-16, -42 + bob, 32, 14);

      // Bucket Helmet
      ctx.fillStyle = knight.mainColor;
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.rect(-19, -94 + bob, 38, 40);
      ctx.fill();
      ctx.stroke();

      // Ear Circular Guards
      ctx.fillStyle = knight.lightColor;
      ctx.beginPath();
      ctx.arc(-19, -74 + bob, 7, 0, Math.PI * 2);
      ctx.arc(19, -74 + bob, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // White Cross Visor (Dan Paladin Signature)
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      // Vertical bar
      ctx.fillRect(-4, -92 + bob, 8, 36);
      ctx.strokeRect(-4, -92 + bob, 8, 36);
      // Horizontal bar
      ctx.fillRect(-14, -78 + bob, 28, 9);
      ctx.strokeRect(-14, -78 + bob, 28, 9);

      // Knight Eyes (Determined Angled Slits)
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-11, -76 + bob, 6, 4);
      ctx.fillRect(5, -76 + bob, 6, 4);

      // Shield (Left Hand)
      ctx.save();
      ctx.translate(-16, -50 + bob);
      if (this.isShielding) {
        ctx.translate(24, 0); // Hold shield in front
      }
      ctx.fillStyle = knight.darkColor;
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = knight.lightColor;
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-2, -8, 4, 16);
      ctx.fillRect(-8, -2, 16, 4);
      ctx.restore();

      // Broadsword (Right Hand)
      ctx.save();
      let swordAngle = 0.4;
      if (this.state === 'attack1') swordAngle = -1.2;
      else if (this.state === 'attack2') swordAngle = 1.1;
      else if (this.state === 'attack3') swordAngle = -1.8;
      else if (this.state === 'heavy') swordAngle = Math.sin(this.animTick * 0.8) * Math.PI;

      ctx.translate(16, -46 + bob);
      ctx.rotate(swordAngle);

      // Blade
      ctx.fillStyle = '#cbd5e1';
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-5, 0);
      ctx.lineTo(5, 0);
      ctx.lineTo(4, -46);
      ctx.lineTo(0, -56);
      ctx.lineTo(-4, -46);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Blade Center Fuller
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -4); ctx.lineTo(0, -44);
      ctx.stroke();

      // Crossguard & Pommel
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-10, 0, 20, 5);
      ctx.strokeRect(-10, 0, 20, 5);
      ctx.fillStyle = '#451a03';
      ctx.fillRect(-2, 5, 4, 10);
      ctx.beginPath();
      ctx.arc(0, 16, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      ctx.restore();
    }
  }

  // --- Main Engine Controller ---
  class CastleCrashersEngine {
    constructor() {
      this.canvas = document.getElementById('game-canvas');
      this.ctx = this.canvas.getContext('2d');
      this.audio = new SoundManager();
      this.fx = new ParticleEngine();
      this.player = new Player(340, 550);
      this.dummy = new TargetDummy(920, 530);
      this.enemies = [];
      this.items = [];

      this.currentStage = 'home_castle'; // 'home_castle' or 'warpath'
      this.stageBgs = {
        home_castle: new Image(),
        warpath: new Image()
      };
      this.stageBgs.home_castle.src = 'assets/home_castle_bg.png';
      this.stageBgs.warpath.src = 'assets/level1_bg.png';

      this.input = {
        left: false, right: false, up: false, down: false,
        jump: false, light: false, heavy: false, shield: false, magic: false
      };

      this.running = false;
      this.waveTimer = 0;
      this.screenShake = 0;

      this.setupInput();
      this.spawnBarbarianWave(3);
    }

    spawnBarbarianWave(count = 3) {
      for (let i = 0; i < count; i++) {
        const x = 750 + Math.random() * 400;
        const y = FLOOR_TOP + Math.random() * (FLOOR_BOTTOM - FLOOR_TOP);
        this.enemies.push(new Barbarian(x, y));
      }
    }

    setupInput() {
      const onKey = (code, isDown) => {
        this.audio.unlock();
        switch (code) {
          case 'ArrowLeft': case 'KeyA': this.input.left = isDown; break;
          case 'ArrowRight': case 'KeyD': this.input.right = isDown; break;
          case 'ArrowUp': case 'KeyW': this.input.up = isDown; break;
          case 'ArrowDown': case 'KeyS': this.input.down = isDown; break;
          case 'Space': this.input.jump = isDown; break;
          case 'KeyZ': this.input.light = isDown; break;
          case 'KeyX': this.input.heavy = isDown; break;
          case 'KeyC': case 'ShiftLeft': case 'ShiftRight': this.input.shield = isDown; break;
          case 'KeyE': this.input.magic = isDown; break;
          case 'Digit1': if (isDown) this.setKnight(1); break;
          case 'Digit2': if (isDown) this.setKnight(2); break;
          case 'Digit3': if (isDown) this.setKnight(3); break;
          case 'Digit4': if (isDown) this.setKnight(4); break;
          case 'KeyM': if (isDown) this.switchStage(); break;
        }
      };

      window.addEventListener('keydown', e => {
        if (e.key === 'h' || e.key === 'H') {
          const m = document.getElementById('help-modal');
          if (m) m.classList.toggle('open');
          return;
        }
        if (e.key === 'f' || e.key === 'F') {
          this.toggleFS();
          return;
        }
        onKey(e.code, true);
      });

      window.addEventListener('keyup', e => onKey(e.code, false));

      // Quick bar & Modal Buttons
      const btnStage = document.getElementById('btn-stage');
      if (btnStage) btnStage.addEventListener('click', () => this.switchStage());

      const btnHelp = document.getElementById('btn-help');
      if (btnHelp) btnHelp.addEventListener('click', () => {
        const m = document.getElementById('help-modal');
        if (m) m.classList.toggle('open');
      });

      const btnCloseHelp = document.getElementById('btn-close-help');
      if (btnCloseHelp) btnCloseHelp.addEventListener('click', () => {
        const m = document.getElementById('help-modal');
        if (m) m.classList.remove('open');
      });

      const btnFs = document.getElementById('btn-fs');
      if (btnFs) btnFs.addEventListener('click', () => this.toggleFS());

      // Touch Buttons Binding
      document.querySelectorAll('[data-touch]').forEach(btn => {
        const action = btn.getAttribute('data-touch');
        const start = e => { e.preventDefault(); this.audio.unlock(); this.input[action] = true; };
        const end = e => { e.preventDefault(); this.input[action] = false; };
        btn.addEventListener('touchstart', start, { passive: false });
        btn.addEventListener('touchend', end, { passive: false });
        btn.addEventListener('mousedown', start);
        btn.addEventListener('mouseup', end);
      });

      // Knight Pills
      document.querySelectorAll('.knight-pill').forEach(pill => {
        pill.addEventListener('click', () => {
          const id = parseInt(pill.getAttribute('data-knight'), 10);
          this.setKnight(id);
        });
      });
    }

    setKnight(id) {
      this.player.setKnight(id);
      document.querySelectorAll('.knight-pill').forEach(p => {
        p.classList.toggle('active', parseInt(p.getAttribute('data-knight'), 10) === id);
      });
      const knight = KNIGHTS[id];
      this.audio.playSfx('sounds/sound_player_select.wav', 0.9);
      this.fx.addSpark(this.player.x, this.player.y - 60, knight.lightColor, 18);
    }

    switchStage(stageName) {
      this.audio.unlock();
      if (stageName) {
        this.currentStage = stageName;
      } else {
        this.currentStage = this.currentStage === 'home_castle' ? 'warpath' : 'home_castle';
      }

      if (this.currentStage === 'home_castle') {
        this.audio.playBgm('music/barrackssong.wav', true);
        this.fx.addDamageNumber(CANVAS_W / 2, 120, 'HOME CASTLE', true, '#38bdf8');
      } else {
        this.audio.playBgm('music/007_FLOODED_CASTLE.wav', true);
        this.fx.addDamageNumber(CANVAS_W / 2, 120, 'BARBARIAN WARPATH', true, '#ef4444');
      }

      this.enemies = [];
      this.spawnBarbarianWave(3);
      this.fx.addSpark(this.player.x, this.player.y - 50, '#f59e0b', 24);
    }

    toggleFS() {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    }

    start() {
      if (this.running) return;
      this.running = true;
      this.audio.playBgm('music/barrackssong.wav', true);

      const loop = () => {
        this.update();
        this.render();
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }

    update() {
      // Gamepad Polling
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      if (gamepads && gamepads[0]) {
        const gp = gamepads[0];
        this.input.left = gp.axes[0] < -0.3 || gp.buttons[14]?.pressed;
        this.input.right = gp.axes[0] > 0.3 || gp.buttons[15]?.pressed;
        this.input.up = gp.axes[1] < -0.3 || gp.buttons[12]?.pressed;
        this.input.down = gp.axes[1] > 0.3 || gp.buttons[13]?.pressed;
        this.input.jump = gp.buttons[0]?.pressed; // A
        this.input.light = gp.buttons[2]?.pressed; // X
        this.input.heavy = gp.buttons[3]?.pressed; // Y
        this.input.magic = gp.buttons[1]?.pressed; // B
        this.input.shield = gp.buttons[4]?.pressed || gp.buttons[6]?.pressed; // LB/LT
      }

      this.player.update(this.input, this);
      if (this.dummy) this.dummy.update();

      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i];
        e.update(this.player, this);
        if (e.isDead && e.stateTimer <= 0) {
          this.enemies.splice(i, 1);
        }
      }

      // Items update
      for (let i = this.items.length - 1; i >= 0; i--) {
        const it = this.items[i];
        it.update(this.player, this);
        if (it.collected || it.life <= 0) {
          this.items.splice(i, 1);
        }
      }

      this.fx.update();

      // Continuous Barbarian Wave Spawning
      this.waveTimer++;
      if (this.enemies.length < 2 && this.waveTimer > 200) {
        this.spawnBarbarianWave(2 + Math.floor(Math.random() * 2));
        this.waveTimer = 0;
      }

      if (this.screenShake > 0) this.screenShake *= 0.88;
    }

    render() {
      const ctx = this.ctx;
      ctx.save();

      // Screen Shake
      if (this.screenShake > 0.5) {
        const sx = (Math.random() - 0.5) * this.screenShake * 10;
        const sy = (Math.random() - 0.5) * this.screenShake * 10;
        ctx.translate(sx, sy);
      }

      // --- 1. Authentic Environment ---
      if (this.currentStage === 'home_castle') {
        this.drawBarracksEnvironment(ctx);
      } else {
        this.drawWarpathEnvironment(ctx);
      }

      // --- 2. Depth-Sorted Entities (Y-sort) ---
      const entities = [this.player, this.dummy, ...this.enemies, ...this.items];
      entities.sort((a, b) => a.y - b.y);

      for (const ent of entities) {
        ent.draw(ctx);
      }

      // --- 3. Particles, Slashes & Damage Text ---
      this.fx.draw(ctx);

      ctx.restore();

      // --- 4. Authentic Castle Crashers HUD ---
      this.drawHUD(ctx);
    }

    drawBarracksEnvironment(ctx) {
      const bg = this.stageBgs && this.stageBgs.home_castle;
      if (bg && bg.complete && bg.naturalWidth > 0) {
        ctx.drawImage(bg, 0, 0, CANVAS_W, CANVAS_H);
        return;
      }

      // Stone Wall Background
      ctx.fillStyle = '#2d3748';
      ctx.fillRect(0, 0, CANVAS_W, FLOOR_TOP);

      // Stone Bricks Grid
      ctx.strokeStyle = '#1a202c';
      ctx.lineWidth = 3;
      const brickH = 38;
      const brickW = 84;
      for (let y = 0; y < FLOOR_TOP; y += brickH) {
        const offset = ((y / brickH) % 2) * (brickW / 2);
        for (let x = -offset; x < CANVAS_W; x += brickW) {
          ctx.strokeRect(x, y, brickW, brickH);
        }
      }

      // Wooden Archway (Exit to Forest)
      ctx.fillStyle = '#451a03';
      ctx.strokeStyle = '#1c0d02';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(640, FLOOR_TOP, 160, Math.PI, 0);
      ctx.rect(480, FLOOR_TOP - 160, 320, 160);
      ctx.fill();
      ctx.stroke();

      // Arch Background (Outdoor Sky & Forest)
      ctx.save();
      ctx.beginPath();
      ctx.arc(640, FLOOR_TOP, 150, Math.PI, 0);
      ctx.clip();
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(480, FLOOR_TOP - 160, 320, 160);
      // Distant green hills
      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.arc(580, FLOOR_TOP + 40, 120, 0, Math.PI * 2);
      ctx.arc(710, FLOOR_TOP + 30, 100, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Giant Wooden Beer Keg (Left Wall)
      ctx.save();
      ctx.translate(140, FLOOR_TOP - 30);
      ctx.fillStyle = '#78350f';
      ctx.strokeStyle = '#291e0a';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(0, 0, 75, 95, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Brass Spigot Tap
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(-8, 30, 16, 12);
      ctx.fillRect(-4, 42, 8, 16);
      ctx.restore();

      // Wooden Floor Planks
      ctx.fillStyle = '#92400e';
      ctx.fillRect(0, FLOOR_TOP, CANVAS_W, CANVAS_H - FLOOR_TOP);
      ctx.strokeStyle = '#713f12';
      ctx.lineWidth = 2;
      for (let y = FLOOR_TOP; y < CANVAS_H; y += 32) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_W, y);
        ctx.stroke();
      }

      // Straw / Hay Piles on Floor
      ctx.fillStyle = '#facc15';
      [
        { x: 300, y: 520, w: 90, h: 25 },
        { x: 880, y: 540, w: 120, h: 30 },
        { x: 1100, y: 620, w: 140, h: 35 }
      ].forEach(hay => {
        ctx.beginPath();
        ctx.ellipse(hay.x, hay.y, hay.w, hay.h, 0, 0, Math.PI * 2);
        ctx.fill();
      });

      // Hanging Iron Chandeliers with Candles
      [320, 960].forEach(cx => {
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx, 0); ctx.lineTo(cx, 120);
        ctx.stroke();

        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.ellipse(cx, 120, 70, 16, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Flickering Candles
        [-45, -15, 15, 45].forEach(ox => {
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(cx + ox - 3, 104, 6, 16);
          // Flame
          ctx.fillStyle = '#f97316';
          const flameH = 8 + Math.sin(Date.now() * 0.015 + ox) * 3;
          ctx.beginPath();
          ctx.ellipse(cx + ox, 102 - flameH / 2, 4, flameH / 2, 0, 0, Math.PI * 2);
          ctx.fill();
        });
      });
    }

    drawWarpathEnvironment(ctx) {
      // 1. Sunset Sky Gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, FLOOR_TOP);
      skyGrad.addColorStop(0, '#2e1065');   // Deep twilight purple
      skyGrad.addColorStop(0.45, '#7c2d12'); // Warm amber
      skyGrad.addColorStop(0.75, '#ea580c'); // Vibrant sunset orange
      skyGrad.addColorStop(1, '#fde047');    // Horizon gold
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, CANVAS_W, FLOOR_TOP);

      // Low Glowing Sun
      ctx.save();
      ctx.fillStyle = '#fffbeb';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 40;
      ctx.beginPath();
      ctx.arc(840, FLOOR_TOP - 75, 45, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 2. Distant Mountains (Layer 1)
      ctx.fillStyle = '#1e1b4b';
      ctx.beginPath();
      ctx.moveTo(0, FLOOR_TOP);
      ctx.lineTo(0, FLOOR_TOP - 90);
      ctx.lineTo(180, FLOOR_TOP - 170);
      ctx.lineTo(380, FLOOR_TOP - 110);
      ctx.lineTo(580, FLOOR_TOP - 190);
      ctx.lineTo(820, FLOOR_TOP - 100);
      ctx.lineTo(1040, FLOOR_TOP - 165);
      ctx.lineTo(1280, FLOOR_TOP - 80);
      ctx.lineTo(1280, FLOOR_TOP);
      ctx.closePath();
      ctx.fill();

      // 3. Midground Mountains (Layer 2)
      ctx.fillStyle = '#312e81';
      ctx.beginPath();
      ctx.moveTo(0, FLOOR_TOP);
      ctx.lineTo(0, FLOOR_TOP - 50);
      ctx.lineTo(120, FLOOR_TOP - 120);
      ctx.lineTo(290, FLOOR_TOP - 60);
      ctx.lineTo(470, FLOOR_TOP - 135);
      ctx.lineTo(710, FLOOR_TOP - 55);
      ctx.lineTo(950, FLOOR_TOP - 115);
      ctx.lineTo(1160, FLOOR_TOP - 50);
      ctx.lineTo(1280, FLOOR_TOP - 90);
      ctx.lineTo(1280, FLOOR_TOP);
      ctx.closePath();
      ctx.fill();

      // 4. Stylized Dan Paladin Conical Pine Trees (Back Layer)
      const drawPineTree = (x, baseY, width, height, color1, color2) => {
        ctx.save();
        ctx.fillStyle = '#451a03';
        ctx.fillRect(x - width * 0.08, baseY - height * 0.2, width * 0.16, height * 0.2);
        const tiers = 3;
        for (let t = 0; t < tiers; t++) {
          const tierY = baseY - height * 0.15 - (t / tiers) * height * 0.75;
          const tierW = width * (1 - t * 0.25);
          const tierH = (height / tiers) * 1.35;
          ctx.fillStyle = t % 2 === 0 ? color1 : color2;
          ctx.strokeStyle = '#022c22';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(x, tierY - tierH);
          ctx.lineTo(x + tierW / 2, tierY);
          ctx.lineTo(x - tierW / 2, tierY);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      };

      [
        { x: 60, y: FLOOR_TOP, w: 70, h: 140 },
        { x: 130, y: FLOOR_TOP, w: 55, h: 110 },
        { x: 210, y: FLOOR_TOP, w: 85, h: 170 },
        { x: 420, y: FLOOR_TOP, w: 65, h: 130 },
        { x: 500, y: FLOOR_TOP, w: 90, h: 180 },
        { x: 920, y: FLOOR_TOP, w: 75, h: 150 },
        { x: 1010, y: FLOOR_TOP, w: 60, h: 120 },
        { x: 1120, y: FLOOR_TOP, w: 85, h: 165 },
        { x: 1220, y: FLOOR_TOP, w: 70, h: 135 }
      ].forEach(tr => drawPineTree(tr.x, tr.y, tr.w, tr.h, '#064e3b', '#047857'));

      // 5. Wooden Barbarian Palisades / Spikes
      ctx.strokeStyle = '#1c0d02';
      ctx.lineWidth = 3;
      [
        { x: 280, y: FLOOR_TOP, h: 65 },
        { x: 300, y: FLOOR_TOP, h: 80 },
        { x: 320, y: FLOOR_TOP, h: 70 },
        { x: 340, y: FLOOR_TOP, h: 55 },
        { x: 780, y: FLOOR_TOP, h: 75 },
        { x: 800, y: FLOOR_TOP, h: 90 },
        { x: 820, y: FLOOR_TOP, h: 70 },
        { x: 840, y: FLOOR_TOP, h: 60 }
      ].forEach(stake => {
        ctx.fillStyle = '#78350f';
        ctx.beginPath();
        ctx.moveTo(stake.x - 7, stake.y);
        ctx.lineTo(stake.x - 7, stake.y - stake.h + 15);
        ctx.lineTo(stake.x, stake.y - stake.h);
        ctx.lineTo(stake.x + 7, stake.y - stake.h + 15);
        ctx.lineTo(stake.x + 7, stake.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      });

      // 6. Ground: Grassy Turf & Dirt Arena
      ctx.fillStyle = '#166534';
      ctx.fillRect(0, FLOOR_TOP, CANVAS_W, CANVAS_H - FLOOR_TOP);

      // Winding Dirt Warpath (Trampled Mud)
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.moveTo(0, FLOOR_TOP + 30);
      ctx.bezierCurveTo(400, FLOOR_TOP + 10, 800, FLOOR_TOP + 70, CANVAS_W, FLOOR_TOP + 35);
      ctx.lineTo(CANVAS_W, CANVAS_H);
      ctx.lineTo(0, CANVAS_H);
      ctx.closePath();
      ctx.fill();

      // Mud & Grass Patches
      ctx.fillStyle = '#15803d';
      [
        { x: 120, y: 520, w: 140, h: 35 },
        { x: 480, y: 580, w: 180, h: 45 },
        { x: 920, y: 540, w: 160, h: 40 },
        { x: 1140, y: 640, w: 130, h: 30 }
      ].forEach(g => {
        ctx.beginPath();
        ctx.ellipse(g.x, g.y, g.w / 2, g.h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
      });

      // Wildflowers & Pebbles
      ctx.fillStyle = '#fde047';
      [
        { x: 80, y: 460 }, { x: 220, y: 640 }, { x: 380, y: 510 },
        { x: 670, y: 650 }, { x: 850, y: 470 }, { x: 1040, y: 620 }
      ].forEach(f => {
        ctx.beginPath();
        ctx.arc(f.x, f.y, 4, 0, Math.PI * 2);
        ctx.fill();
      });

      // Ground Shrub Bushes
      ctx.fillStyle = '#14532d';
      ctx.strokeStyle = '#052e16';
      ctx.lineWidth = 3;
      [
        { x: 160, y: 440, r: 24 },
        { x: 620, y: 430, r: 28 },
        { x: 1180, y: 450, r: 32 }
      ].forEach(b => {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
    }

    drawHUD(ctx) {
      const p = this.player;
      const knight = KNIGHTS[p.selectedKnight];

      ctx.save();

      // --- P1 Banner Crest (Top Left) ---
      const hudX = 24;
      const hudY = 24;

      // Outer Gold Crest Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.beginPath();
      ctx.roundRect(hudX - 2, hudY - 2, 340, 72, 12);
      ctx.fill();

      // Gold Frame Background
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(hudX, hudY, 336, 68, 10);
      ctx.fill();
      ctx.stroke();

      // Portrait Circle
      ctx.save();
      ctx.beginPath();
      ctx.arc(hudX + 38, hudY + 34, 26, 0, Math.PI * 2);
      ctx.fillStyle = knight.darkColor;
      ctx.fill();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.clip();

      // Mini Helmet in Portrait
      ctx.fillStyle = knight.mainColor;
      ctx.fillRect(hudX + 22, hudY + 18, 32, 34);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(hudX + 35, hudY + 18, 6, 34);
      ctx.fillRect(hudX + 26, hudY + 30, 24, 7);
      ctx.restore();

      // Player Name & Level
      ctx.fillStyle = '#f8fafc';
      ctx.font = '900 13px system-ui, sans-serif';
      ctx.fillText(`${knight.name} · LV ${p.level}`, hudX + 78, hudY + 22);

      // Health Bar
      const barX = hudX + 78;
      const barY = hudY + 28;
      const barW = 180;
      const barH = 12;

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(barX, barY, barW, barH);
      const hpRatio = Math.max(0, p.hp / p.maxHp);
      ctx.fillStyle = hpRatio > 0.4 ? '#22c55e' : (hpRatio > 0.2 ? '#f59e0b' : '#ef4444');
      ctx.fillRect(barX, barY, barW * hpRatio, barH);
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(barX, barY, barW, barH);

      // Magic Bar
      const magicY = barY + 16;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(barX, magicY, barW, 8);
      const manaRatio = Math.max(0, p.mana / p.maxMana);
      ctx.fillStyle = knight.lightColor;
      ctx.fillRect(barX, magicY, barW * manaRatio, 8);
      ctx.strokeRect(barX, magicY, barW, 8);

      // Gold Coins Counter
      ctx.fillStyle = '#facc15';
      ctx.font = '900 16px system-ui, sans-serif';
      ctx.fillText(`🪙 ${p.coins}`, hudX + 272, hudY + 44);

      // Combo Counter Notification
      if (p.comboCount >= 2 && p.comboTimer > 0) {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = '900 28px system-ui, sans-serif';
        ctx.fillStyle = '#fbbf24';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 5;
        const comboText = `${p.comboCount} HITS!`;
        ctx.strokeText(comboText, CANVAS_W / 2, 90);
        ctx.fillText(comboText, CANVAS_W / 2, 90);
        ctx.restore();
      }

      ctx.restore();
    }
  }

  // --- Boot Initialization ---
  window.addEventListener('load', () => {
    const game = new CastleCrashersEngine();
    window.CC_GAME = game;

    const bootBtn = document.getElementById('boot-play-btn');
    const bootScreen = document.getElementById('boot-screen');
    const bootFill = document.getElementById('boot-progress-fill');

    let p = 0;
    const iv = setInterval(() => {
      p = Math.min(96, p + 12);
      if (bootFill) bootFill.style.width = p + '%';
    }, 70);

    const onStart = () => {
      clearInterval(iv);
      if (bootFill) bootFill.style.width = '100%';
      setTimeout(() => {
        if (bootScreen) {
          bootScreen.classList.add('hide');
          setTimeout(() => bootScreen.remove(), 400);
        }
        game.start();
      }, 250);
    };

    if (bootBtn) {
      bootBtn.addEventListener('click', onStart);
    } else {
      onStart();
    }
  });

})();
