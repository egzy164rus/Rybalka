// z7: сила заброса привязана к расстоянию — близкая цель требует слабого замаха,
// дальняя — сильного. Проверяем положение зелёной зоны на шкале силы.
import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:430,height:860}, deviceScaleFactor:2 });
const errs=[]; p.on("pageerror",e=>errs.push(e.message));
const GAME = (process.env.GAME_URL || new URL("../rybalka.html", import.meta.url).href);

async function aimAt(x, y, shot){
  await p.goto(GAME); await p.waitForTimeout(1000);
  await p.click("#btnStart"); await p.waitForTimeout(400);
  await p.evaluate(()=>{const s=window.__test.save(); s.xp=140000; s.baits.corn=99; s.equipped.bait="corn"; s.equipped.rod="sea";
    s.seenCoach={c_power:1,c_bite:1,c_fight:1}; window.__test.persist();});
  await p.reload(); await p.waitForTimeout(1200); await p.click("#btnStart"); await p.waitForTimeout(900);
  await p.mouse.click(x, y); await p.waitForTimeout(400);
  if (shot) await p.screenshot({path:shot, type:"jpeg", quality:85});
  return p.evaluate(()=>({ st:window.__dbg().state,
    left: parseFloat(document.getElementById("sweetZone").style.left),
    width: document.getElementById("sweetZone").style.width }));
}
const near = await aimAt(300, 560, "./out/k1_aim_right.jpg");   // близко справа
const far  = await aimAt(110, 620, "./out/k2_aim_left.jpg");    // далеко слева
const mid  = await aimAt(215, 640, "./out/k3_aim_mid.jpg");     // середина
console.log("близко:", JSON.stringify(near), "середина:", JSON.stringify(mid), "далеко:", JSON.stringify(far));
console.log("OK:", near.left < mid.left && mid.left < far.left);
console.log("ERRS", JSON.stringify(errs));
await b.close();
