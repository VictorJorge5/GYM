// utils.js — small shared helpers
export function epley1RM(weight, reps) {
  if (!weight || !reps) return 0;
  if (reps <= 1) return round1(weight);
  return round1(weight * (1 + reps / 30));
}

export function round1(n) {
  return Math.round(n * 10) / 10;
}

export function fmtDateShort(d) {
  return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
}

export function fmtDateLong(d) {
  return new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function startOfWeek(d = new Date()) {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7; // Monday = 0
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function isSameDay(a, b) {
  const da = new Date(a);
  const db = new Date(b);
  return da.toDateString() === db.toDateString();
}

export function daysBetween(a, b) {
  const MS = 1000 * 60 * 60 * 24;
  const da = new Date(new Date(a).toDateString());
  const db = new Date(new Date(b).toDateString());
  return Math.round((db - da) / MS);
}

export function escapeHtml(str = '') {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function fmtDuration(ms) {
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h} h ${m} min`;
}

const WEEKDAYS_ES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
export function weekdayLabel(i) {
  return WEEKDAYS_ES[i] ?? '';
}
export const WEEKDAYS = WEEKDAYS_ES;
