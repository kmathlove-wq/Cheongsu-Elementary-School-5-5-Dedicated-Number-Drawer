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

// 1~25 전체 포함
const validNumbers =
  Array.from(
    { length: 25 },
    (_, i) => i + 1
  );

let remainingNumbers = [...validNumbers];

let pickedNumbers = [];

// 1~25명 선택 생성
for (let i = 1; i <= 25; i++) {

  const option =
    document.createElement('option');

  option.value = i;

  option.textContent = `${i}명`;

  drawCountSelect.appendChild(option);
}

function renderGrid() {

  numberGrid.innerHTML = '';

  validNumbers.forEach((num) => {

    const cell =
      document.createElement('div');

    cell.className = 'number-cell';

    cell.dataset.num = num;

    cell.textContent = num;

    numberGrid.appendChild(cell);
  });
}

renderGrid();

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

// 숫자 개수에 따라 자동 글자 크기 조절
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

  if (length <= 50) {
    return '2.2rem';
  }

  return '1.6rem';
}

function drawNumbers() {

  if (remainingNumbers.length === 0) {

    numberDisplay.textContent =
      '모든 번호를 이미 뽑았습니다!';

    numberDisplay.classList.remove('placeholder');

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

    const availableCells =
      cells.filter((cell) =>
        remainingNumbers.includes(
          Number(cell.dataset.num)
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
            (cell) =>
              Number(cell.dataset.num) === picked
          );

        if (pickedCell) {
          pickedCell.classList.add('picked');
        }
      }

      selected.sort((a, b) => a - b);

      const resultText =
        selected.join(', ');

      // 가운데 표시
      numberDisplay.textContent =
        resultText;

      numberDisplay.style.fontSize =
        adjustFontSize(resultText);

      numberDisplay.classList.remove(
        'placeholder',
        'notice'
      );

      // 큰 화면 표시
      bigNumber.textContent =
        resultText;

      bigNumber.style.fontSize =
        adjustFontSize(resultText);

      bigOverlay.classList.add('show');

      updatePickedNumbers();

      playSound();

      drawButton.disabled = false;
    }

  }, 140);
}

function resetDraw() {

  remainingNumbers = [...validNumbers];

  pickedNumbers = [];

  numberDisplay.textContent =
    '뽑기 버튼을 눌러주세요';

  numberDisplay.style.fontSize = '';

  bigNumber.style.fontSize = '';

  numberDisplay.classList.add('placeholder');

  numberDisplay.classList.remove('notice');

  document
    .querySelectorAll('.number-cell')
    .forEach((cell) => {

      cell.classList.remove(
        'spark',
        'picked'
      );

    });

  bigOverlay.classList.remove('show');

  updatePickedNumbers();
}

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