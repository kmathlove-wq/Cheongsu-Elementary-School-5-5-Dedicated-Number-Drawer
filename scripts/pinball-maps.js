export const PINBALL_MAPS = [
  { id: 'classic', label: '기본 네온 보드' },
  { id: 'zigzag', label: '지그재그 협곡' },
  { id: 'curves', label: '곡선 슬라이드' },
  { id: 'factory', label: '혼돈 공장' },
];

const MAP_IDS = new Set(PINBALL_MAPS.map((map) => map.id));

export function normalizePinballMap(value) {
  return MAP_IDS.has(value) ? value : 'classic';
}

function createBuilder(bounds) {
  const {
    playX, playW, worldH, pegLen, pegThick,
    bumperR, spinnerLen, isMobile,
  } = bounds;
  const x = (ratio) => playX + playW * ratio;
  const y = (ratio) => worldH * ratio;
  const pegs = [];
  const bumpers = [];
  const spinners = [];
  const boosters = [];

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
      kind: options.kind || 'peg',
      lit: 0,
    });
  }

  function addCenteredBar(cx, cy, len, angle, options = {}) {
    const half = len / 2;
    const dx = Math.cos(angle) * half;
    const dy = Math.sin(angle) * half;
    addBar(cx - dx, cy - dy, cx + dx, cy + dy, options);
  }

  function addPolyline(points, options = {}) {
    for (let index = 1; index < points.length; index++) {
      addBar(
        x(points[index - 1][0]),
        y(points[index - 1][1]),
        x(points[index][0]),
        y(points[index][1]),
        { ...options, kind: 'rail' }
      );
    }
  }

  function addCurveRamp(baseY, openingX, bend, options = {}) {
    const gap = isMobile ? 0.09 : 0.07;
    const segments = isMobile ? 5 : 8;
    const curveY = (pointX) => {
      const distance = Math.abs(pointX - openingX);
      return baseY - bend * Math.pow(distance / 0.5, 1.65);
    };
    const sides = [
      [0.04, Math.max(0.05, openingX - gap)],
      [Math.min(0.95, openingX + gap), 0.96],
    ];
    sides.forEach(([start, end]) => {
      if (end <= start) return;
      const points = [];
      for (let index = 0; index <= segments; index++) {
        const pointX = start + (end - start) * index / segments;
        points.push([pointX, curveY(pointX)]);
      }
      addPolyline(points, {
        color: options.color || '#62f5ff',
        thick: options.thick || pegThick * 1.15,
      });
    });
  }

  function addBumper(px, py, radius = bumperR, color = '#6bffff') {
    bumpers.push({ x: x(px), y: y(py), r: radius, color, lit: 0 });
  }

  function addSpinner(px, py, velocity, length = spinnerLen, angle = 0) {
    spinners.push({
      cx: x(px),
      cy: y(py),
      angVel: velocity,
      ang: angle,
      len: length,
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
      x: x(px),
      y: y(py),
      w: playW * width,
      h: Math.max(pegThick * 3, worldH * height),
      vx,
      vy,
      color,
      lit: 0,
    });
  }

  return {
    x, y, pegs, bumpers, spinners, boosters,
    addBar, addCenteredBar, addPolyline, addCurveRamp,
    addBumper, addSpinner, addBooster,
  };
}

