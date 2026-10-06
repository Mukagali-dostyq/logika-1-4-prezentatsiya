"use strict";
/* =====================================================================
   ПРИЗНАКИ И КЛАССИФИКАЦИЯ:  «Найди лишнее» (odd) · «Разложи по группам» (sort)
   ===================================================================== */

const ATTR = {
  s: { word: tx("форма", "пішіні"), g: "f", vals: ["circle", "square", "triangle", "star", "heart", "diamond"], name: v => tx(SHAPES[v].ru, SHAPES[v].kz), pl: v => tx(SHAPES[v].pl, SHAPES[v].kzpl) },
  c: { word: tx("цвет", "түсі"), g: "m", vals: ["red", "blue", "green", "yellow"], name: v => tx(COLORS[v].m, COLORS[v].kz), pl: v => tx(COLORS[v].pl, COLORS[v].kz) },
  z: { word: tx("размер", "өлшемі"), g: "m", vals: ["big", "small"], name: v => tx(SIZES[v].m, SIZES[v].kz), pl: v => tx(SIZES[v].pl, SIZES[v].kz) },
  f: { word: tx("заливка", "бояуы"), g: "f", vals: ["solid", "stripe"], name: v => tx(FILLS[v].f, FILLS[v].kz), pl: v => tx(FILLS[v].pl, FILLS[v].kz) },
};
const SAME = g => (g === "f" ? "одинаковая" : "одинаковый");

/* кто «лишний» хотя бы по одному признаку: все остальные совпадают, а он — нет */
function oddCandidates(items, attrs) {
  const out = new Set();
  for (const a of attrs) {
    const cnt = {}; items.forEach(it => (cnt[it[a]] = (cnt[it[a]] || 0) + 1));
    const ks = Object.keys(cnt);
    if (ks.length === 2) { const lone = ks.find(k => cnt[k] === 1); if (lone && items.length > 2) items.forEach((it, i) => it[a] === lone && out.add(i)); }
  }
  return [...out];
}
/* разложить n значений так, чтобы каждое встречалось не меньше двух раз */
function spread(R, vals, n) {
  const arr = []; vals.forEach(v => arr.push(v, v));
  while (arr.length < n) arr.push(R.pick(vals));
  return R.shuffle(arr.slice(0, n));
}

