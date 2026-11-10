/* Google Apps Script สำหรับศูนย์การเรียนรู้เทคโนโลยีทางการแพทย์ (ใช้ Google Sheet และบัญชีผู้เรียนร่วมกันทุกแอป)
   แอปที่รองรับ: pump = Infusion Pump Repair Trainer, incubator = Infant Incubator Repair Trainer,
   incubator-clin = วิชาคลินิก การใช้ตู้อบทารกอย่างปลอดภัย,
   pump-clin = วิชาคลินิก การใช้เครื่องควบคุมการให้สารละลายอย่างปลอดภัย,
   o2-clin = วิชาคลินิก การใช้เครื่องผลิตออกซิเจนอย่างปลอดภัย,
   o2 = Oxygen Concentrator Repair Trainer (เกณฑ์แบบ kind 'o2': ด่านความปลอดภัย + ท้ายบท 7 โมดูล + โจทย์ซ่อม 10 เคส + คะแนนรวม),
   suction = Medical Suction Repair Trainer (เกณฑ์แบบ kind 'repair' 10 เคส · สอบท้ายโมดูล 4 ด่านความปลอดภัยต้องได้ 100%),
   suction-clin = วิชาคลินิก การใช้เครื่องดูดทางการแพทย์อย่างปลอดภัย
   1) สมัคร / เข้าสู่ระบบ / เปลี่ยนรหัสผ่าน ทำที่เว็บหลัก (stdsk99/medtechcenter) ที่เดียว
      แอปฝึกซ่อมรับ "บัตรผ่าน" (session token) จากเว็บหลัก แล้วใช้ส่งคะแนน
   2) เมนู "ผู้ใช้" ใน Google Sheets: ดูข้อมูล รีเซ็ตรหัสผ่าน ระงับบัญชี ยกเลิกการลงทะเบียน (ไม่มีการลบผู้ใช้)
   3) เมนู "เกียรติบัตร": สรุปผลผ่านเกณฑ์ และออกเกียรติบัตรทางการเป็น PDF แยกตามแอป

   ความปลอดภัย
   - รหัสผ่านเก็บเป็นค่า hash แบบมี salt รายคน + รหัสลับ (pepper) ที่เก็บใน Script Properties ไม่ได้อยู่ใน Sheet
   - ใส่รหัสผ่านผิด 5 ครั้งติดกัน ล็อกบัญชี 15 นาที
   - บัตรผ่านมีอายุ 30 วัน ถูกยกเลิกทันทีเมื่อเปลี่ยนรหัสผ่าน รีเซ็ต หรือระงับบัญชี
   - ผู้ใช้เดิมที่ใช้ PIN: เข้าสู่ระบบด้วย PIN เดิมได้ แล้วระบบบังคับให้ตั้งรหัสผ่านใหม่
   ห้ามลบ Script Properties ชื่อ PEPPER และ TOKEN_SECRET (ถ้าลบ ผู้ใช้ทุกคนจะเข้าสู่ระบบไม่ได้)

   วิธีอัปเดต: เปิด Google Sheet เดิม → ส่วนขยาย → Apps Script → วางโค้ดนี้ทับทั้งหมด → บันทึก
   → Deploy → Manage deployments → แก้ไข deployment เดิม → Version: New version → Deploy (URL เดิมใช้ต่อได้) */

const TOKEN = 'pump-2569';          // รหัสระบุแอป (ไม่ใช่รหัสลับ) ต้องตรงกับ config ของเว็บหลักและทุกแอป
const SHEET_NAME = 'scores';
const USER_SHEET = 'users';
const HEAD = ['เวลา', 'รหัสผู้ใช้', 'ชื่อ-สกุล', 'กลุ่ม', 'โมดูล', 'รายการ', 'คะแนน', 'เต็ม', 'ร้อยละ', 'รายละเอียด', 'key', 'ประเภทผู้เรียน', 'หน่วยงาน', 'แอป'];
const UHEAD = ['ลงทะเบียนเมื่อ', 'รหัสผู้ใช้', 'ชื่อ-สกุล', 'ประเภท', 'กลุ่ม', 'หน่วยงาน', 'ตำแหน่ง', 'รหัสผ่าน (เข้ารหัสแล้ว ห้ามแก้)', 'ยินยอม PDPA', 'เข้าสู่ระบบล่าสุด',
  'สถานะ', 'ต้องเปลี่ยนรหัสผ่าน', 'ใส่ผิดติดกัน', 'ล็อกถึง', 'รุ่นบัตรผ่าน'];
const U = { sid: 2, name: 3, cred: 8, last: 10, status: 11, must: 12, fails: 13, lock: 14, ver: 15 };   // เลขคอลัมน์ในแท็บ users
const DEFAULT_APP = 'pump';
const ENROLL_SHEET = 'enrollments';
const EHEAD = ['ลงทะเบียนเรียนเมื่อ', 'รหัสผู้ใช้', 'ชื่อ-สกุล', 'แอป', 'ช่องทาง', 'สถานะ'];
const SUSPENDED = 'ระงับ', CANCELLED = 'ยกเลิก';
const MAX_FAILS = 5, LOCK_MIN = 15, TOKEN_DAYS = 30, HASH_ROUNDS = 300;

/* ตั้งค่าแต่ละแอป
   crit  = เกณฑ์ผ่าน (ต้องตรงกับ criteria ใน data/config.js ของแอปนั้น) clinSimPct ใส่เฉพาะแอปที่มีเครื่องจำลองทางคลินิก
   cert  = ข้อความบนเกียรติบัตร
   ref   = คำนำหน้าเลขที่เกียรติบัตร
   tmplKey / logSheet / sumSheet / folder = ชื่อที่ใช้เก็บแม่แบบ บันทึก และไฟล์ PDF ของแอปนั้น */
