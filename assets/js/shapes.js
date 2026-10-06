"use strict";
/* =====================================================================
   ФИГУРЫ, ЦВЕТА, ПРЕДМЕТЫ — общий «словарь картинок» для всех заданий.
   shapeSVG({s, c, z, f, r, flip}) → <svg>…</svg>
   s — форма, c — цвет, z — размер (big|small), f — заливка (solid|stripe),
   r — поворот в градусах, flip — зеркально.
   ===================================================================== */

const COLORS = {
  red: { hex: "#F03E3E", m: "красный", f: "красная", n: "красное", pl: "красные", kz: "қызыл" },
  blue: { hex: "#2F5BFF", m: "синий", f: "синяя", n: "синее", pl: "синие", kz: "көк" },
  green: { hex: "#12B886", m: "зелёный", f: "зелёная", n: "зелёное", pl: "зелёные", kz: "жасыл" },
  yellow: { hex: "#FFC21A", m: "жёлтый", f: "жёлтая", n: "жёлтое", pl: "жёлтые", kz: "сары" },
  purple: { hex: "#7B4AE2", m: "фиолетовый", f: "фиолетовая", n: "фиолетовое", pl: "фиолетовые", kz: "күлгін" },
  orange: { hex: "#FF8A1F", m: "оранжевый", f: "оранжевая", n: "оранжевое", pl: "оранжевые", kz: "қызғылт сары" },
};
const COLOR_KEYS = ["red", "blue", "green", "yellow", "purple", "orange"];

/* g — род в русском (m/f/n), чтобы писать «красная звезда», «красное сердечко» */
const SHAPES = {
  circle: { g: "m", ru: "круг", pl: "круги", kz: "дөңгелек", kzpl: "дөңгелектер" },
  square: { g: "m", ru: "квадрат", pl: "квадраты", kz: "шаршы", kzpl: "шаршылар" },
  triangle: { g: "m", ru: "треугольник", pl: "треугольники", kz: "үшбұрыш", kzpl: "үшбұрыштар" },
  star: { g: "f", ru: "звезда", pl: "звёзды", kz: "жұлдыз", kzpl: "жұлдыздар" },
  heart: { g: "n", ru: "сердечко", pl: "сердечки", kz: "жүрек", kzpl: "жүректер" },
  diamond: { g: "m", ru: "ромб", pl: "ромбы", kz: "ромб", kzpl: "ромбтар" },
  hexagon: { g: "m", ru: "шестиугольник", pl: "шестиугольники", kz: "алтыбұрыш", kzpl: "алтыбұрыштар" },
  arrow: { g: "f", ru: "стрелка", pl: "стрелки", kz: "нұсқар", kzpl: "нұсқарлар" },
  flag: { g: "m", ru: "флажок", pl: "флажки", kz: "жалауша", kzpl: "жалаушалар" },
};
const SIZES = {
  big: { m: "большой", f: "большая", n: "большое", pl: "большие", kz: "үлкен" },
  small: { m: "маленький", f: "маленькая", n: "маленькое", pl: "маленькие", kz: "кіші" },
};
const FILLS = {
  solid: { m: "закрашенный", f: "закрашенная", n: "закрашенное", pl: "закрашенные", kz: "толық боялған" },
  stripe: { m: "полосатый", f: "полосатая", n: "полосатое", pl: "полосатые", kz: "жолақты" },
};
const SYM_SHAPES = ["circle", "square", "triangle", "star", "heart", "diamond", "hexagon"];

/* «красная большая звезда» / «үлкен қызыл жұлдыз» */
function shapeName(o, { size = true, color = true, fill = false } = {}) {
  const S = SHAPES[o.s], g = S.g;
  const ru = [fill && o.f ? FILLS[o.f][g] : "", size && o.z ? SIZES[o.z][g] : "", color && o.c ? COLORS[o.c][g] : "", S.ru].filter(Boolean).join(" ");
  const kz = [fill && o.f ? FILLS[o.f].kz : "", size && o.z ? SIZES[o.z].kz : "", color && o.c ? COLORS[o.c].kz : "", S.kz].filter(Boolean).join(" ");
  return tx(ru, kz);
}

