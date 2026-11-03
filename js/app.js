/* app.js — 启动 / 顶栏 / 快捷键 / 公共 API */
(function () {
  'use strict';

  const $ = U.$;
  const $$ = U.$$;
  let booted = false;

  /* ---------- 初始文档 ---------- */
  function seedDoc() {
    const saved = Store.restoreAutosave();
    if (saved) return saved;
    const f = DATA.frameById('xhs') || DATA.FRAMES[0];
    const p = DATA.palById('midnight');
    const doc = Store.newDoc(f, p.id);
    const ctx = { w: f.w, h: f.h, p };
    doc.layers = DATA.LAYOUTS[0].build(ctx);
    doc.name = '编辑封面 · 夜航';
    return doc;
  }

  /* ---------- 顶栏状态 ---------- */
  function syncHistory() {
    const u = $('#btnUndo'), r = $('#btnRedo');
    if (u) u.disabled = !Store.canUndo();
    if (r) r.disabled = !Store.canRedo();
  }

  function syncStage() {
    const p = $('#poster'), sh = $('#posterShadow');
    if (!p || !sh) return;
    const z = ED.zoom || 1;
    sh.style.width = Store.doc.canvas.w * z + 'px';
    sh.style.height = Store.doc.canvas.h * z + 'px';
    const lbl = $('#sizeLabel');
    if (lbl) {
      const f = DATA.frameById(Store.doc.frameId);
      lbl.textContent = (f ? f.name + ' · ' : '') + Store.doc.canvas.w + '×' + Store.doc.canvas.h;
    }
  }

  function syncHeader() {
    const n = $('#docName');
    if (n && n.value !== Store.doc.name) n.value = Store.doc.name || '未命名海报';
    document.title = (Store.doc.name || '海报') + ' · Plaque 海报工坊';
    syncStage();
    syncHistory();
  }

  /* ---------- 渲染管线 ---------- */
  function fullRender() {
    R.render();
    ED.syncSel();
    ED.setZoom(ED.zoom || 1);
    syncStage();
    if (Store.playing) $('#poster') && $('#poster').classList.add('anim');
  }

  function wireStore() {
    Store.on('doc', () => {
      fullRender();
      PANELS.repaint();
      PANELS.inspector();
      syncHistory();
    });
    Store.on('sel', () => {
      ED.syncSel();
      PANELS.inspector();
      PANELS.repaint();
    });
    Store.on('history', () => {
      syncHistory();
      syncHeader();
    });
  }

  /* ---------- 顶栏 ---------- */
  function wireChrome() {
    const app = $('#app');

    const docName = $('#docName');
    if (docName) {
      docName.addEventListener('input', () => {
        Store.doc.name = docName.value.trim() || '未命名海报';
        document.title = Store.doc.name + ' · Plaque 海报工坊';
      });
      docName.addEventListener('change', () => Store.commit('重命名'));
      docName.addEventListener('keydown', (e) => { if (e.key === 'Enter') docName.blur(); });
    }

    $('#btnUndo') && $('#btnUndo').addEventListener('click', () => { Store.undo(); });
    $('#btnRedo') && $('#btnRedo').addEventListener('click', () => { Store.redo(); });

    $('#btnSize') && $('#btnSize').addEventListener('click', () => PANELS.sizeList());
    $('#sizeLabel') && $('#sizeLabel').addEventListener('click', () => PANELS.sizeList());

    $('#btnAiOpen') && $('#btnAiOpen').addEventListener('click', () => window.openAi());
    $('#btnSettings') && $('#btnSettings').addEventListener('click', () => PANELS.settings());
    $('#btnHelp') && $('#btnHelp').addEventListener('click', () => PANELS.showModal('modalHelp'));

    $('#btnZoomIn') && $('#btnZoomIn').addEventListener('click', () => { ED.zoomBy(1.2); syncStage(); });
    $('#btnZoomOut') && $('#btnZoomOut').addEventListener('click', () => { ED.zoomBy(1 / 1.2); syncStage(); });
    $('#btnZoomFit') && $('#btnZoomFit').addEventListener('click', () => { ED.fit(); syncStage(); });

    const safe = $('#btnToggleSafe');
    if (safe) safe.addEventListener('click', () => {
      Store.safe = !Store.safe;
      safe.classList.toggle('on', Store.safe);
      $('#poster').classList.toggle('show-safe', Store.safe);
    });

    const play = $('#btnPlayAnim');
    if (play) play.addEventListener('click', () => {
      Store.playing = !Store.playing;
      play.classList.toggle('on', Store.playing);
      $('#poster').classList.toggle('anim', Store.playing);
    });

    $('#btnPanelClose') && $('#btnPanelClose').addEventListener('click', () => app.classList.add('panel-closed'));
    $('#btnPanelOpen') && $('#btnPanelOpen').addEventListener('click', () => app.classList.remove('panel-closed'));

    wireStudio();

    /* 导出下拉 */
    const dd = $('#ddExport');
    if (dd) {
      const trigger = dd.querySelector('button, .dd-trigger') || dd.firstElementChild;
      trigger && trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        dd.classList.toggle('open');
      });
      document.addEventListener('click', () => dd.classList.remove('open'));
      dd.addEventListener('click', (e) => {
        const b = e.target.closest('[data-export]');
        if (!b) return;
        dd.classList.remove('open');
        const kind = b.dataset.export;
        if (kind === 'png') EX.png(2);
        else if (kind === 'jpg') EX.jpg(2);
        else if (kind === 'web') EX.web();
        else if (kind === 'video') EX.video({});
        else if (kind === 'json') EX.json();
        else if (kind === 'open') {
          const inp = document.createElement('input');
          inp.type = 'file';
          inp.accept = '.json,application/json';
          inp.onchange = () => inp.files && inp.files[0] && EX.loadJSON(inp.files[0]);
          inp.click();
        }
      });
    }

    /* 其他内部按钮约定 */
    document.addEventListener('click', (e) => {
      const t = e.target.closest('[data-act]');
      if (!t) return;
      const act = t.dataset.act;
      if (act === 'new') newDocument();
      else if (act === 'loadjson') {
        const inp = document.createElement('input');
        inp.type = 'file';
        inp.accept = '.json,application/json';
        inp.onchange = () => inp.files && inp.files[0] && EX.loadJSON(inp.files[0]);
        inp.click();
      }
    });
  }

  function newDocument() {
    const f = DATA.frameById('xhs') || DATA.FRAMES[0];
    const p = DATA.palById('midnight');
    const doc = Store.newDoc(f, p.id);
    doc.name = '未命名海报';
    Store.init(doc);
    ED.fit();
    syncStage();
    PANELS.repaint();
    PANELS.inspector();
    U.toast('已新建空白画板');
  }

  /* ---------- 快捷键 ---------- */
  function wireKeys() {
    window.addEventListener('keydown', (e) => {
      const tag = (e.target.tagName || '').toLowerCase();
      const typing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;
      const meta = e.ctrlKey || e.metaKey;
      if (meta && e.key.toLowerCase() === 's') {
        e.preventDefault();
        Store.commit('保存');
        U.toast('已保存到本地');
        return;
      }
      if (typing) return;
      if (meta && e.key === '0') { e.preventDefault(); ED.fit(); syncStage(); }
      else if (meta && (e.key === '=' || e.key === '+')) { e.preventDefault(); ED.zoomBy(1.2); syncStage(); }
      else if (meta && e.key === '-') { e.preventDefault(); ED.zoomBy(1 / 1.2); syncStage(); }
      else if (e.key === '?') PANELS.showModal('modalHelp');
    });
  }

  /* ---------- 窗口尺寸 ---------- */
  function wireResize() {
    const fit = U.debounce(() => { ED.fit(); syncStage(); }, 160);
    window.addEventListener('resize', fit);
  }

  /* ---------- ArtCraft 式界面：rail 提示 / 常驻 prompt / 生成卡 / 素材库 ---------- */
  function wireStudio() {
    const styles = (window.DATA && DATA.AI_STYLES) || [];

    $$('.rail-btn').forEach((b) => {
      const s = b.querySelector('span');
      if (s && !b.dataset.tip) b.dataset.tip = s.textContent.trim();
    });

    const gs = $('#genStyle');
    if (gs && !gs.options.length) {
      styles.forEach((s) => {
        const o = document.createElement('option');
        o.value = s.id; o.textContent = s.name;
        gs.appendChild(o);
      });
    }
    const ps = $('#promptStyle');
    let styleIdx = 0;
    const paintStyle = () => {
      const s = styles[styleIdx];
      if (ps && s) ps.textContent = '风格：' + s.name;
      if (gs && s) gs.value = s.id;
    };
    paintStyle();
    if (ps) ps.addEventListener('click', () => {
      if (!styles.length) return;
      styleIdx = (styleIdx + 1) % styles.length;
      paintStyle();
    });

    const launch = (brief, styleId) => {
      const text = (brief || '').trim();
      if (!text) { U.toast('先写一句插画描述'); const i = $('#promptInput'); if (i) i.focus(); return; }
      window.openAi(text);
      const sel = $('#aiStyle');
      if (sel && styleId) sel.value = styleId;
      const fg = $('#genBrief');
      if (fg) fg.value = text;
      setTimeout(() => {
        if (window.AI && AI.ready()) PANELS.runAI();
        else PANELS.runLocal(PANELS.aiForm());
      }, 40);
    };

    const pi = $('#promptInput');
    const run = $('#promptRun');
    if (run) run.addEventListener('click', () => launch(pi && pi.value, gs && gs.value));
    if (pi) pi.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); launch(pi.value, gs && gs.value); }
    });
    const more = $('#promptMore');
    if (more) more.addEventListener('click', () => window.openAi(pi ? pi.value : ''));

    const gb = $('#genBrief');
    const grun = $('#genRun');
    const genRun = () => launch(gb && gb.value, gs && gs.value);
    if (grun) grun.addEventListener('click', genRun);
    if (gb) gb.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); genRun(); }
    });

    const gm = $('#genModel');
    const syncModel = () => {
      if (!gm) return;
      gm.textContent = (window.AI && AI.ready()) ? (AI.cfg().model || '已连接') : '本地算法';
      gm.title = (window.AI && AI.ready()) ? AI.cfg().base : '未配置接口，使用本地算法引擎';
    };
    syncModel();
    setInterval(syncModel, 4000);

    const dock = $('#dock');
    const dc = $('#btnDockCollapse');
    if (dc && dock) dc.addEventListener('click', () => {
      const collapsed = dock.classList.toggle('is-collapsed');
      const st = $('#stage');
      if (st) st.style.setProperty('--dock-h', collapsed ? '28px' : '104px');
    });
    if (window.PANELS && PANELS.renderDock) PANELS.renderDock();

    const note = $('#savedNote');
    let noteTimer = 0;
    const flash = () => {
      if (!note) return;
      note.hidden = false;
      note.classList.add('show');
      clearTimeout(noteTimer);
      noteTimer = setTimeout(() => {
        note.classList.remove('show');
        setTimeout(() => { note.hidden = true; }, 320);
      }, 1400);
    };
    Store.on('history', flash);
  }

  /* ---------- 公共 API ---------- */
  function expose() {
    window.Plaque = {
      version: '1.0.0',
      get doc() { return Store.doc; },
      store: Store,
      ready: () => AI.ready(),
      render: () => fullRender(),
      newDocument,
      renderToCanvas(opt) {
        opt = opt || {};
        return EX.toCanvas(opt.scale || 1, opt.t || 0);
      },
      insert(layoutId, opts) {
        const lay = DATA.LAYOUTS.find((l) => l.id === layoutId);
        if (!lay) { U.toast('未找到布局：' + layoutId); return; }
        const p = Store.palette();
        const layers = lay.build({ w: Store.doc.canvas.w, h: Store.doc.canvas.h, p });
        const replace = !(opts && opts.replace === false);
        if (replace) Store.replaceAll(layers, '套用布局 · ' + lay.name);
        else Store.addMany(layers);
        Store.clearSel();
        U.toast('已套用：' + lay.name);
      },
      addAILayer(html, opts) {
        opts = opts || {};
        const p = Store.palette();
        const l = DATA.mkAI({
          name: opts.name || 'AI 插画',
          x: opts.x != null ? opts.x : Store.doc.canvas.w * 0.08,
          y: opts.y != null ? opts.y : Store.doc.canvas.h * 0.08,
          w: opts.w || Store.doc.canvas.w * 0.84,
          h: opts.h || Store.doc.canvas.w * 0.84,
          artHtml: html,
          duration: opts.duration || 6,
          fps: opts.fps || 30,
          fill: p.bg
        });
        Store.add(l);
        return l;
      },
      ai: {
        ready: () => AI.ready(),
        cfg: (c) => {
          if (c) { AI.saveCfg(Object.assign(AI.cfg() || {}, c)); return AI.cfg(); }
          return AI.cfg();
        },
        test: () => AI.test(),
        generate: (o) => AI.makeArt(o || {}),
        prompt: () => PROMPT.SYSTEM
      },
      export: {
        png: (s) => EX.png(s || 2),
        jpg: (s) => EX.jpg(s || 2),
        web: () => EX.web(),
        video: (o) => EX.video(o || {}),
        json: () => EX.json()
      },
      toCanvas: (scale, t) => EX.toCanvas(scale || 1, t || 0)
    };
    if (!window.Prompt) window.Prompt = window.PROMPT;
  }

  /* ---------- 启动 ---------- */
  function boot() {
    R.ensureCSS();
    wireStore();
    Store.init(seedDoc());
    ED.mount();
    wireChrome();
    wireKeys();
    wireResize();
    PANELS.bind();
    PANELS.open('templates');
    fullRender();
    ED.fit();
    syncStage();
    syncHeader();
    PANELS.inspector();
    expose();

    const stop = $('#btnBusyStop');
    if (stop) stop.addEventListener('click', () => { AI.abort(); U.busy(false); });

    booted = true;
    document.documentElement.classList.add('ready');
    setTimeout(() => {
      U.toast('欢迎使用 Plaque · 左侧套布局，右上角「生成插画」');
    }, 400);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.__BOOTED = () => booted;
})();

