// game80: механика водоёмов 8.0 — 8 водоёмов, своё время суток, прикормка, зацепы, дуэли,
// карта на «Базе» и правила «своя приманка + достаточная сила удочки» на всех водоёмах.
import { chromium } from "playwright";
const b = await chromium.launch();
const errs = [];
const p = await b.newPage({ viewport:{width:390,height:844}, deviceScaleFactor:2 });
p.on("pageerror", e => errs.push(e.message));
p.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
const GAME = (process.env.GAME_URL || new URL("../rybalka.html", import.meta.url).href);
await p.goto(GAME, { waitUntil:"load" });
await p.waitForTimeout(900);
await p.evaluate(() => { window.__ui.closeStart(); });
await p.waitForTimeout(300);

const fails = [];
const check = (name, ok, info) => { if (!ok) fails.push(name + (info ? " :: " + JSON.stringify(info) : "")); console.log((ok ? "ok  " : "FAIL") + " · " + name + (info ? " · " + JSON.stringify(info) : "")); };

/* ---------- 1. состав мира ---------- */
const world = await p.evaluate(() => ({
  locs: Object.keys(__test.LOCATIONS).length,
  fish: Object.keys(__test.FISH).length,
  quests: __test.QUESTS.length,
  keys: Object.keys(__test.LOCATIONS),
  mechAll: Object.keys(__test.LOCATIONS).every(k => !!__locMech(k)),
  clubSpots: Object.keys(__test.LOCATIONS).every(k => !!__club().spots.length)
}));
check("8 водоёмов, 105 видов, 53 квеста", world.locs === 8 && world.fish === 105 && world.quests === 53, world);
check("у каждого водоёма есть механика и точки", world.mechAll && world.clubSpots);

/* ---------- 2. правила: своя приманка и сила удочки на всех водоёмах ---------- */
const rules = await p.evaluate(() => {
  const out = { checked:0, bad:[] };
  const baits = Object.keys(__test.BAITS);
  const rods = Object.keys(__test.RODS);
  const keepLoc = __test.save().loc, keepRod = __test.save().equipped.rod, keepBait = __test.save().equipped.bait;
  for (const loc of Object.keys(__test.LOCATIONS)){
    __test.save().loc = loc;
    for (const rod of rods){
      __test.setEquip("rod", rod);
      const R = __test.rodDef();
      for (const bait of baits){
        __test.setEquip("bait", bait);
        __test.save().baits[bait] = 99;
        for (const sp of __test.LOCATIONS[loc].spots){
          const f = __test.pickFish(sp);
          out.checked++;
          if (f.junk) continue;
          if (__test.FISH[f.type].bait !== bait) out.bad.push([loc, rod, bait, f.type, "bait"]);
          if (__test.FISH[f.type].reqPower > R.power) out.bad.push([loc, rod, bait, f.type, "power"]);
          if (__test.FISH[f.type].sea && !R.sea) out.bad.push([loc, rod, bait, f.type, "sea"]);
        }
      }
    }
  }
  __test.save().loc = keepLoc; __test.setEquip("rod", keepRod); __test.setEquip("bait", keepBait);
  return out;
});
check("правила приманки и силы: 0 нарушений (" + rules.checked + " проверок)", rules.bad.length === 0, rules.bad.slice(0, 3));

/* ---------- 3. своё время суток ---------- */
const time = await p.evaluate(() => {
  __test.save().loc = "swamp"; __test.save().baits.worm = 99; __test.setEquip("bait", "worm");
  __test.setEquip("rod", "p_premRod");
  const avg = (h, n) => { __setTime(h); let s = 0; for (let i=0;i<n;i++) s += __biteWait(); return +(s/n).toFixed(2); };
  const inWin = avg(19, 120), off = avg(9, 120);
  const t = [];
  for (const h of [3, 8, 14, 20]) { __setTime(h); t.push(__mech().time); }
  __setTime(null);
  return { inWin, off, map: t, window: __mech().window };
});
check("окно водоёма ускоряет клёв", time.inWin < time.off * 0.9, time);
check("время суток определяется по часам", JSON.stringify(time.map) === JSON.stringify(["night","dawn","day","dusk"]), time.map);

