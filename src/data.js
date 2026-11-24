/* ============================================================
   ДАННЫЕ: 100 рыб, 5 водоёмов, приманки, снаряжение, погода
   ============================================================ */

const RARITY = {
  common:    {label:"обычная", color:"#9fce8f", bg:"rgba(159,206,143,.16)", val:1.0},
  uncommon:  {label:"частый",  color:"#7fc8ee", bg:"rgba(127,200,238,.16)", val:1.35},
  rare:      {label:"редкий",  color:"#b79cf7", bg:"rgba(183,156,247,.16)", val:1.9},
  epic:      {label:"трофей",  color:"#ffa268", bg:"rgba(255,162,104,.16)", val:2.8},
  legendary: {label:"легенда", color:"#ffd166", bg:"rgba(255,209,102,.18)", val:4.2},
  mythic:    {label:"миф",     color:"#ff8fd8", bg:"rgba(255,143,216,.18)", val:6.0}
};

/* ---------------- ПРИМАНКИ (у каждой рыбы — своя) ---------------- */
/* price — цена наживки, расходуется за заброс */
const BAITS = {
  // растительные
  corn:     {name:"Кукуруза",       tier:1, price:4,   desc:"Сладкие зёрна. Карповые и «белая» рыба.",            emoji:"corn"},
  bread:    {name:"Хлебный мякиш",  tier:1, price:4,   desc:"Универсальный мякиш для мирной мелочи.",             emoji:"bread"},
  pearl:    {name:"Перловка",       tier:2, price:8,   desc:"Распаренное зерно для крупной карповой.",            emoji:"pearl"},
  peas:     {name:"Горох",          tier:2, price:9,   desc:"Крупный карп, сазан и амур его обожают.",            emoji:"peas"},
  dough:    {name:"Тесто",          tier:2, price:8,   desc:"Мягкая приманка для леща и густеры.",                emoji:"dough"},
  algae:    {name:"Водоросли",      tier:3, price:14,  desc:"Главная еда белого амура и толстолобика.",           emoji:"weed"},
  // животные
  worm:     {name:"Земляной червь", tier:1, price:5,   desc:"Классика: окунь, ёрш, плотва, линь.",                emoji:"worm"},
  bloodworm:{name:"Мотыль",         tier:1, price:6,   desc:"Мелкая красная личинка: елец, уклейка, пескарь.",     emoji:"moth"},
  maggot:   {name:"Опарыш",         tier:2, price:8,   desc:"Белая личинка для плотвы, густеры и подлещика.",      emoji:"worm"},
  caddis:   {name:"Ручейник",       tier:2, price:10,  desc:"Сиговые и хариус предпочтут его любому червю.",      emoji:"worm"},
  mayfly:   {name:"Подёнка",        tier:3, price:14,  desc:"Вечерний вылет — жерех, голавль, елец.",              emoji:"fly"},
  shell:    {name:"Ракушка",        tier:3, price:16,  desc:"Палтус, камбала и зубатка ищут корм у дна.",          emoji:"shell"},
  shrimp:   {name:"Креветка",       tier:3, price:18,  desc:"Морская рыба любых размеров.",                       emoji:"shrimp"},
  // приманки-имитации
  spoon:    {name:"Блесна",         tier:2, price:18,  desc:"Щука, окунь, берш, жерех.",                           emoji:"spoon"},
  wobbler:  {name:"Воблер",         tier:3, price:26,  desc:"Цапляет щуку, басса, павлиньего окуня.",             emoji:"wobbler"},
  jig:      {name:"Джиг",           tier:3, price:30,  desc:"Донный хищник: судак, налим, змееголов.",             emoji:"jig"},
  spinner:  {name:"Вращалка",       tier:3, price:24,  desc:"Лососи, жерех, голавль на течении.",                  emoji:"spoon"},
  fly:      {name:"Мушка",          tier:2, price:14,  desc:"Нахлыстовая классика: хариус, таймень, ленок.",      emoji:"fly"},
  // живые и «мясные»
  livebait: {name:"Живец",          tier:3, price:34,  desc:"Щука, сом, таймень, бурый хищник.",                  emoji:"fish"},
  frog:     {name:"Лягушка",        tier:4, price:48,  desc:"Сом, змееголов, крупный налим.",                     emoji:"frog"},
  fishmeat: {name:"Рыбное филе",    tier:3, price:26,  desc:"Кусок рыбы для угря и осетровых.",                   emoji:"fish"},
  crab:     {name:"Крабовое мясо",  tier:4, price:56,  desc:"Акула, палтус, крупный морской окунь.",              emoji:"crab"},
  // эксклюзив
  glow:     {name:"Светлячок",      tier:4, price:70,  desc:"Ночной «светляк»: мифическая рыба тёмных водоёмов.", emoji:"glow"},
  squid:    {name:"Кальмар",        tier:4, price:64,  desc:"Тунец, марлин, меч-рыба берут только его.",          emoji:"squid"},
  octopus:  {name:"Осьминог",       tier:5, price:110, desc:"Только для акулы мако и глубин.",                     emoji:"squid"},
  blood:    {name:"Минога",         tier:4, price:52,  desc:"Угорь, налим и минога не устоят.",                    emoji:"eel"}
};

