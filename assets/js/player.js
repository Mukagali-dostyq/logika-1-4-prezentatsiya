"use strict";
/* =====================================================================
   ПРОИГРЫВАТЕЛЬ ЗАДАНИЯ — карточка «условие → действие → проверка».
   После ошибки: конкретное объяснение → подсказка → новая попытка → разбор по шагам.
   Режимы: train (тренировка), learn (учимся), test (проверочная — без подсказок),
           board (интерактивная доска — крупно), demo (показ у доски).
   ===================================================================== */

const LEVEL_DOTS = l => `<span class="lvl" title="сложность">${[1, 2, 3].map(i => `<i class="${i <= l ? "on" : ""}"></i>`).join("")}</span>`;
const PRAISE = [tx("Верно! Молодец!", "Дұрыс! Жарайсың!"), tx("Точно! Так держать!", "Дәл таптың!"), tx("Верно — ты рассуждал как настоящий логик!", "Дұрыс — нағыз логик сияқты ойладың!"), tx("Отлично!", "Керемет!"), tx("Есть! Решение верное.", "Иә! Шешім дұрыс.")];
const RETRY = [tx("Попробуй ещё раз.", "Тағы бір рет көр."), tx("Подумай ещё — у тебя получится.", "Тағы ойлан — сенен шығады."), tx("Почти! Посмотри внимательнее.", "Сәл қалды! Мұқият қара.")];

function playTask(o) {
  const { type, grade, level = 1, mode = "train", host } = o;
  const seed = o.seed ?? newSeed();
  const def = TASKS[type];
  const task = o.task ? { ...o.task, type, seed, grade, level } : makeTask(type, seed, grade, level); // o.task — готовая задача (для показа)
  const card = el(`<div class="task mode-${mode}">
    <div class="thead">
      <div class="tmeta"><span class="tdir">${T(DIRS[def.dir]?.title || def.title)}</span><span class="ttitle">${T(def.title)}</span>${LEVEL_DOTS(level)}${o.num ? `<span class="tnum">№ ${o.num}</span>` : ""}</div>
      <div class="tq"><button class="say" type="button" title="Прочитать вслух" aria-label="Прочитать вслух">${SPEAKER}</button><div class="qtext">${T(task.q)}</div></div>
    </div>
    <div class="tbody"></div>
    <div class="tfeed" aria-live="polite"></div>
    <div class="tbar">
      ${mode === "test" ? "" : `<button class="btn sm hintb" type="button">💡 ${L("Подсказка", "Кеңес")}</button><button class="btn sm solveb" type="button">${L("Разбор", "Талдау")}</button>`}
      ${o.allowNew === false || mode === "test" ? "" : `<button class="btn sm newb" type="button">↻ ${L("Новый вариант", "Жаңа нұсқа")}</button>`}
      <span class="grow"></span>
      <button class="btn y checkb" type="button">${mode === "test" ? L("Ответить", "Жауап беру") : L("Проверить", "Тексеру")}</button>
    </div></div>`);
  host.innerHTML = ""; host.append(card);
  const body = $(".tbody", card), feed = $(".tfeed", card);
  const ctx = { grade, level, mode, card, feed: (h, k) => say(h, k) };
  const w = def.render(task, body, ctx) || {};
  let attempts = 0, hints = 0, reported = false, done = false, hintI = 0;

  $(".say", card).onclick = () => speakEl($(".qtext", card));
  function say(html, kind = "info") { feed.innerHTML = `<div class="fb ${kind}">${html}</div>`; }
  function report(ok, extra = {}) {
    if (reported) return; reported = true;
    o.onResult && o.onResult({ type, seed, grade, level, ok, attempts, hints, ...extra });
  }
  function finishOk() {
    done = true; card.classList.add("solved"); body.classList.add("locked");
    const chk = $(".checkb", card);
    if (o.onNext) { chk.innerHTML = L("Дальше ›", "Әрі қарай ›"); chk.onclick = () => o.onNext(); }
    else chk.remove();
  }
  $(".checkb", card).onclick = () => {
    if (done) return;
    const r = w.check ? w.check() : { ok: false };
    if (r.empty) { say(`${T(r.msg || tx("Сначала выполни задание.", "Алдымен тапсырманы орында."))}`, "hint"); return; }
    attempts++;
    if (mode === "test") {
      report(r.ok); done = true; body.classList.add("locked");
      say(L("Ответ принят.", "Жауап қабылданды."), "info");
      if (o.onNext) setTimeout(() => o.onNext(), 450);
      return;
    }
    if (r.ok) {
      say(`<b>${T(new Rnd(seed + attempts).pick(PRAISE))}</b>${r.msg ? `<div>${T(r.msg)}</div>` : ""}`, "ok");
      card.classList.remove("shake"); report(true); finishOk();
    } else {
      card.classList.remove("shake"); void card.offsetWidth; card.classList.add("shake");
      say(`<b>${T(new Rnd(seed + attempts).pick(RETRY))}</b>${r.msg ? `<div>${T(r.msg)}</div>` : ""}${attempts >= 2 ? `<div class="mute">${L("Можно взять подсказку или посмотреть разбор.", "Кеңес алуға немесе талдауды көруге болады.")}</div>` : ""}`, "err");
      if (attempts >= 2) $(".solveb", card)?.classList.add("pulse");
    }
  };
  const hb = $(".hintb", card);
  if (hb) hb.onclick = () => {
    const H = task.hints || [];
    if (!H.length) return say(L("Для этого задания подсказок нет — посмотри разбор.", "Бұл тапсырмаға кеңес жоқ — талдауды қара."), "hint");
    hints++; const h = H[Math.min(hintI, H.length - 1)]; hintI++;
    say(`<b>💡 ${L("Подсказка", "Кеңес")} ${Math.min(hintI, H.length)}/${H.length}.</b> ${T(h)}`, "hint");
    w.onHint && w.onHint(hintI);
  };
  const sb = $(".solveb", card);
  if (sb) sb.onclick = () => runSolve();
  const nb = $(".newb", card);
  if (nb) nb.onclick = () => { if (o.onNew) o.onNew(); else playTask({ ...o, seed: newSeed() }); };

  async function runSolve(auto = false) {
    if (!w.solve) return;
    $(".solveb", card)?.classList.remove("pulse");
    if (!done) report(false, { solved: true });
    const steps = w.solve() || [];
    body.classList.add("locked");
    feed.innerHTML = `<div class="fb steps"><b>${L("Разбор по шагам", "Қадамдап талдау")}</b><ol></ol><div class="btns"><button class="btn sm y nexts" type="button">${L("Следующий шаг ›", "Келесі қадам ›")}</button></div></div>`;
    const ol = $("ol", feed), nx = $(".nexts", feed);
    let i = 0;
    const step = async () => {
      if (i >= steps.length) return;
      const s = steps[i++];
      ol.append(el(`<li>${T(s.t)}</li>`));
      if (s.act) await s.act();
      if (i >= steps.length) { nx.remove(); finishOk(); card.classList.add("shown"); }
    };
    nx.onclick = step;
    await step();
    if (auto) while (i < steps.length) { await sleep(1700); await step(); }
  }
  return { task, card, w, solve: runSolve, seed };
}

const SPEAKER = `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/><path d="M19.5 5.5a9 9 0 0 1 0 13"/></svg>`;
