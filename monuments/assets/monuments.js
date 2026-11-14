(function () {
  'use strict';
  var S = window.SYG || {};
  var esc = S.esc || function (s) { return String(s).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); };
  var rows = null;
  function load() {
    if (rows) return Promise.resolve(rows);
    return fetch('/monuments/data/monuments.json').then(function (r) { return r.json(); }).then(function (d) { rows = d; return d; });
  }
  var q = document.getElementById('q'), res = document.getElementById('qres');
  if (q && res) {
    q.addEventListener('input', function () {
      var t = q.value.trim().toLowerCase();
      if (t.length < 3) { res.hidden = true; return; }
      load().then(function (r) {
        var list = r.filter(function (c) { return (c[0] + ' ' + c[1] + ' ' + c[2]).toLowerCase().indexOf(t) >= 0; }).slice(0, 10);
        res.innerHTML = list.map(function (c) { return '<li><a href="/monuments/state/' + c[3] + '/">' + esc(c[0]) + ' <small>' + esc([c[1], c[2]].filter(Boolean).join(', ')) + '</small></a></li>'; }).join('') || '<li><span>No match in the list</span></li>';
        res.hidden = false;
      });
    });
  }
  var f = document.querySelector('[data-filter]');
  if (f) {
    var sel = f.getAttribute('data-filter');
    f.addEventListener('input', function () {
      var t = f.value.trim().toLowerCase();
      document.querySelectorAll(sel).forEach(function (el) {
        var show = !t || el.textContent.toLowerCase().indexOf(t) >= 0;
        el.style.display = show ? '' : 'none';
        if (show && t && el.tagName === 'DETAILS') el.open = true;
      });
    });
  }
})();
