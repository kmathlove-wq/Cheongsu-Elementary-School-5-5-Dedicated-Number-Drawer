import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const files = [
  'scripts/main.js',
  'scripts/gumball.js',
  'scripts/manitto.js',
  'scripts/pinball.js',
  'scripts/settings.js',
  'scripts/song.js',
  'scripts/sound.js',
  'scripts/terminate.js',
];

const html = readFileSync('index.html', 'utf8');

if (!html.includes('src="scripts/main.js"')) {
  throw new Error('index.html must load scripts/main.js');
}

if (!html.includes('href="style.css"')) {
  throw new Error('index.html must load style.css');
}

if (!readFileSync('style.css', 'utf8').includes('./styles/app.css')) {
  throw new Error('style.css must import styles/app.css');
}

if (!existsSync('styles/app.css')) {
  throw new Error('Missing styles/app.css');
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
