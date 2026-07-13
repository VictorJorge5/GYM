// tracking.js — personal records, volume and streak calculations
import { dbGet, dbPut, dbGetAll } from './db.js';
import { epley1RM, round1, startOfWeek, daysBetween } from './utils.js';

/**
 * Records a completed set, updates the PR store if it's a new best, and
 * returns whether this set just broke a record (by weight or by e1RM).
 */
export async function recordSet({ exerciseId, exerciseName, equipment, weight, reps, date }) {
  const e1rm = epley1RM(weight, reps);
  let pr = await dbGet('prs', exerciseId);
  if (!pr) {
    pr = { exerciseId, name: exerciseName, equipment, maxWeight: 0, maxWeightReps: 0, maxWeightDate: null, best1RM: 0, best1RMDate: null, history: [] };
  }
  let isWeightPR = false;
  let isE1rmPR = false;
  if (weight > pr.maxWeight) {
    pr.maxWeight = weight;
    pr.maxWeightReps = reps;
    pr.maxWeightDate = date;
    isWeightPR = true;
  }
  if (e1rm > pr.best1RM) {
    pr.best1RM = e1rm;
    pr.best1RMDate = date;
    isE1rmPR = true;
  }
  pr.history = pr.history || [];
  pr.history.push({ date, weight, reps, e1rm });
  if (pr.history.length > 200) pr.history = pr.history.slice(-200);
  await dbPut('prs', pr);
  return { pr, isWeightPR, isE1rmPR, e1rm };
}

export async function getPR(exerciseId) {
  return dbGet('prs', exerciseId);
}

export async function getAllPRs() {
  const list = await dbGetAll('prs');
  return list.sort((a, b) => new Date(b.maxWeightDate || 0) - new Date(a.maxWeightDate || 0));
}

export async function getAllSessions() {
  const list = await dbGetAll('sessions');
  return list.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
}

export function sessionVolume(session) {
  let total = 0;
  for (const entry of session.entries || []) {
    for (const s of entry.sets || []) {
      total += (s.weight || 0) * (s.reps || 0);
    }
  }
  return round1(total);
}

export async function weeklyStats() {
  const sessions = await getAllSessions();
  const weekStart = startOfWeek();
  const thisWeek = sessions.filter((s) => new Date(s.startedAt) >= weekStart && s.finishedAt);
  const volume = thisWeek.reduce((acc, s) => acc + sessionVolume(s), 0);
  return {
    count: thisWeek.length,
    volume: round1(volume),
    streak: computeStreak(sessions),
    totalSessions: sessions.filter((s) => s.finishedAt).length,
    totalVolume: round1(sessions.reduce((acc, s) => acc + sessionVolume(s), 0)),
  };
}

/** Consecutive-week streak based on at least one finished workout per week. */
function computeStreak(sessionsDesc) {
  const finished = sessionsDesc.filter((s) => s.finishedAt);
  if (!finished.length) return 0;
  const weeksWithWorkout = new Set(finished.map((s) => startOfWeek(s.startedAt).getTime()));
  let streak = 0;
  let cursor = startOfWeek();
  while (weeksWithWorkout.has(cursor.getTime())) {
    streak += 1;
    cursor = new Date(cursor);
    cursor.setDate(cursor.getDate() - 7);
  }
  return streak;
}

/** Logs a single set outside of any routine (e.g. from the exercise library). */
export async function quickLogSet(exercise, weight, reps) {
  const now = new Date().toISOString();
  const result = await recordSet({
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    equipment: exercise.equipment,
    weight,
    reps,
    date: now,
  });
  const session = {
    id: 'q_' + now,
    routineId: null,
    routineName: 'Registro rápido',
    startedAt: now,
    finishedAt: now,
    entries: [{ exerciseId: exercise.id, name: exercise.name, sets: [{ weight, reps }] }],
  };
  await dbPut('sessions', session);
  return result;
}

export async function daysSinceLastWorkout(sessions) {
  const finished = sessions.filter((s) => s.finishedAt);
  if (!finished.length) return null;
  return daysBetween(finished[0].startedAt, new Date());
}
