// club: премиум-слой за жемчуг — покупка навсегда, клубный плёс, уровни и перки,
// и главное правило: премиум только множит, а не отменяет приманку/силу удочки.
import { chromium } from "playwright";
const GAME = (process.env.GAME_URL || new URL("../rybalka.html", import.meta.url).href);
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:430,height:860}, deviceScaleFactor:2 });
const errs = []; p.on("pageerror", e => errs.push(e.message));
const fails = [];
const check = (n, ok, info) => { if (!ok) fails.push(n); console.log((ok ? "ok  " : "FAIL") + " · " + n + (info ? " · " + JSON.stringify(info) : "")); };

await p.goto(GAME); await p.waitForTimeout(1000);
await p.click("#btnStart"); await p.waitForTimeout(400);

// 1) до покупки клуба нет
const before = await p.evaluate(() => ({ ...window.__club(), pearl: window.__test.save().pearl || 0 }));
check("без премиума клуба нет", before.lvl === 0 && before.owned === false, { lvl: before.lvl });

// 2) покупка за жемчуг: списывает жемчуг и остаётся навсегда
const buy = await p.evaluate(() => {
  const s = window.__test.save();
  s.pearl = 40;
  const cost = 6;                     // «Лунный шёлк»
  const ok = s.pearl >= cost;
  if (ok){ s.pearl -= cost; s.owned.rod = (s.owned.rod || []).concat(["p_premRod"]); s.equipped.rod = "p_premRod"; }
  window.__test.persist();
  const c = window.__club();
  return { pearlLeft: s.pearl, lvl: c.lvl, owned: c.owned, rod: window.__test.rodDef().name, power: window.__test.rodDef().power };
});
check("покупка за жемчуг работает", buy.pearlLeft === 34 && buy.owned === true, buy);
check("премиум-удочка надевается", buy.power > 400, { rod: buy.rod, power: buy.power });

// 3) перезагрузка: предмет остаётся (навсегда)
await p.reload(); await p.waitForTimeout(900);
await p.click("#btnStart"); await p.waitForTimeout(400);
const after = await p.evaluate(() => ({
  owned: window.__club().owned, lvl: window.__club().lvl,
  rod: window.__test.rodDef().name, spots: window.__club().spots
}));
check("после перезагрузки премиум на месте", after.owned === true && /Лунный шёлк/.test(after.rod), after);
check("клубный плёс добавлен к точкам", after.spots.includes("prem_lake"), { spots: after.spots.length });

// 4) клубный уровень поднимается от количества предметов
const lvls = await p.evaluate(() => {
  const s = window.__test.save();
  const out = [];
  for (const id of ["p_premLine", "p_premHook", "p_premNet", "p_premReel"]){
    const slot = window.__test.PREMIUM[id.slice(2)].kind;
    s.owned[slot] = (s.owned[slot] || []).concat([id]);
    out.push({ id, lvl: window.__club().lvl });
  }
  window.__test.persist();
  return { out, rank: window.__club().rank, perks: window.__club().perks };
});
check("уровень клуба растёт до 5", lvls.out[lvls.out.length-1].lvl === 5, lvls.out);
check("перки клуба включаются", lvls.perks.pearl > 0 && lvls.perks.xp > 0, lvls.perks);

// 5) правило силы удочки не отменяется даже премиумом: слабая удочка — нет поклёвки
const rule = await p.evaluate(() => {
  const s = window.__test.save();
  const loc = window.__test.LOCATIONS.lake.spots[2];   // «Глубина»
  s.loc = "lake";
  window.__test.setEquip("rod", "bamboo");
  window.__test.setEquip("bait", "fishmeat");
  s.baits.fishmeat = 99;
  let strong = 0, weak = 0;
  for (let i=0;i<200;i++){
    const f = window.__test.pickFish(loc);
    if (f.junk) continue;
    if (window.__test.FISH[f.type].reqPower > window.__test.rodDef().power) weak++;
    else strong++;
  }
  const weakRodBad = weak;   // на бамбуке никто сильнее 70 г не должен клевать
  window.__test.setEquip("rod", "p_premRod");
  let over = 0;
  for (let i=0;i<200;i++){
    const f = window.__test.pickFish(loc);
    if (!f.junk && window.__test.FISH[f.type].reqPower > window.__test.rodDef().power) over++;
  }
  return { weakRodBad, over };
});
check("слабая удочка не берёт сильную рыбу", rule.weakRodBad === 0, rule);
check("премиум-удочка тоже подчиняется порогу", rule.over === 0, rule);

// 6) без премиума клубный плёс не показывается
const noClub = await p.evaluate(() => {
  localStorage.removeItem("rybalka_v2");
  return true;
});
await p.reload(); await p.waitForTimeout(800);
await p.click("#btnStart"); await p.waitForTimeout(300);
const plain = await p.evaluate(() => ({ spots: window.__club().spots, lvl: window.__club().lvl }));
check("без клуба плёс скрыт", plain.lvl === 0 && !plain.spots.includes("prem_lake"), { spots: plain.spots.length });

console.log("-".repeat(50));
console.log("ERRS", JSON.stringify(errs));
console.log(fails.length ? "CLUB FAILED: " + fails.join("; ") : "CLUB OK");
await b.close();
process.exit(fails.length || errs.length ? 1 : 0);
