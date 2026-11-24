// yandex: платформа Яндекс Игр — реклама, покупки через Яндекс Pay, облачные сохранения.
// SDK подменяется заглушкой: проверяем, что игра правильно его использует и не ломается без него.
import { chromium } from "playwright";
const b = await chromium.launch();
const errs = [];
const p = await b.newPage({ viewport:{width:390,height:844}, deviceScaleFactor:2 });
p.on("pageerror", e => errs.push(e.message));
p.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
const GAME = (process.env.GAME_URL || new URL("../rybalka.html", import.meta.url).href);
await p.goto(GAME, { waitUntil:"load" }); await p.waitForTimeout(900);
await p.evaluate(() => { localStorage.clear(); });
await p.reload({ waitUntil:"load" }); await p.waitForTimeout(900);
await p.evaluate(() => window.__ui.closeStart()); await p.waitForTimeout(300);

const fails = [];
const check = (name, ok, info) => {
  if (!ok) fails.push(name + (info ? " :: " + JSON.stringify(info) : ""));
  console.log((ok ? "ok  " : "FAIL") + " · " + name + (info ? " · " + JSON.stringify(info) : ""));
};

/* 1. без платформы игра работает и ничего не грузит извне */
const plain = await p.evaluate(() => ({
  yg: window.__yg(),
  external: [...document.scripts].map(s => s.src).filter(Boolean),
  state: window.__dbg().state
}));
check("без Яндекс SDK игра работает и внешних скриптов не грузит",
  plain.yg.ready === false && plain.external.length === 0 && plain.state === "idle", plain);

/* 2. SDK найден → реклама, покупки, облако */
const boot = await p.evaluate(async () => {
  window.__ads = { full: 0, reward: 0 };
  window.__cloud = { sets: 0, data: null };
  window.YaGames = { init: async () => ({
    environment: { i18n:{ lang:"ru" }, deviceInfo:{ type:"mobile" } },
    getPlayer: async () => ({
      getData: async () => ({}),
      setData: async (d) => { window.__cloud.sets++; window.__cloud.data = d; }
    }),
    getPayments: async () => ({
      getPurchases: async () => [],
      purchase: async (o) => { window.__lastBuy = o.id; return { purchaseToken:"tok" }; },
      consumePurchase: async () => true
    }),
    adv: {
      showFullscreenAdv: (o) => { window.__ads.full++; setTimeout(()=>o.callbacks.onClose(true), 10); },
      showRewardedVideo: (o) => { window.__ads.reward++; setTimeout(()=>{ o.callbacks.onRewarded(); o.callbacks.onClose(); }, 10); }
    }
  })};
  const info = await window.__ygInit();
  return info;
});
check("SDK инициализируется: игрок, покупки, язык и устройство",
  boot.ready === true && boot.payments === true && boot.player === true && boot.device === "mobile", boot);

/* 3. покупка карты через Яндекс Pay выдаёт доступ */
const buy = await p.evaluate(async () => {
  await window.__openPay();
  const r = await window.__ygBuy("pass_month");
  return { r, lastBuy: window.__lastBuy, pay: window.__pay() };
});
check("покупка «Клубная карта · месяц» идёт через Яндекс Pay",
  buy.r.ok === true && buy.lastBuy === "pass_month", buy);
check("после покупки привилегии открыты на 30 дней",
  buy.pay.ok === true && buy.pay.left >= 29 && buy.pay.access === true, buy.pay);

/* 4. реклама за награду даёт жемчуг, межстраничная — вызывается */
const ads = await p.evaluate(async () => {
  const before = window.__test.save().pearl || 0;
  await window.__openPay();
  document.getElementById("payAd").click();
  await new Promise(r => setTimeout(r, 120));
  const after = window.__test.save().pearl || 0;
  const ad = await window.__ygAd("interstitial");
  return { before, after, full: window.__ads.full, reward: window.__ads.reward, ad };
});
check("реклама за награду показана и дала жемчуг",
  ads.reward === 1 && ads.after === ads.before + 15, ads);
check("межстраничная реклама вызывается через SDK", ads.full >= 1 && ads.ad.ok === true, ads);

/* 5. облачное сохранение уходит в Яндекс */
const cloud = await p.evaluate(() => {
  window.__test.save().coins += 5; window.__test.persist();
  return window.__cloud;
});
check("прогресс дублируется в облако платформы", cloud.sets >= 1 && !!cloud.data && !!cloud.data.save, { sets: cloud.sets });

/* 6. витрина на платформе: кнопка «через Яндекс» и реклама вместо кода игрока */
const sheet = await p.evaluate(async () => {
  await window.__openPay();
  const body = document.getElementById("payBody");
  return { text: body.innerText.replace(/\s+/g," "), buy: document.getElementById("payBuy").textContent.trim(),
           hasAd: !!document.getElementById("payAd"), code: !!document.getElementById("payCode") };
});
check("на платформе оплата подписана «через Яндекс»", /Яндекс/.test(sheet.buy), sheet.buy);
check("на платформе есть кнопка «посмотреть рекламу»", sheet.hasAd && /жемчуг/i.test(sheet.text), sheet.text.slice(0, 140));
check("код игрока показываем только вне платформы", sheet.code === false, sheet.code);

/* 7. выключение платформы возвращает прежнее поведение */
const off = await p.evaluate(() => { window.__ygReset(); return window.__yg(); });
check("после сброса платформы игра снова офлайн-совместима", off.ready === false && off.payments === false, off);

check("ошибок консоли нет", errs.length === 0, errs.slice(0, 4));
console.log("--------------------------------------------------");
if (fails.length){ console.log("YANDEX FAILED: " + fails.length); fails.forEach(f => console.log("  - " + f)); }
else console.log("YANDEX OK");
await b.close();