/* ---------------- РЫБА: 100 видов ----------------
   rar, wMin/wMax (граммы), val (монет/кг), aggr (рывки), stam (сопротивление),
   xp, power (требуемая прочность снасти), bait (единственная приманка),
   sea — только с морской снастью, lvl — минимальный уровень для поклёвки
------------------------------------------------ */
const FISH = {
/* ---------- пресноводные мирные ---------- */
karas_g:  {name:"Карась золотой",     rar:"common",    wMin:120,  wMax:1400,   val:34,  aggr:0.24, stam:0.44, xp:9,   reqPower:40,  bait:"bread",   note:"Золотистый, неторопливый. Классика пруда."},
karas_s:  {name:"Карась серебряный",  rar:"common",    wMin:100,  wMax:1600,   val:32,  aggr:0.28, stam:0.46, xp:9,   reqPower:44,  bait:"corn",    note:"Серебристый брат золотого, покрупнее и шустрее."},
karp:     {name:"Карп обыкновенный",  rar:"rare",      wMin:900,  wMax:9000,   val:90,  aggr:0.50, stam:0.88, xp:36,  reqPower:150, bait:"peas",    note:"Сазан. Сильный, осторожный, ходит по глубине."},
karp_z:   {name:"Карп зеркальный",    rar:"rare",      wMin:1100, wMax:11000,  val:108, aggr:0.52, stam:0.92, xp:40,  reqPower:165, bait:"pearl",   note:"Редкая чешуя в крупных «зеркалах». Тяжёлый боец."},
karp_g:   {name:"Карп голый",         rar:"epic",      wMin:1300, wMax:13000,  val:126, aggr:0.54, stam:0.95, xp:48,  reqPower:185, bait:"dough",   note:"Совсем без чешуи — редкость даже для карпятников."},
lesh:     {name:"Лещ",                rar:"rare",      wMin:400,  wMax:3800,   val:76,  aggr:0.38, stam:0.72, xp:24,  reqPower:108, bait:"dough",   note:"Широкий, тяжёлый, упирается до последнего."},
gustera:  {name:"Густера",            rar:"common",    wMin:120,  wMax:900,    val:40,  aggr:0.34, stam:0.42, xp:12,  reqPower:52,  bait:"maggot",  note:"Стайная, берёт часто, но некрупная."},
plotva:   {name:"Плотва",             rar:"common",    wMin:60,   wMax:800,    val:38,  aggr:0.30, stam:0.36, xp:8,   reqPower:28,  bait:"maggot",  note:"Небольшая, но клюёт почти всегда."},
krasnop:  {name:"Краснопёрка",        rar:"uncommon",  wMin:150,  wMax:1200,   val:52,  aggr:0.36, stam:0.46, xp:14,  reqPower:58,  bait:"bread",   note:"Красные плавники, держится у поверхности в траве."},
lin:      {name:"Линь",               rar:"uncommon",  wMin:250,  wMax:2400,   val:66,  aggr:0.30, stam:0.68, xp:18,  reqPower:92,  bait:"worm",    note:"Тяжёлый и упрямый. Живёт в тине у камышей."},
yaz:      {name:"Язь",                rar:"uncommon",  wMin:400,  wMax:3400,   val:60,  aggr:0.60, stam:0.62, xp:22,  reqPower:96,  bait:"peas",    note:"Сильный речной красавец с красными плавниками."},
golavl:   {name:"Голавль",            rar:"uncommon",  wMin:300,  wMax:2800,   val:58,  aggr:0.62, stam:0.58, xp:17,  reqPower:88,  bait:"mayfly",  note:"Осторожный и сильный. Держится у перекатов."},
elec:     {name:"Елец",               rar:"common",    wMin:80,   wMax:600,    val:36,  aggr:0.42, stam:0.34, xp:9,   reqPower:30,  bait:"bloodworm",note:"Быстрый малыш холодных речек."},
peskar:   {name:"Пескарь",            rar:"common",    wMin:30,   wMax:250,    val:30,  aggr:0.30, stam:0.24, xp:6,   reqPower:20,  bait:"bloodworm",note:"Донный трудяга, клюёт на всё мелкое."},
ukleyka:  {name:"Уклейка",            rar:"common",    wMin:20,   wMax:180,    val:28,  aggr:0.55, stam:0.20, xp:6,   reqPower:18,  bait:"bloodworm",note:"Верховка-быстроход: таскает наживку с поверхности."},
podust:   {name:"Подуст",             rar:"uncommon",  wMin:150,  wMax:1100,   val:54,  aggr:0.45, stam:0.48, xp:15,  reqPower:62,  bait:"algae",   note:"Соскребает водоросли с камней."},
amur_w:   {name:"Белый амур",         rar:"epic",      wMin:2500, wMax:28000,  val:130, aggr:0.55, stam:1.00, xp:86,  reqPower:210, bait:"algae",   note:"Травяной гигант. Уходит в камыши и не отдаёт леску."},
amur_b:   {name:"Чёрный амур",        rar:"legendary", wMin:3000, wMax:32000,  val:180, aggr:0.60, stam:1.02, xp:110, reqPower:235, bait:"shell",   note:"Ест ракушки. Редкий гость наших вод."},
tolst_b:  {name:"Толстолобик белый",   rar:"rare",      wMin:2000, wMax:22000,  val:96,  aggr:0.48, stam:0.96, xp:56,  reqPower:190, bait:"algae",   note:"Фильтрует воду. Ходит под самой поверхностью."},
tolst_p:  {name:"Толстолобик пёстрый", rar:"epic",      wMin:2400, wMax:26000,  val:112, aggr:0.50, stam:0.98, xp:66,  reqPower:200, bait:"algae",   note:"Пятнистый собрат, ещё крупнее."},
chehon:   {name:"Чехонь",             rar:"uncommon",  wMin:200,  wMax:1400,   val:58,  aggr:0.58, stam:0.44, xp:18,  reqPower:64,  bait:"mayfly",  note:"Саблевидная, прыгучая. Бьёт по воде стаями."},
sinets:   {name:"Синец",              rar:"uncommon",  wMin:250,  wMax:1600,   val:48,  aggr:0.40, stam:0.52, xp:19,  reqPower:70,  bait:"maggot",  note:"Родня леща, любит глубину и плотные стаи."},
beloglaz: {name:"Белоглазка",         rar:"common",    wMin:150,  wMax:900,    val:42,  aggr:0.36, stam:0.44, xp:13,  reqPower:56,  bait:"dough",   note:"Большой глаз, берёт у дна."},
vobla:    {name:"Вобла",              rar:"uncommon",  wMin:200,  wMax:1200,   val:50,  aggr:0.42, stam:0.48, xp:16,  reqPower:60,  bait:"pearl",   note:"Каспийская легенда, жирует весной."},
taran:    {name:"Тарань",             rar:"uncommon",  wMin:250,  wMax:1500,   val:52,  aggr:0.44, stam:0.50, xp:17,  reqPower:62,  bait:"corn",    note:"Плотва-силач из Азовского бассейна."},
rybets:   {name:"Рыбец (сырть)",      rar:"rare",      wMin:300,  wMax:2200,   val:88,  aggr:0.46, stam:0.60, xp:28,  reqPower:100, bait:"bloodworm",note:"Светло-жёлтые плавники, весенний ход."},
usach:    {name:"Усач (марена)",      rar:"rare",      wMin:500,  wMax:4500,   val:92,  aggr:0.62, stam:0.74, xp:34,  reqPower:128, bait:"shell",   note:"Силач перекатов с усами на крупной морде."},
shemaya:  {name:"Шемая",              rar:"rare",      wMin:200,  wMax:1400,   val:94,  aggr:0.55, stam:0.55, xp:30,  reqPower:96,  bait:"mayfly",  note:"Быстрая стайная рыба, ловится на вылете насекомых."},
verhovka: {name:"Верховка",           rar:"common",    wMin:8,    wMax:60,     val:26,  aggr:0.60, stam:0.16, xp:5,   reqPower:14,  bait:"bread",   note:"Крошка у поверхности. Но ловля на неё — искусство."},
gorchak:  {name:"Горчак",             rar:"common",    wMin:10,   wMax:70,     val:26,  aggr:0.32, stam:0.18, xp:5,   reqPower:14,  bait:"bloodworm",note:"Мелкая рыбка с нежным вкусом. Символ амурской воды."},
vyun:     {name:"Вьюн",               rar:"uncommon",  wMin:60,   wMax:400,    val:58,  aggr:0.28, stam:0.60, xp:14,  reqPower:52,  bait:"shell",   note:"Живёт в иле, переживает пересыхание."},
shipovka: {name:"Шиповка",            rar:"common",    wMin:8,    wMax:45,     val:26,  aggr:0.30, stam:0.16, xp:5,   reqPower:12,  bait:"bloodworm",note:"Колючий малыш, живёт в песке."},
golets_whale:{name:"Голец усатый",    rar:"common",    wMin:20,   wMax:150,    val:30,  aggr:0.26, stam:0.24, xp:6,   reqPower:18,  bait:"worm",    note:"Донный голец с усами, живой индикатор чистой воды."},
rotan:    {name:"Ротан",              rar:"common",    wMin:50,   wMax:450,    val:34,  aggr:0.48, stam:0.40, xp:9,   reqPower:34,  bait:"worm",    note:"Головешка: всеядный и живучий, клюёт даже в глухозимье."},
sig:      {name:"Сиг обыкновенный",   rar:"rare",      wMin:400,  wMax:3200,   val:96,  aggr:0.40, stam:0.70, xp:32,  reqPower:112, bait:"caddis",  note:"Благородная северная рыба с белым мясом."},
pelyad:   {name:"Пелядь (сырок)",     rar:"rare",      wMin:350,  wMax:2800,   val:98,  aggr:0.38, stam:0.66, xp:32,  reqPower:108, bait:"caddis",  note:"Сибирская сыроватая диковинка из стариц и озёр."},
chir:     {name:"Чир (щокур)",        rar:"epic",      wMin:600,  wMax:5000,   val:116, aggr:0.42, stam:0.76, xp:46,  reqPower:140, bait:"caddis",  note:"Плотный, крепкий, к тому же вкусный."},
muksun:   {name:"Муксун",             rar:"legendary", wMin:800,  wMax:7000,   val:168, aggr:0.46, stam:0.82, xp:92,  reqPower:170, bait:"caddis",  note:"Деликатес Севера. Ловится в мороз на тихой воде."},
omul:     {name:"Омуль байкальский",  rar:"legendary", wMin:300,  wMax:2600,   val:176, aggr:0.44, stam:0.70, xp:88,  reqPower:150, bait:"caddis",  note:"Байкальский символ. Берёт у самого льда."},
ryapushka:{name:"Ряпушка",            rar:"uncommon",  wMin:60,   wMax:500,    val:62,  aggr:0.50, stam:0.36, xp:16,  reqPower:44,  bait:"bloodworm",note:"Стайка Северного лета, клюёт без перерыва."},
tugun:    {name:"Тугун",              rar:"rare",      wMin:40,   wMax:300,    val:120, aggr:0.52, stam:0.30, xp:34,  reqPower:40,  bait:"caddis",  note:"Крошечный, но легендарно вкусный. Ищи в холодной воде."},

/* ---------- хищные и полухищные ---------- */
shchuka:  {name:"Щука обыкновенная",  rar:"epic",      wMin:800,  wMax:7000,   val:104, aggr:0.85, stam:0.72, xp:38,  reqPower:140, bait:"wobbler", note:"Хищник. Тянет мощно — не порви леску."},
okun:     {name:"Окунь речной",       rar:"uncommon",  wMin:90,   wMax:1200,   val:54,  aggr:0.55, stam:0.50, xp:14,  reqPower:40,  bait:"spoon",   note:"Полосатый боец: дёргается резко и неровно."},
sudak:    {name:"Судак обыкновенный", rar:"epic",      wMin:700,  wMax:6000,   val:112, aggr:0.70, stam:0.80, xp:42,  reqPower:130, bait:"jig",     note:"Клыкастый ночной охотник с глубины."},
bersh:    {name:"Берш",               rar:"uncommon",  wMin:300,  wMax:1800,   val:74,  aggr:0.62, stam:0.60, xp:24,  reqPower:86,  bait:"jig",     note:"Младший брат судака с волжских глубин."},
ersh:     {name:"Ёрш обыкновенный",   rar:"common",    wMin:30,   wMax:250,    val:32,  aggr:0.40, stam:0.28, xp:5,   reqPower:18,  bait:"worm",    note:"Колючий и жадный, клюёт почти на всё."},
ershor:   {name:"Ёрш-носарь",         rar:"uncommon",  wMin:60,   wMax:400,    val:52,  aggr:0.44, stam:0.34, xp:12,  reqPower:34,  bait:"worm",    note:"Носарь-бирючок с длинным рылом, берёт крупнее сородича."},
som:      {name:"Сом обыкновенный",   rar:"legendary", wMin:3000, wMax:28000,  val:150, aggr:0.60, stam:1.02, xp:90,  reqPower:220, bait:"frog",    note:"Хозяин омута. Вываживать его — работа на минуту."},
som_amur: {name:"Сом амурский",       rar:"epic",      wMin:2000, wMax:22000,  val:122, aggr:0.58, stam:0.98, xp:70,  reqPower:200, bait:"livebait",note:"Амурский красавец, не уступает европейцу."},
nalim:    {name:"Налим",              rar:"rare",      wMin:600,  wMax:5500,   val:86,  aggr:0.45, stam:0.80, xp:28,  reqPower:98,  bait:"blood",   note:"Ночной хищник-домосед. Упирается и не идёт."},
zhereh:   {name:"Жерех",              rar:"rare",      wMin:500,  wMax:4500,   val:84,  aggr:0.78, stam:0.62, xp:26,  reqPower:96,  bait:"spinner", note:"Бьёт малька на поверхности. Рывки как выстрел."},
forel_r:  {name:"Форель ручьевая",    rar:"epic",      wMin:250,  wMax:2500,   val:124, aggr:0.80, stam:0.62, xp:44,  reqPower:112, bait:"fly",     note:"Пеструшка из холодного ручья. Прыгает и бьётся."},
forel_rd: {name:"Форель радужная",    rar:"epic",      wMin:400,  wMax:4200,   val:132, aggr:0.82, stam:0.66, xp:48,  reqPower:126, bait:"spinner", note:"Радужная полоса на боку и мощные свечи над водой."},
forel_l:  {name:"Форель озёрная",     rar:"legendary", wMin:800,  wMax:9000,   val:164, aggr:0.78, stam:0.82, xp:86,  reqPower:160, bait:"fly",     note:"Кумжа. Ходит по глубине, берёт на дорожку."},
harius_e: {name:"Хариус европейский", rar:"rare",      wMin:250,  wMax:1800,   val:96,  aggr:0.72, stam:0.56, xp:32,  reqPower:98,  bait:"fly",     note:"Высокий парус-плавник, любит струю."},
harius_s: {name:"Хариус сибирский",   rar:"rare",      wMin:350,  wMax:2400,   val:104, aggr:0.74, stam:0.60, xp:36,  reqPower:110, bait:"caddis",  note:"Сибирский парусник, пахнет свежим огурцом."},
taimen:   {name:"Таймень обыкновенный",rar:"legendary",wMin:3000, wMax:35000,  val:180, aggr:0.80, stam:1.05, xp:112, reqPower:215, bait:"livebait",note:"Хозяин реки. Тянет так, что трещат удилища."},
lenok:    {name:"Ленок",              rar:"epic",      wMin:1200, wMax:12000,  val:132, aggr:0.74, stam:0.86, xp:62,  reqPower:172, bait:"fly",     note:"Сибирский лосось, родня тайменя."},
golec_ar: {name:"Голец арктический",  rar:"epic",      wMin:800,  wMax:8000,   val:128, aggr:0.70, stam:0.84, xp:58,  reqPower:165, bait:"shrimp",  note:"Холодолюбивый боец, ловится в северных реках."},
paliya:   {name:"Палия",              rar:"rare",      wMin:500,  wMax:5000,   val:118, aggr:0.60, stam:0.78, xp:44,  reqPower:140, bait:"caddis",  note:"Краснобрюхая озёрная рыба глубин."},
nelma:    {name:"Нельма",             rar:"legendary", wMin:2000, wMax:18000,  val:190, aggr:0.68, stam:0.96, xp:104, reqPower:205, bait:"livebait",note:"Белая хвастливая родня нельмы — большая редкость."},
zmeegolov:{name:"Змееголов",          rar:"epic",      wMin:700,  wMax:6000,   val:118, aggr:0.76, stam:0.80, xp:56,  reqPower:152, bait:"frog",    note:"Живёт в болотах, ползает по траве. Злющий."},
bass:     {name:"Басс большеротый",   rar:"epic",      wMin:500,  wMax:6000,   val:130, aggr:0.80, stam:0.74, xp:52,  reqPower:140, bait:"wobbler", note:"Американский боец, выпрыгивает и трясёт головой."},
peacock:  {name:"Павлиний окунь",     rar:"legendary", wMin:900,  wMax:9000,   val:178, aggr:0.86, stam:0.84, xp:98,  reqPower:168, bait:"wobbler", note:"Тропический красавец с павлиньими глазами на хвосте."},

/* ---------- проходные и осетровые ---------- */
oster_r:  {name:"Осётр русский",      rar:"legendary", wMin:2000, wMax:25000,  val:196, aggr:0.56, stam:1.02, xp:110, reqPower:230, bait:"fishmeat",note:"Костяные жучки и сила древней рыбы."},
oster_s:  {name:"Осётр сибирский",    rar:"epic",      wMin:1500, wMax:20000,  val:172, aggr:0.54, stam:1.00, xp:92,  reqPower:215, bait:"fishmeat",note:"Сибирский брат с мощным хвостом."},
sterlyad: {name:"Стерлядь",           rar:"epic",      wMin:400,  wMax:6000,   val:150, aggr:0.55, stam:0.88, xp:52,  reqPower:150, bait:"fishmeat",note:"Самая мелкая и самая изящная из осетровых."},
sevryuga: {name:"Севрюга",            rar:"legendary", wMin:3000, wMax:30000,  val:204, aggr:0.58, stam:1.04, xp:118, reqPower:245, bait:"fishmeat",note:"Длинный нос и зернистая икра. Трофей мечты."},
beluga:   {name:"Белуга",             rar:"mythic",    wMin:8000, wMax:60000,  val:250, aggr:0.65, stam:1.12, xp:170, reqPower:320, bait:"fishmeat",note:"Царь-рыба. На простую снасть её не поднять."},
ship:     {name:"Шип",                rar:"legendary", wMin:4000, wMax:35000,  val:198, aggr:0.60, stam:1.06, xp:120, reqPower:260, bait:"fishmeat",note:"Гибрид белуги и стерляди. Встречается редко."},
kaluga:   {name:"Калуга",             rar:"mythic",    wMin:9000, wMax:70000,  val:262, aggr:0.68, stam:1.15, xp:200, reqPower:340, bait:"fishmeat",note:"Амурский исполин. Поднимается только морской снастью."},
losos:    {name:"Лосось атлантический",rar:"legendary",wMin:2000, wMax:22000, val:210, aggr:0.76, stam:0.96, xp:114, reqPower:200, bait:"livebait",note:"Сёмга. Идёт из моря в реку, чтобы метать икру."},
gorbusha: {name:"Горбуша",            rar:"rare",      wMin:800,  wMax:5000,   val:128, aggr:0.74, stam:0.74, xp:46,  reqPower:130, bait:"spinner", note:"Массовый ход. Самцы в брачном наряде."},
keta:     {name:"Кета",               rar:"epic",      wMin:2000, wMax:12000,  val:146, aggr:0.76, stam:0.88, xp:64,  reqPower:168, bait:"spinner", note:"Серебристая лососевая с тёмными полосами."},
nerka:    {name:"Нерка",              rar:"legendary", wMin:1500, wMax:9000,   val:214, aggr:0.78, stam:0.90, xp:108, reqPower:182, bait:"fly",     note:"Красная, самая яркая из лососей."},
kizhuch:  {name:"Кижуч",              rar:"epic",      wMin:1800, wMax:10000,  val:152, aggr:0.80, stam:0.86, xp:66,  reqPower:172, bait:"jig",     note:"Серебряный лосось, любит воблеры и джиг."},
chavycha: {name:"Чавыча",             rar:"mythic",    wMin:4000, wMax:28000,  val:268, aggr:0.82, stam:1.06, xp:150, reqPower:240, bait:"squid",   note:"Королевский лосось. Самый сильный из всех."},
ugor:     {name:"Угорь речной",       rar:"rare",      wMin:600,  wMax:4600,   val:128, aggr:0.55, stam:0.90, xp:30,  reqPower:108, bait:"blood",   note:"Скользкий и упрямый: тянет в укрытие ровно и сильно."},
minoga:   {name:"Минога речная",      rar:"uncommon",  wMin:60,   wMax:400,    val:88,  aggr:0.40, stam:0.44, xp:16,  reqPower:36,  bait:"blood",   note:"Не рыба, а древность. Сосёт кровь и держится камней."},

/* ---------- морские ---------- */
cod:      {name:"Треска атлантическая",rar:"common",   wMin:800,  wMax:9000,   val:56,  aggr:0.46, stam:0.66, xp:18,  reqPower:88,  bait:"shrimp",  sea:1, note:"Северный трудяга, клюёт на всё донное."},
haddock:  {name:"Пикша",              rar:"common",    wMin:600,  wMax:6000,   val:54,  aggr:0.44, stam:0.62, xp:16,  reqPower:80,  bait:"shell",   sea:1, note:"Тёмная полоса на боку и три спинных плавника."},
saida:    {name:"Сайда",              rar:"uncommon",  wMin:1000, wMax:8000,   val:62,  aggr:0.52, stam:0.70, xp:22,  reqPower:96,  bait:"jig",     sea:1, note:"Быстрый хищник холодных вод."},
pollock:  {name:"Минтай",             rar:"common",    wMin:500,  wMax:5000,   val:48,  aggr:0.44, stam:0.60, xp:15,  reqPower:74,  bait:"shrimp",  sea:1, note:"Массовая рыба северных морей."},
navaga:   {name:"Навага",             rar:"common",    wMin:150,  wMax:900,    val:52,  aggr:0.46, stam:0.42, xp:12,  reqPower:44,  bait:"shell",   sea:1, note:"Мелкая полярная тресочка, ловится зимой."},
kambala:  {name:"Камбала морская",    rar:"uncommon",  wMin:400,  wMax:4000,   val:64,  aggr:0.38, stam:0.58, xp:20,  reqPower:80,  bait:"shell",   sea:1, note:"Лежит на дне, два глаза на одном боку."},
paltus:   {name:"Палтус белокорый",   rar:"epic",      wMin:5000, wMax:60000,  val:148, aggr:0.62, stam:1.10, xp:120, reqPower:285, bait:"crab",    sea:1, note:"Королевская камбала. Тянет как автомобиль."},
skumbria: {name:"Скумбрия атлантическая",rar:"common", wMin:300,  wMax:1600,   val:56,  aggr:0.64, stam:0.40, xp:14,  reqPower:40,  bait:"bloodworm",sea:1,note:"Полосатая быстрючка, хватает на лету."},
stavrida: {name:"Ставрида",           rar:"common",    wMin:150,  wMax:800,    val:54,  aggr:0.58, stam:0.36, xp:12,  reqPower:32,  bait:"shrimp",  sea:1, note:"Серебристая стайная рыба, клюёт на креветку."},
seld:     {name:"Сельдь атлантическая",rar:"common",   wMin:200,  wMax:1200,   val:52,  aggr:0.50, stam:0.38, xp:13,  reqPower:34,  bait:"bloodworm",sea:1,note:"Классика Севера, ловится стаями."},
kefal:    {name:"Кефаль (лобан)",     rar:"uncommon",  wMin:800,  wMax:6000,   val:70,  aggr:0.55, stam:0.70, xp:26,  reqPower:92,  bait:"algae",   sea:1, note:"Прыгает через сетки, сильный и хитрый."},
barabulka:{name:"Барабулька",          rar:"uncommon",  wMin:80,   wMax:600,    val:78,  aggr:0.50, stam:0.40, xp:18,  reqPower:38,  bait:"shrimp",  sea:1, note:"Султанка. Розовая, нежная, с золотыми полосами."},
sea_perch:{name:"Морской окунь",      rar:"rare",      wMin:1000, wMax:9000,   val:98,  aggr:0.58, stam:0.82, xp:44,  reqPower:132, bait:"jig",     sea:1, note:"Клювач: живёт до ста лет и клюёт на джиг."},
zubatka:  {name:"Зубатка полосатая",  rar:"rare",      wMin:1500, wMax:12000,  val:104, aggr:0.62, stam:0.86, xp:48,  reqPower:150, bait:"crab",    sea:1, note:"Волчьи зубы и мощное тело. Осторожно с пальцами."},
angler:   {name:"Морской чёрт",       rar:"legendary", wMin:2000, wMax:18000,  val:186, aggr:0.60, stam:0.94, xp:104, reqPower:190, bait:"glow",    sea:1, note:"Удильщик из глубин со светящейся приманкой."},
tuna:     {name:"Тунец синепёрый",    rar:"epic",      wMin:8000, wMax:70000,  val:160, aggr:0.86, stam:1.14, xp:140, reqPower:300, bait:"squid",   sea:1, note:"Торпеда океана. Тянет напролом."},
marlin:   {name:"Марлин голубой",     rar:"mythic",    wMin:20000,wMax:180000, val:290, aggr:0.90, stam:1.20, xp:230, reqPower:360, bait:"squid",   sea:1, note:"Копьё на носу и прыжки в несколько метров."},
swordfish:{name:"Рыба-меч",           rar:"mythic",    wMin:15000,wMax:150000, val:286, aggr:0.88, stam:1.18, xp:220, reqPower:350, bait:"squid",   sea:1, note:"Меч длиной в треть тела. Режет воду как нож."},
dorado:   {name:"Дорадо (корифена)",  rar:"epic",      wMin:2000, wMax:20000,  val:154, aggr:0.82, stam:0.92, xp:96,  reqPower:200, bait:"octopus",sea:1, note:"Золото-зелёная, выпрыгивает и светится на солнце."},
barracuda:{name:"Барракуда большая",  rar:"epic",      wMin:3000, wMax:25000,  val:158, aggr:0.84, stam:0.96, xp:100, reqPower:220, bait:"fishmeat",sea:1, note:"Серебряная стрела с зубами. Быстрая и злая."},
mako:     {name:"Акула мако",         rar:"mythic",    wMin:20000,wMax:200000, val:310, aggr:0.95, stam:1.25, xp:260, reqPower:390, bait:"octopus", sea:1, note:"Самая быстрая акула. Вываживание — испытание."}
};


