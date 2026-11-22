// smoke: главный сценарий игры — свободный заброс в любое место, ожидание с интересом,
// подсечка, вываживание, карточка улова. Проверяем 5 водоёмов и отсутствие ошибок консоли.
import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:430,height:860}, deviceScaleFactor:2 });
const errs=[]; p.on("pageerror",e=>errs.push(e.message));
const GAME = (process.env.GAME_URL || new URL("../rybalka.html", import.meta.url).href);
const B = async ()=>p.evaluate(()=>{const r=document.getElementById("action").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};});
async function boot(cfg){
  await p.goto(GAME); await p.waitForTimeout(1000);
  await p.click("#btnStart"); await p.waitForTimeout(300);
  await p.evaluate(c=>{const s=window.__test.save(); s.xp=140000; s.coins=9000; s.loc=c.loc; s.weather=null;
    s.baits[c.bait]=999; s.equipped.bait=c.bait; s.equipped.rod="sea"; s.seenCoach={c_power:1,c_bite:1,c_fight:1};
    window.__test.persist();}, cfg);
  await p.reload(); await p.waitForTimeout(1200); await p.click("#btnStart"); await p.waitForTimeout(900);
}
async function fish(cfg){
  const box = await B();
  await p.mouse.click(cfg.xy[0], cfg.xy[1]); await p.waitForTimeout(300);
  await p.mouse.move(box.x, box.y); await p.mouse.down(); await p.waitForTimeout(420); await p.mouse.up();
  let held=false, waited=0;
  for (let i=0;i<1500;i++){
    const s = await p.evaluate(()=>window.__dbg());
    if (s.state==="waiting"){
      if (s.waitDur > 2.5 && i % 20 === 0 && (cfg.jig??true)) await p.mouse.click(box.x, box.y); // подёргиваем приманку
      if (!waited) waited = s.waitDur || 0;
      await p.waitForTimeout(90);
    }
    else if (s.state==="bite"){ await p.mouse.down(); await p.waitForTimeout(70); await p.mouse.up(); }
    else if (s.state==="fight"){
      if (s.tension < 0.68 && !held){ await p.mouse.down(); held=true; }
      else if (s.tension >= 0.72 && held){ await p.mouse.up(); held=false; }
      await p.waitForTimeout(70);
    }
    else if (s.state==="result"){ if(held){await p.mouse.up(); held=false;} await p.waitForTimeout(1150);
      const card = await p.evaluate(()=>document.getElementById("catchCard").classList.contains("on"));
      await p.evaluate(()=>{const n=document.getElementById("btnNext"); if(window.__dbg().state==="result") n.click();});
      await p.waitForTimeout(400);
      return {ok:true, card, wait:+waited.toFixed(1)};
    }
    else if (s.state==="aim"||s.state==="idle") return {ok:false, reason:"сход", wait:+waited.toFixed(1)};
  }
  return {ok:false, reason:"таймаут"};
}
const cases = [
  ["заводь", {loc:"lake", bait:"corn", xy:[150,640]}],
  ["река",  {loc:"river", bait:"corn", xy:[250,620]}],
  ["зима",  {loc:"winter", bait:"bloodworm", xy:[210,660]}],
  ["ночь",  {loc:"night", bait:"corn", xy:[150,600]}],
  ["море",  {loc:"sea", bait:"corn", xy:[300,620]}],
];
const res = {};
for (const [name, cfg] of cases){ await boot(cfg); res[name] = await fish(cfg); }
const save = await p.evaluate(()=>({total:window.__test.save().total, lost:window.__test.save().lost}));
const okAll = Object.values(res).every(r=>r.ok);
console.log("результаты:", JSON.stringify(res));
console.log("сохранение:", JSON.stringify(save), "| ошибки:", JSON.stringify(errs));
console.log(okAll && !errs.length ? "SMOKE OK" : "SMOKE FAILED");
await b.close();
process.exit(okAll && !errs.length ? 0 : 1);