const APPS = {
  pump: {
    name: 'Infusion Pump Repair Trainer', kind: 'repair', clinLabel: 'การใช้งานสำหรับช่าง',
    crit: { learnCases: 8, examCases: 8, examAvg: 70, quizPct: 80, orderTasks: 3, clinSimPct: 80, acceptPct: 80, pmPct: 80, modTests: 8 },   // clinSimPct = โมดูล 6 · acceptPct = โมดูล 7 ตรวจรับ · pmPct = โมดูล 8 PM · modTests = สอบท้ายโมดูลผ่านครบ
    cert: {
      org1: 'ศูนย์การเรียนรู้เทคโนโลยีทางการแพทย์',
      org2: '',
      title: 'การฝึกซ่อมและทดสอบเครื่องควบคุมการให้สารละลาย (Infusion Pump)',
      subject: 'ของศูนย์การเรียนรู้เทคโนโลยีทางการแพทย์',
      signer: 'รศ.ดร.ณัฐดนัย สิงห์คลีวรรณ',
      signerPos: 'ผู้จัดทำสื่อการเรียนรู้'
    },
    ref: 'IPT', tmplKey: 'TEMPLATE_ID', logSheet: 'เกียรติบัตร', sumSheet: 'สรุป',
    folder: 'เกียรติบัตร Infusion Pump', tmplName: 'แม่แบบเกียรติบัตร Infusion Pump Trainer'
  },
  incubator: {
    name: 'Infant Incubator Repair Trainer', kind: 'repair', clinLabel: 'การใช้งานสำหรับช่าง',
    crit: { learnCases: 8, examCases: 8, examAvg: 70, quizPct: 80, orderTasks: 3, clinSimPct: 80, acceptPct: 80, pmPct: 80, modTests: 8 },   // clinSimPct = โมดูล 6 ฝึกตั้งค่า + มุมช่าง · acceptPct = โมดูล 7 · pmPct = โมดูล 8 · modTests = สอบท้ายโมดูลผ่านครบ
    cert: {
      org1: 'ศูนย์การเรียนรู้เทคโนโลยีทางการแพทย์',
      org2: '',
      title: 'การฝึกซ่อมและบำรุงรักษาตู้อบทารก (Infant Incubator)',
      subject: 'ของศูนย์การเรียนรู้เทคโนโลยีทางการแพทย์',
      signer: 'รศ.ดร.ณัฐดนัย สิงห์คลีวรรณ',
      signerPos: 'ผู้จัดทำสื่อการเรียนรู้'
    },
    ref: 'IIT', tmplKey: 'TEMPLATE_ID_incubator', logSheet: 'เกียรติบัตร ตู้อบ', sumSheet: 'สรุป ตู้อบ',
    folder: 'เกียรติบัตร Infant Incubator', tmplName: 'แม่แบบเกียรติบัตร Infant Incubator Trainer'
  },
  /* วิชาคลินิก (พยาบาลและนักศึกษาพยาบาล): อ่านบทเรียน + เครื่องจำลอง + แบบทดสอบ */
  'incubator-clin': {
    name: 'Infant Incubator Clinical Use', kind: 'clinical',
    crit: { readLessons: 9, simPct: 80, quizPct: 80, modTests: 9 },
    cert: {
      org1: 'ศูนย์การเรียนรู้เทคโนโลยีทางการแพทย์',
      org2: '',
      title: 'การใช้ตู้อบทารกอย่างปลอดภัย (Infant Incubator Clinical Use)',
      subject: 'ของศูนย์การเรียนรู้เทคโนโลยีทางการแพทย์',
      signer: 'รศ.ดร.ณัฐดนัย สิงห์คลีวรรณ',
      signerPos: 'ผู้จัดทำสื่อการเรียนรู้'
    },
    ref: 'IIC', tmplKey: 'TEMPLATE_ID_incubator_clin', logSheet: 'เกียรติบัตร ตู้อบคลินิก', sumSheet: 'สรุป ตู้อบคลินิก',
    folder: 'เกียรติบัตร Infant Incubator Clinical', tmplName: 'แม่แบบเกียรติบัตร Infant Incubator Clinical Use'
  },
  /* เครื่องผลิตออกซิเจน: ด่านความปลอดภัย (key safety) ท้ายบท (mq:m1..m7) โจทย์ซ่อมโหมดสอบ (exam:c1..c10)
     คะแนนรวม = เฉลี่ยของท้ายบท 7 โมดูล (ร้อยละ ครั้งที่ดีที่สุด) กับเฉลี่ยโหมดสอบ */
  o2: {
    name: 'Oxygen Concentrator Repair Trainer', kind: 'o2',
    crit: { safety: 5, passPct: 80, modQuiz: 7, examCases: 10, totalPct: 80 },   // passPct = เกณฑ์ผ่านท้ายบทแต่ละโมดูล
    cert: {
      org1: 'ศูนย์การเรียนรู้เทคโนโลยีทางการแพทย์',
      org2: '',
      title: 'การฝึกซ่อมและบำรุงรักษาเครื่องผลิตออกซิเจน (Oxygen Concentrator)',
      subject: 'ของศูนย์การเรียนรู้เทคโนโลยีทางการแพทย์',
      signer: 'รศ.ดร.ณัฐดนัย สิงห์คลีวรรณ',
      signerPos: 'ผู้จัดทำสื่อการเรียนรู้'
    },
    ref: 'OCT', tmplKey: 'TEMPLATE_ID_o2', logSheet: 'เกียรติบัตร ออกซิเจน', sumSheet: 'สรุป ออกซิเจน',
    folder: 'เกียรติบัตร Oxygen Concentrator', tmplName: 'แม่แบบเกียรติบัตร Oxygen Concentrator Trainer'
  },
  'o2-clin': {
    name: 'Oxygen Concentrator Clinical Use', kind: 'clinical',
    crit: { readLessons: 9, simPct: 80, quizPct: 80 },   // read:<บท> บันทึกเมื่อผ่านท้ายบท 4/5
    cert: {
      org1: 'ศูนย์การเรียนรู้เทคโนโลยีทางการแพทย์',
      org2: '',
      title: 'การใช้เครื่องผลิตออกซิเจนอย่างปลอดภัย (Oxygen Concentrator Clinical Use)',
      subject: 'ของศูนย์การเรียนรู้เทคโนโลยีทางการแพทย์',
      signer: 'รศ.ดร.ณัฐดนัย สิงห์คลีวรรณ',
      signerPos: 'ผู้จัดทำสื่อการเรียนรู้'
    },
    ref: 'OCC', tmplKey: 'TEMPLATE_ID_o2_clin', logSheet: 'เกียรติบัตร ออกซิเจนคลินิก', sumSheet: 'สรุป ออกซิเจนคลินิก',
    folder: 'เกียรติบัตร Oxygen Concentrator Clinical', tmplName: 'แม่แบบเกียรติบัตร Oxygen Concentrator Clinical Use'
  },
  /* เครื่องดูดทางการแพทย์: เกณฑ์แบบวิชาซ่อม (kind 'repair') 10 เคส · mqPass = เกณฑ์สอบท้ายโมดูลเฉพาะโมดูล (ร้อยละ) */
  suction: {
    name: 'Medical Suction Repair Trainer', kind: 'repair', clinLabel: 'การใช้งานสำหรับช่าง',
    crit: { learnCases: 10, examCases: 10, examAvg: 70, quizPct: 80, orderTasks: 3, clinSimPct: 80, acceptPct: 80, pmPct: 80, modTests: 8, mqPass: { 'mq:safety': 100 } },   // clinSimPct = โมดูล 3 · acceptPct = โมดูล 5 · pmPct = โมดูล 6 · โมดูล 4 ด่านความปลอดภัยต้องถูกครบ 5 ข้อ
    cert: {
      org1: 'ศูนย์การเรียนรู้เทคโนโลยีทางการแพทย์',
      org2: '',
      title: 'การฝึกซ่อมและบำรุงรักษาเครื่องดูดทางการแพทย์ (Medical Suction)',
      subject: 'ของศูนย์การเรียนรู้เทคโนโลยีทางการแพทย์',
      signer: 'รศ.ดร.ณัฐดนัย สิงห์คลีวรรณ',
      signerPos: 'ผู้จัดทำสื่อการเรียนรู้'
    },
    ref: 'SUT', tmplKey: 'TEMPLATE_ID_suction', logSheet: 'เกียรติบัตร เครื่องดูด', sumSheet: 'สรุป เครื่องดูด',
    folder: 'เกียรติบัตร Medical Suction', tmplName: 'แม่แบบเกียรติบัตร Medical Suction Trainer'
  },
  'suction-clin': {
    name: 'Medical Suction Clinical Use', kind: 'clinical',
    crit: { readLessons: 9, simPct: 80, quizPct: 80 },   // read:<บท> บันทึกเมื่อผ่านท้ายบท 4/5
    cert: {
      org1: 'ศูนย์การเรียนรู้เทคโนโลยีทางการแพทย์',
      org2: '',
      title: 'การใช้เครื่องดูดทางการแพทย์อย่างปลอดภัย (Medical Suction Clinical Use)',
      subject: 'ของศูนย์การเรียนรู้เทคโนโลยีทางการแพทย์',
      signer: 'รศ.ดร.ณัฐดนัย สิงห์คลีวรรณ',
      signerPos: 'ผู้จัดทำสื่อการเรียนรู้'
    },
    ref: 'SUC', tmplKey: 'TEMPLATE_ID_suction_clin', logSheet: 'เกียรติบัตร เครื่องดูดคลินิก', sumSheet: 'สรุป เครื่องดูดคลินิก',
    folder: 'เกียรติบัตร Medical Suction Clinical', tmplName: 'แม่แบบเกียรติบัตร Medical Suction Clinical Use'
  },
  'pump-clin': {
    name: 'Infusion Pump Clinical Use', kind: 'clinical',
    crit: { readLessons: 9, simPct: 80, quizPct: 80, modTests: 9 },
    cert: {
      org1: 'ศูนย์การเรียนรู้เทคโนโลยีทางการแพทย์',
      org2: '',
      title: 'การใช้เครื่องควบคุมการให้สารละลายอย่างปลอดภัย (Infusion Pump Clinical Use)',
      subject: 'ของศูนย์การเรียนรู้เทคโนโลยีทางการแพทย์',
      signer: 'รศ.ดร.ณัฐดนัย สิงห์คลีวรรณ',
      signerPos: 'ผู้จัดทำสื่อการเรียนรู้'
    },
    ref: 'IPC', tmplKey: 'TEMPLATE_ID_pump_clin', logSheet: 'เกียรติบัตร ปั๊มคลินิก', sumSheet: 'สรุป ปั๊มคลินิก',
    folder: 'เกียรติบัตร Infusion Pump Clinical', tmplName: 'แม่แบบเกียรติบัตร Infusion Pump Clinical Use'
  }
};
const appOf_ = a => (APPS[String(a || '').trim()] ? String(a).trim() : DEFAULT_APP);
const isApp_ = a => !!APPS[String(a || '').trim()];