function shapePath(s) {
  switch (s) {
    case "circle": return `<circle cx="50" cy="50" r="40"/>`;
    case "square": return `<rect x="13" y="13" width="74" height="74" rx="4"/>`;
    case "triangle": return `<path d="M50 9 L92 86 L8 86 Z"/>`;
    case "star": return `<path d="M50 6 L61.8 36.5 L94 37.6 L68.6 57.8 L77.6 89.4 L50 71 L22.4 89.4 L31.4 57.8 L6 37.6 L38.2 36.5 Z"/>`;
    case "heart": return `<path d="M50 88 C20 66 6 50 6 32 C6 17 18 8 30 8 C40 8 46 14 50 22 C54 14 60 8 70 8 C82 8 94 17 94 32 C94 50 80 66 50 88 Z"/>`;
    case "diamond": return `<path d="M50 5 L90 50 L50 95 L10 50 Z"/>`;
    case "hexagon": return `<path d="M28 11 L72 11 L94 50 L72 89 L28 89 L6 50 Z"/>`;
    case "arrow": return `<path d="M10 38 L56 38 L56 16 L92 50 L56 84 L56 62 L10 62 Z"/>`;
    case "flag": return `<path d="M18 92 L18 8 L28 8 L28 14 L84 14 L68 34 L84 54 L28 54 L28 92 Z"/>`;
  }
  return "";
}

/* одна фигура. size — px; маленькая фигура рисуется меньше в той же клетке */
function shapeSVG(o, px = 64, extra = "") {
  const c = COLORS[o.c]?.hex || o.hex || "#151821";
  const sc = o.z === "small" ? 0.56 : 1;
  const fill = o.f === "stripe" ? `url(#st-${o.c})` : c;
  const tr = `translate(50 50) rotate(${o.r || 0}) scale(${(o.flip ? -1 : 1) * sc} ${sc}) translate(-50 -50)`;
  const dots = o.n ? range(o.n).map(i => { const p = DOT_POS[o.n][i]; return `<circle cx="${p[0]}" cy="${p[1]}" r="7" fill="#fff" stroke="#151821" stroke-width="3"/>`; }).join("") : "";
  return `<svg class="shp" viewBox="0 0 100 100" width="${px}" height="${px}" ${extra}><g transform="${tr}" fill="${fill}" stroke="#151821" stroke-width="${4 / sc}" stroke-linejoin="round">${shapePath(o.s)}</g><g transform="translate(50 50) scale(${sc}) translate(-50 -50)">${dots}</g></svg>`;
}
const DOT_POS = { 1: [[50, 52]], 2: [[36, 52], [64, 52]], 3: [[50, 36], [36, 62], [64, 62]], 4: [[36, 38], [64, 38], [36, 64], [64, 64]] };

/* полоски для заливки «в полоску» — по одному узору на цвет, вставляются один раз на страницу */
function injectDefs() {
  if ($("#svgdefs")) return;
  const pats = COLOR_KEYS.map(k => `<pattern id="st-${k}" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="12" height="12" fill="#fff"/><rect width="6" height="12" fill="${COLORS[k].hex}"/></pattern>`).join("");
  document.body.prepend(el(`<svg id="svgdefs" width="0" height="0" style="position:absolute" aria-hidden="true"><defs>${pats}</defs></svg>`));
}

