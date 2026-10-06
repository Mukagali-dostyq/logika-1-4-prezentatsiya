"use strict";
/* =====================================================================
   ДОСТУП: аккаунт, подписка, устройства, платные задания.
   — Бесплатно: темы LG_CONFIG.FREE_TOPICS на уровне FREE_LEVEL.
   — Платные задания лежат в закрытом хранилище Supabase (lg-premium/premium.js);
     сервер отдаёт файл, только если у аккаунта активная подписка И это устройство
     зарегистрировано (проверка в базе: функция lg_has_access).
   — Лимит устройств: семья 2, учитель 3. Новое устройство сверх лимита — только
     после отключения старого (не чаще раза в LG_CONFIG.REMOVE_COOLDOWN_DAYS дней).
   ===================================================================== */

const ACCESS = { sb: null, session: null, status: null, premium: false, reason: null, dev: false };
const CONFIGURED = () => LG_CONFIG.SUPABASE_URL.startsWith("https://") && LG_CONFIG.SUPABASE_ANON_KEY.length > 20 && !!window.supabase;

function deviceId() {
  let d = store.get("device", null);
  if (!d) { d = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2)); store.set("device", d); }
  return d;
}
function deviceLabel() {
  const ua = navigator.userAgent;
  const os = /Android/.test(ua) ? "Android" : /iPhone|iPad|iPod/.test(ua) ? "iPhone/iPad" : /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "Mac" : /CrOS/.test(ua) ? "Chromebook" : /Linux/.test(ua) ? "Linux" : "Устройство";
  const br = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /YaBrowser/.test(ua) ? "Яндекс" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "браузер";
  return `${os} · ${br}`;
}
function loadScript(src) { return new Promise((ok, bad) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = bad; document.head.append(s); }); }

/* закрыта ли тема и какой уровень доступен */
function openLevel(type) {
  if (!TASKS[type] || !TASKS[type].gen) return 0;
  if (ACCESS.premium) return 3;
  return LG_CONFIG.FREE_TOPICS.includes(type) ? LG_CONFIG.FREE_LEVEL : 0;
}
const isOpen = (type, level = 1) => openLevel(type) >= level;

/* запуск: восстановить вход, зарегистрировать устройство, загрузить платные задания */
async function accessInit() {
  const q = new URLSearchParams(location.search);
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && q.get("dev") === "1" && window.DEV_PREMIUM) {
    for (const f of window.DEV_PREMIUM) await loadScript(f); // локальная проверка без сервера
    ACCESS.premium = true; ACCESS.dev = true; return;
  }
  if (!CONFIGURED()) return;
  ACCESS.sb = supabase.createClient(LG_CONFIG.SUPABASE_URL, LG_CONFIG.SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true, storageKey: "logika14.auth" } });
  try {
    const { data } = await ACCESS.sb.auth.getSession();
    ACCESS.session = data.session;
    if (ACCESS.session) await accessRefresh();
  } catch (e) { console.warn("access", e); ACCESS.reason = "network"; }
  // раз в 10 минут проверяем, не отключено ли устройство
  setInterval(async () => {
    if (!ACCESS.premium || !ACCESS.sb) return;
    const { data } = await ACCESS.sb.rpc("lg_check");
    if (data === false) { toast(tx("Доступ на этом устройстве отключён. Войдите снова.", "Бұл құрылғыда қолжетімділік өшірілді. Қайта кіріңіз."), 5000); setTimeout(() => location.reload(), 3000); }
  }, 600000);
}
async function accessRefresh() {
  const { data, error } = await ACCESS.sb.rpc("lg_register_device", { p_device: deviceId(), p_label: deviceLabel() });
  if (error) { ACCESS.reason = "error"; console.warn(error); return; }
  ACCESS.status = data; ACCESS.reason = data.ok ? null : data.reason;
  if (data.ok && data.active && !window.NO_PREMIUM) await loadPremium();
}
async function loadPremium() {
  if (ACCESS.premium) return true;
  // без кэша: если устройство отключили, файл не должен браться из памяти браузера
  const { data: sess } = await ACCESS.sb.auth.getSession();
  const res = await fetch(`${LG_CONFIG.SUPABASE_URL}/storage/v1/object/authenticated/lg-premium/premium.js`, { cache: "no-store",
    headers: { apikey: LG_CONFIG.SUPABASE_ANON_KEY, Authorization: "Bearer " + (sess.session && sess.session.access_token) } }).catch(() => null);
  if (!res || !res.ok) { ACCESS.reason = "nofile"; return false; }
  await loadScript(URL.createObjectURL(new Blob([await res.text()], { type: "text/javascript" })));
  ACCESS.premium = Object.values(TASKS).every(t => t.gen);
  return ACCESS.premium;
}