/* ---------------- ช่วยเหลือ ---------------- */
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function sheet_(name, head) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sh.getLastRow() === 0) { sh.appendRow(head); sh.setFrozenRows(1); }
  else if (String(sh.getRange(1, head.length).getValue()) === '') sh.getRange(1, 1, 1, head.length).setValues([head]);
  return sh;
}
function findUser_(sid) {
  const sh = sheet_(USER_SHEET, UHEAD);
  if (!sid || sh.getLastRow() < 2) return null;
  const cell = sh.getRange(2, 2, sh.getLastRow() - 1, 1).createTextFinder(sid).matchEntireCell(true).findNext();
  return cell ? userAt_(sh, cell.getRow()) : null;
}
function userAt_(sh, row) {
  const v = sh.getRange(row, 1, 1, UHEAD.length).getValues()[0];
  return { sh, row, sid: String(v[1]), name: v[2], type: v[3], sec: v[4], org: v[5], role: v[6], cred: String(v[7] || ''),
    suspended: String(v[10]).trim() === SUSPENDED, must: String(v[11]).trim() !== '', fails: Number(v[12]) || 0,
    lockUntil: v[13] ? new Date(v[13]).getTime() : 0, ver: Number(v[14]) || 0 };
}
function setU_(u, col, val) { u.sh.getRange(u.row, col).setValue(val); }
function profileOf_(u) {
  return { type: u.type === 'gp' ? 'gp' : 'st', sid: u.sid, name: u.name, sec: u.sec, org: u.org, role: u.role };
}

/* ---------------- รหัสผ่านและบัตรผ่าน ---------------- */
function secret_(key) {
  const P = PropertiesService.getScriptProperties();
  let v = P.getProperty(key);
  if (!v) { v = Utilities.getUuid() + Utilities.getUuid(); P.setProperty(key, v); }
  return v;
}
const hex_ = bytes => bytes.map(b => ((b + 256) % 256).toString(16).padStart(2, '0')).join('');
const sha_ = s => hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8));

/* นโยบายรหัสผ่าน: 8–16 ตัว อักษรภาษาอังกฤษ ตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก ตัวเลข และอักขระพิเศษ อย่างละ 1 ตัวขึ้นไป */
function pwOk_(pw) {
  pw = String(pw || '');
  return /^[\x21-\x7E]{8,16}$/.test(pw) && /[A-Z]/.test(pw) && /[a-z]/.test(pw) && /\d/.test(pw) && /[^A-Za-z0-9]/.test(pw);
}
function hashPw_(pw, salt) {
  const pepper = secret_('PEPPER');
  let h = sha_(pepper + '|' + salt + '|' + pw);
  for (let i = 0; i < HASH_ROUNDS; i++) h = sha_(h + pepper);
  return h;
}
function makeCred_(pw) {
  const salt = Utilities.getUuid().replace(/-/g, '');
  return 'v2$' + salt + '$' + hashPw_(pw, salt);
}
/* ตรวจรหัสผ่าน: 'ok' | 'legacy' (PIN แบบเดิมถูกต้อง) | 'bad' */
function checkCred_(u, pw) {
  pw = String(pw || '');
  if (!pw || !u.cred) return 'bad';
  if (u.cred.indexOf('v2$') === 0) {
    const p = u.cred.split('$');
    return hashPw_(pw, p[1]) === p[2] ? 'ok' : 'bad';
  }
  return /^\d{4,6}$/.test(pw) && sha_('ipt|' + u.sid + '|' + pw) === u.cred ? 'legacy' : 'bad';
}

function b64_(s) { return Utilities.base64EncodeWebSafe(s, Utilities.Charset.UTF_8).replace(/=+$/, ''); }
function sign_(s) { return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(s, secret_('TOKEN_SECRET'))).replace(/=+$/, ''); }
function issueToken_(u) {
  const p = b64_(JSON.stringify({ s: u.sid, v: u.ver, e: Date.now() + TOKEN_DAYS * 864e5 }));
  return p + '.' + sign_(p);
}
/* ตรวจบัตรผ่าน คืน {u} หรือ {err} */
function auth_(tk) {
  const parts = String(tk || '').split('.');
  if (parts.length !== 2 || sign_(parts[0]) !== parts[1]) return { err: 'auth' };
  let d;
  try { d = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[0] + '==='.slice((parts[0].length + 3) % 4))).getDataAsString()); }
  catch (e) { return { err: 'auth' }; }
  if (!d || d.e < Date.now()) return { err: 'auth' };
  const u = findUser_(String(d.s));
  if (!u) return { err: 'auth' };
  if (u.suspended) return { err: 'suspended' };
  if (u.ver !== d.v || u.must) return { err: 'auth' };
  return { u };
}

/* ตรวจรหัสผ่านพร้อมนับครั้งที่ผิด คืน {u, res} หรือ {err} */
function login0_(sid, pw) {
  const u = findUser_(sid);
  if (!u) return { err: 'nouser' };
  if (u.suspended) return { err: 'suspended' };
  const now = Date.now();
  if (u.lockUntil > now) return { err: 'locked', mins: Math.ceil((u.lockUntil - now) / 60000) };
  const res = checkCred_(u, pw);
  if (res === 'bad') {
    const f = u.fails + 1;
    if (f >= MAX_FAILS) { setU_(u, U.fails, 0); setU_(u, U.lock, new Date(now + LOCK_MIN * 60000)); return { err: 'locked', mins: LOCK_MIN }; }
    setU_(u, U.fails, f);
    return { err: 'badpw', left: MAX_FAILS - f };
  }
  if (u.fails || u.lockUntil) { setU_(u, U.fails, 0); setU_(u, U.lock, ''); }
  return { u, res };
}

/* ---------------- รับคำขอจากเว็บ ---------------- */
function doGet() { return out_({ ok: true, apps: Object.keys(APPS).map(k => APPS[k].name) }); }

function doPost(e) {
  let d;
  try { d = JSON.parse(e.postData.contents); } catch (err) { return out_({ ok: false, err: 'bad' }); }
  if (d.token !== TOKEN) return out_({ ok: false, err: 'token' });
  if (d.action === 'verify') return out_(verify_(String(d.ref || '').trim()));   // ไม่ต้องเข้าสู่ระบบ
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    switch (d.action) {
      case 'register': return out_(register_(String(d.sid || '').trim(), d));
      case 'login': return out_(login_(String(d.sid || '').trim(), d));
      case 'chpw': return out_(chpw_(d));
      case 'portal': case 'enroll': case 'app': case 'score': {
        const a = auth_(d.tk); if (a.err) return out_({ ok: false, err: a.err });
        if (d.action === 'portal') return out_(portal_(a.u));
        if (d.action === 'enroll') return out_(enroll_(a.u, d));
        if (d.action === 'app') return out_(app_(a.u, d));
        return out_(score_(a.u, d));
      }
    }
    return out_({ ok: false, err: 'bad' });
  } finally { lock.releaseLock(); }
}