/* какой спрайт использовать для каждой рыбы */
const FISH_SPRITE = {"karas_g": "karas_zolotoy", "karas_s": "karas", "karp": "karp", "karp_z": "karp", "karp_g": "karp", "lesh": "lesh", "gustera": "lesh", "plotva": "plotva", "krasnop": "plotva", "lin": "lin", "yaz": "yaz", "golavl": "golavl", "elec": "plotva", "peskar": "plotva", "ukleyka": "plotva", "podust": "golavl", "amur_w": "karp", "amur_b": "karp", "tolst_b": "karp", "tolst_p": "karp", "chehon": "zhereh", "sinets": "lesh", "beloglaz": "lesh", "vobla": "plotva", "taran": "plotva", "rybets": "golavl", "usach": "golavl", "shemaya": "zhereh", "verhovka": "plotva", "gorchak": "plotva", "vyun": "ugor", "shipovka": "plotva", "golets_whale": "ugor", "rotan": "ersh", "sig": "salmon", "pelyad": "salmon", "chir": "salmon", "muksun": "salmon", "omul": "salmon", "ryapushka": "salmon", "tugun": "salmon", "shchuka": "shchuka", "okun": "okun", "sudak": "sudak", "bersh": "sudak", "ersh": "ersh", "ershor": "ersh", "som": "som", "som_amur": "som", "nalim": "nalim", "zhereh": "zhereh", "forel_r": "forel", "forel_rd": "forel", "forel_l": "forel", "harius_e": "harius", "harius_s": "harius", "taimen": "taimen", "lenok": "taimen", "golec_ar": "salmon", "paliya": "salmon", "nelma": "salmon", "zmeegolov": "ugor", "bass": "pike_perch", "peacock": "pike_perch", "oster_r": "sterlyad", "oster_s": "sterlyad", "sterlyad": "sterlyad", "sevryuga": "sterlyad", "beluga": "beluga", "ship": "beluga", "kaluga": "beluga", "losos": "salmon", "gorbusha": "salmon", "keta": "salmon", "nerka": "salmon", "kizhuch": "salmon", "chavycha": "salmon", "ugor": "ugor", "minoga": "ugor", "cod": "cod", "haddock": "cod", "saida": "cod", "pollock": "cod", "navaga": "cod", "kambala": "flounder", "paltus": "flounder", "skumbria": "mackerel", "stavrida": "mackerel", "seld": "mackerel", "kefal": "mackerel", "barabulka": "mackerel", "sea_perch": "pike_perch", "zubatka": "cod", "angler": "anglerfish", "tuna": "tuna", "marlin": "tuna", "swordfish": "tuna", "dorado": "tuna", "barracuda": "tuna", "mako": "shark"};

