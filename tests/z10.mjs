import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:430,height:860}, deviceScaleFactor:2 });
const errs=[]; p.on("pageerror",e=>errs.push(e.message));
await p.goto((process.env.GAME_URL || new URL("../rybalka.html", import.meta.url).href)); await p.waitForTimeout(1000);
await p.click("#btnStart"); await p.waitForTimeout(400);
await p.evaluate(()=>{const s=window.__test.save(); s.xp=140000; s.baits.corn=99; s.equipped.bait="corn"; s.equipped.rod="sea";
  s.equipped.reel="heavy"; s.equipped.line="kevlar";
  s.seenCoach={c_power:1,c_bite:1,c_fight:1}; window.__test.persist();});
await p.reload(); await p.waitForTimeout(1200); await p.click("#btnStart"); await p.waitForTimeout(800);
const B = await p.evaluate(()=>{const r=document.getElementById("action").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};});
exec: {
  // свободный заброс слева-снизу
  await p.mouse.click(150, 660); await p.waitForTimeout(400);
  await p.mouse.move(B.x,B.y); await p.mouse.down(); await p.waitForTimeout(430); await p.mouse.up();
  let held=false, caught=false;
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
      await p.waitForTimeout(1200);
      const card = await p.evaluate(()=>({name:document.getElementById("catchName").textContent, on:document.getElementById("catchCard").classList.contains("on")}));
      console.log("CATCH", JSON.stringify(card));
      await p.screenshot({path:"./tests/out/m1_catch.png"});
      caught = true; break; }
    else if (st.state==="aim"||st.state==="idle"){ console.log("FAIL state", st.state); break; }
  }
  console.log("CAUGHT", caught);
}
console.log("SAVE", JSON.stringify(await p.evaluate(()=>({total:window.__test.save().total, lost:window.__test.save().lost, breaks:window.__test.save().breaks, casts:window.__test.save().casts}))));
console.log("ERRS", JSON.stringify(errs));
await b.close();
