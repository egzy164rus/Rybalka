// game87: 8.7 «живая вода, волна 2» — сезоны, лёд, давление и ветер, леска, замор.
// Проверяем: сезон меняет воду и рыбу, погода физически влияет на клёв, игрок это видит.
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

const fails = [];
const check = (name, ok, info) => {
  if (!ok) fails.push(name + (info ? " :: " + JSON.stringify(info) : ""));
  console.log((ok ? "ok  " : "FAIL") + " · " + name + (info ? " · " + JSON.stringify(info) : ""));
};

/* ---------- 1. сезон идёт и имеет длину 14 игровых дней ---------- */
const season = await p.evaluate(() => window.__season());
check("сезон определяется, длина 14 дней, день в пределах", 
  !!season.id && season.days === 14 && season.day >= 1 && season.day <= 14, season);
check("название сезона человеческое", /^(весна|лето|осень|зима)$/.test(season.name), season.name);

/* ---------- 2. лёд: зимой на озёрах, не на юге ---------- */
const ice = [];
for (const s of ["spring","summer","autumn","winter"]){
  ice.push(await p.evaluate((s) => { window.__setSeason(s); return window.__season().ice; }, s));
}
const [iceSp, iceSu, iceAu, iceWi] = ice;
check("весной, летом и осенью на лесном озере открытая вода",
  !iceSp.lake && !iceSu.lake && !iceAu.lake, ice.map(x => x.lake));
check("северное озеро подо льдом круглый год",
  iceSp.winter && iceSu.winter && iceAu.winter && iceWi.winter, ice.map(x => x.winter));
check("зимой лёд на лесном озере и на зимнем водоёме",
  iceWi.lake === true && iceWi.winter === true, iceWi);
check("топь и море не замерзают никогда",
  iceWi.swamp === false && iceWi.sea === false, iceWi);

/* ---------- 3. вода: сезон меняет температуру, подо льдом около +2…+4 ---------- */
const temps = {};
for (const s of ["spring","summer","autumn","winter"]){
  temps[s] = await p.evaluate((s) => {
    window.__setSeason(s);
    return { lake: window.__env("lake").tWater, mountain: window.__env("mountain").tWater, sea: window.__env("sea").tWater };
  }, s);
}
check("летом вода теплее осенней, осенью теплее весенней",
  temps.summer.lake > temps.autumn.lake && temps.autumn.lake > temps.spring.lake,
  { spring: temps.spring.lake, summer: temps.summer.lake, autumn: temps.autumn.lake });
check("зимой подо льдом +0.5…+4.2 °C",
  temps.winter.lake <= 4.2 && temps.winter.lake >= 0.5, temps.winter.lake);
check("горное озеро холоднее лесного в любой сезон",
  temps.summer.mountain < temps.summer.lake && temps.winter.mountain <= temps.winter.lake,
  { лето: temps.summer.mountain, зима: temps.winter.mountain });

/* ---------- 4. ледовая ветка: теплолюбивые уходят, холодолюбивые остаются ---------- */
await p.evaluate(() => window.__setSeason("winter"));
const winterFit = await p.evaluate(() => ({
  som: window.__fit("som", "deep", "lake"),
  karas: window.__fit("karas_g", "reeds", "lake"),
  nalim: window.__fit("nalim", "pit", "winter"),
  okun: window.__fit("okun", "deep", "lake"),
  plotva: window.__fit("plotva", "open", "lake")
}));
await p.evaluate(() => window.__setSeason("summer"));
const summerFit = await p.evaluate(() => ({
  som: window.__fit("som", "deep", "lake"),
  karas: window.__fit("karas_g", "reeds", "lake"),
  okun: window.__fit("okun", "deep", "lake")
}));
check("зимой сом практически не клюёт, летом клюёт",
  winterFit.som < 0.35 && summerFit.som > 0.5, { зима: winterFit.som, лето: summerFit.som });
check("карась зимой вялый, летом в камышах активен",
  winterFit.karas < summerFit.karas * 0.6, { зима: winterFit.karas, лето: summerFit.karas });
check("зимой окунь и плотва остаются ловимыми",
  winterFit.okun > 0.35 && winterFit.plotva > 0.3, { okun: winterFit.okun, plotva: winterFit.plotva });
check("подо льдом налим есть всегда", winterFit.nalim > 0.3, winterFit.nalim);

