"use strict";
/* ============================================================
   AGE OF ALBERTA  — browser-only isometric learning game
   Grounded in the Alberta K-12 curriculum (Grades 2 & 3).
   No server. Sprite buildings + walking workers, textured
   terrain, zoom/pan/scroll, fog-of-war exploration, tap-to-
   place building. Progress saved in browser storage.
   ============================================================ */

/* ---------- Storage adapter (degrade gracefully in preview iframe) ---------- */
const Store = (function(){
  const LS = (function(){ try{ return window["local"+"Storage"]; }catch(e){ return null; } })();
  let ok=false; try{ const k="__t"; LS.setItem(k,"1"); LS.removeItem(k); ok=true; }catch(e){ ok=false; }
  const mem={};
  return {
    persistent: ok,
    get(k){ try{ return ok ? LS.getItem(k) : (mem[k]??null); }catch(e){ return mem[k]??null; } },
    set(k,v){ try{ if(ok) LS.setItem(k,v); else mem[k]=v; }catch(e){ mem[k]=v; } }
  };
})();

/* ---------- Save / state ---------- */
const SAVE_KEY = "age_of_alberta_v3";
const MAP = 22;          // tiles per side (large explorable world)
const CENTER = (MAP/2)|0;
const DEFAULT = {
  name:"Explorer",
  food:40, wood:30, crystal:8, score:0,
  buildings:[ {code:"townhall", x:CENTER, y:CENTER, lvl:1} ],
  workers:[],          // populated on init
  skills:{},
  answered:0,
  age:0,               // current Age index (0=Pioneer)
  revealed:null,       // set of "x,y" revealed tiles (stored as array)
  resourceNodes:null,  // discoverable resource piles
  oilFields:null,      // discoverable oil fields (build a well here)
  transport:null,      // transport units (wagon/combine/drone)
  seed:null,           // per-game map seed (randomizes terrain + river)
  rails:null,          // set of "x,y" tiles that have rail track
  roads:null,          // set of "x,y" tiles that have road
  trains:null,         // train units running on the rail loop
  trainSpeed:1,        // speed upgrade multiplier
  trainCars:1,         // number of cargo cars per train
  storiesSeen:null     // codes/types whose story has been read
};
let S = load();
function load(){
  try{ const r = Store.get(SAVE_KEY); if(r) return Object.assign({}, JSON.parse(JSON.stringify(DEFAULT)), JSON.parse(r)); }catch(e){}
  return JSON.parse(JSON.stringify(DEFAULT));
}
// Each fresh village gets its own random map seed so terrain differs every game.
if(S.seed===null || S.seed===undefined){ S.seed = (Math.floor(Math.random()*1e9))>>>0; }
const SEED = S.seed>>>0;
function save(){ try{ S.revealed=[...revealed]; Store.set(SAVE_KEY, JSON.stringify(S)); }catch(e){} }

/* ============================================================
   CHALLENGE BANK  — hand-authored, curriculum-grounded (PRESERVED)
   ============================================================ */
function ri(a,b){return Math.floor(Math.random()*(b-a+1))+a;}
function pick(a){return a[Math.floor(Math.random()*a.length)];}
function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=ri(0,i);[a[i],a[j]]=[a[j],a[i]];}return a;}

const SPELL_WORDS = {
  2:["because","friend","little","happy","every","again","under","water","green","please","family","school","animal","pretty","brother","sister","yellow","people","funny","another",
     "morning","window","garden","winter","summer","rabbit","basket","pencil","yellow","orange","purple","circle","square","number","letter","finish","follow","hello","thank","about",
     "could","would","should","their","there","where","which","while","clean","sleep","sweet","sheep","train","track","wheat","river","snowy","bison","prairie","ranch"],
  3:["beautiful","tomorrow","favourite","important","different","together","mountain","everyone","adventure","question","remember","surprise","treasure","creature","explorer","describe","village","whisper","journey","calendar",
     "neighbour","province","capital","glacier","prairie","buffalo","railway","engineer","discover","continue","chocolate","dinosaur","telescope","electric","magnetic","hospital","library","kitchen","weather","thunder",
     "harvest","festival","carnival","history","natural","capture","picture","future","because","thought","through","enough","island","animal","family","holiday","settler","pioneer","compass","valley"]
};
const READING = [
  {g:2, text:"Mia found a tiny frog by the cold mountain stream. It was green with shiny eyes. She gently put it in her bucket of water and named it Pip.",
   q:"What did Mia name the frog?", choices:["Pip","Max","Stream","Bucket"], ans:"Pip"},
  {g:2, text:"The berry farm was full of ripe red strawberries. The workers picked baskets and baskets. They would have plenty of food for the whole winter.",
   q:"What were the workers picking?", choices:["Strawberries","Apples","Wood","Crystals"], ans:"Strawberries"},
  {g:3, text:"High on the Rocky Mountain summit, the miners dug into the rock. Deep inside they discovered glowing blue crystals. The crystals could power the whole village for a year.",
   q:"What did the miners discover in the rock?", choices:["Blue crystals","Strawberries","A river","Wood"], ans:"Blue crystals"},
  {g:3, text:"Every morning the explorer paddled down the Athabasca River. She mapped new islands and counted the herons. By Friday she had drawn a complete map of the valley.",
   q:"How did the explorer travel down the river?", choices:["She paddled","She flew","She drove","She walked"], ans:"She paddled"},
  {g:3, text:"The little cabin needed more wood, so the sawmill worked all day. The pile of logs grew taller and taller until it almost touched the roof of the tower.",
   q:"Why did the sawmill work all day?", choices:["The cabin needed wood","To find crystals","To catch fish","To grow berries"], ans:"The cabin needed wood"},
  {g:2, text:"The farmers love sunny prairie days. When the sun came out, the golden wheat swayed in the warm wind. At night the workers rested in their cozy cabins.",
   q:"Where did the workers rest at night?", choices:["In their cabins","In the tower","On the mountain","In the river"], ans:"In their cabins"},
  {g:2, text:"Sam heard a loud whistle. A long steam train chugged into the station, puffing white clouds. It was carrying wheat to the big city far away.",
   q:"What was the train carrying?", choices:["Wheat","Frogs","Snow","Books"], ans:"Wheat"},
  {g:2, text:"The puppy named Scout helped the rancher every day. He ran around the cattle and barked to keep them together. The cows always listened to Scout.",
   q:"What was the puppy's name?", choices:["Scout","Pip","Max","Sam"], ans:"Scout"},
  {g:3, text:"Long ago, the first railway crossed the prairies of Alberta. It took thousands of workers many years to lay the heavy steel tracks. When it was finished, people could travel from the mountains to the cities in just a few days.",
   q:"What did the railway let people do?", choices:["Travel quickly across Alberta","Build mountains","Grow strawberries","Fly airplanes"], ans:"Travel quickly across Alberta"},
  {g:3, text:"Deep in the badlands of Alberta, scientists dig carefully in the dry rock. They have found the bones of giant dinosaurs that lived millions of years ago. Drumheller is famous all over the world for these amazing fossils.",
   q:"What do scientists find in the Alberta badlands?", choices:["Dinosaur bones","Blue crystals","Gold coins","Sea shells"], ans:"Dinosaur bones"},
  {g:3, text:"The chinook wind is special in southern Alberta. In the middle of cold winter it can blow warm and melt the snow in just one day. People say it feels like spring arrived early.",
   q:"What does a chinook wind do in winter?", choices:["Blows warm and melts snow","Brings more snow","Makes it colder","Stops the trains"], ans:"Blows warm and melts snow"}
];

// Alberta Social Studies / Geography — Gr 2 & 3 (Alberta program of studies themes)
const SOCIAL = [
  {g:2, q:"What is the capital city of Alberta?", choices:["Edmonton","Calgary","Toronto","Banff"], ans:"Edmonton"},
  {g:2, q:"Which big mountains are found in western Alberta?", choices:["The Rocky Mountains","The ocean","The desert","The Great Lakes"], ans:"The Rocky Mountains"},
  {g:2, q:"Alberta is a ___ of Canada.", choices:["province","country","city","continent"], ans:"province"},
  {g:2, q:"What flat grassland covers much of southern Alberta?", choices:["The prairies","The jungle","The beach","The swamp"], ans:"The prairies"},
  {g:2, q:"What golden crop do Alberta farmers grow a lot of?", choices:["Wheat","Bananas","Coconuts","Rice"], ans:"Wheat"},
  {g:2, q:"What large animal once roamed the Alberta plains in huge herds?", choices:["Bison (buffalo)","Elephants","Penguins","Camels"], ans:"Bison (buffalo)"},
  {g:2, q:"Which season brings lots of snow to Alberta?", choices:["Winter","Summer","Harvest","Spring"], ans:"Winter"},
  {g:2, q:"What do we call the building where Alberta's government makes laws?", choices:["The Legislature","The mall","The school","The barn"], ans:"The Legislature"},
  {g:3, q:"What does the Alberta shield on the flag show?", choices:["Wheat, prairie, hills and mountains","A pirate ship","A spaceship","A castle"], ans:"Wheat, prairie, hills and mountains"},
  {g:3, q:"What is Alberta's largest city by population?", choices:["Calgary","Red Deer","Lethbridge","Banff"], ans:"Calgary"},
  {g:3, q:"What valuable resource is pumped from oil wells in Alberta?", choices:["Oil","Milk","Maple syrup","Lemonade"], ans:"Oil"},
  {g:3, q:"Which Alberta town is world-famous for dinosaur fossils?", choices:["Drumheller","Edmonton","Jasper","Medicine Hat"], ans:"Drumheller"},
  {g:3, q:"What warm winter wind melts the snow in southern Alberta?", choices:["A chinook","A blizzard","A monsoon","A hurricane"], ans:"A chinook"},
  {g:3, q:"What were the first peoples who lived in Alberta long before settlers called?", choices:["First Nations and Métis peoples","Astronauts","Pirates","Vikings"], ans:"First Nations and Métis peoples"},
  {g:3, q:"How did goods like wheat travel across Alberta long ago?", choices:["By railway train","By rocket","By submarine","By hot air balloon"], ans:"By railway train"},
  {g:3, q:"Which famous national park sits in the Rocky Mountains of Alberta?", choices:["Banff","Disneyland","Central Park","The Sahara"], ans:"Banff"},
  {g:3, q:"What is the name of the big river that flows through Edmonton?", choices:["The North Saskatchewan River","The Nile","The Amazon","The Thames"], ans:"The North Saskatchewan River"},
  {g:3, q:"What yearly event in Calgary celebrates cowboys, horses and ranching?", choices:["The Calgary Stampede","The Olympics","The World Cup","Halloween"], ans:"The Calgary Stampede"}
];
function makeSocial(diff){
  const pool = SOCIAL.filter(s=> diff>=2 ? true : s.g<=2);
  const item = pick(pool.length?pool:SOCIAL);
  return {subject:"Alberta", subj:"Alberta", skill:"social", prompt:item.q,
          choices:shuffle(item.choices), answer:item.ans, qtype:"choice",
          outcome:"SOC (Gr 2–3): Alberta's geography, people and history"};
}
function makeChallenge(diff){
  const r = Math.random();
  if(r < 0.40) return makeMath(diff);
  if(r < 0.62) return makeSpelling(diff);
  if(r < 0.80) return makeReading(diff);
  return makeSocial(diff);
}
function makeMath(diff){
  const kinds = diff<=1 ? ["add","sub"] : diff===2 ? ["add","sub","mult","place"] : ["add","sub","mult","place","fraction","pattern"];
  const k = pick(kinds);
  let a,b,prompt,ans,outcome,extra="";
  if(k==="add"){
    if(diff<=1){a=ri(10,49);b=ri(10,49);} else {a=ri(40,499);b=ri(40,499);}
    prompt=`${a} + ${b}`; ans=a+b;
    outcome="MAT (Gr 2–3): apply strategies for addition within 1000";
  }else if(k==="sub"){
    if(diff<=1){a=ri(20,80);b=ri(5,a-1);} else {a=ri(120,900);b=ri(20,a-10);}
    prompt=`${a} − ${b}`; ans=a-b;
    outcome="MAT (Gr 2–3): apply strategies for subtraction within 1000";
  }else if(k==="mult"){
    a=ri(2,9); b=ri(2,9);
    prompt=`${a} × ${b}`; ans=a*b;
    outcome="MAT (Gr 3): multiplication and division within 100";
  }else if(k==="place"){
    const n = ri(diff===3?1000:100, diff===3?9999:999);
    const places=["ones","tens","hundreds","thousands"];
    const digits=String(n).split("").reverse();
    const pi = ri(0, digits.length-1);
    prompt=`In ${n}, what is the digit in the ${places[pi]} place?`;
    ans=parseInt(digits[pi],10);
    outcome="MAT (Gr 2–3): interpret place value";
  }else if(k==="fraction"){
    const den=pick([2,3,4]); const whole=pick([8,12,6,10]);
    prompt=`What is 1/${den} of ${whole}?`; ans=whole/den;
    if(!Number.isInteger(ans)){ return makeMath(diff); }
    outcome="MAT (Gr 3): interpret fractions of a whole";
  }else{
    const start=ri(2,6), step=pick([2,3,5,10]);
    const seq=[start,start+step,start+2*step,start+3*step];
    prompt=`What number comes next?  ${seq.join(", ")}, ___`;
    ans=start+4*step; extra="pattern";
    outcome="MAT (Gr 2–3): analyze patterns in numerical sequences";
  }
  return {subject:"Math", subj:"Math", skill:k, mathDisplay:(k==="add"||k==="sub"||k==="mult"), prompt, answer:String(ans),
          qtype:"number", outcome};
}
function makeSpelling(diff){
  const grade = diff>=2?3:2;
  const word = pick(SPELL_WORDS[grade]);
  const mode = Math.random()<0.5 ? "blank" : "scramble";
  let prompt, hint;
  if(mode==="scramble"){
    let sc = word;
    while(sc===word){ sc = shuffle(word.split("")).join(""); }
    prompt = `Unscramble the word:`; hint = sc;
  }else{
    const arr = word.split(""); const hideN = Math.max(1, Math.round(arr.length* (diff>=2?0.5:0.35)));
    const idxs = shuffle(arr.map((_,i)=>i)).slice(0,hideN);
    const shown = arr.map((c,i)=> idxs.includes(i) ? "_" : c).join(" ");
    prompt = `Spell the word:`; hint = shown;
  }
  return {subject:"Spelling", subj:"Spelling", skill:"spelling", prompt, hint, answer:word, qtype:"letters",
          outcome:"LANENG (Gr 2–3): spell familiar words using strategies"};
}
function makeReading(diff){
  const pool = READING.filter(r=> diff>=2 ? true : r.g<=2);
  const item = pick(pool.length?pool:READING);
  return {subject:"Reading", subj:"Reading", skill:"comprehension", prompt:item.q, passage:item.text,
          choices:shuffle(item.choices), answer:item.ans, qtype:"choice",
          outcome:"LANENG (Gr 2–3): comprehend texts using strategies"};
}

/* ============================================================
   BUILDINGS  (sprite-based, Alberta themed)
   ============================================================ */
const BUILDINGS = {
  townhall:{name:"Legislature", spr:"townhall", emoji:"🏛️", worker:null,        costF:0, costW:0, costC:0, max:5, desc:"Heart of your province"},
  house:   {name:"Cabin",       spr:"cabin",    emoji:"🏠", worker:null,        costF:20,costW:25,costC:0,  max:4, desc:"Workers rest here"},
  farm:    {name:"Wheat Farm",  spr:"farm",     emoji:"🌾", worker:"farmer",    costF:0, costW:30,costC:0,  max:4, desc:"Farmers grow food"},
  mill:    {name:"Sawmill",     spr:"sawmill",  emoji:"🪵", worker:"lumberjack",costF:30,costW:0, costC:0,  max:4, desc:"Lumberjacks cut wood"},
  lab:     {name:"Mine Shaft",  spr:"lab",      emoji:"💎", worker:"miner",     costF:40,costW:40,costC:10, max:4, desc:"Miners find crystals"},
  tower:   {name:"Grain Tower", spr:"tower",    emoji:"🏗️", worker:"builder",   costF:25,costW:45,costC:5,  max:5, desc:"Boosts score + storage"},
  well:    {name:"Oil Well",    spr:"well",     emoji:"🛢️", worker:"miner",     costF:0, costW:0, costC:0,  max:3, desc:"Pumps oil — earns big score"},
  datacenter:{name:"AI Data Centre", spr:"datacenter", emoji:"🤖", worker:"builder", costF:60,costW:60,costC:40, max:4, desc:"Powers the AI Age — big score & smart robots", minAge:3},
  station: {name:"Train Station", spr:"station",  emoji:"🚉", worker:null,        costF:40,costW:60,costC:10, max:4, desc:"Hub for trains — tap to run the railway"}
};
const BUILD_ORDER = ["house","farm","mill","lab","tower","station"];

