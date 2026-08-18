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
  deleteMergedPinballMap,
  getPinballMapOptions,
  isMergedPinballMap,
  normalizePinballMap,
  PINBALL_MAPS,
  registerMergedPinballMap,
} from './pinball-maps.js?v=pinball-fork-smooth-fix';

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

const pinballMapMergeButton =
  document.getElementById('pinballMapMergeButton');
const pinballMapDeleteButton =
  document.getElementById('pinballMapDeleteButton');
const pinballMergeOverlay =
  document.getElementById('pinballMergeOverlay');
const pinballMergeClose =
  document.getElementById('pinballMergeClose');
const pinballMergeCountStep =
  document.getElementById('pinballMergeCountStep');
const pinballMergeOrderStep =
  document.getElementById('pinballMergeOrderStep');
const pinballMergeSlotList =
  document.getElementById('pinballMergeSlotList');
const pinballMergeNameInput =
  document.getElementById('pinballMergeNameInput');
const pinballMergeError =
  document.getElementById('pinballMergeError');
const pinballMergeConfirm =
  document.getElementById('pinballMergeConfirm');
const pinballMergeBack =
  document.getElementById('pinballMergeBack');

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

function updatePinballMapDeleteButton() {

  pinballMapDeleteButton.hidden =
    !isMergedPinballMap(pinballMapSelect.value);
}

function refreshPinballMapOptions(selectValue) {

  const keep = selectValue ?? pinballMapSelect.value;

  pinballMapSelect.innerHTML = '';

  getPinballMapOptions().forEach(({ id, label }) => {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = label;
    pinballMapSelect.appendChild(option);
  });

  pinballMapSelect.value = normalizePinballMap(keep);

  updatePinballMapDeleteButton();
}

function deleteSelectedPinballMap() {

  const id = pinballMapSelect.value;

  if (!isMergedPinballMap(id)) return;

  if (!confirm('정말 이 합친 맵을 삭제할까요?')) return;

  deleteMergedPinballMap(id);

  refreshPinballMapOptions('classic');

  pendingPinballMap = pinballMapSelect.value;
}

function openPinballMergeDialog() {

  pinballMergeCountStep.hidden = false;
  pinballMergeOrderStep.hidden = true;
  pinballMergeError.textContent = '';
  pinballMergeNameInput.value = '';
  pinballMergeSlotList.innerHTML = '';

  document
    .querySelectorAll('.pinball-merge-count-button')
    .forEach((button) => button.classList.remove('active'));

  pinballMergeOverlay.classList.add('show');
  pinballMergeOverlay.setAttribute('aria-hidden', 'false');
}

function closePinballMergeDialog() {

  pinballMergeOverlay.classList.remove('show');
  pinballMergeOverlay.setAttribute('aria-hidden', 'true');
}

function renderPinballMergeSlots(count) {

  pinballMergeSlotList.innerHTML = '';

  for (let i = 0; i < count; i++) {

    const row = document.createElement('div');
    row.className = 'pinball-merge-slot';

    const label = document.createElement('span');
    label.className = 'pinball-merge-slot-index';
    label.textContent = `${i + 1}번째`;

    const select = document.createElement('select');
    select.className = 'pinball-merge-slot-select';

    PINBALL_MAPS.forEach((map) => {
      const option = document.createElement('option');
      option.value = map.id;
      option.textContent = map.label;
      select.appendChild(option);
    });

    row.append(label, select);
    pinballMergeSlotList.appendChild(row);
  }

  pinballMergeCountStep.hidden = true;
  pinballMergeOrderStep.hidden = false;
  pinballMergeError.textContent = '';
}

function confirmPinballMerge() {

  const sequence =
    Array.from(
      pinballMergeSlotList.querySelectorAll('.pinball-merge-slot-select')
    ).map((select) => select.value);

  const name = pinballMergeNameInput.value.trim();

  if (!name) {
    pinballMergeError.textContent = '합친 맵 이름을 입력해 주세요.';
    return;
  }

  const newId = registerMergedPinballMap(sequence, name);

  if (!newId) {
    pinballMergeError.textContent = '맵을 2~4개 골라주세요.';
    return;
  }

  refreshPinballMapOptions(newId);
  pendingPinballMap = newId;
  closePinballMergeDialog();
}

function updateAppModeOptions() {

  const locked = isDrawStyleLocked();
  drawStyleSettings.hidden = locked;
  pinballMapSettings.hidden = pendingDrawStyle !== 'pinball';
  pinballMapSelect.value = pendingPinballMap;
  updatePinballMapDeleteButton();

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
    updatePinballMapDeleteButton();
  });

  refreshPinballMapOptions();

  pinballMapMergeButton.addEventListener('click', openPinballMergeDialog);

  pinballMapDeleteButton.addEventListener('click', deleteSelectedPinballMap);

  document
    .querySelectorAll('.pinball-merge-count-button')
    .forEach((button) => {
      button.addEventListener('click', () => {
        document
          .querySelectorAll('.pinball-merge-count-button')
          .forEach((btn) => btn.classList.toggle('active', btn === button));
        renderPinballMergeSlots(Number(button.dataset.mergeCount));
      });
    });

  pinballMergeConfirm.addEventListener('click', confirmPinballMerge);

  pinballMergeBack.addEventListener('click', () => {
    pinballMergeOrderStep.hidden = true;
    pinballMergeCountStep.hidden = false;
  });

  pinballMergeClose.addEventListener('click', closePinballMergeDialog);

  pinballMergeOverlay.addEventListener('click', (event) => {
    if (event.target === pinballMergeOverlay) {
      closePinballMergeDialog();
    }
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
