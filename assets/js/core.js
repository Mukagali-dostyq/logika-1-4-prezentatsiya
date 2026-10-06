"use strict";
/* =====================================================================
   ЯДРО ПОРТАЛА «ЛОГИКА 1–4»
   язык RU/ҚАЗ · случайность по зерну (одно зерно = одна и та же задача)
   · хранилище результатов · перетаскивание пальцем и «нажми → нажми»
   · экранная цифровая клавиатура · чтение условия вслух.
   Комментарии по-русски, чтобы учитель мог поправить сам.
   ===================================================================== */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const L = (ru, kz) => `<span class="ru">${ru}</span><span class="kz">${kz ?? ru}</span>`;
const T = o => (o == null ? "" : typeof o === "string" ? o : L(o.ru, o.kz));
const tx = (ru, kz) => ({ ru, kz: kz ?? ru });
function el(html) { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; }
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------------- язык ---------------- */
const LANG = { cur: "ru" };
function setLang(l) {
  LANG.cur = l === "kz" ? "kz" : "ru";
  document.body.classList.toggle("lang-kz", LANG.cur === "kz");
  document.documentElement.lang = LANG.cur === "kz" ? "kk" : "ru";
  $$(".lang-switch button").forEach(b => b.classList.toggle("on", b.dataset.l === LANG.cur));
  store.set("lang", LANG.cur);
}
function initLang() {
  setLang(store.get("lang", "ru"));
  document.addEventListener("click", e => { const b = e.target.closest(".lang-switch button"); if (b) setLang(b.dataset.l); });
}

/* ---------------- хранилище (только в этом браузере) ---------------- */
const store = {
  k: k => "logika14." + k,
  get(k, d) { try { const v = localStorage.getItem(this.k(k)); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(this.k(k), JSON.stringify(v)); } catch { } },
};

