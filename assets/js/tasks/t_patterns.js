"use strict";
/* =====================================================================
   ЗАКОНОМЕРНОСТИ: ряд фигур (pattern) · числовой ряд (numseq)
   АНАЛОГИИ: analogy
   ===================================================================== */

/* «дорожка» — одно правило ряда: шаблон букв (ABB) и значения букв.
   attr: s | c | r (поворот) | n (точки) | kind (форма+цвет вместе) */
function trackVal(tr, i) { return tr.vals[tr.tpl.charCodeAt(i % tr.tpl.length) - 65]; }
function trackDesc(tr) {
  const P = tr.tpl.length;
  if (tr.attr === "r") return tx(`Стрелка каждый раз поворачивается на ${tr.step}° по часовой стрелке.`, `Нұсқар әр жолы сағат тілімен ${tr.step}°-қа бұрылады.`);
  const nm = v => tr.attr === "s" ? tx(SHAPES[v].ru, SHAPES[v].kz) : tr.attr === "c" ? tx(COLORS[v].m, COLORS[v].kz) : tr.attr === "n" ? tx(`${v} ${plural(v, "точка", "точки", "точек")}`, `${v} нүкте`) : shapeName(v, { size: false });
  const seq = range(P).map(i => nm(trackVal(tr, i)));
  const word = { s: tx("Формы", "Пішіндер"), c: tx("Цвета", "Түстер"), n: tx("Точки", "Нүктелер"), kind: tx("Фигуры", "Фигуралар") }[tr.attr];
  return tx(`${word.ru} повторяются через каждые ${P}: ${seq.map(x => x.ru).join(" → ")} → и снова сначала.`, `${word.kz} әр ${P} сайын қайталанады: ${seq.map(x => x.kz).join(" → ")} → қайтадан басынан.`);
}
function itemAt(tracks, base, i) {
  const o = { ...base };
  for (const tr of tracks) { const v = trackVal(tr, i); if (tr.attr === "kind") Object.assign(o, v); else if (tr.attr === "r") o.r = (v + 360) % 360; else o[tr.attr] = v; }
  return o;
}
const TPL = { 1: ["AB", "AB", "ABB", "AAB", "ABC"], 2: ["ABC", "AABB", "ABBC", "ABCD", "AAB", "ABB"], 3: ["ABC", "ABCD", "AABB", "ABCB"] };

