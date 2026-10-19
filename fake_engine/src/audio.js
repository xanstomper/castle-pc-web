// audio.js — Authentic Castle Crashers Audio Engine
// Manages looping soundtrack streams, combat SFX caching, and spatial audio cues.

export class AudioEngine {
  constructor() {
    this.bgm = null;
    this.bgmTrack = null;
    this.bgmVol = 0.55;
    this.sfxVol = 0.75;
    this.sfxCache = new Map();
    this.unlocked = false;
  }

  unlock() {
    if (this.unlocked) return;
    this.unlocked = true;
    this.playSfx('sounds/PBP_01.wav', 0.2);
  }

  playBgm(trackName) {
    if (this.bgmTrack === trackName && this.bgm && !this.bgm.paused) return;

    if (this.bgm) {
      try { this.bgm.pause(); } catch (e) {}
      this.bgm = null;
    }

    const TRACK_URLS = {
      barracks: 'music/barrackssong.wav',
      siege: 'music/007_FLOODED_CASTLE.wav',
      warpath: 'music/FLUTEY.wav',
      boss: 'music/Waterflame_TheShow.wav',
      select: 'music/CHAMPION.wav',
      victory: 'music/Waterflame_RaceVictory.wav'
    };

    const url = TRACK_URLS[trackName] || trackName;
    if (!url) return;

    try {
      const a = new Audio(url);
      a.loop = trackName !== 'victory';
      a.volume = this.bgmVol;
      a.play().catch(() => {});
      this.bgm = a;
      this.bgmTrack = trackName;
    } catch (e) {}
  }

  stopBgm() {
    if (this.bgm) {
      try { this.bgm.pause(); } catch (e) {}
      this.bgm = null;
      this.bgmTrack = null;
    }
  }

  playSfx(url, volScale = 1.0) {
    if (!url) return;
    try {
      let a = this.sfxCache.get(url);
      if (!a) {
        a = new Audio(url);
        this.sfxCache.set(url, a);
      } else {
        a.currentTime = 0;
      }
      a.volume = Math.max(0, Math.min(1, this.sfxVol * volScale));
      a.play().catch(() => {});
    } catch (e) {}
  }

  // Pre-configured Sound Effect Helpers
  punchLight() { this.playSfx('sounds/sound_meatypunch4.wav', 0.85); }
  punchHeavy() { this.playSfx('sounds/sound_meatypunch8.wav', 1.0); }
  punchHurt() { this.playSfx('sounds/sound_meatypunch7.wav', 0.95); }
  coin() { this.playSfx('sounds/sound_coin1.wav', 0.85); }
  meat() { this.playSfx('sounds/sound_gemhitground.wav', 0.9); }
  levelUp() { this.playSfx('sounds/sound_gemshatter.wav', 1.0); }
  characterSelect() { this.playSfx('sounds/sound_player_select.wav', 0.95); }
  barbarianRoar() {
    const cry = Math.random() > 0.5 ? 'sounds/sound_area_barb1.wav' : 'sounds/sound_area_barb2.wav';
    this.playSfx(cry, 0.7);
  }
}
