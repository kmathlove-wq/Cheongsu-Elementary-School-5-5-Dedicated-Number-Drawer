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

  const placedBalls =
    [...entries]
      .map((entry) => ({
        entry,
        order: Math.random(),
        angle: Math.random() * 360,
        radius: 18 + Math.random() * 82,
        size: 0.88 + Math.random() * 0.2,
        delay: Math.random() * -0.7,
        direction: Math.random() > 0.5 ? 360 : -360,
      }))
      .sort((a, b) => a.order - b.order);

  placedBalls.forEach(({
    entry,
    angle,
    radius,
    size,
    delay,
    direction,
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
    ball.style.setProperty('--radius', `${radius}px`);
    ball.style.setProperty('--size', String(size));
    ball.style.setProperty('--delay', `${delay}s`);

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
