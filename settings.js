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

const appSettingsButton =
  document.getElementById('appSettingsButton');

const appSettingsOverlay =
  document.getElementById('appSettingsOverlay');

const appSettingsClose =
  document.getElementById('appSettingsClose');

const appSettingsApply =
  document.getElementById('appSettingsApply');

const soundEnabledInput =
  document.getElementById('soundEnabledInput');

const soundThemeSelect =
  document.getElementById('soundThemeSelect');

let pendingDrawStyle = 'basic';
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

export function isAppSettingsOpen() {

  return appSettingsOverlay.classList.contains('show');
}

export function openAppSettings({ required = false } = {}) {

  if (!canOpenSettings()) return;

  appSettingsRequired = required;
  pendingDrawStyle = getCurrentDrawStyle();
  soundEnabledInput.checked = isSoundEnabled();
  updateAppModeOptions();
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
    setTimeout(playGumballDropSound, 280);
  } else if (kind === 'pinball') {
    playBumperBeep();
    setTimeout(playBumperBeep, 120);
    setTimeout(playBumperBeep, 240);
  } else {
    playDrawTick();
    playSound();
  }

  setTimeout(() => {
    setSoundEnabled(restoreEnabled);
  }, 650);
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
