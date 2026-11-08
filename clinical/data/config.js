/* ===== ตั้งค่าแอป วิชาคลินิก: การใช้เครื่องผลิตออกซิเจนอย่างปลอดภัย =====
   ใช้ไฟล์ร่วมกับแอปซ่อม (../css, ../js/score.js, ../js/auth.js, ../js/cert.js, ../js/widgets.js)
   app   : ต้องตรงกับ APPS ใน apps-script/Code.gs และ courses.js ของเว็บหลัก
   store : คำนำหน้าคีย์ localStorage ของแอปนี้ */
window.APP_CONFIG = {
  app: "o2-clin",
  store: "occ",
  appName: "Oxygen Concentrator Clinical Use",
  portal: "/medtechcenter/",
  sheetUrl: "https://script.google.com/macros/s/AKfycbzLcs08L6W0fnHHZ5tCq8JjkXFPcux3G3_WT1t3vUC8zSo-oQKoACC3xHc67-h-yy6KTw/exec",
  token: "pump-2569",
  course: "ศูนย์การเรียนรู้เทคโนโลยีทางการแพทย์",
  emptyHint: "ยังไม่มีคะแนน เริ่มจากบทที่ 1 แล้วทำแบบทดสอบท้ายบทให้ผ่านทีละบท",
  reportEmail: "theptharo2019@gmail.com",

  cert: {
    org: ["ศูนย์การเรียนรู้เทคโนโลยีทางการแพทย์"],
    title: "การใช้เครื่องผลิตออกซิเจนอย่างปลอดภัย (Oxygen Concentrator Clinical Use)",
    subject: "ของศูนย์การเรียนรู้เทคโนโลยีทางการแพทย์",
    signer: "รศ.ดร.ณัฐดนัย สิงห์คลีวรรณ",
    signerPos: "ผู้จัดทำสื่อการเรียนรู้",
    ref: "OCC"
  },

  /* เกณฑ์ผ่าน (ต้องตรงกับ APPS['o2-clin'].crit ใน Code.gs)
     readLessons: ผ่านท้ายบทครบ 9 บท (ผ่านแล้วบันทึก read:<บท>) · lessonPct: เกณฑ์ผ่านท้ายบท (5 ข้อ → 4 ข้อ)
     simPct: เครื่องจำลอง · quizPct: แบบทดสอบท้ายวิชา 20 ข้อ */
  criteria: { readLessons: 9, lessonPct: 80, simPct: 80, quizPct: 80, finalN: 20 }
};