function buildClassic(builder, bounds) {
  const {
    x, y, pegs, addCenteredBar, addBumper, addSpinner,
  } = builder;
  const {
    pegLen, pegThick, bumperR, spinnerLen, isMobile,
  } = bounds;
  const rows = isMobile ? 10 : 14;
  const columns = isMobile ? 3 : 4;
  const top = 0.04;
  const bottom = 0.90;

  for (let row = 0; row < rows; row++) {
    const cy = y(top + (bottom - top) * (row + 0.5) / rows);
    const angle = row % 2 === 0 ? Math.PI / 5 : -Math.PI / 5;
    const odd = row % 2 === 1;
    const count = odd ? columns + 1 : columns;
    for (let column = 0; column < count; column++) {
      const rawRatio = (odd ? -0.5 : 0) / columns +
        column / columns + 0.5 / columns;
      const edge = Math.abs(Math.cos(angle) * pegLen / 2) + pegThick / 2;
      const cx = Math.max(
        x(0) + edge,
        Math.min(x(1) - edge, x(rawRatio))
      );
      addCenteredBar(cx, cy, pegLen, angle);
    }
  }

  const bumperLayout = [
    [0.25, 0.20, 1, '#ff4d6d'],
    [0.75, 0.20, 1, '#ff4d6d'],
    [0.50, 0.42, 1.2, '#ffe066'],
    [0.25, 0.65, 1, '#6bffff'],
    [0.75, 0.65, 1, '#6bffff'],
  ];
  bumperLayout
    .filter((_, index) => !isMobile || (index !== 1 && index !== 3))
    .forEach(([px, py, scale, color]) => {
      addBumper(px, py, Math.floor(bumperR * scale), color);
    });

  const spinnerLayout = [
    [0.50, 0.10, 0.030],
    [0.18, 0.30, -0.025],
    [0.82, 0.30, 0.025],
    [0.50, 0.52, -0.032],
    [0.22, 0.76, 0.028],
    [0.78, 0.76, -0.028],
  ];
  spinnerLayout
    .filter((_, index) => !isMobile || index % 2 === 0)
    .forEach(([px, py, velocity], index) => {
      addSpinner(px, py, velocity, spinnerLen, Math.PI / 6 * index);
    });

  return pegs;
}

function buildZigzag(builder, bounds) {
  const {
    x, y, addCenteredBar, addPolyline,
    addBumper, addSpinner, addBooster,
  } = builder;
  const { pegLen, pegThick, bumperR, spinnerLen, isMobile } = bounds;
  const turns = [
    [[0.02, 0.14], [0.76, 0.20]],
    [[0.98, 0.31], [0.24, 0.37]],
    [[0.02, 0.48], [0.76, 0.54]],
    [[0.98, 0.65], [0.24, 0.71]],
    [[0.02, 0.82], [0.76, 0.88]],
  ];
  turns.forEach((points, index) => {
    addPolyline(points, {
      color: index % 2 ? '#ff7ab8' : '#52e5ff',
      thick: pegThick * 1.35,
    });
  });

  const pegRows = isMobile ? 4 : 7;
  for (let row = 0; row < pegRows; row++) {
    const py = 0.10 + row * 0.125;
    const offset = row % 2 ? 0.18 : 0.08;
    for (let column = 0; column < (isMobile ? 2 : 3); column++) {
      const px = offset + column * 0.30;
      addCenteredBar(
        x(Math.min(0.92, px)),
        y(py),
        pegLen * 0.72,
        row % 2 ? -Math.PI / 4 : Math.PI / 4
      );
    }
  }

  [
    [0.82, 0.20, '#ff4d6d'],
    [0.18, 0.37, '#ffe066'],
    [0.82, 0.54, '#6bffff'],
    [0.18, 0.71, '#ff7ab8'],
  ].forEach(([px, py, color], index) => {
    if (!isMobile || index % 2 === 0) {
      addBumper(px, py, bumperR * 0.9, color);
    }
  });

  addSpinner(0.50, 0.44, 0.035, spinnerLen * 0.8);
  if (!isMobile) addSpinner(0.50, 0.77, -0.038, spinnerLen * 0.8);
  addBooster(0.84, 0.27, 0.18, 0.012, -4.5, 1.5);
  addBooster(0.16, 0.61, 0.18, 0.012, 4.5, 1.5);
}

