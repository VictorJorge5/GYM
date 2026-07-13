// views/generate.js — "🤖 Generar rutina": a short wizard, then an editable
// preview (with the same 🔄 swap picker as the manual editor) before saving.
import { dbPut } from '../db.js';
import { getExercises, mediaUrl, equipmentLabel } from '../dataset.js';
import { generateProgram, GOAL_LABELS, EQUIPMENT_LABELS } from '../generator.js';
import { openSwapPicker } from '../swap.js';
import { navigate } from '../router.js';
import { uid, WEEKDAYS, escapeHtml } from '../utils.js';

export async function render(container) {
  container.innerHTML = `
    <section class="section">
      <div class="section__head">
        <h1>Generar rutina</h1>
        <a class="link" href="#/routines">Cancelar</a>
      </div>
      <p class="muted">Responde 4 preguntas y te propongo un programa con ejercicios del catálogo, como haría un entrenador. Podrás cambiar cualquier ejercicio antes de guardarlo.</p>

      <label class="field">Objetivo
        <select id="g-goal">
          ${Object.entries(GOAL_LABELS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}
        </select>
      </label>

      <label class="field">Días por semana
        <select id="g-days">
          ${[2, 3, 4, 5, 6].map((n) => `<option value="${n}" ${n === 4 ? 'selected' : ''}>${n} días</option>`).join('')}
        </select>
      </label>

      <label class="field">Nivel
        <select id="g-level">
          <option value="principiante">Principiante</option>
          <option value="intermedio" selected>Intermedio</option>
          <option value="avanzado">Avanzado</option>
        </select>
      </label>

      <label class="field">Equipamiento disponible
        <select id="g-equipment">
          ${Object.entries(EQUIPMENT_LABELS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}
        </select>
      </label>

      <button class="btn btn--primary btn--block" id="g-submit">Generar rutina</button>
      <div id="g-preview"></div>
    </section>
  `;

  container.querySelector('#g-submit').addEventListener('click', async () => {
    const goal = container.querySelector('#g-goal').value;
    const level = container.querySelector('#g-level').value;
    const daysPerWeek = Number(container.querySelector('#g-days').value);
    const equipment = container.querySelector('#g-equipment').value;
    const btn = container.querySelector('#g-submit');
    btn.disabled = true;
    btn.textContent = 'Generando…';
    try {
      const exercises = await getExercises();
      const program = generateProgram({ exercises, goal, level, daysPerWeek, equipment });
      renderPreview(container, program, exercises);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Generar rutina';
    }
  });
}

function renderPreview(container, program, allExercises) {
  const previewEl = container.querySelector('#g-preview');
  const drafts = program.routines.map((r) => ({ ...r, id: uid(), day: r.suggestedDay }));

  previewEl.innerHTML = `
    <h3 class="editor-subhead">Propuesta: ${escapeHtml(program.splitLabel)}</h3>
    <div id="g-days-list"></div>
    <div class="editor-actions">
      <button class="btn btn--primary btn--block" id="g-save">Guardar estas ${drafts.length} rutinas</button>
    </div>
  `;

  const listEl = previewEl.querySelector('#g-days-list');

  function renderDrafts() {
    listEl.innerHTML = drafts
      .map(
        (d, di) => `
      <div class="editor-exercise" style="margin-bottom:16px;">
        <div class="editor-exercise__head">
          <span>${escapeHtml(d.name)}</span>
        </div>
        <label class="field" style="margin:8px 0 12px;">Día
          <select data-day="${di}">
            <option value="">Sin día fijo</option>
            ${WEEKDAYS.map((w, i) => `<option value="${i}" ${d.day === i ? 'selected' : ''}>${w}</option>`).join('')}
          </select>
        </label>
        ${d.exercises
          .map(
            (ex, ei) => `
          <div class="editor-exercise" style="background:var(--surface-2);">
            <div class="editor-exercise__head">
              <span>${escapeHtml(ex.name)}</span>
              <div class="editor-exercise__move">
                <button class="icon-btn" data-swap="${di}:${ei}" aria-label="Cambiar" title="Cambiar por otro similar">🔄</button>
                <button class="icon-btn" data-remove="${di}:${ei}" aria-label="Quitar">✕</button>
              </div>
            </div>
            <p class="muted" style="margin:2px 0 8px;">${escapeHtml(ex.slotLabel || '')} · ${escapeHtml(equipmentLabel(ex.equipment))}</p>
            <div class="editor-exercise__fields">
              <label>Series<input type="number" min="1" value="${ex.sets}" data-field="sets" data-i="${di}:${ei}"></label>
              <label>Reps<input type="text" value="${escapeHtml(ex.reps)}" data-field="reps" data-i="${di}:${ei}"></label>
              <label>Descanso (s)<input type="number" min="0" step="15" value="${ex.restSeconds}" data-field="restSeconds" data-i="${di}:${ei}"></label>
            </div>
          </div>`
          )
          .join('')}
      </div>`
      )
      .join('');

    listEl.querySelectorAll('[data-day]').forEach((sel) => {
      sel.addEventListener('change', () => {
        const di = Number(sel.dataset.day);
        drafts[di].day = sel.value === '' ? null : Number(sel.value);
      });
    });
    listEl.querySelectorAll('[data-swap]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const [di, ei] = btn.dataset.swap.split(':').map(Number);
        const current = drafts[di].exercises[ei];
        openSwapPicker(allExercises, current.exerciseId, (newEx) => {
          drafts[di].exercises[ei] = { ...current, exerciseId: newEx.id, name: newEx.name, equipment: newEx.equipment, category: newEx.category, target: newEx.target };
          renderDrafts();
        });
      });
    });
    listEl.querySelectorAll('[data-remove]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const [di, ei] = btn.dataset.remove.split(':').map(Number);
        drafts[di].exercises.splice(ei, 1);
        renderDrafts();
      });
    });
    listEl.querySelectorAll('input[data-field]').forEach((inp) => {
      inp.addEventListener('input', () => {
        const [di, ei] = inp.dataset.i.split(':').map(Number);
        const field = inp.dataset.field;
        drafts[di].exercises[ei][field] = field === 'reps' ? inp.value : Number(inp.value);
      });
    });
  }

  renderDrafts();

  previewEl.querySelector('#g-save').addEventListener('click', async () => {
    for (const d of drafts) {
      await dbPut('routines', {
        id: d.id,
        name: d.name,
        day: d.day,
        exercises: d.exercises.map((ex) => ({
          exerciseId: ex.exerciseId,
          name: ex.name,
          equipment: ex.equipment,
          sets: ex.sets,
          reps: ex.reps,
          restSeconds: ex.restSeconds,
        })),
      });
    }
    navigate('#/routines');
  });
}
