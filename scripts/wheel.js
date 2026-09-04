import { scaleMotionTime } from './motion.js';
import { formatResultSummary, renderResultSummary } from './result-display.js?v=wheel-mode-1';

const wheelStage = document.getElementById('wheelStage');
const wheelDisc = document.getElementById('wheelDisc');

const WHEEL_COLORS = [
  '#ff6b81', '#5ee7df', '#ffd166', '#8ec5fc',
  '#c8ff6a', '#b39cff', '#ff9f6b', '#6bd6ff',
];

const TEACHER_COLOR = '#ffad33';

const MAX_LABELED_ENTRIES = 32;

let currentRotation = 0;
let wheelDrawTimer = null;

function clearWheelTimer() {

  if (wheelDrawTimer) {
    clearTimeout(wheelDrawTimer);
    wheelDrawTimer = null;
  }
}

function colorForEntry(entry, index) {

  return entry.item === '선생님'
    ? TEACHER_COLOR
    : WHEEL_COLORS[index % WHEEL_COLORS.length];
}

function labelFontSize(count) {

  const sliceAngle = 360 / count;
  const size = 4.3 * Math.pow(sliceAngle, 0.48);

  return Math.round(Math.min(80, Math.max(12, size)));
}

function labelMaxChars(count) {

  if (count <= 2) return 10;
  if (count <= 4) return 8;
  if (count <= 8) return 6;
  if (count <= 14) return 5;
  if (count <= 22) return 4;

  return 3;
}

export function renderWheelDisc(entries, { getDisplayLabel } = {}) {

  wheelDisc.innerHTML = '';

  if (entries.length === 0) {
    wheelDisc.style.background = '#2a2f45';
    return;
  }

  const slice = 360 / entries.length;

  const stops =
    entries.map((entry, index) => {

      const color = colorForEntry(entry, index);
      const start = (index * slice).toFixed(3);
      const end = ((index + 1) * slice).toFixed(3);

      return `${color} ${start}deg ${end}deg`;
    });

  wheelDisc.style.background = `conic-gradient(${stops.join(', ')})`;

  if (!getDisplayLabel || entries.length > MAX_LABELED_ENTRIES) return;

  const fontSize = labelFontSize(entries.length);
  const maxChars = labelMaxChars(entries.length);
  const labelDistance = (wheelDisc.clientWidth / 2) * 0.66;

  entries.forEach((entry, index) => {

    const angle = index * slice + slice / 2;
    const isUpsideDown = angle > 90 && angle < 270;

    const arm = document.createElement('span');

    arm.className = 'wheel-label-arm';
    arm.style.transform = `rotate(${angle}deg) translateY(-${labelDistance}px)`;

    const text = document.createElement('span');

    text.className = 'wheel-label-text';
    text.style.fontSize = `${fontSize}px`;
    text.style.transform = `translate(-50%, -50%) rotate(${isUpsideDown ? 180 : 0}deg)`;
    text.textContent = getDisplayLabel(entry.item, maxChars);

    arm.appendChild(text);
    wheelDisc.appendChild(arm);
  });
}

export function updateWheelPanel({
  isVisible,
  entries,
  getDisplayLabel,
}) {

  wheelStage.hidden = !isVisible;

  if (!isVisible) return;

  renderWheelDisc(entries, { getDisplayLabel });
}

function selectWheelEntries({
  remainingEntries,
  blocked,
  forcedItems,
  count,
}) {

  const selected = [];
  const selectedKeys = new Set();
  const eligibleEntries =
    remainingEntries.filter((entry) => !blocked.has(entry.key));

  for (const forcedKey of forcedItems) {

    if (selected.length >= count) break;

    const forcedEntry =
      eligibleEntries.find((entry) =>
        entry.key === forcedKey &&
        !selectedKeys.has(entry.key)
      );

    if (!forcedEntry) continue;

    selected.push(forcedEntry);
    selectedKeys.add(forcedEntry.key);
  }

  while (selected.length < count) {

    const drawPool =
      eligibleEntries.filter((entry) =>
        !selectedKeys.has(entry.key)
      );

    if (drawPool.length === 0) break;

    const pickedEntry =
      drawPool[
        Math.floor(Math.random() * drawPool.length)
      ];

    selected.push(pickedEntry);
    selectedKeys.add(pickedEntry.key);
  }

  return selected;
}