/* ---------------- случайность по зерну ----------------
   Одно и то же зерно всегда даёт одну и ту же задачу — так работает «Банк задач»
   и «Повторить ошибку». «Новый вариант» = новое случайное зерно.               */
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hashStr(s) { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
class Rnd {
  constructor(seed) { this.seed = seed; this.r = mulberry32(typeof seed === "number" ? seed : hashStr(seed)); }
  f() { return this.r(); }
  int(a, b) { return a + Math.floor(this.r() * (b - a + 1)); }
  pick(a) { return a[Math.floor(this.r() * a.length)]; }
  chance(p) { return this.r() < p; }
  shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(this.r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  sample(a, k) { return this.shuffle(a).slice(0, k); }
}
const newSeed = () => Math.floor(Math.random() * 2 ** 31);
const range = n => [...Array(n).keys()];
function perms(arr) { if (arr.length <= 1) return [arr.slice()]; const out = []; arr.forEach((x, i) => perms([...arr.slice(0, i), ...arr.slice(i + 1)]).forEach(p => out.push([x, ...p]))); return out; }

/* ---------------- имена и падежи (для казахского) ---------------- */
const NAMES = [
  { ...tx("Алия", "Әлия"), g: "f" }, { ...tx("Тимур"), g: "m" }, { ...tx("Дана"), g: "f" }, { ...tx("Арман"), g: "m" },
  { ...tx("Айгерим", "Айгерім"), g: "f" }, { ...tx("Нурлан", "Нұрлан"), g: "m" }, { ...tx("Мадина"), g: "f" }, { ...tx("Ерлан"), g: "m" },
  { ...tx("Жанна"), g: "f" }, { ...tx("Санжар"), g: "m" }, { ...tx("Аружан"), g: "f" }, { ...tx("Асхат"), g: "m" },
];
/* русский родительный падеж: у Тимура, у Алии, у Даны; Айгерим и Аружан не склоняются */
function ruGen(n) {
  const w = n.ru, c = w.slice(-1);
  if (c === "я") return w.slice(0, -1) + "и";
  if (c === "а") return w.slice(0, -1) + ("гкхжшщч".includes(w.slice(-2, -1)) ? "и" : "ы");
  return n.g === "m" ? w + "а" : w;
}
/* казахское «и»: Дана мен Арман, Санжар мен… */
function kzAnd(a, b) { const c = a.toLowerCase().slice(-1); return `${a} ${KZ.vowel(c) || "мнңлрйу".includes(c) ? "мен" : "жз".includes(c) ? "бен" : "пен"} ${b}`; }
const KZ = {
  front: w => { const v = [...w.toLowerCase()].reverse().find(c => "аоұыуяәеөүіиэю".includes(c)) || "а"; return "әеөүіиэю".includes(v); },
  last: w => w.toLowerCase().slice(-1),
  voiceless: c => "кқпстфхцчшщ".includes(c),
  vowel: c => "аоұыуяәеөүіиэюё".includes(c),
  // ілік септік (кімнің?) — Әлияның, Тимурдың, Айгерімнің
  gen(w) { const c = this.last(w), f = this.front(w); if (this.vowel(c) || "мнң".includes(c)) return w + (f ? "нің" : "ның"); if (this.voiceless(c) || "бвгд".includes(c)) return w + (f ? "тің" : "тың"); return w + (f ? "дің" : "дың"); },
  // жатыс септік (кімде?) — Әлияда, Айгерімде
  loc(w) { const c = this.last(w), f = this.front(w); return w + (this.voiceless(c) ? (f ? "те" : "та") : (f ? "де" : "да")); },
  // шығыс септік (кімнен?) — Әлиядан, Ерланнан, Айгерімнен
  abl(w) { const c = this.last(w), f = this.front(w); if ("мнң".includes(c)) return w + (f ? "нен" : "нан"); if (this.voiceless(c)) return w + (f ? "тен" : "тан"); return w + (f ? "ден" : "дан"); },
  // барыс септік (кімге?) — Әлияға, Айгерімге
  dat(w) { const c = this.last(w), f = this.front(w); if (this.voiceless(c)) return w + (f ? "ке" : "қа"); return w + (f ? "ге" : "ға"); },
};

/* ---------------- чтение условия вслух ---------------- */
function speakEl(node) {
  if (!("speechSynthesis" in window)) return toast(tx("Этот браузер не умеет читать вслух", "Бұл браузер дауыстап оқи алмайды"));
  const clone = node.cloneNode(true);
  $$(LANG.cur === "kz" ? ".ru" : ".kz", clone).forEach(n => n.remove());
  $$("[data-nosay]", clone).forEach(n => n.remove());
  const text = clone.textContent.replace(/\s+/g, " ").trim();
  const want = LANG.cur === "kz" ? "kk" : "ru";
  const v = speechSynthesis.getVoices().find(v => v.lang.toLowerCase().startsWith(want));
  if (!v) return toast(LANG.cur === "kz" ? tx("На этом устройстве нет казахского голоса — прочитайте условие сами", "Бұл құрылғыда қазақша дауыс жоқ — шартты өзіңіз оқыңыз") : tx("На этом устройстве нет русского голоса", "Бұл құрылғыда орысша дауыс жоқ"));
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text); u.voice = v; u.lang = v.lang; u.rate = 0.92;
  speechSynthesis.speak(u);
}
if ("speechSynthesis" in window) speechSynthesis.getVoices();

/* ---------------- всплывающее сообщение ---------------- */
function toast(msg, ms = 2600) {
  let t = $("#toast"); if (!t) { t = el(`<div id="toast"></div>`); document.body.append(t); }
  t.innerHTML = T(msg); t.classList.add("show"); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("show"), ms);
}

/* ---------------- перетаскивание ----------------
   Работает и мышью, и пальцем. Плюс запасной способ для доски:
   нажми на предмет → он подсветится → нажми на место.
   chip: [data-chip], место: [data-zone]. onDrop(chip, zone|null).   */
