export const PINBALL_MAPS = [
  { id: 'classic', label: '기본 네온 보드' },
  { id: 'zigzag', label: '지그재그 협곡' },
  { id: 'curves', label: '곡선 슬라이드' },
  { id: 'factory', label: '혼돈 공장' },
];

const MAP_IDS = new Set(PINBALL_MAPS.map((map) => map.id));

const COURSE_SHAPES = {
  classic: [
    [0, 0.50, 1.00],
    [1, 0.50, 1.00],
  ],
  zigzag: [
    [0, 0.50, 0.94],
    [0.10, 0.28, 0.54],
    [0.23, 0.72, 0.54],
    [0.36, 0.30, 0.56],
    [0.49, 0.70, 0.56],
    [0.62, 0.27, 0.54],
    [0.75, 0.73, 0.54],
    [0.88, 0.32, 0.58],
    [1, 0.50, 0.80],
  ],
  curves: [
    [0, 0.50, 0.94],
    [0.06, 0.38, 0.68],
    [0.14, 0.68, 0.55],
    [0.23, 0.31, 0.62],
    [0.31, 0.58, 0.52],
    [0.39, 0.72, 0.56],
    [0.48, 0.43, 0.65],
    [0.56, 0.28, 0.54],
    [0.66, 0.64, 0.58],
    [0.74, 0.70, 0.52],
    [0.83, 0.36, 0.63],
    [0.91, 0.29, 0.55],
    [1, 0.50, 0.82],
  ],
  factory: [
    [0, 0.50, 0.94, 'linear'],
    [0.06, 0.32, 0.62, 'linear'],
    [0.12, 0.68, 0.58, 'smooth'],
    [0.18, 0.43, 0.65, 'smooth'],
    [0.25, 0.29, 0.54, 'linear'],
    [0.32, 0.70, 0.56, 'linear'],
    [0.39, 0.34, 0.60, 'smooth'],
    [0.46, 0.62, 0.52, 'smooth'],
    [0.53, 0.72, 0.54, 'linear'],
    [0.60, 0.29, 0.56, 'smooth'],
    [0.68, 0.48, 0.66, 'linear'],
    [0.75, 0.70, 0.56, 'linear'],
    [0.82, 0.30, 0.54, 'smooth'],
    [0.89, 0.60, 0.60, 'linear'],
    [0.95, 0.41, 0.68, 'smooth'],
    [1, 0.50, 0.82],
  ],
};

export function normalizePinballMap(value) {
  return MAP_IDS.has(value) ? value : 'classic';
}

export function getPinballWorldScale(mapId, isMobile) {
  const selected = normalizePinballMap(mapId);
  if (selected === 'factory') return isMobile ? 6.8 : 8.5;
  if (selected === 'curves') return isMobile ? 3.8 : 4.8;
  return isMobile ? 3.1 : 4;
}

function createCourse(mapId, bounds) {
  const { playX, playW, worldH } = bounds;
  const points = COURSE_SHAPES[mapId];

  function rawAt(worldY) {
    const ratio = Math.max(0, Math.min(1, worldY / worldH));
    let index = 0;
    while (
      index < points.length - 2 &&
      ratio > points[index + 1][0]
    ) {
      index++;
    }
    const current = points[index];
    const next = points[index + 1];
    const span = Math.max(0.0001, next[0] - current[0]);
    const linear = Math.max(0, Math.min(1, (ratio - current[0]) / span));
    const interpolation = mapId === 'zigzag'
      ? 'linear'
      : current[3] || 'smooth';
    const eased = interpolation === 'linear'
      ? linear
      : linear * linear * (3 - 2 * linear);
    const center = current[1] + (next[1] - current[1]) * eased;
    const width = current[2] + (next[2] - current[2]) * eased;
    return {
      left: playX + playW * (center - width / 2),
      right: playX + playW * (center + width / 2),
    };
  }

  function at(worldY) {
    const position = rawAt(worldY);
    const sampleGap = Math.max(3, worldH / 900);
    const before = rawAt(worldY - sampleGap);
    const after = rawAt(worldY + sampleGap);
    return {
      ...position,
      leftSlope: (after.left - before.left) / (sampleGap * 2),
      rightSlope: (after.right - before.right) / (sampleGap * 2),
    };
  }

  const sampleCount = mapId === 'factory'
    ? 240
    : mapId === 'curves'
      ? 180
      : 120;
  const samples = Array.from({ length: sampleCount + 1 }, (_, index) => {
    const y = worldH * index / sampleCount;
    return { y, ...rawAt(y) };
  });

  return {
    at,
    samples,
    geometry: mapId === 'zigzag'
      ? 'linear'
      : mapId === 'factory'
        ? 'mixed'
        : 'smooth',
    color: mapId === 'factory'
      ? '#ff9f43'
      : mapId === 'curves'
        ? '#b47aff'
        : '#62f5ff',
  };
}

