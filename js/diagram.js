/* ===== แผนผังเครื่องจำลอง (ใช้ในโมดูล 1 และ 6) =====
   Diagram.svg(opts) คืน SVG string: ชิ้นส่วน (g.part[data-id]) เส้นลม (path.seg[data-s]) เส้นไฟฟ้า (path.el) */
(function(){
  const P = window.PARTS, Z = window.ZONES;
  /* ตำแหน่งชิ้นส่วน x y w h และป้าย 2 บรรทัด */
  const BOX = {
    pcb:[20,30,170,78,"บอร์ดควบคุม","pressure + O₂ sensor"],
    xfmr:[16,124,66,40,"หม้อแปลง"], fan:[90,124,62,40,"พัดลม"], switch:[160,124,70,40,"สวิตช์","breaker"], hour:[238,124,66,40,"มิเตอร์","ชั่วโมง"],
    cabfilter:[14,372,84,48,"ไส้กรองตู้"], inlet:[114,372,90,48,"Inlet HEPA"], comp:[222,360,112,72,"คอมเพรสเซอร์"],
    cap:[240,306,76,36,"Capacitor"], hx:[358,372,104,48,"Heat","exchanger"],
    valve4:[364,236,104,56,"4-way valve","+ pilot solenoid"], muffler:[226,242,108,44,"Muffler","ไอเสีย"],
    pe:[512,86,96,38,"P.E. valve"], check:[650,86,100,38,"Check valves"], tank:[650,152,100,104,"ถังเก็บ","O₂"],
    reg:[650,276,100,40,"Regulator"], flow:[650,334,100,40,"Flowmeter"], hepa:[650,392,100,40,"Outlet HEPA"]
  };
  /* เส้นทางลม แบ่งเป็นช่วง ใช้ไฮไลต์ตามขั้นของเส้นทาง */
  const SEG = {
    in:"M0 396 H14", cab:"M98 396 H114", inl:"M204 396 H222", comp:"M334 396 H358", hx:"M410 372 V292",
    toA:"M468 252 H486 V334 H525 V318", toB:"M468 276 H480 V344 H595 V318",
    top:"M525 150 V140 H690 V124", topB:"M595 150 V140", pe:"M540 124 V140 M580 124 V140",
    exh:"M364 264 H334", exo:"M226 264 H196",
    ck:"M720 124 V152", tk:"M700 256 V276", rg:"M700 316 V334", fl:"M700 374 V392", out:"M750 412 H792"
  };
  const STEP_SEG = {cabfilter:["in","cab"], inlet:["inl"], comp:["comp"], hx:["hx"], valve4:["toA"], sieve:["toA"], pe:["pe","topB"],
    muffler:["toB","exh","exo"], check:["top"], tank:["ck"], reg:["tk"], flow:["rg"], hepa:["fl"], out:["out"]};

  function box(id){
    const b=BOX[id], z=Z[P[id].z];
    const [x,y,w,h,l1,l2]=b;
    return `<g class="part" data-id="${id}" data-z="${P[id].z}"><rect class="hit" x="${x-4}" y="${y-4}" width="${w+8}" height="${h+8}" rx="9"/>
      <rect class="pbox" x="${x}" y="${y}" width="${w}" height="${h}" rx="7" style="--zc:${z.c}"/>
      <text class="lbl" x="${x+w/2}" y="${y+h/2+(l2?-3:4)}" text-anchor="middle">${l1}</text>${l2?`<text class="lbl s" x="${x+w/2}" y="${y+h/2+12}" text-anchor="middle">${l2}</text>`:""}</g>`;
  }
  function svg(o){
    o=o||{};
    const z=Z.sep;
    return `<svg class="dia oc" viewBox="0 0 800 462" role="img" aria-label="แผนผังภายในเครื่องผลิตออกซิเจนจำลอง แสดงระบบอัดอากาศด้านล่าง ระบบแยกก๊าซตรงกลาง ระบบจ่ายออกซิเจนด้านขวา และระบบควบคุมด้านบนซ้าย">
      <defs><marker id="oa" viewBox="0 0 10 10" refX="8" refY="5" markerUnits="userSpaceOnUse" markerWidth="12" markerHeight="12" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker></defs>
      ${o.zones?Object.keys(Z).map(k=>zoneBg(k)).join(""):""}
      <g class="els">
        <path class="el" d="M190 74 H416 V236"/><path class="el" d="M190 50 H560 V86"/>
        <path class="el sense" d="M750 190 H784 V16 H105 V30"/>
        <text class="lbl s" x="430" y="208">สั่งขด</text><text class="lbl s" x="566" y="74">สั่ง P.E.</text><text class="lbl s" x="440" y="12">ท่อ pressure sensor และท่อตัวอย่าง O₂ ไปบอร์ด</text>
      </g>
      <g class="segs">${Object.entries(SEG).map(([k,d])=>`<path class="seg${k==="exo"||k==="out"||k==="in"?" arr":""}" data-s="${k}" d="${d}"${k==="exo"||k==="out"||k==="in"?' marker-end="url(#oa)"':""}/>`).join("")}</g>
      <g class="part" data-id="sieve" data-z="sep"><rect class="hit" x="496" y="144" width="132" height="182" rx="9"/>
        <rect class="pbox" x="500" y="150" width="50" height="168" rx="12" style="--zc:${z.c}"/><rect class="pbox" x="570" y="150" width="50" height="168" rx="12" style="--zc:${z.c}"/>
        <g class="zeo">${[0,1].map(i=>Array.from({length:18},(_,k)=>`<circle cx="${512+i*70+(k%3)*13}" cy="${170+Math.floor(k/3)*24}" r="3.4"/>`).join("")).join("")}</g>
        <text class="lbl" x="525" y="310" text-anchor="middle">ถัง A</text><text class="lbl" x="595" y="310" text-anchor="middle">ถัง B</text>
        <text class="lbl s" x="560" y="362" text-anchor="middle">Sieve beds (zeolite)</text></g>
      ${Object.keys(BOX).map(box).join("")}
      <text class="lbl s" x="2" y="364">อากาศห้อง</text><text class="lbl s" x="150" y="258" text-anchor="middle">N₂ ออก</text><text class="lbl s" x="148" y="270" text-anchor="middle">สู่ห้อง</text>
      <text class="lbl s" x="756" y="404">ผู้ป่วย</text>
    </svg>`;
  }
  function zoneBg(k){
    const D={ctl:["M8 8 H312 V190 H8 Z",16,184], air:["M6 300 H472 V456 H6 Z",14,452], sep:["M216 198 H486 V78 H636 V374 H478 V300 H216 Z",224,216], del:["M642 78 H762 V456 H642 Z",648,452]}[k], z=Z[k];
    return `<g class="zone" data-zone="${k}"><path d="${D[0]}" style="--zc:${z.c}"/>
      <text class="zlbl" x="${D[1]}" y="${D[2]}" style="fill:${z.c}">${z.n}</text></g>`;
  }
  window.Diagram = {svg, STEP_SEG};
})();
