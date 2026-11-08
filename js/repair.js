/* ===== โมดูล 8: โจทย์ซ่อมจำลอง =====
   ขั้นตอน: ตรวจ/วัด → วินิจฉัย → ซ่อม → ทดสอบหลังซ่อม → ผล
   โหมดเรียนรู้: บอกว่าค่าปกติหรือผิดปกติ มีคำแนะนำ ไม่หักคะแนน (บันทึก learn:<id>)
   โหมดสอบ: ไม่บอกปกติ/ผิดปกติ หักคะแนนตามกติกา (บันทึก exam:<id> คะแนนเต็ม 100) */
(function(){
  const esc = s => String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const M=window.MEAS, DX=window.DX, REP=window.REP, TS=window.TESTS, CS=window.CASES;
  const byId=(a,id)=>a.find(x=>x.id===id);
  const LV={1:"ง่าย",2:"กลาง",3:"ยาก"};
  const RULE={unsafe:15, trap:10, dx:20, part:10, miss:10, test:10, freeMeas:10, extra:2, extraMax:10};
  let root, mode="exam";

  function progress(){
    const S=window.Score; if(!S) return {n:0,avg:0};
    const v=CS.map(c=>S.bestOf("exam:"+c.id)).filter(Boolean).map(b=>b.score);
    return {n:v.length, avg:v.length?Math.round(v.reduce((a,b)=>a+b,0)/v.length):0};
  }

  function list(){
    const S=window.Score, p=progress();
    root.innerHTML=`<div class="kicker">โมดูล 8 · Repair simulator</div><h1>โจทย์ซ่อมจำลอง</h1>
      <p class="muted">อ่านใบแจ้งซ่อม ตรวจและวัดค่าเพื่อหาสาเหตุ วินิจฉัย เลือกงานซ่อม แล้วเลือกการทดสอบก่อนส่งคืน เกณฑ์ผ่านใช้คะแนน <b>โหมดสอบ</b> ครบ 10 เคส</p>
      <div class="seg modes"><button data-m="learn" class="${mode==="learn"?"on":""}">โหมดเรียนรู้</button><button data-m="exam" class="${mode==="exam"?"on":""}">โหมดสอบ</button></div>
      <p class="hint">${mode==="learn"?"โหมดเรียนรู้: บอกว่าค่าที่วัดได้ปกติหรือผิดปกติ มีคำแนะนำทีละขั้น และไม่หักคะแนน":`โหมดสอบ: เริ่ม 100 คะแนน · เปิดตู้โดยไม่ถอดปลั๊ก −${RULE.unsafe} · ทำสิ่งที่ห้ามทำ −${RULE.trap} · วินิจฉัยผิด −${RULE.dx} ต่อครั้ง · เปลี่ยนชิ้นที่ไม่จำเป็น −${RULE.part} ต่อชิ้น · ซ่อมแล้วอาการยังอยู่ −${RULE.miss} · ขาดการทดสอบที่จำเป็น −${RULE.test} ต่อรายการ · ตรวจเกิน ${RULE.freeMeas} รายการ −${RULE.extra} ต่อรายการ (สูงสุด −${RULE.extraMax})`}</p>
      <p class="muted small">ผลโหมดสอบของคุณ: ${p.n}/${CS.length} เคส${p.n?` · เฉลี่ย ${p.avg} คะแนน`:""}</p>
      <div class="cases">${CS.map((c,i)=>{const b=S&&S.bestOf((mode==="exam"?"exam:":"learn:")+c.id);
        return `<button class="case" data-i="${i}"><span class="lv lv${c.lv}">${LV[c.lv]}</span><span class="ct">เคส ${i+1} · ${esc(c.n)}</span><span class="cm">${esc(c.ticket.slice(0,70))}…</span><span class="cb">${b?(mode==="exam"?`✓ ดีที่สุด ${b.score}/100`:"✓ ทำแล้ว"):"ยังไม่ได้ทำ"}</span></button>`;}).join("")}</div>`;
    root.querySelectorAll("[data-m]").forEach(b=>b.onclick=()=>{ mode=b.dataset.m; list(); });
    root.querySelectorAll(".case").forEach(b=>b.onclick=()=>play(CS[+b.dataset.i]));
  }

  function play(c){
    const learn=mode==="learn";
    const s={stage:1, open:false, unsafe:false, done:[], trap:0, dxTry:[], fixed:false, parts:[], missRuns:0, tests:new Set()};
    const reading = id => { const m=byId(M,id), r=c.r[id]; return {v:r?r.v:m.v, bad:!!(r&&r.bad)}; };
    let deduct=[];

    function head(){
      const st=["ตรวจ/วัด","วินิจฉัย","ซ่อม","ทดสอบ","ผล"];
      return `<div class="simhead"><button class="ghost" data-back>← รายการเคส</button><div class="meta"><span>${learn?"โหมดเรียนรู้":"โหมดสอบ"}</span></div></div>
        <ol class="stepper">${st.map((n,i)=>`<li class="${i+1===s.stage?"on":i+1<s.stage?"ok":""}"><span>${i+1}</span>${n}</li>`).join("")}</ol>
        <div class="ticket"><div class="tk-h"><span>ใบแจ้งซ่อม · ${esc(c.n)}</span></div><p>${esc(c.ticket)}</p></div>`;
    }
    function logHTML(){
      return s.done.length?`<h3>ผลการตรวจ (${s.done.length})</h3><div class="rlog">${s.done.map(id=>{const m=byId(M,id), r=m.trap?{v:m.v,bad:1}:reading(id);
        return `<div class="rl ${learn||m.trap?(r.bad?"bad":"ok"):""}"><b>${esc(m.n)}</b><span>${esc(r.v)}</span>${learn&&!m.trap?`<em>${r.bad?"ผิดปกติ":"ปกติ"}</em>`:""}</div>`;}).join("")}</div>`:"";
    }
    function bind(){ const b=root.querySelector("[data-back]"); if(b) b.onclick=list; root.querySelectorAll("[data-ref]").forEach(x=>x.onclick=refs); }
    function refs(){ const d=document.createElement("div"); d.className="modal";
      d.innerHTML=`<div class="mbox" role="dialog" aria-modal="true"><h2>ค่าอ้างอิงของเครื่องจำลอง</h2><ul class="small">
        <li>O₂ 87–95.6% ที่ 0.5–5 L/min หลังวอร์ม 30 นาที · ไฟเขียว &gt; 85% · เหลือง 73–85% · แดง &lt; 73%</li>
        <li>แรงดันขาออก regulator 5 ± 0.5 psi · จุดสลับ 21 psi (≥ 4 L/min) / 16 psi (≤ 3 L/min) · หลังสลับ 12 ± 2 psi</li>
        <li>เวลาสลับ 8–15 วินาทีต่อถัง เท่ากัน ±1 วินาที · alarm แรงดันต่ำ &lt; 7 psi · แรงดันสูง ≈ 23 psi</li>
        <li>ขด 4-way valve 175 ± 20 Ω · ขด P.E. valve 80 ± 10 Ω · ไฟเลี้ยงขด ≈ 24 VDC</li>
        <li>ไฟเต้ารับ 230 VAC ± 10% (207–253 V) · ลมไอเสียสูงกว่าห้องไม่เกิน 19 °C</li>
        <li>รหัสบนบอร์ด: แดง1เขียว1/3 แรงดันต่ำ · แดง1เขียว2 แรงดันสูง · แดง1เขียว5 หรือ แดง2เขียว3 ชิ้นส่วนเสีย · แดง2เขียว1 O₂ ต่ำ · แดง2เขียว4/5 บอร์ดเสีย</li></ul>
        <div class="tools"><button class="primary">ปิด</button></div></div>`;
      document.body.appendChild(d); d.querySelector("button").onclick=()=>d.remove(); }

    /* ขั้น 1: ตรวจ/วัด */
    function stage1(){
      const nx = learn ? c.hint[Math.min(c.hint.length-1, Math.floor(s.done.length/3))] : "";
      const grp=(g,t)=>`<h3>${t}</h3><div class="acts2">${M.filter(m=>m.g===g).map(m=>`<button data-me="${m.id}" class="${s.done.includes(m.id)?"dn":""} ${g==="int"&&!s.open?"lk":""}" ${g==="int"&&!s.open?"disabled":""}>${esc(m.n)}</button>`).join("")}</div>`;
      root.innerHTML=head()+`
        ${learn?`<div class="hint">💡 ${esc(nx)}</div>`:""}
        ${grp("ext","ตรวจภายนอก (ไม่ต้องถอดตู้)")}
        ${s.open?`<div class="msg ${s.unsafe?"bad":"ok"}">${s.unsafe?"⚠ เปิดตู้ขณะยังเสียบปลั๊ก (หักคะแนน) ต่อไปให้ถอดปลั๊กทุกครั้งก่อนถอดฝาตู้":"✓ ปิดสวิตช์ ถอดปลั๊ก แล้วถอดตู้แล้ว · การวัดที่ต้องเดินเครื่องจะเสียบปลั๊กเฉพาะตอนวัด ไม่ให้มือหรือเครื่องมือแตะบอร์ด"}</div>`
          :`<h3>เปิดตู้เพื่อตรวจภายใน</h3><div class="acts2"><button data-open="safe">ปิดสวิตช์ ถอดปลั๊ก แล้วถอดตู้</button><button data-open="unsafe">ถอดตู้เลย (ยังเสียบปลั๊กไว้ เพื่อวัดต่อได้เร็ว)</button></div>`}
        ${grp("int","ตรวจภายใน")}
        ${logHTML()}
        <div class="tools"><button class="ghost" data-ref>ค่าอ้างอิง</button><button class="primary" data-go ${s.done.length?"":"disabled"}>ไปวินิจฉัย →</button></div>`;
      bind();
      root.querySelectorAll("[data-me]").forEach(b=>b.onclick=()=>{ const id=b.dataset.me, m=byId(M,id);
        if(!s.done.includes(id)){ s.done.push(id); if(m.trap){ s.trap++; deduct.push([`ทาน้ำสบู่ที่ตัว 4-way valve`,RULE.trap]); } }
        const y=window.scrollY; stage1(); window.scrollTo(0,y);
        const r=m.trap?{v:m.v}:reading(id); window.Score&&window.Score.toast(m.n+": "+r.v+(learn&&!m.trap?(r.bad?" (ผิดปกติ)":" (ปกติ)"):"")); });
      root.querySelectorAll("[data-open]").forEach(b=>b.onclick=()=>{ s.open=true; if(b.dataset.open==="unsafe"){ s.unsafe=true; deduct.push(["เปิดตู้โดยไม่ถอดปลั๊ก",RULE.unsafe]); } const y=window.scrollY; stage1(); window.scrollTo(0,y); });
      root.querySelector("[data-go]").onclick=()=>{ s.stage=2; stage2(); window.scrollTo(0,0); };
    }

    /* ขั้น 2: วินิจฉัย */
    function stage2(msg){
      root.innerHTML=head()+`${logHTML()}<h3>สาเหตุของอาการคืออะไร</h3>
        <div class="lopts">${DX.map(d=>`<button class="lopt ${s.dxTry.includes(d.id)?"bad":""}" data-dx="${d.id}" ${s.dxTry.includes(d.id)?"disabled":""}>${esc(d.n)}</button>`).join("")}</div>${msg||""}
        <div class="tools"><button class="ghost" data-ref>ค่าอ้างอิง</button><button data-more>← กลับไปตรวจเพิ่ม</button></div>`;
      bind();
      root.querySelector("[data-more]").onclick=()=>{ s.stage=1; stage1(); };
      root.querySelectorAll("[data-dx]").forEach(b=>b.onclick=()=>{ const id=b.dataset.dx;
        if(id===c.dx){ s.stage=3; stage3(`<div class="msg ok">✓ วินิจฉัยถูกต้อง: ${esc(byId(DX,id).n)}</div>`); window.scrollTo(0,0); return; }
        s.dxTry.push(id); if(!learn) deduct.push([`วินิจฉัยผิด (${byId(DX,id).n})`,RULE.dx]);
        stage2(`<div class="msg bad">✗ ยังไม่ใช่${learn?` · ${esc(c.hint[c.hint.length-1])}`:" ลองดูผลการตรวจอีกครั้ง หรือกลับไปตรวจเพิ่ม"}</div>`); });
    }

    /* ขั้น 3: ซ่อม */
    function stage3(msg){
      const pick=new Set();
      function draw(m){
        root.innerHTML=head()+`${m||""}<h3>เลือกงานซ่อมที่จะทำ (เลือกได้หลายข้อ)</h3>
          <div class="opts">${REP.map(r=>`<label class="opt"><input type="checkbox" value="${r.id}" ${pick.has(r.id)?"checked":""} ${s.parts.includes(r.id)?"disabled checked":""}> ${esc(r.n)}${s.parts.includes(r.id)?" <em>(ทำแล้ว)</em>":""}</label>`).join("")}</div>
          <div class="tools"><button class="primary" data-do>ซ่อม แล้วเดินเครื่องดูอาการ</button></div>`;
        bind();
        root.querySelectorAll(".opt input").forEach(x=>x.onchange=()=>{ x.checked?pick.add(x.value):pick.delete(x.value); });
        root.querySelector("[data-do]").onclick=()=>{
          if(!pick.size) return draw(`<div class="msg bad">เลือกงานซ่อมอย่างน้อย 1 ข้อ</div>`);
          const bad=[...pick].filter(id=>!c.fix.includes(id)&&!c.ok.includes(id));
          pick.forEach(id=>s.parts.push(id));
          if(!learn) bad.forEach(id=>deduct.push([`ทำงานที่ไม่จำเป็น: ${byId(REP,id).n}`,RULE.part]));
          const fixed=c.fix.every(id=>s.parts.includes(id));
          const note=bad.length?`<div class="msg bad">${learn?"ไม่จำเป็นต้อง: ":"ไม่จำเป็น (หักคะแนน): "}${bad.map(id=>esc(byId(REP,id).n)).join(", ")}</div>`:"";
          if(fixed){ s.stage=4; stage4(note+`<div class="msg ok">✓ เดินเครื่องแล้วอาการหายไป</div>`); window.scrollTo(0,0); }
          else { if(!learn) deduct.push(["ซ่อมแล้วอาการยังอยู่",RULE.miss]); pick.clear(); draw(note+`<div class="msg bad">✗ เดินเครื่องแล้วอาการยังเหมือนเดิม${learn?" · ซ่อมให้ตรงกับสาเหตุที่วินิจฉัย":""}</div>`); }
        };
      }
      draw(msg);
    }

    /* ขั้น 4: ทดสอบหลังซ่อม */
    function stage4(msg){
      root.innerHTML=head()+`${msg||""}<h3>เลือกการทดสอบก่อนส่งคืน</h3>
        ${learn?`<div class="hint">💡 ทุกงาน: วัด O₂ และบันทึก · งานระบบลม: ทดสอบรั่ว · เปลี่ยนบอร์ด P.E. valve หรือ sieve bed: autotune · เปลี่ยน regulator: ตั้ง 5 psi</div>`:""}
        <div class="opts">${TS.map(t=>`<label class="opt"><input type="checkbox" value="${t.id}" ${s.tests.has(t.id)?"checked":""}> ${esc(t.n)}</label>`).join("")}</div>
        <div class="tools"><button class="primary" data-fin>ส่งคืนเครื่อง</button></div>`;
      bind();
      root.querySelectorAll(".opt input").forEach(x=>x.onchange=()=>{ x.checked?s.tests.add(x.value):s.tests.delete(x.value); });
      root.querySelector("[data-fin]").onclick=()=>{ c.tests.filter(t=>!s.tests.has(t)).forEach(t=>{ if(!learn) deduct.push([`ไม่ได้${byId(TS,t).n}`,RULE.test]); }); finish(); };
    }

    function finish(){
      if(!learn){ const ex=Math.max(0,s.done.filter(id=>!byId(M,id).trap).length-RULE.freeMeas); if(ex) deduct.push([`ตรวจเกิน ${RULE.freeMeas} รายการ (${ex} รายการ)`,Math.min(RULE.extraMax,ex*RULE.extra)]); }
      const lost=deduct.reduce((a,d)=>a+d[1],0), sc=learn?100:Math.max(0,100-lost);
      const miss=c.tests.filter(t=>!s.tests.has(t));
      window.Score && window.Score.record({key:(learn?"learn:":"exam:")+c.id, mod:"8-โจทย์ซ่อมจำลอง", item:`${learn?"เรียนรู้":"สอบ"} · ${c.n}`, score:sc, max:100,
        detail:deduct.map(d=>d[0]+" −"+d[1]).join("; ")});
      s.stage=5;
      root.innerHTML=head()+`<div class="score ${sc>=80?"ok":sc>=60?"mid":"bad"}"><div class="big">${learn?"✓":sc}</div><div>${learn?"ทำครบทุกขั้นแล้ว":"คะแนนจาก 100"}</div></div>
        ${!learn&&deduct.length?`<h3>หักคะแนน</h3><ul>${deduct.map(d=>`<li>${esc(d[0])} <b>−${d[1]}</b></li>`).join("")}</ul>`:""}
        ${learn&&miss.length?`<div class="msg bad">การทดสอบที่ควรทำแต่ยังไม่ได้เลือก: ${miss.map(t=>esc(byId(TS,t).n)).join(", ")}</div>`:""}
        <h3>เฉลย</h3><div class="panel"><p><b>สาเหตุ:</b> ${esc(byId(DX,c.dx).n)}</p><p>${esc(c.why)}</p>
        <p><b>งานซ่อม:</b> ${c.fix.map(id=>esc(byId(REP,id).n)).join(", ")}</p><p><b>การทดสอบที่จำเป็น:</b> ${c.tests.map(t=>esc(byId(TS,t).n)).join(" · ")}</p>
        <p><b>ค่าที่เป็นเบาะแส:</b> ${Object.entries(c.r).filter(([k,v])=>v.bad).map(([k,v])=>esc(byId(M,k).n)+": "+esc(v.v)).join(" · ")}</p></div>
        <div class="tools"><button class="primary" data-again>ทำเคสนี้อีกครั้ง</button>${CS.indexOf(c)<CS.length-1?`<button data-next>เคสถัดไป →</button>`:""}<button class="ghost" data-back>รายการเคส</button></div>`;
      bind();
      root.querySelector("[data-again]").onclick=()=>play(c);
      const n=root.querySelector("[data-next]"); if(n) n.onclick=()=>play(CS[CS.indexOf(c)+1]);
      if(window.App) window.App.refreshHome();
      window.scrollTo(0,0);
    }
    stage1(); window.scrollTo(0,0);
  }

  window.Repair={mount:(el)=>{ root=el; list(); }, progress};
})();