function register_(sid, d) {
  const p = d.profile || {};
  if (!sid || !String(p.name || '').trim()) return { ok: false, err: 'bad' };
  if (!pwOk_(d.pw)) return { ok: false, err: 'weakpw' };
  if (findUser_(sid)) return { ok: false, err: 'exists' };
  const sh = sheet_(USER_SHEET, UHEAD);
  sh.appendRow([new Date(), sid, String(p.name).trim(), p.type === 'gp' ? 'gp' : 'st', p.sec || '', p.org || '', p.role || '', makeCred_(d.pw),
    'ยินยอม ' + Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm'), new Date(), 'ใช้งาน', '', 0, '', 1]);
  sh.getRange(sh.getLastRow(), 2).setNumberFormat('@').setValue(sid);
  return portal_(userAt_(sh, sh.getLastRow()));
}

/* เข้าสู่ระบบที่เว็บหลัก: คืนบัตรผ่าน + ภาพรวม หรือ mustchange ถ้าต้องตั้งรหัสผ่านใหม่ก่อน */
function login_(sid, d) {
  const r = login0_(sid, d.pw);
  if (r.err) return { ok: false, err: r.err, mins: r.mins, left: r.left };
  if (r.res === 'legacy' || r.u.must) return { ok: false, err: 'mustchange', legacy: r.res === 'legacy' };
  return portal_(r.u);
}

/* เปลี่ยนรหัสผ่าน (ใช้ทั้งกรณีบังคับเปลี่ยน และผู้เรียนเปลี่ยนเอง) */
function chpw_(d) {
  const r = login0_(String(d.sid || '').trim(), d.old);
  if (r.err) return { ok: false, err: r.err, mins: r.mins, left: r.left };
  if (!pwOk_(d.pw)) return { ok: false, err: 'weakpw' };
  if (d.pw === d.old) return { ok: false, err: 'samepw' };
  const u = r.u;
  u.ver += 1; u.must = false;
  setU_(u, U.cred, makeCred_(d.pw)); setU_(u, U.must, ''); setU_(u, U.ver, u.ver);
  return Object.assign(portal_(u), { changed: true });
}

/* แอปฝึกซ่อม: ตรวจว่าลงทะเบียนวิชานี้แล้ว คืนโปรไฟล์และประวัติคะแนนของแอปนั้น */
function app_(u, d) {
  const app = appOf_(d.app);
  if (enrolledApps_(u.sid).indexOf(app) < 0) return { ok: false, err: 'notenrolled' };
  const hist = [];
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (sh && sh.getLastRow() > 1) {
    const w = Math.max(14, sh.getLastColumn());
    sh.getRange(2, 2, sh.getLastRow() - 1, 1).createTextFinder(u.sid).matchEntireCell(true).findAll().forEach(c => {
      const v = sh.getRange(c.getRow(), 1, 1, Math.min(w, 14)).getValues()[0];
      if (appOf_(v[13]) !== app) return;
      hist.push({ t: new Date(v[0]).toISOString(), sid: u.sid, mod: v[4], item: v[5], score: v[6], max: v[7], detail: v[9], key: v[10] });
    });
  }
  setU_(u, U.last, new Date());
  return { ok: true, profile: profileOf_(u), hist };
}

function score_(u, d) {
  const app = appOf_(d.app);
  if (enrolledApps_(u.sid).indexOf(app) < 0) return { ok: false, err: 'notenrolled' };
  const sh = sheet_(SHEET_NAME, HEAD);
  const pct = d.max ? Math.round(d.score / d.max * 100) : '';
  const isGp = u.type === 'gp';
  sh.appendRow([new Date(), u.sid, u.name, u.sec || '', d.mod || '', d.item || '', d.score, d.max, pct, d.detail || '', d.key || '',
    isGp ? 'บุคลากร/บุคคลทั่วไป' : 'นักศึกษา', isGp ? [u.org, u.role].filter(String).join(' · ') : '', app]);
  sh.getRange(sh.getLastRow(), 2).setNumberFormat('@').setValue(u.sid);
  return { ok: true };
}

/* ---------------- การลงทะเบียนเรียน ---------------- */
/* อ่านแท็บ enrollments: แถวล่าสุดของแต่ละแอปเป็นตัวตัดสิน (ถ้าสถานะ "ยกเลิก" = ไม่ได้ลงทะเบียน) */
function enrollState_(sid) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ENROLL_SHEET), st = {};
  if (!sh || sh.getLastRow() < 2) return st;
  sh.getRange(2, 2, sh.getLastRow() - 1, 1).createTextFinder(sid).matchEntireCell(true).findAll().forEach(c => {
    const v = sh.getRange(c.getRow(), 1, 1, EHEAD.length).getValues()[0];
    if (isApp_(v[3])) st[String(v[3])] = String(v[5]).trim() !== CANCELLED;
  });
  return st;
}
function enrolledApps_(sid) { const st = enrollState_(sid); return Object.keys(APPS).filter(a => st[a]); }
function addEnroll_(sid, name, app, via) {
  const sh = sheet_(ENROLL_SHEET, EHEAD);
  sh.appendRow([new Date(), sid, name || '', app, via || 'เว็บหลัก', 'ลงทะเบียน']);
  sh.getRange(sh.getLastRow(), 2).setNumberFormat('@').setValue(sid);
}
function enroll_(u, d) {
  if (!isApp_(d.app)) return { ok: false, err: 'bad' };
  const list = enrolledApps_(u.sid);
  if (list.indexOf(d.app) < 0) { addEnroll_(u.sid, u.name, d.app, 'เว็บหลัก'); list.push(d.app); }
  return { ok: true, enrolled: list };
}

/* ---------------- เกณฑ์ผ่าน (ใช้ร่วมกันทั้งเว็บหลัก สรุปผล และเกียรติบัตร) ---------------- */
/* สอบท้ายโมดูล/ท้ายบท (key mq:<id>) นับว่าผ่านเมื่อได้อย่างน้อยร้อยละนี้ (4 จาก 5 ข้อ) */
const MQ_PASS_PCT = 80;
function newAcc_() { return { learn: {}, exam: {}, order: {}, read: {}, mq: {}, safety: 0, quiz: 0, clin: 0, csim: 0, accept: 0, pm: 0, any: false }; }
/* เพิ่มคะแนน 1 แถวเข้าตัวสะสม */
function addScore_(p, key, sc, mx) {
  key = String(key || ''); p.any = true;
  if (key.indexOf('learn:') === 0) p.learn[key] = 1;
  if (key.indexOf('exam:') === 0) p.exam[key] = Math.max(p.exam[key] || 0, sc);
  if (key.indexOf('order:') === 0) p.order[key] = 1;
  if (key.indexOf('read:') === 0) p.read[key] = 1;
  const pc = mx ? Math.round(sc / mx * 100) : 0;
  if (key.indexOf('mq:') === 0) p.mq[key] = Math.max(p.mq[key] || 0, pc);
  if (key === 'safety') p.safety = Math.max(p.safety, sc);
  if (key === 'quiz') p.quiz = Math.max(p.quiz, pc);
  if (key === 'clin:sim') p.clin = Math.max(p.clin, pc);
  if (key === 'csim') p.csim = Math.max(p.csim, pc);
  if (key === 'accept') p.accept = Math.max(p.accept, pc);
  if (key === 'pmplan') p.pm = Math.max(p.pm, pc);
}
/* ประเมินตามเกณฑ์ของแอป คืน rows (ข้อเกณฑ์ ค่า ผ่าน/ไม่ผ่าน) pass pct และ line (ข้อความบนเกียรติบัตร) */
function evalCrit_(app, p) {
  const A = APPS[app], C = A.crit, rows = [];
  const row = (t, v, ok, f) => rows.push({ t, v, ok: !!ok, f: Math.max(0, Math.min(1, f)) });
  let line;
  if (A.kind === 'o2') {
    const nq = Object.keys(p.mq).filter(k => p.mq[k] >= C.passPct).length, ev = Object.keys(p.exam).map(k => p.exam[k]);
    const avg = ev.length ? Math.round(ev.reduce((x, y) => x + y, 0) / ev.length) : 0;
    const parts = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7'].map(m => p.mq['mq:' + m] || 0).concat([avg]);
    const total = Math.round(parts.reduce((x, y) => x + y, 0) / parts.length);
    p.avg = avg; p.nExam = ev.length;
    row('ด่านความปลอดภัย ถูกครบ ' + C.safety + ' ข้อ', p.safety ? p.safety + '/' + C.safety : 'ยังไม่ได้ทำ', p.safety >= C.safety, p.safety / C.safety);
    row('ผ่านท้ายบท ครบ ' + C.modQuiz + ' โมดูล (โมดูลละ ≥ ' + C.passPct + '%)', nq + '/' + C.modQuiz, nq >= C.modQuiz, nq / C.modQuiz);
    row('โจทย์ซ่อม โหมดสอบ ' + C.examCases + ' เคส', ev.length + '/' + C.examCases + (ev.length ? ' · เฉลี่ย ' + avg : ''), ev.length >= C.examCases, ev.length / C.examCases);
    row('คะแนนรวม ≥ ' + C.totalPct + '%', total + '%', total >= C.totalPct, total / C.totalPct);
    line = 'ด่านความปลอดภัย ' + p.safety + '/' + C.safety + ' · ผ่านท้ายบท ' + nq + ' โมดูล · โจทย์ซ่อม ' + ev.length + ' เคส เฉลี่ย ' + avg + ' · คะแนนรวม ' + total + '%';
  } else if (A.kind === 'clinical') {
    const nr = Object.keys(p.read).length;
    row('อ่านบทเรียนครบ ' + C.readLessons + ' บท', nr + '/' + C.readLessons, nr >= C.readLessons, nr / C.readLessons);
    row('เครื่องจำลอง ≥ ' + C.simPct + '%', p.csim ? p.csim + '%' : 'ยังไม่ได้ทำ', p.csim >= C.simPct, p.csim / C.simPct);
    row('แบบทดสอบ ≥ ' + C.quizPct + '%', p.quiz ? p.quiz + '%' : 'ยังไม่ได้ทำ', p.quiz >= C.quizPct, p.quiz / C.quizPct);
    if (C.modTests) { const nm = Object.keys(p.mq).filter(k => p.mq[k] >= MQ_PASS_PCT).length; row('ผ่านสอบท้ายบทครบ ' + C.modTests + ' บท', nm + '/' + C.modTests, nm >= C.modTests, nm / C.modTests); }
    line = 'บทเรียน ' + nr + ' บท · เครื่องจำลอง ' + p.csim + '% · แบบทดสอบ ' + p.quiz + '%';
  } else {
    const ev = Object.keys(p.exam).map(k => p.exam[k]), nl = Object.keys(p.learn).length, no = Object.keys(p.order).length;
    const avg = ev.length ? Math.round(ev.reduce((x, y) => x + y, 0) / ev.length) : 0;
    p.avg = avg; p.nExam = ev.length;
    row('โหมดเรียนรู้ ' + C.learnCases + ' เคส', nl + '/' + C.learnCases, nl >= C.learnCases, nl / C.learnCases);
    row('โหมดสอบ ' + C.examCases + ' เคส เฉลี่ย ≥ ' + C.examAvg, ev.length + '/' + C.examCases + (ev.length ? ' · เฉลี่ย ' + avg : ''),
      ev.length >= C.examCases && avg >= C.examAvg, ev.length / C.examCases * (avg >= C.examAvg || !ev.length ? 1 : 0.8));
    row('แบบทดสอบ ≥ ' + C.quizPct + '%', p.quiz ? p.quiz + '%' : 'ยังไม่ได้ทำ', p.quiz >= C.quizPct, p.quiz / C.quizPct);
    row('ลำดับขั้นตอน ' + C.orderTasks + ' งาน', no + '/' + C.orderTasks, no >= C.orderTasks, no / C.orderTasks);
    if (C.clinSimPct) row(A.clinLabel + ' ≥ ' + C.clinSimPct + '%', p.clin ? p.clin + '%' : 'ยังไม่ได้ทำ', p.clin >= C.clinSimPct, p.clin / C.clinSimPct);
    if (C.acceptPct) row('ตรวจรับเครื่อง ≥ ' + C.acceptPct + '%', p.accept ? p.accept + '%' : 'ยังไม่ได้ทำ', p.accept >= C.acceptPct, p.accept / C.acceptPct);
    if (C.pmPct) row('PM ตามแผน ≥ ' + C.pmPct + '%', p.pm ? p.pm + '%' : 'ยังไม่ได้ทำ', p.pm >= C.pmPct, p.pm / C.pmPct);
    if (C.modTests) { const nm = Object.keys(p.mq).filter(k => p.mq[k] >= ((C.mqPass || {})[k] || MQ_PASS_PCT)).length; row('ผ่านสอบท้ายโมดูลครบ ' + C.modTests + ' โมดูล', nm + '/' + C.modTests, nm >= C.modTests, nm / C.modTests); }
    line = 'โหมดเรียนรู้ ' + nl + ' เคส · โหมดสอบเฉลี่ย ' + avg + ' คะแนน · แบบทดสอบ ' + p.quiz + '% · ลำดับขั้นตอน ' + no + ' งาน'
      + (C.clinSimPct ? ' · ' + A.clinLabel + ' ' + p.clin + '%' : '')
      + (C.acceptPct ? ' · ตรวจรับ ' + p.accept + '%' : '') + (C.pmPct ? ' · PM ' + p.pm + '%' : '');
  }
  const pass = rows.every(r => r.ok);
  const pct = pass ? 100 : Math.min(99, Math.round(rows.reduce((x, r) => x + r.f, 0) / rows.length * 100));
  return { rows, pass, pct, line };
}