/* --------------------------------------------------------------------
   СТРАНИЦА «АККАУНТ»: вход / регистрация / подписка / устройства / оплата
   -------------------------------------------------------------------- */
const PLAN_NAME = { month: tx("Месяц", "Ай"), year: tx("Год", "Жыл"), forever: tx("Навсегда", "Мәңгі"), trial: tx("Пробный", "Сынақ") };
const KIND_NAME = { family: tx("Семья (2 устройства)", "Отбасы (2 құрылғы)"), teacher: tx("Учитель (3 устройства)", "Мұғалім (3 құрылғы)") };
const ERR = m => {
  if (/Invalid login/i.test(m)) return tx("Неверный e-mail или пароль.", "E-mail немесе құпиясөз қате.");
  if (/already registered|already exists/i.test(m)) return tx("Этот e-mail уже зарегистрирован — войдите.", "Бұл e-mail тіркелген — кіріңіз.");
  if (/Password should be|weak/i.test(m)) return tx("Пароль слишком простой: минимум 8 символов.", "Құпиясөз тым қарапайым: кемінде 8 таңба.");
  if (/valid email|invalid format/i.test(m)) return tx("Проверьте e-mail.", "E-mail-ді тексеріңіз.");
  if (/Email not confirmed/i.test(m)) return tx("E-mail не подтверждён. Напишите нам — включим вручную.", "E-mail расталмаған. Бізге жазыңыз — қолмен қосамыз.");
  return tx("Ошибка: " + m, "Қате: " + m);
};
const fmtDate = d => (d ? new Date(d).toLocaleDateString(LANG.cur === "kz" ? "kk-KZ" : "ru-RU", { day: "numeric", month: "long", year: "numeric" }) : "");
const tg = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " ₸";

/* цены: с сервера (lg_prices), запасной вариант — config.js */
async function loadPrices() {
  const P = JSON.parse(JSON.stringify(LG_CONFIG.PRICES));
  try { const { data } = await ACCESS.sb.from("lg_prices").select("*"); (data || []).forEach(r => { P[r.kind][r.plan] = r.price; }); } catch { }
  return P;
}
const waLink = text => LG_CONFIG.PAY.whatsapp ? `https://wa.me/${LG_CONFIG.PAY.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(text)}` : "";
const STATUS_REQ = { pending: tx("ждёт проверки оплаты", "төлемді тексеруді күтуде"), approved: tx("одобрена — доступ включён", "мақұлданды — қолжетімділік қосылды"), rejected: tx("отклонена", "қабылданбады"), cancelled: tx("заменена новой", "жаңасымен ауыстырылды") };

