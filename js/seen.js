/* ===== ต้องเปิดดูเนื้อหาครบทุกหัวข้อก่อนทำแบบทดสอบ (ไฟล์เดียวกันทุกวิชา) =====
   ใช้งาน:
     Seen.define(scope, topicsFn, goFn, passedFn)  topicsFn() คืน [{id, n}] = หัวข้อทั้งหมดของโมดูลหรือบท · goFn(id) = พาไปที่หัวข้อนั้น
                                         passedFn() = ผ่านโมดูลนี้แล้วหรือยัง (ผ่านแล้วไม่ล็อกย้อนหลัง · ถ้าไม่ใส่ใช้ MGate.passed)
     Seen.mark(scope, id, el)            บันทึกว่าเปิดดูหัวข้อนี้แล้ว (เรียกจากโค้ดที่แสดงเนื้อหา) · ถ้าใส่ el จะนับเมื่อ el ปรากฏบนจอจริงเท่านั้น
                                         (เช่นแสดงไว้ในหน้าที่ยังซ่อนอยู่ จะนับเมื่อผู้เรียนเปิดหน้านั้น)
     ใส่ data-seen="scope|id" ที่ปุ่มหรือ <details> ก็ได้ ระบบจับการคลิกหรือการเปิดให้เอง และใส่เครื่องหมาย ✓ ให้
     Seen.status(scope) → {ok, have, total, missing:[{id,n}]}
     Seen.gateHTML(scope) → กล่องแจ้งความคืบหน้า (ใช้แทนปุ่มเริ่มสอบเมื่อยังดูไม่ครบ)
   เมื่อดูครบ บันทึกคะแนน key "seen:<scope>" (1/1) เข้าระบบหลังบ้าน เปลี่ยนเครื่องแล้วไม่ต้องดูใหม่ (ไม่กระทบเกณฑ์ใบรับรอง)
     Seen.sectionize(article, scope)     แปลงหัวข้อย่อย <h2>/<h3> ระดับบนสุดในบทเรียนเป็นกล่องแตะเปิด <details data-seen="scope|h<k>"> คืนจำนวนหัวข้อ
     Seen.fromDom(scope)                 หัวข้อทั้งหมดของ scope ที่อยู่ในหน้าตอนนี้ (อ่านจาก data-seen)
   โหมดดูตัวอย่าง (?preview) ไม่ล็อก */
