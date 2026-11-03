# Plaque 海报工坊 · Poster Studio

一个**傻瓜式可视化海报编辑器**（参考 Canva 可画 / Lunacy 的交互模型），纯前端、零依赖、零构建：

- 双击 `index.html` 就能用（`file://` 直接可跑，无需服务器、无需 npm install）。
- 输出四种形态：**单页照片（PNG/JPG 2×）**、**单文件网页（动效保留）**、**WebM 视频**、**工程 JSON**。
- 内置 **AI 编程插画引擎**：插画不是文生图，而是让大模型**直接写 Canvas 2D 代码**。
  产物是一段自包含 HTML，所以它既是一张插画，也是一段可以录成视频的动画。

仓库：<https://github.com/kaixuanjun/plaque-studio>
在线版：在仓库 `Settings → Pages` 选择 `main` 分支 `/ (root)` 保存即可得到 `https://kaixuanjun.github.io/plaque-studio/`（站点入口就是根目录的 `index.html`，无需构建）。

```
index.html            入口（双击打开）
css/app.css           编辑器外观
js/util.js            工具函数
js/data.js            画板 / 配色 / 字体 / 形状 / 图标 / 叠加 / 滤镜 / 动效 / 14 套布局
js/store.js           文档状态、图层操作、撤销栈、本地自动保存
js/render.js          海报 DOM 渲染 + AI 插画 iframe 注入 + 预览动画
js/localart.js        本地算法插画（6 种，无需 API Key）
js/prompts.js         固定提示词（插画代码契约）
js/ai.js              大模型接入（OpenAI 兼容 / 流式 / 自检 / 自动修复重试）
js/editor.js          舞台缩放、拖拽、缩放、旋转、吸附、框选、双击改字
js/panels.js          七个素材面板 + 右侧属性栏 + 四个弹窗
js/exporter.js        PNG / JPG / 网页 / 视频 / JSON
js/app.js             启动、快捷键、顶栏、公共 API（window.Plaque）
samples/              示例产物（一张 2× PNG，一个单文件网页）
```

## 1. 三分钟上手

1. 双击 `index.html`。
2. 左侧 **模板** 面板挑一个版式 → 上方 **配色方案** 换一套颜色。
3. 双击画布上的文字直接改；拖动移动；拖角柄缩放；顶部圆柄旋转；按住 `Alt` 拖动复制。
4. 右侧属性栏改字号、字重、行高、字距、对齐、文字特效、渐变/描边、阴影、混合模式、动效。
5. 右上 **导出** → 选 PNG / JPG / 网页 / 视频 / 工程。

画板尺寸：小红书 3:4、方形 1:1、竖版 9:16、朋友圈 4:5、海报 2:3、A4、A5、Banner 16:9、公众号首图、桌面壁纸、名片、电商主图（12 种）。

## 2. AI 插画（核心）

### 2.1 它到底在做什么

不是「一句话生成一张图」，而是：

```
你的描述 + 固定提示词 + 画幅/时长/随机种子/五色板
        → 大模型写出一段 HTML（Canvas 2D 绘制代码）
        → 静态自检（有无 canvas#art / renderFrame / 是否用了 Math.random / 外链）
        → 通过则注入 iframe 播放，不通过则带上报错自动修复重试一次
```

所以同一段代码**既是插画页，也是动画**：`renderFrame(t)` 用时间驱动，`t` 从 0 走到 `duration` 再回卷，因此可以无损录成视频，也能在导出的网页里一直动。

### 2.2 两种产出方式

| 方式 | 需要 API Key | 说明 |
| --- | --- | --- |
| **本地算法插画** | 不需要 | 内置 6 个程序化模板：流形渐变、山脊日落、拓扑等高线、粒子星环、包豪斯拱门、等距网格城。点击即插入，天然带动画。 |
| **大模型生成** | 需要 | 任意 OpenAI 兼容接口（OpenAI / DeepSeek / Moonshot / 智谱 / 通义 / 本地 Ollama）。 |

### 2.3 配置接口

右上角 **齿轮** → 填 Base URL、Key、模型名、温度、是否流式 → **测试连接** → 保存（存在 localStorage `plaque.ai`）。

预设：OpenAI（`https://api.openai.com/v1` · `gpt-4.1-mini`）、DeepSeek（`https://api.deepseek.com/v1` · `deepseek-chat`）、Moonshot、智谱 GLM、通义 Qwen、Ollama 本地（`http://localhost:11434/v1`）。