/* «Оформить доступ»: выбрать тариф или ввести промокод → заявка → Kaspi → чек в WhatsApp → администратор включает */
async function requestBlock(box, email, profileName) {
  const P = await loadPrices();
  const { data: reqs } = await ACCESS.sb.rpc("lg_my_requests");
  const last = (reqs || [])[0];
  const pay = LG_CONFIG.PAY;
  const card = el(`<div class="card reqbox"><h3>${L("Оформить доступ", "Қолжетімділікті рәсімдеу")}</h3></div>`);
  if (last && last.status === "pending") {
    const msg = `Логика 1–4. Заявка №${last.id}. ${last.full_name}. Сумма ${last.price} тг. Аккаунт: ${email}`;
    card.append(el(`<div class="reqpending"><div class="k">${L("Ваша заявка", "Сіздің өтінішіңіз")} №${last.id} · ${T(STATUS_REQ.pending)}</div>
      <div class="reqsum">${tg(last.price)}</div><p>${T(PLAN_NAME[last.plan])} · ${T(KIND_NAME[last.kind])}${last.promo ? ` · ${L("промокод", "промокод")} <b>${last.promo}</b>` : ""}</p>
      <ol><li>${pay.kaspi_phone ? L(`Переведите <b>${tg(last.price)}</b> на Kaspi <b>${pay.kaspi_phone}</b>${pay.receiver ? ` (${pay.receiver})` : ""}.`, `<b>${tg(last.price)}</b> соманы Kaspi <b>${pay.kaspi_phone}</b>${pay.receiver ? ` (${pay.receiver})` : ""} нөміріне аударыңыз.`) : L(`Переведите <b>${tg(last.price)}</b> по реквизитам, которые вам сообщили.`, `<b>${tg(last.price)}</b> соманы сізге берілген деректемелер бойынша аударыңыз.`)}</li>
        <li>${L(`Отправитель в Kaspi должен совпадать с именем в заявке: <b>${last.full_name}</b>.`, `Kaspi-дегі жіберуші өтініштегі есіммен сәйкес болуы керек: <b>${last.full_name}</b>.`)}</li>
        <li>${waLink(msg) ? L(`Отправьте чек в <a class="btn sm g" href="${waLink(msg)}" target="_blank" rel="noopener">WhatsApp</a>`, `Түбіртекті <a class="btn sm g" href="${waLink(msg)}" target="_blank" rel="noopener">WhatsApp</a>-қа жіберіңіз`) : L("Отправьте чек администратору.", "Түбіртекті әкімшіге жіберіңіз.")}</li>
        <li>${L("Администратор проверит оплату и включит доступ — обновите эту страницу.", "Әкімші төлемді тексеріп, қолжетімділікті қосады — осы бетті жаңартыңыз.")}</li></ol></div>`));
  } else if (last && last.status === "rejected") {
    card.append(el(`<p class="warnbox" style="padding:10px;border-radius:10px">${L(`Заявка №${last.id} отклонена`, `№${last.id} өтініш қабылданбады`)}${last.admin_note ? `: ${last.admin_note}` : ""}</p>`));
  }
  const opts = ["family", "teacher"].flatMap(k => ["month", "year", "forever"].map(p => [k, p]));
  const form = el(`<form class="reqform"><div class="k">${last && last.status === "pending" ? L("Изменить заявку", "Өтінішті өзгерту") : L("Выберите тариф", "Тарифті таңдаңыз")}</div>
    <div class="planpick">${opts.map(([k, p], i) => `<label class="pp"><input type="radio" name="pl" value="${k}|${p}" ${i === 4 ? "checked" : ""}><span>${T(KIND_NAME[k])}<br><b>${T(PLAN_NAME[p])}</b> · ${tg(P[k][p])}</span></label>`).join("")}</div>
    <div class="row"><label class="grow">${L("Промокод (если есть)", "Промокод (бар болса)")}<input class="namein promo" name="promo" maxlength="30" placeholder="SEMINAR"></label><button class="btn sm chk" type="button">${L("Проверить", "Тексеру")}</button></div>
    <div class="promoinfo"></div>
    <div class="row"><label class="grow">${L("Фамилия и имя — как у отправителя в Kaspi", "Тегі мен аты — Kaspi жіберушісіндей")}<input class="namein" name="fio" required maxlength="80" value="${(profileName || "").replace(/"/g, "&quot;")}"></label>
      <label class="grow">${L("Телефон (WhatsApp)", "Телефон (WhatsApp)")}<input class="namein" name="phone" maxlength="20"></label></div>
    <button class="btn y" type="submit">${L("Отправить заявку", "Өтінішті жіберу")}</button></form>`);
  card.append(form); box.append(card);
  const checkPromo = async () => {
    const code = form.promo.value.trim(); const info = $(".promoinfo", form);
    if (!code) { info.innerHTML = ""; return null; }
    const { data } = await ACCESS.sb.rpc("lg_check_promo", { p_code: code });
    if (!data || !data.ok) { info.innerHTML = `<p class="bad">${L("Промокод не найден или больше не действует.", "Промокод табылмады немесе енді жарамсыз.")}</p>`; return false; }
    info.innerHTML = `<p class="good">✓ ${L(`Промокод <b>${data.code}</b>: ${T(KIND_NAME[data.kind])}, ${T(PLAN_NAME[data.plan]).toLowerCase()} — <b>${tg(data.price)}</b>${data.regular ? ` вместо <s>${tg(data.regular)}</s>` : ""}.`, `<b>${data.code}</b> промокоды: ${T(KIND_NAME[data.kind])}, ${T(PLAN_NAME[data.plan]).toLowerCase()} — <s>${tg(data.regular)}</s> орнына <b>${tg(data.price)}</b>.`)}</p>`;
    return data;
  };
  $(".chk", form).onclick = checkPromo;
  form.onsubmit = async e => {
    e.preventDefault();
    const promo = form.promo.value.trim();
    if (promo && !(await checkPromo())) return;
    const [kind, plan] = form.pl.value.split("|");
    const { data, error } = await ACCESS.sb.rpc("lg_request", { p_plan: plan, p_kind: kind, p_promo: promo, p_full_name: form.fio.value, p_phone: form.phone.value });
    if (error) return toast(ERR(error.message), 5000);
    if (!data.ok) return toast(data.reason === "name" ? tx("Впишите фамилию и имя.", "Тегі мен атын жазыңыз.") : tx("Не получилось отправить заявку — проверьте промокод.", "Өтініш жіберілмеді — промокодты тексеріңіз."), 5000);
    toast(tx(`Заявка №${data.id} отправлена.`, `№${data.id} өтініш жіберілді.`)); setTimeout(() => location.reload(), 900);
  };
}

