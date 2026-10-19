// game.js — Castle Crashers Master Game Engine
// Coordinates 2.5D entities, combat physics, enemy AI, stage transitions, and render loop.

import { AudioEngine } from './audio.js';
import { Hud } from './hud.js';
import { StageManager } from './stages.js';
import { Player, TargetDummy, Barbarian, BarbarianBoss, AnimalOrb, ParticleSystem } from './entities.js';

const CANVAS_W = 1280;
const CANVAS_H = 720;
const FLOOR_TOP = 420;
const FLOOR_BOTTOM = 680;

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    this.audio = new AudioEngine();
    this.hud = new Hud();
    this.stages = new StageManager();
    this.particles = new ParticleSystem();

    this.player = new Player(340, 550, 1);
    this.pet = new AnimalOrb(this.player);
    this.dummy = null;
    this.enemies = [];
    this.boss = null;
    this.items = [];

    this.input = {
      left: false, right: false, up: false, down: false,
      jump: false, light: false, heavy: false, shield: false, magic: false
    };

    this.screenShake = 0;
    this.waveTimer = 0;
    this.waveCount = 1;
    this.running = false;

    this.loadStage(this.stages.getCurrent().id);
  }

  loadStage(stageId) {
    const stage = this.stages.setStage(stageId);
    this.audio.playBgm(stage.bgm);
    this.hud.setMission(stage.mission);

    this.enemies = [];
    this.items = [];
    this.boss = null;
    this.dummy = null;

    if (stage.hasDummy) {
      this.dummy = new TargetDummy(920, 530);
      this.spawnBarbarians(2);
    } else if (stage.bossType === 'warlord') {
      this.boss = new BarbarianBoss(960, 550);
      this.spawnBarbarians(2);
    } else {
      this.spawnBarbarians(stage.id === 'warpath' ? 4 : 3);
    }

    this.particles.addSpark(this.player.x, this.player.y - 50, '#f59e0b', 20);
  }

  spawnBarbarians(count = 3) {
    for (let i = 0; i < count; i++) {
      const x = 750 + Math.random() * 420;
      const y = FLOOR_TOP + Math.random() * (FLOOR_BOTTOM - FLOOR_TOP);
      this.enemies.push(new Barbarian(x, y));
    }
  }

  switchKnight(id) {
    this.player.setKnight(id);
    this.audio.characterSelect();
    this.particles.addSpark(this.player.x, this.player.y - 60, this.player.knight.lightColor, 20);
    this.hud.setMission(`${this.player.knight.name} READY!`);

    document.querySelectorAll('.knight-pill').forEach(p => {
      p.classList.toggle('active', parseInt(p.getAttribute('data-knight'), 10) === id);
    });
  }

  switchStage(targetId = null) {
    const stage = targetId ? this.stages.setStage(targetId) : this.stages.nextStage();
    this.loadStage(stage.id);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.audio.unlock();
    this.audio.playBgm(this.stages.getCurrent().bgm);

    const loop = () => {
      this.update();
      this.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  update() {
    // Gamepad API Polling
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    if (gamepads && gamepads[0]) {
      const gp = gamepads[0];
      const deadzone = 0.35;
      if (Math.abs(gp.axes[0]) > deadzone) this.input.left = gp.axes[0] < -deadzone;
      if (Math.abs(gp.axes[0]) > deadzone) this.input.right = gp.axes[0] > deadzone;
      if (Math.abs(gp.axes[1]) > deadzone) this.input.up = gp.axes[1] < -deadzone;
      if (Math.abs(gp.axes[1]) > deadzone) this.input.down = gp.axes[1] > deadzone;
      if (gp.buttons[0]?.pressed) this.input.jump = true; // A
      if (gp.buttons[2]?.pressed) this.input.light = true; // X
      if (gp.buttons[3]?.pressed) this.input.heavy = true; // Y
      if (gp.buttons[1]?.pressed) this.input.magic = true; // B
      if (gp.buttons[4]?.pressed || gp.buttons[6]?.pressed) this.input.shield = true;
    }

    // Player Update
    this.player.update(this.input, this);
    if (this.pet) this.pet.update();
    if (this.dummy) this.dummy.update();

    // Boss Update
    if (this.boss) {
      this.boss.update(this.player, this);
    }

    // Enemies Update
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.update(this.player, this);
      if (e.isDead && e.stateTimer <= 0) {
        this.enemies.splice(i, 1);
      }
    }

    // Items Update
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      item.update(this.player, this);
      if (item.collected || item.life <= 0) {
        this.items.splice(i, 1);
      }
    }

    // Particle & HUD Update
    this.particles.update();
    this.hud.update();
    this.stages.update();

    // Wave Auto-progression
    this.waveTimer++;
    if (this.enemies.length === 0 && (!this.boss || this.boss.isDead)) {
      if (this.waveTimer > 180) {
        this.waveCount++;
        this.hud.setMission(`WAVE ${this.waveCount} INCOMING!`, 150);
        this.spawnBarbarians(3 + Math.min(3, this.waveCount));
        this.waveTimer = 0;
      }
    }

    // Screen Shake Decay
    if (this.screenShake > 0) {
      this.screenShake *= 0.88;
    }
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

    // 1. Stage Environment
    this.stages.draw(ctx);

    // 2. Y-Sorted Entities (Depth sorting)
    const entities = [this.player];
    if (this.pet) entities.push(this.pet);
    if (this.dummy) entities.push(this.dummy);
    if (this.boss) entities.push(this.boss);
    for (const e of this.enemies) entities.push(e);
    for (const it of this.items) entities.push(it);

    entities.sort((a, b) => a.y - b.y);

    for (const ent of entities) {
      ent.draw(ctx);
    }

    // 3. Particles & Slashes
    this.particles.draw(ctx);

    ctx.restore();

    // 4. Authentic Castle Crashers HUD & Overlays
    this.hud.draw(ctx, this.player, this.stages.getCurrent().name, this.boss);
  }
}