function createBuilder(bounds, course) {
  const {
    worldH, pegLen, pegThick,
    bumperR, spinnerLen, isMobile,
    playX, playW,
  } = bounds;
  const y = (ratio) => worldH * ratio;
  const pegs = [];
  const bumpers = [];
  const spinners = [];
  const boosters = [];
  const waterLifts = [];
  const waterClimbs = [];

  function laneX(ratioX, ratioY) {
    const lane = course.at(y(ratioY));
    return lane.left + (lane.right - lane.left) * ratioX;
  }

  function laneWidth(ratioY) {
    const lane = course.at(y(ratioY));
    return lane.right - lane.left;
  }

  function addBar(x1, y1, x2, y2, options = {}) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    pegs.push({
      x1, y1, x2, y2,
      cx: (x1 + x2) / 2,
      cy: (y1 + y2) / 2,
      ang: Math.atan2(dy, dx),
      len: Math.hypot(dx, dy),
      thick: options.thick || pegThick,
      color: options.color || '#00e5ff',
      lit: 0,
    });
  }

  function addCenteredBar(cx, cy, len, angle, options = {}) {
    const half = len / 2;
    const dx = Math.cos(angle) * half;
    const dy = Math.sin(angle) * half;
    addBar(cx - dx, cy - dy, cx + dx, cy + dy, options);
  }

  function addPeg(px, py, length = pegLen, angle = Math.PI / 5, color) {
    const safeLength = Math.min(length, laneWidth(py) * 0.24);
    addCenteredBar(
      laneX(px, py),
      y(py),
      safeLength,
      angle,
      { color }
    );
  }

  function addBumper(
    px,
    py,
    radius = bumperR,
    color = '#6bffff',
    options = {}
  ) {
    bumpers.push({
      x: laneX(px, py),
      y: y(py),
      r: radius,
      color,
      lit: 0,
      active: true,
      power: options.power || 0.85,
      kick: options.kick || 0,
      oneShot: options.oneShot || false,
    });
  }

  function addSpinner(
    px,
    py,
    velocity,
    length = spinnerLen,
    angle = 0,
    options = {}
  ) {
    const cx = laneX(px, py);
    const cy = y(py);
    spinners.push({
      cx,
      cy,
      baseCx: cx,
      baseCy: cy,
      angVel: velocity,
      ang: angle,
      len: Math.min(
        length,
        laneWidth(py) * (options.maxLengthRatio || 0.36)
      ),
      thick: pegThick * (options.thickScale || 1),
      moveRangeX: laneWidth(py) * (options.moveX || 0),
      moveRangeY: worldH * (options.moveY || 0),
      moveSpeed: options.moveSpeed || 0,
      phase: options.phase || 0,
      lit: 0,
      x1: 0,
      y1: 0,
      x2: 0,
      y2: 0,
    });
  }

  function addBooster(
    px,
    py,
    width,
    height,
    vx,
    vy,
    color = '#4ade80',
    options = {}
  ) {
    boosters.push({
      id: boosters.length,
      x: laneX(px, py),
      y: y(py),
      w: laneWidth(py) * width,
      h: Math.max(pegThick * 3, worldH * height),
      vx,
      vy,
      color,
      lit: 0,
      oncePerBall: options.oncePerBall || false,
    });
  }

  function addPegField({
    rows,
    columns,
    top = 0.06,
    bottom = 0.91,
    color = '#00e5ff',
  }) {
    for (let row = 0; row < rows; row++) {
      const py = top + (bottom - top) * (row + 0.5) / rows;
      const offset = row % 2 ? 0.10 : 0;
      for (let column = 0; column < columns; column++) {
        const px = Math.max(
          0.12,
          Math.min(0.88, (column + 1) / (columns + 1) + offset)
        );
        addPeg(
          px,
          py,
          pegLen * (row % 3 === 0 ? 0.82 : 0.68),
          row % 2 ? -Math.PI / 4 : Math.PI / 4,
          typeof color === 'function' ? color(row, column) : color
        );
      }
    }
  }

  function addWaterLift(top, bottom, options = {}) {
    waterLifts.push({
      id: waterLifts.length,
      topY: y(top),
      bottomY: y(bottom),
      position: options.position || 0.5,
      widthRatio: options.widthRatio || 0.86,
      inletWidthRatio: options.inletWidthRatio || 1,
      riseSpeed: options.riseSpeed || 10,
      dropSpeed: options.dropSpeed || 22,
      color: options.color || '#38d9ff',
    });
  }

  function addWaterClimb(rawPoints, options = {}) {
    const points = rawPoints.map(([px, py]) => ({
      x: options.absoluteX
        ? playX + playW * px
        : laneX(px, py),
      y: y(py),
    }));
    const entryY = rawPoints[0][1];
    const entryLane = course.at(y(entryY));
    const entryCenter = (entryLane.left + entryLane.right) / 2;
    if (options.attachToCourse) {
      points[0].x = entryCenter;
      if (points[1]) points[1].x = entryCenter;
    }
    let totalLength = 0;
    const segments = [];
    for (let index = 1; index < points.length; index++) {
      const start = points[index - 1];
      const end = points[index];
      const length = Math.hypot(end.x - start.x, end.y - start.y);
      segments.push({
        start,
        end,
        startDistance: totalLength,
        length,
      });
      totalLength += length;
    }
    const entryWidth = entryLane.right - entryLane.left;
    const resumeY = y(options.resumeY || entryY + 0.14);
    const resumeLane = course.at(resumeY);
    waterClimbs.push({
      id: waterClimbs.length,
      points,
      segments,
      totalLength,
      width: entryWidth * (options.widthRatio || 0.68),
      entryWidth,
      gapTopY: y(entryY),
      gapBottomY: resumeY,
      resumePoint: {
        x: (resumeLane.left + resumeLane.right) / 2,
        y: resumeY,
      },
      entryWidthRatio: options.entryWidthRatio || 1,
      travelSpeed: options.travelSpeed || 9,
      dropSpeed: options.dropSpeed || 22,
      color: options.color || '#25c9ff',
    });
  }

  return {
    pegs,
    bumpers,
    spinners,
    boosters,
    waterLifts,
    waterClimbs,
    addPeg,
    addBumper,
    addSpinner,
    addBooster,
    addPegField,
    addWaterLift,
    addWaterClimb,
    isMobile,
  };
}

