/* ═══════════════════════════════════════════════════════════════════
   ui.js — หน้าจอเท่านั้น ไม่มีสูตรคำนวณปนในนี้
   หัวใจคือ "คิวบท" (queue of beats) แบบ Pokémon:
   engine คืนลิสต์ของเหตุการณ์ → ui เล่นทีละอัน รอผู้เล่นกดก่อนไปอันต่อไป
   ซึ่งเป็นตัวแก้ปัญหา "กดแล้วไม่มีอะไรเด้งกลับ" ของเกมตัวก่อน
   ═══════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  function el(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

  var G = null;
  var Q = [];               /* คิวบทที่ยังไม่เล่น */
  var typing = null;        /* สถานะพิมพ์ตัวอักษรทีละตัว */
  var waiting = false;      /* รอผู้เล่นกดเพื่อไปบทต่อไป */
  var menuMode = 'root';
  var SAVE = 'osm-battle-book-v1';

  /* ───────── จอ ───────── */
  function show(id) {
    ['scrTitle', 'scrMap', 'scrBattle', 'scrCase', 'scrEnd'].forEach(function (s) {
      el(s).classList.toggle('on', s === id);
    });
  }

  /* ───────── เล่มทะเบียน (จำข้ามรอบเล่น) ───────── */
  function loadBook() {
    try { return JSON.parse(localStorage.getItem(SAVE)) || {}; } catch (e) { return {}; }
  }
  function saveBook() {
    try { localStorage.setItem(SAVE, JSON.stringify(G.book)); } catch (e) {}
  }

  /* ───────── วาด sprite ───────── */
  function spriteOf(spec, cv, scale, flip) { PIXEL.draw(cv, spec, scale, flip); }

  /* ═══ แผนที่ยิม ═══ */
  function drawMap() {
    el('mapHP').textContent = G.heroHP;
    el('mapBadges').textContent = GYMS.map(function (gy) {
      return G.badges.indexOf(gy.id) >= 0 ? gy.badge : '◻';
    }).join('');

    var box = el('maplist');
    box.innerHTML = '';
    GYMS.forEach(function (gy, gi) {
      /* ยิมถัดไปเปิดเมื่อยิมก่อนหน้าได้เหรียญ — ไล่ความยากขึ้นเป็นขั้น */
      var locked = gi > 0 && G.badges.indexOf(GYMS[gi - 1].id) < 0;
      var d = document.createElement('div');
      d.className = 'gym' + (locked ? ' locked' : '');
      var head = '<h3><span class="b">' + gy.badge + '</span>' + esc(gy.name) +
        (G.badges.indexOf(gy.id) >= 0 ? ' ✅' : '') + '</h3>' +
        '<p class="where">' + esc(gy.place) + '</p>' +
        '<p class="intro">' + esc(locked ? 'ต้องได้เหรียญ ' + GYMS[gi - 1].name + ' ก่อน' : gy.intro) + '</p>';
      var rows = document.createElement('div');
      rows.className = 'foerow';
      gy.foes.forEach(function (f, fi) {
        var rec = G.book[f.name];
        var b = document.createElement('button');
        b.className = 'foebtn' + (rec && rec.won ? ' done' : '');
        b.disabled = locked;
        b.innerHTML = '<canvas></canvas><span><span class="fn">' + esc(f.name) + '</span>' +
          '<span class="fr">' + esc(f.role) + '</span></span>' +
          (rec && rec.won ? '<span class="chk">✓</span>' : '');
        spriteOf(f, b.querySelector('canvas'), 3);
        b.onclick = function () { if (!locked) enterBattle(gi, fi); };
        rows.appendChild(b);
      });
      d.innerHTML = head;
      d.appendChild(rows);
      box.appendChild(d);
    });
    show('scrMap');
  }

  /* ═══ เข้าฉากต่อสู้ ═══ */
  function enterBattle(gi, fi) {
    var b = ENGINE.startBattle(G, gi, fi);
    spriteOf(b.foe, el('foeCv'), 7);
    spriteOf(PIXEL.HERO, el('heroCv'), 7);
    el('foeName').textContent = b.foe.name;
    var rec = G.book[b.foe.name];
    /* เจอแล้วครั้งหนึ่งจึงรู้ว่าเขาเชื่อเพราะอะไร = เหตุผลให้สู้ซ้ำ */
    el('foeMind').textContent = rec && rec.mind ? '· ' + b.foe.mind : '· ยังอ่านไม่ออก';
    show('scrBattle');
    refreshBars(true);
    Q = [
      { say: GYMS[gi].place + ' — ' + b.foe.name + ' ' + (b.foe.boss ? 'บอสยิม ' : '') + 'ปรากฏตัว!', who: 'sys' },
      { say: '👁 สังเกต: ' + b.foe.hint, who: 'sys', tag: 'good' },
      { nextQ: true }
    ];
    waiting = false;
    advance();
  }

  function refreshBars(instant) {
    var b = G.b;
    var fp = Math.max(0, b.hp / b.maxhp * 100);
    var hp = Math.max(0, G.heroHP / BAL.heroHP * 100);
    var fb = el('foeBar'), hb = el('heroBar');
    if (instant) { fb.style.transition = 'none'; hb.style.transition = 'none'; }
    fb.style.width = fp + '%';
    hb.style.width = hp + '%';
    fb.className = fp > 50 ? '' : fp > 22 ? 'mid' : 'low';
    hb.className = hp > 50 ? '' : hp > 22 ? 'mid' : 'low';
    if (instant) setTimeout(function () { fb.style.transition = ''; hb.style.transition = ''; }, 30);
    el('foeNum').textContent = b.hp + '/' + b.maxhp;
    el('heroNum').textContent = G.heroHP + '/' + BAL.heroHP;
    el('stanceNow').textContent = 'วิชา: ' + G.stance;

    var st = '';
    if (b.panic > 0) st += '<b>ตื่นตระหนก ' + b.panic + '</b>';
    if (b.open > 0) st += '<b class="open">เปิดใจ ' + b.open + '</b>';
    if (b.shield > 0) st += '<b class="open">มีแผ่นพับ</b>';
    if (b.atkBoost > 0) st += '<b class="open">หมอหนุน ×2</b>';
    el('foeStatus').innerHTML = st;
  }

  /* ───────── เลขลอย + สั่น ───────── */
  function pop(target, text, cls) {
    var r = el('field').getBoundingClientRect();
    var t = el(target).getBoundingClientRect();
    var s = document.createElement('div');
    s.className = 'pop' + (cls ? ' ' + cls : '');
    s.textContent = text;
    s.style.left = (t.left - r.left + t.width / 2 - 18) + 'px';
    s.style.top = (t.top - r.top + t.height * 0.25) + 'px';
    el('fxlayer').appendChild(s);
    setTimeout(function () { s.remove(); }, 1000);
  }
  function jolt(spriteId, flashField) {
    var sp = el(spriteId);
    sp.classList.remove('hurt'); void sp.offsetWidth; sp.classList.add('hurt');
    var f = el('field');
    f.classList.remove('shake', 'flash'); void f.offsetWidth;
    f.classList.add('shake');
    if (flashField) f.classList.add('flash');
    setTimeout(function () { f.classList.remove('shake', 'flash'); }, 420);
  }

  /* ───────── พิมพ์ข้อความทีละตัว ───────── */
  function typeOut(html, plain) {
    var box = el('dlgText'), dlg = el('dialog');
    dlg.classList.remove('waiting');
    box.innerHTML = '';
    var i = 0, chars = plain;
    if (typing) clearInterval(typing.h);
    typing = {
      html: html,
      h: setInterval(function () {
        i += 2;
        box.textContent = chars.slice(0, i);
        if (i >= chars.length) finishTyping();
      }, 14)
    };
  }
  function finishTyping() {
    if (!typing) return;
    clearInterval(typing.h);
    el('dlgText').innerHTML = typing.html;
    typing = null;
    el('dialog').classList.add('waiting');
    waiting = true;
  }

  /* ───────── เดินคิวบท ───────── */
  function advance() {
    if (typing) { finishTyping(); return; }
    if (!Q.length) return;
    waiting = false;
    var s = Q.shift();

    if (s.say !== undefined) {
      var who = s.who === 'foe' ? G.b.foe.name + ': ' : s.who === 'hero' ? 'คุณ: ' : '';
      var cls = s.tag ? ' class="tagline t-' + s.tag + '"' : '';
      var html = (who ? '<span class="who">' + esc(who) + '</span>' : '') +
        '<span' + cls + '>' + esc(s.say) + '</span>';
      typeOut(html, who + s.say);
      return;
    }
    if (s.fact !== undefined) {
      var fhtml = '<div class="factbox"><b>เกร็ดที่ใช้ได้จริง</b>' + esc(s.fact) + '</div>';
      el('dlgText').innerHTML = fhtml;
      el('dialog').classList.add('waiting');
      waiting = true;
      return;
    }
    if (s.fx === 'hitFoe') {
      pop('foeSp', '-' + s.dmg);
      jolt('foeSp', true);
      refreshBars();
      setTimeout(advance, 480);
      return;
    }
    if (s.fx === 'hitHero') {
      pop('heroSp', '-' + s.dmg);
      jolt('heroSp', false);
      refreshBars();
      setTimeout(advance, 480);
      return;
    }
    if (s.fx === 'healHero') {
      pop('heroSp', '+' + s.dmg, 'heal');
      el('heroSp').classList.remove('heal'); void el('heroSp').offsetWidth;
      el('heroSp').classList.add('heal');
      refreshBars();
      setTimeout(advance, 420);
      return;
    }
    if (s.nextQ) { askQuestion(); return; }
    if (s.end) { endBattle(s.end); return; }
    advance();
  }

  function askQuestion() {
    var q = ENGINE.currentQ(G);
    typeOut('<span class="who">' + esc(G.b.foe.name) + ': </span>' + esc(q.ask),
      G.b.foe.name + ': ' + q.ask);
    /* เมนูโผล่ทันทีที่พิมพ์จบ ไม่ต้องกดอีกครั้ง (กดข้ามได้ด้วย) */
    var iv = setInterval(function () {
      if (!typing) { clearInterval(iv); drawMenu('root'); }
    }, 60);
  }

  /* ───────── เมนูคำสั่ง ───────── */
  function drawMenu(mode) {
    menuMode = mode;
    var m = el('menu');
    m.className = 'menu';
    m.innerHTML = '';
    waiting = false;
    el('dialog').classList.remove('waiting');

    function btn(label, sub, fn, opts) {
      var b = document.createElement('button');
      b.className = 'mbtn' + (opts && opts.cls ? ' ' + opts.cls : '');
      b.innerHTML = (sub ? '<span class="k">' + esc(sub) + '</span>' : '') + label;
      if (opts && opts.dis) b.disabled = true;
      b.onclick = fn;
      m.appendChild(b);
      return b;
    }
    function head(t) {
      var h = document.createElement('div');
      h.className = 'hd'; h.textContent = t; m.appendChild(h);
    }

    if (mode === 'root') {
      btn('⚔️ ไฟท์', '1 · เลือกคำตอบที่จะพูด', function () { drawMenu('fight'); });
      btn('🎒 ไอเทม', '2 · ตัวช่วย', function () { drawMenu('item'); });
      btn('📚 เปลี่ยนวิชา', '3 · ตอนนี้: ' + G.stance, function () { drawMenu('stance'); });
      btn('🏃 ถอยตั้งหลัก', '4 · จบเคสนี้ไว้ก่อน', function () { retreat(); }, { cls: 'back' });

    } else if (mode === 'fight') {
      m.classList.add('one');
      head('เลือกสิ่งที่จะพูด — ชนิดของท่าจะเฉลยหลังพูดเท่านั้น');
      var q = ENGINE.currentQ(G);
      q.a.forEach(function (c, i) {
        btn(esc(c.s), String.fromCharCode(97 + i) + '.', function () { pick(i); });
      });
      btn('↩ กลับ', '', function () { drawMenu('root'); }, { cls: 'back' });

    } else if (mode === 'item') {
      m.classList.add('one');
      ITEMS.forEach(function (it) {
        var have = 0;
        G.items.forEach(function (x) { if (x.id === it.id) have = x.n; });
        btn(it.icon + ' ' + esc(it.name) + ' ×' + have,
          esc(it.desc),
          function () { useItem(it.id); }, { dis: have <= 0 });
      });
      btn('↩ กลับ', '', function () { drawMenu('root'); }, { cls: 'back' });

    } else if (mode === 'stance') {
      m.classList.add('one');
      var rec = G.book[G.b.foe.name];
      head(rec && rec.mind
        ? 'เคยเจอแล้ว — ' + G.b.foe.name + ' ' + MIND[G.b.foe.mind].label
        : 'ยังไม่เคยคุยกับคนนี้ ต้องเดาจากสิ่งที่สังเกตได้');
      STANCE.forEach(function (s) {
        var mul = rec && rec.mind ? MIND[G.b.foe.mind].mul[s.id] : null;
        var hintTxt = mul === null ? esc(s.desc)
          : esc(s.desc) + '  →  ' + (mul >= 1.4 ? 'เข้าทางเขา ×' + mul
            : mul <= 0.75 ? 'ไม่เข้าทาง ×' + mul : 'กลาง ๆ ×' + mul);
        btn(s.icon + ' ' + s.id, hintTxt, function () {
          G.stance = s.id; refreshBars(); drawMenu('root');
        }, { cls: G.stance === s.id ? 'on' : '' });
      });
      btn('↩ กลับ', '', function () { drawMenu('root'); }, { cls: 'back' });
    }
  }

  function hideMenu() { el('menu').classList.add('hide'); }
  function showMenuAgain() { el('menu').classList.remove('hide'); }

  function pick(i) {
    hideMenu();
    Q = ENGINE.play(G, i);
    advance();
  }
  function useItem(id) {
    hideMenu();
    Q = ENGINE.useItem(G, id).concat([{ nextQ: true }]);
    refreshBars();
    advance();
  }

  /* ───────── ปิดเคส ───────── */
  function retreat() {
    hideMenu();
    var r = ENGINE.closeBattle(G, 'retreat');
    saveBook();
    caseCard('retreat', r);
  }
  function endBattle(how) {
    var r = ENGINE.closeBattle(G, how);
    saveBook();
    caseCard(how, r);
  }

  function caseCard(how, r) {
    var f = G.b.foe;
    var title, cls, lesson;
    if (how === 'win') {
      title = f.name + ' ยอมเข้าระบบติดตามแล้ว';
      cls = 'win';
      lesson = f.name + ' ' + MIND[f.mind].label + ' — วิชาที่ได้ผลกับคนแบบนี้คือ ' +
        Object.keys(MIND[f.mind].mul).filter(function (k) { return MIND[f.mind].mul[k] >= 1.4; })[0] +
        ' · บันทึกไว้ในเล่มทะเบียนแล้ว';
    } else if (how === 'lose') {
      title = 'พลังใจหมด — คุยไม่จบในวันนี้';
      cls = 'lose';
      lesson = 'สิ่งที่กินพลังใจเราคือการตอบผิดหลักวิชาและการตอบไม่ตรงจุดแล้วถูกสวนกลับ · ' +
        f.name + ' ' + MIND[f.mind].label + ' ลองเปลี่ยนวิชาก่อนไฟท์รอบหน้า';
    } else {
      title = 'ถอยตั้งหลัก — ' + f.name + ' ยังไม่เข้าระบบ';
      cls = 'lose';
      lesson = 'ถอยไม่ใช่เรื่องผิด บางเคสต้องกลับไปตั้งหลักก่อน แต่คะแนนปลายปีนับที่จำนวนคนเข้าระบบ';
    }

    var done = 0, total = 0;
    GYMS.forEach(function (gy) {
      gy.foes.forEach(function (x) { total++; if (G.book[x.name] && G.book[x.name].won) done++; });
    });

    var h = '<h2>' + esc(title) + '</h2>' +
      '<p class="res ' + cls + '">' + esc(f.name) + ' · ' + esc(f.role) + '</p>' +
      '<div class="lesson">' + esc(lesson) + '</div>' +
      '<table>' +
      '<tr><td>พลังใจที่เหลือ</td><td>' + G.heroHP + '/' + BAL.heroHP + '</td></tr>' +
      '<tr><td>ตอบผิดหลักวิชาในเคสนี้</td><td>' + G.b.mistakes + ' ครั้ง</td></tr>' +
      '<tr><td>ชาวบ้านที่เข้าระบบแล้วทั้งหมด</td><td>' + done + '/' + total + '</td></tr>' +
      '</table>';

    if (r.badgeEarned) h += '<div class="lesson">🏅 ได้เหรียญ ' + esc(r.gym.name) + ' ' + r.gym.badge + ' — ยิมถัดไปเปิดแล้ว</div>';

    h += '<div class="btns">';
    if (how !== 'win') h += '<button class="big" id="cRetry">ลองเคสนี้อีกครั้ง</button>';
    h += '<button class="ghost" id="cMap">กลับแผนที่</button>';
    if (done === total) h += '<button class="big" id="cEnd">สรุปผลงานทั้งปี</button>';
    h += '</div>';

    el('caseCard').innerHTML = h;
    show('scrCase');
    showMenuAgain();
    if (el('cRetry')) el('cRetry').onclick = function () {
      if (G.heroHP <= 0) G.heroHP = BAL.reviveHP;
      enterBattle(G.gymIdx, G.foeIdx);
    };
    el('cMap').onclick = drawMap;
    if (el('cEnd')) el('cEnd').onclick = finalCard;
  }

  function finalCard() {
    var s = ENGINE.score(G);
    var h = '<h2>สรุปผลงานทั้งปี</h2>' +
      '<div class="gradebig">' + s.grade + '</div>' +
      '<p class="res">' + esc(s.title) + ' · ' + s.score + '/100 คะแนน</p>' +
      '<table>' + s.parts.map(function (p) {
        return '<tr><td>' + esc(p.k) + '</td><td>' + esc(p.v) + ' → ' +
          p.p.toFixed(1) + '/' + p.max + '</td></tr>';
      }).join('') + '</table>' +
      '<div class="lesson">เกมนี้ให้คะแนนจำนวนคนที่เข้าระบบติดตามมากที่สุด แต่หักคะแนนทุกครั้งที่เราให้ข้อมูลผิด ' +
      'เพราะสิ่งที่ชาวบ้านจำไปเล่าต่อ ย้อนกลับมาเป็นงานของเราเองในปีถัดไป</div>' +
      '<div class="btns"><button class="big" id="eAgain">เล่นใหม่</button>' +
      '<button class="ghost" id="eBook">📖 เล่มทะเบียน</button></div>';
    el('endCard').innerHTML = h;
    show('scrEnd');
    el('eAgain').onclick = function () { show('scrTitle'); };
    el('eBook').onclick = openBook;
  }

  /* ───────── เล่มทะเบียน ───────── */
  function openBook() {
    var book = G ? G.book : loadBook();
    var h = '';
    GYMS.forEach(function (gy) {
      h += '<p class="gymhd">' + gy.badge + ' ' + esc(gy.name) + '</p>';
      gy.foes.forEach(function (f) {
        var rec = book[f.name];
        var cv = '<canvas></canvas>';
        if (!rec) {
          h += '<div class="ent unk" data-blank="1">' + cv +
            '<div><div class="n">???</div><div class="m">ยังไม่เคยลงไปคุย</div></div></div>';
        } else {
          var best = Object.keys(MIND[f.mind].mul).filter(function (k) { return MIND[f.mind].mul[k] >= 1.4; })[0];
          h += '<div class="ent" data-foe="' + esc(f.name) + '">' + cv +
            '<div><div class="n">' + esc(f.name) + ' ' + (rec.won ? '✓' : '') + '</div>' +
            '<div class="m">' + esc(MIND[f.mind].label) + '</div>' +
            '<div class="w">วิชาที่ได้ผล: <b>' + esc(best) + '</b> · คุยมาแล้ว ' + rec.tries + ' ครั้ง' +
            (rec.won ? ' · เข้าระบบแล้ว' : ' · ยังไม่สำเร็จ') + '</div></div></div>';
        }
      });
    });
    el('bookBody').innerHTML = h;
    /* วาด sprite ลงทุกช่อง — ช่องที่ยังไม่เจอวาดเป็นเงาดำ แบบช่องว่างใน Pokédex */
    var ents = el('bookBody').querySelectorAll('.ent');
    var k = 0;
    GYMS.forEach(function (gy) {
      gy.foes.forEach(function (f) {
        var e = ents[k++]; if (!e) return;
        var spec = f;
        if (e.classList.contains('unk')) {
          spec = { tpl: f.tpl, acc: f.acc, flat: true,
            pal: { k: '#2a2f38', s: '#2a2f38', c: '#2a2f38', d: '#2a2f38', p: '#2a2f38', b: '#2a2f38' } };
        }
        spriteOf(spec, e.querySelector('canvas'), 3);
      });
    });
    el('bookOv').classList.add('on');
  }

  /* ───────── ผูกปุ่ม ───────── */
  el('btnStart').onclick = function () {
    var seed = parseInt(el('seedIn').value, 10) || 2570;
    G = ENGINE.newGame(seed);
    G.book = loadBook();          /* ความรู้เรื่องคนไม่หายไปตอนเล่นใหม่ */
    /* แต่สถิติของรอบนี้เริ่มใหม่ และ "won" ของรอบก่อนไม่นับเป็นผลงานรอบนี้ */
    Object.keys(G.book).forEach(function (n) { G.book[n].won = false; });
    drawMap();
  };
  el('btnBookT').onclick = openBook;
  el('btnBookM').onclick = openBook;
  el('btnBookClose').onclick = function () { el('bookOv').classList.remove('on'); };
  el('btnRest').onclick = function () { ENGINE.rest(G); drawMap(); };

  el('dialog').addEventListener('click', function () { if (waiting || typing) advance(); });

  document.addEventListener('keydown', function (e) {
    if (el('bookOv').classList.contains('on')) {
      if (e.key === 'Escape') el('bookOv').classList.remove('on');
      return;
    }
    if (!el('scrBattle').classList.contains('on')) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (waiting || typing) advance();
      return;
    }
    if (e.key === 'Escape' && menuMode !== 'root') { drawMenu('root'); return; }
    var mb = el('menu').querySelectorAll('.mbtn');
    var n = parseInt(e.key, 10);
    if (n >= 1 && n <= mb.length && !el('menu').classList.contains('hide')) {
      if (!mb[n - 1].disabled) mb[n - 1].click();
    }
    if (menuMode === 'fight') {
      var idx = 'abcd'.indexOf(e.key.toLowerCase());
      if (idx >= 0 && mb[idx]) mb[idx].click();
    }
  });
})();
