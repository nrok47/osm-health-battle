/* ═══════════════════════════════════════════════════════════════════
   engine.js — กลไกการสู้ ไม่มีโค้ดหน้าจอปนในนี้เลย
   🚨 กฎเหล็ก: ห้ามใช้ Math.random() หรือ Date.now() ตัดสินอะไร
      ทุกการสุ่มผูกกับ seed → ใส่เลขเดิมได้ผลเดิม เทียบกลยุทธ์ได้
   ═══════════════════════════════════════════════════════════════════ */

var ENGINE = (function () {
  'use strict';

  /* salt แยกต่อระบบ — ถ้าใช้ rng ตัวเดียวทุกระบบ ค่าจะสหสัมพันธ์กัน
     (บั๊กที่เคยเจอใน sim ตัวก่อน) */
  var SALT = { dmg: 1009, counter: 2027, line: 3041 };

  function rngAt(seed, turn, salt) {
    var a = (seed * 374761393 + turn * 668265263 + salt * 2246822519) >>> 0;
    a = Math.imul(a ^ (a >>> 15), a | 1) >>> 0;
    a ^= a + Math.imul(a ^ (a >>> 7), a | 61);
    return ((a ^ (a >>> 14)) >>> 0) / 4294967296;
  }

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  /* ── สร้างเกมใหม่ ───────────────────────────────────────────── */
  function newGame(seed) {
    return {
      seed: seed || 2570,
      turn: 0,
      heroHP: BAL.heroHP,
      stance: 'ข้อมูล',
      items: ITEMS.map(function (i) { return { id: i.id, n: i.n }; }),
      badges: [],                 /* id ยิมที่ปิดครบ */
      book: {},                   /* เล่มทะเบียนชาวบ้าน: name -> {mind, won, tries} */
      gymIdx: 0, foeIdx: 0,
      stats: { enrolled: 0, failed: 0, mistakes: 0, retreats: 0, perfect: 0 }
    };
  }

  /* ── เริ่มเคสใหม่ ───────────────────────────────────────────── */
  function startBattle(G, gymIdx, foeIdx) {
    var foe = GYMS[gymIdx].foes[foeIdx];
    G.gymIdx = gymIdx; G.foeIdx = foeIdx;
    G.b = {
      foe: foe,
      hp: foe.hp, maxhp: foe.hp,
      qIdx: 0, turn: 0,
      panic: 0, open: 0,        /* จำนวนรอบที่สถานะยังอยู่ */
      atkBoost: 0, shield: 0,
      mistakes: 0, over: null
    };
    if (G.heroHP <= 0) G.heroHP = BAL.reviveHP;
    return G.b;
  }

  function currentQ(G) {
    var qs = G.b.foe.q;
    return qs[G.b.qIdx % qs.length];
  }

  /* ── ตีท่าหนึ่งที (คืน "บท" ให้ ui เล่นเป็นฉาก ๆ) ─────────── */
  function play(G, choiceIdx) {
    var b = G.b, q = currentQ(G), ch = q.a[choiceIdx];
    var out = [], t = ch.t;
    b.turn++; G.turn++;

    out.push({ say: ch.s, who: 'hero' });

    var line = HITLINE[t];
    var li = Math.floor(rngAt(G.seed, G.turn, SALT.line) * line.length);

    if (t === 'ตรงจุด' || t === 'ทั่วไป') {
      var base = BAL.dmg[t];
      var mul = MIND[b.foe.mind].mul[G.stance];
      if (b.open > 0) mul *= BAL.openMul;
      if (b.panic > 0) mul *= BAL.panicMul;
      if (b.atkBoost > 0) { mul *= BAL.callMul; b.atkBoost = 0; }
      var j = 1 + (rngAt(G.seed, G.turn, SALT.dmg) - 0.5) * 2 * BAL.jitter;
      var dmg = Math.max(1, Math.round(base * mul * j));

      out.push({ say: line[li], who: 'sys', tag: t });
      /* บอกตรง ๆ ว่าวิชาที่เลือกเข้าทางเขาหรือไม่ — ผู้เล่นต้องเรียนรู้ได้ */
      if (mul >= 1.4) out.push({ say: 'วิชา “' + G.stance + '” เข้าทาง ' + b.foe.name + ' พอดี — ได้ผลเต็มแรง', who: 'sys', tag: 'good' });
      else if (mul <= 0.75) out.push({ say: 'วิชา “' + G.stance + '” ไม่เข้าทาง ' + b.foe.name + ' — พูดถูกแต่เขาไม่รับ', who: 'sys', tag: 'weak' });

      out.push({ fx: 'hitFoe', dmg: dmg });
      b.hp = clamp(b.hp - dmg, 0, b.maxhp);
      if (t === 'ตรงจุด') b.open = 2;

    } else if (t === 'เข้าตัวเอง') {
      b.mistakes++; G.stats.mistakes++;
      out.push({ say: line[li], who: 'sys', tag: t });
      out.push({ fx: 'hitHero', dmg: BAL.self['เข้าตัวเอง'] });
      G.heroHP = clamp(G.heroHP - BAL.self['เข้าตัวเอง'], 0, BAL.heroHP);
      b.open = 0;

    } else {   /* พลาดหนัก */
      b.mistakes++; G.stats.mistakes++;
      out.push({ say: line[li], who: 'sys', tag: t });
      out.push({ fx: 'hitHero', dmg: BAL.self['พลาดหนัก'] });
      G.heroHP = clamp(G.heroHP - BAL.self['พลาดหนัก'], 0, BAL.heroHP);
      b.panic = 2; b.open = 0;
      out.push({ say: b.foe.name + ' ตื่นตระหนก — 2 รอบถัดไปพูดอะไรก็เข้าหัวได้น้อยลง', who: 'sys', tag: 'bad' });
    }

    out.push({ fact: q.fact });

    /* ชาวบ้านสวนกลับ ถ้าเราไม่ได้ตอบตรงจุด */
    if (b.hp > 0 && G.heroHP > 0 && t !== 'ตรงจุด') {
      if (b.shield > 0) {
        b.shield--;
        out.push({ say: 'เรายื่นแผ่นพับให้ดูก่อน — คำสวนกลับตกไป', who: 'sys', tag: 'good' });
      } else {
        var cj = 0.8 + rngAt(G.seed, G.turn, SALT.counter) * 0.5;
        var cd = Math.max(1, Math.round(b.foe.counter * cj));
        out.push({ say: 'แต่เขาก็ว่ามาแล้วนะ...', who: 'foe' });
        out.push({ fx: 'hitHero', dmg: cd });
        G.heroHP = clamp(G.heroHP - cd, 0, BAL.heroHP);
      }
    }

    /* หมดสถานะ */
    if (b.panic > 0) b.panic--;
    if (b.open > 0) b.open--;
    b.qIdx++;

    /* ตัดสินผล */
    if (b.hp <= 0) {
      b.over = 'win';
      out.push({ end: 'win' });
    } else if (G.heroHP <= 0) {
      b.over = 'lose';
      out.push({ end: 'lose' });
    } else {
      out.push({ nextQ: true });
    }
    return out;
  }

  function useItem(G, id) {
    var it = null, i;
    for (i = 0; i < G.items.length; i++) if (G.items[i].id === id) it = G.items[i];
    if (!it || it.n <= 0) return [{ say: 'ของหมดแล้ว', who: 'sys', tag: 'bad' }];
    it.n--;
    var b = G.b;
    if (id === 'call') { b.atkBoost = 1; return [{ say: 'โทรหาหมอ รพ.สต. — หมอยืนยันให้ คำตอบรอบถัดไปจะหนักขึ้น 2 เท่า', who: 'sys', tag: 'good' }]; }
    if (id === 'leaf') { b.shield++; return [{ say: 'เปิดแผ่นพับวางบนโต๊ะ — กันคำสวนกลับได้ 1 รอบ', who: 'sys', tag: 'good' }]; }
    if (id === 'coffee') {
      var heal = Math.min(25, BAL.heroHP - G.heroHP);
      G.heroHP += heal;
      return [{ say: 'จิบกาแฟ รพ.สต. — พลังใจคืนมา ' + heal, who: 'sys', tag: 'good' }, { fx: 'healHero', dmg: heal }];
    }
    return [];
  }

  /* ── ปิดเคส ─────────────────────────────────────────────────── */
  function closeBattle(G, how) {
    var foe = G.b.foe, rec = G.book[foe.name] || { tries: 0, won: false };
    var alreadyWon = !!rec.won;                /* 🪤 กันนับซ้ำตอนกลับไปคุยคนที่สำเร็จแล้ว */
    rec.tries++;
    rec.mind = foe.mind;                       /* ปลดล็อกในเล่มทะเบียนเมื่อเจอแล้ว */
    if (how === 'win') {
      rec.won = true;
      if (!alreadyWon) {
        G.stats.enrolled++;
        if (G.b.mistakes === 0) G.stats.perfect++;
      }
    } else if (how === 'retreat') {
      G.stats.retreats++;
    } else {
      G.stats.failed++;
    }
    G.book[foe.name] = rec;

    /* ปิดยิมเมื่อชนะครบทุกคนในยิม */
    var gym = GYMS[G.gymIdx];
    var all = gym.foes.every(function (f) { return G.book[f.name] && G.book[f.name].won; });
    if (all && G.badges.indexOf(gym.id) < 0) G.badges.push(gym.id);
    return { badgeEarned: all, gym: gym };
  }

  /* กลับมาตั้งหลักระหว่างเคส — ไม่ฟรี เพราะถ้าฟรีก็ไม่มีการตัดสินใจ */
  function rest(G) {
    G.heroHP = clamp(G.heroHP + 30, 0, BAL.heroHP);
  }

  /* ── คิดคะแนนปลายเกม ───────────────────────────────────────── */
  function score(G) {
    var total = 0, i, j;
    for (i = 0; i < GYMS.length; i++) total += GYMS[i].foes.length;
    var s = G.stats;
    var enrollPts = (s.enrolled / total) * 60;              /* คนเข้าระบบ = เป้าหลัก */
    var spiritPts = (G.heroHP / BAL.heroHP) * 15;           /* เหลือพลังใจ = ทำงานต่อได้ */
    var cleanPts = Math.max(0, 15 - s.mistakes * 2.5);      /* ไม่สอนผิด */
    var perfectPts = (s.perfect / total) * 10;              /* เคสที่ไม่พลาดเลย */
    var sc = Math.round(enrollPts + spiritPts + cleanPts + perfectPts);
    var g = GRADES[GRADES.length - 1];
    for (j = 0; j < GRADES.length; j++) if (sc >= GRADES[j].min) { g = GRADES[j]; break; }
    return {
      score: sc, grade: g.g, title: g.t, total: total,
      parts: [
        { k: 'ชาวบ้านที่เข้าระบบติดตาม', v: s.enrolled + '/' + total, p: enrollPts, max: 60 },
        { k: 'พลังใจที่เหลือ', v: G.heroHP + '/' + BAL.heroHP, p: spiritPts, max: 15 },
        { k: 'ไม่ให้ข้อมูลผิด', v: s.mistakes + ' ครั้ง', p: cleanPts, max: 15 },
        { k: 'เคสที่คุยจบไม่พลาดเลย', v: s.perfect + '/' + total, p: perfectPts, max: 10 }
      ]
    };
  }

  return {
    newGame: newGame, startBattle: startBattle, currentQ: currentQ,
    play: play, useItem: useItem, closeBattle: closeBattle, rest: rest,
    score: score, rngAt: rngAt
  };
})();
