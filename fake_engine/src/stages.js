// stages.js — Castle Crashers Stages & Arenas
// Manages Home Castle, Castle Siege, Barbarian Warpath, and Warlord Boss Arenas.

const CANVAS_W = 1280;
const CANVAS_H = 720;
const FLOOR_TOP = 420;

export class StageManager {
  constructor() {
    this.stages = {
      home_castle: {
        id: 'home_castle',
        name: 'Home Castle · Barracks',
        bgm: 'barracks',
        mission: 'TRAIN WITH TARGET DUMMY & PREPARE FOR BATTLE',
        bgImage: new Image(),
        hasDummy: true,
        bossType: null
      },
      castle_siege: {
        id: 'castle_siege',
        name: 'Castle Keep · Under Siege',
        bgm: 'siege',
        mission: 'DEFEND THE KINGDOM! REPEL THE BARBARIAN SIEGE',
        bgImage: null,
        hasDummy: false,
        bossType: null
      },
      warpath: {
        id: 'warpath',
        name: 'Barbarian Warpath · Forest',
        bgm: 'warpath',
        mission: 'STORM THE WARPATH & CRUSH THE BARBARIAN HORDE',
        bgImage: null,
        hasDummy: false,
        bossType: null
      },
      boss_arena: {
        id: 'boss_arena',
        name: 'Barbarian Fortress · Boss Arena',
        bgm: 'boss',
        mission: 'DEFEAT THE BARBARIAN WARLORD BOSS!',
        bgImage: null,
        hasDummy: false,
        bossType: 'warlord'
      }
    };

    // Preload authentic 1280x720 Home Castle Background
    this.stages.home_castle.bgImage.src = 'assets/home_castle_bg.png';

    this.currentId = 'home_castle';
    this.stageList = ['home_castle', 'castle_siege', 'warpath', 'boss_arena'];
    this.siegeTimer = 0;
  }

  getCurrent() {
    return this.stages[this.currentId];
  }

  nextStage() {
    const idx = this.stageList.indexOf(this.currentId);
    const nextIdx = (idx + 1) % this.stageList.length;
    this.currentId = this.stageList[nextIdx];
    return this.getCurrent();
  }

  setStage(id) {
    if (this.stages[id]) {
      this.currentId = id;
    }
    return this.getCurrent();
  }

  update() {
    this.siegeTimer++;
  }

  draw(ctx) {
    const stage = this.getCurrent();

    if (stage.id === 'home_castle') {
      this.drawHomeCastle(ctx, stage);
    } else if (stage.id === 'castle_siege') {
      this.drawCastleSiege(ctx);
    } else if (stage.id === 'warpath') {
      this.drawWarpath(ctx);
    } else if (stage.id === 'boss_arena') {
      this.drawBossArena(ctx);
    }
  }

  drawHomeCastle(ctx, stage) {
    if (stage.bgImage && stage.bgImage.complete && stage.bgImage.naturalWidth > 0) {
      ctx.drawImage(stage.bgImage, 0, 0, CANVAS_W, CANVAS_H);
      return;
    }

    // Procedural Fallback
    ctx.fillStyle = '#2d3748';
    ctx.fillRect(0, 0, CANVAS_W, FLOOR_TOP);
    ctx.strokeStyle = '#1a202c';
    ctx.lineWidth = 3;
    for (let y = 0; y < FLOOR_TOP; y += 38) {
      const offset = ((y / 38) % 2) * 42;
      for (let x = -offset; x < CANVAS_W; x += 84) {
        ctx.strokeRect(x, y, 84, 38);
      }
    }
    ctx.fillStyle = '#92400e';
    ctx.fillRect(0, FLOOR_TOP, CANVAS_W, CANVAS_H - FLOOR_TOP);
  }

  drawCastleSiege(ctx) {
    // Night Burning Sky
    const skyGrad = ctx.createLinearGradient(0, 0, 0, FLOOR_TOP);
    skyGrad.addColorStop(0, '#0f172a');
    skyGrad.addColorStop(0.5, '#7f1d1d');
    skyGrad.addColorStop(1, '#b91c1c');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, CANVAS_W, FLOOR_TOP);

