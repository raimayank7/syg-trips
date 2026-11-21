/* trips.shareyourgroup.com/trips: cost splitter, packing list maker, trip budget and fuel cost. Everything runs in the browser.
   Nothing typed is sent anywhere. Your trip is kept only in this browser's storage so that you can come back to it. */
(function () {
  'use strict';
  var T = {};
  /* amounts are handled in paise (whole numbers) so that shares always add up exactly */
  T.paise = function (v) { var n = Math.round(parseFloat(String(v).replace(/,/g, '')) * 100); return isFinite(n) ? n : 0; };
  T.rupees = function (p) { var s = (Math.abs(p) / 100).toLocaleString('en-IN', { minimumFractionDigits: p % 100 ? 2 : 0, maximumFractionDigits: 2 }); return (p < 0 ? '-' : '') + '₹' + s; };
  /* people: [names]; expenses: [{what, amt (paise), by (index), among ([index]) }] */
  T.split = function (people, expenses) {
    var n = people.length, paid = [], share = [], total = 0, i;
    for (i = 0; i < n; i++) { paid.push(0); share.push(0); }
    expenses.forEach(function (e) {
      var among = (e.among && e.among.length ? e.among : people.map(function (_, k) { return k; })).filter(function (k) { return k >= 0 && k < n; });
      if (!(e.amt > 0) || !(e.by >= 0 && e.by < n) || !among.length) return;
      total += e.amt; paid[e.by] += e.amt;
      var each = Math.floor(e.amt / among.length), left = e.amt - each * among.length;
      among.forEach(function (k, j) { share[k] += each + (j < left ? 1 : 0); });      // the odd paise go to the first few, so the total is exact
    });
    var bal = paid.map(function (p, k) { return p - share[k]; });                      // + is owed money, - owes money
    var cr = [], dr = [], pay = [];
    bal.forEach(function (b, k) { if (b > 0) cr.push([k, b]); else if (b < 0) dr.push([k, -b]); });
    cr.sort(function (a, b) { return b[1] - a[1]; }); dr.sort(function (a, b) { return b[1] - a[1]; });
    var a = 0, b = 0;
    while (a < dr.length && b < cr.length) {
      var x = Math.min(dr[a][1], cr[b][1]);
      pay.push({ from: dr[a][0], to: cr[b][0], amt: x });
      dr[a][1] -= x; cr[b][1] -= x;
      if (!dr[a][1]) a++; if (!cr[b][1]) b++;
    }
    return { total: total, paid: paid, share: share, balance: bal, pay: pay };
  };
  /* packing: how many of each clothing item for a number of nights */
  T.count = function (nights) { var d = Math.max(1, nights + 1); return { tops: Math.min(d, 7), bottoms: Math.min(Math.max(1, Math.ceil(d / 2.5)), 4), sets: Math.min(d + 1, 8) }; };
  T.fuel = function (km, kmpl, price, extra, people) {
    var litres = km / kmpl, fuel = litres * price, total = fuel + (extra || 0);
    return { litres: litres, fuel: fuel, total: total, each: total / Math.max(1, people || 1), perKm: total / km };
  };
  if (typeof module !== 'undefined') { module.exports = T; return; }

  var d = document, S = window.SYG, $ = function (q, el) { return (el || d).querySelector(q); };
  function load(k, def) { try { return JSON.parse(localStorage.getItem(k)) || def; } catch (e) { return def; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function show(el, h) { el.innerHTML = h; el.hidden = false; }
  function num(v) { var n = parseFloat(String(v).replace(/,/g, '')); return isFinite(n) ? n : 0; }

  /* ---------- cost splitter ---------- */
  if ($('[data-tool=split]')) (function () {
    var KEY = 'syg-trips-split', st = load(KEY, null) || { name: '', people: [], exp: [] };
    var pIn = $('#sp-person'), list = $('#sp-people'), exBox = $('#sp-exp'), out = $('#sp-out');
    function draw() {
      $('#sp-name').value = st.name || '';
      list.innerHTML = st.people.map(function (p, i) { return '<li><span>' + S.esc(p) + '</span><button type="button" class="x" data-del-p="' + i + '" aria-label="Remove ' + S.esc(p) + '">×</button></li>'; }).join('');
      $('#sp-step2').hidden = st.people.length < 2;
      $('#sp-by').innerHTML = st.people.map(function (p, i) { return '<option value="' + i + '">' + S.esc(p) + '</option>'; }).join('');
      $('#sp-among').innerHTML = st.people.map(function (p, i) { return '<label class="chk"><input type="checkbox" value="' + i + '" checked> <span>' + S.esc(p) + '</span></label>'; }).join('');
      exBox.innerHTML = st.exp.length ? '<div class="tbl"><table class="stack"><thead><tr><th>For</th><th>Amount</th><th>Paid by</th><th>Shared by</th><th></th></tr></thead><tbody>' + st.exp.map(function (e, i) {
        var among = e.among.length === st.people.length ? 'Everyone' : e.among.map(function (k) { return st.people[k]; }).join(', ');
        return '<tr><td data-l="For">' + S.esc(e.what || 'Expense') + '</td><td data-l="Amount">' + T.rupees(e.amt) + '</td><td data-l="Paid by">' + S.esc(st.people[e.by] || '') + '</td><td data-l="Shared by">' + S.esc(among) + '</td><td><button type="button" class="btn sm ghost" data-del-e="' + i + '">Remove</button></td></tr>';
      }).join('') + '</tbody></table></div>' : '<p class="hint">No expenses yet. Add the first one above.</p>';
      result(); save(KEY, st);
    }
    function text(r) {
      var L = [(st.name || 'Trip') + ': total ' + T.rupees(r.total)];
      st.people.forEach(function (p, i) { L.push(p + ': paid ' + T.rupees(r.paid[i]) + ', share ' + T.rupees(r.share[i])); });
      L.push(''); L.push(r.pay.length ? 'To settle:' : 'All settled. Nobody owes anything.');
      r.pay.forEach(function (x) { L.push(st.people[x.from] + ' pays ' + st.people[x.to] + ' ' + T.rupees(x.amt)); });
      return L.join('\n');
    }
    function result() {
      if (st.people.length < 2 || !st.exp.length) { out.hidden = true; return; }
      var r = T.split(st.people, st.exp), t = text(r);
      show(out, '<h2>Total spent: ' + T.rupees(r.total) + '</h2><div class="tbl"><table><thead><tr><th>Person</th><th class="num">Paid</th><th class="num">Share</th><th class="num">Balance</th></tr></thead><tbody>' +
        st.people.map(function (p, i) { var b = r.balance[i]; return '<tr><td>' + S.esc(p) + '</td><td class="num">' + T.rupees(r.paid[i]) + '</td><td class="num">' + T.rupees(r.share[i]) + '</td><td class="num ' + (b > 0 ? 'pos' : b < 0 ? 'neg' : '') + '">' + (b > 0 ? 'gets back ' + T.rupees(b) : b < 0 ? 'owes ' + T.rupees(-b) : 'settled') + '</td></tr>'; }).join('') +
        '</tbody></table></div><h3>Who pays whom</h3>' + (r.pay.length ? '<ul class="pay">' + r.pay.map(function (x) { return '<li><b>' + S.esc(st.people[x.from]) + '</b> pays <b>' + S.esc(st.people[x.to]) + '</b> <span>' + T.rupees(x.amt) + '</span></li>'; }).join('') + '</ul><p class="hint">' + r.pay.length + ' payment' + (r.pay.length > 1 ? 's' : '') + ' settle everything.</p>' : '<p>All settled. Nobody owes anything.</p>') +
        '<div class="acts"><button class="btn sm" type="button" data-copy="' + S.esc(t) + '">Copy summary</button><button class="btn sm ghost" type="button" data-wa="' + S.esc(t + '\nhttps://trips.shareyourgroup.com/trips/cost-splitter/') + '">Send on WhatsApp</button><button class="btn sm ghost" type="button" data-print>Print</button></div>');
    }
    function addPerson() {
      pIn.value.split(/[,\n]/).forEach(function (raw) {
        var p = raw.trim().slice(0, 30);
        if (p && st.people.length < 30 && st.people.map(function (x) { return x.toLowerCase(); }).indexOf(p.toLowerCase()) < 0) st.people.push(p);
      });
      pIn.value = ''; draw(); pIn.focus();
    }
    $('#sp-add-p').addEventListener('click', addPerson);
    pIn.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); addPerson(); } });
    $('#sp-name').addEventListener('input', function () { st.name = this.value.slice(0, 60); save(KEY, st); });
    $('#sp-add-e').addEventListener('click', function () {
      var amt = T.paise($('#sp-amt').value), among = [].slice.call(d.querySelectorAll('#sp-among input:checked')).map(function (c) { return +c.value; }), msg = $('#sp-msg');
      if (!(amt > 0)) { msg.textContent = 'Type the amount, more than zero.'; msg.hidden = false; return; }
      if (!among.length) { msg.textContent = 'Tick at least one person who shares this expense.'; msg.hidden = false; return; }
      msg.hidden = true;
      st.exp.push({ what: $('#sp-what').value.trim().slice(0, 60), amt: amt, by: +$('#sp-by').value, among: among });
      $('#sp-what').value = ''; $('#sp-amt').value = ''; draw(); $('#sp-what').focus();
    });
    d.addEventListener('click', function (e) {
      var b = e.target.closest('[data-del-p],[data-del-e],[data-print]'); if (!b) return;
      if (b.hasAttribute('data-print')) return window.print();
      if (b.hasAttribute('data-del-e')) { st.exp.splice(+b.getAttribute('data-del-e'), 1); draw(); return; }
      var i = +b.getAttribute('data-del-p');
      if (st.exp.some(function (x) { return x.by === i || x.among.indexOf(i) > -1; })) { S.toast('Remove this person\'s expenses first'); return; }
      st.people.splice(i, 1);
      st.exp.forEach(function (x) { if (x.by > i) x.by--; x.among = x.among.map(function (k) { return k > i ? k - 1 : k; }); });
      draw();
    });
    $('#sp-clear').addEventListener('click', function () { if (confirm('Clear this trip and start again?')) { st = { name: '', people: [], exp: [] }; draw(); } });
    draw();
  })();

  /* ---------- packing list maker and the ticks on every list ---------- */
  function ticks(box, key) {
    var done = load(key, []);
    box.querySelectorAll('input[type=checkbox]').forEach(function (c) {
      var id = c.getAttribute('data-i'); c.checked = done.indexOf(id) > -1;
      c.addEventListener('change', function () { var now = []; box.querySelectorAll('input:checked').forEach(function (x) { now.push(x.getAttribute('data-i')); }); save(key, now); count(box); });
    });
    count(box);
  }
  function count(box) { var all = box.querySelectorAll('input[type=checkbox]').length, on = box.querySelectorAll('input:checked').length, c = d.querySelector('[data-count]'); if (c) c.textContent = on + ' of ' + all + ' packed'; }
  var stat = $('[data-pack]');
  if (stat) {
    ticks(stat, 'syg-trips-pack-' + stat.getAttribute('data-pack'));
    var rs = $('[data-reset]'); if (rs) rs.addEventListener('click', function () { stat.querySelectorAll('input').forEach(function (x) { x.checked = false; }); save('syg-trips-pack-' + stat.getAttribute('data-pack'), []); count(stat); });
    d.querySelectorAll('[data-print]').forEach(function (b) { b.addEventListener('click', function () { window.print(); }); });
  }
  if ($('[data-tool=pack]')) (function () {
    var P = window.TRIP_PACK, out = $('#pk-out'), KEY = 'syg-trips-maker', st = load(KEY, { type: P.types[0].s, nights: 3, baby: false, rain: false, cold: false });
    $('#pk-type').innerHTML = P.types.map(function (t) { return '<option value="' + t.s + '">' + S.esc(t.name) + '</option>'; }).join('');
    $('#pk-type').value = st.type; $('#pk-nights').value = st.nights; $('#pk-baby').checked = st.baby; $('#pk-rain').checked = st.rain; $('#pk-cold').checked = st.cold;
    function build() {
      st = { type: $('#pk-type').value, nights: Math.max(0, Math.min(60, parseInt($('#pk-nights').value, 10) || 0)), baby: $('#pk-baby').checked, rain: $('#pk-rain').checked, cold: $('#pk-cold').checked }; save(KEY, st);
      var by = {}; P.types.forEach(function (t) { by[t.s] = t; });
      var c = T.count(st.nights), secs = P.base.map(function (s) { return [s[0], s[1].slice()]; });
      secs.forEach(function (s) {
        if (s[0] === 'Clothes') s[1] = s[1].map(function (it) {
          if (/^Tops/.test(it)) return 'Tops or shirts: ' + c.tops; if (/^Trousers/.test(it)) return 'Trousers, jeans or other bottoms: ' + c.bottoms;
          if (/^Underwear/.test(it)) return 'Underwear and socks: ' + c.sets + ' sets'; return it;
        });
      });
      var seen = {}, add = function (list) { list.forEach(function (s) { secs.push([s[0], s[1].slice()]); }); };
      add(by[st.type].add);
      if (st.baby && st.type !== 'travel-with-baby-or-kids') add(by['travel-with-baby-or-kids'].add);
      if (st.rain && st.type !== 'monsoon-trip') add([by['monsoon-trip'].add[0]]);
      if (st.cold && st.type !== 'hill-station-and-winter-trip') add([by['hill-station-and-winter-trip'].add[0]]);
      var n = 0, h = '', lines = [];
      secs.forEach(function (s) {
        var items = s[1].filter(function (it) { var k = it.toLowerCase(); if (seen[k]) return false; seen[k] = 1; return true; });
        if (!items.length) return;
        h += '<h3>' + S.esc(s[0]) + '</h3><ul class="pack">' + items.map(function (it) { n++; return '<li><label><input type="checkbox" data-i="' + S.esc(st.type + '|' + it) + '"><span>' + S.esc(it) + '</span></label></li>'; }).join('') + '</ul>';
        lines.push(s[0].toUpperCase()); items.forEach(function (it) { lines.push('- ' + it); }); lines.push('');
      });
      var title = by[st.type].name + ', ' + st.nights + (st.nights === 1 ? ' night' : ' nights');
      out.innerHTML = '<h2>' + S.esc(title) + '</h2><p class="hint"><span data-count></span>. Ticks stay in this browser.</p>' + h +
        '<div class="acts"><button class="btn sm" type="button" data-copy="' + S.esc('Packing list: ' + title + '\n\n' + lines.join('\n')) + '">Copy list</button><button class="btn sm ghost" type="button" data-wa="' + S.esc('Packing list: ' + title + '\n\n' + lines.join('\n') + 'https://trips.shareyourgroup.com/trips/packing-list-maker/') + '">Send on WhatsApp</button>' +
        '<button class="btn sm ghost" type="button" id="pk-print">Print</button><button class="btn sm ghost" type="button" id="pk-untick">Clear ticks</button></div>';
      out.hidden = false;
      var key = 'syg-trips-pack-maker-' + st.type; ticks(out, key);
      $('#pk-print').addEventListener('click', function () { window.print(); });
      $('#pk-untick').addEventListener('click', function () { save(key, []); build(); });
    }
    ['pk-type', 'pk-nights', 'pk-baby', 'pk-rain', 'pk-cold'].forEach(function (i) { $('#' + i).addEventListener('change', build); $('#' + i).addEventListener('input', build); });
    build();
  })();

  /* ---------- trip budget ---------- */
  if ($('[data-tool=budget]')) (function () {
    var KEY = 'syg-trips-budget', rows = [].slice.call(d.querySelectorAll('[data-row]')), out = $('#bg-out'), st = load(KEY, {});
    rows.forEach(function (r) { var k = r.getAttribute('data-row'); if (st[k]) { $('input', r).value = st[k].v || ''; $('select', r).value = st[k].m || 'total'; } });
    if (st._people) $('#bg-people').value = st._people; if (st._days) $('#bg-days').value = st._days;
    function run() {
      var people = Math.max(1, parseInt($('#bg-people').value, 10) || 1), days = Math.max(1, parseInt($('#bg-days').value, 10) || 1), total = 0, lines = [], keep = { _people: people, _days: days };
      rows.forEach(function (r) {
        var v = num($('input', r).value), m = $('select', r).value, k = r.getAttribute('data-row'), name = $('label', r).textContent;
        keep[k] = { v: $('input', r).value, m: m };
        var amt = v * (m === 'each' ? people : m === 'day' ? days : m === 'eachday' ? people * days : 1);
        if (amt > 0) { total += amt; lines.push([name, amt]); }
      });
      save(KEY, keep);
      if (!total) return show(out, '<p>Type your own estimates above. The total, the share for each person and the cost per day appear here. We do not fill in any prices: they depend on where and how you travel.</p>');
      var R = function (x) { return T.rupees(Math.round(x * 100)); }, t = 'Trip budget for ' + people + (people > 1 ? ' people' : ' person') + ', ' + days + (days > 1 ? ' days' : ' day') + '\n' + lines.map(function (l) { return l[0] + ': ' + R(l[1]); }).join('\n') + '\nTotal: ' + R(total) + '\nEach person: ' + R(total / people);
      show(out, '<h2>Total: ' + R(total) + '</h2><dl class="facts"><dt>Each person</dt><dd>' + R(total / people) + '</dd><dt>Per day, whole group</dt><dd>' + R(total / days) + '</dd><dt>Per person per day</dt><dd>' + R(total / people / days) + '</dd>' +
        lines.map(function (l) { return '<dt>' + S.esc(l[0]) + '</dt><dd>' + R(l[1]) + ' (' + Math.round(l[1] / total * 100) + '%)</dd>'; }).join('') + '</dl>' +
        '<div class="acts"><button class="btn sm" type="button" data-copy="' + S.esc(t) + '">Copy budget</button><button class="btn sm ghost" type="button" data-wa="' + S.esc(t + '\nhttps://trips.shareyourgroup.com/trips/trip-budget-planner/') + '">Send on WhatsApp</button></div>');
    }
    d.querySelector('[data-tool=budget]').addEventListener('input', run); d.querySelector('[data-tool=budget]').addEventListener('change', run);
    $('#bg-clear').addEventListener('click', function () { rows.forEach(function (r) { $('input', r).value = ''; }); run(); });
    run();
  })();

  /* ---------- fuel cost ---------- */
  if ($('[data-tool=fuel]')) (function () {
    var out = $('#fu-out'), KEY = 'syg-trips-fuel', st = load(KEY, {});
    ['fu-km', 'fu-kmpl', 'fu-price', 'fu-extra', 'fu-people'].forEach(function (i) { if (st[i] !== undefined) $('#' + i).value = st[i]; });
    if (st.round !== undefined) $('#fu-round').checked = !!st.round;
    function run() {
      var km = num($('#fu-km').value) * ($('#fu-round').checked ? 2 : 1), kmpl = num($('#fu-kmpl').value), price = num($('#fu-price').value), extra = num($('#fu-extra').value), people = Math.max(1, parseInt($('#fu-people').value, 10) || 1), keep = { round: $('#fu-round').checked };
      ['fu-km', 'fu-kmpl', 'fu-price', 'fu-extra', 'fu-people'].forEach(function (i) { keep[i] = $('#' + i).value; }); save(KEY, keep);
      if (!(km > 0) || !(kmpl > 0) || !(price > 0)) return show(out, '<p>Type the distance, your vehicle\'s mileage and the fuel price at your pump. We do not fill in a fuel price, because it differs by city and changes often.</p>');
      var r = T.fuel(km, kmpl, price, extra, people), R = function (x) { return T.rupees(Math.round(x * 100)); };
      var t = 'Fuel cost for ' + km + ' km at ' + kmpl + ' km per litre and ' + R(price) + ' a litre: ' + R(r.fuel) + (extra ? ', plus tolls and parking ' + R(extra) : '') + '. Total ' + R(r.total) + (people > 1 ? ', ' + R(r.each) + ' each for ' + people : '') + '.';
      show(out, '<h2>' + R(r.total) + (people > 1 ? ' in all, ' + R(r.each) + ' each' : '') + '</h2><dl class="facts"><dt>Distance counted</dt><dd>' + km.toLocaleString('en-IN') + ' km</dd><dt>Fuel needed</dt><dd>' + (Math.round(r.litres * 10) / 10) + ' litres</dd><dt>Fuel cost</dt><dd>' + R(r.fuel) + '</dd>' +
        (extra ? '<dt>Tolls, parking and other</dt><dd>' + R(extra) + '</dd>' : '') + '<dt>Cost per km</dt><dd>' + R(r.perKm) + '</dd></dl><div class="acts"><button class="btn sm" type="button" data-copy="' + S.esc(t) + '">Copy</button><button class="btn sm ghost" type="button" data-wa="' + S.esc(t) + '">Send on WhatsApp</button></div>' +
        '<p class="hint">Real mileage on a trip is often lower than the figure on paper: a full load, air conditioning, hills and city traffic all use more fuel. Add a tenth to be safe.</p>');
    }
    d.querySelector('[data-tool=fuel]').addEventListener('input', run); d.querySelector('[data-tool=fuel]').addEventListener('change', run);
    run();
  })();
})();
