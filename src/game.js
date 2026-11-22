/* ============================================================
   ДВИЖОК ИГРЫ
   ============================================================ */
(() => {
"use strict";

/* ---------------- ассеты (встраиваются при сборке) ---------------- */
const IMG = {
  bgSurface: "__BG_SURFACE_V__",
  bgUnder:   "__BG_UNDERWATER__",
  bgRiver:   "__BG_RIVER_V__",
  bgNight:   "__BG_NIGHT_V__",
  bgOcean:   "__BG_OCEAN_V__",
  bgIce:     "__BG_ICE_V__",
  fish: {
    ersh:"__FISH_ERSH__", plotva:"__FISH_PLOTVA__", karas:"__FISH_KARAS__", okun:"__FISH_OKUN__",
    golavl:"__FISH_GOLAVL__", lin:"__FISH_LIN__", zhereh:"__FISH_ZHEREH__", lesh:"__FISH_LESH__",
    nalim:"__FISH_NALIM__", karp:"__FISH_KARP__", forel:"__FISH_FOREL__", sudak:"__FISH_SUDAK__",
    shchuka:"__FISH_SHCHUKA__", sterlyad:"__FISH_STERLYAD__", beluga:"__FISH_BELUGA__",
    goluboy:"__FISH_GOLUBOY__", moonfish:"__FISH_MOONFISH__", som:"__FISH_SOM__",
    yaz:"__FISH_YAZ__", harius:"__FISH_HARIUS__", taimen:"__FISH_TAIMEN__", ugor:"__FISH_UGOR__",
    karas_zolotoy:"__FISH_KARAS_ZOLOTOY__", svetlyachok:"__FISH_SVETLYACHOK__",
    korolevskiy:"__FISH_KOROLEVSKIY__",
    cod:"__FISH_COD__", flounder:"__FISH_FLOUNDER__", tuna:"__FISH_TUNA__", shark:"__FISH_SHARK__",
    pike_perch:"__FISH_PIKE_PERCH__", mackerel:"__FISH_MACKEREL__", anglerfish:"__FISH_ANGLERFISH__", salmon:"__FISH_SALMON__"
  }
};
const LOC_BG = { lake:"bgSurface", river:"bgRiver", night:"bgNight", winter:"bgIce", sea:"bgOcean" };
/* какой спрайт отвечает за вид (у семейств — общий рисунок) */
const artOf = id => FISH_SPRITE[id] || id;
/* палитра-перекраска, чтобы 100 видов не выглядели близнецами */
const hueOf = id => { let h = 0; for (let i=0;i<id.length;i++) h = (h*31 + id.charCodeAt(i)) % 360; return h; };
function paletteFor(id){
  const F = FISH[id] || {};
  const base = hueOf(id);
  const spec = {
    karas_g:[36,1.12], lin:[30,0.92], oster_r:[18,1.06], beluga:[30,1.18], sterlyad:[14,1.1],
    keta:[358,1.1], nerka:[10,1.2], taimen:[8,1.12], angler:[280,1.0], mako:[210,0.9]
  }[id];
  const hue = spec ? spec[0] : (base % 60) + (F.rar === "mythic" ? 250 : F.rar === "legendary" ? 24 : F.rar === "epic" ? 12 : 0);
  const sat = spec ? spec[1] : 1;
  return { hue: hue - 20, sat, light: 1 };
}

/* ---------------- сохранение ---------------- */
const KEY = "rybalka_v2", OLD = "rybalka_v1";
const DEF = {
  v:2, coins:0, xp:0,
  owned:{ rod:["bamboo"], reel:["simple"], line:["thin"], hook:["simple"], bait:["worm"], net:["none"] },
  equipped:{ rod:"bamboo", reel:"simple", line:"thin", hook:"simple", bait:"worm", net:"none" },
  caught:{}, total:0, mass:0, best:0, bestCast:0,
  casts:0, breaks:0, lost:0,
  loc:"lake", weather:null, seen:false, seenFight:false, mute:false,
  quests:{}, daily:null, streak:0, noBreak:0, day:null,
  pearl:0, pearlTotal:0, locsCaught:{}, perfects:0, accs:0, premLog:{}
};
let save;
try {
  const raw = localStorage.getItem(KEY);
  save = raw ? deepMerge(structuredClone(DEF), JSON.parse(raw)) : structuredClone(DEF);
} catch(e){ save = structuredClone(DEF); }

// миграция со старой версии
if (!localStorage.getItem(KEY)) {
  try {
    const old = JSON.parse(localStorage.getItem(OLD) || "null");
    if (old && old.total) {
      save.coins = Math.round((old.mass||0)/1000*30) + (old.total||0)*12;
      save.total = old.total||0; save.mass = old.mass||0; save.best = old.best||0;
      save.casts = old.casts||0; save.breaks = old.breaks||0; save.lost = old.lost||0;
      save.caught = old.caught||{};
      save.seen = !!old.seen; save.mute = !!old.mute;
    }
  } catch(e){}
}
function deepMerge(base, extra){
  for (const k in extra){
    if (extra[k] && typeof extra[k] === "object" && !Array.isArray(extra[k]))
      base[k] = deepMerge(base[k] && typeof base[k]==="object" ? base[k] : {}, extra[k]);
    else base[k] = extra[k];
  }
  return base;
}
function persist(){ try { localStorage.setItem(KEY, JSON.stringify(save)); } catch(e){} }

/* ---------------- экономика / уровни ---------------- */
const xpForLvl = lvl => Math.round(26 + lvl*36);
function levelInfo(){
  let lvl = 1, rest = save.xp;
  while (rest >= xpForLvl(lvl)) { rest -= xpForLvl(lvl); lvl++; }
  return { lvl, cur:rest, need:xpForLvl(lvl) };
}
const gear = () => save.equipped;
/* определения снастей: ищут и в обычных таблицах, и в премиум-слое */
const premBy = (slot, id) => {
  if (!id || id.slice(0,2) !== "p_") return null;
  const hit = Object.entries(PREMIUM).find(([k, p]) => p.kind === slot && ("p_"+k === id || "p_"+p.kind === id));
  return hit ? hit[1] : null;
};
const rodDef  = () => premBy("rod",  save.equipped.rod)  || RODS[save.equipped.rod]  || RODS.bamboo;
const reelDef = () => premBy("reel", save.equipped.reel) || REELS[save.equipped.reel] || REELS.simple;
const lineDef = () => premBy("line", save.equipped.line) || LINES[save.equipped.line] || LINES.mono;
const netDef  = () => premBy("net",  save.equipped.net)  || NETS[save.equipped.net]   || NETS.small;
const hookDef = () => premBy("hook", save.equipped.hook) || HOOKS[save.equipped.hook] || HOOKS.plain;
const baitDef = () => BAITS[save.equipped.bait];
/* таблица слота вместе с премиум-предметами */
function tableFor(slot){
  const base = SLOTS.find(s => s.id === slot).table;
  const extra = {};
  for (const k of PEARL_ITEMS) if (PREMIUM[k].kind === slot) extra["p_"+k] = PREMIUM[k];
  return Object.assign({}, base, extra);
}
const itemDef = (slot, id) => (RODS[id] || REELS[id] || LINES[id] || HOOKS[id] || NETS[id] || BAITS[id] ||
  premBy(slot, id) || Object.values(PREMIUM).find(p => "p_"+p.kind === id) || {name:"?", power:0, tier:1});
/* запас приманок: {baitId: кол-во} */
if (!save.baits || typeof save.baits !== "object") save.baits = { worm:60 };
if (!save.quests || typeof save.quests !== "object") save.quests = {};
if (typeof save.noBreak !== "number") save.noBreak = 0;
if (typeof save.pearl !== "number") save.pearl = 0;
if (!save.locsCaught || typeof save.locsCaught !== "object") save.locsCaught = {};
if (typeof save.perfects !== "number") save.perfects = 0;
const baitsLeft = id => save.baits[id] || 0;
function useBait(n = 1){
  const id = save.equipped.bait;
  save.baits[id] = Math.max(0, baitsLeft(id) - n);
  persist(); updateChips();
}
/* если приманка кончилась — докупаем за монеты, а без денег сосед поделится */
function ensureBait(){
  const id = save.equipped.bait;
  if (baitsLeft(id) > 0) return true;
  const price = BAITS[id].price, pack = 10, cost = price * pack;
  if (save.coins >= cost){
    save.coins -= cost; save.baits[id] = pack;
    persist(); updateChips();
    toast("Приманка кончилась", "Купили " + pack + " шт «" + BAITS[id].name + "» за " + cost + " монет.", 2200);
    return true;
  }
  save.baits[id] = 5;
  persist(); updateChips();
  toast("Сосед поделился", "Денег нет — наловил " + 5 + " шт «" + BAITS[id].name + "». Поймай рыбу и купи запас.", 2600);
  return true;
}
function restockCost(ids){
  return ids.reduce((sum, id) => sum + BAITS[id].price * 20, 0);
}
/* «сила снасти» — минимум из удочки и лески; если рыба сильнее, она уйдёт */
const gearPower = () => Math.min(rodDef().power, lineDef().power);
/* ---------------- премиум-клуб: уровень, перки, клубный плёс ---------------- */
/* в сохранении премиум-предметы лежат как «p_premRod», в PREMIUM — как «premRod» */
const premKey = (id) => (id && id.slice(0,2) === "p_" ? id.slice(2) : id);
const isPrem = (id) => !!PREMIUM[premKey(id)];
const premOwned = () => (save.owned ? Object.keys(save.owned).some(slot =>
  (save.owned[slot]||[]).some(id => isPrem(id))) : false);
const premCount = () => {
  let n = 0;
  for (const k of PEARL_ITEMS){
    const slot = PREMIUM[k].kind;
    const list = (save.owned && save.owned[slot]) || [];
    if (list.includes(k) || list.includes("p_"+k)) n++;
  }
  return n;
};
const premEquipped = () => SLOTS.reduce((n, sl) =>
  n + (isPrem(save.equipped[sl.id]) && (save.owned[sl.id]||[]).includes(save.equipped[sl.id]) ? 1 : 0), 0);
/* уровень клуба: 1 за первый предмет, +1 за каждые два купленных, +1 если надето три и больше */
function clubLvl(){
  const n = premCount();
  if (!n) return 0;
  // каждый премиум-предмет даёт уровень; +1 бонус, если надето три и больше
  return Math.min(5, n + (premEquipped() >= 3 ? 1 : 0));
}
const clubRank = () => CLUB_RANKS[Math.min(5, clubLvl())];
/* 1 предмет / 2 предмета / 5 предметов */
const plur = (n, one, few, many) => {
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b > 1 && b < 5) return few;
  if (b === 1) return one;
  return many;
};
/* значение перка с учётом уровня (0, если перка нет) */
function perk(name){
  const r = clubRank();
  if (!r.perks[name]) return 0;
  return (PERK_VAL[name] || [])[clubLvl()] || 0;
}
/* клубный плёс — четвёртая точка водоёма, видна только участникам клуба */
const clubSpot = () => (premOwned() && CLUB_SPOTS[save.loc]) ? CLUB_SPOTS[save.loc] : null;
const locSpots = () => { const L = LOCATIONS[save.loc] || LOCATIONS.lake; const c = clubSpot(); return c ? L.spots.concat([c]) : L.spots; };
/* ежедневный клубный набор */
const clubDayReady = () => premOwned() && save.clubDay !== todayKey();
function claimClubDay(){
  if (!premOwned()){ toast("Только для клуба", "Купи любой премиум-предмет за жемчуг — и набор твой.", 2400); return false; }
  if (!clubDayReady()){ toast("Набор уже забран", "Новый набор будет завтра.", 1800); return false; }
  save.clubDay = todayKey();
  save.coins = (save.coins||0) + CLUB_DAY.coins;
  save.xp = (save.xp||0) + CLUB_DAY.xp;
  save.pearl = (save.pearl||0) + CLUB_DAY.pearl;
  save.pearlTotal = (save.pearlTotal||0) + CLUB_DAY.pearl;
  for (const b in CLUB_DAY.baits) save.baits[b] = (save.baits[b]||0) + CLUB_DAY.baits[b];
  persist(); updateChips(); renderQuests();
  sfx.level ? sfx.level() : sfx.buy();
  toast("Клубный набор", "+"+CLUB_DAY.coins+" монет, +"+CLUB_DAY.xp+" опыта, +"+CLUB_DAY.pearl+" жемчуг и приманки", 3000);
  return true;
}

const locDef  = () => LOCATIONS[save.loc] || LOCATIONS.lake;

/* ---------------- квесты ---------------- */
const QMAP = {}; QUESTS.forEach(q => QMAP[q.id] = q);
const todayKey = () => {
  const d = new Date();
  return d.getFullYear() + "-" + (d.getMonth()+1) + "-" + d.getDate();
};
function questState(id){
  if (!save.quests[id]) save.quests[id] = {prog:0, done:false};
  return save.quests[id];
}
function questDone(id){ return !!(save.quests[id] && save.quests[id].done); }
function questProgress(q){
  const st = questState(q.id);
  const g = q.goal;
  if (g.type === "species") return {cur: g.list.filter(k => save.caught[k]).length, max: g.list.length};
  if (g.type === "allLocs"){
    const n = Object.keys(LOCATIONS).filter(l => save.locsCaught[l]).length;
    return {cur: Math.min(n, g.n), max: g.n};
  }
  if (g.type === "questsDone"){
    const n = QUESTS.filter(x => questDone(x.id)).length;
    return {cur: Math.min(n, g.n), max: g.n};
  }
  if (g.type === "speciesCount"){
    const n = g.list.reduce((sum, k) => sum + ((save.caught[k] && save.caught[k].n) || 0), 0);
    return {cur: Math.min(n, g.n), max: g.n};
  }
  if (g.type === "speciesAny") return {cur: Math.min(st.prog, g.n), max: g.n};
  if (g.type === "weight" || g.type === "noBreak") return {cur: Math.min(st.prog, g.n), max: g.n};
  return {cur: Math.min(st.prog, g.n || 100), max: g.n || 100};
}
function questUnlocked(q){
  const need = {peace:1, pred:2};   // сколько рыб поймано для доступа
  return (save.total||0) >= (need[q.id] || 0);
}
function questClaimable(q){
  const p = questProgress(q);
  return !questDone(q.id) && p.cur >= p.max;
}
function grantReward(r){
  const parts = [];
  if (r.coins){ save.coins += r.coins; parts.push("+"+r.coins+" монет"); }
  if (r.xp){ save.xp += r.xp; parts.push("+"+r.xp+" опыта"); }
  if (r.rod && !save.owned.rod.includes(r.rod)){
    save.owned.rod.push(r.rod); parts.push("удочка «"+RODS[r.rod].name+"»");
  }
  if (r.line && !save.owned.line.includes(r.line)){
    save.owned.line.push(r.line); parts.push("леска «"+LINES[r.line].name+"»");
  }
  if (r.bait && r.baitN){ save.baits[r.bait] = baitsLeft(r.bait) + r.baitN; parts.push(r.baitN+" шт «"+BAITS[r.bait].name+"»"); }
  if (r.pearl){ save.pearl = (save.pearl||0) + r.pearl; save.pearlTotal = (save.pearlTotal||0) + r.pearl; parts.push("+"+r.pearl+" жемчуг"); }
  return parts;
}
function claimQuest(id){
  const q = QMAP[id]; if (!q || !questClaimable(q)) return;
  const st = questState(id);
  st.done = true; st.prog = questProgress(q).max;
  const parts = grantReward(q.reward);
  persist(); updateChips(); renderQuests();
  sfx.level(); buzz(30);
  toast("Квест выполнен: " + q.title, parts.join(" · "), 3000);
  G.questFlash = {t:1.4};
  updateQuestDot();
}
/* прогресс квестов по событию улова */
function questOnCatch(f){
  if (f.junk) return;
  const isNew = !save.caught[f.type] || save.caught[f.type].n === 1;
  for (const q of QUESTS){
    const st = questState(q.id);
    if (st.done) continue;
    const g = q.goal;
    let add = false;
    if (g.type === "catchAny") add = true;
    if (g.type === "species" && g.list.includes(f.type)) add = true;
    if (g.type === "speciesAny" && (!g.list || g.list.includes(f.type))) add = true;
    if (g.type === "cat" && FISH_CAT_OF[f.type] === g.cat) add = true;
    if (g.type === "loc" && save.loc === g.loc) add = true;
    if (g.type === "rarity" && g.list.includes(f.rar)) add = true;
    if (g.type === "weight" && f.weight >= g.n) add = true;
    if (g.type === "bait" && save.equipped.bait === g.bait) add = true;
    if (g.type === "noBreak") add = true;
    if (g.type === "speciesCount" && g.list.includes(f.type)) add = true;
    if (g.type === "weightLoc" && save.loc === g.loc && f.weight >= g.n) add = true;
    if (g.type === "rarityLoc" && save.loc === g.loc && g.list.includes(f.rar)) add = true;
    if (add) st.prog++;
  }
  if (save.quests.q_kinds) save.quests.q_kinds.prog = Object.keys(save.caught).length;
  // жемчуг: редко и по-крупному
  const pearlBase = f.rar === "mythic" ? 0.9 : f.rar === "legendary" ? 0.55 : f.rar === "epic" ? 0.18 : 0.03;
  const pearlChance = clamp(pearlBase + perk("pearl"), 0, 0.97);
  if (Math.random() < pearlChance){
    save.pearl = (save.pearl||0) + 1; save.pearlTotal = (save.pearlTotal||0) + 1;
    G.pearlFind = true;
  }
  save.noBreak++;
  // «все 100 видов»
  if (save.quests.q_all) save.quests.q_all.prog = Object.keys(save.caught).length;
  save.locsCaught[save.loc] = true;
  if (save.quests.q_perfect) save.quests.q_perfect.prog = save.perfects || 0;
  if (save.quests.q_casts) save.quests.q_casts.prog = save.accs || 0;
  persist();
  // ежедневные
  dailyOn("any", 1);
  dailyOn("cat", 1, FISH_CAT_OF[f.type]);
  dailyOn("weight", f.weight);
  if (["rare","epic","legendary","mythic"].includes(f.rar)) dailyOn("rar", 1);
  if (isNew) dailyOn("new", 1);
  G.questPopups = G.questPopups || [];
  for (const q of QUESTS) if (questClaimable(q) && !st_shown(q.id)) G.questPopups.push(q.id);
}
const _shownQ = {};
function st_shown(id){ return _shownQ[id]; }
function checkQuestPopups(){
  const list = (G.questPopups || []).filter(id => !_shownQ[id] && questClaimable(QMAP[id]));
  if (!list.length) return;
  const id = list[0];
  _shownQ[id] = true;
  showQuestDone(QMAP[id]);
}
function questOnBreak(){
  save.noBreak = 0; persist();
}

/* ---------------- ежедневные цели ---------------- */
function dailyNow(){
  const key = todayKey();
  if (!save.daily || save.day !== key){
    // детерминированный выбор по дате
    let seed = 0; for (const ch of key) seed = (seed*31 + ch.charCodeAt(0)) % 99991;
    const picks = [];
    const n = 3;
    let idx = seed % DAILY_POOL.length;
    while (picks.length < n){
      if (!picks.includes(DAILY_POOL[idx])) picks.push(DAILY_POOL[idx]);
      idx = (idx + 3) % DAILY_POOL.length;
    }
    save.daily = { key, done:{}, tasks: picks.map(p => p.id) };
    save.day = key;
    save.streak = (save.streak || 0);
    persist();
  }
  return save.daily.tasks.map(id => DAILY_POOL.find(d => d.id === id));
}
function dailyProg(task){
  const d = save.daily || {};
  d.prog = d.prog || {};
  if (typeof d.prog[task.id] !== "number") d.prog[task.id] = 0;
  return {cur: Math.min(d.prog[task.id], task.n), max: task.n};
}
function dailyOn(kind, amount, extra){
  const tasks = dailyNow();
  let changed = false;
  for (const t of tasks){
    if (t.type !== kind && !(kind === "cat" && t.type === "cat")) continue;
    if (t.type === "cat" && extra && t.cat !== extra) continue;
    const d = save.daily; d.prog = d.prog || {};
    const max = t.n;
    const before = d.prog[t.id] || 0;
    if (before >= max) continue;
    d.prog[t.id] = Math.min(max, kind === "weight" ? Math.max(before, amount) : before + (amount||1));
    changed = true;
  }
  if (changed) persist();
}
function claimDaily(id){
  const tasks = dailyNow();
  const t = tasks.find(x => x.id === id); if (!t) return;
  const p = dailyProg(t); if (p.cur < p.max) return;
  save.daily.done = save.daily.done || {};
  if (save.daily.done[id]) return;
  save.daily.done[id] = true;
  save.coins += t.coins; save.xp += t.xp;
  persist(); updateChips(); renderQuests();
  sfx.level();
  toast("Ежедневная цель", "+"+t.coins+" монет · +"+t.xp+" опыта", 2400);
  const allDone = tasks.every(x => save.daily.done[x.id]);
  if (allDone) toast("Все цели дня закрыты!", "Завтра придут новые. Так держать.", 3000);
}

/* ---------------- dom ---------------- */
const $ = id => document.getElementById(id);
const cv = $("cv"), ctx = cv.getContext("2d");
const app = $("app");

/* ---------------- аудио ---------------- */
let actx = null;
function audio(){
  if (save.mute) return null;
  if (!actx){ try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){ return null; } }
  if (actx.state === "suspended") actx.resume();
  return actx;
}
function tone(freq, dur, type="sine", gain=0.1, slideTo=null){
  const a = audio(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, a.currentTime);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, a.currentTime + dur);
  g.gain.setValueAtTime(0.0001, a.currentTime);
  g.gain.exponentialRampToValueAtTime(gain, a.currentTime + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
  o.connect(g).connect(a.destination); o.start(); o.stop(a.currentTime + dur + 0.03);
}
function noise(dur=0.25, gain=0.16, filt=900){
  const a = audio(); if (!a) return;
  const len = Math.floor(a.sampleRate*dur), buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i=0;i<len;i++) d[i] = (Math.random()*2-1) * Math.pow(1-i/len, 2.2);
  const src = a.createBufferSource(); src.buffer = buf;
  const f = a.createBiquadFilter(); f.type="lowpass"; f.frequency.value=filt;
  const g = a.createGain(); g.gain.value = gain;
  src.connect(f).connect(g).connect(a.destination); src.start();
}
const sfx = {
  tap(){ tone(620,0.05,"sine",0.04); },
  cast(){ noise(0.26,0.09,1500); tone(560,0.16,"triangle",0.045,190); },
  splash(){ noise(0.3,0.15,1100); },
  bite(){ tone(880,0.08,"square",0.065); setTimeout(()=>tone(1180,0.1,"square",0.055),88); },
  hook(){ tone(300,0.12,"sawtooth",0.075,720); },
  pull(){ tone(145,0.13,"sawtooth",0.055,92); },
  perfect(){ tone(1320,0.09,"sine",0.06,1760); },
  win(rar){
    const sets = {
      common:    [523,659],
      uncommon:  [523,659,784],
      rare:      [523,659,784,1046],
      epic:      [523,659,784,1046,1318],
      legendary: [523,659,784,1046,1318,1568],
      mythic:    [392,523,659,784,1046,1318,1568]
    };
    const arr = sets[rar] || sets.common;
    arr.forEach((f,i)=>setTimeout(()=>tone(f,0.26,"triangle",0.075),i*86));
    if (rar === "mythic" || rar === "legendary") setTimeout(()=>tone(arr[0]/2, 0.7, "sine", 0.06), 120);
  },
  snap(){ noise(0.34,0.28,2600); tone(220,0.28,"sawtooth",0.09,60); },
  lost(){ tone(320,0.38,"sine",0.08,130); },
  thunder(){ noise(0.7,0.22,420); tone(70,0.6,"sine",0.09,38); },
  buy(){ [740,988,1318].forEach((f,i)=>setTimeout(()=>tone(f,0.14,"triangle",0.07),i*70)); },
  level(){ [523,784,1046,1318].forEach((f,i)=>setTimeout(()=>tone(f,0.3,"sine",0.075),i*100)); }
};
function buzz(ms){ if (!save.mute && navigator.vibrate) try { navigator.vibrate(ms); } catch(e){} }

/* ---------------- canvas ---------------- */
let W=0,H=0,DPR=1;
function resize(){
  DPR = Math.min(window.devicePixelRatio||1, 2);
  const r = app.getBoundingClientRect();
  W = Math.max(300, r.width); H = Math.max(300, r.height);
  cv.width = Math.round(W*DPR); cv.height = Math.round(H*DPR);
  ctx.setTransform(DPR,0,0,DPR,0,0);
}
window.addEventListener("resize", resize);

const images = {};
for (const k in IMG){
  if (k === "fish") continue;
  const im = new Image(); im.src = IMG[k]; images[k] = im;
}
images.fish = {};
for (const k in IMG.fish){
  const im = new Image(); im.src = IMG.fish[k]; images.fish[k] = im;
}

/* ---------------- сцена ---------------- */
function geo(){
  const L = save.loc;
  const horizon = L === "night" ? 0.385 : L === "sea" ? 0.44 : 0.435;
  const surfaceY = H*horizon;
  return {
    surfaceY,
    rodBase:{ x: W*1.03, y: H*0.83 },
    rodTip: { x: W*0.86, y: surfaceY - H*0.175 }
  };
}
function spotPos(sp){
  const g = geo();
  const x = sp.x * W;
  const y = sp.y ? sp.y * H : g.surfaceY + H*(sp.depth === "мелко" ? 0.045 : sp.depth === "глубоко" ? 0.135 : 0.088);
  return {x, y};
}
function wY(){ return G.baseY || geo().surfaceY; }

/* идеальная сила заброса: чем дальше место, тем сильнее надо замахнуться */
function idealPowerFor(x){
  const g = geo();
  const reachW = W*0.86;
  return clamp((g.rodTip.x - x) / reachW, 0.10, 0.94);
}