registerTask({
  id: "odd", dir: "classify", kind: "tap", title: tx("Найди лишнее", "Артығын тап"),
  gen(R, grade, level) {
    const emojiMode = grade <= 2 ? R.chance(level === 3 ? 0.35 : 0.5) : R.chance(0.2);
    if (emojiMode) {
      const n = grade === 1 ? 4 : 5;
      const [main, other] = R.sample(Object.keys(CATS), 2);
      const items = R.sample(CATS[main].items, n - 1).map(e => ({ e, cat: main }));
      items.push({ e: R.pick(CATS[other].items), cat: other });
      const sh = R.shuffle(items); const ans = sh.findIndex(x => x.cat === other);
      const oddName = ITEM_NAMES[sh[ans].e];
      return {
        mode: "emoji", items: sh, ans, main, other,
        q: tx("Какой предмет лишний? Нажми на него.", "Қай зат артық? Соны бас."),
        hints: [tx("Подумай, к какой группе относится каждый предмет.", "Әр зат қай топқа жататынын ойла."),
          tx(`Почти все предметы здесь — ${CATS[main].ru}.`, `Мұндағы заттардың көбі — ${CATS[main].kz}.`)],
        why: tx(`Все остальные — ${CATS[main].ru}, а ${oddName.ru} — ${CATS[other].one.ru}.`, `Қалғандарының бәрі — ${CATS[main].kz}, ал ${oddName.kz} — ${CATS[other].one.kz}.`),
      };
    }
    const attrs = grade === 1 ? ["s", "c"] : grade <= 3 ? ["s", "c", "z"] : ["s", "c", "z", "f"];
    const n = grade === 1 ? 4 : grade === 2 ? 5 : 6;
    for (let t = 0; t < 200; t++) {
      const K = R.pick(attrs), others = attrs.filter(a => a !== K);
      const varying = level === 1 ? (grade >= 3 ? R.sample(others, 1) : []) : level === 2 ? R.sample(others, grade >= 3 ? 2 : 1) : others;
      const [v, w] = R.sample(ATTR[K].vals, 2);
      const items = range(n).map(i => ({ [K]: i === 0 ? w : v }));
      for (const a of others) {
        if (!varying.includes(a)) { const val = R.pick(ATTR[a].vals); items.forEach(it => (it[a] = val)); }
        else { const k = (a === "s" || a === "c") && n >= 6 && R.chance(0.4) ? 3 : 2; const vals = R.sample(ATTR[a].vals, k); spread(R, vals, n).forEach((x, i) => (items[i][a] = x)); }
      }
      items.forEach(it => { it.z ||= "big"; it.f ||= "solid"; });
      const sh = R.shuffle(items); const ans = sh.findIndex(it => it[K] === w);
      const cand = oddCandidates(sh, attrs);
      if (cand.length !== 1 || cand[0] !== ans) continue;
      const A = ATTR[K];
      return {
        mode: "shape", items: sh, ans, K, v, w, attrs,
        q: tx("Какая фигура лишняя? Нажми на неё.", "Қай фигура артық? Соны бас."),
        hints: [tx("Сравни фигуры по очереди: по цвету, по форме, по размеру" + (attrs.includes("f") ? ", по заливке." : "."), "Фигураларды кезекпен салыстыр: түсі, пішіні, өлшемі" + (attrs.includes("f") ? ", бояуы бойынша." : " бойынша.")),
          tx(`Смотри на признак «${A.word.ru}».`, `«${A.word.kz}» белгісіне қара.`)],
        why: tx(`У всех остальных фигур ${A.word.ru} ${SAME(A.g)} — ${A.name(v).ru}, а у этой — ${A.name(w).ru}.`, `Қалған фигуралардың ${A.word.kz} бірдей — ${A.name(v).kz}, ал мұнікі — ${A.name(w).kz}.`),
      };
    }
    throw new Error("odd: не удалось составить задачу");
  },
  render(t, box) {
    const big = t.items.length <= 5 ? 104 : 92;
    const row = el(`<div class="oddrow">${t.items.map((it, i) => `<button class="oddit" type="button" data-i="${i}">${t.mode === "emoji" ? emo(it.e, big * 0.72) : shapeSVG(it, big)}<span class="cap"></span></button>`).join("")}</div>`);
    box.append(row);
    let sel = null;
    row.addEventListener("click", e => { const b = e.target.closest(".oddit"); if (!b || box.classList.contains("locked")) return; sel = +b.dataset.i; $$(".oddit", row).forEach(x => x.classList.toggle("sel", x === b)); });
    const btn = i => $$(".oddit", row)[i];
    return {
      check() {
        if (sel == null) return EMPTY(tx("Нажми на фигуру, которая, по-твоему, лишняя.", "Артық деп ойлаған фигураны бас."));
        if (sel === t.ans) { btn(sel).classList.add("good"); return { ok: true, msg: t.why }; }
        btn(sel).classList.add("bad"); setTimeout(() => btn(sel)?.classList.remove("bad"), 900);
        if (t.mode === "emoji") { const nm = ITEM_NAMES[t.items[sel].e]; return { ok: false, msg: tx(`${nm.ru} — это ${CATS[t.main].one.ru}, как и почти всё здесь. Найди предмет из другой группы.`, `${nm.kz} — ${CATS[t.main].one.kz}, мұндағының бәрі сияқты. Басқа топтан затты тап.`) }; }
        const A = ATTR[t.K];
        return { ok: false, msg: tx(`У этой фигуры ${A.word.ru} такой же, как у большинства — ${A.name(t.v).ru}. Значит, у неё есть «пары». Ищи фигуру, которая не похожа на все остальные.`, `Бұл фигураның ${A.word.kz} көпшілігімен бірдей — ${A.name(t.v).kz}. Барлығынан өзгеше фигураны ізде.`) };
      },
      solve() {
        if (t.mode === "emoji") return [
          { t: tx("Назовём, к какой группе относится каждый предмет.", "Әр заттың қай топқа жататынын атайық."), act: () => t.items.forEach((it, i) => ($(".cap", btn(i)).innerHTML = T(CATS[it.cat].one))) },
          { t: t.why, act: () => { btn(t.ans).classList.add("good"); $$(".oddit", row).forEach((b, i) => i !== t.ans && b.classList.add("dim")); } },
        ];
        const A = ATTR[t.K];
        const steps = t.attrs.filter(a => a !== t.K).map(a => ({ t: tx(`Сравним ${ATTR[a].word.ru === "форма" ? "форму" : ATTR[a].word.ru === "заливка" ? "заливку" : ATTR[a].word.ru}: тут нет одной-единственной непохожей фигуры.`, `${ATTR[a].word.kz} бойынша салыстырайық: жалғыз өзгеше фигура жоқ.`), act: () => t.items.forEach((it, i) => ($(".cap", btn(i)).innerHTML = T(ATTR[a].name(it[a])))) }));
        steps.push({ t: tx(`А теперь ${A.word.ru === "форма" ? "форму" : A.word.ru === "заливка" ? "заливку" : A.word.ru}: у всех ${A.name(t.v).ru}, кроме одной!`, `Енді ${A.word.kz}: біреуінен басқасының бәрі — ${A.name(t.v).kz}!`), act: () => t.items.forEach((it, i) => ($(".cap", btn(i)).innerHTML = T(A.name(it[t.K])))) });
        steps.push({ t: t.why, act: () => { btn(t.ans).classList.add("good"); $$(".oddit", row).forEach((b, i) => i !== t.ans && b.classList.add("dim")); } });
        return steps;
      },
    };
  },
});

