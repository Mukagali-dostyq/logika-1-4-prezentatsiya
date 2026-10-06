"use strict";
/* Небольшие общие «детальки» для виджетов заданий. */

const skey = o => [o.s, o.c, o.z || "", o.f || "", o.r || 0, o.flip ? 1 : 0, o.n || 0].join("|");
const sameShape = (a, b) => skey(a) === skey(b);

/* выбор одного варианта: варианты — html-строки; возвращает управление */
function choiceUI(host, opts, { cls = "", onPick } = {}) {
  const wrap = el(`<div class="choices ${cls}">${opts.map((h, i) => `<button class="choice" type="button" data-i="${i}"><span class="ltr">${"АБВГДЕЖ"[i]}</span>${h}</button>`).join("")}</div>`);
  // латинские буквы в казахском интерфейсе не нужны — у вариантов кириллические А Б В Г
  let cur = null;
  wrap.addEventListener("click", e => {
    const b = e.target.closest(".choice"); if (!b || wrap.closest(".locked")) return;
    cur = +b.dataset.i; $$(".choice", wrap).forEach(x => x.classList.toggle("sel", x === b));
    onPick && onPick(cur);
  });
  host.append(wrap);
  return {
    el: wrap,
    get: () => cur,
    set(i) { cur = i; $$(".choice", wrap).forEach((x, j) => x.classList.toggle("sel", j === i)); },
    mark(i, c) { $$(".choice", wrap)[i]?.classList.add(c); },
    clear() { $$(".choice", wrap).forEach(x => x.classList.remove("good", "bad")); },
  };
}

/* подсветить элементы на время/навсегда */
function flash(nodes, cls = "hl", ms = 0) { nodes = [].concat(nodes).filter(Boolean); nodes.forEach(n => n.classList.add(cls)); if (ms) setTimeout(() => nodes.forEach(n => n.classList.remove(cls)), ms); }
const unflash = (root, cls = "hl") => $$("." + cls, root).forEach(n => n.classList.remove(cls));

/* склонение «1 фигура / 2 фигуры / 5 фигур» */
function plural(n, one, few, many) { const a = n % 10, b = n % 100; return a === 1 && b !== 11 ? one : a >= 2 && a <= 4 && (b < 12 || b > 14) ? few : many; }

/* «пустой» ответ */
const EMPTY = msg => ({ empty: true, msg });

/* добавить картинку к двуязычному тексту: withH(tx("…","…"), "<svg…>") */
const withH = (o, h) => ({ ru: o.ru + h, kz: o.kz + h });
