/* ===== สื่อโต้ตอบในบทเรียน (โมดูล 1–7) =====
   แต่ละฟังก์ชันรับ element ที่จะวาดลงไป เรียกจาก app.js ตาม data-w ของหัวข้อ */
(function(){
  const esc = s => String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const P = window.PARTS, Z = window.ZONES, D = window.Diagram;
  const li = a => a.map(s=>`<li>${esc(s)}</li>`).join("");
  const W = {};

  function partInfo(id, full){
    const o=P[id]; if(!o) return "";
    return `<div class="en">${esc(o.n)} · ${esc(Z[o.z].n)}</div><h3>${esc(o.th)}</h3><p>${esc(o.f)}</p>
      <h4>อาการเมื่อเสีย</h4><ul>${li(o.x)}</ul>
      ${full?`<h4>ขั้นตอนถอดเปลี่ยน</h4><ol>${li(o.rm)}</ol>${o.warn?`<div class="msg bad">⚠ ${esc(o.warn)}</div>`:""}<h4>ทดสอบหลังเปลี่ยน</h4><ul>${li(o.t)}</ul>`:""}`;
  }

  /* ---------- 1.1 ภาพรวม 4 ระบบ ---------- */
  W.overview = el=>{
    el.innerHTML=`<figure>${D.svg({zones:true})}<figcaption>แตะโซนสีหรือชิ้นส่วน</figcaption></figure>
      <div class="zchips">${Object.entries(Z).map(([k,z])=>`<button data-z="${k}" style="--zc:${z.c}">${esc(z.n)}</button>`).join("")}</div>
      <div class="panel" data-p><p class="muted">แตะโซนเพื่อดูว่าระบบนั้นทำอะไร</p></div>`;
    const svg=el.querySelector("svg"), pn=el.querySelector("[data-p]");
    function zone(k, pid){
      svg.classList.add("zsel"); svg.querySelectorAll(".zone,.part").forEach(g=>g.classList.toggle("zon",(g.dataset.zone||g.dataset.z)===k));
      svg.querySelectorAll(".part").forEach(g=>g.classList.toggle("sel",g.dataset.id===pid));
      el.querySelectorAll(".zchips button").forEach(b=>b.classList.toggle("on",b.dataset.z===k));
      const z=Z[k];
      pn.innerHTML=`<div class="en" style="color:${z.c}">ระบบ</div><h3>${esc(z.n)}</h3><p>${esc(z.d)}</p>
        <div class="chips">${z.parts.map(id=>`<button data-pid="${id}" class="${id===pid?"on":""}">${esc(P[id].th)}</button>`).join("")}</div>
        ${pid?partInfo(pid):""}`;
      pn.querySelectorAll("[data-pid]").forEach(b=>b.onclick=()=>zone(k,b.dataset.pid));
    }
    el.querySelectorAll(".zchips button").forEach(b=>b.onclick=()=>zone(b.dataset.z));
    svg.addEventListener("click",e=>{ const p=e.target.closest(".part"); if(p) return zone(p.dataset.z,p.dataset.id); const z=e.target.closest(".zone"); if(z) zone(z.dataset.zone); });
  };

  /* ---------- 1.2 เส้นทางอากาศทีละจุด ---------- */
  W.path = el=>{
    const PA=window.PATH;
    el.innerHTML=`<figure>${D.svg({})}</figure>
      <div class="tools"><button data-a="p">← ก่อนหน้า</button><button class="primary" data-a="n">ถัดไป →</button><button class="ghost" data-a="r">เริ่มใหม่</button></div>
      <ol class="stepper pathlist">${PA.map((s,i)=>`<li data-i="${i}"><span>${i+1}</span>${esc(s[1])}</li>`).join("")}</ol>
      <div class="panel" data-p hidden></div>`;
    const svg=el.querySelector("svg"), pn=el.querySelector("[data-p]"); let i=-1;
    function show(){
      const lit=new Set(); PA.slice(0,i+1).forEach(s=>(D.STEP_SEG[s[0]]||[]).forEach(x=>lit.add(x)));
      const cur=new Set(i>=0?(D.STEP_SEG[PA[i][0]]||[]):[]);
      svg.querySelectorAll(".seg").forEach(p=>{p.classList.toggle("lit",lit.has(p.dataset.s)); p.classList.toggle("cur",cur.has(p.dataset.s));});
      svg.querySelectorAll(".part").forEach(g=>g.classList.toggle("sel", i>=0 && g.dataset.id===PA[i][0]));
      el.querySelectorAll(".pathlist li").forEach((l,k)=>{l.classList.toggle("on",k===i); l.classList.toggle("ok",k<i);});
      if(i>=0 && P[PA[i][0]]){ pn.hidden=false; pn.innerHTML=partInfo(PA[i][0]); } else if(i>=0){ pn.hidden=false; pn.innerHTML=`<h3>ถึงผู้ป่วย</h3><p>${esc(PA[i][1])}</p>`; } else pn.hidden=true;
    }
    el.querySelector('[data-a="n"]').onclick=()=>{ if(i<PA.length-1) i++; show(); };
    el.querySelector('[data-a="p"]').onclick=()=>{ if(i>-1) i--; show(); };
    el.querySelector('[data-a="r"]').onclick=()=>{ i=-1; show(); };
    el.querySelectorAll(".pathlist li").forEach(l=>l.onclick=()=>{ i=+l.dataset.i; show(); });
    svg.addEventListener("click",e=>{ const p=e.target.closest(".part"); if(!p) return; const k=PA.findIndex(s=>s[0]===p.dataset.id);
      if(k>=0){ i=k; show(); } else { svg.querySelectorAll(".part").forEach(g=>g.classList.toggle("sel",g===p)); pn.hidden=false; pn.innerHTML=partInfo(p.dataset.id); } });
    show();
  };

  /* ---------- 1.3 วงจรแรงดันสองถัง ---------- */
  function bedP(t, T, peak, low){   // แรงดันถังที่กำลังถูกอัด ณ เวลา t ภายในครึ่งรอบ
    const k=3/T; return low+(peak-low)*(1-Math.exp(-k*t))/(1-Math.exp(-k*T));
  }
  W.cycle = el=>{
    const T=12, PEt=1;
    let hi=true, t=0, run=false, last=0, raf=0;
    el.innerHTML=`<div class="tools"><div class="seg"><button data-f="hi" class="on">5 L/min (สลับที่ 21 psi)</button><button data-f="lo">2 L/min (สลับที่ 16 psi)</button></div><button data-run>▶ เดินเครื่อง</button></div>
      <figure><svg class="dia" viewBox="0 0 600 260" role="img" aria-label="กราฟแรงดันของถัง A และ B ตามเวลา">
        <g class="grid">${[0,5,10,15,20,25].map(v=>`<line x1="40" x2="590" y1="${220-v*8}" y2="${220-v*8}"/><text class="lbl s" x="34" y="${224-v*8}" text-anchor="end">${v}</text>`).join("")}</g>
        <text class="lbl s" x="8" y="14">psi</text><text class="lbl s" x="590" y="244" text-anchor="end">เวลา (วินาที) →</text>
        <path class="trA" data-tr="A"/><path class="trB" data-tr="B"/><line class="cur" data-cur x1="40" x2="40" y1="10" y2="220"/>
        <g class="pewin" data-pe></g>
      </svg><figcaption><span class="lgA">━ ถัง A</span> <span class="lgB">━ ถัง B</span> · แถบเหลือง = P.E. valve เปิด</figcaption></figure>
      <div class="cyst"><div><small>ถัง A</small><b data-pa>–</b></div><div><small>ถัง B</small><b data-pb>–</b></div><div><small>4-way valve</small><b data-v>–</b></div><div><small>P.E. valve</small><b data-pv>–</b></div></div>
      <p class="muted small" data-say></p>`;
    const $=s=>el.querySelector(s), X=s=>40+s*(550/48), Y=p=>220-p*8;
    function state(tt){
      const peak=hi?21:16, low=hi?12:9, half=Math.floor(tt/T), tin=tt%T, feedA=half%2===0;
      const pf=bedP(tin,T,peak,low), pp=Math.max(0.5, 3*Math.exp(-tin/1.5)) + (tin>T-PEt?(tin-(T-PEt))*3:0);
      return {pA:feedA?pf:pp, pB:feedA?pp:pf, feedA, pe:tin>T-PEt};
    }
    function trace(){
      let a="",b="";
      for(let s=0;s<=48;s+=0.2){ const st=state(s); a+=(s?"L":"M")+X(s).toFixed(1)+" "+Y(st.pA).toFixed(1); b+=(s?"L":"M")+X(s).toFixed(1)+" "+Y(st.pB).toFixed(1); }
      $('[data-tr="A"]').setAttribute("d",a); $('[data-tr="B"]').setAttribute("d",b);
      $("[data-pe]").innerHTML=[1,2,3,4].map(n=>`<rect x="${X(n*T-PEt)}" y="10" width="${X(PEt)-40}" height="210"/>`).join("");
    }
    function paint(){
      const st=state(t%48);
      $("[data-cur]").setAttribute("x1",X(t%48)); $("[data-cur]").setAttribute("x2",X(t%48));
      $("[data-pa]").textContent=st.pA.toFixed(1)+" psi"; $("[data-pb]").textContent=st.pB.toFixed(1)+" psi";
      $("[data-v]").textContent=st.feedA?"อัด → A · B → ไอเสีย":"อัด → B · A → ไอเสีย";
      $("[data-pv]").textContent=st.pe?"เปิด":"ปิด"; $("[data-pv]").className=st.pe?"on":"";
      $("[data-say]").textContent= st.pe ? "P.E. valve เปิด: ออกซิเจนจากถังที่ผลิตไหลเข้าถังที่เพิ่งไล่ไนโตรเจน ใกล้ถึงจุดสลับ"
        : `ถัง ${st.feedA?"A":"B"} กำลังผลิตออกซิเจน แรงดันขึ้นสู่ ${hi?21:16} psi · ถัง ${st.feedA?"B":"A"} ปล่อยไนโตรเจนออกทางไอเสีย`;
    }
    function loop(ts){ if(!run) return; if(last) t+=(ts-last)/1000*3; last=ts; paint(); raf=requestAnimationFrame(loop); }
    $("[data-run]").onclick=()=>{ run=!run; $("[data-run]").textContent=run?"■ หยุด":"▶ เดินเครื่อง"; $("[data-run]").classList.toggle("on",run); last=0; if(run) raf=requestAnimationFrame(loop); };
    el.querySelectorAll("[data-f]").forEach(b=>b.onclick=()=>{ hi=b.dataset.f==="hi"; el.querySelectorAll("[data-f]").forEach(x=>x.classList.toggle("on",x===b)); trace(); paint(); });
    trace(); paint();
    new IntersectionObserver(es=>es.forEach(e=>{ if(!e.isIntersecting && run){ run=false; $("[data-run]").textContent="▶ เดินเครื่อง"; $("[data-run]").classList.remove("on"); } })).observe(el);
  };

  /* ---------- 2.2 แผงหน้าเครื่องจำลอง ---------- */
  W.panel = el=>{
    const SC={norm:{n:"เครื่องปกติ",o2:93}, y:{n:"เครื่องเสื่อม (O₂ ได้แค่ 80%)",o2:80}, r:{n:"เครื่องเสียหนัก (O₂ ได้แค่ 68%)",o2:68}, sens:{n:"เซนเซอร์ O₂ เสีย",o2:93,sens:1}};
    let sc="norm", on=false, plug=true, t=0, flow=3, shut=false, charged=false, log=[];
    el.innerHTML=`<div class="pgrid"><figure class="fpanel"><svg class="dia" viewBox="0 0 220 260" role="img" aria-label="แผงหน้าเครื่องจำลอง">
        <rect x="6" y="6" width="208" height="248" rx="18" class="fp-body"/>
        <g data-led="g"><circle cx="46" cy="40" r="11" class="led g"/><text class="lbl s" x="46" y="66" text-anchor="middle">เขียว</text></g>
        <g data-led="y"><circle cx="110" cy="40" r="11" class="led y"/><text class="lbl s" x="110" y="66" text-anchor="middle">เหลือง</text></g>
        <g data-led="r"><circle cx="174" cy="40" r="11" class="led r"/><text class="lbl s" x="174" y="66" text-anchor="middle">แดง</text></g>
        <rect x="34" y="84" width="44" height="150" rx="20" class="fm-tube"/>
        ${[0,1,2,3,4,5].map(v=>`<line x1="78" x2="88" y1="${220-v*26}" y2="${220-v*26}" class="tick"/><text class="lbl s" x="92" y="${224-v*26}">${v}</text>`).join("")}
        <circle data-ball cx="56" cy="220" r="9" class="fm-ball"/>
        <rect x="128" y="96" width="74" height="26" rx="5" class="hm"/><text data-hm class="hmt" x="165" y="114" text-anchor="middle">01234.5</text>
        <text class="lbl s" x="165" y="136" text-anchor="middle">ชั่วโมง</text>
        <rect x="136" y="160" width="58" height="34" rx="6" class="sw" data-sw/><text data-swt class="lbl" x="165" y="182" text-anchor="middle">O</text>
        <text class="lbl s" x="165" y="210" text-anchor="middle">สวิตช์ I/O</text>
      </svg></figure>
      <div><div class="tools"><button class="primary" data-a="pw">เปิดเครื่อง</button><button data-a="plug">ถอดปลั๊ก</button></div>
        <label class="small">อัตราไหล <select data-flow>${[0.5,1,2,3,4,5,6].map(v=>`<option value="${v}" ${v===3?"selected":""}>${v===6?"เกินสูงสุด (>5)":v+" L/min"}</option>`).join("")}</select></label>
        <div class="tools"><button data-a="t1">+1 นาที</button><button data-a="t5">+5 นาที</button><button data-a="t30">+30 นาที</button></div>
        <label class="small">สภาพเครื่อง <select data-sc>${Object.entries(SC).map(([k,v])=>`<option value="${k}">${esc(v.n)}</option>`).join("")}</select></label>
        <div class="cyst"><div><small>เวลาหลังเปิด</small><b data-t>–</b></div><div><small>O₂ (analyzer)</small><b data-o>–</b></div></div>
        <ul class="plog" data-log></ul></div></div>`;
    const $=s=>el.querySelector(s);
    const o2=()=>{ if(!on||shut) return 21; const tg=flow>5?Math.min(SC[sc].o2,84):SC[sc].o2; return 21+(tg-21)*(1-Math.exp(-t/3)); };
    function lights(){
      if(!on||!plug) return {};
      if(shut) return {r:1};
      if(SC[sc].sens && t>=5) return {g:1, yb:1};
      if(t<30) return {g:1};
      const v=o2(); if(v<73) return {r:1}; if(v<85) return {y:1}; return {g:1};
    }
    function say(m){ log.unshift(m); log=log.slice(0,6); }
    function tick(dt){
      if(!on||!plug||shut) return;
      for(let k=0;k<dt;k++){ t++;
        if(t===5) say(SC[sc].sens?"5 นาที: เซนเซอร์ O₂ ผิดปกติ ไฟเหลืองกะพริบ เครื่องยังเดินต่อ":`5 นาที: O₂ ${o2().toFixed(0)}% ${o2()>=85?"ถึง 85% แล้ว ไฟเขียวติดต่อ":"ยังไม่ถึง 85% ระบบรอต่อได้ถึง 30 นาที"}`);
        if(t===30 && !SC[sc].sens){ const v=o2(); if(v<73){ shut=true; say("30 นาที: O₂ ต่ำกว่า 73% ไฟแดง เสียงเตือนต่อเนื่อง คอมเพรสเซอร์หยุด"); }
          else if(v<85) say("30 นาที: O₂ อยู่ระหว่าง 73–85% ไฟเหลือง เครื่องเดินต่อ"); else say("30 นาที: O₂ เกิน 85% ไฟเขียว ระบบวัดซ้ำทุก 10 นาที"); }
        if(t>30 && t%10===0 && !shut && !SC[sc].sens){ const v=o2(); if(v<73){ shut=true; say(`${t} นาที: O₂ ต่ำกว่า 73% ไฟแดง หยุดเครื่อง`);} }
      }
    }
    function paint(){
      const L=lights();
      el.querySelector('[data-led="g"] circle').classList.toggle("lit",!!L.g);
      el.querySelector('[data-led="y"] circle').classList.toggle("lit",!!(L.y||L.yb)); el.querySelector('[data-led="y"] circle').classList.toggle("blink",!!L.yb);
      el.querySelector('[data-led="r"] circle').classList.toggle("lit",!!L.r);
      const fv=on&&plug&&!shut?Math.min(flow,5.6):0; $("[data-ball]").setAttribute("cy",220-fv*26);
      $("[data-hm]").textContent=(1234.5+t/60).toFixed(1).padStart(7,"0");
      $("[data-swt]").textContent=on?"I":"O"; $("[data-sw]").classList.toggle("on",on);
      $('[data-a="pw"]').textContent=on?"ปิดเครื่อง":"เปิดเครื่อง"; $('[data-a="plug"]').textContent=plug?"ถอดปลั๊ก":"เสียบปลั๊ก";
      $("[data-t]").textContent=on?t+" นาที":"–"; $("[data-o]").textContent=on&&plug&&!shut?o2().toFixed(0)+"%":"–";
      $("[data-log]").innerHTML=log.map(m=>`<li>${esc(m)}</li>`).join("");
    }
    $('[data-a="pw"]').onclick=()=>{
      on=!on;
      if(on){ t=0; shut=false; if(plug){ say("เปิดเครื่อง: ปี๊บ 1 ครั้ง ไฟเขียวติดระหว่างรอเซนเซอร์ (5 นาทีแรก)"); setTimeout(()=>{ charged=true; },0);} else say(charged?"ไม่มีไฟเข้า: เสียงเตือนไฟดับดังเป็นจังหวะ (ปี๊บสั้น เว้นยาว)":"ไม่มีไฟเข้าและวงจรเตือนไฟดับยังไม่ได้ชาร์จ: เงียบ ไม่มีเสียงเตือน"); }
      else say("ปิดเครื่อง");
      paint();
    };
    $('[data-a="plug"]').onclick=()=>{ plug=!plug;
      if(!plug && on) say(charged?"ถอดปลั๊กขณะเปิดอยู่: เสียงเตือนไฟดับดังภายใน 30 วินาที":"ถอดปลั๊ก: วงจรเตือนไฟดับยังไม่ได้ชาร์จ จึงไม่มีเสียง");
      if(plug && on){ t=0; shut=false; charged=true; say("เสียบปลั๊กกลับ: เครื่องเริ่มใหม่ ปี๊บ 1 ครั้ง"); }
      paint(); };
    ["t1","t5","t30"].forEach(k=>$(`[data-a="${k}"]`).onclick=()=>{ if(!on||!plug){ say("ต้องเปิดเครื่องและเสียบปลั๊กก่อน"); } tick(+k.slice(1)); paint(); });
    $("[data-flow]").onchange=e=>{ flow=+e.target.value; if(flow>5) say("หมุน flowmeter เกินสูงสุด: O₂ จะลดลง"); paint(); };
    $("[data-sc]").onchange=e=>{ sc=e.target.value; on=false; t=0; shut=false; log=[]; say("เปลี่ยนสภาพเครื่อง: "+SC[sc].n+" · กดเปิดเครื่องเพื่อเริ่ม"); paint(); };
    say("กดเปิดเครื่อง แล้วใช้ปุ่ม +นาที เพื่อเร่งเวลา"); paint();
  };

  /* ---------- 3.3 ฝึกตัดสินผลตรวจรับ ---------- */
  W.accept = el=>{
    const OP={a:"รับ",c:"รับแบบมีเงื่อนไข",r:"ไม่รับ"};
    const CS=[
      {n:"เครื่อง A · ใหม่จากผู้ขาย", rows:[["เอกสาร/อุปกรณ์","ครบ"],["มิเตอร์ชั่วโมง","0.6 ชม."],["ไฟฟ้า","ผ่าน"],["alarm ไฟดับ","ดังใน 6 วินาที"],["O₂ ที่ 5 L/min (40 นาที)","94% ไฟเขียว"],["แรงดันขาออก","5.1 psi"]], ans:"a",
       why:"ทุกรายการผ่านเกณฑ์ รับเครื่องและบันทึกค่าเป็น baseline"},
      {n:"เครื่อง B · ใหม่จากผู้ขาย", rows:[["เอกสาร/อุปกรณ์","ไม่มีปลั๊กอุดช่องเติมถัง และไม่มีคู่มือซ่อม"],["มิเตอร์ชั่วโมง","0.4 ชม."],["ไฟฟ้า","ผ่าน"],["alarm ไฟดับ","ดังใน 9 วินาที"],["O₂ ที่ 5 L/min (40 นาที)","93% ไฟเขียว"],["แรงดันขาออก","4.9 psi"]], ans:"c",
       why:"สมรรถนะและความปลอดภัยผ่าน ขาดอุปกรณ์และเอกสาร รับแบบมีเงื่อนไขและติดตามให้ผู้ขายส่งของที่ขาด"},
      {n:"เครื่อง C · ใหม่จากผู้ขาย", rows:[["เอกสาร/อุปกรณ์","ครบ"],["มิเตอร์ชั่วโมง","0.5 ชม."],["ไฟฟ้า","ผ่าน"],["alarm ไฟดับ","ดังใน 7 วินาที"],["O₂ ที่ 5 L/min (40 นาที)","82% ไฟเหลือง"],["แรงดันขาออก","5.0 psi"]], ans:"r",
       why:"O₂ ต่ำกว่าสเปก 87% หลังวอร์มครบ ไม่รับ"},
      {n:"เครื่อง D · กลับจากซ่อมภายนอก", rows:[["เอกสาร/อุปกรณ์","ครบ มีรายงานการซ่อม"],["มิเตอร์ชั่วโมง","8,420 ชม."],["ไฟฟ้า","ผ่าน"],["alarm ไฟดับ","เปิดเครื่อง 40 นาทีแล้วถอดปลั๊ก ไม่มีเสียงใน 1 นาที"],["O₂ ที่ 5 L/min (40 นาที)","92% ไฟเขียว"],["แรงดันขาออก","5.0 psi"]], ans:"r",
       why:"วงจรได้ชาร์จแล้วแต่ alarm ไฟดับไม่ทำงาน เป็นระบบความปลอดภัย ไม่รับ"},
      {n:"เครื่อง E · ใหม่จากผู้ขาย", rows:[["เอกสาร/อุปกรณ์","ครบ"],["มิเตอร์ชั่วโมง","0.7 ชม."],["ไฟฟ้า","ผ่าน"],["alarm ไฟดับ","ดังใน 5 วินาที"],["O₂ ที่ 5 L/min (10 นาที)","84% ไฟเขียว"],["แรงดันขาออก","5.0 psi"]], ans:"wait",
       why:"วัด O₂ เมื่อเปิดเพียง 10 นาที ยังตัดสินไม่ได้ ต้องเดินเครื่องให้ครบประมาณ 30 นาทีแล้ววัดใหม่"}
    ];
    let i=0, pick=null;
    function draw(){
      const c=CS[i];
      el.innerHTML=`<div class="acase"><div class="simhead"><b>${esc(c.n)}</b><span class="muted small">${i+1}/${CS.length}</span></div>
        <div class="ov-tbl"><table><tbody>${c.rows.map(r=>`<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td></tr>`).join("")}</tbody></table></div>
        <div class="tools">${Object.entries(OP).map(([k,v])=>`<button data-k="${k}" class="${pick===k?(k===c.ans?"good":"bad"):""}">${v}</button>`).join("")}<button data-k="wait" class="${pick==="wait"?(c.ans==="wait"?"good":"bad"):""}">ยังตัดสินไม่ได้ ต้องวัดใหม่</button></div>
        ${pick?`<div class="msg ${pick===c.ans?"ok":"bad"}">${pick===c.ans?"✓ ถูกต้อง":"✗ ยังไม่ถูก คำตอบคือ “"+(OP[c.ans]||"ยังตัดสินไม่ได้ ต้องวัดใหม่")+"”"} · ${esc(c.why)}</div>
          <div class="tools">${i<CS.length-1?`<button class="primary" data-n>เครื่องถัดไป →</button>`:`<button class="primary" data-n>เริ่มใหม่</button>`}</div>`:""}</div>`;
      el.querySelectorAll("[data-k]").forEach(b=>b.onclick=()=>{ if(!pick){ pick=b.dataset.k; draw(); } });
      const n=el.querySelector("[data-n]"); if(n) n.onclick=()=>{ i=(i+1)%CS.length; pick=null; draw(); };
    }
    draw();
  };

  /* ---------- 4.1 คำนวณรอบ PM ---------- */
  W.pmcalc = el=>{
    el.innerHTML=`<div class="calc"><h3>เครื่องนี้ถึงรอบ PM หรือยัง</h3>
      <div class="cgrid"><label>ชั่วโมงบนมิเตอร์ตอนนี้<input type="number" data-h value="31500"></label>
      <label>ชั่วโมงตอนทำ PM ใหญ่ครั้งล่าสุด<input type="number" data-lh value="8200"></label>
      <label>วันที่ทำ PM ใหญ่ครั้งล่าสุด<input type="date" data-ld></label>
      <label class="chk"><input type="checkbox" data-pt> กำลังจะส่งให้ผู้ป่วยรายใหม่</label></div>
      <div data-out></div></div>`;
    const $=s=>el.querySelector(s), d0=new Date(); d0.setFullYear(d0.getFullYear()-2); d0.setMonth(d0.getMonth()-2);
    $("[data-ld]").value=d0.toISOString().slice(0,10);
    function calc(){
      const h=+$("[data-h]").value||0, lh=+$("[data-lh]").value||0, ld=new Date($("[data-ld]").value), pt=$("[data-pt]").checked;
      const used=h-lh, days=isNaN(ld)?0:Math.floor((Date.now()-ld)/864e5), yrs=days/365.25;
      const byH=used>=26280, byT=yrs>=3, due=byH||byT||pt;
      const leftH=Math.max(0,26280-used), leftD=Math.max(0,Math.round(3*365.25-days));
      $("[data-out]").innerHTML=`<div class="sumrow"><div><small>ใช้ไปตั้งแต่ PM ใหญ่</small><b>${used.toLocaleString()} ชม.</b></div><div><small>ผ่านมาแล้ว</small><b>${yrs.toFixed(1)} ปี</b></div></div>
        <div class="msg ${due?"bad":"ok"}">${due?`ถึงรอบ PM ใหญ่แล้ว (${[byH?"ครบ 26,280 ชั่วโมง":"",byT?"ครบ 3 ปี":"",pt?"เปลี่ยนผู้ป่วย":""].filter(Boolean).join(" · ")})`:`ยังไม่ถึงรอบ PM ใหญ่ เหลืออีกประมาณ ${leftH.toLocaleString()} ชั่วโมง หรือ ${leftD} วัน แล้วแต่อย่างใดถึงก่อน`}</div>
        <h4>งานที่ต้องทำครั้งนี้</h4><ul>${li(["บันทึกวันที่และชั่วโมงจากมิเตอร์","ทำความสะอาดไส้กรองตู้","ตรวจอัตราไหลตรงกับที่แพทย์สั่ง"].concat(due?["วัด O₂ หลังเดินเครื่อง 30 นาที","ทำความสะอาด/เปลี่ยนไส้กรองตู้","ตรวจ outlet HEPA ด้วยสาย 15 m","ตรวจ inlet HEPA","ทดสอบ alarm ไฟดับ"]:[]))}</ul>`;
    }
    el.querySelectorAll("input").forEach(x=>x.oninput=calc); calc();
  };

  /* ---------- เรียงขั้นตอน (ฝึก ไม่นับคะแนน) ---------- */
  const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
  function lis(a){ const n=a.length,len=Array(n).fill(1),pv=Array(n).fill(-1); for(let i=0;i<n;i++)for(let j=0;j<i;j++)if(a[j]<a[i]&&len[j]+1>len[i]){len[i]=len[j]+1;pv[i]=j;}
    let b=0;for(let i=1;i<n;i++)if(len[i]>len[b])b=i; const m=Array(n).fill(false); for(let i=n?b:-1;i>=0;i=pv[i])m[i]=true; return m; }
  function orderer(el, tasks){
    let ti=0, pool, seq, chk;
    function reset(){ pool=shuffle(tasks[ti].s.map((x,k)=>k)); seq=[]; chk=false; }
    function draw(){
      const t=tasks[ti], ok=chk?lis(seq):[], right=ok.filter(Boolean).length;
      el.innerHTML=`<div class="seg">${tasks.map((x,k)=>`<button data-t="${k}" class="${k===ti?"on":""}">${esc(x.n)}</button>`).join("")}</div>
        <div class="odgrid"><div><h4>ลำดับของฉัน</h4><ol class="seq">${seq.map((k,p)=>`<li class="${chk?(ok[p]?"good":"bad"):""}"><button class="sq" data-p="${p}" ${chk?"disabled":""}><span class="sn">${p+1}</span><span>${esc(t.s[k])}</span></button>${chk&&!ok[p]?`<div class="why">ควรเป็นขั้นที่ ${k+1}</div>`:""}</li>`).join("")}${seq.length?"":`<li class="ph">แตะขั้นตอนจากรายการ</li>`}</ol></div>
        <div><h4>ขั้นตอนที่ยังไม่ได้เรียง</h4><div class="pool">${pool.map(k=>`<button class="pl" data-k="${k}">${esc(t.s[k])}</button>`).join("")||`<p class="muted small">เรียงครบแล้ว</p>`}</div></div></div>
        ${chk?`<div class="score ${right===seq.length?"ok":"mid"}"><div class="big">${right}/${seq.length}</div><div>อยู่ในลำดับที่ถูก</div></div>`:""}
        <div class="tools">${chk?`<button class="primary" data-r>ลองใหม่</button>`:`<button class="primary" data-c ${pool.length?"disabled":""}>ตรวจคำตอบ</button>`}</div>`;
      el.querySelectorAll("[data-t]").forEach(b=>b.onclick=()=>{ ti=+b.dataset.t; reset(); draw(); });
      el.querySelectorAll(".pl").forEach(b=>b.onclick=()=>{ const k=+b.dataset.k; pool=pool.filter(x=>x!==k); seq.push(k); draw(); });
      el.querySelectorAll(".sq").forEach(b=>b.onclick=()=>{ const p=+b.dataset.p; pool.push(seq[p]); seq.splice(p,1); draw(); });
      const c=el.querySelector("[data-c]"); if(c) c.onclick=()=>{ chk=true; draw(); };
      const r=el.querySelector("[data-r]"); if(r) r.onclick=()=>{ reset(); draw(); };
    }
    reset(); draw();
  }
  W.pmorder = el=>orderer(el,[
    {n:"เปลี่ยน outlet HEPA", s:["ปิดเครื่องและถอดปลั๊ก","ไขสกรู 4 ตัวแล้วยกตู้ขึ้นตรง ๆ","ถอด inlet HEPA ออกเพื่อให้เข้าถึงง่าย","ใช้ไขควงปากแบนงัดท่อออกจากสองข้างของ outlet HEPA ตัวเก่า","ต่อท่อเข้ากับ outlet HEPA ตัวใหม่ทั้งสองข้าง","ใส่ inlet HEPA และตู้กลับ","เปิดเครื่อง ตั้งอัตราไหลสูงสุด ต่อสาย 15 m ดูว่าลูกลอยนิ่ง","บันทึกงานลงประวัติเครื่อง"]},
    {n:"เปลี่ยน muffler", s:["ปิดเครื่องและถอดปลั๊ก","ถอดตู้","ตัดเคเบิลไทร์ที่ยึดท่อไอเสียกับท่อตัว F","ถอดท่อไอเสียด้านล่างแล้วด้านบน","ดัน muffler ลงผ่านช่องของกล่องเก็บเสียง","ตัดเคเบิลไทร์รอบ muffler แล้วแยกชิ้นตรวจ","เปลี่ยน throttling muffler หรือทั้งชุดถ้า canister ตัน","ประกอบกลับ รัดเคเบิลไทร์ใหม่ และใส่ตู้","เดินเครื่อง ฟังเสียง และวัด O₂"]}
  ]);

  /* ---------- 5.1 ถอดรหัสไฟบนบอร์ด ---------- */
  W.codes = el=>{
    const CO=window.CODES, find=(r,g)=>{ let c=CO.find(x=>x.r===r&&x.g===g); if(c&&c.same){ const [a,b]=c.same.split("-").map(Number); c=Object.assign({},CO.find(x=>x.r===a&&x.g===b),{r,g}); } return c; };
    let r=1,g=2;
    function draw(){
      const c=find(r,g);
      el.innerHTML=`<div class="codepick"><div class="cnt"><span class="led r lit"></span> แดง <button data-d="r-">−</button><b>${r}</b><button data-d="r+">+</button></div>
        <div class="cnt"><span class="led g lit"></span> เขียว <button data-d="g-">−</button><b>${g}</b><button data-d="g+">+</button></div></div>
        <div class="blinkrow" aria-hidden="true">${Array.from({length:r},()=>`<i class="bl r"></i>`).join("")}<span>·</span>${Array.from({length:g},()=>`<i class="bl g"></i>`).join("")}</div>
        <div class="panel">${c?`<div class="en">แดง ${r} · เขียว ${g}</div><h3>${esc(c.n)}</h3><p><b>ไฟหน้าเครื่อง:</b> ${esc(c.front)} · ${esc(c.effect)}</p>
          <h4>สาเหตุที่เป็นไปได้</h4><ul>${li(c.causes)}</ul><h4>ลำดับการตรวจ</h4><ol>${li(c.check)}</ol>`
          :(r===0&&g===0?`<h3>ไม่มีไฟรหัส</h3><p>บอร์ดไม่พบความผิดปกติ ถ้าเครื่องยังมีอาการ ดูหัวข้อ “อาการที่ไม่มีรหัส”</p>`:`<h3>ไม่มีรหัสนี้</h3><p class="muted">ลองนับใหม่ รหัสที่มีในเครื่องจำลอง: ${CO.map(x=>`แดง ${x.r} เขียว ${x.g}`).join(" · ")}</p>`)}</div>`;
      el.querySelectorAll("[data-d]").forEach(b=>b.onclick=()=>{ const d=b.dataset.d; if(d==="r+")r=Math.min(3,r+1); if(d==="r-")r=Math.max(0,r-1); if(d==="g+")g=Math.min(5,g+1); if(d==="g-")g=Math.max(0,g-1); draw(); });
    }
    draw();
  };

  /* ---------- 5.2 อาการไม่มีรหัส ---------- */
  W.symptoms = el=>{
    el.innerHTML=window.SYMPTOMS.map(s=>`<details class="alarm"><summary><span class="t">${esc(s.n)}</span></summary><div class="body"><ol>${s.c.map(c=>`<li><b>${esc(c[0])}</b><br><span class="muted">${esc(c[1])}</span></li>`).join("")}</ol></div></details>`).join("");
  };

  /* ---------- 6.1 ชิ้นส่วน ---------- */
  W.parts = el=>{
    el.innerHTML=`<figure>${D.svg({})}</figure><div class="chips">${Object.keys(P).map(id=>`<button data-pid="${id}">${esc(P[id].th.split(" (")[0])}</button>`).join("")}</div><div class="panel" data-p><p class="muted">แตะชิ้นส่วนบนภาพหรือในรายการ</p></div>`;
    const svg=el.querySelector("svg"), pn=el.querySelector("[data-p]");
    function sel(id){ svg.querySelectorAll(".part").forEach(g=>g.classList.toggle("sel",g.dataset.id===id)); el.querySelectorAll("[data-pid]").forEach(b=>b.classList.toggle("on",b.dataset.pid===id));
      pn.innerHTML=`<div class="msg">เริ่มทุกงาน: ปิดสวิตช์ → ถอดปลั๊ก → ถอดตู้ (สกรู 4 ตัว ยกขึ้นตรง ๆ)${id==="inlet"||id==="cabfilter"?" · ชิ้นนี้ไม่ต้องถอดตู้":""}</div>`+partInfo(id,true);
      if(window.innerWidth<900) pn.scrollIntoView({behavior:"smooth",block:"start"}); }
    svg.addEventListener("click",e=>{ const p=e.target.closest(".part"); if(p) sel(p.dataset.id); });
    el.querySelectorAll("[data-pid]").forEach(b=>b.onclick=()=>sel(b.dataset.pid));
  };

  /* ---------- 7.1 Autotune จำลอง ---------- */
  W.autotune = el=>{
    let board="new", st, log, val;
    function reset(){ st="off"; log=[]; val={cur:board==="new"?"-":5, fin:6}; }
    const A = {
      plug:["เสียบปลั๊กและเปิดเครื่อง",()=>{ st="shift"; log.unshift("เครื่องเดิน รอวาล์วหลักสลับครั้งแรก… วาล์วสลับแล้ว"); if(board==="new"){ st="tuning"; log.unshift("บอร์ดใหม่: ไฟแดงหน้าเครื่องกะพริบช้า = autotune เริ่มเอง"); } }],
      hold:["กดปุ่ม autotune ค้างไว้ขณะเปิดเครื่อง",()=>{ st="erased"; log.unshift("✗ กดปุ่มขณะเปิดเครื่อง: ค่าที่ตั้งจากโรงงานถูกลบ ต้องติดต่อผู้ผลิต"); }],
      press:["กดปุ่มเล็กบนบอร์ดแล้วปล่อย",()=>{ if(st==="shift"){ st="tuning"; log.unshift("ไฟแดงหน้าเครื่องกะพริบช้า = กำลัง autotune"); } else log.unshift("ไม่มีผล: ต้องรอให้เครื่องเดินและวาล์วสลับก่อน หรือ autotune เริ่มอยู่แล้ว"); }],
      flow:["ตั้งอัตราไหล 5.0 L/min",()=>{ if(st==="tuning"){ st="flow"; log.unshift(`ไฟเขียวบนบอร์ดกะพริบบอกค่าเวลา P.E. ปัจจุบัน: ${val.cur==="-"?"ยังไม่มีค่า":val.cur}`); } else log.unshift("ตั้งอัตราไหลแล้ว แต่ autotune ยังไม่เริ่ม"); }],
      off:["ปิดเครื่องตอนนี้",()=>{ if(st==="tuning"||st==="flow"){ log.unshift("✗ ปิดก่อน autotune เสร็จ: ค่าไม่ถูกบันทึก"+(board==="new"?" บอร์ดใหม่ใช้งานไม่ได้จนกว่าจะ autotune สำเร็จ":"")); st="off"; }
        else if(st==="done"){ st="saved"; log.unshift(`ปิดแล้วเปิดใหม่: บันทึกค่าเวลา P.E. = ${val.fin} ลงหน่วยความจำแล้ว`); } else { st="off"; log.unshift("ปิดเครื่อง"); } }],
      wait:["วางตู้กลับ (ยังไม่ขันสกรู) แล้วรอให้เสร็จ",()=>{ if(st==="flow"){ st="done"; log.unshift(`autotune เสร็จ: ไฟแดงเปลี่ยนจากกะพริบช้าเป็นกะพริบบอกค่าสุดท้าย = ${val.fin}`); } else log.unshift(st==="tuning"?"ควรตั้ง 5.0 L/min ก่อน":"ยังไม่ได้เริ่ม autotune"); }],
      o2:["เดินเครื่อง 30 นาที แล้ววัด O₂",()=>{ if(st==="saved"){ st="ok"; log.unshift("O₂ 93% ผ่านสเปก ขันสกรูตู้ แล้วบันทึกผล ✓"); } else log.unshift("ยังไม่ได้บันทึกค่า autotune ผลที่วัดได้ยังเชื่อถือไม่ได้"); }]
    };
    function draw(){
      const ledR = st==="tuning"||st==="flow" ? "slow" : st==="done" ? "code" : "", ledG = st==="flow"||st==="done" ? "code":"";
      el.innerHTML=`<div class="tools"><div class="seg"><button data-b="new" class="${board==="new"?"on":""}">บอร์ดใหม่</button><button data-b="used" class="${board==="used"?"on":""}">บอร์ดเดิม</button></div><button class="ghost" data-rs>เริ่มใหม่</button></div>
        <div class="atrow"><div class="atled"><span class="led r ${ledR?"lit "+ledR:""}"></span><small>ไฟแดงหน้าเครื่อง</small></div><div class="atled"><span class="led g ${ledG?"lit "+ledG:""}"></span><small>ไฟเขียวบนบอร์ด</small></div>
        <div class="atst">${st==="ok"?"✓ เสร็จสมบูรณ์":st==="erased"?"✗ ค่าโรงงานถูกลบ":{off:"เครื่องปิด",shift:"เครื่องเดิน",tuning:"กำลัง autotune",flow:"กำลัง autotune (5 L/min)",done:"autotune เสร็จ รอบันทึก",saved:"บันทึกค่าแล้ว"}[st]}</div></div>
        <div class="acts2">${Object.entries(A).map(([k,a])=>`<button data-x="${k}" ${st==="erased"||st==="ok"?"disabled":""}>${esc(a[0])}</button>`).join("")}</div>
        <ul class="plog">${log.map(m=>`<li>${esc(m)}</li>`).join("")}</ul>`;
      el.querySelectorAll("[data-x]").forEach(b=>b.onclick=()=>{ A[b.dataset.x][1](); draw(); });
      el.querySelectorAll("[data-b]").forEach(b=>b.onclick=()=>{ board=b.dataset.b; reset(); draw(); });
      el.querySelector("[data-rs]").onclick=()=>{ reset(); draw(); };
    }
    reset(); draw();
  };

  /* ---------- 7.3 เกจที่ช่องวัด ---------- */
  W.gauge = el=>{
    const CND={
      norm:{n:"เครื่องปกติ", TA:12,TB:12,pk:21, say:"ขึ้นถึง 21 psi ใน 12 วินาที ลดเหลือประมาณ 12 psi หลังสลับ สองถังเท่ากัน"},
      inlet:{n:"inlet HEPA ตัน", TA:19,TB:19,pk:21, say:"ขึ้นช้า ใช้ 19 วินาทีต่อถัง แต่ยังเท่ากัน ชี้ไปที่ฝั่งขาเข้าคอมเพรสเซอร์"},
      leak4:{n:"4-way valve ร้าว", TA:11,TB:27,pk:21, say:"ถัง A 11 วินาที ถัง B 27 วินาที ไม่สมดุล ต้องเปลี่ยน 4-way valve"},
      leak:{n:"ระบบรั่วมาก (regulator ร้าว)", stall:15, say:"ขึ้นไม่ถึงจุดสลับ ค้างที่ประมาณ 15 psi เกิน 30 วินาที เครื่องหยุด (แรงดันต่ำ)"},
      stuck:{n:"4-way valve ไม่สลับ", stuck:1, say:"ขึ้นถึง 21 psi แล้วไม่สลับ ขึ้นต่อถึงประมาณ 23 psi เครื่องหยุด (แรงดันสูง)"}
    };
    let c="norm", t=0, run=false, last=0;
    el.innerHTML=`<div class="tools"><select data-c>${Object.entries(CND).map(([k,v])=>`<option value="${k}">${esc(v.n)}</option>`).join("")}</select><button data-run>▶ เดินเครื่อง</button></div>
      <div class="ggrid"><figure><svg class="dia" viewBox="0 0 200 150" role="img" aria-label="เกจแรงดัน 0 ถึง 30 psi">
        <path d="M30 100 A70 70 0 0 1 170 100" class="gdial"/>${[0,5,10,15,20,25,30].map(v=>{const a=Math.PI*(1-v/30),x=100+Math.cos(a)*70,y=100-Math.sin(a)*70,x2=100+Math.cos(a)*58,y2=100-Math.sin(a)*58;return `<line x1="${x}" y1="${y}" x2="${x2}" y2="${y2}" class="tick"/><text class="lbl s" x="${100+Math.cos(a)*46}" y="${104-Math.sin(a)*46}" text-anchor="middle">${v}</text>`;}).join("")}
        <path d="${(()=>{const a1=Math.PI*(1-20.7/30),a2=Math.PI*(1-21.3/30);return `M${100+Math.cos(a1)*72} ${100-Math.sin(a1)*72} A72 72 0 0 1 ${100+Math.cos(a2)*72} ${100-Math.sin(a2)*72}`;})()}" class="gok"/>
        <line data-nd x1="100" y1="100" x2="100" y2="40" class="needle"/><circle cx="100" cy="100" r="5" class="hub"/>
        <text data-gv class="gval" x="100" y="128" text-anchor="middle">0.0 psi</text></svg></figure>
      <figure><svg class="dia" viewBox="0 0 400 150" role="img" aria-label="กราฟแรงดันตามเวลา"><g class="grid">${[0,10,20,30].map(v=>`<line x1="24" x2="396" y1="${130-v*4}" y2="${130-v*4}"/><text class="lbl s" x="20" y="${134-v*4}" text-anchor="end">${v}</text>`).join("")}</g>
        <line class="ref" x1="24" x2="396" y1="${130-21*4}" y2="${130-21*4}"/><path data-tr class="trA"/><line data-cur class="cur" x1="24" x2="24" y1="6" y2="130"/>
        <text class="lbl s" x="396" y="146" text-anchor="end">60 วินาที</text></svg></figure></div>
      <p class="hint" data-say></p>`;
    const $=s=>el.querySelector(s), X=s=>24+s*(372/60), Y=p=>130-p*4;
    function val(s){
      const o=CND[c];
      if(o.stall){ if(s>40) return 0; return 2+(o.stall-2)*(1-Math.exp(-s/5)); }
      if(o.stuck){ if(s>16) return 0; return Math.min(23, 2+21*(s/12)); }
      if(s<6) return 2+(10)*(s/6);    // เริ่มเครื่อง
      let tt=s-6, half=0; for(;;){ const T=half%2===0?o.TA:o.TB; if(tt<T) return bedP(tt,T,o.pk,12); tt-=T; half++; if(half>20) return 12; }
    }
    function trace(){ let d=""; for(let s=0;s<=60;s+=0.25) d+=(s?"L":"M")+X(s).toFixed(1)+" "+Y(val(s)).toFixed(1); $("[data-tr]").setAttribute("d",d); $("[data-say]").textContent=CND[c].say; }
    function paint(){ const v=val(t), a=Math.PI*(1-Math.min(30,v)/30);
      $("[data-nd]").setAttribute("x2",100+Math.cos(a)*60); $("[data-nd]").setAttribute("y2",100-Math.sin(a)*60);
      $("[data-gv]").textContent=v.toFixed(1)+" psi"+(v===0&&t>10?" · หยุด":""); $("[data-cur]").setAttribute("x1",X(t)); $("[data-cur]").setAttribute("x2",X(t)); }
    function loop(ts){ if(!run) return; if(last) t+=(ts-last)/1000*2; last=ts; if(t>60){ t=60; run=false; $("[data-run]").textContent="▶ เดินเครื่องใหม่"; $("[data-run]").classList.remove("on"); } paint(); if(run) requestAnimationFrame(loop); }
    $("[data-run]").onclick=()=>{ if(!run && t>=60) t=0; run=!run; last=0; $("[data-run]").textContent=run?"■ หยุด":"▶ เดินเครื่อง"; $("[data-run]").classList.toggle("on",run); if(run) requestAnimationFrame(loop); };
    $("[data-c]").onchange=e=>{ c=e.target.value; t=0; trace(); paint(); };
    trace(); paint();
  };

  window.Widgets = W;
})();