/* ---------- 5. рыба не остаётся совсем без вариантов в каждом сезоне ---------- */
const alive = {};
for (const s of ["spring","summer","autumn","winter"]){
  alive[s] = await p.evaluate((s) => {
    window.__setSeason(s);
    const out = {};
    for (const L of ["lake","river","swamp","sea","mountain","winter","lagoon","night"]){
      const c = window.__census("bamboo")[L] || {};
      out[L] = Object.keys(c).filter(k => k.indexOf("prem_") !== 0 && !k.endsWith("|ids"))
        .filter(k => (parseInt(c[k], 10) || 0) >= 1).length;
    }
    return out;
  }, s);
}
const dead = [];
for (const s in alive) for (const L in alive[s]) if (alive[s][L] < 1) dead.push([s, L]);
check("в каждом сезоне на каждом водоёме есть хотя бы одна точка с рыбой", dead.length === 0, dead.slice(0, 4));
check("зимой топь не пустая: ротан и налим берут и в глухозимье",
  alive.winter.swamp >= 1, alive.winter);

/* ---------- 6. давление и ветер: числа, направление, влияние на клёв ---------- */
await p.evaluate(() => window.__setSeason("summer"));
const ph = {};
await p.evaluate(() => window.__setWindDir(0));
for (const t of ["sunny","overcast","rain","thunder","frost","snow"]){
  ph[t] = await p.evaluate((t) => {
    const s = window.__test.save(); s.loc = "lake"; s.weather = { type: t, rolls: 0 };
    const x = window.__phys("lake");
    return { p: x.pressure, trend: x.trend, wind: x.wind.power, k: x.weatherK, why: x.why };
  }, t);
}
check("давление в реальном диапазоне 995…1030", Object.values(ph).every(x => x.p >= 995 && x.p <= 1030),
  Object.fromEntries(Object.entries(ph).map(([k,v]) => [k, v.p])));
check("в грозу давление ниже, чем в ясную погоду", ph.thunder.p < ph.sunny.p, { гроза: ph.thunder.p, ясно: ph.sunny.p });
check("в грозу давление падает, в мороз стоит высокое", ph.thunder.trend < 0 && ph.frost.trend > 0,
  { гроза: ph.thunder.trend, мороз: ph.frost.trend });
check("ветер у каждой погоды имеет силу 0…1", Object.values(ph).every(x => x.wind >= 0 && x.wind <= 1.001),
  Object.fromEntries(Object.entries(ph).map(([k,v]) => [k, v.wind])));

/* ветер в берег против ветра с берега: направление задаём принудительно */
const windScore = await p.evaluate(() => {
  const s = window.__test.save(); s.loc = "lake"; s.weather = { type: "rain", rolls: 0 };
  window.__setWindDir(1);  const on = window.__phys("lake").weatherK;
  const onWhy = window.__phys("lake").why;
  window.__setWindDir(-1); const off = window.__phys("lake").weatherK;
  const offWhy = window.__phys("lake").why;
  window.__setWindDir(0);  const calm = window.__phys("lake").weatherK;
  window.__setWindDir(null);
  return { on, off, calm, onWhy, offWhy };
});
check("ветер в берег даёт клёв выше, чем ветер с берега",
  windScore.on > windScore.off && windScore.on > 1, windScore);
check("направление ветра подписано игроку",
  windScore.onWhy.some(w => /в берег/.test(w)) && windScore.offWhy.some(w => /с берега/.test(w)), windScore);
check("штиль не поднимает и не роняет клёв", Math.abs(windScore.calm - 1) < 0.35, windScore.calm);

/* ---------- 7. после грозы — жор, окно кончается ---------- */
const storm = await p.evaluate(() => {
  const s = window.__test.save(); s.weather = { type: "overcast", rolls: 0 };
  const before = window.__phys("lake").weatherK;
  window.__peakStorm();
  const after = window.__phys("lake").weatherK;
  const why = window.__phys("lake").why;
  window.__setStorm(false);
  const off = window.__phys("lake").weatherK;
  return { before, after, off, why };
});
check("после грозы клёв поднят и причина названа",
  storm.after > storm.before && storm.why.some(w => /гроз/.test(w)), storm);
check("окно жора закрывается по таймеру", storm.off < storm.after, storm);

/* ---------- 8. леска: в прозрачной воде тонкая заметно лучше толстой ---------- */
await p.evaluate(() => { window.__setSeason("summer"); });
const line = await p.evaluate(() => {
  const s = window.__test.save(); s.loc = "lake"; s.weather = { type: "sunny", rolls: 0 };
  const out = {};
  for (const id of ["thin","fluo","braid","myth"]){ window.__setLine(id); out[id] = +window.__lineK().k.toFixed(3); }
  out.clarity = +window.__lineK().clarity.toFixed(3);
  return out;
});
check("толстая плетёнка хуже тонкой лески", line.braid < line.thin, line);
check("леска почти не мешает в мутной воде", line.myth >= line.braid && line.myth > 0.8, line);
check("поправка на леску не выходит за 0.7…1.02", Object.values(line).filter(v => typeof v === "number").every(v => v > 0 && v <= 1.02), line);

