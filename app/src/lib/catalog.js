// F17: common items catalogue with regional staples. Each has a default
// category, storage spot, amount (in base units: g, ml or pieces) and shelf
// life in days (F31, null = unknown, so no date is suggested).
//
// Shelf lives are the team's starting values from public food-safety
// guidance and still need the Product Owner's sign-off (SRS FR4.2).
// Admins will edit this list without redeploying in Epic 11 (F64).

export const CATEGORIES = [
  'Dairy & eggs', 'Meat & fish', 'Vegetables', 'Fruit', 'Herbs', 'Bread & bakery',
  'Grains & rice', 'Lentils & beans', 'Flour & baking', 'Spices', 'Oils & ghee',
  'Sauces & condiments', 'Tea & coffee', 'Drinks', 'Snacks & sweets', 'Frozen', 'Other'
];

// [id, name, also known as, category, spot, amount, unit, noun, shelf days, track by level, date type]
const RAW = [
  ['milk', 'Milk', 'doodh', 'Dairy & eggs', 'Fridge', 1000, 'ml', null, 7, false, 'use-by'],
  ['yoghurt', 'Yoghurt', 'dahi curd', 'Dairy & eggs', 'Fridge', 500, 'g', null, 10, false, 'use-by'],
  ['eggs', 'Eggs', 'anday anda', 'Dairy & eggs', 'Fridge', 12, 'pieces', null, 21, false, 'best-before'],
  ['butter', 'Butter', 'makhan', 'Dairy & eggs', 'Fridge', 200, 'g', null, 30, false, 'best-before'],
  ['cheese', 'Cheese', 'cheddar', 'Dairy & eggs', 'Fridge', 200, 'g', null, 21, false, 'best-before'],
  ['paneer', 'Paneer', 'cottage cheese', 'Dairy & eggs', 'Fridge', 200, 'g', null, 5, false, 'use-by'],
  ['cream', 'Cream', 'malai', 'Dairy & eggs', 'Fridge', 200, 'ml', null, 7, false, 'use-by'],
  ['raita', 'Raita', '', 'Dairy & eggs', 'Fridge', 250, 'g', null, 2, false, 'use-by'],
  ['milk-powder', 'Milk powder', 'nido', 'Dairy & eggs', 'Pantry', 400, 'g', null, 180, false, 'best-before'],
  ['chicken', 'Chicken', 'murgh murghi', 'Meat & fish', 'Fridge', 1000, 'g', null, 2, false, 'use-by'],
  ['beef', 'Beef', 'gosht', 'Meat & fish', 'Fridge', 1000, 'g', null, 3, false, 'use-by'],
  ['mutton', 'Mutton', 'gosht bakra', 'Meat & fish', 'Fridge', 1000, 'g', null, 3, false, 'use-by'],
  ['mince', 'Mince', 'qeema keema', 'Meat & fish', 'Fridge', 500, 'g', null, 2, false, 'use-by'],
  ['fish', 'Fish', 'machli', 'Meat & fish', 'Fridge', 500, 'g', null, 2, false, 'use-by'],
  ['frozen-chicken', 'Frozen chicken nuggets', 'nuggets', 'Frozen', 'Freezer', 500, 'g', null, 90, false, 'best-before'],
  ['frozen-parathas', 'Frozen parathas', 'paratha', 'Frozen', 'Freezer', 5, 'pieces', null, 90, false, 'best-before'],
  ['samosas', 'Frozen samosas', 'samosa', 'Frozen', 'Freezer', 12, 'pieces', null, 90, false, 'best-before'],
  ['onions', 'Onions', 'pyaz piyaz', 'Vegetables', 'Pantry', 1000, 'g', null, 30, false, 'best-before'],
  ['potatoes', 'Potatoes', 'aloo', 'Vegetables', 'Pantry', 2000, 'g', null, 30, false, 'best-before'],
  ['tomatoes', 'Tomatoes', 'tamatar', 'Vegetables', 'Fridge', 1000, 'g', null, 7, false, 'best-before'],
  ['garlic', 'Garlic', 'lehsan', 'Vegetables', 'Pantry', 250, 'g', null, 30, false, 'best-before'],
  ['ginger', 'Ginger', 'adrak', 'Vegetables', 'Fridge', 250, 'g', null, 21, false, 'best-before'],
  ['green-chillies', 'Green chillies (mirchi)', 'hari mirch', 'Vegetables', 'Fridge', 250, 'g', null, 7, false, 'best-before'],
  ['spinach', 'Spinach', 'palak', 'Vegetables', 'Fridge', 1, 'pieces', 'bunch', 3, false, 'best-before'],
  ['okra', 'Okra', 'bhindi', 'Vegetables', 'Fridge', 500, 'g', null, 4, false, 'best-before'],
  ['cauliflower', 'Cauliflower', 'gobi', 'Vegetables', 'Fridge', 1, 'pieces', null, 7, false, 'best-before'],
  ['cabbage', 'Cabbage', 'band gobi', 'Vegetables', 'Fridge', 1, 'pieces', null, 14, false, 'best-before'],
  ['carrots', 'Carrots', 'gajar', 'Vegetables', 'Fridge', 500, 'g', null, 21, false, 'best-before'],
  ['peas', 'Peas', 'matar', 'Vegetables', 'Fridge', 500, 'g', null, 5, false, 'best-before'],
  ['aubergine', 'Aubergine', 'baingan brinjal eggplant', 'Vegetables', 'Fridge', 500, 'g', null, 7, false, 'best-before'],
  ['cucumber', 'Cucumber', 'kheera', 'Vegetables', 'Fridge', 500, 'g', null, 7, false, 'best-before'],
  ['capsicum', 'Capsicum', 'shimla mirch bell pepper', 'Vegetables', 'Fridge', 250, 'g', null, 7, false, 'best-before'],
  ['lemons', 'Lemons', 'nimbu limes', 'Fruit', 'Fridge', 6, 'pieces', null, 21, false, 'best-before'],
  ['bananas', 'Bananas', 'kela', 'Fruit', 'Cupboard', 12, 'pieces', null, 5, false, 'best-before'],
  ['apples', 'Apples', 'saib seb', 'Fruit', 'Fridge', 1000, 'g', null, 30, false, 'best-before'],
  ['oranges', 'Oranges', 'kinnow malta', 'Fruit', 'Fridge', 1000, 'g', null, 14, false, 'best-before'],
  ['mangoes', 'Mangoes', 'aam', 'Fruit', 'Cupboard', 1000, 'g', null, 5, false, 'best-before'],
  ['guava', 'Guava', 'amrood', 'Fruit', 'Fridge', 500, 'g', null, 5, false, 'best-before'],
  ['dates', 'Dates', 'khajoor', 'Fruit', 'Pantry', 500, 'g', null, 180, false, 'best-before'],
  ['coriander', 'Coriander', 'dhania cilantro', 'Herbs', 'Fridge', 1, 'pieces', 'bunch', 5, false, 'best-before'],
  ['mint', 'Mint', 'podina pudina', 'Herbs', 'Fridge', 1, 'pieces', 'bunch', 5, false, 'best-before'],
  ['bread', 'Bread', 'double roti', 'Bread & bakery', 'Cupboard', 1, 'pieces', 'loaf', 4, false, 'best-before'],
  ['naan', 'Naan', 'roti', 'Bread & bakery', 'Cupboard', 4, 'pieces', null, 2, false, 'best-before'],
  ['kulcha', 'Kulcha', '', 'Bread & bakery', 'Cupboard', 4, 'pieces', null, 2, false, 'best-before'],
  ['rusks', 'Rusks', 'papay', 'Bread & bakery', 'Cupboard', 1, 'pieces', 'pack', 60, false, 'best-before'],
  ['basmati', 'Basmati rice', 'chawal chawal', 'Grains & rice', 'Pantry', 5000, 'g', null, null, true, 'best-before'],
  ['rice', 'Rice', 'chawal', 'Grains & rice', 'Pantry', 5000, 'g', null, null, true, 'best-before'],
  ['oats', 'Oats', 'daliya porridge', 'Grains & rice', 'Pantry', 500, 'g', null, 270, false, 'best-before'],
  ['vermicelli', 'Vermicelli', 'seviyan', 'Grains & rice', 'Pantry', 200, 'g', null, 270, false, 'best-before'],
  ['pasta', 'Pasta', 'macaroni spaghetti', 'Grains & rice', 'Pantry', 500, 'g', null, 365, false, 'best-before'],
  ['noodles', 'Instant noodles', 'maggi', 'Grains & rice', 'Cupboard', 5, 'pieces', 'pack', 240, false, 'best-before'],
  ['masoor', 'Masoor daal', 'red lentils dal', 'Lentils & beans', 'Pantry', 1000, 'g', null, 180, false, 'best-before'],
  ['moong', 'Moong daal', 'mung lentils dal', 'Lentils & beans', 'Pantry', 1000, 'g', null, 180, false, 'best-before'],
  ['chana-daal', 'Chana daal', 'split chickpeas dal', 'Lentils & beans', 'Pantry', 1000, 'g', null, 180, false, 'best-before'],
  ['chickpeas', 'Chickpeas', 'chanay chole kabuli', 'Lentils & beans', 'Pantry', 1000, 'g', null, 365, false, 'best-before'],
  ['kidney-beans', 'Kidney beans', 'lobia rajma', 'Lentils & beans', 'Pantry', 500, 'g', null, 365, false, 'best-before'],
  ['atta', 'Atta (wheat flour)', 'aata flour', 'Flour & baking', 'Pantry', 10000, 'g', null, null, true, 'best-before'],
  ['maida', 'Maida (plain flour)', 'flour', 'Flour & baking', 'Pantry', 1000, 'g', null, null, true, 'best-before'],
  ['besan', 'Besan (gram flour)', 'gram flour', 'Flour & baking', 'Pantry', 1000, 'g', null, 180, false, 'best-before'],
  ['sugar', 'Sugar', 'cheeni', 'Flour & baking', 'Pantry', 2000, 'g', null, null, true, 'best-before'],
  ['salt', 'Salt', 'namak', 'Spices', 'Cupboard', 800, 'g', null, null, true, 'best-before'],
  ['red-chilli', 'Red chilli powder', 'lal mirch', 'Spices', 'Cupboard', 200, 'g', null, 365, false, 'best-before'],
  ['turmeric', 'Turmeric', 'haldi', 'Spices', 'Cupboard', 200, 'g', null, 365, false, 'best-before'],
  ['cumin', 'Cumin seeds', 'zeera jeera', 'Spices', 'Cupboard', 100, 'g', null, 365, false, 'best-before'],
  ['garam-masala', 'Garam masala', 'masala', 'Spices', 'Cupboard', 100, 'g', null, 365, false, 'best-before'],
  ['biryani-masala', 'Biryani masala', 'shan masala', 'Spices', 'Cupboard', 1, 'pieces', 'pack', 365, false, 'best-before'],
  ['black-pepper', 'Black pepper', 'kali mirch', 'Spices', 'Cupboard', 100, 'g', null, 365, false, 'best-before'],
  ['cooking-oil', 'Cooking oil', 'tail oil', 'Oils & ghee', 'Pantry', 5000, 'ml', null, null, true, 'best-before'],
  ['ghee', 'Ghee', 'desi ghee banaspati', 'Oils & ghee', 'Pantry', 1000, 'g', null, 365, false, 'best-before'],
  ['olive-oil', 'Olive oil', '', 'Oils & ghee', 'Pantry', 500, 'ml', null, 540, false, 'best-before'],
  ['ketchup', 'Ketchup', 'tomato sauce', 'Sauces & condiments', 'Fridge', 800, 'g', null, 180, false, 'best-before'],
  ['chilli-sauce', 'Chilli sauce', 'hot sauce', 'Sauces & condiments', 'Fridge', 300, 'ml', null, 180, false, 'best-before'],
  ['mayonnaise', 'Mayonnaise', 'mayo', 'Sauces & condiments', 'Fridge', 500, 'g', null, 60, false, 'best-before'],
  ['pickle', 'Pickle', 'achar achaar', 'Sauces & condiments', 'Cupboard', 1000, 'g', null, 365, false, 'best-before'],
  ['jam', 'Jam', 'murabba', 'Sauces & condiments', 'Fridge', 450, 'g', null, 180, false, 'best-before'],
  ['honey', 'Honey', 'shehad', 'Sauces & condiments', 'Cupboard', 500, 'g', null, null, false, 'best-before'],
  ['tea', 'Tea leaves', 'chai patti', 'Tea & coffee', 'Pantry', 250, 'g', null, 150, false, 'best-before'],
  ['coffee', 'Coffee', 'nescafe', 'Tea & coffee', 'Pantry', 100, 'g', null, 365, false, 'best-before'],
  ['green-tea', 'Green tea', 'kehwa', 'Tea & coffee', 'Pantry', 25, 'pieces', 'tea bag', 365, false, 'best-before'],
  ['juice', 'Juice', 'nestle juice', 'Drinks', 'Fridge', 1000, 'ml', null, 7, false, 'best-before'],
  ['soft-drink', 'Soft drink', 'coke pepsi cola', 'Drinks', 'Cupboard', 1500, 'ml', null, 180, false, 'best-before'],
  ['water', 'Water', 'paani', 'Drinks', 'Cupboard', 1500, 'ml', null, 365, false, 'best-before'],
  ['lassi', 'Lassi', '', 'Drinks', 'Fridge', 500, 'ml', null, 3, false, 'use-by'],
  ['biscuits', 'Biscuits', 'cookies', 'Snacks & sweets', 'Cupboard', 1, 'pieces', 'pack', 120, false, 'best-before'],
  ['crisps', 'Crisps', 'chips lays', 'Snacks & sweets', 'Cupboard', 1, 'pieces', 'pack', 90, false, 'best-before'],
  ['nimko', 'Nimko', 'namkeen', 'Snacks & sweets', 'Cupboard', 250, 'g', null, 60, false, 'best-before'],
  ['chocolate', 'Chocolate', '', 'Snacks & sweets', 'Cupboard', 1, 'pieces', 'bar', 180, false, 'best-before'],
  ['mithai', 'Mithai', 'sweets gulab jamun', 'Snacks & sweets', 'Fridge', 500, 'g', null, 5, false, 'use-by'],
  ['ice-cream', 'Ice cream', 'kulfi', 'Frozen', 'Freezer', 1000, 'ml', null, 90, false, 'best-before']
];