/* ---- свободный заброс: зона в любой точке воды собирает свой состав рыбы ---- */
function locDepth(sp){ return sp.depth || "средне"; }
/* имя зоны по вертикали: чем ниже точка, тем глубже */
function depthNameByY(y){
  const g = geo();
  const k = (y - g.surfaceY) / Math.max(1, (H - g.surfaceY));
  return k < 0.30 ? "мелко" : k < 0.62 ? "средне" : "глубоко";
}
function zonePool(x, y){
  const spots = locSpots();
  const k = clamp((y - geo().surfaceY) / Math.max(1, (H - geo().surfaceY)), 0, 1);
  const near = [];
  for (const sp of spots){
    const pos = spotPos(sp);
    const d = Math.hypot((x - pos.x)/(W*0.55), (y - pos.y)/(H*0.30));
    near.push({ sp, wgt: 1 / (0.35 + d*d) });
  }
  const sum = near.reduce((a,b) => a + b.wgt, 0) || 1;
  const out = {};
  for (const n of near){
    const depthBoost = 1 + 0.45*Math.abs(k - clamp((spotPos(n.sp).y - geo().surfaceY)/Math.max(1,(H-geo().surfaceY)),0,1));
    const share = n.wgt/sum * depthBoost;
    for (const key in n.sp.w) out[key] = (out[key] || 0) + n.sp.w[key] * share;
  }
  return out;
}
/* ближайшая «именованная» точка — только для подписи */
function nearestSpotName(x, y){
  let best = null, bd = 1e9;
  for (const sp of locSpots()){
    const pos = spotPos(sp);
    const d = Math.hypot(x - pos.x, y - pos.y);
    if (d < bd){ bd = d; best = sp; }
  }
  const depth = depthNameByY(y);
  const nearEnough = bd < Math.min(W,H)*0.20;
  if (nearEnough) return best.name;
  return depth === "мелко" ? "Отмель" : depth === "глубоко" ? "Глубина" : "Открытая вода";
}
/* выбрать точку в произвольном месте (вода или лёд) */
function castAt(x, y, quiet){
  const g = geo();
  const sp = {
    id: "free",
    name: nearestSpotName(x, y),
    x: clamp(x / W, 0.06, 0.94),
    y: clamp(y / H, (g.surfaceY + 10) / H, 0.94),
    depth: depthNameByY(y),
    sweet: [0.42, 0.74],
    w: zonePool(x, y),
    free: true
  };
  selectSpot(sp);
  return sp;
}
/* лунка: если выбрана точка — центрируем на ней, иначе по центру экрана */
function holeXY(){
  const idle = (G.state === "idle" || G.state === "aim" || G.state === "power");
  const x = idle && G.spot ? spotPos(G.spot).x : (idle ? W*0.5 : G.bobX);
  const y = idle && G.spot ? G.baseY : wY();
  return { x, y: y + 6 };
}

/* ---------------- состояние ---------------- */
const GREEN_LO = 0.40;

/* погода зависит от водоёма и «крутится» после каждого N забросов */
function rollWeather(){
  const night = save.loc === "night";
  const pool = night ? ["sunny","moon","mist","overcast","thunder"]
    : save.loc === "winter" ? ["snow","frost","snow","overcast","sunny","mist"]
    : save.loc === "sea" ? ["sunny","overcast","thunder","rain","mist","sunny"]
    : ["sunny","overcast","rain","mist","thunder","sunny","overcast"];
  const w = pool[(Math.random()*pool.length)|0];
  save.weather = {type:w, rolls: -(1 + ((Math.random()*4)|0))};   // сколько забросов ещё действует
  persist();
  return save.weather;
}
function weatherNow(){
  if (!save.weather || !WEATHER[save.weather.type]) rollWeather();
  return WEATHER[save.weather.type] || WEATHER.overcast;
}
function tickWeather(){
  if (!save.weather) { rollWeather(); return; }
  save.weather.rolls++;
  if (save.weather.rolls >= 0) { rollWeather(); syncWeatherChip(); announceWeather(); }
  persist();
}
const G = {
  state:"idle",       // idle | aim | power | casting | waiting | bite | fight | result
  cardOpen:false, approach:0,
  t:0, clock:0,
  spot:null, baseY:0,  // выбранная точка и её уровень воды
  power:0, powerT:0, lockedPower:0, acc:0,
  hold:false,
  tension:GREEN_LO+0.05, progress:0,
  bobX:0, bobY:0, bobTarget:0,
  fish:null, leap:null,
  biteWindow:900, biteAt:0,
  pull:{active:false, warn:0, timer:1.2, dur:0, activeT:0, pending:false},
  slackT:0, perfectT:0, lastHint:"", particles:[], rings:[], shake:0, flash:0,
  castDur:0.6, castT:0, castFrom:null, jigT:0, jigPhase:0,
  floatingTexts:[]
};
const lineHI = () => lineDef().hi;
$("tensionZone").style.left = (GREEN_LO*100)+"%";
$("tensionZone").style.width = ((lineHI()-GREEN_LO)*100)+"%";

/* ---------------- утилиты ---------------- */
const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
const lerp = (a,b,t)=>a+(b-a)*t;
const fmtKg = g => (g/1000).toFixed(2);
const fmtNum = n => n >= 1000 ? (n/1000).toFixed(n%1000?1:0).replace(".",",") + "к" : String(n);
const roundKg = g => g >= 1000 ? (g/1000).toFixed(1).replace(".",",") : String(g);
const rnd = (a,b)=>a+Math.random()*(b-a);

function toast(text, sub, ms=1500){
  const el = $("toast") || (() => { const d = document.createElement("div"); d.id="toast"; app.appendChild(d); return d; })();
  el.innerHTML = text + (sub ? "<small>"+sub+"</small>" : "");
  el.classList.add("on");
  clearTimeout(toast._t);
  toast._t = setTimeout(()=>el.classList.remove("on"), ms);
}
let hintT = 0;
let hintToken = 0;
function hint(text, sticky){
  const el = $("hint");
  if (!text){ el.classList.remove("on"); return; }
  el.textContent = text; el.classList.add("on");
  const my = ++hintToken;
  clearTimeout(hintT);
  if (!sticky) hintT = setTimeout(()=>{ if (my === hintToken) el.classList.remove("on"); }, 3200);
}
function burst(x,y,n=14,spd=190,color="rgba(220,245,255,"){
  for (let i=0;i<n;i++){
    const a = -Math.PI/2 + rnd(-1.1,1.1), s = spd*rnd(0.35,1.15);
    G.particles.push({x,y,vx:Math.cos(a)*s*0.6,vy:Math.sin(a)*s,life:rnd(0.45,0.95),r:rnd(1.4,3.4),color});
  }
}
function ring(x,y){ G.rings.push({x,y,r:3,a:1}); }
function floatText(text, x, y, color="#ffe9a3"){
  G.floatingTexts.push({text,x,y,life:1.1,color});
}

/* ---------------- выбор рыбы ---------------- */
function pickFish(spot){
  const L = locDef();
  if (Math.random() < 0.045) {
    const j = JUNK[(Math.random()*JUNK.length)|0];
    return { junk:true, name:j.name, note:j.note, art:j.art };
  }
  const bait = save.equipped.bait;
  const rod = rodDef();
  let total = 0;
  const w = {};
  for (const k in spot.w){
    const F = FISH[k];
    if (!F) continue;
    let v = spot.w[k];
    // ЖЁСТКО: рыба берёт только свою приманку и только снасть нужной прочности
    if (F.bait !== bait) continue;
    if (F.reqPower > rod.power) continue;
    if (F.sea && !rod.sea) continue;
    // «снасть на пределе» — такая рыба почти не клюёт
    v *= F.reqPower > rod.power * 0.94 ? 0.35 : 1;
    if (rod.tier >= 4 && F.aggr >= 0.7) v *= 1.18;
    if (F.rar === "mythic") v *= 0.55;
    w[k] = v; total += v;
  }
  if (!total){
    const empty = { junk:true, noBite:true, name:"пусто", note:"На эту приманку здесь никто не берёт." };
    return empty;
  }
  let r = Math.random()*total, type = Object.keys(w)[0];
  for (const k in w){ r -= w[k]; if (r <= 0){ type = k; break; } }
  const F = FISH[type];
  const u = Math.pow(Math.random(), 1.55 + perk("big")*3);   // клуб: чаще крупные особи
  const weight = Math.round((F.wMin + u*(F.wMax-F.wMin)) * L.sizeMul * weatherNow().size * (1 + perk("all")));
  const norm = clamp((weight - F.wMin*L.sizeMul) / (F.wMax*L.sizeMul - F.wMin*L.sizeMul), 0, 1);
  return {
    junk:false, type, name:F.name, rar:F.rar, note:F.note, weight, norm,
    aggr:F.aggr, stam:F.stam, val:F.val, xp:F.xp, art:artOf(type), palette:paletteFor(type),
    bait:F.bait, reqPower:F.reqPower
  };
}

/* кто вообще может клюнуть в точке на текущую приманку/удочку */
function spotPool(spot){
  const out = [];
  for (const k in spot.w){
    const F = FISH[k];
    if (!F) continue;
    out.push({ id:k, F, okBait: F.bait === save.equipped.bait, okRod: F.reqPower <= rodDef().power });
  }
  return out;
}
/* какие приманки вообще имеют смысл в этом водоёме */
function locBaits(){
  const set = new Set();
  for (const sp of locSpots()) for (const k in sp.w) if (FISH[k]) set.add(FISH[k].bait);
  return set;
}

/* ---------------- вычисление боя ---------------- */
function fightParams(f){
  const L = locDef(), rod = rodDef(), reel = reelDef(), hook = hookDef();
  const depthBonus = G.spot && G.spot.depth === "глубоко" ? 1.12 : 1;
  const rodP = 1 + (rod.power - 70) / 190;          // 1.0 … ~1.7
  const lineP = 1 + (lineDef().power - 80) / 260;   // 1.0 … ~1.3
  return {
    holdGain: (0.30 - f.stam*0.10) * reel.gain * (1 + f.norm*0.12),
    pullPower: (0.26 + f.aggr*0.30) * (0.72 + f.norm*0.62) * L.pullMul * depthBonus,
    progress: (0.34 - f.stam*0.085) * reel.speed * rodP * lineP * (1 - f.norm*0.34) * 1.05,
    pullEvery: [0.85 + f.aggr*0.35 + f.norm*0.55, 1.9 + f.aggr*0.4 + f.norm*0.9],
    pullDur: [0.18 + f.aggr*0.12, 0.30 + f.aggr*0.18 + f.norm*0.16],
    decay: 0.62 * lineDef().decay,
    hi: lineDef().hi,
    hookChance: hook.hookChance,
    escape: hook.escape
  };
}

/* ---------------- поток состояний ---------------- */
function setState(s){
  G.state = s; G.t = 0;
  const btn = $("action");
  btn.dataset.mode = "";
  $("powerWrap").classList.toggle("on", s === "power");
  $("tensionWrap").classList.toggle("on", s === "fight");
  $("dim").classList.toggle("on", false);

  switch (s){
    case "idle":
      btn.disabled = false;
      btn.dataset.mode = "aim";
      btn.innerHTML = "БРОСИТЬ В ЛЮБОЕ МЕСТО";
      hint("Тапни по воде в любом месте — или жми кнопку");
      break;
    case "aim":
      btn.disabled = false;
      btn.innerHTML = "ЗАЖМИ И ОТПУСТИ";
      hint("Зажми, чтобы набрать силу, и отпусти в зелёной зоне");
      break;
    case "power":
      btn.dataset.mode = "power";
      btn.innerHTML = "ОТПУСТИ ДЛЯ ЗАБРОСА";
      hint("Сила: " + Math.round(G.power*100) + "%", true);
      break;
    case "casting":
      btn.disabled = true; btn.innerHTML = "ЛЕТИТ…"; hint("");
      break;
    case "waiting":
      btn.disabled = false; btn.dataset.mode = "wait";
      btn.innerHTML = save.loc === "winter" ? "ПОДЁРНУТЬ МОРМЫШКУ" : "ПОДЕРГАТЬ ПРИМАНКУ";
      // подсказку в ожидании не навязываем: рисуем «интерес» прямо на воде
      hint("");
      break;
    case "bite":
      btn.disabled = false; btn.dataset.mode = "bite";
      btn.innerHTML = "ПОДСЕКАЙ!";
      hint("Тапни, пока кольцо не сжалось!");
      break;
    case "fight":
      btn.disabled = false; btn.dataset.mode = "hold";
      btn.innerHTML = "ДЕРЖИ, ЧТОБЫ ТЯНУТЬ";
      hint("Держи в зелёной зоне · отпускай у красного");
      break;
    case "result":
      btn.disabled = true; btn.innerHTML = "…"; hint("");
      break;
  }
  updateTabState();
  if (typeof renderGearBar === "function"){ renderGearBar(); syncGearbarVisibility(); }
}

/* ---------------- действия ---------------- */
function selectSpot(spot){
  G.spot = spot;
  const pos = spotPos(spot);
  G.baseY = pos.y;
  G.spotFree = !!spot.free;
  // для свободного места зона силы считается от расстояния до него
  if (spot.free){
    const ip = idealPowerFor(pos.x);
    spot.ideal = ip;
    spot.sweet = [clamp(ip-0.09, 0.03, 0.93), clamp(ip+0.09, 0.07, 0.97)];
  }
  const s = spot.sweet;
  $("sweetZone").style.left = (s[0]*100)+"%";
  $("sweetZone").style.width = ((s[1]-s[0])*100)+"%";
  $("tensionZone").style.left = (GREEN_LO*100)+"%";
  $("tensionZone").style.width = ((lineHI()-GREEN_LO)*100)+"%";
  if (save.loc === "winter") startDrill();
  setState("aim");
  sfx.tap();
  coachTip("c_power");
}

function beginPower(){
  if (G.state === "power") return;
  if (G.state !== "aim" && G.state !== "idle") return;
  if (!ensureBait()) return;
  if (G.state === "idle") castAt(W*0.52, geo().surfaceY + (H - geo().surfaceY)*0.42, true);
  G.powerT = 0; G.power = 0.08; G.hold = true;
  setState("power");
  audio();
}

function releasePower(){
  if (G.state !== "power") return;
  G.hold = false;
  const p = G.power, s = G.spot.sweet;
  const dist = p < s[0] ? s[0]-p : p > s[1] ? p-s[1] : 0;
  G.acc = dist === 0 ? 1 : clamp(1 - dist/0.26, 0, 0.95);
  G.lockedPower = p;
  const jitter = (1 - G.acc) * 0.09;
  // сила = дальность: слабый замах не долетает, сильный — перелетает выбранное место
  const tipX = geo().rodTip.x;
  const pos = spotPos(G.spot);
  const ideal = G.spot.free ? (G.spot.ideal || idealPowerFor(pos.x)) : (G.spot.sweet[0]+G.spot.sweet[1])/2;
  const ratio = clamp(p / Math.max(0.08, ideal), 0.12, 1.9);
  G.bobTarget = clamp(tipX - (tipX - pos.x) * ratio + rnd(-jitter,jitter)*W, W*0.04, W*0.97);
  if (G.acc > 0.85){ dailyOn("acc", 1); save.accs = (save.accs||0)+1; }
  if (G.acc > 0.98) floatText("ТОЧНО!", G.bobTarget, geo().surfaceY - 60, "#a7f0bd");
  else if (G.acc > 0.6) floatText("неплохо", G.bobTarget, geo().surfaceY - 60, "#ffe9a3");
  else floatText("мимо зоны", G.bobTarget, geo().surfaceY - 60, "#ffb3a0");
  startCast();
}

function startCast(){
  const g = geo();
  G.castFrom = { x:g.rodTip.x, y:g.rodTip.y };
  G.bobX = g.rodTip.x; G.bobY = g.rodTip.y;
  G.castDur = 0.42 + G.lockedPower*0.26;
  G.castT = 0;
  G.fish = null; G.progress = 0; G.slackT = 0; G.perfectT = 0;
  G.castAtT = G.clock;
  G.tension = clamp(GREEN_LO + 0.05, 0, lineHI()-0.02);
  G.pull = {active:false,warn:0,timer:1.1,dur:0,activeT:0,pending:false};
  save.casts++;
  useBait(1);
  tickWeather();
  const dist = Math.abs(G.bobTarget - g.rodTip.x);
  save.bestCast = Math.max(save.bestCast, Math.round(dist / W * 100));
  persist(); updateChips();
  setState("casting");
  sfx.cast();
}

/* «заинтересованность»: сколько секунд рыба решает, брать ли приманку.
   Медиана ~7 с, но бывает и сразу (удачная точка), и 15-20 с (приходится подождать) -
   ожидание не мгновенное, но и не нудное. */
function biteWait(){
  const L = locDef();
  // сколько видов в этой точке реально берут текущую приманку на эту удочку
  const pool = spotPool(G.spot || L.spots[0]);
  const avail = pool.filter(p => p.okBait && p.okRod).length;
  // приманки нет - никто не заинтересуется
  if (baitsLeft(save.equipped.bait) <= 0) return 999;
  // 1) насколько место «богатое»: чем больше рыба берёт эту приманку, тем скорее поклёвка
  const richK = 1.35 - 0.35 * clamp(avail / 3, 0, 1);
  // 2) погода: гроза тормозит, облачно/мороз ускоряет
  const wxK = 1 / Math.max(0.62, weatherNow().bite);
  // 3) прозрачная тихая вода - рыба осторожнее
  const calmK = G.waterClear ? (save.loc === "winter" ? 1.08 : 1.15) : 1;
  // 4) точность заброса
  const accK = 1.10 - 0.25 * clamp(G.acc || 0, 0, 1);
  const mean = 4.4 * richK * wxK * calmK * accK * (1 - perk("bite"));
  // сумма двух равномерных: чаще 4-8 с, реже крайности
  const g = (Math.random() + Math.random()) / 2;
  let t = mean * (0.42 + g * 1.32);
  if (Math.random() < 0.13) t *= 1.55;   // рыба «думает» - длинное ожидание
  if (Math.random() < 0.10) t *= 0.5;    // повезло - почти сразу
  return clamp(t, 2.0, 16);
}
function startWaiting(){
  // ветер гонит поплавок в сторону
  G.drift = (G.spot && G.spot.free ? clamp(windNow().dir, -1, 1) * windNow().power : 0);
  G.hookSet = (G.hookSet || 0) + 1;
  if (G.fish && G.fish.noBite){
    // приманку тут никто не берёт: ждём впустую, интереса нет
    G.waitDur = rnd(2.6, 4.4);
    G.interest = 0.04; G.pureCasts = G.waitDur; G.falseBite = 0;
    G.nibble = rnd(0.9, 1.8); G.nibbling = false;
    setState("waiting");
    return;
  }
  G.waitDur = biteWait();
  G.interest = 0.06;
  G.pureCasts = rnd(0.8, 1.1);   // «тихое» время без подсказок: сначала просто смотрим на воду
  G.nibble = rnd(0.5, 1.4); G.nibbling = false;
  G.falseBite = 0;
  G.jigCount = 0;
  setState("waiting");
}

function beginBite(){
  G.fish = pickFish(G.spot);
  G.interest = 1; G.falseBite = 0;
  setState("bite");
  G.biteWindow = (900 + rnd(-90, 160) - (G.fish.norm||0)*120) * hookDef().windowMul;
  G.biteAt = 0;
  sfx.bite(); buzz(18);
  coachTip("c_bite");
  ring(G.bobX); burst(G.bobX, wY(), 7, 110);
}

function hook(){
  if (G.state !== "bite") return;
  const ch = hookDef().hookChance;
  if (ch > 0 && Math.random() < ch * 0.35){
    // ранняя подсечка крючком с бородкой — рыба всё равно садится
    floatText("засеклась!", G.bobX, wY()-70, "#a7f0bd");
  }
  sfx.hook(); buzz(30);
  setState("fight");
  G.fish.p = G.fish.junk
    ? { holdGain:0.34, pullPower:0.10, progress:0.52, pullEvery:[2.2,4.2], pullDur:[0.2,0.3], decay:0.7, hi:lineHI() }
    : fightParams(G.fish);
  G.tension = clamp(GREEN_LO + 0.07, 0, lineHI()-0.02);
  G.progress = 0; G.slackT = 0; G.perfectT = 0; G.perfectAcc = 0; G.perfectShown = false;
  G.pull = {active:false,warn:0,timer:0.8+dur0(),dur:0,activeT:0,pending:false};
  G.hold = false; G.lastHint = ""; G.weakShown = false;
  coachTip("c_fight");
  burst(G.bobX, wY(), 20, 240); ring(G.bobX);
  G.shake = 6;
  if (!save.seenFight){
    save.seenFight = true; persist();
  }
}
const dur0 = () => rnd(0.85, 1.6);

function fail(kind){
  if (G.state === "result") return;
  const f = G.fish;
  setState("result");
  if (kind === "break"){
    save.breaks++; questOnBreak();
    sfx.snap(); buzz(60); G.shake = 16; G.flash = 0.5;
    toast("Обрыв лески!", "Слишком сильно натянул — рыба ушла с крючком.", 1900);
  } else if (kind === "weak"){
    save.breaks++; questOnBreak(); persist();
    sfx.snap(); buzz(50);
    toast("Не удержал!", "Рыба оказалась сильнее снасти и ушла. Купи удочку мощнее.", 2200);
  } else if (kind === "lost"){
    save.lost++; sfx.lost(); buzz(24);
    toast("Сход…", "Леска ослабла, и рыба сошла с крючка.", 1900);
  } else if (kind === "miss"){
    save.lost++; sfx.lost();
    toast("Проспал поклёвку", "Рыба выплюнула приманку и ушла.", 1700);
    for (let i=0;i<4;i++) setTimeout(()=>ring(G.bobX + rnd(-10,10)), i*70);
  } else if (kind === "early"){
    toast("Рано!", "Ты дёрнул до поклёвки — рыба испугалась.", 1300);
    G.fish = null;
    G.waitDur = rnd(2, 4.5);
    setState("waiting");
    return;
  }
  persist(); updateChips();
  setTimeout(()=>{ if (G.state === "result") setState("aim"); }, 1500);
}

function succeed(){
  if (G.state === "result") return;
  const f = G.fish;
  setState("result");
  G.hold = false;
  sfx.win(f.rar);
  if (!f.junk){
    G.rarityFlash = {t:0.9, color: (RARITY[f.rar]||RARITY.common).color};
  }
  G.leap = { t:0, x:G.bobX, y:wY(), y0:wY(), x0:G.bobX, spin:0 };
  sfx.splash(); buzz(24);
  for (let i=0;i<4;i++){
    G.rings.push({x:G.bobX + rnd(-12,12), y:0, r:4 + i*6, a:0.9 - i*0.15});
  }
  for (let i=0;i<16;i++){
    const a = -Math.PI/2 + rnd(-1.2,1.2), spd = rnd(90, 260);
    G.particles.push({x:G.bobX + rnd(-8,8), y:wY(), vx:Math.cos(a)*spd*0.5, vy:Math.sin(a)*spd,
      life:rnd(0.5,1.0), r:rnd(1.4,3.2), color:"rgba(225,250,255,"});
  }
  burst(G.bobX, wY(), 26, 300); ring(G.bobX);
  G.jumpUntil = performance.now() + 1150;   // пока летит рыба, карточку не показываем
  setTimeout(()=>showCatch(f), 1150);
}

/* ---------------- итоги ---------------- */
function showCatch(f){
  hideCoach();
  const ov = $("catchCard");
  ov.onclick = (e) => { if (e.target === ov) nextCatch(); };
  // искры для редкой рыбы
  ov.querySelectorAll(".spark").forEach(e => e.remove());
  if (!f.junk && ["rare","epic","legendary","mythic"].includes(f.rar)){
    const n = f.rar === "mythic" ? 16 : f.rar === "legendary" ? 12 : f.rar === "epic" ? 8 : 5;
    const sp = document.createElement("div");
    sp.className = "spark";
    const col = RARITY[f.rar].color;
    for (let i=0;i<n;i++){
      const el = document.createElement("i");
      el.style.left = (6 + Math.random()*88) + "%";
      el.style.top = (10 + Math.random()*70) + "%";
      el.style.background = col;
      el.style.animationDelay = (Math.random()*2.4).toFixed(2) + "s";
      el.style.boxShadow = "0 0 8px " + col;
      sp.appendChild(el);
    }
    ov.querySelector(".card").appendChild(sp);
  }
  const art = $("catchArt");
  if (f.junk){
    $("catchRar").textContent = "мусор";
    $("catchRar").style.cssText = "background:#e3ddd3;color:#6b6156";
    art.innerHTML = '<div style="width:120px;height:120px;margin:0 auto">'+JUNK_ART[f.art]+'</div>';
    $("catchName").textContent = f.name;
    $("weightRow").style.display = "none";
    $("catchNote").textContent = f.note;
    save.coins += 4;
    $("catchCoins").textContent = "+4"; $("catchXp").textContent = "0";
    $("catchTotal").textContent = save.total;
    $("catchNote").textContent = f.note + " За чистоту водоёма +4 монеты.";
  } else {
    const R = RARITY[f.rar];
    $("catchRar").textContent = R.label;
    $("catchRar").style.cssText = "background:"+R.bg+";color:"+R.color;
    const aKey = f.art || artOf(f.type);
    art.innerHTML = '<div class="aqua"></div><div class="fishSwim" id="catchFishSwim">'
      + '<img alt="" src="'+IMG.fish[aKey]+'" class="fbody"'
      + (f.palette ? ' style="filter:hue-rotate('+f.palette.hue+'deg) saturate('+f.palette.sat+')"' : '')
      + '><i class="fpad"></i></div>';
    $("catchGlow").style.background = R.color;
    $("catchGlow").style.opacity = f.rar === "legendary" ? 0.85 : f.rar === "epic" ? 0.6 : 0.35;
    $("catchName").textContent = f.name;
    const cardEl = ov.querySelector(".card");
    cardEl.style.background = f.rar === "mythic"
      ? "linear-gradient(180deg,#fdf4fb,#f0dcf0)"
      : f.rar === "legendary" ? "linear-gradient(180deg,#fdf8e6,#f4e6c2)"
      : f.rar === "epic" ? "linear-gradient(180deg,#fdf5ee,#f2e2d4)"
      : "linear-gradient(180deg,#fdf8ec,#efe3cb)";
    $("weightRow").style.display = "";
    $("catchWeight").textContent = fmtKg(f.weight);
    $("catchNote").textContent = f.note;

    const prev = save.caught[f.type];
    const isRec = !prev || f.weight > (prev.best||0);
    $("catchRecord").innerHTML = isRec ? '<span class="rec">РЕКОРД</span>' : "";

    const perfectBonus = 1 + Math.min(0.25, (G.perfectAcc || 0) * 0.09);
    const coins = Math.round(f.weight/1000 * f.val * (1 + G.acc*0.35) * perfectBonus * (1 + perk("coin")));
    const xp = Math.round(f.xp + f.weight/1000*4);
    $("catchCoins").textContent = "+"+coins;
    $("catchXp").textContent = "+"+xp;
    const pearlCell = $("pearlCell");
    if (pearlCell) pearlCell.style.display = G.pearlFind ? "" : "none";

    save.coins += coins;
    const beforeLvl = levelInfo().lvl;
    save.xp += xp;
    save.total++; save.mass += f.weight;
    save.best = Math.max(save.best, f.weight);
    if (!save.caught[f.type]) save.caught[f.type] = {n:0,best:0};
    save.caught[f.type].n++;
    save.caught[f.type].best = Math.max(save.caught[f.type].best, f.weight);
    if (isRec) save.caught[f.type].isNew = true;
    $("catchTotal").textContent = save.caught[f.type].n;
    persist();

    const afterLvl = levelInfo().lvl;
    if (afterLvl > beforeLvl){ G.pendingLevel = afterLvl; }
    if ((G.perfectAcc || 0) > 0.9){
      // идеальное вываживание — шанс на жемчужину
      save.perfects = (save.perfects||0)+1;
      if (Math.random() < 0.22){
        save.pearl = (save.pearl||0)+1; save.pearlTotal = (save.pearlTotal||0)+1;
        G.pearlFind = true;
      }
    }
    G.perfectOnce = false;
    questOnCatch(f);
  }
  // чипы-детали: погода, точка, точность заброса, запас прочности снасти
  const meta = $("catchMeta");
  if (meta){
    if (f.junk) meta.innerHTML = "";
    else {
      const wt = weatherNow();
      const F = FISH[f.type], rod = rodDef();
      const tight = F.reqPower > rod.power * 0.94;
      meta.innerHTML =
        ((G.perfectAcc || 0) > 0.9 ? '<span class="ok">идеальное вываживание</span>' : '') +
        '<span>'+(WEATHER_ICONS[wt.icon]||"")+wt.name+'</span>' +
        '<span>'+(G.spot ? G.spot.name : "—")+'</span>' +
        '<span>'+BAITS[F.bait].name+'</span>' +
        '<span class="'+(tight ? "warn":"ok")+'">' +
          (tight ? "снасть на пределе" : "снасть держит") + '</span>';
    }
  }
  updateChips();
  if (G.pearlFind){
    setTimeout(()=>{ floatText("+1 жемчуг", W*0.5, H*0.35, "#c9b6ff"); sfx.buy(); }, 300);
  }
  G.pearlFind = false;
  const tEl = $("toast"); if (tEl) tEl.classList.remove("on");
  ov.classList.add("on");
  G.cardOpen = true;
}

