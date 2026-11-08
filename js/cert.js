/* ===== ใบรับรองอัตโนมัติ (ออกจากแอป) ===== */
(function(){
  const C=window.APP_CONFIG||{}, CR=C.criteria||{}, CE=C.cert||{};
  const esc = s => String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const MTH=["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
  const thDate=d=>`${d.getDate()} ${MTH[d.getMonth()]} พ.ศ. ${d.getFullYear()+543}`;

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

  /* วาดใบรับรองลง canvas (A4 แนวนอน) */
  function wrap(ctx,text,maxW){ const out=[]; let line="";
    for(const ch of [...text]){ if(ctx.measureText(line+ch).width>maxW && line){ const sp=line.lastIndexOf(" "); if(sp>0){ out.push(line.slice(0,sp)); line=line.slice(sp+1)+ch; } else { out.push(line); line=ch; } } else line+=ch; }
    if(line) out.push(line); return out; }
  async function draw(p, pr){
    try{ await document.fonts.load('600 40px "IBM Plex Sans Thai"'); await document.fonts.load('400 20px "IBM Plex Sans Thai"'); }catch(e){}
    const W=1754,H=1240, cv=document.createElement("canvas"); cv.width=W; cv.height=H;
    const x=cv.getContext("2d"), F='"IBM Plex Sans Thai", "Sarabun", sans-serif';
    const teal="#0f7a6c", gold="#b8892b", ink="#1d2430", mut="#5d6675";
    x.fillStyle="#fbf8f1"; x.fillRect(0,0,W,H);
    x.strokeStyle=teal; x.lineWidth=14; x.strokeRect(40,40,W-80,H-80);
    x.strokeStyle=gold; x.lineWidth=3; x.strokeRect(70,70,W-140,H-140);
    [[70,70],[W-70,70],[70,H-70],[W-70,H-70]].forEach(([a,b])=>{x.fillStyle=gold;x.beginPath();x.arc(a,b,12,0,7);x.fill();});
    const t=(s,y,size,w,col,font)=>{x.font=`${w||400} ${size}px ${font||F}`;x.fillStyle=col||ink;x.textAlign="center";x.fillText(s,W/2,y);};
    (CE.org||[]).forEach((s,i)=>t(s,170+i*44,30,500,mut));
    t("ใบรับรองการผ่านการฝึก",320,76,700,teal);
    t("ขอรับรองว่า",410,32,400,mut);
    t(p.name,500,64,600,ink);
    x.strokeStyle=gold;x.lineWidth=2;x.beginPath();x.moveTo(W/2-420,528);x.lineTo(W/2+420,528);x.stroke();
    t(window.Score.idLine(p),578,28,400,mut);
    x.font=`500 34px ${F}`; const lines=wrap(x,`ได้ผ่าน${CE.title||""}`,W-360);
    lines.forEach((l,i)=>t(l,660+i*50,34,500,ink));
    let y=660+lines.length*50+6;
    t(`${CE.subject||""} ตามเกณฑ์ที่กำหนดครบทุกข้อ`,y,30,400,ink); y+=100;
    const line = pr.line || `โหมดเรียนรู้ ${pr.learn} เคส · สอบเฉลี่ย ${pr.avg} · แบบทดสอบ ${pr.quiz}% · ลำดับขั้นตอน ${pr.order} งาน${CR.clinSimPct?` · ใช้งานสำหรับช่าง ${pr.clin}%`:""}${CR.acceptPct?` · ตรวจรับ ${pr.acc}%`:""}${CR.pmPct?` · PM ${pr.pm}%`:""}`;
    t(line,y,line.length>110?18:line.length>90?20:24,400,mut); y+=110;
    const d=new Date(); t(`ให้ไว้ ณ วันที่ ${thDate(d)}`,y,34,500,ink);
    const rid=p.type==="gp"?("G"+[...p.sid].reduce((h,c)=>(h*31+c.charCodeAt(0))>>>0,7).toString(36).toUpperCase().slice(0,6)):p.sid;
    const ref=`${CE.ref||"IIT"}-${rid}-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}`;
    t(`ออกโดยระบบอัตโนมัติ ${C.appName||"Infant Incubator Repair Trainer"} · ไม่ใช่เอกสารทางการ · รหัสอ้างอิง ${ref}`,H-110,20,400,mut);
    return cv;
  }

  function render(box, hist, profile, askProfile){
    const pr=progress(hist);
    box.innerHTML=`<h2>ใบรับรองการผ่านการฝึก</h2>
      <div class="crit">${pr.items.map(i=>`<div class="ci ${i.ok?"ok":""}"><span>${i.ok?"✓":"○"}</span><div><b>${esc(i.n)}</b><small>${esc(i.v)}</small></div></div>`).join("")}</div>
      ${pr.pass?(profile?`<div class="tools"><button class="primary" id="ct-go">ออกใบรับรอง</button></div>`
        :`<div class="msg ok">ผ่านเกณฑ์ครบแล้ว กรอกข้อมูลผู้เรียนก่อนออกใบรับรอง</div><div class="tools"><button class="primary" id="ct-pf">กรอกข้อมูล</button></div>`)
        :`<p class="muted small">ทำให้ผ่านครบทุกข้อ จึงจะออกใบรับรองได้ ใบรับรองนี้ออกโดยระบบอัตโนมัติ ส่วนเกียรติบัตรทางการ อาจารย์จะออกให้จากคะแนนที่ส่งเข้าระบบ</p>`}
      <div id="ct-out"></div>`;
    const pf=box.querySelector("#ct-pf"); if(pf) pf.onclick=()=>askProfile(()=>window.Score.show());
    const go=box.querySelector("#ct-go");
    if(go) go.onclick=async()=>{
      go.disabled=true; go.textContent="กำลังสร้าง…";
      const cv=await draw(profile, pr), url=cv.toDataURL("image/png");
      const out=box.querySelector("#ct-out");
      out.innerHTML=`<img class="certimg" id="certimg" alt="ใบรับรองการผ่านการฝึกของ ${esc(profile.name)}" src="${url}">
        <div class="tools"><a class="btn primary" id="ct-dl" href="${url}" download="ใบรับรอง-${esc(profile.sid)}.png">ดาวน์โหลดภาพ</a><button id="ct-pr">พิมพ์ / บันทึก PDF</button></div>
        <p class="muted small">บนมือถือ กดค้างที่ภาพแล้วเลือกบันทึกภาพได้</p>`;
      out.querySelector("#ct-pr").onclick=()=>{ try{ window.print(); }catch(e){} };
      go.disabled=false; go.textContent="สร้างใหม่";
    };
  }

  window.Cert={progress, render};
})();