/* ============================================================
   AGES — progress through eras as your village grows
   ============================================================ */
const AGES = [
  {name:"Pioneer Age",   emoji:"🐎", unit:"wagon",   score:0,   blurb:"Horse & wagon haul your goods."},
  {name:"Harvest Age",   emoji:"🚜", unit:"combine", score:150, blurb:"A combine harvester rolls in!"},
  {name:"Modern Age",    emoji:"🚁", unit:"drone",   score:400, blurb:"Delivery drones take to the sky!"},
  {name:"AI Age",        emoji:"🤖", unit:"robot",   score:800, blurb:"AI data centres power the future — robots roll out!"}
];
function ageForScore(sc){ let a=0; for(let i=0;i<AGES.length;i++){ if(sc>=AGES[i].score) a=i; } return a; }

/* ============================================================
   ASSETS — load sprites
   ============================================================ */
const SPRITES = {}; let spritesReady=0, spritesTotal=0;
function loadSprite(key, file){
  spritesTotal++;
  const img = new Image();
  img.onload = ()=>{ spritesReady++; };
  img.src = "assets/"+file;
  SPRITES[key]=img;
}
loadSprite("b_townhall","b_townhall.png");
loadSprite("b_cabin","b_cabin.png");
loadSprite("b_farm","b_farm.png");
loadSprite("b_sawmill","b_sawmill.png");
loadSprite("b_lab","b_lab.png");
loadSprite("b_tower","b_tower.png");
loadSprite("w_farmer","w_farmer.png");
loadSprite("w_lumberjack","w_lumberjack.png");
loadSprite("w_miner","w_miner.png");
loadSprite("w_builder","w_builder.png");
loadSprite("w_explorer","w_explorer.png");
loadSprite("b_well","b_well.png");
loadSprite("u_wagon","u_wagon.png");
loadSprite("u_combine","u_combine.png");
loadSprite("u_drone","u_drone.png");
loadSprite("b_datacenter","b_datacenter.png");
loadSprite("u_robot","u_robot.png");
// expansion sprites: Legislature, station, trains, cargo cars
loadSprite("b_townhall_legislature","b_townhall_legislature.png");
loadSprite("b_station","b_station.png");
loadSprite("u_train_steam","u_train_steam.png");
loadSprite("u_train_freight","u_train_freight.png");
loadSprite("u_train_modern","u_train_modern.png");
loadSprite("u_car_hopper","u_car_hopper.png");
loadSprite("u_car_box","u_car_box.png");
// directional sprites for trains + cargo cars (4 isometric diagonals: sw=front-left, se=front-right, nw=rear-left, ne=rear-right)
["u_train_steam","u_train_freight","u_train_modern","u_car_hopper","u_car_box"].forEach(base=>{
  ["sw","se","nw","ne"].forEach(d=> loadSprite(base+"_"+d, base+"_"+d+".png"));
});
const SPR_B = {townhall:"b_townhall",cabin:"b_cabin",farm:"b_farm",sawmill:"b_sawmill",lab:"b_lab",tower:"b_tower",well:"b_well",datacenter:"b_datacenter",station:"b_station"};
const SPR_W = {farmer:"w_farmer",lumberjack:"w_lumberjack",miner:"w_miner",builder:"w_builder",explorer:"w_explorer"};

/* ============================================================
   TERRAIN — procedural texture per tile (deterministic)
   types: grass, wheat, water, rock, dirt
   ============================================================ */
// Seeded hash — SEED is mixed in so every village gets a different map.
function hashTile(x,y){ let h=(x*374761393 + y*668265263 + SEED*2654435761)>>>0; h=(h^(h>>13))*1274126177>>>0; return (h>>>0)/4294967295; }

// Where the mountain ridge sits (chosen by seed): one of the four edges.
const MTN_CORNER = Math.floor(hashTile(101,202)*4);   // 0=NE,1=NW,2=SE,3=SW-ish
const RIVER = [];   // path of river tiles (for water)
(function makeRiver(){
  // River entry point + meander pattern vary with the seed.
  let y = 3 + Math.floor(hashTile(900,900)*(MAP-7));
  let x = 1 + Math.floor(hashTile(800,800)*2);
  let dir = hashTile(700,700)<0.5 ? 1 : -1;
  while(x<MAP){
    RIVER.push(x+","+y);
    RIVER.push(x+","+(y+1));
    x += 1;
    const h = hashTile(x*3+11, y*5+7);
    if(h<0.5) y += (hashTile(x+7,y)<0.5? dir : -dir);
    if(y<2) y=2; if(y>MAP-3) y=MAP-3;
  }
})();
const RIVERSET = new Set(RIVER);
// distance-from-mountain-side score, 0..~1 (higher = closer to the ridge)
function mountainScore(x,y){
  let d;
  if(MTN_CORNER===0) d = (x + (MAP-y));        // NE
  else if(MTN_CORNER===1) d = ((MAP-x) + (MAP-y)); // NW
  else if(MTN_CORNER===2) d = (x + y);          // SE
  else d = ((MAP-x) + y);                        // SW
  return d/(MAP*2);
}
function terrainAt(x,y){
  // keep a calm buildable clearing around the town hall, whatever the seed
  const nearHome = (Math.abs(x-CENTER)<=3 && Math.abs(y-CENTER)<=3);
  if(nearHome){
    const nn=hashTile(x,y);
    return nn<0.12 ? "dirt" : (nn>0.80? "wheat" : "grass");
  }
  if(RIVERSET.has(x+","+y)) return "water";
  const n = hashTile(x,y);
  const ms = mountainScore(x,y);
  const ridge = hashTile(Math.floor(x/3),Math.floor(y/3));
  // tall MOUNTAINS form a band along the seeded ridge side
  if(ms>0.80 && ridge>0.35) return "mountain";
  // rocky foothills just below the peaks
  if(ms>0.70 && ridge>0.55) return "rock";
  // pine FOREST belt hugging the foothills
  if(ms>0.55 && ridge>0.45) return "forest";
  if(n>0.90) return "rock";
  // scattered woodland groves out on the plains
  if(n>0.84 && n<0.90) return "forest";
  // a small lake / pond cluster somewhere (seeded)
  if(n>0.62 && n<0.78) return "wheat";   // golden prairie patches
  if(n<0.10) return "dirt";
  return "grass";
}
// mountains and water are not buildable/walkable ground
function isBlockedTerrain(t){ return t==="water" || t==="mountain"; }

/* ============================================================
   ISOMETRIC RENDERER (canvas)
   ============================================================ */
const cv = document.getElementById("cv");
const ctx = cv.getContext("2d");
let DPR = Math.min(window.devicePixelRatio||1, 2);
const TW = 76, TH = 38;              // base tile diamond size (unzoomed)
let zoom = 1.0;                       // 0.5 .. 2.0
let cam = {x:0, y:0};                 // pan offset in screen px
let view = {w:0,h:0};

// reveal / fog
let revealed = new Set();
function initReveal(){
  revealed = new Set();
  if(S.revealed && S.revealed.length){ S.revealed.forEach(t=>revealed.add(t)); }
  else {
    // reveal area around town hall
    for(let dx=-4;dx<=4;dx++) for(let dy=-4;dy<=4;dy++){
      if(dx*dx+dy*dy<=18){ const x=CENTER+dx,y=CENTER+dy; if(x>=0&&y>=0&&x<MAP&&y<MAP) revealed.add(x+","+y); }
    }
  }
}

// resource nodes discoverable by exploring
function initResourceNodes(){
  if(S.resourceNodes && S.resourceNodes.length){ return; }
  const nodes=[]; let s=12345;
  const rnd=()=>{ s=(s*9301+49297)%233280; return s/233280; };
  let placed=0, guard=0;
  while(placed<14 && guard<400){
    guard++;
    const x=Math.floor(rnd()*MAP), y=Math.floor(rnd()*MAP);
    if(Math.abs(x-CENTER)<5 && Math.abs(y-CENTER)<5) continue;
    if(terrainAt(x,y)==="water") continue;
    const kind = pick(["food","wood","crystal"]);
    nodes.push({x,y,kind,amt:ri(15,40),found:false});
    placed++;
  }
  S.resourceNodes = nodes;
}

// oil fields — discoverable; build a well on them to earn big score
function initOilFields(){
  if(S.oilFields && S.oilFields.length){ return; }
  const fields=[]; let s=77777;
  const rnd=()=>{ s=(s*9301+49297)%233280; return s/233280; };
  let placed=0, guard=0;
  while(placed<4 && guard<400){
    guard++;
    const x=Math.floor(rnd()*MAP), y=Math.floor(rnd()*MAP);
    if(Math.abs(x-CENTER)<6 && Math.abs(y-CENTER)<6) continue;  // out afield
    if(terrainAt(x,y)==="water"||terrainAt(x,y)==="rock") continue;
    fields.push({x,y,found:false,built:false});
    placed++;
  }
  S.oilFields = fields;
}
function initTransport(){
  if(S.transport && S.transport.length){ return; }
  S.transport = [];
}

/* ============================================================
   RAIL + ROAD NETWORK + TRAINS
   ============================================================ */
// rails/roads are sets of "x,y" strings; trains follow an ordered loop of rail tiles.
let rails=new Set(), roads=new Set();
function initNetwork(){
  rails = new Set(S.rails||[]);
  roads = new Set(S.roads||[]);
  if(!S.trains) S.trains=[];
  // FREE STARTER RAIL LOOP near the Legislature so a train always runs from the start
  if(rails.size===0){
    const loop=starterLoopTiles();
    loop.forEach(t=>rails.add(t.x+","+t.y));
    S.rails=[...rails];
    // give the player a starter station building beside the loop if none exists
    if(!S.buildings.some(b=>b.code==="station")){
      const st=loop[0];
      // place station just inside the loop on a buildable tile
      const sx=CENTER, sy=CENTER-3;
      if(canPlaceAt(sx,sy)) S.buildings.push({code:"station",x:sx,y:sy,lvl:1});
    }
    // spawn the first steam train on the loop
    spawnTrain("steam");
  }
}
function starterLoopTiles(){
  // a small rectangular loop of rail around the town centre
  const x0=CENTER-3, x1=CENTER+3, y0=CENTER-4, y1=CENTER+2;
  const t=[];
  for(let x=x0;x<=x1;x++) t.push({x,y:y0});
  for(let y=y0+1;y<=y1;y++) t.push({x:x1,y});
  for(let x=x1-1;x>=x0;x--) t.push({x,y:y1});
  for(let y=y1-1;y>y0;y--) t.push({x:x0,y});
  // keep only on-map tiles
  return t.filter(p=>p.x>=0&&p.y>=0&&p.x<MAP&&p.y<MAP);
}
// Build an ordered path by following rail neighbours. Detects whether the track is
// a CLOSED LOOP (the train circles forever) or an OPEN line with dead ends (the
// train must reverse at each end like a real shuttle). Returns {path, closed}.
// Cached so we don't re-walk the rail set every frame; invalidated when rails change.
function railTrackInfo(){
  if(rails.size===0) return {path:[], closed:false};
  const sig = rails.size+":"+[...rails][0];   // cheap change signal
  if(railTrackInfo._sig===sig && railTrackInfo._cache) return railTrackInfo._cache;
  const set=rails;
  const N=[[1,0],[0,1],[-1,0],[0,-1]];
  const nbrs=(x,y)=>{ let c=0; for(const [dx,dy] of N) if(set.has((x+dx)+","+(y+dy))) c++; return c; };
  // pick a starting tile: prefer a dead-end (exactly one rail neighbour) so an open
  // line is traversed end-to-end; fall back to any tile for a closed loop.
  let start=null;
  for(const k of set){ const [x,y]=k.split(",").map(Number); if(nbrs(x,y)===1){ start=[x,y]; break; } }
  if(!start) start=[...set][0].split(",").map(Number);
  const path=[{x:start[0],y:start[1]}]; const seen=new Set([start[0]+","+start[1]]);
  let cur={x:start[0],y:start[1]}, guard=0;
  while(guard++<set.size+4){
    let moved=false;
    for(const [dx,dy] of N){
      const nx=cur.x+dx, ny=cur.y+dy, key=nx+","+ny;
      if(set.has(key) && !seen.has(key)){ path.push({x:nx,y:ny}); seen.add(key); cur={x:nx,y:ny}; moved=true; break; }
    }
    if(!moved) break;
  }
  // closed if the last tile is rail-adjacent to the first AND we walked the whole set
  const a=path[0], b=path[path.length-1];
  const adjacent = path.length>=3 && (Math.abs(a.x-b.x)+Math.abs(a.y-b.y))===1;
  const closed = adjacent && path.length===set.size;
  const res={path, closed};
  railTrackInfo._sig=sig; railTrackInfo._cache=res;
  return res;
}
// Back-compat: the ordered list of rail tiles.
function railLoopPath(){ return railTrackInfo().path; }
function spawnTrain(kind){
  if(!S.trains) S.trains=[];
  const path=railLoopPath();
  if(path.length<2){ return false; }
  S.trains.push({kind, i:0, t:0, ph:Math.random()*6});
  S.trains.forEach(tr=>{ if(tr.kind!==kind) tr.kind=kind; }); // all trains share current best kind
  return true;
}
function trainKindForAge(){ return (S.age||0)>=3 ? "modern" : (S.age||0)>=1 ? "freight" : "steam"; }
function drawNetwork(){
  // draw roads first (under rails), then rails
  ctx.save();
  roads.forEach(key=>{
    const [x,y]=key.split(",").map(Number);
    if(!revealed.has(key)) return;
    const p=isoToScreen(x,y); const tw=TW*zoom, th=TH*zoom;
    if(p.x< -120||p.x>view.w+120||p.y< -120||p.y>view.h+160) return;
    drawDiamond(p.x,p.y,tw*0.92,th*0.92); ctx.fillStyle="rgba(150,120,80,0.55)"; ctx.fill();
  });
  rails.forEach(key=>{
    const [x,y]=key.split(",").map(Number);
    if(!revealed.has(key)) return;
    const p=isoToScreen(x,y); const tw=TW*zoom, th=TH*zoom;
    if(p.x< -120||p.x>view.w+120||p.y< -120||p.y>view.h+160) return;
    // gravel bed
    drawDiamond(p.x,p.y,tw*0.6,th*0.6); ctx.fillStyle="rgba(90,80,70,0.55)"; ctx.fill();
    // two steel rails + ties along whichever neighbours have rail
    const horiz = rails.has((x+1)+","+y)||rails.has((x-1)+","+y);
    const vert  = rails.has(x+","+(y+1))||rails.has(x+","+(y-1));
    ctx.strokeStyle="#5a5048"; ctx.lineWidth=2.4*zoom;
    const drawSeg=(ddx,ddy)=>{
      ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(p.x+ddx,p.y+ddy); ctx.stroke();
    };
    if(horiz){ // along +x screen direction
      const ex=(tw/2)*0.5, ey=(th/2)*0.5;
      ctx.strokeStyle="#7a6e62"; ctx.lineWidth=2.6*zoom;
      ctx.beginPath(); ctx.moveTo(p.x-ex,p.y-ey); ctx.lineTo(p.x+ex,p.y+ey); ctx.stroke();
    }
    if(vert){
      const ex=-(tw/2)*0.5, ey=(th/2)*0.5;
      ctx.strokeStyle="#7a6e62"; ctx.lineWidth=2.6*zoom;
      ctx.beginPath(); ctx.moveTo(p.x-ex,p.y-ey); ctx.lineTo(p.x+ex,p.y+ey); ctx.stroke();
    }
  });
  ctx.restore();
}
// trains are drawn inside render()'s depth-sort loop (kind:"train") so peaks/buildings occlude them.
// Map a tile-space movement delta to the directional sprite suffix.
// tile->screen: x=(tx-ty), y=(tx+ty).  +x => down-right(se), -x => up-left(nw),
// +y => down-left(sw), -y => up-right(ne).  Diagonal blends pick the dominant axis.
function trainDirKey(dx,dy){
  if(dx===0 && dy===0) return "sw";
  if(Math.abs(dx)>=Math.abs(dy)){ return dx>0 ? "se" : "nw"; }
  return dy>0 ? "sw" : "ne";
}
// position 'back' loop-units behind the head, honouring the train's travel
// direction `vdir` (+1 forward, -1 reversing). For CLOSED loops we wrap around;
// for OPEN lines we clamp at the ends (cars bunch up briefly at a dead end, which
// reads fine for a shuttle). Returns {x,y,dir} with dir = directional sprite suffix.
function trainPosAlong(path, i, t, back, closed, vdir){
  const L=path.length;
  vdir = vdir||1;
  // head distance along the line; subtract `back` opposite to travel direction
  let pos = i + t - back*vdir;
  if(closed){ while(pos<0) pos+=L; pos=pos%L; }
  else { pos = Math.max(0, Math.min(L-1.0001, pos)); }
  let a=Math.floor(pos), b, f=pos-a;
  if(closed){ a=a%L; b=(a+1)%L; }
  else { a=Math.max(0,Math.min(L-1,a)); b=Math.min(L-1,a+1); }
  const pa=path[a], pb=path[b];
  // sprite faces the way the TRAIN is moving (flip the segment delta when reversing)
  const ddx=(pb.x-pa.x)*vdir, ddy=(pb.y-pa.y)*vdir;
  return {x:pa.x+(pb.x-pa.x)*f, y:pa.y+(pb.y-pa.y)*f, dir:trainDirKey(ddx, ddy)};
}
// pick the directional sprite for a base key + direction, falling back to the omni sprite
function dirSprite(baseKey, dir){
  return SPRITES[baseKey+"_"+dir] || SPRITES[baseKey] || SPRITES[baseKey+"_sw"];
}
function updateTrains(dt){
  const info=railTrackInfo();
  const path=info.path, closed=info.closed;
  if(path.length<2){ return; }
  const L=path.length;
  const baseSpeed=0.0018*(S.trainSpeed||1); // loop-units per ms
  for(const tr of (S.trains||[])){
    if(tr.vdir===undefined) tr.vdir=1;   // +1 forward, -1 reversing (open lines only)
    tr.t += baseSpeed*dt*tr.vdir;
    // advance/retreat whole tiles, handling direction and dead-end reversal
    while(tr.t>=1){
      tr.t-=1;
      if(closed){ tr.i=(tr.i+1)%L; }
      else if(tr.i+1<=L-1){ tr.i++; if(tr.i>=L-1){ tr.vdir=-1; } }
      else { tr.vdir=-1; }
      trainAdvanced(tr, path);
    }
    while(tr.t<0){
      tr.t+=1;
      if(closed){ tr.i=(tr.i-1+L)%L; }
      else if(tr.i-1>=0){ tr.i--; if(tr.i<=0){ tr.vdir=1; } }
      else { tr.vdir=1; }
      trainAdvanced(tr, path);
    }
    // clamp on open lines so a dead-end reversal can't strand the head off-track
    if(!closed){ if(tr.i>=L-1){ tr.i=L-1; if(tr.t>0){ tr.t=0; tr.vdir=-1; } }
                 if(tr.i<=0){ tr.i=0; if(tr.t<0){ tr.t=0; tr.vdir=1; } } }
    // illuminate the fog around the train head, just like the explorer
    const head=path[Math.max(0,Math.min(L-1,tr.i))];
    if(head) revealAround(head.x, head.y, 1);
  }
}
// score + sparkle whenever a train rolls onto a new tile (either direction)
function trainAdvanced(tr, path){
  const earn = (S.trainCars||1);
  S.score += earn>2?2:1;
  const idx=Math.max(0,Math.min(path.length-1,tr.i));
  if(Math.random()<0.12){ const pp=path[idx]; addFloatAt(pp.x,pp.y,"+"+(earn)+"\u2b50","#6a4fa0"); }
  refreshHUD();
}

