// tools/push-github.mjs — 通过 GitHub Git Data API 推送本地提交
// 用途：本机到 github.com:443 的 git 协议被间歇性 reset，但 api.github.com 可达。
// 用法：node tools/push-github.mjs [--files a,b] [--message "msg"]
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const OWNER = 'kaixuanjun';
const REPO = 'plaque-studio';
const BRANCH = 'main';
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
if (!TOKEN) { console.error('缺少 GITHUB_TOKEN'); process.exit(1); }

const API = 'https://api.github.com';
const H = { Authorization: `Bearer ${TOKEN}`, 'User-Agent': 'plaque-push', Accept: 'application/vnd.github+json' };

async function api(method, path, body) {
  const res = await fetch(API + path, { method, headers: H, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

const args = process.argv.slice(2);
const getArg = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const message = getArg('--message') || execSync('git log -1 --pretty=%B').toString().trim();
const filesArg = getArg('--files');
const files = filesArg
  ? filesArg.split(',').map((s) => s.trim()).filter(Boolean)
  : execSync('git diff --name-only HEAD~1 HEAD').toString().split('\n').map((s) => s.trim()).filter(Boolean);

if (!files.length) { console.log('没有需要推送的文件'); process.exit(0); }

const ref = await api('GET', `/repos/${OWNER}/${REPO}/git/ref/heads/${BRANCH}`);
const baseCommit = ref.object.sha;
const base = await api('GET', `/repos/${OWNER}/${REPO}/git/commits/${baseCommit}`);

const tree = [];
for (const path of files) {
  let buf;
  try { buf = readFileSync(path); } catch { console.log(`跳过（本地不存在）: ${path}`); continue; }
  const blob = await api('POST', `/repos/${OWNER}/${REPO}/git/blobs`, { content: buf.toString('base64'), encoding: 'base64' });
  tree.push({ path, mode: '100644', type: 'blob', sha: blob.sha });
  console.log(`blob ${path} (${(buf.length / 1024).toFixed(1)} KB)`);
}

const newTree = await api('POST', `/repos/${OWNER}/${REPO}/git/trees`, { base_tree: base.tree.sha, tree });
const commit = await api('POST', `/repos/${OWNER}/${REPO}/git/commits`, { message, tree: newTree.sha, parents: [baseCommit] });
await api('PATCH', `/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`, { sha: commit.sha, force: false });
console.log(`已推送 ${commit.sha.slice(0, 7)} → ${BRANCH}（${tree.length} 文件）`);