function spinDiscToIndex(winnerIndex, total) {

  const slice = 360 / total;
  const sliceCenter = winnerIndex * slice + slice / 2;
  const jitter = (Math.random() - 0.5) * slice * 0.5;
  const stopAngleFromTop = sliceCenter + jitter;
  const desiredMod = (360 - stopAngleFromTop + 360) % 360;
  const currentMod = ((currentRotation % 360) + 360) % 360;

  let delta = desiredMod - currentMod;

  while (delta < 0) delta += 360;

  const extraSpins = 10 + Math.floor(Math.random() * 5);

  currentRotation += delta + extraSpins * 360;

  wheelDisc.style.transform = `rotate(${currentRotation}deg)`;
}

export function drawNumbersWheel({
  remainingEntries,
  options,
  drawCountSelect,
  drawButton,
  numberDisplay,
  bigNumber,
  bigOverlay,
  getDisplayLabel,
  adjustFontSize,
  compareItems,
  isModeActive,
  removeEntry,
  addPickedNumbers,
  updatePickedNumbers,
  terminateProgram,
  shouldTerminate,
  beforeShowResult = () => Promise.resolve(),
  playFinalSound,
  playTickSound,
}) {

  clearWheelTimer();

  const blocked = new Set(options.blockedItems);

  if (remainingEntries.length === 0) {

    numberDisplay.textContent =
      '모든 번호를 이미 뽑았습니다!';

    numberDisplay.classList.remove('placeholder');
    numberDisplay.classList.add('notice');

    return;
  }

  const eligibleCount =
    remainingEntries.filter((entry) =>
      !blocked.has(entry.key)
    ).length;

  const count =
    Math.min(
      Number(drawCountSelect.value),
      eligibleCount
    );

  if (eligibleCount === 0 || count <= 0) {
    terminateProgram();
    return;
  }

  const selectedEntries =
    selectWheelEntries({
      remainingEntries,
      blocked,
      forcedItems: options.forcedItems,
      count,
    });

  if (selectedEntries.length < count) {
    terminateProgram();
    return;
  }

  const selectedItems =
    selectedEntries.map((entry) => entry.item);

  if (shouldTerminate(selectedItems)) {
    terminateProgram();
    return;
  }

  drawButton.disabled = true;

  let pool = [...remainingEntries];

  const showResult = () => {

    const displayItems =
      [...selectedItems].sort(compareItems);

    const resultText = formatResultSummary(displayItems);

    Promise.resolve(beforeShowResult(selectedEntries))
      .then(() => {

        const isSummary = renderResultSummary(numberDisplay, displayItems);
        numberDisplay.style.fontSize = isSummary ? '' : adjustFontSize(resultText);
        numberDisplay.classList.remove('placeholder', 'notice');

        renderResultSummary(bigNumber, displayItems);
        bigNumber.style.fontSize = isSummary ? '' : adjustFontSize(resultText);
        bigOverlay.classList.add('show');

        addPickedNumbers(selectedItems);
        updatePickedNumbers();
        playFinalSound();

        drawButton.disabled = false;
        wheelDrawTimer = null;
      });
  };

  const spinNext = (index) => {

    if (!isModeActive()) {
      drawButton.disabled = false;
      wheelDrawTimer = null;
      return;
    }

    const entry = selectedEntries[index];
    const winnerIndex = pool.findIndex((candidate) => candidate.key === entry.key);

    renderWheelDisc(pool, { getDisplayLabel });

    const spinDuration = scaleMotionTime(5500 + index * 250);

    wheelDisc.style.transitionDuration = `${spinDuration}ms`;

    playTickSound();

    void wheelDisc.offsetWidth;

    spinDiscToIndex(winnerIndex, pool.length);

    wheelDrawTimer = setTimeout(() => {

      pool = pool.filter((candidate) => candidate.key !== entry.key);
      removeEntry(entry);

      renderWheelDisc(pool, { getDisplayLabel });

      playTickSound();

      if (index < selectedEntries.length - 1) {
        wheelDrawTimer = setTimeout(() => spinNext(index + 1), scaleMotionTime(700));
        return;
      }

      wheelDrawTimer = setTimeout(showResult, scaleMotionTime(700));

    }, spinDuration + 60);
  };

  spinNext(0);
}

export function resetWheelMode() {

  clearWheelTimer();

  currentRotation = 0;

  wheelDisc.style.transitionDuration = '0s';
  wheelDisc.style.transform = 'rotate(0deg)';
}
