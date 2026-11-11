/* ===== สุ่มข้อสอบแบบ "ข้อที่เห็นน้อยที่สุดก่อน" (ใช้ร่วมกันทุกวิชา) =====
   - ทุกข้อมีรหัสประจำตัว สร้างจากคำถามและคำตอบที่ถูก (แก้ข้อความ = นับเป็นข้อใหม่)
   - ทุกครั้งที่ส่งคำตอบ ระบบแนบรหัสข้อที่ได้ไปกับคะแนน (ช่อง q) จึงจำข้ามเครื่องผ่านประวัติคะแนนบนเซิร์ฟเวอร์
   - ครั้งถัดไปเลือกข้อที่เคยได้น้อยที่สุดก่อน (สุ่มในกลุ่มที่เท่ากัน)
     คลัง N ข้อ สุ่มครั้งละ n ข้อ → floor(N/n) ครั้งแรกไม่ซ้ำกันเลย จากนั้นวนรอบใหม่โดยกระจายเท่า ๆ กัน
   ใช้: QPick.pick(key, bank, n) คืนข้อที่เลือก (เรียงแบบสุ่ม) · QPick.ids(list) คืนรหัสข้อสำหรับแนบไปกับคะแนน */
(function(){
  const hash=s=>{ let x=0x811c9dc5; for(const ch of String(s)){ x^=ch.codePointAt(0); x=Math.imul(x,0x01000193)>>>0; } return x.toString(36); };
  const id=q=>q ? String(q.id || hash((q.q||"")+"|"+((q.o&&q.o[0])||""))) : "";
  const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
  function counts(key){
    const c={}, H=(window.Score && Score.hist) ? Score.hist() : [];
    H.forEach(r=>{ if(r && r.key===key && r.q) String(r.q).split(",").forEach(i=>{ if(i) c[i]=(c[i]||0)+1; }); });
    return c;
  }
  function pick(key, bank, n){
    const c=counts(key);
    const L=bank.map(q=>({q, k:c[id(q)]||0, r:Math.random()})).sort((a,b)=>a.k-b.k || a.r-b.r);
    return shuffle(L.slice(0, Math.min(n, bank.length)).map(x=>x.q));
  }
  const ids=list=>list.map(x=>id(x && x.q && x.o===undefined ? x.q : x)).join(",");
  window.QPick={pick, ids, id, counts};
})();