也可以代码里配：

```js
Plaque.ai.cfg({ base: 'https://api.deepseek.com/v1', key: 'sk-xxx', model: 'deepseek-chat', stream: true });
```

### 2.4 固定提示词（插画契约）

提示词在 `js/prompts.js` 的 `PROMPT.SYSTEM`，AI 面板底部可完整查看并一键下载成 `.md`。核心是这段**运行契约**：

```js
// 模型必须只产出一个 ```html 代码块，里面必须满足：
<canvas id="art" width="W" height="H"></canvas>
window.ART = { width: W, height: H, duration: 6, fps: 30 }
window.renderFrame = function (t) { /* 每帧自清屏、自绘，t 秒；不得自带 rAF/事件 */ }
// 只用给定的 SEED 派生随机数（mulberry32），禁止 Math.random
// 禁止外链字体/图片/fetch/eval，禁止 DOM 叠层，代码自包含
```

视觉侧要求：三层结构（底/中/点缀）、留 6% 安全边距、只用给定 5 色、至少一处渐变或光晕、尺寸全部按 `min(W,H)` 推导、单帧绘制调用 < 3000、`shadowBlur ≤ 8`。

因为契约稳定，**换任何模型都能出片**；模型写错时，`ai.js` 会把报错拼进修复提示再要一次。

## 3. 效果与布局

- **文字特效**：实心 / 渐变 / 描边空心 / 霓虹 / 贴纸 / 压印（另有 7 个文字预设：巨型标题、主标题、副标题、正文、小标签、宋体标题、等宽注记）。
- **画面颗粒**：颗粒噪点、暗角、半调网点、扫描线、漏光、光晕渐层、细网格（都是实时叠加层，可调强度）。
- **图层效果**：模糊、亮度、对比度、饱和、色相、灰度、棕褐、双色调 + 9 组一键滤镜预设；阴影；11 种混合模式；7 种动效（漂浮、呼吸、缓推、上浮、流光、漂移）。
- **14 套布局**：编辑封面、巨字宣言、金句卡、对半分割、活动海报、新品发布、宣言清单、极简框式、粗野堆叠、图片拼贴、渐变大字、票券风、双栏杂志、短句封面。点一下就换整套版式（会替换图层，可撤销）。
- **元素**：9 种形状（矩形/圆/线/三角/星/箭头/圆环/边框/图标）+ 16 个内置线性图标（含噪点图标，配合噪点滤镜可做撕纸边）。
- **图片**：拖入即用，cover/contain 裁切，可加双色调。

## 4. 导出

| 目标 | 说明 |
| --- | --- |
| PNG / JPG | 默认 2× 超采样，用于印刷或高清发布；由 Canvas 逐层重绘（与预览像素一致）。 |
| 网页 | 单个 `.html` 文件，内联全部样式与插画 iframe，自适应窗口，**动效保留**。可直接丢到任意静态托管。 |
| 视频 | `MediaRecorder` 逐帧录制，输出 WebM（优先 VP9）；时长自动取插画时长。 |
| 工程 | `.json`，可再次导入继续编辑（含 AI 插画代码）。 |

示例产物见 `samples/plaque-demo@2x.png`（2160×2880）与 `samples/plaque-demo.html`（52KB，双击即播）。

## 5. 公共 API（`window.Plaque`）

```js
Plaque.ready()                            // 是否已配置可用的大模型接口
Plaque.doc                                // 当前文档对象（图层数组、画布尺寸、配色）
Plaque.insert('brutal')                   // 套用布局（14 种 id）
Plaque.addAILayer(html, { w, h, x, y, duration, fps, name })
Plaque.renderToCanvas({ scale: 2, t: 1.5 })   // 取一帧合成结果（HTMLCanvasElement）
Plaque.export.png()  / .jpg() / .web() / .video({ duration, fps }) / .json()
Plaque.ai.generate({ brief, style, density, palette, target: 'layer' })
```

## 6. 快捷键

`V` 选择 · `T` 文字 · `R` 矩形 · `O` 圆形 · `双击` 改字 · `Alt+拖` 复制 · `Shift` 等比/加选 · `方向键` 微移 1px（`Shift` 10px）· `Ctrl+D` 复制 · `Ctrl+Z` 撤销 · `Ctrl+Shift+Z` 重做 · `Ctrl+S` 存工程 · `Ctrl+0` 适配 · `Ctrl+±` 缩放 · `Del` 删除 · `Esc` 取消。

## 7. 已知边界

- 字体全部使用系统字体栈（`PingFang / 思源黑体 / 微软雅黑 …`），不加载外部字体文件——这是为了保证 Canvas 重绘与 DOM 预览**像素一致**，离线也不会掉字。
- 视频导出依赖浏览器的 `MediaRecorder`；Edge / Chrome / Safari 新版均可，Firefox 会退回 WebM 或提示不支持。
- 大模型接口走浏览器直连，需要服务端允许 CORS（OpenAI、DeepSeek、智谱、通义官方接口均允许；自建服务请放开 `Access-Control-Allow-Origin`）。
- 本地自动保存到 `localStorage`（键 `plaque.autosave`），超过 4MB 会跳过（AI 插画代码较多时建议手动导出 JSON）。

## 8. 部署

### 静态托管 / GitHub Pages

纯静态项目，任意静态主机皆可。GitHub Pages：仓库 Settings → Pages → Source 选 `Deploy from a branch`，分支 `main`、目录 `/ (root)`，几分钟后访问 `https://kaixuanjun.github.io/plaque-studio/`。