const JUNK = [
  {name:"Старый сапог",  art:"boot",  note:"Кто-то тут уже рыбачил. Неудачно."},
  {name:"Пучок тины",    art:"weed",  note:"Зелёное, мокрое, бесполезное."},
  {name:"Ржавая банка",  art:"can",   note:"Мусор. Убери за собой, рыбак."},
  {name:"Коряга",        art:"log",   note:"Держалась достойно, надо признать."}
];

/* ---------------- ВОДОЁМЫ ---------------- */
const LOCATIONS = {
  lake: {
    name:"Тихая заводь", short:"Заводь", sub:"Лесное озеро на рассвете", bg:"bgSurface",
    unlock:1, biteMul:1.0, pullMul:1.0, sizeMul:1.0,
    desc:"Спокойная вода, много травы. Мирная рыба и первый хищник.",
    spots:[
      {id:"reeds", name:"Камыши", x:0.17, y:0.487, sweet:[0.22,0.44], depth:"мелко",
       w:{karas_g:14, karas_s:11, plotva:10, krasnop:7, verhovka:5, gorchak:4, rotan:5, lin:4, gustera:3, vyun:2, ershor:2, shchuka:2, taran:2, bass:1}},
      {id:"open", name:"Открытая вода", x:0.49, y:0.527, sweet:[0.45,0.68], depth:"средне",
       w:{lesh:9, gustera:8, plotva:7, karas_s:7, beloglaz:5, sinets:4, okun:6, zhereh:4, karp:4, tolst_b:2, chehon:3, ukleyka:5, vobla:2, tolst_p:2}},
      {id:"deep", name:"Глубина", x:0.80, y:0.573, sweet:[0.70,0.95], depth:"глубоко",
       w:{karp:9, karp_z:4, lesh:6, shchuka:7, sudak:3, nalim:4, som:3, tolst_b:3, amur_w:2, sterlyad:2, ugor:3, bersh:2, amur_b:1, ersh:2}}
    ]
  },
  river: {
    name:"Горная река", short:"Река", sub:"Быстрая вода и перекаты", bg:"bgRiver",
    unlock:3, biteMul:0.9, pullMul:1.18, sizeMul:0.95,
    desc:"Течение, камни и холодная вода. Лососи, хариус и силачи-усачи.",
    spots:[
      {id:"riffle", name:"Перекат", x:0.30, y:0.500, sweet:[0.25,0.48], depth:"мелко",
       w:{golavl:9, elec:8, peskar:6, ukleyka:6, harius_e:6, forel_r:5, zhereh:4, podust:4, shemaya:3, minoga:3, shipovka:3, rybets:2, golets_whale:2}},
      {id:"pool", name:"Затишок", x:0.56, y:0.575, sweet:[0.48,0.70], depth:"средне",
       w:{harius_e:6, forel_r:5, forel_rd:5, yaz:5, golavl:4, shchuka:4, zhereh:3, usach:3, chehon:4, ryapushka:3, bass:2, peacock:1}},
      {id:"rapid", name:"Порог", x:0.745, y:0.630, sweet:[0.72,0.96], depth:"глубоко",
       w:{taimen:5, lenok:5, harius_s:5, forel_rd:4, forel_l:3, usach:4, nelma:3, gorbusha:3, keta:3, golec_ar:2, losos:2, nerka:2, chavycha:1}}
    ]
  },
  night: {
    name:"Ночное озеро", short:"Ночное", sub:"Луна, туман и крупный зверь", bg:"bgNight",
    unlock:5, biteMul:0.78, pullMul:1.10, sizeMul:1.25,
    desc:"Поклёвки редкие, но рыба трофейная. Налим, угорь, сом и осетровые.",
    spots:[
      {id:"mist", name:"Туман", x:0.44, y:0.455, sweet:[0.24,0.46], depth:"мелко",
       w:{lin:8, nalim:7, karas_g:6, karas_s:5, vyun:4, rotan:4, ugor:4, karp:3, lesh:3, ershor:3, minoga:3}},
      {id:"moon", name:"Лунная дорожка", x:0.605, y:0.515, sweet:[0.46,0.70], depth:"средне",
       w:{sudak:7, bersh:5, nalim:5, shchuka:5, ugor:4, taimen:2, zhereh:3, som_amur:3, kizhuch:2, keta:2}},
      {id:"abyss", name:"Омут", x:0.845, y:0.585, sweet:[0.72,0.96], depth:"глубоко",
       w:{som:6, beluga:3, sterlyad:4, oster_r:3, oster_s:3, sevryuga:2, ship:2, karp_z:3, karp_g:3, som_amur:3, zmeegolov:3, kaluga:1}}
    ]
  },
  winter: {
    name:"Ледяное озеро", short:"Лёд", sub:"Мороз, лунки и сиговые", bg:"bgIce",
    unlock:8, biteMul:0.82, pullMul:1.02, sizeMul:1.15,
    desc:"Зимняя рыбалка: клёв редкий, но сиговые идут крупные.",
    spots:[
      {id:"hole", name:"Лунка у берега", x:0.20, y:0.610, sweet:[0.22,0.46], depth:"мелко",
       w:{plotva:7, okun:7, rotan:6, ershor:5, ryapushka:5, peskar:4, karas_s:3, tugun:3, ersh:3}},
      {id:"slope", name:"Свал в глубину", x:0.50, y:0.680, sweet:[0.45,0.70], depth:"средне",
       w:{sig:7, pelyad:6, chir:5, omul:4, muksun:3, tugun:4, paliya:4, nalim:4, sudak:3}},
      {id:"pit", name:"Яма", x:0.80, y:0.780, sweet:[0.72,0.96], depth:"глубоко",
       w:{nalim:6, paliya:5, chir:4, omul:4, oster_s:3, sig:4, som:2, beluga:1, lenok:5, karas_g:2}}
    ]
  },
  sea: {
    name:"Открытое море", short:"Море", sub:"Солёная вода и крупная рыба", bg:"bgOcean",
    unlock:12, biteMul:0.9, pullMul:1.25, sizeMul:1.2, seaReq:1,
    desc:"Только с морской снастью. Треска, палтус, тунец и акула.",
    spots:[
      {id:"shelf", name:"Мелководье", x:0.22, y:0.545, sweet:[0.25,0.48], depth:"мелко",
       w:{navaga:6, stavrida:6, seld:6, skumbria:5, kambala:5, kefal:4, barabulka:5, pollock:4}},
      {id:"banks", name:"Банки", x:0.50, y:0.590, sweet:[0.46,0.70], depth:"средне",
       w:{cod:7, haddock:6, saida:5, pollock:4, sea_perch:4, zubatka:4, kambala:3, skumbria:3}},
      {id:"deepsea", name:"Глубина", x:0.80, y:0.625, sweet:[0.72,0.96], depth:"глубоко",
       w:{paltus:5, tuna:4, marlin:2, swordfish:2, mako:2, dorado:3, barracuda:4, angler:3, zubatka:3, chavycha:1}}
    ]
  }
};

