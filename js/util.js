/* util.js — 小工具集 */
(function () {
  'use strict';

  const U = {};

  U.$ = (sel, root) => (root || document).querySelector(sel);
  U.$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  U.el = function (tag, cls, html) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };

  let _seq = 0;
  U.uid = function (p) {
    _seq += 1;
    return (p || 'l') + '_' + Date.now().toString(36) + _seq.toString(36) + Math.random().toString(36).slice(2, 6);
  };

  U.clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  U.round = (v, p) => {
    const m = Math.pow(10, p || 0);
    return Math.round(v * m) / m;
  };
  U.escapeHtml = (s) =>
    String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  U.escapeAttr = U.escapeHtml;
  U.clone = (o) => JSON.parse(JSON.stringify(o));

  U.debounce = function (fn, ms) {
    let t;
    return function () {
      const args = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(() => fn.apply(self, args), ms);
    };
  };

  U.sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  U.hexToRgb = function (hex) {
    let h = String(hex || '#000').replace('#', '').trim();
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    if (h.length !== 6) h = '000000';
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
  };
  U.rgba = function (hex, a) {
    const c = U.hexToRgb(hex);
    return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + (a == null ? 1 : a) + ')';
  };
  U.lum = function (hex) {
    const c = U.hexToRgb(hex);
    const f = (v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };
  U.contrast = function (a, b) {
    const l1 = U.lum(a), l2 = U.lum(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  };
  U.mix = function (a, b, t) {
    const x = U.hexToRgb(a), y = U.hexToRgb(b);
    const m = (i) => Math.round(x[i] + (y[i] - x[i]) * t);
    return '#' + [m('r'), m('g'), m('b')].map((v) => v.toString(16).padStart(2, '0')).join('');
  };

  U.download = function (blobOrText, filename, mime) {
    let blob = blobOrText;
    if (!(blobOrText instanceof Blob)) blob = new Blob([blobOrText], { type: mime || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 1200);
  };

  U.toast = function (msg, type, ms) {
    const box = U.$('#toasts');
    if (!box) return;
    const t = U.el('div', 'toast' + (type ? ' ' + type : ''), '<span class="bar"></span><span>' + U.escapeHtml(msg) + '</span>');
    box.appendChild(t);
    setTimeout(() => {
      t.style.transition = 'opacity .25s, transform .25s';
      t.style.opacity = '0';
      t.style.transform = 'translateY(8px)';
      setTimeout(() => t.remove(), 280);
    }, ms || 2400);
  };

  U.busy = function (on, text) {
    const b = U.$('#busy');
    if (!b) return;
    if (on) {
      b.hidden = false;
      U.$('#busyText').textContent = text || '处理中…';
    } else b.hidden = true;
  };

  U.saveLS = function (k, v) {
    try {
      localStorage.setItem('plaque.' + k, JSON.stringify(v));
      return true;
    } catch (e) {
      return false;
    }
  };
  U.loadLS = function (k, dflt) {
    try {
      const raw = localStorage.getItem('plaque.' + k);
      return raw ? JSON.parse(raw) : dflt;
    } catch (e) {
      return dflt;
    }
  };

  U.readFile = function (file, asDataURL) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      if (asDataURL) r.readAsDataURL(file);
      else r.readAsText(file);
    });
  };

  U.seeded = function (seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  U.pickFiles = function (accept, multiple) {
    return new Promise((resolve) => {
      const inp = document.createElement('input');
      inp.type = 'file';
      if (accept) inp.accept = accept;
      inp.multiple = !!multiple;
      inp.onchange = () => resolve(Array.from(inp.files || []));
      inp.click();
    });
  };

  U.fitText = function (s, n) {
    s = String(s || '');
    return s.length > n ? s.slice(0, n - 1) + '…' : s;
  };

  U.dateStamp = function () {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes());
  };

  window.U = U;
})();
