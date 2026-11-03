/* render.js — 把文档模型画成 DOM（编辑器预览 / 网页导出共用样式） */
(function () {
  'use strict';

  const R = {};

  R.POSTER_CSS = `
.poster{position:relative;overflow:hidden;isolation:isolate;font-kerning:normal;-webkit-font-smoothing:antialiased}
.poster *{box-sizing:border-box;margin:0;padding:0}
.layer{position:absolute;transform-origin:center center;will-change:transform,opacity}
.layer .bx{position:absolute;left:0;top:0;width:100%;height:100%;border-radius:inherit}
.bx.shape{overflow:hidden}
.bx.txt{display:flex;flex-direction:column;overflow:visible}
.bx.txt .tx{width:100%;white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word}
.bx.img{background-repeat:no-repeat;overflow:hidden}
.bx.img.duo{filter:grayscale(1) contrast(1.05)}
.bx.img .duo-layer{position:absolute;inset:0;mix-blend-mode:color;opacity:.92}
.bx.ai iframe{width:100%;height:100%;border:0;display:block;background:transparent}
.ov{position:absolute;inset:0;pointer-events:none}
.ov.grain{background-repeat:repeat;background-size:140px 140px;mix-blend-mode:overlay}
.ov.halftone{background-image:radial-gradient(circle at 2px 2px,currentColor 1.1px,transparent 1.4px);background-size:6px 6px;mix-blend-mode:multiply}
.ov.scan{background-image:repeating-linear-gradient(0deg,rgba(0,0,0,.55) 0 1px,transparent 1px 3px);mix-blend-mode:multiply}
.ov.leak{background-image:radial-gradient(ellipse at 82% 8%,rgba(255,176,92,.9),rgba(255,120,60,.25) 32%,transparent 62%),radial-gradient(ellipse at 12% 92%,rgba(90,169,255,.55),transparent 55%);mix-blend-mode:screen}
.ov.mesh{background-image:radial-gradient(circle at 20% 25%,rgba(53,224,138,.35),transparent 45%),radial-gradient(circle at 78% 72%,rgba(155,140,255,.32),transparent 48%);mix-blend-mode:screen}
.ov.grid{background-image:linear-gradient(rgba(255,255,255,.16) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.16) 1px,transparent 1px);background-size:40px 40px;mix-blend-mode:overlay}
.ov.vig{background:radial-gradient(ellipse at center,transparent 42%,rgba(0,0,0,.85) 100%)}
.poster.anim .anim-float{animation:psFloat var(--mdur,6s) ease-in-out infinite}
.poster.anim .anim-pulse{animation:psPulse var(--mdur,4s) ease-in-out infinite}
.poster.anim .anim-kenburns{animation:psKen var(--mdur,14s) ease-in-out infinite alternate}
.poster.anim .anim-fadeup{animation:psFadeUp var(--mdur,5s) ease-in-out infinite}
.poster.anim .anim-shimmer{animation:psShimmer var(--mdur,5s) linear infinite}
.poster.anim .anim-drift{animation:psDrift var(--mdur,9s) ease-in-out infinite alternate}
@keyframes psFloat{0%,100%{transform:translateY(0) rotate(var(--rot,0deg))}50%{transform:translateY(-14px) rotate(var(--rot,0deg))}}
@keyframes psPulse{0%,100%{transform:scale(1) rotate(var(--rot,0deg))}50%{transform:scale(1.03) rotate(var(--rot,0deg))}}
@keyframes psKen{0%{transform:scale(1) rotate(var(--rot,0deg))}100%{transform:scale(1.09) rotate(var(--rot,0deg))}}
@keyframes psFadeUp{0%{opacity:0;transform:translateY(26px) rotate(var(--rot,0deg))}22%,78%{opacity:1;transform:translateY(0) rotate(var(--rot,0deg))}100%{opacity:0;transform:translateY(-8px) rotate(var(--rot,0deg))}}
@keyframes psShimmer{0%{filter:brightness(1)}45%{filter:brightness(1.35)}100%{filter:brightness(1)}}
@keyframes psDrift{0%{transform:translateX(-10px) rotate(var(--rot,0deg))}100%{transform:translateX(10px) rotate(var(--rot,0deg))}}
.safe-area{position:absolute;inset:4.5%;border:1px dashed rgba(53,224,138,.6);pointer-events:none;z-index:9500;display:none}
.poster.show-safe .safe-area{display:block}
`;

  R.ensureCSS = function () {
    if (document.getElementById('poster-css')) return;
    const s = document.createElement('style');
    s.id = 'poster-css';
    s.textContent = R.POSTER_CSS;
    document.head.appendChild(s);
  };

  /* ---------- 噪点纹理（DOM 与 Canvas 共享） ---------- */
  let _noise = null;
  R.noiseURL = function () {
    if (_noise) return _noise;
    const c = document.createElement('canvas');
    c.width = c.height = 140;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(140, 140);
    const rnd = U.seeded(20261102);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 110 + Math.floor(rnd() * 130);
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    _noise = c.toDataURL('image/png');
    return _noise;
  };

  /* ---------- 样式工具 ---------- */
  R.filterString = function (f) {
    if (!f) return 'none';
    const parts = [];
    if (f.blur) parts.push('blur(' + f.blur + 'px)');
    if (f.brightness && f.brightness !== 1) parts.push('brightness(' + f.brightness + ')');
    if (f.contrast && f.contrast !== 1) parts.push('contrast(' + f.contrast + ')');
    if (f.saturate && f.saturate !== 1) parts.push('saturate(' + f.saturate + ')');
    if (f.hue) parts.push('hue-rotate(' + f.hue + 'deg)');
    if (f.grayscale && !f.duotone) parts.push('grayscale(' + f.grayscale + ')');
    if (f.sepia) parts.push('sepia(' + f.sepia + ')');
    return parts.length ? parts.join(' ') : 'none';
  };

  R.gradientCSS = function (l) {
    if (!l.fill2) return l.fill || 'transparent';
    const a = l.gradAngle == null ? 135 : l.gradAngle;
    if (l.gradType === 'radial') return 'radial-gradient(circle at 50% 50%,' + l.fill + ',' + l.fill2 + ')';
    return 'linear-gradient(' + a + 'deg,' + l.fill + ',' + l.fill2 + ')';
  };

  R.shadowCSS = function (l) {
    if (!l.shadow || !l.shadow.on) return 'none';
    const s = l.shadow;
    return s.x + 'px ' + s.y + 'px ' + s.blur + 'px ' + U.rgba(s.color, s.alpha) + '';
  };

  R.clipFor = function (shape) {
    if (shape === 'triangle') return 'polygon(50% 0%,100% 100%,0% 100%)';
    if (shape === 'star') return 'polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)';
    if (shape === 'arrow') return 'polygon(0 34%,62% 34%,62% 8%,100% 50%,62% 92%,62% 66%,0 66%)';
    return '';
  };

  R.textShadowCSS = function (l) {
    const c = l.color || '#fff';
    if (l.textFx === 'neon') return '0 0 4px ' + U.rgba(c, .9) + ',0 0 14px ' + U.rgba(c, .7) + ',0 0 40px ' + U.rgba(c, .45);
    if (l.textFx === 'sticker') {
      const w = Math.max(2, (l.size || 40) * 0.06);
      let s = [];
      for (let a = 0; a < 360; a += 45) {
        s.push(Math.cos((a * Math.PI) / 180) * w + 'px ' + Math.sin((a * Math.PI) / 180) * w + 'px 0 #fff');
      }
      s.push('0 ' + w * 1.6 + 'px ' + w * 2.4 + 'px rgba(0,0,0,.28)');
      return s.join(',');
    }
    if (l.textFx === 'emboss') return '0 1px 0 rgba(255,255,255,.45),0 -1px 0 rgba(0,0,0,.45)';
    if (l.shadow && l.shadow.on) return R.shadowCSS(l);
    return 'none';
  };

  /* ---------- 单图层节点 ---------- */
  R.buildLayer = function (l, prevIframe) {
    const wrap = document.createElement('div');
    wrap.className = 'layer anim-' + (l.motion || 'none');
    wrap.dataset.id = l.id;
    wrap.dataset.type = l.type;
    wrap.style.left = l.x + 'px';
    wrap.style.top = l.y + 'px';
    wrap.style.width = l.w + 'px';
    wrap.style.height = l.h + 'px';
    wrap.style.opacity = l.opacity == null ? 1 : l.opacity;
    wrap.style.transform = 'rotate(' + (l.rot || 0) + 'deg)';
    wrap.style.setProperty('--rot', (l.rot || 0) + 'deg');
    wrap.style.setProperty('--mdur', (l.type === 'ai' ? (l.duration || 6) : (4 + (l.w % 5))) + 's');
    if (l.blend && l.blend !== 'normal') wrap.style.mixBlendMode = l.blend;
    if (l.hidden) wrap.style.display = 'none';
    if (l.locked) { wrap.dataset.locked = '1'; wrap.classList.add('is-locked'); }

    const bx = document.createElement('div');
    bx.className = 'bx';
    const fi = R.filterString(l.filters);
    if (fi !== 'none') bx.style.filter = fi;
    bx.style.borderRadius = (l.radius || 0) + 'px';
    wrap.appendChild(bx);

    if (l.type === 'text') {
      bx.classList.add('txt');
      bx.style.justifyContent = l.valign === 'middle' ? 'center' : l.valign === 'bottom' ? 'flex-end' : 'flex-start';
      bx.style.textAlign = l.align || 'left';
      const tx = document.createElement('div');
      tx.className = 'tx';
      tx.textContent = l.text || '';
      tx.style.fontFamily = DATA.fontStack(l.font);
      tx.style.fontSize = (l.size || 48) + 'px';
      tx.style.fontWeight = l.weight || 400;
      tx.style.lineHeight = l.lineHeight || 1.2;
      tx.style.letterSpacing = ((l.tracking || 0) * (l.size || 48)) + 'px';
      tx.style.fontStyle = l.italic ? 'italic' : 'normal';
      tx.style.textTransform = l.upper ? 'uppercase' : 'none';
      tx.style.textShadow = R.textShadowCSS(l);
      if (l.textFx === 'gradient') {
        tx.style.backgroundImage = 'linear-gradient(' + (l.gradAngle == null ? 120 : l.gradAngle) + 'deg,' + (l.color || '#fff') + ',' + (l.fill2 || l.stroke || '#35E08A') + ')';
        tx.style.webkitBackgroundClip = 'text';
        tx.style.backgroundClip = 'text';
        tx.style.color = 'transparent';
      } else if (l.textFx === 'outline') {
        tx.style.color = 'transparent';
        tx.style.webkitTextStroke = Math.max(1, l.strokeW || 2) + 'px ' + (l.stroke || l.color || '#fff');
      } else {
        tx.style.color = l.color || '#fff';
        if (l.strokeW && l.stroke) tx.style.webkitTextStroke = l.strokeW + 'px ' + l.stroke;
      }
      bx.appendChild(tx);
      wrap.dataset.text = '1';
    } else if (l.type === 'image') {
      bx.classList.add('img');
      if (l.filters && l.filters.duotone) bx.classList.add('duo');
      if (l.src) {
        bx.style.backgroundImage = 'url("' + l.src + '")';
        bx.style.backgroundSize = l.fit === 'contain' ? 'contain' : 'cover';
        bx.style.backgroundPosition = 'center';
      } else {
        bx.style.background = 'linear-gradient(135deg,#26303F,#111722)';
        bx.innerHTML = '<div style="position:absolute;inset:0;display:grid;place-items:center;color:#8FA0B8;font:500 13px/1.4 ' + DATA.fontStack('sans') + '">点击「图片」上传</div>';
      }
      if (l.filters && l.filters.duotone) {
        const d = document.createElement('div');
        d.className = 'duo-layer';
        d.style.background = 'linear-gradient(135deg,' + (l.filters.d1 || '#0B0F14') + ',' + (l.filters.d2 || '#F4F7FB') + ')';
        bx.appendChild(d);
      }
      bx.style.boxShadow = R.shadowCSS(l);
    } else if (l.type === 'ai') {
      bx.classList.add('ai');
      bx.style.boxShadow = R.shadowCSS(l);
      bx.style.overflow = 'hidden';
      const html = l.artHtml || '';
      let iframe = null;
      if (prevIframe && prevIframe.dataset.hash === String(html.length) + '_' + (html.slice(-24) || '')) iframe = prevIframe;
      if (iframe) {
        iframe.style.width = l.w + 'px';
        iframe.style.height = l.h + 'px';
      } else {
        iframe = document.createElement('iframe');
        iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
        iframe.setAttribute('scrolling', 'no');
        iframe.style.width = l.w + 'px';
        iframe.style.height = l.h + 'px';
        iframe.dataset.hash = String(html.length) + '_' + (html.slice(-24) || '');
        iframe.srcdoc = R.aiDoc(html, l.w, l.h);
      }
      bx.appendChild(iframe);
      if (!html) {
        const ph = document.createElement('div');
        ph.style.cssText = 'position:absolute;inset:0;display:grid;place-items:center;color:#8FA0B8;font:500 13px/1.4 ' + DATA.fontStack('sans') + ';background:#111722';
        ph.textContent = 'AI 插画图层';
        bx.appendChild(ph);
      }
    } else {
      bx.classList.add('shape');
      const clip = R.clipFor(l.shape);
      if (l.shape === 'ellipse') bx.style.borderRadius = '50%';
      if (l.shape === 'ring') {
        bx.style.borderRadius = '50%';
        bx.style.background = 'transparent';
        bx.style.border = Math.max(2, l.strokeW || 6) + 'px solid ' + (l.stroke || l.fill || '#fff');
        bx.style.opacity = l.opacity;
      } else if (l.shape === 'frame') {
        bx.style.background = 'transparent';
        bx.style.border = Math.max(1, l.strokeW || 2) + 'px solid ' + (l.stroke || l.fill || '#fff');
      } else if (l.shape === 'line') {
        bx.style.background = l.fill && l.fill !== 'transparent' ? l.fill : (l.stroke || '#fff');
        bx.style.borderRadius = (l.radius || 0) + 'px';
        if (l.fill2) bx.style.background = R.gradientCSS(l);
      } else if (l.shape === 'icon') {
        const ic = DATA.ICONS.find((x) => x.id === l.icon) || DATA.ICONS[0];
        bx.style.background = 'transparent';
        bx.innerHTML = '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="' + (l.stroke || l.fill || '#fff') +
          '" stroke-width="' + (l.strokeW || 1.6) + '" stroke-linecap="round" stroke-linejoin="round" preserveAspectRatio="xMidYMid meet">' +
          ic.d.map((d) => '<path d="' + d + '"/>').join('') + '</svg>';
      } else {
        bx.style.background = R.gradientCSS(l);
      }
      if (clip) bx.style.clipPath = clip;
      if (l.stroke && l.shape !== 'ring' && l.shape !== 'frame' && l.shape !== 'icon') {
        bx.style.boxShadow = (l.strokeW ? 'inset 0 0 0 ' + l.strokeW + 'px ' + l.stroke : '') + (l.shadow && l.shadow.on ? (l.strokeW ? ',' : '') + R.shadowCSS(l) : '');
      } else {
        bx.style.boxShadow = R.shadowCSS(l);
      }
      if (l.shape === 'ellipse' && l.shadow && l.shadow.on) bx.style.borderRadius = '50%';
    }
    return wrap;
  };

  /* 给 AI 插画 HTML 注入播放驱动（契约：模型只提供 renderFrame） */
  R.aiDoc = function (html, w, h, once) {
    const driver = once
      ? '<script>(function(){function fit(){var c=document.getElementById("art");if(!c)return;' +
        'c.style.width="100%";c.style.height="100%";c.style.aspectRatio="auto";}' +
        'function draw(){try{fit();if(typeof window.renderFrame==="function")window.renderFrame(' + (once === true ? 1.4 : once) + ');}catch(e){}}' +
        'requestAnimationFrame(function(){draw();setTimeout(draw,120);setTimeout(draw,420);});})();<\/script>'
      : '<script>(function(){var t0=0;' +
        'function fit(){var c=document.getElementById("art");if(!c)return;c.style.width="100%";c.style.height="100%";}' +
        'function tick(now){if(!t0)t0=now;var d=(window.ART&&window.ART.duration)||6;if(!(d>0))d=6;var t=((now-t0)/1000)%d;' +
        'try{fit();if(typeof window.renderFrame==="function")window.renderFrame(t);}catch(e){}requestAnimationFrame(tick);}' +
        'function first(){try{fit();if(typeof window.renderFrame==="function")window.renderFrame(1.2);}catch(e){}}' +
        'first();try{first();}catch(e){}' +
        'if(document.readyState==="complete")requestAnimationFrame(tick);else window.addEventListener("load",function(){first();requestAnimationFrame(tick);});' +
        'setTimeout(first,90);setTimeout(first,400);})();<\/script>';
    let doc = String(html || '');
    if (!/<\/body>/i.test(doc)) doc += driver;
    else doc = doc.replace(/<\/body>/i, driver + '</body>');
    return doc;
  };

  /* ---------- 叠加效果 ---------- */
  R.buildOverlays = function (canvas) {
    const out = [];
    const ov = canvas.overlay || {};
    const bg = canvas.bg || '#ffffff';
    const dark = U.lum(bg) < 0.42;
    const push = (cls, style, opacity) => {
      if (!opacity) return;
      const d = document.createElement('div');
      d.className = 'ov ' + cls;
      d.style.opacity = opacity;
      if (style) d.style.cssText += ';' + style;
      out.push(d);
    };
    push('grain', 'background-image:url(' + R.noiseURL() + ')', (ov.grain || 0) / 100);
    push('halftone', 'color:' + (dark ? '#EAF2FF' : '#0B0F14'), (ov.halftone || 0) / 100 * 0.5);
    push('scan', '', (ov.scan || 0) / 100 * 0.8);
    push('leak', '', (ov.leak || 0) / 100);
    push('mesh', '', (ov.mesh || 0) / 100);
    push('grid', '', (ov.grid || 0) / 100 * 0.8);
    if (ov.vignette) push('vig', '', (ov.vignette || 0) / 100);
    return out;
  };

  /* ---------- 整体渲染 ---------- */
  R.render = function () {
    R.ensureCSS();
    const poster = document.getElementById('poster');
    if (!poster || !Store.doc) return;
    const doc = Store.doc;

    const prev = {};
    U.$$('.layer[data-type="ai"]', poster).forEach((n) => {
      const f = n.querySelector('iframe');
      if (f) prev[n.dataset.id] = f;
    });

    poster.innerHTML = '';
    poster.style.width = doc.canvas.w + 'px';
    poster.style.height = doc.canvas.h + 'px';
    poster.style.background = doc.canvas.bg || '#fff';
    poster.style.setProperty('--rot', '0deg');
    poster.classList.toggle('anim', !!Store.playing);
    poster.classList.toggle('show-safe', !!Store.safe);

    doc.layers.forEach((l, i) => {
      const node = R.buildLayer(l, prev[l.id]);
      node.style.zIndex = String(i + 1);
      poster.appendChild(node);
    });

    R.buildOverlays(doc.canvas).forEach((n) => {
      n.style.zIndex = '9000';
      poster.appendChild(n);
    });

    const safe = document.createElement('div');
    safe.className = 'safe-area';
    safe.style.zIndex = '9500';
    poster.appendChild(safe);

    const meta = document.getElementById('posterMeta');
    if (meta) meta.textContent = doc.canvas.w + ' × ' + doc.canvas.h + ' px · ' + doc.layers.length + ' 个图层';
    const sizeLabel = document.getElementById('sizeLabel');
    if (sizeLabel) sizeLabel.textContent = doc.canvas.w + ' × ' + doc.canvas.h;
  };

  R.updateTransform = function (l) {
    const n = document.querySelector('.layer[data-id="' + l.id + '"]');
    if (!n) return;
    n.style.left = l.x + 'px';
    n.style.top = l.y + 'px';
    n.style.width = l.w + 'px';
    n.style.height = l.h + 'px';
    n.style.opacity = l.opacity == null ? 1 : l.opacity;
    n.style.transform = 'rotate(' + (l.rot || 0) + 'deg)';
    n.style.setProperty('--rot', (l.rot || 0) + 'deg');
    n.style.display = l.hidden ? 'none' : '';
    const ifr = n.querySelector('iframe');
    if (ifr) { ifr.style.width = l.w + 'px'; ifr.style.height = l.h + 'px'; }
  };

  window.R = R;
})();
