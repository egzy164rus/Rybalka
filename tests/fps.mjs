import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:430,height:860} });
const fps = {};
for (const loc of ["lake","winter","sea","night"]){
  await p.goto((process.env.GAME_URL || new URL("../rybalka.html", import.meta.url).href)); await p.waitForTimeout(900);
  await p.click("#btnStart"); await p.waitForTimeout(300);
  await p.evaluate(l=>{const s=window.__test.save(); s.loc=l; s.weather=null; s.xp=90000; window.__test.persist();}, loc);
  await p.reload(); await p.waitForTimeout(1200); await p.click("#btnStart"); await p.waitForTimeout(1200);
  fps[loc] = await p.evaluate(()=>new Promise(res=>{ let n=0; const t0=performance.now();
    const tick=()=>{ n++; if (performance.now()-t0<2000) requestAnimationFrame(tick); else res(Math.round(n/((performance.now()-t0)/1000))); };
    requestAnimationFrame(tick); }));
}
console.log("FPS", JSON.stringify(fps));
await b.close();