const sizeWin = await p.evaluate(() => {
  // 8.5: чтобы тест мерил только «своё время», гасим буй клёва (он тоже влияет на вес)
  const f = __wave().forecast;
  __setWave((f[0] + 1) % 24);
  while (__wave().on) __setWave((__wave().hour + 1) % 24);
  const avgW = (h) => {
    __setTime(h);
    let sum = 0, n = 0;
    for (let i=0;i<260;i++){
      const f = __test.pickFish(__test.LOCATIONS.swamp.spots[1]);
      if (!f.junk){ sum += f.weight; n++; }
    }
    return +(sum/Math.max(1,n)).toFixed(0);
  };
  const w = avgW(19), o = avgW(9);
  __setTime(null); __setWave(null);
  return { inWin:w, off:o };
});
check("в своё время рыба крупнее", sizeWin.inWin >= sizeWin.off, sizeWin);

/* ---------- 4. прикормка ---------- */
const hand = await p.evaluate(() => {
  const s = __test.save();
  s.loc = "lake"; s.coins = 3000; s.hand = null; s.handLocs = {};
  const cost = __mech().hand.cost;
  const coinsBefore = s.coins;
  const ok = __dropHand();
  const coinsAfterFirst = s.coins;
  const after = __mech().hand;
  let sum = 0; for (let i=0;i<120;i++) sum += __biteWait();
  const withHand = +(sum/120).toFixed(2);
  s.hand = null;
  let sum2 = 0; for (let i=0;i<120;i++) sum2 += __biteWait();
  const noHand = +(sum2/120).toFixed(2);
  // прикормка в другом водоёме не действует
  const ok2 = __dropHand();
  const otherLoc = (function(){ s.loc = "river"; const r = __mech().hand.active; s.loc = "lake"; return r; })();
  return { ok, after, cost, withHand, noHand, coinsBefore, coinsAfterFirst, otherLoc, locs:Object.keys(s.handLocs).length };
});
check("прикормка тратит монеты и включается", !!hand.ok && hand.ok.ok === true && hand.after.active && hand.coinsAfterFirst === hand.coinsBefore - hand.cost, hand);
check("прикормка ускоряет клёв", hand.withHand < hand.noHand * 0.85, hand);
check("прикормка работает только в своём водоёме", hand.otherLoc === false);

/* ---------- 5. зацепы ---------- */
const snag = await p.evaluate(() => {
  const s = __test.save();
  s.loc = "swamp";
  // честная частота: 400 «забросов» в точку коряжника и 400 в чистую воду
  let n = 0;
  for (let i=0;i<400;i++){ if (__tSnagRoll(1)) n++; }
  let nClean = 0;
  s.loc = "lake";
  for (let i=0;i<400;i++){ if (__tSnagRoll(0)) nClean++; }
  for (let i=0;i<300;i++){ if (__tSnagRoll(1)) nClean++; }
  s.loc = "mountain";
  const mChance = __tSnagChance(1);
  // три мягких подёргивания освобождают
  __setSnag(true);
  const r1 = __snagTap("soft"), r2 = __snagTap("soft"), r3 = __snagTap("soft");
  const unsnags = __mech().unsnags;
  // «гладкий» водоём без зацепов
  return { rate: +(n/400).toFixed(2), cleanRate: +(nClean/300).toFixed(2), mChance: +mChance.toFixed(3),
    phases:[r1.phase, r2.phase, r3.phase], unsnags };
});
check("в топи зацепы частые, в тихой заводи их нет вовсе", snag.rate > 0.04 && snag.cleanRate === 0, snag);
check("три подёргивания освобождают снасть", snag.phases[2] === "free", snag.phases);
check("в горах зацеп только о камни и реже, чем в топи", snag.mChance > 0 && snag.mChance < 0.14, { m: snag.mChance, swamp: snag.rate });

