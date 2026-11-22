import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:430,height:860}, deviceScaleFactor:2 });
const errs=[]; p.on("pageerror",e=>errs.push(e.message));
await p.goto((process.env.GAME_URL || new URL("../rybalka.html", import.meta.url).href)); await p.waitForTimeout(1100);
await p.click("#btnStart"); await p.waitForTimeout(400);
await p.evaluate(()=>{const s=window.__test.save(); s.xp=140000; s.coins=9000; s.baits.corn=999; s.baits.bloodworm=999;
  s.equipped.bait="corn"; s.equipped.rod="sea"; s.seenCoach={c_power:1,c_bite:1,c_fight:1}; window.__test.persist();});
const B = async ()=>p.evaluate(()=>{const r=document.getElementById("action").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};});
const scen = {
  "зима":{loc:"winter", bait:"bloodworm", xy:[210,660]},
  "море":{loc:"sea", bait:"corn", xy:[300,620]},
  "ночь":{loc:"night", bait:"corn", xy:[150,600]},
  "река":{loc:"river", bait:"corn", xy:[250,640]},
};
for (const [name,cfg] of Object.entries(scen)){
  await p.evaluate(c=>{const s=window.__test.save(); s.loc=c.loc; s.weather=null; s.equipped.bait=c.bait; window.__test.persist();}, cfg);
  await p.reload(); await p.waitForTimeout(1200); await p.click("#btnStart"); await p.waitForTimeout(900);
  const box = await B();
  await p.mouse.click(cfg.xy[0], cfg.xy[1]); await p.waitForTimeout(300);
  await p.mouse.move(box.x,box.y); await p.mouse.down(); await p.waitForTimeout(420); await p.mouse.up();
  let held=false, got=false;
  for (let i=0;i<1300;i++){
    const s = await p.evaluate(()=>window.__dbg());
    if (s.state==="waiting"){ if (i>25 && i%26===0) await p.mouse.click(box.x,box.y); await p.waitForTimeout(90); }
    else if (s.state==="bite"){ await p.mouse.down(); await p.waitForTimeout(70); await p.mouse.up(); }
    else if (s.state==="fight"){
      if (s.tension < 0.68 && !held){ await p.mouse.down(); held=true; }
      else if (s.tension >= 0.72 && held){ await p.mouse.up(); held=false; }
      await p.waitForTimeout(70);
    }
    else if (s.state==="result"){ if(held){await p.mouse.up(); held=false;} await p.waitForTimeout(1200); got=true;
      await p.screenshot({path:"./tests/out/w_"+name+".jpg", type:"jpeg", quality:85});
      await p.evaluate(()=>{const n=document.getElementById("btnNext"); if(window.__dbg().state==="result") n.click();});
      break; }
    else if (s.state==="aim"||s.state==="idle"){ break; }
  }
  console.log(name, "ловля:", got);
}
console.log("SAVE", JSON.stringify(await p.evaluate(()=>({t:window.__test.save().total,l:window.__test.save().lost}))));
console.log("ERRS", JSON.stringify(errs));
await b.close();
