/* ShareYourGroup sites: theme button, copy / WhatsApp / share helpers, one sponsor card. (Ads are Google's own script, added by the page frame.) */
(function () {
  'use strict';
  var d = document, root = d.documentElement;
  var SYG = window.SYG = {};
  SYG.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  SYG.toast = function (msg) {
    var t = d.querySelector('.toast') || d.body.appendChild(d.createElement('div'));
    t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg; t.hidden = false;
    clearTimeout(SYG._tt); SYG._tt = setTimeout(function () { t.hidden = true; }, 2200);
  };
  SYG.copy = function (text, done) {
    var ok = function () { SYG.toast(done || 'Copied'); };
    var old = function () {
      var a = d.createElement('textarea'); a.value = text; a.setAttribute('readonly', ''); a.style.position = 'fixed'; a.style.opacity = '0';
      d.body.appendChild(a); a.select();
      try { d.execCommand('copy'); ok(); } catch (e) { SYG.toast('Press and hold to copy: ' + text); }
      a.remove();
    };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(ok, old); else old();
  };
  SYG.share = function (title, text, url) {
    if (navigator.share) navigator.share({ title: title, text: text, url: url }).catch(function () {});
    else SYG.copy(text + ' ' + url, 'Copied, ready to paste');
  };
  SYG.json = function (url) { return fetch(url).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); };
  SYG.slug = function (s) { return String(s).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'x'; };
  /* recent look-ups of this site, kept only in this browser */
  SYG.recent = function (key, item) {
    var list = [];
    try { list = JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) {}
    if (item) {
      list = [item].concat(list.filter(function (x) { return x.u !== item.u; })).slice(0, 6);
      try { localStorage.setItem(key, JSON.stringify(list)); } catch (e) {}
    }
    return list;
  };

  d.addEventListener('click', function (e) {
    var b = e.target.closest('[data-theme-btn],[data-copy],[data-share],[data-wa]');
    if (!b) return;
    if (b.hasAttribute('data-theme-btn')) {
      var dark = root.getAttribute('data-theme') ? root.getAttribute('data-theme') === 'dark' : matchMedia('(prefers-color-scheme:dark)').matches;
      root.setAttribute('data-theme', dark ? 'light' : 'dark');
      try { localStorage.setItem('syg-theme', dark ? 'light' : 'dark'); } catch (e2) {}
    } else if (b.hasAttribute('data-wa')) {
      window.open('https://wa.me/?text=' + encodeURIComponent(b.getAttribute('data-wa')), '_blank', 'noopener');
    } else if (b.hasAttribute('data-copy')) SYG.copy(b.getAttribute('data-copy'), b.getAttribute('data-done') || 'Copied');
    else SYG.share(d.title, b.getAttribute('data-share'), b.getAttribute('data-url') || location.href);
  });

  /* one sponsor card from the shared list. The owner's own support card and India-only offers outside India are left out. */
  function sponsor() {
    var slot = d.querySelector('[data-sponsor]');
    if (!slot || d.body.getAttribute('data-ads') === '0') return;
    var india = /Calcutta|Kolkata/.test((Intl.DateTimeFormat().resolvedOptions() || {}).timeZone || '');
    fetch('https://share.groupchaton.com/promos.json', { mode: 'cors' }).then(function (r) { return r.json(); }).then(function (j) {
      var list = (j.promos || []).filter(function (p) { return p && p.href && !p.own && !(p.india && !india); });
      if (!list.length) return;
      var p = list[Math.floor(Math.random() * list.length)];
      var img = p.imgs && p.imgs.length ? p.imgs[Math.floor(Math.random() * p.imgs.length)] : (p.img_icon || '');
      slot.innerHTML = '<a class="sponsor" href="' + SYG.esc(p.href) + '" target="_blank" rel="' + (p.family ? 'noopener' : 'sponsored noopener') + '">' +
        (img ? '<img src="' + SYG.esc(img) + '" alt="" loading="lazy" width="72" height="72">' : '') +
        '<span><small>' + SYG.esc(p.family ? 'From GroupChatOn' : (p.tag || 'Sponsored')) + '</small><b>' + SYG.esc(p.title || '') + '</b>' + (p.line ? '<span>' + SYG.esc(p.line) + '</span>' : '') +
        (p.cta ? '<em>' + SYG.esc(p.cta) + ' →</em>' : '') + '</span></a>';
      slot.hidden = false;
    }).catch(function () {});
  }

  root.classList.add('ready');

  /* fetch the next page when a finger or the mouse rests on its link, so it opens without a wait (never on Save-Data or 2G) */
  var conn = navigator.connection || {}, seen = {};
  function warm(e) {
    var a = e.target.closest && e.target.closest('a[href^="/"]');
    if (!a || conn.saveData || /2g/.test(conn.effectiveType || '') || seen[a.pathname] || a.pathname === location.pathname) return;
    seen[a.pathname] = 1;
    var l = d.createElement('link'); l.rel = 'prefetch'; l.href = a.href; d.head.appendChild(l);
  }
  d.addEventListener('pointerenter', warm, true);
  d.addEventListener('touchstart', warm, { passive: true, capture: true });

  if ('serviceWorker' in navigator && location.protocol === 'https:') window.addEventListener('load', function () { navigator.serviceWorker.register('/visa/sw.js').catch(function () {}); });
  if ('requestIdleCallback' in window) requestIdleCallback(sponsor, { timeout: 2500 }); else setTimeout(sponsor, 900);
})();

