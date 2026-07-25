import { scaleMotionTime } from './motion.js';
import { formatResultSummary, renderResultSummary } from './result-display.js?v=aligned-pegs-factory-branches';

const gumballStage =
  document.getElementById('gumballStage');

const gumballBowl =
  document.getElementById('gumballBowl');

const gumballOutput =
  document.getElementById('gumballOutput');

const gumballHandle =
  document.getElementById('gumballHandle');

let gumballDrawTimer = null;
let handlePressTimer = null;

const HANDLE_HOLD_MS = 850;

const STACKED_POSITIONS = [
  [-92, 82], [-55, 90], [-18, 84], [18, 90], [55, 84], [92, 82],
  [-120, 54], [-82, 62], [-43, 56], [-4, 64], [36, 56], [78, 62], [120, 54],
  [-126, 24], [-86, 30], [-44, 22], [0, 30], [44, 22], [86, 30], [126, 24],
  [-104, -8], [-52, -4], [0, -12], [52, -4], [104, -8],
  [-38, -38], [38, -38],
];

const SCATTERED_POSITIONS = [
  [-90, 78], [-52, 92], [-12, 82], [26, 92], [62, 80], [96, 86],
  [-122, 46], [-84, 66], [-42, 50], [0, 70], [40, 48], [84, 66], [122, 50],
  [-126, 14], [-90, 34], [-48, 18], [-6, 36], [38, 16], [82, 34], [126, 20],
  [-108, -14], [-58, 6], [-10, -16], [42, 4], [100, -12],
  [-42, -44], [42, -40],
];

function clearGumballTimer() {

  if (gumballDrawTimer) {
    clearTimeout(gumballDrawTimer);
    gumballDrawTimer = null;
  }
}

function shuffledPositions(source) {

  return [...source].sort(() => Math.random() - 0.5);
}

function clamp(value, min, max) {

  return Math.max(min, Math.min(max, value));
}

function getMaxGumballX(y) {

  if (y > 86) return 92;
  if (y > 72) return 104;
  if (y > 54) return 122;
  if (y > 20) return 130;
  if (y < -45) return 82;
  if (y < -20) return 112;
  return 126;
}

function setBallRestPosition(ball, source, index, jitter = 4) {

  const [x, y] = source[index % source.length];
  const safeY = clamp(y + (Math.random() - 0.5) * jitter, -48, 92);
  const maxX = getMaxGumballX(safeY);
  const safeX = clamp(x + (Math.random() - 0.5) * jitter, -maxX, maxX);

  ball.style.setProperty('--rest-x', `${safeX}px`);
  ball.style.setProperty('--rest-y', `${safeY}px`);
}

function scatterGumballBalls() {

  const positions = shuffledPositions(SCATTERED_POSITIONS);

  gumballBowl
    .querySelectorAll('.gumball-ball')
    .forEach((ball, index) => {
      setBallRestPosition(ball, positions, index, 10);
      ball.style.setProperty('--spin-start', '0deg');
    });
}

export function renderGumballMachine({
  entries,
  getDisplayLabel,
}) {

  gumballBowl.innerHTML = '';

  const positions = shuffledPositions(STACKED_POSITIONS);

  const placedBalls =
    [...entries]
      .map((entry, index) => {
        return {
          entry,
          order: Math.random(),
          angle: Math.random() * 360,
          radius: 18 + Math.random() * 74,
          size: 0.72 + Math.random() * 0.14,
          delay: Math.random() * -1.4,
          direction: Math.random() > 0.5 ? 360 : -360,
          wobbleX: 8 + Math.random() * 18,
          wobbleY: 6 + Math.random() * 20,
          gravityPull: 8 + Math.random() * 20,
          spin: Math.random() > 0.5 ? 360 : -360,
          orbitDuration: scaleMotionTime(950 + Math.random() * 800) / 1000,
          tumbleDuration: scaleMotionTime(420 + Math.random() * 500) / 1000,
          bounceDuration: scaleMotionTime(500 + Math.random() * 650) / 1000,
        };
      })
      .sort((a, b) => a.order - b.order);

  placedBalls.forEach(({
    entry,
    angle,
    radius,
    size,
    delay,
    direction,
    wobbleX,
    wobbleY,
    gravityPull,
    spin,
    orbitDuration,
    tumbleDuration,
    bounceDuration,
  }) => {

    const ball =
      document.createElement('div');

    ball.className = 'gumball-ball';

    if (entry.item === '선생님') {
      ball.classList.add('teacher-ball');
    }

    ball.dataset.key = entry.key;
    ball.title = entry.item;
    ball.textContent = getDisplayLabel(entry.item);
    ball.style.setProperty('--angle', `${angle}deg`);
    ball.style.setProperty('--angle-inverse', `${-angle}deg`);
    ball.style.setProperty('--angle-end', `${angle + direction}deg`);
    ball.style.setProperty('--angle-end-inverse', `${-(angle + direction)}deg`);
    setBallRestPosition(ball, positions, Number(entry.key));
    ball.style.setProperty('--radius', `${radius}px`);
    ball.style.setProperty('--size', String(size));
    ball.style.setProperty('--delay', `${delay}s`);
    ball.style.setProperty('--wobble-x', `${wobbleX}px`);
    ball.style.setProperty('--wobble-y', `${wobbleY}px`);
    ball.style.setProperty('--gravity-pull', `${gravityPull}px`);
    ball.style.setProperty('--spin-end', `${spin}deg`);
    ball.style.setProperty('--orbit-duration', `${orbitDuration}s`);
    ball.style.setProperty('--tumble-duration', `${tumbleDuration}s`);
    ball.style.setProperty('--bounce-duration', `${bounceDuration}s`);

    gumballBowl.appendChild(ball);
  });

  gumballOutput.classList.remove('show', 'rolling', 'teacher-ball');
  gumballOutput.textContent = '';
  gumballOutput.title = '';
}