/* ---------------- СНАРЯЖЕНИЕ ---------------- */
const RODS = {
  bamboo:   {name:"Бамбуковая",        tier:1, lvl:0,  price:0,      reqPower:25, power:70,  distMul:1.00, crit:0.05, sea:0,
             desc:"Дедовская. Крупняк её просто ломает."},
  fiber:    {name:"Стекловолокно",     tier:2, lvl:1,  price:520,    reqPower:70, power:115, distMul:1.05, crit:0.07, sea:0, desc:"Дешёвая рабочая лошадка."},
  carbon:   {name:"Карбон",            tier:3, lvl:3,  price:1900,   reqPower:115, power:160, distMul:1.12, crit:0.09, sea:0, desc:"Лёгкая, чует поклёвку раньше."},
  predator: {name:"Спиннинг «Хищник»", tier:4, lvl:5,  price:4800,   reqPower:150, power:195, distMul:1.10, crit:0.13, sea:0, desc:"+22% к шансу хищной рыбы."},
  titan:    {name:"Титан",             tier:5, lvl:8,  price:12000,  reqPower:190, power:235, distMul:1.20, crit:0.16, sea:0, desc:"Поднимает сома с омута."},
  kevlar:   {name:"Кевлар «Медведь»",  tier:6, lvl:11, price:26000,  reqPower:240, power:285, distMul:1.24, crit:0.19, sea:0, desc:"Трофейная снасть для ночного озера."},
  tsar:     {name:"«Царь-рыба»",       tier:7, lvl:15, price:54000,  reqPower:285, power:330, distMul:1.30, crit:0.22, sea:0, desc:"Собрана под белугу. Держит даже её."},
  sea:      {name:"Морской троллинг",  tier:8, lvl:18, price:78000,  reqPower:320, power:365, distMul:1.34, crit:0.24, sea:1, desc:"Первый шаг в солёную воду: треска и палтус."},
  ocean:    {name:"Океанский хэви",    tier:9, lvl:22, price:120000, reqPower:355, power:400, distMul:1.38, crit:0.26, sea:1, desc:"Для тунца, меч-рыбы и марлина."},
  moonrod:  {name:"Лунный посох",      tier:10,lvl:26, price:240000, reqPower:400, power:460, distMul:1.44, crit:0.30, sea:1, desc:"Легендарная снасть. С ней ловят то, чего нет."}
};

/* ---- ПРЕМИУМ: покупка за жемчуг (pearl). Отдельные полки в магазине ---- */
const PREMIUM = {
  premRod: {name:"«Лунный шёлк»",  kind:"rod",  pearl:6,  tier:11, lvl:10, price:0, reqPower:380, power:440, distMul:1.48, crit:0.34, sea:1,
    desc:"Премиум-удочка: ловит рыбу силой до 380 и в море, и на льду."},
  premLine:{name:"«Шёлковая нить»",kind:"line", pearl:5,  tier:11, lvl:8,  price:0, power:400, hi:0.965, decay:0.76,
    desc:"Почти не рвётся: зелёная зона шире, чем у любой обычной лески."},
  premHook:{name:"«Золотой крючок»",kind:"hook",pearl:4,  tier:11, lvl:6,  price:0, windowMul:1.40, hookChance:0.34, escape:0.68,
    desc:"Окно подсечки +40%, сходов почти нет."},
  premNet: {name:"«Хрустальный подсак»",kind:"net",pearl:4,tier:11, lvl:6,  price:0, netSlack:2.9, progress:1.18,
    desc:"Любой трофей входит в него сам."},
  premReel:{name:"«Механика»",     kind:"reel", pearl:3,  tier:11, lvl:5,  price:0, speed:1.62, gain:0.74,
    desc:"Скорость подмотки ×1.62 и мягкий фрикцион."}
};
const PEARL_ITEMS = Object.keys(PREMIUM);

const REELS = {
  simple: {name:"Простая",     tier:1, lvl:0,  price:0,     speed:1.00, gain:1.00, desc:"Скрипит, но крутится."},
  fast:   {name:"Быстрая",     tier:2, lvl:1,  price:620,   speed:1.18, gain:0.95, desc:"Подматывает шустро."},
  power:  {name:"Силовая",     tier:3, lvl:4,  price:2100,  speed:1.24, gain:0.84, desc:"Плавный ход, легче держать."},
  salt:   {name:"Морская",     tier:4, lvl:7,  price:5600,  speed:1.32, gain:0.88, desc:"Тянет ровно, не даёт рыбе сорваться."},
  pro:    {name:"Профи",       tier:5, lvl:10, price:8800,  speed:1.46, gain:0.80, desc:"Фрикцион работает идеально."},
  titan:  {name:"Титановая",   tier:6, lvl:14, price:21000, speed:1.58, gain:0.78, desc:"Для трофеев, которые не хотят на берег."},
  heavy:  {name:"Морской мульт",tier:7,lvl:18, price:46000, speed:1.66, gain:0.76, desc:"Океанский силовой мультипликатор."},
  myth:   {name:"Лунная",      tier:8, lvl:26, price:96000, speed:1.78, gain:0.72, desc:"Почти сама вываживает."}
};

const LINES = {
  thin:  {name:"Леска 0.20",    tier:1, lvl:0,  price:0,     power:80,  hi:0.88, decay:1.00, desc:"Тонкая, рвётся легко."},
  norm:  {name:"Леска 0.25",    tier:2, lvl:2,  price:740,   power:130, hi:0.90, decay:0.94, desc:"Баланс прочности и чуйки."},
  braid: {name:"Плеть",         tier:3, lvl:5,  price:2600,  power:190, hi:0.93, decay:0.88, desc:"Держит трофей."},
  fluo:  {name:"Флюорокарбон",  tier:4, lvl:8,  price:6200,  power:250, hi:0.94, decay:0.84, desc:"Почти не видна рыбе и рыбаку."},
  kevlar:{name:"Кевларовая",    tier:5, lvl:12, price:14000, power:320, hi:0.95, decay:0.80, desc:"Почти не рвётся."},
  ocean: {name:"Океанский шнур",tier:6, lvl:18, price:38000, power:380, hi:0.96, decay:0.78, desc:"Выдерживает акулу на свече."},
  myth:  {name:"Лунная нить",   tier:8, lvl:26, price:92000, power:460, hi:0.97, decay:0.74, desc:"Тоньше волоса, крепче троса."}
};

const NETS = {
  none:   {name:"Без подсака",       tier:1, lvl:0,  price:0,     netSlack:1.00, progress:1.00, desc:"Рыба уходит с крючка на слабине."},
  small:  {name:"Подсак малый",      tier:2, lvl:2,  price:980,   netSlack:1.55, progress:1.03, desc:"Прощает ошибки на слабине."},
  big:    {name:"Подсак большой",    tier:3, lvl:6,  price:3300,  netSlack:2.10, progress:1.06, desc:"Трофей не уйдёт у берега."},
  carbon: {name:"Карбоновый подсак", tier:4, lvl:10, price:9400,  netSlack:2.80, progress:1.12, desc:"Любимая вещь трофейщика."},
  myth:   {name:"Лунная сеть",       tier:8, lvl:26, price:42000, netSlack:3.60, progress:1.20, desc:"Рыба входит в неё сама."}
};

const HOOKS = {
  simple: {name:"Крючок №6",      tier:1, lvl:0,  price:0,    windowMul:1.00, hookChance:0.00, escape:1.00, desc:"Обычный, гнётся о трофей."},
  sharp:  {name:"Кованый",        tier:2, lvl:1,  price:460,  windowMul:1.10, hookChance:0.10, escape:0.94, desc:"Острее — подсечка легче."},
  barb:   {name:"С бородкой",     tier:3, lvl:4,  price:1500, windowMul:1.18, hookChance:0.18, escape:0.86, desc:"Рыба почти не сходит."},
  strong: {name:"Трофейный",      tier:4, lvl:8,  price:4800, windowMul:1.26, hookChance:0.26, escape:0.78, desc:"Держит клыкастого хищника."},
  sea:    {name:"Морской",        tier:5, lvl:16, price:16000,windowMul:1.30, hookChance:0.30, escape:0.74, desc:"Нержавейка для солёной воды."},
  myth:   {name:"Лунный крючок",  tier:8, lvl:26, price:36000,windowMul:1.40, hookChance:0.40, escape:0.66, desc:"Цепляет намертво."}
};

/* приманки — единственный способ поймать конкретную рыбу */
const SLOTS = [
  {id:"rod",  name:"Удочка",   table:RODS},
  {id:"reel", name:"Катушка",  table:REELS},
  {id:"line", name:"Леска",    table:LINES},
  {id:"hook", name:"Крючок",   table:HOOKS},
  {id:"bait", name:"Приманка", table:BAITS},
  {id:"net",  name:"Подсак",   table:NETS}
];