function unlockedText(lvl){
  const names = [];
  for (const k in LOCATIONS) if (LOCATIONS[k].unlock === lvl) names.push("водоём «"+LOCATIONS[k].name+"»");
  return names.length ? "Открыт " + names.join(" и ") : "Снасти в магазине стали сильнее";
}

/* ---------------- обновление ---------------- */
function update(dt){
  G.clock += dt; G.t += dt;
  if (!START.on) updateSplashes(dt);
  if (G.shake > 0) G.shake = Math.max(0, G.shake - dt*40);
  if (G.flash > 0) G.flash = Math.max(0, G.flash - dt*1.6);
  if (G.rarityFlash) { G.rarityFlash.t -= dt; if (G.rarityFlash.t <= 0) G.rarityFlash = null; }

  for (let i=G.particles.length-1;i>=0;i--){
    const p = G.particles[i];
    p.life -= dt; p.vy += 520*dt; p.x += p.vx*dt; p.y += p.vy*dt;
    if (p.life <= 0) G.particles.splice(i,1);
  }
  for (let i=G.rings.length-1;i>=0;i--){
    const r = G.rings[i]; r.r += dt*85; r.a -= dt*1.05;
    if (r.a <= 0) G.rings.splice(i,1);
  }
  for (let i=G.floatingTexts.length-1;i>=0;i--){
    const ft = G.floatingTexts[i];
    ft.life -= dt; ft.y -= dt*28;
    if (ft.life <= 0) G.floatingTexts.splice(i,1);
  }

  const g = geo();
  updateWX(dt);
  updateIce(dt);

  if (G.leap){
    G.leap.t += dt;
    const k = Math.min(1, G.leap.t/0.72);
    G.leap.x = lerp(G.bobX, W*0.80, k);
    G.leap.y = lerp(g.surfaceY, g.rodTip.y - 10, k) - Math.sin(k*Math.PI)*H*0.16;
    G.leap.spin = (1-k)*Math.sin(k*9)*0.9;   // рыба вращается, «вырываясь» из воды
    // капли срываются с рыбы
    if (k < 0.9 && Math.random() < 0.55){
      G.particles.push({x:G.leap.x + rnd(-16,16), y:G.leap.y + rnd(0,18), vx:rnd(-50,20), vy:rnd(-10,60),
        life:rnd(0.25,0.6), r:rnd(1,2.4), color:"rgba(226,250,255,"});
    }
    if (G.leap.t > 0.8) G.leap = null;
  }

  switch (G.state){
    case "power": {
      G.powerT += dt;
      const speed = 1.15;
      const raw = (G.powerT*speed) % 2;
      G.power = 0.08 + (raw < 1 ? raw : 2-raw) * 0.94;
      $("powerNeedle").style.left = (G.power*100)+"%";
      hint("Сила: "+Math.round(G.power*100)+"%", true);
      break;
    }
    case "casting": {
      G.castT += dt;
      // к цели летим по дуге — как настоящий заброс
      const k = Math.pow(clamp(G.castT/G.castDur, 0, 1), 1.7);
      G.bobX = lerp(G.castFrom.x, G.bobTarget, k);
      G.bobY = lerp(G.castFrom.y, wY(), k) - Math.sin(k*Math.PI)*H*(0.12 + G.lockedPower*0.16);
      if (k >= 1){
        G.bobY = wY();
        sfx.splash(); ring(G.bobX); burst(G.bobX, wY(), 10, 140);
        startWaiting();
      }
      break;
    }
    case "waiting": {
      // телеграф: за ~1.1 с до поклёвки рыба подходит к поплавку
      G.approach = (G.waitDur < 1.1) ? clamp(1 - G.waitDur/1.1, 0, 1) : 0;
      // «прозрачность» воды: ясно + тишь = рыба осторожнее и клюёт реже
      const ic = weatherNow().icon;
      G.waterClear = (ic === "sun" || ic === "moon") && Math.abs(G.drift || 0) < 0.45;
      // перед «поклёвкой» поплавок начинает дрожать — рыба вот-вот возьмёт
      // мормышка: короткие подёргивания придают «живость» и ускоряют поклёвку
      // снос поплавка ветром: тянет по воде, вода отвечает колечками
      if (G.drift){
        G.driftPh = (G.driftPh || 0) + dt * (0.6 + Math.abs(G.drift));
        G.bobX += Math.cos(G.driftPh) * G.drift * dt * 26;
        G.bobX = clamp(G.bobX, W*0.06, W*0.94);
        if (Math.random() < dt * Math.abs(G.drift) * 1.4){
          G.rings.push({ x:G.bobX - Math.sign(G.drift)*rnd(4,14), y:0, r:3, a:0.5 });
        }
      }
      G.bobY = wY() + Math.sin(G.clock*2.1)*2.2
        + (G.falseBite ? Math.sin(Math.min(1, G.falseBite)*Math.PI) * 7 : 0)
        + (G.jigT > 0 ? Math.sin(G.clock*26)*(save.loc === "winter" ? 5.2 : 2.4) * (G.jigT/0.42) : 0);
      // (ускорение от подёргиваний считается один раз — в pressStart, а не в апдейте)
      if (G.jigT > 0) G.jigT = Math.max(0, G.jigT - dt);
      // «заинтересованность»: интерес растёт, поплавок всё чаще шевелится
      G.interest = clamp((G.interest || 0) + dt * 0.115 * (G.fish && G.fish.noBite ? 0.15 : 1), 0, 1);
      G.pureCasts = Math.max(0, (G.pureCasts || 0) - dt);
      G.nibble -= dt;
      if (!G.nibbling && G.nibble <= 0){
        G.nibbling = true;
        G.nibble = 0.30 + Math.random()*0.12;
        ring(G.bobX);
        tone(1500, 0.03, "sine", 0.012 + G.interest*0.014);
      }
      else if (G.nibbling){
        G.nibble -= dt;
        if (G.nibble <= 0){
          G.nibbling = false;
          // чем выше интерес — тем чаще «пробные» касания
          G.nibble = (0.85 + Math.random()*1.5) * (1 - 0.55*G.interest);
        }
      }
      // ложная поклёвка: поплавок ныряет на миг, но подсекать рано
      if (!G.falseBite && G.interest > 0.45 && !(G.fish && G.fish.noBite) && Math.random() < dt*0.09*(1+G.interest)){
        G.falseBite = 1;
        ring(G.bobX); ring(G.bobX + 7);
        tone(1200, 0.05, "sine", 0.02);
      }
      if (G.falseBite > 0) G.falseBite = Math.max(0, G.falseBite - dt*2.6);
      G.waitDur -= dt;
      if (G.waitDur <= 0) beginBite();
      break;
    }
    case "bite": {
      G.biteAt += dt*1000;
      G.bobY = wY() + 6 + Math.sin(G.biteAt*0.045)*9;
      if (G.biteAt > G.biteWindow) fail("miss");
      break;
    }
    case "fight": updateFight(dt, g); break;
  }

  // шкалы
  if (G.state === "fight"){
    $("tensionNeedle").style.left = (clamp(G.tension,0,1.12)*100)+"%";
    $("progFill").style.width = (clamp(G.progress,0,1)*100)+"%";
    const p = G.tension > 0.93 ? "danger" : "";
    $("tensionNeedle").style.boxShadow = p
      ? "0 0 0 1.5px rgba(120,30,10,.75), 0 0 20px 4px rgba(255,80,50,.95)"
      : (G.perfectT > 0 ? "0 0 0 1.5px rgba(20,80,40,.7), 0 0 18px 4px rgba(120,255,170,.95)"
                        : "0 0 0 1.5px rgba(15,30,36,.55), 0 0 14px rgba(255,255,255,.92)");
  }
}

function updateFight(dt, g){
  const f = G.fish, P = G.pull;
  if (!f || !f.p) return;

  // слабая снасть не удержит трофей: шанс схода растёт с разницей сил
  if (!f.junk && FISH[f.type]){
    const need = FISH[f.type].reqPower, have = gearPower();
    if (need > have){
      const over = (need - have) / Math.max(40, have);
      if (!f.snapT) f.snapT = 0;
      if (G.hold && G.progress < 0.65){
        f.snapT += dt * over * 0.75;
      } else {
        f.snapT = Math.max(0, f.snapT - dt*0.6);
      }
      if (f.snapT > 1.35){ fail("weak"); return; }
      if (!G.weakShown){
        G.weakShown = true;
        hint("Снасть на пределе — рыба может сорваться", true);
      }
    }
  }

  if (P.warn > 0) P.warn -= dt;
  if (!P.active){
    P.timer -= dt;
    if (P.timer <= 0 && P.warn <= 0 && !P.pending){
      P.warn = 0.2; P.pending = true; sfx.pull(); buzz(8);
      P.timer = rnd(f.p.pullEvery[0], f.p.pullEvery[1]);
    }
    if (P.pending && P.warn <= 0){
      P.pending = false; P.active = true; P.activeT = 0;
      P.dur = rnd(f.p.pullDur[0], f.p.pullDur[1]);
      G.shake = 4; burst(G.bobX, wY(), 7, 150);
      sfx.pull(); buzz(8);
    }
  } else {
    P.activeT += dt;
    if (P.activeT >= P.dur) P.active = false;
  }

  let rate = G.hold ? f.p.holdGain : -f.p.decay;
  if (P.active) rate += f.p.pullPower;
  G.tension = clamp(G.tension + rate*dt, 0, 1.2);
  if (!isFinite(G.tension)) G.tension = 0.5;
  if (!isFinite(G.progress)) G.progress = 0;

  const inGreen = G.tension >= GREEN_LO && G.tension <= f.p.hi;
  const inPerfect = G.tension >= 0.63 && G.tension <= 0.75;
  if (inPerfect && G.hold){
    G.perfectT = 0.25;
    G.progress += f.p.progress*netDef().progress*dt*1.35;
    G.perfectAcc = (G.perfectAcc || 0) + dt;
    if (!G.perfectShown){ G.perfectShown = true; floatText("ИДЕАЛЬНО", G.bobX, wY()-60, "#a7f0bd"); }
    G.perfectOnce = true;
  }
  else if (inGreen){ G.progress += f.p.progress*netDef().progress*dt; }
  else if (G.tension < 0.28){ G.progress -= f.p.progress*0.5*dt; }
  if (G.perfectT > 0) G.perfectT -= dt;
  G.progress = clamp(G.progress, 0, 1);

  const shakeAmt = (P.active ? 7 : 2.5) + G.progress*3;
  if (P.active && G.hold) G.shake = Math.max(G.shake, 2.2);
  G.bobY = wY() + Math.sin(G.clock*11)*shakeAmt*0.5 + (P.active?4:0);
  if (Math.random() < (P.active?0.3:0.05)) ring(G.bobX + rnd(-12,12));

  // живые подсказки
  const msg = G.tension > f.p.hi ? "Отпусти! Сейчас порвётся"
            : G.tension < 0.22 ? "Слабина! Подтяни"
            : G.perfectT > 0 ? "Идеально держишь"
            : "";
  if (msg !== G.lastHint){
    G.lastHint = msg;
    if (msg) hint(msg, true);
    else hint("Держи в зелёной зоне · отпускай у красного", true);
  }

  if (G.tension >= 1.0){ fail("break"); return; }
  if (G.tension <= 0.06){
    G.slackT += dt;
    if (G.slackT > 1.7 * netDef().netSlack * hookDef().escape){ fail("lost"); return; }
  } else G.slackT = Math.max(0, G.slackT - dt*2);

  if (G.progress >= 1) succeed();
}

/* ---------------- отрисовка ---------------- */
function drawCover(img, x=0, y=0, w=W, h=H){
  if (!img || !img.complete || !img.naturalWidth) return false;
  const ir = img.naturalWidth/img.naturalHeight, r = w/h;
  let dw, dh;
  if (ir > r){ dh = h; dw = h*ir; } else { dw = w; dh = w/ir; }
  ctx.drawImage(img, x+(w-dw)/2, y+(h-dh)/2, dw, dh);
  return true;
}

/* ---- подводный слой: тёмная толща, пузыри, водоросли, блики света ---- */
function drawUnderwater(g){
  const t = G.clock;
  const night = save.loc === "night";
  const top = g.surfaceY;
  const isSea = save.loc === "sea", isIce = save.loc === "winter";
  const grd = ctx.createLinearGradient(0, top, 0, H);
  if (isSea){
    grd.addColorStop(0, "rgba(10,52,80,0.10)");
    grd.addColorStop(0.45, "rgba(6,38,66,0.30)");
    grd.addColorStop(1, "rgba(2,14,30,0.62)");
  } else if (isIce){
    grd.addColorStop(0, "rgba(190,225,245,0.10)");
    grd.addColorStop(0.4, "rgba(90,140,170,0.14)");
    grd.addColorStop(1, "rgba(30,70,100,0.34)");
  } else if (night){
    grd.addColorStop(0, "rgba(8,22,40,0.20)");
    grd.addColorStop(1, "rgba(2,8,16,0.70)");
  } else {
    grd.addColorStop(0, "rgba(10,52,62,0.06)");
    grd.addColorStop(0.5, "rgba(8,40,52,0.20)");
    grd.addColorStop(1, "rgba(3,20,28,0.46)");
  }
  ctx.fillStyle = grd;
  ctx.fillRect(0, top, W, H-top);

  // лучи света сквозь воду
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const beamCol = isIce ? "rgba(220,245,255," : night ? "rgba(150,190,255," : "rgba(255,240,200,";
  for (let i=0;i<4;i++){
    const ph = (t*0.05 + i*0.26) % 1;
    const x = W*(0.1 + ph*0.9);
    const a = 0.022 * Math.sin(ph*Math.PI) * (isSea ? 1.4 : 1);
    ctx.beginPath();
    ctx.moveTo(x - 14, top);
    ctx.lineTo(x + 14, top);
    ctx.lineTo(x + 54, H);
    ctx.lineTo(x + 12, H);
    ctx.closePath();
    ctx.fillStyle = beamCol + a + ")";
    ctx.fill();
  }
  ctx.restore();

  // пузыри
  for (let i=0;i<12;i++){
    const ph = (t*0.16 + i*0.083) % 1;
    const x = W*((i*0.137 + Math.sin(t*0.4+i)*0.02) % 1);
    const y = H - ph*(H-top*0.9);
    const r = 1.6 + (i%3)*1.1;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI*2);
    ctx.strokeStyle = "rgba(220,245,255,"+(0.10+0.18*Math.sin(ph*Math.PI))+")";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // дно и водоросли
  const floorY = H*0.93;
  ctx.beginPath();
  ctx.moveTo(0,H);
  for (let x=0;x<=W;x+=24){
    ctx.lineTo(x, floorY + Math.sin(x*0.02)*7 + Math.sin(x*0.008+1)*10);
  }
  ctx.lineTo(W,H); ctx.closePath();
  ctx.fillStyle = isSea ? "rgba(6,22,34,.55)" : isIce ? "rgba(24,48,64,.45)" : "rgba(4,20,24,.55)";
  ctx.fill();
  // водоросли
  const weedCol = isSea ? "rgba(30,80,70,.45)" : isIce ? "rgba(40,70,80,.35)" : "rgba(24,66,44,.5)";
  for (let i=0;i<7;i++){
    const bx = W*(0.08 + i*0.14);
    const hh = H*(0.06 + ((i*37)%10)/100);
    ctx.beginPath();
    ctx.moveTo(bx, floorY+4);
    ctx.quadraticCurveTo(bx + Math.sin(t*0.9+i)*26, floorY - hh*0.6, bx + Math.sin(t*0.7+i*1.7)*44, floorY - hh);
    ctx.strokeStyle = weedCol;
    ctx.lineWidth = 3.4;
    ctx.lineCap = "round";
    ctx.stroke();
  }
}

function drawScene(g){
  const bgKey = LOC_BG[save.loc] || "bgSurface";
  if (!drawCover(images[bgKey])){ ctx.fillStyle = "#0d2830"; ctx.fillRect(0,0,W,H); }

  // тон воды
  const isNight = save.loc === "night";
  const grd = ctx.createLinearGradient(0, g.surfaceY-40, 0, H);
  grd.addColorStop(0, isNight ? "rgba(10,26,44,0.05)" : "rgba(16,70,84,0.02)");
  grd.addColorStop(0.45, isNight ? "rgba(6,20,34,0.35)" : "rgba(10,52,66,0.20)");
  grd.addColorStop(1, isNight ? "rgba(2,10,18,0.72)" : "rgba(4,26,34,0.52)");
  ctx.fillStyle = grd;
  ctx.fillRect(0, g.surfaceY-40, W, H-(g.surfaceY-40));

  // настроение новых водоёмов: солнце на море, холод на льду
  if (save.loc === "sea"){
    const warm = ctx.createLinearGradient(0, 0, 0, g.surfaceY);
    warm.addColorStop(0, "rgba(255,150,60,0.10)");
    warm.addColorStop(1, "rgba(255,190,120,0.02)");
    ctx.fillStyle = warm; ctx.fillRect(0,0,W,g.surfaceY);
    const cool = ctx.createLinearGradient(0, g.surfaceY, 0, H);
    cool.addColorStop(0, "rgba(6,40,70,0.10)");
    cool.addColorStop(1, "rgba(2,18,36,0.30)");
    ctx.fillStyle = cool; ctx.fillRect(0, g.surfaceY, W, H-g.surfaceY);
  }
  if (save.loc === "winter"){
    ctx.fillStyle = "rgba(150,200,235,0.10)";
    ctx.fillRect(0,0,W,H);
  }

  // линия горизонта на воде
  const sg = ctx.createLinearGradient(0, g.surfaceY-26, 0, g.surfaceY+16);
  sg.addColorStop(0, isNight ? "rgba(160,190,255,0.05)" : "rgba(255,220,180,0.10)");
  sg.addColorStop(0.5, isNight ? "rgba(200,220,255,0.14)" : "rgba(255,235,205,0.22)");
  sg.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = sg;
  ctx.fillRect(0, g.surfaceY-26, W, 42);

  // подводный слой в бою
  if (G.state === "fight" || G.state === "result" || (G.state==="bite")){
    const top = g.surfaceY - 6;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, top, W, H-top); ctx.clip();
    ctx.globalAlpha = isNight ? 0.3 : 0.4;
    if (images.bgUnder.complete) drawCover(images.bgUnder, 0, top - H*0.05, W, H-top + H*0.05);
    ctx.globalAlpha = 1;
    const seam = ctx.createLinearGradient(0, top, 0, top+92);
    seam.addColorStop(0, isNight ? "rgba(90,120,170,0.4)" : "rgba(232,196,168,0.5)");
    seam.addColorStop(0.4, "rgba(120,150,155,0.18)");
    seam.addColorStop(1, "rgba(10,45,58,0)");
    ctx.fillStyle = seam; ctx.fillRect(0, top, W, 92);
    ctx.fillStyle = isNight ? "rgba(2,14,24,0.4)" : "rgba(4,30,40,0.26)";
    ctx.fillRect(0, top, W, H-top);
    ctx.restore();
  }
}

