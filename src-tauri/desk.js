/* Eight Voids desktop app – added by the app to its own window.
   Makes the workspace behave like a desktop program (no browser menus, outside links open in
   the normal browser), and adds desktop notifications and saving files to a local or OneDrive folder.
   It only ever ADDS new files to the folder you choose – it never changes, moves or deletes anything. */
(function () {
  'use strict';
  if (window.__EVDESK) return;
  window.__EVDESK = true;

  var H = location.hostname;
  var LOCAL = location.protocol === 'tauri:' || H === 'tauri.localhost';
  var OURS = LOCAL || /(^|\.)eightvoids\.com$/i.test(H);
  var SIGNIN = /(^|\.)(microsoftonline\.com|login\.microsoft\.com|login\.live\.com|account\.live\.com|msauth\.net|msftauth\.net|microsoft\.com)$/i;
  var RELEASES = 'https://github.com/Eightvoids/desktop/releases/latest';

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
  }
  function openWindow(u) {
    var t = T();
    try {
      if (t && t.webviewWindow && t.webviewWindow.WebviewWindow) {
        new t.webviewWindow.WebviewWindow('ev' + Date.now(), { url: u, title: 'Eight Voids', width: 1200, height: 820, center: true });
        return;
      }
    } catch (e) {}
    location.href = u;
  }

  window.EV_DESK = true;

  /* Azure's own "Login complete" page and the hand-over page flash white with a blue link for a moment.
     Inside the app we cover them with the Eight Voids loading background, so sign-in looks seamless. */
  if (/^app\.eightvoids\.com$/i.test(H) && /^\/(\.auth\/|index\.html$|$)/.test(location.pathname) && !/^\/\.auth\/me/.test(location.pathname)) {
    (function veil() {
      var dk = false;
      try { var t = JSON.parse(localStorage.getItem('evw.theme') || 'null'); dk = t === 'dark' || (t !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches); } catch (e) {}
      var bg = dk ? '#17191A' : '#F4F2EE';
      var css = 'html,body{background:' + bg + '!important}body>*{visibility:hidden!important}' +
        'html::after{content:"";position:fixed;left:50%;top:50%;width:132px;height:132px;margin:-66px 0 0 -66px;background:url(/evmark.png) center/132px 132px no-repeat;opacity:.9}';
      function put() {
        var root = document.documentElement; if (!root) return false;
        if (document.getElementById('evd-veil')) return true;
        var st = document.createElement('style'); st.id = 'evd-veil'; st.textContent = css;
        (document.head || root).appendChild(st); return true;
      }
      if (!put()) { var mo = new MutationObserver(function () { if (put()) mo.disconnect(); }); mo.observe(document, { childList: true, subtree: true }); }
    })();
  }
  if (!OURS) { linkRules(); return; }      /* Microsoft sign-in pages: only keep outside links outside */

  /* ---------- look and feel of a desktop program ---------- */
  var css = 'html,body{overscroll-behavior:none}' +
    '.evd-ov{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;background:rgba(10,12,12,.45);font:14px "Segoe UI",system-ui,sans-serif}' +
    '.evd-box{width:min(520px,calc(100vw - 32px));max-height:calc(100vh - 48px);overflow:auto;border-radius:14px;background:var(--evd-bg);color:var(--evd-fg);box-shadow:0 18px 60px rgba(0,0,0,.35);border:1px solid var(--evd-line)}' +
    '.evd-h{display:flex;align-items:center;gap:10px;padding:16px 18px;border-bottom:1px solid var(--evd-line)}.evd-h b{font-size:16px;flex:1}.evd-h small{color:var(--evd-mute)}' +
    '.evd-x{border:0;background:none;color:var(--evd-mute);font-size:20px;cursor:pointer;line-height:1;padding:2px 6px;border-radius:6px}.evd-x:hover{background:var(--evd-soft)}' +
    '.evd-s{padding:14px 18px;border-bottom:1px solid var(--evd-line)}.evd-s:last-child{border-bottom:0}.evd-s h4{margin:0 0 4px;font-size:13px;letter-spacing:.04em;text-transform:uppercase;color:var(--evd-mute)}' +
    '.evd-s p{margin:4px 0 10px;color:var(--evd-mute);line-height:1.45}.evd-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}' +
    '.evd-b{border:1px solid var(--evd-line);background:var(--evd-soft);color:var(--evd-fg);border-radius:99px;padding:7px 14px;font:inherit;cursor:pointer}.evd-b:hover{border-color:var(--evd-acc)}' +
    '.evd-b.p{background:var(--evd-acc);border-color:var(--evd-acc);color:#fff}.evd-path{display:block;padding:8px 10px;border-radius:8px;background:var(--evd-soft);word-break:break-all;margin-bottom:10px}' +
    '.evd-box .evd-sw{display:flex!important;flex-direction:row!important;align-items:center!important;justify-content:flex-start!important;gap:10px;cursor:pointer;margin:8px 0!important;text-align:left!important;font:inherit;color:inherit}.evd-box .evd-sw input{flex:none;width:18px!important;height:18px!important;margin:0!important;accent-color:var(--evd-acc)}.evd-box .evd-sw span{flex:1;text-align:left}' +
    '.evd-toast{position:fixed;right:18px;bottom:18px;z-index:2147483001;max-width:min(420px,calc(100vw - 36px));display:flex;gap:10px;align-items:center;padding:11px 14px;border-radius:12px;background:var(--evd-bg);color:var(--evd-fg);border:1px solid var(--evd-line);box-shadow:0 10px 30px rgba(0,0,0,.25);font:14px "Segoe UI",system-ui,sans-serif}' +
    '.evd-toast span{flex:1;min-width:0}.evd-off{position:fixed;left:50%;top:10px;transform:translateX(-50%);z-index:2147483001;padding:7px 14px;border-radius:99px;background:#8a5a12;color:#fff;font:13px "Segoe UI",system-ui,sans-serif}' +
    '.evd-upd{position:fixed;right:18px;bottom:18px;z-index:2147483002;width:min(380px,calc(100vw - 36px));padding:14px 16px;border-radius:14px;background:var(--evd-bg);color:var(--evd-fg);border:1px solid var(--evd-line);box-shadow:0 14px 40px rgba(0,0,0,.28);font:14px "Segoe UI",system-ui,sans-serif;display:grid;gap:8px}' +
    '.evd-upd .t{display:flex;align-items:center;gap:8px}.evd-upd .t b{flex:1}.evd-upd small{color:var(--evd-mute);line-height:1.4}.evd-upd .n{max-height:120px;overflow:auto;white-space:pre-wrap;font-size:12.5px;color:var(--evd-mute);background:var(--evd-soft);border-radius:8px;padding:8px 10px}' +
    '.evd-upov{position:fixed;inset:0;z-index:2147483003;display:grid;place-items:center;background:color-mix(in srgb,var(--evd-bg) 92%,transparent);backdrop-filter:blur(6px);font:14px "Segoe UI",system-ui,sans-serif;color:var(--evd-fg)}.evd-upov>div{display:grid;justify-items:center;gap:10px;text-align:center;max-width:360px;padding:20px}.evd-upov small{color:var(--evd-mute);line-height:1.45}.evd-spin{width:34px;height:34px;border-radius:50%;border:3px solid var(--evd-soft);border-top-color:var(--evd-acc);animation:evdspin 1s linear infinite}@keyframes evdspin{to{transform:rotate(360deg)}}' +
    '.evd-bar{height:8px;border-radius:99px;background:var(--evd-soft);overflow:hidden}.evd-bar i{display:block;height:100%;width:0;background:var(--evd-acc);transition:width .4s ease}.evd-bar.ind i{width:35%;animation:evdind 1.3s ease-in-out infinite}@keyframes evdind{0%{transform:translateX(-100%)}100%{transform:translateX(290%)}}' +
    '.evd-dot{width:8px;height:8px;border-radius:50%;background:var(--evd-acc);flex:none}' +
    ':root{--evd-bg:#fff;--evd-fg:#1d2020;--evd-mute:#5f6763;--evd-line:#dfe3dc;--evd-soft:#f3f5f1;--evd-acc:#66753A}' +
    '@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--evd-bg:#1f2322;--evd-fg:#eceeeb;--evd-mute:#a7aea9;--evd-line:#353b39;--evd-soft:#2a2f2d;--evd-acc:#8FA35A}}' +
    ':root[data-theme="dark"]{--evd-bg:#1f2322;--evd-fg:#eceeeb;--evd-mute:#a7aea9;--evd-line:#353b39;--evd-soft:#2a2f2d;--evd-acc:#8FA35A}';
  function addCss() {
    if (document.getElementById('evd-css')) return;
    var s = document.createElement('style'); s.id = 'evd-css'; s.textContent = css;
    (document.head || document.documentElement).appendChild(s);
    document.documentElement.classList.add('ev-desktop');
  }
  if (document.documentElement) addCss(); else document.addEventListener('DOMContentLoaded', addCss);
  document.addEventListener('DOMContentLoaded', addCss);

  /* no browser right-click menu (still allowed in text boxes and on selected text) */
  document.addEventListener('contextmenu', function (e) {
    var t = e.target;
    if (t && t.closest && t.closest('input,textarea,[contenteditable=""],[contenteditable="true"]')) return;
    if (String(window.getSelection ? window.getSelection() : '')) return;
    e.preventDefault();
  });
  /* no browser shortcuts (save page, view source, history, new window…) */
  window.addEventListener('keydown', function (e) {
    var k = (e.key || '').toLowerCase();
    if ((e.ctrlKey || e.metaKey) && k === ',') { e.preventDefault(); openSettings(); return; }
    if (e.defaultPrevented) return;
    if (k === 'f12' || ((e.ctrlKey || e.metaKey) && (['s', 'u', 'j', 'h', 'n', 't', 'o'].indexOf(k) >= 0 || (e.shiftKey && ['i', 'j', 'c'].indexOf(k) >= 0)))) {
      var t = e.target; if (k === 'o' && t && t.closest && t.closest('input,textarea')) return;
      e.preventDefault();
    }
  });
  window.addEventListener('offline', function () { offline(true); });
  window.addEventListener('online', function () { offline(false); });
  function offline(on) {
    var b = document.getElementById('evd-off');
    if (on && !b && document.body) { b = document.createElement('div'); b.id = 'evd-off'; b.className = 'evd-off'; b.textContent = 'You are offline – your work is kept and saved when the connection is back.'; document.body.appendChild(b); }
    if (!on && b) b.remove();
  }

  linkRules();
  function linkRules() {
    window.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0) return;
      var a = e.target && e.target.closest && e.target.closest('a[href]');
      if (!a || a.hasAttribute('download')) return;
      var raw = a.getAttribute('href') || '';
      if (!raw || raw.charAt(0) === '#' || /^(javascript|blob|data):/i.test(raw)) return;
      var u = a.href;
      if (/^(mailto|tel|msteams|ms-[a-z]+):/i.test(u) || !inApp(u)) { e.preventDefault(); openOutside(u); return; }
      if ((a.target === '_blank' || e.ctrlKey || e.shiftKey) && OURS) { e.preventDefault(); if (isOurs(u)) openWindow(u); else openOutside(u); }
    });
    var _open = window.open;
    window.open = function (u) {
      if (u && typeof u === 'string' && u !== 'about:blank') {
        var abs; try { abs = new URL(u, location.href).href; } catch (e) { abs = u; }
        if (!/^(blob|data):/i.test(abs)) {
          if (isOurs(abs)) { openWindow(abs); return null; }
          if (!SIGNIN.test(host(abs))) { openOutside(abs); return null; }
        }
      }
      return _open.apply(window, arguments);
    };
  }

  /* ---------- settings kept on this computer ---------- */
  var S = { notify: true, folder: '', folderName: '', autosave: true, seenVersion: '' };
  var ready = load();
  function cfgPath() { var t = T(); return t.path.appConfigDir().then(function (d) { return t.path.join(d, 'settings.json').then(function (p) { return { dir: d, file: p }; }); }); }
  function load() {
    var t = T(); if (!t || !t.fs || !t.path) return Promise.resolve(S);
    return cfgPath().then(function (c) { return t.fs.exists(c.file).then(function (x) { return x ? t.fs.readTextFile(c.file) : null; }); })
      .then(function (txt) { if (txt) { try { Object.assign(S, JSON.parse(txt)); } catch (e) {} } return S; })
      .catch(function () { return S; });
  }
  function save() {
    var t = T(); if (!t || !t.fs) return Promise.resolve();
    return cfgPath().then(function (c) {
      return t.fs.mkdir(c.dir, { recursive: true }).catch(function () {}).then(function () { return t.fs.writeTextFile(c.file, JSON.stringify(S)); });
    }).catch(function (e) { console.warn('settings not saved', e); });
  }

  /* ---------- desktop notifications ---------- */
  function notify(title, body) {
    var t = T(); if (!t || !t.notification) return Promise.resolve(false);
    return ready.then(function () {
      if (S.notify === false) return false;
      var n = t.notification;
      return n.isPermissionGranted().then(function (ok) { return ok ? true : n.requestPermission().then(function (p) { return p === 'granted'; }); })
        .then(function (ok) { if (ok) n.sendNotification({ title: String(title || 'Eight Voids'), body: String(body || '') }); return ok; });
    }).catch(function () { return false; });
  }

  /* ---------- saving files into the linked folder (local or OneDrive) ---------- */
  function cleanName(n) { n = String(n || 'Eight Voids file').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim(); return n.slice(0, 150) || 'Eight Voids file'; }
  function freePath(dir, name) {
    var t = T(), dot = name.lastIndexOf('.'), base = dot > 0 ? name.slice(0, dot) : name, ext = dot > 0 ? name.slice(dot) : '';
    function tryN(i) {
      var nm = i ? base + ' (' + i + ')' + ext : name;
      return t.path.join(dir, nm).then(function (p) { return t.fs.exists(p).then(function (x) { return x && i < 200 ? tryN(i + 1) : p; }); });
    }
    return tryN(0);
  }
  function saveBlob(blob, name) {
    var t = T();
    return ready.then(function () {
      if (!t || !t.fs || !S.folder) return null;
      return freePath(S.folder, cleanName(name)).then(function (p) {
        return blob.arrayBuffer().then(function (buf) { return t.fs.writeFile(p, new Uint8Array(buf)); }).then(function () {
          toast('Saved to ' + (S.folderName || 'your folder') + ': ' + p.split(/[\\/]/).pop(), 'Show', function () { reveal(p); });
          if (!document.hasFocus()) notify('File saved', p);
          return p;
        });
      });
    }).catch(function (e) { toast('The file could not be saved in the linked folder. Choose the folder again in Desktop settings.'); console.warn(e); return null; });
  }
  function reveal(p) { var t = T(); try { t.opener.revealItemInDir(p).catch(function () {}); } catch (e) {} }

  /* downloads made by the workspace go to the linked folder when "save automatically" is on */
  var _revoke = URL.revokeObjectURL;
  URL.revokeObjectURL = function (u) { setTimeout(function () { try { _revoke.call(URL, u); } catch (e) {} }, 60000); };
  function grab(a) {
    if (!S.folder || S.autosave === false || !T()) return false;
    var u = a.href; if (!u) return false;
    fetch(u).then(function (r) { return r.blob(); }).then(function (b) { return saveBlob(b, a.getAttribute('download') || decodeURIComponent((u.split('?')[0].split('/').pop()) || 'file')); })
      .catch(function () { toast('The file could not be saved.'); });
    return true;
  }
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest && e.target.closest('a[download]');
    if (a && grab(a)) { e.preventDefault(); e.stopPropagation(); }
  }, true);
  var _click = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (this.hasAttribute('download') && !this.isConnected && grab(this)) return;
    return _click.apply(this, arguments);
  };

  /* ---------- small message at the bottom right ---------- */
  function toast(msg, btn, fn) {
    if (!document.body) return;
    var old = document.getElementById('evd-toast'); if (old) old.remove();
    var d = document.createElement('div'); d.id = 'evd-toast'; d.className = 'evd-toast';
    var s = document.createElement('span'); s.textContent = msg; d.appendChild(s);
    if (btn) { var b = document.createElement('button'); b.className = 'evd-b'; b.textContent = btn; b.onclick = function () { d.remove(); fn(); }; d.appendChild(b); }
    var x = document.createElement('button'); x.className = 'evd-x'; x.textContent = '×'; x.setAttribute('aria-label', 'Close'); x.onclick = function () { d.remove(); }; d.appendChild(x);
    document.body.appendChild(d); setTimeout(function () { if (d.isConnected) d.remove(); }, 9000);
  }

  /* ---------- Desktop settings window ---------- */
  var latest = null;
  function oneDrives() {
    var t = T(); if (!t || !t.path || !t.fs) return Promise.resolve([]);
    return t.path.homeDir().then(function (home) {
      return t.fs.readDir(home).then(function (list) {
        return Promise.all(list.filter(function (e) { return e.isDirectory && /^OneDrive/i.test(e.name); }).map(function (e) {
          return t.path.join(home, e.name).then(function (p) { return { name: e.name, path: p }; });
        }));
      });
    }).catch(function () { return []; });
  }
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function button(txt, fn, primary) { var b = el('button', 'evd-b' + (primary ? ' p' : ''), txt); b.type = 'button'; b.onclick = fn; return b; }
  function openSettings() {
    if (!document.body) return;
    var old = document.getElementById('evd-set'); if (old) old.remove();
    var t = T();
    ready.then(function () { return oneDrives(); }).then(function (od) {
      var ov = el('div', 'evd-ov'); ov.id = 'evd-set'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
      var box = el('div', 'evd-box'); ov.appendChild(box);
      ov.addEventListener('click', function (e) { if (e.target === ov) ov.remove(); });
      ov.addEventListener('keydown', function (e) { if (e.key === 'Escape') ov.remove(); });
      var h = el('div', 'evd-h'); h.appendChild(el('b', '', 'Desktop settings')); var ver = el('small', '', ''); h.appendChild(ver);
      var x = el('button', 'evd-x', '×'); x.setAttribute('aria-label', 'Close'); x.onclick = function () { ov.remove(); }; h.appendChild(x); box.appendChild(h);
      try { t.app.getVersion().then(function (v) { ver.textContent = 'Version ' + v; }); } catch (e) {}

      /* notifications */
      var s1 = el('div', 'evd-s'); s1.appendChild(el('h4', '', 'Notifications'));
      s1.appendChild(el('p', '', 'Eight Voids tells you on your desktop when something needs your attention or your team updates the workspace – even when the window is closed to the taskbar tray.'));
      var sw = el('label', 'evd-sw'); var cb = el('input'); cb.type = 'checkbox'; cb.checked = S.notify !== false; sw.appendChild(cb); sw.appendChild(el('span', '', 'Show desktop notifications'));
      cb.onchange = function () { S.notify = cb.checked; save(); }; s1.appendChild(sw);
      var r1 = el('div', 'evd-row'); r1.appendChild(button('Send a test notification', function () {
        notify('Eight Voids', 'Notifications are working.').then(function (ok) { if (!ok) toast('Notifications are off. Turn them on above, or allow Eight Voids in Windows Settings › System › Notifications.'); });
      })); s1.appendChild(r1); box.appendChild(s1);

      /* linked folder */
      var s2 = el('div', 'evd-s'); s2.appendChild(el('h4', '', 'Save files to a folder'));
      s2.appendChild(el('p', '', 'Link a folder on this computer or in OneDrive. Files you download from Eight Voids are saved there as new copies – nothing already in the folder is changed, moved or deleted.'));
      s2.appendChild(el('span', 'evd-path', S.folder ? S.folder : 'No folder linked – files go to your Downloads folder.'));
      var r2 = el('div', 'evd-row');
      r2.appendChild(button('Choose folder…', function () {
        t.dialog.open({ directory: true, multiple: false, title: 'Choose a folder for Eight Voids files' }).then(function (p) {
          if (!p) return; S.folder = String(p); S.folderName = S.folder.split(/[\\/]/).filter(Boolean).pop() || S.folder; save().then(openSettings);
        }).catch(function () { toast('The folder could not be opened.'); });
      }, true));
      od.forEach(function (o) {
        r2.appendChild(button('Use ' + o.name, function () { S.folder = o.path; S.folderName = o.name; save().then(openSettings); }));
      });
      if (S.folder) {
        r2.appendChild(button('Open folder', function () { try { t.opener.openPath(S.folder).catch(function () { reveal(S.folder); }); } catch (e) { reveal(S.folder); } }));
        r2.appendChild(button('Unlink', function () { S.folder = ''; S.folderName = ''; save().then(openSettings); }));
      }
      s2.appendChild(r2);
      var sw2 = el('label', 'evd-sw'); var cb2 = el('input'); cb2.type = 'checkbox'; cb2.checked = S.autosave !== false; cb2.disabled = !S.folder;
      sw2.appendChild(cb2); sw2.appendChild(el('span', '', 'Save downloads to this folder automatically')); cb2.onchange = function () { S.autosave = cb2.checked; save(); };
      s2.appendChild(sw2); box.appendChild(s2);

      /* files & Outlook (Organise, Outlook bridge, Save to SharePoint – in the workspace, Connections › This computer) */
      var s4 = el('div', 'evd-s'); s4.appendChild(el('h4', '', 'Files & Outlook'));
      s4.appendChild(el('p', '', 'Organise your synced SharePoint / OneDrive folders into the official structure (any file size), bring in emails from your classic Outlook (read only), and save files added in the platform into your synced folder.'));
      var r4 = el('div', 'evd-row'); r4.appendChild(button('Open Files & Outlook', function () {
        ov.remove();
        try { st.view = 'connect'; render(); window.scrollTo(0, 0); setTimeout(function () { var c = document.querySelector('#main .evpc'); if (c) c.scrollIntoView({ block: 'start' }); }, 300); }
        catch (e) { location.href = 'https://app.eightvoids.com/workspace/index.html'; }
      }, true)); s4.appendChild(r4); box.appendChild(s4);

      /* updates */
      var s3 = el('div', 'evd-s'); s3.appendChild(el('h4', '', 'Updates'));
      s3.appendChild(el('p', '', 'The workspace itself always updates automatically. A new desktop installer is only needed when the app’s own features change.'));
      var st = el('p', '', ''); s3.appendChild(st); var r3 = el('div', 'evd-row'); s3.appendChild(r3); box.appendChild(s3);
      function upRow() {
        r3.innerHTML = '';
        if (UP.busy) { st.textContent = 'Updating to version ' + latest.tag + ' – see the card at the bottom right.'; return; }
        if (latest && latest.newer) {
          st.textContent = 'Version ' + latest.tag + ' is ready (you have ' + latest.mine + ').';
          r3.appendChild(button(UP.have === latest.tag.replace(/[^0-9.]/g, '') ? 'Restart now' : 'Update now', function () { ov.remove(); if (UP.have === latest.tag.replace(/[^0-9.]/g, '')) restartNow(); else startUpdate(); }, true));
          r3.appendChild(button('What’s new', function () { ov.remove(); showUpdate(true); }));
        } else st.textContent = latest ? 'You have the latest version (' + latest.mine + '). Checked ' + new Date(latest.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + '.' : 'Not checked yet.';
        r3.appendChild(button('Check for updates', function () { st.textContent = 'Checking…'; r3.innerHTML = ''; checkUpdate(true).then(upRow); }));
      }
      upRow();

      document.body.appendChild(ov); x.focus();
    });
  }

  /* ---------- updates: checked when the app starts and every 6 hours ----------
     Windows: "Update now" downloads the new installer inside the app (progress bar and time left), then opens it;
     Eight Voids closes while it installs. Mac: the new .dmg downloads in the browser. Nothing installs without your click. */
  var UP = { busy: false };
  function newer(a, b) { a = String(a).replace(/^v/, '').split('.').map(Number); b = String(b).replace(/^v/, '').split('.').map(Number); for (var i = 0; i < 3; i++) { if ((a[i] || 0) > (b[i] || 0)) return true; if ((a[i] || 0) < (b[i] || 0)) return false; } return false; }
  function isWin() { return /Windows/i.test(navigator.userAgent); }
  function mb(n) { return (n / 1048576).toFixed(n < 10485760 ? 1 : 0) + ' MB'; }
  function dur(ms) { if (!(ms > 0) || !isFinite(ms)) return ''; var s = Math.round(ms / 1000); if (s < 45) return 'less than a minute'; var m = Math.round(s / 60); if (m < 60) return 'about ' + m + ' min'; return 'about ' + Math.floor(m / 60) + ' h ' + (m % 60) + ' min'; }
  function checkUpdate(manual) {
    var t = T(); if (!t || !t.app) return Promise.resolve(null);
    return Promise.all([t.app.getVersion(), fetch('https://api.github.com/repos/Eightvoids/desktop/releases/latest', { headers: { Accept: 'application/vnd.github+json' }, cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; })])
      .then(function (r) {
        var mine = r[0], rel = r[1]; if (!rel || !rel.tag_name) return null;
        function asset(n) { var a = (rel.assets || []).filter(function (x) { return x.name === n; })[0]; return a ? { url: a.browser_download_url, size: a.size } : null; }
        latest = { tag: rel.tag_name.replace(/^v/, ''), mine: mine, newer: newer(rel.tag_name, mine), notes: String(rel.body || '').trim(), exe: asset('EightVoids-Windows-Setup.exe'), dmg: asset('EightVoids-macOS.dmg'), at: Date.now() };
        if (latest.newer) {
          return ready.then(function () {
            /* Windows (1.3.7+): like Autodesk – the new version downloads quietly in the background first */
            if (isWin() && latest.exe && t.core && t.core.invoke) {
              return prefetch().then(function (ok) {
                if (ok) {
                  var later0 = S.updLater && S.updLater.tag === latest.tag && S.updLater.until > Date.now();
                  if (manual || !later0) showReady();
                  if (S.seenVersion !== latest.tag) { S.seenVersion = latest.tag; save(); notify('Eight Voids ' + latest.tag + ' is ready', 'Downloaded in the background. Restart Eight Voids to finish – or it installs by itself when you quit.'); }
                } else if (manual) showUpdate(false);
                return latest;
              });
            }
            var later = S.updLater && S.updLater.tag === latest.tag && S.updLater.until > Date.now();
            if (manual || !later) showUpdate(false);
            if (S.seenVersion !== latest.tag) { S.seenVersion = latest.tag; save(); notify('Eight Voids update', 'Version ' + latest.tag + ' of the desktop app is ready. Click Update now in the app.'); }
            return latest;
          });
        }
        if (manual) toast('You have the latest version (' + mine + ').');
        return latest;
      }).catch(function () { if (manual) toast('Updates could not be checked – are you online?'); return null; });
  }
  /* quiet background download of the new installer (nothing is installed until you restart or quit) */
  function vOf() { return latest.tag.replace(/[^0-9.]/g, ''); }
  function prefetch() {
    var t = T(), v = vOf();
    if (UP.have === v) return Promise.resolve(true);
    if (UP.dl) { if (UP.dlv === v) return UP.dl; }
    UP.dlv = v;
    UP.dl = t.path.appCacheDir().then(function (dir) { return t.path.join(dir, 'EightVoids-Update-' + v + '.exe'); })
      .then(function (p) { return t.fs.exists(p).then(function (x) { if (x) return true; return t.core.invoke('update_download', { url: latest.exe.url, version: v }).then(function () { return true; }); }); })
      .then(function () { UP.have = v; UP.dl = null; return true; }, function () { UP.dl = null; return false; });
    return UP.dl;
  }
  function showReady() {
    if (!latest || UP.busy) return; var d = card(); if (!d) return; d.innerHTML = '';
    var tt = el('div', 't'); tt.appendChild(el('span', 'evd-dot')); tt.appendChild(el('b', '', 'Eight Voids ' + latest.tag + ' is ready'));
    var x = el('button', 'evd-x', '×'); x.setAttribute('aria-label', 'Close'); x.onclick = later; tt.appendChild(x); d.appendChild(tt);
    d.appendChild(el('small', '', 'Downloaded in the background. Restart to finish – it installs quietly (no installer window) and Eight Voids opens again in about a minute. Your sign-in, settings and work stay.'));
    var nb = null;
    if (latest.notes) { nb = el('div', 'n', latest.notes.slice(0, 1200)); nb.hidden = true; d.appendChild(nb); }
    var r = el('div', 'evd-row');
    r.appendChild(button('Restart now', restartNow, true));
    r.appendChild(button('Later', later));
    if (nb) r.appendChild(button('What’s new', function () { nb.hidden = !nb.hidden; }));
    d.appendChild(r);
    function later() {
      S.updLater = { tag: latest.tag, until: Date.now() + 20 * 3600 * 1000 }; save(); d.remove();
      T().core.invoke('update_pending', { version: vOf() }).then(function () { toast('Eight Voids ' + latest.tag + ' installs by itself when you quit the app (tray icon › Quit).'); }, function () {});
    }
  }
  function restartNow() {
    var t = T(); if (UP.busy) return; UP.busy = true; var d = card(); d.innerHTML = '';
    /* remembered on disk: after Eight Voids opens again it checks that the new version is really there */
    S.updTry = { v: vOf(), at: Date.now() }; save();
    var tt = el('div', 't'); tt.appendChild(el('span', 'evd-dot')); tt.appendChild(el('b', '', 'Installing Eight Voids ' + latest.tag + '…')); d.appendChild(tt);
    d.appendChild(el('small', '', 'Eight Voids closes for a moment, installs the update quietly and opens again by itself.'));
    /* the whole window shows the update, so nothing else pops up */
    var ov = el('div', 'evd-upov'); ov.innerHTML = '<div><div class="evd-spin"></div><b>Updating Eight Voids to ' + latest.tag + '</b><small>Eight Voids closes for a moment and opens again by itself – about a minute. Nothing to click.</small></div>'; document.body.appendChild(ov);
    setTimeout(function () {
      /* safety: if Eight Voids is still open after 40 seconds, say so and offer the normal installer */
      setTimeout(function () { if (ov.parentNode) { ov.remove(); failCard('Eight Voids did not close for the update.'); } }, 40000);
      t.core.invoke('update_install', { version: vOf(), silent: true }).catch(function (e) {
        ov.remove(); UP.busy = false; d.innerHTML = ''; var t2 = el('div', 't'); t2.appendChild(el('b', '', 'The update did not start')); d.appendChild(t2);
        d.appendChild(el('small', '', String((e && e.message) || e || '').slice(0, 200)));
        var r2 = el('div', 'evd-row'); r2.appendChild(button('Install with the installer', function () { UP.busy = false; startUpdate(); }, true)); d.appendChild(r2);
      });
    }, 1200);
  }
  /* the update did not install: one clear card with the way that always works (the normal installer) */
  function failCard(why) {
    UP.busy = false; var d = card(); if (!d) return; d.innerHTML = '';
    var v = (S.updTry && S.updTry.v) || (latest && latest.tag) || '';
    var tt = el('div', 't'); tt.appendChild(el('b', '', 'Eight Voids ' + v + ' was not installed yet')); var x = el('button', 'evd-x', '×'); x.onclick = function () { d.remove(); }; tt.appendChild(x); d.appendChild(tt);
    d.appendChild(el('small', '', (why ? why + ' ' : '') + 'Click Install with the installer – Eight Voids closes, the installer opens (if Windows asks: More info › Run anyway), then open Eight Voids again. Your sign-in and settings stay.'));
    var r = el('div', 'evd-row');
    r.appendChild(button('Install with the installer', function () { S.updTry = null; save(); (latest ? Promise.resolve(latest) : checkUpdate(false)).then(function () { if (latest && latest.exe) { UP.busy = false; startUpdate(); } else openOutside('https://github.com/Eightvoids/desktop/releases/latest'); }); }, true));
    r.appendChild(button('Try again', function () { restartNow(); }));
    d.appendChild(r);
  }
  /* after a Restart now: is the new version really installed? */
  function afterTry() {
    var t = T(); if (!t || !t.app || !S.updTry) return;
    t.app.getVersion().then(function (mine) {
      var tr = S.updTry; if (!tr) return;
      if (!newer(tr.v, mine)) { S.updTry = null; save(); toast('Eight Voids is updated to ' + mine + '.'); return; }
      if (Date.now() - tr.at > 3 * 24 * 3600 * 1000) { S.updTry = null; save(); return; }
      failCard('The quick update did not finish (still ' + mine + ').');
    }).catch(function () {});
  }
  function card() {
    var d = document.getElementById('evd-upd');
    if (!d && document.body) { d = el('div', 'evd-upd'); d.id = 'evd-upd'; d.setAttribute('role', 'status'); document.body.appendChild(d); }
    return d;
  }
  function showUpdate(open) {
    if (!latest || UP.busy) return; var d = card(); if (!d) return; d.innerHTML = '';
    var tt = el('div', 't'); tt.appendChild(el('span', 'evd-dot')); tt.appendChild(el('b', '', 'Update ready – Eight Voids ' + latest.tag));
    var x = el('button', 'evd-x', '×'); x.setAttribute('aria-label', 'Close'); x.onclick = later; tt.appendChild(x); d.appendChild(tt);
    var size = isWin() ? latest.exe : latest.dmg;
    d.appendChild(el('small', '', 'You have version ' + latest.mine + '.' + (size ? ' Download ' + mb(size.size) + '.' : '') + (isWin() ? ' Eight Voids closes while it installs and you can open it again straight after.' : '')));
    var nb = null;
    if (latest.notes) { nb = el('div', 'n', latest.notes.slice(0, 1200)); nb.hidden = !open; d.appendChild(nb); }
    var r = el('div', 'evd-row');
    r.appendChild(button('Update now', startUpdate, true));
    if (nb) r.appendChild(button('What’s new', function () { nb.hidden = !nb.hidden; }));
    r.appendChild(button('Later', later));
    d.appendChild(r);
    function later() { S.updLater = { tag: latest.tag, until: Date.now() + 20 * 3600 * 1000 }; save(); d.remove(); }
  }
  function startUpdate() {
    var t = T(); if (!latest) return;
    if (!isWin() || !latest.exe || !t.core || !t.core.invoke) { openOutside((isWin() ? latest.exe : latest.dmg || {}).url || RELEASES); var c0 = document.getElementById('evd-upd'); if (c0) c0.remove(); toast('The new version is downloading in your browser – open it when it finishes.'); return; }
    if (UP.busy) return; UP.busy = true;
    var d = card(); d.innerHTML = '';
    var tt = el('div', 't'); tt.appendChild(el('span', 'evd-dot')); tt.appendChild(el('b', '', 'Updating to Eight Voids ' + latest.tag)); d.appendChild(tt);
    var bar = el('div', 'evd-bar'); var bi = el('i'); bar.appendChild(bi); d.appendChild(bar);
    var info = el('small', '', 'Starting the download…'); d.appendChild(info);
    var v = latest.tag.replace(/[^0-9.]/g, ''), total = latest.exe.size || 0, t0 = Date.now(), part = null, timer = null;
    t.path.appCacheDir().then(function (dir) { return t.path.join(dir, 'EightVoids-Update-' + v + '.exe.part'); }).then(function (p) { part = p; });
    timer = setInterval(function () {
      if (!part) return;
      t.fs.stat(part).then(function (st) {
        var n = +st.size || 0, el2 = Date.now() - t0, pc = total ? Math.min(99, Math.floor(n / total * 100)) : 0;
        bi.style.width = pc + '%';
        var left = n > 0 && total && el2 > 3000 ? dur((total - n) / (n / el2)) : '';
        info.textContent = pc + '% · ' + mb(n) + (total ? ' of ' + mb(total) : '') + (left ? ' · ' + left + ' left' : ' · working out the time left…');
      }).catch(function () {});
    }, 700);
    t.core.invoke('update_download', { url: latest.exe.url, version: v }).then(function () {
      clearInterval(timer); bi.style.width = '100%';
      info.textContent = 'Downloaded. Opening the installer – Eight Voids closes now. If Windows asks, click More info › Run anyway.';
      return new Promise(function (r) { setTimeout(r, 2500); }).then(function () { return t.core.invoke('update_install', { version: v }); });
    }).catch(function (e) {
      clearInterval(timer); UP.busy = false; d.innerHTML = '';
      var t2 = el('div', 't'); t2.appendChild(el('b', '', 'The update did not finish')); var x2 = el('button', 'evd-x', '×'); x2.onclick = function () { d.remove(); }; t2.appendChild(x2); d.appendChild(t2);
      d.appendChild(el('small', '', String((e && e.message) || e || 'The download stopped.').slice(0, 200)));
      var r2 = el('div', 'evd-row'); r2.appendChild(button('Try again', startUpdate, true)); r2.appendChild(button('Download in browser', function () { openOutside(latest.exe.url); d.remove(); })); d.appendChild(r2);
    });
  }

  /* ---------- what the workspace and the tray menu can use ---------- */
  window.evDesktop = {
    isDesktop: true,
    checkUpdate: function () { return checkUpdate(true); },
    notify: notify,
    settings: openSettings,
    saveFile: saveBlob,
    folder: function () { return ready.then(function () { return S.folder ? { path: S.folder, name: S.folderName } : null; }); },
    openOutside: openOutside
  };
  function onTray() {
    var t = T(); if (!t || !t.event) return;
    t.event.listen('ev-settings', function () { openSettings(); }).catch(function () {});
  }
  window.addEventListener('load', function () {
    onTray();
    if (/^app\./i.test(H)) { setTimeout(function () { ready.then(function () { return checkUpdate(false); }).then(afterTry, afterTry); }, 8000); setInterval(function () { checkUpdate(false); }, 6 * 3600 * 1000); }
    if (!navigator.onLine) offline(true);
  });
})();
