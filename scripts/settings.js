import {
  isSoundEnabled,
  playBumperBeep,
  playDrawTick,
  playGumballDropSound,
  playGumballTurnSound,
  playSound,
  setSoundEnabled,
  setSoundTheme,
} from './sound.js';
import {
  getMotionMode,
  scaleMotionTime,
  setMotionMode,
} from './motion.js';
import {
  normalizePinballMap,
} from './pinball-maps.js?v=regular-pegs-leader-camera';

const appSettingsButton =
  document.getElementById('appSettingsButton');

const appSettingsOverlay =
  document.getElementById('appSettingsOverlay');

const appSettingsClose =
  document.getElementById('appSettingsClose');

const appSettingsApply =
  document.getElementById('appSettingsApply');

const drawStyleSettings =
  document.getElementById('drawStyleSettings');

const soundEnabledInput =
  document.getElementById('soundEnabledInput');

const soundThemeSelect =
  document.getElementById('soundThemeSelect');

const pinballMapSettings =
  document.getElementById('pinballMapSettings');

const pinballMapSelect =
  document.getElementById('pinballMapSelect');

let pendingDrawStyle = 'basic';
let pendingMotionMode = 'normal';
let selectedPinballMap = 'classic';
let pendingPinballMap = 'classic';
let appSettingsRequired = true;
let getCurrentDrawStyle = () => 'basic';
let setCurrentDrawStyle = () => {};
let afterApply = () => {};
let canOpenSettings = () => true;
let isDrawStyleLocked = () => false;
let beforeOpen = () => {};
let beforeApply = () => true;

function updateAppModeOptions() {

  const locked = isDrawStyleLocked();
  drawStyleSettings.hidden = locked;
  pinballMapSettings.hidden = pendingDrawStyle !== 'pinball';
  pinballMapSelect.value = pendingPinballMap;

  document
    .querySelectorAll('.app-mode-option')
    .forEach((button) => {
      button.classList.toggle(
        'active',
        button.dataset.appMode === pendingDrawStyle
      );
      button.disabled = locked;
    });
}

function updateMotionModeOptions() {

  document
    .querySelectorAll('.motion-speed-button')
    .forEach((button) => {
      button.classList.toggle(
        'active',
        button.dataset.motionMode === pendingMotionMode
      );
    });
}

export function isAppSettingsOpen() {

  return appSettingsOverlay.classList.contains('show');
}

export function getPinballMap() {

  return selectedPinballMap;
}

export function openAppSettings({ required = false } = {}) {

  if (!canOpenSettings()) return;

  appSettingsRequired = required;
  pendingDrawStyle = getCurrentDrawStyle();
  pendingMotionMode = getMotionMode();
  pendingPinballMap = selectedPinballMap;
  soundEnabledInput.checked = isSoundEnabled();
  updateAppModeOptions();
  updateMotionModeOptions();
  beforeOpen({ required });

  appSettingsClose.hidden = required;
  appSettingsOverlay.classList.add('show');
  appSettingsOverlay.setAttribute('aria-hidden', 'false');
}

export function closeAppSettings() {

  if (appSettingsRequired) return;

  appSettingsOverlay.classList.remove('show');
  appSettingsOverlay.setAttribute('aria-hidden', 'true');
}

function applyAppSettings() {

  if (beforeApply() === false) return;

  setSoundEnabled(soundEnabledInput.checked);
  setSoundTheme(soundThemeSelect.value);
  setMotionMode(pendingMotionMode, { toggle: false });
  selectedPinballMap =
    normalizePinballMap(pinballMapSelect.value);
  setCurrentDrawStyle(pendingDrawStyle);

  appSettingsOverlay.classList.remove('show');
  appSettingsOverlay.setAttribute('aria-hidden', 'true');
  appSettingsRequired = false;

  afterApply();
}

function previewSound(kind) {

  const restoreEnabled = isSoundEnabled();

  setSoundTheme(soundThemeSelect.value);
  setSoundEnabled(true);

  if (kind === 'gumball') {
    playGumballTurnSound();
    setTimeout(playGumballDropSound, scaleMotionTime(280));
  } else if (kind === 'pinball') {
    playBumperBeep();
    setTimeout(playBumperBeep, scaleMotionTime(120));
    setTimeout(playBumperBeep, scaleMotionTime(240));
  } else {
    playDrawTick();
    playSound();
  }

  setTimeout(() => {
    setSoundEnabled(restoreEnabled);
  }, scaleMotionTime(650));
}

export function setupAppSettings(options) {

  getCurrentDrawStyle = options.getCurrentDrawStyle;
  setCurrentDrawStyle = options.setCurrentDrawStyle;
  afterApply = options.afterApply;
  canOpenSettings = options.canOpenSettings;
  isDrawStyleLocked =
    options.isDrawStyleLocked ||
    (() => false);
  beforeOpen = options.beforeOpen || (() => {});
  beforeApply = options.beforeApply || (() => true);

  document
    .querySelectorAll('.app-mode-option')
    .forEach((button) => {
      button.addEventListener('click', () => {
        if (isDrawStyleLocked()) return;
        pendingDrawStyle = button.dataset.appMode;
        updateAppModeOptions();
      });
    });

  document
    .querySelectorAll('.sound-preview-button')
    .forEach((button) => {
      button.addEventListener('click', () => {
        previewSound(button.dataset.previewSound);
      });
    });

  pinballMapSelect.addEventListener('change', () => {
    pendingPinballMap =
      normalizePinballMap(pinballMapSelect.value);
  });

  document
    .querySelectorAll('.motion-speed-button')
    .forEach((button) => {
      button.addEventListener('click', () => {
        pendingMotionMode = button.dataset.motionMode;
        updateMotionModeOptions();
      });
    });

  appSettingsButton.addEventListener('click', () => {
    openAppSettings();
  });

  appSettingsApply.addEventListener('click', applyAppSettings);
  appSettingsClose.addEventListener('click', closeAppSettings);

  appSettingsOverlay.addEventListener('click', (event) => {
    if (event.target === appSettingsOverlay) {
      closeAppSettings();
    }
  });
}
