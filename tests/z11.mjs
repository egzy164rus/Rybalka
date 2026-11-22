import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:430,height:860}, deviceScaleFactor:2 });
const errs=[]; p.on("pageerror",e=>errs.push(e.message));
await p.goto((process.env.GAME_URL || new URL("../rybalka.html", import.meta.url).href)); await p.waitForTimeout(1000);
await p.click("#btnStart"); await p.waitForTimeout(400);
await p.evaluate(()=>{const s=window.__test.save(); s.xp=140000; s.baits.corn=99; s.equipped.bait="corn"; s.equipped.rod="sea";
  s.seenCoach={c_power:1,c_bite:1,c_fight:1}; window.__test.persist();});
await p.reload(); await p.waitForTimeout(1200); await p.click("#btnStart"); await p.waitForTimeout(800);
const B = await p.evaluate(()=>{const r=document.getElementById("action").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};});
let full=[], catchShots=0;
for (let n=0;n<4;n++){
  await p.evaluate(()=>document.getElementById("tabFish").click()); await p.waitForTimeout(120);
  await p.mouse.click(110 + n*85, 600 + (n%2)*60); await p.waitForTimeout(350);
  console.log("n"+n, "state", (await p.evaluate(()=>window.__dbg())).state, "spot", (await p.evaluate(()=>window.__dbg())).spot);
  await p.mouse.move(B.x,B.y); await p.mouse.down(); await p.waitForTimeout(400 + n*60);
  console.log("  hold", (await p.evaluate(()=>window.__dbg())).state);
  await p.mouse.up();
  let held=false, done=false;
  for (let i=0;i<900;i++){
    const st = await p.evaluate(()=>window.__dbg());
    if (st.state==="waiting") await p.waitForTimeout(90);
    else if (st.state==="bite"){ await p.mouse.down(); await p.waitForTimeout(80); await p.mouse.up(); }
    else if (st.state==="fight"){
      if (st.tension < 0.68 && !held){ await p.mouse.down(); held=true; await p.waitForTimeout(70); }
      else if (st.tension >= 0.72 && held){ await p.mouse.up(); held=false; await p.waitForTimeout(90); }
      else await p.waitForTimeout(70);
    }
    else if (st.state==="result"){ if (held){ await p.mouse.up(); held=false; }
      await p.waitForTimeout(1250);
      if (catchShots < 2){ await p.screenshot({path:"./out/n"+n+"_card.png"}); catchShots++; }
      const cardText = await p.evaluate(()=>({on:document.getElementById("catchCard").classList.contains("on"),
        name:document.getElementById("catchName").textContent}));
      await p.click("#btnNext");
      await p.waitForTimeout(700);
      console.log("card", JSON.stringify(cardText), "afterNext", (await p.evaluate(()=>window.__dbg())).state);
      full.push(1); done=true; break; }
    else if (st.state==="aim"||st.state==="idle"){ break; }
  }
  if (!done) full.push(0);
}
const s = await p.evaluate(()=>({total:window.__test.save().total, lost:window.__test.save().lost, casts:window.__test.save().casts, coins:window.__test.save().coins}));
console.log("RUNS", full.join(","), "SAVE", JSON.stringify(s));
console.log("ERRS", JSON.stringify(errs));
await b.close();