/* ความคืบหน้าทุกแอปของผู้เรียนคนเดียว */
function progressOf_(sid) {
  const P = {};
  Object.keys(APPS).forEach(a => P[a] = newAcc_());
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (sh && sh.getLastRow() > 1) {
    const cols = Math.min(14, Math.max(13, sh.getLastColumn()));
    sh.getRange(2, 2, sh.getLastRow() - 1, 1).createTextFinder(sid).matchEntireCell(true).findAll().forEach(c => {
      const r = sh.getRange(c.getRow(), 1, 1, cols).getValues()[0];
      addScore_(P[appOf_(r[13])], r[10], Number(r[6]), Number(r[7]));
    });
  }
  const out = {};
  Object.keys(P).forEach(a => {
    const p = P[a], e = evalCrit_(a, p);
    /* ฟิลด์เดิม (learn exam avg …) คงไว้ให้หน้าเว็บรุ่นเก่า */
    out[a] = { rows: e.rows.map(r => ({ t: r.t, v: r.v, ok: r.ok })), pass: e.pass, pct: e.pct, started: p.any, crit: APPS[a].crit,
      learn: Object.keys(p.learn).length, exam: p.nExam || 0, avg: p.avg || 0, quiz: p.quiz, order: Object.keys(p.order).length, clin: p.clin };
  });
  return out;
}

/* เกียรติบัตรทางการที่อาจารย์ออกให้แล้ว */
function certsOf_(sid) {
  const ss = SpreadsheetApp.getActiveSpreadsheet(), out = [];
  Object.keys(APPS).forEach(a => {
    const sh = ss.getSheetByName(APPS[a].logSheet);
    if (!sh || sh.getLastRow() < 2) return;
    sh.getRange(2, 1, sh.getLastRow() - 1, 5).getValues().forEach(r => {
      if (String(r[0]).trim() === sid) out.push({ app: a, ref: String(r[2]), date: new Date(r[3]).toISOString(), url: String(r[4] || '') });
    });
  });
  return out;
}

/* ภาพรวมสำหรับเว็บหลัก: บัตรผ่าน โปรไฟล์ วิชาที่ลงทะเบียน ความคืบหน้า เกียรติบัตร */
function portal_(u) {
  setU_(u, U.last, new Date());
  const st = enrollState_(u.sid), progress = progressOf_(u.sid);
  /* ผู้เรียนรุ่นก่อนมีเว็บหลัก: มีคะแนนในแอปแต่ไม่เคยมีประวัติลงทะเบียน → ลงทะเบียนให้ (ถ้าเคยถูกยกเลิก จะไม่ลงทะเบียนให้ซ้ำ) */
  Object.keys(progress).forEach(a => { if (progress[a].started && !(a in st)) { addEnroll_(u.sid, u.name, a, 'เรียนในแอปก่อนมีเว็บหลัก'); st[a] = true; } });
  const enrolled = Object.keys(APPS).filter(a => st[a]);
  return { ok: true, tk: issueToken_(u), profile: profileOf_(u), enrolled, progress, certs: certsOf_(u.sid) };
}

/* ตรวจสอบเลขที่เกียรติบัตร (เปิดให้ทุกคน คืนค่าเฉพาะข้อมูลที่พิมพ์อยู่บนเกียรติบัตร) */
function verify_(ref) {
  if (!/^[A-Za-z]{2,5}-\d{4}-\d{1,5}$/.test(ref)) return { ok: false, err: 'format' };
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  for (const a of Object.keys(APPS)) {
    const sh = ss.getSheetByName(APPS[a].logSheet);
    if (!sh || sh.getLastRow() < 2) continue;
    const c = sh.getRange(2, 3, sh.getLastRow() - 1, 1).createTextFinder(ref).matchEntireCell(true).matchCase(false).findNext();
    if (c) {
      const r = sh.getRange(c.getRow(), 1, 1, 4).getValues()[0];
      return { ok: true, ref: String(r[2]), name: String(r[1]), title: APPS[a].cert.title, date: new Date(r[3]).toISOString() };
    }
  }
  return { ok: false, err: 'notfound' };
}