/* ---------------------------------------------------------------------
   «Разложи по группам»: 2 коробки (1 кл.) → таблица 2×2 (2 кл.) → круги Эйлера (3–4 кл.)
   --------------------------------------------------------------------- */
registerTask({
  id: "sort", dir: "classify", kind: "drag", title: tx("Разложи по группам", "Топтарға бөл"),
  gen(R, grade, level) {
    if (grade === 1 || (grade === 2 && level === 1)) {
      if (R.chance(0.4)) {
        const [a, b] = R.sample(Object.keys(CATS), 2);
        const items = R.shuffle([...R.sample(CATS[a].items, 3), ...R.sample(CATS[b].items, grade === 1 ? 3 : 4)].map(e => ({ e, cat: e && (CATS[a].items.includes(e) ? a : b) })));
        return { mode: "cat", items, zones: [a, b], q: tx("Разложи предметы по двум коробкам.", "Заттарды екі қорапқа бөліп сал."),
          hints: [tx(`В одну коробку — ${CATS[a].ru}, в другую — ${CATS[b].ru}.`, `Бір қорапқа — ${CATS[a].kz}, екіншісіне — ${CATS[b].kz}.`)] };
      }
      const A = R.pick(["s", "c"]), B = A === "s" ? "c" : "s";
      const [v1, v2] = R.sample(ATTR[A].vals, 2);
      const n = grade === 1 ? 6 : 7;
      const items = spread(R, [v1, v2], n).map(v => ({ [A]: v, [B]: R.pick(ATTR[B].vals.slice(0, level === 1 ? 1 : 3)), z: "big" }));
      return { mode: "two", A, vals: [v1, v2], items, q: tx(`Разложи фигуры по признаку «${ATTR[A].word.ru}».`, `Фигураларды «${ATTR[A].word.kz}» белгісі бойынша бөл.`),
        hints: [tx(`В одну коробку — ${ATTR[A].pl(v1).ru}, в другую — ${ATTR[A].pl(v2).ru}. ${A === "c" ? "На форму не смотри!" : "На цвет не смотри!"}`, `Бір қорапқа — ${ATTR[A].pl(v1).kz}, екіншісіне — ${ATTR[A].pl(v2).kz}. ${A === "c" ? "Пішініне қарама!" : "Түсіне қарама!"}`)] };
    }
    if (grade === 2) {
      const [s1, s2] = R.sample(ATTR.s.vals, 2), [c1, c2] = R.sample(ATTR.c.vals, 2);
      const cells = [[c1, s1], [c1, s2], [c2, s1], [c2, s2]];
      const n = level === 3 ? 8 : 7;
      const items = [...R.shuffle(cells), ...range(n - 4).map(() => R.pick(cells))].map(([c, s]) => ({ c, s, z: level === 3 ? R.pick(["big", "small"]) : "big" }));
      return { mode: "table", rows: [c1, c2], cols: [s1, s2], items: R.shuffle(items),
        q: tx("Разложи фигуры по таблице: строка — цвет, столбец — форма.", "Фигураларды кестеге орналастыр: жол — түсі, баған — пішіні."),
        hints: [tx("Для каждой фигуры найди её строку (цвет) и её столбец (форму). Клетка — на пересечении.", "Әр фигураның жолын (түсін) және бағанын (пішінін) тап. Ұяшық — қиылысында."),
          ...(level === 3 ? [tx("Размер здесь не важен — большие и маленькие лежат вместе.", "Мұнда өлшем маңызды емес — үлкені мен кішісі бірге жатады.")] : [])] };
    }
    // 3–4 класс: круги Эйлера
    const useSize = grade === 4 && level >= 2 && R.chance(0.5);
    const A = useSize ? { a: "z", v: "big" } : { a: "c", v: R.pick(ATTR.c.vals) };
    const B = { a: "s", v: R.pick(ATTR.s.vals.slice(0, 5)) };
    const colors = R.sample(ATTR.c.vals, 3); if (A.a === "c" && !colors.includes(A.v)) colors[0] = A.v;
    const shapes = R.sample(ATTR.s.vals.slice(0, 5), 3); if (!shapes.includes(B.v)) shapes[0] = B.v;
    const n = grade === 3 ? 8 : 9;
    const need = level === 1 && grade === 3 ? ["A", "AB", "B"] : ["A", "AB", "B", "O"];
    // сначала выбираем область для каждой фигуры (все нужные области — хотя бы по разу), потом подбираем признаки
    const regs = R.shuffle([...need, ...range(n - need.length).map(() => R.pick(need.length === 4 ? ["A", "AB", "B", "O", "O", "A", "B"] : ["A", "AB", "B"]))]);
    const items = regs.map(r => {
      const inA = r === "A" || r === "AB", inB = r === "B" || r === "AB";
      const it = { c: R.pick(colors), s: R.pick(shapes), z: useSize || (grade === 4 && level === 3) ? R.pick(["big", "small"]) : "big" };
      if (A.a === "c") it.c = inA ? A.v : R.pick(colors.filter(c => c !== A.v)); else it.z = inA ? "big" : "small";
      it.s = inB ? B.v : R.pick(shapes.filter(x => x !== B.v));
      return it;
    });
    return { mode: "venn", A, B, items, q: tx("Разложи фигуры по кругам. Где пересекаются круги — фигуры, которые подходят под оба правила.", "Фигураларды шеңберлерге орналастыр. Шеңберлер қиылысқан жерде — екі ережеге де сәйкес фигуралар."),
      hints: [tx("Для каждой фигуры задай два вопроса: подходит ли под левый круг? подходит ли под правый?", "Әр фигураға екі сұрақ қой: сол жақ шеңберге сай ма? оң жақ шеңберге сай ма?"),
        tx("Если «да» на оба вопроса — в середину. Если «нет» на оба — за круги, вниз.", "Екеуіне де «иә» болса — ортаға. Екеуіне де «жоқ» болса — шеңберден тыс, төменге.")] };
    throw new Error("sort: venn");
  },
  render(t, box) {
    const chipHTML = (it, i) => `<div class="chip pic" data-chip data-i="${i}">${t.mode === "cat" ? emo(it.e, 46) : shapeSVG(it, 56)}</div>`;
    const pool = el(`<div class="pool" data-zone="pool">${t.items.map(chipHTML).join("")}</div>`);
    let zonesWrap, correctZone;
    if (t.mode === "cat" || t.mode === "two") {
      const labels = t.mode === "cat" ? t.zones.map(z => `<span class="zl">${L(CATS[z].ru, CATS[z].kz)}</span>`)
        : t.vals.map(v => t.A === "c" ? `<span class="zl"><i class="sw" style="background:${COLORS[v].hex}"></i>${T(ATTR.c.pl(v))}</span>` : `<span class="zl">${shapeSVG({ s: v, hex: "#fff" }, 34)}${T(ATTR.s.pl(v))}</span>`);
      zonesWrap = el(`<div class="boxes">${labels.map((h, i) => `<div class="dz box" data-zone="z${i}"><div class="dzt">${h}</div></div>`).join("")}</div>`);
      correctZone = it => "z" + (t.mode === "cat" ? t.zones.indexOf(it.cat) : t.vals.indexOf(it[t.A]));
    } else if (t.mode === "table") {
      zonesWrap = el(`<div class="ttable"><div></div>${t.cols.map(s => `<div class="th">${shapeSVG({ s, hex: "#fff" }, 40)}<span>${T(ATTR.s.pl(s))}</span></div>`).join("")}
        ${t.rows.map((c, r) => `<div class="th"><i class="sw" style="background:${COLORS[c].hex}"></i><span>${T(ATTR.c.pl(c))}</span></div>${t.cols.map((s, k) => `<div class="dz cell" data-zone="z${r}${k}"></div>`).join("")}`).join("")}</div>`);
      correctZone = it => `z${t.rows.indexOf(it.c)}${t.cols.indexOf(it.s)}`;
    } else {
      const la = t.A.a === "c" ? ATTR.c.pl(t.A.v) : ATTR.z.pl(t.A.v), lb = ATTR.s.pl(t.B.v);
      zonesWrap = el(`<div class="vennwrap"><div class="venn">
        <svg class="vbg" viewBox="0 0 600 300" preserveAspectRatio="none"><ellipse cx="215" cy="150" rx="195" ry="140" class="va"/><ellipse cx="385" cy="150" rx="195" ry="140" class="vb"/></svg>
        <div class="vlab a">${T(la)}</div><div class="vlab b">${T(lb)}</div>
        <div class="dz vz zA" data-zone="A"></div><div class="dz vz zAB" data-zone="AB"></div><div class="dz vz zB" data-zone="B"></div></div>
        <div class="dz vout" data-zone="O"><div class="dzt">${L("Ни в один круг", "Ешбір шеңберге емес")}</div></div></div>`);
      correctZone = it => vennRegion(it, t.A, t.B);
    }
    box.append(pool, zonesWrap);
    const zoneOf = chip => chip.parentElement?.dataset.zone || chip.parentElement?.closest("[data-zone]")?.dataset.zone;
    dnd(box, { onDrop(chip, z) { if (box.classList.contains("locked")) return; (z || pool).append(chip); chip.classList.remove("bad"); } });
    const chips = () => $$("[data-chip]", box);
    const why = it => {
      const nm = shapeName(it, { size: t.mode === "venn" && (t.A.a === "z" || it.z === "small") });
      if (t.mode === "cat") { const n = ITEM_NAMES[it.e]; return tx(`${cap(n.ru)} — это ${CATS[it.cat].one.ru}, значит, в коробку «${CATS[it.cat].ru}».`, `${cap(n.kz)} — ${CATS[it.cat].one.kz}, демек, «${CATS[it.cat].kz}» қорабына.`); }
      if (t.mode === "two") return tx(`${cap(nm.ru)} — ${ATTR[t.A].word.ru}: ${ATTR[t.A].name(it[t.A]).ru}. Значит, в коробку «${ATTR[t.A].pl(it[t.A]).ru}».`, `${cap(nm.kz)} — ${ATTR[t.A].word.kz}: ${ATTR[t.A].name(it[t.A]).kz}. Демек, «${ATTR[t.A].pl(it[t.A]).kz}» қорабына.`);
      if (t.mode === "table") return tx(`${cap(nm.ru)} — строка «${COLORS[it.c].pl}», столбец «${SHAPES[it.s].pl}».`, `${cap(nm.kz)} — «${COLORS[it.c].kz}» жолы, «${SHAPES[it.s].kzpl}» бағаны.`);
      const r = vennRegion(it, t.A, t.B), inA = r === "A" || r === "AB", inB = r === "B" || r === "AB";
      const aw = t.A.a === "c" ? [COLORS[t.A.v][SHAPES[it.s].g], COLORS[t.A.v].kz] : [SIZES.big[SHAPES[it.s].g], "үлкен"];
      return tx(`${cap(nm.ru)}: ${inA ? "" : "не "}${aw[0]} и ${inB ? "" : "не "}${SHAPES[t.B.v].ru}${r === "AB" ? " — значит, в середину." : r === "O" ? " — значит, вне кругов." : r === "A" ? " — значит, только в левый круг." : " — значит, только в правый круг."}`,
        `${cap(nm.kz)}: ${aw[1]}${inA ? "" : " емес"}, ${SHAPES[t.B.v].kz}${inB ? "" : " емес"}${r === "AB" ? " — ортаға." : r === "O" ? " — шеңберден тыс." : r === "A" ? " — тек сол жақ шеңберге." : " — тек оң жақ шеңберге."}`);
    };
    return {
      check() {
        if ($$("[data-chip]", pool).length) return EMPTY(tx("Разложи все фигуры — в верхнем ряду ещё что-то осталось.", "Барлық фигураны орналастыр — жоғарғы қатарда әлі бар."));
        const bad = chips().filter(c => zoneOf(c) !== correctZone(t.items[+c.dataset.i]));
        if (!bad.length) return { ok: true };
        bad.forEach(c => c.classList.add("bad"));
        const it = t.items[+bad[0].dataset.i];
        return { ok: false, msg: tx(`Не на месте: ${bad.length} ${plural(bad.length, "фигура", "фигуры", "фигур")} (с красной рамкой). Например: ${why(it).ru}`, `Орнында емес: ${bad.length} фигура (қызыл жиекпен). Мысалы: ${why(it).kz}`) };
      },
      solve() {
        const ch = chips();
        const steps = [{ t: t.hints[0] }];
        const show = Math.min(ch.length, 3);
        ch.forEach((c, k) => { if (k < show) steps.push({ t: why(t.items[+c.dataset.i]), act: () => { $(`[data-zone="${correctZone(t.items[+c.dataset.i])}"]`, box).append(c); c.classList.remove("bad"); c.classList.add("ok"); } }); });
        steps.push({ t: tx("Остальные раскладываем так же.", "Қалғандарын да солай орналастырамыз."), act: async () => { for (const c of ch.slice(show)) { $(`[data-zone="${correctZone(t.items[+c.dataset.i])}"]`, box).append(c); c.classList.remove("bad"); c.classList.add("ok"); await sleep(180); } } });
        return steps;
      },
    };
  },
});
function vennRegion(it, A, B) { const a = it[A.a] === A.v, b = it[B.a] === B.v; return a && b ? "AB" : a ? "A" : b ? "B" : "O"; }
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
