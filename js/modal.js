// modal.js — tiny reusable modal overlay
let overlayEl = null;

export function openModal(innerHtml) {
  closeModal();
  overlayEl = document.createElement('div');
  overlayEl.className = 'modal-overlay';
  overlayEl.innerHTML = `<div class="modal">${innerHtml}</div>`;
  overlayEl.addEventListener('click', (e) => {
    if (e.target === overlayEl) closeModal();
  });
  document.body.appendChild(overlayEl);
  document.body.classList.add('modal-open');
  return overlayEl;
}

export function closeModal() {
  if (overlayEl) {
    overlayEl.remove();
    overlayEl = null;
    document.body.classList.remove('modal-open');
  }
}