/* ---------------- ทดสอบจากหน้า Apps Script (กด Run ได้ จะสร้างผู้ใช้ test0000 แล้วลบทิ้ง) ---------------- */
function testPost() {
  const call = o => JSON.parse(doPost({ postData: { contents: JSON.stringify(Object.assign({ token: TOKEN }, o)) } }).getContent());
  const pw = 'Test#2569x';
  const reg = call({ action: 'register', sid: 'test0000', pw, profile: { type: 'st', name: 'ทดสอบ ระบบ', sec: '-' } });
  Logger.log('register: ' + reg.ok + ' ' + (reg.err || ''));
  const lg = call({ action: 'login', sid: 'test0000', pw });
  Logger.log('login: ' + lg.ok + ' ' + (lg.err || ''));
  Logger.log('enroll: ' + JSON.stringify(call({ action: 'enroll', tk: lg.tk, app: 'incubator' })));
  Logger.log('app: ' + call({ action: 'app', tk: lg.tk, app: 'incubator' }).ok);
  Logger.log('wrong password: ' + JSON.stringify(call({ action: 'login', sid: 'test0000', pw: 'Wrong#123' })));
  Logger.log('verify: ' + JSON.stringify(call({ action: 'verify', ref: 'IIT-2569-001' })));
  deleteUserData_('test0000', false);
  Logger.log('ลบผู้ใช้ทดสอบแล้ว');
}

/* ---------------- เมนูใน Google Sheets ---------------- */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('ผู้ใช้')
    .addItem('ดูข้อมูลผู้ใช้ที่เลือก', 'adminInfo')
    .addItem('รีเซ็ตรหัสผ่าน (ออกรหัสชั่วคราว)', 'adminResetPassword')
    .addItem('ระงับ / เปิดใช้บัญชี', 'adminToggleSuspend')
    .addItem('ยกเลิกการลงทะเบียนวิชา', 'adminUnenroll')
    .addSeparator()
    .addItem('วิธีใช้เมนูนี้', 'adminHelp')
    .addToUi();
  ui.createMenu('เกียรติบัตร')
    .addSubMenu(ui.createMenu('Infusion Pump')
      .addItem('1) สร้างแม่แบบเกียรติบัตร (ครั้งแรกครั้งเดียว)', 'makeTemplate')
      .addItem('2) สรุปผลผ่านเกณฑ์', 'evaluate')
      .addItem('3) ออกเกียรติบัตรให้ผู้ผ่านเกณฑ์', 'createCertificates'))
    .addSubMenu(ui.createMenu('ตู้อบทารก (Infant Incubator)')
      .addItem('1) สร้างแม่แบบเกียรติบัตร (ครั้งแรกครั้งเดียว)', 'makeTemplateIncubator')
      .addItem('2) สรุปผลผ่านเกณฑ์', 'evaluateIncubator')
      .addItem('3) ออกเกียรติบัตรให้ผู้ผ่านเกณฑ์', 'createCertificatesIncubator'))
    .addSubMenu(ui.createMenu('ตู้อบทารก วิชาคลินิก')
      .addItem('1) สร้างแม่แบบเกียรติบัตร (ครั้งแรกครั้งเดียว)', 'makeTemplateIncubatorClin')
      .addItem('2) สรุปผลผ่านเกณฑ์', 'evaluateIncubatorClin')
      .addItem('3) ออกเกียรติบัตรให้ผู้ผ่านเกณฑ์', 'createCertificatesIncubatorClin'))
    .addSubMenu(ui.createMenu('Infusion Pump วิชาคลินิก')
      .addItem('1) สร้างแม่แบบเกียรติบัตร (ครั้งแรกครั้งเดียว)', 'makeTemplatePumpClin')
      .addItem('2) สรุปผลผ่านเกณฑ์', 'evaluatePumpClin')
      .addItem('3) ออกเกียรติบัตรให้ผู้ผ่านเกณฑ์', 'createCertificatesPumpClin'))
    .addSubMenu(ui.createMenu('เครื่องผลิตออกซิเจน (Oxygen Concentrator)')
      .addItem('1) สร้างแม่แบบเกียรติบัตร (ครั้งแรกครั้งเดียว)', 'makeTemplateO2')
      .addItem('2) สรุปผลผ่านเกณฑ์', 'evaluateO2')
      .addItem('3) ออกเกียรติบัตรให้ผู้ผ่านเกณฑ์', 'createCertificatesO2'))
    .addSubMenu(ui.createMenu('เครื่องผลิตออกซิเจน วิชาคลินิก')
      .addItem('1) สร้างแม่แบบเกียรติบัตร (ครั้งแรกครั้งเดียว)', 'makeTemplateO2Clin')
      .addItem('2) สรุปผลผ่านเกณฑ์', 'evaluateO2Clin')
      .addItem('3) ออกเกียรติบัตรให้ผู้ผ่านเกณฑ์', 'createCertificatesO2Clin'))
    .addSubMenu(ui.createMenu('เครื่องดูด (Medical Suction)')
      .addItem('1) สร้างแม่แบบเกียรติบัตร (ครั้งแรกครั้งเดียว)', 'makeTemplateSuction')
      .addItem('2) สรุปผลผ่านเกณฑ์', 'evaluateSuction')
      .addItem('3) ออกเกียรติบัตรให้ผู้ผ่านเกณฑ์', 'createCertificatesSuction'))
    .addSubMenu(ui.createMenu('เครื่องดูด วิชาคลินิก')
      .addItem('1) สร้างแม่แบบเกียรติบัตร (ครั้งแรกครั้งเดียว)', 'makeTemplateSuctionClin')
      .addItem('2) สรุปผลผ่านเกณฑ์', 'evaluateSuctionClin')
      .addItem('3) ออกเกียรติบัตรให้ผู้ผ่านเกณฑ์', 'createCertificatesSuctionClin'))
    .addToUi();
}

/* ---------------- จัดการผู้ใช้ (เลือกแถวในแท็บ users ก่อน แล้วกดเมนู) ---------------- */
function selUser_() {
  const ui = SpreadsheetApp.getUi(), ss = SpreadsheetApp.getActiveSpreadsheet(), sh = ss.getActiveSheet();
  if (sh.getName() !== USER_SHEET) { ui.alert('ให้เปิดแท็บ "' + USER_SHEET + '" แล้วคลิกเลือกแถวของผู้ใช้ก่อน'); return null; }
  const row = sh.getActiveRange().getRow();
  if (row < 2 || row > sh.getLastRow()) { ui.alert('ให้คลิกเลือกแถวของผู้ใช้ (แถวที่ 2 ลงไป) ก่อน'); return null; }
  return userAt_(sheet_(USER_SHEET, UHEAD), row);
}
const who_ = u => u.name + ' (' + u.sid + ')';
function bumpVer_(u) { u.ver += 1; setU_(u, U.ver, u.ver); }

function adminHelp() {
  SpreadsheetApp.getUi().alert('วิธีใช้เมนู "ผู้ใช้"\n\n'
    + '1) เปิดแท็บ "users" แล้วคลิกแถวของผู้ใช้ที่ต้องการ\n2) เลือกคำสั่งจากเมนู "ผู้ใช้"\n\n'
    + '• แก้ชื่อ-สกุล กลุ่ม หน่วยงาน หรือตำแหน่ง: พิมพ์แก้ในเซลล์ได้เลย (เกียรติบัตรจะใช้ชื่อจากแท็บ users)\n'
    + '• ห้ามแก้คอลัมน์ "รหัสผู้ใช้" และ "รหัสผ่าน" ด้วยมือ\n'
    + '• ผู้เรียนลืมรหัสผ่าน: ใช้ "รีเซ็ตรหัสผ่าน" แล้วแจ้งรหัสชั่วคราวให้ผู้เรียน ผู้เรียนจะต้องตั้งรหัสใหม่ตอนเข้าสู่ระบบ\n'
    + '• บัญชีถูกล็อกเพราะใส่รหัสผิด 5 ครั้ง: รอ 15 นาที หรือใช้ "รีเซ็ตรหัสผ่าน" เพื่อปลดล็อกทันที\n'
    + '• ไม่ต้องการให้ใช้งานแล้ว: ใช้ "ระงับ / เปิดใช้บัญชี" (ระบบไม่มีคำสั่งลบผู้ใช้)');
}

