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

let _pinballAudioCtx = null;

let currentMode = 'basic';

const ADMIN_PASSWORD = '1+1=1';

const MODE_LABELS = {
  basic: '기본',
  teacher: '선생님',
  'teacher-mystery': '선생님(?)',
  mystery: '???',
  pinball: '핀볼',
  'pinball-teacher': '핀볼(선생님)',
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
};

let modePools = loadModePools();

let adminUnlocked = false;

let lastControlPress = 0;

let adminEditingMode = currentMode;

function cloneDefaultModePools() {

  return Object.fromEntries(
    Object.entries(DEFAULT_MODE_POOLS)
      .map(([mode, items]) => [mode, [...items]])
  );
}

function normalizeItems(items) {

  const seen = new Set();

  return items
    .map((item) => String(item).trim())
    .filter((item) => {
      if (!item || seen.has(item)) return false;
      seen.add(item);
      return true;
    });
}

function loadModePools() {

  return cloneDefaultModePools();
}

function saveModePools() {

  return true;
}

function resetModePools() {

  modePools = cloneDefaultModePools();

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

function isDefaultModePool(mode) {

  const currentItems = modePools[mode];

  const defaultItems = DEFAULT_MODE_POOLS[mode];

  return currentItems.length === defaultItems.length &&
    currentItems.every((item, index) => item === defaultItems[index]);
}

// 모드별 풀 반환 (모두 문자열로 통일)
function getValidItems() {

  return [...modePools[currentMode]].sort(compareItems);
}

let validItems = getValidItems();

let remainingNumbers = [...validItems];

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

  validItems.forEach((item) => {

    const cell =
      document.createElement('div');

    cell.className = 'number-cell';

    if (item === '선생님') {
      cell.classList.add('teacher-cell');
    }

    cell.dataset.num = item;

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

    if (currentMode === 'pinball' ||
        currentMode === 'pinball-teacher') {
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

  } else {

    descriptionEl.textContent =
      '1번~25번 중 랜덤 번호를 뽑습니다. 19번 제외. 단, 5번이 나오면...?';
  }
}

function switchMode(mode) {

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

  adminEditingMode = mode;

  adminList.innerHTML = '';

  items.forEach((item, index) => {

    const row =
      document.createElement('div');

    row.className = 'admin-row';

    const input =
      document.createElement('input');

    input.type = 'text';

    input.maxLength = 20;

    input.value = item;

    input.className = 'admin-item-input';

    const saveButton =
      document.createElement('button');

    saveButton.type = 'button';

    saveButton.textContent = '변경';

    saveButton.addEventListener('click', () => {
      renameAdminItem(index, input.value);
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

    row.append(input, saveButton, deleteButton);

    adminList.appendChild(row);
  });
}

function getAdminListInputValues() {

  return Array.from(
    adminList.querySelectorAll('.admin-item-input')
  ).map((input) => input.value.trim());
}

function validateAdminItems(items) {

  if (items.length === 0) {
    return '각 모드에는 최소 1개 항목이 필요합니다.';
  }

  const seen = new Set();

  for (const item of items) {

    if (!item) {
      return '빈 값으로 변경할 수 없습니다.';
    }

    if (seen.has(item)) {
      return '이미 있는 값입니다.';
    }

    seen.add(item);
  }

  return '';
}

function saveAdminListInputs(mode) {

  if (!mode || !modePools[mode]) {
    return true;
  }

  const items = getAdminListInputValues();

  const error = validateAdminItems(items);

  if (error) {
    setAdminManageError(error);
    return false;
  }

  const changed =
    items.length !== modePools[mode].length ||
    items.some((item, index) => item !== modePools[mode][index]);

  if (!changed) {
    return true;
  }

  modePools[mode] = items;

  saveModePools();

  if (mode === currentMode) {
    resetDraw();
  }

  setAdminManageError('적용되었습니다.');

  return true;
}

function commitAdminPoolChange(mode) {

  modePools[mode] = normalizeItems(modePools[mode]);

  saveModePools();

  renderAdminList();

  if (mode === currentMode) {
    resetDraw();
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

  if (modePools[mode].includes(item)) {
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

  if (duplicateIndex !== -1 && duplicateIndex !== index) {
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

function drawNumbers() {

  if (currentMode === 'pinball' || currentMode === 'pinball-teacher') {
    drawNumbersPinball({
      remainingNumbers,
      drawCountSelect,
      numberDisplay,
      drawButton,
      compareItems,
      getResultLabel,
      getDisplayLabel,
      playBumperBeep,
      applyPinballResult,
    });
    return;
  }

  if (remainingNumbers.length === 0) {

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
      remainingNumbers.length
    );

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
        remainingNumbers.includes(cell.dataset.num)
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

      // 선생님(?) 모드: 선생님이 남아있으면 무조건 첫 번째로 추출
      if (
        currentMode === 'teacher-mystery' &&
        remainingNumbers.includes('선생님')
      ) {
        const idx = remainingNumbers.indexOf('선생님');
        remainingNumbers.splice(idx, 1);
        selected.push('선생님');
        pickedNumbers.push('선생님');
        const teacherCell = cells.find(
          (cell) => cell.dataset.num === '선생님'
        );
        if (teacherCell) teacherCell.classList.add('picked');
      }

      for (let i = selected.length; i < count; i++) {

        const randomIndex =
          Math.floor(
            Math.random() *
            remainingNumbers.length
          );

        const picked =
          remainingNumbers.splice(
            randomIndex,
            1
          )[0];

        selected.push(picked);

        pickedNumbers.push(picked);

        const pickedCell =
          cells.find(
            (cell) => cell.dataset.num === picked
          );

        if (pickedCell) {

          pickedCell.classList.add('picked');
        }
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

  for (const num of selected) {

    const idx = remainingNumbers.indexOf(num);

    if (idx !== -1) {
      remainingNumbers.splice(idx, 1);
    }

    pickedNumbers.push(num);
  }

  const cells = Array.from(
    document.querySelectorAll('.number-cell')
  );

  for (const num of selected) {

    const cell =
      cells.find(c => c.dataset.num === num);

    if (cell) {
      cell.classList.add('picked');
    }
  }

  const resultText = selected.join(', ');

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

function resetDraw() {

  stopPinballMode();

  validItems = getValidItems();

  remainingNumbers = [...validItems];

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
    btn.addEventListener('click', () =>
      switchMode(btn.dataset.mode)
    );
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
      openAdminMode();
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

  renderAdminList();

  resetDraw();

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

bigOverlay.addEventListener(
  'click',
  () => {
    bigOverlay.classList.remove('show');
  }
);

updatePickedNumbers();

updateDescription();
