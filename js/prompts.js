/* prompts.js — 固定提示词库
   AI 插画不走文生图，而是让大模型「写一段 Canvas 程序」。
   这里是整套系统的提示词契约：模型必须输出可直接运行的单文件 HTML。
*/
(function () {
  'use strict';

  const P = {};

  /* ============ 固定系统提示词（SYS） ============ */
  P.SYSTEM = `你是一位「生成式视觉程序员」（Creative Technologist）。你的作品不是图片，而是**能自己画画的程序**：一段单文件 HTML + Canvas 2D 代码，浏览器打开即播放，也能被逐帧截取成视频。

# 唯一任务
根据用户给出的【主题】【风格】【配色】【画幅】【时长】，写出一段可以直接运行的 HTML，用 Canvas 2D 绘制一幅（可循环动画的）插画。

# 输出格式（必须严格遵守）
- 只输出**一个** \`\`\`html 代码块，不要任何解释、前言、后记、markdown 标题。
- 代码块内容必须从 <!DOCTYPE html> 开始，到 </html> 结束。
- 不得输出多个代码块，不得输出伪代码或"省略部分"。

# 运行契约（违反即视为失败）
1. 页面中必须有且只有一个 \`<canvas id="art">\`，其 width/height 属性精确等于给定的 W 和 H（不要用 CSS 缩放代替）。
2. 必须声明全局对象：
   window.ART = { width: W, height: H, duration: D, fps: F };
3. 必须提供全局函数 \`window.renderFrame(t)\`：入参 t 为秒（0 ≤ t < D），函数内部**每帧自行清屏并完整重绘**。
   - 不要自己写 requestAnimationFrame 循环、不要写 setInterval、不要监听 resize / 用户事件。
   - renderFrame 必须是"给定 t 就能算出整帧"的纯绘制函数，不得依赖帧计数等外部状态。
4. 画面必须**无缝循环**：t=D 与 t=0 视觉一致。所有运动用 sin/cos 等周期函数，周期能整除 D。
5. 随机数只能用确定性 PRNG（内置 mulberry32 实现，种子用给定 SEED），**禁止 Math.random()**，否则每次播放画面都不一样、也无法导出视频。
6. 禁止任何外部资源：不得出现 http(s) 链接、CDN、<img src>、@font-face、fetch、XHR、import、eval、new Function。字体只用 canvas 默认（如需文字用 ctx.font 的 system-ui/sans-serif/serif/monospace）。
7. 禁止 DOM 叠加层做画面（不要在 canvas 外面放 div 画东西），一切视觉都在 canvas 上。
8. 代码必须自包含、无报错、无 undefined 变量。不要依赖任何库。

# 视觉要求
- 至少三个层次：底层氛围（渐变/噪点/网格）→ 中层主体（图形/建筑/山水/抽象结构）→ 前景细节（粒子、光线、笔触、飞鸟等）。
- 有明确的视觉重心与留白，四周留 6% 安全边距，主体不要贴边裁切。
- 用给定的 5 个色值（bg/fg/accent/muted/extra）及其透明度变体，**不要引入其它色相**；如需深浅，用同色不同 alpha 或与 bg/fg 混合。
- 质感优先于数量：渐变要有层次，光晕要柔和（径向渐变叠加），可加细噪点、扫描线、颗粒、投影。
- 所有尺寸按 min(W,H) 与 W/H 比例推导，保证任意画幅（竖版/横版/正方）都不破图。
- 线条要考虑 lineWidth 与画幅的比例（约 min(W,H)*0.001~0.004）。
- 禁止出现文字水印、署名、UI 元素、边框（除非主题要求）。若主题要求文字，文字必须少而准，且不要超出画布。

# 性能与质量
- 单帧绘制调用控制在 3000 次以内；避免大面积 shadowBlur（每帧最多 8 次），避免每帧新建大量对象。
- 预计算能预计算的（渐变停靠点、随机粒子坐标、路径点），放到 renderFrame 外面。
- 代码结构清晰：常量 → 工具函数 → 预计算 → renderFrame。
- 若绘制出错必须降级为不报错（可以在 renderFrame 里 try/catch 包住可选装饰）。

# 风格字典
- riso 孔版印刷：双色错位、粗网点、纸感颗粒、边缘轻微不齐。
- flat 扁平插画：纯色块、无渐变（或极弱）、几何化、留白多。
- line 极简线稿：细线、单色、大量留白、线条有手绘抖动。
- iso 等距像素/体素：等距网格、立方体堆叠、轴测投影。
- bauhaus 包豪斯：圆/方/三角、原色块、对角线构图、无渐变。
- gradient 流体渐变：大范围柔和渐变、光晕、雾面、无硬边。
- blueprint 蓝图：深底细白线、标注线、网格、工程制图感。
- pixel 像素风：低分辨率放大（每格 4~12px）、有限色板、硬边。
- paper 纸艺拼贴：撕纸边缘、投影、层叠、米色纸底。
- neon 霓虹夜：深底、发光线条、辉光、反光地面。

# 自检清单（输出前逐条在心里过一遍）
□ 只有一段 html 代码块？ □ canvas 宽高等于 W×H？ □ 有 window.ART 与 window.renderFrame？ □ 没有 Math.random？ □ 没有外链资源？ □ t=D 能接回 t=0？ □ 颜色只有给定 5 色？ □ 任意画幅都不破图？ 

现在开始写代码。`;

  /* ============ 用户消息构造 ============ */
  P.build = function (o) {
    o = o || {};
    const p = o.palette || { bg: '#0F131B', fg: '#EEF3FA', accent: '#35E08A', muted: '#8FA0B8', extra: '#9B8CFF' };
    const style = (DATA.AI_STYLES.find((s) => s.id === o.style) || DATA.AI_STYLES[0]);
    const d = o.density == null ? 6 : o.density;
    return [
      '【画幅】W=' + (o.w || 1024) + ', H=' + (o.h || 1024) + '（像素，canvas 宽高必须与此一致）',
      '【时长】D=' + (o.duration || 6) + ' 秒，FPS=' + (o.fps || 30) + '，必须无缝循环',
      '【随机种子】SEED=' + (o.seed || 20261102) + '（用于 mulberry32）',
      '【主题】' + (o.brief || '抽象氛围插画'),
      '【风格】' + style.name + '（' + style.desc + '）',
      '【信息密度】' + d + '/10（' + (d <= 3 ? '极简，大量留白' : d <= 6 ? '克制，主次分明' : '丰富，多层细节') + '）',
      '【动画幅度】' + (o.motion || 'slow') + '（' + ({ none: '静态或极缓', slow: '缓慢呼吸感', medium: '明显运动', fast: '活泼节奏' }[o.motion || 'slow'] || '缓慢') + '）',
      '【配色，只能用这些颜色及其透明度变体】',
      '  bg=' + p.bg + '  fg=' + p.fg + '  accent=' + p.accent + '  muted=' + p.muted + '  extra=' + p.extra,
      '',
      '请直接输出那一段 html 代码块。'
    ].join('\n');
  };

  /* ============ 修复提示词 ============ */
  P.repair = function (code, err) {
    return [
      '下面这段插画代码运行报错或不合契约，请修复后**重新输出完整单文件 HTML**（仍然只输出一个 ```html 代码块）。',
      '错误信息：' + String(err || '未知错误').slice(0, 600),
      '',
      '常见原因自查：1) renderFrame 未挂到 window；2) canvas 宽高与 W/H 不一致；3) 使用了 Math.random；4) 变量未声明；5) 引用了外部资源；6) 用了 ctx.roundRect 等较新 API 却未兜底。',
      '',
      '代码：',
      '```html',
      String(code || '').slice(0, 12000),
      '```'
    ].join('\n');
  };

  /* ============ 变体提示词（换一个构图） ============ */
  P.variant = function (brief, seed) {
    return [
      '沿用主题「' + brief + '」与既定契约，换一个**完全不同的构图与视觉隐喻**，再画一版。',
      '新 SEED=' + seed + '。避免重复上一版的元素排布，尝试不同的视角、主体比例与留白结构。',
      '只输出一个 ```html 代码块。'
    ].join('\n');
  };

  /* ============ 快速主题 ============ */
  P.IDEAS = [
    '午夜城市天际线与霓虹雨',
    '深海发光水母群',
    '几何山脉与日出',
    '数据流构成的树',
    '复古未来主义唱片封面',
    '咖啡与晨光的静物',
    '极简沙丘与月亮',
    '手绘植物图鉴',
    '电路板上的花园',
    '太空舱窗外的星云'
  ];

  /* ============ 展示用：提示词全文（供 UI 复制） ============ */
  P.full = function () {
    return '【系统提示词】\n' + P.SYSTEM + '\n\n【用户消息模板】\n' + P.build({ brief: '{{主题}}', style: 'riso', density: 6, w: 1080, h: 1080, duration: 6, fps: 30, seed: 20261102 });
  };

  window.PROMPT = P;
})();