function adminInfo() {
  const u = selUser_(); if (!u) return;
  const st = enrollState_(u.sid), prog = progressOf_(u.sid), certs = certsOf_(u.sid);
  const lines = Object.keys(APPS).map(a => '• ' + APPS[a].name + ': ' + (st[a] ? 'ลงทะเบียนแล้ว' : (a in st ? 'ยกเลิกแล้ว' : 'ไม่ได้ลงทะเบียน'))
    + (prog[a].started ? ' · ความคืบหน้า ' + prog[a].pct + '%' + (prog[a].pass ? ' (ผ่านเกณฑ์)' : '') : ''));
  const locked = u.lockUntil > Date.now();
  SpreadsheetApp.getUi().alert(who_(u) + '\n\n'
    + 'สถานะ: ' + (u.suspended ? 'ระงับ' : 'ใช้งาน') + (locked ? ' · ล็อกชั่วคราวถึง ' + Utilities.formatDate(new Date(u.lockUntil), 'Asia/Bangkok', 'HH:mm') : '')
    + (u.must ? ' · รอผู้เรียนตั้งรหัสผ่านใหม่' : '') + (u.cred && u.cred.indexOf('v2$') !== 0 ? ' · ยังใช้ PIN แบบเดิม' : '') + '\n\n'
    + 'วิชา\n' + lines.join('\n') + '\n\n'
    + 'เกียรติบัตรทางการ: ' + (certs.length ? certs.map(c => c.ref).join(', ') : 'ยังไม่มี'));
}

/* รหัสชั่วคราว 10 ตัว ตรงตามนโยบาย (ตัดตัวที่อ่านสับสน เช่น O 0 l 1) */
function tempPw_() {
  const sets = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnpqrstuvwxyz', '23456789', '#@%+=!?'];
  const all = sets.join(''), rnd = [];
  while (rnd.length < 12) Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid()).forEach(b => rnd.push((b + 256) % 256));
  const pick = (s, i) => s.charAt(rnd[i] % s.length);
  const chars = sets.map((s, i) => pick(s, i));
  for (let i = 4; i < 10; i++) chars.push(pick(all, i));
  for (let i = chars.length - 1; i > 0; i--) { const j = rnd[i + 12] % (i + 1); const t = chars[i]; chars[i] = chars[j]; chars[j] = t; }
  return chars.join('');
}

