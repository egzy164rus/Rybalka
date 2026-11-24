// 7.5: наживка дня, лучший день водоёма, серия точных подсечек, двойной заход, 42 квеста
import { chromium } from "playwright";
const GAME = (process.env.GAME_URL || new URL("../rybalka.html", import.meta.url).href);
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:430,height:860}, deviceScaleFactor:2 });
const errs=[]; p.on("pageerror",e=>errs.push(e.message));
await p.goto(GAME); await p.waitForTimeout(1100);
await p.click("#btnStart"); await p.waitForTimeout(500);

// 1) наживка дня: есть, стабильна в течение дня, зависит от водоёма
const day = await p.evaluate(async ()=>{
  const a = window.__day();
  const a2 = window.__day();
  const lake = window.__test.save().loc;
  window.__test.save().loc = "sea";
  const sea = window.__day().bait;
  window.__test.save().loc = lake;
  return { bait:a.bait, same: a.bait === a2.bait, sea, locDayName: a.locDayName, days: a.days };
});
console.log("1) наживка дня:", JSON.stringify(day));

// 2) наживка дня ускоряет поклёвку: сравниваем среднее ожидание на двух приманках, которые тут работают
const speed = await p.evaluate(async ()=>{
  const s = window.__test.save();
  const dayBait = window.__day().bait;
  const FISH = window.__test.FISH;
  const fishId = Object.keys(FISH).find(k => FISH[k].bait === dayBait);
  const other = Object.keys(FISH).find(k => FISH[k].bait !== dayBait && FISH[k].reqPower <= 70);
  s.baits = {}; s.baits[dayBait] = 200; s.baits[FISH[other].bait] = 200;
  const spot = window.__spotById(window.__club().spots[1]);
  const measure = (bait) => {
    s.equipped.bait = bait;
    let sum = 0, n = 0;
    for (let i=0;i<40;i++){ const w = window.__biteWait(); if (w < 900){ sum += w; n++; } }
    return n ? sum/n : 0;
  };
  // точка, где наживка дня вообще работает
  const spots = window.__test.LOCATIONS[s.loc].spots;
  let useSpot = spots[0];
  for (const sp of spots){
    const has = Object.keys(sp.w).some(k => FISH[k] && FISH[k].bait === dayBait);
    if (has){ useSpot = sp; break; }
  }
  window.__selectSpot(spots.indexOf(useSpot));
  const on = measure(dayBait);
  // контроль: приманка, которая тоже берёт рыбу в этой точке, но не «дня»
  const spotW = useSpot.w;
  const alt = Object.keys(spotW).map(k => FISH[k].bait).find(bt => bt !== dayBait);
  if (alt) s.baits[alt] = 400;         // контрольной приманке тоже даём запас
  const off = alt ? measure(alt) : 0;
  return { dayBait, alt, meanOnDay: +on.toFixed(2), meanOff: +off.toFixed(2) };
});
console.log("2) скорость поклёвки (наживка дня / другая):", JSON.stringify(speed));

// 3) серия точных подсечек копится в реальном вываживании и даёт множитель
await p.evaluate(()=>{const s=window.__test.save(); s.baits={shell:60,worm:60}; s.equipped.bait="shell";
  s.seenCoach={c_power:1,c_bite:1,c_fight:1}; window.__test.persist();});
await p.reload(); await p.waitForTimeout(1300); await p.click("#btnStart"); await p.waitForTimeout(800);
const B = await p.evaluate(()=>{const r=document.getElementById("action").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};});
await p.mouse.move(B.x,B.y); await p.mouse.down(); await p.waitForTimeout(450); await p.mouse.up();
let held=false, peak=0, streakRowOn=false, multipliers=[];
for (let i=0;i<2500;i++){
  const s = await p.evaluate(()=>window.__dbg());
  if (s.state==="waiting"){ await p.waitForTimeout(90); }
  else if (s.state==="bite"){ await p.mouse.down(); await p.waitForTimeout(70); await p.mouse.up(); }
  else if (s.state==="fight"){
    if (s.tension<0.67 && !held){ await p.mouse.down(); held=true; }
    else if (s.tension>=0.72 && held){ await p.mouse.up(); held=false; }
    await p.waitForTimeout(55);
    const h = await p.evaluate(()=>({ row: document.getElementById("streakRow").classList.contains("on"),
      val: document.getElementById("streakVal").textContent, dbg: window.__dbg() }));
    if (h.row){ streakRowOn = true; multipliers.push(h.val); }
    peak = Math.max(peak, h.dbg.streak || 0);
  }
  else if (s.state==="result"){
    if (held){ await p.mouse.up(); held=false; }
    await p.waitForTimeout(1200);
    peak = Math.max(peak, await p.evaluate(()=>window.__dbg().bestStreak || 0));
    break;
  }
  else if (["aim","idle"].includes(s.state)) break;
}
console.log("3) серия:", JSON.stringify({ streakRowOn, peak, sample: multipliers.slice(-3) }));

// 4) двойной заход на наживку дня: доля ~15%
const dbl = await p.evaluate(async ()=>{
  const s = window.__test.save();
  const dayBait = window.__day().bait;
  const FISH = window.__test.FISH;
  const fishId = Object.keys(FISH).find(k => FISH[k].bait === dayBait);
  s.baits[dayBait] = 400;
  const before = window.__debugLog().filter(x=>x.name==="dayDouble").length;
  for (let i=0;i<40;i++){ window.__forceCatch(fishId); }
  const after = window.__debugLog().filter(x=>x.name==="dayDouble").length;
  return { n: after - before, of: 40 };
});
console.log("4) двойной заход:", JSON.stringify(dbl));

// 5) квесты 7.5 на месте
const quests = await p.evaluate(()=>{
  const ids = ["q_daybait","q_precise","q_streak"];
  const all = window.__test.QUESTS.map(q=>q.id);
  return { total: all.length, found: ids.filter(i=>all.includes(i)) };
});
console.log("5) квесты:", JSON.stringify(quests));

// 6) правила приманки и силы удочки не тронуты
const rule = await p.evaluate(()=>{
  const T = window.__test, s = window.__test.save();
  let checks = 0, bad = 0;
  for (const loc of ["lake","river","night","winter","sea"]){
    s.loc = loc;
    const spot = window.__spotById(T.LOCATIONS[loc].spots[0].id);
    for (const rodId of Object.keys(T.RODS)) for (const bait of Object.keys(T.BAITS)){
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
console.log("6) правила:", JSON.stringify(rule));
console.log("ERRS", JSON.stringify(errs));
await b.close();
