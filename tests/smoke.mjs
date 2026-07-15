import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const files = [
  'scripts/admin-bulk.js',
  'scripts/main.js',
  'scripts/gumball.js',
  'scripts/manitto.js',
  'scripts/mode-menu.js',
  'scripts/pinball.js',
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
