(function () {
  'use strict';
  var S = window.SYG || {};
  var esc = S.esc || function (s) { return String(s).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); };
  var K = {m: 'mountain', l: 'lake', r: 'river'}, U = {m: ' m', l: ' km²', r: ' km'};
  var rows = null;
  function load() {
    if (rows) return Promise.resolve(rows);
    return fetch('/peaks/data/items.json').then(function (r) { return r.json(); }).then(function (d) { rows = d; return d; });
  }
  var q = document.getElementById('q'), res = document.getElementById('qres');
  if (q && res) {
    q.addEventListener('input', function () {
      var t = q.value.trim().toLowerCase();
      if (t.length < 2) { res.hidden = true; return; }
      load().then(function (r) {
        var a = r.filter(function (c) { return c[0].toLowerCase().indexOf(t) === 0; });
        var b = r.filter(function (c) { return c[0].toLowerCase().indexOf(t) > 0; });
        var list = a.concat(b).slice(0, 8);
        res.innerHTML = list.map(function (c) { return '<li><a href="/peaks/' + K[c[2]] + '/' + c[1] + '/">' + esc(c[0]) + ' <small>' + Math.round(c[3]).toLocaleString('en-IN') + U[c[2]] + '</small></a></li>'; }).join('');
        res.hidden = !list.length;
      });
    });
  }
  var f = document.querySelector('[data-filter]');
  if (f) {
    var sel = f.getAttribute('data-filter');
    f.addEventListener('input', function () {
      var t = f.value.trim().toLowerCase();
      document.querySelectorAll(sel).forEach(function (el) { el.style.display = !t || el.textContent.toLowerCase().indexOf(t) >= 0 ? '' : 'none'; });
    });
  }
})();
