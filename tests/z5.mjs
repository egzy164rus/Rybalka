import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:430,height:860}, deviceScaleFactor:2 });
const errs=[]; p.on("pageerror",e=>errs.push(e.message));
await p.goto((process.env.GAME_URL || new URL("../rybalka.html", import.meta.url).href)); await p.waitForTimeout(1200);
await p.click("#btnStart"); await p.waitForTimeout(900);
await p.evaluate(()=>{const s=window.__test.save(); s.xp=140000; s.baits.corn=99; s.equipped.bait="corn"; s.equipped.rod="sea";
  s.seenCoach={c_power:1,c_bite:1,c_fight:1}; window.__test.persist();});
await p.reload(); await p.waitForTimeout(1200); await p.click("#btnStart"); await p.waitForTimeout(800);
// свободная точка внизу-слева, затем бросок с разной силой
await p.mouse.click(120, 660); await p.waitForTimeout(500);
await p.screenshot({path:"./tests/out/h1_aim.png"});
const B = await p.evaluate(()=>{const r=document.getElementById("action").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};});
await p.mouse.move(B.x,B.y); await p.mouse.down(); await p.waitForTimeout(260); await p.mouse.up(); // слабый бросок
await p.waitForTimeout(600); await p.screenshot({path:"./tests/out/h2_weak.png"});
const weakX = await p.evaluate(()=>{ const c=document.querySelector("canvas"); return null; });
await p.waitForTimeout(4000);
// смена места при прицеливании
await p.evaluate(()=>{ const b=document.getElementById("btnNext"); if(b) b.click(); });
await p.waitForTimeout(600);
await p.mouse.click(330, 620); await p.waitForTimeout(400);
await p.mouse.click(215, 700); await p.waitForTimeout(400);
await p.screenshot({path:"./tests/out/h3_aim2.png"});
console.log("ERRS", JSON.stringify(errs));
await b.close();
