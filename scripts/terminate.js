import { resetGumballMode } from './gumball.js';
import { stopPinballMode } from './pinball.js';
import {
  closeSongRequest,
  closeYouTubePlayer,
} from './song.js';
import {
  playExplosionSound,
  stopAllSounds,
} from './sound.js';

const terminateScreen =
  document.getElementById('terminateScreen');

const SPACE_TERMINATE_WINDOW = 430;

let lastSpacePress = 0;
let memeShortcutReady = false;

function stopActiveWork() {

  stopPinballMode();
  resetGumballMode();
  closeSongRequest();
  closeYouTubePlayer();
  stopAllSounds();
}

function isTypingTarget(target) {

  return target instanceof HTMLElement &&
    (
      target.isContentEditable ||
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
    );
}

export function terminateProgram(options = {}) {

  const {
    variant = 'default',
  } = options;

  if (variant === 'meme') {
    stopActiveWork();
  }

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

    const now = Date.now();
    const isTyping = isTypingTarget(event.target);

    if (now - lastSpacePress <= SPACE_TERMINATE_WINDOW) {
      lastSpacePress = 0;
      event.preventDefault();
      event.stopPropagation();
      terminateProgram({ variant: 'meme' });
      playExplosionSound();
      return;
    }

    if (!isTyping) {
      event.preventDefault();
      event.stopPropagation();
    }

    lastSpacePress = now;
  }, true);
}
