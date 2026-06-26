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

const GRAVITY_POSITIONS = [
  [-100, 62], [-60, 66], [-20, 62], [20, 66], [60, 62], [100, 66],
  [-112, 30], [-74, 34], [-37, 30], [0, 34], [37, 30], [74, 34], [112, 30],
  [-96, -4], [-58, 0], [-20, -4], [18, 0], [56, -4], [94, 0],
  [-78, -38], [-26, -34], [26, -34], [78, -38],
  [-36, -70], [36, -70],
];

function clearGumballTimer() {

  if (gumballDrawTimer) {
    clearTimeout(gumballDrawTimer);
    gumballDrawTimer = null;
  }
}

export function renderGumballMachine({
  entries,
  getDisplayLabel,
}) {

  gumballBowl.innerHTML = '';

  const positions =
    [...GRAVITY_POSITIONS]
      .sort(() => Math.random() - 0.5);

  const placedBalls =
    [...entries]
      .map((entry, index) => {
        const [x, y] =
          positions[index % positions.length];

        return {
          entry,
          order: Math.random(),
          angle: Math.random() * 360,
          restX: x + (Math.random() - 0.5) * 8,
          restY: y + (Math.random() - 0.5) * 8,
          radius: 18 + Math.random() * 74,
          size: 0.72 + Math.random() * 0.14,
          delay: Math.random() * -1.4,
          direction: Math.random() > 0.5 ? 360 : -360,
          wobbleX: 8 + Math.random() * 18,
          wobbleY: 6 + Math.random() * 20,
          gravityPull: 8 + Math.random() * 20,
          spin: Math.random() > 0.5 ? 360 : -360,
          orbitDuration: 0.95 + Math.random() * 0.8,
          tumbleDuration: 0.42 + Math.random() * 0.5,
          bounceDuration: 0.5 + Math.random() * 0.65,
        };
      })
      .sort((a, b) => a.order - b.order);

  placedBalls.forEach(({
    entry,
    angle,
    restX,
    restY,
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
    ball.style.setProperty('--rest-x', `${restX}px`);
    ball.style.setProperty('--rest-y', `${restY}px`);
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
  gumballStage.classList.add('is-spinning');
  gumballOutput.classList.remove('show', 'rolling', 'teacher-ball');
  gumballOutput.textContent = '';
  gumballOutput.title = '';

  playTurnSound();

  const showResult = () => {

    const displayItems =
      [...selectedItems].sort(compareItems);

    const resultText =
      displayItems.join(', ');

    Promise.resolve(beforeShowResult(selectedEntries))
      .then(() => {

        numberDisplay.textContent = resultText;
        numberDisplay.style.fontSize =
          adjustFontSize(resultText);
        numberDisplay.classList.remove('placeholder', 'notice');

        bigNumber.textContent = resultText;
        bigNumber.style.fontSize =
          adjustFontSize(resultText);
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

      gumballDrawTimer = setTimeout(showResult, 900);
    }, index === 0 ? 2600 : 1300);
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
    }, HANDLE_HOLD_MS);
  });

  gumballHandle.addEventListener('pointerup', cancelHandleHold);
  gumballHandle.addEventListener('pointerleave', cancelHandleHold);
  gumballHandle.addEventListener('pointercancel', cancelHandleHold);
}
