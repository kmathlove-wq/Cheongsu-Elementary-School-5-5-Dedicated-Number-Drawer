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