function buildClassic(builder, bounds) {
  const {
    addPegField, addBumper, addSpinner, isMobile,
  } = builder;
  const { bumperR, spinnerLen } = bounds;
  addPegField({
    rows: isMobile ? 10 : 14,
    columns: isMobile ? 3 : 4,
  });

  [
    [0.25, 0.20, 1, '#ff4d6d'],
    [0.75, 0.20, 1, '#ff4d6d'],
    [0.50, 0.42, 1.2, '#ffe066'],
    [0.25, 0.65, 1, '#6bffff'],
    [0.75, 0.65, 1, '#6bffff'],
  ]
    .filter((_, index) => !isMobile || (index !== 1 && index !== 3))
    .forEach(([px, py, scale, color]) => {
      addBumper(px, py, bumperR * scale, color);
    });

  [
    [0.50, 0.10, 0.030],
    [0.18, 0.30, -0.025],
    [0.82, 0.30, 0.025],
    [0.50, 0.52, -0.032],
    [0.22, 0.76, 0.028],
    [0.78, 0.76, -0.028],
  ]
    .filter((_, index) => !isMobile || index % 2 === 0)
    .forEach(([px, py, velocity], index) => {
      addSpinner(px, py, velocity, spinnerLen, Math.PI / 6 * index);
    });
}

function buildZigzag(builder, bounds) {
  const {
    addPegField, addBumper, addSpinner, addBooster, isMobile,
  } = builder;
  const { bumperR, spinnerLen } = bounds;
  addPegField({
    rows: isMobile ? 9 : 13,
    columns: isMobile ? 2 : 3,
    color: (row) => row % 2 ? '#ff7ab8' : '#52e5ff',
  });

  [
    [0.24, 0.15, '#ff4d6d'],
    [0.74, 0.27, '#ffe066'],
    [0.26, 0.39, '#6bffff'],
    [0.72, 0.51, '#ff7ab8'],
    [0.28, 0.64, '#ffe066'],
    [0.74, 0.77, '#6bffff'],
    [0.30, 0.88, '#ff4d6d'],
  ]
    .filter((_, index) => !isMobile || index % 2 === 0)
    .forEach(([px, py, color]) => {
      addBumper(px, py, bumperR * 0.82, color);
    });

  [
    [0.50, 0.21, 0.034],
    [0.48, 0.34, -0.036],
    [0.52, 0.48, 0.038],
    [0.48, 0.69, -0.036],
    [0.52, 0.84, 0.034],
  ]
    .filter((_, index) => !isMobile || index % 2 === 0)
    .forEach(([px, py, velocity], index) => {
      addSpinner(px, py, velocity, spinnerLen * 0.66, index * 0.7);
    });

  [
    [0.50, 0.12],
    [0.50, 0.43],
    [0.50, 0.72],
    [0.50, 0.92],
  ]
    .filter((_, index) => !isMobile || index % 2 === 0)
    .forEach(([px, py]) => {
      addBooster(px, py, 0.30, 0.009, 0, 3.8);
    });
}

