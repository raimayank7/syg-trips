(function () {
  'use strict';
  var S = window.SYG || {};
  var esc = S.esc || function (s) { return String(s).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); };
  var rows = null;
  function load() {
    if (rows) return Promise.resolve(rows);
    return fetch('/plugs/data/plugs.json').then(function (r) { return r.json(); }).then(function (d) {
      rows = d.map(function (x) { return {name: x[0], slug: x[1], volts: x[2], hz: x[3], types: x[4]}; });
      return rows;
    });
  }
  function vtxt(v) { return v.map(function (x) { return x + ' V'; }).join(' or '); }
  function hasAny(a, b) { return a.some(function (x) { return b.indexOf(x) >= 0; }); }
  function verdict(A, B) {
    var out = [];
    var same = A.types.filter(function (t) { return B.types.indexOf(t) >= 0; });
    var cOk = A.types.indexOf('C') >= 0 && hasAny(B.types, ['C', 'E', 'F']);
    var cMaybe = A.types.indexOf('C') >= 0 && !cOk && hasAny(B.types, ['J', 'K', 'L']);
    if (A.slug === B.slug) {
      out.push(['ok', 'Same country', 'Your plugs fit your own sockets.']);
    } else if (same.length) {
      out.push(['ok', 'Plug: fits', 'Both countries list type ' + same.join(', ') + ', so a plug of that type fits. Check pin size where the type is D or M.']);
    } else if (cOk) {
      out.push(['ok', 'Plug: two-pin type C fits', 'Your small two-pin type C plug fits type E and F sockets, so phone and laptop chargers should plug in. Plugs of other types (' + A.types.filter(function (t) { return t !== 'C'; }).join(', ') + ') still need an adapter.']);
    } else if (cMaybe) {
      out.push(['warn', 'Plug: probably needs an adapter', 'Your two-pin type C plug is made to fit several European sockets and often fits these, but an adapter for type ' + B.types.join(' or ') + ' is the safe choice.']);
    } else {
      out.push(['warn', 'Plug: adapter needed', 'Your plugs (type ' + A.types.join(', ') + ') do not match the sockets in the destination (type ' + B.types.join(', ') + '). Pack a travel adapter for type ' + B.types.join(' or ') + '.']);
    }
    var aHigh = Math.max.apply(null, A.volts), bMin = Math.min.apply(null, B.volts), bMax = Math.max.apply(null, B.volts);
    if (bMin >= aHigh - 25 && bMax <= aHigh + 25) {
      out.push(['ok', 'Voltage: compatible', 'The destination supply (' + vtxt(B.volts) + ') is close to yours (' + vtxt(A.volts) + ').']);
    } else if (bMax < aHigh - 25 && bMax <= 130) {
      out.push(['warn', 'Voltage: much lower', 'The destination supply (' + vtxt(B.volts) + ') is lower than yours (' + vtxt(A.volts) + '). A charger marked "100-240 V" works fine. A single-voltage appliance needs a converter, or use a local one.']);
    } else if (bMin > aHigh + 25 || bMax > aHigh + 25) {
      out.push(['warn', 'Voltage: much higher', 'The destination supply (' + vtxt(B.volts) + ') is higher than yours (' + vtxt(A.volts) + '). Only a charger marked "100-240 V" (or covering the higher figure) is safe; check each label before plugging in.']);
    } else {
      out.push(['warn', 'Voltage: check each device', 'The destination lists ' + vtxt(B.volts) + ', yours is ' + vtxt(A.volts) + '. Use chargers marked 100-240 V, and check anything else.']);
    }
    var hzMatch = hasAny(A.hz, B.hz);
    out.push([hzMatch ? 'ok' : 'warn', 'Frequency: ' + (hzMatch ? 'same available' : 'different'), hzMatch ? 'Both use ' + A.hz.filter(function (h) { return B.hz.indexOf(h) >= 0; }).join(' and ') + ' Hz.' : 'You use ' + A.hz.join('/') + ' Hz, the destination uses ' + B.hz.join('/') + ' Hz. Chargers do not mind; clocks and motors may.']);
    return out;
  }
  var q = document.getElementById('q'), res = document.getElementById('qres');
  if (q && res) {
    q.addEventListener('input', function () {
      var t = q.value.trim().toLowerCase();
      if (t.length < 2) { res.hidden = true; return; }
      load().then(function (r) {
        var a = r.filter(function (c) { return c.name.toLowerCase().indexOf(t) === 0; });
        var b = r.filter(function (c) { return c.name.toLowerCase().indexOf(t) > 0; });
        var list = a.concat(b).slice(0, 8);
        res.innerHTML = list.map(function (c) { return '<li><a href="/plugs/country/' + c.slug + '/">' + esc(c.name) + ' <small>' + esc(vtxt(c.volts)) + '</small></a></li>'; }).join('');
        res.hidden = !list.length;
      });
    });
  }
  var flt = document.querySelector('[data-filter]');
  if (flt) {
    var box = document.querySelector(flt.getAttribute('data-filter'));
    flt.addEventListener('input', function () {
      var t = flt.value.trim().toLowerCase();
      box.querySelectorAll('li').forEach(function (li) { li.style.display = !t || li.textContent.toLowerCase().indexOf(t) >= 0 ? '' : 'none'; });
    });
  }
  var af = document.getElementById('af'), at = document.getElementById('at'), out = document.getElementById('aout');
  if (af && at && out) {
    load().then(function (r) {
      var opts = r.map(function (c) { return '<option value="' + c.slug + '">' + esc(c.name) + '</option>'; }).join('');
      af.innerHTML = opts; at.innerHTML = opts;
      var m = /[?&]from=([^&]+)/.exec(location.search), n = /[?&]to=([^&]+)/.exec(location.search);
      af.value = (m && m[1]) || 'india';
      at.value = (n && n[1]) || 'united-states';
      if (!af.value) af.value = 'india';
      if (!at.value) at.value = 'united-states';
      var by = {}; r.forEach(function (c) { by[c.slug] = c; });
      var go = function () {
        var A = by[af.value], B = by[at.value];
        if (!A || !B) return;
        out.innerHTML = '<h2>' + esc(A.name) + ' to ' + esc(B.name) + '</h2>' + verdict(A, B).map(function (v) { return '<div class="verdict ' + v[0] + '"><b>' + esc(v[1]) + '</b>' + esc(v[2]) + '</div>'; }).join('') +
          '<p><a href="/plugs/country/' + B.slug + '/">Full page for ' + esc(B.name) + '</a></p>';
      };
      af.addEventListener('change', go); at.addEventListener('change', go); go();
    });
  }
})();
