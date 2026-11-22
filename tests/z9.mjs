import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:430,height:860}, deviceScaleFactor:2 });
p.on("pageerror",e=>console.log("ERR",e.message));
await p.goto((process.env.GAME_URL || new URL("../rybalka.html", import.meta.url).href)); await p.waitForTimeout(1000);
await p.click("#btnStart"); await p.waitForTimeout(400);
await p.evaluate(()=>{const s=window.__test.save(); s.xp=140000; s.baits.corn=99; s.equipped.bait="corn"; s.equipped.rod="sea";
  s.seenCoach={c_power:1,c_bite:1,c_fight:1}; window.__test.persist();});
await p.reload(); await p.waitForTimeout(1200); await p.click("#btnStart"); await p.waitForTimeout(800);
const B = await p.evaluate(()=>{const r=document.getElementById("action").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};});
await p.mouse.click(200, 620); await p.waitForTimeout(400);
await p.mouse.move(B.x,B.y); await p.mouse.down(); await p.waitForTimeout(420); await p.mouse.up();
for (let i=0;i<60;i++){
  const st = await p.evaluate(()=>window.__dbg());
  console.log(i, st.state, "t", st.tension, "p", st.progress, "acc", st.acc, "fish", st.fish);
  if (st.state==="bite"){ await p.mouse.down(); await p.waitForTimeout(80); await p.mouse.up(); }
  if (st.state==="fight"){ if (st.tension<0.62){ await p.mouse.down(); await p.waitForTimeout(130); await p.mouse.up(); } else await p.waitForTimeout(100); }
  if (st.state==="result") { console.log("RESULT"); break; }
  if (st.state==="aim" && i>4) { console.log("BACK TO AIM"); break; }
  await p.waitForTimeout(200);
}
console.log("SAVE", JSON.stringify(await p.evaluate(()=>({total:window.__test.save().total, lost:window.__test.save().lost, breaks:window.__test.save().breaks, casts:window.__test.save().casts}))));
await b.close();