/* ---------------- ПОГОДА ---------------- */
/* ---------------- ПРЕМИУМ-ПРЕИМУЩЕСТВА ---------------- */
/* Клубный уровень растёт от всех купленных и надетых премиум-предметов:
   чем их больше, тем выше уровень и сильнее пассивные перки. */
const CLUB_RANKS = [
  {lvl:0, name:"Гость",       perks:{}},
  {lvl:1, name:"Участник",    perks:{pearl:1}},
  {lvl:2, name:"Рыбак клуба", perks:{pearl:1, bite:1, xp:1}},
  {lvl:3, name:"Мастер",      perks:{pearl:1, bite:1, coin:1, xp:1}},
  {lvl:4, name:"Трофейщик",   perks:{pearl:1, bite:1, coin:1, big:1, xp:1}},
  {lvl:5, name:"Хранитель",   perks:{pearl:1, bite:1, coin:1, big:1, all:1, xp:1}}
];
/* значения перков по уровню: жемчуг за улов, скорость поклёвки, монеты, крупная рыба, размер */
const PERK_VAL = {
  pearl: [0, 0.10, 0.15, 0.20, 0.25, 0.30],
  xp:    [0, 0.00, 0.05, 0.08, 0.10, 0.12],
  bite:  [0, 0.00, 0.06, 0.10, 0.12, 0.14],
  coin:  [0, 0.00, 0.00, 0.06, 0.10, 0.14],
  big:   [0, 0.00, 0.00, 0.00, 0.05, 0.08],
  all:   [0, 0.00, 0.00, 0.00, 0.00, 0.05]
};

/* Закрытый «клубный плёс»: четвёртая точка на каждом водоёме, видна только участникам клуба.
   Правила приманки и прочности удочки действуют и здесь — плёс лишь богаче и глубже. */
const CLUB_SPOTS = {
  lake:   {id:"prem_lake", sweet:[0.70,0.92],   name:"Клубный плёс",  x:0.62, y:0.615, depth:"глубоко",
           w:{som:10, amur_b:6, shchuka:9, sudak:7, karp:8, sterlyad:6, tolst_p:5, amur_w:5}},
  river:  {id:"prem_river", sweet:[0.74,0.95],  name:"Клубный плёс",  x:0.74, y:0.655, depth:"глубоко",
           w:{taimen:7, nelma:6, losos:6, forel_l:6, chavycha:4, peacock:5, lenok:7, golec_ar:5}},
  night:  {id:"prem_night", sweet:[0.28,0.50],  name:"Клубный плёс",  x:0.30, y:0.645, depth:"глубоко",
           w:{beluga:5, kaluga:4, sevryuga:6, oster_r:6, som_amur:7, ship:4, som:8, zmeegolov:5}},
  winter: {id:"prem_winter", sweet:[0.50,0.72], name:"Клубная лунка", x:0.30, y:0.700, depth:"глубоко",
           w:{beluga:4, muksun:8, omul:8, chir:7, oster_s:6, som:6, lenok:6}},
  sea:    {id:"prem_sea", sweet:[0.45,0.68],    name:"Клубный плёс",  x:0.46, y:0.660, depth:"глубоко",
           w:{mako:4, marlin:5, swordfish:5, tuna:7, chavycha:6, paltus:7, barracuda:6, angler:5}}
};
/* ежедневный клубный набор: раз в сутки, только участникам клуба.
   Чем выше ранг, тем щедрее набор — это ещё одно преимущество уровня. */
/* НАЖИВКА ДНЯ (новая механика 7.5): раз в сутки в каждом водоёме есть приманка,
   на которую рыба берёт заметно охотнее. Множитель клёва и бонус к опыту. */
const BAIT_DAY = {
  mul: 1.42,        // клёв на приманку дня
  xp: 0.10,         // бонус к опыту
  bonus: 0.15       // шанс двойного захода рыбы на приманку дня
};
/* ЛУЧШИЙ ДЕНЬ ВОДОЁМА (7.5): у каждого водоёма свой удачный день недели */
const LOC_DAY = {
  lake:   1,   // понедельник
  river:  3,   // среда
  night:  5,   // пятница
  winter: 6,   // суббота
  sea:    0    // воскресенье
};
const LOC_DAY_K = { klyov: 1.14, size: 1.08, coins: 1.10, pearlBonus: 0.06 };

/* клубная цель дня: одна на сутки, только в клубном плёсе (для участников клуба) */
const CLUB_GOAL = { coins:420, xp:220, pearl:2, count:3 };
const CLUB_DAY = {
  coins:260, xp:140, pearl:2, baits:{ corn:10, worm:10, bloodworm:8 },
  byLvl: [
    {coins:260, xp:140, pearl:2, mul:1.0},   // Гость (не бывает)
    {coins:260, xp:140, pearl:2, mul:1.0},   // Участник
    {coins:300, xp:165, pearl:2, mul:1.15},  // Рыбак клуба
    {coins:350, xp:190, pearl:3, mul:1.3},   // Мастер
    {coins:400, xp:215, pearl:3, mul:1.45},  // Трофейщик
    {coins:470, xp:250, pearl:4, mul:1.6}    // Хранитель
  ]
};

const WEATHER = {
  sunny:  {name:"Ясно",       icon:"sun",   bite:1.00, size:1.00, light:1.00, hint:"Тишь да гладь"},
  overcast:{name:"Облачно",    icon:"cloud", bite:1.10, size:1.03, light:0.90, hint:"Рыба активна — самое время"},
  rain:   {name:"Дождь",      icon:"rain",  bite:0.86, size:1.06, light:0.78, hint:"Дождь бьёт по воде, но крупняк выходит"},
  mist:   {name:"Туман",      icon:"fog",   bite:0.94, size:1.10, light:0.86, hint:"Ничего не видно — зато рыба рядом"},
  thunder:{name:"Гроза",      icon:"storm", bite:0.62, size:1.14, light:0.66, hint:"Гроза: осторожно, но трофеи ждут"},
  moon:   {name:"Полнолуние", icon:"moon",  bite:1.06, size:1.18, light:0.72, hint:"Мифическая рыба гуляет"},
  snow:   {name:"Снегопад",   icon:"fog",   bite:0.90, size:1.08, light:0.88, hint:"Снег валит, сиговые подходят к лунке"},
  frost:  {name:"Ясно, мороз",icon:"sun",   bite:1.04, size:1.12, light:0.94, hint:"Морозный день — лучший клёв зимой"}
};
const WEATHER_ICONS = {
  sun: '<svg viewBox="0 0 24 24" fill="none" stroke="#ffd166" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.2" fill="#ffd166"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M18.8 5.2l-1.6 1.6M6.8 17.2l-1.6 1.6"/></svg>',
  cloud: '<svg viewBox="0 0 24 24" fill="none" stroke="#cfe4ee" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 18h10a3.5 3.5 0 0 0 .4-7 5 5 0 0 0-9.6-1.3A3.6 3.6 0 0 0 7 18z"/></svg>',
  rain: '<svg viewBox="0 0 24 24" fill="none" stroke="#9ed8ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 14h10a3.5 3.5 0 0 0 .4-7 5 5 0 0 0-9.6-1.3A3.6 3.6 0 0 0 7 14z"/><path d="M9 17.5l-1 2.5M13 17.5l-1 2.5M17 17.5l-1 2.5"/></svg>',
  fog: '<svg viewBox="0 0 24 24" fill="none" stroke="#dbe8ee" stroke-width="2" stroke-linecap="round"><path d="M3 9h18M5 13h14M3 17h18"/></svg>',
  storm: '<svg viewBox="0 0 24 24" fill="none" stroke="#ffd166" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 13h10a3.5 3.5 0 0 0 .4-7 5 5 0 0 0-9.6-1.3A3.6 3.6 0 0 0 7 13z"/><path d="M12.5 14.5l-2 4h3l-1.5 3.5"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="none" stroke="#ffe9a3" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.6 6.6 0 0 0 10.5 10.5z" fill="#ffe9a3" fill-opacity=".22"/></svg>'
};

/* ---------------- SVG иконки ---------------- */
const ICONS = {
  coin: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" fill="#f7c948"/><circle cx="12" cy="12" r="9" stroke="#b8860b" stroke-width="1.6"/><path d="M12 7v10M9.5 9.2h4.2a1.9 1.9 0 0 1 0 3.8H9.5h4.4a1.9 1.9 0 0 1 0 3.8H9.5" stroke="#8a5a00" stroke-width="1.5" stroke-linecap="round"/></svg>',
  fish: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12c3-4.5 7-6 11-6 2.6 0 5 .8 6.6 2.2L18 12l2.6 3.8A11 11 0 0 1 14 18c-4 0-8-1.5-11-6z"/><circle cx="16.4" cy="10.6" r=".9" fill="currentColor" stroke="none"/></svg>',
  rod: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20L18 4"/><path d="M18 4c1.6 1.2 2.4 3 2.4 5"/><path d="M4 20c2 .4 3.4-.2 4.4-1.4"/><path d="M20.4 9c-2.2.4-4.6 2-5.4 4.4"/></svg>',
  reel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="5.5"/><path d="M12 7.5V4"/><path d="M6.6 13H3.5"/><path d="M12 18.5V21"/><path d="M17.4 13h3.1"/><circle cx="12" cy="13" r="1.6"/></svg>',
  line: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7c4 0 5 10 9 10s5-10 9-10"/><path d="M3 12c4 0 5 6 9 6s5-6 9-6" opacity=".45"/></svg>',
  hook: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4v7a5 5 0 0 1-10 0"/><path d="M5 11l-1.6 3.4"/><path d="M15 4h2.5"/></svg>',
  bait: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4c3.3 0 6 2.7 6 6 0 4-3 6-3 9 0 .6-.9 1-1.5.6-.7-.5-.5-1.6-1.5-1.6s-.9 1.1-1.6 1.6c-.6.4-1.4 0-1.4-.6 0-3-3-5-3-9 0-3.3 2.7-6 6-6z"/><path d="M9.5 10.5h.01M14.5 10.5h.01"/></svg>',
  net: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20l7-7"/><path d="M11 13c0-3.3 2.7-6 6-6s4 2.7 4 6-2.7 5-6 5-4-1.7-4-5z"/><path d="M12.4 10.4l7.2 4.4M14.2 8.6l5.6 5.2M16.6 7.8l3 6"/></svg>',
  map: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4L3 6.5v13L9 17l6 2.5 6-2.5v-13L15 6.5 9 4z"/><path d="M9 4v13M15 6.5v13"/></svg>',
  shop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h16l-1 11H5L4 9z"/><path d="M8.5 9V6.5a3.5 3.5 0 0 1 7 0V9"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M5 7h14M5 12h14M5 17h14"/><circle cx="9" cy="7" r="2.2" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="2.2" fill="currentColor" stroke="none"/><circle cx="8" cy="17" r="2.2" fill="currentColor" stroke="none"/></svg>',
  book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v18H6.5A2.5 2.5 0 0 1 4 18.5v-13z"/><path d="M4 17h16"/><path d="M9 3v14"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="4.5" y="10" width="15" height="10" rx="2.5"/><path d="M8 10V7.5a4 4 0 0 1 8 0V10"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5l5 5L20 6.5"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.6l2.7 6.1 6.6.6-5 4.5 1.5 6.5L12 16.9 6.2 20.3l1.5-6.5-5-4.5 6.6-.6z"/></svg>',
  bolt: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z"/></svg>',
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11l8-7 8 7"/><path d="M6 10v10h12V10"/></svg>',
  sound: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h3l4-4v14l-4-4H4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18 6a8.5 8.5 0 0 1 0 12"/></svg>',
  mute: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h3l4-4v14l-4-4H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>',
  warn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l9 16H3l9-16z"/><path d="M12 9v5M12 17h.01"/></svg>',
  pearl: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="13" r="7" fill="#e7dcff"/><circle cx="12" cy="13" r="7" stroke="#9d86d8" stroke-width="1.4"/><ellipse cx="9.6" cy="10.4" rx="2.4" ry="1.7" fill="#fff" opacity=".85"/></svg>',
  power: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h4l2-6 4 12 2-6h4"/></svg>'
};


