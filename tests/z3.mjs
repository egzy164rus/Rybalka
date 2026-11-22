import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:430,height:860}, deviceScaleFactor:2 });
await p.goto((process.env.GAME_URL || new URL("../rybalka.html", import.meta.url).href)); await p.waitForTimeout(1200);
await p.click("#btnStart"); await p.waitForTimeout(1200);
console.log(await p.evaluate(()=>{
  const el = document.elementFromPoint(300,700);
  const el2 = document.elementFromPoint(120,560);
  return {a: el ? el.id+"."+el.className : null, b: el2 ? el2.id+"."+el2.className : null,
    hit: (()=>{ const t=document.getElementById("gearbar"); return t? t.className : ""; })()};
}));
await b.close();
