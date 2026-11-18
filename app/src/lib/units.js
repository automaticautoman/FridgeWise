// F21: metric units with automatic conversion. Amounts are stored in a base
// unit (g, ml or pieces), so 1 kg and 1000 g are the same stored amount.
// F22: loose items can be tracked by level instead (low, half, full).

export const UNITS = ['g', 'kg', 'ml', 'l', 'pieces'];
const TO_BASE = { g: ['g', 1], kg: ['g', 1000], ml: ['ml', 1], l: ['ml', 1000], pieces: ['pieces', 1] };

// Stepper size per entry unit (ItemForm mockup).
export const STEP = { g: 250, kg: 0.5, ml: 250, l: 0.5, pieces: 1 };
// Starting amount when switching unit in the form.
export const START = { g: 500, kg: 1, ml: 500, l: 1, pieces: 1 };

export const LEVELS = ['low', 'half', 'full'];
export const LEVEL_LABEL = { low: 'Low', half: 'Half', full: 'Full' };

const round = (n) => Math.round(n * 1000) / 1000;

export function toBase(value, unit) {
  const [base, factor] = TO_BASE[unit] || ['pieces', 1];
  return { amount: round(Number(value) * factor), unit: base };
}

// The unit to show a stored amount in when editing it.
export function entryUnit(amount, base) {
  if (base === 'g') return amount >= 1000 && amount % 100 === 0 ? 'kg' : 'g';
  if (base === 'ml') return amount >= 1000 && amount % 100 === 0 ? 'l' : 'ml';
  return 'pieces';
}
export function fromBase(amount, unit) {
  const [, factor] = TO_BASE[unit] || ['pieces', 1];
  return round(amount / factor);
}

const fmt = (n) => String(Math.round(n * 100) / 100);

const IRREGULAR = { loaf: 'loaves', bunch: 'bunches', box: 'boxes', dozen: 'dozen', piece: 'pieces' };
export function nounFor(n, noun) {
  const one = noun || 'piece';
  if (n === 1) return one;
  return IRREGULAR[one] || one + 's';
}

// "500 g", "1.5 kg", "2 L", "12 pieces", "1 loaf". Level items: "Half".
export function formatAmount(item) {
  if (!item) return '';
  if (item.mode === 'level') return LEVEL_LABEL[item.level] || 'Some';
  const a = Number(item.amount) || 0;
  if (item.unit === 'g') return a >= 1000 ? `${fmt(a / 1000)} kg` : `${fmt(a)} g`;
  if (item.unit === 'ml') return a >= 1000 ? `${fmt(a / 1000)} L` : `${fmt(a)} ml`;
  return `${fmt(a)} ${nounFor(a, item.noun)}`;
}

// "Saved as 1.5 kg" hint under the amount (shown when the unit changes).
export function savedAs(value, unit) {
  const { amount, unit: base } = toBase(value, unit);
  const shown = formatAmount({ mode: 'amount', amount, unit: base }).replace(/ L$/, ' l');
  if (unit === 'pieces' || !(Number(value) > 0)) return null;
  return shown === `${fmt(Number(value))} ${unit}` ? null : shown;
}

// Sensible "how much did you take" choices (ItemDetail mockup): a quarter and
// half of a typical pack, one batch, and everything.
export function takeChoices(batches) {
  const amountBatches = batches.filter((b) => b.mode !== 'level');
  if (!amountBatches.length) return [{ id: 'all', label: 'All of it', amount: null }];
  const unit = amountBatches[0].unit;
  const total = amountBatches.reduce((s, b) => s + (Number(b.amount) || 0), 0);
  const first = Number(amountBatches[0].amount) || 0;
  const typical = Math.max(...amountBatches.map((b) => Number(b.amount) || 0)); // a full pack
  const label = (a) => formatAmount({ mode: 'amount', amount: a, unit, noun: amountBatches[0].noun });
  const out = [];
  const add = (id, amount, text) => { if (amount > 0 && amount < total && !out.some((o) => o.amount === amount)) out.push({ id, amount, label: text || label(amount) }); };
  if (unit === 'pieces') { add('one', 1); add('two', 2); add('half', Math.floor(total / 2)); }
  else { add('quarter', round(typical / 4)); add('half', round(typical / 2)); }
  if (amountBatches.length > 1) add('batch', first, `${label(first)} (one batch)`);
  out.push({ id: 'all', amount: total, label: `All ${label(total)}` });
  return out;
}
