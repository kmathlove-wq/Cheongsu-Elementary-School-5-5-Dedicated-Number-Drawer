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

  if (currentMode === 'teacher' || currentMode === 'teacher-mystery' || currentMode === 'pinball-teacher') {
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

  } else if (currentMode === 'teacher-mystery') {

    descriptionEl.textContent =
      '선생님(?) 모드: 선생님이 반드시 뽑힙니다! (이미 뽑혔으면 일반 랜덤)';

  } else if (currentMode === 'pinball') {

    descriptionEl.textContent =
      '핀볼! 공이 번호 범퍼를 튕기다가 선택된 번호가 뽑힙니다.';

  } else if (currentMode === 'pinball-teacher') {

    descriptionEl.textContent =
      '핀볼(선생님) 모드: 선생님 공 포함! 선생님이 당첨될 수도?';

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

  if (currentMode === 'pinball' || currentMode === 'pinball-teacher') {
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

      // 선생님(?) 모드: 선생님이 남아있으면 무조건 첫 번째로 추출
      if (
        currentMode === 'teacher-mystery' &&
        remainingNumbers.includes('선생님')
      ) {
        const idx = remainingNumbers.indexOf('선생님');
        remainingNumbers.splice(idx, 1);
        selected.push('선생님');
        pickedNumbers.push('선생님');
        const teacherCell = cells.find(
          (cell) => cell.dataset.num === '선생님'
        );
        if (teacherCell) teacherCell.classList.add('picked');
      }

      for (let i = selected.length; i < count; i++) {

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

  const count = Math.min(
    Number(drawCountSelect.value),
    remainingNumbers.length
  );

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

  // 가상 월드 (화면의 4배 높이)
  const WORLD_H = H * 4;

  let cameraY = 0;

  overlay.classList.add('show');

  // ── 플레이 영역 (세계 좌표) ──
  const PLAY_W = Math.min(W * 0.62, 720);

  const PLAY_X = (W - PLAY_W) / 2;

  const PLAY_X2 = PLAY_X + PLAY_W;

  const PLAY_TOP = H * 0.04;

  const PLAY_BOT = WORLD_H * 0.95;

  // ── 공 ──
  const BALL_R =
    Math.max(13, Math.min(21, PLAY_W / 27));

  const PALETTE = [
    '#ff6b6b', '#ffd56b', '#6bffb0', '#6bffff',
    '#b06bff', '#ff6bff', '#ff9f6b', '#b0ff6b',
    '#6bb0ff', '#ff6baa', '#6bff6b', '#ffb06b',
  ];

  const shuffledNums =
    [...remainingNumbers].sort(() => Math.random() - 0.5);

  const balls = shuffledNums.map((num, i) => {
    const isTeacher = num === '선생님';
    return {
      num,
      x: PLAY_X + PLAY_W / 2
        + (Math.random() - 0.5) * PLAY_W * 0.70,
      y: PLAY_TOP - BALL_R * 2.5 - i * (BALL_R * 2.6),
      vx: (Math.random() - 0.5) * 1.5,
      vy: 0,
      r: BALL_R,
      color: isTeacher ? '#ffe066' : PALETTE[i % PALETTE.length],
      active: false,
      exited: false,
      stuckSince: null,
      isTeacher,
    };
  });

  // ── 핀(대각선 바) ──
  const PEG_LEN = PLAY_W / 10;

  const PEG_THICK = Math.max(6, Math.floor(BALL_R * 0.38));

  const PEG_R = PEG_THICK / 2;

  const NUM_ROWS = 14;

  const PEGS_PER_ROW = 4;

  const pegTop = H * 0.12;

  const pegBot = WORLD_H * 0.90;

  const rowH = (pegBot - pegTop) / NUM_ROWS;

  const colW = PLAY_W / PEGS_PER_ROW;

  const pegs = [];

  for (let row = 0; row < NUM_ROWS; row++) {

    const cy = pegTop + rowH * (row + 0.5);

    // 홀짝 행마다 각도 교차 (/ 와 \)
    const ang =
      row % 2 === 0
        ? Math.PI / 5
        : -Math.PI / 5;

    const isOdd = row % 2 === 1;

    const cnt = isOdd
      ? PEGS_PER_ROW + 1
      : PEGS_PER_ROW;

    for (let col = 0; col < cnt; col++) {

      const cx =
        PLAY_X
        + (isOdd ? -colW * 0.5 : 0)
        + colW * col + colW * 0.5;

      if (
        cx < PLAY_X + PEG_LEN * 0.4 ||
        cx > PLAY_X2 - PEG_LEN * 0.4
      ) continue;

      const cos = Math.cos(ang);

      const sin = Math.sin(ang);

      const h = PEG_LEN / 2;

      pegs.push({
        x1: cx - cos * h,
        y1: cy - sin * h,
        x2: cx + cos * h,
        y2: cy + sin * h,
        cx, cy, ang,
        len: PEG_LEN,
        thick: PEG_THICK,
        lit: 0,
      });
    }
  }

  // ── 원형 범퍼 (추가 장애물) ──
  const BUMPER_R = Math.max(16, Math.floor(PLAY_W / 22));

  const bumpers = [
    {
      x: PLAY_X + PLAY_W * 0.25,
      y: WORLD_H * 0.20,
      r: BUMPER_R,
      lit: 0,
      color: '#ff4d6d',
    },
    {
      x: PLAY_X + PLAY_W * 0.75,
      y: WORLD_H * 0.20,
      r: BUMPER_R,
      lit: 0,
      color: '#ff4d6d',
    },
    {
      x: PLAY_X + PLAY_W * 0.50,
      y: WORLD_H * 0.42,
      r: Math.floor(BUMPER_R * 1.2),
      lit: 0,
      color: '#ffe066',
    },
    {
      x: PLAY_X + PLAY_W * 0.25,
      y: WORLD_H * 0.65,
      r: BUMPER_R,
      lit: 0,
      color: '#6bffff',
    },
    {
      x: PLAY_X + PLAY_W * 0.75,
      y: WORLD_H * 0.65,
      r: BUMPER_R,
      lit: 0,
      color: '#6bffff',
    },
  ];

  // ── 회전 핀 (스피너) ──
  const SPINNER_LEN = PEG_LEN * 2.8;

  const spinners = [
    { cx: PLAY_X + PLAY_W * 0.50, cy: WORLD_H * 0.10, angVel:  0.030 },
    { cx: PLAY_X + PLAY_W * 0.18, cy: WORLD_H * 0.30, angVel: -0.025 },
    { cx: PLAY_X + PLAY_W * 0.82, cy: WORLD_H * 0.30, angVel:  0.025 },
    { cx: PLAY_X + PLAY_W * 0.50, cy: WORLD_H * 0.52, angVel: -0.032 },
    { cx: PLAY_X + PLAY_W * 0.22, cy: WORLD_H * 0.76, angVel:  0.028 },
    { cx: PLAY_X + PLAY_W * 0.78, cy: WORLD_H * 0.76, angVel: -0.028 },
  ].map((s, i) => ({
    ...s,
    ang: (Math.PI / 6) * i,
    len: SPINNER_LEN,
    lit: 0,
    x1: 0, y1: 0, x2: 0, y2: 0,
  }));

  // ── 충돌 함수들 ──

  function hitPeg(ball, peg) {

    const dx = peg.x2 - peg.x1;
    const dy = peg.y2 - peg.y1;
    const segLen = Math.sqrt(dx * dx + dy * dy);

    if (segLen < 0.01) return;

    const ux = dx / segLen;
    const uy = dy / segLen;

    const proj =
      (ball.x - peg.x1) * ux +
      (ball.y - peg.y1) * uy;

    const t = Math.max(0, Math.min(segLen, proj));

    const nearX = peg.x1 + t * ux;
    const nearY = peg.y1 + t * uy;

    const distX = ball.x - nearX;
    const distY = ball.y - nearY;
    const dist =
      Math.sqrt(distX * distX + distY * distY);

    const minD = ball.r + PEG_R;

    if (dist < minD && dist > 0.01) {

      const nx = distX / dist;
      const ny = distY / dist;

      ball.x += nx * (minD - dist);
      ball.y += ny * (minD - dist);

      const dot = ball.vx * nx + ball.vy * ny;

      if (dot < 0) {
        const R = 0.6;
        ball.vx -= (1 + R) * dot * nx;
        ball.vy -= (1 + R) * dot * ny;
        if (peg.lit === 0) playBumperBeep();
        peg.lit = 10;
      }
    }
  }

  function hitBumper(ball, bumper) {

    const dx = ball.x - bumper.x;
    const dy = ball.y - bumper.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const minD = ball.r + bumper.r;

    if (dist < minD && dist > 0.01) {

      const nx = dx / dist;
      const ny = dy / dist;

      ball.x += nx * (minD - dist);
      ball.y += ny * (minD - dist);

      const dot = ball.vx * nx + ball.vy * ny;

      if (dot < 0) {
        const R = 0.85;
        ball.vx -= (1 + R) * dot * nx;
        ball.vy -= (1 + R) * dot * ny;
        if (bumper.lit === 0) playBumperBeep();
        bumper.lit = 22;
      }
    }
  }

  function hitBall(a, b) {

    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const minD = a.r + b.r;

    if (dist < minD && dist > 0.01) {

      const nx = dx / dist;
      const ny = dy / dist;
      const ov = (minD - dist) * 0.5;

      a.x -= nx * ov;
      a.y -= ny * ov;
      b.x += nx * ov;
      b.y += ny * ov;

      const rvx = b.vx - a.vx;
      const rvy = b.vy - a.vy;
      const dot = rvx * nx + rvy * ny;

      if (dot < 0) {
        const imp = -(1 + 0.45) * dot * 0.5;
        a.vx -= imp * nx;
        a.vy -= imp * ny;
        b.vx += imp * nx;
        b.vy += imp * ny;
      }
    }
  }

  // ── 게임 상태 ──

  const winners = [];

  const sonicBooms = [];

  let doneHandled = false;

  const startTime = Date.now();

  const RELEASE_MS = 500;

  function update() {

    const elapsed = Date.now() - startTime;

    const toRelease =
      Math.floor(elapsed / RELEASE_MS);

    for (let i = 0;
         i < Math.min(toRelease, balls.length);
         i++) {
      balls[i].active = true;
    }

    const active =
      balls.filter(b => b.active && !b.exited);

    // 스피너 각도 갱신 (프레임당 1회)
    for (const sp of spinners) {
      sp.ang += sp.angVel;
      const h = sp.len / 2;
      const cos = Math.cos(sp.ang);
      const sin = Math.sin(sp.ang);
      sp.x1 = sp.cx - cos * h;
      sp.y1 = sp.cy - sin * h;
      sp.x2 = sp.cx + cos * h;
      sp.y2 = sp.cy + sin * h;
    }

    for (const ball of active) {

      ball.vy += 0.28;

      const spd =
        Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);

      if (spd > 14) {
        ball.vx = ball.vx / spd * 14;
        ball.vy = ball.vy / spd * 14;
      }

      ball.x += ball.vx;
      ball.y += ball.vy;

      if (ball.x - ball.r < PLAY_X) {
        ball.x = PLAY_X + ball.r;
        ball.vx = Math.abs(ball.vx) * 0.65;
      }

      if (ball.x + ball.r > PLAY_X2) {
        ball.x = PLAY_X2 - ball.r;
        ball.vx = -Math.abs(ball.vx) * 0.65;
      }

      for (const peg of pegs) hitPeg(ball, peg);

      for (const bumper of bumpers) hitBumper(ball, bumper);

      for (const sp of spinners) hitPeg(ball, sp);

      // 5초 이상 멈춤 → 소닉붐
      const bSpeed =
        Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
      const nowMs = Date.now();
      if (bSpeed < 0.8) {
        if (ball.stuckSince === null) ball.stuckSince = nowMs;
        else if (nowMs - ball.stuckSince > 5000) {
          ball.vx = (Math.random() - 0.5) * 8;
          ball.vy = -22;
          ball.stuckSince = null;
          sonicBooms.push({
            x: ball.x, y: ball.y, r: 0, alpha: 1.0,
          });
          playBumperBeep();
        }
      } else {
        ball.stuckSince = null;
      }

      if (ball.y - ball.r > PLAY_BOT) {

        ball.exited = true;

        if (winners.length < count) {

          winners.push(ball);

          if (
            winners.length === count &&
            !doneHandled
          ) {
            doneHandled = true;
            setTimeout(finalize, 1600);
          }
        }
      }
    }

    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        hitBall(active[i], active[j]);
      }
    }

    for (const peg of pegs) {
      if (peg.lit > 0) peg.lit--;
    }

    for (const bumper of bumpers) {
      if (bumper.lit > 0) bumper.lit--;
    }

    for (const sp of spinners) {
      if (sp.lit > 0) sp.lit--;
    }

    for (let i = sonicBooms.length - 1; i >= 0; i--) {
      sonicBooms[i].r += 7;
      sonicBooms[i].alpha -= 0.035;
      if (sonicBooms[i].alpha <= 0) sonicBooms.splice(i, 1);
    }

    // 카메라: 가장 아래 활성 공을 부드럽게 추적
    if (active.length > 0) {
      const maxY = Math.max(...active.map(b => b.y));
      const target = Math.max(
        0,
        Math.min(maxY - H * 0.55, WORLD_H - H)
      );
      cameraY += (target - cameraY) * 0.04;
    }

  }

  // ── 그리기 ──

  const RANK_COLORS = [
    '#ff6b6b', '#6bff9a', '#6bffff',
    '#ffd56b', '#ff6bff', '#b06bff',
  ];

  function drawBar(cx, cy, len, thick, ang) {

    const r = thick / 2;
    const h = len / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.moveTo(-h + r, -r);
    ctx.lineTo(h - r, -r);
    ctx.arc(h - r, 0, r, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(-h + r, r);
    ctx.arc(-h + r, 0, r, Math.PI / 2, -Math.PI / 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawScene() {

    // 배경 (화면 좌표)
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    // ── 세계 좌표 렌더링 시작 ──
    ctx.save();
    ctx.translate(0, -cameraY);

    // 플레이 영역 경계선
    ctx.save();
    ctx.shadowBlur = 20;
    ctx.shadowColor = 'rgba(255,255,255,0.7)';
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 2;
    ctx.strokeRect(
      PLAY_X, PLAY_TOP,
      PLAY_W, PLAY_BOT - PLAY_TOP
    );
    ctx.restore();

    // 결승선 (노란 점선)
    ctx.save();
    ctx.shadowBlur = 24;
    ctx.shadowColor = '#ffe066';
    ctx.strokeStyle = '#ffe066';
    ctx.lineWidth = 3;
    ctx.setLineDash([18, 10]);
    ctx.beginPath();
    ctx.moveTo(PLAY_X, PLAY_BOT);
    ctx.lineTo(PLAY_X2, PLAY_BOT);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // 핀 (시안 네온 바)
    for (const peg of pegs) {

      const lit = peg.lit > 0;

      ctx.save();
      ctx.shadowBlur = lit ? 22 : 10;
      ctx.shadowColor = lit ? '#ffffff' : '#00e5ff';
      ctx.fillStyle = lit ? '#ffffff' : '#00e5ff';
      drawBar(peg.cx, peg.cy, peg.len, peg.thick, peg.ang);
      ctx.restore();
    }

    // 스피너 (주황 네온 회전 바)
    for (const sp of spinners) {

      const lit = sp.lit > 0;

      ctx.save();
      ctx.shadowBlur = lit ? 30 : 14;
      ctx.shadowColor = lit ? '#ffffff' : '#ff9f43';
      ctx.fillStyle   = lit ? '#ffffff' : '#ff9f43';
      drawBar(sp.cx, sp.cy, sp.len, PEG_THICK, sp.ang);
      ctx.beginPath();
      ctx.arc(sp.cx, sp.cy, PEG_R * 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 원형 범퍼
    for (const bumper of bumpers) {

      const lit = bumper.lit > 0;

      ctx.save();
      ctx.shadowBlur = lit ? 40 : 16;
      ctx.shadowColor = lit ? '#ffffff' : bumper.color;

      ctx.strokeStyle = lit ? '#ffffff' : bumper.color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(bumper.x, bumper.y, bumper.r, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = lit
        ? 'rgba(255,255,255,0.25)'
        : bumper.color + '28';
      ctx.fill();

      const cs = bumper.r * 0.35;
      ctx.strokeStyle = lit ? '#ffffff' : bumper.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(bumper.x - cs, bumper.y);
      ctx.lineTo(bumper.x + cs, bumper.y);
      ctx.moveTo(bumper.x, bumper.y - cs);
      ctx.lineTo(bumper.x, bumper.y + cs);
      ctx.stroke();
      ctx.restore();
    }

    // 소닉붐 이펙트
    for (const sb of sonicBooms) {
      ctx.save();
      ctx.globalAlpha = sb.alpha;
      ctx.shadowBlur = 24;
      ctx.shadowColor = '#00e5ff';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(sb.x, sb.y, sb.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 공
    for (const ball of balls) {

      if (!ball.active || ball.exited) continue;

      if (ball.isTeacher) {

        ctx.save();
        ctx.shadowBlur = 28;
        ctx.shadowColor = '#ffe066';
        ctx.fillStyle = '#ffe066';
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.fillStyle = '#3d2000';
        ctx.font =
          `bold ${Math.floor(ball.r * 0.60)}px ` +
          `Noto Sans KR, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('선생님', ball.x, ball.y);
        ctx.restore();

      } else {

        ctx.save();
        ctx.shadowBlur = 14;
        ctx.shadowColor = ball.color;
        ctx.fillStyle = ball.color;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.fillStyle = '#000';
        ctx.font =
          `bold ${Math.floor(ball.r * 0.88)}px ` +
          `Noto Sans KR, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(ball.num, ball.x, ball.y);
        ctx.restore();
      }
    }

    // ── 세계 좌표 렌더링 끝 ──
    ctx.restore();

    // ── HUD (화면 좌표) ──

    // 카운터 (우상단)
    const cfsz = Math.max(18, Math.floor(W * 0.022));

    ctx.save();
    ctx.fillStyle = 'rgba(180,180,180,0.85)';
    ctx.font = `bold ${cfsz}px sans-serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(
      `${winners.length} / ${count}`,
      W - 20, 16
    );
    ctx.restore();

    // 당첨 순위 목록 (플레이 영역 오른쪽 바깥 패널)
    const listX  = PLAY_X2 + 10;
    const listY0 = H * 0.06;
    const listW  = Math.max(60, W - PLAY_X2 - 20);
    const availH = H - listY0 - 20;
    const maxLineH = Math.max(54, H * 0.09);
    const lineH  = Math.min(maxLineH, availH / count);
    const rfsz   = Math.max(20, Math.min(
      Math.floor(lineH * 0.82),
      Math.floor(listW / 2.8)
    ));

    for (let i = 0; i < winners.length; i++) {

      const y = listY0 + i * lineH;
      const c = RANK_COLORS[i % RANK_COLORS.length];

      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(
        listX - 4, y - lineH * 0.5,
        listW, lineH * 0.92
      );
      ctx.restore();

      ctx.save();
      ctx.shadowBlur = 10;
      ctx.shadowColor = c;
      ctx.fillStyle = c;
      ctx.font =
        `bold ${rfsz}px Noto Sans KR, sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        `#${i + 1}  ${winners[i].num}번`,
        listX, y
      );
      ctx.restore();
    }
  }

  function finalize() {

    if (stopPinball) return;

    stopPinball = true;

    overlay.classList.remove('show');

    const selected = winners.map(b => b.num);

    selected.sort((a, b) => {
      if (a === '선생님') return -1;
      if (b === '선생님') return 1;
      return Number(a) - Number(b);
    });

    for (const num of selected) {
      const idx = remainingNumbers.indexOf(num);
      if (idx !== -1) remainingNumbers.splice(idx, 1);
      pickedNumbers.push(num);
    }

    const cells = Array.from(
      document.querySelectorAll('.number-cell')
    );

    for (const num of selected) {
      const cell =
        cells.find(c => c.dataset.num === num);
      if (cell) cell.classList.add('picked');
    }

    const resultText = selected.join(', ');

    numberDisplay.textContent = resultText;

    numberDisplay.style.fontSize =
      adjustFontSize(resultText);

    numberDisplay.classList.remove(
      'placeholder', 'notice'
    );

    bigNumber.textContent = resultText;

    bigNumber.style.fontSize =
      adjustFontSize(resultText);

    bigOverlay.classList.add('show');

    updatePickedNumbers();

    playSound();

    drawButton.disabled = false;
  }

  function loop() {

    if (stopPinball) return;

    update();

    drawScene();

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
