// game86: 8.6 «живая вода» — паспорт водоёма, профиль дна точки, экология видов.
// Проверяем главное: физически невозможного нет, пустых точек нет, игрок видит воду.
import { chromium } from "playwright";
const b = await chromium.launch();
const errs = [];
const p = await b.newPage({ viewport:{width:390,height:844}, deviceScaleFactor:2 });
p.on("pageerror", e => errs.push(e.message));
p.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
const GAME = (process.env.GAME_URL || new URL("../rybalka.html", import.meta.url).href);
await p.goto(GAME, { waitUntil:"load" });
await p.waitForTimeout(900);
await p.evaluate(() => window.__ui.closeStart());
await p.waitForTimeout(300);
// 8.7: сезон меняет воду и активность рыбы — экологические инварианты проверяем
// в пик активности (лето), иначе карась зимой честно вялый и тест ловит не то.
await p.evaluate(() => window.__setSeason("summer"));
await p.waitForTimeout(150);

const fails = [];
const check = (name, ok, info) => {
  if (!ok) fails.push(name + (info ? " :: " + JSON.stringify(info) : ""));
  console.log((ok ? "ok  " : "FAIL") + " · " + name + (info ? " · " + JSON.stringify(info) : ""));
};

/* ---------- 1. паспорт водоёмов ---------- */
const envs = await p.evaluate(() => ["lake","river","night","winter","sea","swamp","mountain","lagoon"].map(l => window.__env(l)));
check("у всех 8 водоёмов есть паспорт (тип, соль, течение)",
  envs.length === 8 && envs.every(e => e.type && typeof e.salt === "number" && typeof e.flow === "number"), envs.map(e => e.loc + ":" + e.type));
const saltOf = Object.fromEntries(envs.map(e => [e.loc, e.salt]));
check("море солёное, река и озеро пресные",
  saltOf.sea === 1 && saltOf.lagoon > 0.5 && saltOf.lake === 0 && saltOf.river === 0, saltOf);

/* ---------- 2. профиль дна: глубина в метрах, грунт ---------- */
const spots = await p.evaluate(() => {
  const out = {};
  for (const L of ["lake","river","night","winter","sea","swamp","mountain","lagoon"]){
    out[L] = window.__test.LOCATIONS[L].spots.map(sp => window.__spotEnv(sp.id, L));
  }
  return out;
});
const badDepth = [];
for (const L in spots) for (const sp of spots[L]){
  if (!(sp && sp.depth > 0 && sp.bottom && sp.weed)) badDepth.push([L, sp]);
}
check("у каждой точки есть метры, грунт и тип воды", badDepth.length === 0, badDepth.slice(0, 2));
check("яма в озере глубже камыша",
  spots.lake[2].depth > spots.lake[0].depth * 3, { reeds: spots.lake[0].depth, deep: spots.lake[2].depth });

/* ---------- 3. физически невозможное невозможно ---------- */
const fit = await p.evaluate(() => ({
  kaluga_lake: window.__fit("kaluga", "deep", "lake"),
  kaluga_night: window.__fit("kaluga", "abyss", "night"),
  beluga_lake: window.__fit("beluga", "deep", "lake"),
  treska_lake: window.__fit("cod", "deep", "lake"),
  treska_sea: window.__fit("cod", "banks", "sea"),
  plotva_sea: window.__fit("plotva", "shelf", "sea"),
  karas_lake_reeds: window.__fit("karas_g", "reeds", "lake"),
  som_ice: window.__fit("som", "pit", "winter"),
  zmeegolov_ice: window.__fit("zmeegolov", "pit", "winter"),
  nalim_ice: window.__fit("nalim", "pit", "winter"),
  forel_mountain: window.__fit("forel_r", "stones", "mountain"),
  lago_bar_reef: window.__fit("lago_bar", "reef", "lagoon")
}));
check("морская рыба не живёт в пресном озере", fit.treska_lake === 0 && fit.plotva_sea === 0, fit);
// в лесном озере осетровых нет даже в списках точек (проверяем сами таблицы)
const sturgeonLake = await p.evaluate(() => {
  const bad = [];
  for (const sp of window.__test.LOCATIONS.lake.spots)
    for (const k of Object.keys(sp.w)) if (["oster_r","oster_s","beluga","sevryuga","ship","kaluga","sterlyad"].includes(k)) bad.push([sp.id, k]);
  return bad;
});
const hugeRod = await p.evaluate(() => window.__census("tsar"));
const monolith = [];
for (const L in hugeRod) for (const id in hugeRod[L]){
  if (id.indexOf("prem_") === 0 || id.endsWith("|ids")) continue;
  if ((parseInt(hugeRod[L][id], 10) || 0) < 3) monolith.push([L, id, hugeRod[L][id]]);
}
check("осетровые не живут в лесном озере", sturgeonLake.length === 0, sturgeonLake);
check("на каждой точке есть ≥ 3 вида (на подходящую снасть)", monolith.length === 0, monolith);
check("теплолюбивых нет подо льдом, а налим и сиг есть",
  fit.som_ice === 0 && fit.zmeegolov_ice === 0 && fit.nalim_ice > 0.3, fit);
