/* ===== ตั้งค่าแอป =====
   app      : รหัสแอปที่ส่งไปพร้อมคะแนน (ต้องตรงกับ APPS ใน apps-script/Code.gs)
   store    : คำนำหน้าคีย์ localStorage (แยกจากแอปอื่นที่อยู่โดเมนเดียวกัน)
   sheetUrl : URL ของ Google Apps Script ตัวเดียวกับแอปอื่นในศูนย์การเรียนรู้
   token    : รหัสลับให้ตรงกับใน Apps Script
*/
window.APP_CONFIG = {
  app: "o2",
  store: "oct",
  appName: "Oxygen Concentrator Repair Trainer",
  portal: "/medtechcenter/",
  sheetUrl: "https://script.google.com/macros/s/AKfycbzLcs08L6W0fnHHZ5tCq8JjkXFPcux3G3_WT1t3vUC8zSo-oQKoACC3xHc67-h-yy6KTw/exec",
  token: "pump-2569",
  course: "ศูนย์การเรียนรู้เทคโนโลยีทางการแพทย์",
  emptyHint: "ยังไม่มีคะแนน เริ่มจากโมดูล 1 แล้วทำแบบทดสอบท้ายบทให้ผ่านทีละโมดูล",

  cert: {
    org: ["ศูนย์การเรียนรู้เทคโนโลยีทางการแพทย์"],
    title: "การฝึกซ่อมและบำรุงรักษาเครื่องผลิตออกซิเจน (Oxygen Concentrator)",
    subject: "ของศูนย์การเรียนรู้เทคโนโลยีทางการแพทย์",
    signer: "รศ.ดร.ณัฐดนัย สิงห์คลีวรรณ",
    signerPos: "ผู้จัดทำสื่อการเรียนรู้",
    ref: "OCT"
  },

  /* เกณฑ์ผ่าน (ต้องตรงกับ APPS.o2.crit ใน apps-script/Code.gs)
     safety    : ด่านความปลอดภัยต้องถูกครบ 5 ข้อ
     passPct   : เกณฑ์ผ่านแบบทดสอบท้ายบทแต่ละโมดูล (5 ข้อ → ถูกอย่างน้อย 4 ข้อ) ต้องผ่านจึงเปิดขั้นถัดไป
     modQuiz   : ผ่านแบบทดสอบท้ายบทครบ 7 โมดูล (โมดูล 1–7)
     examCases : โจทย์ซ่อมจำลอง โหมดสอบ ครบ 10 เคส
     totalPct  : คะแนนรวม = เฉลี่ยของ (ท้ายบทโมดูล 1–7 ครั้งที่ดีที่สุด + เฉลี่ยโหมดสอบโมดูล 8) ต้องได้อย่างน้อย 80% */
  criteria: { safety: 5, passPct: 80, modQuiz: 7, examCases: 10, totalPct: 80 }
};
