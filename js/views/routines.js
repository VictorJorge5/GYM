// views/routines.js
import { dbGetAll, dbGet, dbPut, dbDelete } from '../db.js';
import { getExercises, searchExercises, categoryLabel, mediaUrl } from '../dataset.js';
import { navigate } from '../router.js';
import { uid, WEEKDAYS, escapeHtml } from '../utils.js';

export async function render(container) {
  const routines = await dbGetAll('routines');
  container.innerHTML = `
    <section class="section">
      <div class="section__head">
        <h1>Rutinas</h1>
        <a class="btn btn--primary btn--small" href="#/routines/new">+ Nueva</a>
      </div>
      ${
        routines.length
          ? `<ul class="routine-list">${routines.map(routineCard).join('')}</ul>`
          : `<div class="empty-state">
              <h2>Sin rutinas todavía</h2>
              <p>Crea tu primera rutina eligiendo ejercicios del catálogo y definiendo series, repeticiones y descanso.</p>
              <a class="btn btn--primary" href="#/routines/new">Crear rutina</a>
            </div>`
      }
    </section>
  `;
  container.querySelectorAll('[data-delete]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (confirm('¿Eliminar esta rutina? Tu historial de entrenamientos no se verá afectado.')) {
        await dbDelete('routines', btn.dataset.delete);
        render(container);
      }
    });
  });
}

function routineCard(r) {
  const count = (r.exercises || []).length;
  return `
    <li class="routine-card">
      <a href="#/routines/${r.id}">
        <div>
          <span class="routine-card__name">${escapeHtml(r.name)}</span>
          <span class="routine-card__meta">${count} ejercicio${count === 1 ? '' : 's'}${r.day != null ? ' · ' + WEEKDAYS[r.day] : ' · Sin día fijo'}</span>
        </div>
        <button class="icon-btn" data-delete="${r.id}" aria-label="Eliminar" title="Eliminar">🗑</button>
      </a>
    </li>`;
}

export async function renderEditor(container, params) {
  const isNew = params.id === 'new';
  const existing = isNew ? null : await dbGet('routines', params.id);
  const routine = existing || { id: uid(), name: '', day: null, exercises: [] };
  const allExercises = await getExercises();

  container.innerHTML = `
    <section class="section">
      <div class="section__head">
        <h1>${isNew ? 'Nueva rutina' : 'Editar rutina'}</h1>
        <a class="link" href="#/routines">Cancelar</a>
      </div>

      <label class="field">Nombre de la rutina
        <input type="text" id="r-name" value="${escapeHtml(routine.name)}" placeholder="Ej. Empuje, Torso A, Piernas">
      </label>

      <label class="field">Día fijo (opcional)
        <select id="r-day">
          <option value="">Sin día fijo</option>
          ${WEEKDAYS.map((w, i) => `<option value="${i}" ${routine.day === i ? 'selected' : ''}>${w}</option>`).join('')}
        </select>
      </label>

      <h3 class="editor-subhead">Ejercicios</h3>
      <ul class="editor-exercise-list" id="r-exercise-list"></ul>

      <div class="search-bar">
        <input type="search" id="r-search" placeholder="Añadir ejercicio…" autocomplete="off">
      </div>
      <div class="editor-results" id="r-results"></div>

      <div class="editor-actions">
        <button class="btn btn--primary btn--block" id="r-save">Guardar rutina</button>
        ${!isNew ? `<button class="btn btn--danger btn--block" id="r-delete">Eliminar rutina</button>` : ''}
      </div>
    </section>
  `;

  const listEl = container.querySelector('#r-exercise-list');
  const resultsEl = container.querySelector('#r-results');
  const searchEl = container.querySelector('#r-search');

  function renderList() {
    listEl.innerHTML = routine.exercises.length
      ? routine.exercises
          .map(
            (item, i) => `
        <li class="editor-exercise" data-i="${i}">
          <div class="editor-exercise__head">
            <span>${escapeHtml(item.name)}</span>
            <div class="editor-exercise__move">
              <button class="icon-btn" data-up="${i}" ${i === 0 ? 'disabled' : ''} aria-label="Subir">↑</button>
              <button class="icon-btn" data-down="${i}" ${i === routine.exercises.length - 1 ? 'disabled' : ''} aria-label="Bajar">↓</button>
              <button class="icon-btn" data-remove="${i}" aria-label="Quitar">✕</button>
            </div>
          </div>
          <div class="editor-exercise__fields">
            <label>Series<input type="number" min="1" value="${item.sets}" data-field="sets" data-i="${i}"></label>
            <label>Reps objetivo<input type="text" value="${escapeHtml(item.reps)}" data-field="reps" data-i="${i}" placeholder="8-10"></label>
            <label>Descanso (s)<input type="number" min="0" step="15" value="${item.restSeconds}" data-field="restSeconds" data-i="${i}"></label>
          </div>
        </li>`
          )
          .join('')
      : `<p class="muted">Busca abajo y añade ejercicios a esta rutina.</p>`;

    listEl.querySelectorAll('[data-up]').forEach((b) => (b.onclick = () => move(Number(b.dataset.up), -1)));
    listEl.querySelectorAll('[data-down]').forEach((b) => (b.onclick = () => move(Number(b.dataset.down), 1)));
    listEl.querySelectorAll('[data-remove]').forEach((b) => (b.onclick = () => { routine.exercises.splice(Number(b.dataset.remove), 1); renderList(); }));
    listEl.querySelectorAll('input[data-field]').forEach((inp) => {
      inp.addEventListener('input', () => {
        const i = Number(inp.dataset.i);
        const field = inp.dataset.field;
        routine.exercises[i][field] = field === 'reps' ? inp.value : Number(inp.value);
      });
    });
  }

  function move(i, dir) {
    const j = i + dir;
    if (j < 0 || j >= routine.exercises.length) return;
    [routine.exercises[i], routine.exercises[j]] = [routine.exercises[j], routine.exercises[i]];
    renderList();
  }

  renderList();

  searchEl.addEventListener('input', debounce(() => {
    const q = searchEl.value.trim();
    if (!q) {
      resultsEl.innerHTML = '';
      return;
    }
    const matches = searchExercises(allExercises, { q }).slice(0, 12);
    resultsEl.innerHTML = matches
      .map(
        (ex) => `
      <button type="button" class="search-result" data-add="${ex.id}">
        <img src="${mediaUrl(ex.image)}" alt="" loading="lazy">
        <span>${escapeHtml(ex.name)}<small>${categoryLabel(ex.category)}</small></span>
      </button>`
      )
      .join('');
    resultsEl.querySelectorAll('[data-add]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const ex = allExercises.find((e) => e.id === btn.dataset.add);
        routine.exercises.push({ exerciseId: ex.id, name: ex.name, equipment: ex.equipment, sets: 3, reps: '8-10', restSeconds: 90 });
        renderList();
        searchEl.value = '';
        resultsEl.innerHTML = '';
      });
    });
  }, 150));

  container.querySelector('#r-save').addEventListener('click', async () => {
    routine.name = container.querySelector('#r-name').value.trim() || 'Rutina sin nombre';
    const dayVal = container.querySelector('#r-day').value;
    routine.day = dayVal === '' ? null : Number(dayVal);
    await dbPut('routines', routine);
    navigate('#/routines');
  });

  const deleteBtn = container.querySelector('#r-delete');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      if (confirm('¿Eliminar esta rutina?')) {
        await dbDelete('routines', routine.id);
        navigate('#/routines');
      }
    });
  }
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}