function resize(){
  view.w = window.innerWidth; view.h = window.innerHeight;
  cv.width = view.w*DPR; cv.height = view.h*DPR;
  cv.style.width=view.w+"px"; cv.style.height=view.h+"px";
  ctx.setTransform(DPR,0,0,DPR,0,0);
}
window.addEventListener("resize", resize); resize();

function originX(){ return view.w/2 + cam.x; }
function originY(){ return view.h*0.30 + cam.y; }
function isoToScreen(tx,ty){
  const tw=TW*zoom, th=TH*zoom;
  return { x: originX() + (tx-ty)*(tw/2), y: originY() + (tx+ty)*(th/2) };
}
function screenToIso(sx,sy){
  const tw=TW*zoom, th=TH*zoom;
  const dx = sx-originX(), dy = sy-originY();
  const tx = (dx/(tw/2) + dy/(th/2))/2;
  const ty = (dy/(th/2) - dx/(tw/2))/2;
  return { tx, ty, ix:Math.round(tx), iy:Math.round(ty) };
}
function centerOn(tx,ty){
  const tw=TW*zoom, th=TH*zoom;
  cam.x = -(tx-ty)*(tw/2);
  cam.y = -(tx+ty)*(th/2) + view.h*0.18;
}

/* ---- terrain palette ---- */
const TERR = {
  grass:{a:"#7fb069",b:"#6fa259",edge:"#5d8c49"},
  wheat:{a:"#e3c264",b:"#d4af3f",edge:"#b8942c"},
  water:{a:"#5aa9d6",b:"#4f9bcb",edge:"#3d83b3"},
  rock:{a:"#9b9387",b:"#8a8276",edge:"#6f685e"},
  dirt:{a:"#b9a06a",b:"#a98f59",edge:"#8c7444"},
  mountain:{a:"#8b8d97",b:"#7c7e88",edge:"#5d5f68"},
  forest:{a:"#5a8a4a",b:"#4d7a3f",edge:"#3c6230"}
};
function drawDiamond(x,y,w,h){
  ctx.beginPath();
  ctx.moveTo(x, y-h/2); ctx.lineTo(x+w/2, y); ctx.lineTo(x, y+h/2); ctx.lineTo(x-w/2, y); ctx.closePath();
}
function drawTile(tx,ty){
  const p=isoToScreen(tx,ty); const tw=TW*zoom, th=TH*zoom;
  const t=terrainAt(tx,ty); const pal=TERR[t];
  const checker=((tx+ty)%2===0);
  ctx.save();
  drawDiamond(p.x,p.y,tw,th);
  ctx.fillStyle = checker?pal.a:pal.b; ctx.fill();
  ctx.lineWidth=1; ctx.strokeStyle="rgba(0,0,0,0.06)"; ctx.stroke();
  ctx.clip();
  // texture details per type
  const n=hashTile(tx,ty);
  if(t==="grass"){
    ctx.strokeStyle="rgba(70,120,60,0.5)"; ctx.lineWidth=1.4*zoom;
    for(let i=0;i<5;i++){ const gx=p.x-tw*0.3+ (hashTile(tx*9+i,ty)*tw*0.6); const gy=p.y-th*0.1+(hashTile(tx,ty*7+i)*th*0.3);
      ctx.beginPath(); ctx.moveTo(gx,gy); ctx.lineTo(gx+1.5*zoom,gy-5*zoom); ctx.stroke(); }
  }else if(t==="wheat"){
    ctx.strokeStyle="rgba(150,110,30,0.55)"; ctx.lineWidth=1.6*zoom;
    for(let i=0;i<8;i++){ const gx=p.x-tw*0.32+ (hashTile(tx*11+i,ty)*tw*0.64); const gy=p.y-th*0.12+(hashTile(tx,ty*5+i)*th*0.35);
      ctx.beginPath(); ctx.moveTo(gx,gy); ctx.lineTo(gx,gy-7*zoom); ctx.stroke();
      ctx.fillStyle="rgba(180,140,40,0.7)"; ctx.beginPath(); ctx.arc(gx,gy-7*zoom,1.5*zoom,0,7); ctx.fill(); }
  }else if(t==="water"){
    ctx.strokeStyle="rgba(255,255,255,0.35)"; ctx.lineWidth=1.6*zoom;
    const wob=Math.sin(now/600+tx+ty)*2*zoom;
    for(let i=0;i<3;i++){ const wy=p.y-th*0.15+i*th*0.22;
      ctx.beginPath(); ctx.moveTo(p.x-tw*0.25, wy+wob); ctx.quadraticCurveTo(p.x, wy-2*zoom+wob, p.x+tw*0.25, wy+wob); ctx.stroke(); }
  }else if(t==="rock"){
    ctx.fillStyle="rgba(0,0,0,0.10)"; for(let i=0;i<3;i++){ const gx=p.x-tw*0.2+(hashTile(tx*3+i,ty)*tw*0.4); const gy=p.y-th*0.1+(hashTile(tx,ty*3+i)*th*0.3);
      ctx.beginPath(); ctx.arc(gx,gy,(2+hashTile(tx+i,ty)*3)*zoom,0,7); ctx.fill(); }
    ctx.fillStyle="rgba(255,255,255,0.14)"; ctx.beginPath(); ctx.arc(p.x-3*zoom,p.y-3*zoom,2.5*zoom,0,7); ctx.fill();
  }else if(t==="dirt"){
    ctx.fillStyle="rgba(120,90,40,0.28)"; for(let i=0;i<4;i++){ const gx=p.x-tw*0.25+(hashTile(tx*5+i,ty)*tw*0.5); const gy=p.y-th*0.12+(hashTile(tx,ty*4+i)*th*0.3);
      ctx.beginPath(); ctx.arc(gx,gy,1.6*zoom,0,7); ctx.fill(); }
  }else if(t==="mountain"){
    // darker rocky base speckle (peak itself is drawn taller in drawTileTop)
    ctx.fillStyle="rgba(0,0,0,0.12)";
    for(let i=0;i<3;i++){ const gx=p.x-tw*0.2+(hashTile(tx*3+i,ty)*tw*0.4); const gy=p.y-th*0.1+(hashTile(tx,ty*3+i)*th*0.3);
      ctx.beginPath(); ctx.arc(gx,gy,2.4*zoom,0,7); ctx.fill(); }
  }else if(t==="forest"){
    // mossy forest floor speckle (trees drawn on top in drawTileTop)
    ctx.fillStyle="rgba(30,70,30,0.30)";
    for(let i=0;i<4;i++){ const gx=p.x-tw*0.25+(hashTile(tx*6+i,ty)*tw*0.5); const gy=p.y-th*0.12+(hashTile(tx,ty*6+i)*th*0.3);
      ctx.beginPath(); ctx.arc(gx,gy,2*zoom,0,7); ctx.fill(); }
  }
  ctx.restore();
}
// tall scenery drawn ABOVE the tile (peaks, forest clumps) — depth-sorted as decos
function drawTerrainTop(tx,ty){
  const t=terrainAt(tx,ty); const p=isoToScreen(tx,ty); const tw=TW*zoom, th=TH*zoom;
  if(t==="mountain"){
    const s=zoom*(1.3+hashTile(tx*5,ty*7)*0.7);
    const baseY=p.y+th*0.18;
    const peakH=(38+hashTile(tx,ty)*26)*s;
    const halfW=tw*0.52;
    // shadow
    ctx.save(); ctx.globalAlpha=.18; ctx.fillStyle="#000"; drawDiamond(p.x,baseY,tw*0.9,th*0.5); ctx.fill(); ctx.restore();
    // rock body
    ctx.fillStyle="#7c7e88"; ctx.beginPath();
    ctx.moveTo(p.x-halfW, baseY); ctx.lineTo(p.x, baseY-peakH); ctx.lineTo(p.x+halfW, baseY); ctx.closePath(); ctx.fill();
    // lit face
    ctx.fillStyle="#9a9ca6"; ctx.beginPath();
    ctx.moveTo(p.x-halfW, baseY); ctx.lineTo(p.x, baseY-peakH); ctx.lineTo(p.x-halfW*0.18, baseY); ctx.closePath(); ctx.fill();
    // snow cap
    ctx.fillStyle="#f5f7fb"; ctx.beginPath();
    ctx.moveTo(p.x, baseY-peakH);
    ctx.lineTo(p.x-halfW*0.34, baseY-peakH*0.55);
    ctx.lineTo(p.x-halfW*0.12, baseY-peakH*0.66);
    ctx.lineTo(p.x+halfW*0.10, baseY-peakH*0.50);
    ctx.lineTo(p.x+halfW*0.30, baseY-peakH*0.60);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle="rgba(0,0,0,0.18)"; ctx.lineWidth=1.4*zoom;
    ctx.beginPath(); ctx.moveTo(p.x-halfW, baseY); ctx.lineTo(p.x, baseY-peakH); ctx.lineTo(p.x+halfW, baseY); ctx.stroke();
  }else if(t==="forest"){
    // a little clump of pines
    const cnt=2+Math.floor(hashTile(tx*7,ty*3)*2);
    for(let i=0;i<cnt;i++){
      const s=zoom*(0.7+hashTile(tx*9+i,ty*4+i)*0.45);
      const ox=p.x+ (hashTile(tx+i,ty*2)-0.5)*tw*0.5;
      const oy=p.y+ (hashTile(tx*2,ty+i)-0.5)*th*0.4 + th*0.1;
      ctx.save(); ctx.globalAlpha=.18; drawDiamond(ox,oy+3*zoom,20*s,9*s); ctx.fillStyle="#000"; ctx.fill(); ctx.globalAlpha=1;
      ctx.fillStyle="#6b4a2b"; ctx.fillRect(ox-2*s,oy-12*s,4*s,12*s);
      ctx.fillStyle="#2f6b3a"; ctx.beginPath(); ctx.moveTo(ox,oy-30*s); ctx.lineTo(ox-10*s,oy-12*s); ctx.lineTo(ox+10*s,oy-12*s); ctx.closePath(); ctx.fill();
      ctx.fillStyle="#3f8d4f"; ctx.beginPath(); ctx.moveTo(ox,oy-22*s); ctx.lineTo(ox-12*s,oy-5*s); ctx.lineTo(ox+12*s,oy-5*s); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }
}

function drawSpriteCentered(img, sx, sy, drawH){
  if(!img || !img.complete || !img.naturalWidth) return;
  const ratio = img.naturalWidth/img.naturalHeight;
  const h = drawH, w = h*ratio;
  // soft ground shadow
  ctx.save(); ctx.globalAlpha=0.22; ctx.fillStyle="#000";
  drawDiamond(sx, sy, w*0.5, w*0.22); ctx.fill(); ctx.restore();
  ctx.drawImage(img, sx-w/2, sy-h, w, h);
}

function drawBuilding(b){
  const p=isoToScreen(b.x,b.y);
  // Town Hall grows into the real Alberta Legislature at its top level
  let sprKey = SPR_B[BUILDINGS[b.code].spr];
  if(b.code==="townhall" && b.lvl>=5) sprKey="b_townhall_legislature";
  const img=SPRITES[sprKey];
  const grand = (b.code==="townhall" && b.lvl>=5) ? 1.25 : 1;
  const baseH = (TH*zoom)*2.6 * grand * (1 + (b.lvl-1)*0.12);
  drawSpriteCentered(img, p.x, p.y+TH*zoom*0.30, baseH);
  if(b.lvl>1){
    ctx.font=`800 ${12*zoom}px 'Baloo 2', sans-serif`; ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillStyle="#fff"; ctx.strokeStyle="#0009"; ctx.lineWidth=3*zoom;
    const ly=p.y - baseH + TH*zoom*0.30 - 6*zoom;
    ctx.strokeText("Lv"+b.lvl,p.x,ly); ctx.fillText("Lv"+b.lvl,p.x,ly);
  }
}

/* ---- workers ---- */
function drawWorker(w){
  const p=isoToScreen(w.tx,w.ty);
  const img=SPRITES[SPR_W[w.type]];
  const bob = Math.sin(now/180 + w.ph) * (w.moving?2.5*zoom:0.8*zoom);
  const h = (TH*zoom)*1.7;
  drawSpriteCentered(img, p.x, p.y - bob, h);
  // working sparkle
  if(w.working){
    ctx.font=`${14*zoom}px serif`; ctx.textAlign="center";
    ctx.fillText(w.job==="farmer"?"🌾":w.job==="lumberjack"?"🪓":w.job==="miner"?"⛏️":"🔨", p.x, p.y - h - 4*zoom + Math.sin(now/150+w.ph)*3);
  }
}

/* ---- decorations: trees & rocks on grass/dirt ---- */
function drawDeco(tx,ty){
  const n=hashTile(tx*13,ty*17);
  const t=terrainAt(tx,ty);
  const p=isoToScreen(tx,ty);
  if((t==="grass") && n>0.80){
    // pine tree
    const s=zoom*(0.8+hashTile(tx,ty)*0.5);
    ctx.save();
    ctx.globalAlpha=.2; drawDiamond(p.x,p.y+4*zoom,26*s,12*s); ctx.fillStyle="#000"; ctx.fill(); ctx.globalAlpha=1;
    ctx.fillStyle="#6b4a2b"; ctx.fillRect(p.x-2.5*s,p.y-14*s,5*s,14*s);
    ctx.fillStyle="#2f6b3a"; ctx.beginPath(); ctx.moveTo(p.x,p.y-34*s); ctx.lineTo(p.x-11*s,p.y-14*s); ctx.lineTo(p.x+11*s,p.y-14*s); ctx.closePath(); ctx.fill();
    ctx.fillStyle="#3f8d4f"; ctx.beginPath(); ctx.moveTo(p.x,p.y-26*s); ctx.lineTo(p.x-13*s,p.y-6*s); ctx.lineTo(p.x+13*s,p.y-6*s); ctx.closePath(); ctx.fill();
    ctx.restore();
  }else if(t==="dirt" && n>0.7){
    const s=zoom*(0.8+hashTile(tx,ty)*0.4);
    ctx.fillStyle="#9b9387"; ctx.beginPath(); ctx.ellipse(p.x,p.y-4*s,9*s,6*s,0,0,7); ctx.fill();
    ctx.fillStyle="#b4ada1"; ctx.beginPath(); ctx.ellipse(p.x-3*s,p.y-6*s,4*s,3*s,0,0,7); ctx.fill();
  }
}

/* ---- resource node markers ---- */
function drawResourceNode(rn){
  if(!revealed.has(rn.x+","+rn.y)) return;
  const p=isoToScreen(rn.x,rn.y);
  const ic = rn.kind==="food"?"🍓":rn.kind==="wood"?"🌲":"💎";
  const bob=Math.sin(now/400+rn.x)*3*zoom;
  ctx.font=`${26*zoom}px serif`; ctx.textAlign="center"; ctx.textBaseline="middle";
  if(!rn.found){
    ctx.save(); ctx.globalAlpha=.85; ctx.fillText(ic,p.x,p.y-12*zoom+bob); ctx.restore();
    // shimmer ring
    ctx.strokeStyle="rgba(255,230,140,0.8)"; ctx.lineWidth=2*zoom;
    ctx.beginPath(); ctx.ellipse(p.x,p.y,16*zoom*(1+Math.sin(now/500)*0.1),8*zoom,0,0,7); ctx.stroke();
  }
}

/* ---- oil field markers (discovered, not yet built on) ---- */
function drawOilField(of){
  if(!revealed.has(of.x+","+of.y) || of.built) return;
  const p=isoToScreen(of.x,of.y);
  if(!of.found) return;
  // dark oil pool
  ctx.save();
  ctx.fillStyle="rgba(20,16,30,0.85)";
  ctx.beginPath(); ctx.ellipse(p.x,p.y,15*zoom,8*zoom,0,0,7); ctx.fill();
  ctx.fillStyle="rgba(90,70,120,0.6)";
  ctx.beginPath(); ctx.ellipse(p.x-3*zoom,p.y-2*zoom,5*zoom,2.5*zoom,0,0,7); ctx.fill();
  ctx.restore();
  const bob=Math.sin(now/350+of.x)*3*zoom;
  ctx.font=`${22*zoom}px serif`; ctx.textAlign="center"; ctx.textBaseline="middle";
  ctx.fillText("🛢️",p.x,p.y-12*zoom+bob);
  // "build well!" pulse ring
  ctx.strokeStyle="rgba(120,90,200,0.85)"; ctx.lineWidth=2.5*zoom;
  ctx.beginPath(); ctx.ellipse(p.x,p.y,18*zoom*(1+Math.sin(now/450)*0.12),9*zoom,0,0,7); ctx.stroke();
}

/* ---- transport units (wagon / combine / drone) ---- */
function drawTransport(u){
  const p=isoToScreen(u.tx,u.ty);
  const key = "u_"+u.unit;
  const img=SPRITES[key];
  if(u.unit==="drone"){
    const hover = Math.sin(now/220 + u.ph)*5*zoom;   // fly higher
    const h=(TH*zoom)*1.6;
    drawSpriteCentered(img, p.x, p.y - 26*zoom - hover, h);
  }else{
    const bob=Math.sin(now/200+u.ph)*1.5*zoom;
    const h=(TH*zoom)*1.9;
    drawSpriteCentered(img, p.x, p.y - bob, h);
  }
  // little cargo sparkle when hauling
  if(u.carry){
    ctx.font=`${12*zoom}px serif`; ctx.textAlign="center";
    ctx.fillText("✨", p.x, p.y - (TH*zoom)*2.2 + Math.sin(now/150+u.ph)*3);
  }
}

let now=0;
function render(t){
  now=t;
  ctx.clearRect(0,0,view.w,view.h);
  // draw tiles back-to-front (only revealed; fog for others)
  for(let sum=0; sum<MAP*2-1; sum++){
    for(let tx=0; tx<MAP; tx++){
      const ty=sum-tx; if(ty<0||ty>=MAP) continue;
      const p=isoToScreen(tx,ty);
      // cull offscreen
      if(p.x< -120 || p.x>view.w+120 || p.y< -120 || p.y>view.h+160) continue;
      if(revealed.has(tx+","+ty)){
        drawTile(tx,ty);
      }else{
        // fog tile
        const tw=TW*zoom, th=TH*zoom;
        drawDiamond(p.x,p.y,tw,th); ctx.fillStyle="#2a3a4d"; ctx.fill();
        ctx.fillStyle="rgba(255,255,255,0.03)"; ctx.fill();
        ctx.strokeStyle="rgba(0,0,0,0.18)"; ctx.lineWidth=1; ctx.stroke();
      }
    }
  }
  // placement highlight
  if(placeMode){
    const hi=hoverTile;
    if(hi && hi.ix>=0&&hi.iy>=0&&hi.ix<MAP&&hi.iy<MAP){
      const p=isoToScreen(hi.ix,hi.iy); const tw=TW*zoom, th=TH*zoom;
      const okT = placeCode==="well" ? validWellTile(hi.ix,hi.iy) : canPlaceAt(hi.ix,hi.iy);
      drawDiamond(p.x,p.y,tw,th); ctx.fillStyle=okT?"rgba(90,220,120,0.45)":"rgba(220,80,70,0.45)"; ctx.fill();
      ctx.strokeStyle=okT?"#3aa655":"#d9544f"; ctx.lineWidth=3*zoom; ctx.stroke();
    }
  }
  // lay-track highlight
  if(layMode){
    const hi=hoverTile;
    if(hi && hi.ix>=0&&hi.iy>=0&&hi.ix<MAP&&hi.iy<MAP){
      const p=isoToScreen(hi.ix,hi.iy); const tw=TW*zoom, th=TH*zoom;
      const t=terrainAt(hi.ix,hi.iy);
      const okT = revealed.has(hi.ix+","+hi.iy) && t!=="water" && t!=="mountain" && t!=="rock" && !S.buildings.some(b=>b.x===hi.ix&&b.y===hi.iy);
      const col = layMode==="rail" ? "rgba(120,110,100,0.5)" : "rgba(180,150,100,0.5)";
      drawDiamond(p.x,p.y,tw,th); ctx.fillStyle=okT?col:"rgba(220,80,70,0.4)"; ctx.fill();
      ctx.strokeStyle=okT?(layMode==="rail"?"#6b6258":"#a8854f"):"#d9544f"; ctx.lineWidth=3*zoom; ctx.stroke();
    }
  }
  // depth-sorted entities: decos, resource nodes, buildings, workers
  const items=[];
  // decos only on revealed tiles in view
  for(let tx=0;tx<MAP;tx++) for(let ty=0;ty<MAP;ty++){
    if(!revealed.has(tx+","+ty)) continue;
    const p=isoToScreen(tx,ty);
    if(p.x< -120 || p.x>view.w+120 || p.y< -120 || p.y>view.h+160) continue;
    const n=hashTile(tx*13,ty*17); const t=terrainAt(tx,ty);
    if((t==="grass"&&n>0.80)||(t==="dirt"&&n>0.7)) items.push({depth:tx+ty, ord:0, kind:"deco", tx,ty});
    // tall terrain (mountain peaks, forest clumps) depth-sort so sprites occlude correctly
    if(t==="mountain"||t==="forest") items.push({depth:tx+ty, ord:1, kind:"terr", tx,ty});
  }
  // rail + road network drawn flat on the ground (under entities)
  drawNetwork();
  // True painter's-algorithm depth: sort by real tile position (x+y) so anything
  // genuinely further back (smaller x+y) is occluded by what's in front of it.
  // `ord` is only a stable tiebreaker for entities on the exact same depth line:
  // ground decals/pools first, then ground sprites, then tall buildings last.
  for(const rn of S.resourceNodes) if(revealed.has(rn.x+","+rn.y)&&!rn.found) items.push({depth:rn.x+rn.y, ord:1, kind:"node", obj:rn});
  for(const of of (S.oilFields||[])) if(of.found && !of.built) items.push({depth:of.x+of.y, ord:0, kind:"oil", obj:of});
  for(const b of S.buildings) items.push({depth:b.x+b.y, ord:3, kind:"bld", obj:b});
  for(const u of (S.transport||[])) items.push({depth:u.tx+u.ty, ord:2, kind:"tr", obj:u});
  for(const w of S.workers) items.push({depth:w.tx+w.ty, ord:2, kind:"wk", obj:w});
  // trains: each segment depth-sorted onto its rail tile so peaks/buildings occlude correctly
  {
    const tinfo=railTrackInfo();
    const tpath=tinfo.path, tclosed=tinfo.closed;
    if(tpath.length>=2){
      const carKeys=["u_car_hopper","u_car_box"];
      for(const tr of (S.trains||[])){
        const locoKey="u_train_"+(tr.kind||"steam");
        const segs=[{base:locoKey, back:0}];
        const carCount=Math.max(0,(S.trainCars||1)-1);
        for(let c=0;c<carCount;c++) segs.push({base:carKeys[c%2], back:(c+1)*0.62});
        for(const seg of segs){
          const pos=trainPosAlong(tpath, tr.i, tr.t, seg.back, tclosed, tr.vdir||1);
          if(!pos) continue;
          const rx=Math.round(pos.x), ry=Math.round(pos.y);
          if(!revealed.has(rx+","+ry)) continue;
          const img=dirSprite(seg.base, pos.dir);
          // depth uses the train's real sub-tile position so it strictly sorts in
          // front of / behind buildings on the same diagonal. ord:5 ties-break ABOVE
          // buildings (ord:3) only when on the exact same depth line, but a train one
          // tile in front (larger x+y) still draws over the building, and one tile
          // behind (smaller x+y) is correctly occluded by it.
          items.push({depth:pos.x+pos.y, ord:5, kind:"train", img:img, px:pos.x, py:pos.y});
        }
      }
    }
  }
  items.sort((a,b)=> (a.depth-b.depth) || (a.ord-b.ord));
  for(const it of items){
    if(it.kind==="deco") drawDeco(it.tx,it.ty);
    else if(it.kind==="terr") drawTerrainTop(it.tx,it.ty);
    else if(it.kind==="node") drawResourceNode(it.obj);
    else if(it.kind==="oil") drawOilField(it.obj);
    else if(it.kind==="bld") drawBuilding(it.obj);
    else if(it.kind==="tr") drawTransport(it.obj);
    else if(it.kind==="wk") drawWorker(it.obj);
    else if(it.kind==="train"){
      const p=isoToScreen(it.px,it.py);
      // sit the train ON the rail: drop the anchor onto the tile surface (like buildings)
      // and keep it modestly sized so it doesn't look like it is flying.
      drawSpriteCentered(it.img, p.x, p.y + TH*zoom*0.34, (TH*zoom)*1.45);
    }
  }
  // selected-worker ring + target marker
  if(selWorker){
    const sp=isoToScreen(selWorker.tx,selWorker.ty);
    ctx.strokeStyle="rgba(255,210,80,0.95)"; ctx.lineWidth=3*zoom;
    ctx.beginPath(); ctx.ellipse(sp.x,sp.y,18*zoom*(1+Math.sin(now/300)*0.08),9*zoom,0,0,7); ctx.stroke();
    if(selWorker.dest){
      const tp=isoToScreen(selWorker.dest.x,selWorker.dest.y);
      ctx.strokeStyle="rgba(90,220,120,0.9)"; ctx.lineWidth=2.5*zoom;
      const tw=TW*zoom, th=TH*zoom; drawDiamond(tp.x,tp.y,tw*0.7,th*0.7); ctx.stroke();
      ctx.font=`${18*zoom}px serif`; ctx.textAlign="center";
      ctx.fillText("📍", tp.x, tp.y - 6*zoom + Math.sin(now/250)*2);
    }
  }
  updateWorkers(t);
  updateTransport(t);
  updateTrains(Math.min(40, t-(render.lastT||t))); render.lastT=t;
  requestAnimationFrame(render);
}

/* ============================================================
   WORKER AI — walk between buildings, do jobs, explore
   ============================================================ */
function spawnWorkers(){
  if(S.workers && S.workers.length) { reLinkWorkers(); return; }
  S.workers=[];
  // start with one builder near the town hall
  addWorker("builder", CENTER, CENTER);
}
function addWorker(type, x, y){
  S.workers.push({type, tx:x+0.5*(Math.random()-0.5), ty:y+0.5*(Math.random()-0.5),
    targetX:x, targetY:y, moving:false, working:false, job:type, ph:Math.random()*6,
    home:{x,y}, mode:"work", waypoints:[], wait:0});
}
function reLinkWorkers(){
  // ensure each job building has a worker; explorers persist
  const jobBuildings = S.buildings.filter(b=>BUILDINGS[b.code].worker);
  // (workers are created when buildings are placed; nothing to do here)
}
function nearestJobTile(w){
  // find a building of matching worker type; wander around it
  const homes = S.buildings.filter(b=>BUILDINGS[b.code].worker===w.type);
  if(homes.length){ const h=pick(homes); return {x:h.x, y:h.y}; }
  // no matching building: wander near town hall
  return {x:CENTER+ri(-2,2), y:CENTER+ri(-2,2)};
}
function tileWalkable(x,y){ if(x<0||y<0||x>=MAP||y>=MAP) return false; const t=terrainAt(x,y); return t!=="water" && t!=="mountain"; }

function updateWorkers(t){
  const dt = Math.min(40, t-(updateWorkers.last||t)); updateWorkers.last=t;
  for(const w of S.workers){
    if(w.mode==="explore"){
      stepExplorer(w,dt); continue;
    }
    if(w.mode==="explore_to"){
      stepGuidedExplorer(w,dt); continue;
    }
    if(w.mode==="tasked"){
      // walk straight to the assigned destination, then settle and work there
      const dx=w.targetX-w.tx, dy=w.targetY-w.ty; const d=Math.hypot(dx,dy);
      if(d<0.06){
        w.working=true; w.moving=false;
        w.home={x:Math.round(w.targetX), y:Math.round(w.targetY)};
        w.mode="work"; w.dest=null; w.wait=ri(800,1600);
      }else{
        w.working=false; w.moving=true;
        const step=Math.min(0.013*dt, d);
        w.tx += dx/d*step; w.ty += dy/d*step;
      }
      continue;
    }
    // normal job worker: pick target, walk, work, repeat (wander near HOME)
    if(w.wait>0){ w.wait-=dt; w.working=true; w.moving=false; continue; }
    const dx=w.targetX-w.tx, dy=w.targetY-w.ty; const d=Math.hypot(dx,dy);
    if(d<0.06){
      w.working=true; w.moving=false; w.wait=ri(600,1400);
      const h = w.home || nearestJobTile(w);
      let nx=h.x+ri(-1,1), ny=h.y+ri(-1,1);
      if(!tileWalkable(nx,ny)){ nx=h.x; ny=h.y; }
      w.targetX=nx; w.targetY=ny;
    }else{
      w.working=false; w.moving=true;
      const step=Math.min(0.009*dt, d);   // gentle, slow stroll, never overshoot
      w.tx += dx/d*step; w.ty += dy/d*step;
    }
  }
}

/* ---- task assignment: tap a worker, then tap a destination ---- */
let selWorker=null;
function workerAtScreen(sx,sy){
  // find closest worker whose sprite is near the tap (screen-space)
  let best=null, bd=42;   // px radius
  for(const w of S.workers){
    if(w.mode==="explore") continue;   // auto-explore trek can't be hijacked mid-walk
    const p=isoToScreen(w.tx,w.ty);
    const dpx=Math.hypot(p.x-sx, p.y-sy - (TH*zoom)*0.8);  // aim at body center
    if(dpx<bd){ bd=dpx; best=w; }
  }
  return best;
}
function selectWorker(w){
  const label = w.type.charAt(0).toUpperCase()+w.type.slice(1);
  // small chooser: move this worker, or read their story
  const o=overlay(`<div class="card"><div class="top" style="background:linear-gradient(#5cb56b,#2c6b3a)">
      <span>\uD83D\uDC64</span> ${label} <span class="x" id="wkX">\u2715</span></div>
    <div class="body" style="text-align:center">
      <img src="assets/hero/${(HERO[w.type]&&HERO[w.type].img)||w.type}.jpg" class="heroimg" style="max-height:150px" onerror="this.style.display='none'"/>
      <p class="qprompt" style="font-size:17px">What should the ${label.toLowerCase()} do?</p>
    </div>
    <div class="foot">
      <button class="btn green" id="wkMove" style="flex:2">\uD83D\uDEB6 Move them</button>
      <button class="btn purple" id="wkStory">\uD83D\uDCD6 Story</button>
    </div></div>`);
  o.querySelector("#wkX").onclick=closeOverlay;
  o.querySelector("#wkStory").onclick=()=>{ closeOverlay(); openHero(w.type); };
  o.querySelector("#wkMove").onclick=()=>{
    closeOverlay();
    selWorker=w; w.dest=null;
    showBanner(`\uD83D\uDC46 ${label} selected \u2014 tap where you want them to work`, true);
  };
}
function assignWorkerTo(x,y){
  if(!selWorker) return;
  // Explorers may be guided into the FOG: they path toward the tap and light up
  // the land as they go. They can stop on still-hidden tiles (revealing them).
  if(selWorker.type==="explorer"){
    if(!tileWalkable(x,y)){ toast("The explorer can't cross water or mountains."); return; }
    selWorker.mode="explore_to";
    selWorker.path=buildPathFog(Math.round(selWorker.tx),Math.round(selWorker.ty),x,y);
    selWorker.pathI=0; selWorker.dest={x,y}; selWorker.working=false; selWorker.wait=0;
    explorerActive=true;
    toast("Exploring that way! 🧭");
    showBanner("🧭 Tap the map to guide your explorer \u2014 they reveal the land as they walk.");
    selWorker=null;
    return;
  }
  if(!tileWalkable(x,y) || !revealed.has(x+","+y)){ toast("Send them to explored land (no water/rock)."); return; }
  selWorker.mode="tasked"; selWorker.targetX=x; selWorker.targetY=y;
  selWorker.dest={x,y}; selWorker.working=false; selWorker.wait=0;
  toast("On their way! 🚶");
  const ww=selWorker; selWorker=null; hideBanner();
  setTimeout(()=>{ if(ww.dest===null){} },10);
}
function clearSelection(){ selWorker=null; hideBanner(); }

/* ---- explorer mechanic ---- */
let explorerActive=false;
function sendExplorer(){
  // find or create an explorer
  let ex=S.workers.find(w=>w.type==="explorer");
  if(!ex){ addWorker("explorer", CENTER, CENTER); ex=S.workers[S.workers.length-1]; }
  // choose an unrevealed frontier tile
  const target=pickFrontier();
  if(!target){ toast("Your whole map is revealed! 🗺️"); return; }
  ex.mode="explore"; ex.path=buildPath(Math.round(ex.tx),Math.round(ex.ty),target.x,target.y);
  ex.pathI=0; ex.working=false;
  explorerActive=true;
  showBanner("🧭 Your explorer is heading out to reveal new land...");
  centerOn(ex.tx,ex.ty);
}
function pickFrontier(){
  // a hidden, walkable tile — prefer ones near an undiscovered oil field,
  // otherwise the farthest frontier from town hall (go afield!).
  const cands=[];
  for(const key of revealed){
    const [x,y]=key.split(",").map(Number);
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=x+dx, ny=y+dy;
      if(nx<0||ny<0||nx>=MAP||ny>=MAP) continue;
      if(revealed.has(nx+","+ny)) continue;
      if(!tileWalkable(nx,ny)) continue;
      cands.push({x:nx,y:ny});
    }
  }
  if(!cands.length) return null;
  // if there's an unfound oil field, head toward it
  const oil=(S.oilFields||[]).find(o=>!o.found);
  if(oil){
    cands.sort((a,b)=> (Math.abs(a.x-oil.x)+Math.abs(a.y-oil.y)) - (Math.abs(b.x-oil.x)+Math.abs(b.y-oil.y)));
    return cands[0];
  }
  // else: bias toward the farthest-from-center frontier, with a little randomness
  cands.sort((a,b)=> (Math.abs(b.x-CENTER)+Math.abs(b.y-CENTER)) - (Math.abs(a.x-CENTER)+Math.abs(a.y-CENTER)));
  return pick(cands.slice(0, Math.max(3, Math.floor(cands.length*0.25))));
}
function buildPath(sx,sy,tx,ty){
  // simple greedy walk (good enough for kid game), avoid water
  const path=[]; let x=sx,y=sy,guard=0;
  while((x!==tx||y!==ty)&&guard<200){
    guard++;
    let mx=Math.sign(tx-x), my=Math.sign(ty-y);
    // prefer the larger axis
    if(Math.abs(tx-x)>=Math.abs(ty-y)){ if(tileWalkable(x+mx,y)){x+=mx;} else if(tileWalkable(x,y+my)){y+=my;} else break; }
    else { if(tileWalkable(x,y+my)){y+=my;} else if(tileWalkable(x+mx,y)){x+=mx;} else break; }
    path.push({x,y});
  }
  return path;
}
// Path that may pass through FOG (unrevealed tiles) — used when the player guides
// the explorer to a spot in the dark. Only blocked by water/mountains.
function buildPathFog(sx,sy,tx,ty){ return buildPath(sx,sy,tx,ty); }
function revealAround(x,y,r){
  for(let dx=-r;dx<=r;dx++) for(let dy=-r;dy<=r;dy++){
    if(dx*dx+dy*dy<=r*r+1){ const nx=x+dx,ny=y+dy; if(nx>=0&&ny>=0&&nx<MAP&&ny<MAP) revealed.add(nx+","+ny); }
  }
}
function stepExplorer(w,dt){
  if(!w.path || w.pathI>=w.path.length){
    // arrived — reveal, maybe find a resource, return to work mode
    revealAround(Math.round(w.tx),Math.round(w.ty),2);
    checkResourceFind(Math.round(w.tx),Math.round(w.ty));
    w.mode="work"; explorerActive=false; w.moving=false;
    w.targetX=Math.round(w.tx); w.targetY=Math.round(w.ty); w.wait=0;
    save();
    hideBanner();
    return;
  }
  const node=w.path[w.pathI];
  const dx=node.x-w.tx, dy=node.y-w.ty, d=Math.hypot(dx,dy);
  const step=Math.min(0.03*dt, d);   // slower, deliberate trek; never overshoot
  if(d<0.12){
    // reached this node
    w.tx=node.x; w.ty=node.y;
    revealAround(node.x,node.y,1); checkResourceFind(node.x,node.y);
    w.pathI++;
  }else{
    w.moving=true; w.tx+=dx/d*step; w.ty+=dy/d*step;
  }
}
// Player-guided explorer: walks the path the player tapped, lighting up fog as it
// goes. At the end it idles in place (still revealing) so the player can tap again
// to send it somewhere new — it does NOT auto-wander off.
function stepGuidedExplorer(w,dt){
  if(!w.path || w.pathI>=w.path.length){
    // arrived at the guided destination
    revealAround(Math.round(w.tx),Math.round(w.ty),2);
    checkResourceFind(Math.round(w.tx),Math.round(w.ty));
    w.mode="work"; explorerActive=false; w.moving=false;
    w.home={x:Math.round(w.tx), y:Math.round(w.ty)};
    w.targetX=Math.round(w.tx); w.targetY=Math.round(w.ty); w.dest=null; w.wait=0;
    save(); hideBanner();
    return;
  }
  const node=w.path[w.pathI];
  const dx=node.x-w.tx, dy=node.y-w.ty, d=Math.hypot(dx,dy);
  const step=Math.min(0.03*dt, d);
  if(d<0.12){
    w.tx=node.x; w.ty=node.y;
    revealAround(node.x,node.y,1); checkResourceFind(node.x,node.y);
    w.pathI++;
  }else{
    w.moving=true; w.tx+=dx/d*step; w.ty+=dy/d*step;
  }
}
function checkResourceFind(x,y){
  for(const rn of S.resourceNodes){
    if(rn.found) continue;
    if(Math.abs(rn.x-x)<=1 && Math.abs(rn.y-y)<=1){
      rn.found=true;
      if(rn.kind==="food"){ S.food+=rn.amt; }
      else if(rn.kind==="wood"){ S.wood+=rn.amt; }
      else { S.crystal+=rn.amt; }
      const ic=rn.kind==="food"?"🍓":rn.kind==="wood"?"🪵":"💎";
      toast(`🎁 Explorer found ${rn.amt} ${ic}!`);
      floatReward("+"+rn.amt+ic,"#b8860b");
      refreshHUD(); save();
    }
  }
  // oil field discovery
  for(const of of (S.oilFields||[])){
    if(of.found) continue;
    if(Math.abs(of.x-x)<=1 && Math.abs(of.y-y)<=1){
      of.found=true; revealAround(of.x,of.y,1);
      save();
      setTimeout(()=>announceOil(of), 400);
    }
  }
}
function announceOil(of){
  hideBanner();
  const o=overlay(`<div class="card"><div class="top" style="background:linear-gradient(#6a4fa0,#3a2360)">
    <span>🛢️</span> Oil Field Discovered! <span class="x" id="co">✕</span></div>
    <div class="body" style="text-align:center">
      <div style="font-size:56px">🛢️</div>
      <p class="qprompt" style="font-size:20px">You've found an <b>oil field</b>! Drop in a well to pump it and earn big points.</p>
      <div class="helper">A new 🛢️ Oil Well is now available in the Build menu — place it right on the oil field.</div>
    </div>
    <div class="foot">
      <button class="btn gold" id="oilBuild" style="flex:2">🛢️ Drop in a Well (free)</button>
      <button class="btn skip" id="oilLater">Later</button>
    </div></div>`);
  o.querySelector("#co").onclick=closeOverlay;
  o.querySelector("#oilLater").onclick=closeOverlay;
  o.querySelector("#oilBuild").onclick=()=>{
    closeOverlay();
    placeMode=true; placeCode="well"; placeOil=of;
    showBanner("Tap the glowing 🛢️ oil field to drop in your well", true);
    centerOn(of.x, of.y);
  };
}

