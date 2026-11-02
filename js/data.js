/* data.js — 画板 / 配色 / 布局 / 预设 */
(function () {
  'use strict';

  const FRAMES = [
    { id: 'xhs', name: '小红书 3:4', w: 1080, h: 1440, note: '信息流竖版通用' },
    { id: 'square', name: '方形 1:1', w: 1080, h: 1080, note: '朋友圈 / IG 帖' },
    { id: 'story', name: '竖版 9:16', w: 1080, h: 1920, note: '故事 / 短视频封面' },
    { id: 'pyq', name: '朋友圈 4:5', w: 1080, h: 1350, note: '微信生态' },
    { id: 'poster23', name: '海报 2:3', w: 1200, h: 1800, note: '打印 / 展览' },
    { id: 'a4', name: 'A4 印刷', w: 2480, h: 3508, note: '300dpi 出血另加' },
    { id: 'a5', name: 'A5 传单', w: 1748, h: 2480, note: '门店 / 活动' },
    { id: 'banner', name: 'Banner 16:9', w: 1920, h: 1080, note: '网页 / 大屏' },
    { id: 'wechat', name: '公众号首图', w: 900, h: 383, note: '2.35:1' },
    { id: 'wall', name: '桌面壁纸', w: 2560, h: 1440, note: '2K' },
    { id: 'card', name: '名片', w: 1063, h: 638, note: '90×54mm' },
    { id: 'sku', name: '电商主图', w: 800, h: 800, note: '1:1 白底' }
  ];

  const PALETTES = [
    { id: 'midnight', name: '午夜薄荷', bg: '#0B0F14', fg: '#F4F7FB', accent: '#35E08A', muted: '#7C8DA3', extra: '#182230' },
    { id: 'paper', name: '纸本赤陶', bg: '#F4F1EA', fg: '#161513', accent: '#E4572E', muted: '#8C857B', extra: '#E3DCCE' },
    { id: 'solar', name: '太阳报', bg: '#FFD166', fg: '#1B1B1B', accent: '#EF476F', muted: '#7A5B1E', extra: '#FFE3A3' },
    { id: 'inkblue', name: '墨蓝夜航', bg: '#0C1A2B', fg: '#EAF2FF', accent: '#5AA9FF', muted: '#7C93AD', extra: '#13273D' },
    { id: 'riso', name: '孔版青绿', bg: '#F6EFE6', fg: '#2B2118', accent: '#2F6B5E', muted: '#8A7A66', extra: '#E7DCCB' },
    { id: 'violet', name: '霓虹紫', bg: '#120A20', fg: '#F3E9FF', accent: '#B388FF', muted: '#9686AE', extra: '#1D1030' },
    { id: 'mono', name: '纯黑白', bg: '#F7F7F7', fg: '#0D0D0D', accent: '#0D0D0D', muted: '#8A8A8A', extra: '#E6E6E6' },
    { id: 'cream', name: '奶油落日', bg: '#FFF3E2', fg: '#3A2A1E', accent: '#C8553D', muted: '#9C8674', extra: '#F6E1C6' }
  ];

  const FONTS = [
    { id: 'sans', name: '无衬线 / 黑体', stack: '"PingFang SC","Microsoft YaHei","Noto Sans SC",system-ui,sans-serif' },
    { id: 'serif', name: '衬线 / 宋体', stack: '"Songti SC","SimSun","Noto Serif SC",Georgia,serif' },
    { id: 'mono', name: '等宽 / 代码', stack: '"JetBrains Mono","Cascadia Mono",Consolas,monospace' },
    { id: 'display', name: '展示 / 粗黑', stack: '"Segoe UI Black","Arial Black","PingFang SC","Microsoft YaHei",sans-serif' },
    { id: 'latin', name: '拉丁 / 几何', stack: 'Futura,"Century Gothic","Avenir Next",Helvetica,"Microsoft YaHei",sans-serif' }
  ];

  const TEXT_PRESETS = [
    { id: 'display', name: '巨型标题', size: .17, weight: 800, lh: 1.02, tracking: -.01, font: 'sans' },
    { id: 'headline', name: '主标题', size: .085, weight: 700, lh: 1.12, tracking: 0, font: 'sans' },
    { id: 'subhead', name: '副标题', size: .042, weight: 500, lh: 1.4, tracking: .01, font: 'sans' },
    { id: 'body', name: '正文', size: .028, weight: 400, lh: 1.65, tracking: .01, font: 'sans' },
    { id: 'label', name: '小标签', size: .019, weight: 600, lh: 1.4, tracking: .18, font: 'sans' },
    { id: 'serif', name: '宋体标题', size: .095, weight: 600, lh: 1.18, tracking: .02, font: 'serif' },
    { id: 'mono', name: '等宽注记', size: .018, weight: 500, lh: 1.6, tracking: .08, font: 'mono' }
  ];

  const TEXT_FX = [
    { id: 'none', name: '实心' },
    { id: 'gradient', name: '渐变' },
    { id: 'outline', name: '描边空心' },
    { id: 'neon', name: '霓虹' },
    { id: 'sticker', name: '贴纸' },
    { id: 'emboss', name: '压印' }
  ];

  const FILTER_PRESETS = [
    { id: 'none', name: '原图', f: {} },
    { id: 'mono', name: '黑白', f: { grayscale: 1, contrast: 1.08 } },
    { id: 'film', name: '复古胶片', f: { sepia: .35, saturate: .85, contrast: 1.1, brightness: 1.02 } },
    { id: 'cool', name: '冷调', f: { hue: -12, saturate: 1.1, brightness: 1.02 } },
    { id: 'warm', name: '暖调', f: { hue: 12, saturate: 1.15, brightness: 1.04 } },
    { id: 'punch', name: '高对比', f: { contrast: 1.35, saturate: 1.2 } },
    { id: 'fade', name: '褪色', f: { saturate: .55, brightness: 1.12, contrast: .9 } },
    { id: 'night', name: '蓝夜', f: { hue: -28, saturate: 1.2, brightness: .92, contrast: 1.12 } },
    { id: 'duo', name: '双色调', f: { grayscale: 1, duotone: true } }
  ];

  const MOTIONS = [
    { id: 'none', name: '静止' },
    { id: 'float', name: '漂浮', css: 'psFloat' },
    { id: 'pulse', name: '呼吸', css: 'psPulse' },
    { id: 'kenburns', name: '缓慢推近', css: 'psKen' },
    { id: 'fadeup', name: '上浮入场', css: 'psFadeUp' },
    { id: 'shimmer', name: '流光', css: 'psShimmer' },
    { id: 'drift', name: '横向漂移', css: 'psDrift' }
  ];

  const SHAPES = [
    { id: 'rect', name: '矩形', icon: 'rect' },
    { id: 'ellipse', name: '圆形', icon: 'ellipse' },
    { id: 'line', name: '线条', icon: 'line' },
    { id: 'triangle', name: '三角', icon: 'triangle' },
    { id: 'star', name: '星形', icon: 'star' },
    { id: 'arrow', name: '箭头', icon: 'arrow' },
    { id: 'ring', name: '圆环', icon: 'ring' },
    { id: 'frame', name: '边框', icon: 'frame' },
    { id: 'icon', name: '图标', icon: 'icon' }
  ];

  const ICONS = [
    { id: 'spark', name: '闪光', d: ['M12 2.5v5M12 16.5v5M2.5 12h5M16.5 12h5M5.2 5.2l3.4 3.4M15.4 15.4l3.4 3.4M18.8 5.2l-3.4 3.4M8.6 15.4l-3.4 3.4'] },
    { id: 'star', name: '星星', d: ['M12 3.2l2.7 5.9 6.4.7-4.8 4.3 1.3 6.3-5.6-3.2-5.6 3.2 1.3-6.3L3 9.8l6.3-.7z'] },
    { id: 'heart', name: '心', d: ['M12 20.4S3.6 15 3.6 9.3A4.5 4.5 0 0 1 12 6.8a4.5 4.5 0 0 1 8.4 2.5c0 5.7-8.4 11.1-8.4 11.1z'] },
    { id: 'bolt', name: '闪电', d: ['M13.2 2.5 5 13.4h5.3l-.7 8.1 8.4-11.2h-5.2z'] },
    { id: 'sun', name: '太阳', d: ['M12 6.6a5.4 5.4 0 1 0 0 10.8 5.4 5.4 0 0 0 0-10.8z', 'M12 1.8v2.6M12 19.6v2.6M1.8 12h2.6M19.6 12h2.6M4.8 4.8l1.8 1.8M17.4 17.4l1.8 1.8M19.2 4.8l-1.8 1.8M6.6 17.4l-1.8 1.8'] },
    { id: 'moon', name: '月亮', d: ['M20 14.4A8.4 8.4 0 0 1 9.6 4 8.6 8.6 0 1 0 20 14.4z'] },
    { id: 'leaf', name: '叶子', d: ['M20.4 3.6C10.8 3 4.8 7.2 4.8 14.4c0 3.6 2.4 6 6 6 7.2 0 10.4-6.6 9.6-16.8z', 'M6 18C9 13.2 12.6 9.6 17.4 7.2'] },
    { id: 'flag', name: '旗子', d: ['M6 21V3.6', 'M6 4.2c4.2-2.4 7.8 2.4 12 0v9.6c-4.2 2.4-7.8-2.4-12 0z'] },
    { id: 'cloud', name: '云', d: ['M7.2 18.6h9.6a3.6 3.6 0 0 0 .4-7.2 6 6 0 0 0-11.4 1.8 3 3 0 0 0 1.4 5.4z'] },
    { id: 'play', name: '播放', d: ['M8.4 4.8v14.4L20 12z'] },
    { id: 'check', name: '对勾', d: ['m4.8 12.6 4.8 4.8L19.2 6.6'] },
    { id: 'arrow', name: '箭头', d: ['M4.2 12h15.6', 'm14.4 6.6 5.4 5.4-5.4 5.4'] },
    { id: 'quote', name: '引号', d: ['M9 6.6c-3 1.2-4.8 3.6-4.8 6.6 0 2.4 1.2 4.2 3.6 4.2 1.8 0 3-1.2 3-3s-1.2-3-3-3c-.6 0-1.2 0-1.2.6 0-1.8 1.2-3 3-3.6z', 'M19.2 6.6c-3 1.2-4.8 3.6-4.8 6.6 0 2.4 1.2 4.2 3.6 4.2 1.8 0 3-1.2 3-3s-1.2-3-3-3c-.6 0-1.2 0-1.2.6 0-1.8 1.2-3 3-3.6z'] },
    { id: 'grid', name: '网格', d: ['M4 4h16v16H4z', 'M4 9.3h16M4 14.7h16M9.3 4v16M14.7 4v16'] },
    { id: 'wave', name: '波形', d: ['M2.4 12c2.4-6 4.8-6 7.2 0s4.8 6 7.2 0 4.8-6 7.2 0'] },
    { id: 'circle-dot', name: '靶心', d: ['M12 3.6a8.4 8.4 0 1 0 0 16.8 8.4 8.4 0 0 0 0-16.8z', 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z'] }
  ];

  const OVERLAYS = [
    { id: 'grain', name: '颗粒噪点', max: 100, def: 18, unit: '%' },
    { id: 'vignette', name: '暗角', max: 100, def: 25, unit: '%' },
    { id: 'halftone', name: '半调网点', max: 100, def: 0, unit: '%' },
    { id: 'scan', name: '扫描线', max: 100, def: 0, unit: '%' },
    { id: 'leak', name: '漏光', max: 100, def: 0, unit: '%' },
    { id: 'mesh', name: '光晕渐层', max: 100, def: 0, unit: '%' },
    { id: 'grid', name: '细网格', max: 100, def: 0, unit: '%' }
  ];

  const BLENDS = ['normal', 'multiply', 'screen', 'overlay', 'soft-light', 'hard-light', 'difference', 'exclusion', 'hue', 'color', 'luminosity'];

  const AI_STYLES = [
    { id: 'riso', name: '孔版印刷 / 双色叠印', desc: '两色专色叠加、粗糙网点、错位套印感、纸张噪点' },
    { id: 'flat', name: '扁平矢量 / 编辑插画', desc: '硬边几何色块、无渐变或极少渐变、克制的阴影、编辑杂志感' },
    { id: 'line', name: '单线描 / 线稿', desc: '等粗线条、大量留白、无填充或仅点状填充、噪点纹理' },
    { id: 'iso', name: '等距 3D / 几何体', desc: '30° 轴测网格、立方体堆叠、单侧光照、硬投影' },
    { id: 'bauhaus', name: '包豪斯构成', desc: '圆/三角/矩形基本形、对角构图、原色块面对撞' },
    { id: 'gradient', name: '渐变网格 / 氛围', desc: '多层径向渐变、柔和光晕、噪点颗粒、极简主体剪影' },
    { id: 'blueprint', name: '蓝图 / 技术制图', desc: '单色底、白色细线、标注刻度、网格与尺寸线' },
    { id: 'pixel', name: '像素 / 8bit', desc: '硬像素块、有限色板、抖动渐变、无抗锯齿边' },
    { id: 'paper', name: '剪纸 / 拼贴', desc: '层叠纸片边缘、投影偏移、粗糙裁切边、纸张纹理' },
    { id: 'neon', name: '霓虹 / 赛博', desc: '暗底、发光描边、辉光叠加、扫描线与故障切片' }
  ];

  /* ---------- 图层工厂 ---------- */
  function base(over) {
    return Object.assign(
      {
        id: U.uid(),
        type: 'shape',
        name: '图层',
        x: 0, y: 0, w: 200, h: 200,
        rot: 0, opacity: 1, hidden: false, locked: false,
        blend: 'normal',
        fill: '#35E08A', fill2: '', gradType: 'linear', gradAngle: 135,
        radius: 0, stroke: '', strokeW: 0,
        shadow: { on: false, x: 0, y: 18, blur: 40, color: '#000000', alpha: 0.4 },
        filters: { blur: 0, brightness: 1, contrast: 1, saturate: 1, hue: 0, grayscale: 0, sepia: 0, duotone: false, d1: '#0B0F14', d2: '#F4F7FB' },
        motion: 'none',
        shape: 'rect',
        text: '', font: 'sans', size: 48, weight: 700, color: '#F4F7FB',
        align: 'left', valign: 'top', lineHeight: 1.2, tracking: 0,
        italic: false, upper: false, textFx: 'none',
        src: '', fit: 'cover',
        artHtml: '', duration: 6, fps: 30, aiBrief: '', artSeed: 1
      },
      over || {}
    );
  }

  function mkText(over) {
    return base(Object.assign({ type: 'text', name: '文字', text: '双击编辑文字', size: 64, weight: 700, fill: 'transparent', color: '#F4F7FB' }, over || {}));
  }
  function mkShape(over) {
    return base(Object.assign({ type: 'shape', name: '形状' }, over || {}));
  }
  function mkImage(over) {
    return base(Object.assign({ type: 'image', name: '图片', fill: 'transparent', src: '' }, over || {}));
  }
  function mkAI(over) {
    return base(Object.assign({ type: 'ai', name: 'AI 插画', fill: 'transparent' }, over || {}));
  }

  /* ---------- 布局库 ---------- */
  /* ctx = { w, h, p: palette } */
  const LAYOUTS = [
    {
      id: 'editorial', name: '编辑封面', tag: '杂志', build(ctx) {
        const { w, h, p } = ctx, u = Math.min(w, h * 0.78) / 1080;
        const pad = w * 0.075;
        return [
          mkShape({ name: '底色', x: 0, y: 0, w, h, fill: p.bg }),
          mkShape({ name: '色块', x: w - pad - w * 0.16, y: pad, w: w * 0.16, h: w * 0.16, fill: p.accent, radius: w * 0.08 }),
          mkText({ name: '刊头', x: pad, y: pad * 0.9, w: w * 0.6, h: 40 * u, text: 'ISSUE 01 · 2026', size: 22 * u, weight: 600, tracking: .24, color: p.accent, font: 'mono' }),
          mkText({ name: '主标题', x: pad, y: h * 0.2, w: w - pad * 2, h: h * 0.34, text: '造物\n之间', size: 200 * u, weight: 800, lineHeight: .96, tracking: -.02, color: p.fg }),
          mkShape({ name: '分隔线', x: pad, y: h * 0.605, w: w - pad * 2, h: 2, fill: p.fg, opacity: .35 }),
          mkText({ name: '副标题', x: pad, y: h * 0.635, w: w * 0.62, h: h * 0.13, text: '关于材料、光线与人的九次对话', size: 34 * u, weight: 400, lineHeight: 1.5, color: p.fg, opacity: .82 }),
          mkText({ name: '页脚', x: pad, y: h - pad * 1.5, w: w - pad * 2, h: 30 * u, text: 'PLAQUE STUDIO — 独立出版 · 上海', size: 19 * u, tracking: .12, color: p.fg, opacity: .5, font: 'mono' })
        ];
      }
    },
    {
      id: 'bigtype', name: '巨字宣言', tag: '大字', build(ctx) {
        const { w, h, p } = ctx, u = Math.min(w, h * 0.78) / 1080, pad = w * 0.06;
        return [
          mkShape({ name: '底色', x: 0, y: 0, w, h, fill: p.bg }),
          mkText({ name: '第一行', x: pad, y: h * 0.1, w: w - pad * 1.4, h: h * 0.2, text: 'NEW', size: 260 * u, weight: 800, lineHeight: .9, tracking: -.03, color: p.fg }),
          mkText({ name: '第二行', x: pad, y: h * 0.31, w: w - pad * 1.4, h: h * 0.2, text: 'FORM', size: 260 * u, weight: 800, lineHeight: .9, tracking: -.03, color: p.accent, italic: true }),
          mkText({ name: '第三行', x: pad, y: h * 0.53, w: w - pad * 1.4, h: h * 0.2, text: '2026', size: 260 * u, weight: 800, lineHeight: .9, tracking: -.03, color: p.fg, textFx: 'outline', stroke: p.fg, strokeW: 2 }),
          mkText({ name: '说明', x: pad, y: h * 0.76, w: w * 0.5, h: h * 0.14, text: '一场关于新形态的\n开放式实验', size: 30 * u, lineHeight: 1.6, color: p.fg, opacity: .7 }),
          mkShape({ name: '强调条', x: w - pad - w * 0.06, y: h * 0.76, w: w * 0.06, h: h * 0.16, fill: p.accent }),
          mkText({ name: '日期', x: w - pad - w * 0.32, y: h * 0.86, w: w * 0.32, h: 26 * u, text: '10.24 — 11.30', size: 20 * u, align: 'right', tracking: .14, color: p.fg, opacity: .6, font: 'mono' })
        ];
      }
    },
    {
      id: 'quote', name: '金句卡', tag: '引用', build(ctx) {
        const { w, h, p } = ctx, u = Math.min(w, h * 0.78) / 1080, pad = w * 0.11;
        return [
          mkShape({ name: '底色', x: 0, y: 0, w, h, fill: p.bg }),
          mkText({ name: '引号', x: pad * 0.7, y: h * 0.05, w: w * 0.3, h: h * 0.25, text: '“', size: 300 * u, weight: 700, color: p.accent, opacity: .9, lineHeight: 1 }),
          mkText({ name: '引文', x: pad, y: h * 0.3, w: w - pad * 2, h: h * 0.42, text: '慢下来不是\n浪费时间，\n是让时间有形状。', size: 78 * u, weight: 600, lineHeight: 1.28, tracking: -.01, color: p.fg }),
          mkShape({ name: '短线', x: pad, y: h * 0.76, w: w * 0.09, h: 3, fill: p.accent }),
          mkText({ name: '署名', x: pad, y: h * 0.79, w: w - pad * 2, h: h * 0.06, text: '—— 一位不愿署名的编辑', size: 26 * u, color: p.fg, opacity: .62 }),
          mkText({ name: '角标', x: w - pad - w * 0.3, y: h * 0.9, w: w * 0.3, h: 24 * u, text: 'PLAQUE / NOTES', size: 17 * u, align: 'right', tracking: .16, color: p.fg, opacity: .35, font: 'mono' })
        ];
      }
    },
    {
      id: 'split', name: '对半分割', tag: '版式', build(ctx) {
        const { w, h, p } = ctx, u = Math.min(w, h * 0.78) / 1080;
        return [
          mkShape({ name: '底色', x: 0, y: 0, w, h, fill: p.bg }),
          mkShape({ name: '左色块', x: 0, y: 0, w: w * 0.46, h, fill: p.accent }),
          mkShape({ name: '细线', x: w * 0.46, y: 0, w: 2, h, fill: p.fg, opacity: .12 }),
          mkText({ name: '竖排年', x: w * 0.07, y: h * 0.12, w: w * 0.3, h: h * 0.2, text: '2026', size: 92 * u, weight: 800, color: p.bg, opacity: .85, font: 'display' }),
          mkText({ name: '左说明', x: w * 0.07, y: h * 0.75, w: w * 0.32, h: h * 0.16, text: 'VOL. 03\nSILENT\nOBJECTS', size: 22 * u, lineHeight: 1.7, tracking: .1, color: p.bg, opacity: .8, font: 'mono' }),
          mkText({ name: '标题', x: w * 0.54, y: h * 0.18, w: w * 0.38, h: h * 0.3, text: '安静\n的\n物件', size: 108 * u, weight: 700, lineHeight: 1.1, color: p.fg }),
          mkText({ name: '正文', x: w * 0.54, y: h * 0.56, w: w * 0.36, h: h * 0.24, text: '把日常的东西重新看一遍，\n它们会讲出另一种故事。\n展览将持续到十一月末。', size: 25 * u, lineHeight: 1.8, color: p.fg, opacity: .72 }),
          mkShape({ name: '按钮底', x: w * 0.54, y: h * 0.84, w: w * 0.22, h: h * 0.05, fill: 'transparent', stroke: p.fg, strokeW: 1.5, radius: 999 })
        ];
      }
    },
    {
      id: 'event', name: '活动海报', tag: '活动', build(ctx) {
        const { w, h, p } = ctx, u = Math.min(w, h * 0.78) / 1080, pad = w * 0.08;
        return [
          mkShape({ name: '底色', x: 0, y: 0, w, h, fill: p.bg, fill2: p.extra, gradAngle: 160 }),
          mkText({ name: '月份', x: pad, y: h * 0.08, w: w * 0.4, h: 40 * u, text: 'OCTOBER', size: 26 * u, tracking: .3, color: p.accent, font: 'mono' }),
          mkText({ name: '日期', x: pad * 0.82, y: h * 0.12, w: w * 0.55, h: h * 0.3, text: '24', size: 330 * u, weight: 800, lineHeight: .82, tracking: -.04, color: p.fg }),
          mkText({ name: '星期', x: w - pad, y: h * 0.18, w: w * 0.28, h: 40 * u, text: 'SAT\n20:00', size: 24 * u, align: 'right', lineHeight: 1.6, tracking: .12, color: p.fg, opacity: .7, font: 'mono' }),
          mkText({ name: '活动名', x: pad, y: h * 0.47, w: w - pad * 2, h: h * 0.18, text: '深夜电子\n声场计划', size: 96 * u, weight: 800, lineHeight: 1.14, color: p.fg }),
          mkShape({ name: '虚线', x: pad, y: h * 0.665, w: w - pad * 2, h: 2, fill: p.fg, opacity: .35 }),
          mkText({ name: '信息', x: pad, y: h * 0.7, w: w * 0.62, h: h * 0.16, text: '阵容  /  AOKI · NIGHTFORM · 陈默\n场地  /  西岸艺术中心 B 馆', size: 22 * u, lineHeight: 1.9, color: p.fg, opacity: .72 }),
          mkText({ name: '票号', x: w - pad - w * 0.3, y: h * 0.7, w: w * 0.3, h: 30 * u, text: '#PLQ-2026', size: 20 * u, align: 'right', tracking: .1, color: p.accent, font: 'mono' }),
          mkShape({ name: '底条', x: 0, y: h * 0.9, w, h: h * 0.1, fill: p.accent }),
          mkText({ name: '底条字', x: pad, y: h * 0.925, w: w - pad * 2, h: h * 0.05, text: 'TICKETS  ·  PLAQUE.LIVE', size: 20 * u, tracking: .22, color: p.bg, font: 'mono' })
        ];
      }
    },
    {
      id: 'product', name: '新品发布', tag: '产品', build(ctx) {
        const { w, h, p } = ctx, u = Math.min(w, h * 0.78) / 1080;
        return [
          mkShape({ name: '底色', x: 0, y: 0, w, h, fill: p.bg }),
          mkShape({ name: '光晕', x: -w * 0.1, y: h * 0.18, w: w * 1.2, h: w * 0.9, shape: 'ellipse', fill: p.accent, opacity: .1, filters: { blur: 60 } }),
          mkShape({ name: '圆盘', x: w * 0.5 - w * 0.24, y: h * 0.36, w: w * 0.48, h: w * 0.48, shape: 'ellipse', fill: p.extra, stroke: p.fg, strokeW: 1, opacity: .95 }),
          mkText({ name: '顶标', x: 0, y: h * 0.09, w, h: 30 * u, text: 'INTRODUCING', align: 'center', size: 22 * u, tracking: .34, color: p.accent, font: 'mono' }),
          mkText({ name: '标题', x: w * 0.1, y: h * 0.13, w: w * 0.8, h: h * 0.14, text: '轻盈的重量', align: 'center', size: 74 * u, weight: 700, color: p.fg }),
          mkText({ name: '副标', x: w * 0.15, y: h * 0.83, w: w * 0.7, h: h * 0.12, text: '全新一代手工吹制玻璃器具\n限量 120 件', align: 'center', size: 24 * u, lineHeight: 1.7, color: p.fg, opacity: .65 }),
          mkText({ name: '底注', x: 0, y: h * 0.93, w, h: 22 * u, text: 'EDITION 01 / 120', align: 'center', size: 17 * u, tracking: .2, color: p.fg, opacity: .38, font: 'mono' })
        ];
      }
    },
    {
      id: 'manifesto', name: '宣言清单', tag: '清单', build(ctx) {
        const { w, h, p } = ctx, u = Math.min(w, h * 0.78) / 1080, pad = w * 0.09;
        const items = ['先做，再想做得更好', '把限制当作材料', '留白也是内容', '作品自己会说话'];
        const out = [
          mkShape({ name: '底色', x: 0, y: 0, w, h, fill: p.bg }),
          mkText({ name: '眉题', x: pad, y: h * 0.08, w: w * 0.5, h: 30 * u, text: 'MANIFESTO / 04', size: 20 * u, tracking: .22, color: p.accent, font: 'mono' }),
          mkText({ name: '标题', x: pad, y: h * 0.13, w: w - pad * 2, h: h * 0.16, text: '我们的四条\n工作原则', size: 76 * u, weight: 700, lineHeight: 1.2, color: p.fg })
        ];
        items.forEach((t, i) => {
          const y = h * (0.37 + i * 0.13);
          out.push(mkShape({ name: '线' + i, x: pad, y, w: w - pad * 2, h: 1, fill: p.fg, opacity: .22 }));
          out.push(mkText({ name: '编号' + i, x: pad, y: y + h * 0.018, w: w * 0.12, h: 40 * u, text: '0' + (i + 1), size: 26 * u, color: p.accent, font: 'mono', weight: 500 }));
          out.push(mkText({ name: '条目' + i, x: pad + w * 0.14, y: y + h * 0.012, w: w - pad * 2 - w * 0.16, h: 60 * u, text: t, size: 36 * u, weight: 500, color: p.fg }));
        });
        out.push(mkText({ name: '页脚', x: pad, y: h - h * 0.08, w: w - pad * 2, h: 24 * u, text: 'PLAQUE STUDIO · 2026', size: 18 * u, tracking: .16, color: p.fg, opacity: .38, font: 'mono' }));
        return out;
      }
    },
    {
      id: 'framed', name: '极简框式', tag: '极简', build(ctx) {
        const { w, h, p } = ctx, u = Math.min(w, h * 0.78) / 1080, m = w * 0.07;
        return [
          mkShape({ name: '底色', x: 0, y: 0, w, h, fill: p.bg }),
          mkShape({ name: '外框', x: m, y: m, w: w - m * 2, h: h - m * 2, fill: 'transparent', stroke: p.fg, strokeW: 2, opacity: .55 }),
          mkShape({ name: '内框', x: m * 1.18, y: m * 1.18, w: w - m * 2.36, h: h - m * 2.36, fill: 'transparent', stroke: p.accent, strokeW: 1, opacity: .5 }),
          mkText({ name: '上标', x: 0, y: h * 0.2, w, h: 26 * u, text: 'E X H I B I T I O N', align: 'center', size: 18 * u, tracking: .28, color: p.accent, font: 'mono' }),
          mkText({ name: '标题', x: w * 0.12, y: h * 0.4, w: w * 0.76, h: h * 0.2, text: '静默之后', align: 'center', size: 116 * u, weight: 500, font: 'serif', color: p.fg, tracking: .04 }),
          mkShape({ name: '中线', x: w * 0.42, y: h * 0.62, w: w * 0.16, h: 1, fill: p.fg, opacity: .5 }),
          mkText({ name: '下标', x: 0, y: h * 0.66, w, h: h * 0.1, text: '2026.11.02 — 12.20\n西岸美术馆 3 号厅', align: 'center', size: 22 * u, lineHeight: 1.9, color: p.fg, opacity: .62 })
        ];
      }
    },
    {
      id: 'brutal', name: '粗野堆叠', tag: '风格', build(ctx) {
        const { w, h, p } = ctx, u = Math.min(w, h * 0.78) / 1080;
        return [
          mkShape({ name: '底色', x: 0, y: 0, w, h, fill: p.bg }),
          mkShape({ name: '块1', x: 0, y: h * 0.12, w: w, h: h * 0.16, fill: p.accent }),
          mkShape({ name: '块2', x: w * 0.55, y: h * 0.55, w: w * 0.5, h: h * 0.26, fill: p.extra }),
          mkText({ name: '标题A', x: w * 0.03, y: h * 0.06, w: w * 0.94, h: h * 0.14, text: 'MAKE', size: 170 * u, weight: 800, color: p.fg, lineHeight: 1, tracking: -.04 }),
          mkText({ name: '标题B', x: w * 0.03, y: h * 0.19, w: w * 0.94, h: h * 0.14, text: 'IT LOUD', size: 170 * u, weight: 800, color: p.bg, lineHeight: 1, tracking: -.04, italic: true }),
          mkText({ name: '正文', x: w * 0.05, y: h * 0.4, w: w * 0.55, h: h * 0.2, text: '别做安静的\n设计。让版面\n撞出声音。', size: 46 * u, weight: 700, lineHeight: 1.28, color: p.fg }),
          mkText({ name: '编号', x: w * 0.6, y: h * 0.58, w: w * 0.36, h: h * 0.1, text: 'NO.07', size: 62 * u, weight: 800, color: p.fg, align: 'right', font: 'display' }),
          mkText({ name: '脚注', x: w * 0.05, y: h * 0.87, w: w * 0.9, h: 26 * u, text: 'PLAQUE POSTER SERIES — 2026', size: 18 * u, tracking: .18, color: p.fg, opacity: .45, font: 'mono' })
        ];
      }
    },
    {
      id: 'grid3', name: '图片拼贴', tag: '图片', build(ctx) {
        const { w, h, p } = ctx, u = Math.min(w, h * 0.78) / 1080, g = w * 0.03;
        const cw = (w - g * 4) / 3;
        const ph = (x, y, ww, hh, i) =>
          mkShape({ name: '图片位' + i, x, y, w: ww, h: hh, fill: p.extra, fill2: U.mix(p.extra, p.accent, .35), shape: 'rect', radius: 4, stroke: p.fg, strokeW: 0 });
        return [
          mkShape({ name: '底色', x: 0, y: 0, w, h, fill: p.bg }),
          ph(g, h * 0.1, cw, cw * 1.3, 1),
          ph(g * 2 + cw, h * 0.06, cw, cw * 1.3, 2),
          ph(g * 3 + cw * 2, h * 0.13, cw, cw * 1.3, 3),
          mkText({ name: '标题', x: g, y: h * 0.58, w: w - g * 2, h: h * 0.16, text: '三次凝视', size: 118 * u, weight: 700, color: p.fg, tracking: -.02 }),
          mkText({ name: '说明', x: g, y: h * 0.74, w: w * 0.55, h: h * 0.12, text: '影像联展 · 六位摄影师的日常切片', size: 26 * u, lineHeight: 1.7, color: p.fg, opacity: .68 }),
          mkShape({ name: '线', x: g, y: h * 0.86, w: w - g * 2, h: 1, fill: p.fg, opacity: .25 }),
          mkText({ name: '信息', x: g, y: h * 0.885, w: w - g * 2, h: 24 * u, text: '11.08 — 12.01   ·   免费入场   ·   10:00–18:00', size: 18 * u, tracking: .06, color: p.fg, opacity: .5, font: 'mono' })
        ];
      }
    },
    {
      id: 'gradient', name: '渐变大字', tag: '渐变', build(ctx) {
        const { w, h, p } = ctx, u = Math.min(w, h * 0.78) / 1080, pad = w * 0.07;
        return [
          mkShape({ name: '底色', x: 0, y: 0, w, h, fill: p.bg }),
          mkShape({ name: '渐层', x: -w * 0.2, y: -h * 0.1, w: w * 1.4, h: h * 1.2, fill: p.accent, fill2: p.extra, gradAngle: 30, opacity: .18, filters: { blur: 80 } }),
          mkText({ name: '小字', x: pad, y: h * 0.14, w: w * 0.6, h: 28 * u, text: 'A STUDY IN LIGHT', size: 19 * u, tracking: .3, color: p.accent, font: 'mono' }),
          mkText({ name: '大字', x: pad, y: h * 0.22, w: w - pad * 1.4, h: h * 0.42, text: '光线\n的形状', size: 168 * u, weight: 800, lineHeight: 1.02, tracking: -.03, fill: 'transparent', textFx: 'gradient', color: p.fg }),
          mkText({ name: '副文', x: pad, y: h * 0.68, w: w * 0.5, h: h * 0.16, text: '当光穿过玻璃、水面与雾，\n它开始有了可以被描述的轮廓。', size: 25 * u, lineHeight: 1.8, color: p.fg, opacity: .72 }),
          mkText({ name: '角注', x: w - pad - w * 0.3, y: h * 0.88, w: w * 0.3, h: 24 * u, text: 'PLAQUE / 2026', size: 17 * u, align: 'right', tracking: .16, color: p.fg, opacity: .4, font: 'mono' })
        ];
      }
    },
    {
      id: 'ticket', name: '票券风', tag: '活动', build(ctx) {
        const { w, h, p } = ctx, u = Math.min(w, h * 0.78) / 1080;
        return [
          mkShape({ name: '底色', x: 0, y: 0, w, h, fill: p.extra }),
          mkShape({ name: '票身', x: w * 0.07, y: h * 0.14, w: w * 0.86, h: h * 0.72, fill: p.bg, radius: 18 }),
          mkText({ name: '票头', x: w * 0.12, y: h * 0.19, w: w * 0.5, h: 26 * u, text: 'ADMIT ONE', size: 20 * u, tracking: .3, color: p.accent, font: 'mono' }),
          mkText({ name: '主标题', x: w * 0.12, y: h * 0.24, w: w * 0.76, h: h * 0.2, text: '夜行\n博物馆', size: 96 * u, weight: 800, lineHeight: 1.12, color: p.fg }),
          mkText({ name: '副题', x: w * 0.12, y: h * 0.46, w: w * 0.6, h: h * 0.06, text: '仅限当晚 · 需携带手电', size: 24 * u, color: p.fg, opacity: .6 }),
          mkShape({ name: '虚线', x: w * 0.12, y: h * 0.56, w: w * 0.76, h: 2, fill: p.fg, opacity: .3 }),
          mkText({ name: '信息', x: w * 0.12, y: h * 0.6, w: w * 0.44, h: h * 0.14, text: '2026.10.31\n19:00 — 23:00', size: 24 * u, lineHeight: 1.9, color: p.fg, opacity: .8 }),
          mkText({ name: '座位', x: w * 0.58, y: h * 0.6, w: w * 0.3, h: h * 0.14, text: 'SEAT\nB-07', size: 24 * u, lineHeight: 1.9, color: p.accent, align: 'right', font: 'mono' }),
          mkShape({ name: '条码1', x: w * 0.12, y: h * 0.76, w: w * 0.5, h: h * 0.05, fill: p.fg, opacity: .9 }),
          mkText({ name: '编号', x: w * 0.65, y: h * 0.765, w: w * 0.23, h: 30 * u, text: '0007 2026', size: 20 * u, align: 'right', tracking: .1, color: p.fg, opacity: .55, font: 'mono' })
        ];
      }
    },
    {
      id: 'magazine', name: '双栏杂志', tag: '排版', build(ctx) {
        const { w, h, p } = ctx, u = Math.min(w, h * 0.78) / 1080, pad = w * 0.075, colW = (w - pad * 2 - w * 0.04) / 2;
        const body = '把一件东西放在桌上，\n退后三步，它的轮廓会\n开始变得陌生。我们习\n惯了功能，却忘了形状\n本身的语言。\n\n本期我们拜访了六位\n手艺人，他们没有说\n太多，只是让我们摸\n了摸那些还没上釉的\n陶土。';
        return [
          mkShape({ name: '底色', x: 0, y: 0, w, h, fill: p.bg }),
          mkText({ name: '刊头', x: pad, y: h * 0.05, w: w * 0.6, h: 34 * u, text: 'PLAQUE', size: 26 * u, weight: 800, tracking: .1, color: p.fg, font: 'display' }),
          mkShape({ name: '刊头线', x: pad, y: h * 0.095, w: w - pad * 2, h: 3, fill: p.fg }),
          mkText({ name: '文章标题', x: pad, y: h * 0.12, w: w - pad * 2, h: h * 0.14, text: '手的记忆', size: 92 * u, weight: 700, font: 'serif', color: p.fg }),
          mkText({ name: '导语', x: pad, y: h * 0.27, w: w - pad * 2, h: h * 0.1, text: '关于陶土、体温与那些没有被命名的形状', size: 28 * u, color: p.accent, font: 'serif', italic: true }),
          mkShape({ name: '图片位', x: pad, y: h * 0.37, w: w - pad * 2, h: h * 0.24, fill: p.extra, fill2: U.mix(p.extra, p.accent, .4), gradAngle: 120 }),
          mkText({ name: '图注', x: pad, y: h * 0.615, w: w - pad * 2, h: 24 * u, text: 'FIG.1 — 未上釉的器皿，景德镇，2026', size: 16 * u, color: p.fg, opacity: .45, font: 'mono' }),
          mkText({ name: '栏一', x: pad, y: h * 0.67, w: colW, h: h * 0.26, text: body, size: 19 * u, lineHeight: 1.95, color: p.fg, opacity: .78 }),
          mkText({ name: '栏二', x: pad + colW + w * 0.04, y: h * 0.67, w: colW, h: h * 0.26, text: '我们问他为什么不做\n更圆的东西。他说，\n圆是结果，手是过程。\n\n过程里所有犹豫的\n地方，最后都会留在\n器物上，成为它唯一\n的指纹。', size: 19 * u, lineHeight: 1.95, color: p.fg, opacity: .78 })
        ];
      }
    },
    {
      id: 'social', name: '短句封面', tag: '社媒', build(ctx) {
        const { w, h, p } = ctx, u = Math.min(w, h * 0.78) / 1080, pad = w * 0.085;
        return [
          mkShape({ name: '底色', x: 0, y: 0, w, h, fill: p.bg }),
          mkShape({ name: '高亮块', x: pad * 0.7, y: h * 0.475, w: w * 0.62, h: h * 0.098, fill: p.accent, opacity: .95 }),
          mkText({ name: '行1', x: pad, y: h * 0.28, w: w - pad * 2, h: h * 0.14, text: '如果你也', size: 108 * u, weight: 800, lineHeight: 1.2, color: p.fg }),
          mkText({ name: '行2', x: pad, y: h * 0.42, w: w - pad * 2, h: h * 0.14, text: '讨厌开会', size: 108 * u, weight: 800, lineHeight: 1.2, color: p.bg }),
          mkText({ name: '行3', x: pad, y: h * 0.56, w: w - pad * 2, h: h * 0.14, text: '看这一页', size: 108 * u, weight: 800, lineHeight: 1.2, color: p.fg }),
          mkText({ name: '解释', x: pad, y: h * 0.74, w: w * 0.72, h: h * 0.12, text: '六个可以立刻用上的\n异步协作小技巧', size: 30 * u, lineHeight: 1.65, color: p.fg, opacity: .7 }),
          mkShape({ name: '角标底', x: pad, y: h * 0.885, w: w * 0.3, h: h * 0.045, fill: p.accent, radius: 999 }),
          mkText({ name: '角标字', x: pad, y: h * 0.893, w: w * 0.3, h: h * 0.03, text: 'SAVE THIS', align: 'center', size: 18 * u, tracking: .14, color: p.bg, font: 'mono', weight: 600 })
        ];
      }
    }
  ];

  const DATA = { FRAMES, PALETTES, FONTS, TEXT_PRESETS, TEXT_FX, FILTER_PRESETS, MOTIONS, SHAPES, ICONS, OVERLAYS, BLENDS, AI_STYLES, LAYOUTS, mkText, mkShape, mkImage, mkAI, base };

  DATA.fontStack = function (id) {
    const f = FONTS.find((x) => x.id === id) || FONTS[0];
    return f.stack;
  };
  DATA.frameById = function (id) { return FRAMES.find((f) => f.id === id) || FRAMES[0]; };
  DATA.palById = function (id) { return PALETTES.find((p) => p.id === id) || PALETTES[0]; };

  window.DATA = DATA;
})();

