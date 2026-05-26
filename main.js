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

let pinballRafId = null;

let stopPinball = false;

let _pinballAudioCtx = null;

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

  } else if (currentMode === 'pinball') {

    descriptionEl.textContent =
      '핀볼! 공이 번호 범퍼를 튕기다가 선택된 번호가 뽑힙니다.';

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

  const drawSettings =
    document.getElementById('drawSettings');

  if (drawSettings) {
    drawSettings.style.display =
      mode === 'pinball' ? 'none' : '';
  }

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

  if (currentMode === 'pinball') {
    drawNumbersPinball();
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

function drawNumbersPinball() {

  if (remainingNumbers.length === 0) {

    numberDisplay.textContent =
      '모든 번호를 이미 뽑았습니다!';

    numberDisplay.classList.remove('placeholder');

    numberDisplay.classList.add('notice');

    return;
  }

  drawButton.disabled = true;

  stopPinball = false;

  const overlay =
    document.getElementById('pinballOverlay');

  const canvas =
    document.getElementById('pinballCanvas');

  const ctx = canvas.getContext('2d');

  canvas.width = window.innerWidth;

  canvas.height = window.innerHeight;

  const W = canvas.width;

  const H = canvas.height;

  overlay.classList.add('show');

  const BALL_R =
    Math.max(8, Math.min(11, Math.floor(W / 120)));

  const BUMPER_R =
    Math.max(18, Math.min(32, Math.floor(W / 20)));

  const COLS = 5;

  const ball = {
    x: W / 2 + (Math.random() - 0.5) * 60,
    y: H * 0.82,
    vx: (Math.random() - 0.5) * 8,
    vy: -(15 + Math.random() * 3),
  };

  const rowCount =
    Math.ceil(remainingNumbers.length / COLS);

  const horizPad = W * 0.1;

  const colW = (W - horizPad * 2) / COLS;

  const topY = H * 0.12;

  const rowH = (H * 0.55) / rowCount;

  const bumpers = remainingNumbers.map((num, i) => {

    const row = Math.floor(i / COLS);

    const col = i % COLS;

    const stagger = (row % 2) * (colW * 0.5);

    const x =
      horizPad + colW * col + colW * 0.5 + stagger;

    const y = topY + rowH * row + rowH * 0.5;

    return { num, x, y, r: BUMPER_R, lit: 0 };
  });

  const scoreTexts = [];

  let frameCount = 0;

  let slowFrames = 0;

  let phase = 'playing';

  let winner = null;

  let doneHandled = false;

  function update() {

    ball.vy += 0.3;

    if (phase === 'slowing') {
      ball.vx *= 0.97;
      ball.vy *= 0.97;
      slowFrames++;
    }

    ball.x += ball.vx;
    ball.y += ball.vy;

    if (ball.x - BALL_R < 0) {
      ball.x = BALL_R;
      ball.vx = Math.abs(ball.vx) * 0.8;
    }
    if (ball.x + BALL_R > W) {
      ball.x = W - BALL_R;
      ball.vx = -Math.abs(ball.vx) * 0.8;
    }
    if (ball.y - BALL_R < 0) {
      ball.y = BALL_R;
      ball.vy = Math.abs(ball.vy) * 0.8;
    }
    if (ball.y + BALL_R > H) {
      ball.y = H - BALL_R;
      ball.vy = -Math.abs(ball.vy) * 0.7;
    }

    for (const b of bumpers) {

      const dx = ball.x - b.x;

      const dy = ball.y - b.y;

      const dist =
        Math.sqrt(dx * dx + dy * dy);

      const minDist = BALL_R + b.r;

      if (dist < minDist && dist > 0.01) {

        const nx = dx / dist;

        const ny = dy / dist;

        const dot =
          ball.vx * nx + ball.vy * ny;

        ball.vx =
          (ball.vx - 2 * dot * nx) * 1.15;

        ball.vy =
          (ball.vy - 2 * dot * ny) * 1.15;

        ball.x = b.x + nx * (minDist + 1);

        ball.y = b.y + ny * (minDist + 1);

        if (b.lit === 0) {
          playBumperBeep();
          scoreTexts.push({
            x: b.x,
            y: b.y - b.r - 8,
            life: 30,
          });
        }

        b.lit = 20;
      }

      if (b.lit > 0) b.lit--;
    }

    for (let i = scoreTexts.length - 1; i >= 0; i--) {
      scoreTexts[i].life--;
      if (scoreTexts[i].life <= 0) {
        scoreTexts.splice(i, 1);
      }
    }

    if (winner) winner.lit = 20;

    frameCount++;

    if (frameCount > 360 && phase === 'playing') {
      phase = 'slowing';
    }

    if (phase === 'slowing') {

      const speed =
        Math.sqrt(ball.vx ** 2 + ball.vy ** 2);

      if (speed < 0.8 || slowFrames > 200) {

        phase = 'done';

        let minD = Infinity;

        for (const b of bumpers) {
          const dx = ball.x - b.x;
          const dy = ball.y - b.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < minD) { minD = d; winner = b; }
        }
      }
    }
  }

  function drawScene() {

    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#7b2ff7';
    ctx.strokeStyle = '#7b2ff7';
    ctx.lineWidth = 4;
    ctx.strokeRect(6, 6, W - 12, H - 12);
    ctx.restore();

    const flipY = H * 0.91;

    ctx.save();
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#5a5cff';
    ctx.fillStyle = '#5a5cff';
    ctx.beginPath();
    ctx.moveTo(W * 0.08, flipY + H * 0.03);
    ctx.lineTo(W * 0.31, flipY);
    ctx.lineTo(W * 0.31, flipY + H * 0.03);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(W * 0.92, flipY + H * 0.03);
    ctx.lineTo(W * 0.69, flipY);
    ctx.lineTo(W * 0.69, flipY + H * 0.03);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    for (const b of bumpers) {

      const isWinner = b === winner;

      ctx.save();

      if (isWinner) {
        ctx.shadowBlur = 50;
        ctx.shadowColor = '#ff6b6b';
        ctx.fillStyle = '#ff4444';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
      } else if (b.lit > 0) {
        const t = b.lit / 20;
        ctx.shadowBlur = 28 * t;
        ctx.shadowColor = '#ffd56b';
        ctx.fillStyle =
          `rgba(255, 205, 60, ${0.5 + 0.5 * t})`;
        ctx.strokeStyle = '#ffd56b';
        ctx.lineWidth = 2;
      } else {
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#7b2ff7';
        ctx.fillStyle = '#1e1e40';
        ctx.strokeStyle = '#8b5cf6';
        ctx.lineWidth = 2;
      }

      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.fillStyle =
        isWinner
          ? '#ffffff'
          : b.lit > 0
          ? '#1a1a1a'
          : '#c084fc';
      ctx.font =
        `bold ${Math.floor(b.r * (isWinner ? 0.85 : 0.75))}px ` +
        `Noto Sans KR, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.num, b.x, b.y);
      ctx.restore();
    }

    for (const st of scoreTexts) {
      ctx.save();
      ctx.globalAlpha = st.life / 30;
      ctx.fillStyle = '#ffd56b';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        '+100',
        st.x,
        st.y - (30 - st.life) * 0.8
      );
      ctx.restore();
    }

    ctx.save();
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#ffffff';
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function finalize() {

    if (stopPinball) return;

    stopPinball = true;

    overlay.classList.remove('show');

    const picked = winner.num;

    const idx = remainingNumbers.indexOf(picked);

    if (idx !== -1) remainingNumbers.splice(idx, 1);

    pickedNumbers.push(picked);

    const cells = Array.from(
      document.querySelectorAll('.number-cell')
    );

    const pickedCell =
      cells.find((c) => c.dataset.num === picked);

    if (pickedCell) pickedCell.classList.add('picked');

    numberDisplay.textContent = picked;

    numberDisplay.style.fontSize =
      adjustFontSize(picked);

    numberDisplay.classList.remove(
      'placeholder',
      'notice'
    );

    bigNumber.textContent = picked;

    bigNumber.style.fontSize = adjustFontSize(picked);

    bigOverlay.classList.add('show');

    updatePickedNumbers();

    playSound();

    drawButton.disabled = false;
  }

  function loop() {

    if (stopPinball) return;

    update();

    drawScene();

    if (phase === 'done' && !doneHandled) {
      doneHandled = true;
      setTimeout(finalize, 1200);
    }

    pinballRafId = requestAnimationFrame(loop);
  }

  pinballRafId = requestAnimationFrame(loop);
}

function resetDraw() {

  stopPinball = true;

  if (pinballRafId) {
    cancelAnimationFrame(pinballRafId);
    pinballRafId = null;
  }

  const pinballOv =
    document.getElementById('pinballOverlay');

  if (pinballOv) {
    pinballOv.classList.remove('show');
  }

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