function buildCurves(builder, bounds) {
  const {
    addPegField, addBumper, addSpinner, addBooster, isMobile,
  } = builder;
  const { bumperR, spinnerLen } = bounds;
  addPegField({
    rows: isMobile ? 9 : 13,
    columns: isMobile ? 2 : 3,
    color: (row) => row % 3 === 0 ? '#b47aff' : '#51e5ff',
  });

  [
    [0.28, 0.15, '#ffe066'],
    [0.72, 0.27, '#ff7ab8'],
    [0.30, 0.39, '#6bffff'],
    [0.70, 0.51, '#ffe066'],
    [0.28, 0.64, '#ff7ab8'],
    [0.72, 0.77, '#6bffff'],
    [0.34, 0.89, '#ffe066'],
  ]
    .filter((_, index) => !isMobile || index % 2 === 0)
    .forEach(([px, py, color]) => {
      addBumper(px, py, bumperR * 0.80, color);
    });

  [
    [0.52, 0.22, -0.028],
    [0.48, 0.44, 0.030],
    [0.52, 0.67, -0.030],
    [0.48, 0.84, 0.028],
  ]
    .filter((_, index) => !isMobile || index % 2 === 0)
    .forEach(([px, py, velocity], index) => {
      addSpinner(px, py, velocity, spinnerLen * 0.62, index * 0.8);
    });

  [0.10, 0.31, 0.55, 0.74, 0.93]
    .filter((_, index) => !isMobile || index % 2 === 0)
    .forEach((py) => {
      addBooster(0.50, py, 0.28, 0.009, 0, 3.6);
    });
}

function buildFactory(builder, bounds) {
  const {
    addPegField, addBumper, addSpinner,
    addBooster, addWaterLift, addWaterClimb, isMobile,
  } = builder;
  const { bumperR, spinnerLen } = bounds;
  addPegField({
    rows: isMobile ? 16 : 24,
    columns: isMobile ? 2 : 3,
    color: (row, column) =>
      (row + column) % 2 ? '#f6c453' : '#00e5ff',
  });

  [
    [0.25, 0.08, '#ff4d6d'],
    [0.72, 0.15, '#6bffff'],
    [0.28, 0.22, '#ffe066'],
    [0.70, 0.30, '#ff7ab8'],
    [0.30, 0.38, '#6bffff'],
    [0.72, 0.46, '#ffe066'],
    [0.28, 0.54, '#ff4d6d'],
    [0.68, 0.62, '#6bffff'],
    [0.30, 0.70, '#ffe066'],
    [0.72, 0.78, '#ff7ab8'],
    [0.28, 0.86, '#6bffff'],
    [0.68, 0.93, '#ffe066'],
  ]
    .filter((_, index) => !isMobile || index % 2 === 0)
    .forEach(([px, py, color]) => {
      addBumper(px, py, bumperR * 0.78, color);
    });

  const spinnerRows = isMobile ? 10 : 16;
  for (let row = 0; row < spinnerRows; row++) {
    const py = 0.06 + row * 0.055;
    addSpinner(
      row % 2 ? 0.68 : 0.32,
      py,
      row % 2 ? -0.046 : 0.046,
      spinnerLen * 0.56,
      row * 0.65
    );
  }

  const longSpinnerLayout = [
    [0.50, 0.13, 0.019, 0.00],
    [0.50, 0.27, -0.022, 0.04],
    [0.50, 0.41, 0.018, 0.08],
    [0.50, 0.56, -0.021, 0.12],
    [0.50, 0.71, 0.020, 0.16],
    [0.50, 0.85, -0.019, 0.20],
  ];
  longSpinnerLayout
    .filter((_, index) => !isMobile || index % 2 === 0)
    .forEach(([px, py, velocity, phase]) => {
      addSpinner(
        px,
        py,
        velocity,
        spinnerLen * 4,
        phase * Math.PI,
        {
          maxLengthRatio: 0.76,
          thickScale: 1.7,
          moveX: 0.045,
          moveY: 0.002,
          moveSpeed: 0.018,
          phase: phase * Math.PI * 2,
        }
      );
    });

  [
    [0.26, 0.18],
    [0.74, 0.34],
    [0.28, 0.50],
    [0.72, 0.66],
    [0.30, 0.82],
    [0.70, 0.90],
  ]
    .filter((_, index) => !isMobile || index % 2 === 0)
    .forEach(([px, py]) => {
      addBumper(
        px,
        py,
        bumperR * 0.95,
        '#ff335f',
        { power: 1.7, kick: 11, oneShot: true }
      );
    });

  [
    [0.50, 0.29, 10],
    [0.50, 0.60, 11],
    [0.50, 0.90, 12],
  ]
    .filter((_, index) => !isMobile || index !== 1)
    .forEach(([px, py, vy]) => {
      addBooster(
        px,
        py,
        0.34,
        0.006,
        0,
        vy,
        '#4ade80',
        { oncePerBall: true }
      );
    });

  [
    [0.12, 0.24, 10.5, 22, 0.24],
    [0.70, 0.84, 11.5, 22, 0.26],
  ]
    .filter((_, index) => !isMobile || index === 0)
    .forEach(([top, bottom, riseSpeed, dropSpeed, position]) => {
      addWaterLift(top, bottom, {
        position,
        widthRatio: 0.38,
        inletWidthRatio: 1,
        riseSpeed,
        dropSpeed,
      });
    });

  const waterClimbLayouts = [
    [
      [0.50, 0.42],
      [0.50, 0.47],
      [0.68, 0.51],
      [0.80, 0.47],
      [0.86, 0.39],
      [0.86, 0.30],
      [0.84, 0.22],
      [0.80, 0.16],
    ],
  ];
  waterClimbLayouts
    .forEach((points, index) => {
      addWaterClimb(points, {
        absoluteX: true,
        attachToCourse: true,
        resumeY: 0.56,
        widthRatio: isMobile ? 0.34 : 0.36,
        entryWidthRatio: 1,
        travelSpeed: 13 + index,
        dropSpeed: 22,
      });
    });
}

