let active = false;
let assignments = new Map();
let helpers = null;

function shuffle(items) {

  const result = [...items];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

function createAssignments(entries) {

  const shuffled = shuffle(entries);
  const map = new Map();

  shuffled.forEach((entry, index) => {
    const target =
      shuffled[(index + 1) % shuffled.length];

    map.set(entry.key, target);
  });

  return map;
}

function showManittoTarget(cell) {

  if (!active || !helpers) return;

  const source = cell.dataset.num;
  const target = assignments.get(cell.dataset.key);

  if (!target) return;

  const sourceText = helpers.getResultLabel(source);
  const targetText = helpers.getResultLabel(target.item);
  const resultText = `${sourceText}의 마니또 상대는 ${targetText}`;

  helpers.bigNumber.textContent = resultText;
  helpers.bigNumber.style.fontSize =
    helpers.adjustFontSize(resultText);
  helpers.bigOverlay.classList.add('show');

  cell.classList.add('picked');
  helpers.playSound();
}

export function setupManittoMode(options) {

  helpers = options;

  helpers.numberGrid.addEventListener('click', (event) => {
    const cell = event.target.closest('.number-cell');

    if (!cell) return;

    showManittoTarget(cell);
  });
}

export function drawManitto({
  entries,
  blockedItems,
  numberDisplay,
  drawButton,
  getDisplayLabel,
}) {

  const blocked = new Set(blockedItems);
  const candidates =
    entries.filter((entry) => !blocked.has(entry.key));

  if (candidates.length < 2) {
    numberDisplay.textContent =
      '마니또는 최소 2명이 필요합니다.';
    numberDisplay.classList.remove('placeholder');
    numberDisplay.classList.add('notice');
    return;
  }

  assignments = createAssignments(candidates);
  active = true;

  helpers.numberGrid.classList.add('manitto-active');

  helpers.numberGrid
    .querySelectorAll('.number-cell')
    .forEach((cell) => {
      const entry = candidates.find((candidate) =>
        candidate.key === cell.dataset.key
      );

      cell.classList.toggle('manitto-ready', Boolean(entry));
      cell.classList.remove('picked');

      if (entry) {
        cell.textContent = getDisplayLabel(entry.item);
        cell.title = `${entry.item} 마니또 확인`;
      }
    });

  numberDisplay.textContent =
    '마니또 배정 완료! 번호를 눌러 확인하세요.';
  numberDisplay.style.fontSize = '';
  numberDisplay.classList.remove('placeholder', 'notice');
  drawButton.disabled = true;
}

export function resetManittoMode() {

  active = false;
  assignments = new Map();

  if (!helpers) return;

  helpers.numberGrid.classList.remove('manitto-active');
  helpers.numberGrid
    .querySelectorAll('.number-cell')
    .forEach((cell) => {
      cell.classList.remove('manitto-ready');
    });
}