/* группы для сортировки и фильтров дневника */
const FISH_CAT = {
  peace:  "karas_g karas_s karp karp_z karp_g lesh gustera plotva krasnop lin yaz golavl elec peskar ukleyka podust amur_w amur_b tolst_b tolst_p chehon sinets beloglaz vobla taran rybets usach shemaya verhovka gorchak vyun shipovka golets_whale rotan sig pelyad chir muksun omul ryapushka tugun".split(" "),
  pred:   "shchuka okun sudak bersh ersh ershor som som_amur nalim zhereh forel_r forel_rd forel_l harius_e harius_s taimen lenok golec_ar paliya nelma zmeegolov bass peacock".split(" "),
  passage:"oster_r oster_s sterlyad sevryuga beluga ship kaluga losos gorbusha keta nerka kizhuch chavycha ugor minoga".split(" "),
  sea:    "cod haddock saida pollock navaga kambala paltus skumbria stavrida seld kefal barabulka sea_perch zubatka angler tuna marlin swordfish dorado barracuda mako".split(" ")
};
const CAT_LABEL = {peace:"Мирные", pred:"Хищные", passage:"Проходные", sea:"Морские"};
const FISH_CAT_OF = {};
for (const c in FISH_CAT) for (const id of FISH_CAT[c]) FISH_CAT_OF[id] = c;


