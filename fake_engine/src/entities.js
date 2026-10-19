// entities.js — Castle Crashers Entities & Combat Actors
// 4 Knights, Animal Orb Companion, Target Practice Dummy, Barbarians, Boss, Items, and Particle System.

export const KNIGHTS = {
  1: {
    id: 1,
    name: 'GREEN KNIGHT',
    element: 'poison',
    mainColor: '#22c55e',
    darkColor: '#15803d',
    lightColor: '#4ade80',
    magicName: 'POISON MIST',
    magicSfx: 'sounds/sound_magic_poison.wav',
    jumpSfx: 'sounds/sound_jump_poison.wav'
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
    jumpSfx: 'sounds/sound_jump_lightning.wav'
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
    jumpSfx: 'sounds/sound_jump_ice.wav'
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
    jumpSfx: 'sounds/sound_jump_fire.wav'
  }
};

export class ParticleSystem {
  constructor() {
    this.particles = [];
    this.slashes = [];
  }

  addSlash(x, y, dir, color = '#ffffff', scale = 1.0) {
    this.slashes.push({ x, y, dir, color, scale, life: 1.0, decay: 0.12 });
  }

  addBlood(x, y, count = 8) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 8,
        vy: -Math.random() * 6 - 2,
        gravity: 0.4,
        radius: 3 + Math.random() * 3,
        color: '#dc2626',
        life: 1.0,
        decay: 0.03
      });
    }
  }

  addSpark(x, y, color = '#fbbf24', count = 12) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = 3 + Math.random() * 6;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        gravity: 0.15,
        radius: 2 + Math.random() * 2.5,
        color: color,
        life: 1.0,
        decay: 0.04
      });
    }
  }

  addDust(x, y) {
    for (let i = 0; i < 3; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 16,
        y: y + (Math.random() - 0.5) * 6,
        vx: (Math.random() - 0.5) * 2,
        vy: -0.5 - Math.random() * 1.5,
        radius: 4 + Math.random() * 4,
        color: 'rgba(180, 160, 130, 0.5)',
        life: 1.0,
        decay: 0.05
      });
    }
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

    for (let i = this.slashes.length - 1; i >= 0; i--) {
      const s = this.slashes[i];
      s.life -= s.decay;
      if (s.life <= 0) this.slashes.splice(i, 1);
    }
  }

  draw(ctx) {
    // Slashes
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

    // Particles
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * p.life, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

export class Item {
  constructor(x, y, type = 'coin', value = 1) {
    this.x = x;
    this.y = y;
    this.z = 25;
    this.vz = 5.0;
    this.type = type; // 'coin', 'meat', 'potion'
    this.value = value;
    this.collected = false;
    this.life = 600;
    this.anim = 0;
  }

  update(player, game) {
    this.anim++;
    if (this.z > 0) {
      this.z += this.vz;
      this.vz -= 0.6;
      if (this.z <= 0) {
        this.z = 0;
        this.vz = -this.vz * 0.4;
      }
    }

    // Magnet to player
    const dist = Math.hypot(player.x - this.x, player.y - this.y);
    if (dist < 100) {
      this.x += (player.x - this.x) * 0.12;
      this.y += (player.y - this.y) * 0.12;
    }

    // Collect
    if (dist < 42 && Math.abs(player.z - this.z) < 50) {
      this.collected = true;
      if (this.type === 'coin') {
        player.coins += this.value;
        game.audio.coin();
        game.particles.addSpark(this.x, this.y - this.z, '#facc15', 8);
      } else if (this.type === 'meat') {
        player.hp = Math.min(player.maxHp, player.hp + 35);
        game.audio.meat();
        game.particles.addSpark(this.x, this.y - this.z, '#22c55e', 10);
        game.hud.addDamageNumber(player.x, player.y - player.z - 60, '+35 HP', false, '#22c55e');
      }
    }
    this.life--;
  }

  draw(ctx) {
    ctx.save();
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y, 10, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    const drawY = this.y - this.z;
    ctx.translate(this.x, drawY);

    if (this.type === 'coin') {
      const bob = Math.sin(this.anim * 0.2) * 3;
      ctx.translate(0, bob);
      ctx.fillStyle = '#facc15';
      ctx.strokeStyle = '#ca8a04';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, 9, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(-2, -5, 4, 10);
    } else if (this.type === 'meat') {
      // Roasted Turkey Leg
      ctx.fillStyle = '#b45309';
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(4, 0, 14, 10, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Bone
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-10, -3, 8, 6);
      ctx.beginPath();
      ctx.arc(-10, -5, 3, 0, Math.PI * 2);
      ctx.arc(-10, 5, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

export class AnimalOrb {
  constructor(player) {
    this.player = player;
    this.x = player.x - 30;
    this.y = player.y - 20;
    this.z = 45;
    this.anim = 0;
  }

  update() {
    this.anim++;
    const targetX = this.player.x - this.player.dir * 35;
    const targetY = this.player.y - 25;
    this.x += (targetX - this.x) * 0.15;
    this.y += (targetY - this.y) * 0.15;
  }

  draw(ctx) {
    ctx.save();
    const bob = Math.sin(this.anim * 0.15) * 5;
    const drawY = this.y - this.z + bob;
    ctx.translate(this.x, drawY);
    ctx.scale(this.player.dir, 1);

    // Cardinal Companion Bird
    ctx.fillStyle = '#ef4444';
    ctx.strokeStyle = '#991b1b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Crest Feather
    ctx.beginPath();
    ctx.moveTo(-4, -8);
    ctx.lineTo(-10, -16);
    ctx.lineTo(2, -9);
    ctx.fill();

    // Beak
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(8, -2); ctx.lineTo(16, 1); ctx.lineTo(8, 4);
    ctx.fill();

    // Eye
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(6, -2, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

export class TargetDummy {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.z = 0;
    this.hp = 999999;
    this.wobble = 0;
    this.wobbleSpeed = 0;
    this.hitstun = 0;
  }

  takeDamage(amount, game, isCrit = false) {
    this.wobble = (Math.random() > 0.5 ? 1 : -1) * 0.35;
    this.wobbleSpeed = -this.wobble * 0.4;
    this.hitstun = 6;
    game.particles.addSpark(this.x, this.y - 50, '#f59e0b', 8);
    game.hud.addDamageNumber(this.x, this.y - 70, amount, isCrit, '#fef08a');
    game.audio.punchLight();

    if (Math.random() < 0.4) {
      game.items.push(new Item(this.x, this.y, 'coin', 1));
    }
  }

  update() {
    if (this.hitstun > 0) this.hitstun--;
    this.wobble += this.wobbleSpeed;
    this.wobbleSpeed += -this.wobble * 0.2;
    this.wobbleSpeed *= 0.85;
  }

  draw(ctx) {
    ctx.save();
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y, 24, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(this.x, this.y);
    ctx.rotate(this.wobble);

    // Wooden Stand Post
    ctx.fillStyle = '#78350f';
    ctx.strokeStyle = '#291e0a';
    ctx.lineWidth = 3;
    ctx.fillRect(-6, -70, 12, 70);
    ctx.strokeRect(-6, -70, 12, 70);

    // Burlap Straw Torso
    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    ctx.ellipse(0, -65, 22, 28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Bullseye Target Mark
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(0, -65, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, -65, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(0, -65, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Straw Head
    ctx.fillStyle = '#b45309';
    ctx.beginPath();
    ctx.arc(0, -105, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Cross Stitched Eyes
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    [-6, 6].forEach(ex => {
      ctx.beginPath();
      ctx.moveTo(ex - 3, -108); ctx.lineTo(ex + 3, -102);
      ctx.moveTo(ex + 3, -108); ctx.lineTo(ex - 3, -102);
      ctx.stroke();
    });

    ctx.restore();
  }
}

export class Barbarian {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.z = 0;
    this.vx = 0;
    this.vy = 0;
    this.vz = 0;
    this.dir = -1;
    this.speed = 2.4;
    this.hp = 80;
    this.maxHp = 80;
    this.state = 'patrol';
    this.stateTimer = 0;
    this.hitstun = 0;
    this.attackCooldown = 0;
    this.isDead = false;
    this.animTick = Math.floor(Math.random() * 60);
  }

  takeDamage(amount, game, knockVx = 4, knockVz = 0, isCrit = false) {
    if (this.isDead) return;
    this.hp -= amount;
    this.hitstun = 14;
    this.state = knockVz > 4 ? 'juggle' : 'hurt';
    this.stateTimer = 18;
    this.vx = knockVx;
    this.vz = knockVz;

    game.particles.addBlood(this.x, this.y - this.z - 45, 7);
    game.hud.addDamageNumber(this.x, this.y - this.z - 65, amount, isCrit, isCrit ? '#ef4444' : '#fef08a');
    game.audio.punchHurt();

    if (this.hp <= 0) {
      this.die(game);
    }
  }

  die(game) {
    this.isDead = true;
    this.state = 'dead';
    this.stateTimer = 40;
    game.particles.addBlood(this.x, this.y - 40, 16);
    game.particles.addSpark(this.x, this.y - 40, '#f59e0b', 14);

    // Drop loot
    const coinCount = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < coinCount; i++) {
      game.items.push(new Item(this.x + (Math.random() - 0.5) * 30, this.y, 'coin', 1));
    }
    if (Math.random() < 0.35) {
      game.items.push(new Item(this.x, this.y, 'meat', 35));
    }
  }

  update(player, game) {
    this.animTick++;
    if (this.attackCooldown > 0) this.attackCooldown--;

    if (this.isDead) {
      if (this.stateTimer > 0) this.stateTimer--;
      return;
    }

    // Z-axis Juggle Physics
    if (this.z > 0 || this.vz > 0) {
      this.z += this.vz;
      this.vz -= 0.68;
      if (this.z <= 0) {
        this.z = 0;
        this.vz = 0;
        if (this.state === 'juggle') {
          this.state = 'hurt';
          this.stateTimer = 10;
          game.particles.addDust(this.x, this.y);
          game.audio.punchLight();
        }
      }
    }

    // Hitstun
    if (this.hitstun > 0) {
      this.hitstun--;
      this.x += this.vx;
      this.vx *= 0.82;
      return;
    }

    if (this.stateTimer > 0) {
      this.stateTimer--;
      if (this.stateTimer <= 0) this.state = 'patrol';
    }

    // Aggro AI: Hunt Player
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);

    this.dir = dx > 0 ? 1 : -1;

    if (dist < 70 && Math.abs(dy) < 25 && this.attackCooldown <= 0 && player.hp > 0) {
      // Club Swing Attack
      this.state = 'attack';
      this.stateTimer = 22;
      this.attackCooldown = 65;
      game.audio.barbarianRoar();
      setTimeout(() => {
        if (!this.isDead && Math.hypot(player.x - this.x, player.y - this.y) < 75) {
          player.takeDamage(12, this.dir, game);
        }
      }, 200);
    } else if (dist > 50 && this.state !== 'attack') {
      this.state = 'walk';
      this.x += Math.sign(dx) * this.speed;
      this.y += Math.sign(dy) * (this.speed * 0.65);
      this.y = Math.max(420, Math.min(680, this.y));
    }
  }

  draw(ctx) {
    ctx.save();
    // Shadow
    const shadowScale = Math.max(0.3, 1 - this.z / 180);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y, 22 * shadowScale, 9 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();

    const drawY = this.y - this.z;
    ctx.translate(this.x, drawY);
    ctx.scale(this.dir, 1);

    if (this.state === 'dead') {
      ctx.globalAlpha = Math.max(0, this.stateTimer / 40);
      ctx.rotate(Math.PI / 2);
    } else if (this.state === 'hurt' || this.state === 'juggle') {
      ctx.rotate(-0.35);
    }

    const bob = (this.state === 'walk') ? Math.sin(this.animTick * 0.3) * 3 : 0;

    // Barbarian Legs
    ctx.fillStyle = '#451a03';
    ctx.strokeStyle = '#1c0d02';
    ctx.lineWidth = 2.5;
    ctx.fillRect(-10, -20 + bob, 7, 20);
    ctx.fillRect(3, -20 - bob, 7, 20);

    // Torso (Leather Kilt & Belt)
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-14, -50 + bob, 28, 32);
    ctx.strokeRect(-14, -50 + bob, 28, 32);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(-4, -30 + bob, 8, 8); // Belt buckle

    // Head with Horned Helmet
    ctx.fillStyle = '#64748b';
    ctx.beginPath();
    ctx.rect(-16, -84 + bob, 32, 34);
    ctx.fill();
    ctx.stroke();

    // Horns
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    // Left horn
    ctx.beginPath();
    ctx.moveTo(-14, -76 + bob); ctx.lineTo(-26, -96 + bob); ctx.lineTo(-12, -84 + bob);
    ctx.fill(); ctx.stroke();
    // Right horn
    ctx.beginPath();
    ctx.moveTo(14, -76 + bob); ctx.lineTo(26, -96 + bob); ctx.lineTo(12, -84 + bob);
    ctx.fill(); ctx.stroke();

    // Red Glowing Eyes
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-11, -70 + bob, 5, 4);
    ctx.fillRect(6, -70 + bob, 5, 4);

    // Spiked Club
    ctx.save();
    let clubAngle = 0.4;
    if (this.state === 'attack') clubAngle = -1.6;
    ctx.translate(14, -42 + bob);
    ctx.rotate(clubAngle);
    ctx.fillStyle = '#573010';
    ctx.fillRect(-4, -45, 8, 45);
    ctx.strokeRect(-4, -45, 8, 45);
    // Spikes
    ctx.fillStyle = '#cbd5e1';
    [-38, -26, -14].forEach(sy => {
      ctx.fillRect(-9, sy, 5, 4);
      ctx.fillRect(4, sy, 5, 4);
    });
    ctx.restore();

    ctx.restore();
  }
}

export class BarbarianBoss {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.z = 0;
    this.vx = 0;
    this.vy = 0;
    this.name = 'Barbarian Warlord';
    this.hp = 600;
    this.maxHp = 600;
    this.dir = -1;
    this.speed = 1.6;
    this.state = 'idle';
    this.stateTimer = 0;
    this.attackCooldown = 120;
    this.isDead = false;
    this.animTick = 0;
  }

  takeDamage(amount, game, isCrit = false) {
    if (this.isDead) return;
    this.hp -= amount;
    game.particles.addBlood(this.x, this.y - 70, 10);
    game.hud.addDamageNumber(this.x, this.y - 120, amount, isCrit, '#ef4444');
    game.audio.punchHeavy();

    if (this.hp <= 0) {
      this.die(game);
    }
  }

  die(game) {
    this.isDead = true;
    this.state = 'dead';
    game.particles.addBlood(this.x, this.y - 70, 30);
    game.particles.addSpark(this.x, this.y - 70, '#fbbf24', 25);
    game.audio.levelUp();
    game.hud.setMission('VICTORY! WARLORD DEFEATED!', 240);
    for (let i = 0; i < 15; i++) {
      game.items.push(new Item(this.x + (Math.random() - 0.5) * 80, this.y, 'coin', 5));
    }
    game.items.push(new Item(this.x, this.y, 'meat', 50));
  }

  update(player, game) {
    this.animTick++;
    if (this.isDead) return;

    if (this.attackCooldown > 0) this.attackCooldown--;

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);
    this.dir = dx > 0 ? 1 : -1;

    if (dist < 130 && this.attackCooldown <= 0) {
      // Ground Slam
      this.state = 'slam';
      this.attackCooldown = 150;
      game.audio.barbarianRoar();
      setTimeout(() => {
        if (!this.isDead) {
          game.screenShake = 14;
          game.particles.addDust(this.x, this.y);
          game.audio.punchHeavy();
          if (Math.hypot(player.x - this.x, player.y - this.y) < 180) {
            player.takeDamage(28, this.dir, game);
          }
        }
        this.state = 'idle';
      }, 400);
    } else if (dist > 90 && this.state !== 'slam') {
      this.state = 'walk';
      this.x += Math.sign(dx) * this.speed;
      this.y += Math.sign(dy) * (this.speed * 0.6);
      this.y = Math.max(420, Math.min(680, this.y));
    }
  }

  draw(ctx) {
    ctx.save();
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y, 45, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(this.x, this.y);
    ctx.scale(this.dir * 1.5, 1.5);

    if (this.isDead) ctx.rotate(Math.PI / 2);

    const bob = Math.sin(this.animTick * 0.15) * 4;

    // Giant Body
    ctx.fillStyle = '#451a03';
    ctx.strokeStyle = '#1c0d02';
    ctx.lineWidth = 3;
    ctx.fillRect(-22, -75 + bob, 44, 52);
    ctx.strokeRect(-22, -75 + bob, 44, 52);

    // Giant Horned Iron Helmet
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.rect(-24, -120 + bob, 48, 48);
    ctx.fill();
    ctx.stroke();

    // Massive Horns
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.moveTo(-20, -110 + bob); ctx.lineTo(-44, -145 + bob); ctx.lineTo(-18, -122 + bob);
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(20, -110 + bob); ctx.lineTo(44, -145 + bob); ctx.lineTo(18, -122 + bob);
    ctx.fill(); ctx.stroke();

    // Eyes
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-14, -102 + bob, 8, 5);
    ctx.fillRect(8, -102 + bob, 8, 5);

    // Massive Club
    ctx.fillStyle = '#78350f';
    ctx.fillRect(20, -100 + bob, 14, 85);
    ctx.strokeRect(20, -100 + bob, 14, 85);

    ctx.restore();
  }
}

export class Player {
  constructor(x, y, knightId = 1) {
    this.x = x;
    this.y = y;
    this.z = 0;
    this.vx = 0;
    this.vy = 0;
    this.vz = 0;
    this.dir = 1;
    this.speed = 5.4;

    this.hp = 100;
    this.maxHp = 100;
    this.mana = 100;
    this.maxMana = 100;
    this.coins = 0;
    this.xp = 0;
    this.level = 1;

    this.knightId = knightId;
    this.knight = KNIGHTS[knightId];

    this.state = 'idle'; // 'idle', 'walk', 'jump', 'attack1', 'attack2', 'attack3', 'heavy', 'magic', 'shield', 'hurt'
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
      this.knightId = id;
      this.knight = KNIGHTS[id];
    }
  }

  takeDamage(amount, enemyDir, game) {
    if (this.hp <= 0) return;

    if (this.isShielding && enemyDir !== this.dir) {
      amount = Math.max(1, Math.round(amount * 0.1));
      game.particles.addSpark(this.x + this.dir * 20, this.y - 45, '#38bdf8', 10);
      game.audio.punchLight();
    } else {
      this.hp = Math.max(0, this.hp - amount);
      this.hitstun = 12;
      this.state = 'hurt';
      this.stateTimer = 14;
      this.vx = -this.dir * 4.5;
      game.particles.addBlood(this.x, this.y - this.z - 45, 8);
      game.audio.punchHurt();
    }

    game.hud.addDamageNumber(this.x, this.y - this.z - 75, amount, false, '#ef4444');
  }

  attackLight(game) {
    if (this.attackCooldown > 0 || this.state === 'hurt' || this.isShielding) return;

    this.attackCooldown = 13;
    if (this.comboTimer > 0 && this.comboCount < 3) {
      this.comboCount++;
    } else {
      this.comboCount = 1;
    }
    this.comboTimer = 38;

    this.state = `attack${this.comboCount}`;
    this.stateTimer = 15;
    this.vx = this.dir * (this.comboCount === 3 ? 5.5 : 3.0);

    game.audio.punchLight();
    const slashY = this.y - this.z - 45;
    const slashX = this.x + this.dir * 38;
    game.particles.addSlash(slashX, slashY, this.dir, this.knight.lightColor, this.comboCount === 3 ? 1.35 : 1.0);

    const hitRadius = 80;
    const damage = this.comboCount === 3 ? 28 : (this.comboCount === 2 ? 18 : 14);
    const isFinisher = this.comboCount === 3;
    const knockVz = isFinisher ? 12 : (this.z > 0 ? 6 : 0);

    this.checkCombatHits(game, slashX, this.y, hitRadius, damage, isFinisher, knockVz);
  }

  attackHeavy(game) {
    if (this.attackCooldown > 0 || this.state === 'hurt' || this.isShielding) return;

    this.attackCooldown = 26;
    this.state = 'heavy';
    this.stateTimer = 24;

    game.audio.punchHeavy();
    game.particles.addSlash(this.x, this.y - this.z - 45, this.dir, '#f59e0b', 1.6);
    game.particles.addSlash(this.x, this.y - this.z - 45, -this.dir, '#f59e0b', 1.6);

    this.checkCombatHits(game, this.x, this.y, 100, 38, true, 9.5);
  }

  castMagic(game) {
    if (this.mana < 25 || this.state === 'hurt' || this.attackCooldown > 0) return;

    this.mana -= 25;
    this.attackCooldown = 32;
    this.state = 'magic';
    this.stateTimer = 24;

    game.audio.playSfx(this.knight.magicSfx, 1.0);

    if (this.knight.element === 'poison') {
      for (let i = 0; i < 4; i++) {
        setTimeout(() => {
          const mx = this.x + this.dir * (40 + i * 45);
          game.particles.addSpark(mx, this.y - 20, '#22c55e', 14);
          this.checkCombatHits(game, mx, this.y, 65, 24, false, 4, 'poison');
        }, i * 75);
      }
    } else if (this.knight.element === 'lightning') {
      const mx = this.x + this.dir * 115;
      for (let i = 0; i < 15; i++) {
        game.particles.addSpark(mx + (Math.random() - 0.5) * 35, this.y - i * 30, '#ef4444', 5);
      }
      this.checkCombatHits(game, mx, this.y, 95, 42, true, 14, 'lightning');
    } else if (this.knight.element === 'ice') {
      const mx = this.x + this.dir * 105;
      game.particles.addSpark(mx, this.y - 30, '#38bdf8', 22);
      this.checkCombatHits(game, mx, this.y, 90, 32, true, 6, 'ice');
    } else if (this.knight.element === 'fire') {
      const mx = this.x + this.dir * 100;
      game.particles.addSpark(mx, this.y - 30, '#f97316', 24);
      this.checkCombatHits(game, mx, this.y, 95, 40, true, 11, 'fire');
    }
  }

  checkCombatHits(game, hitX, hitY, radius, damage, isCrit = false, knockVz = 0) {
    // Check Dummy
    if (game.dummy) {
      const dist = Math.hypot(game.dummy.x - hitX, game.dummy.y - hitY);
      if (dist < radius) {
        game.dummy.takeDamage(damage, game, isCrit);
        this.addXp(5, game);
      }
    }

    // Check Boss
    if (game.boss && !game.boss.isDead) {
      const dist = Math.hypot(game.boss.x - hitX, game.boss.y - hitY);
      if (dist < radius + 40 && Math.abs(game.boss.y - hitY) < 55) {
        game.boss.takeDamage(damage, game, isCrit);
        this.addXp(25, game);
      }
    }

    // Check Barbarians
    for (const enemy of game.enemies) {
      if (enemy.isDead) continue;
      const dist = Math.hypot(enemy.x - hitX, enemy.y - hitY);
      if (dist < radius && Math.abs(enemy.y - hitY) < 45) {
        enemy.takeDamage(damage, game, this.dir * (isCrit ? 8 : 4.5), knockVz, isCrit);
        this.addXp(15, game);
      }
    }
  }

  addXp(amount, game) {
    this.xp += amount;
    if (this.xp >= 100) {
      this.level++;
      this.xp = 0;
      this.hp = this.maxHp;
      this.mana = this.maxMana;
      game.audio.levelUp();
      game.particles.addSpark(this.x, this.y - 60, '#38bdf8', 30);
      game.hud.addDamageNumber(this.x, this.y - 110, 'LEVEL UP!', true, '#38bdf8');
    }
  }

  update(input, game) {
    this.animTick++;

    if (this.mana < this.maxMana) {
      this.mana = Math.min(this.maxMana, this.mana + 0.28);
    }

    if (this.attackCooldown > 0) this.attackCooldown--;
    if (this.comboTimer > 0) {
      this.comboTimer--;
      if (this.comboTimer <= 0) this.comboCount = 0;
    }

    if (this.hitstun > 0) {
      this.hitstun--;
      this.x += this.vx;
      this.vx *= 0.85;
      return;
    }

    if (this.stateTimer > 0) {
      this.stateTimer--;
      if (this.stateTimer <= 0) {
        this.state = this.z > 0 ? 'jump' : 'idle';
      }
    }

    this.isShielding = input.shield && this.z === 0 && !this.state.startsWith('attack');

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
            game.particles.addDust(this.x, this.y);
          }
        }
      } else if (this.z === 0 && this.state === 'walk') {
        this.state = 'idle';
      }
    } else {
      this.vx *= 0.8;
      this.vy *= 0.8;
    }

    // Jump Physics
    if (input.jump && this.z === 0 && canMove) {
      this.vz = 14.5;
      this.z = 1;
      this.state = 'jump';
      game.audio.playSfx(this.knight.jumpSfx, 0.8);
      game.particles.addDust(this.x, this.y);
    }

    if (this.z > 0 || this.vz > 0) {
      this.z += this.vz;
      this.vz -= 0.72; // Gravity
      if (this.z <= 0) {
        this.z = 0;
        this.vz = 0;
        this.state = (input.left || input.right || input.up || input.down) ? 'walk' : 'idle';
        game.particles.addDust(this.x, this.y);
      }
    }

    this.x += this.vx;
    this.y += this.vy;

    // Boundaries
    this.x = Math.max(60, Math.min(1220, this.x));
    this.y = Math.max(420, Math.min(680, this.y));
  }

  draw(ctx) {
    const k = this.knight;

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
    ctx.fillStyle = k.mainColor;
    ctx.fillRect(-16, -42 + bob, 32, 14);
    ctx.strokeRect(-16, -42 + bob, 32, 14);

    // Bucket Helmet
    ctx.fillStyle = k.mainColor;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.rect(-19, -94 + bob, 38, 40);
    ctx.fill();
    ctx.stroke();

    // Ear Circular Guards
    ctx.fillStyle = k.lightColor;
    ctx.beginPath();
    ctx.arc(-19, -74 + bob, 7, 0, Math.PI * 2);
    ctx.arc(19, -74 + bob, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // White Cross Visor (Dan Paladin Signature)
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.fillRect(-4, -92 + bob, 8, 36);
    ctx.strokeRect(-4, -92 + bob, 8, 36);
    ctx.fillRect(-14, -78 + bob, 28, 9);
    ctx.strokeRect(-14, -78 + bob, 28, 9);

    // Knight Eyes
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-11, -76 + bob, 6, 4);
    ctx.fillRect(5, -76 + bob, 6, 4);

    // Shield (Left Hand)
    ctx.save();
    ctx.translate(-16, -50 + bob);
    if (this.isShielding) {
      ctx.translate(24, 0);
    }
    ctx.fillStyle = k.darkColor;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = k.lightColor;
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
