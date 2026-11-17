/**
 * 构建 client.js：把 src 下的宿主逻辑、样式和 93 张 31 档人像压成单文件客户端。
 *
 * 依赖：assets/frames/<family>-NN.webp（liang / sam / dario，各 31 张，NN = 00..30）
 * 产物：client.js（DSH 浏览器半身，通过 __ModuleLoader__ 注册）
 *
 * 用法：node build.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const FAMILIES = {
  liang: '梁文锋 · DeepSeek',
  sam: '奥特曼 · GPT',
  dario: '达里奥 · Claude',
};
const FRAME_COUNT = 31;

const style = read('src/style.css');
const extra = [
  '.bs31-root{display:inline-flex;align-items:center}',
  '.bs31-popover .ls-popover-head{gap:8px}',
  '.bs31-popover .ls-popover-title{flex:1}',
  '.bs31-footer{display:flex;gap:10px;align-items:center;justify-content:space-between;padding:9px 12px 12px;border-top:1px solid #ffffff18;color:#a6b2c1;font-size:11px}',
  '.bs31-footer>span{line-height:1.5}',
  '.bs31-footer .bs31-error{color:#ffb2a6}',
  '.bs31-picker{padding:10px 12px}',
  '.bs31-picker label{display:flex;gap:9px;align-items:center;font-size:12px;color:#b5c3d4}',
  '.bs31-picker select{min-width:0;width:100%;background:#1b2532;color:#e5edf5;border:1px solid #405773;border-radius:6px;padding:7px}',
  '.bs31-popover .ls-body{padding-bottom:10px}',
  '.bs31-popover .ls-range:focus-visible{outline:2px solid #90d4ff;outline-offset:3px}',
  '.bs31-popover .ls-close{flex-shrink:0}',
  '@media(max-width:520px){.bs31-popover .ls-station{font-size:10px}}',
].join('\n');

const frames = {};
for (const [key, name] of Object.entries(FAMILIES)) {
  const images = [];
  for (let i = 0; i < FRAME_COUNT; i += 1) {
    const file = path.join(root, 'assets', 'frames', `${key}-${String(i).padStart(2, '0')}.webp`);
    if (!fs.existsSync(file)) throw new Error(`缺少帧：${file}`);
    images.push(`data:image/webp;base64,${fs.readFileSync(file).toString('base64')}`);
  }
  if (new Set(images).size !== FRAME_COUNT) throw new Error(`${key} 存在重复帧`);
  frames[key] = { name, images };
}

const wrap = (file) => `(()=>{const module={exports:{}};${read(path.join('src', file))}\nreturn module.exports;})()`;

const client = `/* dsh-boss-slider ${JSON.parse(read('package.json')).version} · 构建产物，请勿手改（改 src/ 后跑 node build.mjs） */
window.__ModuleLoader__.load({id:'dsh-boss-slider',factory(require){
const Core=${wrap('core.cjs')};
const Backdrop=${wrap('backdrop.cjs')};
const CSS=${JSON.stringify(`${style}\n${extra}`)};
const FRAMES=${JSON.stringify(frames)};
${read('src/client-body.js')}
}});
`;

fs.writeFileSync(path.join(root, 'client.js'), client);
console.log(
  JSON.stringify({
    built: 'client.js',
    families: Object.keys(frames),
    images: Object.keys(frames).length * FRAME_COUNT,
    bytes: Buffer.byteLength(client),
  }),
);
