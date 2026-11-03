/* store.js — 文档模型 / 选择 / 历史 / 持久化 */
(function () {
  'use strict';

  const Store = {
    doc: null,
    sel: [],
    zoom: 1,
    safe: false,
    playing: false,
    _hist: [],
    _hi: -1,
    _subs: {},
    _silentDepth: 0
  };

  Store.on = function (ev, fn) {
    (this._subs[ev] = this._subs[ev] || []).push(fn);
    return () => {
      this._subs[ev] = this._subs[ev].filter((f) => f !== fn);
    };
  };
  Store.emit = function (ev, data) {
    (this._subs[ev] || []).forEach((fn) => {
      try { fn(data); } catch (e) { console.warn('[store]', ev, e); }
    });
  };

  Store.newDoc = function (frame, palId) {
    const p = DATA.palById(palId || 'midnight');
    const f = frame || DATA.FRAMES[0];
    return {
      name: '未命名海报',
      frameId: f.id,
      paletteId: p.id,
      canvas: {
        w: f.w, h: f.h,
        bg: p.bg,
        overlay: { grain: 16, vignette: 22, halftone: 0, scan: 0, leak: 0, mesh: 0, grid: 0 }
      },
      layers: []
    };
  };

  Store.init = function (doc) {
    this.doc = doc;
    this.sel = [];
    this._hist = [];
    this._hi = -1;
    this.commit('新建');
    this.emit('doc');
  };

  Store.palette = function () { return DATA.palById(this.doc.paletteId); };

  Store.commit = function (label) {
    if (this._silentDepth > 0) { this._dirty = true; return; }
    const snap = JSON.stringify(this.doc);
    const cur = this._hist[this._hi];
    if (cur && cur.snap === snap) return;
    this._hist = this._hist.slice(0, this._hi + 1);
    this._hist.push({ snap, label: label || '编辑', t: Date.now() });
    if (this._hist.length > 64) this._hist.shift();
    this._hi = this._hist.length - 1;
    this.emit('history');
    this._autosave();
  };

  Store.undo = function () {
    if (this._hi <= 0) return false;
    this._hi--;
    this.doc = JSON.parse(this._hist[this._hi].snap);
    this.sel = this.sel.filter((id) => this.byId(id));
    this.emit('doc'); this.emit('history'); this.emit('sel');
    this._autosave();
    return true;
  };
  Store.redo = function () {
    if (this._hi >= this._hist.length - 1) return false;
    this._hi++;
    this.doc = JSON.parse(this._hist[this._hi].snap);
    this.sel = this.sel.filter((id) => this.byId(id));
    this.emit('doc'); this.emit('history'); this.emit('sel');
    this._autosave();
    return true;
  };
  Store.canUndo = function () { return this._hi > 0; };
  Store.canRedo = function () { return this._hi < this._hist.length - 1; };

  Store._autosave = U.debounce(function () {
    try {
      const s = JSON.stringify(window.Store.doc);
      if (s.length > 4.2 * 1024 * 1024) return;
      localStorage.setItem('plaque.autosave', s);
    } catch (e) { /* 超额时忽略 */ }
  }, 900);

  Store.restoreAutosave = function () {
    try {
      const raw = localStorage.getItem('plaque.autosave');
      if (!raw) return null;
      const d = JSON.parse(raw);
      if (!d || !d.canvas || !Array.isArray(d.layers)) return null;
      return d;
    } catch (e) { return null; }
  };

  /* ---------- 查询 ---------- */
  Store.byId = function (id) { return this.doc.layers.find((l) => l.id === id); };
  Store.index = function (id) { return this.doc.layers.findIndex((l) => l.id === id); };
  Store.selLayers = function () { return this.sel.map((id) => this.byId(id)).filter(Boolean); };
  Store.one = function () { return this.sel.length === 1 ? this.byId(this.sel[0]) : null; };

  /* ---------- 变更 ---------- */
  Store.add = function (layer, opts) {
    opts = opts || {};
    this.doc.layers.push(layer);
    if (opts.select !== false) this.sel = [layer.id];
    this.emit('doc'); this.emit('sel');
    if (opts.commit !== false) this.commit(opts.label || '添加图层');
    return layer;
  };
  Store.addMany = function (layers, opts) {
    opts = opts || {};
    layers.forEach((l) => this.doc.layers.push(l));
    this.sel = opts.select === false ? this.sel : layers.map((l) => l.id);
    this.emit('doc'); this.emit('sel');
    if (opts.commit !== false) this.commit(opts.label || '添加内容');
    return layers;
  };
  Store.update = function (id, patch, opts) {
    const l = this.byId(id);
    if (!l) return null;
    Object.assign(l, patch);
    this.emit('doc', { live: true, id });
    if (!opts || opts.commit !== false) this.commit((opts && opts.label) || '修改');
    return l;
  };
  Store.updateSel = function (patch, opts) {
    this.sel.forEach((id) => {
      const l = this.byId(id);
      if (l) Object.assign(l, patch);
    });
    this.emit('doc', { live: true });
    if (!opts || opts.commit !== false) this.commit((opts && opts.label) || '修改');
  };
  Store.remove = function (ids) {
    ids = ids || this.sel;
    if (typeof ids === 'string') ids = [ids];
    if (!ids.length) return;
    this.doc.layers = this.doc.layers.filter((l) => ids.indexOf(l.id) < 0);
    this.sel = this.sel.filter((id) => ids.indexOf(id) < 0);
    this.emit('doc'); this.emit('sel');
    this.commit('删除');
  };
  Store.duplicate = function (ids) {
    ids = ids || this.sel;
    if (typeof ids === 'string') ids = [ids];
    const out = [];
    ids.forEach((id) => {
      const l = this.byId(id);
      if (!l) return;
      const c = U.clone(l);
      c.id = U.uid();
      c.x += Math.round(24 / this.zoom);
      c.y += Math.round(24 / this.zoom);
      c.name = l.name + ' 副本';
      this.doc.layers.push(c);
      out.push(c.id);
    });
    if (out.length) {
      this.sel = out;
      this.emit('doc'); this.emit('sel');
      this.commit('复制');
    }
  };
  Store.select = function (ids, opts) {
    opts = opts || {};
    if (opts.add) {
      const set = new Set(this.sel);
      ids.forEach((id) => (set.has(id) ? set.delete(id) : set.add(id)));
      this.sel = Array.from(set);
    } else this.sel = ids.slice();
    this.emit('sel');
  };
  Store.clearSel = function () { this.sel = []; this.emit('sel'); };

  Store.reorder = function (id, dir) {
    const i = this.index(id);
    if (i < 0) return;
    const j = dir === 'up' ? i + 1 : dir === 'down' ? i - 1 : dir === 'front' ? this.doc.layers.length - 1 : 0;
    if (j < 0 || j >= this.doc.layers.length || j === i) return;
    const [l] = this.doc.layers.splice(i, 1);
    this.doc.layers.splice(j, 0, l);
    this.emit('doc'); this.commit('调整层级');
  };

  Store.replaceAll = function (layers, label) {
    this.doc.layers = layers;
    this.sel = [];
    this.emit('doc'); this.emit('sel');
    this.commit(label || '替换内容');
  };

  Store.setFrame = function (frame) {
    if (typeof frame === 'string') frame = DATA.frameById(frame);
    if (!frame || !frame.w || !frame.h) return;
    const old = this.doc.canvas;
    const sx = frame.w / old.w, sy = frame.h / old.h;
    const sc = Math.min(sx, sy);
    this.doc.frameId = frame.id;
    this.doc.canvas.w = frame.w;
    this.doc.canvas.h = frame.h;
    // 按比例迁移图层（位置/尺寸/字号/圆角/描边/阴影一起缩放，避免放大后比例走样）
    this.doc.layers.forEach((l) => {
      l.x *= sx; l.y *= sy; l.w *= sx; l.h *= sy;
      if (l.type === 'text') {
        l.size *= sc;
        if (l.tracking) l.tracking *= sc;
      }
      if (typeof l.radius === 'number') l.radius *= sc;
      if (typeof l.strokeW === 'number') l.strokeW *= sc;
      if (l.shadow) { l.shadow.x *= sx; l.shadow.y *= sy; l.shadow.blur *= sc; }
    });
    this.emit('doc'); this.commit('改尺寸');
  };

  Store.applyPalette = function (palId) {
    const oldP = DATA.palById(this.doc.paletteId);
    const p = DATA.palById(palId);
    const map = {};
    ['bg', 'fg', 'accent', 'muted', 'extra'].forEach((k) => {
      map[oldP[k].toLowerCase()] = p[k];
    });
    const conv = (v) => (v && map[String(v).toLowerCase()]) || v;
    this.doc.paletteId = p.id;
    this.doc.canvas.bg = p.bg;
    this.doc.layers.forEach((l) => {
      l.fill = conv(l.fill);
      l.fill2 = conv(l.fill2);
      l.color = conv(l.color);
      l.stroke = conv(l.stroke);
      if (l.textFx === 'gradient' && l.fill2) l.fill2 = conv(l.fill2);
    });
    this.emit('doc'); this.commit('换配色');
    return p;
  };

  Store.stats = function () {
    const ai = this.doc.layers.filter((l) => l.type === 'ai').length;
    return { layers: this.doc.layers.length, ai };
  };

  /* 选中图层整体对齐 */
  Store.align = function (mode) {
    const ls = this.selLayers();
    if (!ls.length) return;
    const cw = this.doc.canvas.w, ch = this.doc.canvas.h;
    if (ls.length === 1) {
      const l = ls[0];
      if (mode === 'left') l.x = 0;
      if (mode === 'hcenter') l.x = (cw - l.w) / 2;
      if (mode === 'right') l.x = cw - l.w;
      if (mode === 'top') l.y = 0;
      if (mode === 'vcenter') l.y = (ch - l.h) / 2;
      if (mode === 'bottom') l.y = ch - l.h;
    } else {
      const minX = Math.min.apply(null, ls.map((l) => l.x));
      const maxX = Math.max.apply(null, ls.map((l) => l.x + l.w));
      const minY = Math.min.apply(null, ls.map((l) => l.y));
      const maxY = Math.max.apply(null, ls.map((l) => l.y + l.h));
      ls.forEach((l) => {
        if (mode === 'left') l.x = minX;
        if (mode === 'right') l.x = maxX - l.w;
        if (mode === 'hcenter') l.x = (minX + maxX) / 2 - l.w / 2;
        if (mode === 'top') l.y = minY;
        if (mode === 'bottom') l.y = maxY - l.h;
        if (mode === 'vcenter') l.y = (minY + maxY) / 2 - l.h / 2;
      });
    }
    this.emit('doc'); this.commit('对齐');
  };

  window.Store = Store;
})();
