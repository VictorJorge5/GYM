// views/dashboard.js
import { dbGetAll } from '../db.js';
import { weeklyStats, getAllPRs, getAllSessions } from '../tracking.js';
import { renderWeightChip } from '../plate.js';
import { fmtDateShort, weekdayLabel, WEEKDAYS } from '../utils.js';

export async function render(container) {
  const [routines, sessions, stats, prs] = await Promise.all([
    dbGetAll('routines'),
    getAllSessions(),
    weeklyStats(),
    getAllPRs(),
  ]);

  const todayIdx = (new Date().getDay() + 6) % 7; // Monday = 0
  const todaysRoutine = routines.find((r) => r.day === todayIdx);
  const lastSession = sessions.find((s) => s.finishedAt);
  const suggested = todaysRoutine || (lastSession && routines.find((r) => r.id === lastSession.routineId)) || routines[0];

  const hour = new Date().getHours();
  const greeting = hour < 13 ? 'Buenos días' : hour < 20 ? 'Buenas tardes' : 'Buenas noches';

  container.innerHTML = `
    <section class="hero">
      <p class="hero__eyebrow">${greeting}, Víctor</p>
      <h1 class="hero__title">A por la próxima carga.</h1>
      ${
        suggested
          ? `<a class="btn btn--primary btn--block" href="#/workout/${suggested.id}">Empezar “${escapeAttr(suggested.name)}”</a>
             <p class="hero__hint">${todaysRoutine ? 'Rutina de hoy' : 'Última rutina usada'}${suggested.day != null ? ' · ' + weekdayLabel(suggested.day) : ''} · <a class="link" href="#/workout">o entrena libre</a></p>`
          : `<a class="btn btn--primary btn--block" href="#/routines">Crea tu primera rutina</a>
             <p class="hero__hint">Aún no tienes rutinas guardadas · <a class="link" href="#/workout">o entrena libre</a></p>`
      }
    </section>

    <section class="stat-row">
      <div class="stat-card">
        <span class="stat-card__value">${stats.count}</span>
        <span class="stat-card__label">Entrenos esta semana</span>
      </div>
      <div class="stat-card">
        <span class="stat-card__value">${stats.streak}</span>
        <span class="stat-card__label">${stats.streak === 1 ? 'Semana seguida' : 'Semanas seguidas'}</span>
      </div>
      <div class="stat-card">
        <span class="stat-card__value">${formatKg(stats.volume)}</span>
        <span class="stat-card__label">Volumen esta semana</span>
      </div>
    </section>

    <section class="section">
      <div class="section__head">
        <h2>Últimos récords</h2>
        <a class="link" href="#/progress">Ver progreso</a>
      </div>
      ${prs.length ? `<ul class="pr-list">${prs.slice(0, 4).map(prRow).join('')}</ul>` : emptyPRs()}
    </section>

    <section class="section">
      <div class="section__head">
        <h2>Tus rutinas</h2>
        <a class="link" href="#/routines">Gestionar</a>
      </div>
      ${routines.length ? `<ul class="routine-mini-list">${routines.slice(0, 4).map(routineRow).join('')}</ul>` : `<p class="muted">Todavía no has creado ninguna rutina.</p>`}
    </section>
  `;
}

function prRow(pr) {
  return `
    <li class="pr-row">
      <div class="pr-row__info">
        <span class="pr-row__name">${escapeHtml(pr.name)}</span>
        <span class="pr-row__date">${pr.maxWeightDate ? fmtDateShort(pr.maxWeightDate) : ''}</span>
      </div>
      ${renderWeightChip(pr.maxWeight, pr.equipment)}
    </li>`;
}

function routineRow(r) {
  const count = (r.exercises || []).length;
  return `
    <li class="routine-mini">
      <a href="#/workout/${r.id}">
        <span class="routine-mini__name">${escapeHtml(r.name)}</span>
        <span class="routine-mini__meta">${count} ejercicio${count === 1 ? '' : 's'}${r.day != null ? ' · ' + WEEKDAYS[r.day] : ''}</span>
      </a>
    </li>`;
}

function emptyPRs() {
  return `<p class="muted">Registra tu primer entrenamiento y aquí verás tus mejores marcas.</p>`;
}

function formatKg(n) {
  return n >= 1000 ? `${round1(n / 1000)} t` : `${n} kg`;
}
function round1(n) {
  return Math.round(n * 10) / 10;
}
function escapeHtml(str = '') {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escapeAttr(str = '') {
  return escapeHtml(str).replace(/"/g, '&quot;');
}
