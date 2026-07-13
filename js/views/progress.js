// views/progress.js
import { dbGetAll, dbPut } from '../db.js';
import { getAllPRs, getAllSessions, sessionVolume, weeklyStats } from '../tracking.js';
import { renderWeightChip } from '../plate.js';
import { drawLineChart, drawBarChart } from '../chart.js';
import { fmtDateShort, WEEKDAYS, escapeHtml } from '../utils.js';

export async function render(container) {
  const [prs, sessions, stats, bodyweight] = await Promise.all([
    getAllPRs(),
    getAllSessions(),
    weeklyStats(),
    dbGetAll('bodyweight'),
  ]);

  container.innerHTML = `
    <section class="section">
      <h1>Progreso</h1>

      <div class="stat-row">
        <div class="stat-card"><span class="stat-card__value">${stats.totalSessions}</span><span class="stat-card__label">Entrenos totales</span></div>
        <div class="stat-card"><span class="stat-card__value">${Math.round(stats.totalVolume).toLocaleString('es-ES')}</span><span class="stat-card__label">Kg totales movidos</span></div>
        <div class="stat-card"><span class="stat-card__value">${prs.length}</span><span class="stat-card__label">Ejercicios con marca</span></div>
      </div>

      <h3 class="editor-subhead">Frecuencia semanal (últimas 8 semanas)</h3>
      <canvas id="freq-chart" class="chart-canvas" height="140"></canvas>

      <h3 class="editor-subhead">Selecciona un ejercicio</h3>
      ${prs.length ? `<select id="ex-select">${prs.map((p) => `<option value="${p.exerciseId}">${escapeHtml(p.name)}</option>`).join('')}</select>` : `<p class="muted">Registra algún entrenamiento para ver tu evolución aquí.</p>`}
      <div id="ex-detail"></div>

      <h3 class="editor-subhead">Peso corporal</h3>
      <form id="bw-form" class="quick-log">
        <div class="quick-log__fields">
          <label>Fecha<input type="date" name="date" value="${new Date().toISOString().slice(0, 10)}"></label>
          <label>Peso (kg)<input type="number" step="0.1" min="0" name="weight" required></label>
        </div>
        <button type="submit" class="btn btn--small">Añadir registro</button>
      </form>
      <canvas id="bw-chart" class="chart-canvas" height="120"></canvas>
    </section>
  `;

  drawBarChart(
    container.querySelector('#freq-chart'),
    lastWeeks(8).map((w) => ({ label: w.label, value: w.count, highlight: w.isCurrent }))
  );

  function renderExerciseDetail(exerciseId) {
    const pr = prs.find((p) => p.exerciseId === exerciseId);
    const detailEl = container.querySelector('#ex-detail');
    if (!pr) { detailEl.innerHTML = ''; return; }
    detailEl.innerHTML = `
      <div class="pr-detail">
        <div class="pr-detail__row">
          <div>
            <span class="pr-detail__label">Peso máximo</span>
            ${renderWeightChip(pr.maxWeight, pr.equipment)}
            <span class="pr-detail__sub">${pr.maxWeightReps} reps · ${fmtDateShort(pr.maxWeightDate)}</span>
          </div>
          <div>
            <span class="pr-detail__label">1RM estimado</span>
            <span class="stat-card__value">${pr.best1RM} kg</span>
            <span class="pr-detail__sub">${fmtDateShort(pr.best1RMDate)}</span>
          </div>
        </div>
        <canvas id="ex-chart" class="chart-canvas" height="140"></canvas>
      </div>
    `;
    const history = (pr.history || []).slice(-20);
    drawLineChart(
      container.querySelector('#ex-chart'),
      history.map((h) => ({ value: h.e1rm, date: h.date })),
      { unit: 'kg' }
    );
  }

  const select = container.querySelector('#ex-select');
  if (select) {
    select.addEventListener('change', () => renderExerciseDetail(select.value));
    renderExerciseDetail(select.value);
  }

  function bwSorted() {
    return [...bodyweight].sort((a, b) => new Date(a.date) - new Date(b.date));
  }
  function renderBwChart() {
    drawLineChart(
      container.querySelector('#bw-chart'),
      bwSorted().map((b) => ({ value: b.weight, date: b.date })),
      { color: '#8b93a1', unit: 'kg' }
    );
  }
  renderBwChart();

  container.querySelector('#bw-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const date = fd.get('date');
    const weight = parseFloat(fd.get('weight'));
    if (!date || !weight) return;
    await dbPut('bodyweight', { date, weight });
    const idx = bodyweight.findIndex((b) => b.date === date);
    if (idx >= 0) bodyweight[idx] = { date, weight };
    else bodyweight.push({ date, weight });
    renderBwChart();
    e.target.reset();
    e.target.querySelector('[name=date]').value = new Date().toISOString().slice(0, 10);
  });

  function lastWeeks(n) {
    const out = [];
    const now = new Date();
    const day = (now.getDay() + 6) % 7;
    const currentWeekStart = new Date(now);
    currentWeekStart.setDate(now.getDate() - day);
    currentWeekStart.setHours(0, 0, 0, 0);
    for (let i = n - 1; i >= 0; i--) {
      const start = new Date(currentWeekStart);
      start.setDate(start.getDate() - i * 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      const count = sessions.filter((s) => s.finishedAt && new Date(s.startedAt) >= start && new Date(s.startedAt) < end).length;
      out.push({ label: `${start.getDate()}/${start.getMonth() + 1}`, count, isCurrent: i === 0 });
    }
    return out;
  }
}