/* ============================================================
   ZOOM / PAN / SCROLL
   ============================================================ */
function clampZoom(z){ return Math.max(0.55, Math.min(2.0, z)); }
function zoomAt(factor, cx, cy){
  cx=cx??view.w/2; cy=cy??view.h/2;
  const before=screenToIso(cx,cy);
  zoom=clampZoom(zoom*factor);
  const after=isoToScreen(before.tx,before.ty);
  cam.x += cx-after.x; cam.y += cy-after.y;
}
cv.addEventListener("wheel",e=>{ e.preventDefault(); zoomAt(e.deltaY<0?1.12:0.89, e.clientX, e.clientY); },{passive:false});

// pan + tap
let drag=null, moved=false, pinch=null;
let hoverTile=null;
cv.addEventListener("pointerdown",e=>{
  if(placeMode||layMode){ return; }     // tap handled on pointerup
  drag={x:e.clientX,y:e.clientY,cx:cam.x,cy:cam.y}; moved=false; cv.setPointerCapture(e.pointerId);
});
cv.addEventListener("pointermove",e=>{
  if(placeMode||layMode){ hoverTile=screenToIso(e.clientX,e.clientY); return; }
  if(!drag) return;
  const ddx=e.clientX-drag.x, ddy=e.clientY-drag.y;
  if(Math.abs(ddx)+Math.abs(ddy)>4) moved=true;
  cam.x=drag.cx+ddx; cam.y=drag.cy+ddy;
});
cv.addEventListener("pointerup",e=>{
  if(placeMode){ const it=screenToIso(e.clientX,e.clientY); tryPlaceAt(it.ix,it.iy); return; }
  if(layMode){ const it=screenToIso(e.clientX,e.clientY); tryLayAt(it.ix,it.iy); return; }
  drag=null;
  if(moved){ moved=false; return; }   // it was a pan, not a tap
  // it was a tap
  if(selWorker){
    const it=screenToIso(e.clientX,e.clientY);
    assignWorkerTo(it.ix,it.iy);
    return;
  }
  // worker first (they sit on top), then building
  const w=workerAtScreen(e.clientX,e.clientY);
  if(w){ selectWorker(w); return; }
  const b=buildingAtScreen(e.clientX,e.clientY);
  if(b){ openUpgrade(b); return; }
});
function buildingAtScreen(sx,sy){
  let best=null, bd=44;
  for(const b of S.buildings){
    const p=isoToScreen(b.x,b.y);
    const dpx=Math.hypot(p.x-sx, p.y-sy - (TH*zoom)*0.6);
    if(dpx<bd){ bd=dpx; best=b; }
  }
  return best;
}
/* ============================================================
   HERO STORIES — tap a building or worker to meet them
   ============================================================ */