function distanceToSegment(pointX, pointY, peg) {
  const dx = peg.x2 - peg.x1;
  const dy = peg.y2 - peg.y1;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) {
    return Math.hypot(pointX - peg.x1, pointY - peg.y1);
  }
  const ratio = Math.max(0, Math.min(
    1,
    ((pointX - peg.x1) * dx + (pointY - peg.y1) * dy) /
      lengthSquared
  ));
  return Math.hypot(
    pointX - (peg.x1 + ratio * dx),
    pointY - (peg.y1 + ratio * dy)
  );
}

export function createPinballMap(mapId, bounds) {
  const selected = normalizePinballMap(mapId);
  const course = createCourse(selected, bounds);
  const builder = createBuilder(bounds, course);

  if (selected === 'zigzag') buildZigzag(builder, bounds);
  else if (selected === 'curves') buildCurves(builder, bounds);
  else if (selected === 'factory') buildFactory(builder, bounds);
  else buildClassic(builder, bounds);

  const {
    pegs, bumpers, spinners,
    boosters, waterLifts, waterClimbs,
  } = builder;
  const gaps = waterClimbs.map((climb) => ({
    top: climb.gapTopY,
    bottom: climb.gapBottomY,
  }));
  course.gaps = gaps;
  const isInsideGap = (worldY, margin = 0) =>
    gaps.some((gap) =>
      worldY >= gap.top - margin &&
      worldY <= gap.bottom + margin
    );
  const filteredBumpers =
    bumpers.filter((bumper) => !isInsideGap(bumper.y, bumper.r));
  const filteredPegs = pegs.filter((peg) =>
    !isInsideGap(peg.cy, peg.len / 2) &&
    !filteredBumpers.some((bumper) => {
      const clearance = bumper.r + peg.thick / 2 + 4;
      return distanceToSegment(bumper.x, bumper.y, peg) < clearance;
    })
  );
  const filteredSpinners =
    spinners.filter((spinner) =>
      !isInsideGap(spinner.cy, spinner.len / 2)
    );
  const filteredBoosters =
    boosters.filter((booster) =>
      !isInsideGap(booster.y, booster.h / 2)
    );

  return {
    id: selected,
    label: PINBALL_MAPS.find((map) => map.id === selected).label,
    course,
    pegs: filteredPegs,
    bumpers: filteredBumpers,
    spinners: filteredSpinners,
    boosters: filteredBoosters,
    waterLifts,
    waterClimbs,
  };
}