    // Burning Stone Battlements
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, 160, CANVAS_W, FLOOR_TOP - 160);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 4;
    // Battlements Crenellations
    for (let x = 0; x < CANVAS_W; x += 90) {
      ctx.strokeRect(x, 120, 50, 45);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(x, 120, 50, 45);
    }

    // Smoke & Falling Fiery Embers
    for (let i = 0; i < 20; i++) {
      const ex = ((this.siegeTimer * 3 + i * 65) % CANVAS_W);
      const ey = ((this.siegeTimer * 4 + i * 40) % FLOOR_TOP);
      ctx.fillStyle = i % 2 === 0 ? '#f59e0b' : '#ef4444';
      ctx.beginPath();
      ctx.arc(ex, ey, 2.5 + Math.sin(this.siegeTimer * 0.1 + i) * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Ground: Stone Courtyard
    ctx.fillStyle = '#475569';
    ctx.fillRect(0, FLOOR_TOP, CANVAS_W, CANVAS_H - FLOOR_TOP);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    for (let y = FLOOR_TOP; y < CANVAS_H; y += 36) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_W, y); ctx.stroke();
    }
  }

  drawWarpath(ctx) {
    // Sunset Sky Gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, FLOOR_TOP);
    skyGrad.addColorStop(0, '#2e1065');
    skyGrad.addColorStop(0.45, '#7c2d12');
    skyGrad.addColorStop(0.75, '#ea580c');
    skyGrad.addColorStop(1, '#fde047');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, CANVAS_W, FLOOR_TOP);

    // Glowing Sun
    ctx.save();
    ctx.fillStyle = '#fffbeb';
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 40;
    ctx.beginPath();
    ctx.arc(840, FLOOR_TOP - 75, 45, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Mountains
    ctx.fillStyle = '#1e1b4b';
    ctx.beginPath();
    ctx.moveTo(0, FLOOR_TOP);
    ctx.lineTo(0, FLOOR_TOP - 90); ctx.lineTo(180, FLOOR_TOP - 170); ctx.lineTo(380, FLOOR_TOP - 110);
    ctx.lineTo(580, FLOOR_TOP - 190); ctx.lineTo(820, FLOOR_TOP - 100); ctx.lineTo(1040, FLOOR_TOP - 165);
    ctx.lineTo(1280, FLOOR_TOP - 80); ctx.lineTo(1280, FLOOR_TOP);
    ctx.closePath();
    ctx.fill();

    // Pine Trees
    const drawPineTree = (x, baseY, width, height) => {
      ctx.save();
      ctx.fillStyle = '#451a03';
      ctx.fillRect(x - width * 0.08, baseY - height * 0.2, width * 0.16, height * 0.2);
      for (let t = 0; t < 3; t++) {
        const tierY = baseY - height * 0.15 - (t / 3) * height * 0.75;
        const tierW = width * (1 - t * 0.25);
        const tierH = (height / 3) * 1.35;
        ctx.fillStyle = t % 2 === 0 ? '#064e3b' : '#047857';
        ctx.strokeStyle = '#022c22';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(x, tierY - tierH); ctx.lineTo(x + tierW / 2, tierY); ctx.lineTo(x - tierW / 2, tierY);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
      }
      ctx.restore();
    };

    [
      { x: 80, y: FLOOR_TOP, w: 75, h: 140 },
      { x: 220, y: FLOOR_TOP, w: 85, h: 170 },
      { x: 500, y: FLOOR_TOP, w: 90, h: 180 },
      { x: 920, y: FLOOR_TOP, w: 75, h: 150 },
      { x: 1140, y: FLOOR_TOP, w: 85, h: 165 }
    ].forEach(tr => drawPineTree(tr.x, tr.y, tr.w, tr.h));

    // Ground: Grass & Dirt Path
    ctx.fillStyle = '#166534';
    ctx.fillRect(0, FLOOR_TOP, CANVAS_W, CANVAS_H - FLOOR_TOP);

    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.moveTo(0, FLOOR_TOP + 30);
    ctx.bezierCurveTo(400, FLOOR_TOP + 10, 800, FLOOR_TOP + 70, CANVAS_W, FLOOR_TOP + 35);
    ctx.lineTo(CANVAS_W, CANVAS_H); ctx.lineTo(0, CANVAS_H);
    ctx.closePath();
    ctx.fill();
  }

  drawBossArena(ctx) {
    // Blood Moon Twilight Sky
    const skyGrad = ctx.createLinearGradient(0, 0, 0, FLOOR_TOP);
    skyGrad.addColorStop(0, '#1c1917');
    skyGrad.addColorStop(0.5, '#7f1d1d');
    skyGrad.addColorStop(1, '#450a0a');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, CANVAS_W, FLOOR_TOP);

    // Blood Moon
    ctx.save();
    ctx.fillStyle = '#ef4444';
    ctx.shadowColor = '#dc2626';
    ctx.shadowBlur = 50;
    ctx.beginPath();
    ctx.arc(640, FLOOR_TOP - 120, 65, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Barbarian Fortress Gates (Spiked Logs & Skulls)
    ctx.fillStyle = '#451a03';
    ctx.fillRect(200, FLOOR_TOP - 180, 880, 180);
    ctx.strokeStyle = '#1c0d02';
    ctx.lineWidth = 5;
    ctx.strokeRect(200, FLOOR_TOP - 180, 880, 180);

    // Iron Portcullis Spikes
    for (let x = 240; x <= 1040; x += 40) {
      ctx.fillStyle = '#334155';
      ctx.fillRect(x - 6, FLOOR_TOP - 140, 12, 140);
    }

    // Torch Posts with Glowing Fire
    [160, 1120].forEach(tx => {
      ctx.fillStyle = '#78350f';
      ctx.fillRect(tx - 6, FLOOR_TOP - 110, 12, 110);
      ctx.fillStyle = '#f59e0b';
      const flameH = 18 + Math.sin(this.siegeTimer * 0.2 + tx) * 5;
      ctx.beginPath();
      ctx.ellipse(tx, FLOOR_TOP - 120, 10, flameH, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    // Dark Mud Ground
    ctx.fillStyle = '#291e0a';
    ctx.fillRect(0, FLOOR_TOP, CANVAS_W, CANVAS_H - FLOOR_TOP);
  }
}