// maps building codes + worker types to a hero portrait file + a short kid story
const HERO = {
  // buildings
  townhall:{img:"legislature", title:"The Alberta Legislature", story:"This is the heart of your province! Long ago it started as a tiny log cabin. As your village grew, it became the grand Legislature in Edmonton \u2014 a beautiful domed building beside the North Saskatchewan River. Inside, people make the rules that keep Alberta fair and safe for everyone."},
  station:{img:"station", title:"The Train Station", story:"All aboard! The station is where mighty trains stop to load wheat, wood and shiny crystals. From here the railway carries your goods across the prairies and through the Rocky Mountains. Listen for the whistle \u2014 here comes another train!"},
  house:{img:"cabin", title:"The Cozy Cabin", story:"Home sweet home! After a long day of work, your villagers warm up by the fire in this little wooden cabin. Pioneers built cabins just like this when they first came to Alberta, using logs from the forest."},
  farm:{img:"farm", title:"The Wheat Farm", story:"Golden wheat waves in the warm prairie wind. Alberta farmers grow so much wheat that it feeds people all over the world. At harvest time the whole field turns the colour of sunshine."},
  mill:{img:"sawmill", title:"The Sawmill", story:"Buzz! The sawmill turns tall forest trees into smooth planks of wood. Every cabin, tower and fence in your village is built from the lumber that comes out of here."},
  lab:{img:"lab", title:"The Mine Shaft", story:"Deep in the Rocky Mountains, brave miners dig for sparkling crystals. These gems are rare and precious \u2014 they help power your most amazing buildings."},
  tower:{img:"tower", title:"The Grain Tower", story:"This tall tower stores all your grain and keeps it safe and dry. You can see it from far across the prairie \u2014 a proud landmark for your growing village."},
  well:{img:"well", title:"The Oil Well", story:"Pump, pump, pump! Hidden deep under Alberta is black gold \u2014 oil! This well brings it up from far below the ground, and it earns your village lots of points."},
  datacenter:{img:"datacenter", title:"The AI Data Centre", story:"Welcome to the future! This humming data centre is full of smart computers. It powers clever robots that help your villagers work faster than ever before."},
  // workers
  farmer:{img:"farmer", title:"The Farmer", story:"Meet the farmer! Up before sunrise, they plant the seeds and gather the golden wheat. Rain or shine, the farmer keeps your whole village well fed."},
  lumberjack:{img:"lumberjack", title:"The Lumberjack", story:"Timber! The lumberjack is strong and brave, working in the tall Alberta forest. With a steady axe they bring back the wood that builds your village."},
  miner:{img:"miner", title:"The Miner", story:"With a bright headlamp and a trusty pick, the miner explores dark tunnels deep in the mountains, hunting for glittering crystals and precious oil."},
  builder:{img:"builder", title:"The Builder", story:"Hard hat on! The builder turns wood and stone into wonderful buildings. Every tower and home in your village was raised by their clever hands."},
  explorer:{img:"explorer", title:"The Explorer", story:"Adventure awaits! The explorer paddles rivers and climbs hills to discover new land and hidden treasure. Wherever the map is foggy, the explorer leads the way."}
};
function openHero(key){
  const h=HERO[key]; if(!h){ return; }
  const o=overlay(`<div class="card herocard"><div class="top" style="background:linear-gradient(#6a4fa0,#3c2a63)">
      <span>\uD83D\uDCD6</span> ${h.title} <span class="x" id="heroX">\u2715</span></div>
    <div class="body" style="text-align:center">
      <img src="assets/hero/${h.img}.jpg" alt="${h.title}" class="heroimg"
           onerror="this.style.display='none'"/>
      <p class="herostory">${h.story}</p>
    </div>
    <div class="foot"><button class="btn green" id="heroDone" style="flex:1">\u2b50 Great story!</button></div></div>`);
  o.querySelector("#heroX").onclick=closeOverlay;
  o.querySelector("#heroDone").onclick=closeOverlay;
}

