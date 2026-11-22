import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:430,height:860}, deviceScaleFactor:2 });
const errs=[]; p.on("pageerror",e=>errs.push(e.message));
async function scene(loc, file, wait=1500){
  await p.goto((process.env.GAME_URL || new URL("../rybalka.html", import.meta.url).href)); await p.waitForTimeout(900);
  await p.click("#btnStart"); await p.waitForTimeout(300);
  await p.evaluate(l=>{const s=window.__test.save(); s.loc=l; s.weather=null; s.xp=140000; s.baits.corn=99;
    s.equipped.bait="corn"; s.equipped.rod="sea"; s.seenCoach={c_power:1,c_bite:1,c_fight:1}; window.__test.persist();}, loc);
  await p.reload(); await p.waitForTimeout(1200); await p.click("#btnStart"); await p.waitForTimeout(wait);
  await p.screenshot({path:"./tests/out/"+file});
}
await scene("lake","v1_lake.png");
await scene("winter","v2_winter.png");
await scene("night","v3_night.png");
await scene("sea","v4_sea.png");
await scene("river","v5_river.png");
console.log("ERRS", JSON.stringify(errs));
await b.close();
