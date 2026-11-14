/* trips.shareyourgroup.com/trip: a day-by-day itinerary maker with budget and checklist. Everything runs in the browser; the trip is kept only in this browser's storage,
   or in the share link you create (the whole trip is inside the link after the # sign, so nothing is sent to any server).
   The pure functions are tested by test_trip.js (node). */
(function () {
  'use strict';
  var T = {};
  var CATS = ['travel', 'stay', 'food', 'sights', 'other'];
  T.CATS = CATS;
  T.cents = function (v) { var n = Math.round(parseFloat(String(v).replace(/,/g, '')) * 100); return isFinite(n) && n > 0 ? n : 0; };
  T.fmt = function (c, cur) { return (cur || '') + (c / 100).toLocaleString('en-IN', { minimumFractionDigits: c % 100 ? 2 : 0, maximumFractionDigits: 2 }); };
  T.blank = function () { return { v: 1, name: '', start: '', people: 1, cur: '₹', days: [{ title: '', items: [] }], check: [] }; };
  T.addDays = function (iso, n) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
    var p = iso.split('-').map(Number), d = new Date(Date.UTC(p[0], p[1] - 1, p[2] + n));
    return d.getUTCFullYear() + '-' + ('0' + (d.getUTCMonth() + 1)).slice(-2) + '-' + ('0' + d.getUTCDate()).slice(-2);
  };
  T.dayLabel = function (iso) {
    if (!iso) return '';
    var p = iso.split('-').map(Number), d = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getUTCDay()] + ' ' + p[2] + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][p[1] - 1];
  };
  /* item: {t: 'HH:MM' or '', w: text, c: cents, k: category, n: note} */
  T.totals = function (trip) {
    var perDay = [], cat = {}, all = 0;
    CATS.forEach(function (k) { cat[k] = 0; });
    trip.days.forEach(function (d) {
      var s = 0;
      d.items.forEach(function (it) { var c = it.c > 0 ? it.c : 0; s += c; cat[CATS.indexOf(it.k) >= 0 ? it.k : 'other'] += c; });
      perDay.push(s); all += s;
    });
    var ppl = Math.max(1, parseInt(trip.people, 10) || 1);
    return { perDay: perDay, cat: cat, all: all, each: Math.floor(all / ppl), people: ppl };
  };
  T.sortItems = function (items) {
    // items with a time go in time order, items without a time keep their place at the end
    var timed = items.filter(function (i) { return i.t; }).sort(function (a, b) { return a.t < b.t ? -1 : a.t > b.t ? 1 : 0; });
    return timed.concat(items.filter(function (i) { return !i.t; }));
  };
  T.text = function (trip) {
    var t = T.totals(trip), out = [(trip.name || 'My trip') + (trip.start ? ' (from ' + T.dayLabel(trip.start) + ')' : ''), ''];
    trip.days.forEach(function (d, i) {
      out.push('Day ' + (i + 1) + (trip.start ? ', ' + T.dayLabel(T.addDays(trip.start, i)) : '') + (d.title ? ': ' + d.title : ''));
      T.sortItems(d.items).forEach(function (it) { out.push('  ' + (it.t ? it.t + ' ' : '') + it.w + (it.c ? ' (' + T.fmt(it.c, trip.cur) + ')' : '') + (it.n ? ' - ' + it.n : '')); });
      if (t.perDay[i]) out.push('  Day total: ' + T.fmt(t.perDay[i], trip.cur));
      out.push('');
    });
    out.push('Trip total: ' + T.fmt(t.all, trip.cur) + (t.people > 1 ? ' (' + T.fmt(t.each, trip.cur) + ' each for ' + t.people + ')' : ''));
    var chk = trip.check.filter(function (c) { return c.w; });
    if (chk.length) { out.push('', 'Checklist'); chk.forEach(function (c) { out.push((c.d ? '[x] ' : '[ ] ') + c.w); }); }
    return out.join('\n');
  };
  /* share link: the trip as compact JSON in base64url */
  T.encode = function (trip) {
    var s = JSON.stringify(trip);
    var b = typeof btoa === 'function' ? btoa(unescape(encodeURIComponent(s))) : Buffer.from(s, 'utf8').toString('base64');
    return b.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };
  T.decode = function (h) {
    try {
      var b = h.replace(/-/g, '+').replace(/_/g, '/'); while (b.length % 4) b += '=';
      var s = typeof atob === 'function' ? decodeURIComponent(escape(atob(b))) : Buffer.from(b, 'base64').toString('utf8');
      return T.clean(JSON.parse(s));
    } catch (e) { return null; }
  };
  T.clean = function (x) {
    if (!x || typeof x !== 'object' || !Array.isArray(x.days)) return null;
    var tr = T.blank();
    tr.name = String(x.name || '').slice(0, 80); tr.start = /^\d{4}-\d{2}-\d{2}$/.test(x.start) ? x.start : '';
    tr.people = Math.min(99, Math.max(1, parseInt(x.people, 10) || 1)); tr.cur = String(x.cur || '₹').slice(0, 4);
    tr.days = x.days.slice(0, 60).map(function (d) {
      return { title: String((d && d.title) || '').slice(0, 80), items: ((d && d.items) || []).slice(0, 40).map(function (i) {
        return { t: /^([01]\d|2[0-3]):[0-5]\d$/.test(i.t) ? i.t : '', w: String(i.w || '').slice(0, 120), c: i.c > 0 ? Math.min(Math.round(i.c), 1e11) : 0, k: CATS.indexOf(i.k) >= 0 ? i.k : 'other', n: String(i.n || '').slice(0, 160) };
      }) };
    });
    if (!tr.days.length) tr.days = [{ title: '', items: [] }];
    tr.check = (Array.isArray(x.check) ? x.check : []).slice(0, 60).map(function (c) { return { w: String(c.w || '').slice(0, 100), d: !!c.d }; });
    return tr;
  };
  if (typeof module !== 'undefined') { module.exports = T; return; }

  /* ---------- page ---------- */
  var root = document.getElementById('tripapp');
  if (!root) return;
  var S = window.SYG || {};
  var esc = S.esc || function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var KEY = 'syg-trip-v1', trip = null, SAMPLES = window.TRIP_SAMPLES || {};
  try { trip = T.clean(JSON.parse(localStorage.getItem(KEY))); } catch (e) { trip = null; }
  if (location.hash.length > 3) { var shared = T.decode(location.hash.slice(1)); if (shared) { trip = shared; } }
  if (!trip) trip = T.blank();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(trip)); } catch (e) { /* storage unavailable: the page still works */ } }
  var CATN = { travel: 'Travel', stay: 'Stay', food: 'Food', sights: 'Sights', other: 'Other' };
  function draw() {
    var t = T.totals(trip), h = '';
    h += '<div class="fields"><div><label for="tn">Trip name</label><input id="tn" type="text" maxlength="80" value="' + esc(trip.name) + '" placeholder="For example: Weekend in the hills"></div>' +
      '<div><label for="ts">First day</label><input id="ts" type="date" value="' + esc(trip.start) + '"></div>' +
      '<div><label for="tp">People</label><input id="tp" type="number" min="1" max="99" value="' + trip.people + '"></div>' +
      '<div><label for="tc">Currency sign</label><input id="tc" type="text" maxlength="4" value="' + esc(trip.cur) + '"></div></div>';
    trip.days.forEach(function (d, i) {
      h += '<section class="day" data-day="' + i + '"><h3>Day ' + (i + 1) + (trip.start ? ' <small>' + esc(T.dayLabel(T.addDays(trip.start, i))) + '</small>' : '') + '</h3>' +
        '<input class="dt" type="text" maxlength="80" data-f="title" value="' + esc(d.title) + '" placeholder="Day title (optional)" aria-label="Title of day ' + (i + 1) + '">';
      d.items.forEach(function (it, j) {
        h += '<div class="item" data-item="' + j + '"><input type="time" data-f="t" value="' + esc(it.t) + '" aria-label="Time"><input type="text" data-f="w" maxlength="120" value="' + esc(it.w) + '" placeholder="What" aria-label="What">' +
          '<input type="text" inputmode="decimal" data-f="c" value="' + (it.c ? it.c / 100 : '') + '" placeholder="Cost" aria-label="Cost"><select data-f="k" aria-label="Kind">' +
          CATS.map(function (k) { return '<option value="' + k + '"' + (it.k === k ? ' selected' : '') + '>' + CATN[k] + '</option>'; }).join('') + '</select>' +
          '<input type="text" data-f="n" maxlength="160" value="' + esc(it.n) + '" placeholder="Note (booking number, address...)" aria-label="Note"><button type="button" class="x" data-del="' + j + '" aria-label="Remove this item">×</button></div>';
      });
      h += '<p class="dayfoot"><button type="button" class="btn sm ghost" data-add="' + i + '">Add an item</button> ' + (trip.days.length > 1 ? '<button type="button" class="btn sm ghost" data-rmday="' + i + '">Remove day</button> ' : '') +
        '<span class="daytot">' + (t.perDay[i] ? 'Day total: ' + esc(T.fmt(t.perDay[i], trip.cur)) : '') + '</span></p></section>';
    });
    h += '<p><button type="button" class="btn" data-addday>Add a day</button></p>';
    h += '<section class="sum"><h3>Budget</h3><dl class="facts"><dt>Trip total</dt><dd>' + esc(T.fmt(t.all, trip.cur)) + '</dd>' + (t.people > 1 ? '<dt>Each, for ' + t.people + ' people</dt><dd>' + esc(T.fmt(t.each, trip.cur)) + '</dd>' : '') +
      CATS.map(function (k) { return t.cat[k] ? '<dt>' + CATN[k] + '</dt><dd>' + esc(T.fmt(t.cat[k], trip.cur)) + (t.all ? ' (' + Math.round(100 * t.cat[k] / t.all) + '%)' : '') + '</dd>' : ''; }).join('') + '</dl></section>';
    h += '<section class="chk"><h3>Checklist</h3>' + trip.check.map(function (c, i) {
      return '<div class="ci"><label><input type="checkbox" data-ck="' + i + '"' + (c.d ? ' checked' : '') + '> <input type="text" class="cw" data-cw="' + i + '" maxlength="100" value="' + esc(c.w) + '" aria-label="Checklist item"></label><button type="button" class="x" data-cdel="' + i + '" aria-label="Remove">×</button></div>';
    }).join('') + '<p><button type="button" class="btn sm ghost" data-cadd>Add a checklist item</button> <button type="button" class="btn sm ghost" data-cstd>Add the usual ones</button></p></section>';
    h += '<p class="acts"><button type="button" class="btn" data-print>Print</button> <button type="button" class="btn ghost" data-share>Copy share link</button> <button type="button" class="btn ghost" data-copytext>Copy as text</button> <button type="button" class="btn ghost" data-watext>Send on WhatsApp</button> <button type="button" class="btn ghost" data-reset>Start again</button></p><p class="hint" id="tmsg" aria-live="polite"></p>';
    root.innerHTML = h;
  }
  function msg(m) { var e = document.getElementById('tmsg'); if (e) e.textContent = m; }
  function sync(el) {
    var day = el.closest('[data-day]');
    if (el.id === 'tn') trip.name = el.value; else if (el.id === 'ts') { trip.start = el.value; draw(); save(); return; } else if (el.id === 'tp') trip.people = Math.min(99, Math.max(1, parseInt(el.value, 10) || 1)); else if (el.id === 'tc') trip.cur = el.value;
    else if (el.hasAttribute('data-cw')) trip.check[+el.getAttribute('data-cw')].w = el.value;
    else if (el.hasAttribute('data-ck')) trip.check[+el.getAttribute('data-ck')].d = el.checked;
    else if (day) {
      var d = trip.days[+day.getAttribute('data-day')], it = el.closest('[data-item]'), f = el.getAttribute('data-f');
      if (f === 'title') d.title = el.value; else if (it) { var o = d.items[+it.getAttribute('data-item')]; o[f] = f === 'c' ? T.cents(el.value) : el.value; }
    }
    save(); refreshTotals();
  }
  function refreshTotals() {
    var t = T.totals(trip), tots = root.querySelectorAll('.daytot');
    tots.forEach(function (e, i) { e.textContent = t.perDay[i] ? 'Day total: ' + T.fmt(t.perDay[i], trip.cur) : ''; });
    var s = root.querySelector('.sum dl');
    if (s) s.innerHTML = '<dt>Trip total</dt><dd>' + esc(T.fmt(t.all, trip.cur)) + '</dd>' + (t.people > 1 ? '<dt>Each, for ' + t.people + ' people</dt><dd>' + esc(T.fmt(t.each, trip.cur)) + '</dd>' : '') +
      CATS.map(function (k) { return t.cat[k] ? '<dt>' + CATN[k] + '</dt><dd>' + esc(T.fmt(t.cat[k], trip.cur)) + (t.all ? ' (' + Math.round(100 * t.cat[k] / t.all) + '%)' : '') + '</dd>' : ''; }).join('');
  }
  root.addEventListener('input', function (e) { if (e.target.matches('input,select')) sync(e.target); });
  root.addEventListener('change', function (e) { if (e.target.matches('select,input[type=checkbox],input[type=date],input[type=time]')) { if (e.target.getAttribute('data-f') === 't') { var day = e.target.closest('[data-day]'); trip.days[+day.getAttribute('data-day')].items = T.sortItems(trip.days[+day.getAttribute('data-day')].items); save(); draw(); } } });
  root.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-add')) { trip.days[+b.getAttribute('data-add')].items.push({ t: '', w: '', c: 0, k: 'other', n: '' }); save(); draw(); var d = root.querySelectorAll('[data-day]')[+b.getAttribute('data-add')]; var w = d && d.querySelectorAll('.item')[d.querySelectorAll('.item').length - 1]; if (w) w.querySelector('[data-f=w]').focus(); }
    else if (b.hasAttribute('data-del')) { var dd = b.closest('[data-day]'); trip.days[+dd.getAttribute('data-day')].items.splice(+b.getAttribute('data-del'), 1); save(); draw(); }
    else if (b.hasAttribute('data-addday')) { if (trip.days.length < 60) trip.days.push({ title: '', items: [] }); save(); draw(); }
    else if (b.hasAttribute('data-rmday')) { if (confirm('Remove this day and everything in it?')) { trip.days.splice(+b.getAttribute('data-rmday'), 1); save(); draw(); } }
    else if (b.hasAttribute('data-cadd')) { trip.check.push({ w: '', d: false }); save(); draw(); }
    else if (b.hasAttribute('data-cdel')) { trip.check.splice(+b.getAttribute('data-cdel'), 1); save(); draw(); }
    else if (b.hasAttribute('data-cstd')) { ['Passport and visa or e-visa approval', 'Tickets and hotel bookings', 'Travel insurance papers', 'Money, cards and a spare card', 'Phone, chargers and power bank', 'Medicines and a small first-aid kit', 'Copies of documents (paper and phone)'].forEach(function (w) { if (!trip.check.some(function (c) { return c.w === w; })) trip.check.push({ w: w, d: false }); }); save(); draw(); }
    else if (b.hasAttribute('data-print')) window.print();
    else if (b.hasAttribute('data-share')) { var link = location.origin + location.pathname + '#' + T.encode(trip); (S.copy ? S.copy(link, 'Share link copied') : null); msg(link.length > 2000 ? 'The link is long (' + link.length + ' characters). Some apps cut long links: send the text instead.' : 'Link copied. Anyone who opens it sees a copy of this trip; changes they make are not sent back.'); }
    else if (b.hasAttribute('data-copytext')) { (S.copy ? S.copy(T.text(trip), 'Copied') : null); msg('The trip is copied as plain text.'); }
    else if (b.hasAttribute('data-watext')) window.open('https://wa.me/?text=' + encodeURIComponent(T.text(trip)), '_blank', 'noopener');
    else if (b.hasAttribute('data-reset')) { if (confirm('Clear the whole trip and start again?')) { trip = T.blank(); save(); history.replaceState(null, '', location.pathname); draw(); } }
  });
  document.querySelectorAll('[data-sample]').forEach(function (b) {
    b.addEventListener('click', function () {
      var s = SAMPLES[b.getAttribute('data-sample')];
      if (!s) return;
      if (trip.days.some(function (d) { return d.items.length; }) && !confirm('Replace your trip with this sample?')) return;
      trip = T.clean(JSON.parse(JSON.stringify(s))); save(); draw(); root.scrollIntoView({ behavior: 'smooth' });
    });
  });
  draw();
})();
