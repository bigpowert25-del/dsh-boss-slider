import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/Users/mac/.npm/_npx/381cec31605a419a/node_modules/playwright');
const OUT = process.argv[2] || '/tmp/mock-shots';
fs.mkdirSync(OUT, { recursive: true });
const file = 'file://' + path.resolve('dsh-mock.built.html');
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--force-color-profile=srgb', '--font-render-hinting=none'] });
const ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 2, locale: 'zh-CN', colorScheme: 'dark' });
const page = await ctx.newPage();
await page.goto(file, { waitUntil: 'load' });
await page.waitForTimeout(900);

const shot = (n) => page.screenshot({ path: path.join(OUT, n) });

await shot('s0-idle.png');
await page.evaluate(() => window.__api.open(true));
await page.waitForTimeout(320);
await shot('s1-open.png');
// 逐档拖动（左 → 右），每档一帧
for (let i = 0; i <= 30; i++) {
  await page.evaluate((v) => window.__api.setPos(v, { effort: 'Max' }), i);
  await page.waitForTimeout(70);
  await shot('drag-' + String(i).padStart(2, '0') + '.png');
}
// 撤销拖动回到中档并关面板
await page.evaluate(() => { window.__api.setPos(15, { wall: false }); window.__api.open(false); });
await page.waitForTimeout(320);
await shot('s2-closed.png');
// 插件页：已安装 / 发现 / 弹窗
await page.evaluate(() => window.__api.page('installed'));
await page.waitForTimeout(320);
await shot('s3-installed.png');
await page.evaluate(() => window.__api.page('discover'));
await page.waitForTimeout(320);
await shot('s4-discover.png');
await page.evaluate(() => window.__api.dialog(true));
await page.waitForTimeout(320);
await shot('s5-dialog.png');
await page.evaluate(() => { window.__api.dialog(false); window.__api.page('chat'); });
await page.waitForTimeout(320);
await shot('s6-chat-again.png');
await browser.close();
console.log('captured', fs.readdirSync(OUT).length, 'files');
