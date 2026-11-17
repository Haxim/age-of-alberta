"use strict";
/* ============================================================
   AGE OF ALBERTA — Printable Worksheets (Grades 1–6)
   Curriculum-grounded question generators + jsPDF builder.
   Produces a themed, print-at-home PDF with a separate answer key.
   No server. Reuses the same Alberta-themed content spirit as the game.
   ============================================================ */
(function(){
  const WS = {};
  function ri(a,b){return Math.floor(Math.random()*(b-a+1))+a;}
  function pick(a){return a[Math.floor(Math.random()*a.length)];}
  function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=ri(0,i);[a[i],a[j]]=[a[j],a[i]];}return a;}
  function cap(s){return s.charAt(0).toUpperCase()+s.slice(1);}

  /* ----------------------------------------------------------
     MATH — grade-scaled. Returns {q, a} where q is printable text.
     Grade ranges chosen to track common Alberta/Canada math outcomes:
     G1 add/sub within 20; G2 within 100; G3 within 1000 + intro mult;
     G4 mult/div facts + multi-digit; G5 multi-digit mult/div + fractions;
     G6 fractions/decimals/percent + order of operations.
     ---------------------------------------------------------- */
  function mathQ(grade){
    const g=grade;
    const kinds = (
      g<=1 ? ["add","sub","count"] :
      g===2 ? ["add","sub","place","skip"] :
      g===3 ? ["add","sub","mult","place","fraction","pattern"] :
      g===4 ? ["add","sub","mult","div","factPair","pattern","roundTo"] :
      g===5 ? ["mult","div","fracAdd","decimalAdd","place","roundTo"] :
              ["fracAdd","decimalMul","percent","order","div","place"]
    );
    const k=pick(kinds);
    let q,a;
    if(k==="count"){ const n=ri(5,20); const e=ri(0,3); const total=n+e; q=`Count the apples: there are ${n} apples in one basket and ${e} more on the table. How many apples in all?`; a=String(total); }
    else if(k==="add"){
      let x,y;
      if(g<=1){x=ri(1,12);y=ri(1,12-Math.min(8,0));y=ri(1,9);}
      else if(g===2){x=ri(10,89);y=ri(5,99-Math.min(0,0));y=ri(5,89);}
      else if(g===3){x=ri(40,499);y=ri(40,499);}
      else {x=ri(150,1999);y=ri(150,1999);}
      q=`${x} + ${y} =`; a=String(x+y);
    }
    else if(k==="sub"){
      let x,y;
      if(g<=1){x=ri(5,20);y=ri(1,x-1);}
      else if(g===2){x=ri(20,99);y=ri(5,x-1);}
      else if(g===3){x=ri(120,900);y=ri(20,x-10);}
      else {x=ri(300,2000);y=ri(50,x-20);}
      q=`${x} - ${y} =`; a=String(x-y);
    }
    else if(k==="mult"){
      let x,y;
      if(g===3){x=ri(2,9);y=ri(2,9);}
      else if(g===4){x=ri(2,12);y=ri(2,12);}
      else {x=ri(11,99);y=ri(2,9);}
      q=`${x} x ${y} =`; a=String(x*y);
    }
    else if(k==="div"){
      let y,ans;
      if(g===4){y=ri(2,9);ans=ri(2,9);}
      else if(g===5){y=ri(2,12);ans=ri(3,12);}
      else {y=ri(3,12);ans=ri(4,20);}
      q=`${y*ans} / ${y} =`; a=String(ans);
    }
    else if(k==="factPair"){ const x=ri(2,9),y=ri(2,9); q=`Fill in the missing factor:  ${x} x ___ = ${x*y}`; a=String(y); }
    else if(k==="place"){
      const n = g<=2?ri(10,99): g===3?ri(100,999): g<=5?ri(1000,9999):ri(10000,99999);
      const places=["ones","tens","hundreds","thousands","ten-thousands"];
      const digits=String(n).split("").reverse(); const pi=ri(0,digits.length-1);
      q=`In ${n}, what digit is in the ${places[pi]} place?`; a=String(parseInt(digits[pi],10));
    }
    else if(k==="skip"){ const step=pick([2,5,10]); const start=step*ri(1,4); const seq=[start,start+step,start+2*step]; q=`Skip count by ${step}:  ${seq.join(", ")}, ___`; a=String(start+3*step); }
    else if(k==="pattern"){ const start=ri(2,9), step=pick([2,3,4,5,10]); const seq=[start,start+step,start+2*step,start+3*step]; q=`What comes next?  ${seq.join(", ")}, ___`; a=String(start+4*step); }
    else if(k==="fraction"){ const den=pick([2,3,4,5]); const whole=pick([8,12,10,20,15]); if(whole%den!==0) return mathQ(grade); q=`What is 1/${den} of ${whole}?`; a=String(whole/den); }
    else if(k==="fracAdd"){ const den=pick([4,5,6,8]); const x=ri(1,den-2), y=ri(1,den-x-1); q=`${x}/${den} + ${y}/${den} =  (write as a fraction)`; a=`${x+y}/${den}`; }
    else if(k==="decimalAdd"){ const x=(ri(10,90)/10).toFixed(1), y=(ri(10,90)/10).toFixed(1); q=`${x} + ${y} =`; a=(parseFloat(x)+parseFloat(y)).toFixed(1); }
    else if(k==="decimalMul"){ const x=(ri(11,49)/10).toFixed(1); const y=ri(2,9); q=`${x} x ${y} =`; a=(parseFloat(x)*y).toFixed(1); }
    else if(k==="percent"){ const base=pick([20,40,50,60,80,100,200]); const pc=pick([10,25,50,75]); q=`What is ${pc}% of ${base}?`; a=String(base*pc/100); }
    else if(k==="roundTo"){ const n=g<=4?ri(120,980):ri(1200,9800); const to=g<=4?10:100; q=`Round ${n} to the nearest ${to}.`; a=String(Math.round(n/to)*to); }
    else if(k==="order"){ const a1=ri(2,9),b1=ri(2,9),c1=ri(2,9); q=`Solve using order of operations:  ${a1} + ${b1} x ${c1} =`; a=String(a1+b1*c1); }
    if(!Number.isFinite(parseFloat(a)) && !/\d/.test(a)) return mathQ(grade);
    return {q, a};
  }

  /* ----------------------------------------------------------
     SPELLING — grade-leveled Alberta-flavoured word lists.
     Worksheet style: "Fill in the missing letters" with a hint shown.
     ---------------------------------------------------------- */
  const SPELL = {
    1:["cat","dog","sun","red","big","run","top","fun","map","bus","hat","box","pig","cup","bed","net","pen","jam","fox","leg"],
    2:["because","friend","little","happy","water","green","please","family","school","animal","winter","summer","rabbit","pencil","number","letter","train","track","wheat","river"],
    3:["beautiful","tomorrow","favourite","important","different","together","mountain","everyone","question","remember","village","journey","prairie","railway","discover","weather","harvest","history","picture","compass"],
    4:["adventure","calendar","neighbour","province","capital","glacier","engineer","continue","chocolate","dinosaur","telescope","electric","hospital","library","kitchen","thunder","festival","natural","capture","valley"],
    5:["government","community","environment","temperature","celebration","information","experience","independent","mysterious","ingredient","photograph","mechanical","electricity","scientific","wilderness","territory","agriculture","transport","industry","resource"],
    6:["acknowledge","conscience","exaggerate","necessary","privilege","recommend","separate","successful","tomorrow","vegetable","representative","approximately","characteristic","civilization","democracy","fascinate","guarantee","occurrence","perseverance","significant"]
  };
  function spellQ(grade){
    const list = SPELL[Math.max(1,Math.min(6,grade))];
    const word = pick(list);
    const arr=word.split("");
    const frac = grade<=2?0.35: grade<=4?0.45:0.55;
    const hideN=Math.max(1,Math.round(arr.length*frac));
    const idxs=shuffle(arr.map((_,i)=>i)).slice(0,hideN);
    const shown=arr.map((c,i)=> idxs.includes(i)?"_":c).join(" ");
    return {q:`Fill in the missing letters:   ${shown}`, a:word};
  }

  /* ----------------------------------------------------------
     READING — short Alberta-themed passages with a comprehension Q.
     Grades scale passage length/complexity. Each item: {g,text,q,a}.
     ---------------------------------------------------------- */
  const READ = [
    {g:1,text:"Pip the frog lives by a cold stream. Pip is green. Pip likes to hop on rocks.",q:"What colour is Pip the frog?",a:"green"},
    {g:1,text:"Sam sees a big train. The train is red. It goes choo choo down the track.",q:"What sound does the train make?",a:"choo choo"},
    {g:2,text:"The berry farm was full of ripe red strawberries. The workers picked baskets and baskets so there would be plenty of food for winter.",q:"What were the workers picking?",a:"strawberries"},
    {g:2,text:"Sam heard a loud whistle. A long steam train chugged into the station, puffing white clouds. It was carrying wheat to the big city.",q:"What was the train carrying?",a:"wheat"},
    {g:3,text:"Every morning the explorer paddled down the Athabasca River. She mapped new islands and counted the herons. By Friday she had drawn a complete map of the valley.",q:"How did the explorer travel down the river?",a:"She paddled."},
    {g:3,text:"Long ago, the first railway crossed the prairies of Alberta. Thousands of workers spent years laying the heavy steel tracks. When it was done, people could travel from the mountains to the cities in just a few days.",q:"What did the finished railway let people do?",a:"Travel quickly across Alberta."},
    {g:4,text:"Deep in the badlands of Alberta, scientists dig carefully in the dry rock. They have found bones of giant dinosaurs that lived millions of years ago. The town of Drumheller is famous worldwide for these fossils.",q:"Why is Drumheller famous around the world?",a:"For its dinosaur fossils."},
    {g:4,text:"The chinook is a special wind in southern Alberta. In the middle of cold winter it can blow warm and melt the snow in a single day. People say it feels like spring has arrived early.",q:"What can a chinook wind do in winter?",a:"Blow warm and melt the snow."},
    {g:5,text:"The North Saskatchewan River begins as meltwater high in the Rocky Mountain glaciers. It travels east across the province, passing through the city of Edmonton, before joining other rivers on its long route to Hudson Bay.",q:"Where does the North Saskatchewan River begin?",a:"In the Rocky Mountain glaciers."},
    {g:5,text:"For thousands of years, the First Nations of the plains depended on the bison. They used every part of the animal for food, clothing, tools, and shelter. The bison were central to their way of life long before settlers arrived.",q:"Why were the bison so important to the plains First Nations?",a:"They used every part for food, clothing, tools, and shelter."},
    {g:6,text:"Alberta's economy was transformed by the discovery of oil at Leduc in 1947. The gusher signalled vast reserves beneath the prairie, drawing workers and investment to the province and shifting it from a mainly agricultural economy toward energy production.",q:"What event in 1947 transformed Alberta's economy?",a:"The discovery of oil at Leduc."},
    {g:6,text:"Glaciers act like slow rivers of ice, carving valleys over thousands of years. As they advance and retreat, they grind rock into fine sediment and leave behind ridges called moraines. Much of Alberta's mountain scenery was shaped by ancient glaciers.",q:"What are the ridges glaciers leave behind called?",a:"Moraines."}
  ];
  function readItem(grade){
    let pool = READ.filter(r=>r.g===grade);
    if(!pool.length) pool = READ.filter(r=>Math.abs(r.g-grade)<=1);
    if(!pool.length) pool = READ;
    return pick(pool);
  }

  /* ----------------------------------------------------------
     ALBERTA STUDIES — geography, people, history. {q, a}.
     ---------------------------------------------------------- */
  const SOCIAL = [
    {g:2,q:"What is the capital city of Alberta?",a:"Edmonton"},
    {g:2,q:"Alberta is a ___ of Canada. (province / country / city)",a:"province"},
    {g:2,q:"What golden crop do Alberta farmers grow a lot of?",a:"Wheat"},
    {g:2,q:"Which big mountains are found in western Alberta?",a:"The Rocky Mountains"},
    {g:2,q:"Which season brings lots of snow to Alberta?",a:"Winter"},
    {g:3,q:"What large animal once roamed the Alberta plains in huge herds?",a:"Bison (buffalo)"},
    {g:3,q:"Which Alberta town is world-famous for dinosaur fossils?",a:"Drumheller"},
    {g:3,q:"What warm winter wind melts the snow in southern Alberta?",a:"A chinook"},
    {g:3,q:"What is Alberta's largest city by population?",a:"Calgary"},
    {g:4,q:"What valuable resource is pumped from wells in Alberta?",a:"Oil"},
    {g:4,q:"Which national park sits in the Rocky Mountains of Alberta?",a:"Banff"},
    {g:4,q:"What yearly Calgary event celebrates cowboys and ranching?",a:"The Calgary Stampede"},
    {g:4,q:"Name one group of First Peoples who lived in Alberta long before settlers.",a:"First Nations or Métis peoples"},
    {g:5,q:"In what year was oil discovered at Leduc, Alberta?",a:"1947"},
    {g:5,q:"What river flows through the city of Edmonton?",a:"The North Saskatchewan River"},
    {g:5,q:"In what year did Alberta become a province of Canada?",a:"1905"},
    {g:6,q:"What are the three main natural regions of Alberta?",a:"Mountains, foothills, and prairies (plains)"},
    {g:6,q:"What does the term 'treaty' mean in Canadian history?",a:"An agreement between First Nations and the government"},
    {g:6,q:"Name two major industries in Alberta's economy.",a:"Oil and gas, and agriculture (also forestry, tourism)"}
  ];
  function socialItem(grade){
    let pool = SOCIAL.filter(s=>s.g<=grade);
    if(!pool.length) pool = SOCIAL;
    // bias toward the grade level
    const atGrade = SOCIAL.filter(s=>s.g===grade);
    if(atGrade.length && Math.random()<0.6) return pick(atGrade);
    return pick(pool);
  }

  /* ----------------------------------------------------------
     Build a worksheet spec: array of {n, type, q, a, passage?}
     subject: "Math" | "Spelling" | "Reading" | "Alberta" | "Mixed"
     Avoids duplicate questions within one sheet.
     ---------------------------------------------------------- */
  WS.build = function(grade, subject, count){
    grade=Math.max(1,Math.min(6,grade));
    count=Math.max(4,Math.min(30,count));
    const items=[]; const seen=new Set(); let guard=0;
    function addFrom(subj){
      let it;
      if(subj==="Math"){ const m=mathQ(grade); it={type:"Math", q:m.q, a:m.a}; }
      else if(subj==="Spelling"){ const s=spellQ(grade); it={type:"Spelling", q:s.q, a:s.a}; }
      else if(subj==="Reading"){ const r=readItem(grade); it={type:"Reading", q:r.q, a:r.a, passage:r.text}; }
      else { const s=socialItem(grade); it={type:"Alberta", q:s.q, a:s.a}; }
      return it;
    }
    const subjects = subject==="Mixed" ? ["Math","Spelling","Reading","Alberta"] : [subject];
    // First pass: only unique questions. Second pass (if a small bank — e.g.
    // Reading/Alberta — can't fill the count): allow repeats so the child always
    // gets the number of questions they asked for.
    let allowRepeat=false;
    while(items.length<count && guard++<count*60){
      const subj = subject==="Mixed" ? subjects[items.length % subjects.length] : subject;
      const it = addFrom(subj);
      const key = it.type+"|"+it.q;
      if(!allowRepeat && seen.has(key)){
        // if we've stalled (many tries, bank exhausted), switch to allowing repeats
        if(guard > count*8) allowRepeat=true;
        continue;
      }
      seen.add(key);
      it.n = items.length+1;
      items.push(it);
    }
    return {grade, subject, count:items.length, items, date:new Date()};
  };

  /* ----------------------------------------------------------
     PDF rendering with jsPDF (loaded via CDN as window.jspdf).
     Letter size, themed header, name/date line, numbered questions
     with work space, then a separate ANSWER KEY page.
     Returns a jsPDF doc instance.
     ---------------------------------------------------------- */
  const C = {
    green:[44,107,58], greenLt:[92,181,107], gold:[201,162,60],
    ink:[40,32,20], sub:[110,95,70], line:[200,186,150], paper:[253,250,242]
  };
  function subjectColor(t){
    if(t==="Math") return [60,110,200];
    if(t==="Spelling") return [150,90,40];
    if(t==="Reading") return [44,107,58];
    if(t==="Alberta") return [170,60,60];
    return C.sub;
  }

  WS.makePDF = function(sheet){
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({unit:"pt", format:"letter"});  // 612 x 792 pt
    const W=612, H=792, M=48;
    const subjName = sheet.subject==="Alberta" ? "Alberta Studies" : sheet.subject;

    function header(title, sub){
      // banner
      doc.setFillColor(...C.green); doc.rect(0,0,W,70,"F");
      doc.setFillColor(...C.gold); doc.rect(0,70,W,5,"F");
      doc.setTextColor(255,255,255);
      doc.setFont("helvetica","bold"); doc.setFontSize(20);
      doc.text("Age of Alberta", M, 34);
      doc.setFont("helvetica","normal"); doc.setFontSize(11);
      doc.text("Learn \u00b7 Build \u00b7 Thrive", M, 52);
      doc.setFont("helvetica","bold"); doc.setFontSize(13);
      doc.text(title, W-M, 34, {align:"right"});
      doc.setFont("helvetica","normal"); doc.setFontSize(10);
      doc.text(sub, W-M, 52, {align:"right"});
    }

    // ---------- WORKSHEET PAGE(S) ----------
    header(`Grade ${sheet.grade} \u00b7 ${subjName}`, "Worksheet");
    let y=98;
    // name / date line
    doc.setTextColor(...C.ink); doc.setFont("helvetica","normal"); doc.setFontSize(12);
    doc.text("Name:", M, y);
    doc.setDrawColor(...C.line); doc.setLineWidth(1);
    doc.line(M+40, y+2, M+250, y+2);
    doc.text("Date:", M+285, y);
    doc.line(M+325, y+2, W-M, y+2);
    y+=26;
    doc.setFontSize(10); doc.setTextColor(...C.sub);
    doc.text(`${sheet.count} questions \u00b7 Show your work \u00b7 Have fun!`, M, y);
    y+=18;

    const colW = W-2*M;
    sheet.items.forEach((it)=>{
      // estimate block height
      const isReading = it.type==="Reading" && it.passage;
      const passLines = isReading ? doc.splitTextToSize(it.passage, colW-16) : [];
      const qLines = doc.splitTextToSize(`${it.n}.  ${it.q}`, colW-4);
      let blockH = qLines.length*15 + 8;
      if(isReading) blockH += passLines.length*13 + 14;
      // work space
      const workH = it.type==="Math" ? 34 : it.type==="Spelling" ? 30 : it.type==="Reading" ? 46 : 40;
      blockH += workH + 14;

      if(y+blockH > H-50){ doc.addPage(); header(`Grade ${sheet.grade} \u00b7 ${subjName}`, "Worksheet"); y=98; }

      // subject tag dot
      const sc=subjectColor(it.type);
      doc.setFillColor(...sc); doc.circle(M+3, y-4, 3, "F");

      if(isReading){
        doc.setFillColor(247,243,230); doc.roundedRect(M, y-12, colW, passLines.length*13+12, 6,6,"F");
        doc.setTextColor(...C.ink); doc.setFont("helvetica","italic"); doc.setFontSize(10.5);
        doc.text(passLines, M+8, y+2);
        y += passLines.length*13 + 14;
      }
      doc.setTextColor(...C.ink); doc.setFont("helvetica","bold"); doc.setFontSize(11.5);
      doc.text(qLines, M+12, y);
      y += qLines.length*15 + 6;

      // work space: dotted answer line(s) / box
      doc.setDrawColor(...C.line); doc.setLineWidth(0.8);
      if(it.type==="Math"){
        doc.text("", M+12, y);
        doc.setFont("helvetica","normal"); doc.setTextColor(...C.sub); doc.setFontSize(11);
        doc.text("Answer:", M+12, y+14);
        doc.line(M+58, y+16, M+200, y+16);
      } else if(it.type==="Spelling"){
        doc.setFont("helvetica","normal"); doc.setTextColor(...C.sub); doc.setFontSize(11);
        doc.text("Write it:", M+12, y+14);
        doc.line(M+62, y+16, M+260, y+16);
      } else {
        // reading / alberta: 1-2 answer lines
        const lines = it.type==="Reading" ? 2 : 1;
        for(let i=0;i<lines;i++){ doc.line(M+12, y+12+i*16, W-M, y+12+i*16); }
      }
      y += workH + 12;
    });

    // footer page numbers on worksheet pages
    const wkPages = doc.internal.getNumberOfPages();
    for(let p=1;p<=wkPages;p++){ doc.setPage(p); doc.setFontSize(9); doc.setTextColor(...C.sub);
      doc.text(`Age of Alberta \u2014 Grade ${sheet.grade} ${subjName} \u00b7 page ${p}`, W/2, H-24, {align:"center"}); }

    // ---------- ANSWER KEY PAGE ----------
    doc.addPage();
    doc.setFillColor(...C.gold); doc.rect(0,0,W,70,"F");
    doc.setFillColor(...C.green); doc.rect(0,70,W,5,"F");
    doc.setTextColor(255,255,255); doc.setFont("helvetica","bold"); doc.setFontSize(20);
    doc.text("Answer Key", M, 40);
    doc.setFont("helvetica","normal"); doc.setFontSize(11);
    doc.text(`Grade ${sheet.grade} \u00b7 ${subjName} \u00b7 for grown-ups`, W-M, 40, {align:"right"});
    let ay=100;
    doc.setFontSize(11);
    // two-column answer key
    const colGap=24; const half=(W-2*M-colGap)/2;
    const perCol=Math.ceil(sheet.items.length/2);
    sheet.items.forEach((it,idx)=>{
      const col = idx<perCol?0:1;
      const row = col===0?idx:idx-perCol;
      const x = M + col*(half+colGap);
      const yy = 100 + row*22;
      if(yy>H-50) return; // safety; sheets are <=30 Qs so fits
      doc.setTextColor(...subjectColor(it.type)); doc.setFont("helvetica","bold");
      doc.text(`${it.n}.`, x, yy);
      doc.setTextColor(...C.ink); doc.setFont("helvetica","normal");
      const ans = doc.splitTextToSize(String(it.a), half-22);
      doc.text(ans, x+20, yy);
    });
    doc.setFontSize(9); doc.setTextColor(...C.sub);
    doc.text("Age of Alberta \u2014 Answer Key", W/2, H-24, {align:"center"});

    return doc;
  };

  WS.fileName = function(sheet){
    const subj = (sheet.subject==="Alberta"?"AlbertaStudies":sheet.subject);
    const d = sheet.date.toISOString().slice(0,10);
    return `AgeOfAlberta_G${sheet.grade}_${subj}_${d}.pdf`;
  };

  /* ----------------------------------------------------------
     On-screen HTML preview (mirrors the PDF). Used inside the game
     because sandboxed iframes block the browser's native PDF viewer,
     which would otherwise show a blank white page. The real PDF blob
     is still used for Print / Save.
     ---------------------------------------------------------- */
  function esc(s){ return String(s).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
  function hexOf(rgb){ return "#"+rgb.map(v=>v.toString(16).padStart(2,"0")).join(""); }
  WS.previewHTML = function(sheet){
    const subjName = sheet.subject==="Alberta" ? "Alberta Studies" : sheet.subject;
    const green=hexOf(C.green), gold=hexOf(C.gold), paper=hexOf(C.paper),
          ink=hexOf(C.ink), sub=hexOf(C.sub), line=hexOf(C.line);
    const qHTML = sheet.items.map(it=>{
      const col = hexOf(subjectColor(it.type));
      let body = "";
      if(it.type==="Reading" && it.passage){
        body += `<div style="background:${paper};border-radius:8px;padding:8px 10px;margin:4px 0 6px;font-style:italic;color:${ink};font-size:12px;line-height:1.4">${esc(it.passage)}</div>`;
      }
      body += `<div style="font-weight:700;color:${ink};font-size:13px"><span style="color:${col}">${it.n}.</span> ${esc(it.q)}</div>`;
      const lab = it.type==="Math" ? "Answer:" : it.type==="Spelling" ? "Write it:" : null;
      const lines = it.type==="Reading" ? 2 : 1;
      let work = "";
      for(let i=0;i<lines;i++){
        work += `<div style="display:flex;align-items:flex-end;gap:6px;margin-top:7px">${i===0&&lab?`<span style=\"color:${sub};font-size:11px\">${lab}</span>`:""}<span style="flex:1;border-bottom:1px solid ${line};height:14px"></span></div>`;
      }
      return `<div style="margin:0 0 12px">${body}${work}</div>`;
    }).join("");
    const keyHTML = sheet.items.map(it=>{
      const col = hexOf(subjectColor(it.type));
      return `<div style="display:flex;gap:6px;margin:3px 0;font-size:12px"><span style="color:${col};font-weight:700;min-width:20px">${it.n}.</span><span style="color:${ink}">${esc(it.a)}</span></div>`;
    }).join("");
    return `<div style="text-align:left;background:#fff;border-radius:10px;overflow:hidden;border:1px solid ${line}">
      <div style="background:${green};color:#fff;padding:10px 14px;display:flex;justify-content:space-between;align-items:center">
        <div><div style="font-weight:800;font-size:15px">Age of Alberta</div><div style="font-size:10px;opacity:.85">Learn \u00b7 Build \u00b7 Thrive</div></div>
        <div style="text-align:right"><div style="font-weight:800;font-size:13px">Grade ${sheet.grade} \u00b7 ${esc(subjName)}</div><div style="font-size:10px;opacity:.85">Worksheet</div></div>
      </div>
      <div style="height:4px;background:${gold}"></div>
      <div style="padding:12px 16px">
        <div style="display:flex;gap:18px;margin-bottom:8px;color:${ink};font-size:12px"><span style="flex:1">Name: <span style="display:inline-block;border-bottom:1px solid ${line};width:60%"></span></span><span>Date: <span style="display:inline-block;border-bottom:1px solid ${line};width:90px"></span></span></div>
        <div style="color:${sub};font-size:11px;margin-bottom:10px">${sheet.items.length} questions \u00b7 Show your work \u00b7 Have fun!</div>
        ${qHTML}
      </div>
      <div style="background:${gold};color:#fff;padding:8px 14px;font-weight:800;font-size:13px">Answer Key <span style="font-weight:400;font-size:10px;opacity:.9">\u00b7 for grown-ups</span></div>
      <div style="padding:10px 16px;column-count:2;column-gap:24px">${keyHTML}</div>
    </div>`;
  };

  window.Worksheets = WS;
})();
