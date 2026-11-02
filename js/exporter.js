/* exporter.js — 逐帧绘制到 Canvas，导出 PNG / JPG / 单文件网页 / WebM 视频 / JSON */
(function () {
  'use strict';

  const EX = {};
  const fontOf = (l) => ((l.italic ? 'italic ' : '') + (l.weight || 400) + ' ' + (l.size || 40) + 'px ' + DATA.fontStack(l.font));

  /* ---------- 文字换行 ---------- */
  function wrapLines(ctx, text, maxW) {
    const out = [];
    String(text || '').split('\n').forEach((para) => {
      if (!para) { out.push(''); return; }
      let line = '';
      for (let i = 0; i < para.length; i++) {
        const ch = para[i];
        const test = line + ch;
        if (ctx.measureText(test).width > maxW && line) {
          out.push(line);
          line = ch;
        } else line = test;
      }
      out.push(line);
    });
    return out;
  }

  /* ---------- 图形路径 ---------- */
  function rectPath(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r || 0, Math.min(w, h) / 2));
    if (!r) { ctx.beginPath(); ctx.rect(x, y, w, h); return; }
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function polyPath(ctx, pts, w, h) {
    ctx.beginPath();
    pts.forEach((p, i) => {
      const X = (p[0] / 100) * w, Y = (p[1] / 100) * h;
      if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
    });
    ctx.closePath();
  }

  function shapePath(ctx, l) {
    const w = l.w, h = l.h;
    switch (l.shape) {
      case 'ellipse':
      case 'ring':
        ctx.beginPath();
        ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
        break;
      case 'triangle':
        polyPath(ctx, [[50, 0], [100, 100], [0, 100]], w, h);
        break;
      case 'star':
        polyPath(ctx, [[50, 0], [61, 35], [98, 35], [68, 57], [79, 91], [50, 70], [21, 91], [32, 57], [2, 35], [39, 35]], w, h);
        break;
      case 'arrow':
        polyPath(ctx, [[0, 34], [62, 34], [62, 8], [100, 50], [62, 92], [62, 66], [0, 66]], w, h);
        break;
      case 'frame':
        ctx.beginPath();
        ctx.rect(0, 0, w, h);
        break;
      default:
        rectPath(ctx, 0, 0, w, h, l.radius || 0);
    }
  }

  function fillStyleOf(ctx, l, w, h) {
    if (!l.fill2) return l.fill || 'transparent';
    if (l.gradType === 'radial') {
      const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) / 2);
      g.addColorStop(0, l.fill || '#000');
      g.addColorStop(1, l.fill2);
      return g;
    }
    const a = ((l.gradAngle == null ? 135 : l.gradAngle) * Math.PI) / 180;
    const cx = w / 2, cy = h / 2, len = (Math.abs(Math.cos(a)) * w + Math.abs(Math.sin(a)) * h) / 2;
    const g = ctx.createLinearGradient(cx - Math.cos(a) * len, cy - Math.sin(a) * len, cx + Math.cos(a) * len, cy + Math.sin(a) * len);
    g.addColorStop(0, l.fill || '#000');
    g.addColorStop(1, l.fill2);
    return g;
  }

  /* ---------- 单个图层 ---------- */
  function drawLayer(ctx, l, t) {
    if (l.hidden) return;
    ctx.save();
    ctx.globalAlpha = l.opacity == null ? 1 : l.opacity;
    if (l.blend && l.blend !== 'normal') ctx.globalCompositeOperation = l.blend;
    const fi = R.filterString(l.filters);
    if (fi !== 'none') ctx.filter = fi;

    ctx.translate(l.x + l.w / 2, l.y + l.h / 2);
    if (l.rot) ctx.rotate((l.rot * Math.PI) / 180);

    if (l.shadow && l.shadow.on) {
      ctx.shadowColor = U.rgba(l.shadow.color, l.shadow.alpha);
      ctx.shadowBlur = l.shadow.blur * 1;
      ctx.shadowOffsetX = l.shadow.x;
      ctx.shadowOffsetY = l.shadow.y;
    }

    if (l.type === 'text') drawText(ctx, l);
    else if (l.type === 'image') drawImageLayer(ctx, l);
    else if (l.type === 'ai') drawAI(ctx, l, t);
    else drawShape(ctx, l);

    ctx.restore();
  }

  function drawShape(ctx, l) {
    const w = l.w, h = l.h;
    ctx.translate(-w / 2, -h / 2);
    if (l.shape === 'icon') {
      const ic = DATA.ICONS.find((x) => x.id === l.icon) || DATA.ICONS[0];
      const p = new Path2D();
      ic.d.forEach((d) => p.addPath(new Path2D(d)));
      ctx.save();
      ctx.scale(w / 24, h / 24);
      ctx.strokeStyle = l.stroke || l.fill || '#fff';
      ctx.lineWidth = (l.strokeW || 1.6);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke(p);
      ctx.restore();
      return;
    }
    shapePath(ctx, l);
    if (l.shape === 'ring') {
      ctx.strokeStyle = l.stroke || l.fill || '#fff';
      ctx.lineWidth = Math.max(2, l.strokeW || 6);
      ctx.stroke();
      return;
    }
    if (l.shape === 'frame') {
      ctx.strokeStyle = l.stroke || l.fill || '#fff';
      ctx.lineWidth = Math.max(1, l.strokeW || 2);
      ctx.stroke();
      return;
    }
    if (l.shape === 'line') {
      ctx.fillStyle = l.fill2 ? fillStyleOf(ctx, l, w, h) : (l.fill && l.fill !== 'transparent' ? l.fill : (l.stroke || '#fff'));
      ctx.fill();
      return;
    }
    ctx.fillStyle = fillStyleOf(ctx, l, w, h);
    ctx.fill();
    if (l.stroke && l.strokeW) {
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = l.stroke;
      ctx.lineWidth = l.strokeW;
      ctx.stroke();
    }
  }

  function drawText(ctx, l) {
    const w = l.w, h = l.h;
    ctx.translate(-w / 2, -h / 2);
    const size = l.size || 40;
    ctx.font = fontOf(l);
    if ('letterSpacing' in ctx) ctx.letterSpacing = ((l.tracking || 0) * size).toFixed(2) + 'px';
    ctx.textBaseline = 'middle';
    let text = l.text || '';
    if (l.upper) text = text.toUpperCase();
    const lines = wrapLines(ctx, text, w);
    const lh = (l.lineHeight || 1.2) * size;
    const total = lines.length * lh;
    let startY = size * 0.5;
    if (l.valign === 'middle') startY = h / 2 - total / 2 + lh / 2;
    else if (l.valign === 'bottom') startY = h - total + lh / 2;

    ctx.textAlign = l.align === 'center' ? 'center' : l.align === 'right' ? 'right' : 'left';
    const ax = l.align === 'center' ? w / 2 : l.align === 'right' ? w : 0;

    lines.forEach((line, i) => {
      const y = startY + i * lh;
      if (l.textFx === 'gradient') {
        const a = ((l.gradAngle == null ? 120 : l.gradAngle) * Math.PI) / 180;
        const g = ctx.createLinearGradient(0, y - size, Math.cos(a) * w, y + Math.sin(a) * size);
        g.addColorStop(0, l.color || '#fff');
        g.addColorStop(1, l.fill2 || l.stroke || '#35E08A');
        ctx.fillStyle = g;
        ctx.fillText(line, ax, y);
      } else if (l.textFx === 'outline') {
        ctx.strokeStyle = l.stroke || l.color || '#fff';
        ctx.lineWidth = Math.max(1, l.strokeW || 2);
        ctx.strokeText(line, ax, y);
      } else if (l.textFx === 'sticker') {
        ctx.shadowBlur = 0;
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(3, size * 0.14);
        ctx.strokeText(line, ax, y);
        ctx.fillStyle = l.color || '#fff';
        ctx.fillText(line, ax, y);
      } else {
        if (l.textFx === 'neon') {
          ctx.shadowColor = U.rgba(l.color, 0.9);
          ctx.shadowBlur = size * 0.6;
        }
        ctx.fillStyle = l.color || '#fff';
        ctx.fillText(line, ax, y);
      }
    });
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  }

  function drawImageLayer(ctx, l) {
    const w = l.w, h = l.h;
    ctx.translate(-w / 2, -h / 2);
    const img = EX._imgCache && EX._imgCache[l.id];
    if (!img || !img.complete || !img.naturalWidth) {
      ctx.fillStyle = 'rgba(120,140,170,.25)';
      rectPath(ctx, 0, 0, w, h, l.radius || 0);
      ctx.fill();
      return;
    }
    const ir = img.naturalWidth / img.naturalHeight, br = w / h;
    let sw = img.naturalWidth, sh = img.naturalHeight, sx = 0, sy = 0;
    if (l.fit !== 'contain') {
      if (ir > br) { sw = img.naturalHeight * br; sx = (img.naturalWidth - sw) / 2; }
      else { sh = img.naturalWidth / br; sy = (img.naturalHeight - sh) / 2; }
    }
    ctx.save();
    rectPath(ctx, 0, 0, w, h, l.radius || 0);
    ctx.clip();
    if (l.fit === 'contain') {
      const s = Math.min(w / img.naturalWidth, h / img.naturalHeight);
      const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
      ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
    } else {
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
    }
    if (l.filters && l.filters.duotone) {
      ctx.globalCompositeOperation = 'color';
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, l.filters.d1 || '#0B0F14');
      g.addColorStop(1, l.filters.d2 || '#F4F7FB');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
  }

  function drawAI(ctx, l, t) {
    const w = l.w, h = l.h;
    const node = document.querySelector('.layer[data-id="' + l.id + '"] iframe');
    let cv = null;
    try {
      if (node && node.contentWindow && typeof node.contentWindow.renderFrame === 'function') {
        node.contentWindow.renderFrame(t);
        cv = node.contentDocument.getElementById('art');
      }
    } catch (e) { cv = null; }
    ctx.translate(-w / 2, -h / 2);
    if (cv) {
      try { ctx.drawImage(cv, 0, 0, cv.width, cv.height, 0, 0, w, h); return; } catch (e) {}
    }
    ctx.fillStyle = 'rgba(120,140,170,.18)';
    rectPath(ctx, 0, 0, w, h, l.radius || 0);
    ctx.fill();
  }

  /* ---------- 叠加层 ---------- */
  function drawOverlays(ctx, canvas) {
    const ov = canvas.overlay || {};
    const W = canvas.w, H = canvas.h;
    const dark = U.lum(canvas.bg || '#fff') < 0.42;

    if (ov.grain) {
      const g = document.createElement('canvas');
      g.width = g.height = 140;
      const gx = g.getContext('2d');
      const im = gx.createImageData(140, 140);
      const rnd = U.seeded(20261102);
      for (let i = 0; i < im.data.length; i += 4) {
        const v = 110 + Math.floor(rnd() * 130);
        im.data[i] = im.data[i + 1] = im.data[i + 2] = v;
        im.data[i + 3] = 255;
      }
      gx.putImageData(im, 0, 0);
      ctx.save();
      ctx.globalAlpha = (ov.grain / 100) * 0.9;
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = ctx.createPattern(g, 'repeat');
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    if (ov.halftone) {
      ctx.save();
      ctx.globalAlpha = (ov.halftone / 100) * 0.5;
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = dark ? '#EAF2FF' : '#0B0F14';
      const step = 6;
      for (let y = 0; y < H; y += step) {
        for (let x0 = 0; x0 < W; x0 += step) {
          ctx.beginPath();
          ctx.arc(x0 + 2, y + 2, 1.1, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }
    if (ov.scan) {
      ctx.save();
      ctx.globalAlpha = (ov.scan / 100) * 0.8;
      ctx.fillStyle = '#000';
      for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
      ctx.restore();
    }
    if (ov.leak) {
      ctx.save();
      ctx.globalAlpha = ov.leak / 100;
      ctx.globalCompositeOperation = 'screen';
      let g = ctx.createRadialGradient(W * 0.82, H * 0.08, 0, W * 0.82, H * 0.08, Math.max(W, H) * 0.6);
      g.addColorStop(0, 'rgba(255,176,92,.9)');
      g.addColorStop(0.35, 'rgba(255,120,60,.35)');
      g.addColorStop(1, 'rgba(255,120,60,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      g = ctx.createRadialGradient(W * 0.12, H * 0.92, 0, W * 0.12, H * 0.92, Math.max(W, H) * 0.5);
      g.addColorStop(0, 'rgba(90,169,255,.55)');
      g.addColorStop(1, 'rgba(90,169,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    if (ov.mesh) {
      ctx.save();
      ctx.globalAlpha = ov.mesh / 100;
      ctx.globalCompositeOperation = 'screen';
      let g = ctx.createRadialGradient(W * 0.2, H * 0.25, 0, W * 0.2, H * 0.25, Math.max(W, H) * 0.45);
      g.addColorStop(0, 'rgba(53,224,138,.35)');
      g.addColorStop(1, 'rgba(53,224,138,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      g = ctx.createRadialGradient(W * 0.78, H * 0.72, 0, W * 0.78, H * 0.72, Math.max(W, H) * 0.48);
      g.addColorStop(0, 'rgba(155,140,255,.32)');
      g.addColorStop(1, 'rgba(155,140,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    if (ov.grid) {
      ctx.save();
      ctx.globalAlpha = (ov.grid / 100) * 0.6;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      ctx.restore();
    }
    if (ov.vignette) {
      ctx.save();
      ctx.globalAlpha = ov.vignette / 100;
      const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.28, W / 2, H / 2, Math.max(W, H) * 0.75);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,.85)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  }

  /* ---------- 图片缓存 ---------- */
  EX._imgCache = {};
  EX.preload = function () {
    const jobs = (Store.doc.layers || []).filter((l) => l.type === 'image' && l.src).map((l) => new Promise((res) => {
      if (EX._imgCache[l.id] && EX._imgCache[l.id].src === l.src) return res();
      const img = new Image();
      img.onload = img.onerror = () => res();
      img.src = l.src;
      EX._imgCache[l.id] = img;
    }));
    return Promise.all(jobs);
  };

  /* ---------- 合成 ---------- */
  EX.toCanvas = function (scale, t, canvasDoc) {
    const doc = canvasDoc || Store.doc;
    const s = scale || 1;
    const cv = document.createElement('canvas');
    cv.width = Math.round(doc.canvas.w * s);
    cv.height = Math.round(doc.canvas.h * s);
    const ctx = cv.getContext('2d');
    ctx.save();
    ctx.scale(s, s);
    ctx.fillStyle = doc.canvas.bg || '#fff';
    ctx.fillRect(0, 0, doc.canvas.w, doc.canvas.h);
    doc.layers.forEach((l) => drawLayer(ctx, l, t || 0));
    ctx.restore();
    drawOverlays(ctx, doc.canvas);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    return cv;
  };

  /* ---------- 位图导出 ---------- */
  function saveBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  EX.png = async function (scale) {
    U.busy(true, '正在合成 PNG…');
    try {
      await EX.preload();
      const cv = EX.toCanvas(scale || 2);
      const blob = await new Promise((res) => cv.toBlob(res, 'image/png'));
      saveBlob(blob, 'plaque-' + U.dateStamp() + '@' + (scale || 2) + 'x.png');
      U.toast('PNG 已导出');
    } catch (e) { U.toast('导出失败：' + e.message); }
    U.busy(false);
  };

  EX.jpg = async function (scale) {
    U.busy(true, '正在合成 JPG…');
    try {
      await EX.preload();
      const cv = EX.toCanvas(scale || 2);
      const blob = await new Promise((res) => cv.toBlob(res, 'image/jpeg', 0.92));
      saveBlob(blob, 'plaque-' + U.dateStamp() + '.jpg');
      U.toast('JPG 已导出');
    } catch (e) { U.toast('导出失败：' + e.message); }
    U.busy(false);
  };

  /* ---------- 网页导出 ---------- */
  EX.buildWeb = function () {
    const doc = Store.doc;
    const p = document.getElementById('poster').cloneNode(true);
    p.querySelectorAll('.sel-box,.guide,.marquee,.safe-area').forEach((n) => n.remove());
    p.classList.add('anim');
    p.classList.remove('show-safe');
    p.style.transform = 'none';
    p.style.width = doc.canvas.w + 'px';
    p.style.height = doc.canvas.h + 'px';
    p.style.background = doc.canvas.bg;

    const html = '<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n<meta charset="utf-8">\n' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">\n' +
      '<title>' + U.escapeHtml(doc.name || '海报') + '</title>\n<style>\n' +
      R.POSTER_CSS + '\n' +
      'html,body{margin:0;height:100%;background:#07090D;overflow:hidden}\n' +
      '.wrap{position:fixed;inset:0;display:flex;align-items:center;justify-content:center}\n' +
      '.scaler{position:relative;flex:0 0 auto;line-height:0}\n' +
      '.scaler .poster{position:absolute;left:0;top:0;transform-origin:0 0;box-shadow:0 40px 120px -40px rgba(0,0,0,.9)}\n' +
      '</style>\n</head>\n<body>\n<div class="wrap"><div class="scaler" id="scaler">\n' +
      p.outerHTML + '\n</div></div>\n<script>\n' +
      '(function(){var s=document.getElementById("scaler"),p=document.getElementById("poster"),k=1;' +
      'function fit(){k=Math.min(innerWidth/p.offsetWidth,innerHeight/p.offsetHeight);' +
      's.style.width=(p.offsetWidth*k)+"px";s.style.height=(p.offsetHeight*k)+"px";' +
      'p.style.transformOrigin="0 0";p.style.transform="scale("+k+")";}' +
      'addEventListener("resize",fit);fit();})();\n<\/script>\n</body>\n</html>';

    return html;
  };

  EX.web = function () {
    const html = EX.buildWeb();
    saveBlob(new Blob([html], { type: 'text/html;charset=utf-8' }), 'plaque-' + U.dateStamp() + '.html');
    U.toast('网页已导出（插画动效保留）');
  };

  /* ---------- 视频导出 ---------- */
  EX.video = async function (opt) {
    opt = opt || {};
    const doc = Store.doc;
    const aiDur = (doc.layers || []).filter((l) => l.type === 'ai').map((l) => l.duration || 6);
    const duration = Math.max(4, Math.round(opt.duration || Math.max.apply(null, [6].concat(aiDur))));
    const fps = opt.fps || 30;
    if (!window.MediaRecorder) { U.toast('当前浏览器不支持录制'); return; }

    await EX.preload();
    const cv = EX.toCanvas(1, 0);
    const stream = cv.captureStream ? cv.captureStream(fps) : null;
    if (!stream) { U.toast('当前浏览器不支持 captureStream'); return; }
    const types = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
    const mime = types.find((t) => MediaRecorder.isTypeSupported(t)) || '';
    let rec;
    try { rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 8e6 } : undefined); }
    catch (e) { U.toast('录制初始化失败：' + e.message); return; }

    const chunks = [];
    rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    const done = new Promise((res) => { rec.onstop = res; });

    U.busy(true, '正在录制 ' + duration + 's 视频…');
    rec.start(120);
    const t0 = performance.now();
    await new Promise((resolve) => {
      function frame() {
        const el = (performance.now() - t0) / 1000;
        const t = el % duration;
        const shot = EX.toCanvas(1, t);
        const ctx = cv.getContext('2d');
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, cv.width, cv.height);
        ctx.drawImage(shot, 0, 0);
        if (el >= duration) return resolve();
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    });
    rec.stop();
    await done;
    U.busy(false);
    saveBlob(new Blob(chunks, { type: mime || 'video/webm' }), 'plaque-' + U.dateStamp() + '-' + duration + 's.webm');
    U.toast('WebM 已导出（' + duration + 's / ' + fps + 'fps）');
  };

  /* ---------- 工程文件 ---------- */
  EX.json = function () {
    saveBlob(new Blob([JSON.stringify(Store.doc, null, 2)], { type: 'application/json' }), 'plaque-' + U.dateStamp() + '.json');
    U.toast('工程文件已导出');
  };

  EX.loadJSON = function (file) {
    U.readFile(file).then((txt) => {
      try {
        const d = JSON.parse(txt);
        if (!d.canvas || !Array.isArray(d.layers)) throw new Error('不是有效的工程文件');
        Store.init(d);
        ED.fit();
        PANELS.repaint();
        U.toast('工程已载入');
      } catch (e) { U.toast('载入失败：' + e.message); }
    });
  };

  window.EX = EX;
})();
