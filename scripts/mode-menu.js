const moreModes = document.querySelector('.more-modes');
const moreModeToggle = document.querySelector('.more-mode-toggle');

export function closeMoreModes() {
  moreModes?.classList.remove('open');
  moreModeToggle?.setAttribute('aria-expanded', 'false');
}

export function setupModeMenu({ onModeClick, onBasicTap }) {
  document.querySelectorAll('.mode-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.mode === 'basic') {
        onBasicTap();
      }

      onModeClick(btn.dataset.mode);
    });
  });

  moreModeToggle?.addEventListener('click', (event) => {
    event.stopPropagation();
    const open = !moreModes.classList.contains('open');
    moreModes.classList.toggle('open', open);
    moreModeToggle.setAttribute('aria-expanded', String(open));
  });

  document.addEventListener('click', (event) => {
    if (!moreModes?.contains(event.target)) {
      closeMoreModes();
    }
  });
}
