import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:430,height:860}, deviceScaleFactor:2 });
p.on("pageerror",e=>console.log("ERR",e.message));
await p.goto((process.env.GAME_URL || new URL("../rybalka.html", import.meta.url).href)); await p.waitForTimeout(1200);
await p.click("#btnStart"); await p.waitForTimeout(1200);
for (const [x,y] of [[300,600],[300,660],[300,700],[300,720],[200,640]]){
  await p.mouse.click(x,y); await p.waitForTimeout(350);
  console.log(x,y,"->", JSON.stringify(await p.evaluate(()=>window.__dbg().state)), await p.evaluate(()=>{
    const el=document.elementFromPoint(300,700); return el? (el.tagName+"#"+(el.id||"")+"."+(typeof el.className==="string"?el.className:"")) : "none";
  }));
}
await p.screenshot({path:"./tests/out/g1.png"});
await b.close();
