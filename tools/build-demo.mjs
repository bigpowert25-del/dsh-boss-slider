/**
 * 生成两个独立演示页：
 *   web/index.html            —— 引用 ../assets/frames/*.webp（仓库内打开、GitHub Pages）
 *   web/滑动变祖器-单文件.html —— 93 帧全部内联成 data URI，双击即可看，不依赖任何外部文件
 *
 * 用法：node tools/build-demo.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FAMILIES = [
  { key: 'liang', name: '梁文锋', company: 'DeepSeek', labels: ['小难梁', '牢梁', '梁子', '梁圣', '梁神', '梁祖'] },
  { key: 'sam', name: '奥特曼', company: 'GPT', labels: ['小奥', '牢奥', '奥特曼', '奥圣', '奥神', '奥祖'] },
  { key: 'dario', name: '达里奥', company: 'Claude', labels: ['小达', '牢达', '达里奥', '达圣', '达神', '达祖'] },
];
const COUNT = 31;

const framePath = (key, i) => {
  const file = path.join(root, 'assets', 'frames', `${key}-${String(i).padStart(2, '0')}.webp`);
  if (!fs.existsSync(file)) throw new Error(`缺少帧 ${file}`);
  return file;
};

function framesFor(mode) {
  const out = {};
  for (const family of FAMILIES) {
    out[family.key] = [];
    for (let i = 0; i < COUNT; i += 1) {
      const file = framePath(family.key, i);
      out[family.key].push(
        mode === 'inline'
          ? `data:image/webp;base64,${fs.readFileSync(file).toString('base64')}`
          : `../assets/frames/${family.key}-${String(i).padStart(2, '0')}.webp`,
      );
    }
  }
  return out;
}

const template = (frames, families) => `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>滑动变祖器 · 31 档</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  html, body { margin: 0; height: 100%; }
  body {
    background: radial-gradient(120% 80% at 50% 0%, #232b3a 0%, #12161e 55%, #0b0e13 100%);
    color: #f2eff4; font-family: "Songti SC", "Noto Serif CJK SC", "Source Han Serif SC", serif;
    display: grid; place-items: center; padding: 18px; overflow: hidden;
  }
  .stage { width: min(980px, 100%); max-height: 100vh; display: grid; gap: 6px; align-content: center; }
  header { display: flex; align-items: center; justify-content: space-between; }
  h1 { margin: 0; font-size: clamp(20px, 2.6vw, 28px); letter-spacing: .16em; font-weight: 600; }
  h1 small { display: block; margin-top: 3px; font-size: 11px; letter-spacing: .26em; color: #8f9bab; font-family: ui-monospace, Menlo, monospace; }
  .counter { font-family: ui-monospace, Menlo, monospace; font-size: 15px; color: #d8d2e2; letter-spacing: .1em; }
  .series { display: flex; gap: 8px; }
  .series button {
    font: inherit; font-size: 12px; letter-spacing: .08em; padding: 6px 12px; border-radius: 999px; cursor: pointer;
    background: #1a212c; color: #a9b6c7; border: 1px solid #2c3542;
  }
  .series button[aria-pressed="true"] { background: #f0e6d2; color: #1a1a1a; border-color: #f0e6d2; }
  .face { position: relative; justify-self: center; width: min(292px, 34vh); aspect-ratio: 4 / 5; }
  .face img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; border-radius: 2px; }
  .face img.under { opacity: 1; }
  .face img.over { opacity: 0; transition: opacity 90ms linear; }
  .face i { position: absolute; width: 26px; height: 26px; border: 2px solid #e9e6ee; opacity: .8; }
  .face i:nth-child(3) { left: -12px; top: -12px; border-right: 0; border-bottom: 0; }
  .face i:nth-child(4) { right: -12px; top: -12px; border-left: 0; border-bottom: 0; }
  .face i:nth-child(5) { left: -12px; bottom: -12px; border-right: 0; border-top: 0; }
  .face i:nth-child(6) { right: -12px; bottom: -12px; border-left: 0; border-top: 0; }
  .seglabel { text-align: center; font-size: clamp(22px, 3.8vw, 34px); letter-spacing: .12em; color: #fbf8ff; line-height: 1.1; }
  .rheo { position: relative; margin-top: 0; touch-action: none; width: 100%; }
  .rheo svg { width: 100%; height: auto; display: block; cursor: ew-resize; }
  .rheo .ticks { display: flex; justify-content: space-between; padding: 0 4.5%; margin-top: -2px; }
  .rheo .ticks span { width: 2px; height: 5px; background: #4c5461; }
  .rheo .ticks span.major { height: 9px; background: #6d7788; }
  .stations { position: relative; height: 18px; margin-top: 2px; font-size: 12px; letter-spacing: .06em; color: #8f9bab; }
  .stations span { position: absolute; top: 0; transform: translateX(-50%); white-space: nowrap; }
  .stations b { font-weight: 500; color: #f0d9a8; }
  .tip { margin: 0; text-align: center; font-size: 12px; letter-spacing: .12em; color: #7f8b9c; font-family: ui-monospace, Menlo, monospace; }
  @media (max-width: 620px) {
    .face { width: min(64vw, 32vh); }
    .stations { font-size: 10px; }
    h1 { font-size: 20px; }
  }
</style>
</head>
<body>
<div class="stage">
  <header>
    <h1>滑动变祖器<small>SLIDING ANCESTOR · 31 STEPS</small></h1>
    <div class="series" id="series"></div>
  </header>
  <div class="face">
    <img class="under" id="faceUnder" alt="档位人像" />
    <img class="over" id="faceOver" alt="" />
    <i></i><i></i><i></i><i></i>
  </div>
  <div class="seglabel" id="segLabel">梁子</div>
  <div class="rheo" id="rheo">
    <svg viewBox="0 0 1000 210" id="svg" role="slider" tabindex="0" aria-label="31 档滑杆" aria-valuemin="0" aria-valuemax="30" aria-valuenow="15">
      <defs>
        <linearGradient id="tube" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#efeae0" /><stop offset=".5" stop-color="#cfc8bc" /><stop offset="1" stop-color="#a89f92" />
        </linearGradient>
        <linearGradient id="copper" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#f0b877" /><stop offset=".5" stop-color="#c97f3c" /><stop offset="1" stop-color="#8d5423" />
        </linearGradient>
        <linearGradient id="rail" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#f2f2f6" /><stop offset=".5" stop-color="#b9b9c2" /><stop offset="1" stop-color="#7f7f89" />
        </linearGradient>
        <linearGradient id="knob" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#f4f4f8" /><stop offset="1" stop-color="#6f6f79" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="1000" height="210" fill="transparent" />
      <line x1="18" y1="66" x2="982" y2="66" stroke="#3b4250" stroke-width="14" stroke-linecap="round" />
      <line x1="18" y1="66" x2="982" y2="66" stroke="url(#rail)" stroke-width="5" stroke-linecap="round" />
      <g id="posts">
        <circle cx="18" cy="66" r="15" fill="#b24a3f" stroke="#7c322b" stroke-width="3" />
        <circle cx="982" cy="66" r="15" fill="#b24a3f" stroke="#7c322b" stroke-width="3" />
        <circle cx="18" cy="66" r="5" fill="#f0dcc9" opacity=".55" />
        <circle cx="982" cy="66" r="5" fill="#f0dcc9" opacity=".55" />
      </g>
      <g id="tubeGroup">
        <rect x="86" y="120" width="828" height="72" rx="26" fill="#2f343d" />
        <rect x="96" y="128" width="808" height="56" rx="22" fill="url(#tube)" />
        <g id="coil" stroke="url(#copper)" stroke-width="3.4" fill="none"></g>
        <rect x="96" y="152" width="808" height="10" fill="#6f7784" opacity=".35" />
      </g>
      <g id="slider">
        <line x1="500" y1="182" x2="500" y2="76" stroke="#ffc67a" stroke-width="5" stroke-linecap="round" opacity=".85" />
        <rect x="486" y="14" width="28" height="76" rx="3" fill="#8f9199" stroke="#e9e9f0" stroke-width="2" />
        <rect x="478" y="0" width="44" height="24" rx="4" fill="url(#knob)" stroke="#5c5c66" stroke-width="2" />
      </g>
      <g id="footPosts">
        <ellipse cx="150" cy="196" rx="11" ry="7" fill="#3c414b" stroke="#9aa1ad" stroke-width="2" />
        <ellipse cx="850" cy="196" rx="11" ry="7" fill="#3c414b" stroke="#9aa1ad" stroke-width="2" />
      </g>
    </svg>
    <div class="ticks" id="ticks"></div>
    <div class="stations" id="stations"></div>
  </div>
  <p class="tip" id="tip">拖动滑片 = 切换模型与思考强度 · ← → Home End 也能推</p>
</div>
<script>
const DATA = ${JSON.stringify(frames)};
const FAMILIES = ${JSON.stringify(families)};
const COUNT = 31;
const NAMES = ${JSON.stringify(Object.fromEntries(FAMILIES.map((f) => [f.key, f.name])))};
const stage = { key: 'liang', pos: 15 };

const svg = document.getElementById('svg');
const coil = document.getElementById('coil');
const slider = document.getElementById('slider');
const under = document.getElementById('faceUnder');
const over = document.getElementById('faceOver');
const segLabel = document.getElementById('segLabel');
const counter = document.getElementById('ticks');
const stations = document.getElementById('stations');
const seriesBox = document.getElementById('series');

const SX0 = 96, SX1 = 904;
const xOf = (pos) => SX0 + ((SX1 - SX0) * pos) / (COUNT - 1);

// 密绕铜线
for (let k = 0; k < 62; k += 1) {
  const x = SX0 + ((SX1 - SX0) * k) / 61;
  const e = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
  e.setAttribute('cx', x.toFixed(1)); e.setAttribute('cy', '149');
  e.setAttribute('rx', '4.6'); e.setAttribute('ry', '27');
  coil.appendChild(e);
}
// 刻度
for (let k = 0; k < COUNT; k += 1) {
  const s = document.createElement('span');
  if (k % 5 === 0) s.className = 'major';
  counter.appendChild(s);
}

function familyLabels() { return FAMILIES.find((f) => f.key === stage.key); }
function segmentIndex(pos) { return Math.min(5, Math.floor(Math.round(pos) / 6)); }
function renderStations(active) {
  stations.innerHTML = '';
  familyLabels().labels.forEach((label, i) => {
    const span = document.createElement('span');
    const a = i * 6, b = i === 5 ? 30 : i * 6 + 5;
    span.style.left = xOf((a + b) / 2) / 10 + '%';
    if (i === active) { const strong = document.createElement('b'); strong.textContent = label; span.appendChild(strong); }
    else span.textContent = label;
    stations.appendChild(span);
  });
}
function setSeries(key) {
  stage.key = key;
  [...seriesBox.children].forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.key === key)));
  paint(stage.pos, true);
}
for (const family of FAMILIES) {
  const b = document.createElement('button');
  b.type = 'button'; b.textContent = family.name; b.dataset.key = family.key;
  b.setAttribute('aria-pressed', String(family.key === stage.key));
  b.addEventListener('click', () => setSeries(family.key));
  seriesBox.appendChild(b);
}

function paint(pos, hard) {
  const p = Math.min(COUNT - 1, Math.max(0, pos));
  const images = DATA[stage.key];
  const i0 = Math.floor(p), i1 = Math.min(i0 + 1, COUNT - 1);
  const frac = p - i0;
  if (hard) {
    under.src = images[i0]; over.src = images[i1]; over.style.opacity = String(frac);
  } else {
    // 逐帧过渡：先固定下层，再淡入上层
    if (under.src !== images[i0]) { under.src = images[i0]; }
    over.src = images[i1];
    over.style.opacity = String(frac);
  }
  const idx = Math.round(p);
  segLabel.textContent = familyLabels().labels[segmentIndex(p)];
  renderStations(segmentIndex(p));
  const x = xOf(p);
  slider.setAttribute('transform', 'translate(' + (x - 500).toFixed(2) + ' 0)');
  svg.setAttribute('aria-valuenow', String(idx));
  svg.setAttribute('aria-valuetext', NAME_OF() + ' 第 ' + (idx + 1) + ' 档 · ' + segLabel.textContent);
}
function NAME_OF() { return NAMES[stage.key]; }

let dragging = false;
function posFromEvent(event) {
  const box = svg.getBoundingClientRect();
  const scale = 1000 / box.width;
  const x = (event.clientX - box.left) * scale;
  const pos = ((x - SX0) / (SX1 - SX0)) * (COUNT - 1);
  return Math.min(COUNT - 1, Math.max(0, pos));
}
svg.addEventListener('pointerdown', (event) => {
  dragging = true; svg.setPointerCapture(event.pointerId); svg.focus();
  stage.pos = posFromEvent(event); paint(stage.pos);
});
svg.addEventListener('pointermove', (event) => {
  if (!dragging) return;
  stage.pos = posFromEvent(event); paint(stage.pos);
});
const stop = () => { if (dragging) { dragging = false; stage.pos = Math.round(stage.pos); paint(stage.pos); } };
svg.addEventListener('pointerup', stop);
svg.addEventListener('pointercancel', stop);
svg.addEventListener('keydown', (event) => {
  const step = event.shiftKey ? 5 : 1;
  let next = null;
  if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') next = stage.pos - step;
  if (event.key === 'ArrowRight' || event.key === 'ArrowUp') next = stage.pos + step;
  if (event.key === 'Home') next = 0;
  if (event.key === 'End') next = COUNT - 1;
  if (next === null) return;
  event.preventDefault();
  stage.pos = Math.min(COUNT - 1, Math.max(0, next));
  paint(stage.pos);
});

setSeries('liang');
</script>
</body>
</html>
`;

const outDir = path.join(root, 'web');
fs.mkdirSync(outDir, { recursive: true });

const relative = template(framesFor('relative'), FAMILIES);
fs.writeFileSync(path.join(outDir, 'index.html'), relative);

const inline = template(framesFor('inline'), FAMILIES);
const inlinePath = path.join(outDir, '滑动变祖器-单文件.html');
fs.writeFileSync(inlinePath, inline);

console.log(JSON.stringify({
  'web/index.html': Buffer.byteLength(relative),
  'web/滑动变祖器-单文件.html': Buffer.byteLength(inline),
}, null, 2));
