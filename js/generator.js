// generator.js — builds a program the way a coach would sketch one on paper:
// pick a split based on days/week and level, fill each day's slots (compound
// lift first, accessories after) from the catalog, and size sets/reps/rest
// to the stated goal. Also powers the "🔄 cambiar ejercicio" swap picker.

// Slot = one "job" in a day (e.g. "hip hinge") mapped to category+target in the dataset.
const SLOT = {
  CHEST: { category: 'chest', targets: ['pectorals'], role: 'compound', label: 'Pecho' },
  BACK_LATS: { category: 'back', targets: ['lats'], role: 'compound', label: 'Espalda (dominante de tirón vertical)' },
  BACK_ROW: { category: 'back', targets: ['upper back', 'traps'], role: 'compound', label: 'Espalda (remo)' },
  SHOULDERS: { category: 'shoulders', targets: ['delts'], role: 'compound', label: 'Hombro' },
  SHOULDERS_ACC: { category: 'shoulders', targets: ['delts'], role: 'accessory', label: 'Hombro (accesorio)' },
  BICEPS: { category: 'upper arms', targets: ['biceps'], role: 'accessory', label: 'Bíceps' },
  TRICEPS: { category: 'upper arms', targets: ['triceps'], role: 'accessory', label: 'Tríceps' },
  QUADS: { category: 'upper legs', targets: ['quads'], role: 'compound', label: 'Pierna (cuádriceps)' },
  HINGE: { category: 'upper legs', targets: ['glutes', 'hamstrings'], role: 'compound', label: 'Pierna (cadera/glúteo)' },
  HAMS_ACC: { category: 'upper legs', targets: ['hamstrings'], role: 'accessory', label: 'Femoral' },
  CALVES: { category: 'lower legs', targets: ['calves'], role: 'accessory', label: 'Gemelo' },
  ABS: { category: 'waist', targets: ['abs'], role: 'accessory', label: 'Core' },
};

const TEMPLATES = {
  full_body: {
    label: 'Full Body',
    days: [
      { name: 'Full Body A', slots: [SLOT.QUADS, SLOT.HINGE, SLOT.CHEST, SLOT.BACK_LATS, SLOT.SHOULDERS, SLOT.ABS] },
      { name: 'Full Body B', slots: [SLOT.HINGE, SLOT.QUADS, SLOT.BACK_ROW, SLOT.CHEST, SLOT.BICEPS, SLOT.ABS] },
      { name: 'Full Body C', slots: [SLOT.QUADS, SLOT.HINGE, SLOT.SHOULDERS, SLOT.BACK_LATS, SLOT.TRICEPS, SLOT.ABS] },
    ],
  },
  upper_lower: {
    label: 'Torso / Pierna',
    days: [
      { name: 'Torso A', slots: [SLOT.CHEST, SLOT.BACK_LATS, SLOT.SHOULDERS, SLOT.BACK_ROW, SLOT.BICEPS, SLOT.TRICEPS] },
      { name: 'Pierna A', slots: [SLOT.QUADS, SLOT.HINGE, SLOT.HAMS_ACC, SLOT.CALVES, SLOT.ABS] },
      { name: 'Torso B', slots: [SLOT.BACK_LATS, SLOT.CHEST, SLOT.SHOULDERS_ACC, SLOT.BACK_ROW, SLOT.TRICEPS, SLOT.BICEPS] },
      { name: 'Pierna B', slots: [SLOT.HINGE, SLOT.QUADS, SLOT.HAMS_ACC, SLOT.CALVES, SLOT.ABS] },
    ],
  },
  push_pull_legs: {
    label: 'Empuje / Tirón / Pierna',
    days: [
      { name: 'Empuje (Push)', slots: [SLOT.CHEST, SLOT.SHOULDERS, SLOT.TRICEPS, SLOT.CHEST, SLOT.SHOULDERS_ACC] },
      { name: 'Tirón (Pull)', slots: [SLOT.BACK_LATS, SLOT.BACK_ROW, SLOT.BICEPS, SLOT.BACK_ROW, SLOT.ABS] },
      { name: 'Pierna (Legs)', slots: [SLOT.QUADS, SLOT.HINGE, SLOT.HAMS_ACC, SLOT.CALVES, SLOT.ABS] },
    ],
  },
  ppl_upper_lower: {
    label: 'PPL + Torso/Pierna',
    days: [
      { name: 'Empuje (Push)', slots: [SLOT.CHEST, SLOT.SHOULDERS, SLOT.TRICEPS, SLOT.CHEST] },
      { name: 'Tirón (Pull)', slots: [SLOT.BACK_LATS, SLOT.BACK_ROW, SLOT.BICEPS, SLOT.ABS] },
      { name: 'Pierna (Legs)', slots: [SLOT.QUADS, SLOT.HINGE, SLOT.HAMS_ACC, SLOT.CALVES] },
      { name: 'Torso', slots: [SLOT.CHEST, SLOT.BACK_ROW, SLOT.SHOULDERS_ACC, SLOT.BICEPS, SLOT.TRICEPS] },
      { name: 'Pierna + Core', slots: [SLOT.HINGE, SLOT.QUADS, SLOT.CALVES, SLOT.ABS] },
    ],
  },
  push_pull_legs_x2: {
    label: 'PPL x2',
    days: [
      { name: 'Empuje A', slots: [SLOT.CHEST, SLOT.SHOULDERS, SLOT.TRICEPS, SLOT.CHEST] },
      { name: 'Tirón A', slots: [SLOT.BACK_LATS, SLOT.BACK_ROW, SLOT.BICEPS, SLOT.ABS] },
      { name: 'Pierna A', slots: [SLOT.QUADS, SLOT.HINGE, SLOT.HAMS_ACC, SLOT.CALVES] },
      { name: 'Empuje B', slots: [SLOT.SHOULDERS, SLOT.CHEST, SLOT.SHOULDERS_ACC, SLOT.TRICEPS] },
      { name: 'Tirón B', slots: [SLOT.BACK_ROW, SLOT.BACK_LATS, SLOT.BICEPS, SLOT.ABS] },
      { name: 'Pierna B', slots: [SLOT.HINGE, SLOT.QUADS, SLOT.CALVES, SLOT.HAMS_ACC] },
    ],
  },
};

