// 7.4: преимущества клуба — набор по рангу, клубный случай, бонус за точный заброс, цель дня, перк опыта
import { chromium } from "playwright";
const GAME = (process.env.GAME_URL || new URL("../rybalka.html", import.meta.url).href);
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:430,height:860}, deviceScaleFactor:2 });
const errs=[]; p.on("pageerror",e=>errs.push(e.message));
const club = () => p.evaluate(()=>window.__club());
const save0 = () => p.evaluate(()=>window.__test.save());

await p.goto(GAME); await p.waitForTimeout(1000);
await p.click("#btnStart"); await p.waitForTimeout(400);

// 1) без клуба: перки нулевые, набора нет
const zero = await club();
console.log("1) без клуба:", JSON.stringify({owned:zero.owned, perks:zero.perks, dayReady:zero.dayReady}));

// покупаем все 5 предметов
await p.evaluate(()=>{const s=window.__test.save(); s.pearl=30; s.xp=140000;
  const ids={rod:"p_premRod", line:"p_premLine", hook:"p_premHook", net:"p_premNet", reel:"p_premReel"};
  for (const k in ids){ if(!s.owned[k]) s.owned[k]=[]; if(!s.owned[k].includes(ids[k])) s.owned[k].push(ids[k]); s.equipped[k]=ids[k]; }
  window.__test.persist();});
await p.reload(); await p.waitForTimeout(1300); await p.click("#btnStart"); await p.waitForTimeout(700);
const full = await club();
console.log("2) клуб 5:", JSON.stringify({lvl:full.lvl, rank:full.rank, perks:full.perks, dayReward:full.dayReward}));

// 3) набор по рангу: начисляется столько, сколько обещает карточка
const day = await p.evaluate(()=>{
  const before = {...window.__test.save()};
  const rw = window.__club().dayReward;
  window.__ui.openSheet("sheetQuests", window.__ui.renderQuests);
  document.getElementById("clubDayBtn").click();
  const after = window.__test.save();
  return { rw, coins: after.coins - before.coins, xp: after.xp - before.xp, pearl: after.pearl - before.pearl,
           bait: Object.keys(rw.baits).map(id => (after.baits[id]||0) - (before.baits[id]||0)),
           second: window.__club().dayReady };
});
console.log("3) набор:", JSON.stringify(day));

// 4) бонус за точный заброс на плёс — раз в сутки
const visit = await p.evaluate(()=>{
  const s = window.__test.save();
  window.__ui.closeAllSheets();
  s.loc = "lake";
  const idx = window.__club().spots.indexOf("prem_lake");
  window.__selectSpot(idx);
  const sp = window.__club().spots;
  const before = s.coins;
  const ok = window.__club().visitReady;
  return { idx, spot: window.__selectSpot && window.__club().spots, before, ok };
});
await p.evaluate(()=>{ const sp = window.__spotById("prem_lake"); });
// заброс в зелёную зону через реальный API игры
const visitRes = await p.evaluate(async ()=>{
  const s = window.__test.save();
  const before = s.coins;
  const idx = window.__club().spots.indexOf("prem_lake");
  window.__selectSpot(idx);
  // сила ровно в середине зелёной зоны
  const sp = window.__spotById("prem_lake");
  window.__castAt((sp.sweet[0]+sp.sweet[1])/2);
  await new Promise(r=>setTimeout(r,250));
  const after = window.__test.save();
  return { before, after: after.coins, visitKey: !!after.clubVisit, gain: after.coins - before };
});
console.log("4) бонус за заброс:", JSON.stringify(visitRes));

// 5) клубный случай: приманка под плёс, раз в сутки
const luck = await p.evaluate(async ()=>{
  const s = window.__test.save();
  s.clubLuck = null; window.__test.persist();
  const idx = window.__club().spots.indexOf("prem_lake");
  window.__selectSpot(idx);
  window.__forceCatch("karp");
  await new Promise(r=>setTimeout(r,1600));
  const saved = window.__test.save();
  const row = document.getElementById("clubLuckRow");
  const out = { ready: window.__club().luckReady, day: saved.clubLuck,
    row: row ? row.textContent.replace(/\s+/g," ").trim() : null };
  return out;
});
console.log("5) клубный случай:", JSON.stringify(luck));

// 6) цель дня: 3 рыбы на плёсе → награда
const goal = await p.evaluate(async ()=>{
  const s = window.__test.save(); s.clubGoal = 0; s.clubGoalDone = false; window.__test.persist();
  const idx = window.__club().spots.indexOf("prem_lake");
  for (const id of ["karp","som","sudak"]){
    window.__selectSpot(idx);
    window.__forceCatch(id);
    await new Promise(r=>setTimeout(r,1500));
  }
  const g = window.__club().goal;
  const before = {...window.__test.save()};
  window.__ui.openSheet("sheetQuests", window.__ui.renderQuests);
  const btn = document.getElementById("clubGoalBtn");
  if (btn) btn.click();
  const after = window.__test.save();
  return { goal: g, hadBtn: !!btn, coins: after.coins - before.coins, pearl: after.pearl - before.pearl,
           done: window.__club().goal.done };
});
console.log("6) цель дня:", JSON.stringify(goal));

// 7) перк опыта: +12% к опыту улова
const xpPerk = await p.evaluate(async ()=>{
  const before = {...window.__test.save()};
  window.__selectSpot(0);
  window.__forceCatch("perch");
  await new Promise(r=>setTimeout(r,1500));
  const after = window.__test.save();
  const shown = document.getElementById("catchXp").textContent;
  return { perk: window.__club().perks.xp, shown, grew: after.xp - before.xp };
});
console.log("7) перк опыта:", JSON.stringify(xpPerk));

// 8) правила приманки и силы удочки на плёсе не сломались
const rule = await p.evaluate(()=>{
  const T = window.__test, s = window.__test.save();
  const baits = Object.keys(T.BAITS), rods = Object.keys(T.RODS);
  let checks = 0, bad = 0;
  for (const loc of ["lake","river","night","winter","sea"]){
    s.loc = loc;
    const spots = window.__club().spots;
    const id = spots.find(x => x.indexOf("prem_") === 0);
    const spot = window.__spotById(id);
    if (!spot) continue;
    for (const rodId of rods) for (const bait of baits){
      s.equipped.rod = rodId; s.equipped.bait = bait;
      let f = null; try { f = T.pickFish(spot); } catch(e){ continue; }
      checks++;
      if (f && !f.junk){
        const F = window.__fishDef(f.type);
        if (F.bait !== bait || F.reqPower > T.RODS[rodId].power) bad++;
      }
    }
  }
  s.loc = "lake"; s.equipped.rod = "sea"; s.equipped.bait = "corn"; window.__test.persist();
  return { checks, bad };
});
console.log("8) правила на плёсе:", JSON.stringify(rule));
console.log("ERRS", JSON.stringify(errs));
await b.close();
