const elements = new Map();

function createClassList() {
  const values = new Set();
  return {
    add: (...names) => names.forEach((name) => values.add(name)),
    remove: (...names) => names.forEach((name) => values.delete(name)),
    contains: (name) => values.has(name),
    toggle: (name, enabled) => {
      if (enabled) values.add(name);
      else values.delete(name);
    },
  };
}

function createElement(id) {
  return {
    id,
    classList: createClassList(),
    dataset: {},
    hidden: false,
    value: '',
    checked: true,
    disabled: false,
    textContent: '',
    addEventListener() {},
    removeEventListener() {},
    setAttribute() {},
  };
}

const context = new Proxy({}, {
  get(target, property) {
    if (property === 'measureText') {
      return (text) => ({ width: String(text).length * 10 });
    }
    if (!(property in target)) target[property] = () => {};
    return target[property];
  },
  set(target, property, value) {
    target[property] = value;
    return true;
  },
});

const canvas = createElement('pinballCanvas');
canvas.getContext = () => context;
canvas.getBoundingClientRect = () => ({
  left: 0,
  top: 0,
  width: canvas.width,
  height: canvas.height,
});
canvas.setPointerCapture = () => {};
canvas.releasePointerCapture = () => {};
elements.set('pinballCanvas', canvas);
elements.set('pinballOverlay', createElement('pinballOverlay'));

globalThis.document = {
  body: createElement('body'),
  getElementById(id) {
    if (!elements.has(id)) elements.set(id, createElement(id));
    return elements.get(id);
  },
  querySelectorAll() {
    return [];
  },
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() {},
  documentElement: {
    clientWidth: 1600,
    clientHeight: 900,
  },
};
globalThis.window = {
  visualViewport: { width: 1600, height: 900 },
  innerWidth: 1600,
  innerHeight: 900,
  matchMedia: () => ({ matches: false }),
};
Object.defineProperty(globalThis, 'navigator', {
  value: { maxTouchPoints: 0 },
  configurable: true,
});

let nextFrameId = 1;
const frameQueue = [];
globalThis.requestAnimationFrame = (callback) => {
  frameQueue.push(callback);
  return nextFrameId++;
};
globalThis.cancelAnimationFrame = () => {};

let randomState = 123456789;
Math.random = () => {
  randomState = (randomState * 1664525 + 1013904223) >>> 0;
  return randomState / 0x100000000;
};

const {
  drawNumbersPinball,
  stopPinballMode,
} = await import('../scripts/pinball.js?runtime-test');

const frames = [];
const remainingEntries = Array.from({ length: 27 }, (_, index) => ({
  item: String(index + 1),
  key: `entry-${index + 1}`,
}));

drawNumbersPinball({
  remainingEntries,
  drawCountSelect: { value: '1' },
  numberDisplay: createElement('numberDisplay'),
  drawButton: createElement('drawButton'),
  compareItems: (a, b) => Number(a) - Number(b),
  getResultLabel: String,
  getDisplayLabel: String,
  playBumperBeep() {},
  applyPinballResult() {},
  pinballMapOverride: 'factory',
  debugFrame(frame) {
    frames.push(frame);
  },
});

let now = 0;
for (let index = 0; index < 5000 && frameQueue.length > 0; index++) {
  now += 1000 / 60;
  frameQueue.shift()(now);
  if (frames.at(-1)?.winners >= 1) break;
}
stopPinballMode();

if (frames.length < 100) {
  throw new Error('Pinball runtime stopped before enough frames ran');
}

let invisibleStreak = 0;
let longestInvisibleStreak = 0;
let previousFrame = null;
for (const frame of frames) {
  if (
    !Number.isFinite(frame.cameraY) ||
    frame.balls.some((ball) =>
      !Number.isFinite(ball.x) || !Number.isFinite(ball.y)
    )
  ) {
    throw new Error('Pinball runtime produced invalid coordinates');
  }
  if (frame.balls.some((ball) =>
    ball.inDetour && !ball.insideDetour
  )) {
    throw new Error('A pinball escaped the continuous detour course');
  }
  if (
    previousFrame &&
    Math.abs(frame.cameraY - previousFrame.cameraY) >
      frame.viewportHeight * 0.08
  ) {
    throw new Error('Pinball camera jumped instead of following smoothly');
  }
  if (
    frame.sonicReasons.some(
      (reason) => reason !== 'bumper' && reason !== 'stuck'
    )
  ) {
    throw new Error('A sonic boom occurred without a physical collision');
  }
  if (
    frame.cameraFocusProgress !== null &&
    frame.cameraFocusProgress + 0.01 < frame.leadingProgress
  ) {
    throw new Error('Pinball camera did not follow the leading ball');
  }
  if (previousFrame) {
    const previousBalls = new Map(
      previousFrame.balls.map((ball) => [ball.key, ball])
    );
    for (const ball of frame.balls) {
      const previous = previousBalls.get(ball.key);
      if (
        previous?.inDetour &&
        ball.inDetour &&
        Math.hypot(ball.x - previous.x, ball.y - previous.y) >
          frame.viewportHeight * 0.08
      ) {
        throw new Error('A pinball teleported along the detour course');
      }
    }
  }
  if (
    frame.balls.length > 0 &&
    !frame.balls.some((ball) =>
      ball.y + ball.r >= frame.cameraY &&
      ball.y - ball.r <= frame.cameraY + frame.viewportHeight
    )
  ) {
    invisibleStreak++;
    longestInvisibleStreak = Math.max(
      longestInvisibleStreak,
      invisibleStreak
    );
  } else {
    invisibleStreak = 0;
  }
  previousFrame = frame;
}

if (longestInvisibleStreak > 30) {
  throw new Error(
    `Pinball camera stayed empty for ${longestInvisibleStreak} frames`
  );
}

if (!frames.some((frame) => frame.balls.some((ball) => ball.inWater))) {
  throw new Error('Chaos factory water course was never entered');
}

if (frames.at(-1).winners < 1) {
  throw new Error('Chaos factory did not produce a winner');
}

if (frames.at(-1).winnerWaterCourses.some((count) => count < 1)) {
  throw new Error('A chaos factory winner bypassed the water ascent');
}

console.log(`Pinball runtime passed (${frames.length} frames).`);
