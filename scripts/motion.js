let motionMultiplier = 1;

export function setMotionMode(mode) {

  motionMultiplier =
    mode === 'slow' ? 4 :
      mode === 'fast' ? 0.35 : 1;

  document.body.classList.toggle('motion-slow', mode === 'slow');
  document.body.classList.toggle('motion-fast', mode === 'fast');
  document.dispatchEvent(
    new CustomEvent('app:motion-speed-change', {
      detail: { mode, multiplier: motionMultiplier },
    })
  );
}

export function getMotionMultiplier() {

  return motionMultiplier;
}

export function scaleMotionTime(ms) {

  return Math.max(16, ms * motionMultiplier);
}
