// views/workout.js — the active training session: log sets, catch PRs live, rest timer
import { dbGet, dbPut } from '../db.js';
import { getExercises, searchExercises, mediaUrl, categoryLabel } from '../dataset.js';
import { openExerciseDetail } from '../exerciseDetail.js';
import { getAllSessions, recordSet, sessionVolume } from '../tracking.js';
import { renderWeightChip } from '../plate.js';
import { navigate, onUnmount } from '../router.js';
import { uid, fmtDuration, escapeHtml } from '../utils.js';

export async function render(container, params) {
  const allExercises = await getExercises();
  const routine = params.routineId ? await dbGet('routines', params.routineId) : null;
  const pastSessions = await getAllSessions();

  const startedAt = new Date().toISOString();
  const session = {
    id: uid(),
    routineId: routine ? routine.id : null,
    routineName: routine ? routine.name : 'Entrenamiento libre',
    startedAt,
    finishedAt: null,
    entries: (routine ? routine.exercises : []).map((item) => ({
      exerciseId: item.exerciseId,
      name: item.name,
      equipment: item.equipment,
      targetSets: item.sets,
      targetReps: item.reps,
      restSeconds: item.restSeconds || 90,
      sets: [],
    })),
  };

  container.innerHTML = `
    <section class="workout">
      <div class="section__head">
        <h1>${escapeHtml(session.routineName)}</h1>
        <span class="workout__timer" id="w-elapsed">00:00</span>
      </div>
      <div id="rest-banner" class="rest-banner" hidden></div>
      <div id="w-entries"></div>
      <div class="search-bar">
        <input type="search" id="w-search" placeholder="Añadir ejercicio a este entreno…" autocomplete="off">
      </div>
      <div class="editor-results" id="w-results"></div>
      <button class="btn btn--primary btn--block" id="w-finish">Terminar entrenamiento</button>
    </section>
  `;

  const entriesEl = container.querySelector('#w-entries');
  const elapsedEl = container.querySelector('#w-elapsed');
  const restBanner = container.querySelector('#rest-banner');
  let restInterval = null;

  const clockStart = Date.now();
  const clockInterval = setInterval(() => {
    const secs = Math.floor((Date.now() - clockStart) / 1000);
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    elapsedEl.textContent = `${m}:${s}`;
  }, 1000);

  function lastSetsFor(exerciseId) {
    for (const s of pastSessions) {
      const entry = (s.entries || []).find((e) => e.exerciseId === exerciseId);
      if (entry && entry.sets.length) return entry.sets;
    }
    return null;
  }

  function exFor(entry) {
    return allExercises.find((e) => e.id === entry.exerciseId);
  }

  function renderEntries() {
    entriesEl.innerHTML = session.entries
      .map((entry, ei) => {
        const last = lastSetsFor(entry.exerciseId);
        const lastLabel = last ? `Última vez: ${last.map((s) => `${s.weight}kg×${s.reps}`).join(', ')}` : 'Sin historial previo';
        return `
        <div class="workout-exercise">
          <div class="workout-exercise__head">
            <button type="button" class="exercise-row-name" data-view="${ei}">
              <img src="${mediaUrl(exFor(entry)?.image)}" class="exercise-thumb" alt="" loading="lazy">
              <span class="workout-exercise__name">${escapeHtml(entry.name)}</span>
            </button>
            <span class="workout-exercise__target">${entry.targetSets ? entry.targetSets + ' × ' + entry.targetReps : ''}</span>
          </div>
          <p class="workout-exercise__last">${lastLabel}</p>
          <div class="set-list" id="sets-${ei}">
            ${entry.sets
              .map(
                (s, si) => `
              <div class="set-row${s.isPR ? ' set-row--pr' : ''}">
                <span class="set-row__num">${si + 1}</span>
                <span class="set-row__vals">${s.weight} kg × ${s.reps}</span>
                ${s.isPR ? '<span class="set-row__badge">🏆 PR</span>' : ''}
              </div>`
              )
              .join('')}
          </div>
          <form class="add-set-form" data-ei="${ei}">
            <input type="number" step="0.5" min="0" name="weight" placeholder="Kg" required inputmode="decimal">
            <input type="number" step="1" min="1" name="reps" placeholder="Reps" required inputmode="numeric">
            <button type="submit" class="btn btn--small">+ Serie</button>
          </form>
        </div>`;
      })
      .join('');

    entriesEl.querySelectorAll('[data-view]').forEach((b) =>
      (b.onclick = () => openExerciseDetail(exFor(session.entries[Number(b.dataset.view)])))
    );
    entriesEl.querySelectorAll('.add-set-form').forEach((form) => {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const ei = Number(form.dataset.ei);
        const fd = new FormData(form);
        const weight = parseFloat(fd.get('weight'));
        const reps = parseInt(fd.get('reps'), 10);
        if (!weight || !reps) return;
        const entry = session.entries[ei];
        const result = await recordSet({
          exerciseId: entry.exerciseId,
          exerciseName: entry.name,
          equipment: entry.equipment,
          weight,
          reps,
          date: new Date().toISOString(),
        });
        entry.sets.push({ weight, reps, isPR: result.isWeightPR || result.isE1rmPR });
        renderEntries();
        startRest(entry.restSeconds);
        if ((result.isWeightPR || result.isE1rmPR) && navigator.vibrate) navigator.vibrate([80, 40, 80]);
      });
    });
  }

  function startRest(seconds) {
    clearInterval(restInterval);
    let remaining = seconds;
    restBanner.hidden = false;
    const paint = () => {
      restBanner.innerHTML = `⏱ Descanso: <strong>${remaining}s</strong> <button class="link" id="rest-skip">saltar</button>`;
      const skip = restBanner.querySelector('#rest-skip');
      if (skip) skip.onclick = () => { clearInterval(restInterval); restBanner.hidden = true; };
    };
    paint();
    restInterval = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(restInterval);
        restBanner.hidden = true;
        if (navigator.vibrate) navigator.vibrate(150);
        return;
      }
      paint();
    }, 1000);
  }

  renderEntries();
  onUnmount(() => {
    clearInterval(clockInterval);
    clearInterval(restInterval);
  });

  const searchEl = container.querySelector('#w-search');
  const resultsEl = container.querySelector('#w-results');
  searchEl.addEventListener('input', debounce(() => {
    const q = searchEl.value.trim();
    if (!q) { resultsEl.innerHTML = ''; return; }
    const matches = searchExercises(allExercises, { q }).slice(0, 10);
    resultsEl.innerHTML = matches
      .map((ex) => `
        <button type="button" class="search-result" data-add="${ex.id}">
          <img src="${mediaUrl(ex.image)}" alt="" loading="lazy">
          <span>${escapeHtml(ex.name)}<small>${categoryLabel(ex.category)}</small></span>
        </button>`)
      .join('');
    resultsEl.querySelectorAll('[data-add]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const ex = allExercises.find((e) => e.id === btn.dataset.add);
        session.entries.push({ exerciseId: ex.id, name: ex.name, equipment: ex.equipment, targetSets: null, targetReps: '', restSeconds: 90, sets: [] });
        renderEntries();
        searchEl.value = '';
        resultsEl.innerHTML = '';
      });
    });
  }, 150));

  container.querySelector('#w-finish').addEventListener('click', async () => {
    const hasAnySet = session.entries.some((e) => e.sets.length);
    if (!hasAnySet && !confirm('No has registrado ninguna serie. ¿Salir sin guardar?')) return;
    clearInterval(clockInterval);
    clearInterval(restInterval);
    if (hasAnySet) {
      session.finishedAt = new Date().toISOString();
      session.entries = session.entries.filter((e) => e.sets.length);
      await dbPut('sessions', session);
      alert(`Entrenamiento guardado. Volumen total: ${sessionVolume(session)} kg · Duración: ${fmtDuration(new Date(session.finishedAt) - new Date(session.startedAt))}`);
    }
    navigate('#/dashboard');
  });
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}