const GOAL_CONFIG = {
  fuerza: { compound: { sets: 4, reps: '4-6', rest: 180 }, accessory: { sets: 3, reps: '8-10', rest: 90 } },
  hipertrofia: { compound: { sets: 4, reps: '8-10', rest: 90 }, accessory: { sets: 3, reps: '10-12', rest: 60 } },
  perdida_grasa: { compound: { sets: 3, reps: '12-15', rest: 45 }, accessory: { sets: 3, reps: '15-20', rest: 40 } },
};

export const GOAL_LABELS = {
  fuerza: 'Fuerza',
  hipertrofia: 'Ganar músculo (hipertrofia)',
  perdida_grasa: 'Perder grasa / tonificar',
};

const EQUIPMENT_TIERS = {
  gimnasio: null,
  casa_basico: ['dumbbell', 'band', 'resistance band', 'kettlebell', 'stability ball', 'body weight', 'medicine ball', 'bosu ball', 'wheel roller'],
  peso_corporal: ['body weight', 'band', 'resistance band', 'wheel roller', 'stability ball'],
};
export const EQUIPMENT_LABELS = {
  gimnasio: 'Gimnasio completo',
  casa_basico: 'Equipo básico en casa',
  peso_corporal: 'Solo peso corporal',
};

const COMPOUND_EQUIPMENT_PRIORITY = ['barbell', 'olympic barbell', 'leverage machine', 'smith machine', 'trap bar', 'dumbbell', 'cable', 'ez barbell', 'body weight', 'kettlebell'];
const ACCESSORY_EQUIPMENT_PRIORITY = ['cable', 'dumbbell', 'leverage machine', 'body weight', 'band', 'resistance band', 'kettlebell', 'stability ball'];

const WEEKDAY_PLANS = {
  1: [0],
  2: [0, 3],
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
  5: [0, 1, 2, 3, 4],
  6: [0, 1, 2, 3, 4, 5],
};