export function updateGumballPanel({
  isVisible,
  entries,
  getDisplayLabel,
  numberGrid,
}) {

  numberGrid.hidden = isVisible;
  gumballStage.hidden = !isVisible;

  if (isVisible) {
    renderGumballMachine({
      entries,
      getDisplayLabel,
    });
    return;
  }

  gumballOutput.classList.remove('show', 'rolling', 'teacher-ball');
  gumballStage.classList.remove('is-spinning');
}

function selectGumballEntries({
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

export function drawNumbersGumball({
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
  isGumballMode,
  removeEntry,
  addPickedNumbers,
  updatePickedNumbers,
  terminateProgram,
  shouldTerminate,
  beforeShowResult = () => Promise.resolve(),
  playFinalSound,
  playTurnSound,
  playDropSound,
}) {

  clearGumballTimer();

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
    selectGumballEntries({
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
  scatterGumballBalls();
  gumballStage.classList.add('is-spinning');
  gumballOutput.classList.remove('show', 'rolling', 'teacher-ball');
  gumballOutput.textContent = '';
  gumballOutput.title = '';

  playTurnSound();

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
        gumballDrawTimer = null;
      });
  };

  const releaseBall = (index) => {

    gumballDrawTimer = setTimeout(() => {

      if (!isGumballMode()) {
        drawButton.disabled = false;
        gumballDrawTimer = null;
        return;
      }

      const entry = selectedEntries[index];
      const selected = entry.item;

      removeEntry(entry);

      const ball =
        gumballBowl.querySelector(
          `[data-key="${entry.key}"]`
        );

      if (ball) {
        ball.remove();
      }

      gumballStage.classList.toggle(
        'is-spinning',
        index < selectedEntries.length - 1
      );

      if (index < selectedEntries.length - 1) {
        scatterGumballBalls();
      }

      gumballOutput.classList.remove('show', 'rolling', 'teacher-ball');
      void gumballOutput.offsetWidth;
      gumballOutput.textContent = getDisplayLabel(selected);
      gumballOutput.title = selected;
      gumballOutput.classList.toggle(
        'teacher-ball',
        selected === '선생님'
      );
      gumballOutput.classList.add('show', 'rolling');

      playDropSound();

      if (selectedEntries[index + 1]) {
        releaseBall(index + 1);
        return;
      }

        gumballDrawTimer = setTimeout(showResult, scaleMotionTime(900));
    }, scaleMotionTime(index === 0 ? 2600 : 1300));
  };

  releaseBall(0);
}

export function resetGumballMode() {

  clearGumballTimer();
  clearTimeout(handlePressTimer);
  handlePressTimer = null;
  gumballStage.classList.remove('is-spinning');
  gumballHandle.classList.remove('is-holding');
  gumballOutput.classList.remove('show', 'rolling', 'teacher-ball');
  gumballOutput.textContent = '';
  gumballOutput.title = '';
}

function cancelHandleHold() {

  if (!handlePressTimer) return;

  clearTimeout(handlePressTimer);
  handlePressTimer = null;
  gumballHandle.classList.remove('is-holding');
}

export function bindGumballHandle({
  canDraw,
  onDraw,
}) {

  gumballHandle.addEventListener('pointerdown', (event) => {

    if (!canDraw()) return;

    event.preventDefault();

    gumballHandle.setPointerCapture?.(event.pointerId);
    gumballHandle.classList.add('is-holding');

    handlePressTimer = setTimeout(() => {

      handlePressTimer = null;
      gumballHandle.classList.remove('is-holding');
      onDraw();
    }, scaleMotionTime(HANDLE_HOLD_MS));
  });

  gumballHandle.addEventListener('pointerup', cancelHandleHold);
  gumballHandle.addEventListener('pointerleave', cancelHandleHold);
  gumballHandle.addEventListener('pointercancel', cancelHandleHold);
}