function plansHTML(email) {
  const P = LG_CONFIG.PRICES, pay = LG_CONFIG.PAY;
  const wa = pay.whatsapp ? `https://wa.me/${pay.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent("Логика 1–4: оплата. Аккаунт: " + (email || ""))}` : "";
  return `<div class="plans">${["family", "teacher"].map(k => `<div class="card plan"><div class="k">${T(KIND_NAME[k])}</div>
    ${["month", "year", "forever"].map(p => `<div class="prow"><span>${T(PLAN_NAME[p])}</span><b>${tg(P[k][p])}</b></div>`).join("")}</div>`).join("")}</div>
    <div class="card paybox"><h3>${L("Как получить доступ", "Қолжетімділікті қалай алу")}</h3><ol>
      <li>${L("Зарегистрируйтесь. Есть промокод (например, с семинара) — впишите его при регистрации.", "Тіркеліңіз. Промокод болса (мысалы, семинардан) — тіркелгенде жазыңыз.")}</li>
      <li>${L("Отправьте заявку: тариф, фамилия и имя — как у отправителя в Kaspi.", "Өтініш жіберіңіз: тариф, тегі мен аты — Kaspi жіберушісіндей.")}</li>
      <li>${L("Переведите сумму на Kaspi и отправьте чек в WhatsApp.", "Соманы Kaspi-ге аударып, түбіртекті WhatsApp-қа жіберіңіз.")}</li>
      <li>${L("Администратор проверит оплату и включит доступ.", "Әкімші төлемді тексеріп, қолжетімділікті қосады.")}</li></ol></div>`;
}

