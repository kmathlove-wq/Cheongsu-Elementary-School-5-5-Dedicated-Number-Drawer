import {
  getMotionMultiplier,
  scaleMotionTime,
} from './motion.js';
import {
  createPinballMap,
  getPinballWorldScale,
} from './pinball-maps.js?v=clean-pegs-seamless-branches';
import {
  getPinballMap,
} from './settings.js?v=clean-pegs-seamless-branches';

let pinballRafId = null;

let pinballFinalizeTimer = null;

let stopPinball = false;

let pinballCleanup = null;

export function stopPinballMode() {

  stopPinball = true;

  if (pinballRafId) {
    cancelAnimationFrame(pinballRafId);
    pinballRafId = null;
  }

  if (pinballFinalizeTimer) {
    clearTimeout(pinballFinalizeTimer);
    pinballFinalizeTimer = null;
  }

  if (pinballCleanup) {
    pinballCleanup();
    pinballCleanup = null;
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
  pinballMapOverride = null,
  debugFrame = null,
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
  pinballFinalizeTimer = null;

  const overlay =
    document.getElementById('pinballOverlay');

  const canvas =
    document.getElementById('pinballCanvas');

  const ctx = canvas.getContext('2d');

  const viewportWidth =
    window.visualViewport?.width ||
    document.documentElement.clientWidth ||
    window.innerWidth;
  const viewportHeight =
    window.visualViewport?.height ||
    document.documentElement.clientHeight ||
    window.innerHeight;
  const isMobilePinball =
    viewportWidth <= 1200 ||
    navigator.maxTouchPoints > 0 ||
    window.matchMedia('(pointer: coarse)').matches;
  // 휴대폰은 캔버스 해상도·장애물·프레임 수를 줄여 발열과 끊김을 낮춘다.
  const renderScale = isMobilePinball ? 0.84 : 1;

  canvas.width = Math.round(viewportWidth * renderScale);

  canvas.height = Math.round(viewportHeight * renderScale);

  const W = canvas.width;

  const H = canvas.height;

  let cameraY = 0;
  let cameraFocusBall = null;
  const selectedPinballMap =
    pinballMapOverride || getPinballMap();

  overlay.classList.add('show');

  // ── 플레이 영역 (세계 좌표) ──
  const MOBILE_HUD_W = isMobilePinball
    ? Math.max(112, W * 0.34)
    : 0;
  const PLAY_W = Math.min(
    isMobilePinball ? W - MOBILE_HUD_W - 14 : W * 0.62,
    720
  );

  const PLAY_X = isMobilePinball
    ? 2
    : (W - PLAY_W) / 2;

  const PLAY_X2 = PLAY_X + PLAY_W;

  const MOBILE_HUD_X = PLAY_X2 + 6;

  const BALL_R =
    Math.max(13, Math.min(21, PLAY_W / 27));

  const BALL_GAP = BALL_R * 2.35;

  const DROP_COLS = Math.max(
    1,
    Math.min(
      remainingEntries.length,
      Math.floor(PLAY_W / BALL_GAP)
    )
  );

  const DROP_ROWS = Math.ceil(
    remainingEntries.length / DROP_COLS
  );
  const WORLD_H =
    H * getPinballWorldScale(selectedPinballMap, isMobilePinball);
  const PLAY_BOT = WORLD_H * 0.95;

  // ── 미니맵 ──
  const MM_MARGIN = 5;
  const MM_AVAILABLE_W =
    Math.max(0, PLAY_X - MM_MARGIN * 2);
  const MM_AVAILABLE_H =
    H - MM_MARGIN * 2;
  const MM_WORLD_H = PLAY_BOT;
  const MM_SCALE =
    Math.min(
      MM_AVAILABLE_W / PLAY_W,
      MM_AVAILABLE_H / MM_WORLD_H
    );
  const MM_W = PLAY_W * MM_SCALE;
  const MM_H = MM_WORLD_H * MM_SCALE;
  const MM_X =
    Math.max(MM_MARGIN, (PLAY_X - MM_W) / 2);
  const MM_Y = (H - MM_H) / 2;
  const MM_SCALE_X = MM_SCALE;
  const MM_SCALE_Y = MM_SCALE;
  let minimapHover = false;
  let minimapTargetCamY = 0;

  // ── 공 ──
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

  const balls = dropItems.map((entry, i) => {
    const num = entry.item;
    const isTeacher = num === '선생님';
    const isForced = forcedSet.has(entry.key);
    const col = i % DROP_COLS;
    const row = Math.floor(i / DROP_COLS);
    const rowFromBottom = DROP_ROWS - 1 - row;
    const rowCount =
      Math.min(DROP_COLS, dropItems.length - row * DROP_COLS);
    const rowW = (rowCount - 1) * BALL_GAP;
    return {
      num,
      key: entry.key,
      x: PLAY_X + PLAY_W / 2 - rowW / 2 + col * BALL_GAP,
      y: -BALL_R - 4 - rowFromBottom * BALL_GAP,
      vx: 0,
      vy: 0,
      r: BALL_R,
      color: isTeacher ? '#ffe066' : PALETTE[i % PALETTE.length],
      active: true,
      exited: false,
      stuckSince: null,
      noBallCollisionFrames: 0,
      sonicCooldown: 0,
      boosterCooldown: 0,
      usedBoosters: new Set(),
      usedWaterLifts: new Set(),
      activeWaterLift: null,
      usedWaterClimbs: new Set(),
      activeWaterClimb: null,
      raceProgress: 0,
      isTeacher,
      isForced,
    };
  });

  // ── 선택한 맵의 장애물 ──
  const PEG_LEN = PLAY_W / 10;

  const PEG_THICK = Math.max(6, Math.floor(BALL_R * 0.38));

  const PEG_R = PEG_THICK / 2;

  const BUMPER_R = Math.max(16, Math.floor(PLAY_W / 22));

  const SPINNER_LEN = PEG_LEN * 2.8;
  const pinballMap = createPinballMap(selectedPinballMap, {
    playX: PLAY_X,
    playW: PLAY_W,
    worldH: WORLD_H,
    pegLen: PEG_LEN,
    pegThick: PEG_THICK,
    bumperR: BUMPER_R,
    spinnerLen: SPINNER_LEN,
    isMobile: isMobilePinball,
  });
  const {
    pegs, bumpers, spinners,
    boosters, waterLifts, waterClimbs,
  } = pinballMap;
  const startLane = pinballMap.course.at(0);
  for (const ball of balls) {
    const startRatio = (ball.x - PLAY_X) / PLAY_W;
    const usableWidth =
      Math.max(0, startLane.right - startLane.left - ball.r * 2);
    ball.x =
      startLane.left + ball.r + usableWidth * startRatio;
  }

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

    const minD =
      ball.r + (peg.thick || PEG_THICK) / 2;

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

    if (!bumper.active) return;

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
        const R = bumper.power;
        ball.vx -= (1 + R) * dot * nx;
        ball.vy -= (1 + R) * dot * ny;
        ball.vx += nx * bumper.kick;
        ball.vy += ny * bumper.kick;
        if (bumper.lit === 0) playBumperBeep();
        bumper.lit = 22;
        if (bumper.oneShot) {
          bumper.active = false;
          sonicBooms.push({
            x: bumper.x,
            y: bumper.y,
            r: bumper.r,
            alpha: 1,
            reason: 'bumper',
          });
        }
      }
    }
  }

  function hitBooster(ball, booster) {

    const inside =
      Math.abs(ball.x - booster.x) <= booster.w / 2 + ball.r &&
      Math.abs(ball.y - booster.y) <= booster.h / 2 + ball.r;

    if (
      !inside ||
      ball.boosterCooldown > 0 ||
      (
        booster.oncePerBall &&
        ball.usedBoosters.has(booster.id)
      )
    ) return;

    ball.vx += booster.vx;
    ball.vy += booster.vy;
    if (booster.oncePerBall) {
      ball.usedBoosters.add(booster.id);
    }
    ball.boosterCooldown = 28;
    booster.lit = 18;
    playBumperBeep();
  }

  function getWaterLiftBounds(
    lift,
    worldY,
    widthRatio = lift.widthRatio
  ) {

    const lane = pinballMap.course.at(worldY);
    const laneWidth = lane.right - lane.left;
    const center =
      lane.left + laneWidth * lift.position;
    const width = laneWidth * widthRatio;
    return {
      left: center - width / 2,
      right: center + width / 2,
      center,
    };
  }

  function updateWaterLift(ball, motionStep) {

    if (!ball.activeWaterLift) {
      const lift = waterLifts.find((candidate) => {
        if (ball.usedWaterLifts.has(candidate.id)) return false;
        const inlet = getWaterLiftBounds(
          candidate,
          candidate.bottomY,
          candidate.inletWidthRatio
        );
        return (
          ball.y >= candidate.bottomY - ball.r * 3 &&
          ball.y <= candidate.bottomY + ball.r * 2 &&
          ball.x >= inlet.left + ball.r &&
          ball.x <= inlet.right - ball.r
        );
      });

      if (lift) {
        ball.activeWaterLift = lift;
        ball.noBallCollisionFrames = 45;
        ball.vy = -Math.max(5, lift.riseSpeed * 0.55);
        const water = getWaterLiftBounds(lift, ball.y);
        ball.x += (water.center - ball.x) * 0.32;
        playBumperBeep();
      }
    }

    const lift = ball.activeWaterLift;
    if (!lift) return false;

    const water = getWaterLiftBounds(lift, ball.y);
    ball.vx += (water.center - ball.x) * 0.07 * motionStep;
    ball.vx *= Math.pow(0.84, motionStep);
    ball.vy = Math.max(
      -lift.riseSpeed,
      ball.vy - 0.72 * motionStep
    );

    if (ball.y <= lift.topY + ball.r * 1.3) {
      ball.y = lift.topY + ball.r * 1.3;
      const outlet = getWaterLiftBounds(lift, ball.y);
      const lane = pinballMap.course.at(ball.y);
      const exitSide = lift.position < 0.5 ? 1 : -1;
      ball.x = exitSide > 0
        ? Math.min(
          lane.right - ball.r,
          outlet.right + ball.r * 1.8
        )
        : Math.max(
          lane.left + ball.r,
          outlet.left - ball.r * 1.8
        );
      ball.usedWaterLifts.add(lift.id);
      ball.activeWaterLift = null;
      ball.vx = exitSide * (4 + Math.random() * 2);
      ball.vy = lift.dropSpeed;
      ball.noBallCollisionFrames = 55;
    }

    return true;
  }

  function getWaterClimbPoint(climb, distance) {

    const safeDistance = Math.max(
      0,
      Math.min(climb.totalLength, distance)
    );
    const segment =
      climb.segments.find((candidate) =>
        safeDistance <= candidate.startDistance + candidate.length
      ) ||
      climb.segments[climb.segments.length - 1];
    const ratio = segment.length > 0
      ? (safeDistance - segment.startDistance) / segment.length
      : 1;
    return {
      x: segment.start.x + (segment.end.x - segment.start.x) * ratio,
      y: segment.start.y + (segment.end.y - segment.start.y) * ratio,
      angle: Math.atan2(
        segment.end.y - segment.start.y,
        segment.end.x - segment.start.x
      ),
    };
  }

  function updateWaterClimb(ball, motionStep) {

    if (!ball.activeWaterClimb) {
      const climb = waterClimbs.find((candidate) => {
        if (ball.usedWaterClimbs.has(candidate.id)) return false;
        const entry = candidate.points[0];
        const lane = pinballMap.course.at(entry.y);
        const laneWidth = lane.right - lane.left;
        const inletLeft =
          lane.left + laneWidth * candidate.entryMinRatio;
        const inletRight =
          lane.left + laneWidth * candidate.entryMaxRatio;
        const leftMargin =
          candidate.entryMinRatio === 0 ? ball.r : 0;
        const rightMargin =
          candidate.entryMaxRatio === 1 ? ball.r : 0;
        return (
          ball.y >= entry.y - ball.r * 3 &&
          ball.y <= entry.y + ball.r * 2 &&
          ball.x >= inletLeft + leftMargin &&
          ball.x <= inletRight - rightMargin
        );
      });

      if (climb) {
        const entry = climb.points[0];
        const maxOffset = Math.max(0, climb.width / 2 - ball.r * 1.2);
        const laneOffset = Math.max(
          -maxOffset,
          Math.min(maxOffset, ball.x - entry.x)
        );
        const routeStart = getWaterClimbPoint(climb, 0);
        ball.activeWaterClimb = {
          climb,
          distance: 0,
          laneOffset,
        };
        ball.x =
          routeStart.x - Math.sin(routeStart.angle) * laneOffset;
        ball.y =
          routeStart.y + Math.cos(routeStart.angle) * laneOffset;
        ball.noBallCollisionFrames = 60;
        ball.vx = 0;
        ball.vy = 0;
        playBumperBeep();
      }
    }

    const activeClimb = ball.activeWaterClimb;
    if (!activeClimb) return false;

    activeClimb.distance = Math.min(
      activeClimb.climb.totalLength,
      activeClimb.distance +
        activeClimb.climb.travelSpeed * motionStep
    );
    const target = getWaterClimbPoint(
      activeClimb.climb,
      activeClimb.distance
    );
    const offsetX =
      -Math.sin(target.angle) * activeClimb.laneOffset;
    const offsetY =
      Math.cos(target.angle) * activeClimb.laneOffset;
    const follow = Math.min(1, 0.34 * motionStep);
    ball.x += (target.x + offsetX - ball.x) * follow;
    ball.y += (target.y + offsetY - ball.y) * follow;
    ball.vx = 0;
    ball.vy = 0;

    const targetX = target.x + offsetX;
    const targetY = target.y + offsetY;
    const remainingDistance = Math.hypot(
      targetX - ball.x,
      targetY - ball.y
    );
    if (
      activeClimb.distance >= activeClimb.climb.totalLength &&
      remainingDistance <= Math.max(
        2,
        activeClimb.climb.travelSpeed * 0.35
      )
    ) {
      const climb = activeClimb.climb;
      ball.usedWaterClimbs.add(climb.id);
      ball.activeWaterClimb = null;
      const exitSpeed = 7;
      ball.vx = Math.cos(target.angle) * exitSpeed;
      ball.vy = Math.max(
        4,
        Math.sin(target.angle) * exitSpeed
      );
      ball.noBallCollisionFrames = 60;
    }

    return true;
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

  function keepBallInPlayArea(ball) {

    const lane = pinballMap.course.at(ball.y);
    const left = lane.left + ball.r;
    const right = lane.right - ball.r;
    let nx = 0;
    let ny = 0;

    if (ball.x < left) {
      ball.x = left;
      const length = Math.hypot(1, lane.leftSlope);
      nx = 1 / length;
      ny = -lane.leftSlope / length;
    } else if (ball.x > right) {
      ball.x = right;
      const length = Math.hypot(1, lane.rightSlope);
      nx = -1 / length;
      ny = lane.rightSlope / length;
    }

    if (nx !== 0) {
      const dot = ball.vx * nx + ball.vy * ny;
      if (dot < 0) {
        ball.vx -= 1.55 * dot * nx;
        ball.vy -= 1.55 * dot * ny;
      }
    }
  }

  function releaseStuckBall(ball) {

    const lane = pinballMap.course.at(ball.y);
    const laneCenter = (lane.left + lane.right) / 2;
    const side =
      ball.x < laneCenter
        ? 1
        : -1;

    ball.x += side * ball.r * 1.8;
    ball.y += ball.r * 1.4;
    ball.vx = side * 6;
    ball.vy = 9;
    ball.stuckSince = null;
    ball.noBallCollisionFrames = 32;
    ball.sonicCooldown = 45;
    keepBallInPlayArea(ball);

    sonicBooms.push({
      x: ball.x,
      y: ball.y,
      r: 0,
      alpha: 1.0,
      reason: 'stuck',
    });
    playBumperBeep();
  }

  // ── 게임 상태 ──

  const winners = [];

  const sonicBooms = [];

  let doneHandled = false;
  let rankScrollOffset = 0;
  let rankDragStartY = null;
  let rankThumbDrag = null;
  let rankUi = null;
  const RANK_DISPLAY_LIMIT = isMobilePinball ? 10 : 16;

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
      const worldY = (my - MM_Y) / MM_H * MM_WORLD_H;
      minimapTargetCamY =
        Math.max(0, Math.min(worldY - H / 2, WORLD_H - H));
    } else {
      minimapHover = false;
    }
  }

  function onMMLeave() {
    minimapHover = false;
  }

  function getCanvasPoint(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * canvas.width / rect.width,
      y: (clientY - rect.top) * canvas.height / rect.height,
    };
  }

  function isRankPanelPoint(clientX, clientY = 0) {
    const point = getCanvasPoint(clientX, clientY);
    return point.x >= (isMobilePinball ? MOBILE_HUD_X : PLAY_X2);
  }

  function containsPoint(rect, point) {
    return rect && point.x >= rect.x && point.x <= rect.x + rect.w &&
      point.y >= rect.y && point.y <= rect.y + rect.h;
  }

  function scrollRanks(amount) {
    const maxOffset = Math.max(0, winners.length - RANK_DISPLAY_LIMIT);
    rankScrollOffset = Math.max(
      0,
      Math.min(maxOffset, rankScrollOffset + amount)
    );
  }

  function onRankWheel(event) {
    if (count <= 30 || !isRankPanelPoint(event.clientX, event.clientY)) return;
    event.preventDefault();
    scrollRanks(event.deltaY < 0 ? 3 : -3);
  }

  function onRankPointerDown(event) {
    if (count <= 30) return;
    const point = getCanvasPoint(event.clientX, event.clientY);
    if (containsPoint(rankUi?.downButton, point)) {
      rankScrollOffset = 0;
      return;
    }
    if (containsPoint(rankUi?.thumb, point)) {
      rankThumbDrag = {
        pointerId: event.pointerId,
        startY: point.y,
        startOffset: rankScrollOffset,
      };
      canvas.setPointerCapture?.(event.pointerId);
      return;
    }
    if (containsPoint(rankUi?.track, point)) {
      const ratio = (point.y - rankUi.track.y) / rankUi.track.h;
      rankScrollOffset = Math.round(rankUi.maxOffset * (1 - ratio));
      scrollRanks(0);
      return;
    }
    if (isRankPanelPoint(event.clientX, event.clientY)) {
      rankDragStartY = point.y;
    }
  }

  function onRankPointerMove(event) {
    if (!rankThumbDrag || !rankUi ||
        rankThumbDrag.pointerId !== event.pointerId) return;
    const point = getCanvasPoint(event.clientX, event.clientY);
    const travel = Math.max(1, rankUi.track.h - rankUi.thumb.h);
    const delta = point.y - rankThumbDrag.startY;
    rankScrollOffset = Math.round(
      rankThumbDrag.startOffset - delta / travel * rankUi.maxOffset
    );
    scrollRanks(0);
  }

  function onRankPointerUp(event) {
    if (rankThumbDrag?.pointerId === event.pointerId) {
      rankThumbDrag = null;
      canvas.releasePointerCapture?.(event.pointerId);
      return;
    }
    if (rankDragStartY === null) return;
    const point = getCanvasPoint(event.clientX, event.clientY);
    const distance = point.y - rankDragStartY;
    rankDragStartY = null;
    if (Math.abs(distance) >= 20) scrollRanks(distance > 0 ? 3 : -3);
  }

  function onRankPointerCancel() {
    rankThumbDrag = null;
    rankDragStartY = null;
  }

  if (!isMobilePinball) {
    canvas.addEventListener('mousemove', onMMMove);
    canvas.addEventListener('mouseleave', onMMLeave);
  }
  canvas.addEventListener('wheel', onRankWheel, { passive: false });
  canvas.addEventListener('pointerdown', onRankPointerDown);
  canvas.addEventListener('pointermove', onRankPointerMove);
  canvas.addEventListener('pointerup', onRankPointerUp);
  canvas.addEventListener('pointercancel', onRankPointerCancel);
  pinballCleanup = () => {
    canvas.removeEventListener('mousemove', onMMMove);
    canvas.removeEventListener('mouseleave', onMMLeave);
    canvas.removeEventListener('wheel', onRankWheel);
    canvas.removeEventListener('pointerdown', onRankPointerDown);
    canvas.removeEventListener('pointermove', onRankPointerMove);
    canvas.removeEventListener('pointerup', onRankPointerUp);
    canvas.removeEventListener('pointercancel', onRankPointerCancel);
  };

  let mobilePhysicsFrame = 0;

  function update(frameScale = 1) {

    const active =
      balls.filter(b => b.active && !b.exited);
    const motionStep =
      Math.max(
        0.25,
        Math.min(2.5, (1 / getMotionMultiplier()) * frameScale)
      );

    mobilePhysicsFrame++;

    // 스피너 각도 갱신 (프레임당 1회)
    for (const sp of spinners) {
      if (sp.moveSpeed) {
        sp.phase += sp.moveSpeed * motionStep;
        sp.cx = sp.baseCx + Math.sin(sp.phase) * sp.moveRangeX;
        sp.cy = sp.baseCy + Math.cos(sp.phase * 0.73) * sp.moveRangeY;
      }
      sp.ang += sp.angVel * motionStep;
      const cos = Math.cos(sp.ang);
      const sin = Math.sin(sp.ang);
      let activeLength = sp.len;
      for (let attempt = 0; attempt < 7; attempt++) {
        const half = activeLength / 2;
        const ends = [
          [sp.cx - cos * half, sp.cy - sin * half],
          [sp.cx + cos * half, sp.cy + sin * half],
        ];
        const inside = ends.every(([x, y]) => {
          const lane = pinballMap.course.at(y);
          const margin = sp.thick / 2 + 2;
          return x >= lane.left + margin && x <= lane.right - margin;
        });
        if (inside) break;
        activeLength *= 0.84;
      }
      sp.currentLen = activeLength;
      const h = activeLength / 2;
      sp.x1 = sp.cx - cos * h;
      sp.y1 = sp.cy - sin * h;
      sp.x2 = sp.cx + cos * h;
      sp.y2 = sp.cy + sin * h;
    }

    for (const ball of active) {

      if (
        !Number.isFinite(ball.x) ||
        !Number.isFinite(ball.y) ||
        !Number.isFinite(ball.vx) ||
        !Number.isFinite(ball.vy)
      ) {
        const recoveryY = Math.max(
          0,
          Math.min(
            PLAY_BOT - ball.r * 4,
            (Number.isFinite(cameraY) ? cameraY : 0) + H * 0.28
          )
        );
        const recoveryLane = pinballMap.course.at(recoveryY);
        ball.x = (recoveryLane.left + recoveryLane.right) / 2;
        ball.y = recoveryY;
        ball.vx = 0;
        ball.vy = 2;
        ball.activeWaterLift = null;
        ball.activeWaterClimb = null;
        ball.noBallCollisionFrames = 45;
      }

      const prevX = ball.x;
      const prevY = ball.y;

      if (ball.noBallCollisionFrames > 0) {
        ball.noBallCollisionFrames--;
      }
      if (ball.boosterCooldown > 0) {
        ball.boosterCooldown--;
      }

      const climbMotion =
        updateWaterClimb(ball, motionStep);
      const liftMotion =
        !climbMotion && updateWaterLift(ball, motionStep);
      const waterMotion = climbMotion || liftMotion;

      if (!waterMotion) {
        ball.vy += 0.28 * motionStep;
      }

      const spd =
        Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);

      const maxSpeed =
        selectedPinballMap === 'factory' ? 22 : 14;

      if (spd > maxSpeed) {
        ball.vx = ball.vx / spd * maxSpeed;
        ball.vy = ball.vy / spd * maxSpeed;
      }

      if (!waterMotion) {
        keepBallInPlayArea(ball);
      }

      ball.x += ball.vx * motionStep;
      ball.y += ball.vy * motionStep;

      if (!waterMotion) {
        keepBallInPlayArea(ball);
      }

      if (!ball.isForced && !waterMotion) {
        for (const peg of pegs) {
          if (
            Math.abs(peg.cy - ball.y) <
            peg.len / 2 + ball.r + peg.thick
          ) {
            hitPeg(ball, peg);
          }
        }

        for (const bumper of bumpers) {
          if (
            bumper.active &&
            Math.abs(bumper.y - ball.y) < bumper.r + ball.r
          ) {
            hitBumper(ball, bumper);
          }
        }

        for (const sp of spinners) {
          if (Math.abs(sp.cy - ball.y) < sp.len / 2 + ball.r) {
            hitPeg(ball, sp);
          }
        }

        for (const booster of boosters) {
          hitBooster(ball, booster);
        }
      }

      if (!waterMotion) {
        keepBallInPlayArea(ball);
      }

      // 끼임 감지 → 위치 분리와 짧은 충돌 무시로 탈출
      const bSpeed =
        Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
      const moved =
        Math.sqrt(
          (ball.x - prevX) * (ball.x - prevX) +
          (ball.y - prevY) * (ball.y - prevY)
        );
      const nowMs = Date.now();
      if (ball.sonicCooldown > 0) {
        ball.sonicCooldown--;
      }
      if (
        !ball.isForced &&
        !waterMotion &&
        (bSpeed < 1.05 || moved < 0.35)
      ) {
        if (ball.stuckSince === null) ball.stuckSince = nowMs;
        else if (nowMs - ball.stuckSince > 1400) {
          releaseStuckBall(ball);
        }
      } else {
        ball.stuckSince = null;
      }

      if (ball.y - ball.r > PLAY_BOT) {

        ball.exited = true;

        if (winners.length < count) {

          winners.push(ball);

          if (rankScrollOffset > 0) rankScrollOffset++;

          if (
            winners.length === count &&
            !doneHandled
          ) {
            doneHandled = true;
            pinballFinalizeTimer =
              setTimeout(finalize, scaleMotionTime(1600));
          }
        }
      }

      const climbProgress = ball.activeWaterClimb
        ? ball.activeWaterClimb.climb.gapTopY +
          (
            ball.activeWaterClimb.climb.gapBottomY -
            ball.activeWaterClimb.climb.gapTopY
          ) *
          (
            ball.activeWaterClimb.distance /
            ball.activeWaterClimb.climb.totalLength
          )
        : ball.y;
      ball.raceProgress = Math.max(
        ball.raceProgress,
        climbProgress
      );
    }

    // 공간 격자로 가까운 공만 검사해 항목 수가 늘어도 연산량 폭증을 막는다.
    if (!isMobilePinball || mobilePhysicsFrame % 2 === 0) {
      const collisionCellSize = BALL_R * 2.5;
      const collisionGrid = new Map();

      for (const ball of active) {
        if (
          ball.isForced ||
          ball.activeWaterLift ||
          ball.activeWaterClimb ||
          ball.noBallCollisionFrames > 0
        ) continue;

        const cellX = Math.floor(ball.x / collisionCellSize);
        const cellY = Math.floor(ball.y / collisionCellSize);

        for (let ox = -1; ox <= 1; ox++) {
          for (let oy = -1; oy <= 1; oy++) {
            const nearby = collisionGrid.get(
              `${cellX + ox}:${cellY + oy}`
            );
            if (!nearby) continue;

            for (const other of nearby) hitBall(other, ball);
          }
        }

        const cellKey = `${cellX}:${cellY}`;
        const cell = collisionGrid.get(cellKey) || [];
        cell.push(ball);
        collisionGrid.set(cellKey, cell);
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

    for (const booster of boosters) {
      if (booster.lit > 0) booster.lit--;
    }

    for (let i = sonicBooms.length - 1; i >= 0; i--) {
      sonicBooms[i].r += 7;
      sonicBooms[i].alpha -= 0.035;
      if (sonicBooms[i].alpha <= 0) sonicBooms.splice(i, 1);
    }

    const trackingBalls =
      balls.filter((ball) => ball.active && !ball.exited);
    const cameraFrameStart = cameraY;

    // 카메라: 미니맵 호버 시 해당 위치, 기본은 공 추적
    if (minimapHover) {
      cameraY += (minimapTargetCamY - cameraY) * 0.12;
    } else if (trackingBalls.length > 0) {
      cameraFocusBall = trackingBalls.reduce((leader, ball) => {
        if (!leader) return ball;
        return ball.raceProgress > leader.raceProgress
          ? ball
          : leader;
      }, null);
      const focusY = cameraFocusBall.y;
      const target = Math.max(
        0,
        Math.min(focusY - H * 0.55, WORLD_H - H)
      );
      const waterClimbActive =
        Boolean(cameraFocusBall?.activeWaterClimb);
      const cameraFollow = waterClimbActive
        ? isMobilePinball ? 0.16 : 0.12
        : isMobilePinball
          ? 0.17
          : 0.09;
      const cameraDelta =
        (target - cameraY) * cameraFollow * frameScale;
      const maxCameraStep =
        H * (waterClimbActive ? 0.045 : 0.04);
      cameraY += Math.max(
        -maxCameraStep,
        Math.min(maxCameraStep, cameraDelta)
      );
    }

    if (!Number.isFinite(cameraY)) cameraY = 0;
    if (trackingBalls.length > 0) {
      const visibleBall = trackingBalls.some((ball) =>
        ball.y + ball.r >= cameraY &&
        ball.y - ball.r <= cameraY + H
      );
      if (!visibleBall) {
        const focusY =
          cameraFocusBall?.y ??
          Math.max(...trackingBalls.map((ball) => ball.y));
        const recoveryTarget = Math.max(
          0,
          Math.min(focusY - H * 0.55, WORLD_H - H)
        );
        const recoveryDelta = recoveryTarget - cameraY;
        const maxRecoveryStep = H * 0.06;
        cameraY += Math.max(
          -maxRecoveryStep,
          Math.min(maxRecoveryStep, recoveryDelta)
        );
      }
    }
    const cameraFrameLimit = H * 0.06;
    cameraY = cameraFrameStart + Math.max(
      -cameraFrameLimit,
      Math.min(cameraFrameLimit, cameraY - cameraFrameStart)
    );

    if (typeof debugFrame === 'function') {
      debugFrame({
        cameraY,
        cameraFocusKey: cameraFocusBall?.key || null,
        cameraFocusProgress:
          cameraFocusBall?.raceProgress ?? null,
        leadingProgress: trackingBalls.reduce(
          (progress, ball) =>
            Math.max(progress, ball.raceProgress),
          0
        ),
        viewportHeight: H,
        winners: winners.length,
        sonicReasons: sonicBooms.map((boom) => boom.reason),
        winnerWaterCourses:
          winners.map((ball) => ball.usedWaterClimbs.size),
        balls: trackingBalls.map((ball) => {
          const detour = ball.activeWaterClimb;
          const routePoint = detour
            ? getWaterClimbPoint(
              detour.climb,
              detour.distance
            )
            : null;
          const routeDeviation = routePoint
            ? Math.hypot(
              ball.x - routePoint.x,
              ball.y - routePoint.y
            )
            : 0;
          return {
            key: ball.key,
            x: ball.x,
            y: ball.y,
            r: ball.r,
            raceProgress: ball.raceProgress,
            inDetour: Boolean(detour),
            routeKind: detour?.climb.kind || null,
            insideDetour: !detour ||
              routeDeviation <= detour.climb.width / 2 + ball.r,
            inWater: Boolean(
              ball.activeWaterLift ||
              (
                detour &&
                detour.distance >= detour.climb.waterStartDistance &&
                detour.distance <= detour.climb.waterEndDistance
              )
            ),
          };
        }),
      });
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

  function drawBooster(booster) {

    const angle = Math.atan2(booster.vy, booster.vx);
    const lit = booster.lit > 0;
    const arrowSize = Math.max(7, booster.h * 0.55);

    ctx.save();
    ctx.shadowBlur = lit ? 28 : 14;
    ctx.shadowColor = booster.color;
    ctx.fillStyle = lit ? '#ffffff' : `${booster.color}55`;
    ctx.strokeStyle = lit ? booster.color : '#ffffff';
    ctx.lineWidth = Math.max(2, PEG_THICK * 0.28);
    ctx.fillRect(
      booster.x - booster.w / 2,
      booster.y - booster.h / 2,
      booster.w,
      booster.h
    );
    ctx.translate(booster.x, booster.y);
    ctx.rotate(angle);
    for (let offset = -arrowSize; offset <= arrowSize; offset += arrowSize) {
      ctx.beginPath();
      ctx.moveTo(offset - arrowSize * 0.45, -arrowSize * 0.45);
      ctx.lineTo(offset, 0);
      ctx.lineTo(offset - arrowSize * 0.45, arrowSize * 0.45);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawWaterLift(
    lift,
    getX = (value) => value,
    getY = (value) => value,
    detailed = true
  ) {

    const points = [];
    const steps = detailed ? 28 : 12;
    for (let index = 0; index <= steps; index++) {
      const y =
        lift.topY +
        (lift.bottomY - lift.topY) * index / steps;
      points.push({ y, ...getWaterLiftBounds(lift, y) });
    }

    ctx.save();
    ctx.fillStyle = detailed
      ? 'rgba(30, 170, 255, 0.28)'
      : 'rgba(30, 170, 255, 0.55)';
    ctx.strokeStyle = lift.color;
    ctx.lineWidth = detailed ? Math.max(3, PEG_THICK * 0.55) : 1.4;
    ctx.shadowBlur = detailed ? 22 : 3;
    ctx.shadowColor = lift.color;
    ctx.beginPath();
    ctx.moveTo(getX(points[0].left), getY(points[0].y));
    for (const point of points) {
      ctx.lineTo(getX(point.left), getY(point.y));
    }
    for (let index = points.length - 1; index >= 0; index--) {
      const point = points[index];
      ctx.lineTo(getX(point.right), getY(point.y));
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    const inlet = getWaterLiftBounds(
      lift,
      lift.bottomY,
      lift.inletWidthRatio
    );
    ctx.lineWidth = detailed ? Math.max(7, PEG_THICK) : 2;
    ctx.beginPath();
    ctx.moveTo(getX(inlet.left), getY(inlet.y));
    ctx.lineTo(getX(inlet.right), getY(inlet.y));
    ctx.stroke();

    if (detailed) {
      const now = performance.now() * 0.001;
      const span = lift.bottomY - lift.topY;
      ctx.fillStyle = 'rgba(210, 250, 255, 0.82)';
      for (let index = 0; index < 16; index++) {
        const progress =
          (now * (0.12 + index % 3 * 0.025) + index / 16) % 1;
        const y = lift.bottomY - span * progress;
        const water = getWaterLiftBounds(lift, y);
        const wave = Math.sin(now * 2.4 + index * 1.7);
        const x =
          water.center + wave * (water.right - water.left) * 0.34;
        ctx.beginPath();
        ctx.arc(x, y, 3 + index % 4, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.strokeStyle = '#e7fbff';
      ctx.lineWidth = 4;
      for (let index = 1; index <= 4; index++) {
        const y =
          lift.topY + span * index / 5;
        const water = getWaterLiftBounds(lift, y);
        const size = Math.max(9, BALL_R * 0.55);
        ctx.beginPath();
        ctx.moveTo(water.center - size, y + size * 0.55);
        ctx.lineTo(water.center, y - size * 0.45);
        ctx.lineTo(water.center + size, y + size * 0.55);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawWaterClimb(
    climb,
    getX = (value) => value,
    getY = (value) => value,
    detailed = true,
    widthScale = 1
  ) {

    const getCourseEdges = (pathPoints, connectEnds = false) => {
      const lastIndex = pathPoints.length - 1;
      const blendCount = Math.max(
        3,
        Math.floor(lastIndex * 0.08)
      );
      const left = [];
      const right = [];
      for (let index = 0; index <= lastIndex; index++) {
        const point = pathPoints[index];
        const before = pathPoints[Math.max(0, index - 1)];
        const after = pathPoints[Math.min(lastIndex, index + 1)];
        const angle = Math.atan2(
          after.y - before.y,
          after.x - before.x
        );
        const entryBlend = connectEnds
          ? Math.max(0, 1 - index / blendCount) ** 2
          : 0;
        const exitBlend = connectEnds
          ? Math.max(
            0,
            1 - (lastIndex - index) / blendCount
          ) ** 2
          : 0;
        const halfWidth = (
          climb.width +
          (climb.entryWidth - climb.width) * entryBlend +
          (climb.resumeWidth - climb.width) * exitBlend
        ) * widthScale / 2;
        const nx = -Math.sin(angle);
        const ny = Math.cos(angle);
        left.push({
          x: getX(point.x) + nx * halfWidth,
          y: getY(point.y) + ny * halfWidth,
        });
        right.push({
          x: getX(point.x) - nx * halfWidth,
          y: getY(point.y) - ny * halfWidth,
        });
      }
      if (connectEnds) {
        const entry = climb.points[0];
        const entryLane = pinballMap.course.at(entry.y);
        const entryCenter =
          entryLane.left +
          (entryLane.right - entryLane.left) *
            climb.entryPosition;
        left[0] = {
          x: getX(entryCenter - climb.entryWidth / 2),
          y: getY(entry.y),
        };
        right[0] = {
          x: getX(entryCenter + climb.entryWidth / 2),
          y: getY(entry.y),
        };
        const exit = climb.resumePoint;
        const exitLane = pinballMap.course.at(exit.y);
        const exitCenter =
          exitLane.left +
          (exitLane.right - exitLane.left) *
            climb.resumePosition;
        left[lastIndex] = {
          x: getX(exitCenter - climb.resumeWidth / 2),
          y: getY(exit.y),
        };
        right[lastIndex] = {
          x: getX(exitCenter + climb.resumeWidth / 2),
          y: getY(exit.y),
        };
      }
      return { left, right };
    };

    const drawCourseArea = (edges) => {
      ctx.beginPath();
      ctx.moveTo(edges.left[0].x, edges.left[0].y);
      for (const point of edges.left.slice(1)) {
        ctx.lineTo(point.x, point.y);
      }
      for (let index = edges.right.length - 1; index >= 0; index--) {
        const point = edges.right[index];
        ctx.lineTo(point.x, point.y);
      }
      ctx.closePath();
    };

    const traceCenterline = (pathPoints) => {
      ctx.beginPath();
      ctx.moveTo(
        getX(pathPoints[0].x),
        getY(pathPoints[0].y)
      );
      for (const point of pathPoints.slice(1)) {
        ctx.lineTo(getX(point.x), getY(point.y));
      }
    };

    const drawConnector = (edges, start, end) => {
      ctx.beginPath();
      ctx.moveTo(edges.left[start].x, edges.left[start].y);
      for (let index = start + 1; index <= end; index++) {
        ctx.lineTo(edges.left[index].x, edges.left[index].y);
      }
      for (let index = end; index >= start; index--) {
        ctx.lineTo(edges.right[index].x, edges.right[index].y);
      }
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = pinballMap.course.color;
      ctx.lineWidth = borderWidth;
      for (const side of ['left', 'right']) {
        ctx.beginPath();
        ctx.moveTo(edges[side][start].x, edges[side][start].y);
        for (let index = start + 1; index <= end; index++) {
          ctx.lineTo(edges[side][index].x, edges[side][index].y);
        }
        ctx.stroke();
      }
    };

    const routeEdges = getCourseEdges(climb.points, true);
    const waterEdges = climb.kind === 'water'
      ? getCourseEdges(climb.waterPath.points)
      : null;
    const connectorCount = Math.max(
      3,
      Math.floor((climb.points.length - 1) * 0.08)
    );
    const routeLast = climb.points.length - 1;
    const borderWidth = detailed ? Math.max(6, PEG_THICK) : 2;
    const routeWidth = climb.width * widthScale;

    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'butt';
    ctx.shadowBlur = detailed ? 16 : 2;
    ctx.shadowColor = pinballMap.course.color;
    ctx.fillStyle = detailed
      ? 'rgba(12,20,32,0.82)'
      : 'rgba(30,45,65,0.78)';
    drawConnector(routeEdges, 0, connectorCount);
    drawConnector(
      routeEdges,
      routeLast - connectorCount,
      routeLast
    );

    ctx.strokeStyle = pinballMap.course.color;
    ctx.lineWidth = routeWidth + borderWidth * 2;
    traceCenterline(climb.points);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = detailed
      ? 'rgba(12,20,32,0.96)'
      : 'rgba(30,45,65,0.94)';
    ctx.lineWidth = routeWidth;
    traceCenterline(climb.points);
    ctx.stroke();

    if (waterEdges) {
      ctx.lineCap = 'round';
      ctx.shadowBlur = detailed ? 22 : 3;
      ctx.shadowColor = climb.color;
      ctx.strokeStyle = detailed
        ? 'rgba(18, 151, 222, 0.90)'
        : 'rgba(28, 167, 238, 0.94)';
      ctx.lineWidth = Math.max(2, routeWidth - borderWidth * 0.35);
      traceCenterline(climb.waterPath.points);
      ctx.stroke();
    }

    if (detailed && waterEdges) {
      ctx.save();
      drawCourseArea(waterEdges);
      ctx.clip();
      const now = performance.now() * 0.001;
      ctx.fillStyle = 'rgba(220, 252, 255, 0.86)';
      for (let index = 0; index < 18; index++) {
        const progress =
          (now * (0.09 + index % 4 * 0.018) + index / 18) % 1;
        const point = getWaterClimbPoint(
          climb.waterPath,
          climb.waterPath.totalLength * progress
        );
        const offset =
          Math.sin(now * 2.2 + index * 1.8) * climb.width * 0.30;
        const nx = -Math.sin(point.angle);
        const ny = Math.cos(point.angle);
        ctx.beginPath();
        ctx.arc(
          point.x + nx * offset,
          point.y + ny * offset,
          3 + index % 5,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }

      ctx.strokeStyle = '#effdff';
      ctx.lineWidth = 4;
      for (let index = 1; index <= 5; index++) {
        const point = getWaterClimbPoint(
          climb.waterPath,
          climb.waterPath.totalLength * index / 6
        );
        const size = Math.max(9, BALL_R * 0.5);
        ctx.save();
        ctx.translate(point.x, point.y);
        ctx.rotate(point.angle);
        ctx.beginPath();
        ctx.moveTo(-size * 0.5, -size);
        ctx.lineTo(size * 0.5, 0);
        ctx.lineTo(-size * 0.5, size);
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    }
    ctx.restore();
  }

  function drawCourse(getX = (value) => value, getY = (value) => value) {

    const samples = pinballMap.course.samples;
    const gaps = pinballMap.course.gaps || [];
    const ranges = [];
    let start = 0;
    for (const gap of gaps) {
      if (gap.top > start) ranges.push([start, gap.top]);
      start = Math.max(start, gap.bottom);
    }
    if (start < PLAY_BOT) ranges.push([start, PLAY_BOT]);

    for (const [rangeStart, rangeEnd] of ranges) {
      const startLane = pinballMap.course.at(rangeStart);
      const endLane = pinballMap.course.at(rangeEnd);
      const visible = [
        { y: rangeStart, ...startLane },
        ...samples.filter((sample) =>
          sample.y > rangeStart &&
          sample.y < rangeEnd &&
          sample.y <= PLAY_BOT
        ),
        { y: rangeEnd, ...endLane },
      ];

      ctx.beginPath();
      ctx.moveTo(getX(visible[0].left), getY(visible[0].y));
      for (const sample of visible) {
        ctx.lineTo(getX(sample.left), getY(sample.y));
      }
      for (let index = visible.length - 1; index >= 0; index--) {
        const sample = visible[index];
        ctx.lineTo(getX(sample.right), getY(sample.y));
      }
      ctx.closePath();
      ctx.fill();

      for (const side of ['left', 'right']) {
        ctx.beginPath();
        ctx.moveTo(getX(visible[0][side]), getY(visible[0].y));
        for (const sample of visible) {
          ctx.lineTo(getX(sample[side]), getY(sample.y));
        }
        ctx.stroke();
      }
    }
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

    ctx.save();
    ctx.fillStyle = 'rgba(30,45,65,0.58)';
    ctx.strokeStyle = pinballMap.course.color;
    ctx.lineWidth = 1.4;
    drawCourse(mmX, mmY);
    ctx.restore();

    for (const lift of waterLifts) {
      drawWaterLift(lift, mmX, mmY, false);
    }
    for (const climb of waterClimbs) {
      drawWaterClimb(
        climb,
        mmX,
        mmY,
        false,
        MM_SCALE_X
      );
    }

    // 결승선
    const finishLane = pinballMap.course.at(PLAY_BOT);
    ctx.save();
    ctx.shadowBlur = 4;
    ctx.shadowColor = '#ffe066';
    ctx.strokeStyle = '#ffe066';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(mmX(finishLane.left), mmY(PLAY_BOT));
    ctx.lineTo(mmX(finishLane.right), mmY(PLAY_BOT));
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
      const hw = Math.max(
        3,
        (sp.currentLen || sp.len) * MM_SCALE_X / 2
      );
      ctx.fillRect(-hw, -0.75, hw * 2, 1.5);
      ctx.restore();
    }

    // 범퍼 (컬러 원)
    for (const b of bumpers) {
      if (!b.active) continue;
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

    // 가속 게이트 (초록)
    for (const booster of boosters) {
      const px = mmX(booster.x);
      const py = mmY(booster.y);
      if (py < MM_Y || py > MM_Y + MM_H) continue;
      ctx.fillStyle = booster.color;
      ctx.fillRect(
        px - booster.w * MM_SCALE_X / 2,
        py - Math.max(1, booster.h * MM_SCALE_Y / 2),
        booster.w * MM_SCALE_X,
        Math.max(2, booster.h * MM_SCALE_Y)
      );
    }

    // 공 (결승선 통과 공은 미니맵에서 제외)
    for (const ball of balls) {
      if (!ball.active || ball.exited) continue;
      const px = mmX(ball.x);
      const py = mmY(ball.y);
      if (py < MM_Y - 4 || py > MM_Y + MM_H + 4) continue;
      const r = ball.r * MM_SCALE;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fillStyle = ball.color;
      ctx.fill();
    }

    // 뷰포트 표시
    const vpY =
      Math.min(
        MM_Y + MM_H - H * MM_SCALE_Y,
        MM_Y + cameraY * MM_SCALE_Y
      );
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

    // 맵 자체가 휘어지는 코스와 좌우 경계선
    ctx.save();
    ctx.shadowBlur = 18;
    ctx.shadowColor = pinballMap.course.color;
    ctx.fillStyle = 'rgba(12,20,32,0.72)';
    ctx.strokeStyle = pinballMap.course.color;
    ctx.lineWidth = Math.max(3, PEG_THICK * 0.6);
    drawCourse();
    ctx.restore();

    for (const lift of waterLifts) {
      drawWaterLift(lift);
    }
    // 결승선 (노란 점선)
    const finishLane = pinballMap.course.at(PLAY_BOT);
    ctx.save();
    ctx.shadowBlur = 24;
    ctx.shadowColor = '#ffe066';
    ctx.strokeStyle = '#ffe066';
    ctx.lineWidth = 3;
    ctx.setLineDash([18, 10]);
    ctx.beginPath();
    ctx.moveTo(finishLane.left, PLAY_BOT);
    ctx.lineTo(finishLane.right, PLAY_BOT);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // 가속 게이트
    for (const booster of boosters) {
      drawBooster(booster);
    }

    // 핀 (시안 네온 바)
    for (const peg of pegs) {

      const lit = peg.lit > 0;
      const pegColor = peg.color || '#00e5ff';

      ctx.save();
      ctx.shadowBlur = lit ? 22 : 10;
      ctx.shadowColor = lit ? '#ffffff' : pegColor;
      ctx.fillStyle = lit ? '#ffffff' : pegColor;
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
      drawBar(
        sp.cx,
        sp.cy,
        sp.currentLen || sp.len,
        sp.thick || PEG_THICK,
        sp.ang
      );
      ctx.beginPath();
      ctx.arc(sp.cx, sp.cy, PEG_R * 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 원형 범퍼
    for (const bumper of bumpers) {

      if (!bumper.active) continue;
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
      if (bumper.oneShot) {
        ctx.moveTo(bumper.x - cs * 0.75, bumper.y - cs * 0.75);
        ctx.lineTo(bumper.x + cs * 0.75, bumper.y + cs * 0.75);
        ctx.moveTo(bumper.x + cs * 0.75, bumper.y - cs * 0.75);
        ctx.lineTo(bumper.x - cs * 0.75, bumper.y + cs * 0.75);
      }
      ctx.stroke();
      ctx.restore();
    }

    // 수중 상승 구간은 내부 장애물을 덮어 하나의 맵 통로처럼 보인다.
    for (const climb of waterClimbs) {
      drawWaterClimb(climb);
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

    if (isMobilePinball) {
      ctx.save();
      ctx.fillStyle = 'rgba(5, 8, 18, 0.94)';
      ctx.fillRect(MOBILE_HUD_X, 0, W - MOBILE_HUD_X, H);
      ctx.strokeStyle = 'rgba(255,255,255,0.78)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(MOBILE_HUD_X, 0);
      ctx.lineTo(MOBILE_HUD_X, H);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.72)';
      ctx.font = `bold ${Math.max(12, Math.floor(W * 0.035))}px sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('순위', MOBILE_HUD_X + 8, 12);
      ctx.restore();
    }

    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    ctx.font = `bold ${Math.max(11, Math.floor(W * 0.014))}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(pinballMap.label, PLAY_X + 10, 10);
    ctx.restore();

    const cfsz = Math.max(18, Math.floor(W * 0.022));

    // 대량 추첨은 최근 순위만 보여 주고 실제 순위 번호는 유지한다.
    const compactRankList = count > 30;
    const rankEnd = compactRankList
      ? Math.max(0, winners.length - rankScrollOffset)
      : winners.length;
    const firstVisibleRank = compactRankList
      ? Math.max(0, rankEnd - RANK_DISPLAY_LIMIT)
      : 0;
    const visibleWinners = winners.slice(firstVisibleRank, rankEnd);
    const layoutCount = compactRankList
      ? Math.min(count, RANK_DISPLAY_LIMIT)
      : count;
    const denseList = layoutCount >= 20;
    const listX = isMobilePinball ? MOBILE_HUD_X + 8 : PLAY_X2 + 18;
    const counterY = isMobilePinball ? 38 : 16;
    const listY0 =
      isMobilePinball
        ? counterY + cfsz + 14
        : denseList
        ? counterY + cfsz + 16
        : H * 0.06;
    const listW =
      isMobilePinball
        ? Math.max(54, W - listX - (compactRankList ? 30 : 8))
        : Math.max(48, W - listX - (compactRankList ? 42 : 20));
    const availH = H - listY0 - (compactRankList ? 58 : 20);
    const colGap = denseList ? 10 : 0;
    const maxCols =
      isMobilePinball
        ? 1
        : denseList
        ? Math.max(1, Math.min(2, Math.floor(listW / 150)))
        : 1;
    const colCount =
      denseList
        ? Math.max(1, Math.min(maxCols, Math.ceil(layoutCount / 13)))
        : 1;
    const rowsPerCol = Math.ceil(layoutCount / colCount);
    const colW =
      (listW - colGap * (colCount - 1)) / colCount;
    const maxLineH =
      isMobilePinball
        ? Math.max(22, H * 0.055)
        : denseList
          ? Math.max(42, H * 0.07)
          : Math.max(54, H * 0.09);
    const lineH =
      Math.min(maxLineH, availH / rowsPerCol);
    const minRankFont = isMobilePinball
      ? (denseList ? 10 : 13)
      : denseList ? 16 : 20;
    let rfsz = Math.max(minRankFont, Math.min(
      Math.floor(lineH * 0.82),
      Math.floor(colW / 2.8)
    ));

    while ((denseList || isMobilePinball) && rfsz > minRankFont) {
      ctx.save();
      ctx.font = `bold ${rfsz}px Noto Sans KR, sans-serif`;
      const widestRankText =
        visibleWinners.reduce((widest, ball, index) => {
          const text =
            `#${firstVisibleRank + index + 1} ${getResultLabel(ball.num)}`;
          return Math.max(widest, ctx.measureText(text).width);
        }, 0);
      ctx.restore();

      if (widestRankText <= colW - 8) break;

      rfsz -= 1;
    }

    for (let i = 0; i < visibleWinners.length; i++) {

      const col = Math.floor(i / rowsPerCol);
      const row = i % rowsPerCol;
      const x = listX + col * (colW + colGap);
      const y = listY0 + row * lineH;
      const rankIndex = firstVisibleRank + i;
      const c = RANK_COLORS[rankIndex % RANK_COLORS.length];

      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(
        x - 4, y - lineH * 0.5,
        colW, lineH * 0.92
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
      const rankText = `#${rankIndex + 1} `;
      const rankW = ctx.measureText(rankText).width;
      const nameText =
        fitText(
          getResultLabel(visibleWinners[i].num),
          Math.max(12, colW - rankW - 8)
        );
      ctx.fillText(
        `${rankText}${nameText}`,
        x, y
      );
      ctx.restore();
    }

    // 카운터 (우상단)
    ctx.save();
    ctx.fillStyle = 'rgba(180,180,180,0.85)';
    ctx.font = `bold ${cfsz}px sans-serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(
      `${winners.length} / ${count}`,
      W - 20, counterY
    );
    ctx.restore();

    rankUi = null;
    if (compactRankList && winners.length > RANK_DISPLAY_LIMIT) {
      const rangeStart = firstVisibleRank + 1;
      const rangeEnd = rankEnd;
      const maxOffset = winners.length - RANK_DISPLAY_LIMIT;
      const trackX = listX + listW + 8;
      const trackY = listY0 - lineH * 0.45;
      const trackH = Math.max(48, H - trackY - 58);
      const thumbH = Math.max(
        24,
        trackH * Math.min(1, RANK_DISPLAY_LIMIT / winners.length)
      );
      const thumbTravel = Math.max(0, trackH - thumbH);
      const thumbY = trackY +
        (1 - rankScrollOffset / maxOffset) * thumbTravel;
      const downButton = {
        x: trackX - 12,
        y: H - 42,
        w: 30,
        h: 30,
      };
      rankUi = {
        maxOffset,
        track: { x: trackX - 6, y: trackY, w: 16, h: trackH },
        thumb: { x: trackX - 5, y: thumbY, w: 14, h: thumbH },
        downButton,
      };

      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.78)';
      ctx.fillRect(listX - 4, H - 40, listW, 34);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = `bold ${Math.max(11, Math.floor(cfsz * 0.65))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        `#${rangeStart}-#${rangeEnd} / #${winners.length}`,
        listX + listW / 2 - 4,
        H - 23
      );

      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.fillRect(trackX, trackY, 4, trackH);
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.fillRect(trackX - 3, thumbY, 10, thumbH);

      ctx.fillStyle = rankScrollOffset === 0
        ? 'rgba(74,222,128,0.9)'
        : 'rgba(255,255,255,0.2)';
      ctx.beginPath();
      ctx.arc(
        downButton.x + downButton.w / 2,
        downButton.y + downButton.h / 2,
        downButton.w / 2,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.fillStyle = rankScrollOffset === 0 ? '#08120c' : '#fff';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText(
        '▼',
        downButton.x + downButton.w / 2,
        downButton.y + downButton.h / 2 + 1
      );
      ctx.restore();
    }

    if (!isMobilePinball) drawMinimap();
  }

  function finalize() {

    pinballFinalizeTimer = null;

    if (stopPinball) return;

    stopPinball = true;
    if (pinballCleanup) {
      pinballCleanup();
      pinballCleanup = null;
    }

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

  let lastFrameAt = 0;
  const mobileFrameMs = 1000 / 30;

  function loop(now) {

    if (stopPinball) return;

    if (
      isMobilePinball &&
      lastFrameAt &&
      now - lastFrameAt < mobileFrameMs
    ) {
      pinballRafId = requestAnimationFrame(loop);
      return;
    }

    const elapsed = lastFrameAt ? now - lastFrameAt : 1000 / 60;
    lastFrameAt = now;
    const frameScale = isMobilePinball
      ? Math.max(1, Math.min(1.7, elapsed / (1000 / 60)))
      : 1;

    update(frameScale);

    drawScene();

    pinballRafId = requestAnimationFrame(loop);
  }

  pinballRafId = requestAnimationFrame(loop);
}