function dnd(root, { onDrop, canDrag = () => true }) {
  let st = null, sel = null;
  const clearSel = () => { if (sel) sel.classList.remove("sel"); sel = null; };
  root.addEventListener("pointerdown", e => {
    const chip = e.target.closest("[data-chip]");
    if (!chip || !root.contains(chip) || !canDrag(chip) || e.button > 0) return;
    e.preventDefault();
    st = { chip, x: e.clientX, y: e.clientY, moved: false, id: e.pointerId };
    chip.setPointerCapture?.(e.pointerId);
  });
  root.addEventListener("pointermove", e => {
    if (!st || e.pointerId !== st.id) return;
    const dx = e.clientX - st.x, dy = e.clientY - st.y;
    if (!st.moved && Math.hypot(dx, dy) > 8) {
      st.moved = true; clearSel();
      const r = st.chip.getBoundingClientRect();
      st.ghost = st.chip.cloneNode(true); st.ghost.classList.add("ghost"); st.ghost.removeAttribute("data-chip");
      st.ghost.style.width = r.width + "px"; st.ghost.style.height = r.height + "px";
      st.ox = st.x - r.left; st.oy = st.y - r.top; document.body.append(st.ghost);
      st.chip.classList.add("dragging");
    }
    if (st.moved) {
      st.ghost.style.left = e.clientX - st.ox + "px"; st.ghost.style.top = e.clientY - st.oy + "px";
      const z = zoneAt(e.clientX, e.clientY);
      $$("[data-zone].over", root).forEach(n => n !== z && n.classList.remove("over"));
      if (z) z.classList.add("over");
    }
  });
  const end = e => {
    if (!st || e.pointerId !== st.id) return;
    const s = st; st = null;
    $$("[data-zone].over", root).forEach(n => n.classList.remove("over"));
    if (s.moved) {
      s.ghost.remove(); s.chip.classList.remove("dragging");
      onDrop(s.chip, e.type === "pointercancel" ? null : zoneAt(e.clientX, e.clientY));
    } else {
      if (sel === s.chip) clearSel(); else { clearSel(); sel = s.chip; sel.classList.add("sel"); }
    }
  };
  root.addEventListener("pointerup", end);
  root.addEventListener("pointercancel", end);
  root.addEventListener("click", e => {
    if (!sel) return;
    const z = e.target.closest("[data-zone]");
    if (z && root.contains(z) && !e.target.closest("[data-chip]")) { const c = sel; clearSel(); onDrop(c, z); }
    else if (z && e.target.closest("[data-chip]") && e.target.closest("[data-chip]") !== sel && z.dataset.swap != null) { const c = sel; clearSel(); onDrop(c, z); }
  });
  function zoneAt(x, y) {
    const n = document.elementFromPoint(x, y); const z = n && n.closest("[data-zone]");
    return z && root.contains(z) ? z : null;
  }
  return { clearSel };
}

/* ---------------- цифровое поле + экранная клавиатура ---------------- */
function numField(opts = {}) {
  const f = el(`<button class="numf" type="button" aria-label="ответ"><span class="v"></span></button>`);
  f.value = ""; f.max = opts.max ?? 3;
  f.set = v => { f.value = String(v); $(".v", f).textContent = f.value || (opts.ph ?? "?"); f.classList.toggle("empty", !f.value); };
  f.set("");
  f.addEventListener("click", () => focusNum(f));
  return f;
}
let NUMF = null;
function focusNum(f) { $$(".numf.focus").forEach(n => n.classList.remove("focus")); NUMF = f; if (f) f.classList.add("focus"); }
function keypad(onEnter) {
  const k = el(`<div class="keypad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, "⌫", 0, "OK"].map(x => `<button type="button" data-k="${x}" class="${x === "OK" ? "ok" : ""}">${x}</button>`).join("")}</div>`);
  k.addEventListener("click", e => { const b = e.target.closest("button"); if (b) press(b.dataset.k); });
  k._press = press;
  function press(x) {
    if (x === "OK") return onEnter && onEnter();
    if (!NUMF || !NUMF.isConnected) { const f = k.closest(".task")?.querySelector(".numf"); if (f) focusNum(f); else return; }
    if (x === "⌫") NUMF.set(NUMF.value.slice(0, -1));
    else if (NUMF.value.length < NUMF.max) NUMF.set((NUMF.value === "0" ? "" : NUMF.value) + x);
    NUMF.dispatchEvent(new Event("input"));
  }
  return k;
}
document.addEventListener("keydown", e => {
  if (!NUMF || !NUMF.isConnected || (e.target instanceof Element && e.target.closest("input,textarea"))) return;
  if (/^[0-9]$/.test(e.key)) { const kp = NUMF.closest(".task")?.querySelector(".keypad"); kp ? kp._press(e.key) : null; e.preventDefault(); }
  else if (e.key === "Backspace") { const kp = NUMF.closest(".task")?.querySelector(".keypad"); kp && kp._press("⌫"); e.preventDefault(); }
});

/* ---------------- реестр заданий ----------------
   Каждый тип задания регистрирует:
   gen(rnd, grade, level) → данные задачи (условие q, подсказки hints, ответ);
   render(task, box, ctx) → { check(): {ok, msg, empty}, solve(): [{t, act}] }   */
const TASKS = {};
function registerTask(def) { TASKS[def.id] = def; }
function makeTask(type, seed, grade, level) {
  const def = TASKS[type]; const rnd = new Rnd(`${type}|${grade}|${level}|${seed}`);
  const task = def.gen(rnd, grade, level);
  task.type = type; task.seed = seed; task.grade = grade; task.level = level;
  return task;
}

if (typeof module !== "undefined") module.exports = { Rnd, TASKS, registerTask, makeTask, tx, L, T, NAMES, KZ, perms, range };