export function chooseSplit(daysPerWeek, level) {
  if (daysPerWeek <= 3 && level === 'principiante') return 'full_body';
  if (daysPerWeek <= 2) return 'full_body';
  if (daysPerWeek === 3) return 'push_pull_legs';
  if (daysPerWeek === 4) return 'upper_lower';
  if (daysPerWeek === 5) return 'ppl_upper_lower';
  return 'push_pull_legs_x2';
}

function rank(equipment, priorityList) {
  const i = priorityList.indexOf(equipment);
  return i === -1 ? priorityList.length : i;
}

function pickForSlot(exercises, slot, equipmentAllowList, usedIds) {
  const base = (e) => e.category === slot.category && !usedIds.has(e.id) && (!equipmentAllowList || equipmentAllowList.includes(e.equipment));
  let candidates = exercises.filter((e) => base(e) && slot.targets.includes(e.target));
  if (!candidates.length) candidates = exercises.filter(base);
  if (!candidates.length) candidates = exercises.filter((e) => e.category === slot.category && slot.targets.includes(e.target) && !usedIds.has(e.id));
  if (!candidates.length) candidates = exercises.filter((e) => e.category === slot.category && !usedIds.has(e.id));
  if (!candidates.length) return null;

  const priority = slot.role === 'compound' ? COMPOUND_EQUIPMENT_PRIORITY : ACCESSORY_EQUIPMENT_PRIORITY;
  candidates = [...candidates].sort((a, b) => rank(a.equipment, priority) - rank(b.equipment, priority));
  const top = candidates.slice(0, Math.min(4, candidates.length));
  return top[Math.floor(Math.random() * top.length)];
}

/**
 * Generates a full program: one draft routine per training day.
 * Returns [{ name, exercises: [{exerciseId,name,equipment,category,target,sets,reps,restSeconds}], suggestedDay }]
 */
export function generateProgram({ exercises, goal, level, daysPerWeek, equipment }) {
  const splitKey = chooseSplit(daysPerWeek, level);
  const template = TEMPLATES[splitKey];
  const equipmentAllowList = EQUIPMENT_TIERS[equipment] || null;
  const goalCfg = GOAL_CONFIG[goal] || GOAL_CONFIG.hipertrofia;
  const usedIds = new Set();
  const weekdayPlan = WEEKDAY_PLANS[Math.min(daysPerWeek, 6)] || [];

  const dayDefs = template.days.slice(0, daysPerWeek);
  const routines = dayDefs.map((day, di) => {
    let slots = day.slots;
    if (level === 'principiante') slots = slots.slice(0, Math.max(4, slots.length - 1));
    if (level === 'avanzado' && !slots.includes(SLOT.ABS)) slots = [...slots, SLOT.ABS];

    const dayExercises = [];
    slots.forEach((slot) => {
      const ex = pickForSlot(exercises, slot, equipmentAllowList, usedIds);
      if (!ex) return;
      usedIds.add(ex.id);
      const cfg = goalCfg[slot.role] || goalCfg.accessory;
      let sets = cfg.sets;
      if (level === 'principiante') sets = Math.max(2, sets - 1);
      if (level === 'avanzado') sets = Math.min(5, sets + 1);
      dayExercises.push({
        exerciseId: ex.id,
        name: ex.name,
        equipment: ex.equipment,
        category: ex.category,
        target: ex.target,
        sets,
        reps: cfg.reps,
        restSeconds: cfg.rest,
        slotLabel: slot.label,
      });
    });

    return {
      name: day.name,
      exercises: dayExercises,
      suggestedDay: weekdayPlan[di] ?? null,
    };
  });

  return { splitLabel: template.label, routines };
}

/** Alternatives for the "🔄 cambiar ejercicio" picker: same category, same
 * target muscle preferred, current exercise excluded. */
export function getAlternatives(exercises, current, { limit = 10, equipmentAllowList = null } = {}) {
  const sameTarget = exercises.filter(
    (e) => e.id !== current.id && e.category === current.category && e.target === current.target && (!equipmentAllowList || equipmentAllowList.includes(e.equipment))
  );
  const sameCategory = exercises.filter(
    (e) => e.id !== current.id && e.category === current.category && e.target !== current.target && (!equipmentAllowList || equipmentAllowList.includes(e.equipment))
  );
  return [...sameTarget, ...sameCategory].slice(0, limit);
}
