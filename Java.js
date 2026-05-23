const drawButton = document.getElementById('drawButton');
const resetButton = document.getElementById('resetButton');
const numberDisplay = document.getElementById('numberDisplay');
const pickedNumbersContainer = document.getElementById('pickedNumbers');

const validNumbers = Array.from({ length: 25 }, (_, i) => i + 1).filter((num) => num !== 19);
let remainingNumbers = [...validNumbers];
let pickedNumbers = [];
const numberGrid = document.getElementById('numberGrid');
const bigOverlay = document.getElementById('bigOverlay');
const bigNumber = document.getElementById('bigNumber');

let audioContext = null;
let tensionOscillator = null;
let tensionLFO = null;
let tensionGain = null;

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
}

function playSuccessSound() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.12, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
  gain.connect(ctx.destination);

  const baseOsc = ctx.createOscillator();
  baseOsc.type = 'triangle';
  baseOsc.frequency.setValueAtTime(440, now);

  const harmonyOsc = ctx.createOscillator();
  harmonyOsc.type = 'sine';
  harmonyOsc.frequency.setValueAtTime(660, now);

  baseOsc.connect(gain);
  harmonyOsc.connect(gain);

  baseOsc.start(now);
  harmonyOsc.start(now);
  baseOsc.stop(now + 0.6);
  harmonyOsc.stop(now + 0.6);
}

function playTensionSound() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  stopTensionSound();

  tensionGain = ctx.createGain();
  tensionGain.gain.setValueAtTime(0.02, now);
  tensionGain.connect(ctx.destination);

  tensionOscillator = ctx.createOscillator();
  tensionOscillator.type = 'sawtooth';
  tensionOscillator.frequency.setValueAtTime(220, now);

  tensionLFO = ctx.createOscillator();
  tensionLFO.type = 'sine';
  tensionLFO.frequency.setValueAtTime(2.2, now);

  const lfoGain = ctx.createGain();
  lfoGain.gain.setValueAtTime(45, now);

  tensionLFO.connect(lfoGain);
  lfoGain.connect(tensionOscillator.frequency);

  tensionOscillator.connect(tensionGain);

  tensionLFO.start(now);
  tensionOscillator.start(now);
}

function stopTensionSound() {
  if (tensionOscillator) {
    try {
      tensionOscillator.stop();
    } catch (error) {
      // ignore if already stopped
    }
    tensionOscillator.disconnect();
    tensionOscillator = null;
  }
  if (tensionLFO) {
    try {
      tensionLFO.stop();
    } catch (error) {
      // ignore if already stopped
    }
    tensionLFO.disconnect();
    tensionLFO = null;
  }
  if (tensionGain) {
    tensionGain.disconnect();
    tensionGain = null;
  }
}

// Render number grid
function renderNumberGrid() {
  numberGrid.innerHTML = '';
  validNumbers.forEach((num) => {
    const cell = document.createElement('div');
    cell.className = 'number-cell';
    cell.dataset.num = num;
    cell.textContent = num;
    numberGrid.appendChild(cell);
  });
}

renderNumberGrid();

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
    numberDisplay.classList.remove('placeholder');
    numberDisplay.classList.add('notice');
    return;
  }

  // Pick final index ahead of time (from remainingNumbers)
  const finalIdx = Math.floor(Math.random() * remainingNumbers.length);
  const finalValue = remainingNumbers[finalIdx];

  const cells = Array.from(document.querySelectorAll('.number-cell'));

  // disable the button while the suspense animation plays
  drawButton.disabled = true;
  playTensionSound();

  // Spark animation: rapidly highlight random cells
  let prev = null;
  const totalDuration = 4000; // ms
  const step = 200; // ms
  const iterations = Math.floor(totalDuration / step);
  let i = 0;

  const iv = setInterval(() => {
    if (prev) prev.classList.remove('spark');
    // choose a random cell to spark; bias towards remaining numbers
    const candidates = cells.filter((c) => remainingNumbers.includes(Number(c.dataset.num)));
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    if (pick) pick.classList.add('spark');
    prev = pick;
    i++;
    if (i >= iterations) {
      clearInterval(iv);
      stopTensionSound();
      if (prev) prev.classList.remove('spark');
      // find the cell for finalValue and highlight
      const finalCell = cells.find((c) => Number(c.dataset.num) === finalValue);
      if (finalCell) {
        // emphasize final cell without dimming others
        finalCell.classList.add('spark', 'picked');
        // remove from remaining and record
        const picked = remainingNumbers.splice(finalIdx, 1)[0];
        pickedNumbers.push(picked);
        numberDisplay.textContent = picked;
        numberDisplay.classList.remove('placeholder', 'notice');
        updatePickedNumbers();

        // show big overlay
        bigNumber.textContent = picked;
        bigOverlay.classList.add('show');
        bigOverlay.setAttribute('aria-hidden', 'false');

        // play celebration sound after draw completes
        playSuccessSound();
      }
      drawButton.disabled = false;
    }
  }, step);
}

function resetDraw() {
  remainingNumbers = [...validNumbers];
  pickedNumbers = [];
  numberDisplay.textContent = '뽑기 버튼을 눌러주세요';
  numberDisplay.classList.add('placeholder');
    numberDisplay.classList.remove('notice');
  // reset grid visuals
  document.querySelectorAll('.number-cell').forEach((c) => c.classList.remove('spark', 'dimmed', 'picked'));
  bigOverlay.classList.remove('show');
  bigOverlay.setAttribute('aria-hidden', 'true');
  updatePickedNumbers();
}

drawButton.addEventListener('click', drawNumber);
resetButton.addEventListener('click', resetDraw);

// Close overlay on click
bigOverlay.addEventListener('click', () => {
  bigOverlay.classList.remove('show');
  bigOverlay.setAttribute('aria-hidden', 'true');
  // remove spark class from final cell
  document.querySelectorAll('.number-cell').forEach((c) => c.classList.remove('spark'));
});

updatePickedNumbers();
