import {
  drawNumbersPinball,
  stopPinballMode,
} from './pinball.js';

import {
  bindGumballHandle,
  drawNumbersGumball,
  resetGumballMode,
  updateGumballPanel,
} from './gumball.js';

import {
  drawManitto, resetManittoMode, setupManittoMode,
} from './manitto.js';

import {
  playBumperBeep,
  playDrawTick,
  playGumballDropSound,
  playGumballTurnSound,
  playSound,
} from './sound.js';

import {
  closeAppSettings,
  isAppSettingsOpen,
  openAppSettings,
  setupAppSettings,
} from './settings.js';

import {
  closeSongRequest,
  closeYouTubePlayer,
  isBlockingDialogOpen as isSongDialogOpen,
  isYouTubePlayerOpen,
  requestSongForResult,
} from './song.js';

import {
  setupMemeTerminateShortcut,
  terminateProgram,
} from './terminate.js';
import { closeMoreModes, setupModeMenu } from './mode-menu.js';

const drawButton = document.getElementById('drawButton');
const resetButton = document.getElementById('resetButton');
const drawCountSelect = document.getElementById('drawCount');
const drawSettings = document.getElementById('drawSettings');
const numberDisplay = document.getElementById('numberDisplay');
const pickedNumbersContainer = document.getElementById('pickedNumbers');
const historyCard = document.querySelector('.history-card');
const numberGrid = document.getElementById('numberGrid');
const bigOverlay = document.getElementById('bigOverlay');
const bigNumber = document.getElementById('bigNumber');
const descriptionEl = document.getElementById('description');
const adminOverlay = document.getElementById('adminOverlay');
const adminCloseButton = document.getElementById('adminCloseButton');
const adminLoginView = document.getElementById('adminLoginView');
const adminManageView = document.getElementById('adminManageView');
const adminLoginForm = document.getElementById('adminLoginForm');
const adminPassword = document.getElementById('adminPassword');
const adminError = document.getElementById('adminError');
const adminModeSelect = document.getElementById('adminModeSelect');
const adminOptions = document.getElementById('adminOptions');
const adminList = document.getElementById('adminList');
const adminAddForm = document.getElementById('adminAddForm');
const adminNewItem = document.getElementById('adminNewItem');
const adminManageError = document.getElementById('adminManageError');
const adminResetButton = document.getElementById('adminResetButton');
const youtubePlayerClose = document.getElementById('youtubePlayerClose');
const manittoSettings = document.getElementById('manittoSettings');
const manittoExcludeList = document.getElementById('manittoExcludeList');

let currentMode = 'basic';
let currentDrawStyle = 'basic';
const modeDrawStyles = { 'pinball-teacher': 'pinball', 'song-pinball': 'pinball', 'eleven-song-pinball': 'pinball' };

const ADMIN_PASSWORD = '1+1=1';
const MOBILE_ADMIN_TAP_WINDOW = 900;
const MOBILE_ADMIN_TAP_COUNT = 3;

let basicModeTapCount = 0;
let lastBasicModeTap = 0;
let gumballHandleReady = false;

const MODE_LABELS = {
  basic: '기본', teacher: '선생님', 'teacher-mystery': '선생님(?)',
  mystery: '???', 'twenty-six': '26번', manitto: '마니또',
  gumball: '공 뽑기', pinball: '핀볼', 'pinball-teacher': '핀볼(선생님)',
  'song-pinball': '노래추첨 핀볼', 'eleven-song-pinball': '11번 노래추첨 핀볼',
};

const baseNumbers =
  Array.from(
    { length: 26 },
    (_, i) => String(i + 1)
  ).filter((n) => n !== '19');

function getTodayNumber() { return String(new Date().getDate()); }

function getMysteryNumbers() {

  const todayNumber = getTodayNumber();
  const numbers = [...baseNumbers];
  if (!numbers.includes(todayNumber)) {
    numbers.push(todayNumber);
  }
  return numbers;
}

const DEFAULT_MODE_POOLS = {
  basic: [...baseNumbers], teacher: ['선생님', ...baseNumbers],
  'teacher-mystery': ['선생님', ...baseNumbers], mystery: getMysteryNumbers(),
  'twenty-six': [...baseNumbers], manitto: [...baseNumbers],
  gumball: [...baseNumbers], pinball: [...baseNumbers],
  'pinball-teacher': ['선생님', ...baseNumbers],
  'song-pinball': [...baseNumbers],
  'eleven-song-pinball': Array.from({ length: 25 }, () => '11'),
};

const DEFAULT_MODE_OPTIONS =
  Object.fromEntries(
    Object.keys(DEFAULT_MODE_POOLS)
      .map((mode) => [
        mode,
        {
          allowDuplicates: false,
          forcedItems: [],
          blockedItems: [],
        },
      ])
  );

let modePools = loadModePools();

let modeOptions = loadModeOptions();

let adminUnlocked = false;

let lastControlPress = 0;

let adminEditingMode = currentMode;

function cloneDefaultModePools() {

  return Object.fromEntries(
    Object.entries(DEFAULT_MODE_POOLS)
      .map(([mode, items]) => [mode, [...items]])
  );
}

function cloneDefaultModeOptions() {

  return Object.fromEntries(
    Object.entries(DEFAULT_MODE_OPTIONS)
      .map(([mode, options]) => [
        mode,
        {
          allowDuplicates: options.allowDuplicates,
          forcedItems: [...options.forcedItems],
          blockedItems: [...options.blockedItems],
        },
      ])
  );
}

function allowDuplicateItems(mode) {
  return isElevenOnlyMode(mode) || modeOptions[mode].allowDuplicates;
}

