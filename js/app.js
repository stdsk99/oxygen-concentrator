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
  /* ลำดับการเรียน: ต้องผ่านขั้นก่อนหน้าก่อน ขั้นถัดไปจึงเปิด */
  const SEQ = ["m1","m2","m3","m4","m5","safety","m6","m7","m8"];
  const PASS = (CR.passPct||80)/100;
  const label = id => id==="safety" ? "ด่านความปลอดภัย" : "โมดูล "+id.slice(1);
  const passed = id => { if(id==="safety") return safetyOK(); const b=best("mq:"+id); return !!(b && b.v>=PASS-1e-9); };
  const blocker = id => { const i=SEQ.indexOf(id); for(let k=0;k<i;k++) if(!passed(SEQ[k])) return SEQ[k]; return null; };
  const isLocked = id => !window.PREVIEW && SEQ.includes(id) && !!blocker(id);
  /* ต้องเปิดอ่านทุกหัวข้อก่อนเริ่มแบบทดสอบท้ายบท (js/seen.js) · โมดูลจำลองการซ่อมไม่นับ */
  if(window.Seen){
    const goSec=(v,el)=>{ if(location.hash!=="#"+v) location.hash="#"+v; setTimeout(()=>{ const d=document.getElementById(el); if(d){ if(d.tagName==="DETAILS") d.open=true; d.scrollIntoView({behavior:"smooth",block:"start"}); } },80); };
    MODS.filter(m=>!m.sim && m.sections).forEach(m=>Seen.define(m.id, ()=>m.sections.map((s,i)=>({id:"s"+i, n:s.h})), id=>goSec(m.id, m.id+"-"+id), ()=>passed(m.id)));
    if(SAF && SAF.rules) Seen.define("safety", ()=>SAF.rules.map((r,i)=>({id:"r"+i, n:r[1]})), id=>goSec("safety", "saf-"+id), ()=>safetyOK());
  }
  const nextOf = id => { const i=SEQ.indexOf(id); return i>=0 && i<SEQ.length-1 ? SEQ[i+1] : null; };

  /* ---------- เกณฑ์ผ่าน (ใช้แทนเกณฑ์เดิมใน cert.js) ---------- */
  window.CertProgress = function(hist){
    let saf=0; const mq={}, ex={};
    hist.forEach(h=>{ const k=h.key||"", pc=h.max?Math.round(h.score/h.max*100):0;
      if(k==="safety") saf=Math.max(saf, +h.score);
      if(k.indexOf("mq:")===0) mq[k]=Math.max(mq[k]||0, pc);
      if(k.indexOf("exam:")===0) ex[k]=Math.max(ex[k]||0, +h.score);
    });
    const nq=Object.values(mq).filter(v=>v>=(CR.passPct||80)).length, ev=Object.values(ex), avg=ev.length?Math.round(ev.reduce((a,b)=>a+b,0)/ev.length):0;
    const parts=MODS.filter(m=>!m.sim).map(m=>mq["mq:"+m.id]||0).concat([avg]);
    const total=Math.round(parts.reduce((a,b)=>a+b,0)/parts.length);
    const items=[
      {n:`ด่านความปลอดภัย ถูกครบ ${CR.safety} ข้อ`, v:saf?`ดีที่สุด ${saf}/${CR.safety}`:"ยังไม่ได้ทำ", ok:saf>=CR.safety},
      {n:`ผ่านท้ายบท ครบ ${CR.modQuiz} โมดูล (1–7) โมดูลละ ≥ ${CR.passPct||80}%`, v:`${nq}/${CR.modQuiz}`, ok:nq>=CR.modQuiz},
      {n:`โจทย์ซ่อมจำลอง โหมดสอบ ครบ ${CR.examCases} เคส`, v:`${ev.length}/${CR.examCases}${ev.length?" · เฉลี่ย "+avg:""}`, ok:ev.length>=CR.examCases},
      {n:`คะแนนรวม ≥ ${CR.totalPct}% (ท้ายบท 1–7 และโหมดสอบ เฉลี่ยกัน)`, v:`${total}%`, ok:total>=CR.totalPct}
    ];
    return {items, pass:items.every(i=>i.ok), line:`ด่านความปลอดภัย ${saf}/${CR.safety} · ผ่านท้ายบท ${nq} โมดูล · โจทย์ซ่อม ${ev.length} เคส เฉลี่ย ${avg} · คะแนนรวม ${total}%`};
  };

  /* ---------- แบบทดสอบ (ใช้ทั้งด่านความปลอดภัยและท้ายบท) ---------- */
  function quiz(root, o){   // o: {bank, n, key, mod, item, pass, title, onDone}
    function intro(){
      const sn=(o.scope && window.Seen)?Seen.status(o.scope):{ok:true};
      if(!sn.ok){ root.innerHTML=`<div class="qbox"><h2>${esc(o.title)}</h2>${Seen.gateHTML(o.scope)}</div>`; return; }
      const b=best(o.key);
      root.innerHTML=`<div class="qbox"><h2>${esc(o.title)}</h2>
        <p class="muted small">สุ่ม ${Math.min(o.n,o.bank.length)} ข้อจากคลัง ${o.bank.length} ข้อ ต้องถูก ${o.pass} ข้อขึ้นไปจึงผ่าน${o.unlock?` และเปิด${esc(o.unlock)}`:""} · ตอบผิดทำใหม่ได้ ระบบสุ่มชุดใหม่ทุกครั้ง</p>
        ${b?`<p class="hint">ดีที่สุดของคุณ: ${b.score}/${b.max} (${Math.round(b.v*100)}%)</p>`:""}
        <div class="tools"><button class="primary" data-go>${b?"ทำอีกครั้ง":"เริ่มทำแบบทดสอบ"}</button></div></div>`;
      root.querySelector("[data-go]").onclick=start;
    }
    function start(){
      const qs=(window.QPick?QPick.pick(o.key,o.bank,o.n):shuffle(o.bank).slice(0,Math.min(o.n,o.bank.length))).map(b=>{const ord=shuffle(b.o.map((t,k)=>k));return {...b,ord,ans:ord.indexOf(0),pick:null};});
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
      S() && S().record({key:o.key, mod:o.mod, item:o.item, score:ok, max:n, q:window.QPick?QPick.ids(qs):""});
      const passed = ok>=o.pass;
      root.innerHTML=`<div class="qbox"><h2>ผล${esc(o.title)}</h2>
        <div class="score ${passed?"ok":pct>=60?"mid":"bad"}"><div class="big">${ok}/${n}</div><div>${pct}% · ${passed?"ผ่าน":"ยังไม่ผ่าน"}</div></div>
        ${passed?(o.unlock?`<div class="msg ok">✓ ผ่านแล้ว เปิด${esc(o.unlock)} แล้ว</div>`:""):`<div class="msg bad">ต้องถูก ${o.pass} ข้อขึ้นไป${o.unlock?` จึงจะเปิด${esc(o.unlock)}`:""} อ่านเฉลยแล้วกด “ทำชุดใหม่”</div>`}
        ${qs.map((q,k)=>{const g=q.pick===q.ans;return `<div class="alarm"><div class="qr ${g?"good":"bad"}"><b>${k+1}. ${esc(q.q)}</b>
          <div>${g?"✓":"✗"} คำตอบของคุณ: ${L[q.pick]}. ${esc(q.o[q.ord[q.pick]])}</div>
          ${g?"":`<div class="okans">คำตอบที่ถูก: ${L[q.ans]}. ${esc(q.o[0])}</div>`}<div class="muted small">${esc(q.e)}</div></div></div>`;}).join("")}
        <div class="tools">${passed&&o.next?`<a class="btn primary" href="${o.next[0]}">${esc(o.next[1])}</a><button data-r>ทำชุดใหม่</button>`:`<button class="primary" data-r>ทำชุดใหม่</button>`}</div></div>`;
      root.querySelector("[data-r]").onclick=start;
      root.scrollIntoView({block:"start"});
      if(o.onDone) o.onDone(passed);
    }
    if(o.scope) document.addEventListener("seen-change", e=>{ if(e.detail && e.detail.scope===o.scope && root.querySelector(".seen-gate")) intro(); });
    intro();
  }

  /* ---------- ด่านความปลอดภัย ---------- */
  function showSafety(){
    const root=document.getElementById("safety-root");
    root.innerHTML=`<h1>ด่านความปลอดภัย</h1><p class="muted">${esc(SAF.intro)}</p>
      ${safetyOK()?`<div class="msg ok">✓ ผ่านด่านความปลอดภัยแล้ว เข้าโมดูล 6 ได้</div>`:""}
      <p class="small muted">แตะแต่ละข้อเพื่ออ่านรายละเอียด ต้องเปิดอ่านครบทุกข้อจึงจะเริ่มทำแบบทดสอบได้</p>
      <div class="rules">${SAF.rules.map((r,i)=>`<details class="rule" id="saf-r${i}" data-seen="safety|r${i}"><summary><span class="ri">${r[0]}</span><b>${esc(r[1])}</b></summary><p>${esc(r[2])}</p></details>`).join("")}</div>
      <div id="saf-q"></div>`;
    quiz(root.querySelector("#saf-q"), {scope:"safety", bank:SAF.quiz, n:5, key:"safety", mod:"0-ด่านความปลอดภัย", item:"ด่านความปลอดภัย", pass:CR.safety, unlock:"โมดูล 6", title:"แบบทดสอบด่านความปลอดภัย",
      next:["#m6","ไปโมดูล 6 →"], onDone:()=>{ refreshHome(); navLocks(); }});
  }

  /* ---------- หน้าโมดูล ---------- */
  function showMod(m){
    const root=document.getElementById(m.id+"-root");
    if(root.dataset.done) return;
    root.dataset.done="1";
    if(m.sim){ window.Repair && window.Repair.mount(root, m); return; }
    const nxId=nextOf(m.id);
    root.innerHTML=`<div class="kicker">โมดูล ${m.no} · ${esc(m.en)}</div><h1>${esc(m.n)}</h1><p class="muted">${esc(m.intro)}</p>
      <div class="toc">${m.sections.map((s,i)=>`<a href="#${m.id}" data-sec="${i}">${esc(s.h)}</a>`).join("")}<a href="#${m.id}" data-sec="q">แบบทดสอบท้ายบท</a></div>
      <p class="small muted">แตะหัวข้อเพื่อเปิดอ่าน ต้องเปิดอ่านครบทุกหัวข้อจึงจะเริ่มทำแบบทดสอบท้ายบทได้</p>
      ${m.sections.map((s,i)=>`<details class="sec" id="${m.id}-s${i}" data-seen="${m.id}|s${i}"${i===0?" open":""}><summary><h2>${esc(s.h)}</h2></summary>${s.b}${s.w?`<div class="wgt" data-w="${s.w}"></div>`:""}</details>`).join("")}
      <section class="sec" id="${m.id}-sq"><div id="${m.id}-quiz"></div></section>`;
    root.querySelectorAll("[data-sec]").forEach(a=>a.onclick=e=>{e.preventDefault();const el=document.getElementById(m.id+"-s"+a.dataset.sec);if(el&&el.tagName==="DETAILS")el.open=true;if(el)el.scrollIntoView({behavior:"smooth",block:"start"});});
    root.querySelectorAll(".wgt").forEach(w=>{ const f=window.Widgets&&window.Widgets[w.dataset.w]; if(f) f(w); });
    quiz(document.getElementById(m.id+"-quiz"), {scope:m.id, bank:m.quiz, n:m.perTest, key:"mq:"+m.id, mod:`${m.no}-${m.n}`, item:`ท้ายบทโมดูล ${m.no} ${m.n}`, title:`แบบทดสอบท้ายบท โมดูล ${m.no}`,
      pass:Math.ceil(m.perTest*PASS), unlock:label(nxId),
      next: ["#"+nxId, `ไป${label(nxId)} →`], onDone:()=>{ refreshHome(); navLocks(); }});
  }

  /* ---------- หน้าแรก ---------- */
  function refreshHome(){
    const box=document.getElementById("home-cards"); if(!box) return;
    const ok=safetyOK();
    const st = m => { const b=best("mq:"+m.id); return b?`<span class="tag ${b.v>=PASS-1e-9?"ok":""}">ท้ายบท ${b.score}/${b.max}${b.v>=PASS-1e-9?" · ผ่าน":" · ยังไม่ผ่าน"}</span>`:`<span class="tag">ยังไม่ได้ทำท้ายบท</span>`; };
    const sb=best("safety");
    const safCard=()=>{ const lock=isLocked("safety"); return `<a class="card gate ${ok?"done":""} ${lock?"locked":""}" href="#safety"><div class="num">ด่านความปลอดภัย${lock?" · 🔒":ok?" · ✓":""}</div><h3>ความปลอดภัย</h3><p>ออกซิเจนกับไฟ น้ำมันและจาระบี การถอดปลั๊ก งานที่เดินเครื่องขณะเปิดฝา ต้องถูกครบ 5 ข้อก่อนเข้าโมดูล 6</p>${sb?`<span class="tag ${ok?"ok":""}">ดีที่สุด ${sb.score}/${sb.max}</span>`:""}</a>`; };
    box.innerHTML=SEQ.map(id=>{ if(id==="safety") return safCard(); const m=MODS.find(x=>x.id===id), lock=isLocked(id), done=!m.sim&&passed(id);
      return `<a class="card ${lock?"locked":""}" href="#${m.id}"><div class="num">โมดูล ${m.no}${lock?" · 🔒":done?" · ✓":""}</div><h3>${esc(m.n)}</h3><p>${esc(m.intro)}</p>${m.sim?simTag():st(m)}</a>`; }).join("");
  }
  function simTag(){ const R=window.Repair; if(!R) return ""; const p=R.progress(); return `<span class="tag ${p.n>=CR.examCases?"ok":""}">โหมดสอบ ${p.n}/${CR.examCases}${p.n?" · เฉลี่ย "+p.avg:""}</span>`; }

  /* ---------- เส้นทาง ---------- */
  function route(){
    const v=(location.hash||"#home").slice(1);
    const names=[...document.querySelectorAll("#nav a")].map(x=>x.dataset.v);
    let name=names.includes(v)?v:"home";
    if(isLocked(name)){
      const bk=blocker(name);
      document.getElementById("gate-to").textContent = label(name);
      document.getElementById("gate-need").textContent = label(bk);
      document.getElementById("gate-go").href = "#"+bk;
      document.getElementById("gate-go").textContent = "ไป"+label(bk)+" →";
      name="gate";
    }
    document.querySelectorAll(".view").forEach(s=>s.classList.toggle("on",s.id==="v-"+name));
    document.querySelectorAll("#nav a").forEach(a=>a.classList.toggle("on",a.dataset.v===name));
    const na=document.querySelector("#nav a.on"); if(na){const nv=document.getElementById("nav"); nv.scrollLeft=na.offsetLeft-nv.clientWidth/2+na.offsetWidth/2;}
    navLocks();
    if(name==="home") refreshHome();
    if(name==="safety") showSafety();
    const m=MODS.find(x=>x.id===name); if(m) showMod(m);
    if(window.Views && window.Views[name]) window.Views[name].show();
    window.scrollTo(0,0);
  }
  window.addEventListener("hashchange",route);
  window.addEventListener("DOMContentLoaded",route);
  function navLocks(){ document.querySelectorAll("#nav a").forEach(a=>a.classList.toggle("lk", isLocked(a.dataset.v))); }
  window.App={refreshHome, safetyOK, esc};
})();
