/* panels.js — 左侧素材面板 / 右侧属性检查器 / 各弹窗逻辑 */
(function () {
  'use strict';

  const PANELS = { cur: 'templates' };
  const AIMOD = { html: '', target: 'layer', busy: false };

  /* ---------------- 小工具 ---------------- */
  const mk = (tag, cls, txt) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  };
  const svg = (id, cls) => '<svg class="i ' + (cls || '') + '"><use href="#' + id + '"/></svg>';

  function panelBody() { return document.getElementById('panelBody'); }

  function sec(title, extra) {
    const s = mk('section', 'p-sec');
    if (title) {
      const h = mk('div', 'p-sec-head');
      h.appendChild(mk('span', 'p-sec-title', title));
      if (extra) h.appendChild(extra);
      s.appendChild(h);
    }
    return s;
  }

  function row(labelTxt, ctrl) {
    const r = mk('label', 'p-row');
    const l = mk('span', 'p-row-l', labelTxt);
    r.appendChild(l);
    r.appendChild(ctrl);
    return r;
  }

  function num(value, onInput, opt) {
    opt = opt || {};
    const i = mk('input', 'p-num');
    i.type = 'number';
    i.value = value == null ? 0 : Math.round(value * 100) / 100;
    if (opt.min != null) i.min = opt.min;
    if (opt.max != null) i.max = opt.max;
    if (opt.step != null) i.step = opt.step;
    i.addEventListener('input', () => onInput(parseFloat(i.value) || 0));
    if (opt.suffix) i.title = opt.suffix;
    return i;
  }

  function range(labelTxt, value, min, max, step, onInput, onChange) {
    const wrap = mk('div', 'p-range');
    const head = mk('div', 'p-range-head');
    head.appendChild(mk('span', null, labelTxt));
    const v = mk('b', null, fmt(value));
    head.appendChild(v);
    const i = mk('input');
    i.type = 'range';
    i.min = min; i.max = max; i.step = step;
    i.value = value;
    i.addEventListener('input', () => {
      v.textContent = fmt(parseFloat(i.value));
      onInput(parseFloat(i.value));
    });
    if (onChange) i.addEventListener('change', () => onChange(parseFloat(i.value)));
    wrap.appendChild(head);
    wrap.appendChild(i);
    return wrap;
  }
  const fmt = (n) => (Math.abs(n) >= 100 ? Math.round(n) : Math.round(n * 100) / 100);

  function select(labelTxt, options, value, onChange) {
    const s = mk('select', 'p-sel');
    options.forEach((o) => {
      const op = mk('option', null, o.name != null ? o.name : o);
      op.value = o.id != null ? o.id : o;
      if (String(op.value) === String(value)) op.selected = true;
      s.appendChild(op);
    });
    s.addEventListener('change', () => onChange(s.value));
    if (!labelTxt) return s;
    return row(labelTxt, s);
  }

  function color(labelTxt, value, onInput) {
    const w = mk('div', 'p-color');
    const i = mk('input');
    i.type = 'color';
    i.value = value || '#000000';
    i.addEventListener('input', () => onInput(i.value));
    w.appendChild(i);
    const hex = mk('input', 'p-hex');
    hex.value = i.value;
    hex.spellcheck = false;
    hex.addEventListener('change', () => {
      if (/^#?[0-9a-f]{6}$/i.test(hex.value)) {
        let v = hex.value.charAt(0) === '#' ? hex.value : '#' + hex.value;
        i.value = v;
        onInput(v);
      }
    });
    w.appendChild(hex);
    return row(labelTxt, w);
  }

  function toggle(labelTxt, val, onChange) {
    const l = mk('label', 'p-toggle');
    l.appendChild(mk('span', null, labelTxt));
    const b = mk('button', 'sw' + (val ? ' on' : ''));
    b.type = 'button';
    b.innerHTML = '<i></i>';
    b.addEventListener('click', () => {
      const on = !b.classList.contains('on');
      b.classList.toggle('on', on);
      onChange(on);
    });
    l.appendChild(b);
    return l;
  }

  function chips(items, value, onPick, cls) {
    const w = mk('div', 'chips ' + (cls || ''));
    items.forEach((it) => {
      const b = mk('button', 'chip-btn' + (String(it.id != null ? it.id : it) === String(value) ? ' is-on' : ''));
      b.type = 'button';
      if (it.sw) b.style.setProperty('--sw', it.sw);
      b.textContent = it.name != null ? it.name : it;
      b.addEventListener('click', () => {
        w.querySelectorAll('.chip-btn').forEach((x) => x.classList.remove('is-on'));
        b.classList.add('is-on');
        onPick(it.id != null ? it.id : it);
      });
      w.appendChild(b);
    });
    return w;
  }

  /* ---------------- 画布属性 ---------------- */
  function paintCanvas() {
    if (!Store.doc) return;
    R.render();
    ED.syncSel();
  }
  function canvasPatch(patch, label) {
    Object.assign(Store.doc.canvas, patch);
    paintCanvas();
    if (label) Store.commit(label);
  }
  function overlayPatch(key, v) {
    Store.doc.canvas.overlay = Store.doc.canvas.overlay || {};
    Store.doc.canvas.overlay[key] = v;
    paintCanvas();
  }

  /* ---------------- 图层属性写入 ---------------- */
  function apply(patch, label) {
    const ls = Store.selLayers();
    if (!ls.length) return;
    ls.forEach((l) => Object.assign(l, patch));
    R.render();
    ED.syncSel();
    if (label) Store.commit(label);
  }

  /* =========================================================
     面板：模板
     ========================================================= */
  function panelTemplates() {
    const doc = Store.doc;
    const box = mk('div', 'p-stack');

    // 配色
    const ps = sec('配色方案');
    const strip = mk('div', 'pal-strip');
    DATA.PALETTES.forEach((p) => {
      const b = mk('button', 'pal' + (p.id === doc.paletteId ? ' is-on' : ''));
      b.type = 'button';
      b.title = p.name;
      b.style.background = 'linear-gradient(135deg,' + p.bg + ' 0 46%,' + p.accent + ' 46% 74%,' + p.fg + ' 74%)';
      b.addEventListener('click', () => {
        Store.applyPalette(p.id);
        PANELS.repaint();
      });
      strip.appendChild(b);
    });
    ps.appendChild(strip);
    box.appendChild(ps);

    // 布局
    const ls = sec('版式（点击套用）');
    const grid = mk('div', 'tpl-grid');
    DATA.LAYOUTS.forEach((ly) => {
      const card = mk('button', 'tpl-card');
      card.type = 'button';
      const th = mk('div', 'tpl-thumb');
      const inner = mk('div', 'poster tpl-poster');
      const k = 150 / doc.canvas.w;
      inner.style.width = doc.canvas.w + 'px';
      inner.style.height = doc.canvas.h + 'px';
      inner.style.background = doc.canvas.bg;
      inner.style.transform = 'scale(' + k + ')';
      inner.style.transformOrigin = '0 0';
      let layers = [];
      try { layers = ly.build({ w: doc.canvas.w, h: doc.canvas.h, p: Store.palette() }); } catch (e) { layers = []; }
      layers.forEach((l) => inner.appendChild(R.buildLayer(l)));
      th.style.height = Math.round(doc.canvas.h * k) + 'px';
      th.appendChild(inner);
      card.appendChild(th);
      const meta = mk('div', 'tpl-meta');
      meta.appendChild(mk('b', null, ly.name));
      meta.appendChild(mk('em', null, ly.tag));
      card.appendChild(meta);
      card.addEventListener('click', () => {
        const built = ly.build({ w: doc.canvas.w, h: doc.canvas.h, p: Store.palette() });
        Store.replaceAll(built, '套用版式 · ' + ly.name);
        U.toast('已套用：' + ly.name);
      });
      grid.appendChild(card);
    });
    ls.appendChild(grid);
    box.appendChild(ls);

    // 画布质感
    const ov = sec('画布质感');
    DATA.OVERLAYS.forEach((o) => {
      const v = (doc.canvas.overlay && doc.canvas.overlay[o.id]) || 0;
      ov.appendChild(range(o.name, v, 0, o.max, 1, (x) => overlayPatch(o.id, x), () => Store.commit('画布质感')));
    });
    const quick = mk('div', 'chips');
    [
      { name: '干净', v: { grain: 0, vignette: 0, halftone: 0, scan: 0, leak: 0, mesh: 0, grid: 0 } },
      { name: '胶片', v: { grain: 34, vignette: 32, halftone: 0, scan: 0, leak: 12, mesh: 0, grid: 0 } },
      { name: '印刷', v: { grain: 22, vignette: 10, halftone: 26, scan: 0, leak: 0, mesh: 0, grid: 0 } },
      { name: '夜店', v: { grain: 18, vignette: 30, halftone: 0, scan: 18, leak: 22, mesh: 26, grid: 0 } }
    ].forEach((q) => {
      const b = mk('button', 'chip-btn', q.name);
      b.type = 'button';
      b.addEventListener('click', () => {
        Store.doc.canvas.overlay = Object.assign({}, Store.doc.canvas.overlay, q.v);
        paintCanvas();
        Store.commit('质感预设');
        PANELS.repaint();
      });
      quick.appendChild(b);
    });
    ov.appendChild(quick);
    box.appendChild(ov);

    return box;
  }

  /* =========================================================
     面板：文字
     ========================================================= */
  function panelText() {
    const doc = Store.doc;
    const box = mk('div', 'p-stack');

    const s1 = sec('添加文字');
    const list = mk('div', 'preset-list');
    DATA.TEXT_PRESETS.forEach((t) => {
      const b = mk('button', 'preset-row');
      b.type = 'button';
      const nm = mk('b', null, t.name);
      nm.style.fontSize = Math.max(12, Math.min(20, t.size * 150)) + 'px';
      nm.style.fontWeight = String(Math.min(900, t.weight));
      b.appendChild(nm);
      b.appendChild(mk('em', null, Math.round(t.size * 100) + '%'));
      b.addEventListener('click', () => {
        const size = Math.round(Math.min(doc.canvas.w, doc.canvas.h) * t.size);
        const w = doc.canvas.w * 0.78;
        const l = DATA.mkText({
          text: t.id === 'display' ? '把想法\n做成形状' : t.name === '正文' ? '在这里写一段正文，讲清一件事：它是什么，为什么值得看，以及下一步做什么。' : t.name,
          size: size,
          weight: t.weight,
          lineHeight: t.lh,
          tracking: t.tracking,
          font: t.font,
          color: Store.palette().fg,
          x: Math.round((doc.canvas.w - w) / 2),
          y: Math.round(doc.canvas.h * 0.4),
          w: Math.round(w),
          h: Math.round(size * 2.4)
        });
        Store.add(l, { label: '添加文字' });
        setTimeout(() => ED.setEditing(l.id), 60);
      });
      list.appendChild(b);
    });
    s1.appendChild(list);
    box.appendChild(s1);

    const sel = Store.one();
    if (sel && sel.type === 'text') {
      const s2 = sec('文字特效（当前选中）');
      s2.appendChild(chips(DATA.TEXT_FX, sel.textFx, (id) => apply({ textFx: id }, '文字特效'), 'fx-chips'));
      const s3 = sec('字体');
      DATA.FONTS.forEach((f) => {
        const b = mk('button', 'font-row' + (sel.font === f.id ? ' is-on' : ''));
        b.type = 'button';
        b.style.fontFamily = f.stack;
        b.textContent = f.name + ' · Aa 汉字 123';
        b.addEventListener('click', () => {
          apply({ font: f.id }, '换字体');
          PANELS.repaint();
        });
        s3.appendChild(b);
      });
      box.appendChild(s2);
      box.appendChild(s3);
    } else {
      const tip = sec('');
      tip.appendChild(mk('p', 'p-tip', '选中一个文字图层后，这里会出现特效与字体选项。双击画布上的文字可直接改文案。'));
      box.appendChild(tip);
    }
    return box;
  }

  /* =========================================================
     面板：元素
     ========================================================= */
  function shapeGlyph(id) {
    const s = mk('span', 'glyph glyph-' + id);
    return s;
  }

  function panelElements() {
    const doc = Store.doc;
    const box = mk('div', 'p-stack');

    const s1 = sec('基础形状');
    const g1 = mk('div', 'grid-3');
    DATA.SHAPES.forEach((sh) => {
      const b = mk('button', 'el-cell');
      b.type = 'button';
      b.title = sh.name;
      b.appendChild(shapeGlyph(sh.id));
      b.appendChild(mk('span', null, sh.name));
      b.addEventListener('click', () => {
        const base = Math.min(doc.canvas.w, doc.canvas.h);
        const isLine = sh.id === 'line';
        const l = DATA.mkShape({
          name: sh.name, shape: sh.id,
          x: Math.round((doc.canvas.w - base * 0.3) / 2),
          y: Math.round((doc.canvas.h - (isLine ? 8 : base * 0.3)) / 2),
          w: Math.round(isLine ? base * 0.5 : base * 0.3),
          h: Math.round(isLine ? Math.max(4, base * 0.008) : base * 0.3),
          fill: Store.palette().accent,
          stroke: sh.id === 'ring' || sh.id === 'frame' ? Store.palette().fg : '',
          strokeW: sh.id === 'ring' || sh.id === 'frame' ? Math.max(2, base * 0.006) : 0,
          radius: sh.id === 'rect' ? Math.round(base * 0.02) : 0,
          icon: sh.id === 'icon' ? 'star' : undefined
        });
        Store.add(l, { label: '添加形状' });
      });
      g1.appendChild(b);
    });
    s1.appendChild(g1);
    box.appendChild(s1);

    const s2 = sec('图标');
    const g2 = mk('div', 'grid-4');
    DATA.ICONS.forEach((ic) => {
      const b = mk('button', 'el-cell icon-cell');
      b.type = 'button';
      b.title = ic.name;
      b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
        ic.d.map((d) => '<path d="' + d + '"/>').join('') + '</svg>';
      b.addEventListener('click', () => {
        const base = Math.min(doc.canvas.w, doc.canvas.h);
        const l = DATA.mkShape({
          name: ic.name, shape: 'icon', icon: ic.id,
          x: Math.round((doc.canvas.w - base * 0.12) / 2),
          y: Math.round((doc.canvas.h - base * 0.12) / 2),
          w: Math.round(base * 0.12), h: Math.round(base * 0.12),
          fill: 'transparent', stroke: Store.palette().accent,
          strokeW: Math.max(1.4, base * 0.002)
        });
        Store.add(l, { label: '添加图标' });
      });
      g2.appendChild(b);
    });
    s2.appendChild(g2);
    box.appendChild(s2);

    const s3 = sec('叠加快捷');
    s3.appendChild(mk('p', 'p-tip', '一键给整张画布加质感，细节可在「效果」里调数值。'));
    const chipsWrap = mk('div', 'chips');
    [
      { name: '撕纸边', v: { grain: 28, vignette: 18 } },
      { name: '半调印刷', v: { halftone: 34, grain: 16 } },
      { name: '荧光扫线', v: { scan: 26, leak: 18 } },
      { name: '光晕雾', v: { mesh: 34, vignette: 12 } },
      { name: '工程网格', v: { grid: 32, grain: 6 } }
    ].forEach((q) => {
      const b = mk('button', 'chip-btn', q.name);
      b.type = 'button';
      b.addEventListener('click', () => {
        Store.doc.canvas.overlay = Object.assign({}, Store.doc.canvas.overlay, q.v);
        paintCanvas(); Store.commit('叠加快捷');
        U.toast('已叠加：' + q.name);
      });
      chipsWrap.appendChild(b);
    });
    s3.appendChild(chipsWrap);
    box.appendChild(s3);
    return box;
  }

  /* =========================================================
     面板：图片
     ========================================================= */
  function panelImage() {
    const doc = Store.doc;
    const box = mk('div', 'p-stack');

    const s1 = sec('上传');
    const dz = mk('button', 'dropzone');
    dz.type = 'button';
    dz.innerHTML = svg('i-upload') + '<b>点击或拖入图片</b><span>PNG / JPG / WebP / SVG，本地读取不上传</span>';
    dz.addEventListener('click', () => {
      U.pickFiles('image/*', true).then((files) => {
        if (!files.length) return;
        files.slice(0, 8).forEach((f, i) => {
          U.readFile(f).then((src) => {
            const base = Math.min(doc.canvas.w, doc.canvas.h);
            const s = base * (files.length > 1 ? 0.34 : 0.62);
            const l = DATA.mkImage({
              name: f.name.replace(/\.[^.]+$/, ''),
              x: Math.round((doc.canvas.w - s) / 2 + (i % 2) * 18),
              y: Math.round((doc.canvas.h - s) / 2 + i * 18),
              w: Math.round(s), h: Math.round(s), src,
              radius: Math.round(base * 0.012)
            });
            Store.add(l, { label: '插入图片' });
          });
        });
      });
    });
    s1.appendChild(dz);
    box.appendChild(s1);

    const sel = Store.one();
    if (sel && sel.type === 'image') {
      const s2 = sec('图片设置');
      s2.appendChild(chips([{ id: 'cover', name: '填满裁剪' }, { id: 'contain', name: '完整显示' }], sel.fit, (v) => apply({ fit: v }, '图片适配')));
      s2.appendChild(range('圆角', sel.radius || 0, 0, 400, 1, (v) => apply({ radius: v }), () => Store.commit('圆角')));
      s2.appendChild(range('不透明度', (sel.opacity == null ? 1 : sel.opacity) * 100, 0, 100, 1, (v) => apply({ opacity: v / 100 }), () => Store.commit('透明度')));
      box.appendChild(s2);

      const s3 = sec('滤镜');
      const fg = mk('div', 'grid-3');
      DATA.FILTER_PRESETS.forEach((fp) => {
        const b = mk('button', 'el-cell');
        b.type = 'button';
        b.appendChild(mk('span', 'glyph glyph-filter glyph-' + fp.id));
        b.appendChild(mk('span', null, fp.name));
        b.addEventListener('click', () => {
          apply({ filters: Object.assign({}, sel.filters, fp.f, { duotone: !!fp.f.duotone }) }, '滤镜 · ' + fp.name);
          PANELS.repaint();
        });
        fg.appendChild(b);
      });
      s3.appendChild(fg);
      s3.appendChild(color('双色调 暗部', (sel.filters && sel.filters.d1) || '#0B0F14', (v) => apply({ filters: Object.assign({}, sel.filters, { d1: v, duotone: true }) }, '双色调')));
      s3.appendChild(color('双色调 亮部', (sel.filters && sel.filters.d2) || '#F4F7FB', (v) => apply({ filters: Object.assign({}, sel.filters, { d2: v, duotone: true }) }, '双色调')));
      box.appendChild(s3);
    } else {
      const t = sec('');
      t.appendChild(mk('p', 'p-tip', '选中一个图片图层后，这里会出现滤镜与双色调控制。也可以直接把图片拖到画布上。'));
      box.appendChild(t);
    }

    const s4 = sec('想要插画？');
    const aiBtn = mk('button', 'btn ghost block');
    aiBtn.innerHTML = svg('i-sparkle', 'accent') + '用 AI 生成矢量插画图层';
    aiBtn.addEventListener('click', () => openAi());
    s4.appendChild(aiBtn);
    s4.appendChild(mk('p', 'p-tip', 'AI 插画不是文生图：模型写一段 Canvas 程序，能播动画，也能录成视频。'));
    box.appendChild(s4);
    return box;
  }

  /* =========================================================
     面板：效果
     ========================================================= */
  function panelEffects() {
    const doc = Store.doc;
    const sel = Store.one();
    const box = mk('div', 'p-stack');

    const s1 = sec('画布质感');
    DATA.OVERLAYS.forEach((o) => {
      const v = (doc.canvas.overlay && doc.canvas.overlay[o.id]) || 0;
      s1.appendChild(range(o.name, v, 0, o.max, 1, (x) => overlayPatch(o.id, x), () => Store.commit('画布质感')));
    });
    box.appendChild(s1);

    if (!sel) {
      const t = sec('');
      t.appendChild(mk('p', 'p-tip', '选中一个图层，可调滤镜、混合模式、阴影与动效。'));
      box.appendChild(t);
      return box;
    }

    const s2 = sec('图层滤镜');
    const f = sel.filters || {};
    const setF = (patch, label) => apply({ filters: Object.assign({}, sel.filters, patch) }, label);
    s2.appendChild(range('模糊', f.blur || 0, 0, 40, 0.5, (v) => setF({ blur: v }), () => Store.commit('模糊')));
    s2.appendChild(range('亮度', (f.brightness == null ? 1 : f.brightness) * 100, 20, 200, 1, (v) => setF({ brightness: v / 100 }), () => Store.commit('亮度')));
    s2.appendChild(range('对比度', (f.contrast == null ? 1 : f.contrast) * 100, 20, 220, 1, (v) => setF({ contrast: v / 100 }), () => Store.commit('对比度')));
    s2.appendChild(range('饱和度', (f.saturate == null ? 1 : f.saturate) * 100, 0, 220, 1, (v) => setF({ saturate: v / 100 }), () => Store.commit('饱和度')));
    s2.appendChild(range('色相', f.hue || 0, -180, 180, 1, (v) => setF({ hue: v }), () => Store.commit('色相')));
    s2.appendChild(range('黑白', (f.grayscale || 0) * 100, 0, 100, 1, (v) => setF({ grayscale: v / 100 }), () => Store.commit('黑白')));
    s2.appendChild(range('泛黄', (f.sepia || 0) * 100, 0, 100, 1, (v) => setF({ sepia: v / 100 }), () => Store.commit('泛黄')));
    const pf = mk('div', 'chips');
    DATA.FILTER_PRESETS.forEach((fp) => {
      const b = mk('button', 'chip-btn', fp.name);
      b.type = 'button';
      b.addEventListener('click', () => apply({ filters: Object.assign({}, sel.filters, fp.f) }, '滤镜 · ' + fp.name));
      pf.appendChild(b);
    });
    s2.appendChild(pf);
    box.appendChild(s2);

    const s3 = sec('混合与动效');
    s3.appendChild(select('混合模式', DATA.BLENDS.map((b) => ({ id: b, name: b })), sel.blend || 'normal', (v) => apply({ blend: v }, '混合模式')));
    s3.appendChild(select('动效', DATA.MOTIONS.map((m) => ({ id: m.id, name: m.name })), sel.motion || 'none', (v) => apply({ motion: v }, '动效')));
    s3.appendChild(range('不透明度', (sel.opacity == null ? 1 : sel.opacity) * 100, 0, 100, 1, (v) => apply({ opacity: v / 100 }), () => Store.commit('透明度')));
    box.appendChild(s3);

    const s4 = sec('阴影');
    const sh = sel.shadow || { on: false, x: 0, y: 18, blur: 40, color: '#000000', alpha: 0.4 };
    s4.appendChild(toggle('启用阴影', sh.on, (on) => apply({ shadow: Object.assign({}, sel.shadow, { on }) }, '阴影')));
    if (sh.on) {
      s4.appendChild(range('X', sh.x, -120, 120, 1, (v) => apply({ shadow: Object.assign({}, sel.shadow, { x: v }) }), () => Store.commit('阴影')));
      s4.appendChild(range('Y', sh.y, -120, 120, 1, (v) => apply({ shadow: Object.assign({}, sel.shadow, { y: v }) }), () => Store.commit('阴影')));
      s4.appendChild(range('模糊', sh.blur, 0, 200, 1, (v) => apply({ shadow: Object.assign({}, sel.shadow, { blur: v }) }), () => Store.commit('阴影')));
      s4.appendChild(range('浓度', sh.alpha * 100, 0, 100, 1, (v) => apply({ shadow: Object.assign({}, sel.shadow, { alpha: v / 100 }) }), () => Store.commit('阴影')));
      s4.appendChild(color('颜色', sh.color, (v) => apply({ shadow: Object.assign({}, sel.shadow, { color: v }) }, '阴影色')));
    }
    box.appendChild(s4);
    return box;
  }

  /* =========================================================
     面板：AI 插画
     ========================================================= */
  function panelAI() {
    const box = mk('div', 'p-stack');
    const doc = Store.doc;

    const s0 = sec('AI 编程插画');
    const cta = mk('button', 'btn primary block');
    cta.innerHTML = svg('i-sparkle') + '打开生成器';
    cta.addEventListener('click', () => openAi());
    s0.appendChild(cta);
    s0.appendChild(mk('p', 'p-tip', '插画由大模型直接写 Canvas 代码，不是文生图：可无限缩放、能播动画、能录成视频。'));
    box.appendChild(s0);

    const s1 = sec('本地算法插画（无需 Key）');
    const g = mk('div', 'ai-grid');
    LocalArt.list.forEach((t) => {
      const card = mk('button', 'ai-card');
      card.type = 'button';
      const fw = mk('div', 'ai-thumb');
      const html = LocalArt.make(t.id, {
        w: 320, h: Math.max(160, Math.round(320 * doc.canvas.h / doc.canvas.w)),
        duration: 6, fps: 24, seed: 20261102, palette: Store.palette()
      });
      const ifr = mk('iframe');
      ifr.setAttribute('sandbox', 'allow-scripts');
      ifr.setAttribute('scrolling', 'no');
      ifr.srcdoc = R.aiDoc(html, 320, 320, true);
      fw.appendChild(ifr);
      card.appendChild(fw);
      card.appendChild(mk('b', null, t.name));
      card.appendChild(mk('em', null, t.note));
      card.addEventListener('click', () => {
        const spot = bestArtRect(doc);
        const L = DATA.mkAI({
          name: t.name,
          x: spot.x, y: spot.y, w: spot.w, h: spot.h,
          artHtml: LocalArt.make(t.id, { w: spot.w, h: spot.h, duration: 6, fps: 30, seed: Math.floor(Math.random() * 1e6), palette: Store.palette() }),
          aiBrief: t.name
        });
        Store.add(L, { label: '本地插画' });
        U.toast('已插入：' + t.name);
      });
      g.appendChild(card);
    });
    s1.appendChild(g);
    box.appendChild(s1);

    const s2 = sec('固定提示词（可复制到任意模型）');
    const pre = mk('pre', 'prompt-pre');
    pre.textContent = PROMPT.SYSTEM.slice(0, 900) + '\n…';
    s2.appendChild(pre);
    const cb = mk('button', 'btn tiny');
    cb.textContent = '复制完整提示词';
    cb.addEventListener('click', () => {
      U.download('plaque-prompt.md', PROMPT.full());
      U.toast('提示词已导出 markdown');
    });
    s2.appendChild(cb);
    box.appendChild(s2);
    return box;
  }

  /* =========================================================
     面板：图层
     ========================================================= */
  function panelLayers() {
    const doc = Store.doc;
    const box = mk('div', 'p-stack');

    const s0 = sec('画布');
    s0.appendChild(color('背景色', doc.canvas.bg, (v) => canvasPatch({ bg: v })));
    s0.appendChild(select('画板尺寸', DATA.FRAMES.map((f) => ({ id: f.id, name: f.name + ' · ' + f.w + '×' + f.h })), doc.frameId,
      (v) => { Store.setFrame(DATA.frameById(v)); ED.fit(); PANELS.repaint(); }));
    box.appendChild(s0);

    const s1 = sec('图层（自下而上）');
    const list = mk('div', 'layer-list');
    const layers = doc.layers.slice().reverse();
    if (!layers.length) {
      list.appendChild(mk('p', 'p-tip', '还没有图层。从「模板」套个版式，或从「元素 / 文字」添加。'));
    }
    layers.forEach((l) => {
      const r = mk('div', 'layer-row' + (Store.sel.indexOf(l.id) >= 0 ? ' is-on' : ''));
      r.dataset.id = l.id;
      const eye = mk('button', 'lr-btn');
      eye.innerHTML = svg(l.hidden ? 'i-eyeoff' : 'i-eye', 'sm');
      eye.addEventListener('click', (e) => {
        e.stopPropagation();
        l.hidden = !l.hidden;
        R.render(); ED.syncSel(); Store.commit('显隐'); PANELS.repaint();
      });
      const lk = mk('button', 'lr-btn');
      lk.innerHTML = svg(l.locked ? 'i-lock' : 'i-unlock', 'sm');
      lk.addEventListener('click', (e) => {
        e.stopPropagation();
        l.locked = !l.locked;
        Store.commit('锁定'); PANELS.repaint();
      });
      const th = mk('span', 'lr-thumb');
      if (l.type === 'ai') th.innerHTML = svg('i-sparkle');
      else if (l.type === 'text') th.textContent = 'T';
      else if (l.type === 'image') th.innerHTML = svg('i-image');
      else if (l.shape === 'icon') th.innerHTML = svg('i-star');
      else th.innerHTML = '<i style="background:' + (l.fill && l.fill !== 'transparent' ? l.fill : (l.color || '#fff')) + '"></i>';
      const nm = mk('input', 'lr-name');
      nm.value = l.name || l.type;
      nm.spellcheck = false;
      nm.addEventListener('click', (e) => e.stopPropagation());
      nm.addEventListener('change', () => { l.name = nm.value; Store.commit('改名'); });
      const acts = mk('div', 'lr-acts');
      const up = mk('button', 'lr-btn');
      up.innerHTML = svg('i-up', 'sm');
      up.title = '上移一层';
      up.addEventListener('click', (e) => { e.stopPropagation(); Store.reorder(l.id, 'up'); PANELS.repaint(); });
      const dn = mk('button', 'lr-btn');
      dn.innerHTML = svg('i-down', 'sm');
      dn.title = '下移一层';
      dn.addEventListener('click', (e) => { e.stopPropagation(); Store.reorder(l.id, 'down'); PANELS.repaint(); });
      const del = mk('button', 'lr-btn danger');
      del.innerHTML = svg('i-trash', 'sm');
      del.addEventListener('click', (e) => { e.stopPropagation(); Store.remove([l.id]); PANELS.repaint(); });
      acts.appendChild(up); acts.appendChild(dn); acts.appendChild(del);

      r.appendChild(eye); r.appendChild(lk); r.appendChild(th); r.appendChild(nm); r.appendChild(acts);
      r.addEventListener('click', () => {
        Store.select([l.id]);
        ED.syncSel();
        PANELS.inspector();
      });
      list.appendChild(r);
    });
    s1.appendChild(list);
    box.appendChild(s1);

    const s2 = sec('统计');
    const st = Store.stats();
    s2.appendChild(mk('p', 'p-tip', '共 ' + st.layers + ' 个图层，其中 ' + st.ai + ' 个是 AI/算法插画（可播放）。'));
    box.appendChild(s2);
    return box;
  }

  /* =========================================================
     面板路由
     ========================================================= */
  const BUILDERS = {
    templates: panelTemplates,
    text: panelText,
    elements: panelElements,
    image: panelImage,
    effects: panelEffects,
    ai: panelAI,
    layers: panelLayers
  };

  PANELS.open = function (name) {
    PANELS.cur = name;
    const panel = document.getElementById('panel');
    if (panel) panel.classList.remove('is-closed');
    document.querySelectorAll('.rail-btn').forEach((b) => b.classList.toggle('is-active', b.dataset.panel === name));
    const t = document.getElementById('panelTitle');
    const titles = { templates: '模板', text: '文字', elements: '元素', image: '图片', effects: '效果', ai: 'AI 插画', layers: '图层' };
    if (t) t.textContent = titles[name] || '面板';
    PANELS.render();
  };

  PANELS.render = function () {
    const body = panelBody();
    if (!body || !Store.doc) return;
    body.innerHTML = '';
    const fn = BUILDERS[PANELS.cur] || panelTemplates;
    try {
      body.appendChild(fn());
    } catch (e) {
      console.warn(e);
      body.appendChild(mk('p', 'p-tip', '面板渲染出错：' + e.message));
    }
  };

  PANELS.repaint = function () {
    const body = panelBody();
    const ae = document.activeElement;
    if (body && ae && body.contains(ae) && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA')) return;
    PANELS.render();
  };

  /* =========================================================
     右侧属性检查器
     ========================================================= */
  PANELS.inspector = function () {
    const host = document.getElementById('inspector');
    if (!host || !Store.doc) return;
    const ae = document.activeElement;
    if (ae && host.contains(ae) && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.tagName === 'SELECT')) return;

    host.innerHTML = '';
    const doc = Store.doc;
    const ls = Store.selLayers();
    const head = mk('div', 'ins-head');
    head.appendChild(mk('b', null, ls.length === 1 ? (ls[0].name || '图层') : ls.length ? ls.length + ' 个图层' : '画布'));
    host.appendChild(head);

    if (!ls.length) {
      const s = mk('div', 'ins-sec');
      s.appendChild(color('背景色', doc.canvas.bg, (v) => canvasPatch({ bg: v })));
      s.appendChild(range('颗粒', doc.canvas.overlay.grain || 0, 0, 100, 1, (v) => overlayPatch('grain', v), () => Store.commit('颗粒')));
      s.appendChild(range('暗角', doc.canvas.overlay.vignette || 0, 0, 100, 1, (v) => overlayPatch('vignette', v), () => Store.commit('暗角')));
      s.appendChild(mk('p', 'p-tip', '选中图层后可编辑位置、文字与效果。'));
      host.appendChild(s);
      return;
    }

    const l = ls[0];

    // 位置尺寸
    const s1 = mk('div', 'ins-sec');
    const g = mk('div', 'ins-grid2');
    const put = (labelTxt, key, val, opts) => {
      const f = mk('label', 'ins-fld');
      f.appendChild(mk('span', null, labelTxt));
      const i = num(val, (v) => {
        ls.forEach((x) => { x[key] = v; });
        R.render(); ED.syncSel();
      }, opts);
      i.dataset.field = key;
      f.appendChild(i);
      g.appendChild(f);
    };
    put('X', 'x', Math.round(l.x));
    put('Y', 'y', Math.round(l.y));
    put('宽', 'w', Math.round(l.w), { min: 4 });
    put('高', 'h', Math.round(l.h), { min: 4 });
    put('旋转', 'rot', Math.round(l.rot || 0));
    put('透明%', 'opacity', Math.round((l.opacity == null ? 1 : l.opacity) * 100));
    s1.appendChild(g);
    const commitBtn = mk('button', 'btn tiny block');
    commitBtn.textContent = '应用位置变化';
    commitBtn.addEventListener('click', () => Store.commit('调整位置'));
    s1.appendChild(commitBtn);
    host.appendChild(s1);

    // 文字
    if (l.type === 'text') {
      const s = mk('div', 'ins-sec');
      const ta = mk('textarea', 'ins-ta');
      ta.value = l.text || '';
      ta.rows = 3;
      ta.addEventListener('input', () => {
        ls.forEach((x) => { x.text = ta.value; });
        R.render(); ED.syncSel();
      });
      ta.addEventListener('change', () => Store.commit('改文案'));
      s.appendChild(ta);
      s.appendChild(select('字体', DATA.FONTS.map((f) => ({ id: f.id, name: f.name })), l.font, (v) => { apply({ font: v }, '字体'); PANELS.repaint(); }));
      const g2 = mk('div', 'ins-grid2');
      const f2 = (t, k, v, st) => {
        const f = mk('label', 'ins-fld');
        f.appendChild(mk('span', null, t));
        const i = num(v, (x) => { apply({ [k]: x }); }, st);
        f.appendChild(i);
        g2.appendChild(f);
      };
      f2('字号', 'size', l.size, { min: 6, step: 1 });
      f2('字重', 'weight', l.weight, { min: 100, max: 900, step: 100 });
      f2('行高', 'lineHeight', l.lineHeight, { step: 0.02, min: 0.6 });
      f2('字距', 'tracking', l.tracking, { step: 0.005 });
      s.appendChild(g2);
      s.appendChild(chips([{ id: 'left', name: '左' }, { id: 'center', name: '中' }, { id: 'right', name: '右' }], l.align, (v) => apply({ align: v }, '对齐')));
      s.appendChild(chips([{ id: 'top', name: '上' }, { id: 'middle', name: '中' }, { id: 'bottom', name: '下' }], l.valign, (v) => apply({ valign: v }, '垂直对齐')));
      s.appendChild(chips(DATA.TEXT_FX, l.textFx, (v) => apply({ textFx: v }, '文字特效'), 'fx-chips'));
      s.appendChild(color('颜色', l.color, (v) => apply({ color: v })));
      s.appendChild(color('第二色 / 描边', l.stroke || l.fill2 || '#35E08A', (v) => apply({ stroke: v, fill2: v })));
      s.appendChild(toggle('斜体', !!l.italic, (on) => apply({ italic: on }, '斜体')));
      s.appendChild(toggle('全大写', !!l.upper, (on) => apply({ upper: on }, '大写')));
      host.appendChild(s);
    }

    // 形状
    if (l.type === 'shape') {
      const s = mk('div', 'ins-sec');
      s.appendChild(color('填充', l.fill === 'transparent' ? '#35E08A' : l.fill, (v) => apply({ fill: v })));
      s.appendChild(color('渐变第二色', l.fill2 || l.fill, (v) => apply({ fill2: v })));
      s.appendChild(range('渐变角度', l.gradAngle || 0, 0, 360, 1, (v) => apply({ gradAngle: v }), () => Store.commit('渐变')));
      s.appendChild(chips([{ id: 'linear', name: '线性' }, { id: 'radial', name: '径向' }], l.gradType || 'linear', (v) => apply({ gradType: v }, '渐变类型')));
      s.appendChild(range('圆角', l.radius || 0, 0, 600, 1, (v) => apply({ radius: v }), () => Store.commit('圆角')));
      s.appendChild(color('描边色', l.stroke || '#EEF3FA', (v) => apply({ stroke: v })));
      s.appendChild(range('描边宽', l.strokeW || 0, 0, 60, 1, (v) => apply({ strokeW: v }), () => Store.commit('描边')));
      if (l.shape === 'icon') {
        s.appendChild(select('图标', DATA.ICONS.map((i) => ({ id: i.id, name: i.name })), l.icon || 'star', (v) => apply({ icon: v }, '换图标')));
      }
      host.appendChild(s);
    }

    // 图片
    if (l.type === 'image') {
      const s = mk('div', 'ins-sec');
      const b = mk('button', 'btn tiny block');
      b.textContent = '替换图片';
      b.addEventListener('click', () => {
        U.pickFiles('image/*', false).then((fs) => {
          if (!fs.length) return;
          U.readFile(fs[0]).then((src) => apply({ src }, '换图'));
        });
      });
      s.appendChild(b);
      s.appendChild(chips([{ id: 'cover', name: '填满' }, { id: 'contain', name: '完整' }], l.fit, (v) => apply({ fit: v }, '适配')));
      s.appendChild(range('圆角', l.radius || 0, 0, 400, 1, (v) => apply({ radius: v }), () => Store.commit('圆角')));
      host.appendChild(s);
    }

    // AI
    if (l.type === 'ai') {
      const s = mk('div', 'ins-sec');
      s.appendChild(mk('p', 'p-tip', '这是一个可播放的插画图层：' + (l.aiBrief || '未命名') + ' · ' + (l.duration || 6) + 's / ' + (l.fps || 30) + 'fps'));
      const r1 = mk('button', 'btn tiny block');
      r1.innerHTML = svg('i-refresh', 'sm') + '换一版（同一主题）';
      r1.addEventListener('click', () => {
        const w = l.w, h = l.h;
        const html = LocalArt.make(pickLocal(l.aiBrief), {
          w: Math.round(w), h: Math.round(h), duration: l.duration || 6, fps: l.fps || 30,
          seed: Math.floor(Math.random() * 1e6), palette: Store.palette()
        });
        apply({ artHtml: html, artSeed: Math.floor(Math.random() * 1e6) }, '换一版');
        U.toast('已换一版本地算法插画');
      });
      s.appendChild(r1);
      const r2 = mk('button', 'btn tiny block');
      r2.textContent = '编辑源码';
      r2.addEventListener('click', () => openCode(l.artHtml || '', (next) => {
        apply({ artHtml: next }, '改插画代码');
      }));
      s.appendChild(r2);
      const r3 = mk('button', 'btn tiny block');
      r3.textContent = '用 AI 重画';
      r3.addEventListener('click', () => openAi(l.aiBrief, l));
      s.appendChild(r3);
      host.appendChild(s);
    }

    // 通用：混合 / 动效 / 排列
    const s2 = mk('div', 'ins-sec');
    s2.appendChild(select('混合模式', DATA.BLENDS.map((b) => ({ id: b, name: b })), l.blend || 'normal', (v) => apply({ blend: v }, '混合')));
    s2.appendChild(select('动效', DATA.MOTIONS.map((m) => ({ id: m.id, name: m.name })), l.motion || 'none', (v) => apply({ motion: v }, '动效')));
    const alignRow = mk('div', 'chips');
    [['left', '左'], ['hcenter', '中'], ['right', '右'], ['top', '顶'], ['vcenter', '中'], ['bottom', '底']].forEach(([m, t]) => {
      const b = mk('button', 'chip-btn', t);
      b.type = 'button';
      b.addEventListener('click', () => { Store.align(m); });
      alignRow.appendChild(b);
    });
    s2.appendChild(alignRow);
    const ops = mk('div', 'chips');
    [['front', '置顶'], ['back', '置底'], ['up', '上移'], ['down', '下移']].forEach(([d, t]) => {
      const b = mk('button', 'chip-btn', t);
      b.type = 'button';
      b.addEventListener('click', () => { Store.reorder(l.id, d); PANELS.repaint(); });
      ops.appendChild(b);
    });
    s2.appendChild(ops);
    const ops2 = mk('div', 'chips');
    [['复制', () => Store.duplicate()], ['删除', () => Store.remove()], ['锁定', () => apply({ locked: !l.locked }, '锁定')]].forEach(([t, fn]) => {
      const b = mk('button', 'chip-btn', t);
      b.type = 'button';
      b.addEventListener('click', fn);
      ops2.appendChild(b);
    });
    s2.appendChild(ops2);
    host.appendChild(s2);
  };

  document.addEventListener('plaque:live', (e) => {
    const host = document.getElementById('inspector');
    if (!host) return;
    (e.detail.fields || []).forEach((k) => {
      const i = host.querySelector('[data-field="' + k + '"]');
      const l = Store.one();
      if (i && l && document.activeElement !== i) i.value = Math.round(l[k] * 100) / 100;
    });
  });

  /* =========================================================
     弹窗
     ========================================================= */
  function showModal(id) {
    const m = document.getElementById(id);
    if (!m) return;
    m.hidden = false;
    m.classList.add('is-open');
    m.setAttribute('aria-hidden', 'false');
  }
  function hideModal(id) {
    const m = document.getElementById(id);
    if (!m) return;
    m.classList.remove('is-open');
    m.hidden = true;
    m.setAttribute('aria-hidden', 'true');
  }
  PANELS.showModal = showModal;
  PANELS.hideModal = hideModal;
  PANELS.bestArtRect = bestArtRect;

  /* ---------- 尺寸弹窗 ---------- */
  PANELS.sizeList = function () {
    const host = document.getElementById('sizeList');
    if (!host) return;
    host.innerHTML = '';
    const grid = mk('div', 'size-grid');
    DATA.FRAMES.forEach((f) => {
      const b = mk('button', 'size-card' + (Store.doc.frameId === f.id ? ' is-on' : ''));
      b.type = 'button';
      b.appendChild(mk('b', null, f.name));
      b.appendChild(mk('span', null, f.w + ' × ' + f.h));
      b.appendChild(mk('em', null, f.note || ''));
      b.addEventListener('click', () => {
        Store.setFrame(f);
        ED.fit();
        hideModal('modalSizes');
        PANELS.repaint();
        U.toast('画板：' + f.name);
      });
      grid.appendChild(b);
    });
    host.appendChild(grid);
    showModal('modalSizes');
  };

  /* ---------- 设置弹窗 ---------- */
  PANELS.settings = function () {
    const c = AI.cfg();
    const set = (id, v) => { const n = document.getElementById(id); if (n) n.value = v; };
    set('cfgBase', c.base || '');
    set('cfgKey', c.key || '');
    set('cfgModel', c.model || '');
    set('cfgTemp', c.temp);
    const st = document.getElementById('cfgStream');
    if (st) st.checked = !!c.stream;
    const state = document.getElementById('cfgState');
    if (state) state.textContent = AI.ready() ? '已配置 · ' + c.model : '未配置';
    const host = document.getElementById('modalSettings');
    if (host && !host.querySelector('.preset-row-wrap')) {
      const wrap = mk('div', 'preset-row-wrap');
      wrap.appendChild(mk('span', 'p-tip', '快速填入：'));
      const chipsW = mk('div', 'chips');
      AI.PRESETS.forEach((p) => {
        const b = mk('button', 'chip-btn', p.name);
        b.type = 'button';
        b.addEventListener('click', () => {
          set('cfgBase', p.base);
          set('cfgModel', p.model);
        });
        chipsW.appendChild(b);
      });
      wrap.appendChild(chipsW);
      const body = host.querySelector('.modal-body');
      if (body) body.insertBefore(wrap, body.children[1] || null);
    }
    showModal('modalSettings');
  };

  /* ---------- 代码弹窗 ---------- */
  let codeCb = null;
  function openCode(code, cb) {
    const ta = document.getElementById('codeArea');
    if (ta) ta.value = code || '';
    codeCb = cb;
    showModal('modalCode');
  }

  /* ---------- AI 弹窗 ---------- */
  const LOCAL_MAP = { riso: 'arch', flat: 'arch', line: 'topo', iso: 'city', bauhaus: 'arch', gradient: 'mesh', blueprint: 'topo', pixel: 'orbit', paper: 'ridge', neon: 'orbit' };
  function pickLocal(brief) {
    const keys = Object.keys(LOCAL_MAP);
    const s = String(brief || '');
    for (const k of keys) if (s.toLowerCase().indexOf(k) >= 0) return LOCAL_MAP[k];
    return localIds[Math.floor(Math.random() * localIds.length)];
  }
  const localIds = ['mesh', 'ridge', 'topo', 'orbit', 'arch', 'city'];

  function aiLog(msg) {
    const el = document.getElementById('aiLog');
    if (!el) return;
    el.textContent = String(msg).slice(-1200);
    el.scrollTop = el.scrollHeight;
  }

  function aiForm() {
    const brief = (document.getElementById('aiBrief') || {}).value || '';
    const style = (document.getElementById('aiStyle') || {}).value || 'gradient';
    const denv = (document.getElementById('aiDensity') || {}).value || 'mid';
    const duration = parseFloat((document.getElementById('aiDuration') || {}).value || 6);
    const fps = parseInt((document.getElementById('aiFps') || {}).value || 30, 10);
    const motionV = parseInt((document.getElementById('aiMotion') || {}).value || 4, 10);
    const palMode = (document.getElementById('aiPalette') || {}).value || 'poster';
    let palette = Store.palette();
    if (palMode === 'custom') {
      const hex = ((document.getElementById('aiPaletteHex') || {}).value || '').split(',').map((s) => s.trim()).filter(Boolean);
      if (hex.length >= 4) palette = { bg: hex[0], accent: hex[1], fg: hex[2], muted: hex[3], extra: hex[4] || hex[1] };
    }
    const density = denv === 'low' ? 3 : denv === 'high' ? 8 : 6;
    const motion = motionV <= 1 ? 'none' : motionV <= 4 ? 'slow' : motionV <= 7 ? 'medium' : 'fast';
    const doc = Store.doc;
    const full = AIMOD.target === 'full';
    let w, h;
    if (full) { w = doc.canvas.w; h = doc.canvas.h; }
    else {
      w = 1024;
      h = Math.round(1024 * (doc.canvas.h / doc.canvas.w));
    }
    return { brief, style, density, duration, fps, motion, palette, w, h, seed: Math.floor(Math.random() * 1e6) };
  }

  function setPreview(html, w, h) {
    const box = document.getElementById('aiFrameBox');
    if (!box) return;
    box.innerHTML = '';
    const ifr = mk('iframe');
    ifr.setAttribute('sandbox', 'allow-scripts');
    ifr.setAttribute('scrolling', 'no');
    ifr.srcdoc = R.aiDoc(html, w, h);
    box.appendChild(ifr);
  }

  function openAi(brief, layer) {
    const sel = document.getElementById('aiStyle');
    if (sel && !sel.options.length) {
      DATA.AI_STYLES.forEach((s) => {
        const o = mk('option', null, s.name);
        o.value = s.id;
        sel.appendChild(o);
      });
    }
    const b = document.getElementById('aiBrief');
    if (b) b.value = brief || (layer && layer.aiBrief) || '';
    const hint = document.getElementById('aiCfgHint');
    if (hint) hint.textContent = AI.ready() ? '接口已就绪，将调用 ' + AI.cfg().model + ' 生成代码。' : '未配置接口，将使用本地算法插画引擎。';
    AIMOD.html = '';
    const ins = document.getElementById('btnAiInsert');
    if (ins) ins.disabled = true;
    aiLog('就绪。插画将由模型编写 Canvas 代码，画面可播放、可导出视频。');
    showModal('modalAi');
  }

  function runLocal(form) {
    const html = LocalArt.make(pickLocal(form.brief), {
      w: Math.round(form.w * 0.5), h: Math.round(form.h * 0.5),
      duration: form.duration, fps: form.fps, seed: form.seed, palette: form.palette
    });
    AIMOD.html = html;
    setPreview(html, form.w, form.h);
    pushArt(form);
    const ins = document.getElementById('btnAiInsert');
    if (ins) ins.disabled = false;
    aiLog('本地算法引擎已生成（无需 API）。点「插入画板」使用，或先「查看代码」。');
  }

  async function runAI() {
    if (AIMOD.busy) return;
    const form = aiForm();
    if (!form.brief.trim()) { U.toast('先写一句插画描述'); return; }
    AIMOD.busy = true;
    const btn = document.getElementById('btnAiRun');
    if (btn) btn.disabled = true;
    U.busy(true, '大模型正在写插画代码…');
    aiLog('正在请求模型…');
    try {
      const r = await AI.makeArt({
        brief: form.brief, style: form.style, density: form.density,
        w: form.w, h: form.h, duration: form.duration, fps: form.fps,
        motion: form.motion, palette: form.palette, seed: form.seed,
        onDelta: (text) => aiLog('接收中… ' + text.length + ' 字符\n' + text.slice(-260)),
        onLog: aiLog
      });
      AIMOD.html = r.html;
      setPreview(r.html, form.w, form.h);
      pushArt(form);
      const ins = document.getElementById('btnAiInsert');
      if (ins) ins.disabled = false;
      aiLog(r.issues.length ? '已生成，但自检提示：' + r.issues.join('；') : '生成完成，自检通过。');
    } catch (e) {
      aiLog('调用失败：' + e.message + '\n改用本地算法引擎。');
      U.toast('接口失败，已切换本地生成');
      runLocal(form);
    } finally {
      AIMOD.busy = false;
      if (btn) btn.disabled = false;
      U.busy(false);
    }
  }

  /* 找一个与现有图层重叠最少的落位（多档尺寸 + 互不重叠的候选格） */
  function bestArtRect(doc) {
    const W = doc.canvas.w, H = doc.canvas.h;
    const pad = Math.round(Math.min(W, H) * 0.05);
    const sizes = [0.46, 0.40, 0.34, 0.28].map((k) => Math.round(Math.min(W, H) * k));
    let best = null;

    sizes.forEach((size) => {
      const cols = Math.max(1, Math.floor((W - pad * 2) / size));
      const rows = Math.max(1, Math.floor((H - pad * 2) / size));
      const gx = cols > 1 ? (W - pad * 2 - size) / (cols - 1) : 0;
      const gy = rows > 1 ? (H - pad * 2 - size) / (rows - 1) : 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = pad + c * gx;
          const y = pad + r * gy;
          let score = 0;
          (doc.layers || []).forEach((l) => {
            if (l.hidden) return;
            const ox = Math.max(0, Math.min(x + size, l.x + l.w) - Math.max(x, l.x));
            const oy = Math.max(0, Math.min(y + size, l.y + l.h) - Math.max(y, l.y));
            let weight = 1.4;
            if (l.type === 'shape') weight = (l.w >= W * 0.9 && l.h >= H * 0.9) ? 0.02 : 0.5;
            else if (l.type === 'text') weight = 5;
            score += ox * oy * weight;
          });
          score += Math.abs(y - H * 0.46) * 1.6;
          /* 归一化：小尺寸天然重叠少，用面积折算，避免总是选最小 */
          const norm = score / (size * size) + (1 - size / Math.min(W, H)) * 0.05;
          if (!best || norm < best.norm) best = { x: Math.round(x), y: Math.round(y), w: size, h: size, norm };
        }
      }
    });
    return best || { x: pad, y: pad, w: sizes[1], h: sizes[1] };
  }

  function insertArt() {    if (!AIMOD.html) return;
    const doc = Store.doc;
    const form = aiForm();
    if (AIMOD.target === 'full') {
      const L = DATA.mkAI({
        name: 'AI 插画 · 铺满', x: 0, y: 0, w: doc.canvas.w, h: doc.canvas.h,
        artHtml: AIMOD.html, aiBrief: form.brief, duration: form.duration, fps: form.fps, artSeed: form.seed
      });
      Store.add(L, { label: '插入 AI 插画' });
      Store.reorder(L.id, 'back');
    } else {
      const spot = bestArtRect(doc);
      const L = DATA.mkAI({
        name: 'AI 插画', x: spot.x, y: spot.y, w: spot.w, h: spot.h,
        artHtml: AIMOD.html, aiBrief: form.brief, duration: form.duration, fps: form.fps, artSeed: form.seed,
        radius: Math.round(Math.min(doc.canvas.w, doc.canvas.h) * 0.012)
      });
      Store.add(L, { label: '插入 AI 插画' });
    }
    hideModal('modalAi');
    U.toast('已插入插画图层');
  }

  /* =========================================================
     素材库（生成结果收集，ArtCraft 式底部素材栏）
     ========================================================= */
  const ARTS_KEY = 'plaque.arts';
  let ARTS = (function () {
    try {
      const a = JSON.parse(localStorage.getItem(ARTS_KEY) || '[]');
      return Array.isArray(a) ? a : [];
    } catch (_) { return []; }
  })();

  function saveArts() {
    try { localStorage.setItem(ARTS_KEY, JSON.stringify(ARTS.slice(0, 12))); } catch (_) { /* 配额不足则只在内存保留 */ }
  }

  function pushArt(form) {
    if (!AIMOD.html) return;
    ARTS.unshift({
      id: 'a' + Date.now().toString(36),
      brief: (form.brief || '未命名插画').slice(0, 60),
      style: form.style || '',
      html: AIMOD.html,
      w: form.w, h: form.h,
      duration: form.duration, fps: form.fps, seed: form.seed,
      ts: Date.now()
    });
    ARTS = ARTS.slice(0, 12);
    saveArts();
    PANELS.renderDock();
  }

  PANELS.renderDock = function () {
    const list = document.getElementById('dockList');
    const cnt = document.getElementById('dockCount');
    if (cnt) cnt.textContent = String(ARTS.length);
    if (!list) return;
    list.innerHTML = '';
    if (!ARTS.length) {
      const e = mk('div', 'dock-empty', '还没有生成物。写一句描述，回车即可生成插画，生成结果会收进这里。');
      list.appendChild(e);
      return;
    }
    ARTS.forEach((a) => {
      const it = mk('div', 'dock-item');
      it.dataset.artId = a.id;
      it.title = a.brief + '\n点击插入画板';
      const ifr = mk('iframe');
      ifr.setAttribute('sandbox', 'allow-scripts');
      ifr.setAttribute('scrolling', 'no');
      ifr.srcdoc = R.aiDoc(a.html, a.w, a.h, true);
      it.appendChild(ifr);
      it.appendChild(mk('em', null, a.brief));
      it.addEventListener('click', () => insertFromDock(a.id));
      list.appendChild(it);
    });
  };

  function insertFromDock(id) {
    const a = ARTS.find((x) => x.id === id);
    if (!a) return;
    const doc = Store.doc;
    const spot = bestArtRect(doc);
    const L = DATA.mkAI({
      name: 'AI 插画', x: spot.x, y: spot.y, w: spot.w, h: spot.h,
      artHtml: a.html, aiBrief: a.brief, duration: a.duration || 6, fps: a.fps || 30, artSeed: a.seed,
      radius: Math.round(Math.min(doc.canvas.w, doc.canvas.h) * 0.012)
    });
    Store.add(L, { label: '插入素材库插画' });
    Store.select([L.id]);
    U.toast('已从素材库插入');
  }

  PANELS.pushArt = pushArt;
  PANELS.insertFromDock = insertFromDock;
  PANELS.runLocal = runLocal;
  PANELS.runAI = runAI;
  PANELS.aiForm = aiForm;
  PANELS.insertArt = insertArt;

  /* =========================================================
     绑定
     ========================================================= */
  PANELS.bind = function () {
    document.querySelectorAll('.rail-btn').forEach((b) => {
      b.addEventListener('click', () => PANELS.open(b.dataset.panel));
    });

    const close = document.getElementById('btnPanelClose');
    if (close) close.addEventListener('click', () => {
      document.getElementById('panel').classList.add('is-closed');
    });
    const open = document.getElementById('btnPanelOpen');
    if (open) open.addEventListener('click', () => {
      document.getElementById('panel').classList.remove('is-closed');
    });

    document.querySelectorAll('[data-close]').forEach((b) => {
      b.addEventListener('click', () => hideModal(b.dataset.close));
    });
    document.querySelectorAll('.modal').forEach((m) => {
      m.addEventListener('click', (e) => { if (e.target === m) hideModal(m.id); });
    });

    // AI 弹窗
    const aiOpen = document.getElementById('btnAiOpen');
    if (aiOpen) aiOpen.addEventListener('click', () => openAi());
    const st = document.getElementById('btnSettings');
    if (st) st.addEventListener('click', () => { PANELS.settings(); showModal('modalSettings'); });
    const sz = document.getElementById('btnSize');
    if (sz) sz.addEventListener('click', () => { PANELS.sizeList(); showModal('modalSizes'); });
    const hp = document.getElementById('btnHelp');
    if (hp) hp.addEventListener('click', () => showModal('modalHelp'));

    const run = document.getElementById('btnAiRun');
    if (run) run.addEventListener('click', () => { if (AI.ready()) runAI(); else { runLocal(aiForm()); U.toast('未配置 API，已用本地引擎'); } });
    const loc = document.getElementById('btnAiLocal');
    if (loc) loc.addEventListener('click', () => runLocal(aiForm()));
    const codeB = document.getElementById('btnAiCode');
    if (codeB) codeB.addEventListener('click', () => {
      if (!AIMOD.html) { U.toast('还没有生成内容'); return; }
      openCode(AIMOD.html, (next) => { AIMOD.html = next; setPreview(next, 800, 800); U.toast('代码已应用'); });
    });
    const ins = document.getElementById('btnAiInsert');
    if (ins) ins.addEventListener('click', insertArt);

    document.querySelectorAll('.seg-btn[data-target]').forEach((b) => {
      b.addEventListener('click', () => {
        document.querySelectorAll('.seg-btn[data-target]').forEach((x) => x.classList.remove('is-active'));
        b.classList.add('is-active');
        AIMOD.target = b.dataset.target;
      });
    });

    const palSel = document.getElementById('aiPalette');
    if (palSel) palSel.addEventListener('change', () => {
      const wrap = document.getElementById('aiPaletteWrap');
      if (wrap) wrap.hidden = palSel.value !== 'custom';
    });

    // 代码应用
    const applyB = document.getElementById('btnCodeApply');
    if (applyB) applyB.addEventListener('click', () => {
      const ta = document.getElementById('codeArea');
      const code = ta ? ta.value : '';
      if (codeCb) codeCb(code);
      hideModal('modalCode');
    });

    // 设置
    const setDiag = (t, cls) => {
      const d = document.getElementById('cfgDiag');
      if (d) {
        d.hidden = !t;
        d.textContent = t || '';
        d.classList.toggle('is-bad', cls === 'bad');
        d.classList.toggle('is-good', cls === 'good');
      }
    };
    const setState = (t, cls) => {
      const state = document.getElementById('cfgState');
      if (!state) return;
      state.textContent = t;
      state.classList.toggle('is-bad', cls === 'bad');
      state.classList.toggle('is-good', cls === 'good');
    };
    const setFix = (items) => {
      const box = document.getElementById('cfgFix');
      if (!box) return;
      box.innerHTML = '';
      if (!items || !items.length) { box.hidden = true; return; }
      items.forEach((it) => {
        const b = document.createElement('button');
        b.className = 'btn ghost';
        b.type = 'button';
        b.textContent = it.label;
        b.addEventListener('click', it.run);
        box.appendChild(b);
      });
      box.hidden = false;
    };
    const save = document.getElementById('btnCfgSave');
    if (save) save.addEventListener('click', () => {
      const c = AI.saveCfg({
        base: (document.getElementById('cfgBase') || {}).value || '',
        key: (document.getElementById('cfgKey') || {}).value || '',
        model: (document.getElementById('cfgModel') || {}).value || '',
        temp: parseFloat((document.getElementById('cfgTemp') || {}).value || 0.7),
        stream: !!(document.getElementById('cfgStream') || {}).checked
      });
      // 回填清洗后的值，用户能看到「Bearer 」前缀之类被去掉了
      const bi = document.getElementById('cfgBase'); if (bi) bi.value = c.base;
      const ki = document.getElementById('cfgKey'); if (ki) ki.value = c.key;
      setDiag('', '');
      setState(AI.ready() ? '已保存 · ' + c.model : '未配置', AI.ready() ? 'good' : '');
      const hint = document.getElementById('aiCfgHint');
      if (hint) hint.textContent = AI.ready() ? '接口已就绪，将调用 ' + c.model + ' 生成代码。' : '未配置接口，将使用本地算法插画引擎。';
      U.toast('接口设置已保存');
    });
    // 复制诊断
    const copy = document.getElementById('btnCfgCopy');
    if (copy) copy.addEventListener('click', async () => {
      const d = document.getElementById('cfgDiag');
      const c = AI.cfg();
      const txt = [
        'Plaque 接口诊断',
        '时间: ' + new Date().toLocaleString('zh-CN'),
        'UA: ' + navigator.userAgent,
        'Base: ' + (c.base || '(空)'),
        'Model: ' + (c.model || '(空)'),
        'Key: ' + (c.key ? c.key.slice(0, 6) + '…（长度 ' + c.key.length + '）' : '(空)'),
        '---',
        (d && d.textContent) || '(还没测试)'
      ].join('\n');
      try {
        await navigator.clipboard.writeText(txt);
        U.toast('诊断信息已复制');
      } catch (e) {
        const ta = document.createElement('textarea');
        ta.value = txt; document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); U.toast('诊断信息已复制'); } catch (e2) { U.toast('复制失败，请手动选择文本'); }
        ta.remove();
      }
    });

    const test = document.getElementById('btnCfgTest');
    if (test) test.addEventListener('click', async () => {
      const btn = test;
      btn.disabled = true;
      setState('测试中…');
      setDiag('① GET  ' + (AI.normBase((document.getElementById('cfgBase') || {}).value) || '?') + '/models\n② POST ' + (AI.normBase((document.getElementById('cfgBase') || {}).value) || '?') + '/chat/completions\n…');
      AI.saveCfg({
        base: (document.getElementById('cfgBase') || {}).value || '',
        key: (document.getElementById('cfgKey') || {}).value || '',
        model: (document.getElementById('cfgModel') || {}).value || ''
      });
      const before = AI.cfg();
      const bi = document.getElementById('cfgBase'); if (bi) bi.value = before.base;
      const ki = document.getElementById('cfgKey'); if (ki) ki.value = before.key;
      try {
        const r = await AI.test();
        setState('连通正常 ✅ ' + r.ms + 'ms', 'good');
        setDiag('✅ 全部通过 · ' + r.ms + 'ms\n' + r.lines.join('\n') + '\n地址：' + r.base + '\n模型：' + before.model);
        setFix([]);
        U.toast('接口连通正常');
      } catch (e) {
        const msg = String((e && e.message) || e);
        const raw = String((e && e.body) || '');
        setState('失败 · ' + (e.status ? 'HTTP ' + e.status : '网络/配置'), 'bad');
        setDiag('❌ 失败\n' + msg + '\n地址：' + (AI.endpoint() || '（未填）') + '\n模型：' + (before.model || '（未填）'), 'bad');

        // 依据报错特征给出「一键改正」
        const fixes = [];
        const setBoth = (base, model) => () => {
          const b = document.getElementById('cfgBase'); if (b) b.value = base;
          const m = document.getElementById('cfgModel'); if (m) m.value = model;
          AI.saveCfg({ base, model });
          setFix([]);
          test.click();
        };
        if (/Incorrect API key provided|api\.openai\.com/i.test(raw + msg) && !/deepseek/i.test(before.base)) {
          fixes.push({ label: '这是 OpenAI 的报错 → 改用 DeepSeek 地址', run: setBoth('https://api.deepseek.com/v1', 'deepseek-chat') });
        }
        if (/deepseek/i.test(msg) && /deepseek/i.test(before.base) === false) {
          fixes.push({ label: '改用 DeepSeek 官方地址', run: setBoth('https://api.deepseek.com/v1', 'deepseek-chat') });
        }
        if (/Authentication Fails/i.test(raw)) {
          fixes.push({
            label: '打开 DeepSeek 密钥页重新复制',
            run: () => window.open('https://platform.deepseek.com/api_keys', '_blank')
          });
          fixes.push({ label: '用 deepseek-reasoner 再试一次', run: setBoth(before.base || 'https://api.deepseek.com/v1', 'deepseek-reasoner') });
        }
        if (/404/.test(String(e.status))) {
          fixes.push({ label: '改成 /v1 结尾的地址', run: () => {
            const kp = AI.PRESETS.find((p) => before.base.indexOf(new URL(p.base).host) >= 0);
            setBoth(kp ? kp.base : 'https://api.deepseek.com/v1', (kp && kp.model) || 'deepseek-chat')();
          } });
        }
        if (/网络层失败/.test(msg)) {
          fixes.push({ label: '改用 DeepSeek 在线地址', run: setBoth('https://api.deepseek.com/v1', 'deepseek-chat') });
        }
        setFix(fixes);
      } finally {
        btn.disabled = false;
      }
    });

    // Esc 关闭弹窗
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      document.querySelectorAll('.modal.is-open').forEach((m) => hideModal(m.id));
    });
  };

  window.PANELS = PANELS;
  window.openAi = openAi;
  window.openCode = openCode;
})();


