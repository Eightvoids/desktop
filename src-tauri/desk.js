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
      var r3 = el('div', 'evd-row'); var st = el('span', '', ''); r3.appendChild(st);
      if (latest && latest.newer) r3.appendChild(button('Download version ' + latest.tag, function () { openOutside(RELEASES); }, true)); else st.textContent = latest ? 'You have the latest version.' : '';
      s3.appendChild(r3); box.appendChild(s3);

      document.body.appendChild(ov); x.focus();
    });
  }

  /* ---------- new desktop version available? (checked once a day) ---------- */
  function newer(a, b) { a = String(a).replace(/^v/, '').split('.').map(Number); b = String(b).replace(/^v/, '').split('.').map(Number); for (var i = 0; i < 3; i++) { if ((a[i] || 0) > (b[i] || 0)) return true; if ((a[i] || 0) < (b[i] || 0)) return false; } return false; }
  function checkUpdate() {
    var t = T(); if (!t || !t.app) return;
    Promise.all([t.app.getVersion(), fetch('https://api.github.com/repos/Eightvoids/desktop/releases/latest', { headers: { Accept: 'application/vnd.github+json' } }).then(function (r) { return r.ok ? r.json() : null; })])
      .then(function (r) {
        var mine = r[0], rel = r[1]; if (!rel || !rel.tag_name) return;
        latest = { tag: rel.tag_name.replace(/^v/, ''), newer: newer(rel.tag_name, mine) };
        if (latest.newer && S.seenVersion !== latest.tag) {
          S.seenVersion = latest.tag; save();
          notify('Eight Voids update', 'Version ' + latest.tag + ' of the desktop app is ready. Open Desktop settings to download it.');
          toast('A new version of the Eight Voids desktop app is ready.', 'Download', function () { openOutside(RELEASES); });
        }
      }).catch(function () {});
  }

  /* ---------- what the workspace and the tray menu can use ---------- */
  window.evDesktop = {
    isDesktop: true,
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
    if (/^app\./i.test(H)) setTimeout(checkUpdate, 8000);
    if (!navigator.onLine) offline(true);
  });
})();