registerTask({
  id: "pattern", dir: "patterns", kind: "tap", title: tx("Продолжи ряд", "Қатарды жалғастыр"),
  gen(R, grade, level) {
    const base = { s: "circle", c: "blue", z: "big" };
    let tracks = [];
    const one = (attr, tplSet, k) => {
      const tpl = R.pick(tplSet); const kn = new Set(tpl).size;
      let vals;
      if (attr === "s") vals = R.sample(["circle", "square", "triangle", "star", "heart", "diamond"], kn);
      else if (attr === "c") vals = R.sample(COLOR_KEYS.slice(0, 5), kn);
      else if (attr === "n") vals = R.sample([1, 2, 3, 4], kn);
      else vals = R.sample(["circle", "square", "triangle", "star", "heart", "diamond"], kn).map((s, i) => ({ s, c: COLOR_KEYS[(i + k) % 5] }));
      return { attr, tpl, vals };
    };
    const rot = (only90 = false) => { const step = grade >= 4 && !only90 && R.chance(0.5) ? 45 : 90; const P = 360 / step; return { attr: "r", step, tpl: range(P).map(i => String.fromCharCode(65 + i)).join(""), vals: range(P).map(i => i * step) }; };
    let mode = "next";
    if (grade === 1) tracks = [level === 3 ? one("kind", TPL[2], R.int(0, 4)) : one(R.pick(["s", "c"]), level === 1 ? ["AB", "AB", "ABC"] : TPL[1])];
    else if (grade === 2) tracks = level === 1 ? [one(R.pick(["s", "c", "kind"]), TPL[2])] : level === 2 ? [one("kind", TPL[2], 1)] : two();
    else if (grade === 3) {
      if (level === 1) tracks = two();
      else if (level === 2) { tracks = [rot(), one("c", ["AB", "ABC"])]; base.s = "arrow"; }
      else { tracks = R.chance(0.5) ? two() : [one("n", ["ABC", "ABCD"]), one("c", ["AB", "ABC"])]; mode = "error"; }
    } else {
      if (level === 1) tracks = two(["ABC", "ABCD", "AB"]);
      else if (level === 2) { tracks = [rot(), one("c", ["AB", "ABC", "AAB"])]; base.s = "arrow"; mode = R.chance(0.5) ? "next" : "mid"; }
      else { tracks = R.chance(0.5) ? [rot(true), one("c", ["ABC", "AB"])] : [one("s", TPL[3]), one("c", ["AB", "ABC"]), one("n", ["AB", "ABC"])]; if (tracks[0].attr === "r") base.s = "arrow"; mode = "error"; }
    }
    function two(cs = ["AB", "ABC"]) { // две независимые дорожки разной длины
      let a = one("s", R.chance(0.5) ? ["AB", "ABC"] : cs), b = one("c", cs);
      for (let k = 0; k < 20 && a.tpl.length === b.tpl.length; k++) b = one("c", cs);
      return [a, b];
    }
    const Pmax = Math.max(...tracks.map(t => t.tpl.length));
    const lcm = tracks.reduce((m, t) => { const p = t.tpl.length; let a = m, b = p; while (b) [a, b] = [b, a % b]; return m * p / a; }, 1);
    if (mode === "error") {
      const len = Math.min(Math.max(3 * Pmax, 8), 12);
      const items = range(len).map(i => itemAt(tracks, base, i));
      // портим один элемент по одной дорожке: в его «столбце» должно быть ≥3 элемента
      const tr = R.pick(tracks); const P = tr.tpl.length;
      const cands = range(len).filter(i => i - P >= 0 && i + P < len);
      const p = R.pick(cands); const right = items[p];
      const wrongVal = R.pick(tr.attr === "r" ? tr.vals.filter(v => v !== right.r) : [...new Set(tr.vals.concat(tr.attr === "s" ? ["hexagon"] : tr.attr === "c" ? ["purple"] : tr.attr === "n" ? [4] : []))].filter(v => JSON.stringify(v) !== JSON.stringify(tr.attr === "r" ? right.r : right[tr.attr])));
      items[p] = { ...right, [tr.attr]: wrongVal };
      if (sameShape(items[p], right)) throw new Error("pattern: ошибка не видна");
      return { mode, tracks, base, items, ans: p, right, badTrack: tracks.indexOf(tr),
        q: tx("В ряду спряталась одна ошибка. Найди фигуру, которая нарушает правило.", "Қатарда бір қате жасырынған. Ережені бұзатын фигураны тап."),
        hints: [tx("Сначала найди правило: через сколько фигур ряд повторяется?", "Алдымен ережені тап: қатар неше фигурадан кейін қайталанады?"), trackDesc(tr)] };
    }
    const len = Math.max(Math.min(Math.max(2 * lcm, 2 * Pmax + 2), 9), grade === 1 ? 6 : 7);
    const blank = mode === "mid" ? R.int(len - 3, len - 2) : len;
    const show = range(len + (mode === "mid" ? 0 : 1)).map(i => itemAt(tracks, base, i));
    const right = show[blank];
    // варианты: правильный + испорченные по одной дорожке
    const opts = [right]; let guard = 0;
    while (opts.length < (grade === 1 ? 3 : 4) && guard++ < 200) {
      const tr = R.pick(tracks); const o = { ...right };
      if (tr.attr === "r") o.r = R.pick(tr.vals.filter(v => v !== right.r).concat([(right.r + 180) % 360]));
      else if (tr.attr === "kind") Object.assign(o, R.pick(tr.vals.filter(v => v.s !== right.s)));
      else o[tr.attr] = R.pick(tr.vals.filter(v => v !== right[tr.attr]).concat(tr.attr === "s" ? ["hexagon"] : tr.attr === "c" ? ["orange"] : []));
      if (guard > 60 && tracks.length > 1) { const t2 = tracks.find(x => x !== tr); if (t2.attr === "c") o.c = R.pick(t2.vals.filter(v => v !== right.c)); }
      if (!opts.some(x => sameShape(x, o))) opts.push(o);
    }
    const sh = R.shuffle(opts);
    return { mode, tracks, base, items: show, blank, opts: sh, ans: sh.findIndex(x => sameShape(x, right)), right,
      q: mode === "mid" ? tx("Какая фигура пропущена? Выбери ответ.", "Қай фигура түсіп қалды? Жауапты таңда.") : tx("Какая фигура будет следующей? Выбери ответ.", "Келесі фигура қандай болады? Жауапты таңда."),
      hints: [tx("Найди, с какого места ряд начинает повторяться.", "Қатар қай жерден қайталана бастайтынын тап."), ...tracks.map(trackDesc).slice(0, 2)] };
  },
  render(t, box) {
    const sz = t.items.length > 9 ? 64 : 74;
    const row = el(`<div class="patrow">${t.items.map((it, i) => i === t.blank ? `<div class="pit blank" data-i="${i}"><span>?</span></div>` : `<button type="button" class="pit" data-i="${i}">${shapeSVG(it, sz)}</button>`).join("")}${t.blank === t.items.length ? `<div class="pit blank" data-i="${t.blank}"><span>?</span></div>` : ""}</div>`);
    box.append(row);
    const cell = i => $(`.pit[data-i="${i}"]`, row);
    if (t.mode === "error") {
      let sel = null;
      row.addEventListener("click", e => { const b = e.target.closest(".pit"); if (!b || box.classList.contains("locked")) return; sel = +b.dataset.i; $$(".pit", row).forEach(x => x.classList.toggle("sel", x === b)); });
      return {
        check() {
          if (sel == null) return EMPTY(tx("Нажми на фигуру с ошибкой.", "Қате фигураны бас."));
          if (sel === t.ans) { cell(sel).classList.add("good"); return { ok: true, msg: trackDesc(t.tracks[t.badTrack]) }; }
          cell(sel).classList.add("bad"); setTimeout(() => cell(sel)?.classList.remove("bad"), 900);
          return { ok: false, msg: tx("Эта фигура стоит по правилу. Сравни её с фигурами, которые стоят на таком же месте в соседних «кусочках» ряда.", "Бұл фигура ережеге сай тұр. Оны қатардың көрші «бөліктеріндегі» дәл осындай орындағы фигуралармен салыстыр.") };
        },
        solve() {
          const P = t.tracks[t.badTrack].tpl.length;
          return [
            { t: trackDesc(t.tracks[t.badTrack]), act: () => groupMarks(row, t.items.length, P) },
            { t: tx(`Сравниваем фигуры через каждые ${P}. Одна из них не такая, как соседи по «столбику».`, `Әр ${P} фигураны салыстырамыз. Біреуі көршілерінен өзгеше.`), act: () => { range(t.items.length).filter(i => i % P === t.ans % P).forEach(i => cell(i).classList.add("hl")); } },
            { t: withH(tx("Вот она! А должна была стоять вот такая фигура:", "Міне ол! Ал орнында мынадай фигура тұруы керек еді:"), `<span class="inl">${shapeSVG(t.right, 44)}</span>`), act: () => { cell(t.ans).classList.add("good"); } },
          ];
        },
      };
    }
    const ch = choiceUI(box, t.opts.map(o => shapeSVG(o, 70)), { cls: "shapes", onPick: i => { const b = cell(t.blank); b.innerHTML = shapeSVG(t.opts[i], sz); b.classList.add("filled"); } });
    return {
      check() {
        const i = ch.get(); if (i == null) return EMPTY(tx("Выбери фигуру внизу.", "Төменнен фигураны таңда."));
        if (i === t.ans) { ch.mark(i, "good"); return { ok: true }; }
        ch.mark(i, "bad"); setTimeout(() => ch.clear(), 900);
        const o = t.opts[i]; const wrongTr = t.tracks.find(tr => tr.attr === "r" ? o.r !== t.right.r : tr.attr === "kind" ? o.s !== t.right.s || o.c !== t.right.c : o[tr.attr] !== t.right[tr.attr]) || t.tracks[0];
        const what = { s: tx("Форма не та.", "Пішіні басқа."), c: tx("Цвет не тот.", "Түсі басқа."), r: tx("Стрелка повёрнута не туда.", "Нұсқар басқа жаққа бұрылған."), n: tx("Число точек не то.", "Нүкте саны басқа."), kind: tx("Фигура не та.", "Фигура басқа.") }[wrongTr.attr];
        return { ok: false, msg: tx(`${what.ru} ${trackDesc(wrongTr).ru}`, `${what.kz} ${trackDesc(wrongTr).kz}`) };
      },
      solve() {
        const steps = [{ t: tx("Ищем, где ряд начинает повторяться.", "Қатардың қайталанатын жерін іздейміз."), act: () => groupMarks(row, t.items.length, t.tracks[0].tpl.length) }];
        t.tracks.forEach(tr => steps.push({ t: trackDesc(tr) }));
        steps.push({ t: tx("Значит, на месте «?» стоит такая фигура.", "Демек, «?» орнында мынадай фигура тұрады."), act: () => { ch.set(t.ans); ch.mark(t.ans, "good"); const b = cell(t.blank); b.innerHTML = shapeSVG(t.right, sz); b.classList.add("filled", "good"); } });
        return steps;
      },
    };
  },
});
/* скобки-группы под рядом: показывают «кусочки» длины P */
function groupMarks(row, len, P) {
  $$(".gmark", row).forEach(n => n.remove());
  $$(".pit", row).forEach((c, i) => { c.classList.remove("g0", "g1"); c.classList.add("g" + (Math.floor(i / P) % 2)); });
}