function adminResetPassword() {
  const u = selUser_(); if (!u) return;
  const ui = SpreadsheetApp.getUi();
  if (ui.alert('รีเซ็ตรหัสผ่านของ ' + who_(u) + ' ?\n\nระบบจะออกรหัสชั่วคราว ผู้เรียนต้องใช้รหัสนี้เข้าสู่ระบบแล้วตั้งรหัสใหม่ และทุกเครื่องที่ล็อกอินอยู่จะถูกออกจากระบบ', ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
  const pw = tempPw_();
  setU_(u, U.cred, makeCred_(pw)); setU_(u, U.must, 'ใช่'); setU_(u, U.fails, 0); setU_(u, U.lock, ''); bumpVer_(u);
  ui.alert('รหัสผ่านชั่วคราวของ ' + who_(u) + '\n\n' + pw + '\n\nแจ้งรหัสนี้ให้ผู้เรียนทางช่องทางส่วนตัว (รหัสนี้จะไม่แสดงอีก)');
}

function adminToggleSuspend() {
  const u = selUser_(); if (!u) return;
  const ui = SpreadsheetApp.getUi();
  if (u.suspended) {
    if (ui.alert('เปิดใช้บัญชี ' + who_(u) + ' อีกครั้ง?', ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
    setU_(u, U.status, 'ใช้งาน'); ui.alert('เปิดใช้บัญชีแล้ว');
  } else {
    if (ui.alert('ระงับบัญชี ' + who_(u) + ' ?\n\nผู้เรียนจะเข้าสู่ระบบและส่งคะแนนไม่ได้ ข้อมูลและคะแนนยังอยู่ครบ', ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
    setU_(u, U.status, SUSPENDED); bumpVer_(u); ui.alert('ระงับบัญชีแล้ว');
  }
}

function adminUnenroll() {
  const u = selUser_(); if (!u) return;
  const ui = SpreadsheetApp.getUi(), list = enrolledApps_(u.sid);
  if (!list.length) { ui.alert(who_(u) + ' ยังไม่ได้ลงทะเบียนวิชาใด'); return; }
  const r = ui.prompt('ยกเลิกการลงทะเบียนของ ' + who_(u),
    list.map((a, i) => (i + 1) + ') ' + APPS[a].name).join('\n') + '\n\nพิมพ์หมายเลขวิชาที่ต้องการยกเลิก (คะแนนเดิมยังเก็บไว้ ถ้าผู้เรียนลงทะเบียนใหม่จะเรียนต่อได้)', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  const app = list[parseInt(r.getResponseText(), 10) - 1];
  if (!app) { ui.alert('หมายเลขไม่ถูกต้อง'); return; }
  const sh = sheet_(ENROLL_SHEET, EHEAD);
  sh.appendRow([new Date(), u.sid, u.name, app, 'ผู้ดูแลระบบ', CANCELLED]);
  sh.getRange(sh.getLastRow(), 2).setNumberFormat('@').setValue(u.sid);
  ui.alert('ยกเลิกการลงทะเบียน ' + APPS[app].name + ' ของ ' + who_(u) + ' แล้ว');
}

/* ลบแถวทุกแถวที่คอลัมน์ col ตรงกับ sid (ลบจากล่างขึ้นบน) ใช้เฉพาะลบผู้ใช้ทดสอบ test0000 ใน testPost */
function deleteRowsOf_(sh, col, sid) {
  if (!sh || sh.getLastRow() < 2) return 0;
  const rows = sh.getRange(2, col, sh.getLastRow() - 1, 1).createTextFinder(sid).matchEntireCell(true).findAll().map(c => c.getRow()).sort((a, b) => b - a);
  rows.forEach(r => sh.deleteRow(r));
  return rows.length;
}
function deleteUserData_(sid, withCerts) {
  if (sid !== 'test0000') throw new Error('ลบได้เฉพาะผู้ใช้ทดสอบ');
  const ss = SpreadsheetApp.getActiveSpreadsheet(), n = {};
  n.scores = deleteRowsOf_(ss.getSheetByName(SHEET_NAME), 2, sid);
  n.enroll = deleteRowsOf_(ss.getSheetByName(ENROLL_SHEET), 2, sid);
  n.certs = 0;
  if (withCerts) Object.keys(APPS).forEach(a => n.certs += deleteRowsOf_(ss.getSheetByName(APPS[a].logSheet), 1, sid));
  n.user = deleteRowsOf_(ss.getSheetByName(USER_SHEET), 2, sid);
  return n;
}
/* ชื่อฟังก์ชันเดิมของ pump คงไว้ เพื่อให้ปุ่มหรือทริกเกอร์ที่ผูกไว้ยังใช้ได้ */
function makeTemplate() { makeTemplate_('pump'); }
function evaluate() { evaluate_('pump'); }
function createCertificates() { createCertificates_('pump'); }
function makeTemplateIncubator() { makeTemplate_('incubator'); }
function evaluateIncubator() { evaluate_('incubator'); }
function createCertificatesIncubator() { createCertificates_('incubator'); }
function makeTemplateIncubatorClin() { makeTemplate_('incubator-clin'); }
function evaluateIncubatorClin() { evaluate_('incubator-clin'); }
function createCertificatesIncubatorClin() { createCertificates_('incubator-clin'); }
function makeTemplatePumpClin() { makeTemplate_('pump-clin'); }
function evaluatePumpClin() { evaluate_('pump-clin'); }
function createCertificatesPumpClin() { createCertificates_('pump-clin'); }
function makeTemplateO2() { makeTemplate_('o2'); }
function evaluateO2() { evaluate_('o2'); }
function createCertificatesO2() { createCertificates_('o2'); }
function makeTemplateO2Clin() { makeTemplate_('o2-clin'); }
function evaluateO2Clin() { evaluate_('o2-clin'); }
function createCertificatesO2Clin() { createCertificates_('o2-clin'); }
function makeTemplateSuction() { makeTemplate_('suction'); }
function evaluateSuction() { evaluate_('suction'); }
function createCertificatesSuction() { createCertificates_('suction'); }
function makeTemplateSuctionClin() { makeTemplate_('suction-clin'); }
function evaluateSuctionClin() { evaluate_('suction-clin'); }
function createCertificatesSuctionClin() { createCertificates_('suction-clin'); }

/* สร้างแม่แบบใน Google Slides (อาจารย์เปิดไปเพิ่มโลโก้และลายเซ็นได้) */
function makeTemplate_(app) {
  const A = APPS[app], CERT = A.cert;
  const p = SlidesApp.create(A.tmplName);
  const s = p.getSlides()[0];
  s.getPageElements().forEach(e => e.remove());
  const W = p.getPageWidth(), H = p.getPageHeight();
  const box = (txt, y, h, size, bold, color) => {
    const t = s.insertTextBox(txt, 40, y, W - 80, h);
    const st = t.getText().getTextStyle();
    st.setFontSize(size).setBold(!!bold).setFontFamily('Sarabun').setForegroundColor(color || '#1d2430');
    t.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    return t;
  };
  const r1 = s.insertShape(SlidesApp.ShapeType.RECTANGLE, 14, 14, W - 28, H - 28);
  r1.getFill().setTransparent(); r1.getBorder().setWeight(5).getLineFill().setSolidFill('#0f7a6c');
  const r2 = s.insertShape(SlidesApp.ShapeType.RECTANGLE, 24, 24, W - 48, H - 48);
  r2.getFill().setTransparent(); r2.getBorder().setWeight(1.5).getLineFill().setSolidFill('#b8892b');
  // ไม่แสดงรหัสนักศึกษาและคะแนนรายโมดูลบนเกียรติบัตร (แม่แบบเดิมที่มี {{idline}} {{scores}} ยังใช้ได้ ระบบแทนเป็นค่าว่าง)
  box([CERT.org1, CERT.org2].filter(String).join('\n'), 34, 44, 13, false, '#5d6675');
  box('เกียรติบัตร', 78, 46, 34, true, '#0f7a6c');
  box('ขอมอบเกียรติบัตรฉบับนี้ไว้เพื่อแสดงว่า', 134, 22, 13, false, '#5d6675');
  box('{{name}}', 160, 38, 26, true);
  box('ได้ผ่าน' + CERT.title + '\n' + CERT.subject + ' ตามเกณฑ์ที่กำหนดครบทุกข้อ', 210, 44, 14);
  box('ให้ไว้ ณ วันที่ {{date}}', 264, 22, 13);
  box('………………………………………\n(' + CERT.signer + ')\n' + CERT.signerPos, 300, 56, 12);
  box('เลขที่ {{ref}}', H - 34, 14, 8, false, '#5d6675');
  PropertiesService.getScriptProperties().setProperty(A.tmplKey, p.getId());
  SpreadsheetApp.getUi().alert('สร้างแม่แบบแล้ว\n\nเปิดไฟล์ "' + A.tmplName + '" ใน Google Drive เพื่อเพิ่มโลโก้ ลายเซ็น หรือปรับตำแหน่งได้\nห้ามลบข้อความในวงเล็บปีกกา {{ }}');
}

/* อ่านคะแนนของแอปที่เลือก แล้วสรุปรายคน */
function summarize_(app) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SHEET_NAME);
  if (!sh || sh.getLastRow() < 2) return [];
  const users = {};
  const ush = ss.getSheetByName(USER_SHEET);
  if (ush && ush.getLastRow() > 1) ush.getRange(2, 1, ush.getLastRow() - 1, 7).getValues().forEach(r => {
    users[String(r[1]).trim()] = { name: r[2], type: r[3] === 'gp' ? 'บุคลากร/บุคคลทั่วไป' : 'นักศึกษา', sec: r[4], org: [r[5], r[6]].filter(String).join(' · ') };
  });
  const cols = Math.min(14, Math.max(13, sh.getLastColumn()));
  const P = {};
  sh.getRange(2, 1, sh.getLastRow() - 1, cols).getValues().forEach(r => {
    if (appOf_(r[13]) !== app) return;
    const sid = String(r[1]).trim(); if (!sid || sid === 'test0000') return;
    const p = P[sid] = P[sid] || Object.assign(newAcc_(), { sid, name: r[2], sec: r[3], type: r[11], org: r[12] });
    addScore_(p, r[10], Number(r[6]), Number(r[7]));
  });
  return Object.keys(P).map(k => {
    const p = P[k], u = users[k];
    if (u) { p.name = u.name || p.name; p.type = u.type; p.sec = u.sec; p.org = u.org; }
    p.ev = evalCrit_(app, p); p.pass = p.ev.pass;
    return p;
  }).sort((a, b) => a.sid.localeCompare(b.sid));
}

function evaluate_(app) {
  const A = APPS[app], list = summarize_(app);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(A.sumSheet) || ss.insertSheet(A.sumSheet);
  sh.clear();
  const head = evalCrit_(app, newAcc_()).rows.map(r => r.t);
  sh.appendRow(['รหัสผู้ใช้', 'ชื่อ-สกุล', 'ประเภท', 'กลุ่ม / หน่วยงาน'].concat(head).concat(['ผลเกณฑ์']));
  list.forEach(p => sh.appendRow([p.sid, p.name, p.type || 'นักศึกษา', p.org || p.sec].concat(p.ev.rows.map(r => r.v)).concat([p.pass ? 'ผ่าน' : 'ยังไม่ผ่าน'])));
  sh.setFrozenRows(1);
  SpreadsheetApp.getUi().alert(A.name + '\nสรุปแล้ว ' + list.length + ' คน ผ่านเกณฑ์ ' + list.filter(p => p.pass).length + ' คน (ดูแท็บ "' + A.sumSheet + '")');
}

function thaiDate_(d) {
  const M = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  return d.getDate() + ' ' + M[d.getMonth()] + ' พ.ศ. ' + (d.getFullYear() + 543);
}

/* ออกเกียรติบัตร PDF ให้ผู้ผ่านเกณฑ์ของแอปที่เลือก ที่ยังไม่เคยได้รับ */
function createCertificates_(app) {
  const A = APPS[app];
  const ui = SpreadsheetApp.getUi();
  const tid = PropertiesService.getScriptProperties().getProperty(A.tmplKey);
  if (!tid) { ui.alert('ยังไม่มีแม่แบบของ ' + A.name + ' ให้เลือกเมนู 1) สร้างแม่แบบเกียรติบัตร ก่อน'); return; }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const log = ss.getSheetByName(A.logSheet) || ss.insertSheet(A.logSheet);
  if (log.getLastRow() === 0) { log.appendRow(['รหัสผู้ใช้', 'ชื่อ-สกุล', 'เลขที่', 'วันที่ออก', 'ไฟล์ PDF']); log.setFrozenRows(1); }
  const issued = {};
  if (log.getLastRow() > 1) log.getRange(2, 1, log.getLastRow() - 1, 1).getValues().forEach(r => issued[String(r[0])] = 1);
  const it = DriveApp.getFoldersByName(A.folder);
  const folder = it.hasNext() ? it.next() : DriveApp.createFolder(A.folder);
  const now = new Date();
  const todo = summarize_(app).filter(p => p.pass && !issued[p.sid]);
  if (!todo.length) { ui.alert('ไม่มีผู้ผ่านเกณฑ์รายใหม่ที่ต้องออกเกียรติบัตร (' + A.name + ')'); return; }
  let n = log.getLastRow();
  todo.forEach(p => {
    const ref = A.ref + '-' + (now.getFullYear() + 543) + '-' + String(n).padStart(3, '0');
    const copy = DriveApp.getFileById(tid).makeCopy('tmp ' + p.sid, folder);
    const pres = SlidesApp.openById(copy.getId());
    pres.replaceAllText('{{name}}', p.name);
    pres.replaceAllText('{{idline}}', '');   // แม่แบบเดิม: เว้นว่าง ไม่แสดงรหัสนักศึกษา/หน่วยงาน
    pres.replaceAllText('{{sid}}', '');
    pres.replaceAllText('{{date}}', thaiDate_(now));
    pres.replaceAllText('{{ref}}', ref);
    pres.replaceAllText('{{scores}}', '');   // แม่แบบเดิม: เว้นว่าง ไม่แสดงคะแนนรายโมดูล
    pres.saveAndClose();
    const pdf = folder.createFile(copy.getAs('application/pdf')).setName('เกียรติบัตร-' + p.sid + '-' + p.name + '.pdf');
    copy.setTrashed(true);
    log.appendRow([p.sid, p.name, ref, now, pdf.getUrl()]);
    n++;
  });
  ui.alert('ออกเกียรติบัตรแล้ว ' + todo.length + ' ฉบับ\nไฟล์อยู่ในโฟลเดอร์ "' + A.folder + '" ใน Google Drive และมีลิงก์ในแท็บ "' + A.logSheet + '"');
}