/* ---------- зимняя рыбалка: снег, пар, треск льда, бурение лунки ---------- */
const ICE = { flakes: [], cracks: [], drill: 0, drilled: 0, breath: 0 };
function initIce(){
  ICE.flakes = [];
  for (let i=0;i<70;i++){
    ICE.flakes.push({
      x: Math.random(), y: Math.random(),
      r: rnd(0.9, 2.6), sp: rnd(0.02, 0.075), sw: rnd(0.15, 0.6),
      ph: Math.random()*Math.PI*2, a: rnd(0.35, 0.9)
    });
  }
  ICE.cracks = [];
  ICE.drill = 0; ICE.drilled = 0; ICE.breath = 0;
}
/* бурение лунки при входе на зимний водоём и при выборе новой точки */
function startDrill(){
  if (save.loc !== "winter") return;
  if (ICE.drill > 0) return;
  ICE.drill = 1; ICE.drilled = 0;
}
function updateIce(dt){
  if (save.loc !== "winter"){ ICE.drill = 0; return; }
  for (const f of ICE.flakes){
    f.y += f.sp*dt;
    f.x += Math.sin(G.clock*f.sw + f.ph)*dt*0.02 + dt*0.004;
    if (f.y > 1){ f.y -= 1; f.x = Math.random(); }
    if (f.x > 1) f.x -= 1;
    if (f.x < 0) f.x += 1;
  }
  if (ICE.drill > 0){
    const was = ICE.drill;
    ICE.drill = Math.max(0, ICE.drill - dt*0.55);
    ICE.drilled = Math.min(1, ICE.drilled + dt*0.62);
    if (Math.random() < dt*22){
      const ix = (G.state === "idle" || G.state === "aim") ? W*0.5 : G.bobX;
      G.particles.push({x: ix + rnd(-20,20), y: wY() + rnd(-4,4), vx: rnd(-70,70), vy: rnd(-120,-20),
        life: rnd(0.3,0.7), r: rnd(0.8,2), color:"rgba(235,250,255,"});
    }
    if (was > 0 && ICE.drill === 0){ buzz(20); if (sfx.splash) sfx.splash(); }
  }
  // треск льда
  if (Math.random() < dt*0.30){
    ICE.cracks.push({ x: Math.random()*W, y: wY() + rnd(-30, 60), life: 1,
      pts: Array.from({length:5},()=>rnd(-1,1)) });
  }
  for (let i=ICE.cracks.length-1;i>=0;i--){
    ICE.cracks[i].life -= dt*0.5;
    if (ICE.cracks[i].life <= 0) ICE.cracks.splice(i,1);
  }
  // «выдох» пара раз в пару секунд
  ICE.breath -= dt;
  if (ICE.breath <= -2.4) ICE.breath = 1.1;
}
function drawIce(g){
  if (save.loc !== "winter") return;
  ctx.save();
  for (const f of ICE.flakes){
    ctx.globalAlpha = f.a;
    ctx.fillStyle = "#f4fbff";
    ctx.beginPath();
    ctx.arc(f.x*W, f.y*H*0.98, f.r, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.restore();
  // трещины на льду
  ctx.save();
  for (const c of ICE.cracks){
    const a = clamp(c.life, 0, 1);
    ctx.strokeStyle = "rgba(235,250,255,"+(a*0.35)+")";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(c.x, c.y);
    let x = c.x, y = c.y;
    for (let i=0;i<4;i++){ x += c.pts[i]*22; y += 12 + Math.abs(c.pts[i])*10; ctx.lineTo(x, y); }
    ctx.stroke();
  }
  ctx.restore();
  // пар изо рта
  if (ICE.breath > 0){
    const k = 1 - ICE.breath/1.1;
    ctx.save();
    for (let i=0;i<3;i++){
      const cx = W*0.14 + k*40 + i*10, cy = H*0.30 - k*46 - i*8;
      const rx = 12 + k*30, ry = 8 + k*18;
      const grd = ctx.createRadialGradient(cx, cy, 1, cx, cy, rx);
      grd.addColorStop(0, "rgba(234,246,255,"+(0.20*(1-k))+")");
      grd.addColorStop(0.55, "rgba(228,242,252,"+(0.09*(1-k))+")");
      grd.addColorStop(1, "rgba(228,242,252,0)");
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }
  // бурение: шнек и ледяная крошка
  if (ICE.drill > 0){
    const hole = holeXY();
    const ix = hole.x, iy = hole.y - 2;
    const vis = clamp(ICE.drill*1.4, 0, 1);
    ctx.save();
    ctx.globalAlpha = vis;
    ctx.translate(ix, iy - 96 + Math.sin(G.clock*30)*2.5);
    ctx.rotate(Math.sin(G.clock*26)*0.10);
    ctx.fillStyle = "#2a3a4a";
    ctx.fillRect(-3.5, -26, 7, 34);
    ctx.fillStyle = "#c9683a";
    ctx.fillRect(-9, -30, 18, 7);
    ctx.fillStyle = "#cfdbe6";
    ctx.fillRect(-4, 8, 8, 84);
    ctx.strokeStyle = "rgba(90,120,145,.95)"; ctx.lineWidth = 2.4;
    for (let i=0;i<6;i++){
      ctx.beginPath(); ctx.ellipse(0, 14 + i*13, 8, 4, 0.4, 0, Math.PI*2); ctx.stroke();
    }
    ctx.fillStyle = "#eef8ff";
    ctx.beginPath(); ctx.moveTo(-12, 92); ctx.lineTo(12, 92); ctx.lineTo(0, 108); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 0.9;
    for (let i=0;i<5;i++){
      const a = (G.clock*2 + i*1.3) % 1;
      ctx.fillStyle = "rgba(238,250,255,"+(0.5*(1-a))+")";
      ctx.beginPath();
      ctx.arc(ix - 34 + i*17 + Math.sin(G.clock*8+i)*4, iy - a*34, 2.2, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.restore();
  }
}

/* ---------- ветер: сносит поплавок и усложняет точный заброс ---------- */
function windNow(){
  const icon = weatherNow().icon;
  const base = icon === "thunder" ? 1.5 : icon === "rain" ? 1.1 : icon === "snow" ? 0.9 : icon === "mist" ? 0.35 : 0.6;
  const dir = Math.sin(G.clock*0.07) * 0.6 + Math.sin(G.clock*0.021 + 1.7) * 0.4;
  return { dir, power: base };
}

/* ---------- погодные эффекты ---------- */
const WX = { drops: [], bolts: [], t: 0, flash: 0 };
function initWX(){
  WX.drops = [];
  const n = 150;
  for (let i=0;i<n;i++) WX.drops.push({x:Math.random(), y:Math.random(), l:rnd(9,20), sp:rnd(0.9,1.7), o:rnd(0.2,0.6)});
}
function updateWX(dt){
  WX.t += dt;
  if (WX.flash > 0) WX.flash = Math.max(0, WX.flash - dt*3.2);
  const w = weatherNow();
  if (w.icon !== "rain" && w.icon !== "storm"){ WX.bolts.length = 0; return; }
  for (const d of WX.drops){
    d.y += d.sp*dt*0.85;
    d.x += dt*0.06;
    if (d.y > 1){ d.y -= 1; d.x = Math.random(); }
    if (d.x > 1) d.x -= 1;
  }
  if (w.icon === "storm" && Math.random() < dt*0.22){
    WX.bolts.push({x:rnd(0.15,0.85), life:0.5, seed:Math.random()*99});
    WX.flash = 1;
    sfx.thunder();
  }
  for (let i=WX.bolts.length-1;i>=0;i--){ WX.bolts[i].life -= dt; if (WX.bolts[i].life <= 0) WX.bolts.splice(i,1); }
}
function drawWX(g){
  const w = weatherNow();
  if (w.icon === "rain" || w.icon === "storm"){
    ctx.save();
    ctx.strokeStyle = w.icon === "storm" ? "rgba(205,225,255,.75)" : "rgba(215,238,255,.6)";
    ctx.lineWidth = 1.5;
    for (const d of WX.drops){
      const x = d.x*W, y = d.y*H*0.62;
      ctx.globalAlpha = d.o;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 2.5, y + d.l*1.15);
      ctx.stroke();
    }
    ctx.restore();
  }
  if (w.icon === "fog"){
    ctx.save();
    for (let i=0;i<3;i++){
      const y = g.surfaceY - H*0.05 + i*H*0.075;
      const off = (G.clock*0.014*(i+1) + i*0.33) % 1;
      const cx = W*(0.1+off*0.8);
      const grd = ctx.createRadialGradient(cx, y, 4, cx, y, W*0.72);
      grd.addColorStop(0, "rgba(228,242,248,"+(0.075 + i*0.02)+")");
      grd.addColorStop(0.55, "rgba(228,242,248,"+(0.04 + i*0.012)+")");
      grd.addColorStop(1, "rgba(228,242,248,0)");
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.ellipse(cx, y, W*0.72, H*0.065, 0, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.restore();
  }
  if (WX.bolts.length){
    ctx.save();
    for (const b of WX.bolts){
      const a = clamp(b.life*2, 0, 1);
      ctx.globalAlpha = a*0.85;
      ctx.strokeStyle = "#eaf4ff";
      ctx.lineWidth = 2.4;
      ctx.shadowColor = "#9ecbff"; ctx.shadowBlur = 18;
      ctx.beginPath();
      let x = b.x*W, y = 0;
      ctx.moveTo(x, y);
      for (let i=1;i<=7;i++){
        x += Math.sin(b.seed + i*2.1)*W*0.03;
        y = (i/7)*g.surfaceY*0.92;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }
  if (WX.flash > 0){
    ctx.fillStyle = "rgba(200,225,255,"+(WX.flash*0.20)+")";
    ctx.fillRect(0,0,W,H);
  }
  // общая засветка от погоды
  if (w.light < 1){
    ctx.fillStyle = "rgba(12,22,34,"+((1-w.light)*0.42)+")";
    ctx.fillRect(0,0,W,H);
  }
  if (w.icon === "sun"){
    const grd = ctx.createRadialGradient(W*0.72, H*0.06, 10, W*0.72, H*0.06, W*0.7);
    grd.addColorStop(0, "rgba(255,225,160,.16)");
    grd.addColorStop(1, "rgba(255,225,160,0)");
    ctx.fillStyle = grd; ctx.fillRect(0,0,W,H*0.7);
  }
}

let ambient = null;
function initAmbient(){
  const n = 42;
  ambient = [];
  for (let i=0;i<n;i++){
    ambient.push({
      x: Math.random(), y: Math.random(),
      r: rnd(0.7, 2.0), sp: rnd(0.004, 0.016),
      ph: Math.random()*Math.PI*2, a: rnd(0.16, 0.55)
    });
  }
}
function drawAmbient(g){
  if (!ambient) initAmbient();
  if (!ICE.flakes.length) initIce();
  const night = save.loc === "night";
  ctx.save();
  for (const p of ambient){
    const yy = ((p.y + G.clock*p.sp) % 1);
    const t = G.clock*1.4 + p.ph;
    const x = (p.x + Math.sin(t*0.6)*0.012) * W;
    const y = (g.surfaceY*0.95) * (1-yy) + H*0.02;
    if (y > g.surfaceY+8) continue;
    const tw = night ? (0.5 + 0.5*Math.sin(t*2.2)) : (0.55 + 0.45*Math.sin(t*1.3));
    ctx.globalAlpha = p.a * tw;
    ctx.beginPath();
    ctx.arc(x, y, p.r*(night?1.15:1), 0, Math.PI*2);
    ctx.fillStyle = night ? "#ffe9a3" : "#fff6e0";
    ctx.fill();
    if (night){
      ctx.globalAlpha = p.a*tw*0.25;
      ctx.beginPath(); ctx.arc(x, y, p.r*3.4, 0, Math.PI*2);
      ctx.fillStyle = "#ffd166"; ctx.fill();
    }
  }
  // блики на воде
  ctx.globalAlpha = 1;
  const glints = 7;
  for (let i=0;i<glints;i++){
    const ph = (G.clock*0.22 + i*0.31) % 1;
    const x = (0.08 + ((i*0.137 + ph*0.06) % 0.85)) * W;
    const y = g.surfaceY + H*0.02 + ((i*0.09 + ph*0.35) % 1) * H*0.22;
    const a = Math.sin(ph*Math.PI) * (night ? 0.30 : 0.20);
    ctx.globalAlpha = a;
    ctx.beginPath();
    ctx.ellipse(x, y, 16*(0.6+ph), 2.2, 0, 0, Math.PI*2);
    ctx.fillStyle = night ? "#cfe4ff" : "#ffffff";
    ctx.fill();
  }
  ctx.restore();
}

function drawSpots(g){
  if (!["idle","aim","power","casting"].includes(G.state)) return;
  const spots = locSpots();
  const s = clamp(Math.min(W,H)/620, 0.7, 1.5);
  for (const sp of spots){
    const isClub = sp.id.indexOf("prem_") === 0;
    const {x, y} = spotPos(sp);
    const sel = G.spot && G.spot.id === sp.id;
    const pulse = 0.5 + 0.5*Math.sin(G.clock*2.2 + sp.x*7);
    const rx = (34 + (sel?10:0) + pulse*4)*s, ry = rx*0.36;

    ctx.save();
    ctx.beginPath(); ctx.ellipse(x, y+2, rx+5, ry+4, 0, 0, Math.PI*2);
    ctx.fillStyle = "rgba(4,18,24,0.32)";
    ctx.fill();
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI*2);
    ctx.fillStyle = sel ? "rgba(255,193,69,0.24)"
      : isClub ? "rgba(178,150,255,0.22)" : "rgba(255,255,255,0.12)";
    ctx.fill();
    ctx.strokeStyle = sel ? "rgba(255,214,122,"+(0.9+pulse*0.1)+")"
      : isClub ? "rgba(211,190,255,"+(0.75+pulse*0.25)+")" : "rgba(255,255,255,"+(0.55+pulse*0.2)+")";
    ctx.lineWidth = sel ? 2.8 : isClub ? 2.4 : 2;
    ctx.setLineDash(sel ? [] : [7,6]);
    ctx.stroke();
    ctx.setLineDash([]);
    if (isClub){
      // клубный плёс: тёплое свечение и жемчужные искры по краю
      ctx.save();
      const gr = ctx.createRadialGradient(x, y, 2, x, y, rx*1.5);
      gr.addColorStop(0, "rgba(205,180,255,"+(0.16+pulse*0.10)+")");
      gr.addColorStop(1, "rgba(205,180,255,0)");
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.ellipse(x, y, rx*1.5, ry*1.5, 0, 0, Math.PI*2); ctx.fill();
      for (let i=0;i<3;i++){
        const a = G.clock*0.9 + i*2.1;
        const px = x + Math.cos(a)*rx*1.15, py = y + Math.sin(a)*ry*1.15;
        ctx.beginPath(); ctx.arc(px, py, 1.6*s, 0, Math.PI*2);
        ctx.fillStyle = "rgba(232,220,255,"+(0.55+0.35*Math.sin(a*2))+")"; ctx.fill();
      }
      ctx.restore();
    }

    if (sel){
      ctx.beginPath(); ctx.ellipse(x, y, rx*1.35, ry*1.35, 0, 0, Math.PI*2);
      ctx.strokeStyle = "rgba(255,193,69,"+(0.25+pulse*0.2)+")";
      ctx.lineWidth = 1.4; ctx.stroke();
    }
    if (sel && G.spotFree){
      // свободный заброс: тонкая «мишень» на воде
      ctx.save();
      ctx.strokeStyle = "rgba(255,214,122,"+(0.55+pulse*0.3)+")";
      ctx.lineWidth = 1.6;
      ctx.setLineDash([3,5]);
      ctx.beginPath(); ctx.ellipse(x, y, rx*1.9, ry*1.9, 0, 0, Math.PI*2); ctx.stroke();
      ctx.restore();
    }

    // подпись
    ctx.font = "800 " + (11*s) + "px -apple-system,Segoe UI,Roboto,sans-serif";
    const label = sp.name;
    const tw = ctx.measureText(label).width;
    const padX = 8*s, bh = 20*s;
    // если сверху «узко» (свал у льда, подпись под краем) — подпись уходит под точку
    let bx = x - tw/2 - padX;
    let by = y - ry - bh - 12*s;
    // на льду подпись не должна налезать на лунку: разводим точки по вертикали
    if (save.loc === "winter"){
      const holeY = y + 6;
      if (holeY - (by + bh) < 46*s) by = y - ry - bh - 52*s;
    }
    bx = clamp(bx, 4*s, W - tw - padX*2 - 4*s);
    ctx.beginPath();
    const r = bh/2;
    ctx.moveTo(bx+r, by);
    ctx.arcTo(bx+tw+padX*2, by, bx+tw+padX*2, by+bh, r);
    ctx.arcTo(bx+tw+padX*2, by+bh, bx, by+bh, r);
    ctx.arcTo(bx, by+bh, bx, by, r);
    ctx.arcTo(bx, by, bx+tw+padX*2, by, r);
    ctx.closePath();
    ctx.fillStyle = sel ? "rgba(255,193,69,0.92)" : "rgba(8,22,28,0.62)";
    ctx.fill();
    ctx.fillStyle = sel ? "#2a2205" : isClub ? "#efe6ff" : "rgba(255,255,255,0.9)";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(label, x, by + bh/2 + 0.5);

    // пузырьки, чтобы вода «жила»
    const N = sp.depth === "глубоко" ? 5 : sp.depth === "средне" ? 3 : 2;
    for (let i=0;i<N;i++){
      const ph = (G.clock*0.55 + i*0.37 + sp.x*9) % 1;
      const bx = x + Math.sin((ph+i)*7 + i)*rx*0.55;
      const by = y + ry*0.35 - ph*(ry*1.9);
      ctx.beginPath();
      ctx.arc(bx, by, (1.2 + (i%2)*0.9)*s*(1-ph*0.4), 0, Math.PI*2);
      ctx.fillStyle = "rgba(255,255,255,"+(0.32*(1-ph))+")";
      ctx.fill();
    }

    // подсказка «эта точка на текущую снасть»
    const pool = spotPool(sp);
    const okCount = pool.filter(z => z.okBait && z.okRod).length;
    const baitOk = pool.some(z => z.okBait);
    const tagTxt = okCount ? fishCount(okCount) : (baitOk ? "нужна снасть посильнее" : "другая приманка");
    ctx.font = "800 " + (9.5*s) + "px -apple-system,Segoe UI,Roboto,sans-serif";
    const tw2 = ctx.measureText(tagTxt).width;
    const b2w = tw2 + 12*s, b2h = 15*s;
    const cx = x, cy = y + ry + 12*s;
    ctx.beginPath();
    const rr = b2h/2;
    ctx.moveTo(cx-b2w/2+rr, cy);
    ctx.arcTo(cx+b2w/2, cy, cx+b2w/2, cy+b2h, rr);
    ctx.arcTo(cx+b2w/2, cy+b2h, cx-b2w/2, cy+b2h, rr);
    ctx.arcTo(cx-b2w/2, cy+b2h, cx-b2w/2, cy, rr);
    ctx.arcTo(cx-b2w/2, cy, cx+b2w/2, cy, rr);
    ctx.closePath();
    ctx.fillStyle = okCount ? "rgba(18,52,34,0.72)" : "rgba(58,24,20,0.72)";
    ctx.fill();
    ctx.fillStyle = okCount ? "#b8f0c6" : "#ffb9a6";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(tagTxt, cx, cy + b2h/2 + 0.5);

    if (isClub){
      // метка «клуб» над точкой
      const t2 = "КЛУБ";
      ctx.font = "900 " + (8*s) + "px -apple-system,Segoe UI,Roboto,sans-serif";
      const w2 = ctx.measureText(t2).width + 10*s;
      const px2 = x - w2/2, py2 = y - ry - 24*s, h2 = 13*s;
      ctx.beginPath();
      const r2 = h2/2;
      ctx.moveTo(px2+r2, py2);
      ctx.arcTo(px2+w2, py2, px2+w2, py2+h2, r2);
      ctx.arcTo(px2+w2, py2+h2, px2, py2+h2, r2);
      ctx.arcTo(px2, py2+h2, px2, py2, r2);
      ctx.arcTo(px2, py2, px2+w2, py2, r2);
      ctx.closePath();
      ctx.fillStyle = "rgba(60,40,110,0.78)";
      ctx.fill();
      ctx.strokeStyle = "rgba(200,180,255,0.6)";
      ctx.lineWidth = 0.9; ctx.stroke();
      ctx.fillStyle = "#efe6ff";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(t2, x, py2 + h2/2 + 0.5);
    }

    // маркер глубины
    ctx.beginPath(); ctx.arc(x, y, 2.8*s, 0, Math.PI*2);
    ctx.fillStyle = sel ? "#ffd166" : "rgba(255,255,255,.5)"; ctx.fill();
    ctx.restore();
  }
}

/* прицел: где сейчас упадёт поплавок, и куда сместится точка при другом нажатии */
function drawAimReticle(g){
  if (!(G.state === "aim" || G.state === "idle")) return;
  const p = G.spot && !G.spot.free ? spotPos(G.spot) : G.aimHint;
  const t = G.clock;
  if (G.spot && !G.spot.free){
    const pos = spotPos(G.spot);
    ctx.save();
    ctx.strokeStyle = "rgba(255,214,122,"+(0.30 + 0.15*Math.sin(t*3))+")";
    ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.ellipse(pos.x, pos.y, 44, 15, 0, 0, Math.PI*2); ctx.stroke();
    // «стрелка вниз» над выбранной точкой
    ctx.beginPath();
    ctx.moveTo(pos.x - 6, pos.y - 34); ctx.lineTo(pos.x + 6, pos.y - 34); ctx.lineTo(pos.x, pos.y - 26);
    ctx.closePath();
    ctx.fillStyle = "rgba(255,214,122,.75)"; ctx.fill();
    ctx.restore();
  }
}

/* подсказка «что тут водится» — дуги глубины и чип с составом по выбранному месту */
/* «на кукурузу», «на хлебный мякиш», «на блесну» — падеж для приманок */
const BAIT_ACC = { corn:"кукурузу", bread:"хлебный мякиш", pearl:"перловку", peas:"горох", dough:"тесто",
  algae:"водоросли", worm:"земляного червя", bloodworm:"мотыля", maggot:"опарыша", caddis:"ручейник",
  mayfly:"подёнку", shell:"ракушку", shrimp:"креветку", spoon:"блесну", wobbler:"воблер", jig:"джиг",
  spinner:"вращалку", fly:"мушку", livebait:"живца", frog:"лягушку", fishmeat:"рыбное филе",
  crab:"крабовое мясо", glow:"светлячка", squid:"кальмара", octopus:"осьминога", blood:"миногу" };
const baitAcc = (id) => BAIT_ACC[id] || (BAITS[id] ? BAITS[id].name.toLowerCase() : "приманку");
const baitOn = (id) => "на " + baitAcc(id);
/* «1 вид», «2 вида», «5 видов» */
const fishCount = (n) => n + " " + (n % 10 === 1 && n % 100 !== 11 ? "вид" : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? "вида" : "видов"));
const goodLabel = fishCount;

function drawZoneInfo(g){
  if (!G.spotFree || !["aim","power","casting"].includes(G.state)) return;
  const p = spotPos(G.spot);
  const pool = Object.keys(G.spot.w || {});
  const onBait = pool.filter(k => FISH[k] && FISH[k].bait === save.equipped.bait).length;
  const byRod = pool.filter(k => FISH[k] && FISH[k].bait === save.equipped.bait && FISH[k].reqPower <= rodDef().power || (FISH[k] && FISH[k].bait === save.equipped.bait && FISH[k].reqPower <= rodDef().power)).length;
  const good = pool.filter(k => FISH[k] && FISH[k].bait === save.equipped.bait && FISH[k].reqPower <= rodDef().power).length;
  const k = 0.5 + 0.5*Math.sin(G.clock*2.4);
  ctx.save();
  for (let i=0;i<3;i++){
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 2, 26 + i*13 + k*3, 8 + i*4.4, 0, 0, Math.PI*2);
    ctx.strokeStyle = "rgba(190,235,255,"+(0.16 - i*0.04)+")";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  // чип с названием зоны и составом
  const s = clamp(Math.min(W,H)/620, 0.72, 1.5);
  const line1 = G.spot.name;
  const line2 = good ? (goodLabel(good) + " " + baitOn(save.equipped.bait))
    : onBait ? "нужна снасть посильнее" : "на " + baitAcc(save.equipped.bait) + " тут не клюёт";
  ctx.font = "800 " + (10.5*s) + "px -apple-system,Segoe UI,Roboto,sans-serif";
  const w1 = ctx.measureText(line1).width;
  ctx.font = "700 " + (9.5*s) + "px -apple-system,Segoe UI,Roboto,sans-serif";
  const w2 = ctx.measureText(line2).width;
  const bw = Math.max(w1, w2) + 20*s, bh = 34*s;
  let bx = clamp(p.x - bw/2, 5*s, W - bw - 5*s);
  let by = p.y + 26*s;
  // не залезаем на нижнюю панель снастей: тогда чип уходит над точкой
  if (by + bh > H*0.74) by = p.y - 30*s - bh;
  ctx.beginPath();
  const rr = 9*s;
  ctx.moveTo(bx+rr, by);
  ctx.arcTo(bx+bw, by, bx+bw, by+bh, rr);
  ctx.arcTo(bx+bw, by+bh, bx, by+bh, rr);
  ctx.arcTo(bx, by+bh, bx, by, rr);
  ctx.arcTo(bx, by, bx+bw, by, rr);
  ctx.closePath();
  ctx.fillStyle = "rgba(8,24,30,0.66)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,214,122,0.45)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = "800 " + (10.5*s) + "px -apple-system,Segoe UI,Roboto,sans-serif";
  ctx.fillStyle = "rgba(255,240,205,.95)";
  ctx.fillText(line1, bx + bw/2, by + bh*0.34);
  ctx.font = "700 " + (9.5*s) + "px -apple-system,Segoe UI,Roboto,sans-serif";
  ctx.fillStyle = good ? "rgba(170,235,190,.95)" : "rgba(255,180,160,.92)";
  ctx.fillText(line2, bx + bw/2, by + bh*0.70);
  ctx.restore();
}

function drawCastArc(g){
  if (G.state !== "casting" || !G.castFrom) return;
  const k = clamp(G.castT/G.castDur, 0, 1);
  const peak = H*(0.12 + G.lockedPower*0.16);
  ctx.save();
  ctx.setLineDash([5,7]);
  ctx.strokeStyle = "rgba(255,255,255,"+(0.16*(1-k))+")";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (let i=0;i<=24;i++){
    const t = (i/24)*1;
    const x = lerp(G.castFrom.x, G.bobTarget, t);
    const y = lerp(G.castFrom.y, wY(), t) - Math.sin(t*Math.PI)*peak;
    i ? ctx.lineTo(x,y) : ctx.moveTo(x,y);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  // точка прицела
  const pk = 1 - Math.abs(k-0.5)*2;
  ctx.globalAlpha = 0.5 + pk*0.5;
  ctx.beginPath();
  ctx.ellipse(G.bobTarget, wY(), 16, 6, 0, 0, Math.PI*2);
  ctx.strokeStyle = "rgba(255,214,122,.85)"; ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();
}

function rodCurve(g){
  const base = g.rodBase, tip0 = g.rodTip;
  let tip = tip0;
  // замах: удилище отводится назад и «заряжается» вместе с силой
  if (G.state === "power"){
    const p = G.power;
    tip = { x: tip0.x + 16 + p*42, y: tip0.y + 20 + p*30 };
  } else if (G.state === "casting"){
    const k = clamp(G.castT/G.castDur, 0, 1);
    const swing = Math.sin(Math.min(1,k*2.6)*Math.PI/2);
    tip = { x: tip0.x + (1-swing)*44, y: tip0.y + (1-swing)*28 - swing*10 };
  } else if (G.state === "bite"){
    const j = Math.sin(G.clock*24)*4;
    tip = { x: tip0.x + j, y: tip0.y + 6 };
  }
  const bend = (G.state === "fight" ? clamp(G.tension,0,1) : 0.18) * 0.17;
  return { base, tip,
    cx: base.x + (tip.x-base.x)*0.42,
    cy: base.y - (base.y-tip.y)*0.68 + (tip.x-base.x)*bend };
}
function drawRod(g){
  const {base, tip, cx, cy} = rodCurve(g);
  const s = clamp(Math.min(W,H)/620, 0.62, 1.5);
  ctx.save(); ctx.lineCap = "round";
  ctx.strokeStyle = "#3a2718"; ctx.lineWidth = Math.max(6, 8*s);
  ctx.beginPath(); ctx.moveTo(base.x, base.y);
  ctx.lineTo(lerp(base.x,tip.x,0.12), lerp(base.y,tip.y,0.12)); ctx.stroke();
  ctx.strokeStyle = "#6b4a2b"; ctx.lineWidth = Math.max(3, 4.2*s);
  ctx.beginPath(); ctx.moveTo(lerp(base.x,tip.x,0.10), lerp(base.y,tip.y,0.10));
  ctx.quadraticCurveTo(cx, cy, tip.x, tip.y); ctx.stroke();
  ctx.strokeStyle = "rgba(255,225,175,.5)"; ctx.lineWidth = Math.max(1, 1.2*s);
  ctx.beginPath(); ctx.moveTo(lerp(base.x,tip.x,0.12), lerp(base.y,tip.y,0.12));
  ctx.quadraticCurveTo(cx, cy, tip.x, tip.y); ctx.stroke();
  const rx = lerp(base.x,tip.x,0.20), ry = lerp(base.y,tip.y,0.20);
  ctx.beginPath(); ctx.ellipse(rx, ry + 4*s, 9*s, 7*s, -0.5, 0, Math.PI*2);
  ctx.fillStyle = "#2c3b42"; ctx.fill();
  ctx.strokeStyle = "rgba(210,230,235,.55)"; ctx.lineWidth = 1.4; ctx.stroke();
  ctx.restore();
}
/* яркий момент подсечки: вспышка у кончика */
function drawHookFlash(){
  if (G.state !== "fight" || G.t > 0.28) return;
  const g = geo();
  const k = 1 - G.t/0.28;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const grd = ctx.createRadialGradient(g.rodTip.x, g.rodTip.y, 2, g.rodTip.x, g.rodTip.y, 70*k);
  grd.addColorStop(0, "rgba(255,255,255,"+(0.85*k)+")");
  grd.addColorStop(0.35, "rgba(255,220,150,"+(0.35*k)+")");
  grd.addColorStop(1, "rgba(255,200,100,0)");
  ctx.fillStyle = grd;
  ctx.beginPath(); ctx.arc(g.rodTip.x, g.rodTip.y, 70*k, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}

/* рыба выходит из воды и летит на подсак */
function drawLanding(){
  const L = G.landing;
  if (!L || !G.fish || G.fish.junk) return;
  const img = images.fish[artOf(G.fish.type)];
  if (!img || !img.complete) return;
  const k = clamp(L.t/1.05, 0, 1);
  const ease = k*k*(3-2*k);
  const x = lerp(L.x0, W*0.62, ease);
  const y = lerp(L.y0, H*0.30, ease) - Math.sin(ease*Math.PI)*H*0.20;
  const w = W*0.34;
  const spin = (1-k)*0.6*Math.sin(k*7);
  ctx.save();
  // брызги по траектории
  if (Math.random() < 0.7){
    G.particles.push({x, y: y + 26, vx: rnd(-40,10), vy: rnd(-20,40),
      life: rnd(0.3,0.6), r: rnd(1,2.4), color: "rgba(225,250,255,"});
  }
  // мокрый след
  ctx.globalAlpha = 0.35*(1-k);
  ctx.strokeStyle = "rgba(220,250,255,1)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(L.x0, L.y0);
  ctx.quadraticCurveTo((L.x0+x)/2, Math.min(L.y0,y)-40, x, y);
  ctx.stroke();
  ctx.globalAlpha = 1;
  drawFishAnimated(img, x, y, w * (1 + 0.1*Math.sin(k*9)), {
    rot: -0.5 + spin, alpha: 1, palette: G.fish.palette, sway: 0.6, speed: 9
  });
  ctx.restore();
}

function drawLine(g){
  const from = {x:g.rodTip.x, y:g.rodTip.y}, to = {x:G.bobX, y:G.bobY};
  const taut = G.state === "fight";
  const dist = Math.hypot(to.x-from.x, to.y-from.y);
  const sag = taut ? 2 + (1-clamp(G.tension,0,1))*8 : Math.min(70, dist*0.13);
  ctx.save();
  const alpha = taut ? 0.8 : 0.5;
  const hot = taut && G.tension > 0.9;
  ctx.strokeStyle = hot ? "rgba(255,215,200,"+alpha+")" : (taut && G.perfectT>0 ? "rgba(190,255,215,"+alpha+")" : "rgba(255,255,255,"+alpha+")");
  ctx.lineWidth = taut ? 1.7 : 1.2;
  ctx.beginPath(); ctx.moveTo(from.x, from.y);
  ctx.quadraticCurveTo((from.x+to.x)/2, (from.y+to.y)/2 + sag, to.x, to.y);
  ctx.stroke();
  ctx.restore();
}
function drawWake(g){
  // быстрый шлейф воды от поплавка при вываживании
  if (G.state !== "fight") return;
  const s = clamp(Math.min(W,H)/620, 0.62, 1.5);
  const P = G.pull;
  const intensity = (P.active ? 1 : 0.45) * (0.5 + G.progress*0.6);
  ctx.save();
  for (let i=0;i<3;i++){
    const y = wY() + 6 + i*7*s;
    const wdt = (26 + i*16)*s*(0.7 + G.progress*0.5);
    ctx.beginPath();
    ctx.ellipse(G.bobX, y, wdt, 4.5*s, 0, 0, Math.PI*2);
    ctx.strokeStyle = "rgba(230,250,255,"+(0.30*intensity*(1-i*0.28))+")";
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }
  // брызги при рывке
  // пузырьки от уходящей рыбы
  if (Math.random() < 0.42){
    const depth = (1-G.progress)*118*s + 46*s;
    G.particles.push({x:G.bobX + rnd(-16,16), y:wY() + depth, vx:rnd(-6,6), vy:rnd(-46,-20),
      life:rnd(0.5,0.9), r:rnd(1,2.2), color:"rgba(210,245,255,"});
  }
  if (P.active && Math.random() < 0.5){
    G.particles.push({x:G.bobX+rnd(-10,10)*s, y:wY()-2, vx:rnd(-40,40), vy:rnd(-190,-90),
      life:rnd(0.3,0.6), r:rnd(1,2.4), color:"rgba(225,248,255,"});
  }
  ctx.restore();
}

function drawFishTail(g){
  // хвост рыбы, гуляющий у поверхности во время вываживания
  if (G.state !== "fight" || !G.fish || G.fish.junk) return;
  const img = images.fish[G.fish.type];
  if (!img || !img.complete) return;
  const s = clamp(Math.min(W,H)/620, 0.62, 1.5);
  const near = G.progress > 0.72;
  if (!near) return;
  const a = (G.progress - 0.72) / 0.28;
  ctx.save();
  ctx.globalAlpha = a * 0.85;
  ctx.beginPath();
  ctx.ellipse(G.bobX, wY()+4, 30*s*a, 9*s*a, 0, 0, Math.PI*2);
  ctx.fillStyle = "rgba(255,255,255,.25)";
  ctx.fill();
  ctx.restore();
}

/* индикатор ожидания: «вода настаивается», интерес рыбы и запас терпения.
   Растёт по мере ожидания, в конце превращается в «рыба рядом». */
function drawPatience(g){
  if (G.state !== "waiting" || G.cardOpen) return;
  const s = clamp(Math.min(W,H)/620, 0.72, 1.5);
  const cx = G.bobX, cy = wY();
  const t = G.clock;
  const intr = clamp(G.interest || 0, 0, 1);
  const pure = G.pureCasts > 0;
  // если поплавок низко у панели снастей — индикатор уходит НАД поплавком
  const low = cy > H*0.60;
  const baseY = low ? cy - 26*s : cy + 28*s;
  const stepY = low ? -7*s : 7*s;
  const labelY = low ? baseY + stepY*3 - 12*s : baseY + stepY*3 + 9*s;
  ctx.save();
  const beat = 0.5 + 0.5*Math.sin(t*(2.2 + intr*3.4));
  // сегменты терпения: заполняются по мере интереса
  const n = 3;
  const filled = intr * n;
  for (let i=0;i<n;i++){
    const a = clamp(filled - i, 0, 1);
    const w = 22*s, h = 3.4*s;
    const x = cx - w/2, y = baseY + i*stepY;
    ctx.beginPath();
    const rr = h/2;
    ctx.moveTo(x+rr, y);
    ctx.arcTo(x+w, y, x+w, y+h, rr);
    ctx.arcTo(x+w, y+h, x, y+h, rr);
    ctx.arcTo(x, y+h, x, y, rr);
    ctx.arcTo(x, y, x+w, y, rr);
    ctx.closePath();
    ctx.fillStyle = "rgba(220,240,255,0.07)";
    ctx.fill();
    ctx.strokeStyle = "rgba(220,245,255,0.18)";
    ctx.lineWidth = 0.8; ctx.stroke();
    if (a > 0){
      ctx.beginPath();
      ctx.moveTo(x+rr, y);
      ctx.arcTo(x+w, y, x+w, y+h, rr);
      ctx.arcTo(x+w, y+h, x, y+h, rr);
      ctx.arcTo(x, y+h, x, y, rr);
      ctx.arcTo(x, y, x+w, y, rr);
      ctx.closePath();
      const col = a > 0.75 ? "rgba(255,214,122," : a > 0.45 ? "rgba(255,232,170," : "rgba(190,235,255,";
      ctx.fillStyle = col + (0.45 + a*0.5) + ")";
      ctx.fill();
    }
  }
  // «кружок терпения» вокруг поплавка
  const prog = clamp(1 - (G.waitDur || 0) / 16, 0, 1);
  ctx.beginPath();
  ctx.ellipse(cx, cy + 2, (30 + prog*22)*s, (10 + prog*7)*s, 0, 0, Math.PI*2);
  ctx.strokeStyle = "rgba(200,240,255," + (0.05 + intr*0.10 + beat*0.03) + ")";
  ctx.lineWidth = 1.1;
  ctx.stroke();
  // тактичная подпись, что происходит с рыбой
  if (!pure){
    const msg = intr > 0.82 ? "рыба рядом" : intr > 0.55 ? "интересуется" : intr > 0.28 ? "присматривается" : "ждём…";
    ctx.font = "800 " + (9.5*s) + "px -apple-system,Segoe UI,Roboto,sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    // подложка, чтобы текст читался и не спорил с панелью снастей
    const tw = ctx.measureText(msg).width;
    ctx.beginPath();
    const bw = tw + 12*s, bh = 13*s, bx = cx - bw/2, by = labelY - bh/2;
    const rr2 = bh/2;
    ctx.moveTo(bx+rr2, by);
    ctx.arcTo(bx+bw, by, bx+bw, by+bh, rr2);
    ctx.arcTo(bx+bw, by+bh, bx, by+bh, rr2);
    ctx.arcTo(bx, by+bh, bx, by, rr2);
    ctx.arcTo(bx, by, bx+bw, by, rr2);
    ctx.closePath();
    ctx.fillStyle = "rgba(8,24,30,.42)";
    ctx.fill();
    ctx.fillStyle = "rgba(232,249,255," + (0.35 + intr*0.5) + ")";
    ctx.fillText(msg, cx, labelY + 0.5);
  }
  ctx.restore();
}

function drawImpactBurst(g){
  // круги по воде в момент подсечки
  if (G.state !== "fight") return;
  for (const rp of G.rings){
    ctx.beginPath();
    ctx.ellipse(rp.x, wY(), rp.r*2.1, rp.r*0.62, 0, 0, Math.PI*2);
    ctx.strokeStyle = "rgba(210,240,255,"+(rp.a*0.18)+")";
    ctx.lineWidth = 1.1;
    ctx.stroke();
  }
}

function drawBobberTrail(g){
  if (G.state !== "fight") return;
  const s = clamp(Math.min(W,H)/620, 0.62, 1.5);
  ctx.save();
  for (let i=1;i<=7;i++){
    const k = i/8;
    ctx.globalAlpha = 0.16*(1-k);
    ctx.beginPath();
    ctx.ellipse(G.bobX - Math.sin(G.clock*9 - i*0.5)*6*k, wY() + i*3*s, (6 - i*0.6)*s, (2 - i*0.2)*s, 0, 0, Math.PI*2);
    ctx.fillStyle = "rgba(200,240,255,1)";
    ctx.fill();
  }
  ctx.restore();
}

function drawPullFlash(g){
  if (G.state !== "fight" || !G.pull) return;
  const P = G.pull;
  if (P.warn > 0){
    const k = P.warn/0.2;
    ctx.save();
    ctx.globalAlpha = 0.5*k;
    const cx = G.bobX, cy = wY();
    const grd = ctx.createRadialGradient(cx, cy, 4, cx, cy, 90);
    grd.addColorStop(0, "rgba(255,120,90,.5)");
    grd.addColorStop(1, "rgba(255,120,90,0)");
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(cx, cy, 90, 0, Math.PI*2); ctx.fill();
    ctx.font = "900 " + (20*clamp(Math.min(W,H)/620,0.8,1.4)) + "px -apple-system,Segoe UI,Roboto,sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,190,170,.95)";
    ctx.fillText("рывок!", cx, cy - 46);
    ctx.restore();
  }
}

function drawBobber(g){
  if (G.state === "idle" || G.state === "aim" || G.state === "power"){
    G.bobX = g.rodTip.x + 6; G.bobY = g.rodTip.y + 44;
  }
  const x = G.bobX, y = G.bobY;
  const s = clamp(Math.min(W,H)/620, 0.62, 1.5);
  const r = 8*s;

  for (const rp of G.rings){
    ctx.beginPath();
    ctx.ellipse(rp.x, wY(), rp.r*1.6, rp.r*0.5, 0, 0, Math.PI*2);
    ctx.strokeStyle = "rgba(255,255,255,"+(rp.a*0.32)+")";
    ctx.lineWidth = 1.2; ctx.stroke();
  }

  ctx.save();
  ctx.translate(x,y);
  ctx.rotate(G.state==="fight" ? Math.sin(G.clock*9)*0.12 : Math.sin(G.clock*2)*0.05);
  ctx.strokeStyle = "#f7f3ea"; ctx.lineWidth = 2*s;
  ctx.beginPath(); ctx.moveTo(0,-r*0.6); ctx.lineTo(0,-r*2.0); ctx.stroke();
  ctx.beginPath(); ctx.arc(0,-r*2.0, 2.2*s, 0, Math.PI*2); ctx.fillStyle="#ff5b3d"; ctx.fill();
  const grd = ctx.createLinearGradient(0,-r,0,r);
  grd.addColorStop(0,"#ff6b4a"); grd.addColorStop(0.5,"#ff5b3d"); grd.addColorStop(0.52,"#f6f1e4"); grd.addColorStop(1,"#e6dfd0");
  ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.fillStyle = grd; ctx.fill();
  ctx.strokeStyle = "rgba(60,30,20,.45)"; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.restore();

  if (G.state === "bite" || G.state === "waiting"){
    // «глазок» воды вокруг поплавка и мягкое свечение при поклёвке
    const pulse = 0.5 + 0.5*Math.sin(G.clock*3.1);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const grd = ctx.createRadialGradient(x, wY()+2, 2, x, wY()+2, 80);
    grd.addColorStop(0, G.state==="bite" ? "rgba(255,226,160,0.30)" : "rgba(180,235,255,"+(0.05+pulse*0.04)+")");
    grd.addColorStop(1, "rgba(180,235,255,0)");
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.ellipse(x, wY()+2, 80, 26, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }
  if (G.state === "bite"){
    const k = clamp(G.biteAt/G.biteWindow,0,1);
    const kk = 1-k;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x, wY(), 26*s + 44*s*k, 9*s + 15*s*k, 0, 0, Math.PI*2);
    ctx.strokeStyle = "rgba(255,255,255,"+(0.42-0.3*k)+")";
    ctx.lineWidth = 1.6; ctx.stroke();

    const rad = (26 + 60*kk)*s;
    ctx.beginPath(); ctx.arc(x, y - rad*0.95, rad, 0, Math.PI*2);
    ctx.strokeStyle = "rgba(255,214,102,"+(0.9-k*0.45)+")";
    ctx.lineWidth = Math.max(2, 3.4*s); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y - rad*0.95, rad*0.72, 0, Math.PI*2);
    ctx.strokeStyle = "rgba(255,255,255,.5)"; ctx.lineWidth = 1.6*s; ctx.stroke();
    ctx.font = "900 " + (32*s) + "px -apple-system,Segoe UI,Roboto,sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = "#fff6d8";
    ctx.shadowColor = "rgba(0,0,0,.65)"; ctx.shadowBlur = 9;
    ctx.fillText("!", x, y - rad*0.95 + 1);
    ctx.restore();
  }
}
function drawFishEnt(g){
  const f = G.fish;
  if (!f || f.junk) return;
  const img = images.fish[artOf(f.type)];
  if (!img || !img.complete) return;
  const s = clamp(Math.min(W,H)/620, 0.62, 1.6);
  const w = 92*s * (0.7 + f.norm*0.8);

  if (G.state === "fight"){
    const P = G.pull;
    const depth = (1-G.progress)*118*s + 40*s;
    const x = G.bobX + Math.sin(G.clock*(P.active?8:3.1))*22*s;
    const y = wY() + depth + Math.sin(G.clock*5)*4*s;
    const rot = Math.sin(G.clock*7)*0.1 + (P.active ? Math.sin(G.clock*26)*0.14 : 0);
    const alpha = clamp(0.35 + G.progress*0.85, 0.35, 1);
    const glowCol = (f.rar === "mythic" || f.rar === "legendary") ? RARITY[f.rar].color : null;
    if (glowCol){
      ctx.save();
      ctx.globalAlpha = 0.35*alpha*(0.7+0.3*Math.sin(G.clock*3));
      const grd = ctx.createRadialGradient(x, y, 4, x, y, w*0.8);
      grd.addColorStop(0, glowCol); grd.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(x, y, w*0.8, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
    // завихрения/пузыри от борьбы — вода «живая»
    const swirl = P.active ? 1 : 0.45;
    ctx.save();
    for (let i=0;i<7;i++){
      const ph = (G.clock*(1.1 + i*0.13) + i*0.37) % 1;
      const rx = (16 + i*7 + Math.sin(G.clock*2+i)*6)*s;
      ctx.strokeStyle = "rgba(190,240,255,"+(0.20*swirl*(1-ph))+")";
      ctx.lineWidth = 1.4*s;
      ctx.beginPath();
      ctx.ellipse(x + Math.sin(G.clock*3+i)*8*s, y + (i-3)*9*s, rx, rx*0.42, 0, Math.PI*0.15, Math.PI*1.15);
      ctx.stroke();
    }
    ctx.restore();
    drawFishAnimated(img, x, y, w, {rot:rot, alpha:alpha, palette:f.palette,
      sway: 0.26 + (P.active?0.26:0), speed: 4.6 + (P.active?4.4:0)});
  } else if (G.leap && (G.state === "result" || G.state === "aim")){
    const L = G.leap;
    const k = clamp(L.t/0.8, 0, 1);
    // след полёта
    ctx.save();
    ctx.globalAlpha = 0.30*(1-k);
    ctx.strokeStyle = "rgba(215,248,255,1)";
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(L.x0, L.y0);
    ctx.quadraticCurveTo((L.x0+L.x)/2, Math.min(L.y0,L.y)-H*0.12, L.x, L.y);
    ctx.stroke();
    ctx.restore();
    drawFishAnimated(img, L.x, L.y, w*(1+0.12*Math.sin(k*Math.PI)),
      {rot:-0.55 + L.spin, alpha:1, palette:G.fish.palette, sway:0.85, speed:11});
  } else if (G.state === "waiting" || G.state === "bite"){
    // тень под водой: подходит к поплавку перед поклёвкой
    const ap = G.state === "bite" ? 1 : (G.approach || 0);
    const dist = (74 - ap*46) * s;
    ctx.save();
    ctx.globalAlpha = 0.18 + ap*0.38;
    drawFishAnimated(img, G.bobX + Math.sin(G.clock*(1.6+ap*3))*12*s, wY() + dist, w*(0.9 + ap*0.2),
      {rot: 0, alpha: 0.2 + ap*0.5, palette:G.fish.palette, sway:0.34 + ap*0.3, speed:2.6 + ap*5});
    ctx.restore();
    if (ap > 0.15){
      ctx.save();
      for (let i=0;i<3;i++){
        ctx.beginPath();
        ctx.ellipse(G.bobX, wY()+2, 14 + i*9 + ap*10, 5 + i*3, 0, 0, Math.PI*2);
        ctx.strokeStyle = "rgba(235,250,255,"+(0.10*ap)+")";
        ctx.lineWidth = 1; ctx.stroke();
      }
      ctx.restore();
    }
  }
}
/* водоворот под поплавком во время вываживания: спиральные струи и брызги */
function drawFightSwirl(g){
  if (G.state !== "fight" || !G.fish) return;
  const t = G.clock;
  const x0 = G.bobX, y0 = wY();
  const k = clamp(G.progress, 0, 1);
  ctx.save();
  for (let i=0;i<5;i++){
    const ph = ((t*(0.8 + i*0.12) + i*0.23) % 1);
    const r = 12 + ph*(46 + k*54);
    ctx.beginPath();
    ctx.ellipse(x0 + Math.sin(t*2+i)*6, y0 + 4 + ph*10, r, r*0.34, 0, 0.3, Math.PI*1.5);
    ctx.strokeStyle = "rgba(226,250,255,"+(0.30*(1-ph)*(G.hold?1:0.6))+")";
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }
  // брызги у поплавка
  for (let i=0;i<4;i++){
    const ph = ((t*2.2 + i*0.31) % 1);
    const a = i*1.7 + t*1.4;
    ctx.beginPath();
    ctx.arc(x0 + Math.cos(a)*(10 + ph*26), y0 - Math.sin(a)*6 - ph*14, 1.6, 0, Math.PI*2);
    ctx.fillStyle = "rgba(240,253,255,"+(0.45*(1-ph))+")";
    ctx.fill();
  }
  ctx.restore();
}

/* рыба с «живым» телом: 3 сегмента, волна по хвосту, дыхание */
function drawFishAnimated(img, x, y, w, o){
  o = o || {};
  const t = o.t === undefined ? G.clock : o.t;
  const rot = o.rot || 0, alpha = o.alpha === undefined ? 1 : o.alpha;
  const sway = o.sway === undefined ? 0.30 : o.sway;
  const speed = o.speed || 5.2;
  const h = w * img.naturalHeight / img.naturalWidth;
  const seg = 3, sw = w/seg;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(rot + Math.sin(t*speed*0.5)*0.045);
  if (o.palette) ctx.filter = "hue-rotate("+o.palette.hue+"deg) saturate("+o.palette.sat+")";
  ctx.scale(-1, 1);
  // дыхание корпуса
  const breath = 1 + Math.sin(t*speed*0.62)*0.018;
  ctx.scale(1, breath);
  let px = -w/2;
  const iw = img.naturalWidth/seg;
  for (let i=0;i<seg;i++){
    const bend = Math.sin(t*speed - i*0.85) * sway * (0.12 + i*0.42);
    ctx.save();
    ctx.translate(px + sw/2, 0);
    ctx.rotate(bend*0.36);
    ctx.shadowColor = "rgba(0,20,26,.35)"; ctx.shadowBlur = 8;
    ctx.drawImage(img, i*iw, 0, iw, img.naturalHeight, -sw/2 - 0.5, -h/2, sw + 1.2, h);
    ctx.restore();
    px += sw;
  }
  ctx.restore();
}
function drawSprite(img, x, y, w, rot, alpha){
  const h = w * img.naturalHeight/img.naturalWidth;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x,y); ctx.rotate(rot); ctx.scale(-1,1);
  ctx.shadowColor = "rgba(0,20,26,.45)"; ctx.shadowBlur = 12;
  ctx.drawImage(img, -w/2, -h/2, w, h);
  ctx.restore();
}
/* ---- всплески на воде: рыба гуляет, даже когда не клюёт ---- */
const SPL = [];
function updateSplashes(dt){
  if (["waiting","aim","idle"].includes(G.state) && Math.random() < dt*0.55){
    const spot = G.spot || locSpots()[(Math.random()*locSpots().length)|0];
    const pos = spotPos(spot);
    SPL.push({
      x: clamp(pos.x + rnd(-W*0.10, W*0.10), W*0.06, W*0.94),
      y: pos.y + rnd(-6, 10),
      r: 2, life: 1, max: 1.1
    });
  }
  for (let i=SPL.length-1;i>=0;i--){
    const s = SPL[i];
    s.life -= dt; s.r += dt*46;
    if (s.life <= 0) SPL.splice(i,1);
  }
}
/* золотая вспышка при выполнении квеста */
function drawQuestFlash(){
  if (!G.questFlash) return;
  const q = G.questFlash;
  const k = clamp(q.t/1.4, 0, 1);
  const cx = W*0.5, cy = H*0.30;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i=0;i<3;i++){
    const rr = (1-k)*W*(0.18 + i*0.12);
    ctx.beginPath();
    ctx.arc(cx, cy, rr, 0, Math.PI*2);
    ctx.strokeStyle = "rgba(255,205,90,"+(0.28*k/(i+1))+")";
    ctx.lineWidth = 2.4;
    ctx.stroke();
  }
  const grd = ctx.createRadialGradient(cx, cy, 4, cx, cy, W*0.5);
  grd.addColorStop(0, "rgba(255,220,130,"+(0.16*k)+")");
  grd.addColorStop(1, "rgba(255,190,80,0)");
  ctx.fillStyle = grd;
  ctx.beginPath(); ctx.arc(cx, cy, W*0.5, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}

function drawSplashes(){
  for (const s of SPL){
    const k = s.life/s.max;
    ctx.save();
    ctx.globalAlpha = k*0.5;
    ctx.strokeStyle = "rgba(220,245,255,"+(0.55*k)+")";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(s.x, s.y, s.r, s.r*0.34, 0, 0, Math.PI*2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(s.x, s.y, s.r*0.6, s.r*0.2, 0, 0, Math.PI*2);
    ctx.stroke();
    // брызги
    if (k > 0.55){
      for (let i=0;i<3;i++){
        ctx.beginPath();
        ctx.arc(s.x + Math.sin(i*2.1+s.r)*s.r*0.6, s.y - k*10 - i*2, 1.6, 0, Math.PI*2);
        ctx.fillStyle = "rgba(235,250,255,"+(0.5*k)+")";
        ctx.fill();
      }
    }
    ctx.restore();
  }
}

/* ---- живая вода: перспективные волны, каустика, глиттер, круги от дождя ---- */
const WATER = { drops: [] };
function updateWater(dt, g){
  const icon = weatherNow().icon;
  const raining = icon === "rain" || icon === "thunder";
  if (raining){
    const n = icon === "thunder" ? 3 : 2;
    for (let i=0;i<n;i++){
      if (Math.random() < dt*9){
        WATER.drops.push({ x: Math.random()*W, y: g.surfaceY + Math.random()*(H - g.surfaceY), r: 1.4, life: 1 });
      }
    }
  }
  for (let i=WATER.drops.length-1;i>=0;i--){
    const d = WATER.drops[i];
    d.life -= dt*1.5; d.r += dt*22;
    if (d.life <= 0) WATER.drops.splice(i,1);
  }
}
function drawWaterLive(g){
  const t = G.clock;
  const top = g.surfaceY;
  const hh = H - top;
  const icon = weatherNow().icon;
  const choppy = icon === "thunder" ? 1.6 : icon === "rain" ? 1.15 : icon === "overcast" ? 1.0 : 0.72;
  const night = save.loc === "night";
  const ice = save.loc === "winter";
  const sea = save.loc === "sea";

  // 1. перспективные волны
  ctx.save();
  for (let i=0;i<9;i++){
    const k = i/9;
    const y0 = top + hh*(0.04 + k*0.92);
    const amp = (1.5 + k*k*11) * choppy;
    const speed = 0.55 + k*0.75;
    ctx.beginPath();
    for (let x=-20;x<=W+20;x+=14){
      const yv = y0 + Math.sin(x*0.012*(1+k) + t*speed + i)*amp
        + Math.sin(x*0.027*(1+k*0.5) - t*speed*1.6)*amp*0.35;
      x === -20 ? ctx.moveTo(x,yv) : ctx.lineTo(x,yv);
    }
    ctx.strokeStyle = night ? "rgba(150,190,240,"+(0.05 + k*0.05)+")"
      : ice ? "rgba(240,250,255,"+(0.06 + k*0.05)+")"
      : "rgba(230,250,255,"+(0.055 + k*0.07)+")";
    ctx.lineWidth = 0.8 + k*1.8;
    // рваный штрих — волна не выглядит «линейкой»
    ctx.setLineDash([34 + i*22, 26 + i*14]);
    ctx.lineDashOffset = -t*(14 + i*6);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();

  // 2. каустика — сетка света в воде днём
  if (!ice && !night){
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const tint = sea ? "110,220,255" : "180,240,225";
    for (let i=0;i<5;i++){
      const cx = ((i*0.37 + t*0.012) % 1) * W;
      const cy = top + hh*(0.18 + ((i*0.29) % 0.7));
      const rw = 48 + Math.sin(t*0.7+i)*16;
      const grd = ctx.createRadialGradient(cx, cy, 1, cx, cy, rw);
      grd.addColorStop(0, "rgba("+tint+",0.045)");
      grd.addColorStop(1, "rgba("+tint+",0)");
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rw, rw*0.30, 0, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 3. глиттер
  ctx.save();
  const glit = night ? "rgba(200,220,255," : ice ? "rgba(255,255,255," : "rgba(255,245,215,";
  for (let i=0;i<40;i++){
    const ph = (t*0.35 + i*0.17) % 1;
    const x = ((i*0.618 + Math.sin(t*0.6+i*2)*0.012) % 1) * W;
    const y = top + 8 + Math.pow(ph, 1.6) * hh * 0.9;
    const scale = 0.4 + (y-top)/hh;
    const a = (0.05 + 0.35*Math.abs(Math.sin(t*2.4 + i))) * (0.35 + 0.65*Math.sin(ph*Math.PI));
    ctx.fillStyle = glit + (a*0.75) + ")";
    ctx.beginPath();
    ctx.ellipse(x, y, (2.4 + (i%3)*1.6)*scale, 0.9*scale, Math.sin(i)*0.5, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.restore();

  // 4. круги от дождя
  for (const d of WATER.drops){
    ctx.beginPath();
    ctx.ellipse(d.x, d.y, d.r, d.r*0.34, 0, 0, Math.PI*2);
    ctx.strokeStyle = "rgba(215,240,255,"+(0.35*d.life)+")";
    ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(d.x, d.y, d.r*0.55, d.r*0.18, 0, 0, Math.PI*2);
    ctx.strokeStyle = "rgba(215,240,255,"+(0.2*d.life)+")";
    ctx.stroke();
  }

  // 5. дорожка от солнца/луны
  const sunX = W*0.62;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i=0;i<14;i++){
    const k = i/14;
    const y = top + hh*0.02 + k*hh*0.62;
    const wdt = 10 + k*W*0.10;
    const a = (night ? 0.10 : 0.075) * (1-k) * (0.55 + 0.45*Math.sin(t*1.4 + i*0.8));
    ctx.fillStyle = night ? "rgba(220,235,255,"+a+")" : "rgba(255,225,170,"+a+")";
    ctx.beginPath();
    ctx.ellipse(sunX + Math.sin(t*0.8+i)*8, y, wdt, 1.2 + k*2.2, 0, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.restore();

  // 6. трещины на льду
  if (ice){
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,.10)";
    ctx.lineWidth = 1.1;
    for (let i=0;i<5;i++){
      ctx.beginPath();
      let x = W*(0.1 + i*0.19), y = top + hh*0.1;
      ctx.moveTo(x,y);
      for (let j=0;j<5;j++){
        x += Math.sin(i*3+j*2.1)*W*0.05;
        y += hh*0.13;
        ctx.lineTo(x,y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  // 7. ветровая рябь
  ctx.save();
  for (let i=0;i<16;i++){
    const ph = (t*(0.18 + (i%3)*0.05) + i*0.31) % 1;
    const y = top + hh*0.10 + ((i*0.137) % 0.85)*hh;
    const x = (ph*1.4 - 0.2)*W;
    const len = 8 + (y-top)/hh*26;
    ctx.strokeStyle = "rgba(230,248,255,"+(0.07*Math.sin(ph*Math.PI))+")";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len, y - 1.5); ctx.stroke();
  }
  ctx.restore();
}

function drawWaterLife(g){
  const t = G.clock;
  ctx.save();
  // блики
  for (let i=0;i<26;i++){
    const ph = (t*0.12 + i*0.137) % 1;
    const x = ((i*0.618 + Math.sin(t*0.3+i)*0.02) % 1) * W;
    const y = g.surfaceY + 18 + ph*(H-g.surfaceY)*0.7;
    const a = 0.10 * Math.sin(ph*Math.PI) * (0.6+0.4*Math.sin(t*3+i));
    ctx.fillStyle = (save.loc === "night") ? "rgba(190,215,255,"+a+")" : "rgba(255,240,205,"+a+")";
    ctx.beginPath();
    ctx.ellipse(x, y, 6 + (i%4)*4, 1.2, 0, 0, Math.PI*2);
    ctx.fill();
  }
  // рябь от ветра
  const windK = weatherNow().icon === "storm" ? 1 : weatherNow().icon === "rain" ? 0.6 : 0.35;
  for (let i=0;i<3;i++){
    ctx.beginPath();
    const y0 = g.surfaceY + H*0.08 + i*H*0.11;
    for (let x=0;x<=W;x+=10){
      const yy = y0 + Math.sin(x*0.014 + t*(0.7+i*0.2) + i)*3*windK;
      x === 0 ? ctx.moveTo(x,yy) : ctx.lineTo(x,yy);
    }
    ctx.strokeStyle = "rgba(210,240,255,"+(0.035*windK)+")";
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
  ctx.restore();
}

/* ---- стайка мелкой рыбы у поверхности ---- */
const SCHOOL = { t:0, fish:[] };
function drawSchool(g){
  if (save.loc === "winter") return;   // подо льдом стайки не видно
  if (!SCHOOL.fish.length){
    for (let i=0;i<7;i++) SCHOOL.fish.push({ph:i*0.9, sp:0.14+Math.random()*0.1, y:0.10+Math.random()*0.16, s:0.5+Math.random()*0.5});
  }
  const night = save.loc === "night";
  ctx.save();
  for (const f of SCHOOL.fish){
    const x = ((G.clock*f.sp + f.ph) % 1.3 - 0.15) * W;
    const y = g.surfaceY + f.y*H*0.6 + Math.sin(G.clock*1.7+f.ph)*4;
    const w = 16*f.s;
    ctx.globalAlpha = (night ? 0.18 : 0.28) * (0.7+0.3*Math.sin(G.clock*2+f.ph));
    ctx.fillStyle = night ? "rgba(150,190,230,.9)" : "rgba(30,60,70,.9)";
    ctx.beginPath();
    ctx.ellipse(x, y, w*0.5, w*0.16, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - w*0.46, y);
    ctx.lineTo(x - w*0.66, y - w*0.16);
    ctx.lineTo(x - w*0.66, y + w*0.16);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

function drawFishShadow(g){
  // тень рыбы на дне во время вываживания
  if (G.state !== "fight" || !G.fish || G.fish.junk) return;
  const s = clamp(Math.min(W,H)/620, 0.62, 1.5);
  const a = 0.16 * (1 - G.progress*0.5);
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(G.bobX + Math.sin(G.clock*2)*10*s, g.surfaceY + H*0.20, 34*s*(0.7+G.progress*0.4), 9*s, 0, 0, Math.PI*2);
  ctx.fillStyle = "rgba(4,20,26,"+a+")";
  ctx.filter = "blur(4px)";
  ctx.fill();
  ctx.restore();
}

function drawTensionStreaks(g){
  if (G.state !== "fight" || G.tension < 0.86) return;
  const k = (G.tension - 0.86) / 0.14;
  const mid = {x: lerp(g.rodTip.x, G.bobX, 0.5), y: lerp(g.rodTip.y, G.bobY, 0.5)};
  ctx.save();
  ctx.globalAlpha = 0.35*k;
  ctx.strokeStyle = "#ffd9c2";
  ctx.lineWidth = 1;
  for (let i=0;i<4;i++){
    const off = Math.sin(G.clock*12 + i)*6;
    ctx.beginPath();
    ctx.moveTo(mid.x + off, mid.y - 16 - i*5);
    ctx.lineTo(mid.x + off*1.6, mid.y - 4 - i*5);
    ctx.stroke();
  }
  ctx.restore();
}

function drawLineDroplets(g){
  // капли, стекающие по леске при напряжении
  if (G.state !== "fight" || G.tension < 0.55) return;
  if (Math.random() > 0.25) return;
  const t = Math.random();
  const x = lerp(g.rodTip.x, G.bobX, t), y = lerp(g.rodTip.y, G.bobY, t);
  G.particles.push({x, y, vx: rnd(-8,8), vy: rnd(20,70), life:rnd(0.3,0.6), r:rnd(0.8,1.8), color:"rgba(215,240,255,"});
}

function drawParticles(){
  for (const p of G.particles){
    const a = clamp(p.life/0.8, 0, 1);
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
    ctx.fillStyle = p.color + (a*0.8) + ")"; ctx.fill();
  }
  for (const ft of G.floatingTexts){
    const a = clamp(ft.life, 0, 1);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.font = "900 " + Math.round(Math.min(W,H)*0.034) + "px -apple-system,Segoe UI,Roboto,sans-serif";
    ctx.textAlign = "center";
    ctx.shadowColor = "rgba(0,0,0,.6)"; ctx.shadowBlur = 8;
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.restore();
  }
}
/* передний план: тёмная кромка берега внизу кадра — «мы стоим на берегу» */
function drawNearBank(g){
  const y0 = H*1.005;
  const k = save.loc === "winter" ? "rgba(18,34,46," : save.loc === "night" ? "rgba(6,12,20," : save.loc === "sea" ? "rgba(10,26,40," : "rgba(8,26,24,";
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-10, y0);
  for (let x=-10;x<=W+10;x+=18){
    const yv = H*0.965 + Math.sin(x*0.021)*7 + Math.sin(x*0.007+1.3)*5;
    ctx.lineTo(x, yv);
  }
  ctx.lineTo(W+10, y0);
  ctx.closePath();
  ctx.fillStyle = k + "0.92)";
  ctx.fill();
  ctx.restore();
}

function drawForeground(g){
  const bs = ctx.createLinearGradient(0, H*0.72, 0, H);
  bs.addColorStop(0, "rgba(4,22,28,0)");
  bs.addColorStop(1, "rgba(4,22,28,0.55)");
  ctx.fillStyle = bs; ctx.fillRect(0, H*0.72, W, H*0.28);

  const ts = ctx.createLinearGradient(0, 0, 0, H*0.16);
  ts.addColorStop(0, "rgba(6,20,26,0.46)");
  ts.addColorStop(1, "rgba(6,20,26,0)");
  ctx.fillStyle = ts; ctx.fillRect(0, 0, W, H*0.16);

  if (save.loc === "winter"){
    // лунку показываем только когда точка выбрана (или идёт ловля)
    if (!G.spot && (G.state === "idle" || G.state === "aim" || G.state === "power")) return;
    const hole = holeXY();
    const ix = hole.x, iy = hole.y;
    const near = (G.state === "idle" || G.state === "aim" || G.state === "power") && G.spot;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(ix, iy, 46, 15, 0, 0, Math.PI*2);
    ctx.fillStyle = "rgba(10,26,36,.55)"; ctx.fill();
    ctx.strokeStyle = "rgba(220,245,255,.5)"; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(ix, iy, 54, 20, 0, 0, Math.PI*2);
    ctx.strokeStyle = "rgba(255,255,255,.18)"; ctx.lineWidth = 6; ctx.stroke();
    // наледь вокруг выбранной лунки
    if (near){
      for (let i=0;i<7;i++){
        ctx.beginPath();
        ctx.ellipse(ix + Math.cos(i*2.1)*62, iy + Math.sin(i*2.1)*22, 13, 5, i*0.7, 0, Math.PI*2);
        ctx.fillStyle = "rgba(240,252,255,.16)"; ctx.fill();
      }
    }
    ctx.restore();
    return;
  }
  if (save.loc === "sea"){
    // пена на волнах у нижней кромки
    ctx.save();
    for (let i=0;i<3;i++){
      const yy = H*(0.80 + i*0.06);
      ctx.beginPath();
      for (let x=0;x<=W;x+=12){
        const yv = yy + Math.sin(x*0.02 + G.clock*(1.1+i*0.3) + i)*5;
        x === 0 ? ctx.moveTo(x,yv) : ctx.lineTo(x,yv);
      }
      ctx.strokeStyle = "rgba(235,250,255,"+(0.10 - i*0.02)+")";
      ctx.lineWidth = 2.2; ctx.stroke();
    }
    ctx.restore();
    return;
  }
  // мягкий туман у горизонта — глубина кадра
  ctx.save();
  const fogY = g.surfaceY;
  const fg = ctx.createLinearGradient(0, fogY - H*0.13, 0, fogY + H*0.03);
  fg.addColorStop(0, "rgba(225,240,248,0)");
  fg.addColorStop(0.65, (save.loc === "night" ? "rgba(120,150,200,0.10)" : "rgba(232,242,250,0.13)"));
  fg.addColorStop(1, "rgba(225,240,248,0)");
  ctx.fillStyle = fg;
  ctx.fillRect(0, fogY - H*0.13, W, H*0.16);
  ctx.restore();

  if (save.loc !== "lake"){ drawNearBank(g); return; }
  drawNearBank(g);
  const s = clamp(Math.min(W,H)/620, 0.7, 1.6);
  ctx.save();
  ctx.strokeStyle = "rgba(8,26,26,0.92)"; ctx.fillStyle = "rgba(8,26,26,0.92)"; ctx.lineCap = "round";
  const reeds = [
    {x:W*0.02,h:H*0.30,dir:1,w:3.2*s},{x:W*0.06,h:H*0.24,dir:1,w:2.6*s},{x:W*0.10,h:H*0.20,dir:1,w:2.2*s},
    {x:W*0.965,h:H*0.26,dir:-1,w:3.0*s},{x:W*0.93,h:H*0.19,dir:-1,w:2.4*s}
  ];
  for (const r of reeds){
    const topX = r.x + r.dir*W*0.05, topY = H - r.h;
    ctx.lineWidth = r.w;
    ctx.beginPath(); ctx.moveTo(r.x, H+10);
    ctx.quadraticCurveTo(r.x + r.dir*W*0.012, H - r.h*0.55, topX, topY); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(topX, topY-5*s, 3.2*s, 9*s, r.dir*0.12, 0, Math.PI*2); ctx.fill();
  }
  ctx.restore();
}
function drawVignette(){
  const grd = ctx.createRadialGradient(W/2, H*0.45, Math.min(W,H)*0.28, W/2, H*0.5, Math.max(W,H)*0.8);
  grd.addColorStop(0, "rgba(0,0,0,0)");
  grd.addColorStop(1, "rgba(0,0,0,0.44)");
  ctx.fillStyle = grd; ctx.fillRect(0,0,W,H);
}

function hexA(hex, a){
  const h = hex.replace("#","");
  const n = parseInt(h.length === 3 ? h.split("").map(c=>c+c).join("") : h, 16);
  return "rgba("+((n>>16)&255)+","+((n>>8)&255)+","+(n&255)+","+a+")";
}

function draw(){
  ctx.setTransform(DPR,0,0,DPR,0,0);
  ctx.clearRect(0,0,W,H);
  const g = geo();
  ctx.save();
  if (G.shake > 0.2) ctx.translate((Math.random()-0.5)*G.shake, (Math.random()-0.5)*G.shake);

  drawScene(g);
  drawUnderwater(g);
  drawWaterLive(g);
  drawWaterLife(g);
  drawAmbient(g);
  drawWX(g);
  drawSpots(g);
  drawZoneInfo(g);
  drawAimReticle(g);
  drawCastArc(g);
  drawSchool(g);
  drawSplashes();
  drawFishShadow(g);
  drawFishEnt(g);
  drawRod(g);
  drawImpactBurst(g);
  drawWake(g);
  drawPullFlash(g);
  drawBobberTrail(g);
  drawFightSwirl(g);
  drawBobber(g);
  drawPatience(g);
  drawFishTail(g);
  drawLine(g);
  drawTensionStreaks(g);
  drawLineDroplets(g);
  drawParticles();
  drawIce(g);
  drawHookFlash();
  drawForeground(g);
  drawVignette();

  if (G.flash > 0){ ctx.fillStyle = "rgba(255,80,60,"+(G.flash*0.3)+")"; ctx.fillRect(0,0,W,H); }
  if (G.questFlash){ G.questFlash.t -= 1/60; if (G.questFlash.t <= 0) G.questFlash = null; }
  drawQuestFlash();
  // «золотой час»: тёплые лучи при ясной погоде или закатном солнце
  if (["sunny","frost"].includes(weatherNow().icon) && save.loc !== "night"){
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const sunX = W*0.62, sunY = H*0.30;
    const grd = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, W*0.9);
    grd.addColorStop(0, "rgba(255,210,140,0.10)");
    grd.addColorStop(0.55, "rgba(255,180,110,0.045)");
    grd.addColorStop(1, "rgba(255,160,90,0)");
    ctx.fillStyle = grd; ctx.fillRect(0,0,W,H);
    // лучи
    for (let i=0;i<6;i++){
      const a = G.clock*0.06 + i*1.05;
      ctx.beginPath();
      ctx.moveTo(sunX, sunY);
      ctx.lineTo(sunX + Math.cos(a)*W, sunY + Math.sin(a)*W);
      ctx.lineTo(sunX + Math.cos(a+0.05)*W, sunY + Math.sin(a+0.05)*W);
      ctx.closePath();
      ctx.fillStyle = "rgba(255,225,170,0.028)";
      ctx.fill();
    }
    ctx.restore();
  }
  if (G.rarityFlash && G.rarityFlash.t > 0){
    const k = G.rarityFlash.t/0.9;
    const grd = ctx.createRadialGradient(W*0.5, H*0.45, 10, W*0.5, H*0.45, Math.max(W,H)*0.7);
    grd.addColorStop(0, hexA(G.rarityFlash.color, 0.28*k));
    grd.addColorStop(1, hexA(G.rarityFlash.color, 0));
    ctx.fillStyle = grd; ctx.fillRect(0,0,W,H);
  }
  ctx.restore();
}

/* ---------------- интерфейс: чипы, табы ---------------- */
function announceWeather(prev){
  const w = weatherNow();
  toast("Погода: " + w.name, w.hint, 2200);
  tone(520,0.12,"sine",0.05,700);
}

function syncWeatherChip(){
  const el = $("weatherChip");
  if (!el) return;
  const w = weatherNow();
  const shortName = {sunny:"Ясно", overcast:"Облачно", rain:"Дождь", mist:"Туман",
    thunder:"Гроза", moon:"Луна", snow:"Снег", frost:"Мороз"}[save.weather && save.weather.type] || w.name;
  const pct = Math.round((w.bite-1)*100);
  el.innerHTML = (WEATHER_ICONS[w.icon] || "") +
    '<span>'+shortName+'</span>' +
    (Math.abs(pct) >= 10 ? '<i class="'+(pct < 0 ? "down":"")+'">'+(pct>0?"+":"")+pct+'</i>' : '');
  el.title = w.name + " · клёв " + (pct>=0?"+":"") + pct + "% · " + w.hint;
}

/* ---- быстрая смена приманки ---- */
function toggleBaitShelf(force){
  const sh = $("baitShelf");
  if (!sh) return;
  const on = force === undefined ? !sh.classList.contains("on") : force;
  sh.classList.toggle("on", on);
  if (on) renderBaitShelf();
}
function renderBaitShelf(){
  const sh = $("baitShelf");
  if (!sh) return;
  const locB = locBaits();
  const ids = Object.keys(BAITS).sort((a,b) => {
    const ca = locB.has(a) ? 0 : 1, cb = locB.has(b) ? 0 : 1;
    return ca - cb || BAITS[a].tier - BAITS[b].tier;
  });
  sh.innerHTML = '<div class="bs-head">Приманка <span>нажми, чтобы сменить</span>'
    + '<button class="bs-x" id="bsClose">×</button></div>'
    + '<div class="bs-grid">' + ids.map(id => {
        const b = BAITS[id], own = baitsLeft(id), eq = save.equipped.bait === id;
        const here = locB.has(id);
        const fishHere = Object.keys(FISH).filter(k => FISH[k].bait === id &&
          locSpots().some(sp => sp.w[k]) && FISH[k].reqPower <= rodDef().power).length;
        // клубный плёс: сколько редких видов возьмёт эта приманка
        const clubSpotNow = premOwned() ? CLUB_SPOTS[save.loc] : null;
        const clubHits = clubSpotNow
          ? Object.keys(clubSpotNow.w).filter(k => FISH[k] && FISH[k].bait === id && FISH[k].reqPower <= rodDef().power).length : 0;
        return '<button class="bs'+(eq?" on":"")+(own?"":" empty")+(here?"":" far")+'" data-bait="'+id+'">'
          + '<b>'+b.name+'</b>'
          + '<small>'+own+' шт · '+(here ? (fishHere ? fishHere+" видов тут" : "нужна снасть сильнее") : "не в этом водоёме")
          + (clubHits ? ' · клуб +'+clubHits : '')+'</small>'
          + '</button>';
      }).join("") + '</div>';
  const x = sh.querySelector("#bsClose");
  if (x) x.addEventListener("click", () => toggleBaitShelf(false));
  sh.querySelectorAll(".bs").forEach(btn => btn.addEventListener("click", () => {
    const id = btn.dataset.bait;
    if (!save.owned.bait.includes(id)) save.owned.bait.push(id);
    save.equipped.bait = id;
    if (!baitsLeft(id)){ save.baits[id] = 10; toast("Приманка куплена", BAITS[id].name + " ×10 за " + (BAITS[id].price*10) + " монет.", 1600); }
    persist(); updateChips(); renderBaitShelf(); sfx.tap();
  }));
}

function renderGearBar(){
  const bar = $("gearbar");
  if (!bar) return;
  const gp = gearPower();
  const items = ["rod","reel","line","hook","bait","net"].map(slot => {
    const def = SLOTS.find(x => x.id === slot);
    const it = tableFor(slot)[save.equipped[slot]] || Object.values(tableFor(slot))[0];
    if (slot === "bait"){
      const left = baitsLeft(save.equipped.bait);
      return '<span class="gi bait" data-slot="bait" title="'+def.name+': '+it.name+' — осталось '+left+'">'
        + ICONS[slot] + '<i>'+left+'</i></span>';
    }
    return '<span class="gi" title="'+def.name+'">'+ICONS[slot]+'<i>'+it.tier+'</i></span>';
  }).join("");
  bar.innerHTML = items +
    '<span class="gp">'+ICONS.power+'<b>'+gp+'</b></span>';
  bar.classList.toggle("low", !!(G.fish && !G.fish.junk && FISH[G.fish.type] && FISH[G.fish.type].reqPower > gp));
  const baitBtn = bar.querySelector('.gi[data-slot="bait"]');
  if (baitBtn) baitBtn.addEventListener("click", (e) => { e.stopPropagation(); sfx.tap(); toggleBaitShelf(); });
}

function syncGearbarVisibility(){
  const bar = $("gearbar");
  if (!bar) return;
  const metersOn = ["power","fight"].includes(G.state);
  bar.classList.toggle("hide", metersOn);
}

function updateQuestDot(){
  const dot = $("questDot");
  if (!dot) return;
  const ready = QUESTS.some(q => questClaimable(q)) ||
    dailyNow().some(t => { const p = dailyProg(t); return p.cur >= p.max && !(save.daily.done||{})[t.id]; });
  dot.style.display = ready ? "block" : "none";
}
function updateChips(){
  $("coins").textContent = save.coins;
  if ($("coinsShop")) $("coinsShop").textContent = save.coins;
  if ($("pearls")) $("pearls").textContent = save.pearl || 0;
  if ($("pearlsShop")) $("pearlsShop").textContent = save.pearl || 0;
  const li = levelInfo();
  $("lvl").textContent = li.lvl;
  $("xpfill").style.width = (clamp(li.cur/li.need,0,1)*100)+"%";
  $("locName").textContent = locDef().short || locDef().name;
  const chipLoc = $("chipLoc");
  if (chipLoc) chipLoc.title = locDef().name + " — " + locDef().sub;
  syncWeatherChip();
  $("btnSound").innerHTML = save.mute ? ICONS.mute : ICONS.sound;
  renderGearBar();
  syncWeatherChip();
  updateQuestDot();
}
function updateTabState(){
  const fishing = ["idle","aim","power","casting","waiting","bite","fight"].includes(G.state);
  document.querySelectorAll(".tab").forEach(t => {
    t.classList.toggle("on", t.dataset.tab === "fish" && fishing);
  });
}
function initTabs(){
  const cfg = [
    {id:"tabBase", tab:"base", icon:ICONS.home, label:"База"},
    {id:"tabQuests", tab:"quests", icon:ICONS.star, label:"Квесты", badge:true},
    {id:"tabShop", tab:"shop", icon:ICONS.shop, label:"Магазин"},
    {id:"tabFish", tab:"fish", icon:ICONS.fish, label:"Рыбалка"},
    {id:"tabJournal", tab:"journal", icon:ICONS.book, label:"Дневник"}
  ];
  for (const c of cfg){
    const el = $(c.id);
    el.innerHTML = c.icon + "<span>" + c.label + "</span>" + (c.badge ? '<i class="tabdot" id="questDot"></i>' : "");
    el.addEventListener("click", () => {
      if (c.tab === "fish"){ closeAllSheets(); return; }
      if (c.tab === "base") openSheet("sheetBase", renderBase);
      if (c.tab === "shop"){ openSheet("sheetShop", () => renderShop()); }
      if (c.tab === "quests") openSheet("sheetQuests", renderQuests);
      if (c.tab === "journal") openSheet("sheetJournal", renderJournal);
    });
  }
}
const openSheets = new Set();
function openSheet(id, render){
  closeAllSheets();
  if (render) render();
  $(id).classList.add("on");
  openSheets.add(id);
  updateTabState();
  if (typeof renderGearBar === "function"){ renderGearBar(); syncGearbarVisibility(); }
}
function closeAllSheets(){
  document.querySelectorAll(".sheet.on").forEach(s => s.classList.remove("on"));
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("on"));
  openSheets.clear();
}

/* ---------------- база ---------------- */
function renderBase(){
  const li = levelInfo();
  const list = $("locList");
  list.innerHTML = "";
  for (const key in LOCATIONS){
    const L = LOCATIONS[key];
    const locked = li.lvl < L.unlock;
    const active = save.loc === key;
    const card = document.createElement("div");
    card.className = "locCard" + (locked ? " locked" : "") + (active ? " active" : "");
    card.dataset.loc = key;
    card.innerHTML =
      '<div class="photo" style="background-image:url('+IMG[LOC_BG[key]]+')"></div>' +
      '<div class="veil"></div>' +
      (locked
        ? '<div class="lockPill">'+ICONS.lock+' с '+L.unlock+' уровня</div>'
        : active ? '<div class="badgeOn">'+ICONS.check+' здесь</div>' : '') +
      '<div class="inner">' +
        '<h3>'+L.name+'</h3>' +
        '<p>'+L.desc+'</p>' +
        '<div class="tags">' +
          '<span class="tag trunc">'+L.sub+'</span>' +
          '<span class="tag gold">'+ICONS.bolt+' ×'+L.pullMul.toFixed(2)+'</span>' +
          '<span class="tag green">'+L.sizeMul.toFixed(2)+'×</span>' +
        '</div>' +
      '</div>';
    // кто водится в этом водоёме
    const set = new Set();
    for (const sp of L.spots) for (const k in sp.w) set.add(k);
    const order = {mythic:0, legendary:1, epic:2, rare:3, uncommon:4, common:5};
    const all = [...set];
    const top = all.slice().sort((a,b) => (order[FISH[a].rar] - order[FISH[b].rar]) || (FISH[b].wMax - FISH[a].wMax)).slice(0,4);
    const more = all.length - top.length;
    // подсказка: что здесь ловится на надетую приманку и хватает ли удочки
    const baitName = BAITS[save.equipped.bait].name;
    const here = all.filter(k => FISH[k].bait === save.equipped.bait);
    const powered = here.filter(k => FISH[k].reqPower <= rodDef().power);
    const baitSet = new Set(all.map(k => BAITS[FISH[k].bait].name));
    const hintTxt = powered.length
      ? "На «"+baitName+"»: " + fishCount(powered.length)
      : here.length
        ? "На «"+baitName+"» нужна удочка сильнее"
        : "На «"+baitName+"» тут не берёт";
    card.querySelector(".inner").insertAdjacentHTML("beforeend",
      '<div class="locFish">' + top.map(k => '<img src="'+IMG.fish[artOf(k)]+'" style="filter:hue-rotate('+paletteFor(k).hue+'deg)" alt="'+FISH[k].name+'" title="'+FISH[k].name+'">').join("") +
      (more > 0 ? '<span>+' + fishCount(more) + '</span>' : '') + '</div>' +
      '<div class="locHint '+(powered.length?"ok":"warn")+'">'+hintTxt+'</div>' +
      '<div class="locBaits">Приманки: ' + [...baitSet].join(" · ") + '</div>');

    if (L.seaReq && !rodDef().sea){
      card.querySelector(".inner").insertAdjacentHTML("beforeend",
        '<div class="locHint warn">Нужна морская удочка — «Морской троллинг» и выше</div>');
    }
    if (!locked){
      card.addEventListener("click", () => {
        if (L.seaReq && !rodDef().sea){
          toast("Солёная вода", "Обычная снасть не переживёт море. Купи «Морской троллинг» в магазине.", 2200);
          return;
        }
        if (save.loc !== key){
          save.loc = key; save.weather = null; rollWeather(); persist();
          G.spot = null; setState("idle"); updateChips();
          if (key === "winter") setTimeout(startDrill, 420);
          sfx.tap();
        }
        closeAllSheets();
        setState("idle");
      });
    } else {
      card.addEventListener("click", () => toast("Закрыто", "Нужен "+L.unlock+" уровень. Лови рыбу, чтобы качаться.", 1600));
    }
    list.appendChild(card);
  }

  const gs = $("gearSummary");
  const rows = [
    ["rod",  save.equipped.rod],
    ["reel", save.equipped.reel],
    ["line", save.equipped.line],
    ["hook", save.equipped.hook],
    ["bait", save.equipped.bait],
    ["net",  save.equipped.net]
  ];
  gs.innerHTML = rows.map(([slot, id]) => {
    const def = SLOTS.find(s => s.id === slot);
    const item = tableFor(slot)[id] || Object.values(tableFor(slot))[0];
    return '<div class="item" style="margin-bottom:7px">'
      + '<div class="ico">'+ICONS[slot]+'</div>'
      + '<div class="txt"><b>'+item.name+'</b><small>'+def.name+' · ур. '+item.tier+'</small></div>'
      + '</div>';
  }).join("");
}

/* ---------------- магазин ---------------- */
let shopSlot = "rod";
function renderShop(){
  const seg = $("shopSeg");
  seg.innerHTML = SLOTS.map(s =>
    '<button class="seg'+(shopSlot===s.id?" on":"")+'" data-slot="'+s.id+'">'+ICONS[s.id]+'<span>'+s.name+'</span></button>'
  ).join("");
  seg.querySelectorAll(".seg").forEach(b => b.addEventListener("click", () => { shopSlot = b.dataset.slot; sfx.tap(); renderShop(); }));

  const def = SLOTS.find(s => s.id === shopSlot);
  const table = tableFor(shopSlot);
  const list = $("itemList");
  const li = levelInfo();
  list.innerHTML = "";
  const ids = Object.keys(table).sort((a,b) => table[a].tier - table[b].tier);

  const stat = (it, id) => {
    switch (shopSlot){
      case "rod":  return [["прочность", it.power], ["ловит рыбу силой до", it.reqPower], ["крупняк до", roundKg(it.reqPower*19) + " кг"], [it.sea ? "море" : "пресная", it.sea ? "да" : "нет"]];
      case "line": return [["прочность", it.power], ["крупняк до", roundKg(it.power*19) + " кг"], ["зона", Math.round(it.hi*100)+"%"]];
      case "reel": return [["скорость", "×"+it.speed.toFixed(2)], ["плавность", "×"+it.gain.toFixed(2)]];
      case "hook": return [["окно", "×"+it.windowMul.toFixed(2)], ["засечка", "+"+Math.round(it.hookChance*100)+"%"]];
      case "net":  return [["слабина", "×"+it.netSlack.toFixed(2)], ["подъём", "×"+it.progress.toFixed(2)]];
      case "bait": return [["цена", it.price + " / шт"], ["рыб", fishCount(Object.keys(FISH).filter(k => FISH[k].bait === id).length)], ["запас", baitsLeft(id) + " шт"]];
    }
    return [];
  };

  for (const id of ids){
    const it = table[id];
    const owned = save.owned[shopSlot].includes(id);
    const equipped = save.equipped[shopSlot] === id;
    const isPrem = !!it.pearl;
    const canBuy = isPrem ? (save.pearl||0) >= it.pearl : save.coins >= it.price;
    // премиум — отдельный слой: покупается за жемчуг с любого уровня
    const lvlOk = isPrem ? true : li.lvl >= (it.lvl || 0);
    const locked = !owned && !lvlOk;

    const el = document.createElement("div");
    el.className = "item" + (equipped ? " equipped" : owned ? " owned" : "") + (locked ? " locked" : "") + (isPrem ? " premium" : "");
    const baitFish = shopSlot === "bait" ? Object.keys(FISH).filter(k => FISH[k].bait === id) : [];
    const famNames = shopSlot === "bait"
      ? (baitFish.length ? baitFish.slice(0,10).map(k => FISH[k].name).join(" · ") + (baitFish.length > 10 ? " и ещё " + (baitFish.length-10) : "") : "ни одна рыба не берёт")
      : "";
    el.innerHTML =
      '<div class="ico'+(isPrem?" prem":"")+'">'+ICONS[shopSlot]+'</div>' +
      '<div class="txt"><b>'+(isPrem?'<span class="premTag">PREMIUM</span>':'')+it.name+
        '<span class="tiers">'+[1,2,3,4,5,6,7,8].map(n=>'<i class="'+(n<=it.tier?"f":"")+'"></i>').join("")+'</span></b>' +
        '<small>'+it.desc+'</small>' +
        '<div class="stats">'+stat(it, id).map(([k,v]) => '<span>'+k+' <b>'+v+'</b></span>').join("")+'</div>' +
        (famNames ? '<div class="fam">'+famNames+'</div>' : '') +
        (shopSlot === "bait" && owned ? '<button class="restock">Докупить 20 шт · '+fmtNum(it.price*20)+ICONS.coin+'</button>' : '') +
      '</div>' +
      '<button class="buy '+(isPrem && !owned ? "prem" : equipped?"on":owned?"ghost":locked?"lock":"")+'" '+(equipped||locked||(!owned&&!canBuy)?"disabled":"")+'>' +
        (equipped ? ICONS.check + " надето"
         : locked ? ICONS.lock + " " + (it.lvl) + " ур."
         : owned ? "Надеть"
         : isPrem ? ICONS.pearl + " " + it.pearl
         : ICONS.coin + " " + fmtNum(it.price)) +
      '</button>';

    const rs = el.querySelector(".restock");
    if (rs) rs.addEventListener("click", (e) => {
      e.stopPropagation();
      if (save.coins < it.price*20){ toast("Не хватает монет", "Докупи приманку позже или выбери другую.", 1500); return; }
      save.coins -= it.price*20;
      save.baits[id] = baitsLeft(id) + 20;
      persist(); sfx.buy(); renderShop(); updateChips();
    });
    const btn = el.querySelector("button.buy");
    btn.addEventListener("click", () => {
      if (equipped || locked) return;
      if (owned && equipped && !isPrem){
        // повторный тап по надетому — просто закрыть меню (без сюрпризов)
      }
      if (!owned){
        if (isPrem){
          if ((save.pearl||0) < it.pearl){ toast("Не хватает жемчуга", "Жемчуг выпадает за трофеи, легенд и квесты.", 2000); return; }
          save.pearl -= it.pearl;
          save.owned[shopSlot].push(id);
          sfx.buy(); buzz(30);
          toast("Премиум открыт", it.name + " теперь твой навсегда.", 2200);
        } else {
          if (save.coins < it.price){ toast("Не хватает монет", "Поймай ещё рыбы или выбери приманку под рыбу.", 1600); return; }
          save.coins -= it.price;
          save.owned[shopSlot].push(id);
          if (shopSlot === "bait" && !baitsLeft(id)) save.baits[id] = 20;
          sfx.buy(); buzz(20);
        }
      } else sfx.tap();
      // надетым остаётся один предмет слота: прежний остаётся в коллекции, но снимается
      save.equipped[shopSlot] = id;
      persist(); updateChips(); renderShop();
      if (shopSlot === "line"){
        $("tensionZone").style.width = ((lineHI()-GREEN_LO)*100)+"%";
      }
      if (shopSlot === "rod" || shopSlot === "line") renderGearBar();
    });
    list.appendChild(el);
  }

  const note = document.createElement("div");
  note.style.cssText = "font-size:12px;color:rgba(243,236,221,.55);font-weight:650;line-height:1.5;margin:6px 2px 0";
  // премиум-блок
  const premRow = document.createElement("div");
  premRow.className = "premNote";
  const clubLine = premOwned()
    ? '<br><b style="color:#d9c9ff">Клуб: ур. ' + clubLvl() + ' / 5 · ' + clubRank().name +
      ' · ' + premCount() + '/' + PEARL_ITEMS.length + ' предметов</b>' +
      '<small>Перки: ' + [
        perk("pearl") ? "жемчуг +" + Math.round(perk("pearl")*100) + "%" : "",
        perk("bite") ? "поклёвка −" + Math.round(perk("bite")*100) + "%" : "",
        perk("coin") ? "монеты +" + Math.round(perk("coin")*100) + "%" : "",
        perk("big") ? "крупная рыба +" + Math.round(perk("big")*100) + "%" : "",
        perk("all") ? "размер рыбы +" + Math.round(perk("all")*100) + "%" : ""
      ].filter(Boolean).join(" · ") +
      '. Клубный плёс открыт на всех водоёмах' + (clubDayReady() ? ', набор ждёт в разделе «Квесты».' : '.') + '</small>'
    : '<br><b style="color:#d9c9ff">Преимущества клуба</b><small>Любой премиум-предмет даёт уровень клуба: ' +
      'перки (жемчуг, скорость поклёвки, монеты, крупная рыба), закрытый клубный плёс на каждом водоёме и ' +
      'ежедневный набор монет, опыта и жемчуга.</small>';
  premRow.innerHTML = ICONS.pearl + '<div><b>Жемчуг: ' + (save.pearl||0) + '</b>' +
    '<small>Жемчуг падает за трофеи, легенд и мифических рыб, а также за квесты. Премиум-предметы покупаются один раз и навсегда.</small>' +
    clubLine + '</div>';
  list.appendChild(premRow);
  note.textContent = shopSlot === "bait"
    ? "Каждая рыба берёт ТОЛЬКО свою приманку: за заброс тратится 1 шт. Кукуруза и хлеб дёшевы, креветка и краб — для трофеев."
    : "Рыба клюёт только на удочку нужной прочности и только на свою приманку. Снасти не расходуются — расходуется приманка.";
  list.appendChild(note);
}

/* ---------------- квесты: интерфейс ---------------- */
let qChapter = "all";
function questRewardText(r){
  const p = [];
  if (r.coins) p.push('<span class="rw coins">'+ICONS.coin + r.coins+'</span>');
  if (r.xp) p.push('<span class="rw xp">'+ICONS.star + r.xp+'</span>');
  if (r.rod) p.push('<span class="rw item">'+ICONS.rod + RODS[r.rod].name+'</span>');
  if (r.line) p.push('<span class="rw item">'+ICONS.line + LINES[r.line].name+'</span>');
  if (r.bait) p.push('<span class="rw item">'+ICONS.bait + r.baitN+'×'+BAITS[r.bait].name+'</span>');
  return p.join("");
}
/* клубная карточка: уровень, перки и ежедневный набор */
function renderClubCard(){
  const el = $("clubCard");
  if (!el) return;
  const lvl = clubLvl(), rank = clubRank();
  const ready = clubDayReady();
  const nextLvl = Math.min(5, lvl + 1);
  const nextRank = CLUB_RANKS[nextLvl];
  const cnt = premCount();
  const needForNext = lvl === 0 ? "нужен первый премиум-предмет"
    : lvl >= 5 ? "высший уровень, все перки открыты"
    : "ещё " + (5 - cnt) + " " + plur(5 - cnt, "предмет", "предмета", "предметов") +
      " до ранга «" + CLUB_RANKS[5].name + "»";
  const perkRow = (key, label, val) =>
    '<span class="club-perk'+(val > 0 ? "" : " off")+'">'+ICONS.star+
      label + (val > 0 ? " +" + Math.round(val*100) + "%" : "")+'</span>';
  const perks = premOwned()
    ? perkRow("pearl","жемчуг за улов", perk("pearl")) +
      perkRow("bite","скорость поклёвки", perk("bite")) +
      perkRow("coin","монеты", perk("coin")) +
      perkRow("big","крупная рыба", perk("big")) +
      perkRow("all","размер рыбы", perk("all"))
    : '<span class="club-perk off">перки откроются после первой покупки</span>';
  el.className = "clubcard" + (premOwned() ? "" : " locked");
  el.innerHTML =
    '<div class="club-head">' +
      '<div class="club-medal">'+ICONS.pearl+'</div>' +
      '<div class="club-title">Премиум-клуб<small>'+(premOwned() ? rank.name : "закрыт · предметы за жемчуг")+'</small></div>' +
      '<div class="club-lvl">'+(premOwned() ? "ур. "+lvl+" / 5" : "нет доступа")+
        (premOwned() ? '<small>' + cnt + ' из ' + PEARL_ITEMS.length + ' предметов</small>' : '')+'</div>' +
    '</div>' +
    '<div class="club-perks">'+perks+'</div>' +
    (premOwned()
      ? '<button class="club-btn'+(ready ? " ready" : "")+'" id="clubDayBtn"'+(ready ? "" : " disabled")+'>' +
          (ready ? "Забрать клубный набор" : "Набор уже забран — завтра новый") + '</button>' +
        '<div class="club-foot">Набор: +'+CLUB_DAY.coins+' монет, +'+CLUB_DAY.xp+' опыта, +'+CLUB_DAY.pearl+
          ' жемчуг, приманки — раз в сутки. Клубный плёс: четвёртая точка на каждом водоёме, метка «КЛУБ» на воде.' +
          '<br><b>Дальше:</b> '+needForNext+'.</div>'
      : '<button class="club-btn" id="clubShopBtn">Открыть премиум-предметы</button>' +
        '<div class="club-foot">Купи любой предмет за жемчуг — откроешь уровень клуба, перки, ' +
          'клубный плёс на всех водоёмах и ежедневный набор.</div>');
  const b1 = $("clubDayBtn");
  if (b1) b1.addEventListener("click", () => { claimClubDay(); });
  const b2 = $("clubShopBtn");
  if (b2) b2.addEventListener("click", () => { closeAllSheets(); openSheet("sheetShop", () => renderShop()); });
}

function renderQuests(){
  const list = $("qList");
  if (!list) return;
  const doneAll = QUESTS.filter(q => questDone(q.id)).length;
  $("qSub").textContent = "Выполнено " + doneAll + " из " + QUESTS.length +
    " · рыб в дневнике " + Object.keys(save.caught).length + "/100";

  // ежедневные
  const tasks = dailyNow();
  const daily = $("qDaily");
  if (daily){
    const left = tasks.filter(t => !(save.daily.done||{})[t.id]).length;
    daily.innerHTML = '<div class="dailyHead">'+ICONS.bolt+' Цели дня <i>'+(3-left)+'/3</i></div>' +
      tasks.map(t => {
        const p = dailyProg(t), claimed = !!(save.daily.done||{})[t.id];
        const ready = p.cur >= p.max && !claimed;
        return '<div class="dailyRow'+(claimed?" claimed":"")+(ready?" ready":"")+'">' +
          '<div class="dtxt"><b>'+t.text+'</b>' +
            '<div class="dbar"><i style="width:'+Math.round(p.cur/p.max*100)+'%"></i></div>' +
            '<small>'+p.cur+' / '+p.max+' · +'+t.coins+' монет, +'+t.xp+' опыта</small></div>' +
          (claimed ? '<span class="dclaim done">'+ICONS.check+'</span>'
                   : ready ? '<button class="dclaim" data-daily="'+t.id+'">Забрать</button>'
                           : '<span class="dclaim wait">…</span>') +
        '</div>';
      }).join("");
    daily.querySelectorAll("button[data-daily]").forEach(b =>
      b.addEventListener("click", () => claimDaily(b.dataset.daily)));
  }

  renderClubCard();

  // главы
  const chap = $("qChapters");
  if (chap){
    const chapters = ["all"].concat(CHAPTER_ORDER.filter(c => QUESTS.some(q => q.chapter === c)));
    chap.innerHTML = chapters.map(c => {
      const list = c === "all" ? QUESTS : QUESTS.filter(q => q.chapter === c);
      const done = list.filter(q => questDone(q.id)).length;
      const ready = list.some(q => questClaimable(q));
      return '<button class="chipf'+(qChapter===c?" on":"")+(ready?" ready":"")+'" data-chap="'+c+'">' +
        (c==="all" ? "Все" : c) + ' <i>'+done+'/'+list.length+'</i></button>';
    }).join("");
    chap.querySelectorAll(".chipf").forEach(b => b.addEventListener("click", () => {
      qChapter = b.dataset.chap; sfx.tap(); renderQuests();
    }));
  }

  const shown = QUESTS.filter(q => qChapter === "all" || q.chapter === qChapter);
  list.innerHTML = shown.map(q => {
    const p = questProgress(q), done = questDone(q.id), ready = questClaimable(q);
    const pct = Math.round(p.cur / p.max * 100);
    return '<div class="qcard'+(done?" done":"")+(ready?" ready":"")+'">' +
      '<div class="qtop"><b>'+q.title+'</b>' +
        '<span class="qchap">'+q.chapter+'</span></div>' +
      '<small class="qsub">'+q.sub+'</small>' +
      '<div class="qbar"><i style="width:'+pct+'%"></i></div>' +
      '<div class="qfoot"><span class="qnum">'+p.cur+' / '+p.max+'</span>' +
        '<span class="qrew">'+questRewardText(q.reward)+'</span></div>' +
      (done ? '<div class="qdoneTag">'+ICONS.check+' выполнено</div>'
            : ready ? '<button class="qclaim" data-q="'+q.id+'">Забрать награду</button>'
                    : '<div class="qtip">'+q.tip+'</div>') +
      '</div>';
  }).join("");
  list.querySelectorAll("button[data-q]").forEach(b =>
    b.addEventListener("click", () => claimQuest(b.dataset.q)));
}

/* окно «квест выполнен» */
let qdTimer = 0;
function showQuestDone(q){
  const el = $("questDone");
  if (!el) return;
  clearTimeout(qdTimer);
  qdTimer = setTimeout(()=>el.classList.remove("on"), 9000);
  el.querySelector(".qd-title").textContent = q.title;
  el.querySelector(".qd-sub").textContent = q.sub;
  el.querySelector(".qd-rew").innerHTML = questRewardText(q.reward);
  el.classList.add("on");
  el.querySelector(".qd-btn").onclick = () => {
    el.classList.remove("on");
    claimQuest(q.id);
  };
  el.querySelector(".qd-later").onclick = () => el.classList.remove("on");
  // тап по затемнению тоже закрывает окно, чтобы не блокировать игру
  el.onclick = (e) => { if (e.target === el) el.classList.remove("on"); };
  sfx.level();
}

/* ---------------- дневник ---------------- */
let jCat = "all", jQ = "", jShow = 24;
function renderJournal(){
  const grid = $("jgrid");
  const all = Object.keys(FISH);
  const got = all.filter(k => save.caught[k]).length;
  $("jSub").textContent = "Поймано видов: " + got + " из " + all.length +
    " · " + (save.total || 0) + " рыб всего";
  // отметки «новое» снимаем после просмотра
  setTimeout(()=>{
    let changed = false;
    for (const k in save.caught) if (save.caught[k].isNew){ delete save.caught[k].isNew; changed = true; }
    if (changed) persist();
  }, 2500);

  // фильтры по группам
  const cats = ["all"].concat(Object.keys(CAT_LABEL));
  const filt = $("jFilters");
  if (filt){
    filt.innerHTML = cats.map(c => {
      const cnt = c === "all" ? all.length : FISH_CAT[c].length;
      const has = c === "all" ? got : FISH_CAT[c].filter(k => save.caught[k]).length;
      return '<button class="chipf'+(jCat===c?" on":"")+'" data-cat="'+c+'">'
        + (c==="all" ? "Все" : CAT_LABEL[c]) + ' <i>'+has+'/'+cnt+'</i></button>';
    }).join("");
    filt.querySelectorAll(".chipf").forEach(b => b.addEventListener("click", () => {
      jCat = b.dataset.cat; jShow = 24; sfx.tap(); renderJournal();
    }));
  }

  const list = all.filter(k => (jCat === "all" || FISH_CAT_OF[k] === jCat) &&
    (!jQ || FISH[k].name.toLowerCase().includes(jQ)));

  const order = ["common","uncommon","rare","epic","legendary","mythic"];
  const byRar = {};
  for (const k of list) (byRar[FISH[k].rar] = byRar[FISH[k].rar] || []).push(k);
  const shown = list.slice(0, jShow).map(k => k);
  const shownSet = new Set(shown);

  let html = "";
  for (const r of order){
    const arr = (byRar[r] || []).filter(k => shownSet.has(k));
    if (!arr.length) continue;
    const full = byRar[r].length;
    html += '<div class="secTitle" style="grid-column:1/-1;margin:10px 2px 2px">'+RARITY[r].label+
      ' <span style="color:'+RARITY[r].color+'">'+arr.filter(k=>save.caught[k]).length+'/'+full+'</span></div>';
    html += arr.map(k => {
      const F = FISH[k], c = save.caught[k], R = RARITY[F.rar];
      const pal = paletteFor(k);
      return '<div class="jcard'+(c?" got":"")+'" data-fish="'+k+'">'
        + (c
            ? '<img src="'+IMG.fish[artOf(k)]+'" style="filter:hue-rotate('+pal.hue+'deg) saturate('+pal.sat+')" alt="">'
            : '<div class="sil">'+ICONS.fish+'</div>')
        + '<b>'+(c?F.name:"???")+'</b>'
        + '<small>'+(c?("×"+c.n+" · "+fmtKg(c.best)+" кг"):"не поймана")+'</small>'
        + '<div class="rar" style="color:'+R.color+'">'+R.label+'</div>'
        + '</div>';
    }).join("");
  }
  if (list.length > jShow){
    html += '<button class="moreBtn" id="jMore" style="grid-column:1/-1;margin:10px 0 0">Показать ещё '+
      Math.min(24, list.length - jShow)+' из '+(list.length-jShow)+'</button>';
  }
  grid.innerHTML = html;
  const more = $("jMore");
  if (more) more.addEventListener("click", () => { jShow += 24; sfx.tap(); renderJournal(); });

  // карточка вида по тапу
  grid.querySelectorAll(".jcard").forEach(el => el.addEventListener("click", () => showFishCard(el.dataset.fish)));

  $("stCasts").textContent = save.casts;
  $("stCaught").textContent = save.total;
  $("stBreaks").textContent = save.breaks;
  $("stLost").textContent = save.lost;
  $("stMass").textContent = (save.mass/1000).toFixed(1)+" кг";
  $("stBest").textContent = save.best ? fmtKg(save.best)+" кг" : "—";
  $("stCast").textContent = save.bestCast ? save.bestCast + "%" : "—";
}

/* подробная карточка вида: приманка, нужная удочка, водоёмы */
function showFishCard(id){
  const F = FISH[id]; if (!F) return;
  const c = save.caught[id];
  const R = RARITY[F.rar], pal = paletteFor(id);
  const rod = rodDef();
  const bait = BAITS[F.bait];
  const rodOk = F.reqPower <= rod.power;
  const where = [];
  for (const lk in LOCATIONS){
    const L = LOCATIONS[lk];
    if (L.spots.some(sp => sp.w[id])) where.push(L.name);
  }
  const el = $("fishCard");
  el.querySelector(".fc-art").innerHTML =
    (c ? '<img src="'+IMG.fish[artOf(id)]+'" class="fishSwim" style="filter:hue-rotate('+pal.hue+'deg) saturate('+pal.sat+')">'
       : '<div class="sil" style="width:120px;height:120px">'+ICONS.fish+'</div>');
  el.querySelector(".fc-rar").textContent = R.label + " · " + CAT_LABEL[FISH_CAT_OF[id]];
  el.querySelector(".fc-rar").style.cssText = "background:"+R.bg+";color:"+R.color;
  el.querySelector(".fc-name").textContent = c ? F.name : "???";
  el.querySelector(".fc-note").textContent = c ? F.note : "Ещё не поймана. Подсказки ниже помогут.";
  el.querySelector(".fc-rows").innerHTML =
    '<div><small>Приманка</small><b>'+bait.name+'</b></div>' +
    '<div><small>Нужна удочка</small><b class="'+(rodOk?"ok":"warn")+'">сила '+F.reqPower+'</b></div>' +
    '<div><small>Вес</small><b>'+fmtKg(F.wMin)+'–'+fmtKg(F.wMax)+' кг</b></div>' +
    '<div><small>Цена</small><b>'+F.val+'/кг</b></div>' +
    '<div style="grid-column:1/-1"><small>Водоёмы</small><b>'+where.join(" · ")+'</b></div>' +
    (c ? '<div><small>Поймано</small><b>×'+c.n+'</b></div><div><small>Рекорд</small><b>'+fmtKg(c.best)+' кг</b></div>' : "");
  el.classList.add("on");
}

/* ---------------- ввод ---------------- */
function isWaterPoint(x, y){
  const g = geo();
  // вода — вся область ниже линии горизонта (кнопки и панели перехватывают свои тапы сами)
  return y > g.surfaceY + 10 && y < H - 4 && x > W*0.02 && x < W*0.98;
}

function nearestSpot(x, y){
  const spots = locSpots();
  let best = null, bd = 1e9;
  for (const sp of spots){
    const pos = spotPos(sp);
    const d = Math.hypot(x - pos.x, y - pos.y);
    if (d < bd){ bd = d; best = sp; }
  }
  return bd < Math.min(W,H)*0.22 ? best : null;
}

/* после улова сцена коротко «перезаряжается», чтобы новый заброс не был мгновенным */
function castReady(){
  // G.clock — время непрерывного рендера, оно может отставать от реального,
  // поэтому готовность считаем по реальным часам
  if (!G.readyAtMs) return true;
  const left = G.readyAtMs - performance.now();
  if (left <= 0){ G.readyAtMs = 0; return true; }
  hint("Секунду… рыба успокаивается", true);
  return false;
}

function pressStart(x, y, fromButton){
  if (G.cardOpen) return;      // пока открыта карточка улова, сцена не принимает тапы
  audio();
  switch (G.state){
    case "idle": {
      if (!castReady()) break;
      // заброс в любое место воды: точки — лишь подсказка, куда рыба ходит чаще
      if (isWaterPoint(x, y)) castAt(x, y);
      else toast("Вода ниже", "Бросай в воду — по любому месту, а не только в кружки", 1500);
      break;
    }
    case "aim": {
      if (!castReady()) break;
      if (fromButton) { beginPower(); break; }
      if (isWaterPoint(x, y)) castAt(x, y);
      else beginPower();
      break;
    }
    case "power": break;
    case "waiting": {
      // подёргивание приманки (зимой — мормышки): рыба «оживает» и интерес растёт
      if (G.jigT <= 0){
        G.jigT = 0.42;
        G.jigCount = (G.jigCount || 0) + 1;
        ring(G.bobX);
        ring(G.bobX + 10);
        if (sfx.tap) sfx.tap();
        buzz(8);
        if (G.jigCount > 3){
          // перекормил: рыба отходит, интерес падает — дергать без конца невыгодно
          G.interest = clamp((G.interest || 0) - 0.12, 0.05, 0.95);
          G.waitDur = (G.waitDur || 0) + 0.45;
          hint("Хватит дёргать — рыба насторожилась", true);
        } else {
          G.interest = clamp((G.interest || 0) + 0.075, 0, 0.95);
          G.waitDur = Math.max(1.8, (G.waitDur || 0) - 0.38);
          hint(save.loc === "winter" ? "Мормышка играет…" : "Приманка играет…", true);
        }
      } else {
        hint("Дай приманке полежать секунду-другую", true);
      }
      break;
    }
    case "bite": hook(); break;
    case "fight": G.hold = true; break;
  }
}
function pressEnd(){
  if (G.state === "power") releasePower();
  else if (G.state === "fight") G.hold = false;
}

const actionBtn = $("action");
let btnDown = false;
let downAt = 0;
let pressedAt = 0, released = true;
function btnDownHandler(e){
  if (e.cancelable) e.preventDefault();
  if (G.cardOpen) return;
  if (!released && performance.now() - pressedAt > 350) released = true;   // страховка от потерянного отпускания
  if (!released) return;
  released = false; pressedAt = performance.now();
  btnDown = true; downAt = pressedAt;
  if (G.state === "idle"){
    if (!castReady()) return;
    // кнопка бросает в середину воды, тап по воде — в выбранное место
    castAt(W*0.52, geo().surfaceY + (H - geo().surfaceY)*0.42, true);
    beginPower();
    return;
  }
  if (G.state === "aim"){ if (!castReady()) return; beginPower(); return; }
  pressStart(0, 0, true);       // в бою это «держать»
}
function btnUpHandler(e){
  if (e && e.cancelable) e.preventDefault();
  released = true; btnDown = false;
  // отпускание в фазе силы = заброс, в бою = прекратить тянуть
  if (G.state === "power") releasePower();
  else if (G.state === "fight") G.hold = false;
}
["pointerdown","touchstart","mousedown"].forEach(ev => actionBtn.addEventListener(ev, btnDownHandler, {passive:false}));
["pointerup","touchend","mouseup","pointercancel","touchcancel"].forEach(ev => actionBtn.addEventListener(ev, btnUpHandler));

cv.addEventListener("pointerdown", e => {
  e.preventDefault();
  const r = cv.getBoundingClientRect();
  // канва растянута на экран — переводим клиентские координаты в координаты сцены
  pressStart((e.clientX - r.left) * (W / r.width), (e.clientY - r.top) * (H / r.height));
});
cv.addEventListener("pointerup", pressEnd);
cv.addEventListener("pointercancel", pressEnd);
window.addEventListener("pointerup", () => { if (btnDown){ btnDown = false; } pressEnd(); });
window.addEventListener("pointercancel", () => { btnDown = false; pressEnd(); });
window.addEventListener("blur", () => { btnDown = false; pressEnd(); });
// на всякий случай: перед новым нажатием по сцене сбрасываем «зажатие» кнопки
document.addEventListener("pointerdown", () => { if (btnDown){ btnDown = false; pressEnd(); } }, true);
window.addEventListener("contextmenu", e => e.preventDefault());

window.addEventListener("keydown", e => {
  if (e.repeat) return;
  if (e.code === "Space" || e.code === "Enter"){
    e.preventDefault();
    if ($("catchCard").classList.contains("on")){ nextCatch(); return; }
    pressStart(0, 0, true);
  }
  if (e.code === "KeyM"){ toggleSound(); }
  if (e.code === "Escape"){
    const anySheet = document.querySelector(".sheet.on");
    if (anySheet) closeAllSheets();
    else if (!START.on) openStart();
  }
});
window.addEventListener("keyup", e => {
  if (e.code === "Space" || e.code === "Enter") pressEnd();
});

function nextCatch(){
  G.cardOpen = false;
  $("catchCard").classList.remove("on");
  if (G.pendingLevel){
    const lvl = G.pendingLevel; G.pendingLevel = 0;
    setTimeout(()=>{ sfx.level(); toast("Уровень "+lvl+"!", unlockedText(lvl), 2800); }, 260);
  }
  setTimeout(checkQuestPopups, 700);
  if (G.spot){ G.tension = clamp(GREEN_LO+0.05,0,lineHI()-0.02); setState("aim"); }
  else setState("idle");
  // сцена «перезаряжается»: нельзя молниеносно кидать следующий заброс
  G.readyAtMs = performance.now() + 1800;
  setTimeout(()=>{ if (G.state === "aim" || G.state === "idle") hint(""); }, 1500);
}
$("btnNext").addEventListener("click", nextCatch);

function toggleSound(){
  save.mute = !save.mute; persist(); updateChips();
  if (!save.mute) sfx.tap();
}
$("btnSound").addEventListener("click", toggleSound);

document.querySelectorAll("[data-close]").forEach(b =>
  b.addEventListener("click", () => {
    const id = b.dataset.close;
    const el = document.getElementById(id);
    if (el) el.classList.remove("on");
    if (id && id.startsWith("sheet")) closeAllSheets();
    sfx.tap();
  })
);
$("btnToShop").addEventListener("click", () => openSheet("sheetShop", renderShop));
const helpBase = $("btnHelpBase");
if (helpBase) helpBase.addEventListener("click", () => openSheet("sheetHelp", renderHelp));
const toStart = $("btnToStartBase");
if (toStart) toStart.addEventListener("click", () => {
  closeAllSheets();
  setTimeout(() => openStart(), 120);
});
const helpOk = $("btnHelpOk");
if (helpOk) helpOk.addEventListener("click", () => { const sh = $("sheetHelp"); if (sh) sh.classList.remove("on"); sfx.tap(); });

/* ---------------- справка ---------------- */
function renderHelp(){
  document.querySelectorAll("#sheetHelp .hrIco[data-ico]").forEach(sp => {
    const k = sp.dataset.ico;
    sp.innerHTML = ICONS[k] || ICONS.fish;
  });
  const el = $("helpSteps");
  if (!el) return;
  el.innerHTML = [
    ["1","<b>Бросай в любое место</b> воды: кружки (камыши, открытая вода, глубина) — лишь подсказка, где рыба ходит чаще. Чип под точкой покажет, сколько видов берёт твою приманку."],
    ["1б","<b>Поклёвку ждать придётся</b>: рыба присматривается 2–16 секунд — в зависимости от места, приманки и погоды. Пока ждёшь, можно 2–3 раза <b>подёргать приманку</b> (зимой — мормышку): интерес растёт, поклёвка приходит раньше. Совсем заждался — бросай в другое место."],
    ["2","<b>Смени приманку</b> в полоске снаряжения снизу — у каждой рыбы она своя."],
    ["3","<b>Поймай силу заброса:</b> отпусти, когда стрелка в зелёной зоне. Точно — клюёт чаще и крупнее."],
    ["4","<b>Подсеки</b>, когда над поплавком вспыхнет «!» и сожмётся кольцо."],
    ["5","<b>Вываживай:</b> держи палец, чтобы тянуть. Отпускай, когда натяжение уходит к красному."],
    ["6","<b>Зимой</b> сначала пробури лунку, а во время ожидания подёргивай мормышку — клёв приходит быстрее. После улова сцена коротко «перезаряжается» — новый заброс не мгновенный."],
    ["7","<b>Жемчуг</b> падает за редкую рыбу и за квесты. За него в магазине берут премиум-снасти — навсегда."]
  ].map(([n,t]) => '<div class="step"><div class="n">'+n+'</div><p>'+t+'</p></div>').join("")
}

/* ---------------- стартовый экран ---------------- */
const START = { on:false, cv:null, ctx:null, t:0, fishes:[], drops:[], clouds:[], ready:false, st:0 };
function initStart(){
  START.cv = $("startCv");
  if (!START.cv) return;
  START.ctx = START.cv.getContext("2d");
  // стайка рыб, силуэты которых плавают на фоне
  const keys = ["karas_zolotoy","okun","lesh","shchuka","karp","forel","taimen","sudak","som","salmon","tuna","cod","beluga","mako"];
  START.fishes = [];
  for (let i = 0; i < 6; i++){
    START.fishes.push({
      key: keys[(Math.random()*keys.length)|0],
      x: Math.random(), y: 0.54 + Math.random()*0.26,
      s: 0.34 + Math.random()*0.30, sp: 0.010 + Math.random()*0.014,
      dir: Math.random() < 0.5 ? 1 : -1, ph: Math.random()*6.28, a: 0.14 + Math.random()*0.14
    });
  }
  START.drops = [];
  for (let i = 0; i < 26; i++) START.drops.push({x:Math.random(), y:Math.random(), sp:0.05+Math.random()*0.12, r:0.6+Math.random()*1.4});
  START.clouds = [];
  for (let i = 0; i < 5; i++) START.clouds.push({x:Math.random(), y:0.05+Math.random()*0.2, s:0.5+Math.random()*0.9, sp:0.004+Math.random()*0.008});
  requestAnimationFrame(startFrame);
}
function startFrame(now){
  if (!START.on) return;
  const cv = START.cv, ctx = START.ctx;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = cv.clientWidth, h = cv.clientHeight;
  if (cv.width !== Math.round(w*dpr) || cv.height !== Math.round(h*dpr)){
    cv.width = Math.round(w*dpr); cv.height = Math.round(h*dpr);
  }
  START.t += 0.016;
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,w,h);

  const horizon = h*0.46;
  // настоящий арт-фон с медленным наплывом
  const bg = images.bgSurface;
  if (bg && bg.complete && bg.naturalWidth){
    const zoom = 1.06 + Math.sin(START.t*0.06)*0.02;
    const ir = bg.naturalWidth/bg.naturalHeight, cr = w/h;
    let dw, dh;
    if (cr > ir){ dw = w*zoom; dh = dw/ir; } else { dh = h*zoom; dw = dh*ir; }
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.drawImage(bg, (w-dw)/2 + Math.sin(START.t*0.05)*w*0.012, (h-dh)/2 - h*0.01, dw, dh);
    ctx.restore();
  } else {
    const sky = ctx.createLinearGradient(0,0,0,horizon);
    sky.addColorStop(0, "#0a2230");
    sky.addColorStop(0.45, "#2a4a58");
    sky.addColorStop(0.78, "#a06a58");
    sky.addColorStop(1, "#f2b076");
    ctx.fillStyle = sky; ctx.fillRect(0,0,w,horizon);
  }

  // солнце у горизонта
  const sunX = w*0.66, sunY = horizon - h*0.055;
  const glow = ctx.createRadialGradient(sunX,sunY,2,sunX,sunY,h*0.42);
  glow.addColorStop(0,"rgba(255,236,180,.95)");
  glow.addColorStop(0.18,"rgba(255,190,110,.42)");
  glow.addColorStop(1,"rgba(255,150,80,0)");
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(sunX,sunY,h*0.42,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(sunX,sunY,h*0.036,0,Math.PI*2);
  ctx.fillStyle = "rgba(255,248,220,.96)"; ctx.fill();

  // облака-полосы
  for (const c of START.clouds){
    c.x += c.sp*0.016;
    if (c.x > 1.25) c.x = -0.3;
    const cw = w*0.34*c.s, ch = h*0.028*c.s;
    ctx.beginPath();
    ctx.ellipse(c.x*w, c.y*h, cw, ch, 0, 0, Math.PI*2);
    ctx.fillStyle = "rgba(255,220,190,"+(0.06+0.05*Math.sin(START.t*0.6+c.x*9))+")";
    ctx.fill();
  }

  // лёгкая дымка у горизонта
  const haze = ctx.createLinearGradient(0, horizon-h*0.06, 0, horizon+h*0.05);
  haze.addColorStop(0,"rgba(255,214,170,0)");
  haze.addColorStop(0.5,"rgba(255,214,170,.16)");
  haze.addColorStop(1,"rgba(255,214,170,0)");
  ctx.fillStyle = haze; ctx.fillRect(0, horizon-h*0.06, w, h*0.11);

  // затемнение воды снизу — под текстом
  const water = ctx.createLinearGradient(0,horizon,0,h);
  water.addColorStop(0,"rgba(6,22,28,0)");
  water.addColorStop(0.55,"rgba(6,22,28,.35)");
  water.addColorStop(1,"rgba(4,14,18,.82)");
  ctx.fillStyle = water; ctx.fillRect(0,horizon,w,h-horizon);

  // дорожка от солнца
  ctx.save();
  for (let i=0;i<18;i++){
    const yy = horizon + (i/18)*(h-horizon)*0.9;
    const spread = (i/18)*w*0.16;
    const alpha = 0.20*(1-i/20)*(0.6+0.4*Math.sin(START.t*1.6+i*0.9));
    ctx.fillStyle = "rgba(255,214,150,"+alpha+")";
    ctx.beginPath();
    ctx.ellipse(sunX + Math.sin(START.t*0.7+i)*w*0.012, yy, w*0.05+spread, Math.max(1,h*0.0035), 0, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.restore();

  // волны (лёгкие, поверх арта)
  for (let i=0;i<2;i++){
    ctx.beginPath();
    const y0 = horizon + h*0.10 + i*h*0.14;
    for (let x=0;x<=w;x+=8){
      const yy = y0 + Math.sin(x*0.012 + START.t*(0.8+i*0.25) + i)*h*0.006;
      x === 0 ? ctx.moveTo(x,yy) : ctx.lineTo(x,yy);
    }
    ctx.strokeStyle = "rgba(210,240,255,"+(0.035+i*0.012)+")";
    ctx.lineWidth = 1.2; ctx.stroke();
  }

  // силуэты рыб
  for (const f of START.fishes){
    const img = images.fish[f.key];
    if (!img || !img.complete || !img.naturalWidth) continue;
    f.x += f.sp * 0.016 * f.dir;
    if (f.x > 1.3){ f.x = -0.3; f.dir = 1; }
    if (f.x < -0.3){ f.x = 1.3; f.dir = -1; }
    const fw = w*0.30*f.s;
    const fh = fw*img.naturalHeight/img.naturalWidth;
    const yy = f.y*h + Math.sin(START.t*1.6+f.ph)*h*0.012;
    ctx.save();
    ctx.globalAlpha = f.a;
    ctx.translate(f.x*w, yy);
    ctx.rotate(Math.sin(START.t*2.2+f.ph)*0.06);
    ctx.scale(f.dir < 0 ? -1 : 1, 1);
    ctx.filter = "brightness(0.28) saturate(0.55) blur(0.4px)";
    ctx.drawImage(img, -fw/2, -fh/2, fw, fh);
    ctx.restore();
  }

  // пузырьки
  for (const d of START.drops){
    d.y -= d.sp*0.016;
    if (d.y < horizon/h + 0.02) { d.y = 1; d.x = Math.random(); }
    ctx.beginPath();
    ctx.arc(d.x*w, d.y*h, d.r, 0, Math.PI*2);
    ctx.fillStyle = "rgba(200,240,255,"+(0.10+0.12*Math.sin(START.t*2+d.x*10))+")";
    ctx.fill();
  }

  requestAnimationFrame(startFrame);
}
function updateStartStats(){
  return;
  const lvl = levelInfo().lvl;
  const kinds = Object.keys(save.caught).length;
  const parts = [];
  if (save.total){
    parts.push('<span class="sstat gold">'+ICONS.star+' ур. '+lvl+'</span>');
    parts.push('<span class="sstat">'+ICONS.fish+kinds+'/100 видов</span>');
    parts.push('<span class="sstat">'+ICONS.coin+fmtNum(save.coins)+'</span>');
    const q = QUESTS.filter(x => questClaimable(x)).length;
    if (q) parts.push('<span class="sstat">'+ICONS.bolt+' квестов: '+q+'</span>');
  } else {
    parts.push('<span class="sstat">'+ICONS.fish+'26 приманок</span>');
    parts.push('<span class="sstat">'+ICONS.rod+'10 удочек</span>');
    parts.push('<span class="sstat gold">'+ICONS.star+'26 квестов</span>');
  }
  el.innerHTML = parts.join("");
  const sub = $("btnStartSub");
  if (sub) sub.textContent = save.total ? "ур. " + lvl + " · " + kinds + " видов в дневнике · " + save.coins + " монет" : "точка → заброс → подсечка → вываживание";
  const main = document.querySelector(".sb-main");
  if (main) main.textContent = save.total ? "Продолжить рыбалку" : "Начать рыбалку";
}
function openStart(){
  START.on = true;
  $("start").classList.add("on");
  updateStartStats();
  const lbl = $("soundStartLabel");
  if (lbl) lbl.textContent = save.mute ? "Звук выкл." : "Звук вкл.";
  if (START.cv && !START.started){ START.started = true; requestAnimationFrame(startFrame); }
}
function closeStart(){
  START.on = false;
  $("start").classList.remove("on");
  save.seen = true; persist(); audio(); resize();
}

/* ---------------- обучающие подсказки ---------------- */
const COACH = [
  {id:"c_spot", text:"Тапни по любому месту воды — можно бросать куда угодно", pos:[0.5,0.455]},
  {id:"c_bait", text:"На каждую рыбу — своя приманка. Коснись иконки приманки, чтобы сменить", pos:[0.5,0.700]},
  {id:"c_power", text:"Зажми кнопку и отпусти в зелёной зоне: сильнее — дальше бросок", pos:[0.5,0.700]},
  {id:"c_bite", text:"Поклёвка! Подсекай, пока кольцо не сжалось", pos:[0.5,0.700]},
  {id:"c_fight", text:"Держи палец — тяни. Отпускай, когда натяжение идёт к красному", pos:[0.5,0.700]}
];
let coachIdx = 0, coachTimer = 0;
function showCoach(idx){
  const el = $("coach"); if (!el) return;
  const c = COACH[idx]; if (!c){ el.innerHTML = ""; return; }
  el.innerHTML = '<div class="coach-bubble">'+c.text+'</div>';
  const b = el.querySelector(".coach-bubble");
  b.style.left = (c.pos[0]*100)+"%";
  b.style.top = (c.pos[1]*100)+"%";
  coachIdx = idx;
}
function hideCoach(){ const el = $("coach"); if (el) el.innerHTML = ""; }
function coachTip(id){
  if (save.seenCoach && save.seenCoach[id]) return;
  save.seenCoach = save.seenCoach || {};
  save.seenCoach[id] = true; persist();
  const c = COACH.find(x => x.id === id);
  if (!c) return;
  showCoach(COACH.indexOf(c));
  clearTimeout(coachTimer);
  coachTimer = setTimeout(hideCoach, 4200);
  // как только началась ловля, подсказка не нужна
  if (G.state === "fight"){ clearTimeout(coachTimer); coachTimer = setTimeout(hideCoach, 1200); }
}

/* ---------------- цикл ---------------- */
let last = performance.now();
function loop(now){
  const dt = Math.min(0.05, (now-last)/1000);
  last = now;
  // страховка: страница не должна «уезжать»
  if (window.scrollY || window.scrollX) window.scrollTo(0,0);
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

/* ---------------- старт ---------------- */
function boot(){
  resize();
  ["coinIco","coinIco2"].forEach(id => { const el = $(id); if (el) el.innerHTML = ICONS.coin; });
  ["pearlIco","pearlIco2"].forEach(id => { const el = $(id); if (el) el.innerHTML = ICONS.pearl; });
  $("btnSound").innerHTML = ICONS.sound;
  initTabs();
  updateChips();
  renderQuests();
  updateQuestDot();
  setState("idle");
  initStart();
  openStart();
  const startBtn = $("btnStart");
  if (startBtn) startBtn.addEventListener("click", closeStart);

  // клавиши стартового экрана
  window.addEventListener("keydown", e => {
    if (START.on && (e.code === "Enter" || e.code === "Space")){ e.preventDefault(); closeStart(); }
  });
  requestAnimationFrame(t => { last = t; requestAnimationFrame(loop); });
  // PWA: кнопка установки в стартовом экране + офлайн-кэш
  if (typeof bootPWA === "function") bootPWA();
}

// отладочный хук
window.__test = { save:() => save, persist, pickFish, spotPool, RODS, BAITS, gearPower,
  setEquip:(slot,id)=>{ save.equipped[slot]=id; }, questOnCatch, QUESTS, PREMIUM, PEARL_ITEMS, FISH,
  LOCATIONS, RARITY, rodDef, lineDef, hookDef, netDef, reelDef, levelInfo };
window.__dbg = () => ({
  bobX: Math.round(G.bobX), bobY: Math.round(G.bobY), drift: +(G.drift||0).toFixed(3),
  waitDur: +(G.waitDur||0).toFixed(2), free: !!(G.spot && G.spot.free),
  interest: +(G.interest||0).toFixed(2), readyIn: Math.max(0, +(((G.readyAtMs||0) - performance.now())/1000).toFixed(2)),
  state:G.state, tension:+G.tension.toFixed(3), progress:+G.progress.toFixed(3),
  hold:G.hold, pull:G.pull.active, power:+G.power.toFixed(2), acc:+G.acc.toFixed(2),
  fish:G.fish ? (G.fish.junk ? "junk" : G.fish.type) : null,
  spot:G.spot && G.spot.id, coins:save.coins, lvl:levelInfo().lvl,
  leap: G.leap ? {t:+G.leap.t.toFixed(2), x:Math.round(G.leap.x), y:Math.round(G.leap.y)} : null,
  fishImg: G.fish && images.fish[artOf(G.fish.type)] ? images.fish[artOf(G.fish.type)].complete : "none",
  junk: G.fish ? !!G.fish.junk : null
});
window.__club = () => ({ owned: premOwned(), count: premCount(), equipped: premEquipped(),
  lvl: clubLvl(), rank: clubRank().name, perks: { pearl: perk("pearl"), bite: perk("bite"),
    coin: perk("coin"), big: perk("big"), all: perk("all") },
  clubSpot: !!clubSpot(), dayReady: clubDayReady(), dayKey: save.clubDay || null,
  spots: locSpots().map(s => s.id) });
window.__pwa = () => ({ standalone: pwaIsStandalone(), platform: pwaPlatform(),
  installEvt: !!_installEvt, btn: !!_pwaBtn, sw: !!navigator.serviceWorker,
  controlled: !!(navigator.serviceWorker && navigator.serviceWorker.controller) });
window.__selectSpot = i => selectSpot(locSpots()[i]);
window.__spotById = (id) => locSpots().find(s => s.id === id) || null;
window.__fishDef = (id) => FISH[id];
window.__ui = { openStart, closeStart, renderQuests, renderBaitShelf, claimQuest, dailyNow, questClaimable, openSheet, closeAllSheets };

/* ---------------- PWA: установка на экран и офлайн-режим ---------------- */
let _installEvt = null;      // отложенное приглашение Chrome/Android
let _pwaBtn = null;          // кнопка «Установить» в стартовом экране
function pwaIsStandalone(){
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}
function pwaPlatform(){
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}
/* подсказка «как установить», если автоматического приглашения нет */
function pwaHint(){
  const plat = pwaPlatform();
  if (plat === "ios") toast("Установка на iPhone", "Поделиться (квадрат со стрелкой) → «На экран „Домой“»", 4200);
  else if (plat === "android") toast("Установка на Android", "Меню Chrome (три точки) → «Установить приложение»", 4200);
  else toast("Установка в Chrome", "Значок ⊕ справа в адресной строке → «Установить»", 4200);
}
function pwaSetupInstall(){
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    _installEvt = e;
    if (_pwaBtn) _pwaBtn.hidden = false;
  });
  window.addEventListener("appinstalled", () => {
    _installEvt = null;
    if (_pwaBtn) _pwaBtn.hidden = true;
    try { save.pwaInstalled = 1; persist(); } catch(_) {}
    toast("Установлено", "Игра теперь на экране устройства — и работает без интернета", 3200);
  });
  // кнопка в стартовом экране (показываем и там, где приглашения нет — с подсказкой)
  const wrap = document.querySelector("#start .start-head");
  if (!wrap || pwaIsStandalone()) return;
  const btn = document.createElement("button");
  btn.id = "btnInstall";
  btn.type = "button";
  btn.className = "start-mini";
  btn.textContent = "Установить приложение";
  btn.style.cssText = "width:100%;margin-top:10px;padding:12px 8px;font-size:12px;" +
    "background:rgba(10,26,32,.62);border:1px solid rgba(255,214,122,.34);" +
    "color:rgba(255,246,226,.92);border-radius:16px;" +
    "backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);cursor:pointer";
  btn.addEventListener("click", async (e) => {
    e.stopPropagation();
    if (_installEvt){
      _installEvt.prompt();
      const res = await _installEvt.userChoice.catch(()=>null);
      if (res && res.outcome === "accepted"){ _installEvt = null; btn.hidden = true; }
      else pwaHint();
    } else pwaHint();
  });
  wrap.appendChild(btn);
  _pwaBtn = btn;
  if (_installEvt) btn.hidden = false;
}
/* офлайн-кэш: сервис-воркер появится и на GitHub Pages, и на локальном сервере;
   при открытии файла с диска (file://) установка и кэш недоступны — игра и так офлайн */
async function pwaOffline(){
  if (!("serviceWorker" in navigator)) return;
  if (location.protocol !== "http:" && location.protocol !== "https:") return;
  try {
    const reg = await navigator.serviceWorker.register("sw.js", { scope: "./" });
    // когда вышло обновление — сообщаем, но не мешаем игре
    reg.addEventListener("updatefound", () => {
      const w = reg.installing;
      if (!w) return;
      w.addEventListener("statechange", () => {
        if (w.state === "installed" && navigator.serviceWorker.controller)
          toast("Обновление готово", "Перезапусти игру, чтобы применить", 2600);
      });
    });
  } catch (e) { /* офлайн-кэш не критичен для игры */ }
}
function bootPWA(){
  pwaSetupInstall();
  pwaOffline();
}

if (document.readyState === "loading") window.addEventListener("DOMContentLoaded", boot);
else setTimeout(boot, 0);
})();