/* ---------------------------------------------------------------------
   ЧИСЛОВОЙ РЯД
   --------------------------------------------------------------------- */
function numFamily(R, grade, level) {
  const A = (s, d, n) => range(n).map(i => s + i * d);
  const fam = [];
  if (grade === 1) {
    if (level === 1) { const d = R.pick([1, 2]); const s = R.int(1, 8); return { terms: A(s, d, 6), arcs: `+${d}`, desc: tx(`Каждое следующее число на ${d} больше.`, `Әр келесі сан ${d}-ге артық.`) }; }
    if (level === 2) { const d = R.pick([1, 2, 3]); const s = R.int(12, 20); return { terms: A(s, -d, 6), arcs: `−${d}`, desc: tx(`Каждое следующее число на ${d} меньше.`, `Әр келесі сан ${d}-ге кем.`) }; }
    const d = R.pick([2, 3, 5]); const s = R.int(0, 4); return { terms: A(s, d, 6), arcs: `+${d}`, desc: tx(`Каждое следующее число на ${d} больше.`, `Әр келесі сан ${d}-ге артық.`), mid: R.chance(0.5) };
  }
  if (grade === 2) {
    if (level === 1) { const d = R.int(2, 10); const s = R.int(1, 30); const up = R.chance(0.7); const t = up ? A(s, d, 6) : A(s + 5 * d, -d, 6); return { terms: t, arcs: (up ? "+" : "−") + d, desc: up ? tx(`Каждый раз прибавляем ${d}.`, `Әр жолы ${d} қосамыз.`) : tx(`Каждый раз вычитаем ${d}.`, `Әр жолы ${d} азайтамыз.`) }; }
    if (level === 2) { const a = R.int(3, 9), b = R.int(1, a - 1), s = R.int(1, 20); const t = [s]; for (let i = 1; i < 7; i++) t.push(t[i - 1] + (i % 2 ? a : -b)); return { terms: t, arcs: i => (i % 2 ? `−${b}` : `+${a}`), desc: tx(`Чередуем: +${a}, потом −${b}, снова +${a}, −${b}…`, `Кезектесеміз: +${a}, сосын −${b}, тағы +${a}, −${b}…`) }; }
    if (R.chance(0.5)) { const s = R.int(1, 10); const t = [s]; for (let i = 1; i < 6; i++) t.push(t[i - 1] + i); return { terms: t, arcs: i => `+${i + 1}`, desc: tx("Прибавляем 1, потом 2, потом 3… — каждый раз на 1 больше.", "Алдымен 1, сосын 2, сосын 3 қосамыз… — әр жолы 1-ге көп.") }; }
    const s = R.pick([1, 2, 3]); return { terms: range(6).map(i => s * 2 ** i), arcs: "×2", desc: tx("Каждое следующее число в 2 раза больше.", "Әр келесі сан 2 есе үлкен.") };
  }
  const pool = grade === 3
    ? (level === 1 ? ["mul2", "grow", "alt"] : level === 2 ? ["mul3", "inter", "grow2"] : ["fib", "inter", "muladd", "grow2"])
    : (level === 1 ? ["mul2", "grow2", "inter"] : level === 2 ? ["fib", "sq", "muladd", "div2"] : ["muladd", "fib", "sq", "altmul", "tri"]);
  const k = R.pick(pool);
  if (k === "mul2") { const s = R.int(1, 6); return { terms: range(6).map(i => s * 2 ** i), arcs: "×2", desc: tx("Каждое следующее число в 2 раза больше.", "Әр келесі сан 2 есе үлкен.") }; }
  if (k === "mul3") { const s = R.int(1, 3); return { terms: range(5).map(i => s * 3 ** i), arcs: "×3", desc: tx("Каждое следующее число в 3 раза больше.", "Әр келесі сан 3 есе үлкен.") }; }
  if (k === "div2") { const s = R.pick([3, 5, 7]); const t = range(6).map(i => s * 2 ** (5 - i)); return { terms: t, arcs: ":2", desc: tx("Каждое следующее число в 2 раза меньше.", "Әр келесі сан 2 есе кіші.") }; }
  if (k === "grow") { const s = R.int(1, 20); const t = [s]; for (let i = 1; i < 6; i++) t.push(t[i - 1] + i); return { terms: t, arcs: i => `+${i + 1}`, desc: tx("Прибавляем 1, 2, 3, 4… — каждый раз на 1 больше.", "1, 2, 3, 4… қосамыз — әр жолы 1-ге көп.") }; }
  if (k === "grow2") { const s = R.int(1, 15), d0 = R.int(1, 3); const t = [s]; for (let i = 1; i < 6; i++) t.push(t[i - 1] + d0 + 2 * (i - 1)); return { terms: t, arcs: i => `+${d0 + 2 * i}`, desc: tx(`Прибавляем ${d0}, ${d0 + 2}, ${d0 + 4}… — разница каждый раз растёт на 2.`, `${d0}, ${d0 + 2}, ${d0 + 4}… қосамыз — айырма әр жолы 2-ге өседі.`) }; }
  if (k === "alt") { const a = R.int(4, 9), b = R.int(1, a - 1), s = R.int(5, 30); const t = [s]; for (let i = 1; i < 7; i++) t.push(t[i - 1] + (i % 2 ? a : -b)); return { terms: t, arcs: i => (i % 2 ? `−${b}` : `+${a}`), desc: tx(`Чередуем: +${a}, −${b}, +${a}, −${b}…`, `Кезектесеміз: +${a}, −${b}, +${a}, −${b}…`) }; }
  if (k === "inter") { const a = R.int(1, 9), da = R.int(2, 5), b = R.int(20, 40), db = -R.int(1, 3); const t = range(8).map(i => (i % 2 ? b + db * ((i - 1) / 2) : a + da * (i / 2))); return { terms: t, arcs: null, inter: true, desc: tx(`Здесь два ряда вперемешку: на нечётных местах +${da} (${t[0]}, ${t[2]}, ${t[4]}…), на чётных ${db} (${t[1]}, ${t[3]}, ${t[5]}…).`, `Мұнда екі қатар араласқан: тақ орындарда +${da} (${t[0]}, ${t[2]}, ${t[4]}…), жұп орындарда ${db} (${t[1]}, ${t[3]}, ${t[5]}…).`) }; }
  if (k === "fib") { const a = R.int(1, 3), b = R.int(a, 4); const t = [a, b]; while (t.length < 8) t.push(t[t.length - 1] + t[t.length - 2]); return { terms: t, arcs: null, desc: tx("Каждое число — сумма двух предыдущих.", "Әр сан — алдыңғы екі санның қосындысы."), sum2: true }; }
  if (k === "sq") { const s = R.int(1, 3); const t = range(6).map(i => (s + i) ** 2); return { terms: t, arcs: null, desc: tx(`Это числа «сам на себя»: ${s}×${s}, ${s + 1}×${s + 1}, ${s + 2}×${s + 2}…`, `Бұл «өзін өзіне» көбейткен сандар: ${s}×${s}, ${s + 1}×${s + 1}, ${s + 2}×${s + 2}…`) }; }
  if (k === "muladd") { const s = R.int(1, 4); const t = [s]; for (let i = 1; i < 6; i++) t.push(t[i - 1] * 2 + 1); return { terms: t, arcs: "×2+1", desc: tx("Умножаем на 2 и прибавляем 1.", "2-ге көбейтіп, 1 қосамыз.") }; }
  if (k === "altmul") { const s = R.int(1, 4), a = R.int(2, 5); const t = [s]; for (let i = 1; i < 7; i++) t.push(i % 2 ? t[i - 1] * 2 : t[i - 1] + a); return { terms: t, arcs: i => (i % 2 ? `+${a}` : "×2"), desc: tx(`Чередуем: ×2, потом +${a}, снова ×2, +${a}…`, `Кезектесеміз: ×2, сосын +${a}, тағы ×2, +${a}…`) }; }
  const t = range(7).map(i => (i + 1) * (i + 2) / 2); return { terms: t, arcs: i => `+${i + 2}`, desc: tx("Прибавляем 2, 3, 4, 5… — разница растёт на 1.", "2, 3, 4, 5… қосамыз — айырма 1-ге өседі.") };
}
registerTask({
  id: "numseq", dir: "patterns", kind: "input", title: tx("Числовой ряд", "Сандар қатары"),
  gen(R, grade, level) {
    const f = numFamily(R, grade, level);
    const n = f.terms.length;
    const mid = f.mid || (grade >= 3 && R.chance(level === 1 ? 0.25 : 0.45)) || (grade === 2 && level === 3 && R.chance(0.3));
    const blank = mid ? R.int(Math.max(2, n - 4), n - 2) : n - 1;
    const arcs = range(n - 1).map(i => f.arcs == null ? null : typeof f.arcs === "function" ? f.arcs(i) : f.arcs);
    return { ...f, blank, ans: f.terms[blank], arcsArr: arcs,
      q: blank === n - 1 ? tx("Какое число следующее? Найди правило и впиши ответ.", "Келесі сан қандай? Ережені тауып, жауапты жаз.") : tx("Какое число пропущено? Найди правило и впиши ответ.", "Қай сан түсіп қалды? Ережені тауып, жауапты жаз."),
      hints: [f.inter ? tx("Посмотри на числа через одно.", "Сандарға біреуін аттап қара.") : f.sum2 ? tx("Сравни каждое число с двумя предыдущими.", "Әр санды алдыңғы екеуімен салыстыр.") : tx("Посмотри, на сколько изменяется число от шага к шагу.", "Сан әр қадамда қаншаға өзгеретінін қара."), f.desc] };
  },
  render(t, box) {
    const n = t.terms.length;
    const f = numField({ max: 4 });
    const row = el(`<div class="numrow" style="--n:${n}"></div>`);
    t.terms.forEach((v, i) => {
      const c = el(`<div class="nc ${i === t.blank ? "blank" : ""}" data-i="${i}">${i === t.blank ? "" : v}</div>`);
      if (i === t.blank) c.append(f);
      row.append(c);
      if (i < n - 1) row.append(el(`<div class="arc" data-i="${i}"><span>${t.arcsArr[i] ?? ""}</span></div>`));
    });
    box.append(row, keypad(() => $(".checkb", box.closest(".task"))?.click()));
    focusNum(f);
    const showArcs = () => row.classList.add("arcs");
    return {
      onHint: k => { if (k >= 2 && t.arcsArr[0]) showArcs(); },
      check() {
        if (!f.value) return EMPTY(tx("Впиши число в клетку со знаком «?».", "«?» белгісі бар ұяшыққа сан жаз."));
        const v = +f.value;
        if (v === t.ans) { f.classList.add("good"); return { ok: true, msg: t.desc }; }
        f.classList.add("bad"); setTimeout(() => f.classList.remove("bad"), 900);
        const b = t.blank, p = t.terms;
        if (b >= 2 && v === p[b - 1] + (p[b - 1] - p[b - 2]) && v !== t.ans) return { ok: false, msg: tx(`Ты прибавил столько же, сколько в прошлый раз (${p[b - 1] - p[b - 2]}). Но здесь правило другое — посмотри, как меняются все шаги, а не только последний.`, `Сен соңғы рет қанша қосылса, сонша қостың (${p[b - 1] - p[b - 2]}). Бірақ мұнда ереже басқа — тек соңғы емес, барлық қадамға қара.`) };
        return { ok: false, msg: tx("Проверь своё число: подходит ли оно и к соседу слева, и к соседу справа?", "Санды тексер: ол сол жақ көршісіне де, оң жақ көршісіне де сай ма?") };
      },
      solve() {
        return [
          { t: t.arcsArr[0] ? tx("Подпишем, как меняется число на каждом шаге.", "Әр қадамда сан қалай өзгеретінін жазайық.") : tx("Ищем связь между числами.", "Сандар арасындағы байланысты іздейміз."), act: showArcs },
          { t: t.desc },
          { t: tx(`Значит, на месте «?» — число ${t.ans}.`, `Демек, «?» орнында — ${t.ans} саны.`), act: () => { f.set(t.ans); f.classList.add("good"); } },
        ];
      },
    };
  },
});

