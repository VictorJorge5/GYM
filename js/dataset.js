// dataset.js — fetches, caches and queries the exercise library
import { dbGetAll, dbBulkPut, dbCount, dbPut } from './db.js';

const RAW_BASE = 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/';
const DATASET_URL = RAW_BASE + 'data/exercises.json';

export function mediaUrl(rel) {
  return rel ? RAW_BASE + rel : '';
}

let cache = null;
let inflight = null;

export async function getExercises() {
  if (cache) return cache;
  const count = await dbCount('exercises');
  if (count > 0) {
    cache = await dbGetAll('exercises');
    return cache;
  }
  return syncExercises();
}

export async function syncExercises(onProgress) {
  if (inflight) return inflight;
  inflight = (async () => {
    const res = await fetch(DATASET_URL);
    if (!res.ok) throw new Error('No se pudo descargar la biblioteca de ejercicios. Comprueba tu conexión.');
    const data = await res.json();
    if (onProgress) onProgress(data.length);
    await dbBulkPut('exercises', data);
    await dbPut('meta', { key: 'lastSync', value: new Date().toISOString() });
    cache = data;
    return data;
  })();
  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

export function getCategories(list) {
  return [...new Set(list.map((e) => e.category))].filter(Boolean).sort();
}
export function getEquipment(list) {
  return [...new Set(list.map((e) => e.equipment))].filter(Boolean).sort();
}

export function searchExercises(list, { q = '', category = '', equipment = '' } = {}) {
  const query = q.trim().toLowerCase();
  return list.filter((e) => {
    if (category && e.category !== category) return false;
    if (equipment && e.equipment !== equipment) return false;
    if (query && !e.name.toLowerCase().includes(query)) return false;
    return true;
  });
}

export function byId(list, id) {
  return list.find((e) => e.id === id);
}

export function instructionText(ex, lang = 'es') {
  const i = ex.instructions || {};
  return i[lang] || i.es || i.en || '';
}
export function instructionSteps(ex, lang = 'es') {
  const i = ex.instruction_steps || {};
  return i[lang] || i.es || i.en || [];
}

export const CATEGORY_LABELS_ES = {
  back: 'Espalda',
  cardio: 'Cardio',
  chest: 'Pecho',
  'lower arms': 'Antebrazos',
  'lower legs': 'Piernas (tren inferior)',
  neck: 'Cuello',
  shoulders: 'Hombros',
  'upper arms': 'Brazos',
  'upper legs': 'Piernas (tren superior)',
  waist: 'Abdomen',
};
export function categoryLabel(c) {
  return CATEGORY_LABELS_ES[c] || c;
}

const EQUIPMENT_LABELS_ES = {
  'body weight': 'Peso corporal',
  barbell: 'Barra',
  'olympic barbell': 'Barra olímpica',
  'ez barbell': 'Barra Z',
  dumbbell: 'Mancuerna',
  cable: 'Polea',
  'leverage machine': 'Máquina de palanca',
  'smith machine': 'Multipower',
  kettlebell: 'Kettlebell',
  band: 'Banda elástica',
  'resistance band': 'Banda de resistencia',
  'stability ball': 'Fitball',
  'medicine ball': 'Balón medicinal',
  'bosu ball': 'Bosu',
  weighted: 'Con lastre',
  assisted: 'Asistido',
  roller: 'Rodillo',
  'wheel roller': 'Rueda abdominal',
  trap_bar: 'Trap bar',
  'trap bar': 'Trap bar',
  rope: 'Cuerda',
  hammer: 'Martillo',
  tire: 'Neumático',
  'sled machine': 'Trineo',
  'elliptical machine': 'Elíptica',
  'skierg machine': 'SkiErg',
  'stationary bike': 'Bici estática',
  'stepmill machine': 'Stepmill',
  'upper body ergometer': 'Ergómetro de brazos',
};
export function equipmentLabel(e) {
  return EQUIPMENT_LABELS_ES[e] || e;
}
