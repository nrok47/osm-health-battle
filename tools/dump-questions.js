/* สร้าง QUESTIONS.md จาก js/data.js — ไว้ให้คนอ่าน/ตรวจเนื้อหาโดยไม่ต้องเปิดโค้ด
   รัน:  node tools/dump-questions.js
   🪤 อย่าแก้ QUESTIONS.md ด้วยมือ มันถูกเขียนทับทุกครั้งที่รัน — แก้ที่ js/data.js */
var fs = require('fs'), path = require('path');
var root = path.join(__dirname, '..');
eval(fs.readFileSync(path.join(root, 'js/data.js'), 'utf8'));

var MARK = { 'ตรงจุด': '✅', 'ทั่วไป': '🟡', 'เข้าตัวเอง': '❌', 'พลาดหนัก': '💥' };
var o = [], nQ = 0, nA = 0;

o.push('# คลังคำถาม-คำตอบทั้งหมด');
o.push('');
o.push('> ไฟล์นี้ถูกสร้างอัตโนมัติจาก `js/data.js` — **อย่าแก้ที่นี่** แก้ที่ `js/data.js`');
o.push('> แล้วรัน `node tools/dump-questions.js` ใหม่');
o.push('');
o.push('✅ ตรงจุด · 🟡 ทั่วไป (ไม่ผิดแต่ไม่เปลี่ยนอะไร) · ❌ เข้าตัวเอง (ผิดหลักวิชา) · 💥 พลาดหนัก (เสียรูป)');
o.push('');
o.push('ในเกม **ตำแหน่ง a-d ถูกสลับทุกครั้ง** ที่นี่เรียงตามชนิดท่าเพื่อให้ตรวจง่าย');
o.push('');

GYMS.forEach(function (gy) {
  o.push('---');
  o.push('');
  o.push('# ' + gy.badge + ' ' + gy.name + ' — ' + gy.place);
  o.push('');
  o.push('> ' + gy.intro);
  o.push('');
  gy.foes.forEach(function (f) {
    var best = Object.keys(MIND[f.mind].mul).filter(function (k) { return MIND[f.mind].mul[k] >= 1.4; })[0];
    o.push('## ' + f.name + (f.boss ? ' ★ บอสยิม' : ''));
    o.push('');
    o.push('*' + f.role + '*');
    o.push('');
    o.push('| | |');
    o.push('|---|---|');
    o.push('| เชื่อเพราะ | **' + f.mind + '** — ' + MIND[f.mind].label + ' |');
    o.push('| วิชาที่ได้ผล | **' + best + '** |');
    o.push('| เบาะแสตอนเจอหน้า | ' + f.hint + ' |');
    o.push('| ความเชื่อผิด (HP) | ' + f.hp + ' · สวนกลับ ' + f.counter +
           ' · เพดาน ' + (f.boss ? BAL.turnLimit.boss : BAL.turnLimit.normal) + ' รอบ |');
    o.push('');
    f.q.forEach(function (q, i) {
      nQ++;
      o.push('### ' + (i + 1) + '. ' + f.name + ': "' + q.ask + '"');
      o.push('');
      var sorted = ['ตรงจุด', 'ทั่วไป', 'เข้าตัวเอง', 'พลาดหนัก'].map(function (t) {
        return q.a.filter(function (a) { return a.t === t; })[0];
      });
      sorted.forEach(function (a) {
        if (!a) return;
        nA++;
        o.push('- ' + MARK[a.t] + ' **' + a.t + '** — ' + a.s);
      });
      o.push('');
      o.push('> 📘 **เกร็ด:** ' + q.fact);
      o.push('');
    });
  });
});

o.push('---');
o.push('');
o.push('**รวม ' + nQ + ' คำถาม · ' + nA + ' ตัวเลือก · ' +
       GYMS.reduce(function (a, g) { return a + g.foes.length; }, 0) + ' ชาวบ้าน · ' + GYMS.length + ' ยิม**');
o.push('');

fs.writeFileSync(path.join(root, 'QUESTIONS.md'), o.join('\n'), 'utf8');
console.log('เขียน QUESTIONS.md แล้ว — ' + nQ + ' คำถาม ' + nA + ' ตัวเลือก');