function openUpgrade(b){
  const B=BUILDINGS[b.code];
  const title=buildingTitle(b);
  const atMax = b.lvl>=B.max;
  const upName = UPGRADE_NAMES[b.code] ? UPGRADE_NAMES[b.code][Math.min(b.lvl, UPGRADE_NAMES[b.code].length-1)] : null;
  let costRow="", btn="";
  if(atMax){
    costRow=`<div class="cost" style="font-size:16px">⭐ Fully upgraded (Lv${B.max})</div>`;
    btn=`<button class="btn skip" id="upClose" style="flex:1">Done</button>`;
  }else{
    const cost=buildCost(b.code, b.lvl+1);
    const can=S.food>=cost.f&&S.wood>=cost.w&&S.crystal>=cost.c;
    const cs=(cost.f||cost.w||cost.c)?`🍓${cost.f} 🪵${cost.w} ${cost.c?`💎${cost.c}`:""}`:"FREE";
    costRow=`<div class="cost" style="font-size:16px">Next: <b>${upName||("Lv"+(b.lvl+1))}</b> — ${cs}</div>`;
    btn=`<button class="btn green" id="upDo" style="flex:2" ${can?"":"disabled style=opacity:.5"}>⬆️ Upgrade</button>
         <button class="btn skip" id="upClose">Close</button>`;
  }
  // Town Hall gets a secret cheat-code box (handy on mobile, no keyboard shortcut needed)
  const cheatRow = (b.code==="townhall") ? `
      <div style="margin-top:14px;padding-top:12px;border-top:1px dashed #ffffff44">
        <div class="helper" style="margin-bottom:6px">🔑 Secret code</div>
        <div style="display:flex;gap:8px;justify-content:center">
          <input id="cheatIn" class="cheat-in" placeholder="enter code" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" />
          <button class="btn gold" id="cheatGo" style="padding:10px 16px;font-size:18px">Go</button>
        </div>
      </div>` : "";
  // Train Station gets a railway control panel (lay track + upgrade trains)
  const stationRow = (b.code==="station") ? `
      <div style="margin-top:14px;padding-top:12px;border-top:1px dashed #ffffff44;text-align:left">
        <div class="helper" style="margin-bottom:8px;text-align:center">🚂 Railway Controls — speed ×${(S.trainSpeed||1).toFixed(2)} · ${(S.trainCars||1)} car${(S.trainCars||1)>1?"s":""} · ${(S.trains||[]).length} train${(S.trains||[]).length===1?"":"s"}</div>
        <div class="trainbtns">
          <button class="btn blue" id="layRail">🛤️ Lay Track</button>
          <button class="btn skip" id="layRoad">🛣️ Lay Road</button>
        </div>
        <div class="trainbtns" style="margin-top:8px">
          <button class="btn green" id="trCar">➕🚃 Add Car<br><small>🪵25 💎5</small></button>
          <button class="btn green" id="trSpeed">⚡ Faster<br><small>🍓20 💎10</small></button>
          <button class="btn gold" id="trNew">🚂 New Train<br><small>🍓30 🪵30</small></button>
        </div>
      </div>` : "";
  const o=overlay(`<div class="card"><div class="top" style="background:linear-gradient(#4f93d6,#1f4e84)">
      <span>${B.emoji}</span> ${title} <span class="x" id="upX">✕</span></div>
    <div class="body" style="text-align:center">
      <div style="font-size:54px">${B.emoji}</div>
      <p class="qprompt" style="font-size:18px">${B.desc} · Level ${b.lvl}</p>
      ${costRow}
      ${cheatRow}
      ${stationRow}
    </div>
    <div class="foot">
      <button class="btn purple" id="upStory">📖 Story</button>
      ${btn}
    </div></div>`);
  o.querySelector("#upX").onclick=closeOverlay;
  const cl=o.querySelector("#upClose"); if(cl) cl.onclick=closeOverlay;
  const upBtn=o.querySelector("#upDo");
  if(upBtn) upBtn.onclick=()=>{ closeOverlay(); chooseBuild(b.code); };
  const storyBtn=o.querySelector("#upStory");
  if(storyBtn) storyBtn.onclick=()=>{ closeOverlay(); openHero(b.code); };
  // wire railway controls
  if(b.code==="station"){
    const lr=o.querySelector("#layRail"); if(lr) lr.onclick=()=>startLayMode("rail");
    const rd=o.querySelector("#layRoad"); if(rd) rd.onclick=()=>startLayMode("road");
    const car=o.querySelector("#trCar");
    if(car) car.onclick=()=>{
      if(S.wood<25||S.crystal<5){ toast("Need 🪵25 💎5 to add a car."); return; }
      S.wood-=25; S.crystal-=5; S.trainCars=(S.trainCars||1)+1;
      toast("Added a cargo car! 🚃"); floatReward("🚃 longer train!","#6a4fa0");
      refreshHUD(); save(); closeOverlay(); openUpgrade(b);
    };
    const sp=o.querySelector("#trSpeed");
    if(sp) sp.onclick=()=>{
      if((S.trainSpeed||1)>=3){ toast("Your trains are already super fast! ⚡"); return; }
      if(S.food<20||S.crystal<10){ toast("Need 🍓20 💎10 to speed up."); return; }
      S.food-=20; S.crystal-=10; S.trainSpeed=Math.min(3,(S.trainSpeed||1)*1.25);
      toast("Trains go faster now! ⚡"); floatReward("⚡ faster trains!","#6a4fa0");
      refreshHUD(); save(); closeOverlay(); openUpgrade(b);
    };
    const nt=o.querySelector("#trNew");
    if(nt) nt.onclick=()=>{
      if(rails.size<4){ toast("Lay more track first so the train has a route! 🛤️"); return; }
      if(S.food<30||S.wood<30){ toast("Need 🍓30 🪵30 for a new train."); return; }
      if((S.trains||[]).length>=4){ toast("That's a busy railway — 4 trains is the max! 🚂"); return; }
      S.food-=30; S.wood-=30;
      if(spawnTrain(trainKindForAge())){ toast("A new train rolls in! 🚂"); floatReward("🚂 new train!","#b8860b"); }
      refreshHUD(); save(); closeOverlay(); openUpgrade(b);
    };
  }
  // wire the cheat box
  const ci=o.querySelector("#cheatIn"), cg=o.querySelector("#cheatGo");
  if(ci && cg){
    const tryCode=()=>{
      const v=(ci.value||"").trim().toLowerCase();
      if(v===CHEAT_WORD){ closeOverlay(); grantDatacenterCheat(); }
      else { ci.value=""; ci.placeholder="try again…"; toast("That's not the secret code 🤫"); }
    };
    cg.onclick=tryCode;
    ci.addEventListener("keydown",e=>{ if(e.key==="Enter") tryCode(); });
  }
}
cv.addEventListener("pointercancel",()=>{drag=null;});

// pinch zoom (two-finger)
const activeTouches=new Map();
cv.addEventListener("touchstart",e=>{
  for(const t of e.changedTouches) activeTouches.set(t.identifier,{x:t.clientX,y:t.clientY});
  if(activeTouches.size===2){ const [a,b]=[...activeTouches.values()]; pinch={d:Math.hypot(a.x-b.x,a.y-b.y), z:zoom}; drag=null; }
},{passive:true});
cv.addEventListener("touchmove",e=>{
  for(const t of e.changedTouches){ if(activeTouches.has(t.identifier)) activeTouches.set(t.identifier,{x:t.clientX,y:t.clientY}); }
  if(pinch && activeTouches.size>=2){ const [a,b]=[...activeTouches.values()]; const nd=Math.hypot(a.x-b.x,a.y-b.y);
    const mx=(a.x+b.x)/2, my=(a.y+b.y)/2; const target=clampZoom(pinch.z*(nd/pinch.d));
    const before=screenToIso(mx,my); zoom=target; const after=isoToScreen(before.tx,before.ty); cam.x+=mx-after.x; cam.y+=my-after.y;
  }
},{passive:true});
cv.addEventListener("touchend",e=>{ for(const t of e.changedTouches) activeTouches.delete(t.identifier); if(activeTouches.size<2) pinch=null; },{passive:true});

document.getElementById("zIn").onclick=()=>zoomAt(1.18);
document.getElementById("zOut").onclick=()=>zoomAt(0.85);
document.getElementById("zHome").onclick=()=>{ zoom=1; centerOn(CENTER,CENTER); };
const zShotBtn=document.getElementById("zShot");
if(zShotBtn) zShotBtn.onclick=()=>saveScreenshot();
function saveScreenshot(){
  try{
    // draw a small watermark title onto a copy so the saved PNG has a caption
    const tmp=document.createElement("canvas"); tmp.width=cv.width; tmp.height=cv.height;
    const tc=tmp.getContext("2d"); tc.drawImage(cv,0,0);
    tc.font=`${22*DPR}px 'Baloo 2', sans-serif`; tc.textAlign="left";
    const label=`Age of Alberta \u2014 ${S.name||"My Village"}  \u2b50 ${S.score||0}`;
    tc.lineWidth=4*DPR; tc.strokeStyle="rgba(0,0,0,0.55)"; tc.strokeText(label, 16*DPR, tmp.height-18*DPR);
    tc.fillStyle="#fff"; tc.fillText(label, 16*DPR, tmp.height-18*DPR);
    const dataUrl=tmp.toDataURL("image/png");
    const stamp=new Date().toISOString().slice(0,19).replace(/[:T]/g,"-");
    const fname=`age-of-alberta-${stamp}.png`;
    // Show the picture INSIDE the game (download links are blocked in the preview
    // iframe). The child can long-press / right-click the image to save it, and the
    // Save button still triggers a real download when the game is opened full-page.
    const o=overlay(`<div class="card" style="max-width:560px">
        <div class="top" style="background:linear-gradient(#6a4fa0,#3c2a63)">
          <span>\uD83D\uDCF7</span> Your Picture <span class="x" id="shotX">\u2715</span></div>
        <div class="body" style="text-align:center">
          <img id="shotImg" src="${dataUrl}" alt="village photo"
               style="max-width:100%;max-height:46vh;border-radius:12px;border:3px solid #f1e4c3;box-shadow:0 6px 18px rgba(0,0,0,.35)"/>
          <p class="qprompt" style="font-size:15px;margin-top:10px">Press and hold the picture (or right\u2011click) to save it to your device.</p>
        </div>
        <div class="foot">
          <button class="btn green" id="shotSave" style="flex:2">\uD83D\uDCBE Save Picture</button>
          <button class="btn" id="shotClose">Done</button>
        </div></div>`);
    const close=()=>closeOverlay();
    o.querySelector("#shotX").onclick=close;
    o.querySelector("#shotClose").onclick=close;
    o.querySelector("#shotSave").onclick=()=>{
      // Best-effort real download (works full-page; harmless if blocked in iframe).
      try{
        tmp.toBlob(b=>{
          if(!b){ toast("Long\u2011press the picture to save it."); return; }
          const url=URL.createObjectURL(b);
          const a=document.createElement("a");
          a.href=url; a.download=fname; a.target="_blank"; a.rel="noopener";
          document.body.appendChild(a); a.click(); a.remove();
          setTimeout(()=>URL.revokeObjectURL(url), 4000);
          toast("\uD83D\uDCBE Saved! If nothing downloaded, long\u2011press the picture.");
        }, "image/png");
      }catch(_){ toast("Long\u2011press the picture to save it."); }
    };
  }catch(err){ toast("Could not take the picture on this device."); }
}

/* ============================================================
   HUD + helpers
   ============================================================ */
function refreshHUD(){
  document.getElementById("rFood").textContent=S.food;
  document.getElementById("rWood").textContent=S.wood;
  document.getElementById("rCrystal").textContent=S.crystal;
  document.getElementById("rScore").textContent=S.score;
  const a=AGES[S.age||0];
  document.getElementById("levelPill").textContent=a.emoji+" "+a.name;
}
function toast(msg){
  const t=document.createElement("div"); t.className="toast"; t.textContent=msg;
  document.body.appendChild(t); setTimeout(()=>t.remove(),1900);
}
function floatReward(text,color){
  const g=document.createElement("div"); g.className="ghost"; g.textContent=text; g.style.color=color||"#2c6b3a";
  g.style.left=(view.w/2-20)+"px"; g.style.top=(view.h/2)+"px"; document.body.appendChild(g);
  setTimeout(()=>g.remove(),1000);
}
function closeOverlay(){ const o=document.querySelector(".overlay"); if(o)o.remove(); }
function overlay(html){
  closeOverlay();
  const o=document.createElement("div"); o.className="overlay";
  o.innerHTML=html; document.body.appendChild(o);
  o.addEventListener("pointerdown",e=>{ if(e.target===o) closeOverlay(); });
  return o;
}
const banner=document.getElementById("placeBanner");
const bannerText=document.getElementById("placeText");
function showBanner(txt,withCancel){
  bannerText.textContent=txt;
  document.getElementById("placeCancel").style.display=withCancel?"inline-flex":"none";
  banner.classList.add("show");
}
function hideBanner(){ banner.classList.remove("show"); }

/* ============================================================
   LEARN & EARN — question flow (compact modal + SKIP)
   ============================================================ */
let current=null, answered=false, lastSubject=null;
function difficultyForLevel(){ const n=S.buildings.length; return n<=2?1: n<=4?2:3; }

