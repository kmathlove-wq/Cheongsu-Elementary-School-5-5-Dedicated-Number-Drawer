let motionMultiplier = 1;
let motionMode = 'normal';

export function setMotionMode(mode, { toggle = true } = {}) {

  // 같은 속도 명령을 다시 받으면 언제든 기본 속도로 되돌린다.
  motionMode = toggle && motionMode === mode
    ? 'normal'
    : mode;

  motionMultiplier =
    motionMode === 'slow' ? 4 :
      motionMode === 'fast' ? 0.35 : 1;

  document.body.classList.toggle('motion-slow', motionMode === 'slow');
  document.body.classList.toggle('motion-fast', motionMode === 'fast');
  document.dispatchEvent(
    new CustomEvent('app:motion-speed-change', {
      detail: { mode: motionMode, multiplier: motionMultiplier },
    })
  );
}

export function getMotionMode() {

  return motionMode;
}

export function getMotionMultiplier() {

  return motionMultiplier;
}

export function scaleMotionTime(ms) {

  return Math.max(16, ms * motionMultiplier);
}
