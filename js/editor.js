/* editor.js — 舞台交互：选择 / 拖动 / 缩放 / 旋转 / 吸附 / 快捷键 / 画布缩放 */
(function () {
  'use strict';

  const ED = {
    zoom: 1,
    clip: null,
    _drag: null,
    _space: false,
    _editing: null
  };

  const CSS = `
#stageInner{position:relative}
#poster{position:absolute;left:0;top:0;transform-origin:0 0;cursor:default}
#stage,#poster,.poster .layer{-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}
.poster .layer{cursor:move}
.poster .layer img{-webkit-user-drag:none;user-drag:none}
.poster .layer.is-locked{cursor:default}
#poster .bx.ai iframe{pointer-events:none}
.sel-box{position:absolute;z-index:9400;pointer-events:none}
.sel-box .sb-in{position:absolute;inset:0;outline:1px solid #35E08A;outline-offset:0}
.sel-box .hd{position:absolute;width:9px;height:9px;background:#080A0F;border:1.5px solid #35E08A;border-radius:2px;
  pointer-events:auto;transform-origin:center center}
.sel-box .hd.rot{width:11px;height:11px;border-radius:50%;background:#35E08A}
.sel-box .hd.nw{cursor:nwse-resize}.sel-box .hd.n{cursor:ns-resize}.sel-box .hd.ne{cursor:nesw-resize}
.sel-box .hd.e{cursor:ew-resize}.sel-box .hd.se{cursor:nwse-resize}.sel-box .hd.s{cursor:ns-resize}
.sel-box .hd.sw{cursor:nesw-resize}.sel-box .hd.w{cursor:ew-resize}
.guide{position:absolute;background:#FF4D8D;z-index:9450;pointer-events:none}
.guide.v{width:1px;top:0;bottom:0}
.guide.h{height:1px;left:0;right:0}
.marquee{position:absolute;z-index:9460;border:1px dashed #35E08A;background:rgba(53,224,138,.08);pointer-events:none}
.size-badge{position:absolute;z-index:9470;padding:2px 6px;border-radius:5px;background:#35E08A;color:#062318;
  font:600 11px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:nowrap;pointer-events:none;
  transform-origin:100% 0}
.editing-tx{outline:1px dashed rgba(53,224,138,.9) !important;cursor:text}
`;

  function injectCSS() {
    if (document.getElementById('editor-css')) return;
    const s = document.createElement('style');
    s.id = 'editor-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  const poster = () => document.getElementById('poster');
  const viewport = () => document.getElementById('viewport');
  const inner = () => document.getElementById('stageInner');

  function pt(e) {
    const p = poster();
    const r = p.getBoundingClientRect();
    return { x: (e.clientX - r.left) / ED.zoom, y: (e.clientY - r.top) / ED.zoom };
  }

  /* ---------------- 缩放 ---------------- */
  ED.setZoom = function (z, anchor) {
    const doc = Store.doc;
    if (!doc) return;
    const vp = viewport();
    z = U.clamp(z, 0.04, 4);
    const old = ED.zoom;
    if (anchor && vp) {
      const r = vp.getBoundingClientRect();
      const ax = anchor.clientX - r.left + vp.scrollLeft;
      const ay = anchor.clientY - r.top + vp.scrollTop;
      ED.zoom = z;
      applyZoom();
      vp.scrollLeft = ax * (z / old) - (anchor.clientX - r.left);
      vp.scrollTop = ay * (z / old) - (anchor.clientY - r.top);
    } else {
      ED.zoom = z;
      applyZoom();
    }
    ED.syncSel();
    const zl = document.getElementById('btnZoomFit');
    if (zl) zl.textContent = Math.round(ED.zoom * 100) + '%';
  };

  function applyZoom() {
    const doc = Store.doc;
    const p = poster(), inn = inner();
    if (!p || !doc) return;
    p.style.transform = 'scale(' + ED.zoom + ')';
    if (inn) {
      inn.style.width = doc.canvas.w * ED.zoom + 'px';
      inn.style.height = doc.canvas.h * ED.zoom + 'px';
    }
    Store.zoom = ED.zoom;
  }

  ED.fit = function () {
    const doc = Store.doc;
    const vp = viewport();
    if (!doc || !vp) return;
    const pad = 72;
    const z = Math.min((vp.clientWidth - pad) / doc.canvas.w, (vp.clientHeight - pad) / doc.canvas.h);
    ED.zoom = U.clamp(z, 0.04, 1.6);
    applyZoom();
    ED.syncSel();
    const zl = document.getElementById('btnZoomFit');
    if (zl) zl.textContent = Math.round(ED.zoom * 100) + '%';
  };

  ED.zoomBy = function (f, anchor) { ED.setZoom(ED.zoom * f, anchor); };

  /* ---------------- 选择框 ---------------- */
  ED.syncSel = function () {
    const p = poster();
    if (!p) return;
    const old = p.querySelector('.sel-box');
    if (old) old.remove();
    const ls = Store.selLayers();
    if (!ls.length) return;
    const one = ls.length === 1 ? ls[0] : null;
    let x, y, w, h, rot = 0;
    if (one) {
      x = one.x; y = one.y; w = one.w; h = one.h; rot = one.rot || 0;
    } else {
      x = Math.min.apply(null, ls.map((l) => l.x));
      y = Math.min.apply(null, ls.map((l) => l.y));
      w = Math.max.apply(null, ls.map((l) => l.x + l.w)) - x;
      h = Math.max.apply(null, ls.map((l) => l.y + l.h)) - y;
    }
    const box = document.createElement('div');
    box.className = 'sel-box';
    box.style.cssText = 'left:' + x + 'px;top:' + y + 'px;width:' + w + 'px;height:' + h + 'px;transform:rotate(' + rot + 'deg)';
    const inb = document.createElement('div');
    inb.className = 'sb-in';
    inb.style.outlineWidth = Math.max(0.6, 1.4 / ED.zoom) + 'px';
    box.appendChild(inb);
    if (one && !one.locked) {
      const hs = 9;
      const sc = 1 / ED.zoom;
      const add = (cls, style, h) => {
        const d = document.createElement('div');
        d.className = 'hd ' + cls;
        d.style.cssText = style + ';transform:translate(-50%,-50%) scale(' + sc + ');width:' + h + 'px;height:' + h + 'px;';
        d.dataset.h = cls;
        box.appendChild(d);
        return d;
      };
      add('nw', 'left:0;top:0', hs);
      add('n', 'left:50%;top:0', hs);
      add('ne', 'left:100%;top:0', hs);
      add('e', 'left:100%;top:50%', hs);
      add('se', 'left:100%;top:100%', hs);
      add('s', 'left:50%;top:100%', hs);
      add('sw', 'left:0;top:100%', hs);
      add('w', 'left:0;top:50%', hs);
      const rt = add('rot', 'left:50%;top:-' + 26 + 'px', 11);
      rt.style.transform += '';
      const line = document.createElement('div');
      line.style.cssText = 'position:absolute;left:50%;top:-26px;height:26px;width:1px;background:rgba(53,224,138,.55);transform:translateX(-50%)';
      box.appendChild(line);
    }
    p.appendChild(box);
  };

  /* 拖拽过程中只更新选择框几何，不重建手柄（保证手柄不失焦、不闪烁） */
  ED.syncSelBox = function () {
    const p = poster();
    if (!p) return;
    const box = p.querySelector('.sel-box');
    const ls = Store.selLayers();
    if (!box) { if (ls.length) ED.syncSel(); return; }
    if (!ls.length) { box.remove(); return; }
    const one = ls.length === 1 ? ls[0] : null;
    let x, y, w, h, rot = 0;
    if (one) {
      x = one.x; y = one.y; w = one.w; h = one.h; rot = one.rot || 0;
    } else {
      x = Math.min.apply(null, ls.map((l) => l.x));
      y = Math.min.apply(null, ls.map((l) => l.y));
      w = Math.max.apply(null, ls.map((l) => l.x + l.w)) - x;
      h = Math.max.apply(null, ls.map((l) => l.y + l.h)) - y;
    }
    box.style.left = x + 'px';
    box.style.top = y + 'px';
    box.style.width = w + 'px';
    box.style.height = h + 'px';
    box.style.transform = 'rotate(' + rot + 'deg)';
  };

  /* 缩放时在右下角显示的尺寸徽标（与选择框一起移动，自动贴合画布内） */
  function showSizeBadge(l) {
    const p = poster();
    const doc = Store.doc;
    if (!p || !doc) return;
    let b = p.querySelector('.size-badge');
    if (!b) {
      b = document.createElement('div');
      b.className = 'size-badge';
      p.appendChild(b);
    }
    const k = 1 / ED.zoom;
    b.style.transform = 'scale(' + k + ')';
    b.style.transformOrigin = '0 0';
    b.textContent = Math.round(l.w) + ' × ' + Math.round(l.h);
    const bw = b.offsetWidth, bh = b.offsetHeight;
    const wv = bw * k, hv = bh * k;   // 视觉尺寸（海报坐标系）
    let bx = l.x + l.w - wv;
    let by = l.y + l.h + 8 * k;
    if (by + hv > doc.canvas.h - 4) by = l.y + l.h - hv - 8 * k;
    bx = U.clamp(bx, 4, Math.max(4, doc.canvas.w - wv - 4));
    by = U.clamp(by, 4, Math.max(4, doc.canvas.h - hv - 4));
    b.style.left = bx + 'px';
    b.style.top = by + 'px';
  }
  function hideSizeBadge() {
    const p = poster();
    const b = p && p.querySelector('.size-badge');
    if (b) b.remove();
  }

  /* ---------------- 吸附 ---------------- */
  function snapTargets(excludeIds) {
    const doc = Store.doc;
    const xs = [0, doc.canvas.w / 2, doc.canvas.w];
    const ys = [0, doc.canvas.h / 2, doc.canvas.h];
    doc.layers.forEach((l) => {
      if (excludeIds.indexOf(l.id) >= 0 || l.hidden) return;
      xs.push(l.x, l.x + l.w / 2, l.x + l.w);
      ys.push(l.y, l.y + l.h / 2, l.y + l.h);
    });
    return { xs, ys };
  }

  function showGuides(gv, gh) {
    const p = poster();
    p.querySelectorAll('.guide').forEach((n) => n.remove());
    const t = Math.max(0.6, 1 / ED.zoom);
    (gv || []).forEach((x) => {
      const d = document.createElement('div');
      d.className = 'guide v';
      d.style.left = x + 'px';
      d.style.width = t + 'px';
      p.appendChild(d);
    });
    (gh || []).forEach((y) => {
      const d = document.createElement('div');
      d.className = 'guide h';
      d.style.top = y + 'px';
      d.style.height = t + 'px';
      p.appendChild(d);
    });
  }
  function clearGuides() {
    const p = poster();
    if (p) p.querySelectorAll('.guide').forEach((n) => n.remove());
  }

  function snapVal(vAls) {
    const th = 7 / ED.zoom;
    let best = null;
    vAls.forEach((cand) => {
      if (best == null || Math.abs(cand.d) < Math.abs(best.d)) best = cand;
    });
    if (best && Math.abs(best.d) <= th) return best;
    return null;
  }

  /* ---------------- 指针交互 ---------------- */
  function onPointerDown(e) {
    if (e.button === 1 || ED._space) return; // 平移交给 pan
    const p = poster();
    if (!p || !Store.doc) return;
    const t = e.target;

    // 手柄
    const hd = t.closest && t.closest('.hd');
    if (hd) {
      const one = Store.one();
      if (!one) return;
      e.preventDefault();
      e.stopPropagation();
      const mode = hd.dataset.h;
      ED.setEditing(null);
      ED._drag = {
        mode: mode === 'rot' ? 'rot' : 'resize',
        dir: mode,
        id: one.id,
        start: pt(e),
        box: { x: one.x, y: one.y, w: one.w, h: one.h, rot: one.rot || 0 },
        moved: false
      };
      return;
    }

    const node = t.closest && t.closest('.layer');
    if (!node) {
      // 空白：框选
      e.preventDefault();
      if (!e.shiftKey) Store.clearSel();
      const s = pt(e);
      ED._drag = { mode: 'marquee', start: s, cur: s, addSel: e.shiftKey, moved: false };
      return;
    }

    const id = node.dataset.id;
    const layer = Store.byId(id);
    if (!layer) return;

    if (e.shiftKey) Store.select([id], { add: true });
    else if (Store.sel.indexOf(id) < 0) Store.select([id]);

    if (layer.locked) return;
    if (ED._editing === id) return;

    e.preventDefault();
    ED._drag = {
      mode: 'move',
      start: pt(e),
      ids: Store.sel.slice(),
      orig: Store.selLayers().map((l) => ({ id: l.id, x: l.x, y: l.y, w: l.w, h: l.h })),
      moved: false
    };
  }

  function onPointerMove(e) {
    const d = ED._drag;
    if (!d) return;
    const cur = pt(e);

    if (d.mode === 'move') {
      let dx = cur.x - d.start.x;
      let dy = cur.y - d.start.y;
      if (!d.moved && Math.abs(dx) + Math.abs(dy) < 1.5) return;
      d.moved = true;
      const exIds = d.orig.map((o) => o.id);
      const tg = snapTargets(exIds);
      const first = d.orig[0];
      let gv = null, gh = null;
      const th = 7 / ED.zoom;

      // 水平吸附：比较左/中/右
      const candsX = [];
      d.orig.forEach((o) => {
        [0, o.w / 2, o.w].forEach((off, k) => {
          const v = o.x + dx + off;
          tg.xs.forEach((tx) => candsX.push({ d: tx - v, off: off, k: k }));
        });
      });
      const bx = snapVal(candsX);
      if (bx) { dx += bx.d; gv = [bx.k === 0 ? first.x + dx : first.x + dx + first.w / 2]; }
      const candsY = [];
      d.orig.forEach((o) => {
        [0, o.h / 2, o.h].forEach((off) => {
          const v = o.y + dy + off;
          tg.ys.forEach((ty) => candsY.push({ d: ty - v, off: off }));
        });
      });
      const by = snapVal(candsY);
      if (by) { dy += by.d; gh = [first.y + dy + first.h / 2]; }

      d.orig.forEach((o) => {
        const l = Store.byId(o.id);
        if (!l) return;
        l.x = Math.round(o.x + dx);
        l.y = Math.round(o.y + dy);
        R.updateTransform(l);
      });
      ED.syncSelBox();
      showGuides(gv, gh);
      syncInspectorPos();
      return;
    }

    if (d.mode === 'resize') {
      const l = Store.byId(d.id);
      if (!l) return;
      d.moved = true;
      let dx = cur.x - d.start.x, dy = cur.y - d.start.y;
      const b = d.box;
      let x = b.x, y = b.y, w = b.w, h = b.h;
      const dir = d.dir;
      if (dir.indexOf('e') >= 0) w = b.w + dx;
      if (dir.indexOf('s') >= 0) h = b.h + dy;
      if (dir.indexOf('w') >= 0) { w = b.w - dx; x = b.x + dx; }
      if (dir.indexOf('n') >= 0) { h = b.h - dy; y = b.y + dy; }
      if (e.shiftKey && (dir === 'nw' || dir === 'ne' || dir === 'sw' || dir === 'se')) {
        const r = b.w / b.h;
        if (Math.abs(w / h) > r) w = h * r; else h = w / r;
        if (dir.indexOf('w') >= 0) x = b.x + (b.w - w);
        if (dir.indexOf('n') >= 0) y = b.y + (b.h - h);
      }
      w = Math.max(8, Math.round(w));
      h = Math.max(8, Math.round(h));
      l.x = Math.round(x); l.y = Math.round(y); l.w = w; l.h = h;
      R.updateTransform(l);
      ED.syncSelBox();
      showSizeBadge(l);
      syncInspectorPos();
      return;
    }

    if (d.mode === 'rot') {
      const l = Store.byId(d.id);
      if (!l) return;
      d.moved = true;
      const cx = d.box.x + d.box.w / 2, cy = d.box.y + d.box.h / 2;
      let a = (Math.atan2(cur.y - cy, cur.x - cx) * 180) / Math.PI + 90;
      if (e.shiftKey) a = Math.round(a / 15) * 15;
      l.rot = Math.round(a * 10) / 10;
      R.updateTransform(l);
      ED.syncSelBox();
      const rf = document.querySelector('#inspector [data-field="rot"]');
      if (rf) rf.value = l.rot;
      return;
    }

    if (d.mode === 'marquee') {
      d.cur = cur;
      d.moved = true;
      const p = poster();
      let mq = p.querySelector('.marquee');
      if (!mq) { mq = document.createElement('div'); mq.className = 'marquee'; p.appendChild(mq); }
      const x = Math.min(d.start.x, cur.x), y = Math.min(d.start.y, cur.y);
      mq.style.cssText += ';left:' + x + 'px;top:' + y + 'px;width:' + Math.abs(cur.x - d.start.x) + 'px;height:' + Math.abs(cur.y - d.start.y) + 'px';
      return;
    }
  }

  function onPointerUp() {
    const d = ED._drag;
    ED._drag = null;
    clearGuides();
    hideSizeBadge();
    const p = poster();
    const mq = p && p.querySelector('.marquee');
    if (mq) mq.remove();
    if (!d) return;
    if (d.mode === 'marquee') {
      if (!d.moved) return;
      const x1 = Math.min(d.start.x, d.cur.x), y1 = Math.min(d.start.y, d.cur.y);
      const x2 = Math.max(d.start.x, d.cur.x), y2 = Math.max(d.start.y, d.cur.y);
      const hit = Store.doc.layers.filter((l) => !l.hidden && l.x < x2 && l.x + l.w > x1 && l.y < y2 && l.y + l.h > y1).map((l) => l.id);
      Store.select(hit, { add: d.addSel });
      return;
    }
    if (d.moved) Store.commit(d.mode === 'move' ? '移动图层' : d.mode === 'resize' ? '缩放图层' : '旋转图层');
  }

  function syncInspectorPos() {
    document.dispatchEvent(new CustomEvent('plaque:live', { detail: { fields: ['x', 'y', 'w', 'h'] } }));
  }

  /* ---------------- 文本就地编辑 ---------------- */
  ED.setEditing = function (id) {
    if (ED._editing === id) return;
    if (ED._editing) ED.endEditing(true);
    ED._editing = id;
    if (!id) return;
    const node = document.querySelector('.layer[data-id="' + id + '"] .tx');
    if (!node) return;
    node.contentEditable = 'true';
    node.classList.add('editing-tx');
    node.focus();
    const r = document.createRange();
    r.selectNodeContents(node);
    r.collapse(false);
    const s = window.getSelection();
    s.removeAllRanges();
    s.addRange(r);
    node.addEventListener('blur', () => ED.endEditing(false), { once: true });
    node.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Escape') { e.preventDefault(); ED.endEditing(false); }
    });
  };

  ED.endEditing = function (silent) {
    const id = ED._editing;
    ED._editing = null;
    if (!id) return;
    const node = document.querySelector('.layer[data-id="' + id + '"] .tx');
    if (!node) return;
    node.contentEditable = 'false';
    node.classList.remove('editing-tx');
    const txt = node.innerText.replace(/\u00a0/g, ' ').replace(/\n{3,}/g, '\n\n');
    const l = Store.byId(id);
    if (l && l.text !== txt) {
      l.text = txt;
      if (!silent) Store.commit('改文案');
      R.render();
      ED.syncSel();
    }
  };

  /* ---------------- 事件绑定 ---------------- */
  ED.mount = function () {
    injectCSS();
    const vp = viewport();
    const p = poster();
    if (!p) return;

    p.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    p.addEventListener('dblclick', (e) => {
      const node = e.target.closest('.layer');
      if (!node) return;
      const l = Store.byId(node.dataset.id);
      if (!l) return;
      if (l.type === 'text') { e.preventDefault(); Store.select([l.id]); ED.setEditing(l.id); }
      if (l.type === 'image') {
        U.pickFiles('image/*', false).then((fs) => {
          if (!fs.length) return;
          U.readFile(fs[0]).then((src) => Store.update(l.id, { src }, { label: '换图' }));
        });
      }
    });

    if (vp) {
      vp.addEventListener('wheel', (e) => {
        if (e.ctrlKey || e.metaKey || e.altKey) {
          e.preventDefault();
          ED.setZoom(ED.zoom * (e.deltaY > 0 ? 0.92 : 1.08), e);
        }
      }, { passive: false });

      // 中键 / 空格拖拽平移
      let pan = null;
      vp.addEventListener('pointerdown', (e) => {
        if (e.button === 1 || (ED._space && e.button === 0)) {
          e.preventDefault();
          pan = { x: e.clientX, y: e.clientY, sl: vp.scrollLeft, st: vp.scrollTop };
          vp.style.cursor = 'grabbing';
        }
      });
      window.addEventListener('pointermove', (e) => {
        if (!pan) return;
        vp.scrollLeft = pan.sl - (e.clientX - pan.x);
        vp.scrollTop = pan.st - (e.clientY - pan.y);
      });
      window.addEventListener('pointerup', () => { if (pan) { pan = null; vp.style.cursor = ''; } });

      // 拖入图片
      ['dragover', 'dragenter'].forEach((ev) => vp.addEventListener(ev, (e) => { e.preventDefault(); }));
      vp.addEventListener('drop', (e) => {
        e.preventDefault();
        const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (!f || !/^image\//.test(f.type)) return;
        U.readFile(f).then((src) => {
          const r = p.getBoundingClientRect();
          const x = (e.clientX - r.left) / ED.zoom, y = (e.clientY - r.top) / ED.zoom;
          const doc = Store.doc;
          const w = Math.min(doc.canvas.w * 0.6, 720);
          const l = DATA.mkImage({ x: Math.round(x - w / 2), y: Math.round(y - w / 2), w: Math.round(w), h: Math.round(w), src });
          Store.add(l, { label: '拖入图片' });
        });
      });
    }

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', (e) => { if (e.code === 'Space') ED._space = false; });
    document.addEventListener('keydown', (e) => { if (e.code === 'Space' && !isTyping(e)) ED._space = true; });

    Store.on('sel', () => ED.syncSel());
    Store.on('doc', () => ED.syncSel());
  };

  function isTyping(e) {
    const t = e.target;
    if (!t) return false;
    const tag = (t.tagName || '').toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || t.isContentEditable;
  }

  function onKeyDown(e) {
    if (isTyping(e)) return;
    const meta = e.ctrlKey || e.metaKey;
    const doc = Store.doc;
    if (!doc) return;

    if (meta && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) Store.redo(); else Store.undo();
      return;
    }
    if (meta && e.key.toLowerCase() === 'y') { e.preventDefault(); Store.redo(); return; }
    if (meta && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      Store.duplicate();
      return;
    }
    if (meta && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      Store.select(doc.layers.map((l) => l.id));
      return;
    }
    if (meta && e.key.toLowerCase() === 'c') {
      ED.clip = Store.selLayers().map((l) => U.clone(l));
      U.toast('已复制 ' + ED.clip.length + ' 个图层');
      return;
    }
    if (meta && e.key.toLowerCase() === 'v') {
      if (!ED.clip || !ED.clip.length) return;
      e.preventDefault();
      const out = ED.clip.map((l) => {
        const c = U.clone(l);
        c.id = U.uid();
        c.x += 28; c.y += 28;
        return c;
      });
      Store.addMany(out, { label: '粘贴' });
      return;
    }
    if (meta && e.key.toLowerCase() === 's') {
      e.preventDefault();
      document.querySelector('[data-export="json"]') && document.querySelector('[data-export="json"]').click();
      return;
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (!Store.sel.length) return;
      e.preventDefault();
      Store.remove();
      return;
    }
    if (e.key === 'Escape') {
      if (ED._editing) { ED.endEditing(false); return; }
      Store.clearSel();
      return;
    }
    if (e.key === 'Enter' && Store.sel.length === 1) {
      const l = Store.one();
      if (l && l.type === 'text') { e.preventDefault(); ED.setEditing(l.id); }
      return;
    }
    const step = e.shiftKey ? 10 : 1;
    const map = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (map[e.key] && Store.sel.length) {
      e.preventDefault();
      Store.selLayers().forEach((l) => {
        l.x += map[e.key][0];
        l.y += map[e.key][1];
        R.updateTransform(l);
      });
      ED.syncSel();
      Store.commit('微调位置');
    }
  }

  window.ED = ED;
})();