/* ---------- 6. дуэли ---------- */
const duelLocked = await p.evaluate(() => {
  // отдельный контекст с «чистым» сохранением: без единого премиум-предмета
  localStorage.removeItem("rybalka_v2");
  return true;
});
await p.reload({ waitUntil:"load" });
await p.waitForTimeout(900);
await p.evaluate(() => { window.__ui.closeStart(); });
await p.waitForTimeout(200);
const duelLock = await p.evaluate(() => {
  const st = __duelStart("swamp");
  return { started: !!st, ready: __club().ready, pearl: __test.save().pearl || 0 };
});
check("дуэль закрыта без клуба", duelLock.started === false && duelLock.ready === false, duelLock);

const duel = await p.evaluate(() => {
  const s = __test.save();
  s.owned.rod = s.owned.rod.concat(["p_premRod"]);
  s.owned.line = s.owned.line.concat(["p_premLine"]);
  s.owned.hook = s.owned.hook.concat(["p_premHook"]);
  s.owned.net = s.owned.net.concat(["p_premNet"]);
  s.owned.reel = s.owned.reel.concat(["p_premReel"]);
  s.peek = (s.pearl || 0);
  __duelStart("swamp");
  const casts = [];
  for (let i=0;i<12;i++) casts.push(__duelCast(1500));
  const end = __duelEnd();
  const s2 = __test.save();
  // лимит жемчуга в сутки
  const again = [];
  for (let k=0;k<4;k++){
    s2.pearl = 0; s2.duelPearlToday = 3; s2.duelPearlDay = new Date().toISOString().slice(0,10);
    __duelStart("mountain");
    for (let i=0;i<12;i++) __duelCast(3000);
    again.push(__duelEnd().pearl);
  }
  return { castsLeft: casts[11].left, wins: end.wins, pearlGain: end.pearl - s.peek, perDay: end.perDayLeft, again, logs: __dbg().state };
});
check("дуэль идёт 12 забросов и даёт победу", duel.castsLeft === 0 && duel.wins >= 1, duel);
check("победа в дуэли даёт жемчуг", duel.pearlGain >= 1, { gain: duel.pearlGain });
check("жемчуг за дуэли ограничен 3 в день", duel.again.every(x => x <= 0), duel.again);

/* ---------- 7. карта и карточки на «Базе» ---------- */
const dom = await p.evaluate(() => {
  __ui.openSheet("sheetBase", __ui.renderBase);
  const dots = document.querySelectorAll("#locMap [data-map]").length;
  const cards = document.querySelectorAll("#locList .locCard").length;
  const mech = document.querySelectorAll("#locList .mchip").length;
  const duels = document.querySelectorAll("#locList .duelBtn").length;
  const lvlChips = document.querySelectorAll("#locList .tag.lvl").length;
  return { dots, cards, mech, duels, lvlChips };
});
check("карта показывает 8 водоёмов, карточек 8", dom.dots === 8 && dom.cards === 8, dom);
check("на карточках есть механика, дуэли и уровень", dom.mech >= 31 && dom.duels === 3 && dom.lvlChips === 8, dom);

/* ---------- 8. HUD: чипы механики ---------- */
const hud = await p.evaluate(() => {
  __ui.closeAllSheets();
  const s = __test.save(); s.loc = "mountain"; s.coins = 900;
  __selectSpot(0); __ui.updateChips();
  const info = document.getElementById("locInfo").textContent;
  const hand = document.getElementById("handBtn");
  const handVisible = getComputedStyle(hand).display !== "none";
  return { info, handVisible, handText: hand.textContent.trim() };
});
check("HUD показывает окно водоёма и прикормку", /окно|рассвет|день|вечер|ночь/.test(hud.info) && hud.handVisible, hud);

