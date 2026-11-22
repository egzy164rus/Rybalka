import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:430,height:860}, deviceScaleFactor:2 });
const errs=[]; p.on("pageerror",e=>errs.push(e.message));
const shot = (f)=>p.screenshot({path:new URL("../screenshots/"+f, import.meta.url).pathname, type:"jpeg", quality:86});
const B = async ()=>p.evaluate(()=>{const r=document.getElementById("action").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};});
const clearQ = async ()=>{ for(let i=0;i<3;i++){ const n=await p.evaluate(()=>{const o=document.querySelector("#questDone.on .qd-later"); if(o){o.click(); return 1;} return 0;}); if(!n) break; await p.waitForTimeout(150);} };

await p.goto((process.env.GAME_URL || new URL("../rybalka.html", import.meta.url).href)); await p.waitForTimeout(1400);
await shot("01_start.jpg");
await p.click("#btnStart"); await p.waitForTimeout(400);
await p.evaluate(()=>{const s=window.__test.save(); s.xp=140000; s.coins=12500; s.pearl=11;
  s.owned.rod.push("sea"); s.equipped.rod="sea"; s.equipped.line="kevlar"; s.equipped.reel="heavy";
  s.baits.corn=99; s.baits.bloodworm=99; s.equipped.bait="corn";
  s.seenCoach={c_power:1,c_bite:1,c_fight:1}; window.__test.persist();});
await p.reload(); await p.waitForTimeout(1300); await p.click("#btnStart"); await p.waitForTimeout(1100);
await shot("02_lake.jpg");

// свободный заброс: цель в любом месте
await p.mouse.click(250, 640); await p.waitForTimeout(650);
await shot("03_free_aim.jpg");

// сила заброса
const box = await B();
await p.mouse.move(box.x, box.y); await p.mouse.down(); await p.waitForTimeout(300);
await shot("04_power.jpg"); await p.mouse.up();
// ожидание: «интерес» рыбы на воде (тактичная подсказка вместо таймера)
let gotWait = false;
for (let i=0;i<400;i++){
  const s = await p.evaluate(()=>window.__dbg());
  if (s.state==="waiting" && s.interest>0.35){ await p.waitForTimeout(120); await shot("05_wait.jpg"); gotWait=true; break; }
  if (s.state==="bite" || s.state==="result" || s.state==="aim") break;
  await p.waitForTimeout(90);
}
console.log("wait shot:", gotWait);
for (let i=0;i<400;i++){
  const s = await p.evaluate(()=>window.__dbg());
  if (["bite","result","aim","idle"].includes(s.state)) break;
  await p.waitForTimeout(90);
}

// поклёвка (телеграф) и подсечка
let got = {fight:false, bite:false, leap:false, card:false};
let held=false;
for (let i=0;i<900;i++){
  const s = await p.evaluate(()=>window.__dbg());
  if (s.state==="waiting"||s.state==="casting") await p.waitForTimeout(90);
  else if (s.state==="bite"){
    if (!got.bite){ await shot("06_bite.jpg"); got.bite=true; }
    await p.mouse.down(); await p.waitForTimeout(80); await p.mouse.up();
  }
  else if (s.state==="fight"){
    if (!got.fight){ await p.waitForTimeout(150); await shot("07_fight.jpg"); got.fight=true; }
    if (s.tension < 0.68 && !held){ await p.mouse.down(); held=true; }
    else if (s.tension >= 0.72 && held){ await p.mouse.up(); held=false; }
    await p.waitForTimeout(70);
  }
  else if (s.state==="result"){ if(held){await p.mouse.up(); held=false;}
    await p.waitForTimeout(140); await shot("08_leap.jpg"); got.leap=true;
    await p.waitForTimeout(1200); await shot("09_catch.jpg"); got.card=true;
    await p.evaluate(()=>document.getElementById("btnNext").click()); await p.waitForTimeout(600); break; }
  else break;
}

// зима: бурение, лунка, мормышка
await p.evaluate(()=>{const s=window.__test.save(); s.loc="winter"; s.weather=null; s.equipped.bait="bloodworm"; window.__test.persist();});
await p.reload(); await p.waitForTimeout(1200); await p.click("#btnStart"); await p.waitForTimeout(800);
await p.mouse.click(210, 660); await p.waitForTimeout(320); await shot("10_winter_drill.jpg");
await p.waitForTimeout(1700); await shot("11_winter_hole.jpg");
const box2 = await B();
await p.mouse.move(box2.x, box2.y); await p.mouse.down(); await p.waitForTimeout(450); await p.mouse.up();
await p.waitForFunction(()=>window.__dbg().state==="waiting",{timeout:15000});
await p.mouse.click(box2.x, box2.y); await p.waitForTimeout(140); await shot("12_winter_jig.jpg");

// премиум и квесты
await p.evaluate(()=>{const s=window.__test.save(); s.pearl=12; window.__test.persist();});
await p.evaluate(()=>document.getElementById("tabShop").click()); await p.waitForTimeout(450);
await p.evaluate(()=>document.querySelector('#shopSeg .seg[data-slot="rod"]').click()); await p.waitForTimeout(500);
await p.evaluate(()=>{const it=document.querySelector("#itemList .item.premium"); if(it) it.scrollIntoView({block:"center"});});
await p.waitForTimeout(700); await shot("13_premium.jpg");
await p.evaluate(()=>document.querySelector('[data-close="sheetShop"]').click()); await p.waitForTimeout(300);
await p.evaluate(()=>document.getElementById("tabQuests").click()); await p.waitForTimeout(700); await shot("14_quests.jpg");

// море и ночь
for (const [loc,file] of [["sea","15_sea.jpg"],["night","16_night.jpg"]]){
  await p.evaluate(l=>{const s=window.__test.save(); s.loc=l; s.weather=null; window.__test.persist();}, loc);
  await p.reload(); await p.waitForTimeout(1200); await p.click("#btnStart"); await p.waitForTimeout(1700);
  await shot(file);
}
console.log("GOT", JSON.stringify(got), "ERRS", JSON.stringify(errs));
await b.close();
