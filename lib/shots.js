// 渲染审查回路：Playwright 起 headless Chromium 打开 out/set.html 截 sheet/hero/compare。
// 从原 bin/lego.mjs 适配为库函数：playwright 惰性加载（未安装返回结构化结果引导安装/开面板），
// 后端探针照搬（真 GPU 优先，SwiftShader 兜底——Windows 沙箱环境的既定事实）。
import { existsSync, mkdirSync, writeFileSync, statSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { setDir, journal } from './project.js'

const PROBE = `<body style="margin:0;background:#f2f0ea"><canvas id=c width=160 height=120></canvas><script>
const c = document.getElementById('c'), gl = c.getContext('webgl2') || c.getContext('webgl');
if (gl) { gl.enable(gl.SCISSOR_TEST);
  gl.scissor(0, 0, 80, 120); gl.clearColor(0.06, 0.06, 0.07, 1); gl.clear(gl.COLOR_BUFFER_BIT);
  gl.scissor(80, 0, 80, 120); gl.clearColor(0.94, 0.93, 0.90, 1); gl.clear(gl.COLOR_BUFFER_BIT); }
window.__probe = !!gl;</script></body>`

const BACKENDS = [
  ['d3d11', ['--no-sandbox', '--disable-setuid-sandbox', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist']],
  ['gpu', ['--no-sandbox', '--disable-setuid-sandbox', '--enable-gpu', '--ignore-gpu-blocklist']],
  ...(process.platform === 'darwin' ? [['metal', ['--no-sandbox', '--disable-setuid-sandbox', '--use-angle=metal', '--use-gl=angle', '--enable-gpu', '--ignore-gpu-blocklist']]] : []),
  ['swiftshader', ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']],
]

const canShoot = async (browser) => {
  let pg
  try {
    pg = await browser.newPage({ viewport: { width: 160, height: 120 } })
    await pg.setContent(PROBE)
    await pg.waitForFunction(() => window.__probe === true, null, { timeout: 10000 })
    const buf = await pg.screenshot({ timeout: 10000, clip: { x: 0, y: 0, width: 160, height: 120 } })
    const r = await pg.evaluate(async (src) => {
      const img = new Image(); img.src = src; await img.decode()
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height
      const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0)
      const px = g.getImageData(0, 0, c.width, c.height).data; let lo = 255, hi = 0
      for (let i = 0; i < px.length; i += 4) { const l = (px[i] * 299 + px[i + 1] * 587 + px[i + 2] * 114) / 1000; if (l < lo) lo = l; if (l > hi) hi = l }
      const gl = document.createElement('canvas').getContext('webgl'); const d = gl?.getExtension('WEBGL_debug_renderer_info')
      return { spread: hi - lo, renderer: String(d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : gl?.getParameter(gl.RENDERER) ?? '') }
    }, 'data:image/png;base64,' + buf.toString('base64'))
    return { ok: r.spread > 40, renderer: r.renderer, software: /swiftshader|llvmpipe|software|basic render/i.test(r.renderer) }
  } catch { return { ok: false } } finally { await pg?.close().catch(() => {}) }
}

async function pickBackend(chromium) {
  let lastErr, fallback = null
  for (const [name, args] of BACKENDS) {
    let b; try { b = await chromium.launch({ args, chromiumSandbox: false }) } catch (e) { lastErr = e; continue }
    const p = await canShoot(b)
    if (!p.ok) { await b.close().catch(() => {}); continue }
    if (!p.software) { if (fallback) await fallback.browser.close().catch(() => {}); return { browser: b, backend: name, renderer: p.renderer } }
    if (!fallback) fallback = { browser: b, backend: name, renderer: p.renderer }
    else await b.close().catch(() => {})
  }
  if (fallback) return fallback
  throw lastErr ?? new Error('every Chromium backend screenshotted blank')
}

/**
 * 渲染一个集合。
 * @param {object} opts { config, name, view?, only?, ref?, quick?, az?, el? }
 * @returns {ok, summary, files[], needsPlaywright?, blocked?}
 */
export async function shotsSet(opts) {
  const { config, name, view, only, ref, quick, az, el } = opts
  const dir = setDir(config, name)
  const out = join(dir, 'out')
  const page = join(out, 'set.html')
  if (!existsSync(page)) return { ok: false, summary: `还没有构建产物：先对「${name}」执行 action=build 再渲染。` }
  const reportFile = join(out, 'report.txt')
  const warnings = []
  if (existsSync(reportFile) && readFileSync(reportFile, 'utf8').startsWith('FAIL')) {
    warnings.push('上一次 build 未通过检查——图中的模型按当前零件是拼不出来的')
  }
  const buildFile = join(dir, 'build.mjs')
  if (existsSync(buildFile) && existsSync(page) && statSync(buildFile).mtimeMs > statSync(page).mtimeMs) {
    warnings.push('build.mjs 比最近一次构建新——先重新 build 再看渲染图')
  }

  let chromium
  try { ({ chromium } = await import('playwright')) } catch {
    return {
      ok: false, needsPlaywright: true,
      summary: '渲染需要 Playwright（尚未安装）。三选一：① 我来安装：在本机执行 `npm i -D playwright && npx playwright install chromium`（约 100MB，一次性）后重试；② 打开侧栏「积木工坊」→「审查图」标签，点「用面板渲染出图」，直接用面板里的 3D 截图回传存盘，完全不需要 Chromium；③ 用户在 3D 标签里拖动查看模型，审完把意见写在批注里。',
    }
  }

  let picked
  try { picked = await pickBackend(chromium) } catch (e) {
    if (/Executable doesn't exist|install/i.test(String(e))) {
      return { ok: false, needsPlaywright: true, summary: 'Playwright 已安装但缺 Chromium 内核：请执行 `npx playwright install chromium`（约 100MB，一次性）后重试；或在「积木工坊」→「审查图」标签点「用面板渲染出图」，由面板 3D 直接截图存盘。' }
    }
    return {
      ok: false, blocked: true,
      summary: `渲染被环境阻断（${String(e).split('\n')[0]}）。审查回路需要看到模型：请用户允许 headless 浏览器运行，或在「积木工坊」→「审查图」标签点「用面板渲染出图」——面板截图不依赖 Chromium。未经审查的集合不许交付。`,
    }
  }
  const { browser, backend, renderer } = picked
  const notes = []
  if (/swiftshader|llvmpipe|subzero/i.test(renderer || '')) notes.push('本机没有可用 GPU，正在用 CPU 软渲染——图是正确的，只是慢')

  const pg = await browser.newPage({ viewport: { width: 1800, height: 1200 } })
  const settle = () => pg.evaluate(async () => {
    try { await document.fonts?.ready } catch {}
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  }).catch(() => {})
  const files = []
  const shot = async (q, file, w, h) => {
    await pg.setViewportSize({ width: w, height: h })
    await pg.goto('file://' + page.replace(/\\/g, '/') + '?' + q)
    await pg.waitForFunction(() => window.__ready === true, null, { timeout: 120000 })
    await settle()
    try { await pg.screenshot({ path: file, timeout: 30000 }) } catch {
      const data = await pg.evaluate(() => {
        const c = document.getElementById('c'); const o = document.createElement('canvas'); o.width = c.width; o.height = c.height
        const g = o.getContext('2d'); g.fillStyle = '#f2f0ea'; g.fillRect(0, 0, o.width, o.height); g.drawImage(c, 0, 0)
        return o.toDataURL('image/png')
      })
      writeFileSync(file, Buffer.from(data.split(',')[1], 'base64'))
    }
    if (!files.includes(file)) files.push(file)
  }

  try {
    const viewQ = (base) => {
      let q = base
      if (only) q += `&only=${encodeURIComponent(only)}`
      if (Number.isFinite(Number(az)) && Number.isFinite(Number(el))) q += `&az=${Number(az)}&el=${Number(el)}`
      return q
    }
    const sfx = only ? `-${only}` : ''
    if (quick) {
      const pv = join(out, 'preview'); mkdirSync(pv, { recursive: true })
      await shot(viewQ('view=hero'), join(pv, `quick${sfx}.png`), 640, 640)
      await shot(viewQ('view=front'), join(pv, `quick-front${sfx}.png`), 640, 640)
    } else {
      await shot(viewQ('sheet'), join(out, `sheet${sfx}.png`), 1800, 1200)
      await shot(viewQ('view=hero'), join(out, `hero${sfx}.png`), 1200, 1200)
      if (ref && existsSync(ref)) {
        await shot(viewQ(`view=${view || 'hero'}&still`), join(out, 'view.png'), 1200, 1200)
        const cmp = await browser.newPage({ viewport: { width: 2400, height: 1200 } })
        const ext = (ref.split('.').pop() || 'png').toLowerCase().replace('jpg', 'jpeg')
        await cmp.setContent(`<body style="margin:0;display:flex;background:#f2f0ea"><div style="width:1200px;height:1200px;display:flex;align-items:center;justify-content:center"><img style="max-width:1200px;max-height:1200px" src="data:image/${ext};base64,${readFileSync(ref).toString('base64')}"></div><img style="width:1200px;height:1200px" src="data:image/png;base64,${readFileSync(join(out, 'view.png')).toString('base64')}"></body>`)
        await cmp.waitForTimeout(300)
        await cmp.screenshot({ path: join(out, 'compare.png') })
        await cmp.close()
        files.push(join(out, 'compare.png'))
      }
    }
  } finally {
    await pg.close().catch(() => {})
    await browser.close().catch(() => {})
  }

  const rel = files.map((f) => f.slice(out.length + 1))
  const summary = `已渲染「${name}」${quick ? '（quick：hero+front 双视图，快速迭代用）' : '（sheet 六视图 + hero 主视图）'}：${rel.join('、')}。${notes.length ? notes.join('；') + '。' : ''}${warnings.map((w) => `⚠ ${w}。`).join('')}`
  journal(dir, { action: 'shots', set: name, ok: true, summary, files: rel, backend })
  return { ok: true, summary, files: rel, backend, warnings }
}
