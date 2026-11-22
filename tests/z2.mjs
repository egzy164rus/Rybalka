import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:430,height:860}, deviceScaleFactor:2 });
p.on("pageerror",e=>console.log("ERR",e.message));
await p.goto((process.env.GAME_URL || new URL("../rybalka.html", import.meta.url).href)); await p.waitForTimeout(1200);
await p.click("#btnStart"); await p.waitForTimeout(1500);
console.log("state0", JSON.stringify(await p.evaluate(()=>window.__dbg())));
for (const [x,y] of [[300,700],[120,560],[360,500]]){
  await p.mouse.click(x,y); await p.waitForTimeout(400);
  const st = await p.evaluate(()=>window.__dbg());
  console.log("click",x,y,"->",st.state, st.spot);
}
// через тест-хук
console.log("localStorage", await p.evaluate(()=>Object.keys(localStorage)));
await b.close();