/* subject picker shown first; then questions of that subject (or surprise) */
function openLearn(){
  const o=overlay(`<div class="card"><div class="top" style="background:linear-gradient(#5cb56b,#2c6b3a)">
      <span>📖</span> Pick a Challenge <span class="x" id="cpk">✕</span></div>
    <div class="body">
      <div class="helper" style="margin-bottom:14px">What would you like to practise, ${S.name}?</div>
      <div class="pickgrid">
        <div class="pcard pMath" data-s="Math"><div class="emoji">➗</div><h4>Math</h4><p>Add, subtract & more</p></div>
        <div class="pcard pSpell" data-s="Spelling"><div class="emoji">🔤</div><h4>Spelling</h4><p>Spell & unscramble</p></div>
        <div class="pcard pRead" data-s="Reading"><div class="emoji">📚</div><h4>Reading</h4><p>Read & answer</p></div>
        <div class="pcard pSocial" data-s="Alberta"><div class="emoji">🍁</div><h4>Alberta</h4><p>Maps, places & history</p></div>
        <div class="pcard pSurprise" data-s="surprise"><div class="emoji">🎲</div><h4>Surprise Me!</h4><p>A mix of everything</p></div>
      </div>
    </div></div>`);
  o.querySelector("#cpk").onclick=closeOverlay;
  o.querySelectorAll(".pcard").forEach(c=>c.onclick=()=>{ startChallenge(c.dataset.s); });
}
function makeForSubject(subj, diff){
  if(subj==="Math") return makeMath(diff);
  if(subj==="Spelling") return makeSpelling(diff);
  if(subj==="Reading") return makeReading(diff);
  if(subj==="Alberta") return makeSocial(diff);
  return makeChallenge(diff);
}
function startChallenge(subj){
  lastSubject = subj;
  showQuestion();
}
function nextQuestion(){ showQuestion(); }
function showQuestion(){
  answered=false;
  current = makeForSubject(lastSubject||"surprise", difficultyForLevel());
  const c=current;
  const cls = c.subject==="Math"?"subjectMath": c.subject==="Spelling"?"subjectSpelling": c.subject==="Alberta"?"subjectSocial":"subjectReading";
  const icon = c.subject==="Math"?"➗": c.subject==="Spelling"?"🔤": c.subject==="Alberta"?"🍁":"📚";

  let qhtml="";
  if(c.qtype==="number"){
    if(c.mathDisplay){ qhtml=`<div class="qmath">${c.prompt} = ?</div>`; }
    else { qhtml=`<p class="qprompt">${c.prompt}</p>`; }
    qhtml+=`<div class="typed"><input id="ansIn" inputmode="numeric" pattern="[0-9]*" placeholder="?"></div>`;
    qhtml+=`<div class="helper">Type with your keyboard, or tap the numbers below.</div>`;
    qhtml+=numPad();
  }else if(c.qtype==="letters"){
    qhtml=`<p class="qprompt">${c.prompt}</p><div class="hintword">${c.hint}</div>`;
    qhtml+=`<div class="typed"><input id="ansIn" placeholder="type here" autocapitalize="off"></div>`;
    qhtml+=`<div class="helper">Type with your keyboard, or tap the letters below.</div>`;
    qhtml+=letterPad();
  }else{
    qhtml = c.passage ? `<div class="passage">${c.passage}</div><p class="qprompt reading-q">${c.prompt}</p>`
                      : `<p class="qprompt">${c.prompt}</p>`;
    qhtml+=`<div class="choices">`+ c.choices.map((ch)=>`<div class="choice" data-v="${ch.replace(/"/g,'&quot;')}">${ch}</div>`).join("")+`</div>`;
  }

  const o=overlay(`<div class="card">
    <div class="top ${cls}"><span>${icon}</span> ${c.subject} Challenge
      <span class="x" id="closeQ">✕</span></div>
    <div class="body">
      ${qhtml}
      <div class="fb" id="fb"></div>
      <div class="outcome">📋 Aligned to: ${c.outcome}</div>
    </div>
    <div class="foot" id="modalFoot">
      ${c.qtype!=="choice"?`<button class="btn green" id="checkBtn" style="flex:2">✔ Check Answer</button>`:`<div style="flex:2"></div>`}
      <button class="btn skip" id="skipBtn">Skip ⏭</button>
    </div>
  </div>`);

  o.querySelector("#closeQ").onclick=closeOverlay;
  o.querySelector("#skipBtn").onclick=nextQuestion;   // skip → next question (same subject)
  const inp=o.querySelector("#ansIn");
  if(c.qtype==="choice"){
    o.querySelectorAll(".choice").forEach(ch=>ch.onclick=()=>{ if(answered)return; gradeChoice(ch); });
  }else{
    o.querySelector("#checkBtn").onclick=()=>grade(inp.value);
    o.querySelectorAll(".key").forEach(k=>k.onclick=()=>{
      const v=k.dataset.k;
      if(v==="del") inp.value=inp.value.slice(0,-1);
      else if(v==="ok") grade(inp.value);
      else inp.value+=v;
    });
    // real keyboard works for BOTH numbers and letters now
    if(c.qtype==="number"){
      inp.addEventListener("input",()=>{ inp.value=inp.value.replace(/[^0-9-]/g,""); });
    }
    inp.addEventListener("keydown",e=>{ if(e.key==="Enter") grade(inp.value); });
    if(c.qtype==="letters"){ setTimeout(()=>inp.focus(),50); }
  }
}
function numPad(){
  const keys=["1","2","3","4","5","6","7","8","9","del","0","ok"];
  return `<div class="pad padnum">`+keys.map(k=>{
    if(k==="del")return `<div class="key del" data-k="del">⌫</div>`;
    if(k==="ok")return `<div class="key act" data-k="ok">✔</div>`;
    return `<div class="key" data-k="${k}">${k}</div>`;}).join("")+`</div>`;
}
function letterPad(){
  const rows="abcdefghijklmnopqrstuvwxyz".split("");
  let h=`<div class="pad padletters">`+rows.map(k=>`<div class="key" data-k="${k}">${k}</div>`).join("");
  h+=`<div class="key del" data-k="del" style="grid-column:span 9">⌫ Delete</div></div>`;
  return h;
}

function gradeChoice(el){
  const v=el.dataset.v; const ok = v===current.answer; answered=true;
  document.querySelectorAll(".choice").forEach(c=>{
    if(c.dataset.v===current.answer) c.classList.add("correct");
    if(c===el && !ok) c.classList.add("wrong");
  });
  finishGrade(ok);
}
function norm(s){return String(s).trim().toLowerCase();}
function grade(val){
  if(answered) return;
  const ok = norm(val)===norm(current.answer);
  answered=true;
  finishGrade(ok);
}
function finishGrade(ok){
  const fb=document.getElementById("fb");
  const key=current.subject+":"+current.skill;
  const sk = S.skills[key] || {att:0,ok:0,streak:0};
  sk.att++; if(ok){sk.ok++; sk.streak++;} else sk.streak=0;
  S.skills[key]=sk; S.answered++;
  if(ok){
    const mult = difficultyForLevel();
    const f=ri(6,12)*mult, w=ri(5,10)*mult, c= current.subject==="Math"?ri(1,3)*mult:ri(0,2)*mult;
    const pts=ri(8,14)*mult + sk.streak*2;
    S.food+=f; S.wood+=w; S.crystal+=c; S.score+=pts;
    fb.className="fb good"; fb.textContent=`🎉 Correct! +${pts} score`;
    fb.innerHTML+=`<div class="reward"><span>🍓+${f}</span><span>🪵+${w}</span>${c?`<span>💎+${c}</span>`:""}</div>`;
    floatReward("+"+pts+"⭐","#2c6b3a");
  }else{
    fb.className="fb bad"; fb.textContent=`Almost! The answer is "${current.answer}". Try the next one! 💪`;
  }
  refreshHUD(); save();
  // swap footer: replace Check with Next
  const foot=document.getElementById("modalFoot");
  if(foot){
    const cb=document.getElementById("checkBtn"); if(cb) cb.remove();
    const sb=document.getElementById("skipBtn"); if(sb) sb.remove();
    foot.insertAdjacentHTML("afterbegin",`<button class="btn blue" id="nextBtn" style="flex:2">Next Question ▶</button><button class="btn skip" id="pickBtn">Change Subject</button>`);
    document.getElementById("nextBtn").onclick=nextQuestion;
    document.getElementById("pickBtn").onclick=openLearn;
    maybeAdvanceAge();
  }
}

/* ============================================================
   AGES + TRANSPORT UNITS
   ============================================================ */
function maybeAdvanceAge(){
  const want = ageForScore(S.score);
  if(want > (S.age||0)){
    S.age = want;
    const a = AGES[S.age];
    spawnTransport(a.unit);
    refreshHUD(); save();
    setTimeout(()=>celebrateAge(a), 250);
  }
}
function celebrateAge(a){
  const o=overlay(`<div class="card"><div class="top" style="background:linear-gradient(#f2c75c,#b8860b);color:#3d2c05">
      <span>${a.emoji}</span> New Age Unlocked! <span class="x" id="cag" style="color:#3d2c05">✕</span></div>
    <div class="body" style="text-align:center">
      <div style="font-size:64px">${a.emoji}</div>
      <p class="qprompt" style="font-size:24px;color:#b8860b">Welcome to the <b>${a.name}</b>!</p>
      <p class="qprompt" style="font-size:18px">${a.blurb}</p>
    </div>
    <div class="foot"><button class="btn gold" id="agOk" style="flex:1">Hooray! 🎉</button></div></div>`);
  o.querySelector("#cag").onclick=closeOverlay;
  o.querySelector("#agOk").onclick=closeOverlay;
}
function spawnTransport(unit){
  if(!S.transport) S.transport=[];
  // remove older-era units so only the current era's transport roams
  S.transport = S.transport.filter(u=>u.unit===unit);
  if(S.transport.some(u=>u.unit===unit)) return;
  S.transport.push({unit, tx:CENTER+1, ty:CENTER, fromX:CENTER, fromY:CENTER,
    toX:CENTER, toY:CENTER, ph:Math.random()*6, carry:false, wait:0, legT:0});
}
function ensureTransportForAge(){
  const a=AGES[S.age||0];
  if(a) spawnTransport(a.unit);
}
function jobBuildingList(){ return S.buildings.filter(b=>BUILDINGS[b.code].worker); }
function updateTransport(t){
  const dt = Math.min(40, t-(updateTransport.last||t)); updateTransport.last=t;
  const hubs = jobBuildingList();
  const th = S.buildings.find(b=>b.code==="townhall") || {x:CENTER,y:CENTER};
  for(const u of (S.transport||[])){
    if(u.wait>0){ u.wait-=dt; continue; }
    const dx=u.toX-u.tx, dy=u.toY-u.ty, d=Math.hypot(dx,dy);
    if(d<0.08){
      // arrived at a stop
      if(u.carry){
        // delivered to town hall: small bonus
        u.carry=false; u.wait=ri(500,1100);
        S.score+=2; addFloatAt(u.tx,u.ty,"+2⭐","#b8860b"); refreshHUD(); save();
        // next: go pick up from a random job building
        const b = hubs.length?pick(hubs):th;
        u.toX=b.x; u.toY=b.y;
      }else{
        // picked up cargo: head to town hall
        u.carry=true; u.wait=ri(400,900);
        u.toX=th.x; u.toY=th.y;
      }
    }else{
      const spd = u.unit==="drone"?0.026 : u.unit==="robot"?0.022 : 0.016;
      const step=Math.min(spd*dt, d);
      u.tx += dx/d*step; u.ty += dy/d*step;
    }
  }
}
function addFloatAt(tx,ty,text,color){
  const p=isoToScreen(tx,ty);
  const g=document.createElement("div"); g.className="ghost"; g.textContent=text; g.style.color=color||"#2c6b3a";
  g.style.left=p.x+"px"; g.style.top=(p.y-30)+"px"; document.body.appendChild(g);
  setTimeout(()=>g.remove(),1000);
}

/* ============================================================
   BUILD  — choose then PLACE on a tile
   ============================================================ */
let placeMode=false, placeCode=null, placeOil=null, placeFree=false;
function buildCost(code, lvl){ const B=BUILDINGS[code]; const m=lvl; return {f:B.costF*m, w:B.costW*m, c:B.costC*m}; }
// upgrade name flavor: Town Hall -> Legislature; others get a tier word
const UPGRADE_NAMES = {
  townhall:["Town Hall","Village Hall","County Hall","City Hall","Legislature"],
};
function buildingTitle(b){
  const names=UPGRADE_NAMES[b.code];
  if(names) return names[Math.min(b.lvl-1, names.length-1)];
  return BUILDINGS[b.code].name;
}
function openBuild(){
  const existing = {}; S.buildings.forEach(b=>existing[b.code]=b);
  // include well only if an oil field has been found; data centre always shown (locked until AI Age)
  const order = BUILD_ORDER
    .concat( (S.oilFields||[]).some(o=>o.found) ? ["well"] : [] )
    .concat( ["datacenter"] );
  const cards = order.map(code=>{
    const B=BUILDINGS[code];
    const have = existing[code];
    const lvl = have?have.lvl:0;
    // age-gated buildings (e.g. AI Data Centre) appear locked until that era is reached
    if(B.minAge!=null && (S.age||0) < B.minAge){
      return `<div class="bcard locked"><div class="emoji">${B.emoji}</div><h4>${B.name}</h4>
        <div class="cost">${B.desc}</div>
        <div class="cost" style="color:#6a4f10;font-weight:700">🔒 Reach ${AGES[B.minAge].name} (⭐${AGES[B.minAge].score})</div></div>`;
    }
    if(have && lvl>=B.max){
      return `<div class="bcard locked"><div class="emoji">${B.emoji}</div><h4>${B.name}</h4>
        <div class="cost">⭐ MAX (Lv${B.max})</div></div>`;
    }
    const cost=buildCost(code, lvl+1);
    const can = S.food>=cost.f && S.wood>=cost.w && S.crystal>=cost.c;
    // upgrade preview name (e.g. Legislature for town hall at top tier)
    const upName = UPGRADE_NAMES[code] ? UPGRADE_NAMES[code][Math.min(lvl, UPGRADE_NAMES[code].length-1)] : null;
    const title = have ? buildingTitle(have) : B.name;
    const label = have? (upName ? `Upgrade → ${upName}` : `Upgrade → Lv${lvl+1}`) : "Place on map";
    const costStr = (cost.f||cost.w||cost.c) ? `🍓${cost.f} 🪵${cost.w} ${cost.c?`💎${cost.c}`:""}` : "FREE";
    return `<div class="bcard ${can?"":"locked"}" data-code="${code}">
        <div class="emoji">${B.emoji}</div><h4>${title}</h4>
        <div class="cost">${B.desc}</div>
        <div class="cost">${costStr}</div>
        <div class="cost" style="color:#2c6b3a;font-weight:700">${label}</div></div>`;
  }).join("");
  const o=overlay(`<div class="card"><div class="top" style="background:linear-gradient(#f2c75c,#b8860b);color:#3d2c05">
      <span>🔨</span> Build &amp; Upgrade <span class="x" id="cb" style="color:#3d2c05">✕</span></div>
    <div class="body"><div class="helper" style="margin-bottom:12px">Earn resources by learning, then build your Alberta village.</div>
    <div class="buildgrid">${cards}</div></div></div>`);
  o.querySelector("#cb").onclick=closeOverlay;
  o.querySelectorAll(".bcard[data-code]").forEach(card=>{
    card.onclick=()=>chooseBuild(card.dataset.code);
  });
}
function chooseBuild(code){
  const B=BUILDINGS[code];
  const have=S.buildings.find(b=>b.code===code);
  const lvl=have?have.lvl:0;
  if(have && lvl>=B.max) return;
  const cost=buildCost(code,lvl+1);
  if(S.food<cost.f||S.wood<cost.w||S.crystal<cost.c){ toast("Not enough resources — earn more! 📖"); return; }
  if(have){
    // upgrade in place — no placement needed
    S.food-=cost.f; S.wood-=cost.w; S.crystal-=cost.c;
    have.lvl++; S.score+=10;
    const tn=buildingTitle(have);
    toast(tn+" upgraded to Lv"+have.lvl+"! ✨");
    floatReward("⬆️ "+tn,"#b8860b");
    maybeAdvanceAge();
    refreshHUD(); save(); closeOverlay(); openBuild();
  }else{
    // enter placement mode
    closeOverlay();
    placeMode=true; placeCode=code; placeOil=null;
    showBanner(`Tap a glowing tile to place your ${B.name}`, true);
  }
}
function canPlaceAt(x,y){
  if(x<0||y<0||x>=MAP||y>=MAP) return false;
  if(!revealed.has(x+","+y)) return false;
  const t=terrainAt(x,y);
  if(t==="water"||t==="rock"||t==="mountain") return false;
  if(S.buildings.some(b=>b.x===x&&b.y===y)) return false;
  return true;
}
function validWellTile(x,y){
  return (S.oilFields||[]).some(o=>o.found && !o.built && o.x===x && o.y===y);
}
function tryPlaceAt(x,y){
  const code=placeCode; const B=BUILDINGS[code];
  // special: oil well must go on the discovered oil field
  if(code==="well"){
    const of = (S.oilFields||[]).find(o=>o.found && !o.built && o.x===x && o.y===y);
    if(!of){ toast("Drop the well on the glowing 🛢️ oil field!"); return; }
    of.built=true;
    S.buildings.push({code,x,y,lvl:1});
    addWorker("miner", x, y);
    S.score+=40; toast("Oil well built! +40 ⭐ 🛢️"); floatReward("🛢️ +40⭐","#6a4fa0");
    placeOil=null; maybeAdvanceAge();
    cancelPlace(); refreshHUD(); save(); return;
  }
  if(!canPlaceAt(x,y)){ toast("Can't build there — pick a green/dirt tile."); return; }
  if(!placeFree){
    const cost=buildCost(code,1);
    if(S.food<cost.f||S.wood<cost.w||S.crystal<cost.c){ toast("Not enough resources!"); cancelPlace(); return; }
    S.food-=cost.f; S.wood-=cost.w; S.crystal-=cost.c;
  }
  S.buildings.push({code,x,y,lvl:1});
  // spawn its worker
  if(B.worker) addWorker(B.worker, x, y);
  S.score+=10;
  toast(placeFree? ("🤖 "+B.name+" unlocked! ✨") : (B.name+" built! 🎉"));
  floatReward("🏗️ +"+B.name,"#b8860b");
  maybeAdvanceAge();
  cancelPlace(); refreshHUD(); save();
}
function cancelPlace(){ placeMode=false; placeCode=null; placeOil=null; placeFree=false; hideBanner(); hoverTile=null; }
document.getElementById("placeCancel").onclick=()=>{
  if(layMode){ cancelLay(); toast("Done building track."); return; }
  cancelPlace(); toast("Placement cancelled.");
};