### 热铁盒（Retinbox）

`kaixuanjun.rth1.xyz` 是多项目共享站点，用增量接口只写自己的子目录，不会动到同站点其它项目：

```powershell
$env:RTH_API_KEY = "<你的密钥>"
node tools/deploy-rth.mjs --dry    # 先看清单：16 个文件 / 约 315KB
node tools/deploy-rth.mjs          # 真实上传，并自动做线上内容校验
```

目标地址 `https://kaixuanjun.rth1.xyz/plaque-studio/`。可用 `RTH_USER` / `RTH_DOMAIN` / `RTH_DIR` 覆盖默认值。

> 备注：热铁盒接口的账号名是密钥校验返回的 `username`（不一定等于站点名），脚本会自动带上；站点有 WAF，会拦 `RTHHostHelper` 的 UA 访问网页本身，所以第 4 步校验改用浏览器 UA。

## 9. 接口 401 排查

401 是**服务端明确说 Key 不对**，不是网络问题。按下面顺序看：

| 现象 | 原因 | 改法 |
|---|---|---|
| `GET /models → 401` | Key 与 Base URL 不是同一家 | DeepSeek 的 key 只能配 `https://api.deepseek.com/v1`；OpenAI 的只能配 `https://api.openai.com/v1` |
| 同上 | Key 复制不全（少了尾部几位） | 重新复制；页面里会自动去掉 `Bearer `、空格、引号 |
| 同上 | 用了第三方中转，却填官方域名/官方 Key | 中转站必须用**中转给的地址 + 中转发的 Key** 成对使用 |
| `POST ... → 404` | Base URL 多写了 `/chat/completions` | 只填到 `/v1`（脚本已自动截断，但手填要留意） |
| `网络层失败：请求没到达…` | CORS / 服务未启动 / https 页面调 http | 本地 Ollama 用 `http://localhost:11434/v1` 且启动时设 `OLLAMA_ORIGINS=*`；部署在 https 站点上不能调 `http://localhost` |
| `400 model not found` | 模型名写错 | 换成该服务商真实模型名，如 `deepseek-chat`、`qwen-plus`、`glm-4-plus` |

设置弹窗里的「测试连通」会先 `GET /models` 验证 Key、再发一次最小对话，两步分别给出状态；「复制诊断」把地址、模型、Key 前缀长度和完整报错拼成一段文本，便于贴给他人排查。

### DeepSeek 专用自检（绕过前端，直接问官方）

```powershell
curl.exe -s -o NUL -w "%{http_code}`n" https://api.deepseek.com/v1/models `
  -H "Authorization: Bearer sk-你的KEY"
```

- 返回 `200` → Key 有效，问题在前端配置（多半 Base URL 填成了 OpenAI 的地址）。
- 返回 `401` → Key 本身无效，去 [platform.deepseek.com/api_keys](https://platform.deepseek.com/api_keys) 重新生成，再复制**完整**的 `sk-` 开头字符串（长度 35）。
- 返回 `402` → Key 有效但余额不足。
