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

  if (
    id === 'factory' &&
    (
      map.bumpers.filter((bumper) => bumper.oneShot).length < 4 ||
      map.spinners.filter((spinner) => spinner.moveSpeed).length < 4 ||
      map.spinners.filter((spinner) => spinner.len > 250).length < 4 ||
      map.waterLifts.length < 2
    )
  ) {
    throw new Error('Chaos factory special obstacles are incomplete');
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
}

console.log('Smoke checks passed.');
