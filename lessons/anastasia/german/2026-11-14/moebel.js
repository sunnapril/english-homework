/* Möbel drawings (front view, own illustrations) + German helpers.
   MOEBEL.items[type] = {name, art, w, h, wall, price:{modern, klassisch}}
   MOEBEL.svg(type, style, color) -> inner SVG markup in a w×h box (origin top-left) */
(function () {
  function hex2rgb(h) { h = h.replace('#', ''); return [0, 2, 4].map(function (i) { return parseInt(h.substr(i, 2), 16); }); }
  function shade(h, p) { // p<0 darker, p>0 lighter
    var c = hex2rgb(h).map(function (v) { return Math.round(p < 0 ? v * (1 + p) : v + (255 - v) * p); });
    return '#' + c.map(function (v) { return ('0' + Math.max(0, Math.min(255, v)).toString(16)).slice(-2); }).join('');
  }
  var WOOD = '#7b5234', DARK = '#3a3a3a';
  function r(x, y, w, h, f, rx, extra) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '"' + (rx ? ' rx="' + rx + '"' : '') + ' fill="' + f + '"' + (extra || '') + '/>'; }
  function p(d, f, extra) { return '<path d="' + d + '" fill="' + f + '"' + (extra || '') + '/>'; }
  function e(cx, cy, rx, ry, f, extra) { return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="' + f + '"' + (extra || '') + '/>'; }

  function seating(w, h, st, c) { // sofa / sessel
    var s = '', d1 = shade(c, -0.12), d2 = shade(c, -0.25);
    if (st === 'modern') {
      s += r(18, h - 12, 6, 12, DARK) + r(w - 24, h - 12, 6, 12, DARK);
      s += r(22, 18, w - 44, 54, d1, 10);
      s += r(10, 58, w - 20, h - 68, c, 8);
      var n = w > 160 ? 2 : 1, cw = (w - 64) / n;
      for (var i = 0; i < n; i++) s += r(32 + i * cw + 2, 54, cw - 4, 16, shade(c, 0.08), 6);
      s += r(0, 44, 30, h - 54, d2, 10) + r(w - 30, 44, 30, h - 54, d2, 10);
    } else {
      s += p('M30,' + (h - 14) + ' q-3,7 3,14 h6 q4,-7 1,-14z', WOOD) + p('M' + (w - 40) + ',' + (h - 14) + ' q-3,7 3,14 h6 q4,-7 1,-14z', WOOD);
      s += p('M22,74 L22,40 Q' + (w * 0.25) + ',2 ' + (w / 2) + ',16 Q' + (w * 0.75) + ',2 ' + (w - 22) + ',40 L' + (w - 22) + ',74 Z', d1);
      for (var k = 1; k < 4; k++) s += e(w * k / 4, 40, 2.5, 2.5, d2);
      s += r(10, 60, w - 20, h - 74, c, 12);
      s += r(16, 56, w - 32, 14, shade(c, 0.1), 7);
      s += r(0, 50, 26, h - 64, d2, 8) + e(13, 50, 15, 11, d1) + r(w - 26, 50, 26, h - 64, d2, 8) + e(w - 13, 50, 15, 11, d1);
    }
    return s;
  }
  var DRAW = {
    sofa: function (st, c) { return seating(260, 120, st, c); },
    sessel: function (st, c) { return seating(120, 115, st, c); },
    stuhl: function (st, c) {
      var s = '', d = shade(c, -0.18);
      if (st === 'modern') {
        s += r(10, 26, 5, 34, d) + r(45, 26, 5, 34, d);
        s += r(6, 0, 48, 34, c, 7);
        s += r(3, 58, 54, 9, c, 3);
        s += r(8, 67, 5, 43, d) + r(47, 67, 5, 43, d);
      } else {
        s += p('M8,62 L8,14 Q30,-6 52,14 L52,62 Z', c) + p('M14,58 L14,18 Q30,4 46,18 L46,58 Z', '#00000000', ' stroke="' + d + '" stroke-width="2"');
        s += r(22, 18, 4, 40, d) + r(34, 18, 4, 40, d);
        s += r(2, 58, 56, 10, c, 4);
        s += p('M8,68 L4,110 L10,110 L14,68 Z', d) + p('M46,68 L50,110 L56,110 L52,68 Z', d);
      }
      return s;
    },
    tisch: function (st, c) {
      var d = shade(c, -0.2);
      if (st === 'modern') return r(0, 0, 180, 10, c, 2) + r(12, 10, 7, 75, d) + r(161, 10, 7, 75, d);
      return r(0, 0, 180, 14, c, 3) + r(10, 14, 160, 14, d) +
        p('M16,28 q-6,20 0,40 q4,9 0,17 h9 q-4,-8 0,-17 q6,-20 0,-40z', d) + p('M156,28 q-6,20 0,40 q4,9 0,17 h9 q-4,-8 0,-17 q6,-20 0,-40z', d);
    },
    bett: function (st, c) {
      var s = '', d = shade(c, -0.18), blanket = shade(c, 0.45);
      if (st === 'modern') s += r(0, 10, 18, 110, c, 3) + r(262, 60, 18, 60, c, 3);
      else s += p('M0,120 L0,26 Q9,-6 18,26 L18,120 Z', c) + e(9, 22, 6, 6, d) + p('M262,120 L262,62 Q271,40 280,62 L280,120 Z', c);
      s += r(10, 74, 262, 24, d, 3) + r(24, 98, 8, 22, DARK) + r(250, 98, 8, 22, DARK);
      s += r(18, 54, 244, 22, '#f4f1ea', 7);
      s += e(54, 50, 30, 11, '#ffffff', ' stroke="#ddd8cf"');
      s += p('M96,52 L262,52 L262,78 L92,78 Q86,64 96,52 Z', blanket) + r(96, 52, 166, 5, shade(blanket, -0.12));
      return s;
    },
    schrank: function (st, c) {
      var s = '', d = shade(c, -0.22);
      if (st === 'modern') {
        s += r(8, 230, 10, 10, DARK) + r(132, 230, 10, 10, DARK);
        s += r(0, 0, 150, 232, c, 3) + r(74, 4, 2, 224, d);
        s += r(64, 104, 4, 28, DARK, 2) + r(82, 104, 4, 28, DARK, 2);
      } else {
        s += r(4, 222, 142, 18, d) + r(-6, 0, 162, 16, d, 2);
        s += r(0, 14, 150, 210, c);
        s += r(10, 26, 58, 186, 'none', 3, ' stroke="' + d + '" stroke-width="3"') + r(82, 26, 58, 186, 'none', 3, ' stroke="' + d + '" stroke-width="3"');
        s += r(74, 16, 2, 206, d) + e(66, 120, 4, 4, '#c9a24a') + e(84, 120, 4, 4, '#c9a24a');
      }
      return s;
    },
    regal: function (st, c) {
      var s = '', d = shade(c, -0.2), books = ['#3f6fa8', '#c2453a', '#e2b43c', '#4f8a5b', '#8a6fb0', '#2b2b2b', '#d9822b'];
      s += r(0, 0, 8, 210, d) + r(102, 0, 8, 210, d);
      [0, 52, 104, 156, 202].forEach(function (y) { s += r(0, y, 110, 8, c); });
      [8, 60, 112].forEach(function (y, row) {
        var x = 12;
        for (var i = 0; i < 6 && x < 92; i++) { var bw = 9 + ((i + row) % 3) * 3, bh = 30 + ((i * 7 + row * 5) % 12); s += r(x, y + 44 - bh, bw, bh, books[(i + row * 2) % books.length], 1); x += bw + 2; }
      });
      s += e(55, 192, 16, 10, '#b8b0a4') + r(46, 168, 18, 20, '#5d8a5b', 9);
      if (st === 'klassisch') s += r(-4, -10, 118, 12, c, 2) + r(-2, 206, 114, 6, d);
      return s;
    },
    lampe: function (st, c) {
      var s = e(30, 186, 18, 5, DARK) + r(28, 40, 4, 146, '#6b6b6b');
      if (st === 'modern') s += r(4, 0, 52, 42, c, 3) + r(4, 36, 52, 6, shade(c, -0.15), 2);
      else s += p('M14,0 L46,0 L58,44 L2,44 Z', c) + p('M2,44 L58,44 L58,48 L2,48 Z', shade(c, -0.2)) + e(30, 60, 6, 6, '#6b6b6b');
      return s;
    },
    teppich: function (st, c) {
      var s = p('M40,0 L300,0 L260,40 L0,40 Z', c), d = shade(c, -0.2), l = shade(c, 0.35);
      if (st === 'modern') { for (var i = 1; i < 6; i++) { var t = i / 6; s += p('M' + (40 - 40 * t) + ',' + (40 * t) + ' L' + (300 - 40 * t) + ',' + (40 * t), 'none', ' stroke="' + (i % 2 ? d : l) + '" stroke-width="3"'); } }
      else { s += p('M50,6 L284,6 L254,34 L16,34 Z', 'none', ' stroke="' + l + '" stroke-width="3"') + e(150, 20, 34, 9, d); for (var k = 0; k < 14; k++) s += p('M' + (2 + k * 2.6) + ',' + (40 - k * 3) + ' l-6,0', 'none', ' stroke="' + d + '" stroke-width="1.5"'); }
      return s;
    },
    bild: function (st, c) {
      var s = r(0, 0, 110, 85, c, 2) + r(8, 8, 94, 69, '#f6f3ee');
      if (st === 'modern') s += p('M24,20 L86,20 L86,65 L24,65 Z', '#e9a0a8') + p('M86,20 L86,65 L24,65 Z', '#8fc4bd') + e(55, 43, 7, 7, '#b5502f');
      else s += r(16, 16, 78, 53, '#cfe3ef') + p('M16,52 Q40,36 60,48 T94,44 L94,69 L16,69 Z', '#7aa36a') + e(78, 30, 6, 6, '#f2c14e');
      return s;
    },
    spiegel: function (st, c) {
      var s = '';
      if (st === 'modern') s += r(0, 0, 70, 100, c, 35) + r(6, 6, 58, 88, '#dfeaee', 29) + p('M18,30 L40,14 L44,18 L22,34 Z', '#ffffff', ' opacity=".8"');
      else s += e(35, 54, 33, 44, c) + e(35, 54, 26, 37, '#dfeaee') + p('M22,40 L40,26 L43,30 L25,44 Z', '#ffffff', ' opacity=".8"') + p('M25,10 Q35,-6 45,10 Z', c);
      return s;
    }
  };
  var items = {
    sofa:    { name: 'Sofa',    art: 'das', w: 260, h: 120, price: { modern: 899, klassisch: 1290 } },
    sessel:  { name: 'Sessel',  art: 'der', w: 120, h: 115, price: { modern: 349, klassisch: 590 } },
    stuhl:   { name: 'Stuhl',   art: 'der', w: 60,  h: 110, price: { modern: 59,  klassisch: 120 } },
    tisch:   { name: 'Tisch',   art: 'der', w: 180, h: 85,  price: { modern: 249, klassisch: 480 } },
    bett:    { name: 'Bett',    art: 'das', w: 280, h: 120, price: { modern: 499, klassisch: 890 } },
    schrank: { name: 'Schrank', art: 'der', w: 150, h: 240, price: { modern: 399, klassisch: 750 } },
    regal:   { name: 'Regal',   art: 'das', w: 110, h: 210, price: { modern: 129, klassisch: 260 } },
    lampe:   { name: 'Lampe',   art: 'die', w: 60,  h: 190, price: { modern: 79,  klassisch: 150 } },
    teppich: { name: 'Teppich', art: 'der', w: 300, h: 40,  price: { modern: 99,  klassisch: 220 }, floor: true },
    bild:    { name: 'Bild',    art: 'das', w: 110, h: 85,  price: { modern: 45,  klassisch: 310 }, wall: true },
    spiegel: { name: 'Spiegel', art: 'der', w: 70,  h: 100, price: { modern: 69,  klassisch: 180 }, wall: true }
  };
  var PRON = { der: 'er', das: 'es', die: 'sie' };

  // German number words (0 … 999 999)
  var ONES = ['', 'ein', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun'];
  var TEENS = ['zehn', 'elf', 'zwölf', 'dreizehn', 'vierzehn', 'fünfzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn'];
  var TENS = ['', '', 'zwanzig', 'dreißig', 'vierzig', 'fünfzig', 'sechzig', 'siebzig', 'achtzig', 'neunzig'];
  function u100(n) { if (n === 0) return ''; if (n === 1) return 'eins'; if (n < 10) return ONES[n]; if (n < 20) return TEENS[n - 10]; var u = n % 10, t = Math.floor(n / 10); return (u ? ONES[u] + 'und' : '') + TENS[t]; }
  function u1000(n, lead) { var h = Math.floor(n / 100), rest = n % 100; return (h ? (h === 1 && !lead ? 'hundert' : ONES[h] + 'hundert') : '') + u100(rest); }
  function words(n) {
    if (n === 0) return 'null'; if (n === 1000000) return 'eine Million';
    var th = Math.floor(n / 1000), rest = n % 1000, s = '';
    if (th) s = (th === 1 ? '' : u1000(th, false).replace(/eins$/, 'ein')) + 'tausend';
    return s + u1000(rest, !!th);
  }
  window.MOEBEL = {
    items: items, PRON: PRON, shade: shade, words: words,
    svg: function (type, style, color) { return DRAW[type](style || 'modern', color || '#9aa1a6'); },
    card: function (type, style, color) { var it = items[type], pad = 8; return '<svg viewBox="' + (-pad) + ' ' + (-pad - (type === 'regal' && style === 'klassisch' ? 10 : 0)) + ' ' + (it.w + 2 * pad) + ' ' + (it.h + 2 * pad + (type === 'regal' && style === 'klassisch' ? 10 : 0)) + '" role="img" aria-label="' + it.art + ' ' + it.name + '">' + this.svg(type, style, color) + '</svg>'; }
  };
})();
