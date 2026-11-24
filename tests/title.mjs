// title: загрузочный экран — своя механика «пробный заброс».
// Проверяем: экран собран, механика честно считает точность, три звезды дают награду,
// подписи сезона/погоды на месте, игра стартует и ошибок консоли нет.
import { chromium } from "playwright";
const b = await chromium.launch();
const errs = [];
const p = await b.newPage({ viewport:{width:390,height:844}, deviceScaleFactor:2 });
p.on("pageerror", e => errs.push(e.message));
p.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
const GAME = (process.env.GAME_URL || new URL("../rybalka.html", import.meta.url).href);
await p.goto(GAME, { waitUntil:"load" });
await p.waitForTimeout(1000);

const fails = [];
const check = (name, ok, info) => {
  if (!ok) fails.push(name + (info ? " :: " + JSON.stringify(info) : ""));
  console.log((ok ? "ok  " : "FAIL") + " · " + name + (info ? " · " + JSON.stringify(info) : ""));
};

/* 1. экран собран: логотип, мини-игра, кнопки */
const dom = await p.evaluate(() => {
  const q = id => document.getElementById(id);
  return {
    start: !!q("start") && q("start").classList.contains("on"),
    logo: (document.querySelector(".logo h1") || {}).textContent,
    gauge: !!q("stGauge") && !!q("stSweet") && !!q("stNeedle"),
    cast: !!q("btnTitleCast"),
    startBtn: (q("btnStart") || {}).textContent.trim().slice(0, 40),
    help: !!q("btnStartHelp"), sound: !!q("btnStartSound"),
    season: (q("stSeason") || {}).textContent, wx: (q("stWx") || {}).textContent,
    title: window.__title()
  };
});
check("загрузочный экран открыт и собран", dom.start && dom.gauge && dom.cast, dom);
check("на титуле есть логотип и кнопка старта", dom.logo === "РЫБАЛКА" && /Начать|Продолжить/.test(dom.startBtn), dom.startBtn);
check("на титуле видны сезон и погода", /весна|лето|осень|зима/.test(dom.season || "") && !!(dom.wx || ""), { season: dom.season, wx: dom.wx });
check("есть кнопки «как играть» и звук", dom.help && dom.sound, dom);

/* 2. механика: точный заброс даёт звезду, промах — нет */
await p.evaluate(() => { localStorage.clear(); });
await p.reload({ waitUntil:"load" }); await p.waitForTimeout(900);
const play = await p.evaluate(async () => {
  const out = {};
  // промах
  window.__titleHold(true); window.__titleSetPower(0.02); 
  out.missAcc = +window.__titleRelease().toFixed(2);
  out.afterMiss = window.__title();
  // точный
  const sw = window.__title().sweet;
  window.__titleHold(true); window.__titleSetPower((sw[0] + sw[1]) / 2);
  out.hitAcc = +window.__titleRelease().toFixed(2);
  out.afterHit = window.__title();
  return out;
});
check("промах не даёт звезду", play.afterMiss.stars === 0 && play.missAcc < 0.85, { acc: play.missAcc, stars: play.afterMiss.stars });
check("заброс в золотую зону даёт звезду", play.afterHit.stars === 1 && play.hitAcc > 0.85, { acc: play.hitAcc, stars: play.afterHit.stars });

/* 3. три звезды: награда один раз и подпись «глаз намётан» */
const three = await p.evaluate(async () => {
  const before = { coins: window.__test.save().coins };
  for (let i = 0; i < 3; i++){
    const sw = window.__title().sweet;
    window.__titleHold(true); window.__titleSetPower((sw[0] + sw[1]) / 2);
    window.__titleRelease();
    await new Promise(r => setTimeout(r, 60));
  }
  const s = window.__test.save();
  const task = (document.getElementById("stTask") || {}).textContent;
  const streak = (document.getElementById("stStreak") || {}).textContent;
  const again = (() => { const sw = window.__title().sweet;
    window.__titleHold(true); window.__titleSetPower((sw[0] + sw[1]) / 2); window.__titleRelease();
    return window.__test.save(); })();
  return { stars: window.__title().stars, coinsBefore: before.coins, coins: s.coins,
    bonus: s.titleBonus, bait: s.baits[s.equipped.bait], task, streak, coinsAgain: again.coins };
});
check("три точных заброса дают три звезды", three.stars === 3, three.stars);
check("за три звезды начислена награда (+20 монет, +5 приманок)",
  three.coins === three.coinsBefore + 20 && three.bonus === 1 && three.bait >= 5, three);
check("награда не начисляется второй раз", three.coinsAgain === three.coins, { было: three.coins, стало: three.coinsAgain });
check("титул говорит игроку, что делать дальше", /Начать рыбалку|готов/.test(three.task || "") && /намётан/.test(three.streak || ""),
  { task: three.task, streak: three.streak });

/* 4. экран не ломает раскладку и передаёт управление игре */
const layout = await p.evaluate(() => {
  const head = document.querySelector(".start-head").getBoundingClientRect();
  const badge = document.getElementById("stBadge").getBoundingClientRect();
  return { top: Math.round(head.top), bottom: Math.round(head.bottom), vh: innerHeight, vw: innerWidth,
           badgeRight: Math.round(badge.right) };
});
check("весь блок титула влезает в экран", layout.top >= 0 && layout.bottom <= layout.vh && layout.badgeRight <= layout.vw, layout);
await p.click("#btnStart"); await p.waitForTimeout(700);
const after = await p.evaluate(() => ({ state: window.__dbg().state, on: document.getElementById("start").classList.contains("on") }));
check("кнопка старта уводит в игру", !after.on && after.state === "idle", after);

check("ошибок консоли нет", errs.length === 0, errs.slice(0, 4));
console.log("--------------------------------------------------");
if (fails.length){ console.log("TITLE FAILED: " + fails.length); fails.forEach(f => console.log("  - " + f)); }
else console.log("TITLE OK");
await b.close();
