import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:430,height:860}, deviceScaleFactor:2 });
await p.goto((process.env.GAME_URL || new URL("../rybalka.html", import.meta.url).href)); await p.waitForTimeout(1000);
await p.click("#btnStart"); await p.waitForTimeout(400);
await p.evaluate(()=>{const s=window.__test.save(); s.xp=140000; s.baits.corn=99; s.equipped.bait="corn"; s.equipped.rod="sea"; window.__test.persist();});
await p.reload(); await p.waitForTimeout(1200); await p.click("#btnStart"); await p.waitForTimeout(800);
const B = await p.evaluate(()=>{const r=document.getElementById("action").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};});
// серия: тап по воде, затем удержание кнопки — 5 раз подряд без ловли
for (let i=0;i<5;i++){
  await p.mouse.click(150+i*20, 620); await p.waitForTimeout(300);
  await p.mouse.move(B.x,B.y); await p.mouse.down(); await p.waitForTimeout(420);
  const st = (await p.evaluate(()=>window.__dbg())).state;
  console.log(i, "hold ->", st, "| btn:", await p.evaluate(()=>document.getElementById("action").textContent.trim()));
  await p.mouse.up(); await p.waitForTimeout(250);
  const st2 = (await p.evaluate(()=>window.__dbg())).state;
  console.log("   release ->", st2);
  // ждём возврата в aim после заброса
  for (let k=0;k<80;k++){ const s=(await p.evaluate(()=>window.__dbg())).state; if (s==="aim") break; await p.waitForTimeout(200); }
  const s3 = (await p.evaluate(()=>window.__dbg())).state;
  console.log("   back:", s3);
  if (s3 !== "aim") { console.log("STUCK"); break; }
}
await b.close();
