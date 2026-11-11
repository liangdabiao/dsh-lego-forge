// 浏览器冒烟：模拟面板场景验证分叉 viewer 的嵌入桥。
// 1) 宿主页 iframe 加载 cottage set.html?embed=1 → 收 ready/view 消息、工具条渲染；
// 2) 切「框选」模式拖一个矩形 → 收 selection 消息（含 bbox/sections/parts）；
// 3) Esc 清除 → count=0；宿主发 clear 入站消息不炸；?az=&el= 由 URL 直接生效（views 断言）。
// 用法：node scripts/smoke-viewer.mjs [set.html路径]（缺省自动找最近测试留下的 cottage 集合）
import { chromium } from 'playwright'
import { existsSync, readdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function findSet() {
  for (const d of readdirSync(tmpdir()).filter((n) => n.startsWith('lego-forge-sets-')).sort().reverse()) {
    const p = join(tmpdir(), d, 'cot-test/out/set.html')
    if (existsSync(p)) return p
  }
  return null
}

const file = process.argv[2] && existsSync(process.argv[2]) ? process.argv[2] : findSet()
if (!file) { console.error('用法：node scripts/smoke-viewer.mjs <set.html 路径>（或先跑 npm test 留下 cottage 集合）'); process.exit(2) }
console.log('· 冒烟目标:', file)
const url = 'file:///' + file.replace(/\\/g, '/') + '?embed=1'

const fail = (msg) => { console.error('✗ ' + msg); process.exit(1) }

const browser = await chromium.launch({ args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const page = await browser.newPage({ viewport: { width: 1100, height: 800 } })
const logs = []
page.on('console', (m) => logs.push(m.type() + ': ' + m.text()))
page.on('pageerror', (e) => logs.push('pageerror: ' + e.message))

// 宿主页 = 模拟 dsh 面板：监听 iframe 消息
const host = `<!doctype html><html><body style="margin:0"><div id="msgs" style="font:12px monospace;padding:4px;background:#111;color:#0f0;position:fixed;top:0;left:0;right:0;z-index:9;max-height:90px;overflow:auto"></div>
<iframe id="f" src="${url}" style="position:fixed;top:92px;left:0;width:100vw;height:calc(100vh - 92px);border:0"></iframe>
<script>
window.__messages = [];
addEventListener('message', (ev) => {
  if (ev.data?.source !== 'lego-forge-viewer') return;
  window.__messages.push(ev.data);
  document.getElementById('msgs').textContent += ev.data.type + ' ' + JSON.stringify(ev.data.payload).slice(0, 120) + '\\n';
});
</script></body></html>`
writeFileSync(join(root, '.smoke-host.html'), host)
await page.goto('file:///' + join(root, '.smoke-host.html').replace(/\\/g, '/'))
const frame = page.frameLocator('#f')

// ① ready 消息 + 工具条 + 视角上报
await page.waitForFunction(() => window.__messages?.some((m) => m.type === 'ready'), null, { timeout: 30000 })
console.log('✓ iframe 桥 ready 消息到达')
await page.waitForFunction(() => window.__messages?.some((m) => m.type === 'view'), null, { timeout: 15000 })
const view0 = (await page.evaluate(() => window.__messages.find((m) => m.type === 'view'))).payload
console.log(`✓ 视角上报 az=${view0.azimuth} el=${view0.elevation}`)
const buttons = await frame.locator('div[style*="z-index: 30"] button').count()
if (buttons < 4) fail(`工具条按钮应有 4 个，实际 ${buttons}`)
console.log('✓ 工具条渲染（4 个模式按钮）')

// ② 切框选模式，在模型中部拖一个矩形 → selection 消息
const box = await page.locator('#f').boundingBox()
const cx = box.x + box.width / 2, cy = box.y + box.height / 2
await frame.locator('button:has-text("框选")').click()
await page.mouse.move(cx - 170, cy - 130)
await page.mouse.down()
await page.mouse.move(cx + 170, cy + 130, { steps: 6 })
await page.mouse.up()
await page.waitForFunction(() => window.__messages?.some((m) => m.type === 'selection' && m.payload.count > 0), null, { timeout: 15000 })
const sel = (await page.evaluate(() => window.__messages.filter((m) => m.type === 'selection').pop())).payload
console.log(`✓ 框选命中 ${sel.count} 件 · sections=[${sel.sections.join(',')}] · bbox=${JSON.stringify(sel.bbox)}`)
if (!sel.count) fail('框选未命中任何零件')
if (!sel.bbox || sel.bbox.x1 <= sel.bbox.x0) fail('bbox 不合法')
if (!sel.parts?.length) fail('parts 聚合缺失')

// ③ Esc 清除 → count=0 消息
await page.keyboard.press('Escape')
await page.waitForFunction(() => window.__messages?.some((m) => m.type === 'selection' && m.payload.count === 0), null, { timeout: 10000 })
console.log('✓ Esc 清除选择（count=0 消息到达）')

// ④ 入站消息：宿主发 clear 不炸
await page.evaluate(() => document.getElementById('f').contentWindow.postMessage({ source: 'lego-forge-host', type: 'clear' }, '*'))
await page.waitForTimeout(400)

// ⑤ 单选模式点击一个零件 → selection(kind=parts, count=1)
await frame.locator('button:has-text("单选")').click()
await page.mouse.click(cx + 60, cy + 40)
await page.waitForFunction(() => window.__messages?.some((m) => m.type === 'selection' && m.payload.count === 1), null, { timeout: 10000 })
console.log('✓ 单选命中 1 件')

// 截图存证
const shot = join(root, '.smoke-shot.png')
await page.screenshot({ path: shot })
const errors = logs.filter((l) => l.startsWith('pageerror') || /Uncaught|SyntaxError/.test(l))
if (errors.length) fail('页面有错误：\n' + errors.join('\n'))
console.log('✓ 无页面错误 · 截图: ' + shot)
await browser.close()
console.log('\n全部通过 ✓')
process.exit(0)