export const CATALOG = RAW.map(([id, name, aka, category, location, amount, unit, noun, shelfDays, level, dateType]) => ({
  id, name, aka, category, location, amount, unit, noun, shelfDays, mode: level ? 'level' : 'amount', dateType
}));

export const nameKey = (name) => String(name || '').toLowerCase().replace(/\s*\(.*?\)\s*/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();

// Starts-with matches first, then word starts, then anywhere (name or aka).
export function searchCatalog(q, extra = []) {
  const s = nameKey(q);
  if (!s) return [];
  const all = [...extra, ...CATALOG.filter((c) => !extra.some((e) => nameKey(e.name) === nameKey(c.name)))];
  const score = (c) => {
    const n = nameKey(c.name);
    const a = nameKey(c.aka || '');
    if (n.startsWith(s)) return 0;
    if (n.split(' ').some((w) => w.startsWith(s))) return 1;
    if (a.split(' ').some((w) => w.startsWith(s))) return 2;
    if (n.includes(s) || a.includes(s)) return 3;
    return 9;
  };
  return all.map((c) => [score(c), c]).filter(([sc]) => sc < 9).sort((x, y) => x[0] - y[0] || x[1].name.localeCompare(y[1].name)).map(([, c]) => c);
}

// "Did you mean Kulcha?" for a search with no matches (AddCustom mockup).
export function closest(q) {
  const s = nameKey(q);
  if (s.length < 3) return null;
  const dist = (a, b) => {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    return d[a.length][b.length];
  };
  let best = null;
  for (const c of CATALOG) {
    const n = nameKey(c.name).slice(0, s.length + 2);
    const d = dist(s, n);
    if (d <= Math.max(1, Math.floor(s.length / 3)) && (!best || d < best[0])) best = [d, c];
  }
  return best ? best[1] : null;
}
