/* ===== เข้าสู่ระบบผ่านเว็บหลัก (ศูนย์การเรียนรู้เทคโนโลยีทางการแพทย์) =====
   แอปนี้ไม่มีหน้าสมัครหรือล็อกอินของตัวเอง สมัคร เข้าสู่ระบบ และเปลี่ยนรหัสผ่าน ทำที่เว็บหลักที่เดียว
   เว็บหลักเก็บ session ร่วมไว้ที่ localStorage "mtc-session" = {profile, tk, enrolled} (โดเมนเดียวกัน)
   - มีบัตรผ่าน (tk) และลงทะเบียนวิชานี้แล้ว → เข้าแอปได้เลย
   - ยังไม่ได้เข้าสู่ระบบ หรือยังไม่ได้ลงทะเบียน → ส่งไปหน้าวิชาบนเว็บหลัก
   ไฟล์นี้ใช้เหมือนกันทั้งแอป Infusion Pump และตู้อบทารก (ค่าที่ต่างกันอยู่ใน data/config.js) */
(function(){
  const C = window.APP_CONFIG || {};
  const esc = s => String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const APP = C.app || "pump", PORTAL = C.portal || "/medtechcenter/";
  const K_M = "mtc-session";
  const portalSess = ()=>{ try{ const m=JSON.parse(localStorage.getItem(K_M)); return m&&m.profile&&m.tk?m:null; }catch(e){ return null; } };
  const dropPortal = ()=>{ try{ localStorage.removeItem(K_M); localStorage.removeItem("ipt-local-users"); }catch(e){} };
  const toPortal = page=>{ location.replace(PORTAL + page); };

  function waitBox(msg){
    let g=document.getElementById("auth");
    if(!g){ g=document.createElement("div"); g.id="auth"; document.body.appendChild(g); }
    document.body.classList.add("locked");
    g.innerHTML=`<div class="abox"><p class="acenter">${esc(msg)}</p></div>`;
  }

  function enter(){
    document.body.classList.remove("locked");
    const g=document.getElementById("auth"); if(g) g.remove();
    userBox();
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }

  function userBox(){
    const bar=document.querySelector("header .bar"); if(!bar) return;
    let b=document.getElementById("userbox");
    if(!b){ b=document.createElement("div"); b.id="userbox"; bar.appendChild(b); }
    const p=window.Score.profile();
    b.innerHTML = p ? `<a href="${esc(PORTAL)}my.html" class="uname" title="กลับศูนย์การเรียนรู้">← วิชาของฉัน</a> <a href="#scores" class="uname" title="ผลของฉัน">👤 ${esc(p.name.split(" ")[0])}</a>` : "";
  }

  function signOut(){
    const d=document.createElement("div"); d.className="modal";
    d.innerHTML=`<div class="mbox" role="dialog" aria-modal="true"><h2>ออกจากระบบ?</h2><p class="muted small">คะแนนที่บันทึกเข้าระบบแล้วจะไม่หาย เข้าสู่ระบบใหม่ได้ทุกเมื่อ</p>
      <div class="tools"><button class="ghost" id="so-n">ยกเลิก</button><button class="primary" id="so-y">ออกจากระบบ</button></div></div>`;
    document.body.appendChild(d);
    d.querySelector("#so-n").onclick=()=>d.remove();
    d.querySelector("#so-y").onclick=()=>{ d.remove(); window.Score.logout(); dropPortal(); location.href=PORTAL; };
  }

  /* บัตรผ่านใช้ไม่ได้แล้ว (หมดอายุ เปลี่ยนรหัสผ่าน ถูกระงับ) → ออกจากระบบแล้วไปหน้าเข้าสู่ระบบ */
  function relogin(){
    window.Score.endSession(); dropPortal();
    toPortal("login.html?next="+encodeURIComponent("course.html?c="+APP));
  }

  async function adopt(m){
    if(!(m.enrolled||[]).includes(APP)) return toPortal("course.html?c="+APP);
    waitBox("กำลังเข้าสู่ระบบจากศูนย์การเรียนรู้…");
    const S=window.Score;
    const r = await S.api("app",{tk:m.tk});
    if(r.ok){ S.setSession({profile:r.profile, tk:m.tk}, r.hist||[]); return enter(); }
    if(r.err==="net"){ S.setSession({profile:m.profile, tk:m.tk}, null); return enter(); }
    if(r.err==="notenrolled"){
      try{ m.enrolled=(m.enrolled||[]).filter(a=>a!==APP); localStorage.setItem(K_M, JSON.stringify(m)); }catch(e){}
      return toPortal("course.html?c="+APP);
    }
    relogin();
  }

  /* โหมดดูตัวอย่าง (?preview): ไม่ต้องเข้าสู่ระบบ แสดงแถบบอกโหมดแทนชื่อผู้ใช้ */
  function previewBar(){
    const bar=document.querySelector("header .bar"); if(!bar) return;
    const b=document.createElement("div"); b.id="userbox";
    b.innerHTML=`<span class="uname" style="background:#fff4d6;border-color:#e8c46a" title="คะแนนไม่ส่งเข้าระบบ">👁 โหมดดูตัวอย่าง</span>`;
    bar.appendChild(b);
  }
  function init(){
    if(window.PREVIEW) return previewBar();
    const own = window.Score.session(), m = portalSess();
    if(!m){ if(own) window.Score.logout(); return toPortal("course.html?c="+APP); }
    if(own && own.tk === m.tk && own.profile.sid === m.profile.sid) return userBox();
    if(own) own.profile.sid === m.profile.sid ? window.Score.endSession() : window.Score.logout();
    adopt(m);
  }
  window.Auth={init, signOut, relogin};
  document.addEventListener("DOMContentLoaded", init);
})();