function isPinballMode(mode) {

  return mode === 'pinball' ||
    mode === 'pinball-teacher' ||
    isSongDrawMode(mode);
}

function isSongDrawMode(mode = currentMode) { return mode === 'song-pinball' || mode === 'eleven-song-pinball'; }

function isElevenOnlyMode(mode = currentMode) { return mode === 'eleven-song-pinball'; }

function isDrawStyleLockedMode(mode = currentMode) {

  return mode === 'basic' ||
    mode === 'manitto' ||
    mode === 'gumball' ||
    mode === 'pinball';
}

function getEffectiveDrawStyle() {

  if (currentMode === 'basic') return 'basic';

  if (currentMode === 'gumball') return 'gumball';

  if (currentMode === 'pinball') return 'pinball';

  if (currentMode === 'manitto') return 'basic';

  return modeDrawStyles[currentMode] || currentDrawStyle;
}

function isGumballMode() { return getEffectiveDrawStyle() === 'gumball'; }

function isPinballDrawStyle() { return getEffectiveDrawStyle() === 'pinball'; }

function isTwentySixMode(mode = currentMode) {
  return mode === 'twenty-six';
}

function isManittoMode(mode = currentMode) {
  return mode === 'manitto';
}

function getStyleForcedItems() {

  const forcedItems =
    [...modeOptions[currentMode].forcedItems];

  if (currentMode === 'teacher-mystery') {

    const teacherEntry =
      remainingEntries.find((entry) =>
        entry.item === '선생님'
      );

    if (teacherEntry &&
        !forcedItems.includes(teacherEntry.key)) {
      forcedItems.unshift(teacherEntry.key);
    }
  }

  if (isTwentySixMode()) {

    const twentySixEntry =
      remainingEntries.find((entry) =>
        entry.item === '26'
      );

    if (twentySixEntry &&
        !forcedItems.includes(twentySixEntry.key)) {
      forcedItems.unshift(twentySixEntry.key);
    }
  }

  return forcedItems;
}

function shouldTerminateSelection(items) {

  return (
    currentMode === 'mystery' &&
    items.includes(getTodayNumber())
  ) || (
    currentMode === 'twenty-six' &&
    items.includes('26')
  );
}

function uniqueItems(items) {

  const seen = new Set();

  return items
    .map((item) => String(item).trim())
    .filter((item) => {
      if (!item || seen.has(item)) return false;
      seen.add(item);
      return true;
    });
}

function normalizeItems(items, allowDuplicates = false) {

  const normalized =
    items
      .map((item) => String(item).trim())
      .filter(Boolean);

  return allowDuplicates
    ? normalized
    : uniqueItems(normalized);
}

function normalizeOptionItems(items, mode) {

  const available =
    new Set(
      (modePools[mode] || [])
        .map((_, index) => String(index))
    );

  return uniqueItems(items)
    .filter((item) => available.has(item));
}

function loadModePools() {

  return cloneDefaultModePools();
}

function loadModeOptions() {

  return cloneDefaultModeOptions();
}

function saveModePools() {

  return true;
}

function resetModePools() {

  modePools = cloneDefaultModePools();

  modeOptions = cloneDefaultModeOptions();

  saveModePools();
}

function compareItems(a, b) {

  if (a === '선생님') return -1;

  if (b === '선생님') return 1;

  const aNum = Number(a);

  const bNum = Number(b);

  if (Number.isFinite(aNum) && Number.isFinite(bNum)) {
    return aNum - bNum;
  }

  if (Number.isFinite(aNum)) return -1;

  if (Number.isFinite(bNum)) return 1;

  return a.localeCompare(b, 'ko');
}

function getResultLabel(item) {

  return Number.isFinite(Number(item))
    ? `${item}번`
    : item;
}

