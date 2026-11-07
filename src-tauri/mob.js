/* Eight Voids phone / tablet app (iPhone, iPad, Android) – added by the app to its own window.
   Makes the workspace behave like a phone app: outside links open in the phone's browser,
   Microsoft sign-in stays inside the app, notifications for items that need attention,
   an offline notice, and small App settings (the screen icon next to the bell).
   Site photos use the phone camera or photo library through the normal Eight Voids upload buttons. */
(function () {
  'use strict';
  if (window.__EVMOB) return;
  window.__EVMOB = true;

  var H = location.hostname;
  var LOCAL = location.protocol === 'tauri:' || H === 'tauri.localhost';
  var OURS = LOCAL || /(^|\.)eightvoids\.com$/i.test(H);
  var SIGNIN = /(^|\.)(microsoftonline\.com|login\.microsoft\.com|login\.live\.com|account\.live\.com|msauth\.net|msftauth\.net|microsoft\.com)$/i;
  var KEY = 'evm.settings';

  function T() { return window.__TAURI__ || null; }
  function host(u) { try { return new URL(u, location.href).hostname; } catch (e) { return ''; } }
  function isOurs(u) { return /(^|\.)eightvoids\.com$/i.test(host(u)); }
  function inApp(u) {
    var x; try { x = new URL(u, location.href); } catch (e) { return true; }
    if (/^(blob|data|javascript|about):$/.test(x.protocol)) return true;
    if (!/^https?:$/.test(x.protocol)) return false;
    return isOurs(u) || x.hostname === 'tauri.localhost' || SIGNIN.test(x.hostname);
  }
  function openOutside(u) {
    var t = T();
    try { if (t && t.opener && t.opener.openUrl) { t.opener.openUrl(u).catch(function () {}); return; } } catch (e) {}
    location.href = u;
  }

  window.EV_DESK = true;     /* the website shows its app sign-in (no website menus) */
  window.EV_MOBILE_APP = true;

  /* cover Azure's white hand-over pages during sign-in with the Eight Voids background */
  if (/^app\.eightvoids\.com$/i.test(H) && /^\/(\.auth\/|index\.html$|$)/.test(location.pathname) && !/^\/\.auth\/me/.test(location.pathname)) {
    (function veil() {
      var dk = false;
      try { var t = JSON.parse(localStorage.getItem('evw.theme') || 'null'); dk = t === 'dark' || (t !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches); } catch (e) {}
      var css = 'html,body{background:' + (dk ? '#17191A' : '#F4F2EE') + '!important}body>*{visibility:hidden!important}' +
        'html::after{content:"";position:fixed;left:50%;top:50%;width:112px;height:112px;margin:-56px 0 0 -56px;background:url(/evmark.png) center/112px 112px no-repeat;opacity:.9}';
      function put() {
        var root = document.documentElement; if (!root) return false;
        if (document.getElementById('evm-veil')) return true;
        var st = document.createElement('style'); st.id = 'evm-veil'; st.textContent = css;
        (document.head || root).appendChild(st); return true;
      }
      if (!put()) { var mo = new MutationObserver(function () { if (put()) mo.disconnect(); }); mo.observe(document, { childList: true, subtree: true }); }
    })();
  }

  /* outside links open in the phone's browser; Eight Voids and Microsoft sign-in stay in the app */
  window.addEventListener('click', function (e) {
    if (e.defaultPrevented) return;
    var a = e.target && e.target.closest && e.target.closest('a[href]');
    if (!a || a.hasAttribute('download')) return;
    var raw = a.getAttribute('href') || '';
    if (!raw || raw.charAt(0) === '#' || /^(javascript|blob|data):/i.test(raw)) return;
    var u = a.href;
    if (/^(mailto|tel|sms|msteams|ms-[a-z]+):/i.test(u) || !inApp(u)) { e.preventDefault(); openOutside(u); return; }
    if (a.target === '_blank' && isOurs(u)) { e.preventDefault(); location.href = u; }
  });
  var _open = window.open;
  window.open = function (u) {
    if (u && typeof u === 'string' && u !== 'about:blank') {
      var abs; try { abs = new URL(u, location.href).href; } catch (e) { abs = u; }
      if (!/^(blob|data):/i.test(abs)) {
        if (isOurs(abs)) { location.href = abs; return null; }
        if (!SIGNIN.test(host(abs))) { openOutside(abs); return null; }
      }
    }
    return _open.apply(window, arguments);
  };
  if (!OURS) return;

  /* ---------- look and feel ---------- */
  var css = 'html,body{overscroll-behavior:none;-webkit-tap-highlight-color:transparent}' +
    '.evm-ov{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:flex-end;justify-content:center;background:rgba(10,12,12,.45);font:15px system-ui,-apple-system,"Segoe UI",sans-serif}' +
    '.evm-box{width:100%;max-width:560px;max-height:85vh;overflow:auto;border-radius:18px 18px 0 0;background:var(--evm-bg);color:var(--evm-fg);padding:6px 0 calc(14px + env(safe-area-inset-bottom,0px));box-shadow:0 -10px 40px rgba(0,0,0,.3)}' +
    '.evm-h{display:flex;align-items:center;gap:10px;padding:14px 18px;border-bottom:1px solid var(--evm-line)}.evm-h b{flex:1;font-size:17px}' +
    '.evm-x{border:0;background:none;color:var(--evm-mute);font-size:24px;line-height:1;padding:4px 8px}' +
    '.evm-s{padding:14px 18px;border-bottom:1px solid var(--evm-line)}.evm-s:last-child{border-bottom:0}.evm-s p{margin:4px 0 10px;color:var(--evm-mute);line-height:1.45}' +
    '.evm-row{display:flex;align-items:center;gap:12px}.evm-row span{flex:1}' +
    '.evm-b{border:1px solid var(--evm-line);background:var(--evm-soft);color:var(--evm-fg);border-radius:99px;padding:9px 16px;font:inherit}' +
    '.evm-off{position:fixed;left:50%;top:calc(8px + env(safe-area-inset-top,0px));transform:translateX(-50%);z-index:2147483001;padding:7px 14px;border-radius:99px;background:#8a5a12;color:#fff;font:13px system-ui,sans-serif;max-width:calc(100vw - 24px);text-align:center}' +
    '.evm-toast{position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:2147483001;padding:12px 14px;border-radius:12px;background:var(--evm-bg);color:var(--evm-fg);box-shadow:0 8px 30px rgba(0,0,0,.3);font:14px system-ui,sans-serif}' +
    ':root{--evm-bg:#fff;--evm-fg:#1d2020;--evm-mute:#5f6763;--evm-line:#dfe3dc;--evm-soft:#f3f5f1}' +
    '@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--evm-bg:#1f2322;--evm-fg:#eceeeb;--evm-mute:#a7aea9;--evm-line:#353b39;--evm-soft:#2a2f2d}}' +
    ':root[data-theme="dark"]{--evm-bg:#1f2322;--evm-fg:#eceeeb;--evm-mute:#a7aea9;--evm-line:#353b39;--evm-soft:#2a2f2d}';
  function addCss() {
    if (document.getElementById('evm-css')) return;
    var s = document.createElement('style'); s.id = 'evm-css'; s.textContent = css;
    (document.head || document.documentElement).appendChild(s);
    document.documentElement.classList.add('ev-mobile-app');
  }
  if (document.documentElement) addCss();
  document.addEventListener('DOMContentLoaded', addCss);

  /* offline notice */
  function offline(on) {
    var b = document.getElementById('evm-off');
    if (on && !b && document.body) { b = document.createElement('div'); b.id = 'evm-off'; b.className = 'evm-off'; b.textContent = 'You are offline – Eight Voids continues when the connection is back.'; document.body.appendChild(b); }
    if (!on && b) b.remove();
  }
  window.addEventListener('offline', function () { offline(true); });
  window.addEventListener('online', function () { offline(false); });

  /* settings kept on this phone */
  var S = { notify: true };
  try { Object.assign(S, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

  function toast(t) {
    var d = document.createElement('div'); d.className = 'evm-toast'; d.textContent = t; document.body.appendChild(d);
    setTimeout(function () { d.remove(); }, 4500);
  }

  /* notifications */
  function notify(title, body) {
    var t = T(); if (!t || !t.notification || S.notify === false) return Promise.resolve(false);
    var n = t.notification;
    return n.isPermissionGranted().then(function (ok) { return ok ? true : n.requestPermission().then(function (p) { return p === 'granted'; }); })
      .then(function (ok) { if (ok) n.sendNotification({ title: String(title || 'Eight Voids'), body: String(body || '') }); return ok; })
      .catch(function () { return false; });
  }

  /* App settings sheet */
  function el(tag, cls, txt) { var x = document.createElement(tag); if (cls) x.className = cls; if (txt != null) x.textContent = txt; return x; }
  function openSettings() {
    var old = document.getElementById('evm-set'); if (old) old.remove();
    var ov = el('div', 'evm-ov'); ov.id = 'evm-set';
    var box = el('div', 'evm-box'); ov.appendChild(box);
    var h = el('div', 'evm-h'); h.appendChild(el('b', '', 'App settings'));
    var x = el('button', 'evm-x', '×'); x.setAttribute('aria-label', 'Close'); x.onclick = function () { ov.remove(); }; h.appendChild(x); box.appendChild(h);
    var s1 = el('div', 'evm-s'); var r = el('label', 'evm-row'); r.appendChild(el('span', '', 'Notifications for items that need your attention'));
    var cb = el('input'); cb.type = 'checkbox'; cb.checked = S.notify !== false; cb.onchange = function () { S.notify = cb.checked; save(); }; r.appendChild(cb); s1.appendChild(r);
    var tb = el('button', 'evm-b', 'Send a test notification'); tb.onclick = function () { notify('Eight Voids', 'Notifications are working.').then(function (ok) { if (!ok) toast('Notifications are off. Allow Eight Voids in the phone settings › Notifications.'); }); };
    s1.appendChild(el('p', '', 'Shown while Eight Voids is open or running in the background.')); s1.appendChild(tb); box.appendChild(s1);
    var s2 = el('div', 'evm-s'); s2.appendChild(el('b', '', 'Site photos'));
    s2.appendChild(el('p', '', 'Images › Capture uses the phone camera or the photo library. Photos with people or vehicle plates are held back, as in the browser.')); box.appendChild(s2);
    var s3 = el('div', 'evm-s'); var v = el('p', '', 'Eight Voids app'); s3.appendChild(v); box.appendChild(s3);
    try { var t = T(); if (t && t.app && t.app.getVersion) t.app.getVersion().then(function (ver) { v.textContent = 'Eight Voids app · version ' + ver; }); } catch (e) {}
    ov.addEventListener('click', function (e) { if (e.target === ov) ov.remove(); });
    document.body.appendChild(ov);
  }

  /* what the workspace can use (same names as the desktop app) */
  window.evDesktop = {
    isDesktop: true,
    isMobile: true,
    notify: notify,
    settings: openSettings,
    folder: function () { return Promise.resolve(null); },
    openOutside: openOutside
  };
  window.addEventListener('load', function () { if (!navigator.onLine) offline(true); });
})();