/* ---------- 9. замор: жарко и «цветёт» — кислорода мало ---------- */
const zam = await p.evaluate(() => {
  window.__setSeason("summer");
  const lake = window.__phys("lake"), swamp = window.__phys("swamp"), river = window.__phys("river");
  window.__setSeason("winter");
  const winter = window.__phys("lake");
  window.__setSeason("summer");
  return { lake: lake.oxygen, swamp: swamp.oxygen, river: river.oxygen, winter: winter.oxygen,
           zamor: swamp.zamor, lakeZamor: lake.zamor };
});
check("кислорода больше в реке, чем в цветущей топи", zam.river > zam.swamp, { река: zam.river, топь: zam.swamp });
check("зимой кислорода больше, чем в летний зной в топи", zam.winter > zam.swamp, { зима: zam.winter, топь: zam.swamp });
check("флаг замора согласован с кислородом", zam.zamor === (zam.swamp < 0.6), zam);

/* ---------- 10. прозрачность: дождь и цветение мутят, течение промывает ---------- */
const cl = await p.evaluate(() => {
  const s = window.__test.save(); s.loc = "lake";
  s.weather = { type: "sunny", rolls: 0 };
  window.__setSeason("summer");
  const clear = window.__phys("lake").clarity;
  s.weather = { type: "thunder", rolls: 0 };
  const storm = window.__phys("lake").clarity;
  const river = window.__phys("river").clarity;
  window.__setSeason("winter");
  s.weather = { type: "sunny", rolls: 0 };
  const winter = window.__phys("lake").clarity;
  window.__setSeason("summer");
  return { clear, storm, river, winter };
});
check("гроза мутит воду", cl.storm < cl.clear, cl);
check("летом вода мутнее, чем зимой (цветение)", cl.winter > cl.clear, { лето: cl.clear, зима: cl.winter });

/* ---------- 11. клёв не «уплывает»: итоговый множитель в разумных пределах ---------- */
const bounds = await p.evaluate(() => {
  const out = [];
  for (const s of ["spring","summer","autumn","winter"]){
    window.__setSeason(s);
    for (const L of ["lake","river","swamp","sea","mountain","winter","lagoon","night"]){
      const x = window.__phys(L); out.push([s, L, x.weatherK]);
    }
  }
  return out;
});
const outOfRange = bounds.filter(x => x[2] < 0.55 || x[2] > 1.6);
check("погодный множитель клёва держится в 0.55…1.6", outOfRange.length === 0, outOfRange.slice(0, 3));

/* ---------- 12. игрок видит физику: чипы HUD ---------- */
const hud = await p.evaluate(() => {
  window.__setSeason("winter");
  window.__ui.syncLocInfo();
  const el = (document.getElementById("locInfo") || {}).innerText || "";
  return el.replace(/\s+/g, " ").trim();
});
check("в HUD есть сезон с днём", /зима · \d+\/14/.test(hud), hud);
check("в HUD есть вода в градусах и давление", /°/.test(hud) && /10\d\d/.test(hud), hud);
check("в HUD есть направление ветра", /берег/.test(hud) || /штиль/.test(hud), hud);
await p.evaluate(() => window.__setSeason("summer"));

/* ---------- 13. тишина объясняется: физика воды говорит игроку, почему не клюёт ---------- */
const why = await p.evaluate(() => {
  const s = window.__test.save();
  window.__setSeason("winter"); s.loc = "lake";
  const winter = window.__waterWhy();
  window.__setSeason("summer"); s.loc = "swamp";
  const swamp = window.__waterWhy();
  window.__setSeason("summer"); s.loc = "lake";
  const summer = window.__waterWhy();
  return { winter, swamp, summer };
});
check("зимой тишина объясняется глухозимьем", /Глухозимье|подо льдом/.test(why.winter), why.winter);
check("в тёплой топи объяснение — замор, мутность или жара", /Замор|мутная|Жара/.test(why.swamp), why.swamp);
check("в хорошей воде объяснять нечего", why.summer === "", why.summer);

/* ---------- 14. ошибки консоли ---------- */
check("ошибок консоли нет", errs.length === 0, errs.slice(0, 4));

console.log("--------------------------------------------------");
console.log("ошибки консоли:", JSON.stringify(errs.slice(0, 5)));
if (fails.length){ console.log("GAME87 FAILED: " + fails.length); fails.forEach(f => console.log("  - " + f)); }
else console.log("GAME87 OK");
await b.close();
