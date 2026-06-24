const terminateScreen =
  document.getElementById('terminateScreen');

export function terminateProgram() {

  window.close();

  setTimeout(() => {
    document.body.classList.add('terminated');
    terminateScreen?.classList.add('show');
    terminateScreen?.setAttribute('aria-hidden', 'false');
  }, 300);
}
