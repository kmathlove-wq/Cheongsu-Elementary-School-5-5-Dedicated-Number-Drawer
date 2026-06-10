import {
  drawNumbersPinball,
  stopPinballMode,
} from './pinball.js';

const drawButton =
  document.getElementById('drawButton');

const resetButton =
  document.getElementById('resetButton');

const drawCountSelect =
  document.getElementById('drawCount');

const numberDisplay =
  document.getElementById('numberDisplay');

const pickedNumbersContainer =
  document.getElementById('pickedNumbers');

const numberGrid =
  document.getElementById('numberGrid');

const bigOverlay =
  document.getElementById('bigOverlay');

const bigNumber =
  document.getElementById('bigNumber');


const descriptionEl =
  document.getElementById('description');

const adminOverlay =
  document.getElementById('adminOverlay');

const adminCloseButton =
  document.getElementById('adminCloseButton');

const adminLoginView =
  document.getElementById('adminLoginView');

const adminManageView =
  document.getElementById('adminManageView');

const adminLoginForm =
  document.getElementById('adminLoginForm');

const adminPassword =
  document.getElementById('adminPassword');

const adminError =
  document.getElementById('adminError');

const adminModeSelect =
  document.getElementById('adminModeSelect');

const adminOptions =
  document.getElementById('adminOptions');

const adminList =
  document.getElementById('adminList');

const adminAddForm =
  document.getElementById('adminAddForm');

const adminNewItem =
  document.getElementById('adminNewItem');

const adminManageError =
  document.getElementById('adminManageError');

const adminResetButton =
  document.getElementById('adminResetButton');

const songRequestOverlay =
  document.getElementById('songRequestOverlay');

const songRequestForm =
  document.getElementById('songRequestForm');

const songRequestTitle =
  document.getElementById('songRequestTitle');

const songRequestInput =
  document.getElementById('songRequestInput');

const songRequestError =
  document.getElementById('songRequestError');

const songCandidateList =
  document.getElementById('songCandidateList');

const songSearchAllButton =
  document.getElementById('songSearchAllButton');

const songRequestSkipButton =
  document.getElementById('songRequestSkipButton');

const youtubePlayer =
  document.getElementById('youtubePlayer');

const youtubePlayerTitle =
  document.getElementById('youtubePlayerTitle');

const youtubePlayerFrame =
  document.getElementById('youtubePlayerFrame');

const youtubePlayerClose =
  document.getElementById('youtubePlayerClose');

let _pinballAudioCtx = null;

let currentMode = 'basic';

const ADMIN_PASSWORD = '1+1=1';
const MOBILE_ADMIN_TAP_WINDOW = 900;
const MOBILE_ADMIN_TAP_COUNT = 3;

let basicModeTapCount = 0;
let lastBasicModeTap = 0;

// 배포 시 GitHub Actions Secret YOUTUBE_API_KEY로 대체됩니다.
const YOUTUBE_API_KEY = '__YOUTUBE_API_KEY__';

const MODE_LABELS = {
  basic: '기본',
  teacher: '선생님',
  'teacher-mystery': '선생님(?)',
  mystery: '???',
  pinball: '핀볼',
  'pinball-teacher': '핀볼(선생님)',
  'song-pinball': '노래추첨 핀볼',
};

const baseNumbers =
  Array.from(
    { length: 25 },
    (_, i) => String(i + 1)
  ).filter((n) => n !== '19');

