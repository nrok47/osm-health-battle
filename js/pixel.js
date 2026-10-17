/* ═══════════════════════════════════════════════════════════════════
   pixel.js — วาด pixel art เองจากตารางตัวอักษร ไม่ใช้ไฟล์ภาพเลย
   ทำแบบนี้เพราะไม่มีชุด sprite CC0 ที่มี "คนไทยสูงวัย + ชุด อสม."
   (บทเรียนจาก tambon-health-game: Kenney Tiny Town ไม่มีคนและไม่มี
    สัญลักษณ์สาธารณสุข ต้องวาดกาชาดเองอยู่ดี)

   แต่ละ template = ตาราง 16×20 ตัวอักษร · 1 ตัวอักษร = 1 พิกเซล
   o=เส้นขอบ k=ผม s=ผิว c=เสื้อ d=เงาเสื้อ p=กางเกง b=รองเท้า
   e=ตา m=ปาก a=สีของเครื่องประดับ .=โปร่งใส
   ═══════════════════════════════════════════════════════════════════ */

var PIXEL = (function () {
  'use strict';

  var W = 16, H = 20;

  /* ชาวบ้าน — มองเห็นหน้า (ฝั่งตรงข้าม) */
  var TPL_ADULT = [
    '................',
    '.....oooooo.....',
    '....okkkkkko....',
    '...okkkkkkkko...',
    '...okssssssko...',
    '...oksessesko...',
    '...okssssssko...',
    '...okssmmssko...',
    '....osssssso....',
    '......osso......',
    '..oodccccccdoo..',
    '.osdccccccccdso.',
    '.osdccccccccdso.',
    '.osdccccccccdso.',
    '..oodccccccdoo..',
    '...oppppppppo...',
    '...opppoopppo...',
    '...opppoopppo...',
    '...obbboobbbo...',
    '................'
  ];

  /* อสม. — มองจากข้างหลัง แบบ Pokémon (ไม่เห็นหน้า) */
  var TPL_BACK = [
    '................',
    '.....oooooo.....',
    '....okkkkkko....',
    '...okkkkkkkko...',
    '...okkkkkkkko...',
    '...okkkkkkkko...',
    '...okkkkkkkko...',
    '....okkkkkko....',
    '....osssssso....',
    '......osso......',
    '..oodccccccdoo..',
    '.osdcccaacccdso.',
    '.osdccaaaaccdso.',
    '.osdcccaacccdso.',
    '..oodccccccdoo..',
    '...oppppppppo...',
    '...opppoopppo...',
    '...opppoopppo...',
    '...obbboobbbo...',
    '................'
  ];

  var TPLS = { adult: TPL_ADULT, back: TPL_BACK };

  /* เครื่องประดับ วาดทับด้านบน — a = สีเครื่องประดับ */
  var ACC = {
    none: null,
    bun: [                       /* มวยผมป้า */
      '......oaao......',
      '.....oaaaao.....'
    ],
    hat: [                       /* งอบ/หมวกฟางลุง */
      '......oaao......',
      '.....oaaaao.....',
      '..ooaaaaaaaaoo..'
    ]
  };

  var ACC_COLOR = { bun: null, hat: '#c9a227' };   /* null = ใช้สีผม */

  function draw(canvas, spec, scale, flip) {
    var tpl = TPLS[spec.tpl || 'adult'];
    var p = spec.pal;
    var map = {
      o: '#20181c', k: p.k, s: p.s, c: p.c, d: p.d,
      p: p.p, b: p.b, e: '#20181c', m: '#8a4a4a',
      a: '#ffffff'            /* กาชาดบนหลังเสื้อ อสม. */
    };
    scale = scale || 5;
    canvas.width = W * scale;
    canvas.height = H * scale;
    var g = canvas.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, canvas.width, canvas.height);

    function px(x, y, col) {
      if (!col) return;
      g.fillStyle = col;
      var dx = flip ? (W - 1 - x) : x;
      g.fillRect(dx * scale, y * scale, scale, scale);
    }

    var y, x, row, ch;
    for (y = 0; y < tpl.length; y++) {
      row = tpl[y];
      for (x = 0; x < row.length; x++) {
        ch = row.charAt(x);
        if (ch !== '.') px(x, y, map[ch]);
      }
    }

    var acc = ACC[spec.acc || 'none'];
    if (acc) {
      /* spec.flat = โหมดเงาดำในเล่มทะเบียน — เครื่องประดับต้องดำตามด้วย
         ไม่งั้นหมวกสีเหลืองของลุงมะระจะเฉลยตัวตนตั้งแต่ยังไม่เคยเจอ */
      var acol = spec.flat ? p.k : (ACC_COLOR[spec.acc] || p.k);
      for (y = 0; y < acc.length; y++) {
        row = acc[y];
        for (x = 0; x < row.length; x++) {
          ch = row.charAt(x);
          if (ch === 'a') px(x, y, acol);
          else if (ch === 'o') px(x, y, '#20181c');
        }
      }
    }
  }

  /* อสม. ของผู้เล่น — เสื้อฟ้าราชการ + กาชาดขาวที่หลัง */
  var HERO = {
    tpl: 'back', acc: 'none',
    pal: { k: '#231a14', s: '#e8bd94', c: '#2f7fd1', d: '#1f5c9c', p: '#2c2f3a', b: '#1b1b1b' }
  };

  return { draw: draw, HERO: HERO, W: W, H: H };
})();
