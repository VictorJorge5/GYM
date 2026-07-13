// exerciseDetail.js — the exercise detail sheet: GIF, instructions, current
// PR and a quick-log form. Opened from the Library, from a routine's
// exercise list, and from the active workout screen — same sheet everywhere.
import { getPR, quickLogSet } from './tracking.js';
import { mediaUrl, categoryLabel, equipmentLabel, instructionSteps } from './dataset.js';
import { renderWeightChip } from './plate.js';
import { openModal, closeModal } from './modal.js';
import { fmtDateShort, escapeHtml } from './utils.js';

export async function openExerciseDetail(ex) {
  if (!ex) return;
  const pr = await getPR(ex.id);
  const steps = instructionSteps(ex);
  const overlay = openModal(`
    <button class="modal__close" aria-label="Cerrar">&times;</button>
    <img src="${mediaUrl(ex.gif_url)}" alt="${escapeHtml(ex.name)}" class="modal__gif" loading="lazy">
    <h2 class="modal__title">${escapeHtml(ex.name)}</h2>
    <p class="modal__meta">${escapeHtml(categoryLabel(ex.category))} · ${escapeHtml(equipmentLabel(ex.equipment))} · Objetivo: ${escapeHtml(ex.target || '')}</p>

    ${pr ? `<div class="modal__pr"><span class="modal__pr-label">Tu mejor marca</span>${renderWeightChip(pr.maxWeight, ex.equipment)}<span class="modal__pr-date">${pr.maxWeightReps} reps · ${fmtDateShort(pr.maxWeightDate)}</span></div>` : ''}

    <form id="quick-log" class="quick-log">
      <span class="quick-log__title">Registrar serie rápida</span>
      <div class="quick-log__fields">
        <label>Peso (kg)<input type="number" step="0.5" min="0" name="weight" required></label>
        <label>Reps<input type="number" step="1" min="1" name="reps" required></label>
      </div>
      <button type="submit" class="btn btn--primary btn--block">Guardar serie</button>
      <p class="quick-log__msg" id="quick-log-msg"></p>
    </form>

    ${steps.length ? `<ol class="modal__steps">${steps.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ol>` : ''}
    <p class="modal__attribution">Imagen/animación: ${escapeHtml(ex.attribution || 'gymvisual.com')} — vía hasaneyldrm/exercises-dataset, uso personal.</p>
  `);
  overlay.querySelector('.modal__close').onclick = closeModal;
  overlay.querySelector('#quick-log').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const weight = parseFloat(fd.get('weight'));
    const reps = parseInt(fd.get('reps'), 10);
    if (!weight || !reps) return;
    const result = await quickLogSet(ex, weight, reps);
    const msg = overlay.querySelector('#quick-log-msg');
    msg.textContent = result.isWeightPR || result.isE1rmPR ? '🏆 ¡Nuevo récord!' : 'Serie guardada.';
    msg.classList.toggle('quick-log__msg--pr', result.isWeightPR || result.isE1rmPR);
    e.target.reset();
  });
}
