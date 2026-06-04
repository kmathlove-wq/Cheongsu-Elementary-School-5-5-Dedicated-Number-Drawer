let pinballRafId = null;

let stopPinball = false;

export function stopPinballMode() {

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
}

export function drawNumbersPinball({
  remainingEntries,
  drawCountSelect,
  numberDisplay,
  drawButton,
  compareItems,
  getResultLabel,
  getDisplayLabel,
  playBumperBeep,
  forcedItems = [],
  applyPinballResult,
}) {

  if (remainingEntries.length === 0) {

    numberDisplay.textContent =
      '모든 번호를 이미 뽑았습니다!';

    numberDisplay.classList.remove('placeholder');

    numberDisplay.classList.add('notice');

    return;
  }

  const count = Math.min(
    Number(drawCountSelect.value),
    remainingEntries.length
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

  // ── 미니맵 ──
  const MM_MARGIN = 5;
  const MM_W = Math.max(0, Math.min(70, PLAY_X - MM_MARGIN * 2));
  const MM_H = H - MM_MARGIN * 2;
  const MM_X = MM_MARGIN;
  const MM_Y = MM_MARGIN;
  const MM_SCALE_X = MM_W > 0 ? MM_W / PLAY_W : 0;
  const MM_SCALE_Y = MM_H / WORLD_H;
  let minimapHover = false;
  let minimapTargetCamY = 0;

  // ── 공 ──
  const BALL_R =
    Math.max(13, Math.min(21, PLAY_W / 27));

  const PALETTE = [
    '#ff6b6b', '#ffd56b', '#6bffb0', '#6bffff',
    '#b06bff', '#ff6bff', '#ff9f6b', '#b0ff6b',
    '#6bb0ff', '#ff6baa', '#6bff6b', '#ffb06b',
  ];

  const forcedSet = new Set(forcedItems);

  const shuffledItems =
    [...remainingEntries]
      .map((entry) => ({
        entry,
        sort: Math.random(),
      }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ entry }) => entry);

  const dropItems =
    shuffledItems;

  const BALL_GAP = BALL_R * 2.35;

  const DROP_COLS =
    Math.max(
      1,
      Math.min(
        dropItems.length,
        Math.floor(PLAY_W / BALL_GAP)
      )
    );

  const balls = dropItems.map((entry, i) => {
    const num = entry.item;
    const isTeacher = num === '선생님';
    const isForced = forcedSet.has(entry.key);
    const forceSide = i % 2 === 0 ? -1 : 1;
    const col = i % DROP_COLS;
    const row = Math.floor(i / DROP_COLS);
    const rowCount =
      Math.min(DROP_COLS, dropItems.length - row * DROP_COLS);
    const rowW = (rowCount - 1) * BALL_GAP;
    return {
      num,
      key: entry.key,
      x: isForced
        ? (
          forceSide < 0
            ? PLAY_X + BALL_R * 1.1
            : PLAY_X2 - BALL_R * 1.1
        )
        : PLAY_X + PLAY_W / 2 - rowW / 2 + col * BALL_GAP,
      y: PLAY_TOP + BALL_R + row * BALL_GAP,
      vx: 0,
      vy: 0,
      r: BALL_R,
      color: isTeacher ? '#ffe066' : PALETTE[i % PALETTE.length],
      active: true,
      exited: false,
      stuckSince: null,
      sonicCooldown: 0,
      isTeacher,
      isForced,
      forceSide,
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

  function keepBallInLane(ball) {

    if (ball.isForced) {
      ball.x = ball.forceSide < 0
        ? PLAY_X + ball.r
        : PLAY_X2 - ball.r;
      ball.vx = 0;
      return;
    }

    const laneInset =
      Math.min(
        PLAY_W / 2 - ball.r,
        Math.max(ball.r * 2.2, PEG_LEN * 0.45)
      );
    const laneLeft = PLAY_X + laneInset;
    const laneRight = PLAY_X2 - laneInset;

    if (ball.x < laneLeft) {
      ball.x = laneLeft;
      ball.vx = Math.abs(ball.vx) * 0.65 + 0.25;
    }

    if (ball.x > laneRight) {
      ball.x = laneRight;
      ball.vx = -Math.abs(ball.vx) * 0.65 - 0.25;
    }
  }

  // ── 게임 상태 ──

  const winners = [];

  const sonicBooms = [];

  let doneHandled = false;

  // ── 미니맵 마우스 이벤트 ──
  function onMMMove(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top)  * scaleY;
    if (MM_W >= 20 &&
        mx >= MM_X && mx <= MM_X + MM_W &&
        my >= MM_Y && my <= MM_Y + MM_H) {
      minimapHover = true;
      const worldY = (my - MM_Y) / MM_H * WORLD_H;
      minimapTargetCamY =
        Math.max(0, Math.min(worldY - H / 2, WORLD_H - H));
    } else {
      minimapHover = false;
    }
  }
  canvas.addEventListener('mousemove', onMMMove);
  canvas.addEventListener('mouseleave', () => { minimapHover = false; });

  function update() {

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

      const maxSpeed = 14;

      if (spd > maxSpeed) {
        ball.vx = ball.vx / spd * maxSpeed;
        ball.vy = ball.vy / spd * maxSpeed;
      }

      keepBallInLane(ball);

      ball.x += ball.vx;
      ball.y += ball.vy;

      keepBallInLane(ball);

      if (!ball.isForced) {
        for (const peg of pegs) hitPeg(ball, peg);

        for (const bumper of bumpers) hitBumper(ball, bumper);

        for (const sp of spinners) hitPeg(ball, sp);
      }

      keepBallInLane(ball);

      // 5초 이상 멈춤 → 소닉붐
      const bSpeed =
        Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
      const nowMs = Date.now();
      if (ball.sonicCooldown > 0) {
        ball.sonicCooldown--;
      }
      if (
        ball.isForced &&
        bSpeed < 1.8 &&
        ball.sonicCooldown === 0
      ) {
        ball.vx = ball.forceSide * 5;
        ball.vy = -14;
        ball.stuckSince = null;
        ball.sonicCooldown = 60;
        sonicBooms.push({
          x: ball.x, y: ball.y, r: 0, alpha: 1.0,
        });
        playBumperBeep();
      } else if (bSpeed < 0.8) {
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
        if (active[i].isForced || active[j].isForced) {
          continue;
        }

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

    // 카메라: 미니맵 호버 시 해당 위치, 기본은 공 추적
    if (minimapHover) {
      cameraY += (minimapTargetCamY - cameraY) * 0.12;
    } else if (active.length > 0) {
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

  function drawMinimap() {
    if (MM_W < 20) return;

    ctx.save();

    // 배경
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect(MM_X, MM_Y, MM_W, MM_H);

    // 테두리
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(MM_X, MM_Y, MM_W, MM_H);

    // 세계 좌표 → 미니맵 화면 좌표 변환
    function mmX(wx) { return MM_X + (wx - PLAY_X) * MM_SCALE_X; }
    function mmY(wy) { return MM_Y + wy * MM_SCALE_Y; }

    // 결승선
    ctx.save();
    ctx.shadowBlur = 4;
    ctx.shadowColor = '#ffe066';
    ctx.strokeStyle = '#ffe066';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(MM_X, mmY(PLAY_BOT));
    ctx.lineTo(MM_X + MM_W, mmY(PLAY_BOT));
    ctx.stroke();
    ctx.restore();

    // 핀 (시안 점)
    ctx.fillStyle = '#00e5ff';
    for (const peg of pegs) {
      const px = mmX(peg.cx);
      const py = mmY(peg.cy);
      if (py < MM_Y || py > MM_Y + MM_H) continue;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(peg.ang);
      const hw = Math.max(2, peg.len * MM_SCALE_X / 2);
      ctx.fillRect(-hw, -0.75, hw * 2, 1.5);
      ctx.restore();
    }

    // 스피너 (주황)
    ctx.fillStyle = '#ff9f43';
    for (const sp of spinners) {
      const px = mmX(sp.cx);
      const py = mmY(sp.cy);
      if (py < MM_Y || py > MM_Y + MM_H) continue;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(sp.ang);
      const hw = Math.max(3, sp.len * MM_SCALE_X / 2);
      ctx.fillRect(-hw, -0.75, hw * 2, 1.5);
      ctx.restore();
    }

    // 범퍼 (컬러 원)
    for (const b of bumpers) {
      const px = mmX(b.x);
      const py = mmY(b.y);
      if (py < MM_Y || py > MM_Y + MM_H) continue;
      const r = Math.max(2, b.r * MM_SCALE_X);
      ctx.strokeStyle = b.color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 공 (결승선 통과 공은 미니맵에서 제외)
    for (const ball of balls) {
      if (!ball.active || ball.exited) continue;
      const px = mmX(ball.x);
      const py = mmY(ball.y);
      if (py < MM_Y - 4 || py > MM_Y + MM_H + 4) continue;
      ctx.beginPath();
      ctx.arc(px, py, 2.2, 0, Math.PI * 2);
      ctx.fillStyle = ball.color;
      ctx.fill();
    }

    // 뷰포트 표시
    const vpY = MM_Y + cameraY * MM_SCALE_Y;
    const vpH = H * MM_SCALE_Y;
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(MM_X, vpY, MM_W, vpH);
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 1;
    ctx.strokeRect(MM_X, vpY, MM_W, vpH);

    // 호버 커서 라인
    if (minimapHover) {
      const curY = MM_Y + minimapTargetCamY * MM_SCALE_Y + vpH / 2;
      ctx.strokeStyle = 'rgba(255,80,80,0.8)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(MM_X, curY);
      ctx.lineTo(MM_X + MM_W, curY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }

  function fitText(text, maxWidth) {

    if (ctx.measureText(text).width <= maxWidth) {
      return text;
    }

    const ellipsis = '...';

    let clipped = text;

    while (
      clipped.length > 0 &&
      ctx.measureText(`${clipped}${ellipsis}`).width > maxWidth
    ) {
      clipped = clipped.slice(0, -1);
    }

    return clipped
      ? `${clipped}${ellipsis}`
      : ellipsis;
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
        ctx.fillText(
          getDisplayLabel(ball.num, 2),
          ball.x,
          ball.y
        );
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
      const rankText = `#${i + 1} `;
      const rankW = ctx.measureText(rankText).width;
      const nameText =
        fitText(
          getResultLabel(winners[i].num),
          Math.max(12, listW - rankW - 8)
        );
      ctx.fillText(
        `${rankText}${nameText}`,
        listX, y
      );
      ctx.restore();
    }

    drawMinimap();
  }

  function finalize() {

    if (stopPinball) return;

    stopPinball = true;
    canvas.removeEventListener('mousemove', onMMMove);

    overlay.classList.remove('show');

    const selectedBalls = [...winners];

    const forcedAvailable =
      forcedItems
        .map((key) =>
          balls.find((ball) => ball.key === key)
        )
        .filter(Boolean);

    for (const forcedBall of forcedAvailable) {

      if (
        selectedBalls.some((ball) => ball.key === forcedBall.key)
      ) {
        continue;
      }

      if (selectedBalls.length < count) {
        selectedBalls.push(forcedBall);
        continue;
      }

      const replaceIndex =
        selectedBalls.findIndex((ball) =>
          !forcedSet.has(ball.key)
        );

      if (replaceIndex !== -1) {
        selectedBalls[replaceIndex] = forcedBall;
      }
    }

    selectedBalls.splice(count);

    const selectedEntries =
      selectedBalls
        .map((ball) => ({
          item: ball.num,
          key: ball.key,
        }))
        .sort((a, b) => compareItems(a.item, b.item));

    applyPinballResult(selectedEntries);

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
