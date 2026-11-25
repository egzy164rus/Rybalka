/* ============================================================
   ДВИЖОК ИГРЫ
   ============================================================ */
(() => {
"use strict";

/* ---------------- ассеты (встраиваются при сборке) ---------------- */
const IMG = {
  bgSurface: "__BG_SURFACE_V__",
  bgUnder:   "__BG_UNDERWATER__",
  bgRiver:   "__BG_RIVER_V__",
  bgNight:   "__BG_NIGHT_V__",
  bgOcean:   "__BG_OCEAN_V__",
  bgIce:     "__BG_ICE_V__",
  bgSwamp:   "__BG_SWAMP_V__",
  bgMountain:"__BG_MOUNTAIN_V__",
  bgLagoon:  "__BG_LAGOON_V__",
  fish: {
    ersh:"__FISH_ERSH__", plotva:"__FISH_PLOTVA__", karas:"__FISH_KARAS__", okun:"__FISH_OKUN__",
    golavl:"__FISH_GOLAVL__", lin:"__FISH_LIN__", zhereh:"__FISH_ZHEREH__", lesh:"__FISH_LESH__",
    nalim:"__FISH_NALIM__", karp:"__FISH_KARP__", forel:"__FISH_FOREL__", sudak:"__FISH_SUDAK__",
    shchuka:"__FISH_SHCHUKA__", sterlyad:"__FISH_STERLYAD__", beluga:"__FISH_BELUGA__",
    goluboy:"__FISH_GOLUBOY__", moonfish:"__FISH_MOONFISH__", som:"__FISH_SOM__",
    yaz:"__FISH_YAZ__", harius:"__FISH_HARIUS__", taimen:"__FISH_TAIMEN__", ugor:"__FISH_UGOR__",
    karas_zolotoy:"__FISH_KARAS_ZOLOTOY__", svetlyachok:"__FISH_SVETLYACHOK__",
    korolevskiy:"__FISH_KOROLEVSKIY__",
    cod:"__FISH_COD__", flounder:"__FISH_FLOUNDER__", tuna:"__FISH_TUNA__", shark:"__FISH_SHARK__",
    pike_perch:"__FISH_PIKE_PERCH__", mackerel:"__FISH_MACKEREL__", anglerfish:"__FISH_ANGLERFISH__", salmon:"__FISH_SALMON__"
  }
};
const LOC_BG = { lake:"bgSurface", river:"bgRiver", night:"bgNight", winter:"bgIce", sea:"bgOcean",
  swamp:"bgSwamp", mountain:"bgMountain", lagoon:"bgLagoon" };
/* какой спрайт отвечает за вид (у семейств — общий рисунок) */
const artOf = id => FISH_SPRITE[id] || id;
/* палитра-перекраска, чтобы 100 видов не выглядели близнецами */
const hueOf = id => { let h = 0; for (let i=0;i<id.length;i++) h = (h*31 + id.charCodeAt(i)) % 360; return h; };
function paletteFor(id){
  const F = FISH[id] || {};
  const base = hueOf(id);
  const spec = {
    karas_g:[36,1.12], lin:[30,0.92], oster_r:[18,1.06], beluga:[30,1.18], sterlyad:[14,1.1],
    keta:[358,1.1], nerka:[10,1.2], taimen:[8,1.12], angler:[280,1.0], mako:[210,0.9]
  }[id];
  const hue = spec ? spec[0] : (base % 60) + (F.rar === "mythic" ? 250 : F.rar === "legendary" ? 24 : F.rar === "epic" ? 12 : 0);
  const sat = spec ? spec[1] : 1;
  return { hue: hue - 20, sat, light: 1 };
}

/* отладочный журнал событий (не пишет ничего в сохранение) */
const DEBUG = [];
function debugLog(name, data){ DEBUG.push({ t: Date.now(), name, data }); if (DEBUG.length > 200) DEBUG.shift(); }

/* ---------------- сохранение ---------------- */
const KEY = "rybalka_v2", OLD = "rybalka_v1";
const DEF = {
  v:2, coins:0, xp:0,
  owned:{ rod:["bamboo"], reel:["simple"], line:["thin"], hook:["simple"], bait:["worm"], net:["none"] },
  equipped:{ rod:"bamboo", reel:"simple", line:"thin", hook:"simple", bait:"worm", net:"none" },
  caught:{}, total:0, mass:0, best:0, bestCast:0,
  casts:0, breaks:0, lost:0,
  loc:"lake", weather:null, seen:false, seenFight:false, mute:false,
  quests:{}, daily:null, streak:0, noBreak:0, day:null,
  pearl:0, pearlTotal:0, locsCaught:{}, perfects:0, accs:0, premLog:{},
  clubDay:null, clubLuck:null, clubVisit:null, clubGoalDay:null, clubGoal:0, clubGoalDone:false,
  streakBest:0, dayCasts:0, doubleDay:null, doublesToday:0, baits:{},
  /* 8.0: механика водоёмов */
  hand:null, unsnags:0, snagTotal:0, handLocs:{}, windowCatches:0,
  duelWins:0, duelLosses:0, duelDay:null, duelPearlDay:null, duelPearlToday:0, rivalSeen:{},
  /* 8.7: сезоны и погодная физика */
  firstDay:null, lastWeatherType:null, stormAt:0
};
/* 9.1: хранилище с запасным вариантом.
   В стороннем iframe (ВК, другие площадки) браузер может запретить localStorage —
   тогда игра должна всё равно запуститься. Пишем в память, играем, ничего не ломаем. */
const STORE = (() => {
  let ok = false;
  try { const k = "__probe"; localStorage.setItem(k, "1"); localStorage.removeItem(k); ok = true; } catch(e){ ok = false; }
  const mem = new Map();
  const g = k => { try { return ok ? localStorage.getItem(k) : (mem.has(k) ? mem.get(k) : null); } catch(e){ return mem.has(k) ? mem.get(k) : null; } };
  const set = (k, v) => { try { if (ok) localStorage.setItem(k, v); else mem.set(k, v); } catch(e){ mem.set(k, v); } };
  const del = k => { try { if (ok) localStorage.removeItem(k); else mem.delete(k); } catch(e){ mem.delete(k); } };
  return { get mode(){ return ok ? "local" : "memory"; }, get: g, set, del };
})();
if (typeof window !== "undefined") window.__store = () => ({ mode: STORE.mode, key: KEY, bytes: (STORE.get(KEY) || "").length });

let save;
try {
  const raw = STORE.get(KEY);
  save = raw ? deepMerge(structuredClone(DEF), JSON.parse(raw)) : structuredClone(DEF);
} catch(e){ save = structuredClone(DEF); }

// миграция со старой версии
if (!STORE.get(KEY)) {
  try {
    const old = JSON.parse(STORE.get(OLD) || "null");
    if (old && old.total) {
      save.coins = Math.round((old.mass||0)/1000*30) + (old.total||0)*12;
      save.total = old.total||0; save.mass = old.mass||0; save.best = old.best||0;
      save.casts = old.casts||0; save.breaks = old.breaks||0; save.lost = old.lost||0;
      save.caught = old.caught||{};
      save.seen = !!old.seen; save.mute = !!old.mute;
    }
  } catch(e){}
}
function deepMerge(base, extra){
  for (const k in extra){
    if (extra[k] && typeof extra[k] === "object" && !Array.isArray(extra[k]))
      base[k] = deepMerge(base[k] && typeof base[k]==="object" ? base[k] : {}, extra[k]);
    else base[k] = extra[k];
  }
  return base;
}
function persist(){
  if (!save.firstDay) save.firstDay = todayKey();     // 8.7: точка отсчёта сезонов
  STORE.set(KEY, JSON.stringify(save));
  // 9.2: на Яндекс Играх прогресс дублируется в облако — один сейв на всех устройствах
  if (typeof ygCloudSave === "function" && typeof YG !== "undefined" && YG.ready) ygCloudSave();
}

/* ---------------- экономика / уровни ---------------- */
const xpForLvl = lvl => Math.round(26 + lvl*36);
function levelInfo(){
  let lvl = 1, rest = save.xp;
  while (rest >= xpForLvl(lvl)) { rest -= xpForLvl(lvl); lvl++; }
  return { lvl, cur:rest, need:xpForLvl(lvl) };
}
const gear = () => save.equipped;
/* определения снастей: ищут и в обычных таблицах, и в премиум-слое */
const premBy = (slot, id) => {
  if (!id || id.slice(0,2) !== "p_") return null;
  const hit = Object.entries(PREMIUM).find(([k, p]) => p.kind === slot && ("p_"+k === id || "p_"+p.kind === id));
  return hit ? hit[1] : null;
};
const rodDef  = () => premBy("rod",  save.equipped.rod)  || RODS[save.equipped.rod]  || RODS.bamboo;
const reelDef = () => premBy("reel", save.equipped.reel) || REELS[save.equipped.reel] || REELS.simple;
const lineDef = () => premBy("line", save.equipped.line) || LINES[save.equipped.line] || LINES.mono;
const netDef  = () => premBy("net",  save.equipped.net)  || NETS[save.equipped.net]   || NETS.small;
const hookDef = () => premBy("hook", save.equipped.hook) || HOOKS[save.equipped.hook] || HOOKS.plain;
const baitDef = () => BAITS[save.equipped.bait];
/* таблица слота вместе с премиум-предметами */
function tableFor(slot){
  const base = SLOTS.find(s => s.id === slot).table;
  const extra = {};
  for (const k of PEARL_ITEMS) if (PREMIUM[k].kind === slot) extra["p_"+k] = PREMIUM[k];
  return Object.assign({}, base, extra);
}
const itemDef = (slot, id) => (RODS[id] || REELS[id] || LINES[id] || HOOKS[id] || NETS[id] || BAITS[id] ||
  premBy(slot, id) || Object.values(PREMIUM).find(p => "p_"+p.kind === id) || {name:"?", power:0, tier:1});
/* запас приманок: {baitId: кол-во} */
if (!save.baits || typeof save.baits !== "object") save.baits = { worm:60 };
if (!save.quests || typeof save.quests !== "object") save.quests = {};
if (typeof save.noBreak !== "number") save.noBreak = 0;
if (typeof save.pearl !== "number") save.pearl = 0;
if (!save.locsCaught || typeof save.locsCaught !== "object") save.locsCaught = {};
if (typeof save.perfects !== "number") save.perfects = 0;
const baitsLeft = id => save.baits[id] || 0;
function useBait(n = 1){
  const id = save.equipped.bait;
  save.baits[id] = Math.max(0, baitsLeft(id) - n);
  persist(); updateChips();
}
/* если приманка кончилась — докупаем за монеты, а без денег сосед поделится */
function ensureBait(){
  const id = save.equipped.bait;
  if (baitsLeft(id) > 0) return true;
  const price = BAITS[id].price, pack = 10, cost = price * pack;
  if (save.coins >= cost){
    save.coins -= cost; save.baits[id] = pack;
    persist(); updateChips();
    toast("Приманка кончилась", "Купили " + pack + " шт «" + BAITS[id].name + "» за " + cost + " монет.", 2200);
    return true;
  }
  save.baits[id] = 5;
  persist(); updateChips();
  toast("Сосед поделился", "Денег нет — наловил " + 5 + " шт «" + BAITS[id].name + "». Поймай рыбу и купи запас.", 2600);
  return true;
}
function restockCost(ids){
  return ids.reduce((sum, id) => sum + BAITS[id].price * 20, 0);
}
/* «сила снасти» — минимум из удочки и лески; если рыба сильнее, она уйдёт */
const gearPower = () => Math.min(rodDef().power, lineDef().power);
/* ============================================================================
   9.2: ЯНДЕКС ИГРЫ — платформа, через которую идут живые деньги
   Три источника дохода, все три уже встроены:
   1) реклама (главный) — межстраничная и за награду;
   2) покупки через Яндекс Pay — ими и продаётся «Клубная карта»;
   3) Яндекс Плюс платит за время игры подписчиков (начисляется платформой сама).
   Игра остаётся одной HTML-страницей и работает без SDK: на своём домене
   просто не будет рекламы и покупок, всё остальное живо.
   ========================================================================== */
const YG = { sdk:null, payments:null, player:null, ready:false, lang:"ru", device:"desktop", adsLeft:{}, busy:false };
const YG_PRODUCTS = {
  pass_week:  { plan:"week",  id:"pass_week",  title:"Клубная карта · неделя",  price:99,   days:7 },
  pass_month: { plan:"month", id:"pass_month", title:"Клубная карта · месяц",  price:249,  days:30 },
  pass_year:  { plan:"year",  id:"pass_year",  title:"Клубная карта · год",    price:1790, days:365 },
  pearls_100: { pearls:100,   id:"pearls_100", title:"100 жемчуга" },
  pearls_500: { pearls:500,   id:"pearls_500", title:"500 жемчуга" }
};
const ygOn = () => YG.ready;

/* загрузка SDK: один внешний скрипт, только на платформе; офлайн-игра не страдает */
function ygLoad(){
  return new Promise(resolve => {
    if (window.YaGames) return resolve(window.YaGames);
    if (!/yandex|games\.s3|app-/.test(location.hostname + location.search) && !window.__ygForce) return resolve(null);
    const sc = document.createElement("script");
    sc.src = "https://yandex.ru/games/sdk/v2";
    sc.onload = () => resolve(window.YaGames || null);
    sc.onerror = () => resolve(null);
    document.head.appendChild(sc);
    setTimeout(() => resolve(window.YaGames || null), 2500);
  });
}
async function ygInit(){
  const sdk = await ygLoad();
  if (!sdk) return false;
  try {
    YG.sdk = await sdk.init({ adv: { onAdvClose: () => { YG.busy = false; } } });
    YG.ready = true;
    try {
      const env = YG.sdk.environment || {};
      YG.lang = (env.i18n && env.i18n.lang) || "ru";
      YG.device = (env.deviceInfo && env.deviceInfo.type) || "desktop";
    } catch(_) {}
    // игрок и облачные сохранения: один прогресс на всех устройствах
    try {
      YG.player = await YG.sdk.getPlayer({ scopes:false });
      const cloud = await YG.player.getData(["save"]);
      const local = save;
      const cloudSave = cloud && cloud.save;
      const pick = cloudSave && (cloudSave.total || 0) > (local.total || 0) ? cloudSave : local;
      if (pick !== local){ Object.keys(save).forEach(k => delete save[k]); Object.assign(save, pick); }
      if (typeof updateChips === "function") updateChips();
    } catch(_) {}
    try { YG.payments = await YG.sdk.getPayments({ signed:false }); } catch(_) { YG.payments = null; }
    return true;
  } catch(e){ YG.ready = false; return false; }
}
/* сохранить прогресс в облако (не чаще раза в 20 с) */
let ygSaveAt = 0;
function ygCloudSave(force){
  if (!YG.player) return;
  const now = Date.now();
  if (!force && now - ygSaveAt < 20000) return;
  ygSaveAt = now;
  try { YG.player.setData({ save }, false).catch(() => {}); } catch(_) {}
}
/* показать рекламу: 'interstitial' — между забросами, 'rewarded' — за награду */
function ygAd(kind){
  if (!YG.ready || YG.busy) return Promise.resolve({ ok:false, why:"нет платформы" });
  YG.busy = true;
  return new Promise(resolve => {
    const done = (ok, why) => { YG.busy = false; resolve({ ok, why }); };
    try {
      if (kind === "rewarded" && YG.sdk.adv.showRewardedVideo){
        YG.sdk.adv.showRewardedVideo({
          callbacks: {
            onRewarded: () => done(true),
            onClose: () => done(YG.adsLeft.rewardGiven === true),
            onError: () => done(false, "ошибка рекламы")
          }
        });
      } else if (YG.sdk.adv.showFullscreenAdv){
        YG.sdk.adv.showFullscreenAdv({ callbacks: {
          onClose: (wasShown) => done(!!wasShown),
          onError: () => done(false, "ошибка рекламы")
        }});
      } else done(false, "нет рекламы");
    } catch(e){ done(false, String(e && e.message || e)); }
  });
}
/* реклама между забросами: не чаще раза в 4 минуты и не в первый час игры */
let ygAdAt = 0, ygCasts = 0;
function ygMaybeInterstitial(){
  if (!YG.ready || save.noAds) return;
  ygCasts++;
  if (ygCasts < 6) return;                       // первые забросы — без рекламы
  const now = Date.now();
  if (now - ygAdAt < 240000) return;
  ygAdAt = now;
  ygAd("interstitial");
}

/* --- покупки через Яндекс Pay --- */
/* что уже куплено: нерасходуемые покупки (карта, «без рекламы») проверяем при старте */
async function ygRestorePurchases(){
  if (!YG.payments) return [];
  try {
    const list = await YG.payments.getPurchases();
    for (const p of list || []){
      const prod = YG_PRODUCTS[p.productID];
      if (!prod) continue;
      if (prod.plan) passGrant(prod.plan);
      if (prod.id === "no_ads"){ save.noAds = 1; persist(); }
      if (prod.pearls){ /* расходуемые — выдадим через consume, чтобы не дублировать */ }
    }
    if (list && list.length){ if (typeof renderPaySheet === "function") renderPaySheet(); }
    return list || [];
  } catch(_){ return []; }
}
async function ygBuy(productId){
  const prod = YG_PRODUCTS[productId];
  if (!prod) return { ok:false, why:"нет такого товара" };
  if (!YG.payments) return { ok:false, why:"покупки недоступны" };
  try {
    const purchase = await YG.payments.purchase({ id: productId });
    // товар получен: выдаём и закрываем покупку (для расходуемых — consume)
    if (prod.plan){ passGrant(prod.plan); }
    else if (prod.pearls){ save.pearl = (save.pearl || 0) + prod.pearls; }
    else if (productId === "no_ads"){ save.noAds = 1; }
    persist(); syncPassBtn();
    if (typeof renderPaySheet === "function") renderPaySheet();
    if (typeof updateChips === "function") updateChips();
    try { await YG.payments.consumePurchase(purchase.purchaseToken); } catch(_) {}
    toast("Покупка прошла", prod.title + " — уже у тебя.", 2600);
    try { sfx.level(); } catch(_) {}
    return { ok:true };
  } catch(e){
    toast("Покупка не прошла", "Платёж отменён или не подтверждён. Деньги не списаны.", 2600);
    return { ok:false, why:String(e && e.message || e) };
  }
}

/* ============================================================================
   9.3: VK MINI APPS — второй канал (Яндекс Игры временно не принимают новые игры).
   Внутри ВК грузится VK Bridge, покупки идут через VK-платежи, реклама — через VK Ads.
   Снаружи ничего не грузится: остаются Яндекс SDK или свой платёжный сервис.
   ========================================================================== */
const VK_APP_ID = 54920865;                 // id мини-приложения «Тихая заводь: рыбалка»
const VK = { on:false, bridge:null, ready:false, user:null, adsLeft:0, busy:false, probed:false, env:"" };
const VK_PRODUCTS = {
  pass_week:  { kind:"item",  plan:"week",  title:"Клубная карта · неделя", price:99,   ph:"club_pass" },
  pass_month: { kind:"item",  plan:"month", title:"Клубная карта · месяц", price:249,  ph:"club_pass" },
  pass_year:  { kind:"item",  plan:"year",  title:"Клубная карта · год",   price:1790, ph:"club_pass" },
  pearls_100: { kind:"votes", votes:100,    title:"100 жемчуга", price:99 },
  pearls_500: { kind:"votes", votes:500,    title:"500 жемчуга", price:399 }
};
const vkOn = () => VK.ready;
let vkCasts = 0, vkAdAt = 0;

/* признаки того, что игра открыта внутри ВК: ?vk_app_id=, реферер vk.com, UA приложений ВК */
function vkEnv(){
  const q = location.search + location.hash;
  if (/(^|[?&#])vk_app_id=/.test(q)) return "vk_app_id";
  if (/vk\.(com|ru)/i.test(document.referrer)) return "referrer";
  if (/VKAndroidApp|VKApp|OKApp|VKiosApp/i.test(navigator.userAgent)) return "ua";
  if (window.__vkForce) return "forced";
  return "";
}
function vkLoad(){
  return new Promise(resolve => {
    if (window.vkBridge) return resolve(window.vkBridge);
    if (!vkEnv()) return resolve(null);
    VK.probed = true;
    const sc = document.createElement("script");
    sc.src = "https://unpkg.com/@vkontakte/vk-bridge/dist/browser.min.js";
    sc.onload = () => resolve(window.vkBridge || null);
    sc.onerror = () => resolve(null);
    document.head.appendChild(sc);
    setTimeout(() => resolve(window.vkBridge || null), 2000);   // не задерживаем старт игры
  });
}
async function vkInit(){
  const bridge = await vkLoad();
  if (!bridge) return false;
  try {
    VK.bridge = bridge;
    await bridge.send("VKWebAppInit", {});
    VK.on = true;
    try { const u = await bridge.send("VKWebAppGetUserInfo"); VK.user = { id:u.id, name:(u.first_name||"") }; } catch(_) {}
    VK.ready = true;
    VK.env = vkEnv() || "bridge";
    syncPayUI();
    return true;
  } catch(e){ VK.ready = false; return false; }
}
/* покупка: карта — товар (item), жемчуг — голоса (votes) */
async function vkBuy(productId){
  const prod = VK_PRODUCTS[productId];
  if (!prod) return { ok:false, why:"нет такого товара" };
  if (!VK.ready) return { ok:false, why:"не в ВК" };
  try {
    if (prod.kind === "votes"){
      const r = await VK.bridge.send("VKWebAppShowOrderBox", { type:"votes", item:String(prod.votes) });
      if (!r || !r.success) throw new Error("отменено");
      save.pearl = (save.pearl || 0) + prod.votes;
    } else {
      const r = await VK.bridge.send("VKWebAppShowOrderBox", { type:"item", item:prod.ph });
      if (!r || !r.success) throw new Error("отменено");
      passGrant(prod.plan);
    }
    persist(); syncPassBtn(); updateChips();
    if (typeof renderPaySheet === "function") renderPaySheet();
    toast("Покупка прошла", prod.title + " — уже у тебя.", 2600);
    try { sfx.level(); } catch(_) {}
    return { ok:true };
  } catch(e){
    toast("Покупка не прошла", "Платёж отменён. Деньги не списаны.", 2400);
    return { ok:false, why:String(e && e.message || e) };
  }
}
/* реклама ВК: за награду (reward) и межстраничная (interstitial) */
function vkAd(kind){
  if (!VK.ready || VK.busy) return Promise.resolve({ ok:false, why:"нет платформы" });
  VK.busy = true;
  const done = (ok, why) => { VK.busy = false; return { ok, why }; };
  const fmt = kind === "rewarded" ? "reward" : "interstitial";
  return VK.bridge.send("VKWebAppShowNativeAds", { format: fmt })
    .then(r => done(!!(r && r.result), r && r.result ? undefined : "рекламы нет"))
    .catch(e => done(false, String(e && e.error_data && e.error_data.error_reason || e)));
}

/* ============================================================================
   9.1: ОПЛАТА ПРИВИЛЕГИЙ
   Принцип: игра ничего не «включает» сама. Она просит сервер выдать ссылку на оплату
   и принимает доступ только в виде подписанного ключа, который выдаёт сервер после
   подтверждённой оплаты. Секретов в файле нет: подпись проверяется на сервере, игра
   лишь хранит ключ и показывает срок.
   ========================================================================== */
/* адрес платёжного сервиса: подставь свой при публикации */
const PAY = {
  api: (window.RYBALKA_PAY_API || "").replace(/\/+$/, ""),   // "" — оплата ещё не подключена
  status: "off"          // off | ok (после проверки ключа)
};
/* код игрока: по нему сервер связывает оплату с этим сохранением */
function playerCode(){
  if (save.playerCode) return save.playerCode;
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let raw = "";
  try {
    const seed = navigator.userAgent + "|" + screen.width + "x" + screen.height + "|" + Math.random();
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++){ h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
    for (let i = 0; i < 8; i++){ raw += A[Math.abs((h >>> (i*4)) ^ (i*97)) % A.length]; }
  } catch(_){ raw = "K7M2QP4Z"; }
  save.playerCode = raw.slice(0,4) + "-" + raw.slice(4,8);
  persist();
  return save.playerCode;
}
/* ключ, который сервер выдал после оплаты: {code, exp, token} */
function passCheck(){
  const P = save.pass;
  if (!P || !P.exp) return { ok:false, why:"нет ключа" };
  if (!P.code || P.code !== playerCode()) return { ok:false, why:"ключ от другого игрока" };
  const left = Math.ceil((P.exp - Date.now()) / 86400000);
  if (left <= 0) return { ok:false, why:"срок истёк", exp:P.exp };
  return { ok:true, left, plan:P.plan || "", exp:P.exp };
}
const passOn = () => passCheck().ok;
/* доступ к привилегиям: либо подписка, либо (по-старому) премиум-предмет за жемчуг */
const clubAccess = () => passOn() || premOwned();
/* выдать/обновить карту (вызывается только после успешной проверки на сервере) */
function passGrant(planId, code){
  const plan = (CLUB_PASS.plans.find(p => p.id === planId) || CLUB_PASS.plans[1]);
  const cur = save.pass && save.pass.exp > Date.now() ? save.pass.exp : Date.now();
  save.pass = { plan: plan.id, exp: cur + plan.days * 86400000, code: code || playerCode(), at: Date.now() };
  persist();
  return save.pass;
}

/* --- клиент оплаты: заявка → ссылка на оплату → проверка ключа --- */
/* статус витрины: подключён ли платёжный сервис */
const payReady = () => !!PAY.api;
const passPlan = (id) => CLUB_PASS.plans.find(p => p.id === id) || CLUB_PASS.plans[1];
const passDaysLeft = () => { const c = passCheck(); return c.ok ? c.left : 0; };

/* Открыть оплату. Без платёжного сервиса честно говорим, что он ещё не подключён. */
async function payStart(planId){
  const plan = passPlan(planId);
  // на Яндекс Играх оплата идёт только через их SDK (по правилам платформы)
  if (ygOn() && YG.payments){
    const prodId = Object.keys(YG_PRODUCTS).find(k => YG_PRODUCTS[k].plan === plan.id);
    if (prodId) return ygBuy(prodId);
  }
  // внутри ВК — покупки ВК (внешние платежи там запрещены правилами платформы)
  if (vkOn()){
    const vkId = Object.keys(VK_PRODUCTS).find(k => VK_PRODUCTS[k].plan === plan.id);
    if (vkId) return vkBuy(vkId);
  }
  if (!payReady()){
    toast("Оплата не подключена", "Платёжный сервис ещё не подключён к этой копии игры. Включим — карта откроется здесь же.", 3400);
    return { ok:false, why:"нет платёжного сервиса" };
  }
  try {
    const r = await fetch(PAY.api + "/pay/start", {
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ plan: plan.id, code: playerCode(), game: "rybalka", version: (typeof VERSION_STR === "string" ? VERSION_STR : "8.9") })
    });
    const j = await r.json();
    if (!j || !j.url) throw new Error("нет ссылки на оплату");
    // переходим на страницу оплаты платформы; возвращаемся по returnUrl
    location.href = j.url;
    return { ok:true, url:j.url };
  } catch (e) {
    toast("Не удалось начать оплату", "Проверь интернет и попробуй ещё раз.", 2600);
    return { ok:false, why:String(e && e.message || e) };
  }
}
/* Проверить оплату: просим сервер отдать ключ по коду игрока */
async function payCheck(showToast){
  if (ygOn()){
    const list = await ygRestorePurchases();
    if (passOn()){ if (showToast) toast("Клубная карта активна", "До " + passEndText(), 2400); return { ok:true, left:passCheck().left }; }
    if (showToast && (!list || !list.length)) toast("Покупок не найдено", "Если оплата прошла — подожди минуту и проверь снова.", 2600);
  }
  if (!payReady()){
    if (showToast) toast("Проверка недоступна", "Платёжный сервис не подключён — проверить нечего.", 2400);
    return { ok:false, why:"нет платёжного сервиса" };
  }
  try {
    const r = await fetch(PAY.api + "/pay/status?code=" + encodeURIComponent(playerCode()) + "&t=" + Date.now());
    const j = await r.json();
    if (j && j.ok && j.key){
      // сервер уже проверил оплату и подписал ключ — здесь только сохраняем
      save.pass = { plan:j.key.plan || "month", exp:j.key.exp, code:playerCode(), at:Date.now(), token:j.token || "" };
      persist(); updateChips();
      if (typeof renderClubCard === "function") renderClubCard();
      if (typeof renderPaySheet === "function") renderPaySheet();
      toast("Клубная карта активна", "Привилегии открыты до " + passEndText(), 3000);
      try { sfx.level(); } catch(_) {}
      return { ok:true, left:passCheck().left };
    }
    if (showToast) toast("Оплата не найдена", "Если деньги списались — напиши в поддержку, укажи код игрока " + playerCode() + ".", 4200);
    return { ok:false, why:(j && j.why) || "нет оплаты" };
  } catch (e) {
    if (showToast) toast("Сервер не ответил", "Попробуй проверить ещё раз через минуту.", 2600);
    return { ok:false, why:String(e && e.message || e) };
  }
}
/* Когда закончится карта словами */
function passEndText(){
  const c = passCheck();
  if (!c.ok) return "—";
  const d = new Date(c.exp);
  return d.toLocaleDateString("ru-RU", { day:"numeric", month:"long" });
}

/* ---------------- премиум-клуб: уровень, перки, клубный плёс ---------------- */
/* в сохранении премиум-предметы лежат как «p_premRod», в PREMIUM — как «premRod» */
const premKey = (id) => (id && id.slice(0,2) === "p_" ? id.slice(2) : id);
const isPrem = (id) => !!PREMIUM[premKey(id)];
const premOwned = () => (save.owned ? Object.keys(save.owned).some(slot =>
  (save.owned[slot]||[]).some(id => isPrem(id))) : false);
const premCount = () => {
  let n = 0;
  for (const k of PEARL_ITEMS){
    const slot = PREMIUM[k].kind;
    const list = (save.owned && save.owned[slot]) || [];
    if (list.includes(k) || list.includes("p_"+k)) n++;
  }
  return n;
};
const premEquipped = () => SLOTS.reduce((n, sl) =>
  n + (isPrem(save.equipped[sl.id]) && (save.owned[sl.id]||[]).includes(save.equipped[sl.id]) ? 1 : 0), 0);
/* уровень клуба: 1 за первый предмет, +1 за каждые два купленных, +1 если надето три и больше */
function clubLvl(){
  const n = premCount();
  if (!n) return 0;
  // каждый премиум-предмет даёт уровень; +1 бонус, если надето три и больше
  return Math.min(5, n + (premEquipped() >= 3 ? 1 : 0));
}
const clubRank = () => CLUB_RANKS[Math.min(5, clubLvl())];
/* 1 предмет / 2 предмета / 5 предметов */
const plur = (n, one, few, many) => {
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b > 1 && b < 5) return few;
  if (b === 1) return one;
  return many;
};
/* значение перка с учётом уровня (0, если перка нет) */
function perk(name){
  const r = clubRank();
  if (!r.perks[name]) return 0;
  return (PERK_VAL[name] || [])[clubLvl()] || 0;
}
/* клубный плёс — четвёртая точка водоёма, видна только участникам клуба */
const clubSpot = () => (clubAccess() && CLUB_SPOTS[save.loc]) ? CLUB_SPOTS[save.loc] : null;
const locSpots = () => { const L = LOCATIONS[save.loc] || LOCATIONS.lake; const c = clubSpot(); return c ? L.spots.concat([c]) : L.spots; };
/* ежедневный клубный набор: награда растёт с уровнем клуба */
const clubDayBase = () => CLUB_DAY.byLvl[clamp(clubLvl(), 0, 5)] || CLUB_DAY.byLvl[1];
const clubDayReward = () => {
  const b = clubDayBase(), k = 1 + perk("xp");
  const out = {
    coins: Math.round(b.coins * (1 + perk("coin"))),
    xp: Math.round(b.xp * k),
    pearl: b.pearl,
    baits: {}
  };
  for (const id in CLUB_DAY.baits) out.baits[id] = Math.round(CLUB_DAY.baits[id] * b.mul);
  return out;
};
/* клубный случай: раз в сутки с клубного плёса падает редкая приманка и немного монет.
   Приманку выбираем из тех, что берут рыбу именно этого плёса, — она сразу рабочая. */
const clubLuckReady = () => clubAccess() && save.clubLuck !== todayKey();
function clubSpotBaits(loc){
  const sp = CLUB_SPOTS[loc || save.loc];
  if (!sp) return [];
  const need = [];
  for (const k in sp.w){
    const F = FISH[k];
    if (F && BAITS[F.bait] && !need.includes(F.bait)) need.push(F.bait);
  }
  return need;
}
/* первый точный заброс на плёс за сутки — небольшой бонус, чтобы клубная точка звала */
const clubVisitReady = () => clubAccess() && save.clubVisit !== todayKey();
function clubVisit(power){
  if (!clubVisitReady()) return false;
  const sp = G.spot;
  if (!sp || sp.id.indexOf("prem_") !== 0) return false;
  const inZone = power >= sp.sweet[0] && power <= sp.sweet[1];
  if (!inZone) return false;
  save.clubVisit = todayKey();
  const coins = 120 + clubLvl()*30;
  save.coins = (save.coins||0) + coins;
  persist(); updateChips();
  sfx.level ? sfx.level() : sfx.buy();
  toast("Клубная точка", "Точный заброс на плёс: +"+coins+" монет. Раз в сутки.", 2800);
  return true;
}
function clubLuckRoll(spot){
  if (!clubAccess()) return false;
  if (!spot || spot.id.indexOf("prem_") !== 0) return false;
  if (!clubLuckReady()) return false;
  const list = clubSpotBaits(save.loc);
  if (!list.length) return false;
  save.clubLuck = todayKey();
  const bait = list[Math.floor(Math.random()*list.length)];
  const n = 10 + Math.floor(Math.random()*6) + clubLvl()*2;
  save.baits[bait] = (save.baits[bait]||0) + n;
  const coins = 40 + clubLvl()*12;
  save.coins = (save.coins||0) + coins;
  persist();
  G.clubLuck = { bait, n, coins, t: 4.2 };
  tone(880, 0.1, "sine", 0.06, 1240);
  return true;
}
/* сколько осталось до новой сутки: «3 ч 12 мин» */
function dayLeft(){
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate()+1, 0, 0, 0);
  const m = Math.max(1, Math.round((next - now)/60000));
  const h = Math.floor(m/60), mm = m % 60;
  return h > 0 ? h + " ч " + (mm ? mm + " мин" : "") : mm + " мин";
}
const clubDayReady = () => clubAccess() && save.clubDay !== todayKey();
/* новый день — новая клубная цель (сброс лениво, в карточке и при улове) */
function claimClubDay(){
  if (!clubAccess()){ toast("Только для клуба", "Открой «Клубную карту» — и все привилегии твои.", 2600); return false; }
  if (!clubDayReady()){ toast("Набор уже забран", "Новый набор будет завтра.", 1800); return false; }
  const rw = clubDayReward();
  save.clubDay = todayKey();
  save.coins = (save.coins||0) + rw.coins;
  save.xp = (save.xp||0) + rw.xp;
  save.pearl = (save.pearl||0) + rw.pearl;
  save.pearlTotal = (save.pearlTotal||0) + rw.pearl;
  for (const b in rw.baits) save.baits[b] = (save.baits[b]||0) + rw.baits[b];
  persist(); updateChips(); renderQuests();
  sfx.level ? sfx.level() : sfx.buy();
  toast("Клубный набор", "+"+rw.coins+" монет, +"+rw.xp+" опыта, +"+rw.pearl+" жемчуг и приманки", 3000);
  return true;
}

/* забрать клубную цель дня: 3 рыбы с клубного плёса */
function claimClubGoal(){
  if (!clubAccess()) return false;
  const cur = save.clubGoalDay === todayKey() ? (save.clubGoal||0) : 0;
  if (save.clubGoalDone || cur < CLUB_GOAL.count){ return false; }
  save.clubGoalDone = true;
  const coins = Math.round(CLUB_GOAL.coins * (1 + perk("coin")));
  const xp = Math.round(CLUB_GOAL.xp * (1 + perk("xp")));
  save.coins += coins; save.xp += xp;
  save.pearl = (save.pearl||0) + CLUB_GOAL.pearl;
  save.pearlTotal = (save.pearlTotal||0) + CLUB_GOAL.pearl;
  persist(); updateChips(); renderQuests();
  sfx.level ? sfx.level() : sfx.buy();
  toast("Клубная цель дня", "+"+coins+" монет, +"+xp+" опыта, +"+CLUB_GOAL.pearl+" жемчуг", 3000);
  return true;
}

const locDef  = () => LOCATIONS[save.loc] || LOCATIONS.lake;

/* ---------------- квесты ---------------- */
const QMAP = {}; QUESTS.forEach(q => QMAP[q.id] = q);
const todayKey = () => {
  const d = new Date();
  return d.getFullYear() + "-" + (d.getMonth()+1) + "-" + d.getDate();
};
/* ---------------- 7.5: наживка дня и лучший день водоёма ---------------- */
/* детерминированный «случайный» индекс по строке */
function hash32(str){
  let h = 2166136261;
  for (let i=0;i<str.length;i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return Math.abs(h);
}
/* приманки, которые вообще работают в этом водоёме */
function locBaitList(loc){
  const L = LOCATIONS[loc] || LOCATIONS.lake;
  const out = [];
  for (const sp of L.spots) for (const k in sp.w){
    const F = FISH[k];
    if (F && BAITS[F.bait] && !out.includes(F.bait)) out.push(F.bait);
  }
  out.sort();
  return out;
}
/* наживка дня: одна на водоём, меняется в полночь */
function baitOfDay(loc){
  const list = locBaitList(loc || save.loc);
  if (!list.length) return "worm";
  return list[hash32("bait-" + todayKey() + "-" + (loc || save.loc)) % list.length];
}
const baitDayOn = (id) => (id || save.equipped.bait) === baitOfDay();
/* лучший день водоёма */
const locDayOn = (loc) => LOC_DAY[loc || save.loc] === new Date().getDay();
const locDayName = (loc) => ["воскресенье","понедельник","вторник","среда","четверг","пятница","суббота"][LOC_DAY[loc || save.loc]];
/* дни до лучшего дня водоёма (0 — сегодня) */
function daysToLocDay(loc){
  const now = new Date().getDay(), want = LOC_DAY[loc || save.loc];
  return (want - now + 7) % 7;
}
/* ============================================================
   8.0: МЕХАНИКА ВОДОЁМОВ
   время суток · прикормка точки · зацепы · дуэли «стенка на стенку»
   ============================================================ */
/* тест-хук подмены часов: если null — берём локальное время игрока */
let DAY_FORCE = null;

function locMech(loc){
  return LOC_MECH[loc || save.loc] || LOC_MECH.lake;
}
/* текущий отрезок суток по локальным часам игрока */
function dayTimeNow(){
  const h = DAY_FORCE === null ? new Date().getHours() : DAY_FORCE;
  for (const k in DAYTIME){
    const d = DAYTIME[k];
    if (d.from < d.to){ if (h >= d.from && h < d.to) return k; }
    else { if (h >= d.from || h < d.to) return k; }
  }
  return "day";
}
const dayTimeName = (k) => (DAYTIME[k || dayTimeNow()] || DAYTIME.day).name;
/* водоём сейчас в своём лучшем времени? */
const windowOn = (loc) => locMech(loc).window === dayTimeNow();
/* следующий раз, когда откроется окно (для подсказки) */
function windowHint(loc){
  const m = locMech(loc), want = DAYTIME[m.window];
  if (windowOn(loc)) return "сейчас — лучшее время";
  const h = new Date().getHours();
  const left = (want.from - h + 24) % 24;
  return "лучше " + want.name + " (через " + left + " ч)";
}
/* множители за «своё время» — не трогают правила приманки и силы удочки */
function timeMults(loc){
  if (windowOn(loc)) return {klyov:WINDOW_K.klyov, size:WINDOW_K.size, coins:WINDOW_K.coins, pearl:WINDOW_K.pearl};
  return {klyov:OFF_WINDOW_K, size:1, coins:1, pearl:0};
}


/* ============================================================================
   8.7: СЕЗОНЫ, ПОГОДА КАК ФИЗИКА, ВОДА
   Сезон идёт по календарю игрока, но с шагом 14 дней от первого запуска:
   за месяц игры игрок увидит все четыре. Погода задаёт давление, ветер и
   видимость; из них считается клёв. Мутность делает важной толщину лески.
   ========================================================================== */
let SEASON_F_NOW = null;          // подмена сезона для тестов (null — по календарю)
let WIND_DIR_F = null;            // подмена направления ветра для тестов
/* сколько дней прошло с первого запуска игры */
function daysPlayed(){
  const t0 = save.firstDay || todayKey();
  const a = new Date(t0 + "T00:00:00"), b = new Date(todayKey() + "T00:00:00");
  return Math.max(0, Math.round((b - a) / 86400000));
}
function seasonNow(){
  if (SEASON_F_NOW) return SEASON_F_NOW;
  const idx = Math.floor(daysPlayed() / SEASON.days) % 4;
  return SEASON.order[idx];
}
const seasonDef = () => SEASON.defs[seasonNow()] || SEASON.defs.summer;
const seasonDay = () => (daysPlayed() % SEASON.days) + 1;
/* на водоёме лёд? южные (топь, лагуна, море) не замерзают */
function iceNow(loc){
  const L = loc || save.loc, env = locEnv(L);
  if (env.ice === "never") return false;
  if (env.ice === "always") return true;
  return seasonNow() === "winter";
}
const iceAnywhere = () => Object.keys(LOCATIONS).some(k => iceNow(k));

/* давление и ветер «сейчас» — из типа погоды (без случайности, чтобы прогноз не врал) */
function pressureNow(loc){
  const L = loc || save.loc;
  const ic = (L === save.loc) ? (save.weather && save.weather.type) : locMech(L).weather[0];
  const ph = WX_PHYS[ic] || WX_PHYS.overcast;
  return Math.round(ph.p + (locEnv(L).tempOff || 0) * -0.4);
}
function pressureTrend(loc){
  const L = loc || save.loc;
  const ic = (L === save.loc) ? (save.weather && save.weather.type) : locMech(L).weather[0];
  return (WX_PHYS[ic] || WX_PHYS.overcast).dP;
}
/* ветер: направление -1..1 (в берег / от берега) и сила 0..1 */
function windAt(loc){
  const L = loc || save.loc;
  const ic = (L === save.loc) ? (save.weather && save.weather.type) : locMech(L).weather[0];
  const ph = WX_PHYS[ic] || WX_PHYS.overcast;
  // направление медленно «гуляет» по часам, но остаётся в характере погоды
  const dir = (WIND_DIR_F != null) ? WIND_DIR_F
    : Math.sin((G.clock + 900) * 0.0007) * 0.8 + Math.sin((G.clock + 300) * 0.00023) * 0.2;
  return { power: ph.wind, dir: clamp(dir, -1, 1), onshore: dir > 0.15, offshore: dir < -0.15 };
}
/* клёв от погоды: давление + тренд + ветер + «жор после грозы» */
function weatherBite(loc){
  const L = loc || save.loc;
  let k = 1, why = [];
  const p = pressureNow(L);
  const pk = clamp((p - 1013) / 120, -0.14, 0.12);
  k *= 1 + pk;
  if (p >= 1018) why.push("давление высокое");
  else if (p <= 1004) why.push("давление низкое");
  const tr = pressureTrend(L);
  if (tr <= -1.5){ k *= 0.88; why.push("давление падает"); }
  else if (tr >= 0.5) why.push("давление растёт");
  const w = windAt(L);
  if (w.onshore){ k *= 1 + (WIND_K.onshore - 1) * w.power; why.push("ветер в берег"); }
  else if (w.offshore){ k *= 1 + (WIND_K.offshore - 1) * w.power; why.push("ветер с берега"); }
  if (afterStormOn()){ k *= AFTER_STORM.klyov; why.push("жор после грозы"); }
  return { k: clamp(k, 0.62, 1.55), why, p, wind: w };
}

/* «жор после грозы»: 40 минут после того, как гроза стихла (не чаще раза в 2 часа) */
function afterStormOn(){
  const st = save.stormAt;
  if (!st) return false;
  const mins = (Date.now() - st) / 60000;
  return mins >= 0 && mins < AFTER_STORM.mins;
}
function markStormEnded(){
  const prev = save.lastWeatherType;
  const cur = save.weather && save.weather.type;
  if (prev === "thunder" && cur !== "thunder") save.stormAt = Date.now();
  save.lastWeatherType = cur;
  persist();
}

/* прозрачность воды: паводок и цветение мутят, течение промывает */
function clarityAt(loc, depth){
  const L = loc || save.loc, env = locEnv(L), se = seasonDef();
  const ic = (L === save.loc) ? (save.weather && save.weather.type) : locMech(L).weather[0];
  const rain = ic === "rain" ? 0.45 : ic === "thunder" ? 0.55 : ic === "snow" ? 0.25 : 0;
  const algae = (se.algae || 0) * (seasonNow() === "summer" ? 1 : 0.6);
  let c = env.clarity * (1 - rain * 0.55) * (1 - algae * 0.22);
  c *= 0.85 + 0.30 * clamp((env.flow || 0) / 1.2, 0, 1);   // течение промывает
  if (depth > 8) c *= 0.88;                                 // в глубине темнее
  return clamp(c, 0.08, 1);
}
/* насколько леска заметна рыбе: тонкая в прозрачной воде — плюс к клёву */
function lineNoticeK(loc){
  const L = loc || save.loc;
  const cl = clarityAt(L, (spotEnv(G.spot, L) || {}).depth || 3);
  const dia = LINE_DIA[save.equipped.line] || 0.25;
  const k = 1 - 0.55 * cl * clamp((dia - 0.12) / 0.22, 0, 1.2);
  return { k: clamp(k, 0.72, 1.02), clarity: cl, dia };
}
/* вода для интерфейса */
/* 8.7б: где стоит рыба по глубине — температура и кислород по горизонтам.
   Летом у поверхности теплее на 2–3°, у дна на столько же холоднее — это и есть термоклин,
   из-за него в жару рыба уходит под термоклин, а карась остаётся в тёплых камышах. */
function waterLayers(loc){
  const L = loc || save.loc;
  const out = [];
  for (const d of [1.0, 3.0, 6.0, 9.0]){
    out.push({ depth: d, temp: waterTemp(L, d),
      oxy: +clamp(1.02 - clamp((waterTemp(L, d) - 20) / 14, 0, 1) * 0.5 +
        clamp(locEnv(L).flow || 0, 0, 1.5) * 0.12 - (d > 7 ? 0.06 : 0), 0.4, 1.2).toFixed(2) });
  }
  return out;
}
function waterInfo(loc, depth){
  const L = loc || save.loc;
  return { temp: waterTemp(L, depth || 3), clarity: clarityAt(L, depth || 3),
           level: 1, oxygen: oxygenAt(L), layers: waterLayers(L) };
}
/* кислород: теплее и «цветёт» — меньше, течение добавляет */
function oxygenAt(loc){
  const L = loc || save.loc, env = locEnv(L), se = seasonDef();
  const t = waterTemp(L, 3);
  let o = 1.05 - clamp((t - 20) / 12, 0, 1) * 0.55 - (se.algae || 0) * 0.18 + clamp(env.flow, 0, 1.5) * 0.12;
  return clamp(o, 0.45, 1.2);
}
const zamorOn = () => oxygenAt() < 0.6;

/* 8.7б: почему сейчас тихо — одна честная строка вместо «просто не клюёт».
   Порядок по «силе» причины: лёд → замор → сезон → мутность → давление. */
function waterWhy(loc){
  const L = loc || save.loc, sp = (L === save.loc) ? G.spot : null;
  const se = spotEnv(sp, L), seDef = seasonDef();
  if (iceNow(L)) return "Глухозимье: подо льдом рыба стоит в ямах и берёт на игру.";
  if (zamorOn()) return "Замор: в воде мало кислорода, рыба стоит у поверхности.";
  if (!sp && (seDef.fishK || 1) < 0.9) return "Зима: рыба экономна — лучше ловить в оттепель и по перволёдью.";
  const cl = clarityAt(L, se.depth);
  if (cl < 0.22) return "Вода мутная: рыба не видит наживку, попробуй пахучую (червь, тесто).";
  const wb = weatherBite(L);
  if (wb.k < 0.9 && wb.why.length) return "Погода не кормит: " + wb.why[0] + ".";
  return "";
}

/* ============================================================================
   8.6: ЖИВАЯ ВОДА — экология водоёма
   Идея: у водоёма есть паспорт (солёность, течение, прозрачность, тип), у точки —
   профиль дна (глубина в метрах, грунт, укрытия, трава, локальное течение), у вида —
   требования к этим условиям. Вид берётся только там, где он может жить (жёсткий порог).
   Ничего из 8.0/8.5 не отменяется: приманка, удочка, любимые точки работают как раньше.
   ========================================================================== */
const locEnv = (loc) => LOC_ENV[loc || save.loc] || LOC_ENV.lake;

/* температура воды: без сезонов (они в 8.7) — от типа воды, суток, погоды и глубины */
const TEMP_TYPE = {lake:0, pond:1, river:-2, brook:-4, sea:-1, lagoon:4, bog:3};
const TEMP_DAY  = {dawn:-1.5, day:2.5, dusk:0.5, night:-2};
const TEMP_WX   = {sun:1.5, cloud:0, rain:-1, fog:-1, storm:-1.5, moon:-1, snow:-5};
const tempOf = (loc) => (loc || save.loc) === save.loc ? weatherNow().icon : (WEATHER[locMech(loc).weather[0]] || WEATHER.sunny).icon;
const SEASON_WATER = {spring:9.5, summer:22.0, autumn:12.0, winter:2.6};
/* у каждой воды свой ход за сезон: ручей держит холод, топь греется, море инертно */
const SEASON_SWING = {lake:1.00, pond:1.15, river:0.85, brook:0.62, sea:0.45, lagoon:0.80, bog:1.20};
/* средняя температура открытой воды по сезонам — к ней тянется каждая вода */
const SEASON_MEAN = {spring:8.0, summer:19.5, autumn:11.5, winter:2.5};
function waterTemp(loc, depth){
  const env = locEnv(loc), d = dayTimeNow(), ic = tempOf(loc);
  // 8.7б: НЕ сдвигаем весь год одной поправкой (иначе ручей зимой «теплее» озера).
  // Считаем так: летом каждая вода уходит от общего среднего в свою сторону
  // (ручей холоднее, топь теплее), зимой — сходится к +2…+4 у всех, как в жизни.
  const se = seasonNow();
  const mean = SEASON_MEAN[se] || 13.5;
  const dev = (TEMP_TYPE[env.type] || 0) * 0.55 + (env.tempOff || 0) * 0.7;   // «характер» воды
  const open = (se === "winter") ? 0.35 : 1;                                   // зимой характер слабеет
  let t = mean + dev * open +
          (TEMP_DAY[d] || 0) * 0.55 + (TEMP_WX[ic] || 0) * 0.40;
  const swing = SEASON_SWING[env.type] || 1;                                   // инертное море медленнее
  if (se === "summer") t -= (1 - swing) * 3.2;                                 // летом инерция = прохлада
  if (se === "winter") t += (1 - swing) * 1.2;                                 // зимой инерция = тепло
  t -= clamp((depth - 1.5) * 0.22, 0, 4.2);  // глубина холоднее и стабильнее
  if (iceNow(loc)) t = Math.min(t, 4.2);     // подо льдом всегда около +2…+4
  return Math.round(clamp(t, 0.5, 31) * 10) / 10;
}

/* профиль дна точки; для свободного заброса — интерполяция по именованным точкам */
function spotEnv(spot, loc){
  const L = loc || save.loc;
  const tbl = SPOT_ENV[L] || SPOT_ENV.lake;
  if (!spot) return {depth:3, bottom:"sand", cover:0.15, weed:"none", flow:(locEnv(L).flow||0)};
  if (spot.env) return spot.env;
  const e = tbl[spot.id];
  if (e) return e;
  // 8.6: точка с профилем-заглушкой из LOCATIONS (глубина словом) — это обычное место воды
  if (!spot.free) return {depth:3, bottom:"sand", cover:0.12, weed:"none", flow:(locEnv(L).flow||0)};
  // свободный заброс: взвешиваем профили точек по расстоянию (как zonePool)
  const spots = Object.keys(tbl);
  let sw = 0, dep = 0, cov = 0, flo = 0;
  const bot = {}, wed = {};
  for (const id of spots){
    const sp = (LOCATIONS[L] && LOCATIONS[L].spots.find(x => x.id === id)) || (CLUB_SPOTS[L] && CLUB_SPOTS[L].id === id ? CLUB_SPOTS[L] : null);
    const pe = tbl[id];
    let wgt = 1;
    if (sp && sp.x != null && spot.x != null){
      const d = Math.hypot((spot.x - sp.x), (spot.y - sp.y) * 0.6);
      wgt = 1 / (0.10 + d*d);
    }
    sw += wgt; dep += pe.depth * wgt; cov += pe.cover * wgt; flo += pe.flow * wgt;
    bot[pe.bottom] = (bot[pe.bottom] || 0) + wgt;
    wed[pe.weed] = (wed[pe.weed] || 0) + wgt;
  }
  const top = (o) => Object.keys(o).sort((a,b) => o[b]-o[a])[0];
  return { depth: sw ? dep/sw : 3, bottom: top(bot) || "sand", cover: sw ? cov/sw : 0.15,
           weed: top(wed) || "none", flow: sw ? flo/sw : (locEnv(L).flow || 0) };
}

/* «полка с мягкими краями»: 1 в рабочем диапазоне [lo..hi], 0.25 у границ, 0 дальше.
   Трапеция, а не узкий колокол: вид переносит и мелководье, и яму — просто не любит крайности. */
function ecoTrap(x, a, o, b){
  const span = Math.max(0.1, b - a);
  const lo1 = o - 0.45 * (o - a);      // ниже этого — уже край
  const hi1 = o + 0.45 * (b - o);
  const lo0 = a - 0.15 * span;         // ниже этого — «не живёт»
  const hi0 = b + 0.35 * span;
  if (x >= lo1 && x <= hi1) return 1;
  // за рабочим диапазоном вид не исчезает, а «редко сюда заходит»: 0.15 — почти случайная рыба.
  // Полный ноль оставлен только там, где жить физически нельзя (соль, лёд, крайности температуры).
  if (x <= lo0 || x >= hi0) return 0.15;
  if (x < lo1) return clamp(0.15 + 0.85 * (x - lo0) / Math.max(1e-6, lo1 - lo0), 0.15, 1);
  return clamp(0.15 + 0.85 * (hi0 - x) / Math.max(1e-6, hi0 - hi1), 0.15, 1);
}
const inRange = (x, r) => x >= r[0] - 1e-9 && x <= r[1] + 1e-9;

/* 8.6: «своя приманка» — плюс совместимые насадки той же группы.
   Например лещ берёт и тесто, и перловку, и горох: игрок не заперт в одной насадке. */
function baitPairs(F){
  if (F._pairs) return F._pairs;
  const list = [F.bait];
  const B = BAITS[F.bait] || {};
  if (B.alt) for (const a of B.alt) if (BAITS[a]) list.push(a);
  return (F._pairs = list);
}
const onBaitFor = (F) => baitPairs(F).includes(save.equipped.bait);
window.__baitsFor = (id) => (FISH[id] ? baitPairs(FISH[id]) : []);

/* «может ли этот вид жить в этой точке» — 0..1.
   Жёсткими остаются только вещи, которые физически невозможны: солёность, лёд и
   крайности температуры. Всё остальное (глубина, грунт, течение, трава) — мягкие штрафы. */
function fishFit(id, spot, loc){
  const E = FISH_ECO[id];
  if (!E) return 0.5;                              // без профиля — не мешаем
  const L = loc || save.loc;
  const env = locEnv(L), se = spotEnv(spot, L);
  const salt = env.salt || 0;
  // морская рыба не живёт в пресном, пресная — в море
  const marine = salt >= ECO_RULE.saltMinMarine;
  if (marine && E.s[1] < 0.4) return 0;
  if (!marine && E.s[0] > 0.3) return 0;
  const tW = waterTemp(L, se.depth);
  let f0 = 1;
  // 8.7: подо льдом вода +2…+4 у всех — карась и линь зимой берут, но вяло,
  // а совсем теплолюбивые (сом, змееголов, басс) не клюют вовсе.
  const frozen = iceNow(L) || env.ice === "always";
  if (frozen){
    // 8.7: подо льдом градусник не различает виды — различает холодоустойчивость.
    // Сом, змееголов, басс в спячке — их нет. Карась и линь берут редко.
    if (E.t[0] >= 16) return 0;
    if (E.t[0] >= 12) f0 *= 0.50;   // карась, линь, карп подо льдом — в спячке
  } else {
    // 8.7б: холод не убивает вид — он вводит его в оцепенение. Поэтому за холодом
    // вида нет вовсе, есть только «берёт редко»: рыба в точке остаётся, но не кормится.
    // Полный ноль оставлен там, где вода физически смертельна: перегрев и духота.
    if (tW > E.t[2] + 6) return 0;
    // холодоустойчивость важнее градусника: налим и палия в холодной воде как дома,
    // карасю и линю холод — спячка, поэтому штраф у них жёстче
    const cold = E.t[0] <= 8 ? 0.80 : E.t[0] <= 9.5 ? 0.58 : E.t[0] <= 12 ? 0.46 : 0.30;
    if (tW < E.t[0] - 6) f0 *= cold;
    else if (tW < E.t[0] - 2) f0 *= Math.max(cold, 0.72);
  }
  // 8.7: вне «своего» тепла вид не «уходит из точки», а перестаёт кормиться —
  // поэтому термо-ловушку считаем от нижней границы вида, а не от фактических градусов.
  const tEff = (frozen || tW < E.t[1]) ? E.t[1] : tW;   // в холодной воде вид «в норме» по теплу
  let f = ecoTrap(se.depth, E.dep[0], E.dep[1], E.dep[2]) * ecoTrap(tEff, E.t[0], E.t[1], E.t[2]);
  if (!inRange(se.flow, E.f)) f *= 0.7;           // на струе стоячей рыбы мало
  // 8.6: штрафуем только если профиль дна известен (у старых тест-точек его нет)
  const BK = {sand:"s",gravel:"g",clay:"c",silt:"i",mud:"m",stone:"k",shell:"h",reef:"r"};
  const bk = BK[se.bottom];
  if (bk && !E.b.includes(bk)) f *= 0.55;
  const WK = {reeds:"r",grass:"g",snags:"n",rocks:"k",reef:"f",none:"0"};
  const wk = WK[se.weed];
  if (wk && !E.w.includes(wk)) f *= 0.82;
  f *= f0;
  f *= clamp(1 + 0.4 * E.c * (se.cover - 0.5), 0.7, 1.25);
  // 8.7: замор бьёт по холодолюбивым, карась и линь терпят
  if (oxygenAt(L) < 0.6 && E.t[2] <= 22) f *= 0.55;
  // в мутной воде хищник находит приманку хуже, чем мирная рыба по запаху
  const cl = clarityAt(L, se.depth);
  if (cl < 0.35 && FISH[id] && FISH[id].aggr >= 0.6) f *= 0.85;
  return clamp(f, 0, 1);
}
const fitOk = (id, spot, loc) => fishFit(id, spot, loc) >= ECO_RULE.minFit;

/* список видов, которые тут реально держатся (для подсказок), по убыванию «уверенности» */
function spotKinds(spot, loc, limit){
  const out = [];
  const se = spotEnv(spot, loc);
  for (const k in FISH_ECO){
    const f = fishFit(k, spot, loc);
    if (f >= 0.35) out.push({ id:k, f, name:(FISH[k] || {}).name || k });
  }
  out.sort((a,b) => b.f - a.f);
  return limit ? out.slice(0, limit) : out;
}
/* подпись точки: «3.4 м · песок · открытая вода» */
function spotEnvText(spot, loc){
  const se = spotEnv(spot, loc);
  const dep = se.depth >= 10 ? Math.round(se.depth) + " м" : (Math.round(se.depth*10)/10).toFixed(1).replace(".", ",") + " м";
  return dep + " · " + (ECO_BOT_RU[se.bottom] || "дно") + " · " + (ECO_WED_RU[se.weed] || "открытая вода");
}

/* ---- 8.5: любимые места рыбы ---------------------------------------------
   У каждой точки водоёма есть «свои» виды: там они держатся чаще.
   Правила приманки и силы удочки это не отменяет — только подсказывает, куда бросать. */
function fishHomeSpots(id, locKey){
  const L = LOCATIONS[locKey || save.loc] || LOCATIONS.lake;
  const out = [];
  for (const sp of L.spots) if (sp.w && sp.w[id]) out.push(sp);
  // «дом» — точка, где вид весит больше всего относительно своего обычного веса
  out.sort((a,b) => (b.w[id]/avgW(b)) - (a.w[id]/avgW(a)));
  return out;
}
/* любимые точки вида во всех водоёмах: [{loc, name}] — для карточки дневника */
function fishHomes(id, limit){
  const out = [];
  for (const lk in LOCATIONS){
    const home = fishHomeSpots(id, lk)[0];
    if (home) out.push({ loc: lk, locName: LOCATIONS[lk].name, name: home.name });
  }
  return limit ? out.slice(0, limit) : out;
}
const avgW = (sp) => {
  const v = Object.values(sp.w || {});
  return v.length ? v.reduce((a,b) => a+b, 0)/v.length : 1;
};
/* точка считается любимой для вида, если она входит в топ-1 по «плотности» */
function isFishHome(id, sp){
  if (!sp || !sp.w || !sp.w[id]) return false;
  // свободный заброс: считаем «домом» ближайшую именованную точку — так любимые места
  // работают и когда игрок бросает в любое место воды
  if (sp.free && sp.x != null){
    const L = LOCATIONS[save.loc] || LOCATIONS.lake;
    let best = null, bd = 1e9;
    for (const q of L.spots){
      const d = Math.hypot((sp.x - q.x)*W, (sp.y - q.y)*H);
      if (d < bd){ bd = d; best = q; }
    }
    if (best) return isFishHome(id, best);
  }
  const home = fishHomeSpots(id)[0];
  return !!home && home.id === sp.id;
}

/* ---- 8.5: прогноз клёва ---------------------------------------------------
   Складываем то, что игрок видит своими глазами: время суток водоёма, выход рыбы, погоду,
   прикормку и свою точность заброса. Правила приманки и силы удочки не учитываем —
   они и так видны в карточке вида. */
function biteForecast(loc){
  loc = loc || save.loc;
  const m = locMech(loc);
  const wt = (loc === save.loc) ? weatherNow() : (WEATHER[m.weather[0]] || WEATHER.sunny);
  let k = 1; const why = [];
  if (windowOn(loc)){ k *= WINDOW_K.klyov; why.push("своё время"); } else { k *= OFF_WINDOW_K; why.push("не своё время"); }
  if (waveOn(loc)){ k *= 1/BITE_WAVE.klyov; why.push("выход рыбы"); }
  // 8.7: вместо «множителя погоды» — давление, ветер и жор после грозы
  const wb = weatherBite(loc);
  k *= wb.k;
  for (const r of wb.why) if (!why.includes(r)) why.push(r);
  const se = SEASON.defs[seasonNow()];
  k *= se.fishK;
  if (seasonNow() === "autumn") why.push("осенний жор");
  if (seasonNow() === "winter") why.push("зима: клёв вялый");
  if (seasonNow() === "summer" && (m.stream || 0) < 0.3) why.push("летняя жара");
  if (loc === save.loc){
    const ln = lineNoticeK(loc);
    if (ln.k < 0.95 && ln.clarity > 0.5) why.push("толстая леска видна");
    if (ln.k > 0.99 && ln.clarity > 0.6) why.push("тонкая леска не видна");
    if (handActive()){ k *= HAND.klyov; why.push("прикормка"); }
    if (zamorOn()) why.push("замор: рыба у поверхности");
  }
  // мутная вода: хищник хуже находит приманку
  if (clarityAt(loc, 3) < 0.35) k *= 0.92;
  if (m.stream >= 0.5) k *= 1 / (1 + m.stream*0.12);
  const score = clamp((k - 0.7) / 0.75, 0, 1);
  const level = score >= 0.78 ? "great" : score >= 0.55 ? "good" : score >= 0.33 ? "fair" : "poor";
  return { score, level, def: FORECAST[level], why, mult: k };
}

/* 8.5: подмена «сейчас» для тестов прогноза (null — реальные часы устройства) */
let WAVE_FORCE = null;
const waveNowHour = () => WAVE_FORCE === null ? new Date().getHours() : WAVE_FORCE;
/* ---- 8.5: выход рыбы —«час активности» водоёма -------------------------------
   Часы выбираются детерминированно: одинаковые у всех, не «моргают» при перезагрузке.
   Водоём получает один слот каждые `every` часов; конкретный час зависит от даты и водоёма,
   поэтому у каждого дня свой «выход рыбы» и есть смысл заглянуть в водоём в разное время. */
function waveSeed(loc, d){
  const key = todayKey() + "|" + (loc || save.loc);
  let h = 0;
  for (const ch of key) h = (h*31 + ch.charCodeAt(0)) % 99991;
  return (h + d * 7) % 24;
}
/* слот буя по локальным часам (UTC+3 у игрока — берём локальные часы устройства) */
function waveHourNow(){
  const d = new Date();
  const slot = Math.floor(waveNowHour() / BITE_WAVE.every) * BITE_WAVE.every;
  return slot + (waveSeed(null, slot) % BITE_WAVE.every);
}
/* сколько минут осталось до конца окна (для чипа в HUD) */
const waveMinsLeft = () => {
  const d = new Date();
  return Math.max(1, BITE_WAVE.dur - d.getMinutes());
};
function waveSlot(loc, d){
  const slot = Math.floor(d/BITE_WAVE.every)*BITE_WAVE.every;
  return (slot + (waveSeed(loc, slot) % BITE_WAVE.every)) % 24;
}
function waveOn(loc){
  const d = new Date();
  if (waveSlot(loc, waveNowHour()) !== waveNowHour()) return false;
  return (d.getMinutes() % BITE_WAVE.dur) < BITE_WAVE.dur;
}
/* когда следующий выход: «через 1 ч 20 мин» */
function waveIn(loc){
  const d = new Date();
  const nowMin = waveNowHour()*60 + d.getMinutes();
  for (let k=0;k<8;k++){
    const base = Math.floor(waveNowHour()/BITE_WAVE.every) + k;
    const slotH = base * BITE_WAVE.every % 24;
    const h = (slotH + (waveSeed(loc, (base*BITE_WAVE.every)) % BITE_WAVE.every)) % 24;
    let at = h*60;
    if (at <= nowMin) at += 24*60;
    const diff = at - nowMin;
    if (diff >= 0) return Math.max(0, diff);
  }
  return 180;
}
const fmtMins = m => m >= 60 ? Math.floor(m/60) + " ч " + (m%60 ? (m%60) + " мин" : "").trim() : m + " мин";
const waveMult = (loc) => waveOn(loc) ? 1 / BITE_WAVE.klyov : 1;
/* прогноз на ближайшие часы: [час, будет ли выход] — для панели прогноза */
function waveForecast(loc, n){
  const out = [];
  for (let k=0;k<(n||6);k++){
    const base = Math.floor(waveNowHour()/BITE_WAVE.every) + k;
    const slotH = (base * BITE_WAVE.every) % 24;
    const h = (slotH + (waveSeed(loc, base*BITE_WAVE.every) % BITE_WAVE.every)) % 24;
    out.push({h, on: h === waveNowHour() && waveOn(loc)});
  }
  return out;
}

/* ---- прикормка: игрок «сыплет» её в точку и получает ускорение клёва ---- */
function handActive(){
  if (!save.hand) return false;
  return save.hand.until > Date.now() && save.hand.loc === save.loc;
}
function handLeft(){
  if (!handActive()) return 0;
  return Math.max(0, Math.round((save.hand.until - Date.now())/1000));
}
function handCost(){
  return (locMech().hand || HAND).coins || 12;
}
function dropHand(){
  if (G.state !== "idle" && G.state !== "aim"){ toast("Поздно", "Прикормку сыплют до заброса — из лодки или с берега.", 1800); return false; }
  const cost = handCost(), m = locMech().hand || HAND;
  if ((save.coins || 0) < cost){ toast("Не хватает монет", "Прикормка стоит " + cost + " монет.", 1800); return false; }
  save.coins -= cost;
  save.hand = {loc: save.loc, until: Date.now() + HAND.dur*1000, gain: m.gain || HAND.gain};
  save.handLocs = save.handLocs || {};
  save.handLocs[save.loc] = true;
  questBump("handMark");
  persist(); updateChips(); renderHandBtn();
  sfx.buy ? sfx.buy() : sfx.tap();
  buzz(18);
  // визуально: облако прикормки в точку
  const x = G.spot ? spotPos(G.spot).x : W*0.5, y = G.spot ? G.baseY : geo().surfaceY + H*0.1;
  for (let i=0;i<22;i++){
    const a = -Math.PI/2 + rnd(-1.1, 1.1), spd = rnd(60, 190);
    G.particles.push({x: x + rnd(-10,10), y: y, vx: Math.cos(a)*spd*0.55, vy: Math.sin(a)*spd*0.5,
      life: rnd(0.5,1.1), r: rnd(1.2,3.0), color: "rgba(255,225,150,"});
  }
  for (let i=0;i<3;i++) setTimeout(()=>ring(x), i*90);
  floatText("прикормка", x, y - 48, "#ffe9a3");
  toast("Прикормка в воде", "Клёв +" + Math.round(((m.gain||HAND.gain))*100) + "% на 1,5 мин. Только в этом водоёме.", 2400);
  return { ok:true, cost, loc: save.loc, gain: m.gain || HAND.gain };
}
function renderHandBtn(){
  const b = $("handBtn");
  if (!b) return;
  const left = handLeft();
  b.classList.toggle("live", left > 0);
  const lbl = b.querySelector("b");
  if (lbl) lbl.textContent = left > 0 ? Math.ceil(left/60) + " мин" : String(handCost());
  b.title = left > 0
    ? "Прикормка работает ещё " + (left > 60 ? Math.ceil(left/60) + " мин" : left + " с")
    : "Прикормка точки: клёв +" + Math.round(((locMech().hand||HAND).gain||HAND.gain)*100) + "% на 1,5 минуты за " + handCost() + " монет";
}

/* ---- зацепы: бросок в коряжник может посадить снасть ---- */
const SNAGST = { wobble:0, phase:"", t:0, tryT:0, taps:0 };
function snagChanceHere(){
  // 8.6: шанс зацепа — следствие дна и укрытий, а не «свойства водоёма»
  const se = spotEnv(G.spot, save.loc);
  // точка без профиля дна (служебная/тестовая) — зацепов нет
  if (!se.weed && !se.bottom) return 0;
  if (se.weed === "none" && se.cover < 0.35) return 0;
  // у каждого водоёма свой «характер зацепов»: топь цепляет коряги, горы — камни (реже)
  const snagBase = locEnv(save.loc).snagBase || 0.10;
  let k = (0.20 + 0.80 * snagBase) * (0.35 + 0.65 * se.cover) *
    (se.weed === "snags" ? 1.25 : se.weed === "reeds" || se.weed === "grass" ? 1.0 : 0.7);
  if (se.bottom === "stone") k += 0.02;
  if (se.bottom === "reef") k += 0.01;
  // точный заброс в «сладкую» зону меньше цепляется
  if ((G.acc || 0) > 0.72) k *= 0.6;
  const base = locMech().snag || 0;
  if (base > 0) k = Math.max(k, base * 0.55);     // историческая «вязкость» водоёма остаётся полом
  return clamp(k, 0, 0.42);
}
function trySnag(){
  if (G.state !== "waiting" && G.state !== "casting") return false;
  const ch = snagChanceHere();
  if (!ch || Math.random() > ch) return false;
  enterSnag();
  return true;
}
/* топкие воды цепляются за коряги, река и горы — за камни (реже) */
const snagWaterOn = () => (locMech().snag || 0) > 0;
const snagIsLogs = () => ["brown","dark"].includes(locMech().water);
function enterSnag(){
  SNAGST.phase = "stuck"; SNAGST.t = 0; SNAGST.taps = 0; SNAGST.tryT = 0; SNAGST.wobble = 1;
  G.fish = null;
  save.snagTotal = (save.snagTotal || 0) + 1;
  questBump("snagTry");
  setState("snag");
  sfx.snap ? tone(120, 0.16, "square", 0.05) : 0;
  buzz(30);
  toast("Зацеп!", "Поплавок сел в коряги. Дёргай коротко — или тяни сильно, но рискуешь.", 2400);
  coachTip("c_snag");
  renderSnagBar();
}
function renderSnagBar(){
  const b = $("snagBar");
  if (!b) return;
  const on = G.state === "snag" && SNAGST.phase === "stuck";
  b.classList.toggle("on", on);
  if (!on) return;
  const p = $("snagTaps");
  if (p){
    const need = 3;
    p.innerHTML = "";
    for (let i=0;i<need;i++){
      const d = document.createElement("i");
      d.className = "st" + (SNAGST.taps > i ? " on" : "");
      p.appendChild(d);
    }
  }
  const lb = $("snagHint");
  if (lb) lb.textContent = SNAGST.taps >= 2 ? "ещё разок — и вырвем" : "дёргай, чтобы освободить";
}
function snagTap(power){
  if (G.state !== "snag" || SNAGST.phase !== "stuck") return;
  if (SNAGST.cool > 0) return;
  SNAGST.cool = 0.20;      // анти-дребезг: одно нажатие — одно подёргивание
  SNAGST.wobble = 1;
  SNAGST.taps++;
  ring(G.bobX); ring(G.bobX + rnd(-6,6));
  if (power === "yank"){
    // сильный рывок: либо сразу на свободе, либо обрыв
    if (Math.random() < 0.58){
      SNAGST.phase = "free";
      SNAGST.t = 0;
      sfx.splash ? sfx.splash() : 0; buzz(40);
      burst(G.bobX, wY(), 16, 220);
      save.unsnags = (save.unsnags || 0) + 1;
      questBump("unsnag");
      persist();
      toast("Вырвал!", "Снасть цела, коряга отпустила.", 1700);
    } else {
      const loseBait = Math.random() < SNAG.loseBait;
      const breakLine = Math.random() < SNAG.breakLine;
      if (breakLine){
        save.breaks = (save.breaks || 0) + 1; questOnBreak();
        G.flash = 0.45; G.shake = 12;
        sfx.snap ? sfx.snap() : 0; buzz(60);
        toast("Коряга сильнее", "Леска не выдержала рывка. Снасть цела, приманка потеряна.", 2200);
      } else {
        toast("Зацеп держит", loseBait ? "Приманка осталась в коряге." : "Снасть цела — попробуй мягче.", 1900);
      }
      if (loseBait) consumeBaitOnSnag();
      persist();
    }
    renderSnagBar();
    return;
  }
  // мягкое подёргивание — 3 из 3 и снасть свободна
  if (SNAGST.taps >= 3){
    SNAGST.phase = "free"; SNAGST.t = 0;
    save.unsnags = (save.unsnags || 0) + 1;
    questBump("unsnag");
    if (Math.random() < 0.35) consumeBaitOnSnag();
    persist();
    sfx.splash ? sfx.splash() : 0;
    floatText("свободно", G.bobX, wY() - 44, "#a7f0bd");
    setTimeout(() => { if (G.state === "snag") setState("aim"); renderSnagBar(); }, 380);
  }
  renderSnagBar();
}
function consumeBaitOnSnag(){
  const id = save.equipped.bait;
  if (!save.baits) save.baits = {};
  save.baits[id] = Math.max(0, (save.baits[id] || 0) - 1);
}
function updateSnag(dt){
  if (G.state !== "snag") SNAGST.cool = 0;
  if (SNAGST.cool > 0) SNAGST.cool = Math.max(0, SNAGST.cool - dt);
  SNAGST.wobble = Math.max(0, SNAGST.wobble - dt*1.6);
  if (G.state !== "snag") return;
  if (SNAGST.phase === "free"){
    SNAGST.t += dt;
    if (SNAGST.t > 0.7){ SNAGST.phase = ""; if (G.state === "snag") setState("aim"); renderSnagBar(); }
    return;
  }
  SNAGST.t += dt;
  // сама собой коряга отпускает редко: только если долго тянуть
  if (SNAGST.t > SNAG.freeAfter && Math.random() < dt*0.6){
    SNAGST.phase = "free"; SNAGST.t = 0; SNAGST.taps = 3;
    floatText("коряга отпустила", G.bobX, wY() - 40, "#ffe9a3");
    renderSnagBar();
  }
}

/* ---- 8.5: сигнальный шар ---------------------------------------------------
   Во время буя клёва у поплавка иногда всплывает сигнальный шар: пара секунд внимания —
   и он твой (монеты + опыт + счёт в квест). Пропустил — утонул, ничего страшного. */
const BUOY = { x:0, y:0, t:0, ttl:0, active:false, bob:0, taken:0 };
function maybeSpawnBuoy(){
  if (!waveOn(save.loc)) return false;
  if (BUOY.active) return false;
  if (Math.random() > 0.22) return false;      // не в каждом забросе
  BUOY.active = true; BUOY.t = 0; BUOY.ttl = 4.2;
  // шар всплывает рядом, но не под поплавком: сбоку и чуть ниже по воде
  const side = G.bobX > W*0.5 ? -1 : 1;
  BUOY.x = clamp(G.bobX + side*rnd(86, 148), W*0.08, W*0.92);
  BUOY.y = wY() + rnd(2, 22);
  BUOY.bob = 0;
  // подпись держим внутри экрана: у правого края уезжает за кадр
  floatText("шар!", clamp(BUOY.x, W*0.16, W*0.84), BUOY.y - 34, "#8ef0d8");
  return true;
}
function takeBuoy(){
  if (!BUOY.active) return false;
  BUOY.active = false; BUOY.taken = (BUOY.taken||0) + 1;
  const coins = 40 + Math.round(levelInfo().lvl * 6);
  save.coins += coins; save.xp += 12;
  questBump("signal");
  persist(); updateChips();
  burst(BUOY.x, BUOY.y, 18, 200); ring(BUOY.x);
  sfx.buy ? sfx.buy() : sfx.tap();
  floatText("+" + coins + " монет", BUOY.x, BUOY.y - 30, "#ffe9a3");
  toast("Сигнальный шар", "Внутри " + coins + " монет и немного опыта.", 1600);
  return true;
}
function updateBuoy(dt){
  if (!BUOY.active) return;
  BUOY.t += dt; BUOY.bob += dt;
  if (BUOY.t > BUOY.ttl){
    BUOY.active = false;
    floatText("шар утонул", BUOY.x, BUOY.y - 26, "#8fb3c4");
  }
}
function drawBuoy(g){
  if (!BUOY.active) return;
  const k = 1 - clamp(BUOY.t / BUOY.ttl, 0, 1);
  const y = BUOY.y + Math.sin(BUOY.bob*2.4)*3;
  ctx.save();
  // круги на воде под шаром
  for (let i=0;i<2;i++){
    const ph = ((BUOY.bob*0.8 + i*0.5) % 1);
    ctx.beginPath();
    ctx.ellipse(BUOY.x, y + 8, 10 + ph*26, 4 + ph*9, 0, 0, Math.PI*2);
    ctx.strokeStyle = "rgba(200,240,255," + (0.30*(1-ph)*k) + ")";
    ctx.lineWidth = 1.4; ctx.stroke();
  }
  // сам шар: бирюзовый сигнальный буёк, светится — его не спутать с поплавком
  const glow = 0.55 + 0.45*Math.sin(BUOY.bob*3.4);
  ctx.beginPath(); ctx.arc(BUOY.x, y, 15, 0, Math.PI*2);
  ctx.fillStyle = "rgba(120,240,225," + (0.10 + glow*0.12) + ")"; ctx.fill();
  ctx.beginPath(); ctx.arc(BUOY.x, y, 9, 0, Math.PI*2);
  const bg = ctx.createRadialGradient(BUOY.x-3, y-3.5, 1.5, BUOY.x, y, 10);
  bg.addColorStop(0, "#f2fffd"); bg.addColorStop(0.5, "#6fe9dc"); bg.addColorStop(1, "#159c96");
  ctx.fillStyle = bg; ctx.fill();
  ctx.strokeStyle = "rgba(220,255,250,"+(0.45 + glow*0.4)+")"; ctx.lineWidth = 1.4; ctx.stroke();
  // антенка с маячком
  ctx.beginPath(); ctx.moveTo(BUOY.x, y - 8); ctx.lineTo(BUOY.x, y - 15);
  ctx.strokeStyle = "rgba(230,255,250,.75)"; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.beginPath(); ctx.arc(BUOY.x, y - 16, 2.6, 0, Math.PI*2);
  ctx.fillStyle = "rgba(255,250,200," + (0.55 + 0.45*Math.sin(BUOY.bob*7)) + ")"; ctx.fill();
  ctx.restore();
}

/* ---- дуэли: 12 забросов против соперника, приз — жемчуг ---- */
function duelRival(loc){
  const id = DUEL.locs[loc || save.loc];
  return id ? {id, ...DUEL.rivals[id]} : null;
}
const duelLocs = () => Object.keys(DUEL.locs);
function duelPerDayLeft(){
  if (save.duelPearlDay !== todayKey()) return DUEL.pearlPerDay;
  return Math.max(0, DUEL.pearlPerDay - (save.duelPearlToday || 0));
}
const duelReady = () => clubAccess();
/* результат одного заброса противника: стабильно, без «скилла» */
function rivalScore(rival){
  // соперник растёт вместе с игроком — дуэль не «бесплатная»
  const grow = 1 + 0.035 * levelInfo().lvl;
  const base = rival.perCast * grow * (1 + 0.10*Math.sin((save.duelLosses||0) + save.casts*0.7));
  return Math.round(base * rnd(0.72, 1.28));
}
function startDuel(){
  const rival = duelRival();
  if (!rival){ toast("Дуэлей нет", "Дуэли проходят в Топи, Горном озере и Лагуне.", 1800); return; }
  if (!duelReady()){ toast("Только для клуба", "Дуэли — премиум-механика: собери клубную снасть за жемчуг.", 2600); return; }
  if (G.state !== "idle" && G.state !== "aim"){ toast("Сначала закончи заброс", "Дуэль начинается с чистой сцены.", 1600); return; }
  closeAllSheets();
  G.duel = { rival, casts: DUEL.casts, left: DUEL.casts, mine: 0, theirs: 0, log: [], active: true };
  save.rivalSeen = save.rivalSeen || {}; save.rivalSeen[rival.id] = true;
  persist(); renderDuelChip();
  sfx.level ? sfx.level() : sfx.tap();
  toast("Дуэль: " + rival.name, "12 забросов. Считается вес рыбы. Побеждаешь — жемчуг.", 3200);
  if (G.spot){ setState("aim"); }
}
/* итог дуэли: вызывается после каждого улова */
function duelOnCatch(f){
  const d = G.duel;
  if (!d || !d.active || f.junk) return;
  d.left = Math.max(0, d.left - 1);
  d.mine += f.weight;
  const r = rivalScore(d.rival);
  d.theirs += r;
  d.log.push({ me: f.weight, rival: r, name: f.name });
  renderDuelChip();
  if (d.left <= 0) setTimeout(endDuel, 900);
}
function endDuel(){
  const d = G.duel;
  if (!d || !d.active) return;
  d.active = false;
  const win = d.mine > d.theirs;
  const draw = d.mine === d.theirs;
  let pearls = 0;
  const perDayLeft = duelPerDayLeft();
  if (win && perDayLeft > 0){
    pearls = Math.min(DUEL.pearlWin, perDayLeft);
    save.pearl = (save.pearl || 0) + pearls;
    save.pearlTotal = (save.pearlTotal || 0) + pearls;
    if (save.duelPearlDay !== todayKey()){ save.duelPearlDay = todayKey(); save.duelPearlToday = 0; }
    save.duelPearlToday = (save.duelPearlToday || 0) + pearls;
  }
  if (win){
    save.duelWins = (save.duelWins || 0) + 1;
    questBump("duelWin");
    const coins = Math.round(120 + (d.mine/1000) * 14);
    save.coins += coins;
  } else {
    save.duelLosses = (save.duelLosses || 0) + 1;
  }
  save.duelDay = todayKey();
  persist(); updateChips();
  const el = $("duelCard");
  if (el){
    el.querySelector(".dc-rival").textContent = d.rival.name;
    el.querySelector(".dc-me").textContent = fmtKg(d.mine);
    el.querySelector(".dc-him").textContent = fmtKg(d.theirs);
    el.querySelector(".dc-verdict").textContent = win ? "победа" : draw ? "ничья" : "поражение";
    el.querySelector(".dc-verdict").className = "dc-verdict " + (win ? "win" : draw ? "draw" : "lose");
    el.querySelector(".dc-prize").innerHTML = win
      ? (pearls ? ICONS.pearl + " <b>+" + pearls + " жемчуг</b>" : "Жемчуг на сегодня уже собран — но победа засчитана")
      : "Жемчуг только за победу. Попробуй ещё раз после следующего заброса.";
    el.querySelector(".dc-list").innerHTML = d.log.map((x,i) =>
      '<div class="dl"><span>' + (i+1) + '</span><b>' + fmtKg(x.me) + '</b><i>vs</i><b class="r">' + fmtKg(x.rival) + '</b></div>').join("");
    el.classList.add("on");
  }
  sfx.win ? sfx.win(win ? "legendary" : "common") : sfx.tap();
  buzz(win ? 40 : 20);
  renderDuelChip();
}
function closeDuelCard(){
  const el = $("duelCard"); if (el) el.classList.remove("on");
  const d = G.duel;
  if (d && !d.active) G.duel = null;
  renderDuelChip();
}
function renderDuelChip(){
  const el = $("duelChip");
  if (!el) return;
  const d = G.duel;
  if (!d || !d.active){ el.classList.remove("on"); return; }
  el.classList.add("on");
  // 8.5: чип буя уступает место чипу дуэли, чтобы не наезжали друг на друга
  const wc = $("waveChip"); if (wc) wc.classList.remove("on");
  el.innerHTML = '<span class="dc-vs">vs</span><b>' + d.rival.name.split(" ")[0] + '</b>' +
    '<span class="dc-score">' + fmtKg(d.mine) + ' : ' + fmtKg(d.theirs) + '</span>' +
    '<i>' + d.left + '</i>';
  el.title = "Дуэль: осталось забросов " + d.left + ". Твой вес " + fmtKg(d.mine) + ", у соперника " + fmtKg(d.theirs) + ".";
}

/* начисление прогресса «событийным» квестам (8.0) */
function questBump(kind, n){
  for (const q of QUESTS){
    const g = q.goal;
    if (g.type !== kind && !(kind === "unsnag" && g.type === "unsnag")) continue;
    if (questDone(q.id)) continue;
    const st = questState(q.id);
    st.prog = (st.prog || 0) + (n || 1);
  }
  persist();
}
function questState(id){
  if (!save.quests[id]) save.quests[id] = {prog:0, done:false};
  return save.quests[id];
}
function questDone(id){ return !!(save.quests[id] && save.quests[id].done); }
function questProgress(q){
  const st = questState(q.id);
  const g = q.goal;
  // 8.5: счётчики «примет»
  if (["wave","home","signal","waveBest"].includes(g.type)) return {cur: Math.min(st.prog||0, g.n), max: g.n};
  if (g.type === "species") return {cur: g.list.filter(k => save.caught[k]).length, max: g.list.length};
  if (g.type === "allLocs"){
    const n = Object.keys(LOCATIONS).filter(l => save.locsCaught[l]).length;
    return {cur: Math.min(n, g.n), max: g.n};
  }
  if (g.type === "questsDone"){
    const n = QUESTS.filter(x => questDone(x.id)).length;
    return {cur: Math.min(n, g.n), max: g.n};
  }
  if (g.type === "speciesCount"){
    const n = g.list.reduce((sum, k) => sum + ((save.caught[k] && save.caught[k].n) || 0), 0);
    return {cur: Math.min(n, g.n), max: g.n};
  }
  if (g.type === "hand"){
    const n = Object.keys(save.handLocs || {}).length;
    return {cur: Math.min(n, g.locs), max: g.locs};
  }
  if (g.type === "speciesAny") return {cur: Math.min(st.prog, g.n), max: g.n};
  if (g.type === "weight" || g.type === "noBreak") return {cur: Math.min(st.prog, g.n), max: g.n};
  return {cur: Math.min(st.prog, g.n || 100), max: g.n || 100};
}
function questUnlocked(q){
  const need = {peace:1, pred:2};   // сколько рыб поймано для доступа
  return (save.total||0) >= (need[q.id] || 0);
}
function questClaimable(q){
  const p = questProgress(q);
  return !questDone(q.id) && p.cur >= p.max;
}
function grantReward(r){
  const parts = [];
  if (r.coins){ save.coins += r.coins; parts.push("+"+r.coins+" монет"); }
  if (r.xp){
    const xp = Math.round(r.xp * (1 + perk("xp")));
    save.xp += xp; parts.push("+"+xp+" опыта");
  }
  if (r.rod && !save.owned.rod.includes(r.rod)){
    save.owned.rod.push(r.rod); parts.push("удочка «"+RODS[r.rod].name+"»");
  }
  if (r.line && !save.owned.line.includes(r.line)){
    save.owned.line.push(r.line); parts.push("леска «"+LINES[r.line].name+"»");
  }
  if (r.bait && r.baitN){ save.baits[r.bait] = baitsLeft(r.bait) + r.baitN; parts.push(r.baitN+" шт «"+BAITS[r.bait].name+"»"); }
  if (r.pearl){ save.pearl = (save.pearl||0) + r.pearl; save.pearlTotal = (save.pearlTotal||0) + r.pearl; parts.push("+"+r.pearl+" жемчуг"); }
  return parts;
}
function claimQuest(id){
  const q = QMAP[id]; if (!q || !questClaimable(q)) return;
  const st = questState(id);
  st.done = true; st.prog = questProgress(q).max;
  const parts = grantReward(q.reward);
  persist(); updateChips(); renderQuests();
  sfx.level(); buzz(30);
  toast("Квест выполнен: " + q.title, parts.join(" · "), 3000);
  G.questFlash = {t:1.4};
  updateQuestDot();
}
/* прогресс квестов по событию улова */
function questOnCatch(f){
  if (f.junk) return;
  const isNew = !save.caught[f.type] || save.caught[f.type].n === 1;
  for (const q of QUESTS){
    const st = questState(q.id);
    if (st.done) continue;
    const g = q.goal;
    let add = false;
    if (g.type === "catchAny") add = true;
    if (g.type === "species" && g.list.includes(f.type)) add = true;
    if (g.type === "speciesAny" && (!g.list || g.list.includes(f.type))) add = true;
    if (g.type === "cat" && FISH_CAT_OF[f.type] === g.cat) add = true;
    if (g.type === "loc" && save.loc === g.loc) add = true;
    if (g.type === "rarity" && g.list.includes(f.rar)) add = true;
    if (g.type === "weight" && f.weight >= g.n) add = true;
    if (g.type === "bait" && save.equipped.bait === g.bait) add = true;
    if (g.type === "noBreak") add = true;
    if (g.type === "speciesCount" && g.list.includes(f.type)) add = true;
    if (g.type === "weightLoc" && save.loc === g.loc && f.weight >= g.n) add = true;
    if (g.type === "rarityLoc" && save.loc === g.loc && g.list.includes(f.rar)) add = true;
    if (g.type === "baitDay" && baitDayOn()) add = true;
    if (g.type === "perfect" && (G.perfectAcc || 0) >= 0.6) add = true;
    if (g.type === "streak" && (G.bestStreak || G.perfectStreak || 0) >= (g.n || 1.5)) add = true;
    if (g.type === "doubleDay" && G.doublesToday > 0) add = true;
    if (g.type === "window" && windowOn()) add = true;
    if (add) st.prog++;
  }
  if (save.quests.q_kinds) save.quests.q_kinds.prog = Object.keys(save.caught).length;
  // жемчуг: редко и по-крупному
  const pearlBase = f.rar === "mythic" ? 0.9 : f.rar === "legendary" ? 0.55 : f.rar === "epic" ? 0.18 : 0.03;
  const pearlChance = clamp(pearlBase + perk("pearl") + timeMults(save.loc).pearl, 0, 0.97);
  if (Math.random() < pearlChance){
    save.pearl = (save.pearl||0) + 1; save.pearlTotal = (save.pearlTotal||0) + 1;
    G.pearlFind = true;
  }
  save.noBreak++;
  /* клубная цель дня: три рыбы с клубного плёса */
  if (clubAccess() && G.spot && G.spot.id.indexOf("prem_") === 0){
    if (save.clubGoalDay !== todayKey()){ save.clubGoalDay = todayKey(); save.clubGoal = 0; }
    if (!save.clubGoalDone) save.clubGoal = Math.min(CLUB_GOAL.count, (save.clubGoal||0) + 1);
  }
  // «все виды дневника»
  if (save.quests.q_all) save.quests.q_all.prog = Object.keys(save.caught).length;
  save.locsCaught[save.loc] = true;
  if (G.duel && G.duel.active) duelOnCatch(f);
  if (save.quests.q_perfect) save.quests.q_perfect.prog = save.perfects || 0;
  if (save.quests.q_casts) save.quests.q_casts.prog = save.accs || 0;
  persist();
  // ежедневные
  dailyOn("any", 1);
  dailyOn("cat", 1, FISH_CAT_OF[f.type]);
  dailyOn("weight", f.weight);
  if (["rare","epic","legendary","mythic"].includes(f.rar)) dailyOn("rar", 1);
  if (isNew) dailyOn("new", 1);
  G.questPopups = G.questPopups || [];
  for (const q of QUESTS) if (questClaimable(q) && !st_shown(q.id)) G.questPopups.push(q.id);
}
const _shownQ = {};
function st_shown(id){ return _shownQ[id]; }
function checkQuestPopups(){
  const list = (G.questPopups || []).filter(id => !_shownQ[id] && questClaimable(QMAP[id]));
  if (!list.length) return;
  const id = list[0];
  _shownQ[id] = true;
  showQuestDone(QMAP[id]);
}
function questOnBreak(){
  save.noBreak = 0; persist();
}

/* ---------------- ежедневные цели ---------------- */
function dailyNow(){
  const key = todayKey();
  if (!save.daily || save.day !== key){
    // детерминированный выбор по дате
    let seed = 0; for (const ch of key) seed = (seed*31 + ch.charCodeAt(0)) % 99991;
    const picks = [];
    const n = 3;
    let idx = seed % DAILY_POOL.length;
    while (picks.length < n){
      if (!picks.includes(DAILY_POOL[idx])) picks.push(DAILY_POOL[idx]);
      idx = (idx + 3) % DAILY_POOL.length;
    }
    save.daily = { key, done:{}, tasks: picks.map(p => p.id) };
    save.day = key;
    save.streak = (save.streak || 0);
    persist();
  }
  return save.daily.tasks.map(id => DAILY_POOL.find(d => d.id === id));
}
function dailyProg(task){
  const d = save.daily || {};
  d.prog = d.prog || {};
  if (typeof d.prog[task.id] !== "number") d.prog[task.id] = 0;
  return {cur: Math.min(d.prog[task.id], task.n), max: task.n};
}
function dailyOn(kind, amount, extra){
  const tasks = dailyNow();
  let changed = false;
  for (const t of tasks){
    if (t.type !== kind && !(kind === "cat" && t.type === "cat")) continue;
    if (t.type === "cat" && extra && t.cat !== extra) continue;
    const d = save.daily; d.prog = d.prog || {};
    const max = t.n;
    const before = d.prog[t.id] || 0;
    if (before >= max) continue;
    d.prog[t.id] = Math.min(max, kind === "weight" ? Math.max(before, amount) : before + (amount||1));
    changed = true;
  }
  if (changed) persist();
}
function claimDaily(id){
  const tasks = dailyNow();
  const t = tasks.find(x => x.id === id); if (!t) return;
  const p = dailyProg(t); if (p.cur < p.max) return;
  save.daily.done = save.daily.done || {};
  if (save.daily.done[id]) return;
  save.daily.done[id] = true;
  const dXp = Math.round(t.xp * (1 + perk("xp")));
  save.coins += t.coins; save.xp += dXp;
  persist(); updateChips(); renderQuests();
  sfx.level();
  toast("Ежедневная цель", "+"+t.coins+" монет · +"+dXp+" опыта", 2400);
  const allDone = tasks.every(x => save.daily.done[x.id]);
  if (allDone) toast("Все цели дня закрыты!", "Завтра придут новые. Так держать.", 3000);
}

/* ---------------- dom ---------------- */
const $ = id => document.getElementById(id);
const cv = $("cv"), ctx = cv.getContext("2d");
const app = $("app");

/* ---------------- аудио ---------------- */
let actx = null;
function audio(){
  if (save.mute) return null;
  if (!actx){ try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){ return null; } }
  if (actx.state === "suspended") actx.resume();
  return actx;
}
function tone(freq, dur, type="sine", gain=0.1, slideTo=null){
  const a = audio(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, a.currentTime);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, a.currentTime + dur);
  g.gain.setValueAtTime(0.0001, a.currentTime);
  g.gain.exponentialRampToValueAtTime(gain, a.currentTime + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
  o.connect(g).connect(a.destination); o.start(); o.stop(a.currentTime + dur + 0.03);
}
function noise(dur=0.25, gain=0.16, filt=900){
  const a = audio(); if (!a) return;
  const len = Math.floor(a.sampleRate*dur), buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i=0;i<len;i++) d[i] = (Math.random()*2-1) * Math.pow(1-i/len, 2.2);
  const src = a.createBufferSource(); src.buffer = buf;
  const f = a.createBiquadFilter(); f.type="lowpass"; f.frequency.value=filt;
  const g = a.createGain(); g.gain.value = gain;
  src.connect(f).connect(g).connect(a.destination); src.start();
}
const sfx = {
  tap(){ tone(620,0.05,"sine",0.04); },
  cast(){ noise(0.26,0.09,1500); tone(560,0.16,"triangle",0.045,190); },
  splash(){ noise(0.3,0.15,1100); },
  bite(){ tone(880,0.08,"square",0.065); setTimeout(()=>tone(1180,0.1,"square",0.055),88); },
  hook(){ tone(300,0.12,"sawtooth",0.075,720); },
  pull(){ tone(145,0.13,"sawtooth",0.055,92); },
  perfect(){ tone(1320,0.09,"sine",0.06,1760); },
  win(rar){
    const sets = {
      common:    [523,659],
      uncommon:  [523,659,784],
      rare:      [523,659,784,1046],
      epic:      [523,659,784,1046,1318],
      legendary: [523,659,784,1046,1318,1568],
      mythic:    [392,523,659,784,1046,1318,1568]
    };
    const arr = sets[rar] || sets.common;
    arr.forEach((f,i)=>setTimeout(()=>tone(f,0.26,"triangle",0.075),i*86));
    if (rar === "mythic" || rar === "legendary") setTimeout(()=>tone(arr[0]/2, 0.7, "sine", 0.06), 120);
  },
  snap(){ noise(0.34,0.28,2600); tone(220,0.28,"sawtooth",0.09,60); },
  lost(){ tone(320,0.38,"sine",0.08,130); },
  thunder(){ noise(0.7,0.22,420); tone(70,0.6,"sine",0.09,38); },
  buy(){ [740,988,1318].forEach((f,i)=>setTimeout(()=>tone(f,0.14,"triangle",0.07),i*70)); },
  level(){ [523,784,1046,1318].forEach((f,i)=>setTimeout(()=>tone(f,0.3,"sine",0.075),i*100)); }
};
function buzz(ms){ if (!save.mute && navigator.vibrate) try { navigator.vibrate(ms); } catch(e){} }

/* ---------------- canvas ---------------- */
let W=0,H=0,DPR=1;
function resize(){
  DPR = Math.min(window.devicePixelRatio||1, 2);
  const r = app.getBoundingClientRect();
  W = Math.max(300, r.width); H = Math.max(300, r.height);
  cv.width = Math.round(W*DPR); cv.height = Math.round(H*DPR);
  ctx.setTransform(DPR,0,0,DPR,0,0);
}
window.addEventListener("resize", resize);

const images = {};
for (const k in IMG){
  if (k === "fish") continue;
  const im = new Image(); im.src = IMG[k]; images[k] = im;
}
images.fish = {};
for (const k in IMG.fish){
  const im = new Image(); im.src = IMG.fish[k]; images.fish[k] = im;
}

/* ---------------- сцена ---------------- */
function geo(){
  const L = save.loc;
  // 8.7: зимой сцена светлее и «стекляннее», осенью — золотистее
  const horizon = L === "night" ? 0.385 : (L === "sea" || L === "lagoon") ? 0.44
    : L === "mountain" ? 0.455 : L === "swamp" ? 0.425 : 0.435;
  const surfaceY = H*horizon;
  return {
    surfaceY,
    rodBase:{ x: W*1.03, y: H*0.83 },
    rodTip: { x: W*0.86, y: surfaceY - H*0.175 }
  };
}
function spotPos(sp){
  const g = geo();
  const x = sp.x * W;
  const y = sp.y ? sp.y * H : g.surfaceY + H*(sp.depth === "мелко" ? 0.045 : sp.depth === "глубоко" ? 0.135 : 0.088);
  return {x, y};
}
function wY(){ return G.baseY || geo().surfaceY; }

/* идеальная сила заброса: чем дальше место, тем сильнее надо замахнуться */
function idealPowerFor(x){
  const g = geo();
  const reachW = W*0.86;
  return clamp((g.rodTip.x - x) / reachW, 0.10, 0.94);
}

/* ---- свободный заброс: зона в любой точке воды собирает свой состав рыбы ---- */
function locDepth(sp){ return sp.depth || "средне"; }
/* имя зоны по вертикали: чем ниже точка, тем глубже */
function depthNameByY(y){
  const g = geo();
  const k = (y - g.surfaceY) / Math.max(1, (H - g.surfaceY));
  return k < 0.30 ? "мелко" : k < 0.62 ? "средне" : "глубоко";
}
function zonePool(x, y){
  const spots = locSpots();
  const k = clamp((y - geo().surfaceY) / Math.max(1, (H - geo().surfaceY)), 0, 1);
  const near = [];
  for (const sp of spots){
    const pos = spotPos(sp);
    const d = Math.hypot((x - pos.x)/(W*0.55), (y - pos.y)/(H*0.30));
    near.push({ sp, wgt: 1 / (0.35 + d*d) });
  }
  const sum = near.reduce((a,b) => a + b.wgt, 0) || 1;
  const out = {};
  for (const n of near){
    const depthBoost = 1 + 0.45*Math.abs(k - clamp((spotPos(n.sp).y - geo().surfaceY)/Math.max(1,(H-geo().surfaceY)),0,1));
    const share = n.wgt/sum * depthBoost;
    for (const key in n.sp.w){
      // 8.6: точка вносит вид только если он там может жить
      const f = fishFit(key, n.sp, save.loc);
      if (f < ECO_RULE.minFit) continue;
      out[key] = (out[key] || 0) + n.sp.w[key] * share * (0.4 + 0.6 * f);
    }
  }
  return out;
}
/* ближайшая «именованная» точка — только для подписи */
function nearestSpotName(x, y){
  let best = null, bd = 1e9;
  for (const sp of locSpots()){
    const pos = spotPos(sp);
    const d = Math.hypot(x - pos.x, y - pos.y);
    if (d < bd){ bd = d; best = sp; }
  }
  const depth = depthNameByY(y);
  const nearEnough = bd < Math.min(W,H)*0.20;
  if (nearEnough) return best.name;
  return depth === "мелко" ? "Отмель" : depth === "глубоко" ? "Глубина" : "Открытая вода";
}
/* выбрать точку в произвольном месте (вода или лёд) */
function castAt(x, y, quiet){
  const g = geo();
  const sp = {
    id: "free",
    name: nearestSpotName(x, y),
    x: clamp(x / W, 0.06, 0.94),
    y: clamp(y / H, (g.surfaceY + 10) / H, 0.94),
    depth: depthNameByY(y),
    sweet: [0.42, 0.74],
    w: zonePool(x, y),
    free: true
  };
  // 8.6: у свободного заброса тоже есть дно и укрытия — интерполируем по точкам
  sp.env = spotEnv(sp, save.loc);
  selectSpot(sp);
  return sp;
}
/* лунка: если выбрана точка — центрируем на ней, иначе по центру экрана */
function holeXY(){
  const idle = (G.state === "idle" || G.state === "aim" || G.state === "power");
  const x = idle && G.spot ? spotPos(G.spot).x : (idle ? W*0.5 : G.bobX);
  const y = idle && G.spot ? G.baseY : wY();
  return { x, y: y + 6 };
}

/* ---------------- состояние ---------------- */
const GREEN_LO = 0.40;

/* погода зависит от водоёма и «крутится» после каждого N забросов */
/* 8.7б: зимой на каждом озере своя погода, но лёд правит всем: снег и мороз.
   Гроза (а с ней и «жор после грозы») остаётся только в открытой воде лета и осени. */
function rollWeather(){
  const night = save.loc === "night";
  const se = seasonNow();
  const pool = iceNow() ? ["snow","frost","snow","overcast","sunny","mist","snow"]
    : night ? ["sunny","moon","mist","overcast","thunder"]
    : save.loc === "sea" ? ["sunny","overcast","thunder","rain","mist","sunny"]
    : se === "spring" ? ["sunny","overcast","rain","mist","sunny","rain"]
    : se === "autumn" ? ["sunny","overcast","rain","mist","thunder","sunny","overcast"]
    : ["sunny","overcast","rain","mist","thunder","sunny","overcast"];
  const w = pool[(Math.random()*pool.length)|0];
  save.weather = {type:w, rolls: -(1 + ((Math.random()*4)|0))};   // сколько забросов ещё действует
  persist();
  return save.weather;
}
function weatherNow(){
  if (!save.weather || !WEATHER[save.weather.type]) rollWeather();
  return WEATHER[save.weather.type] || WEATHER.overcast;
}
function tickWeather(){
  if (!save.weather) { rollWeather(); return; }
  save.weather.rolls++;
  if (save.weather.rolls >= 0){ rollWeather(); syncWeatherChip(); announceWeather(); markStormEnded(); }
  persist();
}
const G = {
  state:"idle",       // idle | aim | power | casting | waiting | bite | fight | result
  cardOpen:false, approach:0,
  t:0, clock:0,
  spot:null, baseY:0,  // выбранная точка и её уровень воды
  power:0, powerT:0, lockedPower:0, acc:0,
  hold:false,
  tension:GREEN_LO+0.05, progress:0,
  bobX:0, bobY:0, bobTarget:0,
  fish:null, leap:null,
  biteWindow:900, biteAt:0,
  pull:{active:false, warn:0, timer:1.2, dur:0, activeT:0, pending:false},
  slackT:0, perfectT:0, lastHint:"", particles:[], rings:[], shake:0, flash:0,
  castDur:0.6, castT:0, castFrom:null, jigT:0, jigPhase:0,
  floatingTexts:[]
};
const lineHI = () => lineDef().hi;
$("tensionZone").style.left = (GREEN_LO*100)+"%";
$("tensionZone").style.width = ((lineHI()-GREEN_LO)*100)+"%";

/* ---------------- утилиты ---------------- */
const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
const lerp = (a,b,t)=>a+(b-a)*t;
const fmtKg = g => (g/1000).toFixed(2);
const fmtNum = n => n >= 1000 ? (n/1000).toFixed(n%1000?1:0).replace(".",",") + "к" : String(n);
const roundKg = g => g >= 1000 ? (g/1000).toFixed(1).replace(".",",") : String(g);
const rnd = (a,b)=>a+Math.random()*(b-a);

function toast(text, sub, ms=1500){
  const el = $("toast") || (() => { const d = document.createElement("div"); d.id="toast"; app.appendChild(d); return d; })();
  el.innerHTML = text + (sub ? "<small>"+sub+"</small>" : "");
  el.classList.add("on");
  clearTimeout(toast._t);
  toast._t = setTimeout(()=>el.classList.remove("on"), ms);
}
let hintT = 0;
let hintToken = 0;
function hint(text, sticky){
  const el = $("hint");
  if (!text){ el.classList.remove("on"); return; }
  el.textContent = text; el.classList.add("on");
  const my = ++hintToken;
  clearTimeout(hintT);
  if (!sticky) hintT = setTimeout(()=>{ if (my === hintToken) el.classList.remove("on"); }, 3200);
}
function burst(x,y,n=14,spd=190,color="rgba(220,245,255,"){
  for (let i=0;i<n;i++){
    const a = -Math.PI/2 + rnd(-1.1,1.1), s = spd*rnd(0.35,1.15);
    G.particles.push({x,y,vx:Math.cos(a)*s*0.6,vy:Math.sin(a)*s,life:rnd(0.45,0.95),r:rnd(1.4,3.4),color});
  }
}
function ring(x,y){ G.rings.push({x,y,r:3,a:1}); }
function floatText(text, x, y, color="#ffe9a3"){
  G.floatingTexts.push({text,x,y,life:1.1,color});
}

/* ---------------- выбор рыбы ---------------- */
function pickFish(spot){
  const L = locDef();
  // 8.6: экологический фильтр точки (жёстко: fit < ECO_RULE.minFit — вида тут нет)
  if (Math.random() < 0.045) {
    const j = JUNK[(Math.random()*JUNK.length)|0];
    return { junk:true, name:j.name, note:j.note, art:j.art };
  }
  const bait = save.equipped.bait;
  const rod = rodDef();
  let total = 0;
  const w = {};
  for (const k in spot.w){
    const F = FISH[k];
    if (!F) continue;
    let v = spot.w[k];
    // ЖЁСТКО: рыба берёт только свою приманку и только снасть нужной прочности
    if (!onBaitFor(F)) continue;
    if (F.reqPower > rod.power) continue;
    if (F.sea && !rod.sea) continue;
    // «снасть на пределе» — такая рыба почти не клюёт
    v *= F.reqPower > rod.power * 0.94 ? 0.35 : 1;
    // 8.6: вид берётся только там, где подходит глубина, дно, течение и температура
    const fit = fishFit(k, spot, save.loc);
    if (fit < ECO_RULE.minFit) continue;
    v *= 0.35 + 0.65 * fit;            // «в оптимуме» — полный вес, на границе — почти ничего
    // 8.5: в любимой точке вида он берёт заметно охотнее
    if (isFishHome(k, spot)) v *= FISH_ZONE_BONUS;
    if (rod.tier >= 4 && F.aggr >= 0.7) v *= 1.18;
    if (F.rar === "mythic") v *= 0.55;
    w[k] = v; total += v;
  }
  if (!total){
    // 8.6: различаем «не та приманка» и «здесь такая рыба не живёт»
    const why = spotReason(spot);
    if (why === "noLife")
      return { junk:true, noBite:true, noLife:true, name:"пусто",
               note:"Здесь для твоей снасти никто не живёт: слишком мелко, глубоко или не тот грунт. Смени точку." };
    return { junk:true, noBite:true, name:"пусто", note:"На эту приманку здесь никто не берёт." };
  }
  let r = Math.random()*total, type = Object.keys(w)[0];
  for (const k in w){ r -= w[k]; if (r <= 0){ type = k; break; } }
  const F = FISH[type];
  const seK = spotEnv(spot, save.loc);
  const tm = timeMults(save.loc);
  const bigDay = (baitDayOn() ? 0.10 : 0) + (locDayOn() ? 0.05 : 0) +
    (windowOn() ? 0.07 : 0) + (handActive() ? 0.05 : 0) +
    // 8.6: размер зависит от «хозяина» точки — ил и ямы дают крупную рыбу, песок и струя — мелочь
    (clamp((seK.depth - 1.5) / 9, 0, 1) * 0.16 - (seK.cover > 0.6 ? 0.04 : 0) + (seK.flow > 1.0 ? -0.08 : 0));
  const u = Math.pow(Math.random(), Math.max(0.6, 1.55 + perk("big")*3 - bigDay*2.2));   // наживка дня и лучший день — крупнее рыба
  const waveSize = waveOn(save.loc) ? BITE_WAVE.size : 1;
  const stormSize = afterStormOn() ? AFTER_STORM.size : 1;
  const seasonSize = seasonNow() === "autumn" ? 1.05 : seasonNow() === "winter" ? 0.96 : 1;
  // «своё время» водоёма даёт рыбу крупнее (8.0) — держим этот множитель явно
  const weight = Math.round((F.wMin + u*(F.wMax-F.wMin)) * L.sizeMul * weatherNow().size * stormSize * seasonSize * timeMults(save.loc).size *
    (1 + perk("all")) * waveSize);
  const norm = clamp((weight - F.wMin*L.sizeMul) / (F.wMax*L.sizeMul - F.wMin*L.sizeMul), 0, 1);
  return {
    junk:false, type, name:F.name, rar:F.rar, note:F.note, weight, norm,
    aggr:F.aggr, stam:F.stam, val:F.val, xp:F.xp, art:artOf(type), palette:paletteFor(type),
    bait:F.bait, reqPower:F.reqPower
  };
}

/* кто вообще может клюнуть в точке на текущую приманку/удочку */
function spotPool(spot){
  const out = [];
  for (const k in spot.w){
    const F = FISH[k];
    if (!F) continue;
    out.push({ id:k, F, okBait: onBaitFor(F), okRod: F.reqPower <= rodDef().power });
  }
  return out;
}
/* какие приманки вообще имеют смысл в этом водоёме */
function locBaits(){
  const set = new Set();
  for (const sp of locSpots()) for (const k in sp.w) if (FISH[k]) set.add(FISH[k].bait);
  return set;
}

/* ---------------- вычисление боя ---------------- */
function fightParams(f){
  const L = locDef(), rod = rodDef(), reel = reelDef(), hook = hookDef();
  const depthBonus = G.spot && G.spot.depth === "глубоко" ? 1.12 : 1;
  const rodP = 1 + (rod.power - 70) / 190;          // 1.0 … ~1.7
  const lineP = 1 + (lineDef().power - 80) / 260;   // 1.0 … ~1.3
  return {
    holdGain: (0.30 - f.stam*0.10) * reel.gain * (1 + f.norm*0.12),
    pullPower: (0.26 + f.aggr*0.30) * (0.72 + f.norm*0.62) * L.pullMul * depthBonus,
    progress: (0.34 - f.stam*0.085) * reel.speed * rodP * lineP * (1 - f.norm*0.34) * 1.05,
    pullEvery: [0.85 + f.aggr*0.35 + f.norm*0.55, 1.9 + f.aggr*0.4 + f.norm*0.9],
    pullDur: [0.18 + f.aggr*0.12, 0.30 + f.aggr*0.18 + f.norm*0.16],
    decay: 0.62 * lineDef().decay,
    hi: lineDef().hi,
    hookChance: hook.hookChance,
    escape: hook.escape
  };
}

/* ---------------- поток состояний ---------------- */
function setState(s){
  G.state = s; G.t = 0;
  const btn = $("action");
  btn.dataset.mode = "";
  $("powerWrap").classList.toggle("on", s === "power");
  $("tensionWrap").classList.toggle("on", s === "fight");
  $("dim").classList.toggle("on", false);

  switch (s){
    case "idle":
      btn.disabled = false;
      btn.dataset.mode = "aim";
      btn.innerHTML = "БРОСИТЬ В ЛЮБОЕ МЕСТО";
      hint("Тапни по воде в любом месте — или жми кнопку");
      break;
    case "aim":
      btn.disabled = false;
      btn.innerHTML = "ЗАЖМИ И ОТПУСТИ";
      hint("Зажми, чтобы набрать силу, и отпусти в зелёной зоне");
      break;
    case "power":
      btn.dataset.mode = "power";
      btn.innerHTML = "ОТПУСТИ ДЛЯ ЗАБРОСА";
      hint("Сила: " + Math.round(G.power*100) + "%", true);
      break;
    case "casting":
      btn.disabled = true; btn.innerHTML = "ЛЕТИТ…"; hint("");
      break;
    case "snag":
      btn.disabled = false; btn.dataset.mode = "snag";
      btn.innerHTML = "ДЁРНУТЬ, ЧТОБЫ ОСВОБОДИТЬ";
      hint("Короткие подёргивания · длинное нажатие — рывок", true);
      break;
    case "waiting":
      btn.disabled = false; btn.dataset.mode = "wait";
      btn.innerHTML = iceNow() ? "ПОДЁРНУТЬ МОРМЫШКУ" : "ПОДЕРГАТЬ ПРИМАНКУ";
      // подсказку в ожидании не навязываем: рисуем «интерес» прямо на воде
      hint("");
      break;
    case "bite":
      btn.disabled = false; btn.dataset.mode = "bite";
      btn.innerHTML = "ПОДСЕКАЙ!";
      hint("Тапни, пока кольцо не сжалось!");
      break;
    case "fight":
      btn.disabled = false; btn.dataset.mode = "hold";
      btn.innerHTML = "ДЕРЖИ, ЧТОБЫ ТЯНУТЬ";
      hint("Держи в зелёной зоне · отпускай у красного");
      break;
    case "result":
      btn.disabled = true; btn.innerHTML = "…"; hint("");
      break;
  }
  updateTabState();
  if (typeof renderGearBar === "function"){ renderGearBar(); syncGearbarVisibility(); }
  if (typeof syncHandVisibility === "function") syncHandVisibility();
  if (typeof renderSnagBar === "function") renderSnagBar();
  if (typeof syncLocInfo === "function") syncLocInfo();
}

/* ---------------- действия ---------------- */
function selectSpot(spot){
  G.spot = spot;
  const pos = spotPos(spot);
  G.baseY = pos.y;
  G.spotFree = !!spot.free;
  // для свободного места зона силы считается от расстояния до него
  if (spot.free){
    const ip = idealPowerFor(pos.x);
    spot.ideal = ip;
    spot.sweet = [clamp(ip-0.09, 0.03, 0.93), clamp(ip+0.09, 0.07, 0.97)];
  }
  const s = spot.sweet;
  $("sweetZone").style.left = (s[0]*100)+"%";
  $("sweetZone").style.width = ((s[1]-s[0])*100)+"%";
  $("tensionZone").style.left = (GREEN_LO*100)+"%";
  $("tensionZone").style.width = ((lineHI()-GREEN_LO)*100)+"%";
  if (iceNow()) startDrill();   // 8.7: зимой лунка на любом озере
  setState("aim");
  sfx.tap();
  coachTip("c_power");
}

function beginPower(){
  if (G.state === "power") return;
  if (G.state !== "aim" && G.state !== "idle") return;
  if (!ensureBait()) return;
  if (G.state === "idle") castAt(W*0.52, geo().surfaceY + (H - geo().surfaceY)*0.42, true);
  G.powerT = 0; G.power = 0.08; G.hold = true;
  setState("power");
  audio();
}

function releasePower(){
  if (G.state !== "power") return;
  G.hold = false;
  const p = G.power, s = G.spot.sweet;
  const dist = p < s[0] ? s[0]-p : p > s[1] ? p-s[1] : 0;
  G.acc = dist === 0 ? 1 : clamp(1 - dist/0.26, 0, 0.95);
  G.lockedPower = p;
  const jitter = (1 - G.acc) * 0.09;
  // сила = дальность: слабый замах не долетает, сильный — перелетает выбранное место
  const tipX = geo().rodTip.x;
  const pos = spotPos(G.spot);
  const ideal = G.spot.free ? (G.spot.ideal || idealPowerFor(pos.x)) : (G.spot.sweet[0]+G.spot.sweet[1])/2;
  const ratio = clamp(p / Math.max(0.08, ideal), 0.12, 1.9);
  G.bobTarget = clamp(tipX - (tipX - pos.x) * ratio + rnd(-jitter,jitter)*W, W*0.04, W*0.97);
  if (G.acc > 0.85){ dailyOn("acc", 1); save.accs = (save.accs||0)+1; }
  clubVisit(p);
  if (G.acc > 0.98) floatText("ТОЧНО!", G.bobTarget, geo().surfaceY - 60, "#a7f0bd");
  else if (G.acc > 0.6) floatText("неплохо", G.bobTarget, geo().surfaceY - 60, "#ffe9a3");
  else floatText("мимо зоны", G.bobTarget, geo().surfaceY - 60, "#ffb3a0");
  startCast();
}

function startCast(){
  if (G.clubLuck) G.clubLuck.t = 0;
  const g = geo();
  G.castFrom = { x:g.rodTip.x, y:g.rodTip.y };
  G.bobX = g.rodTip.x; G.bobY = g.rodTip.y;
  G.castDur = 0.42 + G.lockedPower*0.26;
  G.castT = 0;
  G.fish = null; G.progress = 0; G.slackT = 0; G.perfectT = 0;
  G.castAtT = G.clock;
  G.tension = clamp(GREEN_LO + 0.05, 0, lineHI()-0.02);
  G.pull = {active:false,warn:0,timer:1.1,dur:0,activeT:0,pending:false};
  save.casts++;
  useBait(1);
  tickWeather();
  const dist = Math.abs(G.bobTarget - g.rodTip.x);
  save.bestCast = Math.max(save.bestCast, Math.round(dist / W * 100));
  persist(); updateChips();
  setState("casting");
  sfx.cast();
}

/* «заинтересованность»: сколько секунд рыба решает, брать ли приманку.
   Медиана ~7 с, но бывает и сразу (удачная точка), и 15-20 с (приходится подождать) -
   ожидание не мгновенное, но и не нудное. */
/* 8.6: почему не клюёт — различаем «не та приманка» и «здесь такая рыба не живёт» */
function spotReason(spot){
  const sp = spot || G.spot;
  if (!sp) return "";
  const all = Object.keys(sp.w || {}).filter(k => FISH[k]);
  const alive = all.filter(k => fitOk(k, sp, save.loc));
  if (!alive.length) return "noLife";
  const onBait = alive.filter(k => onBaitFor(FISH[k]));
  if (!onBait.length) return "noBait";
  const byRod = onBait.filter(k => FISH[k].reqPower <= rodDef().power);
  if (!byRod.length) return "noRod";
  return "";
}
function biteWait(){
  const L = locDef();
  // сколько видов в этой точке реально берут текущую приманку на эту удочку
  const pool = spotPool(G.spot || L.spots[0]);
  const avail = pool.filter(p => p.okBait && p.okRod).length;
  // приманки нет - никто не заинтересуется
  if (baitsLeft(save.equipped.bait) <= 0) return 999;
  // 1) насколько место «богатое»: чем больше рыба берёт эту приманку, тем скорее поклёвка
  const richK = 1.35 - 0.35 * clamp(avail / 3, 0, 1);
  // 2) погода: давление, ветер и «жор после грозы» (8.7) + видимость лески
  const wx = weatherBite(save.loc);
  const wxK = 1 / Math.max(0.62, wx.k);
  const lineK = 1 / Math.max(0.75, lineNoticeK(save.loc).k);
  const oxyK = oxygenAt(save.loc) < 0.6 ? 1.25 : 1;
  // 3) прозрачная тихая вода - рыба осторожнее
  const calmK = G.waterClear ? (iceNow() ? 1.08 : 1.15) : 1;
  // 4) точность заброса
  const accK = 1.10 - 0.25 * clamp(G.acc || 0, 0, 1);
  const dayK = baitDayOn() ? 1 / BAIT_DAY.mul : 1;
  const locDayK = locDayOn() ? 1 / LOC_DAY_K.klyov : 1;
  // 8.0: своё время суток водоёма и прикормка точки
  const tm = timeMults(save.loc);
  const timeK = 1 / Math.max(0.7, tm.klyov);
  const handK = handActive() ? 1 / (HAND.klyov * (1 + (save.hand.gain || 0))) : 1;
  // 8.5: выход рыбы —«час активности» водоёма (ожидание почти вдвое короче)
  const waveK = waveMult(save.loc);
  const streamK = 1 / (1 + (locMech().stream || 0) * 0.12);
  const mean = 4.4 * richK * wxK * lineK * oxyK * calmK * accK * (1 - perk("bite")) * dayK * locDayK * timeK * handK * streamK * waveK;
  // сумма двух равномерных: чаще 4-8 с, реже крайности
  const g = (Math.random() + Math.random()) / 2;
  let t = mean * (0.42 + g * 1.32);
  if (Math.random() < 0.13) t *= 1.55;   // рыба «думает» - длинное ожидание
  if (Math.random() < 0.10) t *= 0.5;    // повезло - почти сразу
  return clamp(t, 2.0, 16);
}
function startWaiting(){
  // 9.2: изредка, между забросами — межстраничная реклама (доход платформы и наш)
  if (typeof ygMaybeInterstitial === "function") ygMaybeInterstitial();
  // 9.3: в ВК — своя межстраничная реклама, не чаще раза в 4 минуты
  if (vkOn() && !save.noAds){
    vkCasts++;
    if (vkCasts === 6 || (vkCasts > 6 && Date.now() - vkAdAt > 240000)){ vkAdAt = Date.now(); vkAd("interstitial"); }
  }
  // 8.0: коряжник может посадить снасть — зацеп решается до начала ожидания
  if (trySnag()) return;
  // 8.5: во время буя клёва у поплавка может всплыть сигнальный шар
  maybeSpawnBuoy();
  // ветер гонит поплавок в сторону
  const stream = locMech().stream || 0;
  const streamDrift = (stream > 0.4) ? stream * 0.42 : 0;
  G.drift = clamp(((G.spot && G.spot.free ? clamp(windNow().dir, -1, 1) * windNow().power : 0) + streamDrift), -1, 1);
  G.hookSet = (G.hookSet || 0) + 1;
  if (G.fish && G.fish.noBite){
    // приманку тут никто не берёт: ждём впустую, интереса нет.
    // 8.7: если дело не в приманке, а в физике воды (лёд, замор, жара, сезон) — причина честнее
    const envWhy = G.fish.noLife ? "" : waterWhy();
    if (envWhy) G.fish.note = envWhy;
    G.waitDur = rnd(2.6, 4.4);
    G.interest = 0.04; G.pureCasts = G.waitDur; G.falseBite = 0;
    G.nibble = rnd(0.9, 1.8); G.nibbling = false;
    setState("waiting");
    return;
  }
  G.waitDur = biteWait();
  G.interest = 0.06;
  G.pureCasts = rnd(0.8, 1.1);   // «тихое» время без подсказок: сначала просто смотрим на воду
  G.nibble = rnd(0.5, 1.4); G.nibbling = false;
  G.falseBite = 0;
  G.jigCount = 0;
  setState("waiting");
}

function beginBite(){
  G.fish = pickFish(G.spot);
  // приманку на этом месте никто не берёт: не «сход», а просто пустая вода —
  // возвращаем снасть и прямо говорим, что приманка не та
  if (G.fish && G.fish.noBite){
    const noLife = G.fish.noLife;
    G.fish = null;
    toast(noLife ? "Тут пусто" : "Тишина",
      noLife ? "Здесь такой рыбы нет — смотри грунт и глубину точки в подписи и бросай в другое место."
             : "На «"+((BAITS[save.equipped.bait]||{}).name||"эту приманку")+"» здесь не берут — нужна другая наживка.", 2400);
    setState("aim"); updateChips();
    return;
  }
  G.interest = 1; G.falseBite = 0;
  setState("bite");
  G.biteWindow = (900 + rnd(-90, 160) - (G.fish.norm||0)*120) * hookDef().windowMul;
  G.biteAt = 0;
  sfx.bite(); buzz(18);
  coachTip("c_bite");
  ring(G.bobX); burst(G.bobX, wY(), 7, 110);
}

function hook(){
  if (G.state !== "bite") return;
  const ch = hookDef().hookChance;
  if (ch > 0 && Math.random() < ch * 0.35){
    // ранняя подсечка крючком с бородкой — рыба всё равно садится
    floatText("засеклась!", G.bobX, wY()-70, "#a7f0bd");
  }
  sfx.hook(); buzz(30);
  setState("fight");
  G.fish.p = G.fish.junk
    ? { holdGain:0.34, pullPower:0.10, progress:0.52, pullEvery:[2.2,4.2], pullDur:[0.2,0.3], decay:0.7, hi:lineHI() }
    : fightParams(G.fish);
  G.tension = clamp(GREEN_LO + 0.07, 0, lineHI()-0.02);
  G.progress = 0; G.slackT = 0; G.perfectT = 0; G.perfectAcc = 0; G.perfectShown = false;
  G.perfectStreak = 0; G.perfectStreakT = 0; G.streakToast = false;
  G.pull = {active:false,warn:0,timer:0.8+dur0(),dur:0,activeT:0,pending:false};
  G.hold = false; G.lastHint = ""; G.weakShown = false;
  coachTip("c_fight");
  burst(G.bobX, wY(), 20, 240); ring(G.bobX);
  G.shake = 6;
  if (!save.seenFight){
    save.seenFight = true; persist();
  }
}
const dur0 = () => rnd(0.85, 1.6);

function fail(kind){
  if (G.state === "result") return;
  const f = G.fish;
  setState("result");
  if (kind === "break"){
    save.breaks++; questOnBreak();
    sfx.snap(); buzz(60); G.shake = 16; G.flash = 0.5;
    toast("Обрыв лески!", "Слишком сильно натянул — рыба ушла с крючком.", 1900);
  } else if (kind === "weak"){
    save.breaks++; questOnBreak(); persist();
    sfx.snap(); buzz(50);
    toast("Не удержал!", "Рыба оказалась сильнее снасти и ушла. Купи удочку мощнее.", 2200);
  } else if (kind === "lost"){
    save.lost++; sfx.lost(); buzz(24);
    // «пусто» — не сход: приманку тут просто никто не берёт, и это не потеря рыбы
    toast(f && f.noBite ? "Тишина" : "Сход…",
      f && f.noBite ? "На эту приманку здесь никто не берёт. Смени наживку." : "Леска ослабла, и рыба сошла с крючка.", 1900);
  } else if (kind === "miss"){
    save.lost++; sfx.lost();
    toast("Проспал поклёвку", "Рыба выплюнула приманку и ушла.", 1700);
    for (let i=0;i<4;i++) setTimeout(()=>ring(G.bobX + rnd(-10,10)), i*70);
  } else if (kind === "early"){
    toast("Рано!", "Ты дёрнул до поклёвки — рыба испугалась.", 1300);
    G.fish = null;
    G.waitDur = rnd(2, 4.5);
    setState("waiting");
    return;
  }
  persist(); updateChips();
  setTimeout(()=>{ if (G.state === "result") setState("aim"); }, 1500);
}

function succeed(){
  if (G.state === "result") return;
  const f = G.fish;
  setState("result");
  G.hold = false;
  sfx.win(f.rar);
  if (!f.junk){
    G.rarityFlash = {t:0.9, color: (RARITY[f.rar]||RARITY.common).color};
  }
  G.leap = { t:0, x:G.bobX, y:wY(), y0:wY(), x0:G.bobX, spin:0 };
  sfx.splash(); buzz(24);
  for (let i=0;i<4;i++){
    G.rings.push({x:G.bobX + rnd(-12,12), y:0, r:4 + i*6, a:0.9 - i*0.15});
  }
  for (let i=0;i<16;i++){
    const a = -Math.PI/2 + rnd(-1.2,1.2), spd = rnd(90, 260);
    G.particles.push({x:G.bobX + rnd(-8,8), y:wY(), vx:Math.cos(a)*spd*0.5, vy:Math.sin(a)*spd,
      life:rnd(0.5,1.0), r:rnd(1.4,3.2), color:"rgba(225,250,255,"});
  }
  burst(G.bobX, wY(), 26, 300); ring(G.bobX);
  clubLuckRoll(G.spot);
  // наживка дня: иногда рыба берёт вторую приманку подряд — «двойной заход»
  if (!f.junk && baitDayOn() && Math.random() < BAIT_DAY.bonus){
    G.dayDouble = true;
    if (save.doubleDay !== todayKey()){ save.doubleDay = todayKey(); save.doublesToday = 0; }
    save.doublesToday = (save.doublesToday || 0) + 1;
    debugLog("dayDouble", { n: DEBUG.filter(x=>x.name==="dayDouble").length + 1 });
  }
  debugLog("succeed", { double: !!G.dayDouble, baitDayOn: baitDayOn(),
    bait: save.equipped.bait, baitOfDay: baitOfDay(), loc: save.loc });
  G.jumpUntil = performance.now() + 1150;   // пока летит рыба, карточку не показываем
  setTimeout(()=>showCatch(f), 1150);
}

/* ---------------- итоги ---------------- */
function showCatch(f){
  hideCoach();
  const ov = $("catchCard");
  ov.onclick = (e) => { if (e.target === ov) nextCatch(); };
  // искры для редкой рыбы
  ov.querySelectorAll(".spark").forEach(e => e.remove());
  if (!f.junk && ["rare","epic","legendary","mythic"].includes(f.rar)){
    const n = f.rar === "mythic" ? 16 : f.rar === "legendary" ? 12 : f.rar === "epic" ? 8 : 5;
    const sp = document.createElement("div");
    sp.className = "spark";
    const col = RARITY[f.rar].color;
    for (let i=0;i<n;i++){
      const el = document.createElement("i");
      el.style.left = (6 + Math.random()*88) + "%";
      el.style.top = (10 + Math.random()*70) + "%";
      el.style.background = col;
      el.style.animationDelay = (Math.random()*2.4).toFixed(2) + "s";
      el.style.boxShadow = "0 0 8px " + col;
      sp.appendChild(el);
    }
    ov.querySelector(".card").appendChild(sp);
  }
  const art = $("catchArt");
  if (f.junk){
    $("catchRar").textContent = "мусор";
    $("catchRar").style.cssText = "background:#e3ddd3;color:#6b6156";
    // «пусто» — не мусор из коллекции, а просто пустой заброс: без картинки и без монет
    if (f.noBite){
      art.innerHTML = '<div class="emptyArt">'+ICONS.clock+'</div>';
    } else {
      art.innerHTML = '<div style="width:120px;height:120px;margin:0 auto">'+JUNK_ART[f.art]+'</div>';
    }
    $("catchName").textContent = f.name;
    $("weightRow").style.display = "none";
    $("catchNote").textContent = f.note;
    save.coins += 4;
    $("catchCoins").textContent = "+4"; $("catchXp").textContent = "0";
    $("catchTotal").textContent = save.total;
    $("catchNote").textContent = f.note + " За чистоту водоёма +4 монеты.";
  } else {
    const R = RARITY[f.rar];
    $("catchRar").textContent = R.label;
    $("catchRar").style.cssText = "background:"+R.bg+";color:"+R.color;
    const aKey = f.art || artOf(f.type);
    art.innerHTML = '<div class="aqua"></div><div class="fishSwim" id="catchFishSwim">'
      + '<img alt="" src="'+IMG.fish[aKey]+'" class="fbody"'
      + (f.palette ? ' style="filter:hue-rotate('+f.palette.hue+'deg) saturate('+f.palette.sat+')"' : '')
      + '><i class="fpad"></i></div>';
    $("catchGlow").style.background = R.color;
    $("catchGlow").style.opacity = f.rar === "legendary" ? 0.85 : f.rar === "epic" ? 0.6 : 0.35;
    $("catchName").textContent = f.name;
    const cardEl = ov.querySelector(".card");
    cardEl.style.background = f.rar === "mythic"
      ? "linear-gradient(180deg,#fdf4fb,#f0dcf0)"
      : f.rar === "legendary" ? "linear-gradient(180deg,#fdf8e6,#f4e6c2)"
      : f.rar === "epic" ? "linear-gradient(180deg,#fdf5ee,#f2e2d4)"
      : "linear-gradient(180deg,#fdf8ec,#efe3cb)";
    $("weightRow").style.display = "";
    $("catchWeight").textContent = fmtKg(f.weight);
    $("catchNote").textContent = f.note;

    const prev = save.caught[f.type];
    const isRec = !prev || f.weight > (prev.best||0);
    $("catchRecord").innerHTML = isRec ? '<span class="rec">РЕКОРД</span>' : "";

    const perfectBonus = 1 + Math.min(0.25, (G.perfectAcc || 0) * 0.09) + Math.min(0.18, (G.bestStreak || 0) * 0.02);
  if ((G.perfectStreak || 0) > (save.streakBest || 0)){ save.streakBest = Math.round(G.perfectStreak*10)/10; }
  if ((G.perfectStreak || 0) > (G.bestStreak || 0)) G.bestStreak = G.perfectStreak;
  if ((G.perfectStreak || 0) >= 2.5 && !G.streakToast){
    G.streakToast = true;
    toast("Точная работа", "Серия точных подсечек ×" + (1 + Math.min(0.18, G.perfectStreak*0.02)).toFixed(2) + " к монетам.", 2400);
  }
    const tmC = timeMults(save.loc);
    const dayCoinK = (baitDayOn() ? 1.10 : 1) * (locDayOn() ? LOC_DAY_K.coins : 1) * tmC.coins *
      (waveOn(save.loc) ? BITE_WAVE.coins : 1);
    const coins = Math.round(f.weight/1000 * f.val * (1 + G.acc*0.35) * perfectBonus * (1 + perk("coin")) * dayCoinK);
    const dayXpK = 1 + (baitDayOn() ? BAIT_DAY.xp : 0);
    const xp = Math.round((f.xp + f.weight/1000*4) * (1 + perk("xp")) * dayXpK * (handActive() ? 1 + HAND.xp : 1));
    $("catchCoins").textContent = "+"+coins;
    $("catchXp").textContent = "+"+xp;
    const pearlCell = $("pearlCell");
    if (pearlCell) pearlCell.style.display = G.pearlFind ? "" : "none";
    const luckRow = $("clubLuckRow");
    if (luckRow){
      if (G.clubLuck && G.clubLuck.t > 0){
        luckRow.style.display = "";
        luckRow.innerHTML = ICONS.pearl + '<small>Клубный случай</small><b>+' + G.clubLuck.n + ' «' +
          BAITS[G.clubLuck.bait].name + '» · +' + G.clubLuck.coins + ' монет</b>';
      } else luckRow.style.display = "none";
    }

    save.coins += coins;
    const beforeLvl = levelInfo().lvl;
    save.xp += xp;
    save.total++; save.mass += f.weight;
    save.best = Math.max(save.best, f.weight);
    if (!save.caught[f.type]) save.caught[f.type] = {n:0,best:0};
    save.caught[f.type].n++;
    save.caught[f.type].best = Math.max(save.caught[f.type].best, f.weight);
    if (isRec) save.caught[f.type].isNew = true;
    $("catchTotal").textContent = save.caught[f.type].n;
    persist();

    const afterLvl = levelInfo().lvl;
    if (afterLvl > beforeLvl){ G.pendingLevel = afterLvl; }
    if ((G.perfectAcc || 0) > 0.9){
      // идеальное вываживание — шанс на жемчужину
      save.perfects = (save.perfects||0)+1;
      if (Math.random() < 0.22){
        save.pearl = (save.pearl||0)+1; save.pearlTotal = (save.pearlTotal||0)+1;
        G.pearlFind = true;
      }
    }
    G.perfectOnce = false;
    // 8.5: приметы — выход рыбы и любимая точка вида
    if (waveOn(save.loc)) questBump("wave");
    if (G.spot && isFishHome(f.type, G.spot)) questBump("home");
    questOnCatch(f);
  }
  // чипы-детали: погода, точка, точность заброса, запас прочности снасти
  const meta = $("catchMeta");
  if (meta){
    if (f.junk) meta.innerHTML = "";
    else {
      const wt = weatherNow();
      const F = FISH[f.type], rod = rodDef();
      const tight = F.reqPower > rod.power * 0.94;
      meta.innerHTML =
        ((G.perfectAcc || 0) > 0.9 ? '<span class="ok">идеальное вываживание</span>' : '') +
        ((G.bestStreak || 0) >= 1.5 ? '<span class="ok">серия ×' + (1 + Math.min(0.18, G.bestStreak*0.02)).toFixed(2) + '</span>' : '') +
        (baitDayOn() ? '<span class="gold">наживка дня +' + Math.round(BAIT_DAY.xp*100) + '% опыта</span>' : '') +
        (locDayOn() ? '<span class="gold">лучший день водоёма</span>' : '') +
        (windowOn() ? '<span class="gold">своё время +' + Math.round((WINDOW_K.klyov-1)*100) + '%</span>' : '') +
        (waveOn(save.loc) ? '<span class="gold">выход рыбы ×' + BITE_WAVE.size.toFixed(2) + '</span>' : '') +
        (afterStormOn() ? '<span class="gold">жор после грозы</span>' : '') +
        (lineNoticeK(save.loc).k > 0.99 ? '<span class="ok">леска не видна</span>' : '') +
        (seasonNow() === "autumn" ? '<span class="gold">осенний жор</span>' : '') +
        (handActive() ? '<span class="ok">прикормка</span>' : '') +
        (G.duel && G.duel.active ? '<span class="gold">дуэль · ' + G.duel.left + '</span>' : '') +
        '<span>'+(WEATHER_ICONS[wt.icon]||"")+wt.name+'</span>' +
        '<span>'+(G.spot ? G.spot.name + ' · ' + spotEnvText(G.spot, save.loc) : "—")+'</span>' +
        '<span>'+BAITS[F.bait].name+'</span>' +
        '<span class="'+(tight ? "warn":"ok")+'">' +
          (tight ? "снасть на пределе" : "снасть держит") + '</span>';
    }
  }
  updateChips();
  if (G.pearlFind){
    setTimeout(()=>{ floatText("+1 жемчуг", W*0.5, H*0.35, "#c9b6ff"); sfx.buy(); }, 300);
  }
  G.pearlFind = false;
  const tEl = $("toast"); if (tEl) tEl.classList.remove("on");
  ov.classList.add("on");
  G.cardOpen = true;
}

function unlockedText(lvl){
  const names = [];
  for (const k in LOCATIONS) if (LOCATIONS[k].unlock === lvl) names.push("водоём «"+LOCATIONS[k].name+"»");
  return names.length ? "Открыт " + names.join(" и ") : "Снасти в магазине стали сильнее";
}

/* ---------------- обновление ---------------- */
function update(dt){
  G.clock += dt;
  if (G.perfectFlashT > 0){
    G.perfectFlashT -= dt;
    G.perfectFlash = clamp(G.perfectFlashT/0.42, 0, 1);
  } else G.perfectFlash = 0; G.t += dt;
  if (!START.on) updateSplashes(dt);
  if (G.shake > 0) G.shake = Math.max(0, G.shake - dt*40);
  if (G.flash > 0) G.flash = Math.max(0, G.flash - dt*1.6);
  if (G.rarityFlash) { G.rarityFlash.t -= dt; if (G.rarityFlash.t <= 0) G.rarityFlash = null; }

  for (let i=G.particles.length-1;i>=0;i--){
    const p = G.particles[i];
    p.life -= dt; p.vy += 520*dt; p.x += p.vx*dt; p.y += p.vy*dt;
    if (p.life <= 0) G.particles.splice(i,1);
  }
  for (let i=G.rings.length-1;i>=0;i--){
    const r = G.rings[i]; r.r += dt*85; r.a -= dt*1.05;
    if (r.a <= 0) G.rings.splice(i,1);
  }
  for (let i=G.floatingTexts.length-1;i>=0;i--){
    const ft = G.floatingTexts[i];
    ft.life -= dt; ft.y -= dt*28;
    if (ft.life <= 0) G.floatingTexts.splice(i,1);
  }

  const g = geo();
  updateWX(dt);
  updateIce(dt);
  updateBuoy(dt);

  if (G.leap){
    G.leap.t += dt;
    const k = Math.min(1, G.leap.t/0.72);
    G.leap.x = lerp(G.bobX, W*0.80, k);
    G.leap.y = lerp(g.surfaceY, g.rodTip.y - 10, k) - Math.sin(k*Math.PI)*H*0.16;
    G.leap.spin = (1-k)*Math.sin(k*9)*0.9;   // рыба вращается, «вырываясь» из воды
    // капли срываются с рыбы
    if (k < 0.9 && Math.random() < 0.55){
      G.particles.push({x:G.leap.x + rnd(-16,16), y:G.leap.y + rnd(0,18), vx:rnd(-50,20), vy:rnd(-10,60),
        life:rnd(0.25,0.6), r:rnd(1,2.4), color:"rgba(226,250,255,"});
    }
    if (G.leap.t > 0.8) G.leap = null;
  }

  switch (G.state){
    case "power": {
      G.powerT += dt;
      const speed = 1.15;
      const raw = (G.powerT*speed) % 2;
      G.power = 0.08 + (raw < 1 ? raw : 2-raw) * 0.94;
      $("powerNeedle").style.left = (G.power*100)+"%";
      hint("Сила: "+Math.round(G.power*100)+"%", true);
      break;
    }
    case "casting": {
      G.castT += dt;
      // к цели летим по дуге — как настоящий заброс
      const k = Math.pow(clamp(G.castT/G.castDur, 0, 1), 1.7);
      G.bobX = lerp(G.castFrom.x, G.bobTarget, k);
      G.bobY = lerp(G.castFrom.y, wY(), k) - Math.sin(k*Math.PI)*H*(0.12 + G.lockedPower*0.16);
      if (k >= 1){
        G.bobY = wY();
        sfx.splash(); ring(G.bobX); burst(G.bobX, wY(), 10, 140);
        startWaiting();
      }
      break;
    }
    case "waiting": {
      // телеграф: за ~1.1 с до поклёвки рыба подходит к поплавку
      G.approach = (G.waitDur < 1.1) ? clamp(1 - G.waitDur/1.1, 0, 1) : 0;
      // «прозрачность» воды: ясно + тишь = рыба осторожнее и клюёт реже
      const ic = weatherNow().icon;
      G.waterClear = (ic === "sun" || ic === "moon") && Math.abs(G.drift || 0) < 0.45;
      // перед «поклёвкой» поплавок начинает дрожать — рыба вот-вот возьмёт
      // мормышка: короткие подёргивания придают «живость» и ускоряют поклёвку
      // снос поплавка ветром: тянет по воде, вода отвечает колечками
      if (G.drift){
        G.driftPh = (G.driftPh || 0) + dt * (0.6 + Math.abs(G.drift));
        G.bobX += Math.cos(G.driftPh) * G.drift * dt * 26;
        G.bobX = clamp(G.bobX, W*0.06, W*0.94);
        if (Math.random() < dt * Math.abs(G.drift) * 1.4){
          G.rings.push({ x:G.bobX - Math.sign(G.drift)*rnd(4,14), y:0, r:3, a:0.5 });
        }
      }
      G.bobY = wY() + Math.sin(G.clock*2.1)*2.2
        + (G.falseBite ? Math.sin(Math.min(1, G.falseBite)*Math.PI) * 7 : 0)
        + (G.jigT > 0 ? Math.sin(G.clock*26)*(save.loc === "winter" ? 5.2 : 2.4) * (G.jigT/0.42) : 0);
      // (ускорение от подёргиваний считается один раз — в pressStart, а не в апдейте)
      if (G.jigT > 0) G.jigT = Math.max(0, G.jigT - dt);
      // «заинтересованность»: интерес растёт, поплавок всё чаще шевелится
      G.interest = clamp((G.interest || 0) + dt * 0.115 * (G.fish && G.fish.noBite ? 0.15 : 1), 0, 1);
      G.pureCasts = Math.max(0, (G.pureCasts || 0) - dt);
      G.nibble -= dt;
      if (!G.nibbling && G.nibble <= 0){
        G.nibbling = true;
        G.nibble = 0.30 + Math.random()*0.12;
        ring(G.bobX);
        tone(1500, 0.03, "sine", 0.012 + G.interest*0.014);
      }
      else if (G.nibbling){
        G.nibble -= dt;
        if (G.nibble <= 0){
          G.nibbling = false;
          // чем выше интерес — тем чаще «пробные» касания
          G.nibble = (0.85 + Math.random()*1.5) * (1 - 0.55*G.interest);
        }
      }
      // ложная поклёвка: поплавок ныряет на миг, но подсекать рано
      if (!G.falseBite && G.interest > 0.45 && !(G.fish && G.fish.noBite) && Math.random() < dt*0.09*(1+G.interest)){
        G.falseBite = 1;
        ring(G.bobX); ring(G.bobX + 7);
        tone(1200, 0.05, "sine", 0.02);
      }
      if (G.falseBite > 0) G.falseBite = Math.max(0, G.falseBite - dt*2.6);
      G.waitDur -= dt;
      if (G.waitDur <= 0) beginBite();
      break;
    }
    case "bite": {
      G.biteAt += dt*1000;
      G.bobY = wY() + 6 + Math.sin(G.biteAt*0.045)*9;
      if (G.biteAt > G.biteWindow) fail("miss");
      break;
    }
    case "snag": updateSnag(dt); break;
    case "fight": updateFight(dt, g); break;
  }

  // шкалы
  if (G.state === "fight"){
    $("tensionNeedle").style.left = (clamp(G.tension,0,1.12)*100)+"%";
    const pz = $("perfectZone");
    if (pz) pz.classList.toggle("on", G.state === "fight");
    const tw = $("tensionWrap");
    if (tw) tw.classList.toggle("perfect", G.state === "fight" && G.perfectT > 0);
    const sr = $("streakRow");
    if (sr){
      const st = G.perfectStreak || 0;
      sr.classList.toggle("on", G.state === "fight" && st > 0.15);
      sr.classList.toggle("hot", st >= 2.5);
      const sv = $("streakVal");
      if (sv) sv.textContent = "×" + (1 + Math.min(0.18, st*0.02)).toFixed(2);
      const si = $("streakIco");
      if (si && !si.innerHTML) si.innerHTML = ICONS.bolt;
    }
    $("progFill").style.width = (clamp(G.progress,0,1)*100)+"%";
    const p = G.tension > 0.93 ? "danger" : "";
    $("tensionNeedle").style.boxShadow = p
      ? "0 0 0 1.5px rgba(120,30,10,.75), 0 0 20px 4px rgba(255,80,50,.95)"
      : (G.perfectT > 0 ? "0 0 0 1.5px rgba(20,80,40,.7), 0 0 18px 4px rgba(120,255,170,.95)"
                        : "0 0 0 1.5px rgba(15,30,36,.55), 0 0 14px rgba(255,255,255,.92)");
  }
}

function updateFight(dt, g){
  const f = G.fish, P = G.pull;
  if (!f || !f.p) return;

  // слабая снасть не удержит трофей: шанс схода растёт с разницей сил
  if (!f.junk && FISH[f.type]){
    const need = FISH[f.type].reqPower, have = gearPower();
    if (need > have){
      const over = (need - have) / Math.max(40, have);
      if (!f.snapT) f.snapT = 0;
      if (G.hold && G.progress < 0.65){
        f.snapT += dt * over * 0.75;
      } else {
        f.snapT = Math.max(0, f.snapT - dt*0.6);
      }
      if (f.snapT > 1.35){ fail("weak"); return; }
      if (!G.weakShown){
        G.weakShown = true;
        hint("Снасть на пределе — рыба может сорваться", true);
      }
    }
  }

  if (P.warn > 0) P.warn -= dt;
  if (!P.active){
    P.timer -= dt;
    if (P.timer <= 0 && P.warn <= 0 && !P.pending){
      P.warn = 0.2; P.pending = true; sfx.pull(); buzz(8);
      P.timer = rnd(f.p.pullEvery[0], f.p.pullEvery[1]);
    }
    if (P.pending && P.warn <= 0){
      P.pending = false; P.active = true; P.activeT = 0;
      P.dur = rnd(f.p.pullDur[0], f.p.pullDur[1]);
      G.shake = 4; burst(G.bobX, wY(), 7, 150);
      sfx.pull(); buzz(8);
    }
  } else {
    P.activeT += dt;
    if (P.activeT >= P.dur) P.active = false;
  }

  let rate = G.hold ? f.p.holdGain : -f.p.decay;
  if (P.active) rate += f.p.pullPower;
  G.tension = clamp(G.tension + rate*dt, 0, 1.2);
  if (!isFinite(G.tension)) G.tension = 0.5;
  if (!isFinite(G.progress)) G.progress = 0;

  const inGreen = G.tension >= GREEN_LO && G.tension <= f.p.hi;
  const inPerfect = G.tension >= 0.63 && G.tension <= 0.75;
  if (inPerfect && G.hold){
    G.perfectT = 0.25;
    G.progress += f.p.progress*netDef().progress*dt*1.35*(1 + Math.min(0.25, G.perfectStreak*0.06));
    G.perfectAcc = (G.perfectAcc || 0) + dt;
    if (!G.perfectShown){ G.perfectShown = true; floatText("ИДЕАЛЬНО", G.bobX, wY()-60, "#a7f0bd"); }
    if (!G.perfectFlashT || G.perfectFlashT <= 0) G.perfectFlashT = 0.42;
    G.perfectOnce = true;
  }
  else if (inGreen){ G.progress += f.p.progress*netDef().progress*dt; }
  else if (G.tension < 0.28){ G.progress -= f.p.progress*0.5*dt; }
  if (G.perfectT > 0) G.perfectT -= dt;
  G.progress = clamp(G.progress, 0, 1);

  const shakeAmt = (P.active ? 7 : 2.5) + G.progress*3;
  if (P.active && G.hold) G.shake = Math.max(G.shake, 2.2);
  G.bobY = wY() + Math.sin(G.clock*11)*shakeAmt*0.5 + (P.active?4:0);
  if (Math.random() < (P.active?0.3:0.05)) ring(G.bobX + rnd(-12,12));

  // живые подсказки
  const msg = G.tension > f.p.hi ? "Отпусти! Сейчас порвётся"
            : G.tension < 0.22 ? "Слабина! Подтяни"
            : G.perfectT > 0 ? "Идеально держишь"
            : "";
  if (msg !== G.lastHint){
    G.lastHint = msg;
    if (msg) hint(msg, true);
    else hint("Держи в зелёной зоне · отпускай у красного", true);
  }

  /* серия идеальных подсечек: держишь точно — растёт, уходишь из зоны — тает */
  if (inPerfect && G.hold) G.perfectStreak = Math.min(9, G.perfectStreak + dt*1.6);
  else if (G.perfectStreak > 0) G.perfectStreak = Math.max(0, G.perfectStreak - dt*2.4);
  G.perfectStreak = Math.round(G.perfectStreak*10)/10;
  if (G.tension >= 1.0){ fail("break"); return; }
  if (G.tension <= 0.06){
    G.slackT += dt;
    if (G.slackT > 1.7 * netDef().netSlack * hookDef().escape){ fail("lost"); return; }
  } else G.slackT = Math.max(0, G.slackT - dt*2);

  if (G.progress >= 1) succeed();
}

/* ---------------- отрисовка ---------------- */
function drawCover(img, x=0, y=0, w=W, h=H){
  if (!img || !img.complete || !img.naturalWidth) return false;
  const ir = img.naturalWidth/img.naturalHeight, r = w/h;
  let dw, dh;
  if (ir > r){ dh = h; dw = h*ir; } else { dw = w; dh = w/ir; }
  ctx.drawImage(img, x+(w-dw)/2, y+(h-dh)/2, dw, dh);
  return true;
}

/* ---- подводный слой: тёмная толща, пузыри, водоросли, блики света ---- */
function drawUnderwater(g){
  const t = G.clock;
  const night = save.loc === "night";
  const top = g.surfaceY;
  const isSea = save.loc === "sea", isIce = iceNow();   // 8.7: лёд по сезону
  const wt = (locMech().water) || "calm";
  const grd = ctx.createLinearGradient(0, top, 0, H);
  if (wt === "brown"){
    // топь: ржаво-зелёная взвесь, хуже видно, теплее
    grd.addColorStop(0, "rgba(58,44,18,0.18)");
    grd.addColorStop(0.45, "rgba(38,34,12,0.34)");
    grd.addColorStop(1, "rgba(14,16,6,0.66)");
  } else if (wt === "turquoise"){
    grd.addColorStop(0, "rgba(20,120,140,0.10)");
    grd.addColorStop(0.45, "rgba(10,90,120,0.24)");
    grd.addColorStop(1, "rgba(4,44,72,0.50)");
  } else if (wt === "clear"){
    grd.addColorStop(0, "rgba(20,80,110,0.05)");
    grd.addColorStop(0.5, "rgba(14,60,92,0.14)");
    grd.addColorStop(1, "rgba(4,24,42,0.36)");
  } else if (isSea){
    grd.addColorStop(0, "rgba(10,52,80,0.10)");
    grd.addColorStop(0.45, "rgba(6,38,66,0.30)");
    grd.addColorStop(1, "rgba(2,14,30,0.62)");
  } else if (isIce){
    grd.addColorStop(0, "rgba(190,225,245,0.10)");
    grd.addColorStop(0.4, "rgba(90,140,170,0.14)");
    grd.addColorStop(1, "rgba(30,70,100,0.34)");
  } else if (night){
    grd.addColorStop(0, "rgba(8,22,40,0.20)");
    grd.addColorStop(1, "rgba(2,8,16,0.70)");
  } else {
    grd.addColorStop(0, "rgba(10,52,62,0.06)");
    grd.addColorStop(0.5, "rgba(8,40,52,0.20)");
    grd.addColorStop(1, "rgba(3,20,28,0.46)");
  }
  ctx.fillStyle = grd;
  ctx.fillRect(0, top, W, H-top);

  // лучи света сквозь воду
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const beamCol = isIce ? "rgba(220,245,255," : night ? "rgba(150,190,255," : "rgba(255,240,200,";
  for (let i=0;i<4;i++){
    const ph = (t*0.05 + i*0.26) % 1;
    const x = W*(0.1 + ph*0.9);
    const a = 0.022 * Math.sin(ph*Math.PI) * (isSea ? 1.4 : 1);
    ctx.beginPath();
    ctx.moveTo(x - 14, top);
    ctx.lineTo(x + 14, top);
    ctx.lineTo(x + 54, H);
    ctx.lineTo(x + 12, H);
    ctx.closePath();
    ctx.fillStyle = beamCol + a + ")";
    ctx.fill();
  }
  ctx.restore();

  // пузыри
  for (let i=0;i<12;i++){
    const ph = (t*0.16 + i*0.083) % 1;
    const x = W*((i*0.137 + Math.sin(t*0.4+i)*0.02) % 1);
    const y = H - ph*(H-top*0.9);
    const r = 1.6 + (i%3)*1.1;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI*2);
    ctx.strokeStyle = "rgba(220,245,255,"+(0.10+0.18*Math.sin(ph*Math.PI))+")";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // дно и водоросли
  const floorY = H*0.93;
  ctx.beginPath();
  ctx.moveTo(0,H);
  for (let x=0;x<=W;x+=24){
    ctx.lineTo(x, floorY + Math.sin(x*0.02)*7 + Math.sin(x*0.008+1)*10);
  }
  ctx.lineTo(W,H); ctx.closePath();
  ctx.fillStyle = isSea ? "rgba(6,22,34,.55)" : isIce ? "rgba(24,48,64,.45)" : "rgba(4,20,24,.55)";
  ctx.fill();
  // водоросли
  const weedCol = isSea ? "rgba(30,80,70,.45)" : isIce ? "rgba(40,70,80,.35)" : "rgba(24,66,44,.5)";
  for (let i=0;i<7;i++){
    const bx = W*(0.08 + i*0.14);
    const hh = H*(0.06 + ((i*37)%10)/100);
    ctx.beginPath();
    ctx.moveTo(bx, floorY+4);
    ctx.quadraticCurveTo(bx + Math.sin(t*0.9+i)*26, floorY - hh*0.6, bx + Math.sin(t*0.7+i*1.7)*44, floorY - hh);
    ctx.strokeStyle = weedCol;
    ctx.lineWidth = 3.4;
    ctx.lineCap = "round";
    ctx.stroke();
  }
}

function drawScene(g){
  const bgKey = LOC_BG[save.loc] || "bgSurface";
  if (!drawCover(images[bgKey])){ ctx.fillStyle = "#0d2830"; ctx.fillRect(0,0,W,H); }

  // тон воды
  const isNight = save.loc === "night";
  const grd = ctx.createLinearGradient(0, g.surfaceY-40, 0, H);
  grd.addColorStop(0, isNight ? "rgba(10,26,44,0.05)" : "rgba(16,70,84,0.02)");
  grd.addColorStop(0.45, isNight ? "rgba(6,20,34,0.35)" : "rgba(10,52,66,0.20)");
  grd.addColorStop(1, isNight ? "rgba(2,10,18,0.72)" : "rgba(4,26,34,0.52)");
  ctx.fillStyle = grd;
  ctx.fillRect(0, g.surfaceY-40, W, H-(g.surfaceY-40));

  // настроение новых водоёмов: солнце на море, холод на льду
  if (save.loc === "sea"){
    const warm = ctx.createLinearGradient(0, 0, 0, g.surfaceY);
    warm.addColorStop(0, "rgba(255,150,60,0.10)");
    warm.addColorStop(1, "rgba(255,190,120,0.02)");
    ctx.fillStyle = warm; ctx.fillRect(0,0,W,g.surfaceY);
    const cool = ctx.createLinearGradient(0, g.surfaceY, 0, H);
    cool.addColorStop(0, "rgba(6,40,70,0.10)");
    cool.addColorStop(1, "rgba(2,18,36,0.30)");
    ctx.fillStyle = cool; ctx.fillRect(0, g.surfaceY, W, H-g.surfaceY);
  }
  if (iceNow()){
    ctx.fillStyle = "rgba(150,200,235,0.10)";
    ctx.fillRect(0,0,W,H);
  }
  /* 8.0: настроение новых водоёмов */
  if (save.loc === "swamp"){
    const bog = ctx.createLinearGradient(0, 0, 0, H);
    bog.addColorStop(0, "rgba(46,44,18,0.20)");
    bog.addColorStop(0.5, "rgba(30,34,12,0.16)");
    bog.addColorStop(1, "rgba(10,16,6,0.34)");
    ctx.fillStyle = bog; ctx.fillRect(0,0,W,H);
    // тёплая дымка над водой
    const mist = ctx.createLinearGradient(0, g.surfaceY - H*0.6, 0, g.surfaceY + H*0.08);
    mist.addColorStop(0, "rgba(120,140,90,0)");
    mist.addColorStop(0.7, "rgba(150,165,110,0.10)");
    mist.addColorStop(1, "rgba(140,150,100,0)");
    ctx.fillStyle = mist; ctx.fillRect(0, g.surfaceY - H*0.6, W, H*0.68);
  }
  if (save.loc === "mountain"){
    const cold = ctx.createLinearGradient(0, 0, 0, H);
    cold.addColorStop(0, "rgba(150,200,255,0.10)");
    cold.addColorStop(0.45, "rgba(120,180,235,0.05)");
    cold.addColorStop(1, "rgba(6,30,50,0.22)");
    ctx.fillStyle = cold; ctx.fillRect(0,0,W,H);
  }
  if (save.loc === "lagoon"){
    const warmSun = ctx.createLinearGradient(0, 0, 0, g.surfaceY);
    warmSun.addColorStop(0, "rgba(255,220,140,0.12)");
    warmSun.addColorStop(1, "rgba(255,235,190,0.03)");
    ctx.fillStyle = warmSun; ctx.fillRect(0,0,W,g.surfaceY);
    const glowW = ctx.createLinearGradient(0, g.surfaceY, 0, H);
    glowW.addColorStop(0, "rgba(60,230,220,0.12)");
    glowW.addColorStop(0.5, "rgba(20,180,190,0.08)");
    glowW.addColorStop(1, "rgba(4,60,80,0.22)");
    ctx.fillStyle = glowW; ctx.fillRect(0, g.surfaceY, W, H-g.surfaceY);
  }

  // линия горизонта на воде
  const sg = ctx.createLinearGradient(0, g.surfaceY-26, 0, g.surfaceY+16);
  sg.addColorStop(0, isNight ? "rgba(160,190,255,0.05)" : "rgba(255,220,180,0.10)");
  sg.addColorStop(0.5, isNight ? "rgba(200,220,255,0.14)" : "rgba(255,235,205,0.22)");
  sg.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = sg;
  ctx.fillRect(0, g.surfaceY-26, W, 42);

  // подводный слой в бою
  if (G.state === "fight" || G.state === "result" || (G.state==="bite")){
    const top = g.surfaceY - 6;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, top, W, H-top); ctx.clip();
    ctx.globalAlpha = isNight ? 0.3 : 0.4;
    if (images.bgUnder.complete) drawCover(images.bgUnder, 0, top - H*0.05, W, H-top + H*0.05);
    ctx.globalAlpha = 1;
    const seam = ctx.createLinearGradient(0, top, 0, top+92);
    seam.addColorStop(0, isNight ? "rgba(90,120,170,0.4)" : "rgba(232,196,168,0.5)");
    seam.addColorStop(0.4, "rgba(120,150,155,0.18)");
    seam.addColorStop(1, "rgba(10,45,58,0)");
    ctx.fillStyle = seam; ctx.fillRect(0, top, W, 92);
    ctx.fillStyle = isNight ? "rgba(2,14,24,0.4)" : "rgba(4,30,40,0.26)";
    ctx.fillRect(0, top, W, H-top);
    ctx.restore();
  }
}

/* ---------- зимняя рыбалка: снег, пар, треск льда, бурение лунки ---------- */
const ICE = { flakes: [], cracks: [], drill: 0, drilled: 0, breath: 0 };
function initIce(){
  ICE.flakes = [];
  for (let i=0;i<70;i++){
    ICE.flakes.push({
      x: Math.random(), y: Math.random(),
      r: rnd(0.9, 2.6), sp: rnd(0.02, 0.075), sw: rnd(0.15, 0.6),
      ph: Math.random()*Math.PI*2, a: rnd(0.35, 0.9)
    });
  }
  ICE.cracks = [];
  ICE.drill = 0; ICE.drilled = 0; ICE.breath = 0;
}
/* бурение лунки при входе на зимний водоём и при выборе новой точки */
function startDrill(){
  if (save.loc !== "winter") return;
  if (ICE.drill > 0) return;
  ICE.drill = 1; ICE.drilled = 0;
}
function updateIce(dt){
  if (save.loc !== "winter"){ ICE.drill = 0; return; }
  for (const f of ICE.flakes){
    f.y += f.sp*dt;
    f.x += Math.sin(G.clock*f.sw + f.ph)*dt*0.02 + dt*0.004;
    if (f.y > 1){ f.y -= 1; f.x = Math.random(); }
    if (f.x > 1) f.x -= 1;
    if (f.x < 0) f.x += 1;
  }
  if (ICE.drill > 0){
    const was = ICE.drill;
    ICE.drill = Math.max(0, ICE.drill - dt*0.55);
    ICE.drilled = Math.min(1, ICE.drilled + dt*0.62);
    if (Math.random() < dt*22){
      const ix = (G.state === "idle" || G.state === "aim") ? W*0.5 : G.bobX;
      G.particles.push({x: ix + rnd(-20,20), y: wY() + rnd(-4,4), vx: rnd(-70,70), vy: rnd(-120,-20),
        life: rnd(0.3,0.7), r: rnd(0.8,2), color:"rgba(235,250,255,"});
    }
    if (was > 0 && ICE.drill === 0){ buzz(20); if (sfx.splash) sfx.splash(); }
  }
  // треск льда
  if (Math.random() < dt*0.30){
    ICE.cracks.push({ x: Math.random()*W, y: wY() + rnd(-30, 60), life: 1,
      pts: Array.from({length:5},()=>rnd(-1,1)) });
  }
  for (let i=ICE.cracks.length-1;i>=0;i--){
    ICE.cracks[i].life -= dt*0.5;
    if (ICE.cracks[i].life <= 0) ICE.cracks.splice(i,1);
  }
  // «выдох» пара раз в пару секунд
  ICE.breath -= dt;
  if (ICE.breath <= -2.4) ICE.breath = 1.1;
}
function drawIce(g){
  if (save.loc !== "winter") return;
  ctx.save();
  for (const f of ICE.flakes){
    ctx.globalAlpha = f.a;
    ctx.fillStyle = "#f4fbff";
    ctx.beginPath();
    ctx.arc(f.x*W, f.y*H*0.98, f.r, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.restore();
  // трещины на льду
  ctx.save();
  for (const c of ICE.cracks){
    const a = clamp(c.life, 0, 1);
    ctx.strokeStyle = "rgba(235,250,255,"+(a*0.35)+")";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(c.x, c.y);
    let x = c.x, y = c.y;
    for (let i=0;i<4;i++){ x += c.pts[i]*22; y += 12 + Math.abs(c.pts[i])*10; ctx.lineTo(x, y); }
    ctx.stroke();
  }
  ctx.restore();
  // пар изо рта
  if (ICE.breath > 0){
    const k = 1 - ICE.breath/1.1;
    ctx.save();
    for (let i=0;i<3;i++){
      const cx = W*0.14 + k*40 + i*10, cy = H*0.30 - k*46 - i*8;
      const rx = 12 + k*30, ry = 8 + k*18;
      const grd = ctx.createRadialGradient(cx, cy, 1, cx, cy, rx);
      grd.addColorStop(0, "rgba(234,246,255,"+(0.20*(1-k))+")");
      grd.addColorStop(0.55, "rgba(228,242,252,"+(0.09*(1-k))+")");
      grd.addColorStop(1, "rgba(228,242,252,0)");
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }
  // бурение: шнек и ледяная крошка
  if (ICE.drill > 0){
    const hole = holeXY();
    const ix = hole.x, iy = hole.y - 2;
    const vis = clamp(ICE.drill*1.4, 0, 1);
    ctx.save();
    ctx.globalAlpha = vis;
    ctx.translate(ix, iy - 96 + Math.sin(G.clock*30)*2.5);
    ctx.rotate(Math.sin(G.clock*26)*0.10);
    ctx.fillStyle = "#2a3a4a";
    ctx.fillRect(-3.5, -26, 7, 34);
    ctx.fillStyle = "#c9683a";
    ctx.fillRect(-9, -30, 18, 7);
    ctx.fillStyle = "#cfdbe6";
    ctx.fillRect(-4, 8, 8, 84);
    ctx.strokeStyle = "rgba(90,120,145,.95)"; ctx.lineWidth = 2.4;
    for (let i=0;i<6;i++){
      ctx.beginPath(); ctx.ellipse(0, 14 + i*13, 8, 4, 0.4, 0, Math.PI*2); ctx.stroke();
    }
    ctx.fillStyle = "#eef8ff";
    ctx.beginPath(); ctx.moveTo(-12, 92); ctx.lineTo(12, 92); ctx.lineTo(0, 108); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 0.9;
    for (let i=0;i<5;i++){
      const a = (G.clock*2 + i*1.3) % 1;
      ctx.fillStyle = "rgba(238,250,255,"+(0.5*(1-a))+")";
      ctx.beginPath();
      ctx.arc(ix - 34 + i*17 + Math.sin(G.clock*8+i)*4, iy - a*34, 2.2, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.restore();
  }
}

/* ---------- ветер: сносит поплавок и усложняет точный заброс ---------- */
function windNow(){
  const icon = weatherNow().icon;
  const base = icon === "thunder" ? 1.5 : icon === "rain" ? 1.1 : icon === "snow" ? 0.9 : icon === "mist" ? 0.35 : 0.6;
  const dir = Math.sin(G.clock*0.07) * 0.6 + Math.sin(G.clock*0.021 + 1.7) * 0.4;
  return { dir, power: base };
}

/* ---------- погодные эффекты ---------- */
const WX = { drops: [], bolts: [], t: 0, flash: 0 };
function initWX(){
  WX.drops = [];
  const n = 150;
  for (let i=0;i<n;i++) WX.drops.push({x:Math.random(), y:Math.random(), l:rnd(9,20), sp:rnd(0.9,1.7), o:rnd(0.2,0.6)});
}
function updateWX(dt){
  WX.t += dt;
  if (WX.flash > 0) WX.flash = Math.max(0, WX.flash - dt*3.2);
  const w = weatherNow();
  if (w.icon !== "rain" && w.icon !== "storm"){ WX.bolts.length = 0; return; }
  for (const d of WX.drops){
    d.y += d.sp*dt*0.85;
    d.x += dt*0.06;
    if (d.y > 1){ d.y -= 1; d.x = Math.random(); }
    if (d.x > 1) d.x -= 1;
  }
  if (w.icon === "storm" && Math.random() < dt*0.22){
    WX.bolts.push({x:rnd(0.15,0.85), life:0.5, seed:Math.random()*99});
    WX.flash = 1;
    sfx.thunder();
  }
  for (let i=WX.bolts.length-1;i>=0;i--){ WX.bolts[i].life -= dt; if (WX.bolts[i].life <= 0) WX.bolts.splice(i,1); }
}
function drawWX(g){
  const w = weatherNow();
  if (w.icon === "rain" || w.icon === "storm"){
    ctx.save();
    ctx.strokeStyle = w.icon === "storm" ? "rgba(205,225,255,.75)" : "rgba(215,238,255,.6)";
    ctx.lineWidth = 1.5;
    for (const d of WX.drops){
      const x = d.x*W, y = d.y*H*0.62;
      ctx.globalAlpha = d.o;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 2.5, y + d.l*1.15);
      ctx.stroke();
    }
    ctx.restore();
  }
  if (w.icon === "fog"){
    ctx.save();
    for (let i=0;i<3;i++){
      const y = g.surfaceY - H*0.05 + i*H*0.075;
      const off = (G.clock*0.014*(i+1) + i*0.33) % 1;
      const cx = W*(0.1+off*0.8);
      const grd = ctx.createRadialGradient(cx, y, 4, cx, y, W*0.72);
      grd.addColorStop(0, "rgba(228,242,248,"+(0.075 + i*0.02)+")");
      grd.addColorStop(0.55, "rgba(228,242,248,"+(0.04 + i*0.012)+")");
      grd.addColorStop(1, "rgba(228,242,248,0)");
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.ellipse(cx, y, W*0.72, H*0.065, 0, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.restore();
  }
  if (WX.bolts.length){
    ctx.save();
    for (const b of WX.bolts){
      const a = clamp(b.life*2, 0, 1);
      ctx.globalAlpha = a*0.85;
      ctx.strokeStyle = "#eaf4ff";
      ctx.lineWidth = 2.4;
      ctx.shadowColor = "#9ecbff"; ctx.shadowBlur = 18;
      ctx.beginPath();
      let x = b.x*W, y = 0;
      ctx.moveTo(x, y);
      for (let i=1;i<=7;i++){
        x += Math.sin(b.seed + i*2.1)*W*0.03;
        y = (i/7)*g.surfaceY*0.92;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }
  if (WX.flash > 0){
    ctx.fillStyle = "rgba(200,225,255,"+(WX.flash*0.20)+")";
    ctx.fillRect(0,0,W,H);
  }
  // общая засветка от погоды
  if (w.light < 1){
    ctx.fillStyle = "rgba(12,22,34,"+((1-w.light)*0.42)+")";
    ctx.fillRect(0,0,W,H);
  }
  if (w.icon === "sun"){
    const grd = ctx.createRadialGradient(W*0.72, H*0.06, 10, W*0.72, H*0.06, W*0.7);
    grd.addColorStop(0, "rgba(255,225,160,.16)");
    grd.addColorStop(1, "rgba(255,225,160,0)");
    ctx.fillStyle = grd; ctx.fillRect(0,0,W,H*0.7);
  }
}

let ambient = null;
function initAmbient(){
  const n = 42;
  ambient = [];
  for (let i=0;i<n;i++){
    ambient.push({
      x: Math.random(), y: Math.random(),
      r: rnd(0.7, 2.0), sp: rnd(0.004, 0.016),
      ph: Math.random()*Math.PI*2, a: rnd(0.16, 0.55)
    });
  }
}
function drawAmbient(g){
  if (!ambient) initAmbient();
  if (!ICE.flakes.length) initIce();
  const night = save.loc === "night";
  ctx.save();
  for (const p of ambient){
    const yy = ((p.y + G.clock*p.sp) % 1);
    const t = G.clock*1.4 + p.ph;
    const x = (p.x + Math.sin(t*0.6)*0.012) * W;
    const y = (g.surfaceY*0.95) * (1-yy) + H*0.02;
    if (y > g.surfaceY+8) continue;
    const tw = night ? (0.5 + 0.5*Math.sin(t*2.2)) : (0.55 + 0.45*Math.sin(t*1.3));
    ctx.globalAlpha = p.a * tw;
    ctx.beginPath();
    ctx.arc(x, y, p.r*(night?1.15:1), 0, Math.PI*2);
    ctx.fillStyle = night ? "#ffe9a3" : "#fff6e0";
    ctx.fill();
    if (night){
      ctx.globalAlpha = p.a*tw*0.25;
      ctx.beginPath(); ctx.arc(x, y, p.r*3.4, 0, Math.PI*2);
      ctx.fillStyle = "#ffd166"; ctx.fill();
    }
  }
  // блики на воде
  ctx.globalAlpha = 1;
  const glints = 7;
  for (let i=0;i<glints;i++){
    const ph = (G.clock*0.22 + i*0.31) % 1;
    const x = (0.08 + ((i*0.137 + ph*0.06) % 0.85)) * W;
    const y = g.surfaceY + H*0.02 + ((i*0.09 + ph*0.35) % 1) * H*0.22;
    const a = Math.sin(ph*Math.PI) * (night ? 0.30 : 0.20);
    ctx.globalAlpha = a;
    ctx.beginPath();
    ctx.ellipse(x, y, 16*(0.6+ph), 2.2, 0, 0, Math.PI*2);
    ctx.fillStyle = night ? "#cfe4ff" : "#ffffff";
    ctx.fill();
  }
  ctx.restore();
}

/* ---------------- 7.5: новые слои визуала ---------------- */
/* 1) дорожка солнечного света по воде — «столб» бликов от солнца/луны */
function drawSunPath(g){
  if (iceNow()) return;
  const ic = weatherNow().icon;
  if (!["sun","sunny","frost","moon"].includes(ic)) return;
  const night = ic === "moon";
  const sx = W*0.62, sy = g.surfaceY;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const cols = night ? [198, 224, 255] : [255, 226, 170];
  for (let i=0;i<16;i++){
    const ph = (G.clock*0.22 + i*0.13) % 1;
    const y = sy + ph*H*0.30;
    const spread = 0.06 + ph*0.20;
    const x = sx + Math.sin(G.clock*0.7 + i*1.7)*W*spread*0.28 + (i%2 ? 1 : -1)*W*0.012;
    const w = W*(0.05 + ph*0.10) * (0.6 + 0.4*Math.sin(i + G.clock*1.6));
    const a = (1-ph) * (night ? 0.10 : 0.13);
    ctx.beginPath();
    ctx.ellipse(x, y, w, 1.6 + ph*2.2, 0, 0, Math.PI*2);
    ctx.fillStyle = "rgba("+cols[0]+","+cols[1]+","+cols[2]+","+a+")";
    ctx.fill();
  }
  ctx.restore();
}

/* 2) «живые» листья и пух над водой — усиливает глубину кадра */
const LITTER = [];
function initLitter(){
  LITTER.length = 0;
  for (let i=0;i<9;i++) LITTER.push({ x:Math.random(), y:Math.random(),
    sp:0.04 + Math.random()*0.06, r:1.6 + Math.random()*2.4,
    ph:Math.random()*6.28, rot:(Math.random()-0.5)*0.8, kind:i%3 });
}
function drawLitter(g){
  if (!LITTER.length) initLitter();
  if (iceNow()) return;
  const night = save.loc === "night";
  ctx.save();
  for (const p of LITTER){
    const yy = ((p.y + G.clock*p.sp) % 1);
    const x = (p.x + Math.sin(G.clock*0.5 + p.ph)*0.03) * W;
    const y = yy*(g.surfaceY*0.92) + H*0.03;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(p.rot + Math.sin(G.clock*0.9 + p.ph)*0.5);
    ctx.globalAlpha = (night ? 0.20 : 0.30) * (0.4 + 0.6*Math.sin(G.clock*1.2 + p.ph));
    if (p.kind === 0){
      ctx.beginPath(); ctx.ellipse(0, 0, p.r*1.9, p.r*0.8, 0.6, 0, Math.PI*2);
      ctx.fillStyle = night ? "#8fa9c9" : "#cfe0a8"; ctx.fill();
    } else if (p.kind === 1){
      ctx.beginPath(); ctx.arc(0, 0, p.r*0.75, 0, Math.PI*2);
      ctx.fillStyle = night ? "#cddffa" : "#fff3d6"; ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(p.r*2.2, -p.r*0.5); ctx.lineTo(p.r*1.2, p.r*0.7);
      ctx.closePath(); ctx.fillStyle = night ? "#9db6d6" : "#e8dcc0"; ctx.fill();
    }
    ctx.restore();
  }
  ctx.restore();
}

/* 3) лёгкие «каустики» — плавающие пятна света под водой */
function drawCaustics(g){
  const night = save.loc === "night";
  const k = weatherNow().sun === undefined ? 0.5 : 1;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i=0;i<5;i++){
    const ph = (G.clock*0.13 + i*0.21) % 1;
    const x = (0.12 + i*0.19 + Math.sin(G.clock*0.3 + i)*0.04) * W;
    const y = g.surfaceY + H*0.05 + ph*H*0.22;
    const rx = W*0.12*(0.7 + 0.3*Math.sin(G.clock*0.8 + i));
    ctx.beginPath();
    ctx.ellipse(x, y, rx, rx*0.16, Math.sin(G.clock*0.2+i)*0.35, 0, Math.PI*2);
    ctx.fillStyle = night ? "rgba(150,190,255,0.030)" : "rgba(230,255,245,0.035)";
    ctx.fill();
  }
  ctx.restore();
}

/* 4) вспышка идеальной подсечки — зелёное кольцо и искры у поплавка */
function drawPerfectFlash(g){
  if (!(G.perfectFlash > 0)) return;
  const k = G.perfectFlash;    // 1 → 0
  const x = G.bobX, y = wY();
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.beginPath();
  ctx.ellipse(x, y, 18 + (1-k)*54, 6 + (1-k)*18, 0, 0, Math.PI*2);
  ctx.strokeStyle = "rgba(167,240,189,"+(0.85*k)+")";
  ctx.lineWidth = 3*k + 0.6;
  ctx.stroke();
  for (let i=0;i<8;i++){
    const a = i*0.785 + (1-k)*1.2;
    const r = 8 + (1-k)*46;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a)*r, y + Math.sin(a)*r*0.32, 2.2*k + 0.4, 0, Math.PI*2);
    ctx.fillStyle = "rgba(200,255,215,"+(0.9*k)+")";
    ctx.fill();
  }
  ctx.restore();
}

/* 8.5: выход рыбы на воде — мягкий круг у самой «живой» точки водоёма */
function drawWaveZone(g){
  const spots = locSpots();
  if (!spots.length) return;
  // «горячая» точка — та, что богаче остальных по весам (стабильно в течение окна)
  let best = spots[0], bw = -1;
  for (const sp of spots){
    const wsum = Object.values(sp.w || {}).reduce((a,b) => a+b, 0);
    if (wsum > bw){ bw = wsum; best = sp; }
  }
  const p = spotPos(best);
  const k = 0.5 + 0.5*Math.sin(G.clock*1.6);
  const s = clamp(Math.min(W,H)/620, 0.7, 1.5);
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, (52 + k*8)*s, (17 + k*3)*s, 0, 0, Math.PI*2);
  ctx.strokeStyle = "rgba(255,225,150," + (0.22 + k*0.12) + ")";
  ctx.lineWidth = 1.8*s; ctx.setLineDash([6*s, 7*s]); ctx.stroke();
  ctx.setLineDash([]);
  // искры, поднимающиеся со дна — «рыба гуляет»
  for (let i=0;i<5;i++){
    const ph = ((G.clock*0.5 + i*0.21) % 1);
    ctx.beginPath();
    ctx.arc(p.x + Math.sin(i*2.1 + G.clock)*20*s, p.y + 6 - ph*30*s, 1.6*s*(1-ph*0.5), 0, Math.PI*2);
    ctx.fillStyle = "rgba(255,235,180," + (0.5*(1-ph)) + ")";
    ctx.fill();
  }
  ctx.restore();
}
function drawSpots(g){
  if (!["idle","aim","power","casting"].includes(G.state)) return;
  // 8.5: подсвечиваем точку, где сейчас идёт выход рыбы (там рыба ходит плотнее)
  if (waveOn(save.loc)) drawWaveZone(g);
  const spots = locSpots();
  const s = clamp(Math.min(W,H)/620, 0.7, 1.5);
  for (const sp of spots){
    const isClub = sp.id.indexOf("prem_") === 0;
    const {x, y} = spotPos(sp);
    const sel = G.spot && G.spot.id === sp.id;
    const pulse = 0.5 + 0.5*Math.sin(G.clock*2.2 + sp.x*7);
    const rx = (34 + (sel?10:0) + pulse*4)*s, ry = rx*0.36;

    ctx.save();
    ctx.beginPath(); ctx.ellipse(x, y+2, rx+5, ry+4, 0, 0, Math.PI*2);
    ctx.fillStyle = "rgba(4,18,24,0.32)";
    ctx.fill();
    const wtone = locMech().water;
    const baseFill = wtone === "brown" ? "rgba(255,226,160,0.13)"
      : wtone === "turquoise" ? "rgba(150,255,240,0.16)"
      : wtone === "clear" ? "rgba(200,235,255,0.14)"
      : "rgba(255,255,255,0.12)";
    const baseLine = wtone === "brown" ? "rgba(255,229,176,"
      : wtone === "turquoise" ? "rgba(178,255,246,"
      : "rgba(255,255,255,";
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI*2);
    ctx.fillStyle = sel ? "rgba(255,193,69,0.24)"
      : isClub ? "rgba(178,150,255,0.22)" : baseFill;
    ctx.fill();
    ctx.strokeStyle = sel ? "rgba(255,214,122,"+(0.9+pulse*0.1)+")"
      : isClub ? "rgba(211,190,255,"+(0.75+pulse*0.25)+")" : baseLine+(0.55+pulse*0.2)+")";
    ctx.lineWidth = sel ? 2.8 : isClub ? 2.4 : 2;
    ctx.setLineDash(sel ? [] : [7,6]);
    ctx.stroke();
    ctx.setLineDash([]);
    // 8.0: характер точки — коряги, лёд, тёплая вода
    if (!isClub && (wtone === "brown" || wtone === "turquoise" || wtone === "clear") && !sel){
      ctx.save();
      ctx.strokeStyle = baseLine + "0.30)";
      ctx.lineWidth = 1.2;
      for (let i=0;i<3;i++){
        const a = G.clock*0.5 + i*2.09 + sp.x*5;
        ctx.beginPath();
        ctx.ellipse(x + Math.cos(a)*rx*0.72, y + Math.sin(a)*ry*0.72, rx*0.16, ry*0.3, a, 0, Math.PI*2);
        ctx.stroke();
      }
      ctx.restore();
    }
    if (isClub){
      // клубный плёс: тёплое свечение и жемчужные искры по краю
      ctx.save();
      const gr = ctx.createRadialGradient(x, y, 2, x, y, rx*1.5);
      gr.addColorStop(0, "rgba(205,180,255,"+(0.16+pulse*0.10)+")");
      gr.addColorStop(1, "rgba(205,180,255,0)");
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.ellipse(x, y, rx*1.5, ry*1.5, 0, 0, Math.PI*2); ctx.fill();
      for (let i=0;i<3;i++){
        const a = G.clock*0.9 + i*2.1;
        const px = x + Math.cos(a)*rx*1.15, py = y + Math.sin(a)*ry*1.15;
        ctx.beginPath(); ctx.arc(px, py, 1.6*s, 0, Math.PI*2);
        ctx.fillStyle = "rgba(232,220,255,"+(0.55+0.35*Math.sin(a*2))+")"; ctx.fill();
      }
      ctx.restore();
    }

    if (sel){
      ctx.beginPath(); ctx.ellipse(x, y, rx*1.35, ry*1.35, 0, 0, Math.PI*2);
      ctx.strokeStyle = "rgba(255,193,69,"+(0.25+pulse*0.2)+")";
      ctx.lineWidth = 1.4; ctx.stroke();
    }
    if (sel && G.spotFree){
      // свободный заброс: тонкая «мишень» на воде
      ctx.save();
      ctx.strokeStyle = "rgba(255,214,122,"+(0.55+pulse*0.3)+")";
      ctx.lineWidth = 1.6;
      ctx.setLineDash([3,5]);
      ctx.beginPath(); ctx.ellipse(x, y, rx*1.9, ry*1.9, 0, 0, Math.PI*2); ctx.stroke();
      ctx.restore();
    }

    // подпись
    ctx.font = "800 " + (11*s) + "px -apple-system,Segoe UI,Roboto,sans-serif";
    // 8.6: к названию точки добавляем глубину и грунт — видно до заброса
    const seLbl = spotEnv(sp, save.loc);
    const label = sp.name + " · " + (seLbl.depth >= 10 ? Math.round(seLbl.depth) : (Math.round(seLbl.depth*10)/10).toFixed(1).replace(".", ",")) + " м";
    const tw = ctx.measureText(label).width;
    const padX = 8*s, bh = 20*s;
    // если сверху «узко» (свал у льда, подпись под краем) — подпись уходит под точку
    let bx = x - tw/2 - padX;
    let by = y - ry - bh - 12*s;
    // на льду подпись не должна налезать на лунку: разводим точки по вертикали
    // клубной лунке подъём не нужен: её подпись и так стоит выше пятна
    if (iceNow() && !isClub){
      const holeY = y + 6;
      if (holeY - (by + bh) < 46*s) by = y - ry - bh - 52*s;
    }
    bx = clamp(bx, 4*s, W - tw - padX*2 - 4*s);
    ctx.beginPath();
    const r = bh/2;
    ctx.moveTo(bx+r, by);
    ctx.arcTo(bx+tw+padX*2, by, bx+tw+padX*2, by+bh, r);
    ctx.arcTo(bx+tw+padX*2, by+bh, bx, by+bh, r);
    ctx.arcTo(bx, by+bh, bx, by, r);
    ctx.arcTo(bx, by, bx+tw+padX*2, by, r);
    ctx.closePath();
    ctx.fillStyle = sel ? "rgba(255,193,69,0.92)" : "rgba(8,22,28,0.62)";
    ctx.fill();
    ctx.fillStyle = sel ? "#2a2205" : isClub ? "#efe6ff" : "rgba(255,255,255,0.9)";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(label, x, by + bh/2 + 0.5);

    // пузырьки, чтобы вода «жила»
    const N = sp.depth === "глубоко" ? 5 : sp.depth === "средне" ? 3 : 2;
    for (let i=0;i<N;i++){
      const ph = (G.clock*0.55 + i*0.37 + sp.x*9) % 1;
      const bx = x + Math.sin((ph+i)*7 + i)*rx*0.55;
      const by = y + ry*0.35 - ph*(ry*1.9);
      ctx.beginPath();
      ctx.arc(bx, by, (1.2 + (i%2)*0.9)*s*(1-ph*0.4), 0, Math.PI*2);
      ctx.fillStyle = "rgba(255,255,255,"+(0.32*(1-ph))+")";
      ctx.fill();
    }

    // подсказка «эта точка на текущую снасть»
    const pool = spotPool(sp);
    const okCount = pool.filter(z => z.okBait && z.okRod).length;
    const baitOk = pool.some(z => z.okBait);
    const nearMin = isClub ? Math.min.apply(null, pool.filter(z => z.okBait && !z.okRod)
      .map(z => FISH[z.id].reqPower).concat([9999])) : 9999;
    // клубный плёс сам подсвечивает, что раз в сутки даёт бонус за точный заброс
    const visitWaiting = isClub && clubVisitReady();
    const tagTxt = okCount
      ? (isClub ? "клуб · " + fishCount(okCount) + (visitWaiting ? " · ждёт вас" : "") : fishCount(okCount))
      : (isClub && baitOk && nearMin < 9999 ? "нужна удочка " + nearMin
        : baitOk ? "нужна снасть посильнее" : "другая приманка");
    ctx.font = "800 " + (9.5*s) + "px -apple-system,Segoe UI,Roboto,sans-serif";
    const tw2 = ctx.measureText(tagTxt).width;
    const b2w = tw2 + 12*s, b2h = 15*s;
    const cx = x, cy = y + ry + 12*s;
    ctx.beginPath();
    const rr = b2h/2;
    ctx.moveTo(cx-b2w/2+rr, cy);
    ctx.arcTo(cx+b2w/2, cy, cx+b2w/2, cy+b2h, rr);
    ctx.arcTo(cx+b2w/2, cy+b2h, cx-b2w/2, cy+b2h, rr);
    ctx.arcTo(cx-b2w/2, cy+b2h, cx-b2w/2, cy, rr);
    ctx.arcTo(cx-b2w/2, cy, cx+b2w/2, cy, rr);
    ctx.closePath();
    ctx.fillStyle = okCount ? "rgba(18,52,34,0.72)" : "rgba(58,24,20,0.72)";
    ctx.fill();
    ctx.fillStyle = okCount ? "#b8f0c6" : "#ffb9a6";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(tagTxt, cx, cy + b2h/2 + 0.5);

    if (isClub){
      // метка «клуб» над точкой
      const t2 = "КЛУБ";
      ctx.font = "900 " + (8*s) + "px -apple-system,Segoe UI,Roboto,sans-serif";
      const w2 = ctx.measureText(t2).width + 10*s;
      const px2 = x + tw/2 + 10*s, py2 = by - 4*s, h2 = 13*s;
      ctx.beginPath();
      const r2 = h2/2;
      ctx.moveTo(px2+r2, py2);
      ctx.arcTo(px2+w2, py2, px2+w2, py2+h2, r2);
      ctx.arcTo(px2+w2, py2+h2, px2, py2+h2, r2);
      ctx.arcTo(px2, py2+h2, px2, py2, r2);
      ctx.arcTo(px2, py2, px2+w2, py2, r2);
      ctx.closePath();
      ctx.fillStyle = "rgba(60,40,110,0.78)";
      ctx.fill();
      ctx.strokeStyle = "rgba(200,180,255,0.6)";
      ctx.lineWidth = 0.9; ctx.stroke();
      ctx.fillStyle = "#efe6ff";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(t2, px2 + w2/2, py2 + h2/2 + 0.5);
    }

    // 8.6: «пятно дна» под точкой — цвет грунта читается даже без подписи
    if (!isClub){
      const BOT_TONE = {silt:"rgba(146,124,74,", mud:"rgba(112,92,58,", sand:"rgba(226,206,150,",
        gravel:"rgba(176,172,158,", stone:"rgba(150,160,168,", clay:"rgba(190,140,110,",
        shell:"rgba(232,226,212,", reef:"rgba(196,164,222,"};
      const tone = BOT_TONE[seLbl.bottom] || "rgba(200,200,200,";
      const g2 = ctx.createRadialGradient(x, y, 2, x, y, rx*1.35);
      g2.addColorStop(0, tone + "0.26)"); g2.addColorStop(1, tone + "0)");
      ctx.beginPath(); ctx.ellipse(x, y, rx*1.35, ry*1.35, 0, 0, Math.PI*2);
      ctx.fillStyle = g2; ctx.fill();
    }
    // маркер глубины
    ctx.beginPath(); ctx.arc(x, y, 2.8*s, 0, Math.PI*2);
    ctx.fillStyle = sel ? "#ffd166" : "rgba(255,255,255,.5)"; ctx.fill();
    ctx.restore();
  }
}

/* зацеп: поплавок сидит в коряге — тонет, дёргается, тянет леску в сторону */
function drawSnagFx(g){
  if (G.state !== "snag") return;
  const x = G.bobX, y = wY();
  const w = SNAGST.wobble;
  ctx.save();
  // муть и пузыри
  for (let i=0;i<10;i++){
    const ph = (G.clock*0.5 + i*0.13) % 1;
    ctx.beginPath();
    ctx.arc(x + Math.sin(G.clock*1.6 + i)*12, y - ph*26, (1.2 + (i%3)*0.8)*(1-ph*0.4), 0, Math.PI*2);
    ctx.strokeStyle = "rgba(230,240,200,"+(0.28*(1-ph))+")";
    ctx.lineWidth = 0.9; ctx.stroke();
  }
  // круги на воде от дёрганий
  if (w > 0.02){
    ctx.beginPath();
    ctx.ellipse(x, y, 16 + (1-w)*40, 5 + (1-w)*13, 0, 0, Math.PI*2);
    ctx.strokeStyle = "rgba(255,220,170,"+(0.5*w)+")";
    ctx.lineWidth = 2*w + 0.6; ctx.stroke();
  }
  // косые полосы «коряги под водой»
  ctx.strokeStyle = "rgba(30,24,14,.55)";
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.moveTo(x - 34, y + 12);
  ctx.quadraticCurveTo(x - 6, y + 2, x + 30, y + 10);
  ctx.stroke();
  ctx.restore();
}

/* ============================================================
   8.0: «живые» слои для новых водоёмов
   кувшинки (топь) · коряги и зацепы · снежные пики (горы) · блики рифа (лагуна)
   ============================================================ */
const PADS = [];
function initPads(){
  PADS.length = 0;
  const n = 13;
  for (let i=0;i<n;i++){
    PADS.push({ x: 0.05 + Math.random()*0.9,
      d: 0.04 + Math.random()*0.42,          // «глубина» — насколько ниже линии воды
      r: 0.020 + Math.random()*0.022,
      rot: (Math.random()-0.5)*0.8, ph: Math.random()*6.28,
      flower: Math.random() < 0.22 });
  }
}
/* кувшинки и ряска: стоят почти на месте, чуть покачиваются.
   Листья предрисуются в отдельный слой (тень, лист, прожилки) и кэшируются:
   на топи это 13 крупных полупрозрачных фигур в каждом кадре — самый дорогой слой. */
const PAD_LAYER = { key:"", cv:null };
function padLayerKey(){
  // округляем линию воды крупными шагами: волны двигают её на пару пикселей каждый кадр,
  // и без «квантования» слой перестраивался бы на каждом кадре
  return save.loc + "|" + W + "x" + H + "|" + Math.round(geo().surfaceY/48) + "|" + PADS.length;
}
function buildPadLayer(g){
  const cv = document.createElement("canvas");
  cv.width = Math.max(1, Math.round(W)); cv.height = Math.max(1, Math.round(H));
  const c = cv.getContext("2d");
  const s = clamp(Math.min(W,H)/620, 0.7, 1.5);
  for (const p of PADS){
    const y = g.surfaceY + p.d * (H - g.surfaceY);
    const x = p.x * W;
    const rx = p.r * W * (0.7 + p.d), ry = rx * 0.40;
    c.save();
    c.translate(x, y); c.rotate(p.rot);
    // тень под листом
    c.beginPath(); c.ellipse(0, ry*0.35, rx*1.02, ry*0.7, 0, 0, Math.PI*2);
    c.fillStyle = "rgba(30,40,10,.35)"; c.fill();
    // сам лист с «вырезом»
    c.beginPath();
    c.ellipse(0, 0, rx, ry, 0, 0.34, Math.PI*2 - 0.34);
    c.lineTo(0, 0); c.closePath();
    const lg = c.createLinearGradient(-rx, -ry, rx, ry);
    lg.addColorStop(0, "rgba(96,124,44,.92)");
    lg.addColorStop(0.55, "rgba(72,104,34,.9)");
    lg.addColorStop(1, "rgba(46,74,22,.92)");
    c.fillStyle = lg; c.fill();
    c.strokeStyle = "rgba(190,220,140,.30)"; c.lineWidth = 0.8*s; c.stroke();
    // прожилки
    c.beginPath();
    c.moveTo(0,0); c.lineTo(rx*0.92, 0);
    c.moveTo(0,0); c.lineTo(-rx*0.7, ry*0.5);
    c.moveTo(0,0); c.lineTo(-rx*0.7, -ry*0.5);
    c.strokeStyle = "rgba(150,190,110,.22)"; c.lineWidth = 0.7*s; c.stroke();
    if (p.flower){
      const fr = 4.4*s;
      for (let i=0;i<6;i++){
        const a = i/6*Math.PI*2;
        c.beginPath();
        c.ellipse(Math.cos(a)*fr*0.8, Math.sin(a)*fr*0.5, fr*0.8, fr*0.42, a, 0, Math.PI*2);
        c.fillStyle = i%2 ? "rgba(255,232,244,.92)" : "rgba(255,198,226,.92)";
        c.fill();
      }
      c.beginPath(); c.arc(0,0, fr*0.42, 0, Math.PI*2);
      c.fillStyle = "#ffd166"; c.fill();
    }
    c.restore();
  }
  PAD_LAYER.cv = cv; PAD_LAYER.key = padLayerKey();
}
function drawPads(g){
  if (save.loc !== "swamp") return;
  if (!PADS.length) initPads();
  const key = padLayerKey();
  if (!PAD_LAYER.cv || PAD_LAYER.key !== key) buildPadLayer(g);
  const s = clamp(Math.min(W,H)/620, 0.7, 1.5);
  ctx.save();
  // лёгкое общее покачивание всего слоя — листья «дышат» вместе с водой
  ctx.translate(Math.sin(G.clock*0.32)*2.2*s, Math.sin(G.clock*0.26)*1.4*s);
  ctx.drawImage(PAD_LAYER.cv, 0, 0, W, H);
  ctx.restore();
}
/* коряги: бугры и ветки у поверхности, к которым цепляется снасть */
const SNAGS = [];
function initSnags(){
  SNAGS.length = 0;
  for (let i=0;i<5;i++){
    SNAGS.push({ x: 0.12 + i*0.19 + Math.random()*0.05, d: 0.05 + Math.random()*0.30,
      len: 40 + Math.random()*46, rot: (Math.random()-0.5)*1.2, ph: Math.random()*6.28 });
  }
}
function drawSnags(g){
  const m = locMech();
  if (!m.snag) return;
  if (!SNAGS.length) initSnags();
  const s = clamp(Math.min(W,H)/620, 0.7, 1.5);
  for (const q of SNAGS){
    const y = g.surfaceY + (0.16 + q.d*1.5)*(H - g.surfaceY);
    const x = q.x*W;
    const len = q.len*s*0.9;
    ctx.save();
    ctx.translate(x, y); ctx.rotate(q.rot + Math.sin(G.clock*0.25 + q.ph)*0.03);
    if (!snagIsLogs()){
      // камни на перекате: снасть цепляется за них
      for (let i=0;i<3;i++){
        const r = (11 + i*5)*s;
        ctx.beginPath();
        ctx.ellipse(-len*0.4 + i*len*0.45, 0, r, r*0.62, q.rot*0.5, 0, Math.PI*2);
        const sg = ctx.createLinearGradient(0, -r*0.6, 0, r*0.6);
        sg.addColorStop(0, "rgba(150,160,170,.9)");
        sg.addColorStop(1, "rgba(56,64,74,.92)");
        ctx.fillStyle = sg; ctx.fill();
        ctx.strokeStyle = "rgba(20,26,32,.55)"; ctx.lineWidth = 0.9*s; ctx.stroke();
      }
      ctx.restore();
      continue;
    }
    // мокрое бревно
    ctx.beginPath();
    ctx.moveTo(-len, 0);
    ctx.quadraticCurveTo(-len*0.3, -9*s, len*0.55, -2*s);
    ctx.quadraticCurveTo(len*0.95, 1*s, len, 6*s);
    ctx.quadraticCurveTo(len*0.4, 7*s, -len*0.4, 6*s);
    ctx.quadraticCurveTo(-len*0.85, 5*s, -len, 0);
    ctx.closePath();
    const wg = ctx.createLinearGradient(0, -8*s, 0, 8*s);
    wg.addColorStop(0, "rgba(74,58,40,.92)");
    wg.addColorStop(1, "rgba(38,30,20,.94)");
    ctx.fillStyle = wg; ctx.fill();
    ctx.strokeStyle = "rgba(20,18,10,.7)"; ctx.lineWidth = 1*s; ctx.stroke();
    // ветки
    for (let i=0;i<3;i++){
      const bx = -len*0.5 + i*len*0.5;
      ctx.beginPath();
      ctx.moveTo(bx, -2*s);
      ctx.quadraticCurveTo(bx + 8*s, -12*s, bx + 3*s, -22*s);
      ctx.strokeStyle = "rgba(56,44,30,.9)"; ctx.lineWidth = 2.2*s; ctx.lineCap = "round"; ctx.stroke();
    }
    // зелень мха
    for (let i=0;i<4;i++){
      const gx = -len*0.7 + i*len*0.45;
      ctx.beginPath();
      ctx.ellipse(gx, -3*s, 7*s, 3.2*s, q.rot, 0, Math.PI*2);
      ctx.fillStyle = "rgba(96,124,50,.55)"; ctx.fill();
    }
    ctx.restore();
  }
  // пузырьки газов топи
  if (save.loc === "swamp"){
    for (let i=0;i<8;i++){
      const ph = (G.clock*0.28 + i*0.19) % 1;
      const bx = ((i*0.137 + Math.sin(G.clock*0.3+i)*0.02) % 1) * W;
      const by = g.surfaceY + (H - g.surfaceY)*0.55 - ph*(H - g.surfaceY)*0.5;
      ctx.beginPath();
      ctx.arc(bx, by, (1.4 + (i%3)*0.9)*s*(1-ph*0.3), 0, Math.PI*2);
      ctx.strokeStyle = "rgba(220,230,170,"+(0.22*(1-ph))+")";
      ctx.lineWidth = 0.9; ctx.stroke();
    }
  }
}
/* горные вершины: холодная дымка, снежные искры и отражение пиков */
function drawMountainAir(g){
  if (save.loc !== "mountain") return;
  const s = clamp(Math.min(W,H)/620, 0.7, 1.5);
  // снежные искры в воздухе
  for (let i=0;i<16;i++){
    const ph = (G.clock*0.06 + i*0.117) % 1;
    const x = (0.06 + ((i*0.233) % 0.9))*W + Math.sin(G.clock*0.4+i)*7*s;
    const y = g.surfaceY*0.9*(1-ph) + H*0.03;
    const a = 0.25 + 0.5*Math.abs(Math.sin(G.clock*1.2 + i));
    ctx.beginPath(); ctx.arc(x, y, (0.9 + (i%3)*0.5)*s, 0, Math.PI*2);
    ctx.fillStyle = "rgba(240,250,255,"+a*0.7+")"; ctx.fill();
  }
  // дрожащее отражение вершин на воде
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.beginPath();
  ctx.moveTo(0, g.surfaceY);
  for (let x=0;x<=W;x+=18){
    ctx.lineTo(x, g.surfaceY + 18 + Math.sin(x*0.02 + G.clock*0.5)*4);
  }
  ctx.lineTo(W, g.surfaceY); ctx.closePath();
  ctx.fillStyle = "rgba(210,235,255,.5)"; ctx.fill();
  ctx.restore();
}
/* лагуна: солнечные «зайчики» на дне, блики рифа и тёплые полосы */
function drawLagoonShine(g){
  if (save.loc !== "lagoon") return;
  const t = G.clock;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  // сетка каустики внизу
  for (let i=0;i<7;i++){
    const cx = ((i*0.31 + t*0.02) % 1) * W;
    const cy = g.surfaceY + (H - g.surfaceY)*(0.30 + ((i*0.19) % 0.6));
    const rw = 46 + Math.sin(t*0.9 + i)*14;
    const grd = ctx.createRadialGradient(cx, cy, 1, cx, cy, rw);
    grd.addColorStop(0, "rgba(120,255,240,0.075)");
    grd.addColorStop(1, "rgba(120,255,240,0)");
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.ellipse(cx, cy, rw, rw*0.42, Math.sin(i)*0.4, 0, Math.PI*2); ctx.fill();
  }
  // «зайчики» на воде
  for (let i=0;i<22;i++){
    const ph = (t*0.5 + i*0.23) % 1;
    const x = ((i*0.618 + Math.sin(t*0.7+i)*0.015) % 1)*W;
    const y = g.surfaceY + 6 + Math.pow(ph, 1.4)*(H-g.surfaceY)*0.5;
    const a = 0.10 + 0.32*Math.abs(Math.sin(t*2.6 + i*1.4));
    ctx.beginPath();
    ctx.ellipse(x, y, (3 + (i%4)*2.2)*(0.5+ph), 1.1, 0, 0, Math.PI*2);
    ctx.fillStyle = "rgba(255,255,235,"+a*0.8+")"; ctx.fill();
  }
  ctx.restore();
}
/* точка, где сейчас дрейфует поплавок: «рябь следа» течения */
function drawStreamLines(g){
  const stream = locMech().stream || 0;
  if (stream < 0.4) return;
  const y0 = g.surfaceY;
  ctx.save();
  for (let i=0;i<9;i++){
    const ph = (G.clock*(0.20 + stream*0.12) + i*0.17) % 1;
    const y = y0 + 10 + ph*(H-y0)*0.8;
    const x = ((i*0.21 + G.clock*0.02*stream) % 1.2 - 0.1)*W;
    const len = 30 + (y-y0)/Math.max(1,H-y0)*90;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + len*0.5, y - 2*stream, x + len, y);
    ctx.strokeStyle = "rgba(235,250,255,"+(0.05 + stream*0.05)*(1-ph*0.7)+")";
    ctx.lineWidth = 0.9; ctx.stroke();
  }
  ctx.restore();
}

/* прицел: где сейчас упадёт поплавок, и куда сместится точка при другом нажатии */
function drawAimReticle(g){
  if (!(G.state === "aim" || G.state === "idle")) return;
  if (!G.spot && !G.aimHint) return;
  const p = G.spot && !G.spot.free ? spotPos(G.spot) : G.aimHint;
  const t = G.clock;
  if (G.spot && !G.spot.free){
    const pos = spotPos(G.spot);
    ctx.save();
    ctx.strokeStyle = "rgba(255,214,122,"+(0.30 + 0.15*Math.sin(t*3))+")";
    ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.ellipse(pos.x, pos.y, 44, 15, 0, 0, Math.PI*2); ctx.stroke();
    // «стрелка вниз» над выбранной точкой
    ctx.beginPath();
    ctx.moveTo(pos.x - 6, pos.y - 34); ctx.lineTo(pos.x + 6, pos.y - 34); ctx.lineTo(pos.x, pos.y - 26);
    ctx.closePath();
    ctx.fillStyle = "rgba(255,214,122,.75)"; ctx.fill();
    ctx.restore();
  }
}

/* подсказка «что тут водится» — дуги глубины и чип с составом по выбранному месту */
/* «на кукурузу», «на хлебный мякиш», «на блесну» — падеж для приманок */
const BAIT_ACC = { corn:"кукурузу", bread:"хлебный мякиш", pearl:"перловку", peas:"горох", dough:"тесто",
  algae:"водоросли", worm:"земляного червя", bloodworm:"мотыля", maggot:"опарыша", caddis:"ручейник",
  mayfly:"подёнку", shell:"ракушку", shrimp:"креветку", spoon:"блесну", wobbler:"воблер", jig:"джиг",
  spinner:"вращалку", fly:"мушку", livebait:"живца", frog:"лягушку", fishmeat:"рыбное филе",
  crab:"крабовое мясо", glow:"светлячка", squid:"кальмара", octopus:"осьминога", blood:"миногу" };
const baitAcc = (id) => BAIT_ACC[id] || (BAITS[id] ? BAITS[id].name.toLowerCase() : "приманку");
const baitOn = (id) => "на " + baitAcc(id);
/* «1 вид», «2 вида», «5 видов» */
const fishCount = (n) => n + " " + (n % 10 === 1 && n % 100 !== 11 ? "вид" : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? "вида" : "видов"));
const goodLabel = fishCount;

function drawZoneInfo(g){
  if (!G.spot || !G.spotFree || !["aim","power","casting"].includes(G.state)) return;
  const p = spotPos(G.spot);
  const pool = Object.keys(G.spot.w || {});
  const onBait = pool.filter(k => FISH[k] && onBaitFor(FISH[k])).length;
  const good = pool.filter(k => FISH[k] && onBaitFor(FISH[k]) && FISH[k].reqPower <= rodDef().power).length;
  const k = 0.5 + 0.5*Math.sin(G.clock*2.4);
  ctx.save();
  for (let i=0;i<3;i++){
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 2, 26 + i*13 + k*3, 8 + i*4.4, 0, 0, Math.PI*2);
    ctx.strokeStyle = "rgba(190,235,255,"+(0.16 - i*0.04)+")";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  // чип с названием зоны и составом
  const s = clamp(Math.min(W,H)/620, 0.72, 1.5);
  const line1 = G.spot.name;
  // 8.6: под названием — профиль дна и кто тут держится
  const envTxt = spotEnvText(G.spot, save.loc);
  const kindTxt = spotKinds(G.spot, save.loc, 3).map(x => x.name.split(" ")[0].toLowerCase()).join(", ");
  const line2 = good ? (envTxt + (kindTxt ? " · " + kindTxt : ""))
    : onBait ? envTxt + " · нужна снасть посильнее" : envTxt + " · на " + baitAcc(save.equipped.bait) + " не берут";
  ctx.font = "800 " + (10.5*s) + "px -apple-system,Segoe UI,Roboto,sans-serif";
  const w1 = ctx.measureText(line1).width;
  ctx.font = "700 " + (9.5*s) + "px -apple-system,Segoe UI,Roboto,sans-serif";
  const w2 = ctx.measureText(line2).width;
  const bw = Math.min(Math.max(w1, w2) + 20*s, W - 12*s), bh = 34*s;
  let bx = clamp(p.x - bw/2, 5*s, W - bw - 5*s);
  let by = p.y + 26*s;
  // не залезаем на нижнюю панель снастей: тогда чип уходит над точкой
  if (by + bh > H*0.74) by = p.y - 30*s - bh;
  ctx.beginPath();
  const rr = 9*s;
  ctx.moveTo(bx+rr, by);
  ctx.arcTo(bx+bw, by, bx+bw, by+bh, rr);
  ctx.arcTo(bx+bw, by+bh, bx, by+bh, rr);
  ctx.arcTo(bx, by+bh, bx, by, rr);
  ctx.arcTo(bx, by, bx+bw, by, rr);
  ctx.closePath();
  ctx.fillStyle = "rgba(8,24,30,0.66)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,214,122,0.45)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = "800 " + (10.5*s) + "px -apple-system,Segoe UI,Roboto,sans-serif";
  ctx.fillStyle = "rgba(255,240,205,.95)";
  ctx.fillText(line1, bx + bw/2, by + bh*0.34);
  ctx.font = "700 " + (9.5*s) + "px -apple-system,Segoe UI,Roboto,sans-serif";
  ctx.fillStyle = good ? "rgba(170,235,190,.95)" : "rgba(255,180,160,.92)";
  ctx.fillText(line2, bx + bw/2, by + bh*0.70);
  ctx.restore();
}

function drawCastArc(g){
  if (G.state !== "casting" || !G.castFrom) return;
  const k = clamp(G.castT/G.castDur, 0, 1);
  const peak = H*(0.12 + G.lockedPower*0.16);
  ctx.save();
  ctx.setLineDash([5,7]);
  ctx.strokeStyle = "rgba(255,255,255,"+(0.16*(1-k))+")";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (let i=0;i<=24;i++){
    const t = (i/24)*1;
    const x = lerp(G.castFrom.x, G.bobTarget, t);
    const y = lerp(G.castFrom.y, wY(), t) - Math.sin(t*Math.PI)*peak;
    i ? ctx.lineTo(x,y) : ctx.moveTo(x,y);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  // точка прицела
  const pk = 1 - Math.abs(k-0.5)*2;
  ctx.globalAlpha = 0.5 + pk*0.5;
  ctx.beginPath();
  ctx.ellipse(G.bobTarget, wY(), 16, 6, 0, 0, Math.PI*2);
  ctx.strokeStyle = "rgba(255,214,122,.85)"; ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();
}

function rodCurve(g){
  const base = g.rodBase, tip0 = g.rodTip;
  let tip = tip0;
  // замах: удилище отводится назад и «заряжается» вместе с силой
  if (G.state === "power"){
    const p = G.power;
    tip = { x: tip0.x + 16 + p*42, y: tip0.y + 20 + p*30 };
  } else if (G.state === "casting"){
    const k = clamp(G.castT/G.castDur, 0, 1);
    const swing = Math.sin(Math.min(1,k*2.6)*Math.PI/2);
    tip = { x: tip0.x + (1-swing)*44, y: tip0.y + (1-swing)*28 - swing*10 };
  } else if (G.state === "bite"){
    const j = Math.sin(G.clock*24)*4;
    tip = { x: tip0.x + j, y: tip0.y + 6 };
  }
  const bend = (G.state === "fight" ? clamp(G.tension,0,1) : 0.18) * 0.17;
  return { base, tip,
    cx: base.x + (tip.x-base.x)*0.42,
    cy: base.y - (base.y-tip.y)*0.68 + (tip.x-base.x)*bend };
}
function drawRod(g){
  const {base, tip, cx, cy} = rodCurve(g);
  const s = clamp(Math.min(W,H)/620, 0.62, 1.5);
  ctx.save(); ctx.lineCap = "round";
  ctx.strokeStyle = "#3a2718"; ctx.lineWidth = Math.max(6, 8*s);
  ctx.beginPath(); ctx.moveTo(base.x, base.y);
  ctx.lineTo(lerp(base.x,tip.x,0.12), lerp(base.y,tip.y,0.12)); ctx.stroke();
  ctx.strokeStyle = "#6b4a2b"; ctx.lineWidth = Math.max(3, 4.2*s);
  ctx.beginPath(); ctx.moveTo(lerp(base.x,tip.x,0.10), lerp(base.y,tip.y,0.10));
  ctx.quadraticCurveTo(cx, cy, tip.x, tip.y); ctx.stroke();
  ctx.strokeStyle = "rgba(255,225,175,.5)"; ctx.lineWidth = Math.max(1, 1.2*s);
  ctx.beginPath(); ctx.moveTo(lerp(base.x,tip.x,0.12), lerp(base.y,tip.y,0.12));
  ctx.quadraticCurveTo(cx, cy, tip.x, tip.y); ctx.stroke();
  const rx = lerp(base.x,tip.x,0.20), ry = lerp(base.y,tip.y,0.20);
  ctx.beginPath(); ctx.ellipse(rx, ry + 4*s, 9*s, 7*s, -0.5, 0, Math.PI*2);
  ctx.fillStyle = "#2c3b42"; ctx.fill();
  ctx.strokeStyle = "rgba(210,230,235,.55)"; ctx.lineWidth = 1.4; ctx.stroke();
  ctx.restore();
}
/* яркий момент подсечки: вспышка у кончика */
function drawHookFlash(){
  if (G.state !== "fight" || G.t > 0.28) return;
  const g = geo();
  const k = 1 - G.t/0.28;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const grd = ctx.createRadialGradient(g.rodTip.x, g.rodTip.y, 2, g.rodTip.x, g.rodTip.y, 70*k);
  grd.addColorStop(0, "rgba(255,255,255,"+(0.85*k)+")");
  grd.addColorStop(0.35, "rgba(255,220,150,"+(0.35*k)+")");
  grd.addColorStop(1, "rgba(255,200,100,0)");
  ctx.fillStyle = grd;
  ctx.beginPath(); ctx.arc(g.rodTip.x, g.rodTip.y, 70*k, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}

/* рыба выходит из воды и летит на подсак */
function drawLanding(){
  const L = G.landing;
  if (!L || !G.fish || G.fish.junk) return;
  const img = images.fish[artOf(G.fish.type)];
  if (!img || !img.complete) return;
  const k = clamp(L.t/1.05, 0, 1);
  const ease = k*k*(3-2*k);
  const x = lerp(L.x0, W*0.62, ease);
  const y = lerp(L.y0, H*0.30, ease) - Math.sin(ease*Math.PI)*H*0.20;
  const w = W*0.34;
  const spin = (1-k)*0.6*Math.sin(k*7);
  ctx.save();
  // брызги по траектории
  if (Math.random() < 0.7){
    G.particles.push({x, y: y + 26, vx: rnd(-40,10), vy: rnd(-20,40),
      life: rnd(0.3,0.6), r: rnd(1,2.4), color: "rgba(225,250,255,"});
  }
  // мокрый след
  ctx.globalAlpha = 0.35*(1-k);
  ctx.strokeStyle = "rgba(220,250,255,1)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(L.x0, L.y0);
  ctx.quadraticCurveTo((L.x0+x)/2, Math.min(L.y0,y)-40, x, y);
  ctx.stroke();
  ctx.globalAlpha = 1;
  drawFishAnimated(img, x, y, w * (1 + 0.1*Math.sin(k*9)), {
    rot: -0.5 + spin, alpha: 1, palette: G.fish.palette, sway: 0.6, speed: 9
  });
  ctx.restore();
}

function drawLine(g){
  const from = {x:g.rodTip.x, y:g.rodTip.y}, to = {x:G.bobX, y:G.bobY};
  const taut = G.state === "fight";
  const dist = Math.hypot(to.x-from.x, to.y-from.y);
  const sag = taut ? 2 + (1-clamp(G.tension,0,1))*8 : Math.min(70, dist*0.13);
  ctx.save();
  const alpha = taut ? 0.8 : 0.5;
  const hot = taut && G.tension > 0.9;
  ctx.strokeStyle = hot ? "rgba(255,215,200,"+alpha+")" : (taut && G.perfectT>0 ? "rgba(190,255,215,"+alpha+")" : "rgba(255,255,255,"+alpha+")");
  ctx.lineWidth = taut ? 1.7 : 1.2;
  ctx.beginPath(); ctx.moveTo(from.x, from.y);
  ctx.quadraticCurveTo((from.x+to.x)/2, (from.y+to.y)/2 + sag, to.x, to.y);
  ctx.stroke();
  ctx.restore();
}
function drawWake(g){
  // быстрый шлейф воды от поплавка при вываживании
  if (G.state !== "fight") return;
  const s = clamp(Math.min(W,H)/620, 0.62, 1.5);
  const P = G.pull;
  const intensity = (P.active ? 1 : 0.45) * (0.5 + G.progress*0.6);
  ctx.save();
  for (let i=0;i<3;i++){
    const y = wY() + 6 + i*7*s;
    const wdt = (26 + i*16)*s*(0.7 + G.progress*0.5);
    ctx.beginPath();
    ctx.ellipse(G.bobX, y, wdt, 4.5*s, 0, 0, Math.PI*2);
    ctx.strokeStyle = "rgba(230,250,255,"+(0.30*intensity*(1-i*0.28))+")";
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }
  // брызги при рывке
  // пузырьки от уходящей рыбы
  if (Math.random() < 0.42){
    const depth = (1-G.progress)*118*s + 46*s;
    G.particles.push({x:G.bobX + rnd(-16,16), y:wY() + depth, vx:rnd(-6,6), vy:rnd(-46,-20),
      life:rnd(0.5,0.9), r:rnd(1,2.2), color:"rgba(210,245,255,"});
  }
  if (P.active && Math.random() < 0.5){
    G.particles.push({x:G.bobX+rnd(-10,10)*s, y:wY()-2, vx:rnd(-40,40), vy:rnd(-190,-90),
      life:rnd(0.3,0.6), r:rnd(1,2.4), color:"rgba(225,248,255,"});
  }
  ctx.restore();
}

function drawFishTail(g){
  // хвост рыбы, гуляющий у поверхности во время вываживания
  if (G.state !== "fight" || !G.fish || G.fish.junk) return;
  const img = images.fish[G.fish.type];
  if (!img || !img.complete) return;
  const s = clamp(Math.min(W,H)/620, 0.62, 1.5);
  const near = G.progress > 0.72;
  if (!near) return;
  const a = (G.progress - 0.72) / 0.28;
  ctx.save();
  ctx.globalAlpha = a * 0.85;
  ctx.beginPath();
  ctx.ellipse(G.bobX, wY()+4, 30*s*a, 9*s*a, 0, 0, Math.PI*2);
  ctx.fillStyle = "rgba(255,255,255,.25)";
  ctx.fill();
  ctx.restore();
}

/* индикатор ожидания: «вода настаивается», интерес рыбы и запас терпения.
   Растёт по мере ожидания, в конце превращается в «рыба рядом». */
function drawPatience(g){
  if (G.state !== "waiting" || G.cardOpen) return;
  const s = clamp(Math.min(W,H)/620, 0.72, 1.5);
  const cx = G.bobX, cy = wY();
  const t = G.clock;
  const intr = clamp(G.interest || 0, 0, 1);
  const pure = G.pureCasts > 0;
  // если поплавок низко у панели снастей — индикатор уходит НАД поплавком
  const low = cy > H*0.60;
  const baseY = low ? cy - 26*s : cy + 28*s;
  const stepY = low ? -7*s : 7*s;
  const labelY = low ? baseY + stepY*3 - 12*s : baseY + stepY*3 + 9*s;
  ctx.save();
  const beat = 0.5 + 0.5*Math.sin(t*(2.2 + intr*3.4));
  // сегменты терпения: заполняются по мере интереса
  const n = 3;
  const filled = intr * n;
  for (let i=0;i<n;i++){
    const a = clamp(filled - i, 0, 1);
    const w = 22*s, h = 3.4*s;
    const x = cx - w/2, y = baseY + i*stepY;
    ctx.beginPath();
    const rr = h/2;
    ctx.moveTo(x+rr, y);
    ctx.arcTo(x+w, y, x+w, y+h, rr);
    ctx.arcTo(x+w, y+h, x, y+h, rr);
    ctx.arcTo(x, y+h, x, y, rr);
    ctx.arcTo(x, y, x+w, y, rr);
    ctx.closePath();
    ctx.fillStyle = "rgba(220,240,255,0.07)";
    ctx.fill();
    ctx.strokeStyle = "rgba(220,245,255,0.18)";
    ctx.lineWidth = 0.8; ctx.stroke();
    if (a > 0){
      ctx.beginPath();
      ctx.moveTo(x+rr, y);
      ctx.arcTo(x+w, y, x+w, y+h, rr);
      ctx.arcTo(x+w, y+h, x, y+h, rr);
      ctx.arcTo(x, y+h, x, y, rr);
      ctx.arcTo(x, y, x+w, y, rr);
      ctx.closePath();
      const col = a > 0.75 ? "rgba(255,214,122," : a > 0.45 ? "rgba(255,232,170," : "rgba(190,235,255,";
      ctx.fillStyle = col + (0.45 + a*0.5) + ")";
      ctx.fill();
    }
  }
  // «кружок терпения» вокруг поплавка
  const prog = clamp(1 - (G.waitDur || 0) / 16, 0, 1);
  ctx.beginPath();
  ctx.ellipse(cx, cy + 2, (30 + prog*22)*s, (10 + prog*7)*s, 0, 0, Math.PI*2);
  ctx.strokeStyle = "rgba(200,240,255," + (0.05 + intr*0.10 + beat*0.03) + ")";
  ctx.lineWidth = 1.1;
  ctx.stroke();
  // тактичная подпись, что происходит с рыбой
  if (!pure){
    const msg = intr > 0.82 ? "рыба рядом" : intr > 0.55 ? "интересуется" : intr > 0.28 ? "присматривается" : "ждём…";
    ctx.font = "800 " + (9.5*s) + "px -apple-system,Segoe UI,Roboto,sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    // подложка, чтобы текст читался и не спорил с панелью снастей
    const tw = ctx.measureText(msg).width;
    ctx.beginPath();
    const bw = tw + 12*s, bh = 13*s, bx = cx - bw/2, by = labelY - bh/2;
    const rr2 = bh/2;
    ctx.moveTo(bx+rr2, by);
    ctx.arcTo(bx+bw, by, bx+bw, by+bh, rr2);
    ctx.arcTo(bx+bw, by+bh, bx, by+bh, rr2);
    ctx.arcTo(bx, by+bh, bx, by, rr2);
    ctx.arcTo(bx, by, bx+bw, by, rr2);
    ctx.closePath();
    ctx.fillStyle = "rgba(8,24,30,.42)";
    ctx.fill();
    ctx.fillStyle = "rgba(232,249,255," + (0.35 + intr*0.5) + ")";
    ctx.fillText(msg, cx, labelY + 0.5);
  }
  ctx.restore();
}

function drawImpactBurst(g){
  // круги по воде в момент подсечки
  if (G.state !== "fight") return;
  for (const rp of G.rings){
    ctx.beginPath();
    ctx.ellipse(rp.x, wY(), rp.r*2.1, rp.r*0.62, 0, 0, Math.PI*2);
    ctx.strokeStyle = "rgba(210,240,255,"+(rp.a*0.18)+")";
    ctx.lineWidth = 1.1;
    ctx.stroke();
  }
}


/* 8.7: сезонная «плёнка» на сцене — цвет и лёгкий морозный/золотистый градиент */
function seasonTint(){
  const se = seasonNow();
  if (se === "summer") return { sky:"rgba(255,214,150,0.10)", water:"rgba(120,200,170,0.05)" };
  if (se === "autumn") return { sky:"rgba(255,170,96,0.16)",  water:"rgba(150,110,60,0.10)" };
  if (se === "winter") return { sky:"rgba(190,225,250,0.20)", water:"rgba(150,200,230,0.14)" };
  return { sky:"rgba(150,220,180,0.12)", water:"rgba(120,190,170,0.08)" };   // весна
}
function drawSeasonTint(g){
  const t = seasonTint();
  const grd = ctx.createLinearGradient(0, 0, 0, H);
  grd.addColorStop(0, t.sky);
  grd.addColorStop(0.5, "rgba(0,0,0,0)");
  grd.addColorStop(0.62, t.water);
  grd.addColorStop(1, "rgba(0,0,0,0)");
  ctx.save();
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}
/* 8.7: зимой на воде — битый лёд и снежные заплаты */
function drawWinterIce(g){
  if (!iceNow(save.loc)) return;
  const y0 = g.surfaceY + 6, h = H - y0;
  ctx.save();
  ctx.beginPath(); ctx.rect(0, y0, W, h); ctx.clip();
  // «стекло»: светлая плёнка с бликами
  const grd = ctx.createLinearGradient(0, y0, 0, H);
  grd.addColorStop(0, "rgba(222,242,252,0.44)");
  grd.addColorStop(0.45, "rgba(196,228,242,0.26)");
  grd.addColorStop(1, "rgba(168,206,230,0.34)");
  ctx.fillStyle = grd; ctx.fillRect(0, y0, W, h);
  // трещины и снежные заплаты
  const s = clamp(Math.min(W,H)/620, 0.7, 1.5);
  for (let i=0;i<9;i++){
    const bx = ((i*0.137 + 0.05) % 0.96) * W;
    const by = y0 + ((i*0.271 + 0.08) % 0.9) * h;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    for (let k=1;k<=4;k++){
      ctx.lineTo(bx + Math.sin(i*3.1 + k*1.7)*22*s, by + k*9*s);
    }
    ctx.strokeStyle = "rgba(255,255,255,0.30)";
    ctx.lineWidth = 1.1*s;
    ctx.stroke();
  }
  for (let i=0;i<7;i++){
    const bx = ((i*0.19 + 0.11) % 0.94) * W;
    const by = y0 + ((i*0.33 + 0.15) % 0.85) * h;
    ctx.beginPath();
    ctx.ellipse(bx, by, 26*s, 9*s, 0.2*i, 0, Math.PI*2);
    ctx.fillStyle = "rgba(255,255,255," + (0.16 + (i%3)*0.06) + ")";
    ctx.fill();
  }
  ctx.restore();
}
function drawBobberTrail(g){
  if (G.state !== "fight") return;
  const s = clamp(Math.min(W,H)/620, 0.62, 1.5);
  ctx.save();
  for (let i=1;i<=7;i++){
    const k = i/8;
    ctx.globalAlpha = 0.16*(1-k);
    ctx.beginPath();
    ctx.ellipse(G.bobX - Math.sin(G.clock*9 - i*0.5)*6*k, wY() + i*3*s, (6 - i*0.6)*s, (2 - i*0.2)*s, 0, 0, Math.PI*2);
    ctx.fillStyle = "rgba(200,240,255,1)";
    ctx.fill();
  }
  ctx.restore();
}

function drawPullFlash(g){
  if (G.state !== "fight" || !G.pull) return;
  const P = G.pull;
  if (P.warn > 0){
    const k = P.warn/0.2;
    ctx.save();
    ctx.globalAlpha = 0.5*k;
    const cx = G.bobX, cy = wY();
    const grd = ctx.createRadialGradient(cx, cy, 4, cx, cy, 90);
    grd.addColorStop(0, "rgba(255,120,90,.5)");
    grd.addColorStop(1, "rgba(255,120,90,0)");
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(cx, cy, 90, 0, Math.PI*2); ctx.fill();
    ctx.font = "900 " + (20*clamp(Math.min(W,H)/620,0.8,1.4)) + "px -apple-system,Segoe UI,Roboto,sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,190,170,.95)";
    ctx.fillText("рывок!", cx, cy - 46);
    ctx.restore();
  }
}

function drawBobber(g){
  if (G.state === "idle" || G.state === "aim" || G.state === "power"){
    G.bobX = g.rodTip.x + 6; G.bobY = g.rodTip.y + 44;
  }
  const x = G.bobX, y = G.bobY;
  const s = clamp(Math.min(W,H)/620, 0.62, 1.5);
  const r = 8*s;

  for (const rp of G.rings){
    ctx.beginPath();
    ctx.ellipse(rp.x, wY(), rp.r*1.6, rp.r*0.5, 0, 0, Math.PI*2);
    ctx.strokeStyle = "rgba(255,255,255,"+(rp.a*0.32)+")";
    ctx.lineWidth = 1.2; ctx.stroke();
  }

  ctx.save();
  ctx.translate(x,y);
  ctx.rotate(G.state==="fight" ? Math.sin(G.clock*9)*0.12 : Math.sin(G.clock*2)*0.05);
  ctx.strokeStyle = "#f7f3ea"; ctx.lineWidth = 2*s;
  ctx.beginPath(); ctx.moveTo(0,-r*0.6); ctx.lineTo(0,-r*2.0); ctx.stroke();
  ctx.beginPath(); ctx.arc(0,-r*2.0, 2.2*s, 0, Math.PI*2); ctx.fillStyle="#ff5b3d"; ctx.fill();
  const grd = ctx.createLinearGradient(0,-r,0,r);
  grd.addColorStop(0,"#ff6b4a"); grd.addColorStop(0.5,"#ff5b3d"); grd.addColorStop(0.52,"#f6f1e4"); grd.addColorStop(1,"#e6dfd0");
  ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.fillStyle = grd; ctx.fill();
  ctx.strokeStyle = "rgba(60,30,20,.45)"; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.restore();

  if (G.state === "bite" || G.state === "waiting"){
    // «глазок» воды вокруг поплавка и мягкое свечение при поклёвке
    const pulse = 0.5 + 0.5*Math.sin(G.clock*3.1);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const grd = ctx.createRadialGradient(x, wY()+2, 2, x, wY()+2, 80);
    grd.addColorStop(0, G.state==="bite" ? "rgba(255,226,160,0.30)" : "rgba(180,235,255,"+(0.05+pulse*0.04)+")");
    grd.addColorStop(1, "rgba(180,235,255,0)");
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.ellipse(x, wY()+2, 80, 26, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }
  if (G.state === "bite"){
    const k = clamp(G.biteAt/G.biteWindow,0,1);
    const kk = 1-k;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x, wY(), 26*s + 44*s*k, 9*s + 15*s*k, 0, 0, Math.PI*2);
    ctx.strokeStyle = "rgba(255,255,255,"+(0.42-0.3*k)+")";
    ctx.lineWidth = 1.6; ctx.stroke();

    const rad = (26 + 60*kk)*s;
    ctx.beginPath(); ctx.arc(x, y - rad*0.95, rad, 0, Math.PI*2);
    ctx.strokeStyle = "rgba(255,214,102,"+(0.9-k*0.45)+")";
    ctx.lineWidth = Math.max(2, 3.4*s); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y - rad*0.95, rad*0.72, 0, Math.PI*2);
    ctx.strokeStyle = "rgba(255,255,255,.5)"; ctx.lineWidth = 1.6*s; ctx.stroke();
    ctx.font = "900 " + (32*s) + "px -apple-system,Segoe UI,Roboto,sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = "#fff6d8";
    ctx.shadowColor = "rgba(0,0,0,.65)"; ctx.shadowBlur = 9;
    ctx.fillText("!", x, y - rad*0.95 + 1);
    ctx.restore();
  }
}
function drawFishEnt(g){
  const f = G.fish;
  if (!f || f.junk) return;
  const img = images.fish[artOf(f.type)];
  if (!img || !img.complete) return;
  const s = clamp(Math.min(W,H)/620, 0.62, 1.6);
  const w = 92*s * (0.7 + f.norm*0.8);

  if (G.state === "fight"){
    const P = G.pull;
    const depth = (1-G.progress)*118*s + 40*s;
    const x = G.bobX + Math.sin(G.clock*(P.active?8:3.1))*22*s;
    const y = wY() + depth + Math.sin(G.clock*5)*4*s;
    const rot = Math.sin(G.clock*7)*0.1 + (P.active ? Math.sin(G.clock*26)*0.14 : 0);
    const alpha = clamp(0.35 + G.progress*0.85, 0.35, 1);
    const glowCol = (f.rar === "mythic" || f.rar === "legendary") ? RARITY[f.rar].color : null;
    if (glowCol){
      ctx.save();
      ctx.globalAlpha = 0.35*alpha*(0.7+0.3*Math.sin(G.clock*3));
      const grd = ctx.createRadialGradient(x, y, 4, x, y, w*0.8);
      grd.addColorStop(0, glowCol); grd.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(x, y, w*0.8, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
    // завихрения/пузыри от борьбы — вода «живая»
    const swirl = P.active ? 1 : 0.45;
    ctx.save();
    for (let i=0;i<7;i++){
      const ph = (G.clock*(1.1 + i*0.13) + i*0.37) % 1;
      const rx = (16 + i*7 + Math.sin(G.clock*2+i)*6)*s;
      ctx.strokeStyle = "rgba(190,240,255,"+(0.20*swirl*(1-ph))+")";
      ctx.lineWidth = 1.4*s;
      ctx.beginPath();
      ctx.ellipse(x + Math.sin(G.clock*3+i)*8*s, y + (i-3)*9*s, rx, rx*0.42, 0, Math.PI*0.15, Math.PI*1.15);
      ctx.stroke();
    }
    ctx.restore();
    drawFishAnimated(img, x, y, w, {rot:rot, alpha:alpha, palette:f.palette,
      sway: 0.26 + (P.active?0.26:0), speed: 4.6 + (P.active?4.4:0)});
  } else if (G.leap && (G.state === "result" || G.state === "aim")){
    const L = G.leap;
    const k = clamp(L.t/0.8, 0, 1);
    // след полёта
    ctx.save();
    ctx.globalAlpha = 0.30*(1-k);
    ctx.strokeStyle = "rgba(215,248,255,1)";
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(L.x0, L.y0);
    ctx.quadraticCurveTo((L.x0+L.x)/2, Math.min(L.y0,L.y)-H*0.12, L.x, L.y);
    ctx.stroke();
    ctx.restore();
    drawFishAnimated(img, L.x, L.y, w*(1+0.12*Math.sin(k*Math.PI)),
      {rot:-0.55 + L.spin, alpha:1, palette:G.fish.palette, sway:0.85, speed:11});
  } else if (G.state === "waiting" || G.state === "bite"){
    // тень под водой: подходит к поплавку перед поклёвкой
    const ap = G.state === "bite" ? 1 : (G.approach || 0);
    const dist = (74 - ap*46) * s;
    ctx.save();
    ctx.globalAlpha = 0.18 + ap*0.38;
    drawFishAnimated(img, G.bobX + Math.sin(G.clock*(1.6+ap*3))*12*s, wY() + dist, w*(0.9 + ap*0.2),
      {rot: 0, alpha: 0.2 + ap*0.5, palette:G.fish.palette, sway:0.34 + ap*0.3, speed:2.6 + ap*5});
    ctx.restore();
    if (ap > 0.15){
      ctx.save();
      for (let i=0;i<3;i++){
        ctx.beginPath();
        ctx.ellipse(G.bobX, wY()+2, 14 + i*9 + ap*10, 5 + i*3, 0, 0, Math.PI*2);
        ctx.strokeStyle = "rgba(235,250,255,"+(0.10*ap)+")";
        ctx.lineWidth = 1; ctx.stroke();
      }
      ctx.restore();
    }
  }
}
/* водоворот под поплавком во время вываживания: спиральные струи и брызги */
function drawFightSwirl(g){
  if (G.state !== "fight" || !G.fish) return;
  const t = G.clock;
  const x0 = G.bobX, y0 = wY();
  const k = clamp(G.progress, 0, 1);
  ctx.save();
  for (let i=0;i<5;i++){
    const ph = ((t*(0.8 + i*0.12) + i*0.23) % 1);
    const r = 12 + ph*(46 + k*54);
    ctx.beginPath();
    ctx.ellipse(x0 + Math.sin(t*2+i)*6, y0 + 4 + ph*10, r, r*0.34, 0, 0.3, Math.PI*1.5);
    ctx.strokeStyle = "rgba(226,250,255,"+(0.30*(1-ph)*(G.hold?1:0.6))+")";
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }
  // брызги у поплавка
  for (let i=0;i<4;i++){
    const ph = ((t*2.2 + i*0.31) % 1);
    const a = i*1.7 + t*1.4;
    ctx.beginPath();
    ctx.arc(x0 + Math.cos(a)*(10 + ph*26), y0 - Math.sin(a)*6 - ph*14, 1.6, 0, Math.PI*2);
    ctx.fillStyle = "rgba(240,253,255,"+(0.45*(1-ph))+")";
    ctx.fill();
  }
  ctx.restore();
}

/* рыба с «живым» телом: 3 сегмента, волна по хвосту, дыхание */
function drawFishAnimated(img, x, y, w, o){
  o = o || {};
  const t = o.t === undefined ? G.clock : o.t;
  const rot = o.rot || 0, alpha = o.alpha === undefined ? 1 : o.alpha;
  const sway = o.sway === undefined ? 0.30 : o.sway;
  const speed = o.speed || 5.2;
  const h = w * img.naturalHeight / img.naturalWidth;
  const seg = 3, sw = w/seg;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(rot + Math.sin(t*speed*0.5)*0.045);
  if (o.palette) ctx.filter = "hue-rotate("+o.palette.hue+"deg) saturate("+o.palette.sat+")";
  ctx.scale(-1, 1);
  // дыхание корпуса
  const breath = 1 + Math.sin(t*speed*0.62)*0.018;
  ctx.scale(1, breath);
  let px = -w/2;
  const iw = img.naturalWidth/seg;
  for (let i=0;i<seg;i++){
    const bend = Math.sin(t*speed - i*0.85) * sway * (0.12 + i*0.42);
    ctx.save();
    ctx.translate(px + sw/2, 0);
    ctx.rotate(bend*0.36);
    ctx.shadowColor = "rgba(0,20,26,.35)"; ctx.shadowBlur = 8;
    ctx.drawImage(img, i*iw, 0, iw, img.naturalHeight, -sw/2 - 0.5, -h/2, sw + 1.2, h);
    ctx.restore();
    px += sw;
  }
  ctx.restore();
}
function drawSprite(img, x, y, w, rot, alpha){
  const h = w * img.naturalHeight/img.naturalWidth;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x,y); ctx.rotate(rot); ctx.scale(-1,1);
  ctx.shadowColor = "rgba(0,20,26,.45)"; ctx.shadowBlur = 12;
  ctx.drawImage(img, -w/2, -h/2, w, h);
  ctx.restore();
}
/* ---- всплески на воде: рыба гуляет, даже когда не клюёт ---- */
const SPL = [];
function updateSplashes(dt){
  if (["waiting","aim","idle"].includes(G.state) && Math.random() < dt*0.55){
    const spot = G.spot || locSpots()[(Math.random()*locSpots().length)|0];
    const pos = spotPos(spot);
    SPL.push({
      x: clamp(pos.x + rnd(-W*0.10, W*0.10), W*0.06, W*0.94),
      y: pos.y + rnd(-6, 10),
      r: 2, life: 1, max: 1.1
    });
  }
  for (let i=SPL.length-1;i>=0;i--){
    const s = SPL[i];
    s.life -= dt; s.r += dt*46;
    if (s.life <= 0) SPL.splice(i,1);
  }
}
/* золотая вспышка при выполнении квеста */
function drawQuestFlash(){
  if (!G.questFlash) return;
  const q = G.questFlash;
  const k = clamp(q.t/1.4, 0, 1);
  const cx = W*0.5, cy = H*0.30;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i=0;i<3;i++){
    const rr = (1-k)*W*(0.18 + i*0.12);
    ctx.beginPath();
    ctx.arc(cx, cy, rr, 0, Math.PI*2);
    ctx.strokeStyle = "rgba(255,205,90,"+(0.28*k/(i+1))+")";
    ctx.lineWidth = 2.4;
    ctx.stroke();
  }
  const grd = ctx.createRadialGradient(cx, cy, 4, cx, cy, W*0.5);
  grd.addColorStop(0, "rgba(255,220,130,"+(0.16*k)+")");
  grd.addColorStop(1, "rgba(255,190,80,0)");
  ctx.fillStyle = grd;
  ctx.beginPath(); ctx.arc(cx, cy, W*0.5, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}

function drawSplashes(){
  for (const s of SPL){
    const k = s.life/s.max;
    ctx.save();
    ctx.globalAlpha = k*0.5;
    ctx.strokeStyle = "rgba(220,245,255,"+(0.55*k)+")";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(s.x, s.y, s.r, s.r*0.34, 0, 0, Math.PI*2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(s.x, s.y, s.r*0.6, s.r*0.2, 0, 0, Math.PI*2);
    ctx.stroke();
    // брызги
    if (k > 0.55){
      for (let i=0;i<3;i++){
        ctx.beginPath();
        ctx.arc(s.x + Math.sin(i*2.1+s.r)*s.r*0.6, s.y - k*10 - i*2, 1.6, 0, Math.PI*2);
        ctx.fillStyle = "rgba(235,250,255,"+(0.5*k)+")";
        ctx.fill();
      }
    }
    ctx.restore();
  }
}

/* ---- живая вода: перспективные волны, каустика, глиттер, круги от дождя ---- */
const WATER = { drops: [] };
function updateWater(dt, g){
  const icon = weatherNow().icon;
  const raining = icon === "rain" || icon === "thunder";
  if (raining){
    const n = icon === "thunder" ? 3 : 2;
    for (let i=0;i<n;i++){
      if (Math.random() < dt*9){
        WATER.drops.push({ x: Math.random()*W, y: g.surfaceY + Math.random()*(H - g.surfaceY), r: 1.4, life: 1 });
      }
    }
  }
  for (let i=WATER.drops.length-1;i>=0;i--){
    const d = WATER.drops[i];
    d.life -= dt*1.5; d.r += dt*22;
    if (d.life <= 0) WATER.drops.splice(i,1);
  }
}
function drawWaterLive(g){
  const t = G.clock;
  const top = g.surfaceY;
  const hh = H - top;
  const icon = weatherNow().icon;
  const choppy = icon === "thunder" ? 1.6 : icon === "rain" ? 1.15 : icon === "overcast" ? 1.0 : 0.72;
  const night = save.loc === "night";
  const ice = iceNow();     // 8.7: волны гасятся льдом по сезону
  const sea = save.loc === "sea";
  const wt = locMech().water;
  const stream = locMech().stream || 0;

  // 1. перспективные волны
  ctx.save();
  for (let i=0;i<9;i++){
    const k = i/9;
    const y0 = top + hh*(0.04 + k*0.92);
    const amp = (1.5 + k*k*11) * choppy;
    const speed = 0.55 + k*0.75;
    ctx.beginPath();
    for (let x=-20;x<=W+20;x+=14){
      const yv = y0 + Math.sin(x*0.012*(1+k) + t*speed + i)*amp
        + Math.sin(x*0.027*(1+k*0.5) - t*speed*1.6)*amp*0.35;
      x === -20 ? ctx.moveTo(x,yv) : ctx.lineTo(x,yv);
    }
    ctx.strokeStyle = night ? "rgba(150,190,240,"+(0.05 + k*0.05)+")"
      : ice ? "rgba(240,250,255,"+(0.06 + k*0.05)+")"
      : wt === "brown" ? "rgba(226,214,150,"+(0.05 + k*0.06)+")"
      : wt === "turquoise" ? "rgba(190,255,250,"+(0.07 + k*0.08)+")"
      : "rgba(230,250,255,"+(0.055 + k*0.07)+")";
    ctx.lineWidth = 0.8 + k*1.8;
    // рваный штрих — волна не выглядит «линейкой»
    ctx.setLineDash([34 + i*22, 26 + i*14]);
    ctx.lineDashOffset = -t*(14 + i*6);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();

  // 2. каустика — сетка света в воде днём
  if (!ice && !night){
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const tint = wt === "turquoise" ? "120,255,245" : wt === "brown" ? "215,205,150"
      : wt === "clear" ? "150,215,255" : sea ? "110,220,255" : "180,240,225";
    for (let i=0;i<5;i++){
      const cx = ((i*0.37 + t*0.012) % 1) * W;
      const cy = top + hh*(0.18 + ((i*0.29) % 0.7));
      const rw = 48 + Math.sin(t*0.7+i)*16;
      const grd = ctx.createRadialGradient(cx, cy, 1, cx, cy, rw);
      grd.addColorStop(0, "rgba("+tint+",0.045)");
      grd.addColorStop(1, "rgba("+tint+",0)");
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rw, rw*0.30, 0, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 3. глиттер
  ctx.save();
  const glit = night ? "rgba(200,220,255," : ice ? "rgba(255,255,255," : "rgba(255,245,215,";
  for (let i=0;i<40;i++){
    const ph = (t*0.35 + i*0.17) % 1;
    const x = ((i*0.618 + Math.sin(t*0.6+i*2)*0.012) % 1) * W;
    const y = top + 8 + Math.pow(ph, 1.6) * hh * 0.9;
    const scale = 0.4 + (y-top)/hh;
    const a = (0.05 + 0.35*Math.abs(Math.sin(t*2.4 + i))) * (0.35 + 0.65*Math.sin(ph*Math.PI));
    ctx.fillStyle = glit + (a*0.75) + ")";
    ctx.beginPath();
    ctx.ellipse(x, y, (2.4 + (i%3)*1.6)*scale, 0.9*scale, Math.sin(i)*0.5, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.restore();

  // 4. круги от дождя
  for (const d of WATER.drops){
    ctx.beginPath();
    ctx.ellipse(d.x, d.y, d.r, d.r*0.34, 0, 0, Math.PI*2);
    ctx.strokeStyle = "rgba(215,240,255,"+(0.35*d.life)+")";
    ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(d.x, d.y, d.r*0.55, d.r*0.18, 0, 0, Math.PI*2);
    ctx.strokeStyle = "rgba(215,240,255,"+(0.2*d.life)+")";
    ctx.stroke();
  }

  // 5. дорожка от солнца/луны
  const sunX = W*0.62;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i=0;i<14;i++){
    const k = i/14;
    const y = top + hh*0.02 + k*hh*0.62;
    const wdt = 10 + k*W*0.10;
    const a = (night ? 0.10 : 0.075) * (1-k) * (0.55 + 0.45*Math.sin(t*1.4 + i*0.8));
    ctx.fillStyle = night ? "rgba(220,235,255,"+a+")" : "rgba(255,225,170,"+a+")";
    ctx.beginPath();
    ctx.ellipse(sunX + Math.sin(t*0.8+i)*8, y, wdt, 1.2 + k*2.2, 0, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.restore();

  // 6. трещины на льду
  if (ice){
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,.10)";
    ctx.lineWidth = 1.1;
    for (let i=0;i<5;i++){
      ctx.beginPath();
      let x = W*(0.1 + i*0.19), y = top + hh*0.1;
      ctx.moveTo(x,y);
      for (let j=0;j<5;j++){
        x += Math.sin(i*3+j*2.1)*W*0.05;
        y += hh*0.13;
        ctx.lineTo(x,y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  // 7. ветровая рябь
  ctx.save();
  for (let i=0;i<16;i++){
    const ph = (t*(0.18 + (i%3)*0.05) + i*0.31) % 1;
    const y = top + hh*0.10 + ((i*0.137) % 0.85)*hh;
    const x = (ph*1.4 - 0.2)*W;
    const len = 8 + (y-top)/hh*26;
    ctx.strokeStyle = "rgba(230,248,255,"+(0.07*Math.sin(ph*Math.PI))+")";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len, y - 1.5); ctx.stroke();
  }
  ctx.restore();
}

function drawWaterLife(g){
  const t = G.clock;
  ctx.save();
  // блики
  for (let i=0;i<26;i++){
    const ph = (t*0.12 + i*0.137) % 1;
    const x = ((i*0.618 + Math.sin(t*0.3+i)*0.02) % 1) * W;
    const y = g.surfaceY + 18 + ph*(H-g.surfaceY)*0.7;
    const a = 0.10 * Math.sin(ph*Math.PI) * (0.6+0.4*Math.sin(t*3+i));
    ctx.fillStyle = (save.loc === "night") ? "rgba(190,215,255,"+a+")" : "rgba(255,240,205,"+a+")";
    ctx.beginPath();
    ctx.ellipse(x, y, 6 + (i%4)*4, 1.2, 0, 0, Math.PI*2);
    ctx.fill();
  }
  // рябь от ветра
  const windK = weatherNow().icon === "storm" ? 1 : weatherNow().icon === "rain" ? 0.6 : 0.35;
  for (let i=0;i<3;i++){
    ctx.beginPath();
    const y0 = g.surfaceY + H*0.08 + i*H*0.11;
    for (let x=0;x<=W;x+=10){
      const yy = y0 + Math.sin(x*0.014 + t*(0.7+i*0.2) + i)*3*windK;
      x === 0 ? ctx.moveTo(x,yy) : ctx.lineTo(x,yy);
    }
    ctx.strokeStyle = "rgba(210,240,255,"+(0.035*windK)+")";
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
  ctx.restore();
}

/* ---- стайка мелкой рыбы у поверхности ---- */
const SCHOOL = { t:0, fish:[] };
function drawSchool(g){
  if (iceNow()) return;   // подо льдом стайки не видно
  if (!SCHOOL.fish.length){
    for (let i=0;i<7;i++) SCHOOL.fish.push({ph:i*0.9, sp:0.14+Math.random()*0.1, y:0.10+Math.random()*0.16, s:0.5+Math.random()*0.5});
  }
  const night = save.loc === "night";
  ctx.save();
  for (const f of SCHOOL.fish){
    const x = ((G.clock*f.sp + f.ph) % 1.3 - 0.15) * W;
    const y = g.surfaceY + f.y*H*0.6 + Math.sin(G.clock*1.7+f.ph)*4;
    const w = 16*f.s;
    ctx.globalAlpha = (night ? 0.18 : 0.28) * (0.7+0.3*Math.sin(G.clock*2+f.ph));
    ctx.fillStyle = night ? "rgba(150,190,230,.9)" : "rgba(30,60,70,.9)";
    ctx.beginPath();
    ctx.ellipse(x, y, w*0.5, w*0.16, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - w*0.46, y);
    ctx.lineTo(x - w*0.66, y - w*0.16);
    ctx.lineTo(x - w*0.66, y + w*0.16);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

function drawFishShadow(g){
  // тень рыбы на дне во время вываживания
  if (G.state !== "fight" || !G.fish || G.fish.junk) return;
  const s = clamp(Math.min(W,H)/620, 0.62, 1.5);
  const a = 0.16 * (1 - G.progress*0.5);
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(G.bobX + Math.sin(G.clock*2)*10*s, g.surfaceY + H*0.20, 34*s*(0.7+G.progress*0.4), 9*s, 0, 0, Math.PI*2);
  ctx.fillStyle = "rgba(4,20,26,"+a+")";
  ctx.filter = "blur(4px)";
  ctx.fill();
  ctx.restore();
}

function drawTensionStreaks(g){
  if (G.state !== "fight" || G.tension < 0.86) return;
  const k = (G.tension - 0.86) / 0.14;
  const mid = {x: lerp(g.rodTip.x, G.bobX, 0.5), y: lerp(g.rodTip.y, G.bobY, 0.5)};
  ctx.save();
  ctx.globalAlpha = 0.35*k;
  ctx.strokeStyle = "#ffd9c2";
  ctx.lineWidth = 1;
  for (let i=0;i<4;i++){
    const off = Math.sin(G.clock*12 + i)*6;
    ctx.beginPath();
    ctx.moveTo(mid.x + off, mid.y - 16 - i*5);
    ctx.lineTo(mid.x + off*1.6, mid.y - 4 - i*5);
    ctx.stroke();
  }
  ctx.restore();
}

function drawLineDroplets(g){
  // капли, стекающие по леске при напряжении
  if (G.state !== "fight" || G.tension < 0.55) return;
  if (Math.random() > 0.25) return;
  const t = Math.random();
  const x = lerp(g.rodTip.x, G.bobX, t), y = lerp(g.rodTip.y, G.bobY, t);
  G.particles.push({x, y, vx: rnd(-8,8), vy: rnd(20,70), life:rnd(0.3,0.6), r:rnd(0.8,1.8), color:"rgba(215,240,255,"});
}

function drawParticles(){
  for (const p of G.particles){
    const a = clamp(p.life/0.8, 0, 1);
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
    ctx.fillStyle = p.color + (a*0.8) + ")"; ctx.fill();
  }
  for (const ft of G.floatingTexts){
    const a = clamp(ft.life, 0, 1);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.font = "900 " + Math.round(Math.min(W,H)*0.034) + "px -apple-system,Segoe UI,Roboto,sans-serif";
    ctx.textAlign = "center";
    ctx.shadowColor = "rgba(0,0,0,.6)"; ctx.shadowBlur = 8;
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.restore();
  }
}
/* передний план: тёмная кромка берега внизу кадра — «мы стоим на берегу» */
function drawNearBank(g){
  const y0 = H*1.005;
  const k = save.loc === "winter" ? "rgba(18,34,46," : save.loc === "night" ? "rgba(6,12,20," : save.loc === "sea" ? "rgba(10,26,40," : "rgba(8,26,24,";
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-10, y0);
  for (let x=-10;x<=W+10;x+=18){
    const yv = H*0.965 + Math.sin(x*0.021)*7 + Math.sin(x*0.007+1.3)*5;
    ctx.lineTo(x, yv);
  }
  ctx.lineTo(W+10, y0);
  ctx.closePath();
  ctx.fillStyle = k + "0.92)";
  ctx.fill();
  ctx.restore();
}

function drawForeground(g){
  const bs = ctx.createLinearGradient(0, H*0.72, 0, H);
  bs.addColorStop(0, "rgba(4,22,28,0)");
  bs.addColorStop(1, "rgba(4,22,28,0.55)");
  ctx.fillStyle = bs; ctx.fillRect(0, H*0.72, W, H*0.28);

  const ts = ctx.createLinearGradient(0, 0, 0, H*0.16);
  ts.addColorStop(0, "rgba(6,20,26,0.46)");
  ts.addColorStop(1, "rgba(6,20,26,0)");
  ctx.fillStyle = ts; ctx.fillRect(0, 0, W, H*0.16);

  if (iceNow()){
    // лунку показываем только когда точка выбрана (или идёт ловля)
    if (!G.spot && (G.state === "idle" || G.state === "aim" || G.state === "power")) return;
    const hole = holeXY();
    const ix = hole.x, iy = hole.y;
    const near = (G.state === "idle" || G.state === "aim" || G.state === "power") && G.spot;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(ix, iy, 46, 15, 0, 0, Math.PI*2);
    ctx.fillStyle = "rgba(10,26,36,.55)"; ctx.fill();
    ctx.strokeStyle = "rgba(220,245,255,.5)"; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(ix, iy, 54, 20, 0, 0, Math.PI*2);
    ctx.strokeStyle = "rgba(255,255,255,.18)"; ctx.lineWidth = 6; ctx.stroke();
    // наледь вокруг выбранной лунки
    if (near){
      for (let i=0;i<7;i++){
        ctx.beginPath();
        ctx.ellipse(ix + Math.cos(i*2.1)*62, iy + Math.sin(i*2.1)*22, 13, 5, i*0.7, 0, Math.PI*2);
        ctx.fillStyle = "rgba(240,252,255,.16)"; ctx.fill();
      }
    }
    ctx.restore();
    return;
  }
  if (save.loc === "sea"){
    // пена на волнах у нижней кромки
    ctx.save();
    for (let i=0;i<3;i++){
      const yy = H*(0.80 + i*0.06);
      ctx.beginPath();
      for (let x=0;x<=W;x+=12){
        const yv = yy + Math.sin(x*0.02 + G.clock*(1.1+i*0.3) + i)*5;
        x === 0 ? ctx.moveTo(x,yv) : ctx.lineTo(x,yv);
      }
      ctx.strokeStyle = "rgba(235,250,255,"+(0.10 - i*0.02)+")";
      ctx.lineWidth = 2.2; ctx.stroke();
    }
    ctx.restore();
    return;
  }
  // мягкий туман у горизонта — глубина кадра
  ctx.save();
  const fogY = g.surfaceY;
  const fg = ctx.createLinearGradient(0, fogY - H*0.13, 0, fogY + H*0.03);
  fg.addColorStop(0, "rgba(225,240,248,0)");
  fg.addColorStop(0.65, (save.loc === "night" ? "rgba(120,150,200,0.10)" : "rgba(232,242,250,0.13)"));
  fg.addColorStop(1, "rgba(225,240,248,0)");
  ctx.fillStyle = fg;
  ctx.fillRect(0, fogY - H*0.13, W, H*0.16);
  ctx.restore();

  /* 8.0: передний план новых водоёмов */
  if (save.loc === "swamp"){
    // тёмные камыши и рогоз по кромке
    const s2 = clamp(Math.min(W,H)/620, 0.7, 1.6);
    ctx.save();
    ctx.strokeStyle = "rgba(14,30,14,.92)"; ctx.fillStyle = "rgba(14,30,14,.92)"; ctx.lineCap = "round";
    for (let i=0;i<11;i++){
      const bx = W*(0.01 + i*0.098), bh = H*(0.16 + ((i*37)%9)/100);
      const lean = Math.sin(i*1.7)*W*0.035 + Math.sin(G.clock*0.7 + i)*3;
      ctx.lineWidth = (1.5 + (i%3)*0.9)*s2;
      ctx.beginPath(); ctx.moveTo(bx, H+8);
      ctx.quadraticCurveTo(bx + lean*0.4, H - bh*0.55, bx + lean, H - bh);
      ctx.stroke();
      if (i % 3 === 0){
        ctx.beginPath();
        ctx.ellipse(bx + lean, H - bh - 8*s2, 2.6*s2, 7.5*s2, lean*0.01, 0, Math.PI*2);
        ctx.fillStyle = "rgba(96,52,26,.95)"; ctx.fill();
      }
    }
    ctx.restore();
    return;
  }
  if (save.loc === "mountain"){
    // гранитные валуны у воды
    const s2 = clamp(Math.min(W,H)/620, 0.7, 1.6);
    ctx.save();
    for (let i=0;i<3;i++){
      const bx = W*(0.06 + i*0.42), by = H*(0.94 + (i%2)*0.03), r = 54*s2 + i*13;
      ctx.beginPath();
      ctx.moveTo(bx - r, by + r*0.4);
      ctx.quadraticCurveTo(bx - r*0.7, by - r*0.55, bx, by - r*0.7);
      ctx.quadraticCurveTo(bx + r*0.8, by - r*0.5, bx + r, by + r*0.4);
      ctx.closePath();
      const rg = ctx.createLinearGradient(bx, by - r*0.7, bx, by + r*0.4);
      rg.addColorStop(0, "rgba(122,136,150,.95)");
      rg.addColorStop(1, "rgba(46,54,64,.96)");
      ctx.fillStyle = rg; ctx.fill();
      // снежная шапка
      ctx.beginPath();
      ctx.moveTo(bx - r*0.5, by - r*0.35);
      ctx.quadraticCurveTo(bx - r*0.2, by - r*0.75, bx + r*0.15, by - r*0.62);
      ctx.quadraticCurveTo(bx + r*0.45, by - r*0.5, bx + r*0.6, by - r*0.1);
      ctx.quadraticCurveTo(bx + r*0.1, by - r*0.34, bx - r*0.5, by - r*0.35);
      ctx.fillStyle = "rgba(240,250,255,.8)"; ctx.fill();
    }
    ctx.restore();
    return;
  }
  if (save.loc === "lagoon"){
    // кораллы у нижней кромки, просвечивающие сквозь воду
    const s2 = clamp(Math.min(W,H)/620, 0.7, 1.6);
    ctx.save();
    const cols = ["rgba(255,138,180,.9)","rgba(255,196,110,.9)","rgba(180,140,255,.85)","rgba(120,240,210,.85)"];
    for (let i=0;i<5;i++){
      const bx = W*(0.10 + i*0.19), by = H*(0.99);
      ctx.strokeStyle = cols[i%cols.length]; ctx.lineWidth = 5*s2; ctx.lineCap = "round";
      for (let k=0;k<3;k++){
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.quadraticCurveTo(bx + (k-1)*12*s2, by - 60*s2, bx + (k-1)*26*s2 + Math.sin(G.clock*0.6+i+k)*3, by - 96*s2);
        ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(bx, by - 96*s2, 6*s2, 0, Math.PI*2);
      ctx.fillStyle = cols[(i+1)%cols.length]; ctx.fill();
    }
    ctx.restore();
    return;
  }
  if (save.loc !== "lake"){ drawNearBank(g); return; }
  drawNearBank(g);
  const s = clamp(Math.min(W,H)/620, 0.7, 1.6);
  ctx.save();
  ctx.strokeStyle = "rgba(8,26,26,0.92)"; ctx.fillStyle = "rgba(8,26,26,0.92)"; ctx.lineCap = "round";
  const reeds = [
    {x:W*0.02,h:H*0.30,dir:1,w:3.2*s},{x:W*0.06,h:H*0.24,dir:1,w:2.6*s},{x:W*0.10,h:H*0.20,dir:1,w:2.2*s},
    {x:W*0.965,h:H*0.26,dir:-1,w:3.0*s},{x:W*0.93,h:H*0.19,dir:-1,w:2.4*s}
  ];
  for (const r of reeds){
    const topX = r.x + r.dir*W*0.05, topY = H - r.h;
    ctx.lineWidth = r.w;
    ctx.beginPath(); ctx.moveTo(r.x, H+10);
    ctx.quadraticCurveTo(r.x + r.dir*W*0.012, H - r.h*0.55, topX, topY); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(topX, topY-5*s, 3.2*s, 9*s, r.dir*0.12, 0, Math.PI*2); ctx.fill();
  }
  ctx.restore();
}
function drawVignette(){
  const grd = ctx.createRadialGradient(W/2, H*0.45, Math.min(W,H)*0.28, W/2, H*0.5, Math.max(W,H)*0.8);
  grd.addColorStop(0, "rgba(0,0,0,0)");
  grd.addColorStop(1, "rgba(0,0,0,0.44)");
  ctx.fillStyle = grd; ctx.fillRect(0,0,W,H);
}

function hexA(hex, a){
  const h = hex.replace("#","");
  const n = parseInt(h.length === 3 ? h.split("").map(c=>c+c).join("") : h, 16);
  return "rgba("+((n>>16)&255)+","+((n>>8)&255)+","+(n&255)+","+a+")";
}

function draw(){
  ctx.setTransform(DPR,0,0,DPR,0,0);
  ctx.clearRect(0,0,W,H);
  const g = geo();
  ctx.save();
  if (G.shake > 0.2) ctx.translate((Math.random()-0.5)*G.shake, (Math.random()-0.5)*G.shake);

  drawScene(g);
  drawUnderwater(g);
  drawLagoonShine(g);
  drawWaterLive(g);
  drawCaustics(g);
  drawSunPath(g);
  drawStreamLines(g);
  drawPads(g);
  drawSnags(g);
  drawSnagFx(g);
  drawWaterLife(g);
  drawAmbient(g);
  drawMountainAir(g);
  drawLitter(g);
  drawWX(g);
  drawSpots(g);
  drawZoneInfo(g);
  drawAimReticle(g);
  drawCastArc(g);
  drawSchool(g);
  drawSplashes();
  drawFishShadow(g);
  drawFishEnt(g);
  drawRod(g);
  drawImpactBurst(g);
  drawWake(g);
  drawPullFlash(g);
  drawBobberTrail(g);
  drawFightSwirl(g);
  drawPerfectFlash(g);
  drawBobber(g);
  drawBuoy(g);
  drawPatience(g);
  drawFishTail(g);
  drawLine(g);
  drawTensionStreaks(g);
  drawLineDroplets(g);
  drawParticles();
  drawIce(g);
  // 8.7: сезонный оттенок и зимний лёд поверх воды (но под интерфейсом и снастью)
  drawSeasonTint(g);
  drawWinterIce(g);
  drawHookFlash();
  drawForeground(g);
  drawVignette();

  // 8.0: таймер подсказок (прикормка, окно водоёма) — раз в секунду, не в каждом кадре
  if (!G._mechT || G.clock - G._mechT > 1){
    G._mechT = G.clock;
    if (typeof syncLocInfo === "function") syncLocInfo();
    if (typeof renderHandBtn === "function") renderHandBtn();
    if (typeof renderDuelChip === "function") renderDuelChip();
    if (typeof renderWaveChip === "function") renderWaveChip();
    if (handActive() && !G._handToast){
      G._handToast = true;
      setTimeout(() => { G._handToast = false; }, 30000);
    }
    // прикормка закончилась — сообщаем один раз
    if (save.hand && save.hand.until <= Date.now() && save.hand.loc === save.loc && !G._handDone){
      G._handDone = true; save.hand = null; persist();
      toast("Прикормка размылась", "Клёв вернулся к обычному. Можно сыпнуть снова.", 2000);
    }
    if (!save.hand) G._handDone = false;
  }
  if (G.flash > 0){ ctx.fillStyle = "rgba(255,80,60,"+(G.flash*0.3)+")"; ctx.fillRect(0,0,W,H); }
  if (G.questFlash){ G.questFlash.t -= 1/60; if (G.questFlash.t <= 0) G.questFlash = null; }
  drawQuestFlash();
  // «золотой час»: тёплые лучи при ясной погоде или закатном солнце
  if (["sunny","frost"].includes(weatherNow().icon) && save.loc !== "night"){
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const sunX = W*0.62, sunY = H*0.30;
    const grd = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, W*0.9);
    grd.addColorStop(0, "rgba(255,210,140,0.10)");
    grd.addColorStop(0.55, "rgba(255,180,110,0.045)");
    grd.addColorStop(1, "rgba(255,160,90,0)");
    ctx.fillStyle = grd; ctx.fillRect(0,0,W,H);
    // лучи
    for (let i=0;i<6;i++){
      const a = G.clock*0.06 + i*1.05;
      ctx.beginPath();
      ctx.moveTo(sunX, sunY);
      ctx.lineTo(sunX + Math.cos(a)*W, sunY + Math.sin(a)*W);
      ctx.lineTo(sunX + Math.cos(a+0.05)*W, sunY + Math.sin(a+0.05)*W);
      ctx.closePath();
      ctx.fillStyle = "rgba(255,225,170,0.028)";
      ctx.fill();
    }
    ctx.restore();
  }
  if (G.rarityFlash && G.rarityFlash.t > 0){
    const k = G.rarityFlash.t/0.9;
    const grd = ctx.createRadialGradient(W*0.5, H*0.45, 10, W*0.5, H*0.45, Math.max(W,H)*0.7);
    grd.addColorStop(0, hexA(G.rarityFlash.color, 0.28*k));
    grd.addColorStop(1, hexA(G.rarityFlash.color, 0));
    ctx.fillStyle = grd; ctx.fillRect(0,0,W,H);
  }
  ctx.restore();
}

/* ---------------- интерфейс: чипы, табы ---------------- */
function announceWeather(prev){
  const w = weatherNow();
  toast("Погода: " + w.name, w.hint, 2200);
  tone(520,0.12,"sine",0.05,700);
}

/* чип «наживка дня» / «лучший день водоёма»: подсказка, где сейчас клёв лучше */
function syncDayChip(){
  const el = $("dayChip");
  if (!el) return;
  const onBait = baitDayOn();
  const onLoc = locDayOn();
  if (!onBait && !onLoc){
    el.style.display = "none";
    el.onclick = null;
    return;
  }
  el.style.display = "";
  const b = BAITS[baitOfDay()];
  if (onBait && b){
    el.className = "chip daychip hot";
    el.innerHTML = ICONS.bait + "<span>" + b.name + "</span><i>+" + Math.round((BAIT_DAY.mul-1)*100) + "%</i>";
    el.title = "Наживка дня: " + b.name + " — клёв +" + Math.round((BAIT_DAY.mul-1)*100) +
      "%, опыт +" + Math.round(BAIT_DAY.xp*100) + "%" + (onLoc ? " · и лучший день водоёма!" : "") +
      ". Нажми, чтобы надеть.";
  } else {
    el.className = "chip daychip locday";
    el.innerHTML = ICONS.star + "<span>лучший день</span><i>+" + Math.round((LOC_DAY_K.klyov-1)*100) + "%</i>";
    el.title = "Сегодня лучший день на этом водоёме: клёв +" + Math.round((LOC_DAY_K.klyov-1)*100) +
      "%, рыба крупнее, монет +" + Math.round((LOC_DAY_K.coins-1)*100) + "%";
  }
  el.onclick = () => {
    if (!onBait) return;
    const id = baitOfDay();
    if (baitsLeft(id) <= 0){
      const cost = (BAITS[id].price || 0) * 10;
      if ((save.coins||0) < cost){ toast("Не хватает монет", "«"+BAITS[id].name+"» ×10 стоит "+cost+" монет.", 2000); return; }
      save.coins -= cost; save.baits[id] = (save.baits[id]||0) + 10;
      if (!save.owned.bait.includes(id)) save.owned.bait.push(id);
      sfx.buy();
    } else sfx.tap();
    save.equipped.bait = id;
    persist(); updateChips(); renderGearBar();
    toast("Наживка дня надета", BAITS[id].name + " — сегодня на неё берёт охотнее.", 2200);
  };
}

function syncWeatherChip(){
  const el = $("weatherChip");
  if (!el) return;
  const w = weatherNow();
  const shortName = {sunny:"Ясно", overcast:"Облачно", rain:"Дождь", mist:"Туман",
    thunder:"Гроза", moon:"Луна", snow:"Снег", frost:"Мороз"}[save.weather && save.weather.type] || w.name;
  const pct = Math.round((w.bite-1)*100);
  el.innerHTML = (WEATHER_ICONS[w.icon] || "") +
    '<span>'+shortName+'</span>' +
    (Math.abs(pct) >= 10 ? '<i class="'+(pct < 0 ? "down":"")+'">'+(pct>0?"+":"")+pct+'</i>' : '');
  el.title = w.name + " · клёв " + (pct>=0?"+":"") + pct + "% · " + w.hint;
}

/* ---- быстрая смена приманки ---- */
function toggleBaitShelf(force){
  const sh = $("baitShelf");
  if (!sh) return;
  const on = force === undefined ? !sh.classList.contains("on") : force;
  sh.classList.toggle("on", on);
  if (on) renderBaitShelf();
}
function renderBaitShelf(){
  const sh = $("baitShelf");
  if (!sh) return;
  const locB = locBaits();
  const ids = Object.keys(BAITS).sort((a,b) => {
    const ca = locB.has(a) ? 0 : 1, cb = locB.has(b) ? 0 : 1;
    return ca - cb || BAITS[a].tier - BAITS[b].tier;
  });
  sh.innerHTML = '<div class="bs-head">Приманка <span>нажми, чтобы сменить</span>'
    + '<button class="bs-x" id="bsClose">×</button></div>'
    + '<div class="bs-grid">' + ids.map(id => {
        const b = BAITS[id], own = baitsLeft(id), eq = save.equipped.bait === id;
        const here = locB.has(id);
        const fishHere = Object.keys(FISH).filter(k => FISH[k].bait === id &&
          locSpots().some(sp => sp.w[k]) && FISH[k].reqPower <= rodDef().power).length;
        // клубный плёс: сколько редких видов возьмёт эта приманка
        const clubSpotNow = clubAccess() ? CLUB_SPOTS[save.loc] : null;
        const clubHits = clubSpotNow
          ? Object.keys(clubSpotNow.w).filter(k => FISH[k] && FISH[k].bait === id && FISH[k].reqPower <= rodDef().power).length : 0;
        const price = b.price || 0;
        const isDay = baitOfDay() === id;
        // пустую приманку можно докупить прямо здесь: монетами или (премиум) жемчугом
        const buyTag = own ? '' : (b.pearl
          ? '<i class="bs-buy">жемчуг</i>'
          : price ? '<i class="bs-buy">×10 · ' + price*10 + '</i>' : '');
        return '<button class="bs'+(eq?" on":"")+(own?"":" empty")+(here?"":" far")+(isDay?" day":"")+'" data-bait="'+id+'">'
          + (isDay ? '<i class="bs-day">дня</i>' : '')
          + buyTag
          + '<b>'+b.name+'</b>'
          + '<small>'+own+' шт · '+(here ? (fishHere ? fishHere+" видов тут" : "нужна снасть сильнее") : "не в этом водоёме")
          + (clubHits ? ' · клуб +'+clubHits : '')+'</small>'
          + '</button>';
      }).join("") + '</div>';
  const x = sh.querySelector("#bsClose");
  if (x) x.addEventListener("click", () => toggleBaitShelf(false));
  sh.querySelectorAll(".bs").forEach(btn => btn.addEventListener("click", () => {
    const id = btn.dataset.bait;
    const b = BAITS[id];
    // пустую приманку покупаем здесь же — десятком, за монеты
    if (!baitsLeft(id)){
      const cost = (b.price || 0) * 10;
      if ((save.coins || 0) < cost){
        toast("Не хватает монет", "«" + b.name + "» ×10 стоит " + cost + " монет.", 2000);
        sfx.tap(); return;
      }
      save.coins -= cost;
      save.baits[id] = (save.baits[id] || 0) + 10;
      if (!save.owned.bait.includes(id)) save.owned.bait.push(id);
      toast("Приманка куплена", "«" + b.name + "» ×10 за " + cost + " монет.", 1800);
      sfx.buy();
    } else {
      if (!save.owned.bait.includes(id)) save.owned.bait.push(id);
      sfx.tap();
    }
    save.equipped.bait = id;
    persist(); updateChips(); renderBaitShelf(); renderGearBar();
  }));
}

function renderGearBar(){
  const bar = $("gearbar");
  if (!bar) return;
  const gp = gearPower();
  const items = ["rod","reel","line","hook","bait","net"].map(slot => {
    const def = SLOTS.find(x => x.id === slot);
    const it = tableFor(slot)[save.equipped[slot]] || Object.values(tableFor(slot))[0];
    if (slot === "bait"){
      const left = baitsLeft(save.equipped.bait);
      return '<span class="gi bait" data-slot="bait" title="'+def.name+': '+it.name+' — осталось '+left+'">'
        + ICONS[slot] + '<i>'+left+'</i></span>';
    }
    return '<span class="gi" title="'+def.name+'">'+ICONS[slot]+'<i>'+it.tier+'</i></span>';
  }).join("");
  bar.innerHTML = items +
    '<span class="gp">'+ICONS.power+'<b>'+gp+'</b></span>';
  bar.classList.toggle("low", !!(G.fish && !G.fish.junk && FISH[G.fish.type] && FISH[G.fish.type].reqPower > gp));
  const baitBtn = bar.querySelector('.gi[data-slot="bait"]');
  if (baitBtn) baitBtn.addEventListener("click", (e) => { e.stopPropagation(); sfx.tap(); toggleBaitShelf(); });
}

function syncGearbarVisibility(){
  const bar = $("gearbar");
  if (!bar) return;
  const metersOn = ["power","fight"].includes(G.state);
  bar.classList.toggle("hide", metersOn);
}

function updateQuestDot(){
  const dot = $("questDot");
  if (!dot) return;
  const ready = QUESTS.some(q => questClaimable(q)) ||
    clubDayReady() ||
    dailyNow().some(t => { const p = dailyProg(t); return p.cur >= p.max && !(save.daily.done||{})[t.id]; });
  dot.style.display = ready ? "block" : "none";
}
/* чип «набор ждёт»: виден только участникам клуба, пока набор не забран */
function syncClubChip(){
  const el = $("clubChip");
  if (!el) return;
  const show = clubAccess();
  el.style.display = show ? "" : "none";
  if (!show) return;
  const ready = clubDayReady();
  el.innerHTML = ICONS.pearl + (ready ? '<i></i>' : "");
  el.classList.toggle("ready", ready);
  el.style.opacity = ready ? "1" : ".5";
  el.title = ready ? "Клубный набор ждёт — забрать" : "Клуб: " + clubRank().name + " · набор уже забран";
}

function updateChips(){
  $("coins").textContent = save.coins;
  if ($("coinsShop")) $("coinsShop").textContent = save.coins;
  if ($("pearls")) $("pearls").textContent = save.pearl || 0;
  if ($("pearlsShop")) $("pearlsShop").textContent = save.pearl || 0;
  const li = levelInfo();
  $("lvl").textContent = li.lvl;
  $("xpfill").style.width = (clamp(li.cur/li.need,0,1)*100)+"%";
  $("locName").textContent = locDef().short || locDef().name;
  const chipLoc = $("chipLoc");
  if (chipLoc) chipLoc.title = locDef().name + " — " + locDef().sub;
  syncWeatherChip();
  syncDayChip();
  syncClubChip();
  $("btnSound").innerHTML = save.mute ? ICONS.mute : ICONS.sound;
  renderGearBar();
  syncWeatherChip();
  renderHandBtn();
  renderDuelChip();
  syncLocInfo();
  renderWaveChip();
  updateQuestDot();
}

/* чипы «здесь и сейчас»: окно водоёма, прикормка, течение */
function syncLocInfo(){
  const box = $("locInfo");
  if (!box) return;
  // в бою и на забросе шкалы занимают места больше — строку убираем
  box.classList.toggle("off", ["power","fight","casting","bite"].includes(G.state));
  const m = locMech(), on = windowOn();
  const left = handLeft();
  const parts = [];
  // 8.7: сезон и день сезона
  const se = seasonDef();
  parts.push('<span class="li season" title="Игровой сезон: ' + se.name + ', ' + seasonDay() + '-й день из ' + SEASON.days + '. ' + se.note + '">' +
    ICONS.leaf + ' ' + se.name + ' · ' + seasonDay() + '/' + SEASON.days + '</span>');
  parts.push('<span class="li win' + (on ? " on" : "") + '">' + ICONS.clock + ' ' +
    (DAYTIME[dayTimeNow()]||DAYTIME.day).name + (on ? " · окно водоёма" : "") + '</span>');
  if (left > 0) parts.push('<span class="li hand on">' + ICONS.feed + ' прикормка ' +
    (left > 60 ? Math.ceil(left/60) + " мин" : left + " с") + '</span>');
  if (m.stream >= 0.4) parts.push('<span class="li stream">' + ICONS.wave + ' течение</span>');
  // 8.6: что под поплавком — глубина, грунт и температура воды
  const seK = spotEnv(G.spot, save.loc);
  const tW = waterTemp(save.loc, seK.depth);
  const cl = clarityAt(save.loc, seK.depth);
  const clTxt = cl > 0.7 ? "прозрачная" : cl > 0.42 ? "мутноватая" : "мутная";
  parts.push('<span class="li water" title="' + spotEnvText(G.spot, save.loc) + ' · вода ' + tW + ' °C, ' + clTxt + '">' +
    ICONS.drop + ' ' + seK.depth.toFixed(1).replace(".", ",") + ' м · ' + (ECO_BOT_RU[seK.bottom] || "дно").slice(0, 6) + ' · ' + tW + '°</span>');
  // 8.7: давление со стрелкой тренда
  const pr = pressureNow(save.loc), tr = pressureTrend(save.loc);
  const arrow = tr >= 0.5 ? "↗" : tr <= -1.5 ? "↘" : "→";
  parts.push('<span class="li press" title="Давление ' + pr + ' гПа, ' + (tr>=0.5?"растёт":tr<=-1.5?"падает":"стабильно") + '">' +
    ICONS.gauge + ' ' + pr + ' ' + arrow + '</span>');
  // 8.7: ветер — в берег или с берега
  const wnd = windAt(save.loc);
  if (wnd.power > 0.25){
    const dirTxt = wnd.onshore ? "в берег" : wnd.offshore ? "с берега" : "боковой";
    parts.push('<span class="li wind' + (wnd.onshore ? " on" : "") + '" title="Ветер ' + dirTxt + ', сила ' + Math.round(wnd.power*100) + '%">' +
      ICONS.wind + ' ' + dirTxt + '</span>');
  }
  if (zamorOn()) parts.push('<span class="li warn" title="Мало кислорода: холодолюбивая рыба почти не берёт">' + ICONS.alert + ' замор</span>');
  box.innerHTML = parts.join("");
}
/* 8.5: чип «выход рыбы». Показывает либо «идёт выход» с остатком минут, либо «когда будет» */
function renderWaveChip(){
  const el = $("waveChip");
  if (!el) return;
  if (["fight","power","casting","bite","snag"].includes(G.state)){ el.classList.remove("on","hot"); return; }
  if (G.duel && G.duel.active){ el.classList.remove("on","hot"); return; }   // дуэль показывает свой чип
  const on = waveOn(save.loc);
  el.classList.add("on");
  el.classList.toggle("hot", on);
  if (on){
    el.innerHTML = ICONS.buoy + '<b>выход рыбы</b><i>' + waveMinsLeft() + ' мин</i>';
    el.title = "Час активности: поклёвки почти вдвое быстрее, рыба крупнее. Не уходи с воды.";
  } else {
    el.innerHTML = ICONS.buoy + '<b>выход</b><i>через ' + fmtMins(waveIn(save.loc)) + '</i>';
    el.title = "Выход рыбы у этого водоёма начнётся через " + fmtMins(waveIn(save.loc)) +
      ". Прогноз всех водоёмов — на «Базе».";
  }
  el.onclick = () => {
    const f = biteForecast(save.loc);
    toast("Прогноз: " + f.def.name,
      (on ? "Выход рыбы идёт ещё " + waveMinsLeft() + " мин. " : "Следующий выход через " + fmtMins(waveIn(save.loc)) + ". ") +
      (f.why.length ? "Сейчас: " + f.why.join(", ") + "." : ""), 2600);
    sfx.tap();
  };
}

function updateTabState(){
  const fishing = ["idle","aim","power","casting","waiting","bite","fight"].includes(G.state);
  document.querySelectorAll(".tab").forEach(t => {
    t.classList.toggle("on", t.dataset.tab === "fish" && fishing);
  });
}
function initTabs(){
  const cfg = [
    {id:"tabBase", tab:"base", icon:ICONS.home, label:"База"},
    {id:"tabQuests", tab:"quests", icon:ICONS.star, label:"Квесты", badge:true},
    {id:"tabShop", tab:"shop", icon:ICONS.shop, label:"Магазин"},
    {id:"tabFish", tab:"fish", icon:ICONS.fish, label:"Рыбалка"},
    {id:"tabJournal", tab:"journal", icon:ICONS.book, label:"Дневник"}
  ];
  for (const c of cfg){
    const el = $(c.id);
    el.innerHTML = c.icon + "<span>" + c.label + "</span>" + (c.badge ? '<i class="tabdot" id="questDot"></i>' : "");
    el.addEventListener("click", () => {
      if (c.tab === "fish"){ closeAllSheets(); return; }
      if (c.tab === "base") openSheet("sheetBase", renderBase);
      if (c.tab === "shop"){ openSheet("sheetShop", () => renderShop()); }
      if (c.tab === "quests") openSheet("sheetQuests", renderQuests);
      if (c.tab === "journal") openSheet("sheetJournal", renderJournal);
    });
  }
}
const openSheets = new Set();
/* 8.0: быстрая смена водоёма без похода на «Базу» — двойной тап по чипу водоёма */
function cycleLoc(){
  const keys = Object.keys(LOCATIONS);
  const li = levelInfo();
  const cur = keys.indexOf(save.loc);
  for (let i=1;i<=keys.length;i++){
    const k = keys[(cur+i)%keys.length];
    const L = LOCATIONS[k];
    if (li.lvl < L.unlock) continue;
    if (L.seaReq && !rodDef().sea) continue;
    save.loc = k; save.weather = null; rollWeather();
    G.spot = null; setState("idle"); updateChips(); persist();
    if (k === "winter") setTimeout(startDrill, 380);
    sfx.tap();
    toast(L.name, "Точка сброшена. Своё время: " + (DAYTIME[locMech(k).window]||DAYTIME.day).name +
      (windowOn(k) ? " — и оно сейчас!" : ""), 2000);
    return k;
  }
  toast("Других водоёмов пока нет", "Открывай новые — они ждут на «Базе».", 1600);
  return null;
}
function openSheet(id, render){
  closeAllSheets();
  if (render) render();
  $(id).classList.add("on");
  openSheets.add(id);
  updateTabState();
  if (typeof renderGearBar === "function"){ renderGearBar(); syncGearbarVisibility(); }
}
function closeAllSheets(){
  document.querySelectorAll(".sheet.on").forEach(s => s.classList.remove("on"));
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("on"));
  openSheets.clear();
}

/* ============================================================
   8.0: мини-карта восьми водоёмов на «Базе»
   «географическая» карта: каждый водоём — свой уголок мира
   ============================================================ */
const LOC_XY = {
  lake:     {x:0.30, y:0.30}, river:    {x:0.53, y:0.22}, night:   {x:0.24, y:0.55},
  winter:   {x:0.62, y:0.44}, sea:      {x:0.84, y:0.62}, swamp:   {x:0.44, y:0.77},
  mountain: {x:0.74, y:0.18}, lagoon:   {x:0.71, y:0.85}
};
const LOC_ICON = {
  lake:"~", river:"≈", night:"☾", winter:"✳", sea:"≈≈", swamp:"✤", mountain:"▲", lagoon:"❋"
};
function renderLocMap(){
  const box = $("locMap");
  if (!box) return;
  const li = levelInfo();
  const keys = Object.keys(LOCATIONS);
  // линии-«маршруты» между соседними водоёмами
  const routes = [["lake","river"],["river","mountain"],["lake","night"],["night","winter"],
                  ["river","winter"],["winter","sea"],["sea","lagoon"],["night","swamp"],["swamp","lake"]];
  const s = clamp(Math.min(W,H)/620, 0.7, 1.3);
  const pts = routes.map(([a,b]) => {
    const A = LOC_XY[a], B = LOC_XY[b];
    return '<line x1="'+(A.x*100)+'" y1="'+(A.y*100)+'" x2="'+(B.x*100)+'" y2="'+(B.y*100)+'" />';
  }).join("");
  const dots = keys.map(k => {
    const L = LOCATIONS[k], P = LOC_XY[k];
    const locked = li.lvl < L.unlock;
    const sea = L.seaReq && !rodDef().sea;
    const act = save.loc === k;
    const on = windowOn(k);
    const wv = waveOn(k);                    // 8.5: у водоёма идёт выход рыбы
    return '<button class="mapDot'+(act?" on":"")+(locked?" locked":"")+(sea?" sea":"")+(on?" win":"")+(wv?" wave":"")+
      '" data-map="'+k+'" style="left:'+(P.x*100)+'%;top:'+(P.y*100)+'%">' +
      '<span class="md-ico">'+(LOC_ICON[k]||"~")+'</span>' +
      '<span class="md-name">'+L.short+'</span>' +
      (locked ? '<span class="md-lvl">'+L.unlock+'</span>' : wv ? '<span class="md-wave">выход</span>' : on ? '<span class="md-win">сейчас</span>' : '') +
      '</button>';
  }).join("");
  box.innerHTML =
    '<div class="mapHead"><b>'+ICONS.map+' Карта водоёмов</b>' +
      '<span>'+Object.keys(save.locsCaught||{}).length+' из '+keys.length+' освоено · тап — перейти</span></div>' +
    '<div class="mapWrap"><svg class="mapLinks" viewBox="0 0 100 100" preserveAspectRatio="none">'+pts+'</svg>'+dots+'</div>';
  // 8.5: после открытия карты полоска прогноза должна быть свежей
  if (typeof renderForecast === "function") setTimeout(renderForecast, 0);
  box.querySelectorAll("[data-map]").forEach(b => {
    b.addEventListener("click", () => {
      const k = b.dataset.map, L = LOCATIONS[k];
      if (li.lvl < L.unlock){ toast("Закрыто", "«"+L.name+"» откроется на "+L.unlock+" уровне.", 1700); return; }
      if (L.seaReq && !rodDef().sea){ toast("Нужна морская снасть", "Купи «Морской троллинг» — и вода откроется.", 2200); return; }
      if (save.loc !== k){
        save.loc = k; save.weather = null; rollWeather(); G.spot = null; setState("idle");
        updateChips(); persist();
        if (k === "winter") setTimeout(startDrill, 400);
        sfx.tap();
        const m = locMech(k);
        toast(L.name, m.tip + (windowOn(k) ? " Сейчас — лучшее время!" : ""), 2600);
      }
      renderBase();
    });
  });
}

/* ---------------- база ---------------- */
/* чипы «характера» водоёма: вода, течение, зацепы, окно, прикормка */
function locMechRow(key){
  const m = locMech(key);
  const on = windowOn(key);
  const waterName = {calm:"спокойная вода", river:"быстрое течение", dark:"тёмная вода",
    ice:"лёд", salt:"солёная вода", brown:"вязкая вода", clear:"прозрачная вода", turquoise:"тёплая бирюза"}[m.water] || "вода";
  const chips = [];
  chips.push('<span class="mchip water">'+waterName+'</span>');
  if (m.stream >= 0.4) chips.push('<span class="mchip stream">'+ICONS.wave+' течение '+m.stream.toFixed(1)+'</span>');
  // 8.6: зацепы и дно — из профиля точек, а не из «характера водоёма»
  const tbl = SPOT_ENV[key] || {};
  const worstSnag = Math.max.apply(null, Object.keys(tbl).map(id => {
    const se = tbl[id];
    return (0.20 + 0.80 * (locEnv(key).snagBase || 0.10)) * (0.35 + 0.65 * se.cover) * 1.25;
  }).concat([0]));
  if (worstSnag > 0.06) chips.push('<span class="mchip snag">'+ICONS.knot+' зацепы до '+Math.round(Math.min(0.42, worstSnag)*100)+'%</span>');
  const bots = [...new Set(Object.keys(tbl).map(id => ECO_BOT_RU[tbl[id].bottom]).filter(Boolean))];
  if (bots.length) chips.push('<span class="mchip bot">'+ICONS.fish+' дно: '+bots.slice(0,3).join(", ")+'</span>');
  chips.push('<span class="mchip win'+(on ? " on" : "")+'">'+ICONS.clock+' '+(DAYTIME[m.window]||DAYTIME.day).name+(on ? " · сейчас" : "")+'</span>');
  chips.push('<span class="mchip hand">'+ICONS.feed+' прикормка '+(m.hand ? m.hand.coins : 12)+'</span>');
  return '<div class="locMech">'+chips.join("")+'</div>';
}

/* ---- 8.5: панель прогноза на «Базе» -------------------------------------
   Одна карточка «как сейчас клюёт» и полоска ближайших часов с буями.
   Всё честно: считается из тех же множителей, что и сама поклёвка. */
function renderForecast(){
  const box = $("forecastBox");
  if (!box) return;
  const f = biteForecast(save.loc);
  const on = waveOn(save.loc);
  const hours = waveForecast(save.loc, 6);
  const nowH = new Date().getHours();
  const pct = Math.round(f.score * 100);
  const col = f.def.color;
  const bar = '<div class="fc-bar"><i style="width:' + pct + '%;background:linear-gradient(90deg,' +
    col + '55,' + col + ')"></i></div>';
  const why = f.why.map(w => {
    const bad = /не своё|мешает/.test(w);
    return '<span class="' + (bad ? "bad" : "good") + '">' + w + '</span>';
  }).join("");
  box.innerHTML =
    '<div class="fc-head"><b>' + ICONS.bolt + ' Прогноз клёва</b><span>' +
      (on ? "выход рыбы · " + waveMinsLeft() + " мин" : "выход через " + fmtMins(waveIn(save.loc))) + '</span></div>' +
    '<div class="fc-card">' +
      '<div class="fc-now">' +
        '<div class="dot" style="color:' + col + ';background:' + col + '1f;border-color:' + col + '55">' +
          pct + '<small style="font-size:8px">%</small></div>' +
        '<div class="ttl"><b style="color:' + col + '">' + f.def.name + '</b>' +
          '<small>' + locDef().name + ' · ' + (DAYTIME[dayTimeNow()] || DAYTIME.day).name +
          (on ? ' · выход' : '') + '</small></div>' +
      '</div>' + bar +
      (why ? '<div class="fc-why">' + why + '</div>' : "") +
      '<div class="fc-hours">' + hours.map(h =>
        '<div class="fc-h' + (h.on ? " wave" : "") + (h.h === nowH ? " now" : "") + '">' +
          '<b>' + String(h.h).padStart(2,"0") + ':00</b><small>' + (h.on ? "выход" : "—") + '</small></div>').join("") +
      '</div>' +
      '<div class="fc-note">' + (on
        ? "Выход рыбы идёт: поклёвки почти вдвое быстрее, рыба крупнее. Самое время бросать."
        : "Выход рыбы — час активности водоёма. В прогнозе часы, когда он начнётся: приходи к этому времени.") +
      '</div>' +
    '</div>';
  box.querySelectorAll(".fc-h.wave").forEach(el => el.addEventListener("click", () => {
    sfx.tap();
    toast("Выход рыбы", "В этот час у водоёма «час активности»: клёв ×" + Math.round(1/BITE_WAVE.klyov*10)/10 +
      " быстрее, рыба +" + Math.round((BITE_WAVE.size-1)*100) + "% к весу.", 2400);
  }));
}

function renderBase(){
  const li = levelInfo();
  renderForecast();
  renderLocMap();
  const list = $("locList");
  list.innerHTML = "";
  for (const key in LOCATIONS){
    const L = LOCATIONS[key];
    const locked = li.lvl < L.unlock;
    const active = save.loc === key;
    const card = document.createElement("div");
    card.className = "locCard" + (locked ? " locked" : "") + (active ? " active" : "");
    card.dataset.loc = key;
    card.innerHTML =
      '<div class="photo" style="background-image:url('+IMG[LOC_BG[key]]+')"></div>' +
      '<div class="veil"></div>' +
      (locked
        ? '<div class="lockPill">'+ICONS.lock+' с '+L.unlock+' уровня</div>'
        : active ? '<div class="badgeOn">'+ICONS.check+' здесь</div>' : '') +

      '<div class="inner">' +
        '<div class="locTop"><h3>'+L.name+'</h3></div>' +
        '<p>'+L.desc+'</p>' +
        '<div class="tags">' +
          '<span class="tag lvl'+(locked ? " off" : "")+'">'+(locked ? ICONS.lock : ICONS.map)+' '+(locked ? "с " : "")+L.unlock+' ур.</span>' +
          '<span class="tag trunc">'+L.sub+'</span>' +
          '<span class="tag gold">'+ICONS.bolt+' ×'+L.pullMul.toFixed(2)+'</span>' +
          '<span class="tag green">'+L.sizeMul.toFixed(2)+'×</span>' +
        '</div>' +
        locMechRow(key) +
        '<div class="echoBox"><div class="echoHead"><b>' + ICONS.echo + ' Эхолот · карта глубин</b>' +
          '<span>вода ' + waterTemp(key, 2) + ' °C · ' + (locEnv(key).type === "sea" || locEnv(key).type === "lagoon" ? "солёная" : "пресная") + '</span></div>' +
          echoMapSVG(key) + '</div>' +
        '<div class="echoBox layersBox"><div class="echoHead"><b>' + ICONS.gauge +
          ' Слои воды · термоклин</b><span>' + (iceNow(key) ? "подо льдом" : "темп. по глубине") + '</span></div>' +
          waterLayersSVG(key) + '</div>' +
      '</div>';
    /* наживка дня и лучший день именно для этого водоёма */
    const bd = BAITS[baitOfDay(key)];
    const isBd = save.equipped.bait === baitOfDay(key);
    const locToday = LOC_DAY[key] === new Date().getDay();
    const left = daysToLocDay(key);
    card.querySelector(".tags").insertAdjacentHTML("beforeend",
      '<span class="tag baitday'+(isBd ? " on" : "")+'">'+ICONS.bait+' '+bd.name+(isBd ? " · надето" : "")+'</span>');
    if (locToday){
      card.querySelector(".tags").insertAdjacentHTML("beforeend",
        '<span class="tag locdaytag">'+ICONS.star+' лучший день +'+Math.round((LOC_DAY_K.klyov-1)*100)+'%</span>');
    }
    // кто водится в этом водоёме
    const set = new Set();
    for (const sp of L.spots) for (const k in sp.w) set.add(k);
    const order = {mythic:0, legendary:1, epic:2, rare:3, uncommon:4, common:5};
    const all = [...set];
    const top = all.slice().sort((a,b) => (order[FISH[a].rar] - order[FISH[b].rar]) || (FISH[b].wMax - FISH[a].wMax)).slice(0,4);
    const more = all.length - top.length;
    // подсказка: что здесь ловится на надетую приманку и хватает ли удочки
    // снасть могла быть продана/сброшена — не падаем на неизвестной приманке
    const curBait = BAITS[save.equipped.bait] ? save.equipped.bait : "worm";
    const baitName = (BAITS[curBait] || {name:"приманку"}).name;
    const alive = all.filter(k => L.spots.some(sp => sp.w[k] && fishFit(k, sp, key) >= 0.35));
    const here = alive.filter(k => onBaitFor(FISH[k]));
    const powered = here.filter(k => FISH[k].reqPower <= rodDef().power);
    const baitSet = new Set(alive.map(k => (BAITS[FISH[k].bait]||{name:"?"}).name));
    const hintTxt = powered.length
      ? "На «"+baitName+"»: " + fishCount(powered.length)
      : here.length
        ? "На «"+baitName+"» нужна удочка сильнее"
        : "На «"+baitName+"» тут не берёт";
    card.querySelector(".inner").insertAdjacentHTML("beforeend",
      '<div class="locFish">' + top.map(k => '<img src="'+IMG.fish[artOf(k)]+'" style="filter:hue-rotate('+paletteFor(k).hue+'deg)" alt="'+FISH[k].name+'" title="'+FISH[k].name+'">').join("") +
      (more > 0 ? '<span>+' + fishCount(more) + '</span>' : '') + '</div>' +
      '<div class="locHint '+(powered.length?"ok":"warn")+'">'+hintTxt+'</div>' +
      '<div class="locBaits">Приманки: ' + [...baitSet].join(" · ") + '</div>' +
      '<div class="locDay">' + (locToday
        ? 'Сегодня лучший день: клёв +' + Math.round((LOC_DAY_K.klyov-1)*100) + '%, рыба крупнее, монет +' + Math.round((LOC_DAY_K.coins-1)*100) + '%'
        : 'Лучший день — ' + locDayName(key) + (left === 1 ? " (завтра)" : " (через " + left + " дн.)")) + '</div>');

    if (L.seaReq && !rodDef().sea){
      card.querySelector(".inner").insertAdjacentHTML("beforeend",
        '<div class="locHint warn">Нужна морская удочка — «Морской троллинг» и выше</div>');
    }
    // 8.0: дуэль доступна в «дуэльных» водоёмах (только участникам клуба)
    if (DUEL.locs[key]){
      const rv = duelRival(key);
      const ok = duelReady() && !locked && li.lvl >= rv.lvl;
      card.querySelector(".inner").insertAdjacentHTML("beforeend",
        '<button class="duelBtn' + (ok ? "" : " off") + '" data-duel="' + key + '">' +
          ICONS.swords + ' <b>Дуэль</b><span>' + rv.name + ' · 12 забросов · ' + ICONS.pearl + ' жемчуг</span></button>');
    }
    if (!locked){
      card.addEventListener("click", () => {
        if (L.seaReq && !rodDef().sea){
          toast("Солёная вода", "Обычная снасть не переживёт море. Купи «Морской троллинг» в магазине.", 2200);
          return;
        }
        if (save.loc !== key){
          save.loc = key; save.weather = null; rollWeather(); persist();
          G.spot = null; setState("idle"); updateChips();
          if (key === "winter") setTimeout(startDrill, 420);
          renderHandBtn(); renderDuelChip();
          if (!save.seenCoach || !save.seenCoach.c_loc){
            const m = locMech(key);
            toast("Новый водоём", m.tip, 3200);
            save.seenCoach = save.seenCoach || {}; save.seenCoach.c_loc = true; persist();
          }
          sfx.tap();
        }
        closeAllSheets();
        setState("idle");
      });
    } else {
      card.addEventListener("click", () => toast("Пока закрыто", "Водоём откроется на "+L.unlock+" уровне. Сейчас "+save.level+". Лови рыбу, чтобы качаться.", 1900));
    }
    list.appendChild(card);
  }

  list.querySelectorAll("button[data-duel]").forEach(b => {
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      const key = b.dataset.duel;
      const rv = duelRival(key);
      if (save.loc !== key){ save.loc = key; save.weather = null; rollWeather(); G.spot = null; setState("idle"); updateChips(); }
      startDuel();
    });
  });

  const gs = $("gearSummary");
  const rows = [
    ["rod",  save.equipped.rod],
    ["reel", save.equipped.reel],
    ["line", save.equipped.line],
    ["hook", save.equipped.hook],
    ["bait", save.equipped.bait],
    ["net",  save.equipped.net]
  ];
  gs.innerHTML = rows.map(([slot, id]) => {
    const def = SLOTS.find(s => s.id === slot);
    const item = tableFor(slot)[id] || Object.values(tableFor(slot))[0];
    return '<div class="item" style="margin-bottom:7px">'
      + '<div class="ico">'+ICONS[slot]+'</div>'
      + '<div class="txt"><b>'+item.name+'</b><small>'+def.name+' · ур. '+item.tier+'</small></div>'
      + '</div>';
  }).join("");
}

/* ---------------- магазин ---------------- */
let shopSlot = "rod";
function renderShop(){
  const seg = $("shopSeg");
  seg.innerHTML = SLOTS.map(s =>
    '<button class="seg'+(shopSlot===s.id?" on":"")+'" data-slot="'+s.id+'">'+ICONS[s.id]+'<span>'+s.name+'</span></button>'
  ).join("");
  seg.querySelectorAll(".seg").forEach(b => b.addEventListener("click", () => { shopSlot = b.dataset.slot; sfx.tap(); renderShop(); }));

  const def = SLOTS.find(s => s.id === shopSlot);
  const table = tableFor(shopSlot);
  const list = $("itemList");
  const li = levelInfo();
  list.innerHTML = "";
  const ids = Object.keys(table).sort((a,b) => table[a].tier - table[b].tier);

  const stat = (it, id) => {
    switch (shopSlot){
      case "rod":  return [["прочность", it.power], ["ловит рыбу силой до", it.reqPower], ["крупняк до", roundKg(it.reqPower*19) + " кг"], [it.sea ? "море" : "пресная", it.sea ? "да" : "нет"]];
      case "line": return [["прочность", it.power], ["крупняк до", roundKg(it.power*19) + " кг"], ["зона", Math.round(it.hi*100)+"%"]];
      case "reel": return [["скорость", "×"+it.speed.toFixed(2)], ["плавность", "×"+it.gain.toFixed(2)]];
      case "hook": return [["окно", "×"+it.windowMul.toFixed(2)], ["засечка", "+"+Math.round(it.hookChance*100)+"%"]];
      case "net":  return [["слабина", "×"+it.netSlack.toFixed(2)], ["подъём", "×"+it.progress.toFixed(2)]];
      case "bait": return [["цена", it.price + " / шт"], ["рыб", fishCount(Object.keys(FISH).filter(k => FISH[k].bait === id).length)], ["запас", baitsLeft(id) + " шт"]];
    }
    return [];
  };

  for (const id of ids){
    const it = table[id];
    const owned = save.owned[shopSlot].includes(id);
    const equipped = save.equipped[shopSlot] === id;
    const isPrem = !!it.pearl;
    const canBuy = isPrem ? (save.pearl||0) >= it.pearl : save.coins >= it.price;
    // премиум — отдельный слой: покупается за жемчуг с любого уровня
    const lvlOk = isPrem ? true : li.lvl >= (it.lvl || 0);
    const locked = !owned && !lvlOk;

    const el = document.createElement("div");
    el.className = "item" + (equipped ? " equipped" : owned ? " owned" : "") + (locked ? " locked" : "") + (isPrem ? " premium" : "");
    const baitFish = shopSlot === "bait" ? Object.keys(FISH).filter(k => FISH[k].bait === id) : [];
    const famNames = shopSlot === "bait"
      ? (baitFish.length ? baitFish.slice(0,10).map(k => FISH[k].name).join(" · ") + (baitFish.length > 10 ? " и ещё " + (baitFish.length-10) : "") : "ни одна рыба не берёт")
      : "";
    el.innerHTML =
      '<div class="ico'+(isPrem?" prem":"")+'">'+ICONS[shopSlot]+'</div>' +
      '<div class="txt"><b>'+(isPrem?'<span class="premTag">PREMIUM</span>':'')+it.name+
        '<span class="tiers">'+[1,2,3,4,5,6,7,8].map(n=>'<i class="'+(n<=it.tier?"f":"")+'"></i>').join("")+'</span></b>' +
        '<small>'+it.desc+'</small>' +
        '<div class="stats">'+stat(it, id).map(([k,v]) => '<span>'+k+' <b>'+v+'</b></span>').join("")+'</div>' +
        (famNames ? '<div class="fam">'+famNames+'</div>' : '') +
        (shopSlot === "bait" && owned ? '<button class="restock">Докупить 20 шт · '+fmtNum(it.price*20)+ICONS.coin+'</button>' : '') +
      '</div>' +
      '<button class="buy '+(isPrem && !owned ? "prem" : equipped?"on":owned?"ghost":locked?"lock":"")+'" '+(equipped||locked||(!owned&&!canBuy)?"disabled":"")+'>' +
        (equipped ? ICONS.check + " надето"
         : locked ? ICONS.lock + " " + (it.lvl) + " ур."
         : owned ? "Надеть"
         : isPrem ? ICONS.pearl + " " + it.pearl
         : ICONS.coin + " " + fmtNum(it.price)) +
      '</button>';

    const rs = el.querySelector(".restock");
    if (rs) rs.addEventListener("click", (e) => {
      e.stopPropagation();
      if (save.coins < it.price*20){ toast("Не хватает монет", "Докупи приманку позже или выбери другую.", 1500); return; }
      save.coins -= it.price*20;
      save.baits[id] = baitsLeft(id) + 20;
      persist(); sfx.buy(); renderShop(); updateChips();
    });
    const btn = el.querySelector("button.buy");
    btn.addEventListener("click", () => {
      if (equipped || locked) return;
      if (owned && equipped && !isPrem){
        // повторный тап по надетому — просто закрыть меню (без сюрпризов)
      }
      if (!owned){
        if (isPrem){
          if ((save.pearl||0) < it.pearl){ toast("Не хватает жемчуга", "Жемчуг выпадает за трофеи, легенд и квесты.", 2000); return; }
          save.pearl -= it.pearl;
          save.owned[shopSlot].push(id);
          sfx.buy(); buzz(30);
          toast("Премиум открыт", it.name + " теперь твой навсегда.", 2200);
        } else {
          if (save.coins < it.price){ toast("Не хватает монет", "Поймай ещё рыбы или выбери приманку под рыбу.", 1600); return; }
          save.coins -= it.price;
          save.owned[shopSlot].push(id);
          if (shopSlot === "bait" && !baitsLeft(id)) save.baits[id] = 20;
          sfx.buy(); buzz(20);
        }
      } else sfx.tap();
      // надетым остаётся один предмет слота: прежний остаётся в коллекции, но снимается
      save.equipped[shopSlot] = id;
      persist(); updateChips(); renderShop();
      if (shopSlot === "line"){
        $("tensionZone").style.width = ((lineHI()-GREEN_LO)*100)+"%";
      }
      if (shopSlot === "rod" || shopSlot === "line") renderGearBar();
    });
    list.appendChild(el);
  }

  const note = document.createElement("div");
  note.style.cssText = "font-size:12px;color:rgba(243,236,221,.55);font-weight:650;line-height:1.5;margin:6px 2px 0";
  // премиум-блок
  const premRow = document.createElement("div");
  premRow.className = "premNote";
  const clubLine = premOwned()
    ? '<br><b style="color:#d9c9ff">Клуб: ур. ' + clubLvl() + ' / 5 · ' + clubRank().name +
      ' · ' + premCount() + '/' + PEARL_ITEMS.length + ' предметов</b>' +
      '<small>Перки: ' + [
        perk("pearl") ? "жемчуг +" + Math.round(perk("pearl")*100) + "%" : "",
        perk("xp") ? "опыт +" + Math.round(perk("xp")*100) + "%" : "",
        perk("bite") ? "поклёвка −" + Math.round(perk("bite")*100) + "%" : "",
        perk("coin") ? "монеты +" + Math.round(perk("coin")*100) + "%" : "",
        perk("big") ? "крупная рыба +" + Math.round(perk("big")*100) + "%" : "",
        perk("all") ? "размер рыбы +" + Math.round(perk("all")*100) + "%" : ""
      ].filter(Boolean).join(" · ") +
      '. Клубный плёс открыт на всех водоёмах' + (clubDayReady() ? ', набор ждёт в разделе «Квесты».' : '.') + '</small>'
    : '<br><b style="color:#d9c9ff">Преимущества клуба</b><small>Любой премиум-предмет даёт уровень клуба: ' +
      'перки (жемчуг, скорость поклёвки, монеты, крупная рыба), закрытый клубный плёс на каждом водоёме и ' +
      'ежедневный набор монет, опыта и жемчуга.</small>';
  premRow.innerHTML = ICONS.pearl + '<div><b>Жемчуг: ' + (save.pearl||0) + '</b>' +
    '<small>Жемчуг падает за трофеи, легенд и мифических рыб, а также за квесты. Премиум-предметы покупаются один раз и навсегда.</small>' +
    clubLine + '</div>';
  list.appendChild(premRow);
  note.textContent = shopSlot === "bait"
    ? "Каждая рыба берёт ТОЛЬКО свою приманку: за заброс тратится 1 шт. Кукуруза и хлеб дёшевы, креветка и краб — для трофеев."
    : "Рыба клюёт только на удочку нужной прочности и только на свою приманку. Снасти не расходуются — расходуется приманка.";
  list.appendChild(note);
}

/* ---------------- 9.1: витрина «Клубная карта» ---------------- */
function renderPaySheet(){
  const el = $("payBody");
  if (!el) return;
  const st = passCheck();
  const ready = payReady();
  const badge = st.ok
    ? '<span class="pay-state on">' + ICONS.check + 'активна · до ' + passEndText() + '</span>'
    : '<span class="pay-state off">' + ICONS.lock + 'не оформлена</span>';
  const head =
    '<div class="pay-hero">' +
      '<div class="pay-hero-t">' + ICONS.pearl + '<div><b>Клубная карта</b>' +
        '<small>Все привилегии клуба по подписке — без жемчуга и накоплений</small></div></div>' +
      badge +
    '</div>' +
    '<div class="pay-list">' + CLUB_PASS.perks.map((p, i) =>
      '<div class="pay-perk"><span class="pp-ico">' + ICONS[["pearl","bolt","coin","fish","map","star","swords"][i] || "star"] + '</span>' +
        '<div><b>' + p.title + '</b><small>' + p.text + '</small></div></div>').join("") + '</div>';

  const pk = CLUB_PASS.plans.map(p => {
    const active = st.ok && (save.pass || {}).plan === p.id;
    return '<button class="pay-plan' + (p.best ? " best" : "") + (active ? " active" : "") + '" data-plan="' + p.id + '">' +
      '<span class="pl-top"><b>' + p.label + '</b>' + (p.best ? '<i>выгодно</i>' : '') + '</span>' +
      '<span class="pl-price">' + p.price + '<small>₽</small></span>' +
      '<span class="pl-note">' + p.days + ' дней · ' + p.note + '</span>' +
      (active ? '<span class="pl-active">' + ICONS.check + 'твой тариф</span>' :
        p.old ? '<span class="pl-old">вместо ' + p.old + ' ₽</span>' : '<span class="pl-old">&nbsp;</span>') +
    '</button>';
  }).join("");

  const platform = ygOn() || vkOn();
  const foot =
    '<div class="pay-foot">' +
      (platform ? '' :
        '<div class="pay-code"><span>код игрока</span><b id="payCode">' + playerCode() + '</b>' +
          '<button class="pay-copy" id="payCopy" type="button">скопировать</button></div>') +
      '<button class="pay-buy" id="payBuy"' + (ready || platform ? "" : " disabled") + ' type="button">' +
        (ygOn() ? 'Оплатить через Яндекс' : vkOn() ? 'Оплатить голосами ВК' : ready ? 'Оплатить и открыть клуб' : 'Оплата скоро подключится') + '</button>' +
      (platform ? '<button class="pay-ad" id="payAd" type="button">Посмотреть рекламу — +15 жемчуга</button>' : '') +
      '<button class="pay-check" id="payCheck" type="button"' + (ready || platform ? "" : " disabled") + '>' +
        'Уже оплатил — проверить покупку</button>' +
      '<div class="pay-help">' + CLUB_PASS.help.map(x => '<p>' + x + '</p>').join("") + '</div>' +
      '<div class="pay-alt">Не хочешь подписку? Премиум-предметы за жемчуг по-прежнему открывают клуб навсегда.</div>' +
    '</div>';

  el.innerHTML = head +
    '<div class="pay-sec">Тариф</div><div class="pay-plans">' + pk + '</div>' + foot;

  let planPick = (save.pass && save.pass.plan) || "month";
  el.querySelectorAll(".pay-plan").forEach(b => b.addEventListener("click", () => {
    planPick = b.dataset.plan;
    el.querySelectorAll(".pay-plan").forEach(x => x.classList.toggle("active", x === b));
    sfx.tap();
  }));
  const copy = $("payCopy");
  if (copy) copy.addEventListener("click", async () => {
    const code = playerCode();
    try { await navigator.clipboard.writeText(code); copy.textContent = "скопировано"; }
    catch(_){ copy.textContent = code; }
    setTimeout(() => { const c = $("payCopy"); if (c) c.textContent = "скопировать"; }, 1600);
  });
  const buy = $("payBuy");
  if (buy) buy.addEventListener("click", () => {
    if (!payReady() && !ygOn() && !vkOn()){ payStart(planPick); return; }
    sfx.tap();
    payStart(planPick);
  });
  const adBtn = $("payAd");
  if (adBtn) adBtn.addEventListener("click", async () => {
    sfx.tap();
    const r = ygOn() ? await ygAd("rewarded") : await vkAd("rewarded");
    if (r.ok){
      save.pearl = (save.pearl || 0) + 15;
      persist(); updateChips(); syncPassBtn();
      toast("Спасибо!", "+15 жемчуга за просмотр.", 2200);
    } else toast("Реклама не показалась", "Попробуй позже — награда никуда не денется.", 2200);
  });
  const chk = $("payCheck");
  if (chk) chk.addEventListener("click", () => { payCheck(true); });
}

/* открыть раздел «Клубная карта» из любого места */
function openPaySheet(){
  closeAllSheets();
  openSheet("sheetPay", renderPaySheet);
  sfx.tap();
}

/* ---------------- квесты: интерфейс ---------------- */
let qChapter = "all";
function questRewardText(r){
  const p = [];
  if (r.coins) p.push('<span class="rw coins">'+ICONS.coin + r.coins+'</span>');
  if (r.xp) p.push('<span class="rw xp">'+ICONS.star + r.xp+'</span>');
  // защита от опечаток в таблице квестов: неизвестный предмет просто не показываем
  if (r.rod && RODS[r.rod]) p.push('<span class="rw item">'+ICONS.rod + RODS[r.rod].name+'</span>');
  if (r.line && LINES[r.line]) p.push('<span class="rw item">'+ICONS.line + LINES[r.line].name+'</span>');
  if (r.bait && BAITS[r.bait]) p.push('<span class="rw item">'+ICONS.bait + r.baitN+'×'+BAITS[r.bait].name+'</span>');
  return p.join("");
}
/* клубная карточка: уровень, перки и ежедневный набор */
function renderClubCard(){
  const el = $("clubCard");
  if (!el) return;
  const lvl = clubLvl(), rank = clubRank();
  const ready = clubDayReady();
  const nextLvl = Math.min(5, lvl + 1);
  const nextRank = CLUB_RANKS[nextLvl];
  const cnt = premCount();
  const rw = clubDayReward();
  const needForNext = lvl === 0 ? "нужен первый премиум-предмет"
    : lvl >= 5 ? "высший уровень, все перки открыты"
    : "ещё " + (5 - cnt) + " " + plur(5 - cnt, "предмет", "предмета", "предметов") +
      " до ранга «" + CLUB_RANKS[5].name + "»";
  const perkRow = (key, label, val) =>
    '<span class="club-perk'+(val > 0 ? "" : " off")+'">'+ICONS.star+
      label + (val > 0 ? " +" + Math.round(val*100) + "%" : "")+'</span>';
  const perks = clubAccess()
    ? perkRow("pearl","жемчуг за улов", perk("pearl")) +
      perkRow("xp","опыт", perk("xp")) +
      perkRow("bite","скорость поклёвки", perk("bite")) +
      perkRow("coin","монеты", perk("coin")) +
      perkRow("big","крупная рыба", perk("big")) +
      perkRow("all","размер рыбы", perk("all"))
    : '<span class="club-perk off">перки откроются после первой покупки</span>';
  /* новый день — счётчики дня заново */
  if (save.doubleDay !== todayKey()){ save.doubleDay = todayKey(); save.doublesToday = 0; }
  /* клубная цель дня: новый день — счёт заново */
  if (save.clubGoalDay !== todayKey()){ save.clubGoal = 0; save.clubGoalDone = false; }
  const gReady = clubAccess() && (save.clubGoalDay === todayKey() ? (save.clubGoal||0) >= CLUB_GOAL.count : false);
  const gDone = clubAccess() && !!save.clubGoalDone;
  const gCur = save.clubGoalDay === todayKey() ? (save.clubGoal||0) : 0;
  const goalRow = clubAccess()
    ? '<div class="club-goal'+(gReady ? " ready" : gDone ? " done" : "")+'">' +
        '<div class="cg-top">' + ICONS.bolt + '<b>Цель дня: 3 рыбы на плёсе</b>' +
          '<i>' + (gDone ? "выполнено" : Math.min(gCur, CLUB_GOAL.count) + "/" + CLUB_GOAL.count) + '</i></div>' +
        '<div class="cg-bar"><i style="width:' + Math.round((gDone ? 1 : Math.min(gCur, CLUB_GOAL.count)/CLUB_GOAL.count)*100) + '%"></i></div>' +
        (gReady
          ? '<button class="cg-btn" id="clubGoalBtn">Забрать +' + CLUB_GOAL.coins + ' монет, +' + CLUB_GOAL.pearl + ' жемчуг</button>'
          : '<small>Награда: +' + CLUB_GOAL.coins + ' монет, +' + CLUB_GOAL.xp + ' опыта, +' + CLUB_GOAL.pearl + ' жемчуг</small>') +
      '</div>'
    : "";
  el.className = "clubcard" + (clubAccess() ? "" : " locked");
  el.innerHTML =
    '<div class="club-head">' +
      '<div class="club-medal">'+ICONS.pearl+'</div>' +
      '<div class="club-title">Премиум-клуб<small>'+(clubAccess()
          ? rank.name + (passOn() ? " · карта до " + passEndText() : "")
          : "закрыт · карта или предмет за жемчуг")+'</small></div>' +
      '<div class="club-lvl">'+(premOwned() ? "ур. "+lvl+" / 5" : "нет доступа")+
        (premOwned() ? '<small>' + cnt + ' из ' + PEARL_ITEMS.length + ' предметов</small>' : '')+'</div>' +
    '</div>' +
    '<div class="club-perks">'+perks+'</div>' +
    goalRow +
    (premOwned()
      ? '<button class="club-btn'+(ready ? " ready" : "")+'" id="clubDayBtn"'+(ready ? "" : " disabled")+'>' +
          (ready ? "Забрать клубный набор" : "Набор забран · новый через " + dayLeft()) + '</button>' +
        '<div class="club-foot">Набор ранга: +'+rw.coins+' монет, +'+rw.xp+' опыта, +'+rw.pearl+
          ' жемчуг, приманки. На плёсе раз в сутки — клубный случай и бонус за точный заброс.' +
          '<br><b>Дальше:</b> '+needForNext+'.</div>'
      : '<button class="club-btn" id="clubPayBtn">Открыть «Клубную карту»</button>' +
        '<div class="club-foot">Карта открывает уровень клуба, перки, клубный плёс на всех водоёмах ' +
          'и ежедневный набор. Хочешь навсегда — есть премиум-предметы за жемчуг.</div>');
  const gb = $("clubGoalBtn");
  if (gb) gb.addEventListener("click", claimClubGoal);
  const b1 = $("clubDayBtn");
  if (b1) b1.addEventListener("click", () => { claimClubDay(); });
  const b2 = $("clubShopBtn");
  if (b2) b2.addEventListener("click", () => { closeAllSheets(); openSheet("sheetShop", () => renderShop()); });
  const b3 = $("clubPayBtn");
  if (b3) b3.addEventListener("click", openPaySheet);
}

function renderQuests(){
  const list = $("qList");
  if (!list) return;
  const doneAll = QUESTS.filter(q => questDone(q.id)).length;
  $("qSub").textContent = "Выполнено " + doneAll + " из " + QUESTS.length +
    " · рыб в дневнике " + Object.keys(save.caught).length + "/" + Object.keys(FISH).length;

  // ежедневные
  const tasks = dailyNow();
  const daily = $("qDaily");
  if (daily){
    const left = tasks.filter(t => !(save.daily.done||{})[t.id]).length;
    daily.innerHTML = '<div class="dailyHead">'+ICONS.bolt+' Цели дня <i>'+(3-left)+'/3</i></div>' +
      tasks.map(t => {
        const p = dailyProg(t), claimed = !!(save.daily.done||{})[t.id];
        const ready = p.cur >= p.max && !claimed;
        return '<div class="dailyRow'+(claimed?" claimed":"")+(ready?" ready":"")+'">' +
          '<div class="dtxt"><b>'+t.text+'</b>' +
            '<div class="dbar"><i style="width:'+Math.round(p.cur/p.max*100)+'%"></i></div>' +
            '<small>'+p.cur+' / '+p.max+' · +'+t.coins+' монет, +'+t.xp+' опыта</small></div>' +
          (claimed ? '<span class="dclaim done">'+ICONS.check+'</span>'
                   : ready ? '<button class="dclaim" data-daily="'+t.id+'">Забрать</button>'
                           : '<span class="dclaim wait">…</span>') +
        '</div>';
      }).join("");
    daily.querySelectorAll("button[data-daily]").forEach(b =>
      b.addEventListener("click", () => claimDaily(b.dataset.daily)));
  }

  renderClubCard();

  // главы
  const chap = $("qChapters");
  if (chap){
    const chapters = ["all"].concat(CHAPTER_ORDER.filter(c => QUESTS.some(q => q.chapter === c)));
    chap.innerHTML = chapters.map(c => {
      const list = c === "all" ? QUESTS : QUESTS.filter(q => q.chapter === c);
      const done = list.filter(q => questDone(q.id)).length;
      const ready = list.some(q => questClaimable(q));
      return '<button class="chipf'+(qChapter===c?" on":"")+(ready?" ready":"")+'" data-chap="'+c+'">' +
        (c==="all" ? "Все" : c) + ' <i>'+done+'/'+list.length+'</i></button>';
    }).join("");
    chap.querySelectorAll(".chipf").forEach(b => b.addEventListener("click", () => {
      qChapter = b.dataset.chap; sfx.tap(); renderQuests();
    }));
  }

  const shown = QUESTS.filter(q => qChapter === "all" || q.chapter === qChapter);
  list.innerHTML = shown.map(q => {
    const p = questProgress(q), done = questDone(q.id), ready = questClaimable(q);
    const pct = Math.round(p.cur / p.max * 100);
    return '<div class="qcard'+(done?" done":"")+(ready?" ready":"")+'">' +
      '<div class="qtop"><b>'+q.title+'</b>' +
        '<span class="qchap">'+q.chapter+'</span></div>' +
      '<small class="qsub">'+q.sub+'</small>' +
      '<div class="qbar"><i style="width:'+pct+'%"></i></div>' +
      '<div class="qfoot"><span class="qnum">'+p.cur+' / '+p.max+'</span>' +
        '<span class="qrew">'+questRewardText(q.reward)+'</span></div>' +
      (done ? '<div class="qdoneTag">'+ICONS.check+' выполнено</div>'
            : ready ? '<button class="qclaim" data-q="'+q.id+'">Забрать награду</button>'
                    : '<div class="qtip">'+q.tip+'</div>') +
      '</div>';
  }).join("");
  list.querySelectorAll("button[data-q]").forEach(b =>
    b.addEventListener("click", () => claimQuest(b.dataset.q)));
}

/* окно «квест выполнен» */
let qdTimer = 0;
function showQuestDone(q){
  const el = $("questDone");
  if (!el) return;
  clearTimeout(qdTimer);
  qdTimer = setTimeout(()=>el.classList.remove("on"), 9000);
  el.querySelector(".qd-title").textContent = q.title;
  el.querySelector(".qd-sub").textContent = q.sub;
  el.querySelector(".qd-rew").innerHTML = questRewardText(q.reward);
  el.classList.add("on");
  el.querySelector(".qd-btn").onclick = () => {
    el.classList.remove("on");
    claimQuest(q.id);
  };
  el.querySelector(".qd-later").onclick = () => el.classList.remove("on");
  // тап по затемнению тоже закрывает окно, чтобы не блокировать игру
  el.onclick = (e) => { if (e.target === el) el.classList.remove("on"); };
  sfx.level();
}

/* ---------------- дневник ---------------- */
let jCat = "all", jQ = "", jShow = 24;
function renderJournal(){
  const grid = $("jgrid");
  const all = Object.keys(FISH);
  const got = all.filter(k => save.caught[k]).length;
  $("jSub").textContent = "Поймано видов: " + got + " из " + all.length +
    " · " + (save.total || 0) + " рыб всего";
  // отметки «новое» снимаем после просмотра
  setTimeout(()=>{
    let changed = false;
    for (const k in save.caught) if (save.caught[k].isNew){ delete save.caught[k].isNew; changed = true; }
    if (changed) persist();
  }, 2500);

  // фильтры по группам
  const cats = ["all"].concat(Object.keys(CAT_LABEL));
  const filt = $("jFilters");
  if (filt){
    filt.innerHTML = cats.map(c => {
      const cnt = c === "all" ? all.length : FISH_CAT[c].length;
      const has = c === "all" ? got : FISH_CAT[c].filter(k => save.caught[k]).length;
      return '<button class="chipf'+(jCat===c?" on":"")+'" data-cat="'+c+'">'
        + (c==="all" ? "Все" : CAT_LABEL[c]) + ' <i>'+has+'/'+cnt+'</i></button>';
    }).join("");
    filt.querySelectorAll(".chipf").forEach(b => b.addEventListener("click", () => {
      jCat = b.dataset.cat; jShow = 24; sfx.tap(); renderJournal();
    }));
  }

  const list = all.filter(k => (jCat === "all" || FISH_CAT_OF[k] === jCat) &&
    (!jQ || FISH[k].name.toLowerCase().includes(jQ)));

  const order = ["common","uncommon","rare","epic","legendary","mythic"];
  const byRar = {};
  for (const k of list) (byRar[FISH[k].rar] = byRar[FISH[k].rar] || []).push(k);
  const shown = list.slice(0, jShow).map(k => k);
  const shownSet = new Set(shown);

  let html = "";
  for (const r of order){
    const arr = (byRar[r] || []).filter(k => shownSet.has(k));
    if (!arr.length) continue;
    const full = byRar[r].length;
    html += '<div class="secTitle" style="grid-column:1/-1;margin:10px 2px 2px">'+RARITY[r].label+
      ' <span style="color:'+RARITY[r].color+'">'+arr.filter(k=>save.caught[k]).length+'/'+full+'</span></div>';
    html += arr.map(k => {
      const F = FISH[k], c = save.caught[k], R = RARITY[F.rar];
      const pal = paletteFor(k);
      return '<div class="jcard'+(c?" got":"")+'" data-fish="'+k+'">'
        + (c
            ? '<img src="'+IMG.fish[artOf(k)]+'" style="filter:hue-rotate('+pal.hue+'deg) saturate('+pal.sat+')" alt="">'
            : '<div class="sil">'+ICONS.fish+'</div>')
        + '<b>'+(c?F.name:"???")+'</b>'
        + '<small>'+(c?("×"+c.n+" · "+fmtKg(c.best)+" кг"):"не поймана")+'</small>'
        + '<div class="rar" style="color:'+R.color+'">'+R.label+'</div>'
        + '</div>';
    }).join("");
  }
  if (list.length > jShow){
    html += '<button class="moreBtn" id="jMore" style="grid-column:1/-1;margin:10px 0 0">Показать ещё '+
      Math.min(24, list.length - jShow)+' из '+(list.length-jShow)+'</button>';
  }
  grid.innerHTML = html;
  const more = $("jMore");
  if (more) more.addEventListener("click", () => { jShow += 24; sfx.tap(); renderJournal(); });

  // карточка вида по тапу
  grid.querySelectorAll(".jcard").forEach(el => el.addEventListener("click", () => showFishCard(el.dataset.fish)));

  $("stCasts").textContent = save.casts;
  $("stCaught").textContent = save.total;
  $("stBreaks").textContent = save.breaks;
  $("stLost").textContent = save.lost;
  $("stMass").textContent = (save.mass/1000).toFixed(1)+" кг";
  $("stBest").textContent = save.best ? fmtKg(save.best)+" кг" : "—";
  $("stCast").textContent = save.bestCast ? save.bestCast + "%" : "—";
}

/* подробная карточка вида: приманка, нужная удочка, водоёмы */
/* 8.6: ЭХОЛОТ — карта глубин открытого водоёма: изолинии 2/5/10 м, дно цветом.
   Это не «где рыба», а именно рельеф — как на настоящем эхолоте. */
function echoMapSVG(loc){
  const L = loc || save.loc;
  const spots = (LOCATIONS[L] || LOCATIONS.lake).spots;
  const tbl = SPOT_ENV[L] || {};
  const maxD = Math.max.apply(null, spots.map(sp => (tbl[sp.id] || {}).depth || 3));
  const BOT_C = {silt:"#8d7a4a", mud:"#6f5c3a", sand:"#d8c88f", gravel:"#a8a498",
    stone:"#8f9aa2", clay:"#b98a6a", shell:"#e0d9c6", reef:"#b48cd8"};
  const W = 300, Hh = 170;
  // раскладка: три точки в линию по своим x, но с нужным отступом от подписей
  const xs = spots.map(sp => 34 + sp.x * (W - 68));
  const ys = spots.map((sp, i) => 88 + (i - (spots.length - 1)/2) * 26);
  let svg = '<svg viewBox="0 0 ' + W + ' ' + Hh + '" style="width:100%;height:auto;display:block">';
  svg += '<defs><radialGradient id="ecG" cx="50%" cy="45%" r="75%">' +
    '<stop offset="0" stop-color="rgba(84,148,168,.26)"/><stop offset="1" stop-color="rgba(8,26,36,.6)"/>' +
    '</radialGradient></defs><rect x="0" y="0" width="' + W + '" height="' + Hh + '" rx="10" fill="url(#ecG)"/>';
  // изолинии: 2 / 5 / 10 м (условные «свалы» от центра)
  const rings = [[2, 0.42], [5, 0.70], [10, 0.96]];
  for (const [d, k] of rings){
    svg += '<ellipse cx="150" cy="92" rx="' + (140*k).toFixed(0) + '" ry="' + (58*k).toFixed(0) +
      '" fill="none" stroke="rgba(160,225,240,.18)" stroke-width="1" stroke-dasharray="5 6"/>';
  }
  // легенда изолиний — в углу, чтобы не наезжать на подписи точек
  svg += '<text x="12" y="' + (Hh - 10) + '" fill="rgba(190,235,245,.5)" font-size="7.5" font-family="sans-serif">' +
    'изолинии: 2 · 5 · 10 м</text>';
  // «луч» эхолота
  svg += '<path d="M150 92 L262 34" stroke="rgba(150,235,225,.22)" stroke-width="8" stroke-linecap="round"/>';
  for (let i=0;i<spots.length;i++){
    const sp = spots[i], e = tbl[sp.id] || {depth:3, bottom:"sand"};
    const r = 13 + 18 * Math.pow(e.depth / maxD, 0.55);
    const x = xs[i], y = ys[i];
    const c = BOT_C[e.bottom] || "#9aa";
    svg += '<circle cx="' + x.toFixed(0) + '" cy="' + y.toFixed(0) + '" r="' + r.toFixed(0) +
      '" fill="' + c + '" fill-opacity=".34" stroke="' + c + '" stroke-opacity=".85" stroke-width="1.2"/>';
    svg += '<circle cx="' + x.toFixed(0) + '" cy="' + y.toFixed(0) + '" r="2.2" fill="#ffe9a8"/>';
    // подпись: название над точкой, метры — внутри круга
    svg += '<text x="' + x.toFixed(0) + '" y="' + (y - r - 6).toFixed(0) +
      '" text-anchor="middle" fill="rgba(242,248,252,.92)" font-size="8.5" font-weight="700" font-family="sans-serif">' +
      sp.name + '</text>';
    svg += '<text x="' + x.toFixed(0) + '" y="' + (y + 9).toFixed(0) +
      '" text-anchor="middle" fill="rgba(18,32,26,.85)" font-size="8.5" font-weight="800" font-family="sans-serif">' +
      (e.depth >= 10 ? Math.round(e.depth) : (Math.round(e.depth*10)/10).toFixed(1).replace(".", ",")) + ' м</text>';
    svg += '<text x="' + x.toFixed(0) + '" y="' + (y + r + 12).toFixed(0) +
      '" text-anchor="middle" fill="rgba(210,235,245,.55)" font-size="7" font-family="sans-serif">' +
      (ECO_BOT_RU[e.bottom] || "") + '</text>';
  }
  svg += '</svg>';
  return svg;
}

/* 8.7б: видимый «разрез воды» — температура и кислород по горизонтам.
   Игрок видит, где летом прохладно и где дышит рыба, и куда ставить снасть. */
function waterLayersSVG(loc){
  const L = loc || save.loc;
  const lay = waterLayers(L);
  const Wd = 300, Hh = 44, pad = 6;
  const tMin = Math.min.apply(null, lay.map(x => x.temp)), tMax = Math.max.apply(null, lay.map(x => x.temp));
  const span = Math.max(0.8, tMax - tMin);
  let svg = '<svg viewBox="0 0 ' + Wd + ' ' + Hh + '" style="width:100%;height:auto;display:block">';
  svg += '<defs><linearGradient id="wlG" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#2f7f9c"/><stop offset="1" stop-color="#0a2230"/></linearGradient></defs>';
  svg += '<rect x="0" y="0" width="' + Wd + '" height="' + Hh + '" rx="9" fill="url(#wlG)"/>';
  const colW = (Wd - pad*2) / lay.length;
  lay.forEach((x, i) => {
    const k = clamp((x.temp - tMin) / span, 0, 1);               // холоднее — светлее, теплее — золотистее
    const cx = pad + colW*i + colW/2;
    const barH = 6 + 16 * k;
    svg += '<rect x="' + (pad + colW*i + 3).toFixed(1) + '" y="' + (Hh - 14).toFixed(1) +
      '" width="' + (colW - 6).toFixed(1) + '" height="' + barH.toFixed(1) + '" rx="3" fill="' +
      (k > 0.66 ? "rgba(255,196,96,.62)" : k > 0.33 ? "rgba(140,220,210,.52)" : "rgba(150,205,255,.52)") + '" stroke="rgba(255,255,255,.16)" stroke-width="0.8"/>';
    svg += '<text x="' + cx.toFixed(1) + '" y="13" text-anchor="middle" fill="rgba(240,250,255,.92)" ' +
      'font-size="7.5" font-weight="800" font-family="sans-serif">' +
      (x.temp >= 10 ? Math.round(x.temp) : (Math.round(x.temp*10)/10).toFixed(1).replace(".", ","))  + '°</text>';
    svg += '<text x="' + cx.toFixed(1) + '" y="' + (Hh - 2.5) + '" text-anchor="middle" fill="rgba(226,244,252,.82)" ' +
      'font-size="6.5" font-family="sans-serif">' +
      (x.depth >= 10 ? Math.round(x.depth) : (Math.round(x.depth*10)/10).toFixed(1).replace(".", ",")) + ' м</text>';
  });
  svg += '</svg>';
  return svg;
}

/* 8.6: «где искать» — глубина, грунт, течение и лучшее время для вида */
function fishWhereText(id){
  const E = FISH_ECO[id];
  if (!E) return "любая вода";
  const dep = E.dep[1] >= 12 ? "глубина " + Math.round(E.dep[0]) + "–" + Math.round(E.dep[2]) + " м"
    : "глубина " + (Math.round(E.dep[0]*10)/10).toFixed(1).replace(".", ",") + "–" +
      (Math.round(E.dep[2]*10)/10).toFixed(1).replace(".", ",") + " м";
  const bot = E.b.split("").map(c => ({s:"песок",g:"галька",c:"глина",i:"ил",m:"наилок",k:"камни",h:"ракушка",r:"риф"}[c])).filter(Boolean).join(", ");
  const flow = E.f[1] >= 0.9 ? "течение" : E.f[0] >= 0.4 ? "слабое течение" : "стоячая вода";
  const temp = "вода " + Math.round(E.t[0]) + "–" + Math.round(E.t[2]) + "°C";
  const lightTxt = E.l >= 0.5 ? "ночь" : E.l >= 0.15 ? "сумерки" : E.l <= -0.1 ? "день" : "любое время";
  return dep + " · " + bot + " · " + flow + " · " + temp + " · " + lightTxt;
}
function showFishCard(id){
  const F = FISH[id]; if (!F) return;
  const c = save.caught[id];
  const R = RARITY[F.rar], pal = paletteFor(id);
  const rod = rodDef();
  const bait = BAITS[F.bait];
  const rodOk = F.reqPower <= rod.power;
  const where = [];
  for (const lk in LOCATIONS){
    const L = LOCATIONS[lk];
    if (L.spots.some(sp => sp.w[id])) where.push(L.name);
  }
  const el = $("fishCard");
  el.querySelector(".fc-art").innerHTML =
    (c ? '<img src="'+IMG.fish[artOf(id)]+'" class="fishSwim" style="filter:hue-rotate('+pal.hue+'deg) saturate('+pal.sat+')">'
       : '<div class="sil" style="width:120px;height:120px">'+ICONS.fish+'</div>');
  el.querySelector(".fc-rar").textContent = R.label + " · " + CAT_LABEL[FISH_CAT_OF[id]];
  el.querySelector(".fc-rar").style.cssText = "background:"+R.bg+";color:"+R.color;
  el.querySelector(".fc-name").textContent = c ? F.name : "???";
  el.querySelector(".fc-note").textContent = c ? F.note : "Ещё не поймана. Подсказки ниже помогут.";
  el.querySelector(".fc-rows").innerHTML =
    '<div><small>Приманка</small><b>'+bait.name+'</b></div>' +
    '<div><small>Нужна удочка</small><b class="'+(rodOk?"ok":"warn")+'">сила '+F.reqPower+'</b></div>' +
    '<div><small>Вес</small><b>'+fmtKg(F.wMin)+'–'+fmtKg(F.wMax)+' кг</b></div>' +
    '<div><small>Цена</small><b>'+F.val+'/кг</b></div>' +
    '<div style="grid-column:1/-1"><small>Водоёмы</small><b>'+where.join(" · ")+'</b></div>' +
    '<div style="grid-column:1/-1"><small>Любимая точка</small><b>'+fishHomes(id, 3).map(h => h.name + " — " + h.locName).join(" · ")+'</b></div>' +
    '<div style="grid-column:1/-1"><small>Где искать</small><b>'+fishWhereText(id)+'</b></div>' +
    (c ? '<div><small>Поймано</small><b>×'+c.n+'</b></div><div><small>Рекорд</small><b>'+fmtKg(c.best)+' кг</b></div>' : "");
  el.classList.add("on");
}

/* ---------------- ввод ---------------- */
function isWaterPoint(x, y){
  const g = geo();
  // вода — вся область ниже линии горизонта (кнопки и панели перехватывают свои тапы сами)
  return y > g.surfaceY + 10 && y < H - 4 && x > W*0.02 && x < W*0.98;
}

function nearestSpot(x, y){
  const spots = locSpots();
  let best = null, bd = 1e9;
  for (const sp of spots){
    const pos = spotPos(sp);
    const d = Math.hypot(x - pos.x, y - pos.y);
    if (d < bd){ bd = d; best = sp; }
  }
  return bd < Math.min(W,H)*0.22 ? best : null;
}

/* после улова сцена коротко «перезаряжается», чтобы новый заброс не был мгновенным */
function castReady(){
  // G.clock — время непрерывного рендера, оно может отставать от реального,
  // поэтому готовность считаем по реальным часам
  if (!G.readyAtMs) return true;
  const left = G.readyAtMs - performance.now();
  if (left <= 0){ G.readyAtMs = 0; return true; }
  hint("Секунду… рыба успокаивается", true);
  return false;
}

function pressStart(x, y, fromButton){
  if (G.cardOpen) return;      // пока открыта карточка улова, сцена не принимает тапы
  audio();
  switch (G.state){
    case "idle": {
      if (!castReady()) break;
      // заброс в любое место воды: точки — лишь подсказка, куда рыба ходит чаще
      if (isWaterPoint(x, y)) castAt(x, y);
      else toast("Вода ниже", "Бросай в воду — по любому месту, а не только в кружки", 1500);
      break;
    }
    case "aim": {
      if (!castReady()) break;
      if (fromButton) { beginPower(); break; }
      if (isWaterPoint(x, y)) castAt(x, y);
      else beginPower();
      break;
    }
    case "power": break;
    case "waiting": {
      // 8.5: сигнальный шар важнее подёргивания — если он всплыл, тап забирает его
      if (BUOY.active && x != null){
        const d = Math.hypot(x - BUOY.x, y - BUOY.y);
        if (d < 58){ takeBuoy(); break; }
      }
      // подёргивание приманки (зимой — мормышки): рыба «оживает» и интерес растёт
      if (G.jigT <= 0){
        G.jigT = 0.42;
        G.jigCount = (G.jigCount || 0) + 1;
        ring(G.bobX);
        ring(G.bobX + 10);
        if (sfx.tap) sfx.tap();
        buzz(8);
        if (G.jigCount > 3){
          // перекормил: рыба отходит, интерес падает — дергать без конца невыгодно
          G.interest = clamp((G.interest || 0) - 0.12, 0.05, 0.95);
          G.waitDur = (G.waitDur || 0) + 0.45;
          hint("Хватит дёргать — рыба насторожилась", true);
        } else {
          G.interest = clamp((G.interest || 0) + 0.075, 0, 0.95);
          G.waitDur = Math.max(1.8, (G.waitDur || 0) - 0.38);
          hint(iceNow() ? "Мормышка играет…" : "Приманка играет…", true);
        }
      } else {
        hint("Дай приманке полежать секунду-другую", true);
      }
      break;
    }
    case "snag": snagTap("soft"); break;
    case "bite": hook(); break;
    case "fight": G.hold = true; break;
  }
}
function pressEnd(){
  if (G.state === "power") releasePower();
  else if (G.state === "fight") G.hold = false;
}

const actionBtn = $("action");
let btnDown = false;
let downAt = 0;
let pressedAt = 0, released = true;
function btnDownHandler(e){
  if (e.cancelable) e.preventDefault();
  if (G.cardOpen) return;
  if (!released && performance.now() - pressedAt > 350) released = true;   // страховка от потерянного отпускания
  if (!released) return;
  released = false; pressedAt = performance.now();
  btnDown = true; downAt = pressedAt;
  if (G.state === "snag"){ pressStart(0, 0, true); downAt = performance.now(); return; }
  if (G.state === "idle"){
    if (!castReady()) return;
    // кнопка бросает в середину воды, тап по воде — в выбранное место
    castAt(W*0.52, geo().surfaceY + (H - geo().surfaceY)*0.42, true);
    beginPower();
    return;
  }
  if (G.state === "aim"){ if (!castReady()) return; beginPower(); return; }
  pressStart(0, 0, true);       // в бою это «держать»
}
function btnUpHandler(e){
  if (e && e.cancelable) e.preventDefault();
  released = true; btnDown = false;
  // отпускание в фазе силы = заброс, в бою = прекратить тянуть
  if (G.state === "power") releasePower();
  else if (G.state === "fight") G.hold = false;
  else if (G.state === "snag"){
    // короткий тап — мягкое подёргивание, долгое удержание — сильный рывок
    if (performance.now() - downAt > 520) snagTap("yank");
  }
}
["pointerdown","touchstart","mousedown"].forEach(ev => actionBtn.addEventListener(ev, btnDownHandler, {passive:false}));
["pointerup","touchend","mouseup","pointercancel","touchcancel"].forEach(ev => actionBtn.addEventListener(ev, btnUpHandler));

cv.addEventListener("pointerdown", e => {
  e.preventDefault();
  const r = cv.getBoundingClientRect();
  // канва растянута на экран — переводим клиентские координаты в координаты сцены
  pressStart((e.clientX - r.left) * (W / r.width), (e.clientY - r.top) * (H / r.height));
  if (G.state === "snag") { downAt = performance.now(); btnDown = true; }
});
cv.addEventListener("pointerup", pressEnd);
cv.addEventListener("pointercancel", pressEnd);
window.addEventListener("pointerup", () => { if (btnDown){ btnDown = false; } pressEnd(); });
window.addEventListener("pointercancel", () => { btnDown = false; pressEnd(); });
window.addEventListener("blur", () => { btnDown = false; pressEnd(); });
// на всякий случай: перед новым нажатием по сцене сбрасываем «зажатие» кнопки
document.addEventListener("pointerdown", () => { if (btnDown){ btnDown = false; pressEnd(); } }, true);
window.addEventListener("contextmenu", e => e.preventDefault());

window.addEventListener("keydown", e => {
  if (e.repeat) return;
  if (e.code === "Space" || e.code === "Enter"){
    e.preventDefault();
    if ($("catchCard").classList.contains("on")){ nextCatch(); return; }
    pressStart(0, 0, true);
  }
  if (e.code === "KeyM"){ toggleSound(); }
  if (e.code === "Escape"){
    const anySheet = document.querySelector(".sheet.on");
    if (anySheet) closeAllSheets();
    else if (!START.on) openStart();
  }
});
window.addEventListener("keyup", e => {
  if (e.code === "Space" || e.code === "Enter") pressEnd();
});

function nextCatch(){
  G.cardOpen = false;
  $("catchCard").classList.remove("on");
  if (G.pendingLevel){
    const lvl = G.pendingLevel; G.pendingLevel = 0;
    setTimeout(()=>{ sfx.level(); toast("Уровень "+lvl+"!", unlockedText(lvl), 2800); }, 260);
  }
  setTimeout(checkQuestPopups, 700);
  if (G.spot){ G.tension = clamp(GREEN_LO+0.05,0,lineHI()-0.02); setState("aim"); }
  else setState("idle");
  // сцена «перезаряжается»: нельзя молниеносно кидать следующий заброс
  G.readyAtMs = performance.now() + 1800;
  setTimeout(()=>{ if (G.state === "aim" || G.state === "idle") hint(""); }, 1500);
  if (G.dayDouble){
    G.dayDouble = false;
    G.readyAtMs = 0;
    setTimeout(()=>{
      if (G.state !== "aim" && G.state !== "idle") return;
      floatText("ДВОЙНОЙ ЗАХОД", W*0.5, wY()-70, "#ffe9a3");
      toast("Наживка дня", "Рыба берёт снова — заброс уже в воде.", 2200);
      startWaiting();
    }, 420);
  }
}
$("btnNext").addEventListener("click", nextCatch);

/* 8.0: чип водоёма — короткий тап открывает «Базу», двойной — крутит водоёмы */
(function initChipLoc(){
  const chip = $("chipLoc");
  if (!chip) return;
  let t = 0, tapped = 0;
  chip.addEventListener("click", () => {
    const now = performance.now();
    if (now - t < 320){ tapped = 2; clearTimeout(pxTimer); cycleLoc(); return; }
    t = now; tapped = 1;
    pxTimer = setTimeout(() => { if (tapped === 1) openSheet("sheetBase", renderBase); }, 330);
  });
  let pxTimer = 0;
})();

/* ---- 8.0: прикормка, зацеп, дуэль — кнопки ---- */
(function initMech80(){
  const hi = $("handIco"); if (hi) hi.innerHTML = ICONS.feed;
  const si = $("snagIco"); if (si) si.innerHTML = ICONS.knot;
  const hb = $("handBtn");
  if (hb) hb.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); dropHand(); });
  const ok = $("btnDuelOk");
  if (ok) ok.addEventListener("click", () => { closeDuelCard(); sfx.tap(); });
  const dc = $("duelCard");
  if (dc) dc.addEventListener("click", (e) => { if (e.target === dc) closeDuelCard(); });
})();
/* кнопка прикормки видна только когда есть смысл: до заброса в своём окне или всегда до заброса */
function syncHandVisibility(){
  const b = $("handBtn");
  if (!b) return;
  const before = (G.state === "idle" || G.state === "aim");
  b.classList.toggle("on", before);
  b.classList.toggle("up", !before);
  renderHandBtn();
}

function toggleSound(){
  save.mute = !save.mute; persist(); updateChips();
  if (!save.mute) sfx.tap();
}
$("btnSound").addEventListener("click", toggleSound);

document.querySelectorAll("[data-close]").forEach(b =>
  b.addEventListener("click", () => {
    const id = b.dataset.close;
    const el = document.getElementById(id);
    if (el) el.classList.remove("on");
    if (id && id.startsWith("sheet")) closeAllSheets();
    sfx.tap();
  })
);
$("btnToShop").addEventListener("click", () => openSheet("sheetShop", renderShop));
const helpBase = $("btnHelpBase");
if (helpBase) helpBase.addEventListener("click", () => openSheet("sheetHelp", renderHelp));
const toStart = $("btnToStartBase");
if (toStart) toStart.addEventListener("click", () => {
  closeAllSheets();
  setTimeout(() => openStart(), 120);
});
const helpOk = $("btnHelpOk");
if (helpOk) helpOk.addEventListener("click", () => { const sh = $("sheetHelp"); if (sh) sh.classList.remove("on"); sfx.tap(); });

/* ---------------- справка ---------------- */
function renderHelp(){
  document.querySelectorAll("#sheetHelp .hrIco[data-ico]").forEach(sp => {
    const k = sp.dataset.ico;
    sp.innerHTML = ICONS[k] || ICONS.fish;
  });
  const el = $("helpSteps");
  if (!el) return;
  el.innerHTML = [
    ["1","<b>Бросай в любое место</b> воды: кружки (камыши, открытая вода, глубина) — лишь подсказка, где рыба ходит чаще. Чип под точкой покажет, сколько видов берёт твою приманку."],
    ["1б","<b>Поклёвку ждать придётся</b>: рыба присматривается 2–16 секунд — в зависимости от места, приманки и погоды. Пока ждёшь, можно 2–3 раза <b>подёргать приманку</b> (зимой — мормышку): интерес растёт, поклёвка приходит раньше. Совсем заждался — бросай в другое место."],
    ["2","<b>Смени приманку</b> в полоске снаряжения снизу — у каждой рыбы она своя."],
    ["3","<b>Поймай силу заброса:</b> отпусти, когда стрелка в зелёной зоне. Точно — клюёт чаще и крупнее."],
    ["4","<b>Подсеки</b>, когда над поплавком вспыхнет «!» и сожмётся кольцо."],
    ["5","<b>Вываживай:</b> держи палец, чтобы тянуть. Отпускай, когда натяжение уходит к красному."],
    ["6","<b>Зимой</b> сначала пробури лунку, а во время ожидания подёргивай мормышку — клёв приходит быстрее. После улова сцена коротко «перезаряжается» — новый заброс не мгновенный."],
    ["7","<b>Жемчуг</b> падает за редкую рыбу, за квесты и за победу в дуэли. За него в магазине берут премиум-снасти — навсегда."],
    ["8","<b>У каждого водоёма свой характер.</b> Течение тянет поплавок, в коряжнике снасть садится на зацеп, а в «своё» время суток клёв и рыба заметно лучше — всё написано в карточке водоёма."],
    ["9","<b>Прикормка</b> — кнопка у шкалы силы: за монеты клёв +35% и рыба крупнее на полторы минуты. Работает в том водоёме, где сыпал."],
    ["10","<b>Дуэль «стенка на стенку»</b>: в Топи, Горном озере и Лагуне вызывай соперника на 12 забросов. Побеждаешь по весу — жемчуг."],
    ["11","<b>Выход рыбы</b> — час активности водоёма: поклёвки почти вдвое быстрее, рыба крупнее. Смотри прогноз на «Базе» и чип в HUD, чтобы не пропустить. Во время буя у поплавка всплывает <b>сигнальный шар</b> — тапни по нему и забери монеты."],
    ["12","<b>Любимые места.</b> У каждого вида есть своя точка: бросай туда — он берёт чаще. Любимую точку видно в карточке вида в дневнике."],
    ["13","<b>Вода — как в жизни (8.6).</b> У каждой точки есть глубина в метрах, грунт (ил, песок, камни), трава и течение. Каждый вид держится в своих условиях: карась — у камыша на иле, судак — на песчаной бровке, форель — на камнях в холодной воде. Морская рыба в пресном озере не клюнет вовсе."],
    ["14","<b>Эхолот</b> на «Базе» в карточке водоёма показывает карту глубин: изолинии 2/5/10 м и грунт под каждой точкой. Подпись точки на воде тоже говорит глубину, а чип сверху — что под поплавком сейчас."]
  ].map(([n,t]) => '<div class="step"><div class="n">'+n+'</div><p>'+t+'</p></div>').join("")
}

/* ---------------- стартовый экран ---------------- */
/* ТИТУЛ: «пробный заброс» — своя механика загрузочного экрана.
   Зажми кружок — бежит стрелка силы; отпусти в золотой зоне — точный заброс.
   Три точных заброса = «глаз намётан», и игра сама зовёт на воду. */
const TITLE = {
  power: 0, run: false, dir: 1, sweet: [0.52, 0.68], stars: 0, tries: 0, toastT: 0,
  best: 0, flash: 0, castT: 0, lastRes: ""
};
const START = { on:false, cv:null, ctx:null, t:0, fishes:[], drops:[], clouds:[], ready:false, st:0 };
function initStart(){
  START.cv = $("startCv");
  if (!START.cv) return;
  START.ctx = START.cv.getContext("2d");
  // стайка рыб, силуэты которых плавают на фоне
  const keys = ["karas_zolotoy","okun","lesh","shchuka","karp","forel","taimen","sudak","som","salmon","tuna","cod","beluga","mako"];
  START.fishes = [];
  for (let i = 0; i < 6; i++){
    START.fishes.push({
      key: keys[(Math.random()*keys.length)|0],
      x: Math.random(), y: 0.54 + Math.random()*0.26,
      s: 0.34 + Math.random()*0.30, sp: 0.010 + Math.random()*0.014,
      dir: Math.random() < 0.5 ? 1 : -1, ph: Math.random()*6.28, a: 0.14 + Math.random()*0.14
    });
  }
  START.drops = [];
  for (let i = 0; i < 26; i++) START.drops.push({x:Math.random(), y:Math.random(), sp:0.05+Math.random()*0.12, r:0.6+Math.random()*1.4});
  START.clouds = [];
  for (let i = 0; i < 5; i++) START.clouds.push({x:Math.random(), y:0.05+Math.random()*0.2, s:0.5+Math.random()*0.9, sp:0.004+Math.random()*0.008});
  requestAnimationFrame(startFrame);
}
function startFrame(now){
  if (!START.on) return;
  const cv = START.cv, ctx = START.ctx;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = cv.clientWidth, h = cv.clientHeight;
  if (cv.width !== Math.round(w*dpr) || cv.height !== Math.round(h*dpr)){
    cv.width = Math.round(w*dpr); cv.height = Math.round(h*dpr);
  }
  START.t += 0.016;
  titleGaugeMove(0.016);
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,w,h);

  const horizon = h*0.46;
  // настоящий арт-фон с медленным наплывом
  const bg = images.bgSurface;
  if (bg && bg.complete && bg.naturalWidth){
    const zoom = 1.06 + Math.sin(START.t*0.06)*0.02;
    const ir = bg.naturalWidth/bg.naturalHeight, cr = w/h;
    let dw, dh;
    if (cr > ir){ dw = w*zoom; dh = dw/ir; } else { dh = h*zoom; dw = dh*ir; }
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.drawImage(bg, (w-dw)/2 + Math.sin(START.t*0.05)*w*0.012, (h-dh)/2 - h*0.01, dw, dh);
    ctx.restore();
  } else {
    const sky = ctx.createLinearGradient(0,0,0,horizon);
    sky.addColorStop(0, "#0a2230");
    sky.addColorStop(0.45, "#2a4a58");
    sky.addColorStop(0.78, "#a06a58");
    sky.addColorStop(1, "#f2b076");
    ctx.fillStyle = sky; ctx.fillRect(0,0,w,horizon);
  }

  // солнце у горизонта
  const sunX = w*0.66, sunY = horizon - h*0.055;
  const glow = ctx.createRadialGradient(sunX,sunY,2,sunX,sunY,h*0.42);
  glow.addColorStop(0,"rgba(255,236,180,.95)");
  glow.addColorStop(0.18,"rgba(255,190,110,.42)");
  glow.addColorStop(1,"rgba(255,150,80,0)");
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(sunX,sunY,h*0.42,0,Math.PI*2); ctx.fill();
  // на фото-фоне своё солнце: рисуем только мягкое ядро, а не «плоский кружок»
  if (!(bg && bg.complete && bg.naturalWidth)){
    ctx.beginPath(); ctx.arc(sunX,sunY,h*0.03,0,Math.PI*2);
    ctx.fillStyle = "rgba(255,248,220,.9)"; ctx.fill();
  }

  // облака-полосы
  for (const c of START.clouds){
    c.x += c.sp*0.016;
    if (c.x > 1.25) c.x = -0.3;
    const cw = w*0.34*c.s, ch = h*0.028*c.s;
    ctx.beginPath();
    ctx.ellipse(c.x*w, c.y*h, cw, ch, 0, 0, Math.PI*2);
    ctx.fillStyle = "rgba(255,220,190,"+(0.06+0.05*Math.sin(START.t*0.6+c.x*9))+")";
    ctx.fill();
  }

  // лёгкая дымка у горизонта
  const haze = ctx.createLinearGradient(0, horizon-h*0.06, 0, horizon+h*0.05);
  haze.addColorStop(0,"rgba(255,214,170,0)");
  haze.addColorStop(0.5,"rgba(255,214,170,.16)");
  haze.addColorStop(1,"rgba(255,214,170,0)");
  ctx.fillStyle = haze; ctx.fillRect(0, horizon-h*0.06, w, h*0.11);

  // затемнение воды снизу — под текстом
  const water = ctx.createLinearGradient(0,horizon,0,h);
  water.addColorStop(0,"rgba(6,22,28,0)");
  water.addColorStop(0.55,"rgba(6,22,28,.35)");
  water.addColorStop(1,"rgba(4,14,18,.82)");
  ctx.fillStyle = water; ctx.fillRect(0,horizon,w,h-horizon);

  // дорожка от солнца
  ctx.save();
  for (let i=0;i<18;i++){
    const yy = horizon + (i/18)*(h-horizon)*0.9;
    const spread = (i/18)*w*0.16;
    const alpha = 0.20*(1-i/20)*(0.6+0.4*Math.sin(START.t*1.6+i*0.9));
    ctx.fillStyle = "rgba(255,214,150,"+alpha+")";
    ctx.beginPath();
    ctx.ellipse(sunX + Math.sin(START.t*0.7+i)*w*0.012, yy, w*0.05+spread, Math.max(1,h*0.0035), 0, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.restore();

  // волны (лёгкие, поверх арта)
  for (let i=0;i<2;i++){
    ctx.beginPath();
    const y0 = horizon + h*0.10 + i*h*0.14;
    for (let x=0;x<=w;x+=8){
      const yy = y0 + Math.sin(x*0.012 + START.t*(0.8+i*0.25) + i)*h*0.006;
      x === 0 ? ctx.moveTo(x,yy) : ctx.lineTo(x,yy);
    }
    ctx.strokeStyle = "rgba(210,240,255,"+(0.035+i*0.012)+")";
    ctx.lineWidth = 1.2; ctx.stroke();
  }

  // силуэты рыб
  for (const f of START.fishes){
    const img = images.fish[f.key];
    if (!img || !img.complete || !img.naturalWidth) continue;
    f.x += f.sp * 0.016 * f.dir;
    if (f.x > 1.3){ f.x = -0.3; f.dir = 1; }
    if (f.x < -0.3){ f.x = 1.3; f.dir = -1; }
    const fw = w*0.30*f.s;
    const fh = fw*img.naturalHeight/img.naturalWidth;
    const yy = f.y*h + Math.sin(START.t*1.6+f.ph)*h*0.012;
    ctx.save();
    ctx.globalAlpha = f.a;
    ctx.translate(f.x*w, yy);
    ctx.rotate(Math.sin(START.t*2.2+f.ph)*0.06);
    ctx.scale(f.dir < 0 ? -1 : 1, 1);
    ctx.filter = "brightness(0.28) saturate(0.55) blur(0.4px)";
    ctx.drawImage(img, -fw/2, -fh/2, fw, fh);
    ctx.restore();
  }

  // пузырьки
  for (const d of START.drops){
    d.y -= d.sp*0.016;
    if (d.y < horizon/h + 0.02) { d.y = 1; d.x = Math.random(); }
    ctx.beginPath();
    ctx.arc(d.x*w, d.y*h, d.r, 0, Math.PI*2);
    ctx.fillStyle = "rgba(200,240,255,"+(0.10+0.12*Math.sin(START.t*2+d.x*10))+")";
    ctx.fill();
  }

  /* пробный заброс: поплавок летит в воду после отпускания */
  if (TITLE.castT > 0){
    TITLE.castT = Math.max(0, TITLE.castT - 0.016);
    const k = 1 - TITLE.castT / 0.9;                  // 0 → 1
    const bx = w*0.30 + k * w*0.42;
    const by = h*0.30 + Math.sin(Math.min(1, k*1.25) * Math.PI/2) * h*0.34;
    ctx.save();
    ctx.globalAlpha = clamp(k*1.6, 0, 1) * (0.55 + 0.45*TITLE.flash);
    ctx.beginPath(); ctx.arc(bx, by, 4.2, 0, Math.PI*2);
    ctx.fillStyle = "rgba(255,120,90,.95)"; ctx.fill();
    ctx.beginPath(); ctx.arc(bx, by-4.6, 3.4, 0, Math.PI*2);
    ctx.fillStyle = "rgba(255,246,226,.95)"; ctx.fill();
    ctx.restore();
    if (k > 0.96){
      for (let i=0;i<3;i++){
        const rr = 8 + i*13 + k*10;
        ctx.beginPath(); ctx.ellipse(bx, by+6, rr, rr*0.34, 0, 0, Math.PI*2);
        ctx.strokeStyle = "rgba(255,236,190," + (0.28 - i*0.08) + ")"; ctx.lineWidth = 1.1; ctx.stroke();
      }
    }
  }

  requestAnimationFrame(startFrame);
}
/* --- титул: логика пробного заброса --- */
function titleGaugeMove(dt){
  if (!TITLE.run) return;
  TITLE.power += TITLE.dir * dt * 0.62;
  if (TITLE.power >= 1){ TITLE.power = 1; TITLE.dir = -1; }
  if (TITLE.power <= 0){ TITLE.power = 0; TITLE.dir = 1; }
  titleNeedle();
}
function titleToast(txt){
  let box = document.querySelector("#stPlay .st-toast");
  if (!box){
    box = document.createElement("div"); box.className = "st-toast";
    const host = $("stPlay") || document.body; host.appendChild(box);
  }
  box.textContent = txt; box.classList.add("on");
  clearTimeout(TITLE._tt); TITLE._tt = setTimeout(() => box.classList.remove("on"), 1500);
}
function titleNeedle(){
  const nd = $("stNeedle");
  if (nd) nd.style.left = "calc(" + (TITLE.power*100).toFixed(2) + "% - 1.5px)";
}
function titlePaintStars(){
  const stars = $("stStars");
  if (stars) stars.innerHTML = [0,1,2].map(i => i < TITLE.stars ? "<b>★</b>" : "★").join("");
  const st = $("stStreak");
  if (st) st.textContent = TITLE.stars >= 3 ? "глаз намётан — можно на воду"
    : TITLE.stars === 2 ? "ещё один точный заброс"
    : TITLE.stars === 1 ? "неплохо для начала" : "новичок";
  const task = $("stTask");
  if (task) task.textContent = TITLE.stars >= 3 ? "готов — жми «Начать рыбалку»"
    : "точных забросов: " + TITLE.stars + " из 3";
  const swz = $("stSweet");
  if (swz){ swz.style.left = (TITLE.sweet[0]*100) + "%"; swz.style.width = ((TITLE.sweet[1]-TITLE.sweet[0])*100) + "%"; }
  titleNeedle();
}
function titleRelease(){
  if (!TITLE.run) return 0;
  TITLE.run = false;
  const p = TITLE.power, s = TITLE.sweet;
  const dist = p < s[0] ? s[0] - p : p > s[1] ? p - s[1] : 0;
  const acc = dist === 0 ? 1 : clamp(1 - dist / 0.22, 0, 0.9);
  TITLE.tries++;
  TITLE.castT = 0.9;
  TITLE.flash = acc > 0.85 ? 1 : 0.5;
  if (acc > 0.85){
    TITLE.stars = Math.min(3, TITLE.stars + 1);
    TITLE.lastRes = "точный заброс";
    titleToast(["Точно!", "В яблочко!", "Как по нитке!"][(TITLE.stars - 1) % 3]);
    try { sfx.tap(); } catch(_) {}
  } else if (acc > 0.5){
    TITLE.lastRes = "почти";
    titleToast("почти — ещё чуть точнее");
  } else {
    TITLE.lastRes = "мимо зоны";
    titleToast("мимо золотой зоны");
  }
  // зона «гуляет» после каждого заброса: три из трёх — честные
  const mid = 0.28 + Math.random() * 0.42;
  TITLE.sweet = [mid, Math.min(0.92, mid + 0.15)];
  titlePaintStars();
  if (TITLE.stars >= 3){
    const main = document.querySelector(".sb-main");
    if (main && !save.total) main.textContent = "Начать рыбалку";
    const play = $("stPlay"); if (play) play.classList.add("done");
  }
  save.titleStars = Math.max(save.titleStars || 0, TITLE.stars);
  // механика титула имеет цену: три точных заброса один раз дают стартовый набор
  if (TITLE.stars >= 3 && !save.titleBonus){
    save.titleBonus = 1;
    save.coins = (save.coins || 0) + 20;
    save.baits = save.baits || {};
    save.baits[save.equipped.bait || "worm"] = (save.baits[save.equipped.bait || "worm"] || 0) + 5;
    titleToast("+20 монет и 5 приманок за точность");
    updateChips();
  }
  persist();
  return acc;
}
/* сезон и погода «за окном» — на титуле, как в настоящем лаунчере */
function titleSetup(){
  const se = seasonDef();
  const ic = (save.weather || {}).type || "sunny";
  const sb = $("stSeason"), sw = $("stWx"), ico = $("stBadgeIco");
  if (sb) sb.textContent = se.name;
  if (sw) sw.textContent = (WEATHER[ic] || {}).name || "ясно";
  if (ico) ico.innerHTML = (WEATHER_ICONS[ic] || "") ||
    '<svg viewBox="0 0 24 24" fill="none" stroke="#ffd979" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="12" r="4.4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4"/></svg>';
  const mh = $("miHelp"); if (mh) mh.innerHTML = ICONS.book || ICONS.star;
  const ms = $("miSound"); if (ms) ms.innerHTML = save.mute ? (ICONS.mute || ICONS.sound) : ICONS.sound;
  titlePaintStars();
}

function updateStartStats(){
  return;
  const lvl = levelInfo().lvl;
  const kinds = Object.keys(save.caught).length;
  const parts = [];
  if (save.total){
    parts.push('<span class="sstat gold">'+ICONS.star+' ур. '+lvl+'</span>');
    parts.push('<span class="sstat">'+ICONS.fish+kinds+'/'+Object.keys(FISH).length+' видов</span>');
    parts.push('<span class="sstat">'+ICONS.coin+fmtNum(save.coins)+'</span>');
    const q = QUESTS.filter(x => questClaimable(x)).length;
    if (q) parts.push('<span class="sstat">'+ICONS.bolt+' квестов: '+q+'</span>');
  } else {
    parts.push('<span class="sstat">'+ICONS.fish+'26 приманок</span>');
    parts.push('<span class="sstat">'+ICONS.rod+'10 удочек</span>');
    parts.push('<span class="sstat gold">'+ICONS.star+'26 квестов</span>');
  }
  el.innerHTML = parts.join("");
  const sub = $("btnStartSub");
  if (sub) sub.textContent = save.total ? "ур. " + lvl + " · " + kinds + " видов в дневнике · " + save.coins + " монет" : "точка → заброс → подсечка → вываживание";
  const main = document.querySelector(".sb-main");
  if (main) main.textContent = save.total ? "Продолжить рыбалку" : "Начать рыбалку";
}
function openStart(){
  START.on = true;
  $("start").classList.add("on");
  updateStartStats();
  titleSetup();
  const lbl = $("soundStartLabel");
  if (lbl) lbl.textContent = save.mute ? "Звук выкл." : "Звук вкл.";
  if (START.cv && !START.started){ START.started = true; requestAnimationFrame(startFrame); }
}
function closeStart(){
  START.on = false;
  $("start").classList.remove("on");
  save.seen = true; persist(); audio(); resize();
}

/* ---------------- обучающие подсказки ---------------- */
const COACH = [
  {id:"c_spot", text:"Тапни по любому месту воды — можно бросать куда угодно", pos:[0.5,0.455]},
  {id:"c_bait", text:"На каждую рыбу — своя приманка. Коснись иконки приманки, чтобы сменить", pos:[0.5,0.700]},
  {id:"c_power", text:"Зажми кнопку и отпусти в зелёной зоне: сильнее — дальше бросок", pos:[0.5,0.700]},
  {id:"c_bite", text:"Поклёвка! Подсекай, пока кольцо не сжалось", pos:[0.5,0.700]},
  {id:"c_fight", text:"Держи палец — тяни. Отпускай, когда натяжение идёт к красному", pos:[0.5,0.700]},
  {id:"c_snag", text:"Зацеп! Коротко дёргай, чтобы освободить снасть", pos:[0.5,0.640]},
  {id:"c_hand", text:"Прикормка ускоряет клёв на полторы минуты — сыпь до заброса", pos:[0.82,0.760]}
];
let coachIdx = 0, coachTimer = 0;
function showCoach(idx){
  const el = $("coach"); if (!el) return;
  const c = COACH[idx]; if (!c){ el.innerHTML = ""; return; }
  el.innerHTML = '<div class="coach-bubble">'+c.text+'</div>';
  const b = el.querySelector(".coach-bubble");
  b.style.left = (c.pos[0]*100)+"%";
  b.style.top = (c.pos[1]*100)+"%";
  coachIdx = idx;
}
function hideCoach(){ const el = $("coach"); if (el) el.innerHTML = ""; }
function coachTip(id){
  if (save.seenCoach && save.seenCoach[id]) return;
  save.seenCoach = save.seenCoach || {};
  save.seenCoach[id] = true; persist();
  const c = COACH.find(x => x.id === id);
  if (!c) return;
  showCoach(COACH.indexOf(c));
  clearTimeout(coachTimer);
  coachTimer = setTimeout(hideCoach, 4200);
  // как только началась ловля, подсказка не нужна
  if (G.state === "fight"){ clearTimeout(coachTimer); coachTimer = setTimeout(hideCoach, 1200); }
}

/* ---------------- цикл ---------------- */
let last = performance.now();
function loop(now){
  const dt = Math.min(0.05, (now-last)/1000);
  last = now;
  // страховка: страница не должна «уезжать»
  if (window.scrollY || window.scrollX) window.scrollTo(0,0);
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

/* ---------------- старт ---------------- */
/* кнопка «Клубная карта» в HUD: тихая, когда карта активна, яркая — когда нет */
function syncPassBtn(){
  const b = $("clubPassBtn");
  if (!b) return;
  b.innerHTML = ICONS.pearl;
  b.classList.toggle("on", passOn());
  b.title = passOn() ? "Клубная карта активна до " + passEndText() : "Клубная карта — открыть привилегии";
  const pe = $("pearlIco3");
  if (pe) pe.innerHTML = ICONS.pearl;
  const pp = $("pearlsPay");
  if (pp) pp.textContent = save.pearl || 0;
}

function boot(){
  resize();
  ["coinIco","coinIco2"].forEach(id => { const el = $(id); if (el) el.innerHTML = ICONS.coin; });
  ["pearlIco","pearlIco2"].forEach(id => { const el = $(id); if (el) el.innerHTML = ICONS.pearl; });
  $("btnSound").innerHTML = ICONS.sound;
  syncPassBtn();
  initTabs();
  updateChips();
  renderQuests();
  updateQuestDot();
  setState("idle");
  initStart();
  openStart();
  const startBtn = $("btnStart");
  if (startBtn) startBtn.addEventListener("click", closeStart);

  /* титул: удержание и отпускание «заброса» (мышь, палец, пробел) */
  const castBtn = $("btnTitleCast");
  if (castBtn){
    const press = (e) => {
      if (e && e.cancelable) e.preventDefault();
      if (TITLE.stars >= 3) return;
      TITLE.run = true; TITLE.power = 0; TITLE.dir = 1;
      try { sfx.tap(); } catch(_) {}
    };
    const rel = (e) => {
      if (e && e.cancelable && TITLE.run) e.preventDefault();
      titleRelease();
    };
    castBtn.addEventListener("pointerdown", press);
    castBtn.addEventListener("pointerup", rel);
    castBtn.addEventListener("pointercancel", rel);
    castBtn.addEventListener("pointerleave", rel);
    castBtn.addEventListener("click", (e) => { e.preventDefault(); if (!TITLE.tries) press(e); });
    window.addEventListener("keydown", (e) => {
      if (!START.on || TITLE.stars >= 3) return;
      if (e.code === "Space" && !TITLE.run && !e.repeat){ e.preventDefault(); press(e); }
    });
    window.addEventListener("keyup", (e) => {
      if (!START.on) return;
      if (e.code === "Space" && TITLE.run){ e.preventDefault(); rel(e); }
    });
  }
  const passBtn = $("clubPassBtn");
  if (passBtn) passBtn.addEventListener("click", openPaySheet);
  // после возврата с оплаты: ?paid=1 → сразу проверяем
  try {
    if (/[?&]paid=1/.test(location.search)) setTimeout(() => payCheck(true), 700);
  } catch(_) {}

  const helpBtn = $("btnStartHelp");
  if (helpBtn) helpBtn.addEventListener("click", () => { closeStart(); openSheet("sheetHelp", renderHelp); });
  const sndBtn = $("btnStartSound");
  if (sndBtn) sndBtn.addEventListener("click", () => {
    save.mute = !save.mute; persist();
    const lbl = $("soundStartLabel"); if (lbl) lbl.textContent = save.mute ? "Звук выкл." : "Звук вкл.";
    const ms = $("miSound"); if (ms) ms.innerHTML = save.mute ? (ICONS.mute || ICONS.sound) : ICONS.sound;
    const bs = $("btnSound"); if (bs) bs.innerHTML = save.mute ? ICONS.mute : ICONS.sound;
    if (!save.mute){ try { audio(); tone(660, 0.08, "sine", 0.05, 880); } catch(_) {} }
  });

  // клавиши стартового экрана
  window.addEventListener("keydown", e => {
    if (START.on && (e.code === "Enter" || e.code === "Space")){ e.preventDefault(); closeStart(); }
  });
  requestAnimationFrame(t => { last = t; requestAnimationFrame(loop); });
  // PWA: кнопка установки в стартовом экране + офлайн-кэш
  if (typeof bootPWA === "function") bootPWA();
  // 9.2: Яндекс Игры — реклама, покупки, облачные сохранения (если мы на платформе)
  ygInit().then(ok => {
    if (!ok) return false;
    ygRestorePurchases();
    syncPayUI();
    return true;
  }).then(yes => {
    // 9.3: если Яндекса нет — проверяем, не открыта ли игра внутри ВК
    if (!yes) vkInit().then(v => { if (v) syncPayUI(); });
  });
}

// отладочный хук
/* тест-хуки: поймать конкретную рыбу и забросить с заданной силой (только для проверок) */
window.__forceCatch = (id) => {
  const F = FISH[id];
  if (!F) return null;
  // тестовый хук: сбрасываем сцену, если уже висит карточка улова
  if (G.state === "result"){
    G.cardOpen = false;
    const cc = $("catchCard"); if (cc) cc.classList.remove("on");
    setState("aim");
  }
  save.equipped.bait = F.bait;
  const f = { junk:false, type:id, name:F.name, rar:F.rar, note:F.note, weight:Math.round(F.wMin*3),
    norm:0.5, aggr:F.aggr, stam:F.stam, val:F.val, xp:F.xp, art:artOf(id), palette:paletteFor(id),
    bait:F.bait, reqPower:F.reqPower };
  G.fish = f; G.acc = 0.95; G.perfectAcc = 0.95; G.biteAt = 1;
  succeed();
  return f.name;
};
window.__castAt = (power) => {
  selectSpot(G.spot || locSpots()[0]);
  setState("power"); G.power = power; G.hold = false;
  releasePower();
  return G.acc;
};
window.__test = { save:() => save, persist, pickFish, spotPool, RODS, BAITS, gearPower,
  FISH_ECO, LOC_ENV, SPOT_ENV,
  setEquip:(slot,id)=>{ save.equipped[slot]=id; }, questOnCatch, QUESTS, PREMIUM, PEARL_ITEMS, FISH,
  LOCATIONS, RARITY, rodDef, lineDef, hookDef, netDef, reelDef, levelInfo };
window.__dbg = () => ({
  bobX: Math.round(G.bobX), bobY: Math.round(G.bobY), drift: +(G.drift||0).toFixed(3),
  waitDur: +(G.waitDur||0).toFixed(2), free: !!(G.spot && G.spot.free),
  interest: +(G.interest||0).toFixed(2), readyIn: Math.max(0, +(((G.readyAtMs||0) - performance.now())/1000).toFixed(2)),
  state:G.state, tension:+G.tension.toFixed(3), progress:+G.progress.toFixed(3),
  hold:G.hold, pull:G.pull.active, power:+G.power.toFixed(2), acc:+G.acc.toFixed(2),
  streak:+(G.perfectStreak||0).toFixed(2), bestStreak:+(save.streakBest||0).toFixed(2),
  perfect:+(G.perfectT||0).toFixed(2),
  fish:G.fish ? (G.fish.junk ? "junk" : G.fish.type) : null,
  spot:G.spot && G.spot.id, coins:save.coins, lvl:levelInfo().lvl,
  leap: G.leap ? {t:+G.leap.t.toFixed(2), x:Math.round(G.leap.x), y:Math.round(G.leap.y)} : null,
  fishImg: G.fish && images.fish[artOf(G.fish.type)] ? images.fish[artOf(G.fish.type)].complete : "none",
  junk: G.fish ? !!G.fish.junk : null
});
window.__club = () => ({ owned: premOwned(), ready: premOwned(), count: premCount(), equipped: premEquipped(),
  lvl: clubLvl(), rank: clubRank().name,
  perks: { pearl: perk("pearl"), xp: perk("xp"), bite: perk("bite"),
    coin: perk("coin"), big: perk("big"), all: perk("all") },
  clubSpot: !!clubSpot(), dayReady: clubDayReady(), dayKey: save.clubDay || null,
  dayReward: clubDayReward(), luckReady: clubLuckReady(), visitReady: clubVisitReady(),
  goal: { cur: save.clubGoalDay === todayKey() ? (save.clubGoal||0) : 0,
          max: CLUB_GOAL.count, done: !!save.clubGoalDone },
  spots: locSpots().map(s => s.id),
  duel: { locs: duelLocs(), ready: duelReady(), wins: save.duelWins || 0,
    perDayLeft: duelPerDayLeft() } });
window.__pwa = () => ({ standalone: pwaIsStandalone(), platform: pwaPlatform(),
  installEvt: !!_installEvt, btn: !!_pwaBtn, sw: !!navigator.serviceWorker,
  controlled: !!(navigator.serviceWorker && navigator.serviceWorker.controller) });
window.__selectSpot = i => selectSpot(locSpots()[i]);
window.__spotById = (id) => locSpots().find(s => s.id === id) || null;
window.__fishDef = (id) => FISH[id];
window.__setDouble = () => { G.dayDouble = true; };
window.__debugLog = () => DEBUG.slice();
window.__biteWait = () => biteWait();
window.__day = () => ({ bait: baitOfDay(), onBait: baitDayOn(), locDay: locDayOn(),
  locDayName: locDayName(), days: daysToLocDay(), locDayK: LOC_DAY_K });
/* титул: механика пробного заброса — наружу для проверок */
window.__title = () => ({ stars: TITLE.stars, tries: TITLE.tries, power: +TITLE.power.toFixed(3),
  run: TITLE.run, sweet: TITLE.sweet.slice(), res: TITLE.lastRes, saved: save.titleStars || 0 });
window.__titleHold = (on) => { TITLE.run = !!on; if (on){ TITLE.power = 0; TITLE.dir = 1; } return TITLE.power; };
window.__titleSetPower = (v) => { TITLE.power = clamp(v, 0, 1); return TITLE.power; };
window.__titleRelease = () => titleRelease();
/* обновить интерфейс оплаты под платформу */
function syncPayUI(){
  syncPassBtn();
  const b = $("payBuy");
  if (b && ygOn()){ b.disabled = false; b.textContent = "Оплатить через Яндекс"; }
  if (b && !ygOn() && vkOn()){ b.disabled = false; b.textContent = "Оплатить голосами ВК"; }
  if (typeof renderPaySheet === "function" && $("sheetPay") && $("sheetPay").classList.contains("on")) renderPaySheet();
}
/* 9.2: наружу для проверок платформы (в тестах SDK подменяется) */
window.__yg = () => ({ ready: YG.ready, payments: !!YG.payments, player: !!YG.player,
  lang: YG.lang, device: YG.device, products: Object.keys(YG_PRODUCTS), noAds: !!save.noAds,
  cloud: !!YG.player });
/* 9.3: наружу для проверок VK (в тестах Bridge подменяется) */
window.__vk = () => ({ on:VK.on, ready:VK.ready, user:VK.user, busy:VK.busy, appId:VK_APP_ID,
  env: VK.env || vkEnv(), probed: VK.probed, products:Object.keys(VK_PRODUCTS), adsLeft:VK.adsLeft });
window.__vkInit = () => vkInit().then(ok => { syncPayUI(); return window.__vk(); });
window.__vkBuy = (id) => vkBuy(id);
window.__vkAd = (kind) => vkAd(kind);
window.__vkReset = () => { VK.ready = false; VK.on = false; VK.user = null; VK.busy = false; VK.env = ""; syncPayUI(); return window.__vk(); };
/* инициализировать платформу принудительно (тесты и отладка) */
window.__ygInit = () => ygInit().then(ok => { syncPayUI(); return window.__yg(); });
window.__ygAd = (kind) => ygAd(kind);
window.__ygBuy = (id) => ygBuy(id);
window.__ygReset = () => { YG.ready = false; YG.payments = null; YG.player = null; YG.busy = false; syncPayUI(); return window.__yg(); };

/* оплата: наружу для проверок (эмуляция сервера — только в тестах) */
window.__pay = () => ({ ready: payReady(), api: PAY.api, code: playerCode(), pass: save.pass || null,
  ok: passOn(), left: passDaysLeft(), access: clubAccess(), plans: CLUB_PASS.plans.map(p => p.id) });
window.__payGrant = (plan) => { const p = passGrant(plan || "month"); syncPassBtn(); renderClubCard(); return p; };
window.__payClear = () => { save.pass = null; persist(); syncPassBtn(); renderClubCard(); return passOn(); };
window.__payExpire = () => { if (save.pass) save.pass.exp = Date.now() - 1000; persist(); syncPassBtn(); return passOn(); };
window.__openPay = () => openPaySheet();
window.__ui = { openStart, closeStart, renderQuests, renderBaitShelf, claimQuest, dailyNow, questClaimable, openSheet, closeAllSheets,
  renderBase, renderLocMap, showCatch, renderHelp, updateChips, syncLocInfo, renderHandBtn };

/* ---- 8.0: тест-хуки механики водоёмов ---- */
window.__mech = () => ({
  loc: save.loc,
  water: locMech().water, stream: locMech().stream, snag: locMech().snag,
  window: locMech().window, isWindow: windowOn(),
  time: dayTimeNow(), forced: DAY_FORCE,
  hand: { active: handActive(), left: handLeft(), cost: handCost(), locs: Object.keys(save.handLocs||{}).length },
  snagTotal: save.snagTotal || 0, unsnags: save.unsnags || 0,
  duel: G.duel ? { active: G.duel.active, left: G.duel.left, mine: G.duel.mine, theirs: G.duel.theirs,
    rival: G.duel.rival.name } : null,
  duelWins: save.duelWins || 0, pearl: save.pearl || 0,
  locs: Object.keys(LOCATIONS).length, fish: Object.keys(FISH).length, quests: QUESTS.length
});
window.__setTime = (h) => { DAY_FORCE = (h === null || h === undefined) ? null : h; syncLocInfo(); updateChips(); return dayTimeNow(); };
window.__setWave = (h) => { WAVE_FORCE = (h === null || h === undefined) ? null : h; updateChips(); return { hour: waveNowHour(), on: waveOn(save.loc) }; };
window.__wave = (loc) => ({
  on: waveOn(loc || save.loc), hour: waveNowHour(), left: waveMinsLeft(), inMin: waveIn(loc || save.loc),
  forecast: waveForecast(loc || save.loc, 6).map(x => x.h),
  buoy: { active: BUOY.active, taken: BUOY.taken || 0 },
  mult: waveMult(save.loc)
});
window.__forecast = (loc) => { const f = biteForecast(loc); return { score:+f.score.toFixed(3), level:f.level, why:f.why, mult:+f.mult.toFixed(3) }; };
window.__homes = (id) => fishHomes(id);
window.__isHome = (id, spotId) => {
  const sp = spotId ? locSpots().find(x => x.id === spotId) : G.spot;
  return !!(sp && isFishHome(id, sp));
};
window.__buoySpawn = () => { G.state = "waiting"; G.bobX = W*0.5; maybeSpawnBuoy(); return { active: BUOY.active, x: Math.round(BUOY.x), y: Math.round(BUOY.y) }; };
window.__buoyTake = () => takeBuoy();
window.__dropHand = () => dropHand();
window.__setSnag = (on) => {
  if (on && G.state !== "snag"){ enterSnag(); return G.state; }
  if (G.state === "snag"){ setState("aim"); }
  return G.state;
};
window.__snagTap = (kind) => { SNAGST.cool = 0; snagTap(kind || "soft"); return { phase: SNAGST.phase, taps: SNAGST.taps, state: G.state }; };
window.__duelStart = (loc) => {
  if (loc && loc !== save.loc){ save.loc = loc; G.spot = null; setState("idle"); updateChips(); }
  startDuel();
  return G.duel ? { rival: G.duel.rival.name, casts: G.duel.casts } : null;
};
window.__duelCast = (grams) => {
  if (!G.duel || !G.duel.active) return null;
  G.fish = { junk:false, type:"plotva", name:"Плотва", rar:"common", weight: grams || 800,
    norm:0.5, aggr:0.3, stam:0.36, val:38, xp:8, art:"plotva", palette:paletteFor("plotva") };
  duelOnCatch(G.fish);
  return { left: G.duel.left, mine: G.duel.mine, theirs: G.duel.theirs };
};
window.__duelEnd = () => { if (G.duel) endDuel(); return { wins: save.duelWins || 0, pearl: save.pearl || 0, perDayLeft: duelPerDayLeft() }; };
window.__locMech = (k) => locMech(k);
/* бросок «садится ли снасть» для заданной точки (0 — чистая вода, 1 — коряжник) */
window.__tSnagChance = (kind) => {
  const saved = G.spot;
  G.spot = kind ? { id:"drift", depth:"средне", free:false } : { id:"open", depth:"средне", free:false };
  const ch = snagChanceHere();
  G.spot = saved;
  return ch;
};
window.__tSnagChanceAt = (loc, spotId) => {
  const savedLoc = save.loc, savedSpot = G.spot;
  save.loc = loc || save.loc;
  const L = LOCATIONS[save.loc];
  G.spot = L.spots.find(x => x.id === spotId) || null;
  const ch = snagChanceHere();
  save.loc = savedLoc; G.spot = savedSpot;
  return ch;
};
window.__tSnagRoll = (kind) => {
  if (typeof SNAGST !== "undefined") SNAGST.cool = 0;
  const saved = G.spot;
  G.spot = kind ? { id:"drift", depth:"средне", free:false } : { id:"open", depth:"средне", free:false };
  const ch = snagChanceHere();
  G.spot = saved;
  return Math.random() < ch;
};
window.__duelRival = (k) => duelRival(k);

/* ---------------- PWA: установка на экран и офлайн-режим ---------------- */
let _installEvt = null;      // отложенное приглашение Chrome/Android
let _pwaBtn = null;          // кнопка «Установить» в стартовом экране
function pwaIsStandalone(){
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}
function pwaPlatform(){
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}
/* подсказка «как установить», если автоматического приглашения нет */
function pwaHint(){
  const plat = pwaPlatform();
  if (plat === "ios") toast("Установка на iPhone", "Поделиться (квадрат со стрелкой) → «На экран „Домой“»", 4200);
  else if (plat === "android") toast("Установка на Android", "Меню Chrome (три точки) → «Установить приложение»", 4200);
  else toast("Установка в Chrome", "Значок ⊕ справа в адресной строке → «Установить»", 4200);
}
function pwaSetupInstall(){
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    _installEvt = e;
    if (_pwaBtn) _pwaBtn.hidden = false;
  });
  window.addEventListener("appinstalled", () => {
    _installEvt = null;
    if (_pwaBtn) _pwaBtn.hidden = true;
    try { save.pwaInstalled = 1; persist(); } catch(_) {}
    toast("Установлено", "Игра теперь на экране устройства — и работает без интернета", 3200);
  });
  // кнопка в стартовом экране (показываем и там, где приглашения нет — с подсказкой)
  const wrap = document.querySelector("#start .start-head");
  if (!wrap || pwaIsStandalone()) return;
  const btn = document.createElement("button");
  btn.id = "btnInstall";
  btn.type = "button";
  btn.className = "start-mini";
  btn.textContent = "Установить приложение";
  btn.style.cssText = "width:100%;margin-top:10px;padding:12px 8px;font-size:12px;" +
    "background:rgba(10,26,32,.62);border:1px solid rgba(255,214,122,.34);" +
    "color:rgba(255,246,226,.92);border-radius:16px;" +
    "backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);cursor:pointer";
  btn.addEventListener("click", async (e) => {
    e.stopPropagation();
    if (_installEvt){
      _installEvt.prompt();
      const res = await _installEvt.userChoice.catch(()=>null);
      if (res && res.outcome === "accepted"){ _installEvt = null; btn.hidden = true; }
      else pwaHint();
    } else pwaHint();
  });
  wrap.appendChild(btn);
  _pwaBtn = btn;
  if (_installEvt) btn.hidden = false;
}
/* офлайн-кэш: сервис-воркер появится и на GitHub Pages, и на локальном сервере;
   при открытии файла с диска (file://) установка и кэш недоступны — игра и так офлайн */
async function pwaOffline(){
  if (!("serviceWorker" in navigator)) return;
  if (location.protocol !== "http:" && location.protocol !== "https:") return;
  try {
    // в стороннем iframe (ВК, площадки) регистрация может быть запрещена — это нормально
    const reg = await navigator.serviceWorker.register("sw.js", { scope: "./" }).catch(() => null);
    if (!reg) return;
    // когда вышло обновление — сообщаем, но не мешаем игре
    reg.addEventListener("updatefound", () => {
      const w = reg.installing;
      if (!w) return;
      w.addEventListener("statechange", () => {
        if (w.state === "installed" && navigator.serviceWorker.controller)
          toast("Обновление готово", "Перезапусти игру, чтобы применить", 2600);
      });
    });
  } catch (e) { /* офлайн-кэш не критичен для игры */ }
}
function bootPWA(){
  pwaSetupInstall();
  pwaOffline();
}

if (document.readyState === "loading") window.addEventListener("DOMContentLoaded", boot);
else setTimeout(boot, 0);
/* ---- 8.7: тест-хуки сезонов и погодной физики ---- */
window.__setSeason = (id) => {
  SEASON_F_NOW = id || null;
  if (typeof updateChips === "function") updateChips();
  if (typeof syncLocInfo === "function") syncLocInfo();
  return { season: seasonNow(), day: seasonDay(), ice: iceNow(save.loc) };
};
window.__season = () => ({ id: seasonNow(), name: seasonDef().name, day: seasonDay(), days: SEASON.days,
  daysPlayed: daysPlayed(), ice: { lake: iceNow("lake"), swamp: iceNow("swamp"), sea: iceNow("sea"), winter: iceNow("winter") } });
window.__phys = (loc) => {
  const L = loc || save.loc;
  const wb = weatherBite(L);
  return { pressure: pressureNow(L), trend: pressureTrend(L), wind: windAt(L),
           weatherK: +wb.k.toFixed(3), why: wb.why,
           clarity: +clarityAt(L, 3).toFixed(3), temp: waterTemp(L, 3),
           oxygen: +oxygenAt(L).toFixed(2), zamor: zamorOn(), afterStorm: afterStormOn() };
};
window.__setStorm = (on) => { save.stormAt = on ? Date.now() : 0; return afterStormOn(); };
window.__setLine = (id) => { save.equipped.line = id; return lineNoticeK(save.loc); };
window.__lineK = () => lineNoticeK(save.loc);
window.__setWindDir = (d) => { WIND_DIR_F = (d == null ? null : d); return windAt(); };
window.__waterWhy = (loc) => waterWhy(loc);
window.__layers = (loc) => waterLayers(loc);
window.__layersSVG = (loc) => waterLayersSVG(loc);
window.__peakStorm = () => { save.lastWeatherType = "thunder"; save.weather = { type:"overcast", rolls:-3 }; markStormEnded(); return afterStormOn(); };

/* ---- 8.6: тест-хуки экологии ---- */
window.__fitWhy = (id, spotId, loc) => {
  const L = loc || save.loc;
  const sp = spotId ? (LOCATIONS[L].spots.find(x => x.id === spotId) || (CLUB_SPOTS[L] && CLUB_SPOTS[L].id === spotId ? CLUB_SPOTS[L] : null)) : G.spot;
  const E = FISH_ECO[id]; const env = locEnv(L), se = spotEnv(sp, L);
  const tW = waterTemp(L, se.depth);
  const BK = {sand:"s",gravel:"g",clay:"c",silt:"i",mud:"m",stone:"k",shell:"h",reef:"r"};
  const WK = {reeds:"r",grass:"g",snags:"n",rocks:"k",reef:"f",none:"0"};
  return { id, spot:sp && sp.id, depth:se.depth, bottom:se.bottom, weed:se.weed, flow:se.flow, cover:se.cover,
    tW, salt:env.salt, need:E,
    depK:+ecoTrap(se.depth, E.dep[0],E.dep[1],E.dep[2]).toFixed(2),
    tempK:+ecoTrap(tW, E.t[0],E.t[1],E.t[2]).toFixed(2),
    botOK:E.b.includes(BK[se.bottom]), flowOK:inRange(se.flow,E.f), weedOK:E.w.includes(WK[se.weed]),
    fit:+fishFit(id,sp,L).toFixed(3) };
};
window.__env = (loc) => {
  const L = loc || save.loc, env = locEnv(L);
  return { loc:L, type:env.type, salt:env.salt, flow:env.flow, clarity:env.clarity,
           tWater:+waterTemp(L, 3).toFixed(1) };
};
window.__spotEnv = (id, loc) => {
  const L = loc || save.loc;
  const tbl = SPOT_ENV[L] || {};
  const e = id ? tbl[id] : tbl[(LOCATIONS[L].spots[0] || {}).id];
  return e ? { ...e, tWeb:undefined, text: spotEnvText({ id: id || LOCATIONS[L].spots[0].id }, L) } : null;
};
window.__fit = (id, spotId, loc) => {
  const L = loc || save.loc;
  const sp = spotId
    ? (LOCATIONS[L].spots.find(x => x.id === spotId) || (CLUB_SPOTS[L] && CLUB_SPOTS[L].id === spotId ? CLUB_SPOTS[L] : null))
    : G.spot;
  return sp ? +fishFit(id, sp, L).toFixed(3) : -1;
};
window.__kinds = (spotId, loc, n) => {
  const L = loc || save.loc;
  const sp = spotId ? LOCATIONS[L].spots.find(x => x.id === spotId) : G.spot;
  return spotKinds(sp, L, n || 6).map(x => x.name + ":" + x.f.toFixed(2));
};
window.__reason = () => spotReason(G.spot);
/* проверка «мир не опустел»: на каждой точке и водоёме — сколько видов доступно новичку */
window.__census = (rodId, baitList) => {
  const out = {};
  const oldRod = save.equipped.rod, oldBait = save.equipped.bait;
  const rod = RODS[rodId || "bamboo"];
  save.equipped.rod = rodId || "bamboo";
  const baits = baitList || Object.keys(BAITS);
  for (const L in LOCATIONS){
    const spots = LOCATIONS[L].spots.concat(CLUB_SPOTS[L] ? [CLUB_SPOTS[L]] : []);
    out[L] = {};
    for (const sp of spots){
      let best = 0, via = "", ids = [];
      for (const b of baits){
        save.equipped.bait = b;
        const list = Object.keys(sp.w).filter(k => FISH[k] && onBaitFor(FISH[k]) && FISH[k].reqPower <= rod.power
          && fishFit(k, sp, L) >= 0.25);
        if (list.length > best){ best = list.length; via = b; ids = list; }
      }
      out[L][sp.id + "|ids"] = ids;
      // 8.6: «доступен» = берёт приманку, удочка держит и вид тут реально живёт (fit ≥ 0.25)
      out[L][sp.id] = best + (via ? ":" + via : "");
    }
  }
  save.equipped.rod = oldRod; save.equipped.bait = oldBait;
  return out;
};
/* виды, которые после фильтра не ловятся нигде — таких быть не должно */
window.__orphans = () => {
  const seen = new Set();
  for (const L in LOCATIONS){
    const spots = LOCATIONS[L].spots.concat(CLUB_SPOTS[L] ? [CLUB_SPOTS[L]] : []);
    for (const sp of spots) for (const k in sp.w){
      if (FISH[k] && fishFit(k, sp, L) >= 0.25) seen.add(k);
    }
  }
  return Object.keys(FISH).filter(k => !seen.has(k));
};
})();