/* section tabs: show a fading edge while more tabs hide to the right; scroll the current tab into view */
(function () {
  var n = document.querySelector('.hd .nav'); if (!n) return;
  var cur = n.querySelector('[aria-current]');
  if (cur && n.scrollWidth > n.clientWidth) { var nb = n.getBoundingClientRect(), cb = cur.getBoundingClientRect(); if (cb.right > nb.right - 24 || cb.left < nb.left) n.scrollLeft += cb.left - nb.left - 24; }
  function f() { n.classList.toggle('more', n.scrollWidth - n.clientWidth - n.scrollLeft > 6); }
  n.addEventListener('scroll', f, { passive: true }); addEventListener('resize', f); f();
})();

/* AdSense places of every page of the family (the Auto ads script is already in the page frame; these are fixed, labelled places on top of it;
   moved here from ifsc.js on 2026-11-16 so every umbrella and member site gets them).
   Rules (owner): never on the legal pages (body data-ads="0"), never next to a button, a form or the checker's result; a place that
   gets no ad closes itself. Units of the owner's AdSense account: display, in-article, multiplex. */
function sygPlaces() {
  'use strict';
  var d = document, main = d.getElementById('main');
  if (!main || d.body.getAttribute('data-ads') === '0' || !d.querySelector('script[src*="adsbygoogle.js"]')) return;
  var CLIENT = 'ca-pub-5935207738848708', UNITS = { display: '2358914532', article: '2020003182', multiplex: '4837738215' };
  var TOUCHY = 'button,.btn,form,input,select,textarea,canvas,iframe,.acts,[data-ifsc-out],.finder,.az,table,[data-recent],.chips,.grid,.cards,a.sponsor,.tabs';
  function touchy(el) { return !!el && el.nodeType === 1 && (el.matches(TOUCHY) || !!el.querySelector(TOUCHY)); }
  /* what matters is the part of a block that touches the ad: its last piece (block above) or its first piece (block below) */
  function edge(el, last) { if (!el) return false; if (el.matches(TOUCHY)) return true; var c = last ? el.lastElementChild : el.firstElementChild; return touchy(c || el); }
  function unit(kind) {
    var box = d.createElement('aside');
    box.className = 'pk-place wrap'; box.setAttribute('aria-label', 'Advertisement');
    var attrs = kind === 'article' ? 'style="display:block;text-align:center" data-ad-layout="in-article" data-ad-format="fluid"'
      : kind === 'multiplex' ? 'style="display:block" data-ad-format="autorelaxed"' : 'style="display:block" data-ad-format="auto" data-full-width-responsive="true"';
    box.innerHTML = '<small>Advertisement</small><ins class="adsbygoogle" ' + attrs + ' data-ad-client="' + CLIENT + '" data-ad-slot="' + UNITS[kind] + '"></ins>';
    return box;
  }
  /* ask for the ad only when its place is about to be seen and has a real width (a place with no width makes the ad script fail) */
  /* a place that gets no ad (none available, ad blocker, no answer) shows a sponsor card instead (owner, 2026-11-11). Never the same
     sponsor twice on a page. The place at the very end only closes: the page's own sponsor card sits right under it. */
  var promos = null;
  function sponsors() {
    return promos || (promos = fetch('https://share.groupchaton.com/promos.json', { mode: 'cors' }).then(function (r) { return r.json(); }).then(function (j) {
      var india = /Calcutta|Kolkata/.test((Intl.DateTimeFormat().resolvedOptions() || {}).timeZone || '');
      return (j.promos || []).filter(function (p) { return p && p.href && !p.own && !(p.india && !india); });
    }).catch(function () { return []; }));
  }
  function card(box) {
    if (box._card) return;
    box._card = 1;
    if (box._end) { box.remove(); return; }
    /* let the page's own sponsor card (end of the page) choose first, so the two never show the same sponsor */
    var own = d.querySelector('[data-sponsor]'), wait = own && !own.firstChild && !box._waited ? 1500 : 0;
    if (wait) { box._waited = 1; box._card = 0; setTimeout(function () { card(box); }, wait); return; }
    sponsors().then(function (list) {
      var used = [].map.call(d.querySelectorAll('a.sponsor'), function (a) { return a.getAttribute('href'); });
      list = list.filter(function (p) { return used.indexOf(p.href) < 0; });
      if (!list.length) { box.remove(); return; }
      var p = list[Math.floor(Math.random() * list.length)], esc = window.SYG.esc;
      var img = p.imgs && p.imgs.length ? p.imgs[Math.floor(Math.random() * p.imgs.length)] : (p.img_icon || '');
      box.innerHTML = '<a class="sponsor" href="' + esc(p.href) + '" target="_blank" rel="' + (p.family ? 'noopener' : 'sponsored noopener') + '">' +
        (img ? '<img src="' + esc(img) + '" alt="" loading="lazy" width="72" height="72">' : '') +
        '<span><small>' + esc(p.family ? 'From GroupChatOn' : (p.tag || 'Sponsored')) + '</small><b>' + esc(p.title || '') + '</b>' + (p.line ? '<span>' + esc(p.line) + '</span>' : '') +
        (p.cta ? '<em>' + esc(p.cta) + ' →</em>' : '') + '</span></a>';
      box.setAttribute('aria-label', 'Sponsored');
      box.classList.add('has-card');
    });
  }
  function watch(box) {
    var ins = box.querySelector('ins');
    var state = function () { var st = ins.getAttribute('data-ad-status'); if (st === 'unfilled') card(box); return st; };
    if ('MutationObserver' in window) new MutationObserver(state).observe(ins, { attributes: true, attributeFilter: ['data-ad-status'] });
    setTimeout(function () { if (state() !== 'filled') card(box); }, 8000);   // no answer at all: blocked or offline
  }
  function fill(box) { if (box._done || !box.isConnected || box.offsetWidth < 120) return; box._done = 1; watch(box); try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) { card(box); } }
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { fill(e.target); if (e.target._done) io.unobserve(e.target); } }); }, { rootMargin: '700px 0px' }) : null;
  var boxes = [], tick = 0;
  function near() { boxes.forEach(function (b) { if (!b._done && b.getBoundingClientRect().top < innerHeight + 700) fill(b); }); }
  function show(box) { boxes.push(box); if (io) io.observe(box); }
  /* a second way to notice a place coming near, for browsers where the observer stays silent */
  addEventListener('scroll', function () { if (!tick) tick = setTimeout(function () { tick = 0; near(); }, 250); }, { passive: true });
  setTimeout(near, 2500);
  /* put a unit between two blocks, only where neither neighbour has anything to tap */
  function between(before, kind) {
    var prev = before.previousElementSibling;
    if (touchy(prev) || edge(before, false) || (prev && prev.classList.contains('pk-place'))) return false;   // the block above must have nothing to tap at all
    var box = unit(kind);
    before.parentNode.insertBefore(box, before);
    show(box);
    return true;
  }
  var blocks = [].slice.call(main.children).filter(function (el) { return !el.hasAttribute('data-sponsor') && el.tagName !== 'SCRIPT' && el.tagName !== 'NOSCRIPT'; });
  /* 1. first place: after the tool part of the page (the last block with a form, a filter or a table), one block further down */
  var last = -1;
  blocks.forEach(function (el, i) { if (el.matches('.finder,form,table,.az') || el.querySelector('.finder,form,table,.az,canvas,textarea')) last = i; });
  var placed = 0;
  for (var i = Math.max(last + 1, 1); i < blocks.length && !placed; i++) if (between(blocks[i], 'display')) placed++;
  /* 2. long reading pages: one in-article place before a heading near the middle */
  var heads = [].slice.call(main.querySelectorAll('h2')).filter(function (h) { return !h.closest('details,.result,.pk-place,form,.finder,table,.chips,.grid,.cards,aside'); });
  if (main.offsetHeight > 2600 && heads.length >= 4) {
    for (var k = Math.floor(heads.length / 2); k < heads.length; k++) {
      var h = heads[k], prev = h.previousElementSibling;
      if (!prev || touchy(prev) || touchy(h.nextElementSibling) || prev.classList.contains('pk-place')) continue;
      var box = unit('article'); box.classList.remove('wrap');
      h.parentNode.insertBefore(box, h); show(box); placed++; break;
    }
  }
  /* 3. end of the page: related-content (multiplex) place, above the sponsor card and the footer */
  var end = unit('multiplex'), sp = main.querySelector('[data-sponsor]');
  end._end = 1;
  if (!edge(blocks[blocks.length - 1], true)) { if (sp) main.insertBefore(end, sp); else main.appendChild(end); show(end); }
}
if (document.readyState === "complete") setTimeout(sygPlaces, 400); else addEventListener("load", function () { setTimeout(sygPlaces, 400); });
