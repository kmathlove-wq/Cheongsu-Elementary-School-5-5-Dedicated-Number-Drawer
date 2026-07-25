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
    [0.10, 0.34, 0.60],
    [0.22, 0.28, 0.54],
    [0.35, 0.42, 0.60],
    [0.48, 0.72, 0.55],
    [0.61, 0.72, 0.54],
    [0.74, 0.55, 0.62],
    [0.87, 0.29, 0.55],
    [1, 0.50, 0.80],
  ],
  factory: [
    [0, 0.50, 0.94],
    [0.12, 0.40, 0.62],
    [0.24, 0.63, 0.58],
    [0.38, 0.36, 0.56],
    [0.52, 0.66, 0.58],
    [0.66, 0.38, 0.56],
    [0.80, 0.61, 0.60],
    [0.91, 0.43, 0.64],
    [1, 0.50, 0.78],
  ],
};

export function normalizePinballMap(value) {
  return MAP_IDS.has(value) ? value : 'classic';
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
    const eased = linear * linear * (3 - 2 * linear);
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

  const sampleCount = 120;
  const samples = Array.from({ length: sampleCount + 1 }, (_, index) => {
    const y = worldH * index / sampleCount;
    return { y, ...rawAt(y) };
  });

  return {
    at,
    samples,
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
  } = bounds;
  const y = (ratio) => worldH * ratio;
  const pegs = [];
  const bumpers = [];
  const spinners = [];
  const boosters = [];

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

  function addBumper(px, py, radius = bumperR, color = '#6bffff') {
    bumpers.push({
      x: laneX(px, py),
      y: y(py),
      r: radius,
      color,
      lit: 0,
    });
  }

  function addSpinner(px, py, velocity, length = spinnerLen, angle = 0) {
    spinners.push({
      cx: laneX(px, py),
      cy: y(py),
      angVel: velocity,
      ang: angle,
      len: Math.min(length, laneWidth(py) * 0.36),
      thick: pegThick,
      lit: 0,
      x1: 0,
      y1: 0,
      x2: 0,
      y2: 0,
    });
  }

  function addBooster(px, py, width, height, vx, vy, color = '#4ade80') {
    boosters.push({
      x: laneX(px, py),
      y: y(py),
      w: laneWidth(py) * width,
      h: Math.max(pegThick * 3, worldH * height),
      vx,
      vy,
      color,
      lit: 0,
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

  return {
    pegs,
    bumpers,
    spinners,
    boosters,
    addPeg,
    addBumper,
    addSpinner,
    addBooster,
    addPegField,
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
    addPegField, addBumper, addSpinner, addBooster, isMobile,
  } = builder;
  const { bumperR, spinnerLen } = bounds;
  addPegField({
    rows: isMobile ? 9 : 12,
    columns: isMobile ? 2 : 3,
    color: (row, column) =>
      (row + column) % 2 ? '#f6c453' : '#00e5ff',
  });

  [
    [0.25, 0.13, '#ff4d6d'],
    [0.72, 0.24, '#6bffff'],
    [0.28, 0.36, '#ffe066'],
    [0.70, 0.48, '#ff7ab8'],
    [0.30, 0.60, '#6bffff'],
    [0.72, 0.72, '#ffe066'],
    [0.28, 0.84, '#ff4d6d'],
    [0.68, 0.91, '#6bffff'],
  ]
    .filter((_, index) => !isMobile || index % 2 === 0)
    .forEach(([px, py, color]) => {
      addBumper(px, py, bumperR * 0.78, color);
    });

  const spinnerRows = isMobile ? 6 : 10;
  for (let row = 0; row < spinnerRows; row++) {
    const py = 0.09 + row * 0.085;
    addSpinner(
      row % 2 ? 0.68 : 0.32,
      py,
      row % 2 ? -0.046 : 0.046,
      spinnerLen * 0.56,
      row * 0.65
    );
  }

  [0.18, 0.40, 0.62, 0.82, 0.94]
    .filter((_, index) => !isMobile || index % 2 === 0)
    .forEach((py) => {
      addBooster(0.50, py, 0.32, 0.009, 0, 4.5);
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

  const { pegs, bumpers, spinners, boosters } = builder;
  const filteredPegs = pegs.filter((peg) => !bumpers.some((bumper) => {
    const clearance = bumper.r + peg.thick / 2 + 4;
    return distanceToSegment(bumper.x, bumper.y, peg) < clearance;
  }));

  return {
    id: selected,
    label: PINBALL_MAPS.find((map) => map.id === selected).label,
    course,
    pegs: filteredPegs,
    bumpers,
    spinners,
    boosters,
  };
}