async function viewAccount(v) {
  v.innerHTML = "";
  v.append(el(`<section><div class="eyebrow"><span class="tag">${L("Аккаунт", "Аккаунт")}</span>${L("полный доступ ко всем темам, уровням, банку, проверочным и печати", "барлық тақырыпқа, деңгейге, банкке, тексеру мен басып шығаруға толық қолжетімділік")}</div>
    <h2>${L("Мой", "Менің")} <span class="hand u">${L("доступ", "қолжетімділігім")}</span></h2></section>`));
  const box = el(`<div class="acc"></div>`); v.append(box);
  if (!CONFIGURED()) { box.append(el(`<div class="card note"><p>${L("Онлайн-доступ ещё настраивается. Бесплатные темы уже работают.", "Онлайн қолжетімділік әлі бапталуда. Тегін тақырыптар қазірдің өзінде жұмыс істейді.")}</p></div>`)); return; }
  const sb = ACCESS.sb;
  if (!ACCESS.session) return loginForms(box);
  const st = ACCESS.status || {};
  const email = ACCESS.session.user.email;
  const active = st.active;
  box.append(el(`<div class="card accst ${active ? "on" : ""}"><div class="row"><div class="grow"><div class="k">${L("Вы вошли как", "Сіз кірдіңіз")}</div><b>${email}</b></div>
    <div><div class="k">${L("Подписка", "Жазылым")}</div><b>${active ? `${T(KIND_NAME[st.kind] || KIND_NAME.family)} · ${st.ends_at ? L(`до ${fmtDate(st.ends_at)}`, `${fmtDate(st.ends_at)} дейін`) : L("навсегда", "мәңгі")}` : L("нет — открыты только пробные темы", "жоқ — тек сынақ тақырыптары ашық")}</b></div></div>
    <div class="btns" style="margin-top:12px">${active && !ACCESS.reason ? `<span class="pill" style="background:#B2F2D6">✓ ${L("Все задания открыты на этом устройстве", "Бұл құрылғыда барлық тапсырма ашық")}</span>` : ""}<button class="btn sm dk out" type="button">${L("Выйти", "Шығу")}</button>${st.is_admin ? `<a class="btn sm y" href="../admin/index.html">⚙ ${L("Панель администратора", "Әкімші панелі")}</a>` : ""}</div></div>`));
  if (ACCESS.reason === "limit") box.append(el(`<div class="card warnbox"><h3>${L("Достигнут лимит устройств", "Құрылғы шегіне жеттіңіз")}</h3><p>${L(`На этом аккаунте уже ${st.limit} ${plural(st.limit, "устройство", "устройства", "устройств")}. Чтобы открыть задания здесь, отключите одно из старых. Отключать можно не чаще раза в ${LG_CONFIG.REMOVE_COOLDOWN_DAYS} дней.`, `Бұл аккаунтта ${st.limit} құрылғы бар. Мұнда ашу үшін ескісінің біреуін өшіріңіз. Өшіруге ${LG_CONFIG.REMOVE_COOLDOWN_DAYS} күнде бір рет болады.`)}</p></div>`));
  if (ACCESS.reason === "nofile") box.append(el(`<div class="card warnbox"><p>${L("Подписка активна, но задания не загрузились. Обновите страницу; если не поможет — напишите нам.", "Жазылым белсенді, бірақ тапсырмалар жүктелмеді. Бетті жаңартыңыз; көмектеспесе — бізге жазыңыз.")}</p></div>`));
  // устройства
  const devs = st.devices || [];
  box.append(el(`<div class="card"><h3>${L("Устройства", "Құрылғылар")} <span class="mute">${devs.length}/${st.limit || 2}</span></h3><div class="devs">${devs.map(d => `<div class="dev ${d.device_id === deviceId() ? "me" : ""}"><b>${d.label || "—"}</b>${d.device_id === deviceId() ? `<span class="pill">${L("это устройство", "осы құрылғы")}</span>` : ""}<span class="mute">${L("был(а) в сети", "соңғы кіру")}: ${fmtDate(d.last_seen)}</span><button class="btn sm rm" data-id="${d.id}" type="button">${L("Отключить", "Өшіру")}</button></div>`).join("") || `<p class="mute">—</p>`}</div>
    <p class="mute" style="margin-top:8px">${L("Совет: не очищайте данные браузера — иначе он будет считаться новым устройством.", "Кеңес: браузер деректерін тазаламаңыз — әйтпесе ол жаңа құрылғы саналады.")}</p></div>`));
  // код доступа + оплата
  box.append(el(`<div class="card"><h3>${L("Код доступа", "Қолжетімділік коды")}</h3><div class="row"><input class="namein code" placeholder="LG-XXXX-XXXX" maxlength="20"><button class="btn y redeem" type="button">${L("Активировать", "Белсендіру")}</button></div></div>`));
  const prof = await ACCESS.sb.from("lg_profiles").select("display_name").maybeSingle();
  await requestBlock(box, email, prof.data && prof.data.display_name);
  box.addEventListener("click", async e => {
    if (e.target.closest(".out")) { await sb.auth.signOut(); location.reload(); }
    const rm = e.target.closest(".rm");
    if (rm) {
      if (!confirm(LANG.cur === "kz" ? "Құрылғыны өшіру керек пе?" : "Отключить это устройство?")) return;
      const { data, error } = await sb.rpc("lg_remove_device", { p_id: +rm.dataset.id });
      if (error) return toast(ERR(error.message));
      if (!data.ok && data.reason === "cooldown") return toast(tx(`Отключать устройство можно раз в ${LG_CONFIG.REMOVE_COOLDOWN_DAYS} дней. Следующий раз — ${fmtDate(data.next)}.`, `Құрылғыны ${LG_CONFIG.REMOVE_COOLDOWN_DAYS} күнде бір рет өшіруге болады. Келесі рет — ${fmtDate(data.next)}.`), 5000);
      await accessRefresh(); if (ACCESS.premium) return location.reload(); viewAccount(v);
    }
    if (e.target.closest(".redeem")) {
      const code = $(".code", box).value.trim().toUpperCase(); if (!code) return;
      const { data, error } = await sb.rpc("lg_redeem_code", { p_code: code });
      if (error) return toast(ERR(error.message));
      if (!data.ok) return toast(tx("Код не найден или уже использован.", "Код табылмады немесе қолданылған."), 4000);
      toast(tx("Готово! Доступ открыт.", "Дайын! Қолжетімділік ашылды.")); setTimeout(() => location.reload(), 1200);
    }
  });
}

