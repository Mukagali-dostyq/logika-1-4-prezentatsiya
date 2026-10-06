"use strict";
/* =====================================================================
   ДВИЖОК ПРЕЗЕНТАЦИИ: экраны, навигация, заметки докладчика (N),
   конспект целиком (P), полный экран (F), все экраны (Esc), RU/ҚАЗ.
   Экраны описаны в slides.js: SLIDES.push({ sec, theme, deco, time, title, html, notes, init }).
   init(el) вызывается один раз, когда экран впервые открыт — там «оживают» задачи.
   ===================================================================== */
const SLIDES = [];
const SECTIONS = [tx("Старт", "Бастау"), tx("Идея", "Идея"), tx("Живые задачи", "Тірі есептер"), tx("Итог", "Қорытынды")];
let CUR = 0;

function buildDeck() {
  const deck = $(".deck");
  SLIDES.forEach((s, i) => {
    const d = s.deco ? s.deco.split(":") : null;
    const n = el(`<section class="slide t-${s.theme || "paper"}" data-i="${i}">${d ? `<div class="deco m-${d[0]} dk-${d[1] || "tr"}"></div>` : ""}<div class="wrap ${s.top ? "top" : ""}">${s.html}</div></section>`);
    deck.append(n); s.el = n;
  });
  $(".secnav").innerHTML = SECTIONS.map((t, i) => `<button data-s="${i}"><b>${i + 1}</b><span>${T(t)}</span></button>`).join("");
  $(".secnav").onclick = e => { const b = e.target.closest("button"); if (b) show(SLIDES.findIndex(s => s.sec === +b.dataset.s)); };
  // все экраны
  $("#grid").innerHTML = SECTIONS.map((t, si) => `<h5>${T(t)}</h5><div class="gg">${SLIDES.map((s, i) => s.sec === si ? `<button class="t-${s.theme || "paper"}" data-i="${i}"><small>${i + 1}</small>${T(s.title)}</button>` : "").join("")}</div>`).join("");
  $("#grid").onclick = e => { const b = e.target.closest("button[data-i]"); if (b) { show(+b.dataset.i); $("#grid").classList.remove("show"); } };
  // конспект целиком
  $("#conspect").innerHTML = `<div class="btns noprint" style="margin-bottom:14px"><button class="btn y" onclick="print()">🖨 ${L("Печать", "Басып шығару")}</button><button class="btn" onclick="document.getElementById('conspect').classList.remove('show')">✕ ${L("Закрыть", "Жабу")}</button></div>
    <h1>${L("Логика 1–4 — сценарий выступления", "Логика 1–4 — сөз сөйлеу сценарийі")}</h1>` +
    SLIDES.map((s, i) => `<div class="cs"><h3>${i + 1}. ${T(s.title)} <span class="mute" style="font-size:15px">· ${s.time || ""}</span></h3>${s.notes || ""}</div>`).join("");
}
function show(i) {
  i = Math.max(0, Math.min(SLIDES.length - 1, i));
  SLIDES[CUR].el.classList.remove("active"); CUR = i; const s = SLIDES[i];
  s.el.classList.add("active");
  if (s.init && !s.inited) { s.inited = true; try { s.init(s.el); } catch (e) { console.error(e); } }
  $(".counter").textContent = `${i + 1} / ${SLIDES.length}`;
  $(".progress").style.width = `${((i + 1) / SLIDES.length) * 100}%`;
  $$(".secnav button").forEach(b => b.classList.toggle("on", +b.dataset.s === s.sec));
  $$("#grid button").forEach(b => b.classList.toggle("cur", +b.dataset.i === i));
  $("#notes").innerHTML = `<h4>${L("Экран", "Экран")} ${i + 1} · ${s.time || ""}</h4><div class="nt">${T(s.title)}</div>${s.notes || ""}`;
  if (location.hash !== "#" + (i + 1)) history.replaceState(null, "", "#" + (i + 1));
  if ("speechSynthesis" in window) speechSynthesis.cancel();
}
function initNav() {
  $(".prev").onclick = () => show(CUR - 1);
  $(".next").onclick = () => show(CUR + 1);
  $(".notebtn").onclick = () => $("#notes").classList.toggle("show");
  document.addEventListener("keydown", e => {
    if (e.target instanceof Element && e.target.closest("input,textarea,select")) return;
    if (e.key === "ArrowRight" || e.key === "PageDown" || (e.key === " " && !(e.target instanceof Element && e.target.closest("button")))) { e.preventDefault(); show(CUR + 1); }
    else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); show(CUR - 1); }
    else if (e.key === "n" || e.key === "N" || e.key === "т" || e.key === "Т") $("#notes").classList.toggle("show");
    else if (e.key === "p" || e.key === "P" || e.key === "з" || e.key === "З") $("#conspect").classList.toggle("show");
    else if (e.key === "f" || e.key === "F" || e.key === "а" || e.key === "А") document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.();
    else if (e.key === "Escape") { if ($("#conspect").classList.contains("show")) $("#conspect").classList.remove("show"); else $("#grid").classList.toggle("show"); }
  });
  // свайп пальцем — только по пустому месту экрана, не по заданию
  let sx = null;
  $(".deck").addEventListener("pointerdown", e => { sx = e.target.closest(".task,button,.chip,[data-zone],svg,input") ? null : [e.clientX, e.clientY]; });
  $(".deck").addEventListener("pointerup", e => { if (!sx) return; const dx = e.clientX - sx[0], dy = e.clientY - sx[1]; if (Math.abs(dx) > 90 && Math.abs(dy) < 60) show(CUR + (dx < 0 ? 1 : -1)); sx = null; });
  const h = parseInt(location.hash.slice(1)); show(isNaN(h) ? 0 : h - 1);
}
