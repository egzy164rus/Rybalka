import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:430,height:860}, deviceScaleFactor:2 });
const errs=[]; p.on("pageerror",e=>errs.push(e.message));
p.on("console",m=>{ if(m.type()==="error") errs.push("console:"+m.text()); });
await p.goto((process.env.GAME_URL || new URL("../rybalka.html", import.meta.url).href)); await p.waitForTimeout(1100);
await p.click("#btnStart"); await p.waitForTimeout(400);
await p.evaluate(()=>{const s=window.__test.save(); s.xp=140000; s.baits.corn=99; s.equipped.bait="corn"; s.equipped.rod="sea";
  s.seenCoach={c_power:1,c_bite:1,c_fight:1}; window.__test.persist();});
await p.reload(); await p.waitForTimeout(1200); await p.click("#btnStart"); await p.waitForTimeout(800);
const B = await p.evaluate(()=>{const r=document.getElementById("action").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};});
// три ловли подряд в разных местах
for (let n=0;n<3;n++){
  await p.mouse.click(120 + n*90, 600 + n*30); await p.waitForTimeout(400);
  const acc = await p.evaluate(()=>{const w=document.getElementById("sweetZone"); return w.style.left;});
  await p.mouse.move(B.x,B.y); await p.mouse.down();
  const holdMs = 200 + n*180;
  await p.waitForTimeout(holdMs); await p.mouse.up();
  for (let i=0;i<800;i++){
    const st = await p.evaluate(()=>window.__dbg());
    if (st.state==="waiting") await p.waitForTimeout(100);
    else if (st.state==="bite"){ await p.mouse.down(); await p.waitForTimeout(95); await p.mouse.up(); }
    else if (st.state==="fight"){
      if (st.tension<0.62){ await p.mouse.down(); await p.waitForTimeout(135); await p.mouse.up(); } else await p.waitForTimeout(100);
    }
    else if (st.state==="result"){ await p.waitForTimeout(1250); await p.evaluate(()=>{const x=document.getElementById("btnNext"); if(x) x.click();}); await p.waitForTimeout(500); break; }
    else if (st.state==="aim"||st.state==="idle") break;
  }
  console.log("attempt", n, "sweetAt", acc, "state", (await p.evaluate(()=>window.__dbg())).state);
}
console.log("TOTAL", JSON.stringify(await p.evaluate(()=>({total:window.__test.save().total, coins:window.__test.save().coins}))));
// FPS
const fps = {};
for (const loc of ["lake","winter","sea","night"]){
  await p.evaluate(l=>{const s=window.__test.save(); s.loc=l; s.weather=null; window.__test.persist();}, loc);
  await p.reload(); await p.waitForTimeout(1100); await p.click("#btnStart"); await p.waitForTimeout(800);
  fps[loc] = await p.evaluate(()=>new Promise(res=>{ let n=0; const t0=performance.now();
    const tick=()=>{ n++; if (performance.now()-t0<1500) requestAnimationFrame(tick); else res(Math.round(n/((performance.now()-t0)/1000))); };
    requestAnimationFrame(tick); }));
}
console.log("FPS", JSON.stringify(fps), "ERRS", JSON.stringify(errs));
await b.close();
