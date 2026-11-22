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
await p.mouse.click(150, 640); await p.waitForTimeout(300);
console.log("A", (await p.evaluate(()=>window.__dbg())).state);
await p.mouse.move(B.x,B.y); await p.mouse.down(); await p.waitForTimeout(420);
console.log("B", (await p.evaluate(()=>window.__dbg())).state);
await p.mouse.up();
let held=false;
for (let i=0;i<900;i++){
  const st = await p.evaluate(()=>window.__dbg());
  if (st.state==="waiting") await p.waitForTimeout(90);
  else if (st.state==="bite"){ await p.mouse.down(); await p.waitForTimeout(80); await p.mouse.up(); }
  else if (st.state==="fight"){
    if (st.tension < 0.68 && !held){ await p.mouse.down(); held=true; await p.waitForTimeout(70); }
    else if (st.tension >= 0.72 && held){ await p.mouse.up(); held=false; await p.waitForTimeout(90); }
    else await p.waitForTimeout(70);
  }
  else if (st.state==="result"){ if(held){await p.mouse.up(); held=false;} await p.waitForTimeout(1200); break; }
  else if (st.state==="aim"||st.state==="idle") break;
}
await p.evaluate(()=>{const x=document.getElementById("btnNext"); if(x) x.click();});
await p.waitForTimeout(700);
console.log("C after next", JSON.stringify(await p.evaluate(()=>window.__dbg())));
await p.mouse.click(240, 640); await p.waitForTimeout(400);
console.log("D after click", JSON.stringify(await p.evaluate(()=>window.__dbg())));
await p.mouse.move(B.x,B.y); await p.mouse.down(); await p.waitForTimeout(420);
console.log("E after hold", JSON.stringify(await p.evaluate(()=>window.__dbg())));
await p.mouse.up();
await b.close();
