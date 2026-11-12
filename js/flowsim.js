/* ===== 1.4 เดินเครื่องทั้งระบบ =====
   ลมไหลตามท่อ + zeolite จับ/คายไนโตรเจน + การสลับถัง + จำลองอาการเสีย
   มุมมอง 2 แบบใช้ซิมูเลชันชุดเดียวกัน: ภาพตัดเปิดเครื่อง (Cutaway) และบล็อกไดอะแกรม (Diagram)
   ตัวเลขเป็นค่าของเครื่องจำลองในบทเรียน: สลับที่ 21 psi (≥ 4 L/min) หรือ 16 psi (≤ 3 L/min), O₂ 87–95.6% */
(function(){
  const esc = s => String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const NS = "http://www.w3.org/2000/svg";
  const COL = {air:"#8a94a3", o2:"#1f7ae0", n2:"#e8590c"};
  const FAULT = {
    ok:    {n:"เครื่องปกติ", hl:[], say:"อากาศถูกอัดเข้าถังทีละถัง zeolite จับไนโตรเจนไว้ ออกซิเจนผ่านขึ้นถังเก็บ แล้วสลับถังก่อน zeolite อิ่มตัว"},
    clog:  {n:"ไส้กรอง / Inlet HEPA ตัน", hl:["cabfilter","inlet"], say:"ลมเข้าน้อย แรงดันขึ้นช้า รอบการสลับยาวขึ้น ความเข้มข้น O₂ ลดลงเล็กน้อย"},
    stuck: {n:"4-way valve ค้าง ไม่สลับ", hl:["valve4"], say:"อัดอยู่ถังเดียวตลอด zeolite อิ่มตัว ไนโตรเจนหลุดผ่านขึ้นถังเก็บ O₂ ตกลงเรื่อยๆ"},
    worn:  {n:"Sieve bed เสื่อม", hl:["sieve"], say:"แรงดันและการสลับปกติ แต่ zeolite จับไนโตรเจนได้น้อย ไนโตรเจนปนออกไปกับออกซิเจน O₂ ต่ำ"},
    leak:  {n:"ท่อรั่วหลังคอมเพรสเซอร์", hl:["comp"], say:"ลมรั่วออกก่อนถึงถัง แรงดันขึ้นไม่ถึงจุดสลับ เครื่องสลับด้วยการหมดเวลาแทน O₂ ลดลง"}
  };
  const ROUTE = {
    cut: {o2A:[["top"]], o2B:[["topB"]]},
    dia: {o2A:[["top"]], o2B:[["topB"],["top"]]}
  };
  function bedP(t,T,peak,low){ const k=3/T; return low+(peak-low)*(1-Math.exp(-k*t))/(1-Math.exp(-k*T)); }
  function partInfo(id){
    const P=window.PARTS||{}, Z=window.ZONES||{}, o=P[id]; if(!o) return "";
    return `<div class="en">${esc(o.n)}${Z[o.z]?" · "+esc(Z[o.z].n):""}</div><h3>${esc(o.th)}</h3><p>${esc(o.f)}</p>
      ${o.x&&o.x.length?`<h4>อาการเมื่อเสีย</h4><ul>${o.x.map(s=>`<li>${esc(s)}</li>`).join("")}</ul>`:""}`;
  }

  function flowsim(el){
    let view="cut", flow=5, fault="ok", run=false, t=0, last=0, raf=0, o2=93, stuckT=0, acc=0, rot=0;
    let svg, seg, layer, fx, beads=[];
    const dots=[], puffs=[];
    el.innerHTML=`<div class="tools fs-tools">
        <div class="seg"><button data-v="cut" class="on">ภาพเครื่องจริง</button><button data-v="dia">บล็อกไดอะแกรม</button></div>
        <button class="primary" data-run>▶ เดินเครื่อง</button>
        <label>อัตราไหล <select data-flow>${[0.5,1,2,3,4,5].map(v=>`<option value="${v}"${v===5?" selected":""}>${v}</option>`).join("")}</select> L/min</label>
        <label>สภาพเครื่อง <select data-fault>${Object.entries(FAULT).map(([k,f])=>`<option value="${k}">${esc(f.n)}</option>`).join("")}</select></label></div>
      <figure class="fs-fig"><div data-holder></div>
        <figcaption><span class="fs-k" style="--c:${COL.air}">อากาศ</span><span class="fs-k" style="--c:${COL.o2}">ออกซิเจน</span><span class="fs-k" style="--c:${COL.n2}">ไนโตรเจน</span> · zeolite สีส้ม = จับไนโตรเจนไว้แล้ว · แตะชิ้นส่วนเพื่อดูหน้าที่</figcaption></figure>
      <div class="cyst fs-st"><div><small>ถัง A</small><b data-pa>–</b></div><div><small>ถัง B</small><b data-pb>–</b></div>
        <div><small>4-way valve</small><b data-v4>–</b></div><div><small>P.E. valve</small><b data-pv>–</b></div>
        <div><small>O₂ ขาออก</small><b data-o2>–</b></div><div><small>ไฟสถานะ</small><b data-led>–</b></div></div>
      <p class="muted small" data-say></p>
      <div class="panel" data-p hidden></div>
      <p class="muted small">ภาพวาดประกอบจากเครื่องจำลองในบทเรียน ไม่ได้อิงรุ่นจริงของผู้ผลิตใด ตัวเลขเป็นค่าตัวอย่างเพื่อการสอน</p>`;
    const $=s=>el.querySelector(s), pn=$("[data-p]");

    function mount(){
      dots.splice(0).forEach(d=>d.el.remove()); puffs.length=0;
      const h=$("[data-holder]");
      h.innerHTML = view==="cut" ? window.Cutaway.svg() : window.Diagram.svg({});
      svg=h.querySelector("svg");
      if(view==="cut"){ window.Cutaway.fit(svg);
        /* จอแคบ: ซ่อนป้ายชื่อ ขยายเฉพาะตัวเครื่อง แล้วให้แตะชิ้นส่วนดูชื่อแทน */
        if(el.clientWidth<600){ svg.setAttribute("viewBox","110 0 690 690"); svg.classList.add("cw-sm"); } }
      seg={}; svg.querySelectorAll(".seg").forEach(p=>seg[p.dataset.s]=p);
      layer=document.createElementNS(NS,"g"); layer.setAttribute("class","fs-dots"); svg.appendChild(layer);
      fx=document.createElementNS(NS,"g"); fx.setAttribute("class","fs-dots"); svg.appendChild(fx);
      if(seg.comp){ const pt=seg.comp.getPointAtLength(seg.comp.getTotalLength()*0.5), tx=document.createElementNS(NS,"text");
        tx.setAttribute("x",pt.x+8); tx.setAttribute("y",pt.y+30); tx.setAttribute("class","fs-leak"); tx.textContent="ลมรั่ว"; fx.appendChild(tx); }
      beads=[...svg.querySelectorAll(".zeo circle")].map((c,k)=>({el:c,
        bed: c.dataset.bed!=null ? +c.dataset.bed : (k<18?0:1),
        lv:  c.dataset.lv!=null ? +c.dataset.lv : (5-Math.floor((k%18)/3))/5 }));
      svg.querySelectorAll(".part").forEach(g=>g.classList.toggle("fs-flt",FAULT[fault].hl.includes(g.dataset.id)));
      svg.addEventListener("click",e=>{ const p=e.target.closest(".part"); if(!p) return;
        svg.querySelectorAll(".part").forEach(g=>g.classList.toggle("sel",g===p)); pn.hidden=false; pn.innerHTML=partInfo(p.dataset.id); });
      paint(state());
    }
    function params(){
      const hi=flow>=4, sw0=hi?21:16, low=hi?12:9;
      const o={T:12, peak:sw0, low, air:1, sw:true, o2t:95.6-(flow-0.5)*0.9, swAt:sw0};
      if(fault==="clog"){ o.T=16; o.air=0.45; o.o2t-=4; }
      if(fault==="worn"){ o.o2t=72; }
      if(fault==="leak"){ o.peak=sw0-6; o.air=0.7; o.o2t=82; }
      if(fault==="stuck"){ o.sw=false; }
      return o;
    }
    function state(){
      const p=params(), T=p.T, tin=p.sw?t%T:t, feedA=p.sw?Math.floor(t/T)%2===0:true;
      const pf=bedP(Math.min(tin,T),T,p.peak,p.low), pp=Math.max(0.5,3*Math.exp(-tin/1.5));
      return {p, feedA, tin, pe:p.sw&&tin>T-1, pA:feedA?pf:pp, pB:feedA?pp:pf, load:Math.min(1,tin/T*0.9)};
    }
    function spawn(route,color,speed){
      if(!route.every(r=>seg[r[0]])) return;
      const c=document.createElementNS(NS,"circle"); c.setAttribute("r","4"); c.setAttribute("fill",color); c.setAttribute("class","fs-dot");
      layer.appendChild(c); dots.push({route,i:0,s:0,el:c,speed});
    }
    function move(dt){
      for(let k=dots.length-1;k>=0;k--){
        const d=dots[k]; d.s+=d.speed*dt;
        let L=seg[d.route[d.i][0]].getTotalLength();
        while(d.s>=L){ d.i++; d.s-=L; if(d.i>=d.route.length) break; L=seg[d.route[d.i][0]].getTotalLength(); }
        if(d.i>=d.route.length){ d.el.remove(); dots.splice(k,1); continue; }
        const [key,rev]=d.route[d.i], pt=seg[key].getPointAtLength(rev?L-d.s:d.s);
        d.el.setAttribute("cx",pt.x.toFixed(1)); d.el.setAttribute("cy",pt.y.toFixed(1));
      }
      for(let k=puffs.length-1;k>=0;k--){ const q=puffs[k]; q.a+=dt;
        if(q.a>1.2){ q.el.remove(); puffs.splice(k,1); continue; }
        q.el.setAttribute("cx",(q.x+q.vx*q.a).toFixed(1)); q.el.setAttribute("cy",(q.y+q.vy*q.a).toFixed(1)); q.el.setAttribute("opacity",(1-q.a/1.2).toFixed(2)); }
    }
    function puff(){
      const s=seg.comp; if(!s) return; const pt=s.getPointAtLength(s.getTotalLength()*0.5), ang=Math.PI/2+(Math.random()-0.5)*1.6;
      const c=document.createElementNS(NS,"circle"); c.setAttribute("r","3.5"); c.setAttribute("fill",COL.air); c.setAttribute("class","fs-dot");
      fx.appendChild(c); puffs.push({el:c,x:pt.x,y:pt.y,vx:Math.cos(ang)*60,vy:Math.sin(ang)*60,a:0});
    }
    function paint(st){
      const p=st.p;
      $("[data-pa]").textContent=st.pA.toFixed(1)+" psi"; $("[data-pb]").textContent=st.pB.toFixed(1)+" psi";
      $("[data-v4]").textContent=st.feedA?"อัด → A · B → ไอเสีย":"อัด → B · A → ไอเสีย";
      $("[data-pv]").textContent=st.pe?"เปิด":"ปิด"; $("[data-pv]").className=st.pe?"on":"";
      $("[data-o2]").textContent=o2.toFixed(1)+" %";
      const led=o2>=85?["เขียว","g"]:o2>=73?["เหลือง","y"]:["แดง","r"];
      $("[data-led]").textContent=led[0]; $("[data-led]").className="fs-led "+led[1];
      let say=FAULT[fault].say; if(fault==="leak") say+=` (แรงดันสูงสุด ${p.peak} psi ไม่ถึงจุดสลับ ${p.swAt} psi)`;
      $("[data-say]").textContent=(run&&st.pe?"P.E. valve เปิด: ออกซิเจนบางส่วนไหลเข้าไล่ไนโตรเจนในถังที่เพิ่งระบาย · ":"")+say;
      const lk=svg.querySelector(".fs-leak"); if(lk) lk.style.display=fault==="leak"?"":"none";
            const cap=fault==="worn"?0.45:1;
      beads.forEach(b=>{ const feeding=(b.bed===0)===st.feedA;
        const load=(feeding?st.load:Math.max(0,0.9*(1-st.tin/2)))*cap, on=b.lv<load-0.001;
        b.el.classList.toggle("n",on); });
      if(view==="cut"){
        const ball=svg.querySelector("[data-cw-ball]"); if(ball) ball.setAttribute("cy",(284-flow/5*76).toFixed(1));
        const pe=svg.querySelector("[data-cw-pe]"); if(pe) pe.classList.toggle("fs-on",st.pe);
        const sol=svg.querySelector("[data-cw-sol]"); if(sol) sol.setAttribute("fill",st.feedA?"#f2c94c":"#3ccf6e");
        const r=svg.querySelector(".cw-rotor"), f=svg.querySelector(".cw-blades");
        if(r) r.setAttribute("transform",`rotate(${rot} 386 552)`); if(f) f.setAttribute("transform",`rotate(${rot*0.6})`);
      } else {
        svg.querySelectorAll(".seg").forEach(s=>s.classList.remove("lit"));
        ["in","cab","inl","comp","hx",st.feedA?"toA":"toB",st.feedA?"top":"topB","ck","tk","rg","fl","out"].forEach(k=>seg[k]&&seg[k].classList.add("lit"));
      }
    }
    function tick(dt){
      t+=dt; rot=(rot+dt*360)%360;
      const st=state(), p=st.p, R=ROUTE[view];
      let target=p.o2t;
      if(fault==="stuck"){ stuckT+=dt; if(stuckT>p.T*0.9) target=Math.max(40,p.o2t-(stuckT-p.T*0.9)*2.2); } else stuckT=0;
      o2+=(target-o2)*Math.min(1,dt*0.6);
      acc+=dt*(2+flow*0.6);
      while(acc>=1){ acc--;
        const feed=st.feedA?"toA":"toB", exh=st.feedA?"toB":"toA";
        if(Math.random()<p.air) spawn([["in"],["cab"],["inl"],["comp"],["hx"],[feed]],COL.air,95);
        const brk = fault==="worn" ? 0.35 : (fault==="stuck" && stuckT>p.T ? Math.min(0.75,(stuckT-p.T)/18) : 0);
        spawn((st.feedA?R.o2A:R.o2B).concat([["ck"],["tk"],["rg"],["fl"],["out"]]), Math.random()<brk?COL.n2:COL.o2, 75);
        if(p.sw && st.tin<4) spawn([[exh,1],["exh"],["exo"]],COL.n2,115);
        if(fault==="leak") puff();
      }
      move(dt); paint(st);
    }
    function loop(ts){ if(!run){ raf=0; return; } const dt=last?Math.min(0.05,(ts-last)/1000):0; last=ts; tick(dt*1.5); raf=requestAnimationFrame(loop); }
    function setRun(v){ run=v; const b=$("[data-run]"); b.textContent=run?"■ หยุด":"▶ เดินเครื่อง"; b.classList.toggle("on",run); last=0; if(run&&!raf) raf=requestAnimationFrame(loop); }
    $("[data-run]").onclick=()=>setRun(!run);
    el.querySelectorAll("[data-v]").forEach(b=>b.onclick=()=>{ view=b.dataset.v; el.querySelectorAll("[data-v]").forEach(x=>x.classList.toggle("on",x===b)); pn.hidden=true; mount(); });
    $("[data-flow]").onchange=e=>{ flow=+e.target.value; paint(state()); };
    $("[data-fault]").onchange=e=>{ fault=e.target.value; t=0; stuckT=0;
      svg.querySelectorAll(".part").forEach(g=>g.classList.toggle("fs-flt",FAULT[fault].hl.includes(g.dataset.id))); paint(state()); };
    new IntersectionObserver(es=>es.forEach(e=>{ if(!e.isIntersecting && run) setRun(false); })).observe(el);
    el._fs={set(o){ if(o.t!=null)t=o.t; if(o.o2!=null)o2=o.o2; if(o.flow)flow=o.flow; if(o.fault){ $("[data-fault]").value=o.fault; $("[data-fault]").onchange({target:{value:o.fault}}); if(o.t!=null)t=o.t; } }, warm(n){ for(let i=0;i<n;i++) tick(0.05); }, run:setRun};
    mount();
  }
  (window.Widgets=window.Widgets||{}).flowsim = flowsim;
})();
