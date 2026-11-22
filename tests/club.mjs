import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:430,height:860}, deviceScaleFactor:2 });
const errs=[]; p.on("pageerror",e=>errs.push(e.message));
p.on("console",m=>{ if(m.type()==="error") errs.push("console:"+m.text()); });
const GAME = (process.env.GAME_URL || new URL("../rybalka.html", import.meta.url).href);
await p.goto(GAME); await p.waitForTimeout(1100);
await p.click("#btnStart"); await p.waitForTimeout(400);

// 1) до покупки: клуб закрыт, клубной точки нет
const before = await p.evaluate(()=>window.__club());
console.log("до покупки:", JSON.stringify(before));

// 2) покупаем ВСЕ премиум-предметы как в игре (через магазин), проверяем уровень
const buy = await p.evaluate(async ()=>{
  const s = window.__test.save();
  s.pearl = 40; s.xp = 140000;
  if (!s.owned.rod) s.owned = { rod:[], reel:[], line:[], hook:[], bait:[], net:[] };
  if (!s.owned.reel) s.owned.reel = [];
  if (!s.owned.line) s.owned.line = [];
  if (!s.owned.hook) s.owned.hook = [];
  if (!s.owned.net) s.owned.net = [];
  // надеваем всё премиум и добавляем в owned — так же, как делает кнопка покупки
  // в игре премиум-предметы хранятся с префиксом p_: p_premRod и т.д.
  const ids = {rod:"p_premRod", line:"p_premLine", hook:"p_premHook", net:"p_premNet", reel:"p_premReel"};
  for (const kind in ids){
    if (!s.owned[kind].includes(ids[kind])) s.owned[kind].push(ids[kind]);
    s.equipped[kind] = ids[kind];
  }
  window.__test.persist();
  return window.__club();
});
console.log("после покупки всех 5:", JSON.stringify(buy));

// 3) клубный набор: забрать, повторить (второй раз не должен дублировать)
await p.reload(); await p.waitForTimeout(1200); await p.click("#btnStart"); await p.waitForTimeout(900);
const day = await p.evaluate(async ()=>{
  const s0 = window.__test.save(); const coins0 = s0.coins, pearl0 = s0.pearl;
  window.__ui.openSheet("sheetQuests", window.__ui.renderQuests);
  await new Promise(r=>setTimeout(r,300));
  const btn = document.getElementById("clubDayBtn");
  const ready = !!btn && !btn.disabled;
  if (btn) btn.click();
  await new Promise(r=>setTimeout(r,300));
  const s1 = window.__test.save();
  const again = await (async()=>{ const b2=document.getElementById("clubDayBtn"); if(!b2) return "no-btn"; b2.click(); await new Promise(r=>setTimeout(r,200)); return {coins:window.__test.save().coins}; })();
  window.__ui.closeAllSheets();
  return { ready, coinsGain: s1.coins - coins0, pearlGain: s1.pearl - pearl0,
           clubDay: s1.clubDay, secondClick: again, dayReadyAfter: window.__club().dayReady };
});
console.log("клубный набор:", JSON.stringify(day));

// 4) клубный плёс на всех водоёмах
const spots = await p.evaluate(()=>{
  const out = {};
  const s = window.__test.save();
  for (const loc of ["lake","river","night","winter","sea"]){ s.loc = loc; out[loc] = window.__club().spots; }
  s.loc = "lake"; window.__test.persist();
  return out;
});
console.log("точки по водоёмам:", JSON.stringify(spots));

// 5) правила не сломаны: на клубном плёсе рыба берёт только свою приманку и достаточную удочку
const rule = await p.evaluate(()=>{
  const T = window.__test, s = window.__test.save();
  const locs = ["lake","river","night","winter","sea"];
  const baits = Object.keys(T.BAITS);
  const rods = Object.keys(T.RODS);
  const FISH = window.__FISH || null;
  let checks = 0, bad = 0, samples = [];
  for (const loc of locs){
    s.loc = loc;
    const spots = window.__club().spots;
    const clubId = spots.find(id => id.indexOf("prem_") === 0);
    const spot = window.__spotById(clubId) || window.__spotById(spots[0]);
    if (!spot){ continue; }
    for (const rodId of rods){
      for (const bait of baits){
        s.equipped.rod = rodId; s.equipped.bait = bait;
        let f = null;
        try { f = T.pickFish(spot); } catch(e){ continue; }
        checks++;
        if (f && !f.junk){
          const F = window.__fishDef(f.type);
          const rod = T.RODS[rodId];
          if (F.bait !== bait || F.reqPower > rod.power){ bad++; if (samples.length<3) samples.push({loc, rodId, bait, got:f.type}); }
        }
      }
    }
  }
  s.loc = "lake"; s.equipped.rod = "sea"; s.equipped.bait = "corn"; window.__test.persist();
  return { checks, bad, samples };
});
console.log("правила на клубном плёсе:", JSON.stringify(rule));

console.log("ERRS", JSON.stringify(errs));
await b.close();