/* предметы-картинки (эмодзи) с категориями — для «найди лишнее» и «разложи» */
const CATS = {
  fruit: { ru: "фрукты", kz: "жемістер", one: tx("фрукт", "жеміс"), items: ["🍎", "🍐", "🍌", "🍇", "🍊", "🍓", "🍑", "🍒"] },
  veg: { ru: "овощи", kz: "көкөністер", one: tx("овощ", "көкөніс"), items: ["🥕", "🥒", "🍅", "🥔", "🌽", "🧅", "🥦", "🍆"] },
  animal: { ru: "животные", kz: "жануарлар", one: tx("животное", "жануар"), items: ["🐶", "🐱", "🐰", "🐻", "🦊", "🐸", "🐼", "🐯"] },
  transport: { ru: "транспорт", kz: "көлік", one: tx("транспорт", "көлік"), items: ["🚗", "🚌", "🚲", "✈️", "🚂", "🚀", "🚕", "🚜"] },
  clothes: { ru: "одежда", kz: "киім", one: tx("одежда", "киім"), items: ["👕", "👖", "🧦", "🧢", "👗", "🧥", "🧤", "🧣"] },
  school: { ru: "школьные вещи", kz: "мектеп заттары", one: tx("школьная вещь", "мектеп заты"), items: ["✏️", "📏", "📚", "✂️", "🖍️", "📐", "🎒", "📓"] },
  bird: { ru: "птицы", kz: "құстар", one: tx("птица", "құс"), items: ["🐦", "🦆", "🦉", "🐧", "🦅", "🐓", "🦜", "🕊️"] },
  sea: { ru: "морские жители", kz: "теңіз жәндіктері", one: tx("морской житель", "теңіз жәндігі"), items: ["🐟", "🐙", "🦀", "🐬", "🐳", "🦈", "🐠", "🦑"] },
};
const ITEM_NAMES = {
  "🍎": tx("яблоко", "алма"), "🍐": tx("груша", "алмұрт"), "🍌": tx("банан"), "🍇": tx("виноград", "жүзім"), "🍊": tx("апельсин", "апельсин"), "🍓": tx("клубника", "құлпынай"), "🍑": tx("персик", "шабдалы"), "🍒": tx("вишня", "шие"),
  "🥕": tx("морковь", "сәбіз"), "🥒": tx("огурец", "қияр"), "🍅": tx("помидор", "қызанақ"), "🥔": tx("картофель", "картоп"), "🌽": tx("кукуруза", "жүгері"), "🧅": tx("лук", "пияз"), "🥦": tx("брокколи"), "🍆": tx("баклажан", "баялды"),
  "🐶": tx("собака", "ит"), "🐱": tx("кошка", "мысық"), "🐰": tx("кролик", "қоян"), "🐻": tx("медведь", "аю"), "🦊": tx("лиса", "түлкі"), "🐸": tx("лягушка", "бақа"), "🐼": tx("панда"), "🐯": tx("тигр", "жолбарыс"),
  "🚗": tx("машина", "көлік"), "🚌": tx("автобус"), "🚲": tx("велосипед"), "✈️": tx("самолёт", "ұшақ"), "🚂": tx("поезд", "пойыз"), "🚀": tx("ракета", "зымыран"), "🚕": tx("такси"), "🚜": tx("трактор"),
  "👕": tx("футболка", "футболка"), "👖": tx("брюки", "шалбар"), "🧦": tx("носки", "шұлық"), "🧢": tx("кепка", "кепка"), "👗": tx("платье", "көйлек"), "🧥": tx("куртка", "күрте"), "🧤": tx("перчатки", "қолғап"), "🧣": tx("шарф", "мойынорағыш"),
  "✏️": tx("карандаш", "қарындаш"), "📏": tx("линейка", "сызғыш"), "📚": tx("книги", "кітаптар"), "✂️": tx("ножницы", "қайшы"), "🖍️": tx("мелок", "бор"), "📐": tx("угольник", "үшбұрыш сызғыш"), "🎒": tx("рюкзак", "рюкзак"), "📓": tx("тетрадь", "дәптер"),
  "🐦": tx("птичка", "торғай"), "🦆": tx("утка", "үйрек"), "🦉": tx("сова", "үкі"), "🐧": tx("пингвин"), "🦅": tx("орёл", "бүркіт"), "🐓": tx("петух", "әтеш"), "🦜": tx("попугай", "тотықұс"), "🕊️": tx("голубь", "көгершін"),
  "🐟": tx("рыба", "балық"), "🐙": tx("осьминог", "сегізаяқ"), "🦀": tx("краб", "шаян"), "🐬": tx("дельфин", "дельфин"), "🐳": tx("кит", "кит"), "🦈": tx("акула", "акула"), "🐠": tx("рыбка", "балықша"), "🦑": tx("кальмар", "кальмар"),
};
const emo = (e, px = 56) => `<span class="emo" style="font-size:${px}px">${e}</span>`;

/* человечки для «порядка», «кто где живёт» */
const AV_COLORS = ["#2F5BFF", "#F03E3E", "#12B886", "#FF8A1F", "#7B4AE2", "#0E9AA8", "#E64980", "#5C940D"];
function avatarSVG(i, px = 56, h = 1) {
  const c = AV_COLORS[i % AV_COLORS.length];
  const H = 100 * h;
  return `<svg class="ava" viewBox="0 0 80 ${H + 10}" width="${px * 0.8}" height="${px * (H + 10) / 100}"><g stroke="#151821" stroke-width="4" stroke-linejoin="round">
    <rect x="18" y="${H * 0.36}" width="44" height="${H * 0.64 + 4}" rx="16" fill="${c}"/>
    <circle cx="40" cy="${H * 0.2}" r="${Math.min(17, H * 0.18)}" fill="#FFE3C4"/></g>
    <circle cx="34" cy="${H * 0.19}" r="2.6" fill="#151821"/><circle cx="46" cy="${H * 0.19}" r="2.6" fill="#151821"/></svg>`;
}
/* рюкзак нужного цвета */
function bagSVG(color, px = 60) {
  const c = COLORS[color].hex;
  return `<svg viewBox="0 0 100 100" width="${px}" height="${px}"><g stroke="#151821" stroke-width="5" stroke-linejoin="round" fill="${c}">
   <path d="M34 22 C34 8 66 8 66 22" fill="none"/><rect x="18" y="20" width="64" height="72" rx="18"/><rect x="30" y="56" width="40" height="26" rx="8" fill="#fff" fill-opacity=".35"/></g></svg>`;
}
