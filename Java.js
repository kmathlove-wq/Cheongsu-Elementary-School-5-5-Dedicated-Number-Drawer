const drawButton = document.getElementById('drawButton');
const resetButton = document.getElementById('resetButton');
const numberDisplay = document.getElementById('numberDisplay');
const pickedNumbersContainer = document.getElementById('pickedNumbers');

const validNumbers = Array.from({ length: 25 }, (_, i) => i + 1).filter((num) => num !== 19);
let remainingNumbers = [...validNumbers];
let pickedNumbers = [];

function updatePickedNumbers() {
  if (pickedNumbers.length === 0) {
    pickedNumbersContainer.textContent = '아직 뽑은 번호가 없습니다.';
    return;
  }

  pickedNumbersContainer.innerHTML = pickedNumbers
    .map((num) => `<span>${num}</span>`)
    .join('');
}

function drawNumber() {
  if (remainingNumbers.length === 0) {
    numberDisplay.textContent = '모든 번호를 이미 뽑았습니다!';
    return;
  }

  const index = Math.floor(Math.random() * remainingNumbers.length);
  const picked = remainingNumbers.splice(index, 1)[0];
  pickedNumbers.push(picked);

  numberDisplay.textContent = picked;
  numberDisplay.classList.remove('placeholder');
  updatePickedNumbers();
}

function resetDraw() {
  remainingNumbers = [...validNumbers];
  pickedNumbers = [];
  numberDisplay.textContent = '뽑기 버튼을 눌러주세요';
  numberDisplay.classList.add('placeholder');
  updatePickedNumbers();
}

drawButton.addEventListener('click', drawNumber);
resetButton.addEventListener('click', resetDraw);

updatePickedNumbers();