const DEFAULT_MODE_POOLS = {
  basic: [...baseNumbers],
  teacher: ['선생님', ...baseNumbers],
  'teacher-mystery': ['선생님', ...baseNumbers],
  mystery: [...baseNumbers],
  pinball: [...baseNumbers],
  'pinball-teacher': ['선생님', ...baseNumbers],
  'song-pinball': [...baseNumbers],
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

function isPinballMode(mode) {

  return mode === 'pinball' ||
    mode === 'pinball-teacher' ||
    mode === 'song-pinball';
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

function isProtectedBlockedItem(mode, item) {

  return (
    mode === 'teacher-mystery' &&
    item === '선생님'
  ) || (
    mode === 'mystery' &&
    item === '5'
  );
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
}

renderGrid();

function updateDescription() {

  if (!isDefaultModePool(currentMode)) {

    const items = getValidItems();

    let text =
      `${MODE_LABELS[currentMode]} 모드: 관리자 설정 항목 ${items.length}개 중 뽑습니다.`;

    if (modeOptions[currentMode].forcedItems.length > 0) {
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
      items.includes('5')
    ) {
      text += ' 단, 5번이 나오면...?';
    }

    if (isPinballMode(currentMode)) {
      text += ' 핀볼 방식으로 진행됩니다.';
    }

    descriptionEl.textContent = text;

    return;
  }

  if (currentMode === 'basic') {

    descriptionEl.textContent =
      '1번부터 25번까지 중 랜덤 번호를 뽑습니다. 19번은 제외됩니다.';

  } else if (currentMode === 'teacher') {

    descriptionEl.textContent =
      '선생님 + 1번~25번 중 랜덤으로 뽑습니다. 19번은 제외됩니다.';

  } else if (currentMode === 'teacher-mystery') {

    descriptionEl.textContent =
      '선생님 + 1번~25번 중 뽑습니다. 19번 제외. 선생님에겐 조금 특별한 무언가가 있을지도...?';

  } else if (currentMode === 'pinball') {

    descriptionEl.textContent =
      '핀볼! 공이 번호 범퍼를 튕기다가 선택된 번호가 뽑힙니다.';

  } else if (currentMode === 'pinball-teacher') {

    descriptionEl.textContent =
      '핀볼(선생님) 모드: 선생님 공 포함! 선생님이 당첨될 수도?';

  } else if (currentMode === 'song-pinball') {

    descriptionEl.textContent =
      '노래추첨 핀볼 모드: 당첨 번호가 듣고 싶은 노래를 입력하면 YouTube에서 찾아 재생합니다.';

  } else {

    descriptionEl.textContent =
      '1번~25번 중 랜덤 번호를 뽑습니다. 19번 제외. 단, 5번이 나오면...?';
  }
}

function switchMode(mode) {

  if (isBlockingDialogOpen()) return;

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

function setAdminManageError(message) {

  adminManageError.textContent = message;
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

    const forcedLabel =
      document.createElement('label');

    forcedLabel.className = 'admin-flag';

    const forcedInput =
      document.createElement('input');

    forcedInput.type = 'checkbox';

    forcedInput.className = 'admin-force-input';

    forcedInput.checked = forced.has(key);

    forcedLabel.append(forcedInput, '무조건');

    const blockedLabel =
      document.createElement('label');

    blockedLabel.className = 'admin-flag';

    const blockedInput =
      document.createElement('input');

    blockedInput.type = 'checkbox';

    blockedInput.className = 'admin-block-input';

    const protectedBlocked =
      isProtectedBlockedItem(mode, item);

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

    deleteButton.disabled = items.length <= 1;

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
  const allowDuplicates = modeOptions[mode].allowDuplicates;

  for (const item of items) {

    if (!item) {
      return '빈 값으로 변경할 수 없습니다.';
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
    normalizeOptionItems(
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
        !isProtectedBlockedItem(mode, modePools[mode][Number(key)])
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

  rows.forEach((row) => {

    const index = Number(row.key);

    if (Number.isInteger(index) && index >= 0) {
      items[index] = row.item;
    }
  });

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
            !isProtectedBlockedItem(mode, row.item)
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
      modeOptions[mode].allowDuplicates
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

  if (
    !modeOptions[mode].allowDuplicates &&
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

  const item = value.trim();

  if (!item) {
    setAdminManageError('빈 값으로 변경할 수 없습니다.');
    return;
  }

  const duplicateIndex =
    modePools[mode].findIndex((entry) => entry === item);

  if (
    !modeOptions[mode].allowDuplicates &&
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

  if (modePools[mode].length <= 1) {
    setAdminManageError('각 모드에는 최소 1개 항목이 필요합니다.');
    return;
  }

  modePools[mode].splice(index, 1);

  removeOptionIndex(mode, index);

  setAdminManageError('');

  commitAdminPoolChange(mode);
}

function playSound() {

  const audio = new Audio(
    'https://actions.google.com/sounds/v1/cartoon/clang_and_wobble.ogg'
  );

  audio.volume = 0.4;

  audio.play();
}

function playBumperBeep() {

  try {

    if (!_pinballAudioCtx) {
      _pinballAudioCtx =
        new (window.AudioContext ||
          window.webkitAudioContext)();
    }

    const ac = _pinballAudioCtx;

    const osc = ac.createOscillator();

    const g = ac.createGain();

    osc.connect(g);

    g.connect(ac.destination);

    osc.frequency.value = 220 + Math.random() * 300;

    osc.type = 'square';

    g.gain.setValueAtTime(0.1, ac.currentTime);

    g.gain.exponentialRampToValueAtTime(
      0.001,
      ac.currentTime + 0.1
    );

    osc.start(ac.currentTime);

    osc.stop(ac.currentTime + 0.12);

  } catch (e) {}
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

function terminateProgram() {

  window.close();

  // 브라우저가 window.close()를 차단한 경우 폴백
  setTimeout(() => {
    document.body.innerHTML = '';
  }, 300);
}

function parseYouTubeDuration(duration) {

  const match =
    duration.match(
      /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/
    );

  if (!match) return 0;

  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);

  return hours * 3600 + minutes * 60 + seconds;
}

function normalizeSongText(text) {

  return String(text)
    .toLowerCase()
    .replace(/[()[\]{}'"“”‘’]/g, ' ')
    .replace(/[^0-9a-z가-힣\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function compactSongText(text) {

  return normalizeSongText(text).replace(/\s+/g, '');
}

function hasKoreanText(text) {

  return /[가-힣]/.test(String(text));
}

const SONG_TITLE_ALIASES = {
  '버터플라이': ['butterfly'],
};

const YOUTUBE_SEARCH_LIMIT = 10;

function getSongTitleQueries(songName) {

  const queries = [songName];
  const compactSong = compactSongText(songName);

  Object.entries(SONG_TITLE_ALIASES).forEach(([keyword, aliases]) => {
    if (compactSong.includes(compactSongText(keyword))) {
      queries.push(...aliases);
    }
  });

  return queries;
}

function getTextSimilarity(a, b) {

  const source = normalizeSongText(a);
  const target = normalizeSongText(b);
  const compactSource = compactSongText(a);
  const compactTarget = compactSongText(b);

  if (!source || !target) return 0;

  if (target === source ||
      compactTarget === compactSource) return 1;

  if (compactTarget.includes(compactSource)) {
    return Math.min(
      1,
      0.65 +
      compactSource.length / compactTarget.length * 0.25
    );
  }

  const sourceTokens = source.split(' ');
  const targetTokenList = target.split(' ');
  const targetTokens = new Set(targetTokenList);
  const hits =
    sourceTokens.filter((token) => targetTokens.has(token)).length;
  const coverage = hits / sourceTokens.length;

  if (coverage === 0) return 0;

  const lengthRatio =
    Math.min(source.length, target.length) /
    Math.max(source.length, target.length);
  const tokenRatio =
    Math.min(sourceTokens.length, targetTokenList.length) /
    Math.max(sourceTokens.length, targetTokenList.length);
  const phraseBonus =
    target.includes(source) ||
    compactTarget.includes(compactSource)
      ? 0.2
      : 0;

  return Math.min(
    1,
    coverage * 0.5 +
    lengthRatio * 0.3 +
    tokenRatio * 0.2 +
    phraseBonus
  );
}

function getBestTitleSimilarity(songName, title) {

  return Math.max(
    ...getSongTitleQueries(songName)
      .map((query) => getTextSimilarity(query, title))
  );
}

function isBlockedSongVideo(video) {

  const title =
    normalizeSongText(video.snippet?.title || '');
  const channel =
    normalizeSongText(video.snippet?.channelTitle || '');
  const description =
    normalizeSongText(video.snippet?.description || '');
  const text = `${title} ${channel} ${description}`;

  const schoolLike =
    /(초등학교|중학교|고등학교|학교|학년|반|수업|학예회|축제|졸업)/.test(text);
  const classVideoLike =
    /(뮤직비디오|music video|mv|m v)/.test(text);
  const longLoopLike =
    /(1시간|한시간|hour|hours|loop|반복|연속재생|playlist|모음)/.test(text);
  const shortsLike =
    /(#shorts|shorts|쇼츠|유튜브쇼츠|ytshorts)/.test(text);
  const translationLike =
    /(해석|번역|translation|translated)/.test(text);
  const varietyClipLike =
    /(놀면 뭐하니|예능|방영|방송분|full ver|풀버전|클립|clip)/.test(text);
  const nostalgiaClipLike =
    /(그 시절|선택받은 아이들|눈물|추억|90년생)/.test(text);

  return (schoolLike && classVideoLike) ||
    longLoopLike ||
    shortsLike ||
    translationLike ||
    varietyClipLike ||
    nostalgiaClipLike;
}

function scoreSongVideo(video, songName) {

  const title = video.snippet?.title || '';
  const channel = video.snippet?.channelTitle || '';
  const views = Number(video.statistics?.viewCount || 0);
  const similarity = getBestTitleSimilarity(songName, title);
  const normalizedSong = normalizeSongText(songName);
  const normalizedTitle = normalizeSongText(title);
  const compactSong = compactSongText(songName);
  const compactTitle = compactSongText(title);
  const exactTitleBonus =
    normalizedTitle === normalizedSong ||
    compactTitle === compactSong
      ? 140
      : 0;
  const phraseTitleBonus =
    normalizedTitle.includes(normalizedSong) ||
    compactTitle.includes(compactSong)
      ? 12
      : 0;
  const modifierPenalty =
    compactTitle !== compactSong &&
    /(전설의|괴담|퇴마사|공포|무서운|무서움|버전|cover|커버)/i.test(title)
      ? 45
      : 0;
  const officialBonus =
    /(official|topic|vevo|오피셜|공식)/i.test(channel) ? 12 : 0;

  return exactTitleBonus +
    phraseTitleBonus +
    similarity * 90 +
    Math.log10(Math.max(views, 1)) * 20 +
    officialBonus -
    modifierPenalty;
}

async function fetchYouTubeJson(url) {

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('YouTube API 요청에 실패했습니다.');
  }

  return response.json();
}

function sortSongCandidates(a, b, songName) {

  const viewDiff = b._views - a._views;

  if (viewDiff !== 0) return viewDiff;

  const scoreDiff =
    scoreSongVideo(b, songName) -
    scoreSongVideo(a, songName);

  if (scoreDiff !== 0) return scoreDiff;

  return a._searchRank - b._searchRank;
}

async function findYouTubeCandidates(songName) {

  if (!YOUTUBE_API_KEY ||
      YOUTUBE_API_KEY === '__YOUTUBE_API_KEY__') {
    throw new Error('YouTube API 키를 먼저 입력해 주세요.');
  }

  const params =
    new URLSearchParams({
      part: 'snippet',
      type: 'video',
      maxResults: String(YOUTUBE_SEARCH_LIMIT),
      order: 'relevance',
      regionCode: 'KR',
      relevanceLanguage: 'ko',
      q: songName,
      key: YOUTUBE_API_KEY,
    });

  const searchData =
    await fetchYouTubeJson(
      `https://www.googleapis.com/youtube/v3/search?${params}`
    );

  const ids =
    (searchData.items || [])
      .map((item) => item.id?.videoId)
      .filter(Boolean);

  if (ids.length === 0) {
    throw new Error('검색 결과가 없습니다.');
  }

  const detailParams =
    new URLSearchParams({
      part: 'snippet,contentDetails,statistics',
      id: ids.join(','),
      key: YOUTUBE_API_KEY,
    });

  const detailData =
    await fetchYouTubeJson(
      `https://www.googleapis.com/youtube/v3/videos?${detailParams}`
    );
  const idRanks =
    new Map(ids.map((id, index) => [id, index]));

  const allCandidates =
    (detailData.items || [])
      .map((video) => ({
        ...video,
        _searchRank: idRanks.get(video.id) ?? 999,
        _seconds:
          parseYouTubeDuration(video.contentDetails?.duration || ''),
        _views: Number(video.statistics?.viewCount || 0),
        _similarity:
          getBestTitleSimilarity(songName, video.snippet?.title || ''),
        _hasKoreanText:
          hasKoreanText(
            `${video.snippet?.title || ''} ` +
            `${video.snippet?.channelTitle || ''} ` +
            `${video.snippet?.description || ''}`
          ),
      }));

  const candidates =
    allCandidates
      .filter((video) =>
        video._views >= 100000 &&
        video._seconds >= 60 &&
        video._seconds <= 720 &&
        video._similarity >= 0.45 &&
        !isBlockedSongVideo(video)
      )
      .filter((video, index, videos) => {
        if (!hasKoreanText(songName)) return true;

        const koreanCandidates =
          videos.some((candidate) => candidate._hasKoreanText);

        return !koreanCandidates || video._hasKoreanText;
      })
      .sort((a, b) => sortSongCandidates(a, b, songName));

  if (candidates.length === 0) {
    throw new Error('조건에 맞는 YouTube 영상을 찾지 못했습니다.');
  }

  return {
    recommended: candidates.slice(0, 2),
    all: allCandidates
      .sort((a, b) => a._searchRank - b._searchRank),
  };
}

function playYouTubeVideo(video, songName) {

  const title = video.snippet?.title || songName;

  youtubePlayerTitle.textContent = title;

  youtubePlayerFrame.src =
    `https://www.youtube.com/embed/${video.id}` +
    '?autoplay=1&rel=0';

  youtubePlayer.hidden = false;
}

function isYouTubePlayerOpen() {

  return !youtubePlayer.hidden;
}

function formatViewCount(views) {

  if (views >= 10000) {
    return `${Math.round(views / 10000)}만회`;
  }

  return `${views.toLocaleString('ko-KR')}회`;
}

function formatDuration(seconds) {

  const minutes = Math.floor(seconds / 60);
  const restSeconds = seconds % 60;

  return `${minutes}:${String(restSeconds).padStart(2, '0')}`;
}

function renderSongCandidates(videos, options = {}) {

  songCandidateList.innerHTML = '';

  videos.forEach((video, index) => {

    const button = document.createElement('button');
    const title = video.snippet?.title || '제목 없음';
    const channel = video.snippet?.channelTitle || '채널 정보 없음';
    const rankLabel =
      options.showRank
        ? `${index + 1}등`
        : `${index + 1}`;

    button.type = 'button';
    button.className = 'song-candidate';
    button.dataset.videoId = video.id;
    button.title = title;
    button.setAttribute(
      'aria-label',
      `${rankLabel}. ${title}`
    );

    const titleEl = document.createElement('strong');
    const metaEl = document.createElement('span');

    titleEl.textContent = `${rankLabel}. ${title}`;
    titleEl.title = title;
    metaEl.textContent =
      `${channel} · ${formatViewCount(video._views)} · ` +
      formatDuration(video._seconds);

    button.append(titleEl, metaEl);

    songCandidateList.appendChild(button);
  });
}

function closeYouTubePlayer() {

  youtubePlayerFrame.src = '';
  youtubePlayer.hidden = true;
}

function closeSongRequest() {

  songRequestOverlay.classList.remove('show');
  songRequestOverlay.setAttribute('aria-hidden', 'true');
}

function isBlockingDialogOpen() {

  return adminOverlay.classList.contains('show') ||
    songRequestOverlay.classList.contains('show');
}

function requestSongForResult(selected) {

  return new Promise((resolve) => {

    const firstItem = getEntryItem(selected[0]);
    const studentLabel = getResultLabel(firstItem);

    songRequestTitle.textContent =
      `${studentLabel}이 듣고 싶은 노래를 입력하세요`;
    songRequestInput.value = '';
    songRequestError.textContent = '';
    songCandidateList.innerHTML = '';
    songSearchAllButton.hidden = true;
    songRequestOverlay.classList.add('show');
    songRequestOverlay.setAttribute('aria-hidden', 'false');
    let currentSongName = '';
    let recommendedVideos = [];
    let allVideos = [];

    const finish = () => {
      songRequestForm.removeEventListener('submit', onSubmit);
      songRequestSkipButton.removeEventListener('click', onSkip);
      songSearchAllButton.removeEventListener('click', onSearchAll);
      songCandidateList.removeEventListener('click', onPickCandidate);
      closeSongRequest();
      resolve();
    };

    const playSelectedVideo = (video) => {
      playYouTubeVideo(video, currentSongName);
      finish();
    };

    const onSubmit = async (event) => {

      event.preventDefault();

      const songName = songRequestInput.value.trim();

      if (!songName) {
        songRequestError.textContent = '노래 이름을 입력해 주세요.';
        return;
      }

      songRequestError.textContent = 'YouTube에서 찾는 중입니다...';
      songCandidateList.innerHTML = '';
      songSearchAllButton.hidden = true;

      try {
        const result = await findYouTubeCandidates(songName);

        currentSongName = songName;
        recommendedVideos = result.recommended;
        allVideos = result.all;

        renderSongCandidates(recommendedVideos, { showRank: true });
        songSearchAllButton.hidden = allVideos.length === 0;
        songRequestError.textContent =
          '재생할 노래를 선택해 주세요.';
      } catch (error) {
        songRequestError.textContent = error.message;
      }
    };

    const onSearchAll = () => {
      if (allVideos.length === 0) return;

      renderSongCandidates(allVideos, { showRank: false });
      songRequestError.textContent =
        '후보 중 재생할 노래를 선택해 주세요.';
    };

    const onPickCandidate = (event) => {
      const button = event.target.closest('.song-candidate');

      if (!button) return;

      const videos =
        [...recommendedVideos, ...allVideos];
      const video =
        videos.find((item) => item.id === button.dataset.videoId);

      if (video) {
        playSelectedVideo(video);
      }
    };

    const onSkip = () => {
      finish();
    };

    songRequestForm.addEventListener('submit', onSubmit);
    songRequestSkipButton.addEventListener('click', onSkip);
    songSearchAllButton.addEventListener('click', onSearchAll);
    songCandidateList.addEventListener('click', onPickCandidate);

    setTimeout(() => songRequestInput.focus(), 0);
  });
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

  if (isPinballMode(currentMode)) {
    drawNumbersPinball({
      remainingEntries,
      drawCountSelect,
      numberDisplay,
      drawButton,
      compareItems,
      getResultLabel,
      getDisplayLabel,
      playBumperBeep,
      forcedItems: modeOptions[currentMode].forcedItems,
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
      sourceEntries.length
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

      selected.sort(compareItems);

      const resultText = selected.join(', ');

      // 메인 표시
      numberDisplay.textContent = resultText;

      numberDisplay.style.fontSize =
        adjustFontSize(resultText);

      numberDisplay.classList.remove(
        'placeholder',
        'notice'
      );

      // 큰 화면 표시
      bigNumber.textContent = resultText;

      bigNumber.style.fontSize =
        adjustFontSize(resultText);

      bigOverlay.classList.add('show');

      updatePickedNumbers();

      playSound();

      // ??? 모드: 5번이 뽑히면 종료
      if (currentMode === 'mystery' && selected.includes('5')) {

        setTimeout(() => {

          bigOverlay.classList.remove('show');

          terminateProgram();

        }, 1500);

      } else {

        drawButton.disabled = false;
      }
    }

  }, 140);
}

function applyPinballResult(selected) {

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

  if (currentMode === 'song-pinball') {
    requestSongForResult(selected)
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

  songRequestError.textContent = '';

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

document
  .querySelectorAll('.mode-btn')
  .forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.mode === 'basic') {
        handleBasicModeAdminTap();
      }

      switchMode(btn.dataset.mode);
    });
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
