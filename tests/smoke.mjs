import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const files = [
  'scripts/admin-bulk.js',
  'scripts/main.js',
  'scripts/gumball.js',
  'scripts/manitto.js',
  'scripts/mode-menu.js',
  'scripts/pinball.js',
  'scripts/pinball-maps.js',
  'scripts/pinball-water-renderer.js',
  'scripts/result-display.js',
  'scripts/settings.js',
  'scripts/song.js',
  'scripts/sound.js',
  'scripts/terminate.js',
];

const styleFiles = [
  'styles/app.css',
  'styles/base.css',
  'styles/gumball.css',
  'styles/overlays.css',
  'styles/modes.css',
  'styles/dialogs.css',
  'styles/responsive.css',
  'styles/terminate.css',
  'styles/mode-themes.css',
];

const html = readFileSync('index.html', 'utf8');

function segmentsCross(first, second) {
  const cross = (a, b, c) =>
    (b.x - a.x) * (c.y - a.y) -
    (b.y - a.y) * (c.x - a.x);
  const a = cross(first.start, first.end, second.start);
  const b = cross(first.start, first.end, second.end);
  const c = cross(second.start, second.end, first.start);
  const d = cross(second.start, second.end, first.end);
  return a * b < 0 && c * d < 0;
}

if (!/src="scripts\/main\.js(?:\?[^"\s]*)?"/.test(html)) {
  throw new Error('index.html must load scripts/main.js');
}

if (!html.includes('href="styles/app.css"')) {
  throw new Error('index.html must load styles/app.css');
}

if (
  !html.includes('id="pinballMapSelect"') ||
  !html.includes('id="pinballMapSettings"')
) {
  throw new Error('Settings must include the pinball map selector');
}

const pinballMaps = readFileSync('scripts/pinball-maps.js', 'utf8');

for (const mapId of ['classic', 'zigzag', 'curves', 'factory']) {
  if (!pinballMaps.includes(`id: '${mapId}'`)) {
    throw new Error(`Missing pinball map: ${mapId}`);
  }
}

const pinballMapModule = await import(
  `data:text/javascript;base64,${Buffer.from(pinballMaps).toString('base64')}`
);
const resultDisplaySource = readFileSync(
  'scripts/result-display.js',
  'utf8'
);
const resultDisplayModule = await import(
  `data:text/javascript;base64,${Buffer.from(resultDisplaySource).toString('base64')}`
);

if (
  resultDisplayModule.formatResultSummary(
    Array.from({ length: 26 }, (_, index) => index + 1)
  ).includes('총 26명')
) {
  throw new Error('A normal 26-person result must not use bulk summary');
}

if (
  !resultDisplayModule.formatResultSummary(
    Array.from({ length: 51 }, (_, index) => index + 1)
  ).includes('총 51명')
) {
  throw new Error('Results over 50 people must use bulk summary');
}

const mapBounds = {
  playX: 100,
  playW: 700,
  worldH: 2400,
  pegLen: 70,
  pegThick: 8,
  bumperR: 28,
  spinnerLen: 196,
  isMobile: false,
};

if (
  pinballMapModule.getPinballWorldScale('factory', false) <=
  pinballMapModule.getPinballWorldScale('curves', false) ||
  pinballMapModule.getPinballWorldScale('factory', false) < 8
) {
  throw new Error('Chaos factory must remain an extra-long course');
}