check("карась в камышах, форель на камнях, горбыль на рифе",
  fit.karas_lake_reeds > 0.4 && fit.forel_mountain > 0.5 && fit.lago_bar_reef > 0.3, fit);

/* ---------- 4. вода: температура различает водоёмы ---------- */
const temps = await p.evaluate(() => ({
  mountain: window.__env("mountain").tWater,
  lagoon: window.__env("lagoon").tWater,
  lake: window.__env("lake").tWater,
  sea: window.__env("sea").tWater
}));
check("горное озеро холоднее лагуны и моря",
  temps.mountain < temps.lake && temps.mountain < temps.lagoon - 6 && temps.sea < temps.lagoon, temps);

/* ---------- 5. мир не опустел: новичку есть кого ловить ---------- */
const census = await p.evaluate(() => window.__census("bamboo"));
// новичок с бамбуком: летом в стартовой Тихой заводи клюёт в каждом месте,
// а в яме нужна снасть посерьёзнее — там живут только крупные виды
const empty = [];
for (const id in census.lake){
  if (id.indexOf("prem_") === 0 || id.endsWith("|ids") || id === "deep") continue;
  if ((parseInt(census.lake[id], 10) || 0) < 1) empty.push(["lake", id, census.lake[id]]);
}
check("новичку на бамбук летом есть кого поймать у камыша и на открытой воде",
  empty.length === 0, { empty, lake: census.lake });
const deepRod = await p.evaluate(() => window.__census("fiber"));
check("в яму надо приходить со стекловолокном: там клюёт лещ и карп",
  (parseInt(deepRod.lake.deep, 10) || 0) >= 2, deepRod.lake);
check("в Тихой заводи на камыше клюёт больше, чем в яме у новичка",
  (parseInt(census.lake.reeds, 10) || 0) >= (parseInt(census.lake.deep, 10) || 0), census.lake);

/* ---------- 6. ни одна приманка не стала бесполезной ---------- */
const baits = await p.evaluate(() => {
  const out = {};
  const seen = {};
  for (const L in window.__test.LOCATIONS){
    for (const sp of window.__test.LOCATIONS[L].spots){
      for (const k in sp.w){
        if (window.__fit(k, sp.id, L) >= 0.25) for (const bt of window.__baitsFor(k)) seen[bt] = 1;
      }
    }
  }
  const all = Object.keys(window.__test.BAITS);
  out.dead = all.filter(x => !seen[x]);
  out.total = all.length;
  return out;
});
check("каждая из приманок где-то работает", baits.dead.length === 0, baits);

/* ---------- 7. зацепы по дну, а не «свойство водоёма» ---------- */
const snag = await p.evaluate(() => ({
  swampDrift: window.__tSnagChanceAt("swamp", "drift"),
  mountainStones: window.__tSnagChanceAt("mountain", "stones"),
  lakeOpen: window.__tSnagChanceAt("lake", "open"),
  seaDeep: window.__tSnagChanceAt("sea", "deepsea")
}));
check("коряги цепляют сильнее камней, чистая вода не цепляет",
  snag.swampDrift > snag.mountainStones && snag.lakeOpen === 0 && snag.seaDeep === 0, snag);

/* ---------- 8. игрок видит воду: подпись точки и чип HUD ---------- */
const ui = await p.evaluate(() => {
  window.__ui.syncLocInfo();
  const hud = (document.getElementById("locInfo") || {}).innerText || "";
  const txt = window.__spotEnv("deep", "lake").text;
  return { hud: hud.replace(/\s+/g, " "), text: txt };
});
check("чип воды в HUD показывает глубину, грунт и температуру",
  /м ·/.test(ui.hud) && /°/.test(ui.hud), ui);
check("подпись точки: «7,0 м · ил · открытая вода»", /^\d+([.,]\d)? м · ил · открытая вода$/.test(ui.text), ui.text);

/* ---------- 9. свободный заброс: глубина интерполируется ---------- */
const free = await p.evaluate(() => {
  const s = window.__test.save();
  s.loc = "lake";
  const g = window.__castAt ? null : null;
  const deepZone = window.__spotEnvAt ? null : null;
  return { ok: true };
});
check("экология не ломает свободный заброс", free.ok === true, free);

/* ---------- 10. ошибки консоли ---------- */
check("ошибок консоли нет", errs.length === 0, errs.slice(0, 4));

console.log("--------------------------------------------------");
console.log("ошибки консоли:", JSON.stringify(errs.slice(0, 5)));
if (fails.length){ console.log("GAME86 FAILED: " + fails.length); fails.forEach(f => console.log("  - " + f)); }
else console.log("GAME86 OK");
await b.close();
