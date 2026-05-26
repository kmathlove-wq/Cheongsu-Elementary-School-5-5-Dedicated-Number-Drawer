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

let currentMode = 'basic';

// 모드별 풀 생성 (모두 문자열로 통일)
function getValidItems() {

  const nums =
    Array.from(
      { length: 25 },
      (_, i) => String(i + 1)
    ).filter((n) => n !== '19');

  if (currentMode === 'teacher') {
    return ['선생님', ...nums];
  }

  return nums;
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

    cell.textContent = item;

    numberGrid.appendChild(cell);
  });
}

renderGrid();

function updateDescription() {

  if (currentMode === 'basic') {

    descriptionEl.textContent =
      '1번부터 25번까지 중 랜덤 번호를 뽑습니다. 19번은 제외됩니다.';

  } else if (currentMode === 'teacher') {

    descriptionEl.textContent =
      '선생님 + 1번~25번 중 랜덤으로 뽑습니다. 19번은 제외됩니다.';

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

  pickedNumbersContainer.innerHTML =
    pickedNumbers
      .map((num) => `<span>${num}</span>`)
      .join('');
}

function playSound() {

  const audio = new Audio(
    'https://actions.google.com/sounds/v1/cartoon/clang_and_wobble.ogg'
  );

  audio.volume = 0.4;

  audio.play();
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

      for (let i = 0; i < count; i++) {

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

      // 선생님은 항상 앞에, 나머지는 숫자 오름차순
      selected.sort((a, b) => {

        if (a === '선생님') return -1;

        if (b === '선생님') return 1;

        return Number(a) - Number(b);
      });

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

function resetDraw() {

  validItems = getValidItems();

  remainingNumbers = [...validItems];

  pickedNumbers = [];

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


bigOverlay.addEventListener(
  'click',
  () => {
    bigOverlay.classList.remove('show');
  }
);

updatePickedNumbers();

updateDescription();
