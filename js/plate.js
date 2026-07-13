// plate.js — the signature visual: renders a loaded barbell using real
// competition plate colour-coding (IPF/IWF kg standard), so a lift's weight
// reads instantly as an image of iron, not just a number.
const BAR_WEIGHT = 20; // standard olympic bar, kg
const PLATE_DENOMS = [25, 20, 15, 10, 5, 2.5, 1.25];
const PLATE_COLOR_VAR = {
  25: 'var(--plate-red)',
  20: 'var(--plate-blue)',
  15: 'var(--plate-yellow)',
  10: 'var(--plate-green)',
  5: 'var(--plate-white)',
  2.5: 'var(--plate-black)',
  1.25: 'var(--plate-black)',
};
const PLATE_HEIGHT = { 25: 58, 20: 50, 15: 44, 10: 36, 5: 28, 2.5: 20, 1.25: 14 };
const PLATE_WIDTH = { 25: 14, 20: 13, 15: 12, 10: 11, 5: 8, 2.5: 6, 1.25: 5 };

const BARBELL_EQUIPMENT = new Set(['barbell', 'olympic barbell', 'ez barbell', 'smith machine', 'trap bar']);
export function isBarbellEquipment(equipment) {
  return BARBELL_EQUIPMENT.has(equipment);
}

function decomposePlates(perSideKg) {
  let remaining = Math.max(0, perSideKg);
  const plates = [];
  for (const d of PLATE_DENOMS) {
    while (remaining >= d - 0.001 && plates.length < 7) {
      plates.push(d);
      remaining -= d;
    }
  }
  return plates;
}

/** Renders a horizontal barbell with plates sized/coloured to the given kg total. */
export function renderPlateBar(weightKg, { compact = false, label = '' } = {}) {
  const w = round(weightKg);
  const perSide = Math.max(0, (w - BAR_WEIGHT) / 2);
  const plates = decomposePlates(perSide);
  const scale = compact ? 0.62 : 1;
  const stack = (side) =>
    plates
      .map((p) => {
        const h = Math.round((PLATE_HEIGHT[p] || 18) * scale);
        const wd = Math.round((PLATE_WIDTH[p] || 8) * scale);
        return `<span class="plate" style="height:${h}px;width:${wd}px;background:${PLATE_COLOR_VAR[p] || '#555'}"></span>`;
      })
      .join('');
  return `
    <div class="plate-bar${compact ? ' plate-bar--compact' : ''}" role="img" aria-label="${w} kilos cargados en la barra">
      <span class="plate-bar__stack">${stack('l')}</span>
      <span class="plate-bar__sleeve"></span>
      <span class="plate-bar__rod"></span>
      <span class="plate-bar__collar"><strong>${w}</strong><small>kg</small></span>
      <span class="plate-bar__rod"></span>
      <span class="plate-bar__sleeve"></span>
      <span class="plate-bar__stack">${stack('r')}</span>
    </div>
    ${label ? `<div class="plate-bar__label">${label}</div>` : ''}
  `;
}

/** For non-barbell lifts: a quieter chip, no plate imagery — keeps the signature rare. */
export function renderWeightChip(weightKg, equipment) {
  if (isBarbellEquipment(equipment) && weightKg >= BAR_WEIGHT) {
    return renderPlateBar(weightKg, { compact: true });
  }
  return `<span class="weight-chip">${round(weightKg)}<small>kg</small></span>`;
}

function round(n) {
  return Math.round(n * 4) / 4;
}
