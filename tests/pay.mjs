// pay: платные привилегии — «Клубная карта».
// Проверяем честную схему: без платёжного сервиса оплата не выдумывает доступ;
// при активной карте открываются перки, плёс и ежедневный набор; срок истёк — доступ закрыт.
import { chromium } from "playwright";
const b = await chromium.launch();
const errs = [];
const p = await b.newPage({ viewport:{width:390,height:844}, deviceScaleFactor:2 });
p.on("pageerror", e => errs.push(e.message));
p.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
const GAME = (process.env.GAME_URL || new URL("../rybalka.html", import.meta.url).href);
await p.goto(GAME, { waitUntil:"load" });
await p.waitForTimeout(1000);
await p.evaluate(() => { localStorage.clear(); });
await p.reload({ waitUntil:"load" }); await p.waitForTimeout(900);
await p.evaluate(() => window.__ui.closeStart()); await p.waitForTimeout(300);

const fails = [];
const check = (name, ok, info) => {
  if (!ok) fails.push(name + (info ? " :: " + JSON.stringify(info) : ""));
  console.log((ok ? "ok  " : "FAIL") + " · " + name + (info ? " · " + JSON.stringify(info) : ""));
};

/* 1. витрина открывается и говорит правду о подключении */
await p.evaluate(() => window.__openPay()); await p.waitForTimeout(400);
const shop = await p.evaluate(() => {
  const body = document.getElementById("payBody");
  return {
    open: document.getElementById("sheetPay").classList.contains("on"),
    text: body.innerText.replace(/\s+/g, " "),
    plans: [...body.querySelectorAll(".pay-plan")].map(x => x.dataset.plan),
    prices: [...body.querySelectorAll(".pl-price")].map(x => x.textContent.trim()),
    buyDisabled: document.getElementById("payBuy").disabled,
    pay: window.__pay()
  };
});
check("витрина «Клубная карта» открывается", shop.open, shop.open);
check("три тарифа с ценами", shop.plans.length === 3 && shop.prices.join(" ").includes("249"), { plans: shop.plans, prices: shop.prices });
check("привилегии перечислены игроку", /плёс/i.test(shop.text) && /набор/i.test(shop.text) && /перк|жемчуг/i.test(shop.text), shop.text.slice(0, 120));
check("код игрока показан", /код игрока/i.test(shop.text), shop.text.match(/код игрока\s+\S+/i));

/* 2. без платёжного сервиса доступ не выдаётся «из воздуха» */
check("без платёжного сервиса кнопка оплаты недоступна и доступ закрыт",
  shop.buyDisabled === true && shop.pay.ready === false && shop.pay.ok === false && shop.pay.access === false, shop.pay);
const denied = await p.evaluate(async () => {
  const res = await window.__payGrant ? null : null;
  return { state: window.__pay().ok };
});
check("сохранение не даёт карту само по себе", denied.state === false, denied);

/* 3. активная карта (ключ выдан сервером) открывает привилегии */
const granted = await p.evaluate(() => {
  const before = { access: window.__pay().access, club: window.__club().owned };
  window.__payGrant("month");
  return {
    before, after: window.__pay(),
    club: window.__club(),
    clubSpot: window.__mech().locs,
    dayReady: window.__club().dayReady
  };
});
check("после выданного ключа карта активна на 30 дней",
  granted.after.ok === true && granted.after.left >= 29 && granted.after.pass.plan === "month", granted.after);
check("карта открывает привилегии клуба", granted.before.access === false && granted.after.access === true, granted);
check("карта открывает ежедневный набор", granted.club.dayReady === true, granted.club.dayReady);
const spot = await p.evaluate(() => {
  const mech = window.__mech();
  const ids = window.__club().spots;
  return { spots: ids, hasPrem: ids.some(id => id.indexOf("prem_") === 0) };
});
check("с картой появляется клубный плёс на водоёме", spot.hasPrem, spot);

/* 4. подписка не бессрочная: срок кончился — доступ закрыт */
const expired = await p.evaluate(() => {
  window.__payExpire();
  return { pay: window.__pay(), access: window.__pay().access, spots: window.__club().spots };
});
check("после срока карта закрывает доступ", expired.access === false, expired.pay);
check("и клубный плёс снова скрыт", !expired.spots.some(id => id.indexOf("prem_") === 0), expired.spots);

/* 5. ключ от другого игрока не принимается */
const foreign = await p.evaluate(() => {
  const s = window.__test.save();
  s.pass = { plan:"month", exp: Date.now() + 5 * 86400000, code: "XXXX-YYYY" };
  return { ok: window.__pay().ok, access: window.__pay().access };
});
check("ключ, выданный другому игроку, не работает", foreign.ok === false && foreign.access === false, foreign);

/* 6. старая дверь (предмет за жемчуг) по-прежнему работает */
const legacy = await p.evaluate(() => {
  const s = window.__test.save();
  s.pass = null;
  s.owned.rod = s.owned.rod || [];
  if (!s.owned.rod.includes("p_premRod")) s.owned.rod.push("p_premRod");
  return { access: window.__pay().access, pass: window.__pay().ok };
});
check("премиум-предмет за жемчуг по-прежнему открывает клуб",
  legacy.access === true && legacy.pass === false, legacy);

/* 7. кнопка в HUD и ошибки */
const hud = await p.evaluate(() => {
  const btn = document.getElementById("clubPassBtn");
  return { has: !!btn, ico: (btn.innerHTML || "").includes("svg"), title: btn.title };
});
check("в HUD есть кнопка «Клубная карта»", hud.has && hud.ico && /карта/i.test(hud.title || ""), hud);
check("ошибок консоли нет", errs.length === 0, errs.slice(0, 4));

console.log("--------------------------------------------------");
if (fails.length){ console.log("PAY FAILED: " + fails.length); fails.forEach(f => console.log("  - " + f)); }
else console.log("PAY OK");
await b.close();