/* ---------------------------------------------------------------------
   АНАЛОГИИ:  A → B  так же, как  C → ?
   --------------------------------------------------------------------- */
const XF = {
  color: { name: tx("цвет", "түсі"), make: (R, a, c) => { const to = R.pick(COLOR_KEYS.slice(0, 5).filter(x => x !== a.c && x !== c.c)); return { to }; }, apply: (o, p) => ({ ...o, c: p.to }), say: p => tx(`цвет меняется на ${COLORS[p.to].m}`, `түсі ${COLORS[p.to].kz} болады`) },
  size: { name: tx("размер", "өлшемі"), make: () => ({}), apply: o => ({ ...o, z: o.z === "small" ? "big" : "small" }), say: () => tx("размер меняется: большая ↔ маленькая", "өлшемі өзгереді: үлкен ↔ кіші") },
  shape: { name: tx("форма", "пішіні"), make: (R, a, c) => ({ to: R.pick(["circle", "square", "triangle", "star", "heart", "diamond"].filter(x => x !== a.s && x !== c.s)) }), apply: (o, p) => ({ ...o, s: p.to }), say: p => tx(`форма меняется на «${SHAPES[p.to].ru}»`, `пішіні «${SHAPES[p.to].kz}» болады`) },
  dots: { name: tx("точки", "нүктелер"), make: () => ({}), apply: o => ({ ...o, n: (o.n || 1) + 1 }), say: () => tx("добавляется одна точка", "бір нүкте қосылады") },
  fill: { name: tx("заливка", "бояуы"), make: () => ({}), apply: o => ({ ...o, f: o.f === "stripe" ? "solid" : "stripe" }), say: () => tx("заливка меняется: сплошная ↔ в полоску", "бояуы өзгереді: тұтас ↔ жолақты") },
  rot: { name: tx("поворот", "бұрылу"), make: R => ({ d: R.pick([90, 180, 270]) }), apply: (o, p) => ({ ...o, r: ((o.r || 0) + p.d) % 360 }), say: p => p.d === 180 ? tx("фигура поворачивается на пол-оборота (180°)", "фигура жарты айналымға (180°) бұрылады") : p.d === 90 ? tx("фигура поворачивается на 90° по часовой стрелке", "фигура сағат тілімен 90°-қа бұрылады") : tx("фигура поворачивается на 90° против часовой стрелки", "фигура сағат тіліне қарсы 90°-қа бұрылады") },
  flip: { name: tx("отражение", "шағылысу"), make: () => ({}), apply: o => ({ ...o, flip: !o.flip }), say: () => tx("фигура отражается зеркально (слева направо)", "фигура айнадағыдай шағылысады (солдан оңға)") },
};
registerTask({
  id: "analogy", dir: "analogy", kind: "tap", title: tx("Аналогии", "Ұқсастық"),
  gen(R, grade, level) {
    const pools = { 1: ["color", "size", "shape"], 2: ["color", "size", "shape", "dots", "fill"], 3: ["color", "size", "shape", "dots", "fill", "rot"], 4: ["color", "size", "dots", "fill", "rot", "flip"] };
    const k = grade === 1 ? 1 : grade === 2 ? (level === 3 ? 2 : 1) : grade === 3 ? (level === 1 ? 1 : 2) : (level === 3 ? 3 : 2);
    for (let tries = 0; tries < 300; tries++) {
      const xs = R.sample(pools[grade], k);
      if (xs.includes("shape") && (xs.includes("rot") || xs.includes("flip"))) continue;
      if (xs.includes("rot") && xs.includes("flip")) continue;
      const orient = xs.includes("rot") || xs.includes("flip");
      const shp = () => xs.includes("flip") ? "flag" : orient ? R.pick(["arrow", "flag"]) : R.pick(["circle", "square", "triangle", "star", "heart", "diamond"]);
      const mk = () => ({ s: shp(), c: R.pick(COLOR_KEYS.slice(0, 5)), z: xs.includes("size") ? R.pick(["big", "small"]) : "big", f: xs.includes("fill") ? R.pick(["solid", "stripe"]) : "solid", n: xs.includes("dots") ? R.int(1, 2) : 0, r: orient ? R.pick([0, 90]) : 0 });
      const a = mk(); let c = mk();
      for (let g = 0; g < 20 && (c.s === a.s && c.c === a.c); g++) c = mk();
      const ps = xs.map(x => XF[x].make(R, a, c));
      const ap = (o, skip = -1) => xs.reduce((m, x, i) => (i === skip ? m : XF[x].apply(m, ps[i])), o);
      const b = ap(a), d = ap(c);
      if (sameShape(a, b) || sameShape(c, d)) continue;
      const opts = [d];
      xs.forEach((x, i) => { const o = ap(c, i); if (!opts.some(y => sameShape(y, o))) opts.push(o); }); // забыли одно изменение
      const extra = [{ ...d, c: R.pick(COLOR_KEYS.slice(0, 5).filter(q => q !== d.c)) }, { ...d, z: d.z === "big" ? "small" : "big" }, { ...d, r: ((d.r || 0) + 180) % 360 }, { ...c }, { ...b }];
      for (const o of R.shuffle(extra)) { if (opts.length >= (grade === 1 ? 3 : 4)) break; if (!opts.some(y => sameShape(y, o)) && !(o.r && !orient && o.r !== d.r)) opts.push(o); }
      if (opts.length < (grade === 1 ? 3 : 4)) continue;
      const sh = R.shuffle(opts.slice(0, grade === 1 ? 3 : 4));
      const says = xs.map((x, i) => XF[x].say(ps[i]));
      return { a, b, c, d, xs, ps, opts: sh, ans: sh.findIndex(o => sameShape(o, d)), says,
        q: tx("Первая фигура превратилась во вторую. Сделай то же самое с третьей — какая получится?", "Бірінші фигура екіншіге айналды. Үшіншісіне де солай істе — қандай фигура шығады?"),
        hints: [tx("Сравни первую и вторую фигуры: что изменилось? Цвет? Размер? Форма? Поворот?", "Бірінші мен екінші фигураны салыстыр: не өзгерді? Түсі? Өлшемі? Пішіні? Бұрылуы?"),
          tx(`Изменений здесь: ${k}.`, `Мұнда ${k} өзгеріс бар.`)] };
    }
    throw new Error("analogy");
  },
  render(t, box) {
    const pair = el(`<div class="analog"><div class="ap">${shapeSVG(t.a, 96)}</div><div class="aa">→</div><div class="ap">${shapeSVG(t.b, 96)}</div>
      <div class="asep">${L("так же,<br>как", "дәл солай")}</div><div class="ap">${shapeSVG(t.c, 96)}</div><div class="aa">→</div><div class="ap q">?</div></div>`);
    const notes = el(`<div class="anotes"></div>`);
    box.append(pair, notes);
    const ch = choiceUI(box, t.opts.map(o => shapeSVG(o, 80)), { cls: "shapes", onPick: i => { $(".ap.q", pair).innerHTML = shapeSVG(t.opts[i], 96); } });
    return {
      check() {
        const i = ch.get(); if (i == null) return EMPTY(tx("Выбери фигуру внизу.", "Төменнен фигураны таңда."));
        if (i === t.ans) { ch.mark(i, "good"); return { ok: true, msg: tx(`Правило: ${t.says.map(s => s.ru).join(" и ")}.`, `Ереже: ${t.says.map(s => s.kz).join(" және ")}.`) }; }
        ch.mark(i, "bad"); setTimeout(() => ch.clear(), 900);
        const o = t.opts[i], d = t.d;
        const diff = o.c !== d.c ? tx("цвет", "түсіне") : o.z !== d.z ? tx("размер", "өлшеміне") : o.s !== d.s ? tx("форму", "пішініне") : (o.r || 0) !== (d.r || 0) ? tx("поворот", "бұрылуына") : (o.n || 0) !== (d.n || 0) ? tx("точки", "нүктелеріне") : o.f !== d.f ? tx("заливку", "бояуына") : tx("отражение", "шағылысуына");
        const miss = t.xs.length > 1 ? tx(" Изменений несколько — проверь каждое!", " Өзгеріс бірнешеу — әрқайсысын тексер!") : tx("", "");
        return { ok: false, msg: tx(`Посмотри на ${diff.ru}: как он менялся в первой паре?${miss.ru}`, `${diff.kz} қара: бірінші жұпта ол қалай өзгерді?${miss.kz}`) };
      },
      solve() {
        const st = [{ t: tx("Сравниваем первую и вторую фигуры.", "Бірінші мен екінші фигураны салыстырамыз.") }];
        t.says.forEach(s => st.push({ t: tx(`Изменилось: ${s.ru}.`, `Өзгерді: ${s.kz}.`), act: () => notes.append(el(`<span class="hnote">${T(s)}</span>`)) }));
        st.push({ t: tx("Делаем то же самое с третьей фигурой — вот ответ.", "Үшінші фигураға да солай істейміз — міне жауап."), act: () => { ch.set(t.ans); ch.mark(t.ans, "good"); $(".ap.q", pair).innerHTML = shapeSVG(t.d, 96); } });
        return st;
      },
    };
  },
});
