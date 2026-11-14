(function () {
  'use strict';
  var S = window.SYG || {};
  var esc = S.esc || function (s) { return String(s).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); };
  var idx = null;
  var MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function load() {
    if (idx) return Promise.resolve(idx);
    return fetch('/cities/data/index.json').then(function (r) { return r.json(); }).then(function (d) { idx = d; return d; });
  }
  function find(q, n) {
    q = q.trim().toLowerCase();
    if (q.length < 2) return [];
    var a = [], b = [];
    idx.forEach(function (c) {
      var nm = c[0].toLowerCase(), full = nm + ' ' + c[1].toLowerCase();
      if (nm.indexOf(q) === 0) a.push(c); else if (full.indexOf(q) >= 0) b.push(c);
    });
    return a.concat(b).slice(0, n);
  }
  var clocks = document.querySelectorAll('[data-tz]');
  if (clocks.length) {
    var tick = function () {
      clocks.forEach(function (el) {
        try {
          el.textContent = new Intl.DateTimeFormat('en-GB', {timeZone: el.getAttribute('data-tz'), weekday: 'short', hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short'}).format(new Date());
        } catch (e) { el.textContent = 'not available in this browser'; }
      });
    };
    tick();
    setInterval(tick, 20000);
  }
  var q = document.getElementById('q'), res = document.getElementById('qres');
  if (q && res) {
    var show = function () {
      load().then(function () {
        var r = find(q.value, 8);
        res.innerHTML = r.map(function (c) { return '<li><a href="/cities/city/' + c[2] + '/">' + esc(c[0]) + ' <small>' + esc(c[1]) + '</small></a></li>'; }).join('');
        res.hidden = !r.length;
      });
    };
    q.addEventListener('input', show);
    var m = /[?&]q=([^&]+)/.exec(location.search);
    if (m) { q.value = decodeURIComponent(m[1].replace(/\+/g, ' ')); show(); }
  }
  var cmp = document.querySelector('[data-compare]');
  if (cmp) {
    var ca = document.getElementById('ca'), cb = document.getElementById('cb'), dl = document.getElementById('cl'), out = document.getElementById('cout');
    var clim = null;
    var label = function (c) { return c[0] + ' (' + c[1] + ')'; };
    var fill = function (e) {
      load().then(function () {
        var r = find(e.target.value, 12);
        dl.innerHTML = r.map(function (c) { return '<option value="' + esc(label(c)) + '">'; }).join('');
      });
    };
    var pick = function (v) { return idx && idx.filter(function (c) { return label(c) === v; })[0]; };
    var avg = function (x) { return x.reduce(function (s, v) { return s + v; }, 0) / x.length; };
    var sum = function (x) { return x.reduce(function (s, v) { return s + v; }, 0); };
    var sumTxt = function (A, B, a, b) {
      var wa = avg(a[0]), wb = avg(b[0]), ra = sum(a[2]), rb = sum(b[2]);
      var gap = 0, gm = 0;
      for (var i = 0; i < 12; i++) { var g = Math.abs(a[0][i] - b[0][i]); if (g > gap) { gap = g; gm = i; } }
      return esc((wa >= wb ? A : B)[0]) + ' is warmer through the year (average daily high ' + Math.max(wa, wb).toFixed(1) + ' against ' + Math.min(wa, wb).toFixed(1) + ' degrees C). ' +
        (Math.abs(ra - rb) < 20 ? 'Their yearly rainfall is about the same (' + Math.round(ra) + ' and ' + Math.round(rb) + ' mm). ' :
          esc((ra >= rb ? A : B)[0]) + ' is wetter, with about ' + Math.max(ra, rb) + ' mm of rain a year against ' + Math.min(ra, rb) + ' mm. ') +
        'The daytime temperatures are furthest apart in ' + MON[gm] + ', by ' + gap.toFixed(1) + ' degrees C.';
    };
    var go = function () {
      if (!idx) return;
      var A = pick(ca.value), B = pick(cb.value);
      if (!A || !B) { out.hidden = true; return; }
      var run = function () {
        var a = clim[A[2]], b = clim[B[2]], rows = '';
        for (var i = 0; i < 12; i++) {
          rows += '<tr><th scope="row">' + MON[i].slice(0, 3) + '</th><td data-l="' + esc(A[0]) + ' high">' + a[0][i] + '</td><td data-l="' + esc(B[0]) + ' high">' + b[0][i] +
            '</td><td data-l="' + esc(A[0]) + ' low">' + a[1][i] + '</td><td data-l="' + esc(B[0]) + ' low">' + b[1][i] +
            '</td><td data-l="' + esc(A[0]) + ' rain">' + a[2][i] + '</td><td data-l="' + esc(B[0]) + ' rain">' + b[2][i] + '</td></tr>';
        }
        out.innerHTML = '<p class="cmp-sum">' + sumTxt(A, B, a, b) + '</p><div class="tbl"><table class="stack"><thead><tr><th>Month</th><th>' + esc(A[0]) + ' high °C</th><th>' + esc(B[0]) +
          ' high °C</th><th>' + esc(A[0]) + ' low °C</th><th>' + esc(B[0]) + ' low °C</th><th>' + esc(A[0]) + ' rain mm</th><th>' + esc(B[0]) + ' rain mm</th></tr></thead><tbody>' + rows +
          '</tbody></table></div><p><a href="/cities/city/' + A[2] + '/">' + esc(A[0]) + ' page</a> &middot; <a href="/cities/city/' + B[2] + '/">' + esc(B[0]) + ' page</a></p>';
        out.hidden = false;
      };
      if (clim) run(); else fetch('/cities/data/climate.json').then(function (r) { return r.json(); }).then(function (d) { clim = d; run(); });
    };
    [ca, cb].forEach(function (el) { el.addEventListener('input', function (e) { fill(e); go(); }); el.addEventListener('change', go); });
  }
})();