(function(){
  const C=window.APP_CONFIG||{}, KEY=(C.store||"app")+"-seen";
  const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const reg={};
  let data={}; try{ data=JSON.parse(localStorage.getItem(KEY)||"{}")||{}; }catch(e){ data={}; }
  const save=()=>{ try{ localStorage.setItem(KEY, JSON.stringify(data)); }catch(e){} };
  const sent={};

  function define(scope, topicsFn, goFn, passedFn){ reg[scope]={topicsFn, goFn, passedFn}; }
  function topics(scope){ const r=reg[scope]; try{ return r?(r.topicsFn()||[]):[]; }catch(e){ return []; } }
  const seenSet=scope=>new Set(data[scope]||[]);
  const has=(scope,id)=>seenSet(scope).has(String(id));
  const doneOnServer=scope=>!!(window.Score && Score.has && Score.has("seen:"+scope));

  function status(scope){
    const T=topics(scope), S=seenSet(scope), miss=T.filter(t=>!S.has(String(t.id)));
    const r=reg[scope], pf=r&&r.passedFn;
    const ok=!T.length || !miss.length || !!window.PREVIEW || doneOnServer(scope) || (pf ? !!pf() : !!(window.MGate && MGate.passed && MGate.passed(scope)));
    return {ok, have:T.length-miss.length, total:T.length, missing:miss};
  }
  const vis=el=>!!(el && el.isConnected && el.getClientRects().length);
  const pending=new Map();
  function mark(scope, id, el){
    if(scope==null || id==null) return;
    id=String(id);
    if(el && !vis(el)){ pending.set(scope+"|"+id, el); return; }
    pending.delete(scope+"|"+id);
    const S=seenSet(scope);
    if(S.has(id)) return;
    S.add(id); data[scope]=[...S]; save();
    paint();
    const T=topics(scope);
    if(T.length && T.every(t=>S.has(String(t.id))) && !window.PREVIEW && !doneOnServer(scope) && !sent[scope] && window.Score && Score.session && Score.session()){
      sent[scope]=1;
      Score.record({key:"seen:"+scope, mod:"เปิดดูเนื้อหาครบ", item:scope, score:1, max:1, detail:`ดูครบ ${T.length} หัวข้อ`, quiet:true});
    }
    document.dispatchEvent(new CustomEvent("seen-change",{detail:{scope}}));
  }
  /* ใส่ ✓ ให้ทุกองค์ประกอบที่มี data-seen ที่ดูแล้ว */
  function paint(root){
    (root||document).querySelectorAll("[data-seen]").forEach(el=>{ const [s,i]=el.dataset.seen.split("|"), v=has(s,i); if(el.classList.contains("seen-ok")!==v) el.classList.toggle("seen-ok", v); });
  }
  /* หัวข้อย่อยในบทเรียน (<h2>/<h3> ระดับบนสุด ยกเว้นชื่อบทที่เป็นลูกตัวแรก) → กล่องแตะเปิด ปิดไว้ทุกกล่อง
     เนื้อหาก่อนหัวข้อแรกแสดงตามปกติ (บทนำ) · หยุดที่แหล่งอ้างอิง ปุ่ม หรือกล่องแบบทดสอบ */
  function sectionize(art, scope, sel){
    if(!art) return 0;
    const first=art.firstElementChild;
    const isHead=el=>el!==first && el.matches(sel||"h2,h3"), isStop=el=>el.matches(".srcs,.tools,.mq,#lq,.qbox,[data-nosec]");
    const kids=[...art.children]; let k=0, cur=null;
    kids.forEach(el=>{
      if(isStop(el)){ cur=null; return; }
      if(isHead(el)){
        const d=document.createElement("details"); d.className="lsec-d"; d.dataset.seen=scope+"|h"+k; k++;
        const sm=document.createElement("summary"); el.parentNode.insertBefore(d, el); sm.appendChild(el); d.appendChild(sm); cur=d; return;
      }
      if(cur) cur.appendChild(el);
    });
    return k;
  }
  function fromDom(scope){
    const ids=new Set(), out=[];
    document.querySelectorAll(`[data-seen^="${CSS.escape(scope)}|"]`).forEach(el=>{ const id=el.dataset.seen.slice(scope.length+1); if(ids.has(id)) return; ids.add(id);
      const s=el.tagName==="DETAILS"?el.querySelector("summary"):el; out.push({id, n:(s?s.textContent:id).replace(/\s+/g," ").trim()}); });
    return out;
  }
  function go(scope, id){ const r=reg[scope]; if(r && r.goFn) r.goFn(id); }

  function gateHTML(scope){
    const st=status(scope);
    return `<div class="seen-gate"><p><b>🔒 เปิดดูเนื้อหาให้ครบทุกหัวข้อก่อนจึงจะเริ่มทำแบบทดสอบได้</b> · ดูแล้ว ${st.have}/${st.total} หัวข้อ</p>
      <div class="seen-bar"><i style="width:${st.total?Math.round(st.have/st.total*100):100}%"></i></div>
      <p class="small muted">ยังไม่ได้ดู:</p><div class="seen-miss">${st.missing.map(t=>`<button class="seen-go" data-sg="${esc(scope)}|${esc(t.id)}">${esc(t.n)}</button>`).join("")}</div></div>`;
  }

  /* จับการคลิกและการเปิด <details> ที่มี data-seen */
  document.addEventListener("click", e=>{
    const g=e.target.closest("[data-sg]"); if(g){ const [s,i]=g.dataset.sg.split("|"); go(s,i); return; }
    const el=e.target.closest("[data-seen]"); if(el && el.tagName!=="DETAILS"){ const [s,i]=el.dataset.seen.split("|"); mark(s,i); }
  }, true);
  document.addEventListener("toggle", e=>{ const el=e.target; if(el && el.tagName==="DETAILS" && el.open && el.dataset && el.dataset.seen){ const [s,i]=el.dataset.seen.split("|"); mark(s,i,el); } }, true);
  /* ตรวจซ้ำเมื่อหน้าจอเปลี่ยน: หัวข้อที่รอแสดง และ <details> ที่เปิดอยู่แล้วตั้งแต่ต้นซึ่งเพิ่งปรากฏบนจอ */
  function scan(){
    pending.forEach((el,k)=>{ if(!el.isConnected){ pending.delete(k); return; } if(vis(el)){ const j=k.indexOf("|"); mark(k.slice(0,j), k.slice(j+1)); } });
    document.querySelectorAll("details[open][data-seen]").forEach(el=>{ if(vis(el)){ const [s,i]=el.dataset.seen.split("|"); if(!has(s,i)) mark(s,i); } });
    paint();
  }
  let pend=0;
  const later=()=>{ if(pend) return; pend=requestAnimationFrame(()=>{ pend=0; scan(); }); };
  new MutationObserver(later).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:["class","open","hidden","style"]});
  window.addEventListener("hashchange", ()=>setTimeout(later,30));
  document.addEventListener("click", ()=>setTimeout(later,30));

  window.Seen={define, mark, has, status, gateHTML, go, paint, topics, sectionize, fromDom};
})();
