let audioCtx = null;
let soundEnabled = true;
let soundTheme = 'bright';

const SOUND_THEMES = {
  bright: {
    result: [523.25, 659.25, 783.99, 1046.5],
    bass: 196,
    tickBase: 740,
    tickRange: 160,
    bumperBase: 260,
    bumperRange: 420,
    turn: [180, 92],
    drop: [360, 620],
    wave: 'triangle',
    volume: 1,
  },
  calm: {
    result: [392, 493.88, 587.33, 783.99],
    bass: 130.81,
    tickBase: 420,
    tickRange: 80,
    bumperBase: 180,
    bumperRange: 180,
    turn: [120, 82],
    drop: [240, 392],
    wave: 'sine',
    volume: 0.72,
  },
  arcade: {
    result: [440, 660, 880, 1320],
    bass: 110,
    tickBase: 880,
    tickRange: 260,
    bumperBase: 320,
    bumperRange: 520,
    turn: [220, 110],
    drop: [520, 980],
    wave: 'square',
    volume: 0.86,
  },
};

export function setSoundEnabled(enabled) {

  soundEnabled = Boolean(enabled);
}

export function isSoundEnabled() {

  return soundEnabled;
}

export function setSoundTheme(theme) {

  if (SOUND_THEMES[theme]) {
    soundTheme = theme;
  }
}

export function getSoundTheme() {

  return soundTheme;
}

function getTheme() {

  return SOUND_THEMES[soundTheme] || SOUND_THEMES.bright;
}

function getAudioContext() {

  try {

    if (!audioCtx) {
      audioCtx =
        new (window.AudioContext ||
          window.webkitAudioContext)();
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    return audioCtx;

  } catch (e) {
    return null;
  }
}

function playTone({
  frequency,
  duration = 0.12,
  delay = 0,
  type = 'sine',
  volume = 0.08,
  slideTo = null,
}) {

  const ac = getAudioContext();

  if (!soundEnabled || !ac) return;

  const start = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const g = ac.createGain();

  osc.connect(g);
  g.connect(ac.destination);

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, start);

  if (slideTo) {
    osc.frequency.exponentialRampToValueAtTime(
      slideTo,
      start + duration
    );
  }

  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(
    volume,
    start + 0.015
  );
  g.gain.exponentialRampToValueAtTime(
    0.0001,
    start + duration
  );

  osc.start(start);
  osc.stop(start + duration + 0.02);
}

export function playSound() {

  const theme = getTheme();

  theme.result.forEach((frequency, index) => {
    playTone({
      frequency,
      delay: index * 0.07,
      duration: 0.2,
      type: theme.wave,
      volume: 0.09 * theme.volume,
    });
  });

  playTone({
    frequency: theme.bass,
    duration: 0.34,
    type: 'sine',
    volume: 0.045 * theme.volume,
  });
}

export function playDrawTick() {

  const theme = getTheme();

  playTone({
    frequency: theme.tickBase + Math.random() * theme.tickRange,
    duration: 0.04,
    type: theme.wave,
    volume: 0.035 * theme.volume,
  });
}

export function playBumperBeep() {

  const theme = getTheme();

  playTone({
    frequency: theme.bumperBase + Math.random() * theme.bumperRange,
    duration: 0.11,
    type: theme.wave,
    volume: 0.09 * theme.volume,
    slideTo: 120 + Math.random() * 160,
  });
}

export function playGumballTurnSound() {

  const theme = getTheme();

  playTone({
    frequency: theme.turn[0],
    duration: 0.5,
    type: 'sawtooth',
    volume: 0.035 * theme.volume,
    slideTo: theme.turn[0] + 80,
  });

  playTone({
    frequency: theme.turn[1],
    delay: 0.08,
    duration: 0.42,
    type: 'triangle',
    volume: 0.04 * theme.volume,
    slideTo: theme.turn[1] + 38,
  });
}

export function playGumballDropSound() {

  const theme = getTheme();

  playTone({
    frequency: theme.drop[0],
    duration: 0.08,
    type: theme.wave,
    volume: 0.08 * theme.volume,
    slideTo: Math.max(80, theme.drop[0] / 2),
  });

  playTone({
    frequency: theme.drop[1],
    delay: 0.08,
    duration: 0.06,
    type: 'square',
    volume: 0.035 * theme.volume,
  });
}
