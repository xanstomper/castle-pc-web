// main.js — Castle Crashers Engine Bootstrap
// Initializes canvas, input routing, UI bindings, and boots the 60 FPS beat-em-up loop.

import { Game } from './game.js';

const canvas = document.getElementById('game-canvas');
const game = new Game(canvas);
window.CC_GAME = game;

// --- Input Routing ---
const onKey = (code, isDown) => {
  game.audio.unlock();
  switch (code) {
    case 'ArrowLeft': case 'KeyA': game.input.left = isDown; break;
    case 'ArrowRight': case 'KeyD': game.input.right = isDown; break;
    case 'ArrowUp': case 'KeyW': game.input.up = isDown; break;
    case 'ArrowDown': case 'KeyS': game.input.down = isDown; break;
    case 'Space': game.input.jump = isDown; break;
    case 'KeyZ':
      if (isDown) game.player.attackLight(game);
      break;
    case 'KeyX':
      if (isDown) game.player.attackHeavy(game);
      break;
    case 'KeyC': case 'ShiftLeft': case 'ShiftRight':
      game.input.shield = isDown;
      break;
    case 'KeyE':
      if (isDown) game.player.castMagic(game);
      break;
    case 'Digit1': if (isDown) game.switchKnight(1); break;
    case 'Digit2': if (isDown) game.switchKnight(2); break;
    case 'Digit3': if (isDown) game.switchKnight(3); break;
    case 'Digit4': if (isDown) game.switchKnight(4); break;
    case 'KeyM': if (isDown) game.switchStage(); break;
  }
};

window.addEventListener('keydown', e => {
  if (e.key === 'h' || e.key === 'H') {
    const modal = document.getElementById('help-modal');
    if (modal) modal.classList.toggle('open');
    return;
  }
  if (e.key === 'f' || e.key === 'F') {
    toggleFullscreen();
    return;
  }
  onKey(e.code, true);
});

window.addEventListener('keyup', e => onKey(e.code, false));

// --- UI Controls & Modal Hooks ---
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
}

const btnStage = document.getElementById('btn-stage');
if (btnStage) btnStage.addEventListener('click', () => game.switchStage());

const btnHelp = document.getElementById('btn-help');
if (btnHelp) btnHelp.addEventListener('click', () => {
  const modal = document.getElementById('help-modal');
  if (modal) modal.classList.toggle('open');
});

const btnCloseHelp = document.getElementById('btn-close-help');
if (btnCloseHelp) btnCloseHelp.addEventListener('click', () => {
  const modal = document.getElementById('help-modal');
  if (modal) modal.classList.remove('open');
});

const btnFs = document.getElementById('btn-fs');
if (btnFs) btnFs.addEventListener('click', toggleFullscreen);

// --- Knight Selection Pills ---
document.querySelectorAll('.knight-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    const id = parseInt(pill.getAttribute('data-knight'), 10);
    game.switchKnight(id);
  });
});

// --- Touch Screen Controls (Mobile) ---
document.querySelectorAll('[data-touch]').forEach(btn => {
  const action = btn.getAttribute('data-touch');
  const start = e => {
    e.preventDefault();
    game.audio.unlock();
    if (action === 'jump') game.input.jump = true;
    else if (action === 'light') game.player.attackLight(game);
    else if (action === 'heavy') game.player.attackHeavy(game);
    else if (action === 'magic') game.player.castMagic(game);
    else game.input[action] = true;
  };
  const end = e => {
    e.preventDefault();
    if (action === 'jump') game.input.jump = false;
    else if (action !== 'light' && action !== 'heavy' && action !== 'magic') {
      game.input[action] = false;
    }
  };

  btn.addEventListener('touchstart', start, { passive: false });
  btn.addEventListener('touchend', end, { passive: false });
  btn.addEventListener('mousedown', start);
  btn.addEventListener('mouseup', end);
});

// --- Boot Screen Routine ---
const bootScreen = document.getElementById('boot-screen');
const bootFill = document.getElementById('boot-progress-fill');
const bootBtn = document.getElementById('boot-play-btn');

let progress = 0;
const iv = setInterval(() => {
  progress = Math.min(96, progress + 14);
  if (bootFill) bootFill.style.width = progress + '%';
}, 60);

const onStart = () => {
  clearInterval(iv);
  if (bootFill) bootFill.style.width = '100%';
  setTimeout(() => {
    if (bootScreen) {
      bootScreen.classList.add('hide');
      setTimeout(() => bootScreen.remove(), 400);
    }
    game.start();
  }, 200);
};

if (bootBtn) {
  bootBtn.addEventListener('click', onStart);
} else {
  onStart();
}
