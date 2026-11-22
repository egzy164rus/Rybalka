import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:430,height:860}, deviceScaleFactor:2 });
const errs=[]; p.on("pageerror",e=>errs.push(e.message));
await p.goto((process.env.GAME_URL || new URL("../rybalka.html", import.meta.url).href)); await p.waitForTimeout(1100);
await p.click("#btnStart"); await p.waitForTimeout(400);
await p.evaluate(()=>{const s=window.__test.save(); s.xp=140000; s.coins=9000; s.baits.corn=999; s.baits.bloodworm=999;
  s.equipped.bait="corn"; s.equipped.rod="sea"; s.seenCoach={c_power:1,c_bite:1,c_fight:1}; window.__test.persist();});
const B = async ()=>p.evaluate(()=>{const r=document.getElementById("action").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};});
async function waitReady(){ for(let i=0;i<80;i++){ const s=await p.evaluate(()=>window.__dbg()); if(!s.readyIn) return; await p.waitForTimeout(100);} }
async function fish(shotPrefix){
  await waitReady();
  const box = await B();
  await p.mouse.click(160+Math.random()*90, 600+Math.random()*50); await p.waitForTimeout(280);
  await p.mouse.move(box.x,box.y); await p.mouse.down(); await p.waitForTimeout(420); await p.mouse.up();
  let held=false, shots={}, falseBite=false;
  for (let i=0;i<1200;i++){
    const s = await p.evaluate(()=>window.__dbg());
    if (s.state==="waiting"){
      if (shotPrefix && !shots.low && s.interest<0.3){ await p.screenshot({path:"./tests/out/"+shotPrefix+"_low.jpg", type:"jpeg", quality:85}); shots.low=1; }
      if (shotPrefix && !shots.mid && s.interest>0.55 && s.interest<0.8){ await p.screenshot({path:"./tests/out/"+shotPrefix+"_mid.jpg", type:"jpeg", quality:85}); shots.mid=1; }
      if (i>25 && i%30===0){ await p.mouse.click(box.x,box.y); }  // подёргиваем приманку
      await p.waitForTimeout(90);
    }
    else if (s.state==="bite"){ await p.mouse.down(); await p.waitForTimeout(70); await p.mouse.up(); }
    else if (s.state==="fight"){
      if (s.tension < 0.68 && !held){ await p.mouse.down(); held=true; }
      else if (s.tension >= 0.72 && held){ await p.mouse.up(); held=false; }
      await p.waitForTimeout(70);
    }
    else if (s.state==="result"){ if(held){await p.mouse.up(); held=false;} await p.waitForTimeout(1150);
      await p.evaluate(()=>{ const n=document.getElementById("btnNext"); if(window.__dbg().state==="result") n.click(); });
      await p.waitForTimeout(300);
      // проверка «перезарядки»
      const before = await p.evaluate(()=>window.__dbg().readyIn);
      await p.mouse.click(box.x, box.y); await p.waitForTimeout(150);
      const st = (await p.evaluate(()=>window.__dbg())).state;
      const hintTxt = await p.evaluate(()=>document.getElementById("hint").textContent);
      return {before, stateAfterEarlyTap:st, hintTxt};
    }
    else if (s.state==="aim"||s.state==="idle"){ return {recovered:true}; }
  }
  return {timeout:true};
}
const r1 = await fish("w");
console.log("ловля 1:", JSON.stringify(r1));
const r2 = await fish("");
console.log("ловля 2:", JSON.stringify(r2));
console.log("SAVE", JSON.stringify(await p.evaluate(()=>({t:window.__test.save().total,l:window.__test.save().lost}))));
console.log("ERRS", JSON.stringify(errs));
await b.close();
