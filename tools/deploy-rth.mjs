#!/usr/bin/env node
/**
 * deploy-rth.mjs — 把 Plaque 工坊增量部署到 热铁盒（Retinbox）托管
 *
 * 用法（PowerShell）：
 *   $env:RTH_API_KEY = "<你的密钥>"
 *   node tools/deploy-rth.mjs            # 真实上传
 *   node tools/deploy-rth.mjs --dry      # 只打印清单，不发请求
 *
 * 可选环境变量：
 *   RTH_USER    默认 kaixuanjun
 *   RTH_DOMAIN  默认 kaixuanjun.rth1.xyz
 *   RTH_DIR     默认 plaque-studio（站点子目录，不带前后斜杠）
 *
 * 说明：热铁盒站点是多项目共享的，本脚本只写 RTH_DIR 下的文件，
 * 走 /host/site/changes 增量接口，不会影响同站点其它目录。
 */
import { readFileSync, statSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import path from 'node:path';

const KEY = process.env.RTH_API_KEY || '';
let USER = process.env.RTH_USER || '';
const DOMAIN = process.env.RTH_DOMAIN || 'kaixuanjun.rth1.xyz';
const DIR = (process.env.RTH_DIR || 'plaque-studio').replace(/^\/+|\/+$/g, '');
const DRY = process.argv.includes('--dry');

const UA = 'Mozilla/5.0 (win32) RTHHostHelper/6.2.2';
const HOSTS = ['https://api-overseas.retiehe.com', 'https://api-eo.retiehe.com'].map((h) => h + '/backend');
const AUTH_HOST = 'https://api.retiehe.com/backend';


// 需要上传的静态文件（相对项目根目录）
const FILES = [
  'index.html',
  'README.md',
  'LICENSE',
  'css/app.css',
  'js/util.js', 'js/data.js', 'js/store.js', 'js/render.js', 'js/localart.js',
  'js/prompts.js', 'js/ai.js', 'js/editor.js', 'js/panels.js', 'js/exporter.js', 'js/app.js',
  'samples/plaque-demo.html'
];

const TEXT_EXT = /\.(html|css|js|json|md|txt|svg)$/i;

async function api(base, pathname, init = {}) {
  const res = await fetch(base + pathname, {
    ...init,
    headers: {
      'User-Agent': UA,
      Authorization: 'Bearer ' + KEY,
      'Accept-Language': 'zh-CN',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers || {})
    }
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* 非 JSON */ }
  return { status: res.status, json, text };
}

function collect() {
  return FILES.filter((rel) => {
    try { return statSync(rel).isFile(); } catch { return false; }
  });
}

async function verifyKey() {
  const path = '/api-key-v2/verification?key=' + encodeURIComponent(KEY);
  let last = null;
  for (const host of [AUTH_HOST, ...HOSTS]) {
    const r = await api(host, path, { method: 'GET' });
    last = r;
    if (r.status !== 404) return { host, ...r };
  }
  return last;
}

async function listSites() {
  for (const host of HOSTS) {
    const r = await api(host, `/host/sites?username=${encodeURIComponent(USER)}`);
    if (r.status === 200 && r.json) return { host, ...r };
  }
  return null;
}

/* 站点内部域名可能不带 .rth1.xyz 后缀，按返回列表匹配 */
function pickDomain(sites) {
  const list = (sites && sites.results) || [];
  const want = DOMAIN.replace(/\.rth1\.xyz$/, '');
  const hit = list.find((s) => s.domain === want) || list.find((s) => s.domain === DOMAIN) || list[0];
  return hit ? hit.domain : null;
}

async function pushChanges(host, changes) {
  return api(host, '/host/site/changes', {
    method: 'POST',
    body: JSON.stringify({ username: USER, domain: DOMAIN, changes })
  });
}

async function main() {
  const files = collect();
  const items = files.map((rel) => {
    const buf = readFileSync(rel);
    return { rel, remote: `${DIR}/${rel.replace(/\\/g, '/')}`, bytes: buf.length, buf };
  });
  const total = items.reduce((n, i) => n + i.bytes, 0);
  console.log(`目标: https://${DOMAIN}/${DIR}/`);
  console.log(`文件: ${items.length} 个，共 ${(total / 1024).toFixed(1)} KB`);
  items.forEach((i) => console.log(`  ${(i.bytes / 1024).toFixed(1).padStart(7)} KB  ${i.remote}`));

  if (DRY) { console.log('\n--dry 模式，未发送任何请求。'); return; }
  if (!KEY) { console.error('\n缺少 RTH_API_KEY。先设置环境变量再运行：$env:RTH_API_KEY = "<密钥>"'); process.exit(2); }

  const v = await verifyKey();
  console.log(`\n[1/4] 密钥校验 ${v.host ? '(' + v.host + ')' : ''}: HTTP ${v.status} ${v.json ? JSON.stringify(v.json).slice(0, 160) : String(v.text || '').slice(0, 160)}`);
  if (v.json && v.json.username) console.log(`      账号: ${v.json.username} ✅`);
  else console.log('      校验接口不可用（部分 host 返回 404/501），改用站点接口判断密钥有效性。');
  if (!USER && v.json && v.json.username) USER = v.json.username;   // 密钥返回的 username 才是接口用的账号
  if (!USER) { console.error('      未能确定账号名，请设置 RTH_USER 后再试。'); process.exit(2); }

  const sites = await listSites();
  if (!sites) { console.error('无法访问站点列表接口（api-overseas / api-eo 均不可用）。'); process.exit(3); }
  console.log(`[2/4] 站点列表 ${sites.host}: HTTP ${sites.status} ${JSON.stringify(sites.json).slice(0, 200)}`);
  const siteDomain = pickDomain(sites.json);
  if (!siteDomain) { console.error('      账号下没有可用站点。'); process.exit(3); }
  console.log(`      使用站点内部域名: ${siteDomain}`);

  let listing = null;
  try {
    listing = await api(sites.host, `/host/site/content?domain=${encodeURIComponent(siteDomain)}&username=${encodeURIComponent(USER)}`);
    console.log(`      现有文件清单: HTTP ${listing.status}`);
  } catch (e) {
    console.log(`      现有文件清单不可用（${e.message}），跳过对比，直接增量写入 ${DIR}/。`);
  }
  const hashes = (listing && listing.json && listing.json.hashes) || {};
  const existing = Object.keys(hashes);
  if (existing.some((k) => k.startsWith(DIR + '/'))) console.log(`      远端已存在 ${DIR}/ 目录，将覆盖同名文件。`);
  else console.log(`      远端无 ${DIR}/ 目录，将新建。${existing.length ? '（站点现有 ' + existing.length + ' 个文件）' : ''}`);

  const changes = items.map((i) => ({
    operation: 'write',
    path: i.remote,
    content: TEXT_EXT.test(i.rel) ? i.buf.toString('utf8') : i.buf.toString('base64')
  }));
  const up = await api(sites.host, '/host/site/changes', {
    method: 'POST',
    body: JSON.stringify({ username: USER, domain: siteDomain, changes })
  });
  console.log(`[3/4] 上传: HTTP ${up.status} ${up.json ? JSON.stringify(up.json).slice(0, 200) : up.text.slice(0, 200)}`);
  if (up.status >= 400) process.exit(4);

  // 校验：软 404 会返回根页，因此比对内容里的特征串。站点 WAF 会拦 RTH UA，必须用浏览器 UA
  const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
  const check = await fetch(`https://${DOMAIN}/${DIR}/index.html?t=${Date.now()}`, { headers: { 'User-Agent': BROWSER_UA, Accept: '*/*' } });
  const body = await check.text();
  const ok = body.includes('Plaque') && body.includes('js/app.js');
  console.log(`[4/4] 线上校验: HTTP ${check.status}，内容匹配 ${ok ? '是 ✅' : '否 ❌'}（${body.length} 字节）`);
  console.log(`\n打开: https://${DOMAIN}/${DIR}/`);
  if (!ok) process.exit(5);
}

main().catch((e) => { console.error('部署失败:', e.message); process.exit(1); });