function buildCurves(builder, bounds) {
  const {
    addCurveRamp, addBumper, addSpinner, addBooster,
  } = builder;
  const { bumperR, spinnerLen, isMobile } = bounds;
  const ramps = [
    [0.18, 0.70, 0.055, '#51e5ff'],
    [0.34, 0.30, 0.060, '#b47aff'],
    [0.50, 0.68, 0.065, '#51e5ff'],
    [0.67, 0.32, 0.060, '#b47aff'],
    [0.83, 0.58, 0.055, '#51e5ff'],
  ];
  ramps.forEach(([py, opening, bend, color], index) => {
    if (!isMobile || index !== 3) {
      addCurveRamp(py, opening, bend, { color });
      addBooster(opening, py + 0.012, 0.13, 0.010, 0, 3.8, '#4ade80');
    }
  });

  [
    [0.28, 0.25, '#ffe066'],
    [0.72, 0.42, '#ff7ab8'],
    [0.28, 0.60, '#6bffff'],
    [0.72, 0.76, '#ffe066'],
  ].forEach(([px, py, color], index) => {
    if (!isMobile || index % 2 === 0) {
      addBumper(px, py, bumperR * 0.85, color);
    }
  });
  addSpinner(0.50, 0.57, -0.024, spinnerLen * 0.72);
}

function buildFactory(builder, bounds) {
  const {
    x, y, addCenteredBar, addBumper, addSpinner, addBooster,
  } = builder;
  const { pegLen, bumperR, spinnerLen, isMobile } = bounds;
  const spinnerRows = isMobile ? 4 : 6;
  for (let row = 0; row < spinnerRows; row++) {
    const py = 0.13 + row * 0.14;
    const positions = row % 2 ? [0.28, 0.72] : [0.18, 0.50, 0.82];
    positions
      .filter((_, index) => !isMobile || index !== 1)
      .forEach((px, index) => {
        addSpinner(
          px,
          py,
          (row + index) % 2 ? -0.045 : 0.045,
          spinnerLen * 0.62,
          index * Math.PI / 3
        );
      });
  }

  for (let row = 0; row < (isMobile ? 4 : 7); row++) {
    const py = 0.08 + row * 0.13;
    addCenteredBar(
      x(row % 2 ? 0.35 : 0.65),
      y(py),
      pegLen * 0.85,
      row % 2 ? Math.PI / 5 : -Math.PI / 5,
      { color: '#f6c453' }
    );
  }

  [
    [0.50, 0.22, '#ff4d6d'],
    [0.22, 0.46, '#6bffff'],
    [0.78, 0.46, '#ff7ab8'],
    [0.50, 0.72, '#ffe066'],
  ].forEach(([px, py, color], index) => {
    if (!isMobile || index !== 2) {
      addBumper(px, py, bumperR * (index === 3 ? 1.15 : 0.82), color);
    }
  });

  addBooster(0.50, 0.34, 0.42, 0.010, 0, 4.8);
  addBooster(0.50, 0.60, 0.42, 0.010, 0, 4.8);
  addBooster(0.50, 0.86, 0.42, 0.010, 0, 5.5);
}

export function createPinballMap(mapId, bounds) {
  const selected = normalizePinballMap(mapId);
  const builder = createBuilder(bounds);

  if (selected === 'zigzag') buildZigzag(builder, bounds);
  else if (selected === 'curves') buildCurves(builder, bounds);
  else if (selected === 'factory') buildFactory(builder, bounds);
  else buildClassic(builder, bounds);

  const { pegs, bumpers, spinners, boosters } = builder;

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

  const filteredPegs = pegs.filter((peg) => !bumpers.some((bumper) => {
    const clearance = bumper.r + peg.thick / 2 + 4;
    return distanceToSegment(bumper.x, bumper.y, peg) < clearance;
  }));

  return {
    id: selected,
    label: PINBALL_MAPS.find((map) => map.id === selected).label,
    pegs: filteredPegs,
    bumpers,
    spinners,
    boosters,
  };
}
