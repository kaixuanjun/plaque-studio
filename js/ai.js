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
    U.saveLS(LSKEY, Object.assign(AI.cfg(), o || {}));
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

  AI.chat = async function (messages, opt) {
    opt = opt || {};
    const c = AI.cfg();
    if (!c.base) throw new Error('未配置 API 地址：点击右上角「设置」填写 Base URL 与 Key');
    const url = c.base.replace(/\/+$/, '') + '/chat/completions';
    const body = {
      model: opt.model || c.model,
      messages,
      temperature: opt.temp == null ? c.temp : opt.temp,
      stream: opt.stream != null ? opt.stream : !!c.stream
    };
    ctrl = new AbortController();
    const res = await fetch(url, {
      method: 'POST',
      headers: Object.assign(
        { 'Content-Type': 'application/json' },
        c.key ? { Authorization: 'Bearer ' + c.key } : {}
      ),
      body: JSON.stringify(body),
      signal: ctrl.signal
    });
    if (!res.ok) {
      let t = '';
      try { t = await res.text(); } catch (e) {}
      throw new Error('HTTP ' + res.status + ' ' + (t || res.statusText).slice(0, 300));
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

  AI.test = async function () {
    const t0 = performance.now();
    const txt = await AI.chat(
      [{ role: 'user', content: '只回复两个字：正常' }],
      { stream: false, temp: 0 }
    );
    return { ok: true, ms: Math.round(performance.now() - t0), text: String(txt).slice(0, 40) };
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
