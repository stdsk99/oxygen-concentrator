/* ===== เมนู โมดูล 1–7 ด่านความปลอดภัย แบบทดสอบท้ายบท และเกณฑ์ผ่าน ===== */
(function(){
  const C = window.APP_CONFIG || {}, CR = C.criteria || {};
  const esc = s => String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const shuffle = a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
  const L = "กขคง";
  const MODS = window.MODS, SAF = window.SAFETY;
  const S = ()=>window.Score;
  const best = k => S() ? S().bestOf(k) : null;
  const safetyOK = ()=>{ const b=best("safety"); return !!(b && b.score>=CR.safety); };
  const LOCKED = ["m6","m7","m8"];

  /* ---------- เกณฑ์ผ่าน (ใช้แทนเกณฑ์เดิมใน cert.js) ---------- */
  window.CertProgress = function(hist){
    let saf=0; const mq={}, ex={};
    hist.forEach(h=>{ const k=h.key||"", pc=h.max?Math.round(h.score/h.max*100):0;
      if(k==="safety") saf=Math.max(saf, +h.score);
      if(k.indexOf("mq:")===0) mq[k]=Math.max(mq[k]||0, pc);
      if(k.indexOf("exam:")===0) ex[k]=Math.max(ex[k]||0, +h.score);
    });
    const nq=Object.keys(mq).length, ev=Object.values(ex), avg=ev.length?Math.round(ev.reduce((a,b)=>a+b,0)/ev.length):0;
    const parts=MODS.filter(m=>!m.sim).map(m=>mq["mq:"+m.id]||0).concat([avg]);
    const total=Math.round(parts.reduce((a,b)=>a+b,0)/parts.length);
    const items=[
      {n:`ด่านความปลอดภัย ถูกครบ ${CR.safety} ข้อ`, v:saf?`ดีที่สุด ${saf}/${CR.safety}`:"ยังไม่ได้ทำ", ok:saf>=CR.safety},
      {n:`แบบทดสอบท้ายบท ครบ ${CR.modQuiz} โมดูล (1–7)`, v:`${nq}/${CR.modQuiz}`, ok:nq>=CR.modQuiz},
      {n:`โจทย์ซ่อมจำลอง โหมดสอบ ครบ ${CR.examCases} เคส`, v:`${ev.length}/${CR.examCases}${ev.length?" · เฉลี่ย "+avg:""}`, ok:ev.length>=CR.examCases},
      {n:`คะแนนรวม ≥ ${CR.totalPct}% (ท้ายบท 1–7 และโหมดสอบ เฉลี่ยกัน)`, v:`${total}%`, ok:total>=CR.totalPct}
    ];
    return {items, pass:items.every(i=>i.ok), line:`ด่านความปลอดภัย ${saf}/${CR.safety} · ท้ายบท ${nq} โมดูล · โจทย์ซ่อม ${ev.length} เคส เฉลี่ย ${avg} · คะแนนรวม ${total}%`};
  };

  /* ---------- แบบทดสอบ (ใช้ทั้งด่านความปลอดภัยและท้ายบท) ---------- */
  function quiz(root, o){   // o: {bank, n, key, mod, item, pass, title, onDone}
    function intro(){
      const b=best(o.key);
      root.innerHTML=`<div class="qbox"><h2>${esc(o.title)}</h2>
        <p class="muted small">สุ่ม ${Math.min(o.n,o.bank.length)} ข้อจากคลัง ${o.bank.length} ข้อ ${o.pass?`ต้องถูก ${o.pass} ข้อขึ้นไปจึงผ่าน`:"ตอบครบแล้วกดส่ง จึงจะเห็นคะแนนและเฉลย"}</p>
        ${b?`<p class="hint">ดีที่สุดของคุณ: ${b.score}/${b.max} (${Math.round(b.v*100)}%)</p>`:""}
        <div class="tools"><button class="primary" data-go>${b?"ทำอีกครั้ง":"เริ่มทำแบบทดสอบ"}</button></div></div>`;
      root.querySelector("[data-go]").onclick=start;
    }
    function start(){
      const qs=shuffle(o.bank).slice(0,Math.min(o.n,o.bank.length)).map(b=>{const ord=shuffle(b.o.map((t,k)=>k));return {...b,ord,ans:ord.indexOf(0),pick:null};});
      let i=0;
      function draw(){
        const q=qs[i], done=qs.filter(x=>x.pick!==null).length;
        root.innerHTML=`<div class="qbox"><div class="simhead"><span class="muted">${esc(o.title)} · ตอบแล้ว ${done}/${qs.length}</span><button class="ghost" data-x>ยกเลิก</button></div>
          <div class="qnav">${qs.map((x,k)=>`<button class="${k===i?"on":""} ${x.pick!==null?"dn":""}" data-k="${k}">${k+1}</button>`).join("")}</div>
          <h3>${i+1}. ${esc(q.q)}</h3>
          <div class="lopts">${q.ord.map((k,j)=>`<button class="lopt ${q.pick===j?"picked":""}" data-j="${j}"><b>${L[j]}.</b>&nbsp;${esc(q.o[k])}</button>`).join("")}</div>
          <div class="tools"><button data-p ${i===0?"disabled":""}>← ก่อนหน้า</button>${i<qs.length-1?`<button class="primary" data-n>ถัดไป →</button>`:`<button class="primary" data-s>ส่งคำตอบ</button>`}</div><div data-m></div></div>`;
        const $=s=>root.querySelector(s);
        root.querySelectorAll(".qnav button").forEach(b=>b.onclick=()=>{i=+b.dataset.k;draw();});
        root.querySelectorAll(".lopt").forEach(b=>b.onclick=()=>{q.pick=+b.dataset.j;if(i<qs.length-1)i++;draw();});
        $("[data-x]").onclick=intro;
        if($("[data-p]")) $("[data-p]").onclick=()=>{i--;draw();};
        if($("[data-n]")) $("[data-n]").onclick=()=>{i++;draw();};
        if($("[data-s]")) $("[data-s]").onclick=()=>{
          const left=qs.map((x,k)=>x.pick===null?k+1:null).filter(Boolean);
          if(left.length){ $("[data-m]").innerHTML=`<div class="msg bad">ยังไม่ได้ตอบข้อ ${left.join(", ")}</div>`; return; }
          result(qs);
        };
        root.scrollIntoView({block:"start"});
      }
      draw();
    }
    function result(qs){
      const ok=qs.filter(q=>q.pick===q.ans).length, n=qs.length, pct=Math.round(ok/n*100);
      S() && S().record({key:o.key, mod:o.mod, item:o.item, score:ok, max:n});
      const passed = o.pass ? ok>=o.pass : pct>=80;
      root.innerHTML=`<div class="qbox"><h2>ผล${esc(o.title)}</h2>
        <div class="score ${passed?"ok":pct>=60?"mid":"bad"}"><div class="big">${ok}/${n}</div><div>${pct}%${o.pass?(passed?" · ผ่าน":" · ยังไม่ผ่าน"):""}</div></div>
        ${qs.map((q,k)=>{const g=q.pick===q.ans;return `<div class="alarm"><div class="qr ${g?"good":"bad"}"><b>${k+1}. ${esc(q.q)}</b>
          <div>${g?"✓":"✗"} คำตอบของคุณ: ${L[q.pick]}. ${esc(q.o[q.ord[q.pick]])}</div>
          ${g?"":`<div class="okans">คำตอบที่ถูก: ${L[q.ans]}. ${esc(q.o[0])}</div>`}<div class="muted small">${esc(q.e)}</div></div></div>`;}).join("")}
        <div class="tools"><button class="primary" data-r>ทำชุดใหม่</button>${o.next?`<a class="btn" href="${o.next[0]}">${esc(o.next[1])}</a>`:""}</div></div>`;
      root.querySelector("[data-r]").onclick=start;
      root.scrollIntoView({block:"start"});
      if(o.onDone) o.onDone(passed);
    }
    intro();
  }

  /* ---------- ด่านความปลอดภัย ---------- */
  function showSafety(){
    const root=document.getElementById("safety-root");
    root.innerHTML=`<h1>ด่านความปลอดภัย</h1><p class="muted">${esc(SAF.intro)}</p>
      ${safetyOK()?`<div class="msg ok">✓ ผ่านด่านความปลอดภัยแล้ว เข้าโมดูล 6–8 ได้</div>`:""}
      <div class="rules">${SAF.rules.map(r=>`<div class="rule"><span class="ri">${r[0]}</span><div><b>${esc(r[1])}</b><p>${esc(r[2])}</p></div></div>`).join("")}</div>
      <div id="saf-q"></div>`;
    quiz(root.querySelector("#saf-q"), {bank:SAF.quiz, n:5, key:"safety", mod:"0-ด่านความปลอดภัย", item:"ด่านความปลอดภัย", pass:CR.safety, title:"แบบทดสอบด่านความปลอดภัย",
      next:["#m6","ไปโมดูล 6 →"], onDone:()=>{ refreshHome(); }});
  }

  /* ---------- หน้าโมดูล ---------- */
  function showMod(m){
    const root=document.getElementById(m.id+"-root");
    if(root.dataset.done) return;
    root.dataset.done="1";
    if(m.sim){ window.Repair && window.Repair.mount(root, m); return; }
    const nx=MODS[m.no];
    root.innerHTML=`<div class="kicker">โมดูล ${m.no} · ${esc(m.en)}</div><h1>${esc(m.n)}</h1><p class="muted">${esc(m.intro)}</p>
      <div class="toc">${m.sections.map((s,i)=>`<a href="#${m.id}" data-sec="${i}">${esc(s.h)}</a>`).join("")}<a href="#${m.id}" data-sec="q">แบบทดสอบท้ายบท</a></div>
      ${m.sections.map((s,i)=>`<section class="sec" id="${m.id}-s${i}"><h2>${esc(s.h)}</h2>${s.b}${s.w?`<div class="wgt" data-w="${s.w}"></div>`:""}</section>`).join("")}
      <section class="sec" id="${m.id}-sq"><div id="${m.id}-quiz"></div></section>`;
    root.querySelectorAll("[data-sec]").forEach(a=>a.onclick=e=>{e.preventDefault();const el=document.getElementById(m.id+"-s"+a.dataset.sec);if(el)el.scrollIntoView({behavior:"smooth",block:"start"});});
    root.querySelectorAll(".wgt").forEach(w=>{ const f=window.Widgets&&window.Widgets[w.dataset.w]; if(f) f(w); });
    quiz(document.getElementById(m.id+"-quiz"), {bank:m.quiz, n:m.perTest, key:"mq:"+m.id, mod:`${m.no}-${m.n}`, item:`ท้ายบทโมดูล ${m.no} ${m.n}`, title:`แบบทดสอบท้ายบท โมดูล ${m.no}`,
      next: nx ? ["#"+nx.id, `ไปโมดูล ${nx.no} →`] : null, onDone:()=>refreshHome()});
  }

  /* ---------- หน้าแรก ---------- */
  function refreshHome(){
    const box=document.getElementById("home-cards"); if(!box) return;
    const ok=safetyOK();
    const st = m => { const b=best("mq:"+m.id); return b?`<span class="tag ok">ท้ายบท ${Math.round(b.v*100)}%</span>`:`<span class="tag">ยังไม่ได้ทำท้ายบท</span>`; };
    const sb=best("safety");
    box.innerHTML=`<a class="card gate ${ok?"done":""}" href="#safety"><div class="num">ด่านแรก</div><h3>ความปลอดภัย ${ok?"✓":"🔒"}</h3><p>ออกซิเจนกับไฟ น้ำมันและจาระบี การถอดปลั๊ก งานที่เดินเครื่องขณะเปิดฝา ต้องถูกครบ 5 ข้อก่อนเข้าโมดูล 6–8</p>${sb?`<span class="tag ${ok?"ok":""}">ดีที่สุด ${sb.score}/${sb.max}</span>`:""}</a>`+
      MODS.map(m=>{const lock=LOCKED.includes(m.id)&&!ok&&!window.PREVIEW; return `<a class="card ${lock?"locked":""}" href="#${m.id}"><div class="num">โมดูล ${m.no}${lock?" · 🔒":""}</div><h3>${esc(m.n)}</h3><p>${esc(m.intro)}</p>${m.sim?simTag():st(m)}</a>`;}).join("");
  }
  function simTag(){ const R=window.Repair; if(!R) return ""; const p=R.progress(); return `<span class="tag ${p.n>=CR.examCases?"ok":""}">โหมดสอบ ${p.n}/${CR.examCases}${p.n?" · เฉลี่ย "+p.avg:""}</span>`; }

  /* ---------- เส้นทาง ---------- */
  function route(){
    const v=(location.hash||"#home").slice(1);
    const names=[...document.querySelectorAll("#nav a")].map(x=>x.dataset.v);
    let name=names.includes(v)?v:"home";
    if(LOCKED.includes(name) && !safetyOK() && !window.PREVIEW){
      document.getElementById("gate-to").textContent = "โมดูล "+name.slice(1);
      name="gate";
    }
    document.querySelectorAll(".view").forEach(s=>s.classList.toggle("on",s.id==="v-"+name));
    document.querySelectorAll("#nav a").forEach(a=>a.classList.toggle("on",a.dataset.v===name));
    const na=document.querySelector("#nav a.on"); if(na){const nv=document.getElementById("nav"); nv.scrollLeft=na.offsetLeft-nv.clientWidth/2+na.offsetWidth/2;}
    if(name==="home") refreshHome();
    if(name==="safety") showSafety();
    const m=MODS.find(x=>x.id===name); if(m) showMod(m);
    if(window.Views && window.Views[name]) window.Views[name].show();
    window.scrollTo(0,0);
  }
  window.addEventListener("hashchange",route);
  window.addEventListener("DOMContentLoaded",route);
  window.App={refreshHome, safetyOK, esc};
})();
