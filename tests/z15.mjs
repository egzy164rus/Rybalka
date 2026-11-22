import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:430,height:860}, deviceScaleFactor:2 });
p.on("pageerror",e=>console.log("ERR",e.message));
p.on("console",m=>{ if (m.type()==="error") console.log("CONSOLE", m.text()); });
await p.goto((process.env.GAME_URL || new URL("../rybalka.html", import.meta.url).href)); await p.waitForTimeout(1000);
await p.click("#btnStart"); await p.waitForTimeout(400);
await p.evaluate(()=>{const s=window.__test.save(); s.xp=140000; s.baits.corn=99; s.equipped.bait="corn"; s.equipped.rod="sea";
  s.seenCoach={c_power:1,c_bite:1,c_fight:1}; window.__test.persist();});
await p.reload(); await p.waitForTimeout(1200); await p.click("#btnStart"); await p.waitForTimeout(800);
const B = await p.evaluate(()=>{const r=document.getElementById("action").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};});
await p.mouse.click(150, 620); await p.waitForTimeout(300);
await p.mouse.move(B.x,B.y); await p.mouse.down(); await p.waitForTimeout(430);
console.log("hold", (await p.evaluate(()=>window.__dbg())).state);
await p.mouse.up();
let held=false, n=0;
for (let i=0;i<900;i++){
  const s = await p.evaluate(()=>window.__dbg());
  if (s.state==="waiting" || s.state==="casting") { await p.waitForTimeout(90); }
  else if (s.state==="bite"){ console.log("BITE -> hook"); await p.mouse.down(); await p.waitForTimeout(80); await p.mouse.up(); }
  else if (s.state==="fight"){
    if (n++ % 6 === 0) console.log("fight t="+s.tension+" p="+s.progress+" hold="+s.hold+" pull="+s.pull);
    console.log("  t="+s.tension.toFixed(2)+" hold="+s.hold+" held="+held+" my="+(await p.evaluate(()=>document.getElementById("action").dataset.mode)));
    if (s.tension < 0.6 && !held){ await p.mouse.move(B.x,B.y); await p.mouse.down(); held=true; console.log("   press"); }
    else if (s.tension > 0.88 && held){ await p.mouse.up(); held=false; console.log("   release"); }
    await p.waitForTimeout(90);
  }
  else if (s.state==="result"){ console.log("RESULT t="+s.tension+" p="+s.progress); break; }
  else { console.log("state", s.state); break; }
}
console.log("SAVE", JSON.stringify(await p.evaluate(()=>({total:window.__test.save().total, lost:window.__test.save().lost, breaks:window.__test.save().breaks}))));
await b.close();
