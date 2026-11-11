/* ===== วิชาคลินิก: การใช้เครื่องผลิตออกซิเจนอย่างปลอดภัย =====
   เรียนตามลำดับ: บทที่ 1 → 9 (ผ่านท้ายบท 4/5 จึงเปิดบทถัดไป) → เครื่องจำลอง (≥ 80%) → แบบทดสอบท้ายวิชา
   คะแนน: lq:<บท> ท้ายบท · read:<บท> เมื่อผ่านท้ายบท · csim เครื่องจำลอง · quiz แบบทดสอบท้ายวิชา */
(function(){
  const C=window.APP_CONFIG||{}, CR=C.criteria||{}, L=window.CLESSONS, SIM=window.CSIM;
  const esc = s => String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
  const S=()=>window.Score;
  const best=k=>S()?S().bestOf(k):null;
  const has=k=>!!(S()&&S().has(k));
  const LP=(CR.lessonPct||80)/100, NEED=Math.ceil(5*LP);
  const passedL = id => has("read:"+id) || (()=>{ const b=best("lq:"+id); return !!(b&&b.v>=LP-1e-9); })();
  const nPassed = ()=>L.filter(x=>passedL(x.id)).length;
  const simPct = ()=>{ const b=best("csim"); return b?Math.round(b.v*100):0; };
  const quizPct = ()=>{ const b=best("quiz"); return b?Math.round(b.v*100):0; };
  const lockedL = i => !window.PREVIEW && i>0 && !passedL(L[i-1].id);
  const lockedSim = ()=> !window.PREVIEW && nPassed()<L.length;
  const lockedQuiz = ()=> !window.PREVIEW && (lockedSim() || simPct()<CR.simPct);
  const LT="กขคง";

  /* ---------- เกณฑ์ใบรับรอง ---------- */
  window.CertProgress=function(hist){
    const read=new Set(); let sim=0, quiz=0;
    hist.forEach(h=>{ const k=h.key||"", p=h.max?Math.round(h.score/h.max*100):0;
      if(k.startsWith("read:")) read.add(k); if(k==="csim") sim=Math.max(sim,p); if(k==="quiz") quiz=Math.max(quiz,p); });
    const items=[
      {n:`ผ่านท้ายบทครบ ${CR.readLessons} บท`, v:`${read.size}/${CR.readLessons}`, ok:read.size>=CR.readLessons},
      {n:`เครื่องจำลอง ≥ ${CR.simPct}%`, v:`ดีที่สุด ${sim}%`, ok:sim>=CR.simPct},
      {n:`แบบทดสอบท้ายวิชา ≥ ${CR.quizPct}%`, v:`ดีที่สุด ${quiz}%`, ok:quiz>=CR.quizPct}];
    return {items, pass:items.every(i=>i.ok), line:`บทเรียน ${read.size} บท  ·  เครื่องจำลอง ${sim}%  ·  แบบทดสอบ ${quiz}%`};
  };

  /* ---------- แบบทดสอบ (ใช้ทั้งท้ายบทและท้ายวิชา) ---------- */
  function quiz(root, o){   // {bank, n, pass, key, mod, item, title, onPass, next}
    const intro=()=>{
      const sn=(o.scope && window.Seen)?Seen.status(o.scope):{ok:true};
      if(!sn.ok){ root.innerHTML=`<div class="qbox"><h2>${esc(o.title)}</h2>${Seen.gateHTML(o.scope)}</div>`; return; }
      const b=best(o.key);
      root.innerHTML=`<div class="qbox"><h2>${esc(o.title)}</h2><p class="muted small">สุ่ม ${Math.min(o.n,o.bank.length)} ข้อจากคลัง ${o.bank.length} ข้อ ต้องถูก ${o.pass} ข้อขึ้นไปจึงผ่าน ตอบผิดทำใหม่ได้ ระบบสุ่มชุดใหม่ทุกครั้ง</p>
        ${b?`<p class="hint">ดีที่สุดของคุณ: ${b.score}/${b.max}</p>`:""}<div class="tools"><button class="primary" data-go>${b?"ทำอีกครั้ง":"เริ่มทำแบบทดสอบ"}</button></div></div>`;
      root.querySelector("[data-go]").onclick=start; };
    function start(){
      const qs=(window.QPick?QPick.pick(o.key,o.bank,o.n):shuffle(o.bank).slice(0,Math.min(o.n,o.bank.length))).map(b=>{const ord=shuffle(b.o.map((t,k)=>k));return {...b,ord,ans:ord.indexOf(0),pick:null};});
      let i=0;
      const draw=()=>{ const q=qs[i], done=qs.filter(x=>x.pick!==null).length;
        root.innerHTML=`<div class="qbox"><div class="simhead"><span class="muted">${esc(o.title)} · ตอบแล้ว ${done}/${qs.length}</span><button class="ghost" data-x>ยกเลิก</button></div>
          <div class="qnav">${qs.map((x,k)=>`<button class="${k===i?"on":""} ${x.pick!==null?"dn":""}" data-k="${k}">${k+1}</button>`).join("")}</div>
          <h3>${i+1}. ${esc(q.q)}</h3><div class="lopts">${q.ord.map((k,j)=>`<button class="lopt ${q.pick===j?"picked":""}" data-j="${j}"><b>${LT[j]}.</b>&nbsp;${esc(q.o[k])}</button>`).join("")}</div>
          <div class="tools"><button data-p ${i===0?"disabled":""}>← ก่อนหน้า</button>${i<qs.length-1?`<button class="primary" data-n>ถัดไป →</button>`:`<button class="primary" data-s>ส่งคำตอบ</button>`}</div><div data-m></div></div>`;
        const $=s=>root.querySelector(s);
        root.querySelectorAll(".qnav button").forEach(b=>b.onclick=()=>{i=+b.dataset.k;draw();});
        root.querySelectorAll(".lopt").forEach(b=>b.onclick=()=>{q.pick=+b.dataset.j;if(i<qs.length-1)i++;draw();});
        $("[data-x]").onclick=intro; if($("[data-p]")) $("[data-p]").onclick=()=>{i--;draw();}; if($("[data-n]")) $("[data-n]").onclick=()=>{i++;draw();};
        if($("[data-s]")) $("[data-s]").onclick=()=>{ const left=qs.map((x,k)=>x.pick===null?k+1:null).filter(Boolean);
          if(left.length){ $("[data-m]").innerHTML=`<div class="msg bad">ยังไม่ได้ตอบข้อ ${left.join(", ")}</div>`; return; } result(qs); };
        root.scrollIntoView({block:"start"}); };
      draw();
    }
    async function result(qs){
      const ok=qs.filter(q=>q.pick===q.ans).length, n=qs.length, pct=Math.round(ok/n*100), pass=ok>=o.pass;
      S() && await S().record({key:o.key, mod:o.mod, item:o.item, score:ok, max:n, q:window.QPick?QPick.ids(qs):""});
      if(pass && o.onPass) await o.onPass();
      root.innerHTML=`<div class="qbox"><h2>ผล${esc(o.title)}</h2>
        <div class="score ${pass?"ok":pct>=60?"mid":"bad"}"><div class="big">${ok}/${n}</div><div>${pct}% · ${pass?"ผ่าน":"ยังไม่ผ่าน"}</div></div>
        ${pass?(o.next?`<div class="msg ok">✓ ผ่านแล้ว เปิด${esc(o.next[1])} แล้ว</div>`:""):`<div class="msg bad">ต้องถูก ${o.pass} ข้อขึ้นไป อ่านเฉลยแล้วกด “ทำชุดใหม่”</div>`}
        ${qs.map((q,k)=>{const g=q.pick===q.ans;return `<div class="alarm"><div class="qr ${g?"good":"bad"}"><b>${k+1}. ${esc(q.q)}</b><div>${g?"✓":"✗"} คำตอบของคุณ: ${LT[q.pick]}. ${esc(q.o[q.ord[q.pick]])}</div>
          ${g?"":`<div class="okans">คำตอบที่ถูก: ${LT[q.ans]}. ${esc(q.o[0])}</div>`}<div class="muted small">${esc(q.e)}</div></div></div>`;}).join("")}
        <div class="tools">${pass&&o.next?`<a class="btn primary" href="${o.next[0]}">ไป${esc(o.next[1])} →</a><button data-r>ทำชุดใหม่</button>`:`<button class="primary" data-r>ทำชุดใหม่</button>`}</div></div>`;
      root.querySelector("[data-r]").onclick=start; root.scrollIntoView({block:"start"});
    }
    if(o.scope) document.addEventListener("seen-change", e=>{ if(e.detail && e.detail.scope===o.scope && root.isConnected && root.querySelector(".seen-gate")) intro(); });
    intro();
  }

  /* ---------- หน้าแรก ---------- */
  function home(){
    const n=nPassed(), s=simPct(), q=quizPct();
    document.getElementById("home-prog").innerHTML=`<div class="prog"><span class="${n>=L.length?"ok":""}">${n>=L.length?"✓":"○"} บทเรียน ${n}/${L.length}</span><span class="${s>=CR.simPct?"ok":""}">${s>=CR.simPct?"✓":"○"} เครื่องจำลอง ${s}%</span><span class="${q>=CR.quizPct?"ok":""}">${q>=CR.quizPct?"✓":"○"} แบบทดสอบ ${q}%</span></div>
      <div class="tools"><a class="btn primary" href="${n<L.length?"#"+L[n].id:lockedQuiz()?"#sim":"#quiz"}">${n===0&&!s?"เริ่มบทที่ 1 →":"เรียนต่อ →"}</a></div>`;
  }

  /* ---------- รายการบทเรียน และหน้าบท ---------- */
  function lessonList(){
    document.getElementById("lessons").innerHTML=`<h1>บทเรียน</h1><p class="muted">เรียนตามลำดับ ต้องผ่านแบบทดสอบท้ายบท (ถูก ${NEED} จาก 5 ข้อ) จึงเปิดบทถัดไป</p>
      <div class="llist">${L.map((x,i)=>{const ok=passedL(x.id), lk=lockedL(i), b=best("lq:"+x.id);
        return `<a class="lrow ${ok?"ok":""} ${lk?"lk":""}" href="#${x.id}"><span class="ln">${ok?"✓":lk?"🔒":i+1}</span><span><b>บทที่ ${i+1} · ${esc(x.n)}</b><small>${ok?"ผ่านแล้ว":lk?"ต้องผ่านบทที่ "+i+" ก่อน":b?`ท้ายบทดีที่สุด ${b.score}/5 · ยังไม่ผ่าน`:"ยังไม่ได้ทำท้ายบท"}</small></span></a>`;}).join("")}
        <a class="lrow ${simPct()>=CR.simPct?"ok":""} ${lockedSim()?"lk":""}" href="#sim"><span class="ln">${simPct()>=CR.simPct?"✓":lockedSim()?"🔒":"▶"}</span><span><b>เครื่องจำลอง 7 สถานการณ์</b><small>${lockedSim()?"ต้องผ่านครบ 9 บทก่อน":`ดีที่สุด ${simPct()}% (ผ่าน ${CR.simPct}%)`}</small></span></a>
        <a class="lrow ${quizPct()>=CR.quizPct?"ok":""} ${lockedQuiz()?"lk":""}" href="#quiz"><span class="ln">${quizPct()>=CR.quizPct?"✓":lockedQuiz()?"🔒":"?"}</span><span><b>แบบทดสอบท้ายวิชา</b><small>${lockedQuiz()?"ต้องผ่านเครื่องจำลองก่อน":`ดีที่สุด ${quizPct()}% (ผ่าน ${CR.quizPct}%)`}</small></span></a></div>`;
  }
  function lessonPage(i){
    const x=L[i], root=document.getElementById("lesson"), nx=L[i+1];
    root.innerHTML=`<div class="simhead"><a class="btn ghost" href="#lessons">← บทเรียนทั้งหมด</a><span class="muted small">บทที่ ${i+1} / ${L.length}</span></div>
      <article class="lesson"><h1>บทที่ ${i+1} · ${esc(x.n)}</h1>${x.b}
      <div class="srcs"><b>แหล่งอ้างอิง</b><ol>${x.src.map(s=>`<li>${s[1]?`<a href="${esc(s[1])}" target="_blank" rel="noopener">${esc(s[0])}</a>`:esc(s[0])}</li>`).join("")}</ol></div></article>
      <div id="lq"></div>`;
    /* หัวข้อย่อยเป็นกล่องแตะเปิด ต้องเปิดครบก่อนทำสอบท้ายบท (../js/seen.js) · ผ่านบทนี้แล้วไม่ล็อกย้อนหลัง */
    if(window.Seen){
      const art=root.querySelector("article.lesson"), ns=Seen.sectionize(art, x.id);
      /* บทที่ไม่มีหัวข้อย่อย: กด "อ่านจบแล้ว" ท้ายบทแทน */
      if(!ns) art.querySelector(".srcs").insertAdjacentHTML("beforebegin", `<div class="tools" data-nosec><button class="primary" data-seen="${esc(x.id)}|read">อ่านจบแล้ว</button></div>`);
      Seen.define(x.id, ()=>Seen.fromDom(x.id), id=>{ const el=root.querySelector(`[data-seen="${x.id}|${id}"]`); if(el){ if(el.tagName==="DETAILS") el.open=true; el.scrollIntoView({behavior:"smooth",block:"center"}); } }, ()=>has("read:"+x.id));
    }
    root.querySelectorAll("[data-w]").forEach(w=>{ const f=window.Widgets&&window.Widgets[w.dataset.w]; if(f) f(w); });
    quiz(root.querySelector("#lq"), {scope:x.id, bank:x.quiz, n:5, pass:NEED, key:"lq:"+x.id, mod:"บทเรียน", item:`ท้ายบทที่ ${i+1} ${x.n}`, title:`แบบทดสอบท้ายบทที่ ${i+1}`,
      onPass: async()=>{ if(!has("read:"+x.id) && S()) await S().record({key:"read:"+x.id, mod:"บทเรียน", item:`ผ่านบทที่ ${i+1} ${x.n}`, score:1, max:1}); },
      next: nx ? ["#"+nx.id, `บทที่ ${i+2}`] : ["#sim","เครื่องจำลอง"]});
  }

  /* ---------- เครื่องจำลอง ---------- */
  function panelSvg(st){
    const led=(c,on,bl)=>`<circle class="led ${c} ${on?"lit":""} ${bl?"blink":""}" cx="${c==="g"?46:c==="y"?110:174}" cy="40" r="11"/>`;
    const fv=Math.min(st.flow||0,5.6);
    return `<svg class="dia" viewBox="0 0 220 230" role="img" aria-label="แผงหน้าเครื่อง"><rect x="6" y="6" width="208" height="218" rx="18" class="fp-body"/>
      ${led("g",st.led==="g")}${led("y",st.led==="y"||st.led==="yb",st.led==="yb")}${led("r",st.led==="r")}
      <text class="lbl s" x="46" y="66" text-anchor="middle">เขียว</text><text class="lbl s" x="110" y="66" text-anchor="middle">เหลือง</text><text class="lbl s" x="174" y="66" text-anchor="middle">แดง</text>
      <rect x="34" y="80" width="44" height="134" rx="20" class="fm-tube"/>${[0,1,2,3,4,5].map(v=>`<line x1="78" x2="88" y1="${200-v*22}" y2="${200-v*22}" class="tick"/><text class="lbl s" x="92" y="${204-v*22}">${v}</text>`).join("")}
      <circle cx="56" cy="${200-fv*22}" r="8" class="fm-ball"/><text class="lbl s" x="160" y="120" text-anchor="middle">L/min</text>
      <text class="lbl" x="160" y="140" text-anchor="middle">${st.flow!=null?st.flow:"-"}</text></svg>`;
  }
  function sim(){
    const root=document.getElementById("sim");
    if(lockedSim()){ root.innerHTML=`<h1>🔒 เครื่องจำลอง</h1><p class="muted">ต้องผ่านแบบทดสอบท้ายบทครบ 9 บทก่อน (ตอนนี้ ${nPassed()}/9)</p><div class="tools"><a class="btn primary" href="#lessons">ไปบทเรียน →</a></div>`; return; }
    const SC=SIM.scenarios, tot=SC.reduce((a,s)=>a+s.steps.length,0);
    let si=0, k=0, score=0, picked=null, ord=null, res=[];
    const intro=()=>{ root.innerHTML=`<h1>เครื่องจำลอง</h1><p class="muted">${SC.length} สถานการณ์ รวม ${tot} คำถาม นับคำตอบแรกของแต่ละข้อ ต้องได้อย่างน้อย ${CR.simPct}% · ดีที่สุดของคุณ ${simPct()}%</p>
      <div class="note small">${esc(SIM.disclaimer)}</div><div class="tools"><button class="primary" data-go>เริ่ม</button></div>`;
      root.querySelector("[data-go]").onclick=()=>{ si=0;k=0;score=0;res=[];step(); }; };
    function step(){
      const s=SC[si], t=s.steps[k]; picked=null; ord=shuffle(t.opts.map((o,j)=>j));
      draw();
      function draw(){
        root.innerHTML=`<div class="simhead"><span class="muted">สถานการณ์ ${si+1}/${SC.length} · ข้อ ${k+1}/${s.steps.length} · ${esc(s.lessons)}</span><span class="muted">คะแนน ${score}</span></div>
          <h2>${esc(s.n)}</h2><div class="clead">${esc(s.story)}</div>
          <div class="scbox"><figure>${panelSvg(t.st)}</figure><div class="stnote">${t.st.sound?`<div class="snd">🔊 ${esc(t.st.sound)}</div>`:""}${t.st.spo2?`<div>SpO₂ <span class="spo2">${t.st.spo2}%</span></div>`:""}<p>${esc(t.st.note)}</p></div></div>
          <h3>${esc(t.q)}</h3><div class="lopts simopts">${ord.map(j=>{const o=t.opts[j], cls=picked===null?"":j===0?"good":j===picked?"wrong":"";
            return `<button class="lopt ${cls}" data-j="${j}" ${picked!==null?"disabled":""}>${esc(o[0])}${picked!==null&&(j===0||j===picked)?`<div class="opt-fb">${esc(o[1])}</div>`:""}</button>`;}).join("")}</div>
          ${picked!==null?`<div class="tools"><button class="primary" data-nx>${si===SC.length-1&&k===s.steps.length-1?"ดูผล":"ถัดไป →"}</button></div>`:""}`;
        root.querySelectorAll("[data-j]").forEach(b=>b.onclick=()=>{ picked=+b.dataset.j; if(picked===0) score++; res.push(picked===0); draw(); });
        const nx=root.querySelector("[data-nx]"); if(nx) nx.onclick=()=>{ k++; if(k>=s.steps.length){k=0;si++;} if(si>=SC.length) end(); else step(); };
        window.scrollTo(0,0);
      }
    }
    async function end(){
      const pct=Math.round(score/tot*100);
      S() && await S().record({key:"csim", mod:"เครื่องจำลอง", item:`เครื่องจำลอง ${SC.length} สถานการณ์`, score, max:tot});
      root.innerHTML=`<h1>ผลเครื่องจำลอง</h1><div class="score ${pct>=CR.simPct?"ok":pct>=60?"mid":"bad"}"><div class="big">${score}/${tot}</div><div>${pct}% · ${pct>=CR.simPct?"ผ่าน":"ยังไม่ผ่าน"}</div></div>
        ${pct>=CR.simPct?`<div class="msg ok">✓ ผ่านแล้ว เปิดแบบทดสอบท้ายวิชาแล้ว</div>`:`<div class="msg bad">ต้องได้อย่างน้อย ${CR.simPct}% ทำใหม่ได้</div>`}
        <div class="tools">${pct>=CR.simPct?`<a class="btn primary" href="#quiz">ไปแบบทดสอบท้ายวิชา →</a>`:""}<button data-r>ทำใหม่</button></div>`;
      root.querySelector("[data-r]").onclick=intro;
    }
    intro();
  }

  /* ---------- แบบทดสอบท้ายวิชา ---------- */
  function finalQuiz(){
    const root=document.getElementById("quiz");
    if(lockedQuiz()){ root.innerHTML=`<h1>🔒 แบบทดสอบท้ายวิชา</h1><p class="muted">ต้องผ่านครบ 9 บทและเครื่องจำลองอย่างน้อย ${CR.simPct}% ก่อน</p><div class="tools"><a class="btn primary" href="${lockedSim()?"#lessons":"#sim"}">ไป${lockedSim()?"บทเรียน":"เครื่องจำลอง"} →</a></div>`; return; }
    const bank=L.flatMap(x=>x.quiz), n=CR.finalN||20;
    quiz(root, {bank, n, pass:Math.ceil(n*CR.quizPct/100), key:"quiz", mod:"แบบทดสอบ", item:`แบบทดสอบท้ายวิชา ${n} ข้อ`, title:"แบบทดสอบท้ายวิชา", next:["#scores","ผลของฉันและเกียรติบัตร"]});
  }

  /* ---------- เส้นทาง ---------- */
  function route(){
    const v=(location.hash||"#home").slice(1);
    let view="home", li=L.findIndex(x=>x.id===v);
    if(["home","lessons","sim","quiz","scores"].includes(v)) view=v; else if(li>=0) view="lesson";
    if(view==="lesson" && lockedL(li)){ view="lessons"; }
    document.querySelectorAll(".view").forEach(s=>s.classList.toggle("on",s.id==="v-"+view));
    document.querySelectorAll("#nav a").forEach(a=>a.classList.toggle("on",a.dataset.v===(view==="lesson"?"lessons":view)));
    if(view==="home") home();
    if(view==="lessons") lessonList();
    if(view==="lesson") lessonPage(li);
    if(view==="sim") sim();
    if(view==="quiz") finalQuiz();
    if(window.Views && window.Views[view]) window.Views[view].show();
    window.scrollTo(0,0);
  }
  window.addEventListener("hashchange",route);
  window.addEventListener("DOMContentLoaded",route);
})();