function getDisplayLabel(item, maxLength = 6) {

  const text = String(item);

  if (text === '선생님' || text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength)}...`;
}

function getEntryItem(entry) {

  return typeof entry === 'string'
    ? entry
    : entry.item;
}

function getEntryKey(entry) {

  return typeof entry === 'string'
    ? ''
    : entry.key;
}

function isDefaultModePool(mode) {

  const currentItems = modePools[mode];

  const defaultItems = DEFAULT_MODE_POOLS[mode];
  const options = modeOptions[mode];

  return currentItems.length === defaultItems.length &&
    currentItems.every((item, index) => item === defaultItems[index]) &&
    !options.allowDuplicates &&
    options.forcedItems.length === 0 &&
    options.blockedItems.length === 0;
}

// 모드별 풀 반환 (모두 문자열로 통일)
function getValidEntries(mode = currentMode) {

  return modePools[mode]
    .map((item, index) => ({
      item,
      key: String(index),
    }))
    .sort((a, b) =>
      compareItems(a.item, b.item) ||
      Number(a.key) - Number(b.key)
    );
}

function getValidItems() {

  return getValidEntries()
    .map((entry) => entry.item);
}

function getSortedAdminEntries(mode) {

  return modePools[mode]
    .map((item, index) => ({
      item,
      index,
      key: String(index),
    }))
    .sort((a, b) =>
      compareItems(a.item, b.item) ||
      a.index - b.index
    );
}

function isProtectedBlockedItem(mode, item, index = -1) {

  const isFirstProtectedItem =
    index >= 0 &&
    modePools[mode].findIndex((entry) => entry === item) === index;

  const protectedValue = (
    mode === 'teacher-mystery' &&
    item === '선생님'
  ) || (
    mode === 'mystery' &&
    item === getTodayNumber()
  ) || (
    mode === 'twenty-six' &&
    item === '26'
  );

  return protectedValue && (index < 0 || isFirstProtectedItem);
}

function isProtectedAdminItem(mode, item, index) {

  return isProtectedBlockedItem(mode, item, index);
}

let validEntries = getValidEntries();

let validItems = getValidItems();

let remainingEntries = [...validEntries];

let remainingNumbers = remainingEntries.map((entry) => entry.item);

let pickedNumbers = [];

function buildDrawCountOptions() {

  drawCountSelect.innerHTML = '';

  for (let i = 1; i <= validItems.length; i++) {

    const option =
      document.createElement('option');

    option.value = i;

    option.textContent = `${i}명`;

    drawCountSelect.appendChild(option);
  }
}

buildDrawCountOptions();

function updateModePanels() {

  updateGumballPanel({
    isVisible: isGumballMode(),
    entries: remainingEntries,
    getDisplayLabel,
    numberGrid,
  });

  const manittoMode = isManittoMode();

  drawSettings.classList.toggle('manitto-draw-settings', manittoMode);
  historyCard.hidden = manittoMode;
  drawButton.textContent = manittoMode
    ? '마니또 배정하기'
    : '번호 뽑기';
}

function renderGrid() {

  numberGrid.innerHTML = '';

  validEntries.forEach((entry) => {

    const item = entry.item;

    const cell =
      document.createElement('div');

    cell.className = 'number-cell';

    if (item === '선생님') {
      cell.classList.add('teacher-cell');
    }

    cell.dataset.num = item;

    cell.dataset.key = entry.key;

    cell.title = item;

    cell.textContent = getDisplayLabel(item);

    numberGrid.appendChild(cell);
  });

  updateModePanels();
}

renderGrid();

function updateDescription() {

  if (!isDefaultModePool(currentMode)) {

    const items = getValidItems();

    let text =
      `${MODE_LABELS[currentMode]} 모드: 관리자 설정 항목 ${items.length}개 중 뽑습니다.`;

    if (
      !isManittoMode() &&
      modeOptions[currentMode].forcedItems.length > 0
    ) {
      text += ' 무조건 뽑힘 항목이 적용됩니다.';
    }

    if (
      !isPinballMode(currentMode) &&
      modeOptions[currentMode].blockedItems.length > 0
    ) {
      text += ' 제외 항목은 뽑지 않습니다.';
    }

    if (
      currentMode === 'teacher-mystery' &&
      items.includes('선생님')
    ) {
      text += ' 선생님은 남아있으면 무조건 포함됩니다.';
    }

    if (
      currentMode === 'mystery' &&
      items.includes(getTodayNumber())
    ) {
      text += ` 단, ${getTodayNumber()}번이 나오면...?`;
    }

    if (
      currentMode === 'twenty-six' &&
      items.includes('26')
    ) {
      text += ' 단, 26번이 나오면...?';
    }

    if (isPinballMode(currentMode)) {
      text += ' 핀볼 방식으로 진행됩니다.';
    }

    if (isManittoMode()) {
      text += ' 자기 자신을 제외하고 서로 한 명씩 비밀 친구를 배정합니다.';
    }

    descriptionEl.textContent = text;

    return;
  }

  if (currentMode === 'basic') {

    descriptionEl.textContent =
      '1번부터 26번까지 중 랜덤 번호를 뽑습니다. 19번은 제외됩니다.';

  } else if (currentMode === 'teacher') {

    descriptionEl.textContent =
      '선생님 + 1번~26번 중 랜덤으로 뽑습니다. 19번은 제외됩니다.';

  } else if (currentMode === 'teacher-mystery') {

    descriptionEl.textContent =
      '선생님 + 1번~26번 중 뽑습니다. 19번 제외. 선생님에겐 조금 특별한 무언가가 있을지도...?';

  } else if (currentMode === 'twenty-six') {
    descriptionEl.textContent =
      '1번~26번 중 뽑습니다. 19번 제외. 26번에겐 조금 특별한 무언가가 있을지도...? 그리고, 26번이 나오면...?';

  } else if (currentMode === 'manitto') {
    descriptionEl.textContent =
      '마니또 모드: 자기 자신이 나오지 않도록 전체를 섞어 서로 한 명씩 비밀 친구를 배정합니다.';

  } else if (currentMode === 'gumball') {
    descriptionEl.textContent =
      '공 뽑기 모드: 통 안의 공들이 돌아가다가 무작위로 하나가 나옵니다.';

  } else if (currentMode === 'pinball') {
    descriptionEl.textContent =
      '핀볼! 공이 번호 범퍼를 튕기다가 선택된 번호가 뽑힙니다.';

  } else if (currentMode === 'pinball-teacher') {
    descriptionEl.textContent =
      '핀볼(선생님) 모드: 선생님 공 포함! 선생님이 당첨될 수도?';

  } else if (currentMode === 'song-pinball') {
    descriptionEl.textContent =
      '노래추첨 핀볼 모드: 당첨 번호가 듣고 싶은 노래를 입력하면 YouTube에서 찾아 재생합니다.';

  } else if (currentMode === 'eleven-song-pinball') {
    descriptionEl.textContent =
      '11번 노래추첨 핀볼 모드: 모든 항목이 11번이며, 11번이 듣고 싶은 노래를 찾아 재생합니다.';

  } else {
    descriptionEl.textContent =
      `1번~26번 중 랜덤 번호를 뽑습니다. 19번 제외. 단, ${getTodayNumber()}번이 나오면...?`;
  }
}

function switchMode(mode) {

  if (isBlockingDialogOpen()) return;

  closeMoreModes();

  currentMode = mode;

  document
    .querySelectorAll('.mode-btn')
    .forEach((btn) => {
      btn.classList.toggle(
        'active',
        btn.dataset.mode === mode
      );
    });

  updateDescription();

  resetDraw();
}

function handleBasicModeAdminTap() {

  if (window.matchMedia('(pointer: coarse)').matches === false) {
    return;
  }

  if (isBlockingDialogOpen() || isYouTubePlayerOpen()) return;

  const now = Date.now();

  if (now - lastBasicModeTap > MOBILE_ADMIN_TAP_WINDOW) {
    basicModeTapCount = 0;
  }

  basicModeTapCount += 1;
  lastBasicModeTap = now;

  if (basicModeTapCount >= MOBILE_ADMIN_TAP_COUNT) {
    basicModeTapCount = 0;
    lastBasicModeTap = 0;
    openAdminMode();
  }
}

function updatePickedNumbers() {

  if (pickedNumbers.length === 0) {

    pickedNumbersContainer.textContent =
      '아직 뽑은 번호가 없습니다.';

    return;
  }

  pickedNumbersContainer.innerHTML = '';

  pickedNumbers.forEach((num) => {

    const tag =
      document.createElement('span');

    tag.textContent = num;

    pickedNumbersContainer.appendChild(tag);
  });
}

function renderManittoSettings() {
  const manittoMode = isManittoMode();
  manittoSettings.hidden = !manittoMode;
  manittoExcludeList.innerHTML = '';
  if (!manittoMode) return;
  const blocked = new Set(modeOptions.manitto.blockedItems);
  getSortedAdminEntries('manitto').forEach(({ item, key }) => {
    const label = document.createElement('label');
    label.className = 'manitto-exclude-item';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.dataset.key = key;
    input.checked = blocked.has(key);
    label.append(input, getResultLabel(item));
    manittoExcludeList.appendChild(label);
  });
}

function saveManittoSettings() {
  if (!isManittoMode()) return true;
  modeOptions.manitto.blockedItems =
    Array.from(
      manittoExcludeList.querySelectorAll('input:checked')
    ).map((input) => input.dataset.key);
  modeOptions.manitto.forcedItems = [];
  syncModeOptions('manitto');
  saveModePools();
  return true;
}

function setAdminManageError(message) {

  adminManageError.textContent = message;
}

function isBlockingDialogOpen() {

  return isAppSettingsOpen() ||
    adminOverlay.classList.contains('show') ||
    isSongDialogOpen();
}

function openAdminMode() {

  if (isYouTubePlayerOpen()) return;

  adminOverlay.classList.add('show');

  adminOverlay.setAttribute('aria-hidden', 'false');

  adminError.textContent = '';

  setAdminManageError('');

  if (adminUnlocked) {
    showAdminManageView();
    return;
  }

  adminLoginView.hidden = false;

  adminManageView.hidden = true;

  adminPassword.value = '';

  setTimeout(() => adminPassword.focus(), 0);
}

function closeAdminMode() {

  if (
    !adminManageView.hidden &&
    !saveAdminListInputs(adminEditingMode)
  ) {
    return;
  }

  adminOverlay.classList.remove('show');

  adminOverlay.setAttribute('aria-hidden', 'true');
}

function showAdminManageView() {

  adminLoginView.hidden = true;

  adminManageView.hidden = false;

  renderAdminModeOptions();

  renderAdminOptions();

  renderAdminList();
}

function renderAdminModeOptions() {

  const prev =
    adminModeSelect.value || currentMode;

  adminModeSelect.innerHTML = '';

  Object.keys(DEFAULT_MODE_POOLS).forEach((mode) => {

    const option =
      document.createElement('option');

    option.value = mode;

    option.textContent = MODE_LABELS[mode];

    adminModeSelect.appendChild(option);
  });

  adminModeSelect.value =
    modePools[prev] ? prev : currentMode;
}

function renderAdminList() {

  const mode = adminModeSelect.value;

  const items = modePools[mode];
  const options = modeOptions[mode];
  const forced = new Set(options.forcedItems);
  const blocked = new Set(options.blockedItems);
  const pinballMode = isPinballMode(mode);
  const manittoMode = isManittoMode(mode);

  adminEditingMode = mode;

  adminList.innerHTML = '';

  getSortedAdminEntries(mode).forEach(({ item, index, key }) => {

    const row =
      document.createElement('div');

    row.className = 'admin-row';

    row.dataset.key = key;

    const input =
      document.createElement('input');

    input.type = 'text';

    input.maxLength = 20;

    input.value = item;

    input.className = 'admin-item-input';

    const protectedAdmin =
      isProtectedAdminItem(mode, item, index);

    input.disabled = protectedAdmin;

    if (protectedAdmin) {
      input.title = '이 항목은 수정하거나 삭제할 수 없습니다.';
    }

    const forcedLabel =
      document.createElement('label');

    forcedLabel.className = 'admin-flag';

    const forcedInput =
      document.createElement('input');

    forcedInput.type = 'checkbox';

    forcedInput.className = 'admin-force-input';

    forcedInput.checked = forced.has(key);
    forcedInput.disabled = manittoMode;

    forcedLabel.append(forcedInput, '무조건');

    if (manittoMode) {
      forcedLabel.hidden = true;
    }

    const blockedLabel =
      document.createElement('label');

    blockedLabel.className = 'admin-flag';

    const blockedInput =
      document.createElement('input');

    blockedInput.type = 'checkbox';

    blockedInput.className = 'admin-block-input';

    const protectedBlocked =
      isProtectedBlockedItem(mode, item, index);

    blockedInput.checked =
      blocked.has(key) && !protectedBlocked;

    blockedInput.disabled =
      pinballMode || protectedBlocked;

    blockedLabel.append(blockedInput, '제외');

    if (pinballMode) {
      blockedLabel.hidden = true;
    }

    if (protectedBlocked) {
      blockedLabel.title = '이 항목은 제외할 수 없습니다.';
    }

    forcedInput.addEventListener('change', () => {
      if (forcedInput.checked) {
        blockedInput.checked = false;
      }
      saveAdminListInputs(mode);
    });

    blockedInput.addEventListener('change', () => {
      if (blockedInput.checked) {
        forcedInput.checked = false;
      }
      saveAdminListInputs(mode);
    });

    const deleteButton =
      document.createElement('button');

    deleteButton.type = 'button';

    deleteButton.className = 'danger';

    deleteButton.textContent = '삭제';

    deleteButton.disabled =
      items.length <= 1 || protectedAdmin;

    if (protectedAdmin) {
      deleteButton.title = '이 항목은 삭제할 수 없습니다.';
    }

    deleteButton.addEventListener('click', () => {
      deleteAdminItem(index);
    });

    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        renameAdminItem(index, input.value);
      }
    });

    input.addEventListener('change', () => {
      saveAdminListInputs(mode);
    });

    row.append(
      input,
      forcedLabel,
      blockedLabel,
      deleteButton
    );

    adminList.appendChild(row);
  });
}

function renderAdminOptions() {

  const mode = adminModeSelect.value;

  adminOptions.innerHTML = '';

  if (isElevenOnlyMode(mode)) return;

  const duplicateLabel =
    document.createElement('label');

  duplicateLabel.className = 'admin-option';

  const duplicateInput =
    document.createElement('input');

  duplicateInput.type = 'checkbox';

  duplicateInput.checked = modeOptions[mode].allowDuplicates;

  duplicateInput.addEventListener('change', () => {

    if (!saveAdminListInputs(adminEditingMode)) {
      duplicateInput.checked =
        modeOptions[mode].allowDuplicates;
      return;
    }

    modeOptions[mode].allowDuplicates = duplicateInput.checked;

    modePools[mode] =
      normalizeItems(
        modePools[mode],
        modeOptions[mode].allowDuplicates
      );

    syncModeOptions(mode);

    commitAdminPoolChange(mode);
  });

  duplicateLabel.append(duplicateInput, '중복 허용');

  adminOptions.appendChild(duplicateLabel);
}

function getAdminListRows() {

  return Array.from(
    adminList.querySelectorAll('.admin-row')
  ).map((row) => ({
    key: row.dataset.key,
    item: row.querySelector('.admin-item-input').value.trim(),
    forced: row.querySelector('.admin-force-input').checked,
    blocked:
      row.querySelector('.admin-block-input')?.checked || false,
  }));
}

function validateAdminItems(items, mode) {

  if (items.length === 0) {
    return '각 모드에는 최소 1개 항목이 필요합니다.';
  }

  const seen = new Set();
  const allowDuplicates = allowDuplicateItems(mode);

  for (const item of items) {

    if (!item) {
      return '빈 값으로 변경할 수 없습니다.';
    }

    if (isElevenOnlyMode(mode) && item !== '11') {
      return '이 모드에는 11번만 넣을 수 있습니다.';
    }

    if (!allowDuplicates && seen.has(item)) {
      return '이미 있는 값입니다.';
    }

    seen.add(item);
  }

  return '';
}

function syncModeOptions(mode) {

  modeOptions[mode].forcedItems =
    isManittoMode(mode)
      ? []
      : normalizeOptionItems(
        modeOptions[mode].forcedItems,
        mode
      );

  modeOptions[mode].blockedItems =
    isPinballMode(mode)
      ? []
      : normalizeOptionItems(
        modeOptions[mode].blockedItems,
        mode
      ).filter((key) =>
        !modeOptions[mode].forcedItems.includes(key) &&
        !isProtectedBlockedItem(
          mode,
          modePools[mode][Number(key)],
          Number(key)
        )
      );
}

function removeOptionIndex(mode, removedIndex) {

  const shiftKeys = (keys) =>
    keys
      .map((key) => Number(key))
      .filter((index) => Number.isFinite(index))
      .filter((index) => index !== removedIndex)
      .map((index) =>
        index > removedIndex
          ? String(index - 1)
          : String(index)
      );

  modeOptions[mode].forcedItems =
    shiftKeys(modeOptions[mode].forcedItems);

  modeOptions[mode].blockedItems =
    shiftKeys(modeOptions[mode].blockedItems);
}

function saveAdminListInputs(mode) {

  if (!mode || !modePools[mode]) {
    return true;
  }

  const rows = getAdminListRows();

  const items = [...modePools[mode]];

  for (const row of rows) {

    const index = Number(row.key);

    if (Number.isInteger(index) && index >= 0) {
      const currentItem = modePools[mode][index];

      if (
        isProtectedAdminItem(mode, currentItem, index) &&
        row.item !== currentItem
      ) {
        setAdminManageError(
          '이 항목은 수정하거나 삭제할 수 없습니다.'
        );
        return false;
      }

      items[index] = row.item;
    }
  }

  const error = validateAdminItems(items, mode);

  if (error) {
    setAdminManageError(error);
    return false;
  }

  const changed =
    items.length !== modePools[mode].length ||
    items.some((item, index) => item !== modePools[mode][index]);

  const forcedItems =
    uniqueItems(
      rows
        .filter((row) => row.forced)
        .map((row) => row.key)
    );

  const blockedItems =
    isPinballMode(mode)
      ? []
      : uniqueItems(
        rows
          .filter((row) =>
            row.blocked &&
            !row.forced &&
            !isProtectedBlockedItem(
              mode,
              row.item,
              Number(row.key)
            )
          )
          .map((row) => row.key)
      );

  const optionsChanged =
    forcedItems.join('\n') !==
      modeOptions[mode].forcedItems.join('\n') ||
    blockedItems.join('\n') !==
      modeOptions[mode].blockedItems.join('\n');

  if (!changed && !optionsChanged) {
    return true;
  }

  modePools[mode] = items;

  modeOptions[mode].forcedItems = forcedItems;

  modeOptions[mode].blockedItems = blockedItems;

  syncModeOptions(mode);

  saveModePools();

  if (mode === currentMode) {
    resetDraw({ force: true });
  }

  setAdminManageError('적용되었습니다.');

  return true;
}

function commitAdminPoolChange(mode) {

  modePools[mode] =
    normalizeItems(
      modePools[mode],
      allowDuplicateItems(mode)
    );

  syncModeOptions(mode);

  saveModePools();

  renderAdminOptions();

  renderAdminList();

  if (mode === currentMode) {
    resetDraw({ force: true });
  }

  setAdminManageError('적용되었습니다.');
}

function addAdminItem(value) {

  const mode = adminModeSelect.value;

  const item = value.trim();

  if (!item) {
    setAdminManageError('추가할 값을 입력해 주세요.');
    return;
  }

  if (isElevenOnlyMode(mode) && item !== '11') {
    setAdminManageError('이 모드에는 11번만 추가할 수 있습니다.');
    return;
  }

  if (
    !allowDuplicateItems(mode) &&
    modePools[mode].includes(item)
  ) {
    setAdminManageError('이미 있는 값입니다.');
    return;
  }

  modePools[mode].push(item);

  adminNewItem.value = '';

  setAdminManageError('');

  commitAdminPoolChange(mode);
}

function renameAdminItem(index, value) {

  const mode = adminModeSelect.value;

  if (isProtectedAdminItem(mode, modePools[mode][index], index)) {
    setAdminManageError('이 항목은 수정할 수 없습니다.');
    renderAdminList();
    return;
  }

  const item = value.trim();

  if (!item) {
    setAdminManageError('빈 값으로 변경할 수 없습니다.');
    return;
  }

  if (isElevenOnlyMode(mode) && item !== '11') {
    setAdminManageError('이 모드에는 11번만 넣을 수 있습니다.');
    renderAdminList();
    return;
  }

  const duplicateIndex =
    modePools[mode].findIndex((entry) => entry === item);

  if (
    !allowDuplicateItems(mode) &&
    duplicateIndex !== -1 &&
    duplicateIndex !== index
  ) {
    setAdminManageError('이미 있는 값입니다.');
    return;
  }

  modePools[mode][index] = item;

  setAdminManageError('');

  commitAdminPoolChange(mode);
}

function deleteAdminItem(index) {

  const mode = adminModeSelect.value;

  if (isProtectedAdminItem(mode, modePools[mode][index], index)) {
    setAdminManageError('이 항목은 삭제할 수 없습니다.');
    return;
  }

  if (modePools[mode].length <= 1) {
    setAdminManageError('각 모드에는 최소 1개 항목이 필요합니다.');
    return;
  }

  modePools[mode].splice(index, 1);

  removeOptionIndex(mode, index);

  setAdminManageError('');

  commitAdminPoolChange(mode);
}

// 글자 길이에 따라 자동 크기 조절
function adjustFontSize(text) {

  const length = text.length;

  if (length <= 10) {
    return '5rem';
  }

  if (length <= 20) {
    return '4rem';
  }

  if (length <= 35) {
    return '3rem';
  }

  if (length <= 55) {
    return '2.2rem';
  }

  return '1.5rem';
}

function showPinballResult(selected) {

  const resultText =
    selected
      .map((entry) => getEntryItem(entry))
      .join(', ');

  numberDisplay.textContent = resultText;

  numberDisplay.style.fontSize =
    adjustFontSize(resultText);

  numberDisplay.classList.remove(
    'placeholder', 'notice'
  );

  bigNumber.textContent = resultText;

  bigNumber.style.fontSize =
    adjustFontSize(resultText);

  bigOverlay.classList.add('show');

  updatePickedNumbers();

  playSound();
}

function drawNumbers() {

  if (isBlockingDialogOpen()) return;

  if (isManittoMode()) {
    drawManitto({
      entries: remainingEntries, numberDisplay, drawButton,
      blockedItems: modeOptions[currentMode].blockedItems, getDisplayLabel,
    });
    return;
  }

  if (isGumballMode()) {

    if (!gumballHandleReady) {
      numberDisplay.textContent =
        '손잡이를 길게 눌러 한 바퀴 돌려주세요';
      numberDisplay.classList.remove('placeholder');
      numberDisplay.classList.add('notice');
      return;
    }

    gumballHandleReady = false;

    drawNumbersGumball({
      remainingEntries,
      options: {
        ...modeOptions[currentMode],
        forcedItems: getStyleForcedItems(),
      },
      drawCountSelect,
      drawButton,
      numberDisplay,
      bigNumber,
      bigOverlay,
      getDisplayLabel,
      adjustFontSize,
      compareItems,
      isGumballMode,
      removeEntry(entry) {
        const idx =
          remainingEntries.findIndex((remaining) =>
            remaining.key === entry.key
          );

        if (idx !== -1) {
          remainingEntries.splice(idx, 1);
          remainingNumbers =
            remainingEntries.map((remaining) => remaining.item);
        }
      },
      addPickedNumbers(items) {
        pickedNumbers.push(...items);
      },
      updatePickedNumbers,
      terminateProgram,
      shouldTerminate: shouldTerminateSelection,
      beforeShowResult(entries) {
        if (!isSongDrawMode()) {
          return Promise.resolve();
        }

        return requestSongForResult(entries, {
          getEntryItem,
          getResultLabel,
        });
      },
      playFinalSound: playSound,
      playTurnSound: playGumballTurnSound,
      playDropSound: playGumballDropSound,
    });
    return;
  }

  if (isPinballDrawStyle()) {
    drawNumbersPinball({
      remainingEntries,
      drawCountSelect,
      numberDisplay,
      drawButton,
      compareItems,
      getResultLabel,
      getDisplayLabel,
      playBumperBeep,
      forcedItems: getStyleForcedItems(),
      applyPinballResult,
    });
    return;
  }

  const options = modeOptions[currentMode];

  const blocked = new Set(options.blockedItems);

  const sourceEntries = remainingEntries;

  const eligibleEntries =
    sourceEntries.filter((entry) => !blocked.has(entry.key));

  if (sourceEntries.length === 0) {

    numberDisplay.textContent =
      '모든 번호를 이미 뽑았습니다!';

    numberDisplay.classList.remove(
      'placeholder'
    );

    numberDisplay.classList.add('notice');

    return;
  }

  const count =
    Math.min(
      Number(drawCountSelect.value),
      eligibleEntries.length
    );

  if (eligibleEntries.length === 0 ||
      count > eligibleEntries.length) {
    terminateProgram();
    return;
  }

  drawButton.disabled = true;

  const cells =
    Array.from(
      document.querySelectorAll('.number-cell')
    );

  let prev = null;

  let stepCount = 0;

  const interval = setInterval(() => {

    if (prev) {
      prev.classList.remove('spark');
    }

    // dataset.num은 항상 문자열이므로 문자열로 비교
    const availableCells =
      cells.filter((cell) =>
        eligibleEntries.some((entry) =>
          entry.key === cell.dataset.key
        )
      );

    const randomCell =
      availableCells[
        Math.floor(
          Math.random() *
          availableCells.length
        )
      ];

    if (randomCell) {

      randomCell.classList.add('spark');

      prev = randomCell;

      if (stepCount % 4 === 0) {
        playDrawTick();
      }
    }

    stepCount++;

    if (stepCount >= 22) {

      clearInterval(interval);

      if (prev) {
        prev.classList.remove('spark');
      }

      const selected = [];
      const selectedEntries = [];
      const selectedForHistory = [];
      const selectedSet = new Set();

      const pickEntry = (entry) => {

        const picked = entry.item;

        selected.push(picked);
        selectedEntries.push(entry);
        selectedForHistory.push(picked);
        selectedSet.add(entry.key);

        const idx =
          remainingEntries.findIndex((remaining) =>
            remaining.key === entry.key
          );

        if (idx !== -1) {
          remainingEntries.splice(idx, 1);
          remainingNumbers =
            remainingEntries.map((remaining) => remaining.item);
        }

        const pickedCell =
          cells.find(
            (cell) => cell.dataset.key === entry.key
          );

        if (pickedCell) {
          pickedCell.classList.add('picked');
        }
      };

      // 선생님(?) 모드: 선생님이 남아있으면 무조건 첫 번째로 추출
      if (
        currentMode === 'teacher-mystery' &&
        selected.length < count
      ) {

        const teacherEntry =
          sourceEntries.find((entry) =>
            entry.item === '선생님' &&
            !blocked.has(entry.key)
          );

        if (teacherEntry) {
          pickEntry(teacherEntry);
        }
      }

      if (
        isTwentySixMode() &&
        selected.length < count
      ) {

        const twentySixEntry =
          sourceEntries.find((entry) =>
            entry.item === '26' &&
            !blocked.has(entry.key)
          );

        if (twentySixEntry) {
          pickEntry(twentySixEntry);
        }
      }

      for (const forcedKey of options.forcedItems) {

        const forcedEntry =
          sourceEntries.find((entry) =>
            entry.key === forcedKey
          );

        if (
          selected.length >= count ||
          !forcedEntry ||
          blocked.has(forcedEntry.key) ||
          selectedSet.has(forcedEntry.key)
        ) {
          continue;
        }

        pickEntry(forcedEntry);
      }

      while (selected.length < count) {

        const drawPool =
          remainingEntries.filter((entry) =>
            !blocked.has(entry.key) &&
            !selectedSet.has(entry.key)
          );

        if (drawPool.length === 0) {
          terminateProgram();
          return;
        }

        const pickedEntry =
          drawPool[
            Math.floor(
              Math.random() *
              drawPool.length
            )
          ];

        pickEntry(pickedEntry);
      }

      pickedNumbers.push(...selectedForHistory);

      if (
        selectedEntries.some((entry) => blocked.has(entry.key))
      ) {
        terminateProgram();
        return;
      }

      const shouldTerminate =
        (
          currentMode === 'mystery' &&
          selected.includes(getTodayNumber())
        ) ||
        (currentMode === 'twenty-six' && selected.includes('26'));

      if (shouldTerminate) {
        terminateProgram();
        return;
      }

      selected.sort(compareItems);

      const resultText = selected.join(', ');

      const showResult = () => {

        numberDisplay.textContent = resultText;

        numberDisplay.style.fontSize =
          adjustFontSize(resultText);

        numberDisplay.classList.remove(
          'placeholder',
          'notice'
        );

        bigNumber.textContent = resultText;

        bigNumber.style.fontSize =
          adjustFontSize(resultText);

        bigOverlay.classList.add('show');

        updatePickedNumbers();

        playSound();

        drawButton.disabled = false;
      };

      if (isSongDrawMode()) {
        requestSongForResult(selectedEntries, {
          getEntryItem,
          getResultLabel,
        }).then(showResult);
        return;
      }

      showResult();
    }

  }, 140);
}

function applyPinballResult(selected) {

  const selectedItems =
    selected.map((entry) => getEntryItem(entry));

  if (shouldTerminateSelection(selectedItems)) {
    terminateProgram();
    return;
  }

  for (const entry of selected) {

    const num = getEntryItem(entry);
    const key = getEntryKey(entry);

    const idx =
      remainingEntries.findIndex((remaining) =>
        remaining.key === key
      );

    if (idx !== -1) {
      remainingEntries.splice(idx, 1);
      remainingNumbers =
        remainingEntries.map((remaining) => remaining.item);
    }

    pickedNumbers.push(num);
  }

  const cells = Array.from(
    document.querySelectorAll('.number-cell')
  );

  for (const num of selected) {

    const key = getEntryKey(num);
    const item = getEntryItem(num);

    const cell =
      cells.find(c =>
        key
          ? c.dataset.key === key
          : c.dataset.num === item
      );

    if (cell) {
      cell.classList.add('picked');
    }
  }

  if (isSongDrawMode()) {
    requestSongForResult(selected, {
      getEntryItem,
      getResultLabel,
    })
      .then(() => {
        showPinballResult(selected);
      });
    return;
  }

  showPinballResult(selected);
}

function resetDraw(options = {}) {

  if (!options.force && isBlockingDialogOpen()) return;

  stopPinballMode();

  closeSongRequest();

  resetGumballMode();
  resetManittoMode();
  gumballHandleReady = false;

  validEntries = getValidEntries();

  validItems = validEntries.map((entry) => entry.item);

  remainingEntries = [...validEntries];

  remainingNumbers =
    remainingEntries.map((entry) => entry.item);

  pickedNumbers = [];

  updateDescription();

  buildDrawCountOptions();

  renderGrid();

  numberDisplay.textContent =
    '뽑기 버튼을 눌러주세요';

  numberDisplay.style.fontSize = '';

  bigNumber.style.fontSize = '';

  numberDisplay.classList.add('placeholder');

  numberDisplay.classList.remove('notice');

  bigOverlay.classList.remove('show');

  drawButton.disabled = false;

  updatePickedNumbers();
}

setupModeMenu({
  onModeClick: switchMode,
  onBasicTap: handleBasicModeAdminTap,
});

bindGumballHandle({
  canDraw: () =>
    isGumballMode() &&
    !drawButton.disabled,
  onDraw: () => {
    gumballHandleReady = true;
    drawButton.click();
  },
});

drawButton.addEventListener(
  'click',
  drawNumbers
);

resetButton.addEventListener(
  'click',
  resetDraw
);

document.addEventListener('keydown', (event) => {

  if (event.key === 'Control' && !event.repeat) {

    const now = Date.now();

    if (now - lastControlPress <= 450) {
      lastControlPress = 0;
      if (!isBlockingDialogOpen()) {
        openAdminMode();
      }
    } else {
      lastControlPress = now;
    }
  }

  if (event.key === 'Escape' &&
      adminOverlay.classList.contains('show')) {
    closeAdminMode();
  }

  if (event.key === 'Escape' &&
      isAppSettingsOpen()) {
    closeAppSettings();
  }

  if (event.key === 'Escape') {
    closeMoreModes();
  }

});

adminLoginForm.addEventListener('submit', (event) => {

  event.preventDefault();

  if (adminPassword.value === ADMIN_PASSWORD) {
    adminUnlocked = true;
    showAdminManageView();
    return;
  }

  adminError.textContent = '비밀번호가 맞지 않습니다.';

  adminPassword.select();
});

adminModeSelect.addEventListener('change', () => {

  if (!saveAdminListInputs(adminEditingMode)) {
    adminModeSelect.value = adminEditingMode;
    return;
  }

  setAdminManageError('');

  renderAdminOptions();

  renderAdminList();
});

adminAddForm.addEventListener('submit', (event) => {

  event.preventDefault();

  addAdminItem(adminNewItem.value);
});

adminResetButton.addEventListener('click', () => {

  if (!confirm('모든 모드의 항목을 기본값으로 되돌릴까요?')) {
    return;
  }

  resetModePools();

  renderAdminOptions();

  renderAdminList();

  resetDraw({ force: true });

  setAdminManageError('기본값으로 되돌렸습니다.');
});

adminCloseButton.addEventListener(
  'click',
  closeAdminMode
);

adminOverlay.addEventListener('click', (event) => {

  if (event.target === adminOverlay) {
    closeAdminMode();
  }
});

youtubePlayerClose.addEventListener(
  'click',
  closeYouTubePlayer
);

bigOverlay.addEventListener(
  'click',
  () => {
    bigOverlay.classList.remove('show');
  }
);

updatePickedNumbers();

updateDescription();

setupAppSettings({
  getCurrentDrawStyle: getEffectiveDrawStyle,
  setCurrentDrawStyle: (style) => {
    if (isDrawStyleLockedMode()) return;
    if (currentMode in modeDrawStyles) {
      modeDrawStyles[currentMode] = style;
    } else {
      currentDrawStyle = style;
    }
  },
  isDrawStyleLocked: isDrawStyleLockedMode,
  afterApply: () => resetDraw({ force: true }),
  beforeOpen: renderManittoSettings,
  beforeApply: saveManittoSettings,
  canOpenSettings: () => !isSongDialogOpen() && !isYouTubePlayerOpen(),
});

setupManittoMode({ numberGrid, bigOverlay, bigNumber, getResultLabel, adjustFontSize, playSound });

setupMemeTerminateShortcut();

openAppSettings({ required: true });
