// views/library.js
import { getExercises, syncExercises, getCategories, getEquipment, searchExercises, categoryLabel, equipmentLabel, mediaUrl, instructionSteps } from '../dataset.js';
import { getPR, quickLogSet } from '../tracking.js';
import { renderWeightChip } from '../plate.js';
import { openModal, closeModal } from '../modal.js';
import { fmtDateShort, escapeHtml } from '../utils.js';

const PAGE_SIZE = 30;

export async function render(container) {
  container.innerHTML = `<div class="loading">Cargando la biblioteca de ejercicios…</div>`;
  let all;
  try {
    all = await getExercises();
  } catch (err) {
    container.innerHTML = `<div class="empty-state">
      <h2>No se pudo cargar la biblioteca</h2>
      <p>${err.message}</p>
      <button class="btn btn--primary" id="retry-sync">Reintentar</button>
    </div>`;
    container.querySelector('#retry-sync').onclick = () => render(container);
    return;
  }

  const categories = getCategories(all);
  const equipment = getEquipment(all);
  let state = { q: '', category: '', equipment: '', shown: PAGE_SIZE };

  container.innerHTML = `
    <section class="library">
      <div class="search-bar">
        <input type="search" id="lib-search" placeholder="Buscar ejercicio (p. ej. press banca)" autocomplete="off">
      </div>
      <div class="chip-row" id="chip-category"></div>
      <div class="chip-row" id="chip-equipment"></div>
      <p class="muted" id="lib-count"></p>
      <div class="exercise-grid" id="exercise-grid"></div>
      <button class="btn btn--ghost btn--block" id="load-more" hidden>Mostrar más ejercicios</button>
    </section>
  `;

  renderChips(container.querySelector('#chip-category'), ['Todas', ...categories], (label, i) => {
    state.category = i === 0 ? '' : categories[i - 1];
    state.shown = PAGE_SIZE;
    update();
  }, categoryLabel);

  renderChips(container.querySelector('#chip-equipment'), ['Todo equipo', ...equipment], (label, i) => {
    state.equipment = i === 0 ? '' : equipment[i - 1];
    state.shown = PAGE_SIZE;
    update();
  }, equipmentLabel);

  const searchInput = container.querySelector('#lib-search');
  searchInput.addEventListener('input', debounce(() => {
    state.q = searchInput.value;
    state.shown = PAGE_SIZE;
    update();
  }, 180));

  const loadMoreBtn = container.querySelector('#load-more');
  loadMoreBtn.onclick = () => {
    state.shown += PAGE_SIZE;
    update();
  };

  function update() {
    const results = searchExercises(all, state);
    container.querySelector('#lib-count').textContent = `${results.length} ejercicio${results.length === 1 ? '' : 's'}`;
    const grid = container.querySelector('#exercise-grid');
    const slice = results.slice(0, state.shown);
    grid.innerHTML = slice.length
      ? slice.map(exerciseCard).join('')
      : `<p class="muted">No hay ejercicios que coincidan con esa búsqueda.</p>`;
    grid.querySelectorAll('[data-ex-id]').forEach((card) => {
      card.addEventListener('click', () => openDetail(all.find((e) => e.id === card.dataset.exId)));
    });
    loadMoreBtn.hidden = results.length <= state.shown;
  }

  update();

  // Offer a background sync if the cached copy looks stale — kept quiet, non-blocking.
  syncExercises().catch(() => {});
}

function exerciseCard(ex) {
  return `
    <div class="exercise-card" data-ex-id="${ex.id}">
      <img src="${mediaUrl(ex.image)}" alt="" loading="lazy" class="exercise-card__img">
      <div class="exercise-card__body">
        <span class="exercise-card__name">${escapeHtml(ex.name)}</span>
        <span class="exercise-card__meta">${categoryLabel(ex.category)} · ${equipmentLabel(ex.equipment)}</span>
      </div>
    </div>`;
}

async function openDetail(ex) {
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

function renderChips(el, labels, onSelect, labelFn) {
  el.innerHTML = labels.map((l, i) => `<button class="chip${i === 0 ? ' chip--active' : ''}" data-i="${i}">${i === 0 ? l : labelFn(l)}</button>`).join('');
  el.querySelectorAll('.chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      el.querySelectorAll('.chip').forEach((b) => b.classList.remove('chip--active'));
      btn.classList.add('chip--active');
      onSelect(btn.textContent, Number(btn.dataset.i));
    });
  });
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}
