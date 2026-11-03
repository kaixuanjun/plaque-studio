/* ai.js — 大模型接口层（OpenAI 兼容 /chat/completions）
   输出的是「插画程序」而不是图片：拿到 HTML → 校验 → 塞进 iframe 播放。
*/
(function () {
  'use strict';

  const AI = {};
  const LSKEY = 'plaque.ai';
  let ctrl = null;

  const PRESETS = [
    { id: 'openai', name: 'OpenAI', base: 'https://api.openai.com/v1', model: 'gpt-4.1-mini' },
    { id: 'deepseek', name: 'DeepSeek', base: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
    { id: 'moonshot', name: 'Moonshot', base: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k' },
    { id: 'zhipu', name: '智谱 GLM', base: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-plus' },
    { id: 'qwen', name: '通义千问', base: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus' },
    { id: 'ollama', name: '本地 Ollama', base: 'http://localhost:11434/v1', model: 'qwen2.5-coder:7b' }
  ];
  AI.PRESETS = PRESETS;

  AI.cfg = function () {
    const d = { base: '', key: '', model: 'gpt-4.1-mini', temp: 0.8, stream: true };
    const s = U.loadLS(LSKEY, null);
    return s ? Object.assign(d, s) : d;
  };
  AI.saveCfg = function (o) {
    const next = Object.assign(AI.cfg(), o || {});
    if (o && 'base' in o) next.base = AI.normBase(o.base);
    if (o && 'key' in o) next.key = AI.normKey(o.key);
    if (next.model) next.model = String(next.model).trim();
    U.saveLS(LSKEY, next);
    return next;
  };
  AI.ready = function () {
    const c = AI.cfg();
    return !!(c.base && c.model);
  };

  /* ---------- 从模型输出里抠出 HTML ---------- */
  AI.extractHtml = function (text) {
    let s = String(text || '');
    const fence = s.match(/```(?:html|HTML)?\s*\n?([\s\S]*?)```/);
    if (fence && /<\s*(!doctype|html|canvas|body)/i.test(fence[1])) s = fence[1];
    const start = s.search(/<!DOCTYPE html/i);
    if (start >= 0) {
      const end = s.toLowerCase().lastIndexOf('</html>');
      s = end > start ? s.slice(start, end + 7) : s.slice(start);
    } else {
      const cvs = s.search(/<canvas/i);
      if (cvs >= 0) {
        // 模型偷懒只给了片段：包一层壳
        s = '<!DOCTYPE html><html><head><meta charset="utf-8"><style>html,body{margin:0;height:100%;overflow:hidden;background:transparent}canvas{display:block;width:100%;height:100%}</style></head><body>' +
          s.slice(Math.max(0, s.lastIndexOf('<', cvs) >= 0 ? s.lastIndexOf('<', cvs) : cvs)) + '</body></html>';
      }
    }
    return s.trim();
  };

  /* ---------- 静态检查 ---------- */
  AI.check = function (html) {
    const issues = [];
    const h = String(html || '');
    if (!h) return ['空内容'];
    if (!/<canvas/i.test(h)) issues.push('缺少 <canvas>');
    if (!/id\s*=\s*["']art["']/i.test(h)) issues.push('canvas 缺少 id="art"');
    if (!/renderFrame/.test(h)) issues.push('缺少 renderFrame');
    if (!/window\.ART/.test(h)) issues.push('缺少 window.ART');
    if (/Math\.random\s*\(/.test(h)) issues.push('使用了 Math.random（会破坏确定性）');
    if (/https?:\/\/[^\s"')]+\.(js|css|png|jpg|svg|woff2?)/i.test(h)) issues.push('引用了外部资源');
    if (/<script[^>]+src=/i.test(h)) issues.push('引用了外部脚本');
    return issues;
  };

  /* ---------- 网络调用 ---------- */
  AI.abort = function () {
    if (ctrl) { try { ctrl.abort(); } catch (e) {} ctrl = null; }
  };

  /* ---------- 配置清洗：把常见的粘贴错误吃掉 ---------- */
  const ROOT_MAP = [
    [/^https?:\/\/api\.openai\.com$/i, '/v1'],
    [/^https?:\/\/api\.deepseek\.com$/i, '/v1'],
    [/^https?:\/\/api\.moonshot\.cn$/i, '/v1'],
    [/^https?:\/\/open\.bigmodel\.cn$/i, '/api/paas/v4'],
    [/^https?:\/\/dashscope\.aliyuncs\.com$/i, '/compatible-mode/v1'],
    [/^https?:\/\/api\.siliconflow\.cn$/i, '/v1'],
    [/^https?:\/\/(localhost|127\.0\.0\.1):11434$/i, '/v1']
  ];
  AI.normBase = function (b) {
    let s = String(b || '').trim().replace(/^["'`\s]+|["'`\s]+$/g, '');
    if (!s) return '';
    s = s.replace(/\s+/g, '');
    if (!/^https?:\/\//i.test(s)) {
      // 本机/局域网默认 http，公网默认 https
      const local = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(s);
      s = (local ? 'http://' : 'https://') + s;
    }
    s = s.replace(/\/(chat\/completions|completions|models|embeddings)\/?$/i, '');
    for (const [re, tail] of ROOT_MAP) if (re.test(s)) { s += tail; break; }
    return s.replace(/\/+$/, '');
  };
  AI.normKey = function (k) {
    return String(k || '')
      .replace(/[\u200B-\u200F\u2060\uFEFF]/g, '')   // 零宽字符（网页复制常见）
      .replace(/[\u0000-\u001F\u007F]/g, '')          // 控制字符 / 换行
      .replace(/[^\x21-\x7E]/g, '')                   // 只保留可打印 ASCII（Key 都是 ASCII）
      .replace(/^["'`]+|["'`]+$/g, '')
      .replace(/^Bearer/i, '')
      .replace(/^[\s:：]+/, '')
      .trim();
  };

  /* 从 401 响应体反推「你打的是哪家的接口」——这是最省事的定位法 */
  AI.clue401 = function (body) {
    const b = String(body || '');
    if (/Incorrect API key provided/i.test(b)) {
      return '这段报错是 OpenAI 官方接口的格式 —— 说明当前 Base URL 是 OpenAI 的地址，与 DeepSeek 的 Key 不匹配。把 Base URL 改成 https://api.deepseek.com/v1 再试。';
    }
    if (/Authentication Fails/i.test(b)) {
      return '这段报错是 DeepSeek 官方接口的格式 —— 地址是对的，问题在 Key 本身：可能已被删除/重置、复制时漏了尾部几位、或填的不是「API keys」页里的那个 sk- 开头的 Key。';
    }
    if (/invalid_api_key/i.test(b)) return '服务端判定该 Key 无效（invalid_api_key）。';
    if (/invalid_request_error/i.test(b) && /key/i.test(b)) return '服务端判定 Key 无效。';
    if (/令牌|密钥|key.*无效|鉴权/i.test(b)) return '国内服务商/中转的中文报错：Key 过期、类型不对，或中转需要它自己签发的 Key。';
    return '';
  };
  AI.endpoint = function () {
    const c = AI.cfg();
    const base = AI.normBase(c.base);
    return base ? base + '/chat/completions' : '';
  };

  /* ---------- 把 HTTP 错误翻译成人能看懂的诊断 ---------- */
  function explain(status, body, base) {
    const b = String(body || '').slice(0, 240);
    const map = {
      400: '请求被拒（400）。多半是 model 名写错，或该模型不接受当前参数。',
      401: 'Key 校验失败（401）。',
      402: '余额不足（402）。',
      403: '拒绝访问（403）。Key 没有该模型权限，或该地区被限制。',
      404: '路径不存在（404）。Base URL 应填到版本号为止，例如 https://api.deepseek.com/v1 —— 不要带 /chat/completions。当前拼出的是 ' + base + '/chat/completions',
      429: '被限流或额度用尽（429）。等一会儿或换模型/换 Key。',
      500: '服务端错误（500），与 Key 无关，稍后重试。',
      502: '网关错误（502），服务商侧问题。',
      503: '服务不可用（503），通常是模型过载。'
    };
    let out = map[status] || ('HTTP ' + status);
    if (status === 401) {
      const clue = AI.clue401(body);
      out += '\n' + (clue || '三种可能：① Key 复制不全/已失效；② Key 与 Base URL 不是同一家；③ 中转地址配了官方 Key。');
      out += '\n当前地址：' + base;
    }
    return out + (b ? '\n返回：' + b : '');
  }

  function netError(e, base) {
    const m = String((e && e.message) || e);
    if (/Failed to fetch|NetworkError|Load failed/i.test(m)) {
      return '网络层失败：请求没到达 ' + base + '。常见原因：① 该服务商不允许浏览器直连（CORS），需要中转地址或本地代理；② 地址拼错/服务未启动；③ 浏览器扩展或网络拦截。\n原始信息：' + m;
    }
    return m;
  }

  AI.chat = async function (messages, opt) {
    opt = opt || {};
    const c = AI.cfg();
    const base = AI.normBase(c.base);
    const key = AI.normKey(c.key);
    if (!base) throw new Error('未配置 API 地址：点击右上角「设置」填写 Base URL 与 Key');
    const url = base + '/chat/completions';
    const body = {
      model: opt.model || c.model,
      messages,
      temperature: opt.temp == null ? c.temp : opt.temp,
      stream: opt.stream != null ? opt.stream : !!c.stream
    };
    ctrl = new AbortController();
    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: Object.assign(
          { 'Content-Type': 'application/json' },
          key ? { Authorization: 'Bearer ' + key } : {}
        ),
        body: JSON.stringify(body),
        signal: ctrl.signal
      });
    } catch (e) {
      if (e && e.name === 'AbortError') throw e;
      const err = new Error(netError(e, base));
      err.net = true;
      throw err;
    }
    if (!res.ok) {
      let t = '';
      try { t = await res.text(); } catch (e) {}
      const err = new Error(explain(res.status, t, base));
      err.status = res.status;
      err.body = t;
      throw err;
    }
    const ct = res.headers.get('content-type') || '';
    if (!body.stream || ct.indexOf('text/event-stream') < 0) {
      const j = await res.json();
      const txt = (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
      if (opt.onDelta) opt.onDelta(txt);
      return txt;
    }

    const reader = res.body.getReader();
    const dec = new TextDecoder('utf-8');
    let buf = '';
    let out = '';
    for (;;) {
      const r = await reader.read();
      if (r.done) break;
      buf += dec.decode(r.value, { stream: true });
      const lines = buf.split(/\r?\n/);
      buf = lines.pop() || '';
      for (const line of lines) {
        const s = line.trim();
        if (!s || s.indexOf('data:') !== 0) continue;
        const payload = s.slice(5).trim();
        if (payload === '[DONE]') continue;
        try {
          const j = JSON.parse(payload);
          const d = j.choices && j.choices[0] && (j.choices[0].delta || j.choices[0].message);
          const piece = d && (d.content || '');
          if (piece) { out += piece; if (opt.onDelta) opt.onDelta(out); }
        } catch (e) {}
      }
    }
    return out;
  };

  /* ---------- 连通测试：先探 /models 再试一次最小对话 ---------- */
  AI.test = async function () {
    const c = AI.cfg();
    const base = AI.normBase(c.base);
    const key = AI.normKey(c.key);
    if (!base) throw new Error('还没填 Base URL。例：https://api.deepseek.com/v1');
    if (!key && !/^http:\/\/(localhost|127\.0\.0\.1)/i.test(base)) throw new Error('还没填 API Key。');
    AI.saveCfg({ base, key });

    const lines = [];
    const t0 = performance.now();

    // ① 鉴权探测：/models 只验证 Key，不消耗生成额度
    let models = null;
    try {
      const r = await fetch(base + '/models', {
        headers: key ? { Authorization: 'Bearer ' + key } : {}
      });
      if (r.ok) {
        const j = await r.json().catch(() => null);
        const n = j && Array.isArray(j.data) ? j.data.length : 0;
        models = true;
        lines.push('鉴权 GET /models → 200' + (n ? '（可用模型 ' + n + ' 个）' : '') + ' ✅');
      } else if (r.status === 401 || r.status === 403) {
        const body = await r.text().catch(() => '');
        lines.push('鉴权 GET /models → ' + r.status + ' ❌');
        lines.push(explain(r.status, body, base));
        const err = new Error(lines.join('\n'));
        err.status = r.status;
        err.body = body;
        throw err;
      } else {
        models = false;
        lines.push('鉴权 GET /models → ' + r.status + '（该服务不暴露 /models，跳过）');
      }
    } catch (e) {
      if (e && e.status) throw e;
      const m = String((e && e.message) || e);
      if (/Failed to fetch|NetworkError|Load failed/i.test(m)) {
        lines.push('鉴权 GET /models → 网络不可达（地址不通或被 CORS 拦）');
        throw new Error(netError(e, base));
      }
      models = false;
      lines.push('鉴权 GET /models → 不可用（该服务不暴露此接口，跳过）');
    }

    // ② 最小对话
    let txt = '';
    try {
      txt = await AI.chat([{ role: 'user', content: '只回复两个字：正常' }], { stream: false, temp: 0 });
      lines.push('对话 POST /chat/completions → 200 ✅ 模型回复：' + String(txt).slice(0, 30));
    } catch (e) {
      lines.push('对话 POST /chat/completions → 失败');
      lines.push(e.message || String(e));
      const err = new Error(lines.join('\n'));
      err.status = e.status;
      throw err;
    }
    return { ok: true, ms: Math.round(performance.now() - t0), text: String(txt).slice(0, 40), models, base, lines };
  };

  /* ---------- 主流程：生成插画程序 ---------- */
  AI.makeArt = async function (o) {
    o = o || {};
    const msgs = [
      { role: 'system', content: PROMPT.SYSTEM },
      { role: 'user', content: PROMPT.build(o) }
    ];
    const raw = await AI.chat(msgs, { onDelta: o.onDelta });
    let html = AI.extractHtml(raw);
    let issues = AI.check(html);
    if (issues.length && o.repair !== false) {
      if (o.onLog) o.onLog('自检未通过：' + issues.join('；') + '，正在让模型修一次…');
      const fixMsgs = msgs.concat([
        { role: 'assistant', content: raw.slice(0, 8000) },
        { role: 'user', content: PROMPT.repair(html, issues.join('；')) }
      ]);
      const raw2 = await AI.chat(fixMsgs, { onDelta: o.onDelta });
      const html2 = AI.extractHtml(raw2);
      const issues2 = AI.check(html2);
      if (issues2.length <= issues.length) { html = html2; issues = issues2; }
    }
    return { html, raw, issues };
  };

  window.AI = AI;
})();
