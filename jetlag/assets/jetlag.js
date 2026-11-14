(function () {
  'use strict';
  var S = window.SYG || {};
  var esc = S.esc || function (s) { return String(s).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); };
  var rows = null;
  function load() {
    if (rows) return Promise.resolve(rows);
    return fetch('/jetlag/data/cities.json').then(function (r) { return r.json(); }).then(function (d) { rows = d; return d; });
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
        res.innerHTML = list.map(function (c) { return '<li><a href="/jetlag/planner/?to=' + c[3] + '">' + esc(c[0]) + ' <small>' + esc(c[1]) + '</small></a></li>'; }).join('');
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
  function offset(tz, date) {
    var p = new Intl.DateTimeFormat('en-US', {timeZone: tz, timeZoneName: 'longOffset'}).formatToParts(date);
    var n = p.filter(function (x) { return x.type === 'timeZoneName'; })[0].value;
    var m = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(n);
    if (!m) return 0;
    return (m[1] === '-' ? -1 : 1) * (parseInt(m[2], 10) + (m[3] ? parseInt(m[3], 10) / 60 : 0));
  }
  function hrs(h) { var a = Math.abs(h), w = Math.floor(a), m = Math.round((a - w) * 60); return m ? w + ' h ' + m + ' min' : w + ' hours'; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function tm(min) { min = ((min % 1440) + 1440) % 1440; return pad(Math.floor(min / 60)) + ':' + pad(Math.round(min % 60)); }
  var jf = document.getElementById('jf'), jt = document.getElementById('jt'), jd = document.getElementById('jd'), jb = document.getElementById('jb'), out = document.getElementById('jout'), dl = document.getElementById('jl');
  if (jf && jt && jd && out) {
    var label = function (c) { return c[0] + ' (' + c[1] + ')'; };
    var today = new Date(); jd.value = today.getFullYear() + '-' + pad(today.getMonth() + 1) + '-' + pad(today.getDate());
    var find = function (v) { return rows && rows.filter(function (c) { return label(c) === v; })[0]; };
    var calc = function () {
      var A = find(jf.value), B = find(jt.value);
      if (!A || !B || !jd.value) { out.innerHTML = ''; return; }
      var date = new Date(jd.value + 'T12:00:00Z');
      var d = offset(B[2], date) - offset(A[2], date);
      var a = Math.abs(d), html = '<h2>' + esc(A[0]) + ' to ' + esc(B[0]) + '</h2>';
      if (a < 0.01) { out.innerHTML = html + '<div class="verdict"><b>No time difference</b>The two cities are on the same clock on that date.</div>'; return; }
      var east = d > 0;
      var days = Math.max(1, Math.ceil(a / (east ? 1 : 1.5) - 1e-9));
      html += '<div class="verdict"><b>Time difference: ' + hrs(d) + (east ? ' ahead' : ' behind') + '</b>' + esc(B[0]) + '\'s clock is ' + hrs(d) + (east ? ' later' : ' earlier') + ' than ' + esc(A[0]) + '\'s on ' + esc(jd.value) + '. This is a trip ' + (east ? 'east' : 'west') + 'ward.</div>';
      if (a < 2) {
        html += '<div class="verdict"><b>Small gap</b>A gap under two hours is below the threshold of the diagnostic criteria for jet lag disorder. Keep your routine and get morning daylight.</div>';
      } else {
        html += '<div class="verdict"><b>Planning estimate: about ' + days + ' day' + (days === 1 ? '' : 's') + '</b>Average rates from the CDC Yellow Book: about ' + (east ? '1 hour a day eastward' : '1.5 hours a day westward') + '. People differ.' + (a >= 9 ? ' With a gap this large the body can adjust either way; plan for the longer one (' + Math.max(1, Math.ceil((24 - a) / (east ? 1.5 : 1) - 1e-9)) + ' days the other way).' : '') + '</div>';
        var bed = jb && jb.value ? (parseInt(jb.value.slice(0, 2), 10) * 60 + parseInt(jb.value.slice(3, 5), 10)) : 23 * 60;
        var dir = east ? -60 : 60;
        var n = Math.min(3, Math.max(1, Math.round(Math.min(a, 12))));
        var rowsH = '';
        for (var i = n; i >= 1; i--) {
          rowsH += '<tr><td>' + i + ' day' + (i === 1 ? '' : 's') + ' before</td><td>' + tm(bed + dir * (n - i + 1)) + '</td></tr>';
        }
        html += '<h3>Shift your sleep before you fly (CDC: about 1 hour a day for 2 to 3 days)</h3><table class="plan"><thead><tr><th>Day</th><th>Go to bed about</th></tr></thead><tbody>' + rowsH + '</tbody></table>';
        html += '<p>After you land, aim for your usual bedtime (' + tm(bed) + ') by the local clock in ' + esc(B[0]) + ', which is ' + tm(bed - d * 60) + ' on ' + esc(A[0]) + '\'s clock. Stay awake through the local day, get outdoors in daylight, and keep any nap to 20 to 30 minutes.</p>';
        html += '<p>' + (east ? 'For an eastward trip, bright light in the local morning helps your body clock move earlier; avoid bright light late in the evening.' : 'For a westward trip, bright light in the local evening helps your body clock move later; avoid bright light very early in the morning.') + '</p>';
      }
      html += '<p class="small">General wellness guidance from the CDC Yellow Book and the NHS. Not medical advice.</p>';
      out.innerHTML = html;
    };
    load().then(function () {
      dl.innerHTML = rows.slice(0, 1500).map(function (c) { return '<option value="' + esc(label(c)) + '">'; }).join('');
      var m = /[?&]to=([^&]+)/.exec(location.search);
      if (m) { var t = rows.filter(function (c) { return c[3] === decodeURIComponent(m[1]); })[0]; if (t) jt.value = label(t); }
      var del = rows.filter(function (c) { return c[0] === 'Delhi' && c[1] === 'India'; })[0];
      if (del) jf.value = label(del);
      calc();
    });
    [jf, jt, jd, jb].forEach(function (el) { el.addEventListener('input', calc); el.addEventListener('change', calc); });
  }
})();