/* ============================================================
   LAY MODE — tap tiles to build RAIL or ROAD (free, repeatable)
   ============================================================ */
let layMode=null; // "rail" | "road" | null
function startLayMode(kind){
  closeOverlay();
  layMode=kind; placeMode=false; hoverTile=null;
  const word = kind==="rail" ? "rail track" : "road";
  showBanner(`Tap tiles to lay ${word} \u2014 tap a track again to remove it. Tap Done when finished.`, true);
}
function cancelLay(){ layMode=null; hideBanner(); hoverTile=null; save(); }
function tryLayAt(x,y){
  if(x<0||y<0||x>=MAP||y>=MAP) return;
  if(!revealed.has(x+","+y)){ toast("Explore that land first! \uD83E\uDDED"); return; }
  const t=terrainAt(x,y);
  if(t==="water"||t==="mountain"||t==="rock"){ toast("Can't build track on water or mountains."); return; }
  if(S.buildings.some(b=>b.x===x&&b.y===y)){ toast("A building is already on that tile."); return; }
  const key=x+","+y;
  if(layMode==="rail"){
    if(rails.has(key)){ rails.delete(key); }
    else { rails.add(key); roads.delete(key); }
    S.rails=[...rails]; S.roads=[...roads];
    // make sure at least one train exists once we have a usable loop
    if(rails.size>=4 && (!S.trains||S.trains.length===0)) spawnTrain(trainKindForAge());
  }else if(layMode==="road"){
    if(roads.has(key)){ roads.delete(key); }
    else { roads.add(key); rails.delete(key); }
    S.rails=[...rails]; S.roads=[...roads];
  }
  save();
}

/* ============================================================
   EXPLORE + PROGRESS
   ============================================================ */
function openExplore(){
  const hidden = MAP*MAP - revealed.size;
  const found = S.resourceNodes.filter(n=>n.found).length;
  const total = S.resourceNodes.length;
  const o=overlay(`<div class="card"><div class="top" style="background:linear-gradient(#4f93d6,#1f4e84)">
    <span>🧭</span> Explore Alberta <span class="x" id="ce">✕</span></div>
    <div class="body">
      <div class="reward" style="margin-bottom:10px"><span>🗺️ ${revealed.size} tiles found</span><span>🌫️ ${hidden} hidden</span></div>
      <p class="helper" style="margin-bottom:14px">Send your explorer into the fog to reveal new land and discover hidden resources (${found}/${total} found so far).</p>
    </div>
    <div class="foot">
      <button class="btn blue" id="sendEx" style="flex:2" ${explorerActive?"disabled style=opacity:.5":""}>🧭 Send Explorer Out</button>
      <button class="btn skip" id="ceFoot">Close</button>
    </div></div>`);
  o.querySelector("#ce").onclick=closeOverlay;
  o.querySelector("#ceFoot").onclick=closeOverlay;
  o.querySelector("#sendEx").onclick=()=>{ closeOverlay(); sendExplorer(); };
}

/* ============================================================
   WORKSHEETS — printable PDF generator (Grades 1–6)
   ============================================================ */
function openWorksheets(){
  const o=overlay(`<div class="card" style="max-width:520px">
    <div class="top" style="background:linear-gradient(#3fb6ad,#1f7d77)">
      <span>\uD83D\uDCC4</span> Printable Worksheets <span class="x" id="wsx">\u2715</span></div>
    <div class="body">
      <div class="helper" style="margin-bottom:12px">Make a print-at-home worksheet from the Alberta curriculum. An answer key is included on the last page.</div>
      <label style="font-weight:700;display:block;margin:8px 0 4px">Grade</label>
      <div id="wsGrades" style="display:flex;gap:6px;flex-wrap:wrap">
        ${[1,2,3,4,5,6].map(g=>`<button class="btn ${g===3?'teal':'skip'} wsG" data-g="${g}" style="flex:1;min-width:54px;padding:10px 0">${g}</button>`).join("")}
      </div>
      <label style="font-weight:700;display:block;margin:14px 0 4px">Subject</label>
      <div id="wsSubs" style="display:flex;gap:6px;flex-wrap:wrap">
        ${[["Math","\u2797"],["Spelling","\uD83D\uDD24"],["Reading","\uD83D\uDCDA"],["Alberta","\uD83C\uDF41"],["Mixed","\uD83C\uDFB2"]].map((s,i)=>`<button class="btn ${i===0?'teal':'skip'} wsS" data-s="${s[0]}" style="flex:1;min-width:84px;padding:10px 4px">${s[1]} ${s[0]==='Alberta'?'Alberta':s[0]}</button>`).join("")}
      </div>
      <label style="font-weight:700;display:block;margin:14px 0 4px">How many questions?</label>
      <div id="wsCounts" style="display:flex;gap:6px">
        ${[8,12,16,20].map(n=>`<button class="btn ${n===12?'teal':'skip'} wsC" data-n="${n}" style="flex:1;padding:10px 0">${n}</button>`).join("")}
      </div>
    </div>
    <div class="foot">
      <button class="btn green" id="wsMake" style="flex:2">\uD83D\uDCC4 Make Worksheet</button>
      <button class="btn skip" id="wsClose">Done</button>
    </div></div>`);
  let sel={grade:3, subject:"Math", count:12};
  function wire(groupSel, cls, key, attr, cast){
    o.querySelectorAll(groupSel+" ."+cls).forEach(b=>b.onclick=()=>{
      o.querySelectorAll(groupSel+" ."+cls).forEach(x=>{ x.classList.remove("teal"); x.classList.add("skip"); });
      b.classList.remove("skip"); b.classList.add("teal");
      sel[key]=cast(b.dataset[attr]);
    });
  }
  wire("#wsGrades","wsG","grade","g",v=>parseInt(v,10));
  wire("#wsSubs","wsS","subject","s",v=>v);
  wire("#wsCounts","wsC","count","n",v=>parseInt(v,10));
  o.querySelector("#wsx").onclick=closeOverlay;
  o.querySelector("#wsClose").onclick=closeOverlay;
  o.querySelector("#wsMake").onclick=()=>{
    if(!window.Worksheets || !window.jspdf){ toast("Worksheets are still loading\u2014try again in a moment."); return; }
    try{
      const sheet=window.Worksheets.build(sel.grade, sel.subject, sel.count);
      const doc=window.Worksheets.makePDF(sheet);
      const fname=window.Worksheets.fileName(sheet);
      showWorksheetResult(doc, fname, sheet);
    }catch(err){ toast("Could not build the worksheet on this device."); }
  };
}
// Show the generated PDF inside the game (downloads are blocked in the preview
// iframe). Embeds a preview and offers Print + Save, which work full-page / on a
// real browser tab.
function showWorksheetResult(doc, fname, sheet){
  const dataUri = doc.output("datauristring");
  const blob = doc.output("blob");
  const blobUrl = URL.createObjectURL(blob);
  const subjName = sheet.subject==="Alberta"?"Alberta Studies":sheet.subject;
  const o=overlay(`<div class="card" style="max-width:600px">
    <div class="top" style="background:linear-gradient(#3fb6ad,#1f7d77)">
      <span>\uD83D\uDCC4</span> Grade ${sheet.grade} ${subjName} <span class="x" id="wrx">\u2715</span></div>
    <div class="body" style="text-align:center">
      <div style="max-height:46vh;overflow:auto;border:2px solid #d8c79a;border-radius:10px;background:#fff;text-align:left">${window.Worksheets.previewHTML(sheet)}</div>
      <p class="helper" style="margin-top:10px">${sheet.count} questions \u00b7 answer key included. Use <b>Print</b> to print at home, or <b>Save</b> to download the PDF.</p>
    </div>
    <div class="foot">
      <button class="btn green" id="wrPrint" style="flex:1">\uD83D\uDDA8\uFE0F Print</button>
      <button class="btn blue" id="wrSave" style="flex:1">\uD83D\uDCBE Save PDF</button>
      <button class="btn skip" id="wrClose">Done</button>
    </div></div>`);
  const cleanup=()=>{ try{URL.revokeObjectURL(blobUrl);}catch(e){} closeOverlay(); };
  o.querySelector("#wrx").onclick=cleanup;
  o.querySelector("#wrClose").onclick=cleanup;
  o.querySelector("#wrPrint").onclick=()=>{
    // open the PDF in a new tab for printing; fall back to the embedded frame
    const w=window.open(blobUrl,"_blank");
    if(w){ setTimeout(()=>{ try{ w.focus(); w.print(); }catch(e){} }, 700); }
    else {
      const f=o.querySelector("iframe");
      try{ f.contentWindow.focus(); f.contentWindow.print(); }
      catch(e){ toast("Open the game in a full tab to print."); }
    }
  };
  o.querySelector("#wrSave").onclick=()=>{
    try{
      const a=document.createElement("a");
      a.href=blobUrl; a.download=fname; a.target="_blank"; a.rel="noopener";
      document.body.appendChild(a); a.click(); a.remove();
      toast("\uD83D\uDCBE Saved! If nothing downloaded, use Print \u2192 Save as PDF.");
    }catch(e){
      // last resort: open the data URI so the child/parent can save manually
      window.open(dataUri,"_blank");
    }
  };
}
function openProgress(){
  const labels={"Math:add":"Addition","Math:sub":"Subtraction","Math:mult":"Multiplication","Math:place":"Place Value",
    "Math:fraction":"Fractions","Math:pattern":"Patterns","Spelling:spelling":"Spelling","Reading:comprehension":"Reading"};
  let rows=Object.entries(S.skills).map(([k,v])=>{
    const pct=v.att?Math.round(v.ok/v.att*100):0;
    return `<div style="margin:8px 0"><div style="display:flex;justify-content:space-between;font-weight:600">
      <span>${labels[k]||k}</span><span>${v.ok}/${v.att} · ${pct}%</span></div>
      <div style="height:14px;background:#eadfc4;border-radius:8px;overflow:hidden">
      <div style="height:100%;width:${pct}%;background:linear-gradient(#5cb56b,#2c6b3a)"></div></div></div>`;
  }).join("");
  if(!rows) rows=`<p class="helper">Answer some questions to see your progress here!</p>`;
  const total=S.answered, correct=Object.values(S.skills).reduce((a,v)=>a+v.ok,0);
  const o=overlay(`<div class="card"><div class="top" style="background:linear-gradient(#8a6cc4,#4a3478)">
    <span>🏅</span> ${S.name}'s Progress <span class="x" id="cp">✕</span></div>
    <div class="body">
      <div class="reward" style="margin-bottom:10px"><span>⭐ ${S.score}</span><span>✅ ${correct}/${total}</span><span>🏘️ ${S.buildings.length}</span></div>
      ${rows}
    </div>
    <div class="foot">
      <button class="btn skip" id="resetBtn" style="flex:1;background:linear-gradient(#c98,#a76)">↺ Start Over</button>
      <button class="btn blue" id="cpFoot" style="flex:1">Done</button>
    </div></div>`);
  o.querySelector("#cp").onclick=closeOverlay;
  o.querySelector("#cpFoot").onclick=closeOverlay;
  o.querySelector("#resetBtn").onclick=()=>{ if(confirm("Start a brand new village? This erases your progress.")){ S=JSON.parse(JSON.stringify(DEFAULT)); Store.set(SAVE_KEY,""); location.reload(); } };
}

/* ============================================================
   Wire up
   ============================================================ */
initReveal();
initResourceNodes();
initOilFields();
initTransport();
spawnWorkers();
ensureTransportForAge();   // make sure current Age's transport unit exists
initNetwork();             // rails/roads + free starter rail loop, station, first train
save();
centerOn(CENTER,CENTER);
requestAnimationFrame(render);

document.getElementById("btnLearn").onclick=openLearn;
document.getElementById("btnBuild").onclick=openBuild;
document.getElementById("btnExplore").onclick=openExplore;
document.getElementById("btnProgress").onclick=openProgress;
document.getElementById("btnSheets").onclick=openWorksheets;

/* ============================================================
   CHEAT CODE — type "glubish" (case-insensitive) anywhere to
   instantly unlock & place a free AI Data Centre in ANY era.
   ============================================================ */
function grantDatacenterCheat(){
  // make sure the AI Data Centre is unlocked regardless of current Age
  if((S.age||0) < (BUILDINGS.datacenter.minAge||0)){ S.age = BUILDINGS.datacenter.minAge; }
  ensureTransportForAge && ensureTransportForAge();
  // drop straight into free placement mode for the datacenter
  if(typeof cancelPlace==="function") cancelPlace();
  if(typeof closeOverlay==="function") closeOverlay();
  placeMode=true; placeCode="datacenter"; placeOil=null; placeFree=true;
  refreshHUD && refreshHUD(); save && save();
  showBanner("\uD83E\uDD16 GLUBISH! Free AI Data Centre unlocked — tap a glowing tile to place it", true);
}
let cheatBuf="";
const CHEAT_WORD="glubish";
window.addEventListener("keydown",e=>{
  // ignore typing into text fields (e.g. the name box / answer inputs)
  const tag=(e.target&&e.target.tagName)||"";
  if(tag==="INPUT"||tag==="TEXTAREA"||e.target.isContentEditable) return;
  if(e.key && e.key.length===1 && /[a-zA-Z]/.test(e.key)){
    cheatBuf=(cheatBuf+e.key.toLowerCase()).slice(-CHEAT_WORD.length);
    if(cheatBuf===CHEAT_WORD){ cheatBuf=""; grantDatacenterCheat(); }
  }
});

// splash
const splash=document.getElementById("splash");
document.getElementById("nameIn").value = (S.name && S.name!=="Explorer")?S.name:"";
function startGame(){
  const n=document.getElementById("nameIn").value.trim();
  if(n) S.name=n;
  save(); splash.style.display="none"; refreshHUD();
  if(S.answered===0) setTimeout(()=>toast("Tap 📖 Learn & Earn to begin, "+S.name+"!"),400);
}
document.getElementById("btnStart").onclick=startGame;
document.getElementById("nameIn").addEventListener("keydown",e=>{if(e.key==="Enter")startGame();});

refreshHUD();
if(S.answered>0){ const sub=document.querySelector("#splash .sub"); if(sub) sub.textContent="Welcome back, "+S.name+"! Your village is waiting."; }