for (const { id } of pinballMapModule.PINBALL_MAPS) {
  const map = pinballMapModule.createPinballMap(id, mapBounds);
  const obstacles = [
    ...map.pegs,
    ...map.bumpers,
    ...map.spinners,
    ...map.boosters,
  ];

  if (obstacles.length === 0) {
    throw new Error(`Pinball map has no obstacles: ${id}`);
  }

  if (obstacles.some((obstacle) =>
    Object.values(obstacle)
      .some((value) => typeof value === 'number' && !Number.isFinite(value))
  )) {
    throw new Error(`Pinball map has invalid coordinates: ${id}`);
  }

  if (map.pegs.some((peg) =>
    Math.min(peg.x1, peg.x2) < mapBounds.playX ||
    Math.max(peg.x1, peg.x2) > mapBounds.playX + mapBounds.playW
  )) {
    throw new Error(`Pinball rail crosses the play boundary: ${id}`);
  }

  if (map.course.samples.some((sample) =>
    sample.left < mapBounds.playX ||
    sample.right > mapBounds.playX + mapBounds.playW ||
    sample.right - sample.left < mapBounds.playW * 0.5
  )) {
    throw new Error(`Pinball course is invalid or too narrow: ${id}`);
  }

  if (map.pegs.some((peg) =>
    [[peg.x1, peg.y1], [peg.x2, peg.y2]].some(([x, y]) => {
      const lane = map.course.at(y);
      return x < lane.left || x > lane.right;
    })
  )) {
    throw new Error(`Pinball obstacle crosses its course wall: ${id}`);
  }

  const expectedGeometry = id === 'zigzag'
    ? 'linear'
    : id === 'factory'
      ? 'mixed'
      : 'smooth';
  if (map.course.geometry !== expectedGeometry) {
    throw new Error(`Wrong pinball course geometry: ${id}`);
  }

  if (id === 'classic') {
    const edgePegs = map.pegs.filter((peg) => {
      const lane = map.course.at(peg.cy);
      const ratio =
        (peg.cx - lane.left) / (lane.right - lane.left);
      return ratio < 0.12 || ratio > 0.88;
    });
    if (edgePegs.length < 24) {
      throw new Error('Classic map must keep dense pegs along both walls');
    }
    const leftEdgePegs = edgePegs.filter((peg) => {
      const lane = map.course.at(peg.cy);
      return peg.cx < (lane.left + lane.right) / 2;
    });
    const rightEdgePegs = edgePegs.filter((peg) => {
      const lane = map.course.at(peg.cy);
      return peg.cx >= (lane.left + lane.right) / 2;
    });
    if (leftEdgePegs.length !== rightEdgePegs.length) {
      throw new Error('Classic wall pegs must use a symmetric pattern');
    }
    const edgeAngles = new Set(
      edgePegs.map((peg) => Math.round(Math.abs(peg.ang) * 100))
    );
    if (leftEdgePegs.length !== 14 || edgeAngles.size !== 1) {
      throw new Error('Classic wall pegs must keep regular spacing and tilt');
    }
    const rowGroups = new Map();
    map.pegs.forEach((peg) => {
      const row = Math.round(peg.cy);
      if (!rowGroups.has(row)) rowGroups.set(row, []);
      rowGroups.get(row).push(peg);
    });
    if ([...rowGroups.values()].some((row) => {
      const sorted = row.toSorted((a, b) => a.cx - b.cx);
      return sorted.some((peg, index) =>
        index > 0 && peg.cx - sorted[index - 1].cx < 55
      );
    })) {
      throw new Error('Classic map must not place redundant pegs together');
    }
  }

  if (
    id === 'factory' &&
    (
      map.bumpers.filter((bumper) => bumper.oneShot).length < 4 ||
      map.spinners.filter((spinner) => spinner.moveSpeed).length < 4 ||
      map.spinners.filter((spinner) => spinner.len > 250).length < 4 ||
      map.waterLifts.length < 2 ||
      map.waterClimbs.length < 2 ||
      !map.waterClimbs.some((climb) => climb.kind === 'water') ||
      !map.waterClimbs.some((climb) => climb.kind === 'dry') ||
      map.waterClimbs.some((climb) =>
        !climb.constantWidth ||
        climb.entryWidth <= climb.width ||
        climb.resumeWidth <= climb.width
      )
    )
  ) {
    throw new Error('Chaos factory special obstacles are incomplete');
  }
  if (id === 'factory') {
    const branches = map.waterClimbs.toSorted(
      (a, b) => a.entryPosition - b.entryPosition
    );
    const travelTimes = branches.map(
      (branch) => branch.totalLength / branch.travelSpeed
    );
    const tangentIsNatural = (branch, fromStart) => {
      const start = fromStart ? branch.points[0] : branch.points.at(-17);
      const end = fromStart ? branch.points[16] : branch.points.at(-1);
      return Math.abs(end.x - start.x) <=
        Math.abs(end.y - start.y) * 0.3;
    };
    const entryLane = map.course.at(branches[0].gapTopY);
    const resumeLane = map.course.at(branches[0].gapBottomY);
    const entryEdges = branches.map((branch) => {
      const center =
        entryLane.left +
        (entryLane.right - entryLane.left) * branch.entryPosition;
      return [
        center - branch.entryWidth / 2,
        center + branch.entryWidth / 2,
      ];
    });
    const resumeEdges = branches.map((branch) => {
      const center =
        resumeLane.left +
        (resumeLane.right - resumeLane.left) *
          branch.resumePosition;
      return [
        center - branch.resumeWidth / 2,
        center + branch.resumeWidth / 2,
      ];
    });
    const tolerance = 0.01;
    if (
      Math.abs(entryEdges[0][0] - entryLane.left) > tolerance ||
      Math.abs(entryEdges[0][1] - entryEdges[1][0]) > tolerance ||
      Math.abs(entryEdges[1][1] - entryLane.right) > tolerance ||
      Math.abs(resumeEdges[0][0] - resumeLane.left) > tolerance ||
      Math.abs(resumeEdges[0][1] - resumeEdges[1][0]) > tolerance ||
      Math.abs(resumeEdges[1][1] - resumeLane.right) > tolerance ||
      Math.max(...travelTimes) / Math.min(...travelTimes) > 1.05 ||
      branches.some((branch) =>
        !tangentIsNatural(branch, true) ||
        !tangentIsNatural(branch, false)
      )
    ) {
      throw new Error(
        'Chaos factory branches must join naturally at similar speeds'
      );
    }
  }

  if (map.waterLifts.some((lift) =>
    lift.topY >= lift.bottomY ||
    lift.widthRatio < 0.3 ||
    lift.inletWidthRatio < 0.9 ||
    lift.riseSpeed <= 0 ||
    lift.dropSpeed <= lift.riseSpeed
  )) {
    throw new Error(`Pinball water lift is invalid: ${id}`);
  }

  if (map.waterClimbs.some((climb) =>
    climb.totalLength <= 0 ||
    climb.width <= 0 ||
    climb.width < climb.entryWidth * 0.3 ||
    climb.gapTopY >= climb.gapBottomY ||
    climb.resumePoint.y !== climb.gapBottomY ||
    climb.dropSpeed <= climb.travelSpeed ||
    climb.points[0].y !== climb.gapTopY ||
    climb.points.at(-1).y !== climb.gapBottomY ||
    climb.points.some((point) =>
      point.y < climb.gapTopY || point.y > climb.gapBottomY
    ) ||
    (
      climb.kind === 'water'
        ? climb.waterPath.totalLength <= 0 ||
          climb.waterPath.segments.some((segment) =>
            segment.end.y >= segment.start.y
          ) ||
          climb.segments
            .slice(climb.waterEndIndex + 1)
            .some((segment) => segment.end.y <= segment.start.y)
        : climb.waterPath.totalLength !== 0 ||
          climb.segments.some((segment) =>
            segment.end.y <= segment.start.y
          )
    )
  )) {
    throw new Error(`Pinball water climb is invalid: ${id}`);
  }

  if (map.waterClimbs.some((climb) => {
    for (let index = 1; index < climb.segments.length; index++) {
      const before = climb.segments[index - 1];
      const current = climb.segments[index];
      const beforeAngle = Math.atan2(
        before.end.y - before.start.y,
        before.end.x - before.start.x
      );
      const currentAngle = Math.atan2(
        current.end.y - current.start.y,
        current.end.x - current.start.x
      );
      let turn = Math.abs(currentAngle - beforeAngle);
      turn = Math.min(turn, Math.PI * 2 - turn);
      if (turn > 0.55) return true;
    }
    for (let first = 0; first < climb.segments.length; first++) {
      for (
        let second = first + 3;
        second < climb.segments.length;
        second++
      ) {
        if (
          segmentsCross(
            climb.segments[first],
            climb.segments[second]
          )
        ) return true;
      }
    }
    return false;
  })) {
    throw new Error(`Pinball detour bends or crosses unnaturally: ${id}`);
  }

  if ((map.course.gaps || []).some((gap) => {
    const inGap = (worldY) =>
      worldY >= gap.top && worldY <= gap.bottom;
    return [
      ...map.pegs.map((peg) => peg.cy),
      ...map.bumpers.map((bumper) => bumper.y),
      ...map.spinners.map((spinner) => spinner.cy),
      ...map.boosters.map((booster) => booster.y),
    ].some(inGap);
  })) {
    throw new Error(`Hidden pinball course gap contains obstacles: ${id}`);
  }
}

const appCss = readFileSync('styles/app.css', 'utf8');

for (const file of styleFiles) {
  if (!existsSync(file)) {
    throw new Error(`Missing ${file}`);
  }

  if (
    file !== 'styles/app.css' &&
    !appCss.includes(`./${file.replace('styles/', '')}`)
  ) {
    throw new Error(`styles/app.css must import ${file}`);
  }
}

for (const file of files) {
  if (!existsSync(file)) {
    throw new Error(`Missing ${file}`);
  }

  execFileSync('node', ['--check', file], {
    stdio: 'inherit',
  });
  if (readFileSync(file, 'utf8').split('\n').length - 1 > 2000) {
    throw new Error(`${file} must not exceed 2000 lines`);
  }
}

console.log('Smoke checks passed.');
