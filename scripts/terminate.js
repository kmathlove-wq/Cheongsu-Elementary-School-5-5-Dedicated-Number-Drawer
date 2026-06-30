import { playExplosionSound } from './sound.js';

const terminateScreen =
  document.getElementById('terminateScreen');

const SPACE_TERMINATE_WINDOW = 430;

let lastSpacePress = 0;
let memeShortcutReady = false;

export function terminateProgram(options = {}) {

  const {
    variant = 'default',
  } = options;

  document.body.classList.add('terminated');
  document.body.classList.toggle(
    'meme-terminated',
    variant === 'meme'
  );

  if (variant !== 'meme') {
    window.close();
  }

  setTimeout(() => {
    terminateScreen?.classList.add('show');
    terminateScreen?.setAttribute('aria-hidden', 'false');
  }, variant === 'meme' ? 0 : 300);
}

export function setupMemeTerminateShortcut() {

  if (memeShortcutReady) return;

  memeShortcutReady = true;

  document.addEventListener('keydown', (event) => {

    if (event.repeat || event.code !== 'Space') return;

    event.preventDefault();
    event.stopPropagation();

    const now = Date.now();

    if (now - lastSpacePress <= SPACE_TERMINATE_WINDOW) {
      lastSpacePress = 0;
      playExplosionSound();
      terminateProgram({ variant: 'meme' });
      return;
    }

    lastSpacePress = now;
  }, true);
}
