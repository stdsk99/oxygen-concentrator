/* ===== ภาพตัดเปิดเครื่อง (ใช้ในหัวข้อ 1.4) =====
   ภาพวาดประกอบจากเครื่องจำลองในบทเรียน ไม่ได้อิงรุ่นจริงของผู้ผลิตใด
   Cutaway.svg() คืน SVG string ที่มี
   - path.seg[data-s] ชื่อช่วงท่อเดียวกับ Diagram (in cab inl comp hx toA toB top topB pe exh exo ck tk rg fl out)
   - g.part[data-id] ชื่อชิ้นส่วนเดียวกับ PARTS
   - .zeo circle[data-bed][data-lv] เม็ด zeolite (lv 0 = ล่างสุด ถึง 1 = บนสุด)
   Cutaway.fit(svgEl) ปรับความกว้างป้ายชื่อตามตัวอักษรจริงหลังใส่ลงหน้าเว็บ */
(function(){
  const SEG = {
    in:"M128 560 H160", cab:"M194 560 H236", inl:"M300 560 H330", comp:"M442 540 H489 V520", hx:"M516 470 H540 V434",
    toA:"M512 419 H330 V384", toB:"M512 419 H420 V384",
    top:"M330 150 V130 H470", topB:"M420 150 V130 H470", pe:"M375 142 V130",
    exh:"M568 419 H600 V560 H612", exo:"M698 560 H764",
    ck:"M500 130 H520 V168", tk:"M520 362 V380 H640 V350", rg:"M640 310 V292", fl:"M640 200 V170", out:"M640 122 V100 H836"
  };
  const CLS = {in:"air",cab:"air",inl:"air",comp:"air",hx:"air",toA:"air",toB:"air",exh:"n2",exo:"n2"};
  /* ป้าย: [x, y, ชี้ไปที่ x, y, ไทย, อังกฤษ, ชิดขวา] */
  const LBL = [
    [16,110,172,130,"บอร์ดควบคุม","Control PCB"],[16,232,178,236,"พัดลมระบาย","Cooling fan"],[16,300,190,305,"มิเตอร์ชั่วโมง","Hour meter"],
    [16,350,196,345,"สวิตช์ / breaker","Power switch"],[16,404,176,410,"หม้อแปลง","Transformer"],
    [16,470,160,540,"ไส้กรองตู้","Cabinet filter"],[16,600,236,572,"Inlet HEPA","ไส้กรองขาเข้า"],
    [210,632,360,600,"คอมเพรสเซอร์","Compressor (oil-less)"],[16,520,346,470,"Capacitor","ตัวเก็บประจุมอเตอร์"],
    [372,40,375,98,"P.E. valve","วาล์วปรับสมดุลแรงดัน"],[236,40,320,150,"Sieve bed A","ถังกรอง zeolite"],[452,72,430,150,"Sieve bed B",""],[600,40,485,122,"Check valves",""],
    [836,90,836,100,"ไปผู้ป่วย","Oxygen outlet",1],[836,150,656,146,"Outlet HEPA","ไส้กรองขาออก",1],[836,190,556,250,"ถังเก็บ O₂","Product tank",1],
    [836,240,656,240,"Flowmeter","ปุ่มปรับอัตราไหล",1],[836,330,660,325,"Regulator","ปรับแรงดัน 5 psi",1],
    [836,420,578,419,"4-way valve","+ pilot solenoid",1],[836,480,516,480,"Heat exchanger","ระบายความร้อนลมอัด",1],[836,560,770,560,"ไนโตรเจนออก","Exhaust (muffler)",1]
  ];
  const part = (id, body, hit) => `<g class="part" data-id="${id}"><rect class="hit" x="${hit[0]}" y="${hit[1]}" width="${hit[2]}" height="${hit[3]}" rx="8"/>${body}</g>`;
  const lines = (x1,x2,ys,cls) => ys.map(y=>`<line x1="${x1}" x2="${x2}" y1="${y}" y2="${y}"/>`).join("");

  function beds(){
    let s="";
    [[308,0],[398,1]].forEach(([x,b])=>{ for(let r=0;r<14;r++) for(let c=0;c<4;c++)
      s+=`<circle class="bead" data-bed="${b}" data-lv="${((13-r)/13).toFixed(3)}" cx="${x+7+c*10+(r%2?5:0)}" cy="${186+r*12.6}" r="4.6"/>`; });
    return s;
  }
  function svg(){
    return `<svg class="dia cw" viewBox="0 0 980 690" role="img" aria-label="ภาพตัดเปิดภายในเครื่องผลิตออกซิเจนจำลอง แสดงตำแหน่งชิ้นส่วนและเส้นทางอากาศ ออกซิเจน และไนโตรเจน">
<defs>
 <linearGradient id="cwMetal" x1="0" x2="1"><stop offset="0" stop-color="#b9c6d0"/><stop offset=".45" stop-color="#f4f7f9"/><stop offset="1" stop-color="#9fb0bd"/></linearGradient>
 <linearGradient id="cwDark" x1="0" x2="1"><stop offset="0" stop-color="#5b6b78"/><stop offset=".45" stop-color="#9aabb8"/><stop offset="1" stop-color="#4f5e6a"/></linearGradient>
 <linearGradient id="cwTank" x1="0" x2="1"><stop offset="0" stop-color="#8fc0ea"/><stop offset=".45" stop-color="#e3f1fc"/><stop offset="1" stop-color="#78acd9"/></linearGradient>
 <linearGradient id="cwBed" x1="0" x2="1"><stop offset="0" stop-color="#aab8c3"/><stop offset=".5" stop-color="#eef3f6"/><stop offset="1" stop-color="#94a5b2"/></linearGradient>
 <linearGradient id="cwPcb" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#2f8f5b"/><stop offset="1" stop-color="#1e6b42"/></linearGradient>
 <linearGradient id="cwWall" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fbfdfe"/><stop offset="1" stop-color="#e2eaf0"/></linearGradient>
 <marker id="cwO" viewBox="0 0 10 10" refX="7" refY="5" markerUnits="userSpaceOnUse" markerWidth="16" markerHeight="16" orient="auto"><path d="M0 0L10 5L0 10z" fill="#2b82e6"/></marker>
 <marker id="cwN" viewBox="0 0 10 10" refX="7" refY="5" markerUnits="userSpaceOnUse" markerWidth="16" markerHeight="16" orient="auto"><path d="M0 0L10 5L0 10z" fill="#ec6a1e"/></marker>
 <marker id="cwA" viewBox="0 0 10 10" refX="7" refY="5" markerUnits="userSpaceOnUse" markerWidth="16" markerHeight="16" orient="auto"><path d="M0 0L10 5L0 10z" fill="#9aa4b2"/></marker>
</defs>
<rect x="0" y="0" width="980" height="690" rx="16" class="cw-bg"/>
<path d="M150 70 L230 22 L790 22 L710 70 Z" class="cw-top"/><path d="M710 70 L790 22 L790 590 L710 638 Z" class="cw-side"/>
<path d="M150 70 H710 V638 H150 Z" fill="url(#cwWall)" stroke="#5f6f7d" stroke-width="1.4"/>
<path d="M114 92 H674 V660 H114 Z" fill="none" stroke="#5f6f7d" stroke-width="1.4" stroke-dasharray="7 6" opacity=".5"/>
<text class="cw-l2" x="118" y="682">ฝาหน้า (ถอดออก)</text>
<path d="M728 380 L774 352 V472 L728 500 Z" fill="#9fb0bd" stroke="#5f6f7d"/>
<g stroke="#5f6f7d" stroke-width="1.6">${[392,408,424,440,456,472,488].map(y=>`<line x1="734" y1="${y}" x2="768" y2="${y-20}"/>`).join("")}</g>
<g fill="#3a4652"><ellipse cx="200" cy="646" rx="18" ry="10"/><ellipse cx="660" cy="646" rx="18" ry="10"/></g>
<path d="M380 22 V6 H560 V22" fill="none" stroke="#5f6f7d" stroke-width="8" stroke-linecap="round"/>

<g class="cw-tubes">${Object.entries(SEG).map(([k,d])=>`<path class="tbo" d="${d}"/>`).join("")}
${Object.entries(SEG).map(([k,d])=>`<path class="seg tb ${CLS[k]||"o2"}" data-s="${k}" d="${d}"${k==="out"?' marker-end="url(#cwO)"':k==="exo"?' marker-end="url(#cwN)"':k==="in"?' marker-end="url(#cwA)"':""}/>`).join("")}</g>

${part("pcb",`<path d="M172 96 L190 86 H352 L334 96 Z" fill="#17583a"/><rect x="172" y="96" width="162" height="86" rx="4" fill="url(#cwPcb)" stroke="#124a30"/>
 <rect x="190" y="112" width="34" height="26" rx="2" fill="#1d2430"/><rect x="236" y="112" width="22" height="22" rx="2" fill="#1d2430"/><rect x="270" y="116" width="48" height="10" rx="2" fill="#d7c27a"/>
 <circle cx="196" cy="160" r="5" fill="#3ccf6e"/><circle cx="214" cy="160" r="5" fill="#f2c94c"/><circle cx="232" cy="160" r="5" fill="#eb5757"/>
 <g stroke="#d7c27a" stroke-width="1.2" opacity=".7"><path d="M224 125 H236 M258 123 H270 M250 160 H316 M300 140 V160"/></g>`,[168,82,190,104])}
${part("fan",`<g transform="translate(222 236)"><rect x="-44" y="-44" width="88" height="88" rx="10" fill="#4f5e6a" stroke="#2f3a44"/><circle r="38" fill="#6c7c89"/>
 <g class="cw-blades" fill="#a9b7c2"><path d="M0 0 C10 -20 26 -26 32 -16 C20 -8 10 -2 0 0Z"/><path d="M0 0 C20 10 26 26 16 32 C8 20 2 10 0 0Z"/><path d="M0 0 C-10 20 -26 26 -32 16 C-20 8 -10 2 0 0Z"/><path d="M0 0 C-20 -10 -26 -26 -16 -32 C-8 -20 -2 -10 0 0Z"/></g><circle r="8" fill="#2f3a44"/></g>`,[174,188,96,96])}
${part("hour",`<rect x="190" y="292" width="58" height="26" rx="4" fill="#1d2430"/><text x="219" y="310" text-anchor="middle" font-size="12" fill="#7ee0a6" font-family="monospace" data-cw-hm>01234.5</text>`,[186,288,66,34])}
${part("switch",`<rect x="196" y="330" width="44" height="30" rx="5" fill="#3a4652"/><rect x="204" y="336" width="14" height="18" rx="2" fill="#eb5757"/>`,[192,326,52,38])}
${part("xfmr",`<rect x="176" y="392" width="56" height="40" rx="4" fill="#6c5a3c" stroke="#3d3220"/><rect x="186" y="384" width="36" height="56" rx="3" fill="#a07a3f" opacity=".85"/>`,[172,380,64,64])}
${part("cabfilter",`<rect x="160" y="520" width="34" height="80" rx="4" fill="#d9e1e7" stroke="#5f6f7d"/><g stroke="#9fb0bd">${lines(164,190,[532,544,556,568,580])}</g>`,[156,516,42,88])}
${part("inlet",`<rect x="236" y="540" width="64" height="40" rx="18" fill="#f2f5f7" stroke="#5f6f7d"/><g stroke="#b9c6d0">${[250,262,274,286].map(x=>`<line x1="${x}" y1="544" x2="${x}" y2="576"/>`).join("")}</g>`,[232,536,72,48])}
${part("comp",`<path d="M330 500 L346 490 H458 L442 500 Z" fill="#7d8d99"/><path d="M442 500 L458 490 V590 L442 600 Z" fill="#4f5e6a"/>
 <rect x="330" y="500" width="112" height="100" rx="8" fill="url(#cwDark)" stroke="#3a4652"/>
 <rect x="342" y="468" width="38" height="36" rx="4" fill="url(#cwMetal)" stroke="#5f6f7d"/><rect x="392" y="468" width="38" height="36" rx="4" fill="url(#cwMetal)" stroke="#5f6f7d"/>
 <g stroke="#5f6f7d">${lines(342,380,[476,484])}${lines(392,430,[476,484])}</g>
 <g class="cw-rotor"><circle cx="386" cy="552" r="26" fill="#3a4652" stroke="#2a333b"/><path d="M386 530 V574 M364 552 H408" stroke="#6c7c89" stroke-width="3"/><circle cx="386" cy="552" r="8" fill="#9aabb8"/></g>`,[326,464,136,140])}
${part("cap",`<rect x="290" y="470" width="30" height="40" rx="8" fill="#2f5d8a" stroke="#1e3d5c"/><rect x="290" y="470" width="30" height="8" rx="4" fill="#9fb0bd"/>`,[286,466,38,48])}
${part("hx",`<rect x="462" y="440" width="54" height="80" rx="4" fill="#e7edf1" stroke="#5f6f7d"/><g stroke="#8a9aa6" stroke-width="1.6">${lines(466,512,[448,456,464,472,480,488,496,504,512])}</g>`,[458,436,62,88])}
${part("valve4",`<rect x="512" y="404" width="56" height="30" rx="5" fill="url(#cwMetal)" stroke="#5f6f7d"/><rect x="548" y="434" width="30" height="26" rx="4" fill="url(#cwDark)" stroke="#3a4652"/><circle cx="563" cy="447" r="5" fill="#f2c94c" data-cw-sol/>`,[508,400,74,64])}
${part("muffler",`<rect x="612" y="544" width="86" height="32" rx="15" fill="url(#cwMetal)" stroke="#5f6f7d"/><g stroke="#8a9aa6">${[630,648,666,684].map(x=>`<line x1="${x}" y1="546" x2="${x}" y2="574"/>`).join("")}</g>`,[608,540,94,40])}
${part("sieve",`<rect x="296" y="150" width="68" height="232" rx="30" fill="url(#cwBed)" stroke="#5f6f7d"/><ellipse cx="330" cy="152" rx="34" ry="9" fill="#dfe7ec" stroke="#5f6f7d"/>
 <rect x="386" y="150" width="68" height="232" rx="30" fill="url(#cwBed)" stroke="#5f6f7d"/><ellipse cx="420" cy="152" rx="34" ry="9" fill="#dfe7ec" stroke="#5f6f7d"/>
 <rect x="308" y="178" width="44" height="182" rx="6" fill="#f6f2e2" stroke="#8d8466"/><rect x="398" y="178" width="44" height="182" rx="6" fill="#f6f2e2" stroke="#8d8466"/>
 <g class="zeo">${beds()}</g>`,[292,140,166,246])}
${part("pe",`<rect x="356" y="116" width="38" height="26" rx="4" fill="url(#cwMetal)" stroke="#5f6f7d"/><rect x="364" y="98" width="22" height="18" rx="3" fill="url(#cwDark)" stroke="#3a4652" data-cw-pe/>`,[352,94,46,52])}
${part("check",`<rect x="470" y="122" width="30" height="18" rx="4" fill="url(#cwMetal)" stroke="#5f6f7d"/>`,[466,118,38,26])}
${part("tank",`<rect x="484" y="168" width="72" height="194" rx="32" fill="url(#cwTank)" stroke="#3f6f99"/><ellipse cx="520" cy="172" rx="36" ry="10" fill="#d5e8f8" stroke="#3f6f99"/>
 <rect x="490" y="240" width="60" height="26" rx="4" fill="#2b82e6"/><text x="520" y="258" text-anchor="middle" font-size="13" font-weight="700" fill="#fff">O₂</text>`,[480,160,80,206])}
${part("reg",`<rect x="620" y="310" width="40" height="44" rx="6" fill="url(#cwMetal)" stroke="#5f6f7d"/><circle cx="640" cy="326" r="9" fill="#fff" stroke="#5f6f7d"/><line x1="640" y1="326" x2="646" y2="320" stroke="#b42318" stroke-width="2"/>`,[616,306,48,52])}
${part("flow",`<rect x="624" y="200" width="32" height="92" rx="14" fill="#e9f4fd" stroke="#3f6f99"/><g stroke="#3f6f99" stroke-width="1">${lines(626,634,[216,234,252,270])}</g><circle cx="640" cy="232" r="7" fill="#2b82e6" data-cw-ball/><rect x="630" y="186" width="20" height="14" rx="3" fill="#3a4652"/>`,[620,182,40,114])}
${part("hepa",`<rect x="624" y="122" width="32" height="48" rx="8" fill="#e8eef2" stroke="#5f6f7d"/><g stroke="#9fb0bd">${lines(630,650,[132,142,152])}</g>`,[620,118,40,56])}
<g class="cw-fx"></g>
<g class="cw-lbls">${LBL.map(([x,y,px,py,th,en,r])=>`<g class="cw-lb" data-r="${r?1:0}" data-x="${x}"><line class="ld" x1="${x}" y1="${y}" x2="${px}" y2="${py}"/><rect class="tag" x="${x}" y="${y-15}" width="120" height="${en?34:22}" rx="6"/><text class="cw-l1" x="${x+8}" y="${y+1}">${th}</text>${en?`<text class="cw-l2" x="${x+8}" y="${y+15}">${en}</text>`:""}</g>`).join("")}</g>
</svg>`;
  }
  function fit(svgEl){
    svgEl.querySelectorAll(".cw-lb").forEach(g=>{
      const w=Math.max(...[...g.querySelectorAll("text")].map(t=>t.getComputedTextLength()))+16, x=+g.dataset.x;
      g.querySelector("rect").setAttribute("width",w);
      if(g.dataset.r!=="1") g.querySelector("line").setAttribute("x1",x+w);
    });
  }
  window.Cutaway = {svg, fit, SEG};
})();