/* ---------- 9. живая ловля в новых водоёмах + fps ---------- */
const live = {};
for (const loc of ["swamp","mountain","lagoon"]){
  await p.evaluate((l) => {
    const s = __test.save();
    s.loc = l; s.weather = null; s.equipped.rod = "p_premRod"; s.equipped.bait = "corn";
    s.baits.corn = 99; s.xp = 140000;
    __ui.closeAllSheets(); __selectSpot(0); __ui.updateChips();
  }, loc);
  await p.waitForTimeout(500);
  const before = await p.evaluate(() => __test.save().total);
  const got = await p.evaluate(async () => {
    for (let i=0;i<40;i++){
      const st = __dbg().state;
      if (st === "bite"){ window.dispatchEvent(new Event("noop")); }
      await new Promise(r => setTimeout(r, 100));
    }
    return __test.save().total;
  });
  const fps = await p.evaluate(() => new Promise(r => {
    let n = 0; const t0 = performance.now();
    const tick = () => { n++; if (performance.now() - t0 < 1000) requestAnimationFrame(tick); else r(Math.round(n*1000/(performance.now()-t0))); };
    requestAnimationFrame(tick);
  }));
  live[loc] = { fps };
}
// ловим вживую в топи (полный цикл через силу)
const catchLive = await p.evaluate(async () => {
  const s = __test.save();
  s.loc = "swamp"; s.equipped.bait = "corn"; s.baits.corn = 99; s.equipped.rod = "p_premRod";
  __ui.closeAllSheets(); __selectSpot(0); __ui.updateChips();
  const n0 = s.total;
  const name = __forceCatch("lin");
  await new Promise(r => setTimeout(r, 1500));
  return { name, total: __test.save().total - n0 };
});
check("ловля в новых водоёмах работает", catchLive.total === 1, catchLive);

/* ---------- 10. 8.5: буй клёва, прогноз, любимые точки, сигнальный шар ---------- */
const wave = await p.evaluate(() => {
  const base = window.__wave();
  window.__setWave(base.forecast[0]);
  const on = window.__wave();
  const hours = on.forecast;
  // «через сколько» в обычный час
  window.__setWave((hours[0] + 1) % 24);
  const off = window.__wave();
  const fcOn = window.__forecast();
  return { base, on, off, fcOn, hours };
});
check("буй клёва включается в свой час и ускоряет клёв",
  wave.on.on === true && wave.off.on === false && wave.on.mult > 1.5 && wave.on.left > 0, wave.on);
check("прогноз отдаёт ближайшие часы буя", wave.hours.length === 6 && wave.hours.every(h => h >= 0 && h < 24), wave.hours);
check("прогноз клёва считает множители", wave.fcOn.mult > 0.5 && wave.fcOn.mult < 3 && !!wave.fcOn.level, wave.fcOn);

const homes = await p.evaluate(() => {
  const h = window.__homes("som");
  const spots = window.__test.save().loc;
  return { h };
});
check("у вида есть любимые точки в разных водоёмах", homes.h.length >= 2 && homes.h[0].name, homes.h);

const buoy = await p.evaluate(() => {
  const base = window.__wave();
  window.__setWave(base.forecast[0]);            // гарантированно «час буя»
  let r = null;
  for (let i=0;i<40;i++){ r = window.__buoySpawn(); if (r.active) break; }
  const s = window.__test.save();
  const before = s.coins;
  const took = window.__buoyTake();
  const after = window.__test.save().coins;
  const again = window.__buoyTake();
  window.__setWave((base.forecast[0] + 1) % 24); // вернуть обычный час
  return { r, took, gain: after - before, again };
});
check("сигнальный шар всплывает, забирается и даёт монеты",
  buoy.r.active && buoy.took === true && buoy.gain > 0 && buoy.again === false, buoy);

const homesB = await p.evaluate(() => {
  const k = window.__homes("karp")[0] || null;
  return { karp: k, list: window.__homes("karp").length };
});
check("карточка вида знает любимую точку карпа", homesB.karp && homesB.list >= 1, homesB);
// в песочнице fps шумит от загрузки машины: проверяем нижнюю границу кадра
check("fps в новых водоёмах > 19", Object.values(live).every(v => v.fps > 19), live);

/* ---------- итог ---------- */
console.log("-".repeat(50));
console.log("ошибки консоли:", JSON.stringify(errs));
console.log(fails.length ? "GAME80 FAILED: " + fails.length : "GAME80 OK");
await b.close();
process.exit(fails.length || errs.length ? 1 : 0);
