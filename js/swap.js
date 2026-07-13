// swap.js — the "🔄 cambiar ejercicio" picker shared across views
import { openModal, closeModal } from './modal.js';
import { getAlternatives } from './generator.js';
import { mediaUrl, categoryLabel, equipmentLabel } from './dataset.js';
import { escapeHtml } from './utils.js';

/**
 * Opens a picker of alternative exercises for the same muscle/category.
 * @param {Array} allExercises - full catalog
 * @param {string} currentExerciseId
 * @param {(newExercise: object) => void} onPick
 */
export function openSwapPicker(allExercises, currentExerciseId, onPick, opts = {}) {
  const current = allExercises.find((e) => e.id === currentExerciseId);
  if (!current) return;
  const alternatives = getAlternatives(allExercises, current, { limit: 12, equipmentAllowList: opts.equipmentAllowList || null });

  const overlay = openModal(`
    <button class="modal__close" aria-label="Cerrar">&times;</button>
    <h2 class="modal__title">Cambiar “${escapeHtml(current.name)}”</h2>
    <p class="modal__meta">${escapeHtml(categoryLabel(current.category))} · mismo grupo muscular</p>
    <div class="editor-results" id="swap-results">
      ${
        alternatives.length
          ? alternatives
              .map(
                (ex) => `
        <button type="button" class="search-result" data-swap="${ex.id}">
          <img src="${mediaUrl(ex.image)}" alt="" loading="lazy">
          <span>${escapeHtml(ex.name)}<small>${escapeHtml(equipmentLabel(ex.equipment))} · ${escapeHtml(ex.target)}</small></span>
        </button>`
              )
              .join('')
          : `<p class="muted">No hay alternativas claras para este ejercicio; búscalo manualmente en Ejercicios.</p>`
      }
    </div>
  `);
  overlay.querySelector('.modal__close').onclick = closeModal;
  overlay.querySelectorAll('[data-swap]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const ex = allExercises.find((e) => e.id === btn.dataset.swap);
      if (ex) onPick(ex);
      closeModal();
    });
  });
}
