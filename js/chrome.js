/* ============================================================
   chrome.js — PS / Illustrator 式外壳
   菜单栏 · 工具选项栏 · 工具箱 · 文档标签 · 右侧停靠面板 · 标尺 · 状态栏
   ============================================================ */
(function () {
  'use strict';

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const mk = (tag, cls, txt) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (txt != null) el.textContent = txt;
    return el;
  };
  const CH = { tool: 'select', openMenu: null, tab: 'props' };

  /* ---------------- 工具定义 ---------------- */
  const TOOLS = {
    select: { name: '移动工具', cursor: 'move' },
    text: { name: '文字工具', cursor: 'text' },
    rect: { name: '矩形工具', cursor: 'crosshair' },
    ellipse: { name: '椭圆工具', cursor: 'crosshair' },
    hand: { name: '抓手工具', cursor: 'grab' },
    zoom: { name: '缩放工具', cursor: 'zoom-in' },
  };

  function setTool(id) {
    if (!TOOLS[id]) return;
    CH.tool = id;
    $$('.tb-btn').forEach((b) => b.classList.toggle('is-on', b.dataset.tool === id));
    const stage = $('#stage');
    if (stage) stage.style.cursor = TOOLS[id].cursor;
    CH.obRender();
  }

  /* ---------------- 通用动作 ---------------- */
  function sel() { return Store.selLayers(); }
  function hasSel() { return sel().length > 0; }
  function actAll() { Store.select(Store.doc.layers.map((l) => l.id)); }
  const ACT = {
    newDoc() { const b = $('#btnNewDoc'); if (b) b.click(); },
    openJson() { const b = $('[data-export="open"]'); if (b) b.click(); },
    saveJson() { EX.json(); },
    png() { EX.png(); },
    jpg() { EX.jpg(); },
    web() { EX.web(); },
    video() { EX.video({}); },
    undo() { const b = $('#btnUndo'); if (b && !b.disabled) b.click(); },
    redo() { const b = $('#btnRedo'); if (b && !b.disabled) b.click(); },
    duplicate() { if (hasSel()) Store.duplicate(Store.sel.slice()); },
    del() { if (hasSel()) Store.remove(Store.sel.slice()); },
    all: actAll,
    front() { sel().forEach((l) => Store.reorder(l.id, 'front')); },
    back() { sel().forEach((l) => Store.reorder(l.id, 'back')); },
    up() { sel().forEach((l) => Store.reorder(l.id, 'up')); },
    down() { sel().forEach((l) => Store.reorder(l.id, 'down')); },
    align(mode) { return () => Store.align(mode); },
    toAi() { const b = $('#btnAiOpen'); if (b) b.click(); },
    settings() { const b = $('#btnSettings'); if (b) b.click(); },
    help() { const b = $('#btnHelp'); if (b) b.click(); },
    fit() { ED.fit(); },
    zoom100() { ED.setZoom(1); },
    zoomIn() { ED.zoomBy(1.2); },
    zoomOut() { ED.zoomBy(1 / 1.2); },
    safe() { const b = $('#btnToggleSafe'); if (b) b.click(); },
    anim() { const b = $('#btnPlayAnim'); if (b) b.click(); },
    togglePanel() { const b = $('#btnPanelClose'); const o = $('#btnPanelOpen'); if ($('#app').classList.contains('panel-closed')) o && o.click(); else b && b.click(); },
    toggleDock() { $('#app').classList.toggle('dock-closed'); },
    textPreset(id) {
      const p = DATA.TEXT_PRESETS.find((x) => x.id === id) || DATA.TEXT_PRESETS[0];
      const W = Store.doc.canvas.w, H = Store.doc.canvas.h;
      const l = DATA.mkText({
        name: p.name, text: p.name === '等宽注记' ? 'NOTE · 001' : '双击编辑文字',
        x: Math.round(W * 0.1), y: Math.round(H * 0.44), w: Math.round(W * 0.8), h: Math.round(p.size * 1.4),
        size: p.size, weight: p.weight, font: p.font, lh: p.lh, tracking: p.tracking,
        color: Store.palette().fg,
      });
      Store.add(l); Store.select([l.id]);
    },
    fx(id) { sel().forEach((l) => Store.update(l.id, { textFx: id })); },
    filter(id) {
      const f = DATA.FILTER_PRESETS.find((x) => x.id === id);
      if (!f) return;
      sel().forEach((l) => Store.update(l.id, { filters: Object.assign({}, l.filters, f.f) }));
    },
    view(tab) { CH.setTab(tab); },
  };

  /* ---------------- 菜单定义 ---------------- */
  const MENUS = {
    file: [
      { label: '新建文档', kbd: 'Ctrl+N', act: ACT.newDoc },
      { label: '打开工程…', act: ACT.openJson },
      { label: '保存工程 JSON', kbd: 'Ctrl+S', act: ACT.saveJson },
      { sep: true },
      { label: '导出 PNG（2×）', kbd: 'Ctrl+E', act: ACT.png },
      { label: '导出 JPG', act: ACT.jpg },
      { label: '导出网页 HTML', act: ACT.web },
      { label: '导出视频 WebM', act: ACT.video },
      { sep: true },
      { label: 'AI 接口设置…', act: ACT.settings },
    ],
    edit: [
      { label: '撤销', kbd: 'Ctrl+Z', act: ACT.undo },
      { label: '重做', kbd: 'Ctrl+Shift+Z', act: ACT.redo },
      { sep: true },
      { label: '复制图层', kbd: 'Ctrl+D', act: ACT.duplicate },
      { label: '删除图层', kbd: 'Del', act: ACT.del },
      { label: '全选图层', kbd: 'Ctrl+A', act: ACT.all },
    ],
    object: [
      { label: '置顶', act: ACT.front },
      { label: '置底', act: ACT.back },
      { label: '上移一层', act: ACT.up },
      { label: '下移一层', act: ACT.down },
      { sep: true },
      { label: '左对齐', act: ACT.align('left') },
      { label: '水平居中', act: ACT.align('hcenter') },
      { label: '右对齐', act: ACT.align('right') },
      { label: '顶对齐', act: ACT.align('top') },
      { label: '垂直居中', act: ACT.align('vcenter') },
      { label: '底对齐', act: ACT.align('bottom') },
    ],
    type: DATA.TEXT_PRESETS.map((p) => ({ label: p.name, act: () => ACT.textPreset(p.id) })),
    effect: [
      { label: '无特效', act: () => ACT.fx('none') },
      { label: '渐变填充', act: () => ACT.fx('gradient') },
      { label: '描边空心', act: () => ACT.fx('outline') },
      { label: '霓虹发光', act: () => ACT.fx('neon') },
      { label: '贴纸阴影', act: () => ACT.fx('sticker') },
      { label: '压印浮雕', act: () => ACT.fx('emboss') },
      { sep: true },
      ...DATA.FILTER_PRESETS.slice(0, 6).map((f) => ({ label: '滤镜 · ' + f.name, act: () => ACT.filter(f.id) })),
    ],
    view: [
      { label: '适应窗口', kbd: 'Ctrl+0', act: ACT.fit },
      { label: '实际像素 100%', act: ACT.zoom100 },
      { label: '放大', kbd: 'Ctrl++', act: ACT.zoomIn },
      { label: '缩小', kbd: 'Ctrl+-', act: ACT.zoomOut },
      { sep: true },
      { label: '显示安全区', act: ACT.safe },
      { label: '动效预览', act: ACT.anim },
      { sep: true },
      { label: '显示/隐藏素材面板', act: ACT.togglePanel },
      { label: '显示/隐藏右侧面板', act: ACT.toggleDock },
    ],
    help: [
      { label: '快捷键与 API…', kbd: '?', act: ACT.help },
      { label: 'AI 接口设置…', act: ACT.settings },
    ],
  };

  function closeMenu() {
    $$('.mb-menu').forEach((m) => m.remove());
    $$('.mb-item').forEach((b) => b.classList.remove('is-open'));
    CH.openMenu = null;
  }

  function openMenu(key, anchor) {
    closeMenu();
    const items = MENUS[key];
    if (!items) return;
    const m = mk('div', 'mb-menu');
    items.forEach((it) => {
      if (it.sep) { m.appendChild(mk('div', 'mb-sep')); return; }
      const r = mk('button', 'mb-row');
      r.appendChild(mk('span', '', it.label));
      if (it.kbd) r.appendChild(mk('kbd', '', it.kbd));
      r.addEventListener('click', () => { closeMenu(); try { it.act(); } catch (e) { U.toast('操作失败：' + e.message); } });
      m.appendChild(r);
    });
    document.body.appendChild(m);
    const rect = anchor.getBoundingClientRect();
    m.style.left = Math.round(rect.left) + 'px';
    m.style.top = Math.round(rect.bottom + 2) + 'px';
    anchor.classList.add('is-open');
    CH.openMenu = key;
  }

  /* ---------------- 选项栏 ---------------- */
  function numField(label, val, onChange, wide) {
    const w = mk('label', 'ob-group');
    w.appendChild(mk('span', 'ob-label', label));
    const i = mk('input', 'ob-num' + (wide ? ' wide' : ''));
    i.type = 'number';
    i.value = Math.round(val);
    i.addEventListener('change', () => onChange(parseFloat(i.value) || 0));
    w.appendChild(i);
    return w;
  }
  function colorField(label, val, onChange) {
    const w = mk('label', 'ob-group');
    w.appendChild(mk('span', 'ob-label', label));
    const i = mk('input', 'ob-color');
    i.type = 'color';
    i.value = /^#[0-9a-f]{6}$/i.test(val) ? val : '#ffffff';
    i.addEventListener('input', () => onChange(i.value));
    w.appendChild(i);
    return w;
  }
  function selectField(label, opts, val, onChange) {
    const w = mk('label', 'ob-group');
    w.appendChild(mk('span', 'ob-label', label));
    const s = mk('select', 'ob-sel');
    opts.forEach((o) => {
      const op = mk('option', '', o.name);
      op.value = o.id;
      s.appendChild(op);
    });
    s.value = val;
    s.addEventListener('change', () => onChange(s.value));
    w.appendChild(s);
    return w;
  }
  function icoBtn(ico, title, on, fn) {
    const b = mk('button', 'ob-ico' + (on ? ' on' : ''));
    b.title = title;
    b.innerHTML = '<svg class="i"><use href="#' + ico + '"/></svg>';
    b.addEventListener('click', fn);
    return b;
  }

  CH.obRender = function () {
    const bar = $('#optionsBar');
    if (!bar || !Store.doc) return;
    bar.innerHTML = '';
    const doc = Store.doc;
    const ls = sel();
    const tool = TOOLS[CH.tool];
    const add = (el) => bar.appendChild(el);
    const sep = () => bar.appendChild(mk('span', 'ob-sep'));

    add(mk('span', 'ob-label', tool.name));

    if (ls.length === 0) {
      sep();
      add(selectField('画板', DATA.FRAMES.map((f) => ({ id: f.id, name: f.name + ' · ' + f.w + '×' + f.h })), doc.frameId,
        (v) => Store.setFrame(v)));
      add(colorField('背景', doc.canvas.bg, (v) => { Store.doc.canvas.bg = v; Store.commit('画布背景'); }));
      sep();
      add(numField('颗粒', (doc.canvas.overlay || {}).grain || 0, (v) => { doc.canvas.overlay.grain = v; Store.commit('颗粒'); }));
      add(numField('暗角', (doc.canvas.overlay || {}).vignette || 0, (v) => { doc.canvas.overlay.vignette = v; Store.commit('暗角'); }));
      const sp = mk('span', 'ob-spacer');
      add(sp);
      add(mk('span', 'ob-tip', '未选中图层 · 直接在画布上点击选择，或用左侧工具新建'));
      return;
    }

    const l = ls[0];
    sep();
    add(numField('X', l.x, (v) => Store.updateSel({ x: v })));
    add(numField('Y', l.y, (v) => Store.updateSel({ y: v })));
    add(numField('W', l.w, (v) => Store.updateSel({ w: v })));
    add(numField('H', l.h, (v) => Store.updateSel({ h: v })));
    sep();

    if (l.type === 'text') {
      add(selectField('字体', DATA.FONTS.map((f) => ({ id: f.id, name: f.name })), l.font, (v) => Store.updateSel({ font: v })));
      add(numField('字号', l.size, (v) => Store.updateSel({ size: v })));
      add(selectField('字重', [300, 400, 500, 600, 700, 800, 900].map((w) => ({ id: String(w), name: String(w) })), String(l.weight), (v) => Store.updateSel({ weight: +v })));
      add(colorField('颜色', l.color, (v) => Store.updateSel({ color: v })));
      add(selectField('特效', DATA.TEXT_FX.map((f) => ({ id: f.id, name: f.name })), l.textFx, (v) => Store.updateSel({ textFx: v })));
      add(icoBtn('i-al-left', '左对齐', l.align === 'left', () => Store.updateSel({ align: 'left' })));
      add(icoBtn('i-al-center', '居中', l.align === 'center', () => Store.updateSel({ align: 'center' })));
      add(icoBtn('i-al-right', '右对齐', l.align === 'right', () => Store.updateSel({ align: 'right' })));
    } else if (l.type === 'shape') {
      add(colorField('填充', l.fill, (v) => Store.updateSel({ fill: v })));
      add(selectField('形状', DATA.SHAPES.map((s) => ({ id: s.id, name: s.name })), l.shape, (v) => Store.updateSel({ shape: v })));
      add(numField('圆角', l.radius || 0, (v) => Store.updateSel({ radius: v })));
      add(colorField('描边', l.stroke, (v) => Store.updateSel({ stroke: v })));
      add(numField('描边宽', l.strokeW || 0, (v) => Store.updateSel({ strokeW: v })));
    } else if (l.type === 'image') {
      add(selectField('适配', [{ id: 'cover', name: '填满' }, { id: 'contain', name: '完整' }], l.fit || 'cover', (v) => Store.updateSel({ fit: v })));
      add(numField('圆角', l.radius || 0, (v) => Store.updateSel({ radius: v })));
    } else if (l.type === 'ai') {
      add(numField('时长', l.duration || 6, (v) => Store.updateSel({ duration: v })));
      add(selectField('帧率', [24, 30, 60].map((f) => ({ id: String(f), name: f + ' fps' })), String(l.fps || 30), (v) => Store.updateSel({ fps: +v })));
      add(icoBtn('i-refresh', '换一版', false, () => { const b = $('.ins-sec .btn'); if (b) b.click(); }));
      add(icoBtn('i-code', '编辑代码', false, () => { if (window.openCode) window.openCode(l.artHtml || '', (next) => Store.update(l.id, { artHtml: next })); }));
    }

    sep();
    const al = mk('span', 'ob-group');
    [['i-al-left', 'left', '左对齐'], ['i-align-x', 'hcenter', '水平居中'], ['i-al-right', 'right', '右对齐'],
      ['i-bar', 'top', '顶对齐'], ['i-align-y', 'vcenter', '垂直居中'], ['i-bar', 'bottom', '底对齐']].forEach(([ico, mode, title]) => {
      al.appendChild(icoBtn(ico, title, false, () => Store.align(mode)));
    });
    add(al);
    const sp = mk('span', 'ob-spacer');
    add(sp);
    add(mk('span', 'ob-tip', ls.length > 1 ? '已选 ' + ls.length + ' 个图层' : '已选：' + (l.name || l.type)));
  };

  /* ---------------- 状态栏 ---------------- */
  CH.statusRender = function () {
    const doc = Store.doc;
    if (!doc) return;
    const info = $('#sbInfo');
    if (info) info.textContent = doc.canvas.w + ' × ' + doc.canvas.h + ' px · ' + doc.layers.length + ' 图层';
    const hint = $('#sbHint');
    if (hint) {
      const ls = sel();
      hint.textContent = ls.length
        ? (ls.length === 1 ? (ls[0].name || ls[0].type) + ' · ' + Math.round(ls[0].x) + ', ' + Math.round(ls[0].y) : '已选 ' + ls.length + ' 个图层')
        : '双击文字编辑 · 拖角点缩放 · Alt 拖拽复制';
    }
  };

  /* ---------------- 标尺 ---------------- */
  CH.rulers = function () {
    const z = ED.zoom || 1;
    const tick = Math.max(24, Math.round(100 * z));
    document.documentElement.style.setProperty('--tick', tick + 'px');
  };

  /* ---------------- 停靠面板 ---------------- */
  CH.setTab = function (name) {
    if (name === 'layers') name = 'props';   // 图层区已常驻下方，不再作为标签
    if (name === 'gen') name = 'props';
    CH.tab = name;
    $$('.dr-tab').forEach((t) => t.classList.toggle('is-active', t.dataset.tab === name));
    $$('.dr-pane').forEach((p) => p.classList.toggle('is-active', p.dataset.pane === name));
    const app = $('#app');
    if (app) { app.classList.remove('dock-closed'); }
    if (name === 'arts') PANELS.renderDock();
  };

  CH.renderLayers = function () {
    if (!Store.doc) return;
    if (PANELS.renderLayerList) PANELS.renderLayerList('layersHost');
  };

  /* ---------------- 画布工具行为 ---------------- */
  function addFromTool(kind, pt) {
    const doc = Store.doc;
    const p = Store.palette();
    let l;
    if (kind === 'text') {
      l = DATA.mkText({
        name: '文字', text: '双击编辑文字', x: Math.round(pt.x - 240), y: Math.round(pt.y - 40),
        w: 480, h: 80, size: 72, weight: 700, font: 'sans', color: p.fg,
      });
    } else {
      const s = 220;
      l = DATA.mkShape({
        name: kind === 'ellipse' ? '椭圆' : '矩形', shape: kind === 'ellipse' ? 'ellipse' : 'rect',
        x: Math.round(pt.x - s / 2), y: Math.round(pt.y - s / 2), w: s, h: s,
        fill: p.accent, radius: kind === 'rect' ? 12 : 0,
      });
    }
    Store.add(l);
    Store.select([l.id]);
    setTool('select');
  }

  function bindStageTools() {
    const stage = $('#stage');
    if (!stage) return;
    stage.addEventListener('pointerdown', (e) => {
      if (CH.tool === 'select' || CH.tool === 'hand') return;
      if (e.target.closest('.promptbar') || e.target.closest('.ruler')) return;
      const poster = $('#poster');
      if (!poster) return;
      if (CH.tool === 'zoom') { ED.zoomBy(1.25); return; }
      const r = poster.getBoundingClientRect();
      const z = ED.zoom || 1;
      const x = (e.clientX - r.left) / z, y = (e.clientY - r.top) / z;
      if (x < 0 || y < 0 || x > Store.doc.canvas.w || y > Store.doc.canvas.h) return;
      addFromTool(CH.tool, { x, y });
    }, true);
  }

  /* ---------------- 事件绑定 ---------------- */
  function bindMenus() {
    $$('.mb-item').forEach((b) => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        if (CH.openMenu === b.dataset.menu) closeMenu();
        else openMenu(b.dataset.menu, b);
      });
      b.addEventListener('mouseenter', () => { if (CH.openMenu && CH.openMenu !== b.dataset.menu) openMenu(b.dataset.menu, b); });
    });
    document.addEventListener('click', (e) => { if (!e.target.closest('.mb-menu')) closeMenu(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
    window.addEventListener('resize', closeMenu);
  }

  function bindTabs() {
    $$('.dr-tab').forEach((t) => t.addEventListener('click', () => CH.setTab(t.dataset.tab)));
  }

  function bindTools() {
    $$('.tb-btn[data-tool]').forEach((b) => b.addEventListener('click', () => setTool(b.dataset.tool)));

    document.addEventListener('keydown', (e) => {
      const t = e.target;
      if (t && /input|textarea|select/i.test(t.tagName)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const map = { v: 'select', t: 'text', u: 'rect', o: 'ellipse', h: 'hand', z: 'zoom' };
      const k = e.key.toLowerCase();
      if (map[k]) { e.preventDefault(); setTool(map[k]); }
    });
  }

  function bindToggle() {
    const btn = $('#btnToggleDock');
    if (btn) btn.addEventListener('click', () => { $('#app').classList.toggle('dock-closed'); ED.fit(); });
  }

  /* 上下分区拖拽（拖动条在属性区与图层区之间） */
  function bindSplit() {
    const split = $('#drSplit');
    const dock = $('#dockRight');
    if (!split || !dock) return;
    let startY = 0, startH = 0, dragging = false;
    const bottomH = () => {
      const el = $('#drBottom');
      return el ? el.getBoundingClientRect().height : 340;
    };
    split.addEventListener('pointerdown', (e) => {
      dragging = true;
      startY = e.clientY;
      startH = bottomH();
      split.setPointerCapture(e.pointerId);
      document.body.style.cursor = 'row-resize';
      e.preventDefault();
    });
    split.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const h = U.clamp(startH - (e.clientY - startY), 120, dock.getBoundingClientRect().height - 160);
      dock.style.setProperty('--layers-h', Math.round(h) + 'px');
    });
    const stop = () => {
      if (!dragging) return;
      dragging = false;
      document.body.style.cursor = '';
      U.saveLS('layersH', Math.round(bottomH()));
    };
    split.addEventListener('pointerup', stop);
    split.addEventListener('pointercancel', stop);

    const saved = Number(U.loadLS('layersH', 0));
    if (saved > 120) dock.style.setProperty('--layers-h', saved + 'px');
  }

  /* ---------------- 初始化 ---------------- */
  CH.init = function () {
    bindMenus();
    bindTabs();
    bindTools();
    bindStageTools();
    bindToggle();
    bindSplit();
    setTool('select');
    CH.obRender();
    CH.statusRender();
    CH.rulers();
    const setTabByHash = () => CH.setTab('props');
    setTabByHash();

    CH.renderLayers();

    Store.on('doc', () => {
      CH.obRender();
      CH.statusRender();
      CH.renderLayers();
    });
    Store.on('sel', () => {
      CH.obRender();
      CH.statusRender();
      CH.renderLayers();
    });
    Store.on('history', () => { CH.statusRender(); CH.renderLayers(); });

    const zoomNow = ED.applyZoom;
    if (typeof zoomNow === 'function') {
      ED.applyZoom = function (a, b) { zoomNow.call(ED, a, b); CH.rulers(); };
    }
    $$('.dock-list').forEach(() => {});
    CH.refreshCount = function () {
      const n = (window.PANELS && PANELS.arts) ? PANELS.arts().length : 0;
      const c1 = $('#dockCount'), c2 = $('#dockCount2');
      if (c1) c1.textContent = n;
      if (c2) c2.textContent = n;
    };
    CH.refreshCount();
  };

  window.CHROME = CH;
})();


