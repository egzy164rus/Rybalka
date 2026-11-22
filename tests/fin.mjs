import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:430,height:860}, deviceScaleFactor:2 });
const errs=[]; p.on("pageerror",e=>errs.push("pageerror:"+e.message));
p.on("console",m=>{ if(m.type()==="error") errs.push("console:"+m.text()); });
const B = async ()=>p.evaluate(()=>{const r=document.getElementById("action").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};});
async function clearOverlays(){
  for (let i=0;i<3;i++){
    const n = await p.evaluate(()=>{ const o=document.querySelector("#questDone.on .qd-later"); if(o){o.click(); return 1;} return 0; });
    if (!n) break; await p.waitForTimeout(200);
  }
}
async function fishOnce(spotXY){
  const box = await B();
  await clearOverlays();
  await p.mouse.click(spotXY[0], spotXY[1]); await p.waitForTimeout(320);
  await p.mouse.move(box.x, box.y); await p.mouse.down(); await p.waitForTimeout(430); await p.mouse.up();
  let held=false;
  for (let i=0;i<900;i++){
    const s = await p.evaluate(()=>window.__dbg());
    if (s.state==="waiting"||s.state==="casting") await p.waitForTimeout(90);
    else if (s.state==="bite"){ await p.mouse.down(); await p.waitForTimeout(80); await p.mouse.up(); }
    else if (s.state==="fight"){
      if (s.tension < 0.68 && !held){ await p.mouse.down(); held=true; }
      else if (s.tension >= 0.72 && held){ await p.mouse.up(); held=false; }
      await p.waitForTimeout(70);
    }
    else if (s.state==="result"){ if(held){await p.mouse.up(); held=false;} await p.waitForTimeout(1200);
      await p.evaluate(()=>document.getElementById("btnNext").click()); await p.waitForTimeout(700); return true; }
    else return false;
  }
  return false;
}
await p.goto((process.env.GAME_URL || new URL("../rybalka.html", import.meta.url).href)); await p.waitForTimeout(1200);
const startInfo = await p.evaluate(()=>({txt:document.getElementById("start").innerText.replace(/\s+/g," ").trim(),
  btns:[...document.querySelectorAll("#start button")].map(x=>x.textContent.trim())}));
await p.click("#btnStart"); await p.waitForTimeout(400);
await p.evaluate(()=>{const s=window.__test.save(); s.xp=140000; s.coins=9000; s.pearl=9;
  s.owned.rod.push("sea"); s.equipped.rod="sea"; s.equipped.line="kevlar"; s.equipped.reel="heavy";
  s.baits.corn=99; s.baits.bloodworm=99; s.baits.mackerel=99;
  s.seenCoach={c_power:1,c_bite:1,c_fight:1}; window.__test.persist();});
const results = {};
for (const [loc, bait, xy] of [["lake","corn",[150,640]],["river","corn",[300,600]],["winter","bloodworm",[210,660]],["night","corn",[120,620]],["sea","mackerel",[330,640]]]){
  await p.evaluate(([l,bt])=>{const s=window.__test.save(); s.loc=l; s.weather=null; s.equipped.bait=bt; window.__test.persist();},[loc,bait]);
  await p.reload(); await p.waitForTimeout(1200); await p.click("#btnStart"); await p.waitForTimeout(900);
  results[loc] = await fishOnce(xy);
}
const save = await p.evaluate(()=>({total:window.__test.save().total, coins:window.__test.save().coins, pearl:window.__test.save().pearl}));
// FPS
const fps = {};
for (const loc of ["lake","winter","sea","night"]){
  await p.evaluate(l=>{const s=window.__test.save(); s.loc=l; s.weather=null; window.__test.persist();}, loc);
  await p.reload(); await p.waitForTimeout(1100); await p.click("#btnStart"); await p.waitForTimeout(800);
  fps[loc] = await p.evaluate(()=>new Promise(res=>{ let n=0; const t0=performance.now();
    const tick=()=>{ n++; if (performance.now()-t0<1600) requestAnimationFrame(tick); else res(Math.round(n/((performance.now()-t0)/1000))); };
    requestAnimationFrame(tick); }));
}
console.log("START", JSON.stringify(startInfo));
console.log("CATCH", JSON.stringify(results), "SAVE", JSON.stringify(save));
console.log("FPS", JSON.stringify(fps));
console.log("ERRS", JSON.stringify(errs));
await b.close();