/* ---------------- КВЕСТЫ ----------------
   goal:
     catchAny {n}            — поймать n рыб
     species  []             — поймать перечисленные виды (все)
     speciesAny [] {n}       — any n из списка
     cat     "peace" {n}      — n рыб указанной группы
     loc     "sea" {n}        — n рыб в водоёме
     rarity  ["epic"] {n}     — n рыб редкости из списка
     weight  {n}             — поймать рыбу весом не меньше n грамм
     bait    "fly" {n}        — n рыб на приманку
     rod     "titan"          — надеть удочку
     noBreak {n}             — n удачных вываживаний без обрыва подряд
*/
const QUESTS = [
  /* --- пролог --- */
  /* --- 7.5: удача дня --- */
  {id:"q_daybait", chapter:"Начало", title:"Наживка дня", sub:"Поймай 3 рыбы на наживку дня",
   goal:{type:"baitDay", n:3}, reward:{coins:150, xp:80, bait:"worm", baitN:15},
   tip:"Наживку дня показывает чип в шапке и карточки водоёмов на «Базе»."},
  {id:"q_double",  chapter:"Начало", title:"Двойной заход", sub:"Поймай 2 рыбы за один заход на наживку дня",
   goal:{type:"doubleDay", n:2}, reward:{coins:190, xp:100, bait:"shell", baitN:10},
   tip:"На наживку дня рыба иногда берёт снова сразу — просто продолжай ловить."},
  {id:"q_precise", chapter:"Глубина", title:"Ювелир подсечки", sub:"3 идеальных вываживания подряд",
   goal:{type:"perfect", n:3}, reward:{coins:260, xp:150, pearl:1},
   tip:"Держи натяжение в зелёном «яблочке» — там прогресс идёт быстрее."},
  {id:"q_streak",  chapter:"Глубина", title:"Твёрдая рука", sub:"Доведи серию точных подсечек до ×1.12",
   goal:{type:"streak", n:3.5}, reward:{coins:320, xp:180, bait:"shell", baitN:12},
   tip:"Серия растёт, пока держишь в зоне «в яблочко», и тает при промахах."},
  {id:"q_first",  chapter:"Начало", title:"Первый заброс", sub:"Поймай первую рыбу",
   goal:{type:"catchAny", n:1}, reward:{coins:30, xp:15},
   tip:"Выбери точку в камышах и надень кукурузу или хлеб."},
  {id:"q_school", chapter:"Начало", title:"Не одна, а пять", sub:"Поймай 5 рыб",
   goal:{type:"catchAny", n:5}, reward:{coins:80, xp:40, bait:"corn", baitN:20},
   tip:"Мирная мелочь клюёт почти на каждом забросе."},
  {id:"q_junk",   chapter:"Начало", title:"Чистый берег", sub:"Поймай 3 рыб подряд и не оборви леску",
   goal:{type:"noBreak", n:3}, reward:{coins:60, xp:35},
   tip:"Отпускай палец, когда натяжение уходит к красному."},
  {id:"q_kinds",  chapter:"Начало", title:"Коллекционер", sub:"Поймай 8 разных видов",
   goal:{type:"speciesAny", n:8, list:null}, reward:{coins:160, xp:90, rod:"fiber"},
   tip:"Меняй приманку — на каждую берёт своя рыба."},
  {id:"q_carp",   chapter:"Начало", title:"Карасевая заводь", sub:"Золотой и серебряный карась",
   goal:{type:"species", list:["karas_g","karas_s"]}, reward:{coins:140, xp:70, bait:"bread", baitN:20},
   tip:"Хлеб — на обоих, кукуруза — на серебряного."},
  {id:"q_pred",   chapter:"Начало", title:"Зубастые", sub:"Щука и окунь",
   goal:{type:"species", list:["shchuka","okun"]}, reward:{coins:260, xp:130, rod:"predator"},
   tip:"Окунь на блесну, щука на воблер, и удочка нужной силы."},
  /* --- река --- */
  {id:"q_grayling", chapter:"Река", title:"Парус над водой", sub:"Хариус европейский и сибирский",
   goal:{type:"species", list:["harius_e","harius_s"]}, reward:{coins:420, xp:210, bait:"fly", baitN:20},
   tip:"Оба берут мушку и ручейник на Горной реке."},
  {id:"q_trout",  chapter:"Река", title:"Три форели", sub:"Поймай любых форелей: 3 штуки",
   goal:{type:"speciesAny", n:3, list:["forel_r","forel_rd","forel_l"]}, reward:{coins:520, xp:260, bait:"spinner", baitN:15},
   tip:"Ручей на мушку, радужная на вращалку."},
  {id:"q_taimen", chapter:"Река", title:"Хозяин реки", sub:"Поймай тайменя",
   goal:{type:"species", list:["taimen"]}, reward:{coins:900, xp:420, rod:"titan"},
   tip:"Таймень берёт живца, нужна удочка от «Титана»."},
  /* --- озеро и глубина --- */
  {id:"q_bream",  chapter:"Озеро", title:"Лещ в подсаке", sub:"Поймай леща и густеру",
   goal:{type:"species", list:["lesh","gustera"]}, reward:{coins:380, xp:190, bait:"dough", baitN:20},
   tip:"Тесто и опарыш на Открытой воде."},
  {id:"q_carps",  chapter:"Озеро", title:"Карповый пруд", sub:"Поймай карпа и зеркального карпа",
   goal:{type:"species", list:["karp","karp_z"]}, reward:{coins:700, xp:320, bait:"peas", baitN:20},
   tip:"Ищи на Глубине, горох и перловка."},
  {id:"q_night",  chapter:"Озеро", title:"Ночная смена", sub:"Поймай 3 рыбы ночью",
   goal:{type:"loc", loc:"night", n:3}, reward:{coins:600, xp:300, bait:"livebait", baitN:8},
   tip:"Ночью ловится то, что днём не взять."},
  {id:"q_big",    chapter:"Озеро", title:"Трофей", sub:"Поймай рыбу тяжелее 5 кг",
   goal:{type:"weight", n:5000}, reward:{coins:800, xp:360, line:"braid"},
   tip:"Сом, карп или таймень на «Царь-рыбу»."},
  /* --- зима --- */
  {id:"q_siberia",chapter:"Зима", title:"Сиговые", sub:"Сиг, пелядь и чир",
   goal:{type:"species", list:["sig","pelyad","chir"]}, reward:{coins:950, xp:420, bait:"caddis", baitN:25},
   tip:"Ледяное озеро, ручейник на крючке."},
  {id:"q_muksun", chapter:"Зима", title:"Северный деликатес", sub:"Муксун или омуль",
   goal:{type:"speciesAny", n:1, list:["muksun","omul"]}, reward:{coins:1200, xp:560, rod:"kevlar"},
   tip:"Оба редко берут — запасись терпением и ручейником."},
  /* --- хищники и глубина --- */
  {id:"q_som",    chapter:"Глубина", title:"Легенда омута", sub:"Поймай сома",
   goal:{type:"species", list:["som"]}, reward:{coins:1400, xp:650, bait:"frog", baitN:8},
   tip:"Сом выходит ночью на лягушку."},
  {id:"q_sturgeon",chapter:"Глубина", title:"Островёрхие", sub:"Осётр русский, сибирский и стерлядь",
   goal:{type:"species", list:["oster_r","oster_s","sterlyad"]}, reward:{coins:1600, xp:700, rod:"tsar"},
   tip:"Все три на рыбное филе, нужна мощная снасть."},
  {id:"q_legend", chapter:"Глубина", title:"Легенды", sub:"Поймай 5 легендарных рыб",
   goal:{type:"rarity", list:["legendary"], n:5}, reward:{coins:2000, xp:900, line:"kevlar"},
   tip:"Легенды клюют редко — держи наживку нужную."},
  /* --- море --- */
  {id:"q_sea1",   chapter:"Море", title:"Первый выход в море", sub:"Поймай 3 морских рыбы",
   goal:{type:"loc", loc:"sea", n:3}, reward:{coins:1800, xp:800, line:"ocean"},
   tip:"Понадобится морская удочка — «Морской троллинг»."},
  {id:"q_cod",    chapter:"Море", title:"Тресковые", sub:"Треска, пикша и сайда",
   goal:{type:"species", list:["cod","haddock","saida"]}, reward:{coins:2200, xp:980, bait:"shrimp", baitN:25},
   tip:"Креветка и ракушка на Банках."},
  {id:"q_halibut",chapter:"Море", title:"Белокорый", sub:"Поймай палтуса",
   goal:{type:"species", list:["paltus"]}, reward:{coins:2600, xp:1100, rod:"ocean"},
   tip:"Палтус берёт краба на морской глубине."},
  {id:"q_tuna",   chapter:"Море", title:"Торпеда", sub:"Поймай тунца",
   goal:{type:"species", list:["tuna"]}, reward:{coins:3000, xp:1300, bait:"squid", baitN:12},
   tip:"Тунец только на кальмара."},
  {id:"q_mako",   chapter:"Море", title:"Самая быстрая", sub:"Поймай акулу мако",
   goal:{type:"species", list:["mako"]}, reward:{coins:4200, xp:1800, rod:"moonrod"},
   tip:"Осьминог, глубина и океанский хэви."},
  /* --- зимняя ветка (расширение) --- */
  {id:"q_ice1",  chapter:"Зима", title:"Первая лунка", sub:"Поймай 3 рыбы на Ледяном озере",
   goal:{type:"loc", loc:"winter", n:3}, reward:{coins:800, xp:380, bait:"bloodworm", baitN:20},
   tip:"На льду работает мормышка: пошевеливай снастью, пока ждёшь."},
  {id:"q_ice2",  chapter:"Зима", title:"Мороз и окунь", sub:"10 окуней со льда",
   goal:{type:"speciesCount", list:["okun"], n:10}, reward:{coins:1100, xp:520, pearl:1},
   tip:"Окунь на льду берёт блесну и червя."},
  {id:"q_ice3",  chapter:"Зима", title:"Налимья ночь", sub:"Налим и ротан",
   goal:{type:"species", list:["nalim","rotan"]}, reward:{coins:1300, xp:600, line:"fluo"},
   tip:"Налим — на миногу, ротан — на червя."},
  {id:"q_ice4",  chapter:"Зима", title:"Сиговый ход", sub:"Пелядь, чир, муксун и омуль — все четыре",
   goal:{type:"species", list:["pelyad","chir","muksun","omul"]}, reward:{coins:2600, xp:1100, pearl:1},
   tip:"Ручейник и терпение. Сиговые идут волнами."},
  {id:"q_ice5",  chapter:"Зима", title:"Подлёдный трофей", sub:"Рыба тяжелее 3 кг со льда",
   goal:{type:"weightLoc", loc:"winter", n:3000}, reward:{coins:1800, xp:820, pearl:1},
   tip:"Щука и налим зимой бывают очень крупными."},
  /* --- путешественник --- */
  {id:"q_travel",chapter:"Озеро", title:"Пять водоёмов", sub:"Поймай по рыбе в каждом водоёме",
   goal:{type:"allLocs", n:5}, reward:{coins:2400, xp:1000, pearl:2},
   tip:"Озеро, река, ночь, лёд и море — везде по одной."},
  {id:"q_bigfive",chapter:"Глубина", title:"Большая пятёрка", sub:"Карп, щука, сом, таймень, осётр",
   goal:{type:"species", list:["karp","shchuka","som","taimen","oster_r"]}, reward:{coins:3200, xp:1400, pearl:2},
   tip:"Классические трофеи пресной воды."},
  {id:"q_rare5", chapter:"Глубина", title:"Редкая коллекция", sub:"10 рыб редкости «трофей» и выше",
   goal:{type:"rarity", list:["epic","legendary","mythic"], n:10}, reward:{coins:3600, xp:1500, pearl:2},
   tip:"Держи наживку под конкретную рыбу."},
  {id:"q_perfect",chapter:"Река", title:"Ювелир", sub:"5 идеальных вываживаний",
   goal:{type:"perfect", n:5}, reward:{coins:900, xp:420, pearl:1},
   tip:"Держи натяжение в узкой зоне 63–75% — это «идеально»."},
  {id:"q_casts",  chapter:"Начало", title:"Снайпер", sub:"20 точных забросов в зелёную зону",
   goal:{type:"acc", n:20}, reward:{coins:700, xp:340, bait:"maggot", baitN:20},
   tip:"Точность влияет и на клёв, и на монеты."},
  {id:"q_pearl",  chapter:"Море", title:"Жемчужная раковина", sub:"Поймай 2 морских трофея",
   goal:{type:"rarityLoc", loc:"sea", list:["epic","legendary","mythic"], n:2}, reward:{coins:2800, xp:1200, pearl:3},
   tip:"Тунец, палтус, дорадо — на морской глубине."},
  {id:"q_night10",chapter:"Озеро", title:"Ночной марафон", sub:"10 рыб на Ночном озере",
   goal:{type:"loc", loc:"night", n:10}, reward:{coins:1500, xp:700, pearl:1},
   tip:"Луна, туман и трофейный размер."},
  /* --- финал --- */
  {id:"q_beluga", chapter:"Финал", title:"Царь-рыба", sub:"Поймай белугу",
   goal:{type:"species", list:["beluga"]}, reward:{coins:5000, xp:2000},
   tip:"Белуга идёт в омуте ночью на рыбное филе."},
  {id:"q_mythic", chapter:"Финал", title:"Мифы", sub:"Поймай любую мифическую рыбу",
   goal:{type:"rarity", list:["mythic"], n:1}, reward:{coins:6000, xp:2400},
   tip:"Белуга, калуга, чавыча, марлин, меч-рыба или мако."},
  {id:"q_all",    chapter:"Финал", title:"Полный дневник", sub:"Поймай все 100 видов",
   goal:{type:"speciesAny", n:100, list:null}, reward:{coins:20000, xp:8000, rod:"moonrod", pearl:5},
   tip:"Это долгий путь. Вперёд, рыбак!"},
  {id:"q_final",  chapter:"Финал", title:"Мастер", sub:"Выполни 30 квестов",
   goal:{type:"questsDone", n:30}, reward:{coins:15000, xp:6000, pearl:6},
   tip:"Последний рубеж: почти вся книга заданий."}
];

/* ежедневные цели: обновляются по дате (стабильны в течение дня) */
const DAILY_POOL = [
  {id:"d_any",   text:"Поймай 6 рыб",                     type:"any",    n:6,  coins:120, xp:60},
  {id:"d_peace", text:"Поймай 3 мирные рыбы",              type:"cat",    cat:"peace", n:3, coins:110, xp:55},
  {id:"d_pred",  text:"Поймай 2 хищника",                  type:"cat",    cat:"pred",  n:2, coins:150, xp:70},
  {id:"d_big",   text:"Поймай рыбу тяжелее 2 кг",          type:"weight", n:2000, coins:160, xp:80},
  {id:"d_cast",  text:"Сделай 8 точных забросов (в зону)", type:"acc",    n:8,  coins:130, xp:65},
  {id:"d_kinds", text:"Поймай 3 вида, которых нет в дневнике (новых)", type:"new", n:3, coins:200, xp:100},
  {id:"d_rare",  text:"Поймай рыбу редкости «редкий» или выше", type:"rar", n:1, coins:180, xp:90}
];

const CHAPTER_ORDER = ["Начало","Река","Озеро","Зима","Глубина","Море","Финал"];

const JUNK_ART = {
  boot: '<svg viewBox="0 0 64 64"><path d="M18 10h12v20l14 6c4 2 6 5 6 9v5H14V22c0-6 2-12 4-12z" fill="#6b5136" stroke="#3f2f1e" stroke-width="2"/><path d="M14 44h36v6H14z" fill="#3f2f1e"/></svg>',
  weed: '<svg viewBox="0 0 64 64"><path d="M32 56c-8 0-14-6-14-14 0-10 8-12 8-20 0-6 4-10 6-12 2 6 4 8 4 14 0 6 6 10 6 18 0 8-4 14-10 14z" fill="#4f7a4a" stroke="#2f4a2c" stroke-width="2"/></svg>',
  can:  '<svg viewBox="0 0 64 64"><rect x="18" y="14" width="28" height="38" rx="4" fill="#8d6f5a" stroke="#4e3a2c" stroke-width="2"/><path d="M18 24h28M18 34h28" stroke="#4e3a2c" stroke-width="2"/><path d="M26 14c0-3 3-5 6-5s6 2 6 5" stroke="#4e3a2c" stroke-width="2" fill="none"/></svg>',
  log:  '<svg viewBox="0 0 64 64"><rect x="8" y="24" width="48" height="16" rx="8" fill="#7a5c3c" stroke="#3e2d1d" stroke-width="2"/><circle cx="50" cy="32" r="7" fill="#9a7a52" stroke="#3e2d1d" stroke-width="2"/><circle cx="50" cy="32" r="3" fill="#6b5136"/></svg>'
};
