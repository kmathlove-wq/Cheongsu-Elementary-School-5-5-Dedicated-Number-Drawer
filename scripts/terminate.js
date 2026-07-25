import { resetGumballMode } from './gumball.js?v=large-pools-summary';
import { stopPinballMode } from './pinball.js?v=factory-water-course-fix';
import {
  closeSongRequest,
  closeYouTubePlayer,
} from './song.js';
import {
  playExplosionSound,
  stopAllSounds,
} from './sound.js';
import { setMotionMode } from './motion.js';

const terminateScreen =
  document.getElementById('terminateScreen');
const terminateMemeText =
  document.querySelector('.terminate-meme-text');

const MEME_TERMINATE_WINDOW = 430;
const MEME_TERMINATE_COUNT = 5;

let memeKeyState = { code: '', count: 0, lastPress: 0 };
let memeShortcutReady = false;

function stopActiveWork() {

  document.dispatchEvent(new CustomEvent('app:stop-active-work'));
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
  const isMeme = variant.startsWith('meme');

  if (isMeme) {
    stopActiveWork();
  }

  document.body.classList.add('terminated');
  document.body.classList.toggle(
    'meme-terminated',
    isMeme
  );

  if (terminateMemeText && isMeme) {
    terminateMemeText.textContent =
      '스페이스바가 세계를 멸망시켰습니다';
  }

  if (!isMeme) {
    window.close();
  }

  setTimeout(() => {
    terminateScreen?.classList.add('show');
    terminateScreen?.setAttribute('aria-hidden', 'false');
  }, isMeme ? 0 : 300);
}

function getMemeVariant(code) {

  if (code === 'Space') return 'meme';
  return '';
}

function getSpeedMode(code) {

  if (code === 'ShiftLeft' || code === 'ShiftRight') return 'slow';
  if (code === 'AltLeft' || code === 'AltRight') return 'fast';
  return '';
}

export function setupMemeTerminateShortcut() {

  if (memeShortcutReady) return;

  memeShortcutReady = true;

  document.addEventListener('keydown', (event) => {

    const variant = getMemeVariant(event.code);
    const speedMode = getSpeedMode(event.code);
    if (event.repeat || (!variant && !speedMode)) return;

    const now = Date.now();
    const isTyping = isTypingTarget(event.target);

    if (
      memeKeyState.code === event.code &&
      now - memeKeyState.lastPress <= MEME_TERMINATE_WINDOW
    ) {
      memeKeyState.count++;
    } else {
      memeKeyState = { code: event.code, count: 1, lastPress: now };
    }

    memeKeyState.lastPress = now;

    if (memeKeyState.count >= MEME_TERMINATE_COUNT) {
      memeKeyState = { code: '', count: 0, lastPress: 0 };
      event.preventDefault();
      event.stopPropagation();
      if (speedMode) {
        setMotionMode(speedMode);
      } else {
        terminateProgram({ variant });
        playExplosionSound();
      }
      return;
    }

    if (!isTyping || speedMode) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);
}