function loginForms(box) {
  box.append(el(`<div class="grid g2 loginbox">
    <form class="card lf"><h3>${L("Вход", "Кіру")}</h3>
      <label>E-mail<input class="namein" name="email" type="email" required autocomplete="email"></label>
      <label>${L("Пароль", "Құпиясөз")}<input class="namein" name="pass" type="password" required minlength="8" autocomplete="current-password"></label>
      <button class="btn y" type="submit">${L("Войти", "Кіру")}</button>
      <p class="mute">${L("Забыли пароль? Напишите администратору — он задаст новый.", "Құпиясөзді ұмыттыңыз ба? Әкімшіге жазыңыз — жаңасын береді.")}</p></form>
    <form class="card rf"><h3>${L("Регистрация", "Тіркелу")}</h3>
      <p class="mute">${L("Аккаунт создаёт взрослый — родитель или учитель. Данные ребёнка не нужны.", "Аккаунтты ересек адам — ата-ана немесе мұғалім ашады. Баланың деректері қажет емес.")}</p>
      <label>${L("Фамилия и имя (как в Kaspi)", "Тегі мен аты (Kaspi-дегідей)")}<input class="namein" name="name" required maxlength="60" autocomplete="name"></label>
      <label>E-mail<input class="namein" name="email" type="email" required autocomplete="email"></label>
      <label>${L("Телефон (WhatsApp)", "Телефон (WhatsApp)")}<input class="namein" name="phone" maxlength="20" autocomplete="tel"></label>
      <label>${L("Пароль (минимум 8 символов)", "Құпиясөз (кемінде 8 таңба)")}<input class="namein" name="pass" type="password" required minlength="8" autocomplete="new-password"></label>
      <label>${L("Промокод (если есть — например, с семинара)", "Промокод (бар болса — мысалы, семинардан)")}<input class="namein" name="promo" maxlength="30"></label>
      <div class="chips kindc"><button type="button" data-k="family" class="on">${T(KIND_NAME.family)}</button><button type="button" data-k="teacher">${T(KIND_NAME.teacher)}</button></div>
      <label class="agree"><input type="checkbox" name="agree" required> ${L('Согласен(на) с <a href="../terms.html" target="_blank">условиями</a> и <a href="../privacy.html" target="_blank">политикой конфиденциальности</a>', '<a href="../terms.html" target="_blank">Шарттармен</a> және <a href="../privacy.html" target="_blank">құпиялылық саясатымен</a> келісемін')}</label>
      <button class="btn y" type="submit">${L("Создать аккаунт", "Аккаунт ашу")}</button></form></div>`));
  box.append(el(`<section class="sec"><h3>${L("Тарифы", "Тарифтер")}</h3>${plansHTML("")}</section>`));
  let kind = "family";
  $(".kindc", box).onclick = e => { const b = e.target.closest("button"); if (!b) return; kind = b.dataset.k; $$(".kindc button", box).forEach(x => x.classList.toggle("on", x === b)); };
  $(".lf", box).onsubmit = async e => {
    e.preventDefault(); const f = e.target;
    const { error } = await ACCESS.sb.auth.signInWithPassword({ email: f.email.value.trim(), password: f.pass.value });
    if (error) return toast(ERR(error.message), 4000);
    location.reload();
  };
  $(".rf", box).onsubmit = async e => {
    e.preventDefault(); const f = e.target;
    const { data, error } = await ACCESS.sb.auth.signUp({ email: f.email.value.trim(), password: f.pass.value, options: { data: { name: f.name.value.trim(), phone: f.phone.value.trim(), kind } } });
    if (error) return toast(ERR(error.message), 4000);
    if (!data.session) return toast(tx("Аккаунт создан. Подтвердите e-mail по письму и войдите.", "Аккаунт ашылды. Хаттағы сілтеме арқылы e-mail-ді растап, кіріңіз."), 6000);
    if (f.promo.value.trim()) { // промокод сразу превращается в заявку на оплату
      ACCESS.session = data.session;
      const r = await ACCESS.sb.rpc("lg_request", { p_plan: "year", p_kind: kind, p_promo: f.promo.value.trim(), p_full_name: f.name.value, p_phone: f.phone.value });
      if (r.data && !r.data.ok) toast(tx("Аккаунт создан, но промокод не подошёл — выберите тариф на следующем экране.", "Аккаунт ашылды, бірақ промокод жарамады — келесі экранда тарифті таңдаңыз."), 6000);
    }
    location.reload();
  };
}
