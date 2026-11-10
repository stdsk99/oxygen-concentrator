/* ===== เกียรติบัตร: แสดงเกณฑ์ และดาวน์โหลดเกียรติบัตรทางการ (PDF) จากหลังบ้าน ===== */
(function(){
  const C=window.APP_CONFIG||{}, CR=C.criteria||{}, CE=C.cert||{};
  const esc = s => String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

  /* คำนวณความคืบหน้าจากประวัติคะแนน */
  function progress(hist){
    if(window.CertProgress) return window.CertProgress(hist, CR);   // แอปที่มีเกณฑ์แบบอื่น (เช่น วิชาคลินิก)
    const learn=new Set(), exam={}, order=new Set(); let quiz=0, clin=0, acc=0, pm=0;
    hist.forEach(h=>{ const k=h.key||"";
      if(k.startsWith("learn:")) learn.add(k);
      if(k.startsWith("exam:")) exam[k]=Math.max(exam[k]||0, +h.score);
      if(k.startsWith("order:")) order.add(k);
      if(k==="quiz" && h.max) quiz=Math.max(quiz, Math.round(h.score/h.max*100));
      if(k==="clin:sim" && h.max) clin=Math.max(clin, Math.round(h.score/h.max*100));
      if(k==="accept" && h.max) acc=Math.max(acc, Math.round(h.score/h.max*100));
      if(k==="pmplan" && h.max) pm=Math.max(pm, Math.round(h.score/h.max*100));
    });
    const ev=Object.values(exam), avg=ev.length?Math.round(ev.reduce((a,b)=>a+b,0)/ev.length):0;
    const items=[
      {n:`โหมดเรียนรู้ ทำครบ ${CR.learnCases} เคส`, v:`${learn.size}/${CR.learnCases}`, ok:learn.size>=CR.learnCases},
      {n:`โหมดสอบ ทำครบ ${CR.examCases} เคส และเฉลี่ย ≥ ${CR.examAvg} คะแนน`, v:`${ev.length}/${CR.examCases} เคส · เฉลี่ย ${avg}`, ok:ev.length>=CR.examCases && avg>=CR.examAvg},
      {n:`แบบทดสอบ ≥ ${CR.quizPct}%`, v:`ดีที่สุด ${quiz}%`, ok:quiz>=CR.quizPct},
      {n:`ลำดับขั้นตอน ทำครบ ${CR.orderTasks} งาน`, v:`${order.size}/${CR.orderTasks}`, ok:order.size>=CR.orderTasks}
    ];
    if(CR.clinSimPct) items.push({n:`การใช้งานสำหรับช่าง (ฝึกตั้งค่า + มุมช่าง) ≥ ${CR.clinSimPct}%`, v:`ดีที่สุด ${clin}%`, ok:clin>=CR.clinSimPct});
    if(CR.acceptPct) items.push({n:`ตรวจรับเครื่อง ≥ ${CR.acceptPct}%`, v:`ดีที่สุด ${acc}%`, ok:acc>=CR.acceptPct});
    if(CR.pmPct) items.push({n:`PM ตามแผน ≥ ${CR.pmPct}%`, v:`ดีที่สุด ${pm}%`, ok:pm>=CR.pmPct});
    return {items, pass:items.every(i=>i.ok), learn:learn.size, examN:ev.length, avg, quiz, order:order.size, clin, acc, pm};
  }

  /* ขอเกียรติบัตรทางการ (PDF) จากหลังบ้าน: ตรวจเกณฑ์จากคะแนนในชีต ออกใหม่ถ้ายังไม่เคยออก หรือส่งฉบับเดิม
     ใช้ fetch เอง (ไม่ใช้ Score.api) เพราะการสร้าง PDF ครั้งแรกใช้เวลาหลายวินาที */
  async function fetchCert(tk){
    if(!C.sheetUrl) return {ok:false, err:"offline"};
    const ctl = ("AbortController" in window) ? new AbortController() : null;
    const tm = ctl ? setTimeout(()=>ctl.abort(), 90000) : 0;
    try{
      const r = await fetch(C.sheetUrl,{method:"POST", headers:{"Content-Type":"text/plain;charset=utf-8"},
        body:JSON.stringify({action:"cert", token:C.token, app:C.app, tk}), signal:ctl?ctl.signal:undefined});
      clearTimeout(tm); return await r.json();
    }catch(e){ clearTimeout(tm); return {ok:false, err:"net"}; }
  }
  const ERR = {
    notpass:"ระบบยังไม่พบว่าผ่านเกณฑ์ครบ คะแนนบางรายการอาจยังส่งไม่ถึงระบบ รอสักครู่แล้วลองใหม่ หรือทำรายการที่ยังไม่ผ่านอีกครั้ง",
    notmpl:"ยังออกเกียรติบัตรวิชานี้ไม่ได้ เพราะผู้สอนยังไม่ได้เตรียมแม่แบบเกียรติบัตร กรุณาแจ้งผู้สอน",
    nofile:"ไม่พบไฟล์เกียรติบัตรในระบบ กรุณาแจ้งผู้สอน",
    auth:"บัตรผ่านหมดอายุ กรุณาเข้าสู่ระบบใหม่", suspended:"บัญชีนี้ถูกระงับ",
    net:"เชื่อมต่อระบบไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองใหม่", offline:"แอปนี้ยังไม่ได้เชื่อมต่อระบบหลังบ้าน"
  };
  function savePdf(b64, file){
    const bin=atob(b64), u8=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u8[i]=bin.charCodeAt(i);
    const url=URL.createObjectURL(new Blob([u8],{type:"application/pdf"}));
    const a=document.createElement("a"); a.href=url; a.download=file; document.body.appendChild(a); a.click(); a.remove();
    return url;
  }

  function render(box, hist, profile, askProfile){
    const pr=progress(hist), S=window.Score, sess=S&&S.session?S.session():null, tk=sess&&sess.tk;
    box.innerHTML=`<h2>เกียรติบัตร</h2>
      <div class="crit">${pr.items.map(i=>`<div class="ci ${i.ok?"ok":""}"><span>${i.ok?"✓":"○"}</span><div><b>${esc(i.n)}</b><small>${esc(i.v)}</small></div></div>`).join("")}</div>
      ${pr.pass?(tk?`<div class="tools"><button class="primary" id="ct-go">ดาวน์โหลดเกียรติบัตร (PDF)</button></div>
          <p class="muted small">ครั้งแรกระบบจะออกเกียรติบัตรพร้อมเลขที่ให้ อาจใช้เวลา 10–30 วินาที ครั้งต่อไปจะได้ฉบับเดิม</p>`
        :profile&&profile.sid==="preview"?`<div class="msg">โหมดดูตัวอย่าง ดาวน์โหลดเกียรติบัตรไม่ได้</div>`
        :`<div class="msg ok">ผ่านเกณฑ์ครบแล้ว เข้าสู่ระบบเพื่อดาวน์โหลดเกียรติบัตร</div><div class="tools"><button class="primary" id="ct-pf">เข้าสู่ระบบ</button></div>`)
        :`<p class="muted small">ทำให้ผ่านครบทุกข้อ จึงจะดาวน์โหลดเกียรติบัตรได้</p>`}
      <div id="ct-out" role="status"></div>`;
    const pf=box.querySelector("#ct-pf"); if(pf) pf.onclick=()=>askProfile(()=>window.Score.show());
    const go=box.querySelector("#ct-go");
    if(go) go.onclick=async()=>{
      const out=box.querySelector("#ct-out");
      go.disabled=true; go.textContent="กำลังออกเกียรติบัตร…"; out.innerHTML="";
      const r=await fetchCert(tk);
      go.disabled=false; go.textContent="ดาวน์โหลดเกียรติบัตร (PDF)";
      if(!r.ok){ out.innerHTML=`<div class="msg bad">${esc(ERR[r.err]||"เกิดข้อผิดพลาด ลองใหม่อีกครั้ง")}${r.ref?` (เลขที่ ${esc(r.ref)})`:""}</div>`; return; }
      const url=savePdf(r.b64, r.file||"Certificate.pdf");
      out.innerHTML=`<div class="msg ok">ได้รับเกียรติบัตร เลขที่ <b>${esc(r.ref)}</b> แล้ว ถ้าไฟล์ไม่ดาวน์โหลดเอง <a href="${url}" download="${esc(r.file||"Certificate.pdf")}" target="_blank" rel="noopener">กดที่นี่เพื่อเปิด PDF</a></div>
        <p class="muted small">ตรวจสอบเกียรติบัตรได้ที่เว็บศูนย์การเรียนรู้ เมนู "ตรวจสอบเกียรติบัตร" ด้วยเลขที่นี้</p>`;
    };
  }

  window.Cert={progress, render};
})();
