let audioCtx = null;

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

  if (!ac) return;

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

  [
    [523.25, 0],
    [659.25, 0.07],
    [783.99, 0.14],
    [1046.5, 0.23],
  ].forEach(([frequency, delay]) => {
    playTone({
      frequency,
      delay,
      duration: 0.2,
      type: 'triangle',
      volume: 0.09,
    });
  });

  playTone({
    frequency: 196,
    duration: 0.34,
    type: 'sine',
    volume: 0.045,
  });
}

export function playDrawTick() {

  playTone({
    frequency: 740 + Math.random() * 160,
    duration: 0.04,
    type: 'square',
    volume: 0.035,
  });
}

export function playBumperBeep() {

  playTone({
    frequency: 260 + Math.random() * 420,
    duration: 0.11,
    type: 'triangle',
    volume: 0.09,
    slideTo: 120 + Math.random() * 160,
  });
}

export function playGumballTurnSound() {

  playTone({
    frequency: 180,
    duration: 0.5,
    type: 'sawtooth',
    volume: 0.035,
    slideTo: 260,
  });

  playTone({
    frequency: 92,
    delay: 0.08,
    duration: 0.42,
    type: 'triangle',
    volume: 0.04,
    slideTo: 130,
  });
}

export function playGumballDropSound() {

  playTone({
    frequency: 360,
    duration: 0.08,
    type: 'triangle',
    volume: 0.08,
    slideTo: 180,
  });

  playTone({
    frequency: 620,
    delay: 0.08,
    duration: 0.06,
    type: 'square',
    volume: 0.035,
  });
}
