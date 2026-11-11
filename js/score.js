/* ===== ระบบคะแนน: session ผู้เรียน + บันทึก + ซิงก์กับ Google Sheets ===== */
(function(){
  const C = window.APP_CONFIG || {};
  const esc = s => String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const ST=C.store||"iit", K_S=ST+"-session", K_H=ST+"-history";   // แยกคีย์ตามแอป (ทุกแอปอยู่โดเมนเดียวกันบน GitHub Pages)
  const load=(k,d)=>{ try{ return JSON.parse(localStorage.getItem(k))||d; }catch(e){ return d; } };
  const save=(k,v)=>{ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} };
  const drop=k=>{ try{ localStorage.removeItem(k); }catch(e){} };
  /* โหมดดูตัวอย่าง (?preview): ให้ผู้สอนเปิดดูเนื้อหาได้โดยไม่ต้องเข้าสู่ระบบ คะแนนเก็บในเครื่องแยกไว้ ไม่ส่งเข้าระบบ */
  const PREVIEW = window.PREVIEW = /[?&]preview\b/.test(location.search);
  const K_HP = ST+"-preview-history";
  let sess = PREVIEW ? {profile:{name:"ผู้ตรวจ (ดูตัวอย่าง)", sid:"preview", type:"gp", org:"โหมดดูตัวอย่าง"}, tk:""} : load(K_S,null),
      hist = load(PREVIEW ? K_HP : K_H, []);

  function toast(msg){
    let t=document.getElementById("gtoast");
    if(!t){ t=document.createElement("div"); t.id="gtoast"; t.className="toast"; t.setAttribute("role","status"); document.body.appendChild(t); }
    t.textContent=msg; t.className="toast on"; clearTimeout(t._t); t._t=setTimeout(()=>t.className="toast",3200);
  }

  /* เรียก Apps Script: คืนค่า JSON หรือ {ok:false, err:"net"} */
  async function api(action, payload){
    if(!C.sheetUrl) return {ok:false, err:"offline"};
    const ctl = ("AbortController" in window) ? new AbortController() : null;
    const tm = ctl ? setTimeout(()=>ctl.abort(), 20000) : 0;
    try{
      const r = await fetch(C.sheetUrl,{method:"POST", headers:{"Content-Type":"text/plain;charset=utf-8"},
        body:JSON.stringify(Object.assign({action, token:C.token, app:C.app||"incubator"}, payload)), signal:ctl?ctl.signal:undefined});
      clearTimeout(tm);
      return await r.json();
    }catch(e){ clearTimeout(tm); return {ok:false, err:"net"}; }
  }

  function idLine(p){ return !p?"": p.type==="gp" ? `หน่วยงาน ${p.org||"-"}` : `รหัสนักศึกษา ${p.sid}${p.sec?"  ·  กลุ่ม "+p.sec:""}`; }
  const profile = ()=> sess ? sess.profile : null;

  function setSession(s, serverHist){
    sess=s; save(K_S,s);
    if(Array.isArray(serverHist)){
      const pending = hist.filter(h=>h.st==="fail" && h.sid===s.profile.sid);
      hist = serverHist.map(h=>Object.assign({st:"sent"},h)).concat(pending)
        .sort((a,b)=>new Date(b.t)-new Date(a.t)).slice(0,500);
      save(PREVIEW?K_HP:K_H,hist);
      if(pending.length) resendPending();
    }
  }
  function logout(){ sess=null; hist=[]; drop(K_S); drop(K_H); }
  /* จบ session แต่เก็บประวัติไว้ (คะแนนที่รอส่งจะส่งต่อหลังเข้าสู่ระบบใหม่ด้วยบัญชีเดิม) */
  function endSession(){ sess=null; drop(K_S); }

  async function sendRec(rec){
    if(PREVIEW || !C.sheetUrl) return "local";
    const r = await api("score", Object.assign({tk:sess.tk}, rec));
    if(r.ok) return "sent";
    if(r.err==="auth" || r.err==="suspended"){   // บัตรผ่านหมดอายุ/ถูกยกเลิก: เก็บคะแนนไว้ส่งหลังเข้าสู่ระบบใหม่
      toast("การเข้าสู่ระบบหมดอายุ กำลังพาไปเข้าสู่ระบบใหม่ คะแนนนี้จะส่งให้หลังเข้าสู่ระบบ");
      setTimeout(()=>window.Auth&&Auth.relogin(), 2500);
      return "fail";
    }
    return r.err==="net" ? "fail" : "rejected";
  }
  async function resendPending(){
    for(const h of hist.filter(x=>x.st==="fail")){
      const st = await sendRec(h); h.st = st==="sent"?"sent":"fail";
    }
    save(PREVIEW?K_HP:K_H,hist);
  }

  /* บันทึกคะแนน: key=รหัสกิจกรรม mod=โมดูล item=รายการ score/max detail=ข้อความเพิ่ม */
  async function record(r){
    if(!sess){ toast("กรุณาเข้าสู่ระบบก่อน คะแนนจึงจะถูกบันทึก"); return; }
    const p=sess.profile;
    const rec={t:new Date().toISOString(), sid:p.sid, key:r.key||"", mod:r.mod, item:r.item, score:r.score, max:r.max, detail:r.detail||""};
    rec.st = await sendRec(rec);
    hist.unshift(rec); hist=hist.slice(0,500); save(PREVIEW?K_HP:K_H,hist);
    if(!r.quiet) toast(rec.st==="sent"?"บันทึกคะแนนเข้าระบบแล้ว":rec.st==="fail"?"ส่งคะแนนไม่สำเร็จ จะส่งให้อีกครั้งเมื่อเข้าสู่ระบบครั้งถัดไป":rec.st==="rejected"?"ระบบไม่รับคะแนน กรุณาออกจากระบบแล้วเข้าใหม่":(PREVIEW?"โหมดดูตัวอย่าง: เก็บไว้ในเครื่องนี้ ไม่ส่งเข้าระบบ":"บันทึกคะแนนไว้ในเครื่องแล้ว"));
  }

  /* ใช้แสดงความคืบหน้าในรายการกิจกรรม */
  function bestOf(key){ let b=null; hist.forEach(h=>{ if(h.key===key){ const v=h.max?+h.score/+h.max:0; if(b===null||v>b.v) b={v,score:+h.score,max:+h.max}; } }); return b; }
  const has = key => hist.some(h=>h.key===key);

  function asText(){
    const p=profile()||{};
    return [`${C.course||""} · ${C.appName||"Infant Incubator Repair Trainer"}`,`ชื่อ: ${p.name||"-"}  รหัสผู้ใช้: ${p.sid||"-"}  ${p.type==="gp"?"หน่วยงาน: "+(p.org||"-"):"กลุ่ม: "+(p.sec||"-")}`,""]
      .concat(hist.map(h=>`${new Date(h.t).toLocaleString("th-TH")}\t${h.mod}\t${h.item}\t${h.score}/${h.max}`)).join("\n");
  }

  function show(){
    const root=document.getElementById("scores"); const p=profile();
    if(!p){ root.innerHTML=`<h1>ผลของฉัน</h1><p class="muted">กรุณาเข้าสู่ระบบ</p>`; return; }
    const stTh={sent:"บันทึกแล้ว",local:"ในเครื่อง",fail:"รอส่ง",rejected:"ระบบไม่รับ"};
    const pend=hist.filter(h=>h.st==="fail").length;
    root.innerHTML=`<h1>ผลของฉัน</h1>
      <div class="ticket"><div class="tk-h"><span>ข้อมูลผู้เรียน</span><button class="ghost" id="sc-out">ออกจากระบบ</button></div>
        <dl><dt>ชื่อ</dt><dd>${esc(p.name)}</dd><dt>ประเภท</dt><dd>${p.type==="gp"?"บุคลากร / บุคคลทั่วไป":"นักศึกษา"}</dd>
        ${p.type==="gp"?`<dt>อีเมล</dt><dd>${esc(p.sid)}</dd><dt>หน่วยงาน</dt><dd>${esc(p.org)}${p.role?" · "+esc(p.role):""}</dd>`:`<dt>รหัส</dt><dd>${esc(p.sid)}</dd><dt>กลุ่ม</dt><dd>${esc(p.sec||"-")}</dd>`}</dl></div>
      <div class="hint">${PREVIEW?"👁 โหมดดูตัวอย่าง: คะแนนเก็บไว้ในเครื่องนี้เท่านั้น ไม่ส่งเข้าระบบและไม่นับผล":C.sheetUrl?(pend?`⏳ มีคะแนนรอส่ง ${pend} รายการ <button id="sc-rs">ส่งอีกครั้ง</button>`:"✅ คะแนนทั้งหมดบันทึกเข้าระบบแล้ว เข้าสู่ระบบจากเครื่องอื่นก็ทำต่อได้")
        :"ℹ️ ระบบนี้ยังไม่ได้เชื่อมต่อ Google Sheets คะแนนเก็บไว้ในเบราว์เซอร์นี้เท่านั้น"}</div>
      <div id="cert-box"></div>
      <h2>ประวัติคะแนน (${hist.length})</h2>
      ${hist.length?`<div class="htable">${hist.map(h=>`<div class="hrow"><div><b>${esc(h.item)}</b><small>${esc(h.mod)} · ${new Date(h.t).toLocaleString("th-TH",{dateStyle:"short",timeStyle:"short"})} · ${stTh[h.st]||""}</small></div><span class="hs">${h.score}/${h.max}</span></div>`).join("")}</div>`:`<p class="muted">${esc(C.emptyHint||"ยังไม่มีคะแนน ลองทำกิจกรรมในโมดูล 3–7")}</p>`}
      <div class="tools"><button class="primary" id="sc-cp">คัดลอกผลทั้งหมด</button></div>
      <div id="sc-cf"></div>`;
    root.querySelector("#sc-out").onclick=()=>window.Auth&&Auth.signOut();
    const rs=root.querySelector("#sc-rs"); if(rs) rs.onclick=async()=>{ rs.disabled=true; await resendPending(); show(); };
    if(window.Cert) Cert.render(root.querySelector("#cert-box"), hist, p, ()=>window.Auth&&Auth.signOut());
    root.querySelector("#sc-cp").onclick=async()=>{
      try{ await navigator.clipboard.writeText(asText()); toast("คัดลอกแล้ว นำไปวางใน LINE หรืออีเมลได้"); }
      catch(e){ const ta=document.createElement("textarea"); ta.value=asText(); ta.className="copybox"; root.querySelector("#sc-cf").replaceChildren(ta); ta.select(); toast("คัดลอกอัตโนมัติไม่ได้ ให้กดค้างที่ข้อความแล้วเลือกคัดลอก"); }
    };
  }

  window.Score={record, show, idLine, api, toast, profile, session:()=>sess, setSession, logout, endSession, bestOf, has};
  window.Views=window.Views||{}; window.Views.scores={show};
})();
