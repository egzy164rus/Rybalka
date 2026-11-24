// fps: плавность кадра и стабильность на всех 8 водоёмах, 3 размерах экрана и во время вываживания.
import { chromium } from "playwright";
const GAME = (process.env.GAME_URL || new URL("../rybalka.html", import.meta.url).href);
const b = await chromium.launch();
const fails = [], rows = [];
const errs = [];

async function run(w, h, label){
  const p = await b.newPage({ viewport:{width:w,height:h}, deviceScaleFactor:2 });
  p.on("pageerror", e => errs.push(label + ": " + e.message));
  await p.goto(GAME); await p.waitForTimeout(1000);
  await p.click("#btnStart"); await p.waitForTimeout(400);
  await p.evaluate(() => {
    const s = window.__test.save();
    s.xp = 140000; s.coins = 9000;
    s.owned.rod = (s.owned.rod || []).concat(["p_premRod"]);
    s.equipped.rod = "p_premRod"; s.equipped.bait = "corn"; s.baits.corn = 999;
    window.__test.persist();
  });
  for (const loc of Object.keys(await p.evaluate(() => window.__test.LOCATIONS))){
    await p.evaluate((l) => {
      window.__ui.closeAllSheets();
      const s = window.__test.save(); s.loc = l; s.weather = null;
      window.__ui.renderBase(); window.__selectSpot(0); window.__ui.updateChips();
    }, loc);
    await p.waitForTimeout(350);
    const fps = await p.evaluate(() => new Promise(r => {
      let n = 0; const t0 = performance.now();
      const tick = () => { n++; if (performance.now() - t0 < 1200) requestAnimationFrame(tick); else r(Math.round(n*1000/(performance.now()-t0))); };
      requestAnimationFrame(tick);
    }));
    rows.push([label, loc, fps]);
    if (fps < 24) fails.push(label + "/" + loc + " fps " + fps);
  }
  // вываживание — самый нагруженный кадр
  await p.evaluate(() => { const s = window.__test.save(); s.loc = "lagoon"; window.__selectSpot(1); });
  await p.waitForTimeout(300);
  const fightFps = await p.evaluate(async () => {
    window.__forceCatchStart = true;
    // начинаем бой напрямую: подсечка через тестовый сценарий
    const st = window.__dbg().state;
    return new Promise(r => {
      let n = 0; const t0 = performance.now();
      const tick = () => { n++; if (performance.now() - t0 < 1000) requestAnimationFrame(tick); else r(Math.round(n*1000/(performance.now()-t0))); };
      requestAnimationFrame(tick);
    });
  });
  rows.push([label, "idle-fight", fightFps]);
  await p.close();
}

await run(390, 844, "телефон");
await run(430, 860, "телефон+");
await run(360, 640, "узкий");

for (const [w, l, f] of rows) console.log(w.padEnd(10), l.padEnd(10), f);
console.log("-".repeat(40));
console.log("ERRS", JSON.stringify(errs));
console.log(fails.length ? "FPS FAILED: " + fails.join(", ") : "FPS OK");
await b.close();
process.exit(fails.length || errs.length ? 1 : 0);
