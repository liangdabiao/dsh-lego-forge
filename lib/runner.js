// 构建运行器：进程内直驱引擎（原 CLI 的 build/shots/parts/part/docs/example/new 全部收编为库函数）。
// 数据流：动态 import 集合的 build.mjs?t=（绕 ESM 缓存）→ {Model, kit} → 用户 build() 返回 Model
//   → 【体素快照 vox.json：pack 前的"设计意图"】→ model.pack()（体素砌成真实砖）
//   → check()（可拼搭硬门槛）→ export 四件套 → 版本快照 versions/vN.json → journal 时间线 → project.json 元数据。
// 引擎零改动：export.mjs 按约定读 <插件根>/viewer/template.html + viewer/dist/viewer.js，插件保持同构布局。
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  setDir, sanitizeSetName, isValidSetName, journal, readMeta, writeMeta,
  nextVersion, pruneVersions, versionsDir, writeJsonAtomic, pluginRoot, copyTree, listSets,
} from './project.js'
import { shotsSet } from './shots.js'

// 引擎直驱（一次 import，进程内常驻；build.mjs 里的用户代码通过参数拿到 Model/kit）
const lazy = {}
async function engine() {
  if (!lazy.ready) {
    const root = pluginRoot()
    const [{ Model }, kit, { check, report }, exp, { colorInfo }] = await Promise.all([
      import(pathToFileURL(join(root, 'engine/model.mjs')).href),
      import(pathToFileURL(join(root, 'engine/kit.mjs')).href),
      import(pathToFileURL(join(root, 'engine/check.mjs')).href),
      import(pathToFileURL(join(root, 'engine/export.mjs')).href),
      import(pathToFileURL(join(root, 'engine/colors.mjs')).href),
    ])
    Object.assign(lazy, { Model, kit, check, report, exp, colorInfo, ready: true })
  }
  return lazy
}

// ---------- new / example ----------

export function newSet(config, name, title) {
  const clean = sanitizeSetName(name)
  if (!clean) throw new Error('集合名无法净化成合法目录名，请换一个名字')
  const dir = setDir(config, clean)
  if (existsSync(dir)) throw new Error(`集合已存在：${clean}`)
  const proot = pluginRoot()
  mkdirSync(dir, { recursive: true })
  copyFileSync(join(proot, 'templates/brief.md'), join(dir, 'brief.md'))
  copyFileSync(join(proot, 'templates/build.mjs'), join(dir, 'build.mjs'))
  writeMeta(dir, { name: clean, title: String(title || clean), stage: 'Brief', createdAt: new Date().toISOString() })
  journal(dir, { action: 'new', set: clean, ok: true, summary: `创建集合「${title || clean}」，脚手架已生成（brief.md + build.mjs）` })
  return { name: clean, dir, title: String(title || clean) }
}

const EXAMPLES = ['cottage', 'retro-computer']
export function exampleCopy(config, name, as) {
  if (!EXAMPLES.includes(name)) throw new Error(`示例只有：${EXAMPLES.join(' / ')}`)
  const clean = sanitizeSetName(as || name)
  const dir = setDir(config, clean)
  if (existsSync(dir)) throw new Error(`集合已存在：${clean}（换个 as 名字）`)
  copyTree(join(pluginRoot(), 'examples', name), dir)
  const meta = readMeta(dir) ?? {}
  writeMeta(dir, { name: clean, title: meta.title || clean, stage: 'Deliver', isExample: name })
  journal(dir, { action: 'example', set: clean, ok: true, summary: `拷入官方示例 ${name}（含 build.mjs 与现成渲染，可当范本读）` })
  return { name: clean, dir }
}

// ---------- build ----------

const VoxCap = 30000

/** pack 前的体素快照：agent 声明的"设计意图"，面板并排对照 pack 后的真实砖块 */
function voxSnapshot(model) {
  const cells = [...model.vox.entries()]
  if (!cells.length || cells.length > VoxCap) return null
  const geoId = '3024' // 1x1 plate：体素的最小视觉单元
  let geo
  try { geo = JSON.parse(readFileSync(join(pluginRoot(), 'engine/parts/geo', geoId + '.json'), 'utf8')) } catch { return null }
  const inst = []
  for (const [key, v] of cells) {
    const [x, y, z] = key.split(',').map(Number)
    const c = lazy.colorInfo(v.color)
    inst.push([geoId, c?.hex ?? '#b7b7a7', 1, x + 0.5, y * 0.4, z + 0.5, 1, 0, 0, 0, 1, 0, 0, 0, 1, v.tag || ''])
  }
  return { meta: { title: model.meta.title, parts: inst.length, colors: new Set(inst.map((r) => r[1])).size, voxels: true }, geo: { [geoId]: geo }, inst }
}

export async function buildSet(config, name) {
  const dir = setDir(config, name)
  const buildFile = join(dir, 'build.mjs')
  if (!existsSync(buildFile)) throw new Error(`集合「${name}」还没有 build.mjs（先 action=new 或让 agent 写一个）`)
  const out = join(dir, 'out'); mkdirSync(out, { recursive: true })
  const e = await engine()

  let model
  try {
    const mod = await import(pathToFileURL(buildFile).href + '?t=' + Date.now())
    model = typeof mod.default === 'function' ? await mod.default({ Model: e.Model, kit: e.kit }) : mod.default
  } catch (err) {
    const text = `build.mjs 抛出错误：\n${String(err?.stack || err)}`
    journal(dir, { action: 'build', set: name, ok: false, summary: text.slice(0, 400) })
    return { ok: false, threw: true, line: '构建未通过：build.mjs 抛出错误', summary: text }
  }
  if (!model?.parts) {
    const text = 'build.mjs 必须 export default function build({ Model, kit }) { … return m; }（返回 Model 实例）'
    journal(dir, { action: 'build', set: name, ok: false, summary: text })
    return { ok: false, threw: true, line: '构建未通过：build.mjs 没有返回 Model', summary: text }
  }

  // ① 体素快照（pack 前插桩——这就是"设计意图 vs 砖块实现"里意图那半张图）
  const vox = voxSnapshot(model)
  if (vox) writeJsonAtomic(join(dir, 'vox.json'), vox)

  // ② 装箱 + 检查 + 导出（与原 CLI build 命令逐步对齐）
  model.pack()
  const res = e.check(model)
  const text = e.report(res)
  writeFileSync(join(out, 'report.txt'), text + '\n')
  writeFileSync(join(out, 'set.html'), e.exp.html(model, res.stats))
  writeFileSync(join(out, 'model.ldr'), e.exp.ldr(model))
  writeFileSync(join(out, 'parts.csv'), e.exp.bom(model))
  writeJsonAtomic(join(out, 'check.json'), res)

  // ③ 版本快照（PASS 与 FAIL 都落——FAIL 的版本也有对照价值）
  const bomRows = readFileSync(join(out, 'parts.csv'), 'utf8').split('\n').filter(Boolean).slice(1)
    .map((line) => { const m = line.match(/^([^,]+),"([^"]*)",([^,]+),(\d+)$/); return m ? { id: m[1], name: m[2], color: m[3], qty: Number(m[4]) } : null }).filter(Boolean)
  const v = nextVersion(dir)
  writeJsonAtomic(join(versionsDir(dir), `v${v}.json`), {
    v, ts: new Date().toISOString(), title: model.meta.title, ok: res.ok,
    stats: res.stats, errors: res.errors, warningCount: res.warnings,
    issues: res.issues.slice(0, 20), bom: bomRows, inst: e.exp.instances(model),
  })
  const pruned = pruneVersions(dir, config?.keepVersions ?? 12)

  // ④ journal + 元数据
  const stage = inferStage(model)
  const summary = `${res.ok ? 'PASS' : 'FAIL'} · ${res.stats.parts} 件 · ${res.stats.types} 种 · ${res.stats.colors} 个主色 · ${res.errors} 错误 ${res.warnings} 警告（已存为版本 v${v}${pruned.length ? `，清理了旧版 ${pruned.join(',')}` : ''}）`
  journal(dir, { action: 'build', set: name, ok: res.ok, stage, summary, version: v, parts: res.stats.parts, errors: res.errors })
  writeMeta(dir, { title: model.meta.title, stage, lastBuild: { ok: res.ok, version: v, parts: res.stats.parts, colors: res.stats.colors, errors: res.errors, warnings: res.warnings, ts: new Date().toISOString() } })

  const top = res.issues.filter((i) => i.level === 'error').slice(0, 5)
    .map((i) => `  ✗ ${i.msg}${i.hint ? `\n    ↳ ${i.hint}` : ''}`).join('\n')
  const full = (res.ok ? '✓ 构建通过' : '✗ 构建未通过') + `\n${text}` + (top && !res.ok ? `\n\n前 5 条错误：\n${top}` : '')
  return { ok: res.ok, version: v, parts: res.stats.parts, line: summary, summary: full.slice(0, 6000), report: text }
}

/** 从 section 标签粗推管线阶段：全 blockout → Blockout；出现 building/vehicle/fig 等 → Detail */
function inferStage(model) {
  const tags = new Set(model.parts.map((p) => p.tag).filter(Boolean))
  if (!tags.size) return 'Blockout'
  const detailed = [...tags].some((t) => /roof|sign|fig|tree|window|door|shop|detail|garden|lamp|fence/i.test(t))
  return detailed ? 'Detail' : 'Blockout'
}

// ---------- review / stage ----------

const RUBRIC_ROWS = ['recognisable', 'proportion', 'structure', 'detail', 'colour', 'composition']
const RUBRIC_CN = { recognisable: '还原度', proportion: '比例', structure: '结构', detail: '细节', colour: '色彩', composition: '构图' }

export function reviewSet(config, name, scores, critiques) {
  const dir = setDir(config, name)
  const clean = {}
  for (const k of RUBRIC_ROWS) {
    const v = Number(scores?.[k] ?? scores?.[RUBRIC_CN[k]])
    if (Number.isFinite(v)) clean[k] = Math.max(1, Math.min(10, Math.round(v)))
  }
  if (!Object.keys(clean).length) throw new Error('scores 至少要有一行 rubric 分数：' + RUBRIC_ROWS.join('/'))
  const vals = Object.values(clean)
  const minRow = RUBRIC_ROWS.filter((k) => clean[k] === Math.min(...vals))
  const pass = vals.length === 6 && Math.min(...vals) >= 7
  const text = `评分：${RUBRIC_ROWS.map((k) => `${RUBRIC_CN[k]} ${clean[k] ?? '—'}`).join(' · ')}${critiques ? `\n批评：${String(critiques).slice(0, 800)}` : ''}\n→ ${pass ? '全部 ≥7，可以交付' : `最低行：${minRow.map((k) => RUBRIC_CN[k]).join('/')}，先修它（每行 ≥7 才交付，至多 3 轮）`}`
  journal(dir, { action: 'review', set: name, ok: pass, summary: text.slice(0, 400), scores: clean, critiques: String(critiques || '').slice(0, 800) })
  writeMeta(dir, { scores: clean, scoresAt: new Date().toISOString() })
  return { ok: pass, scores: clean, summary: text }
}

export function stageSet(config, name, stage) {
  const dir = setDir(config, name)
  if (!readMeta(dir)) throw new Error(`集合不存在：${name}`)
  writeMeta(dir, { stage })
  journal(dir, { action: 'stage', set: name, ok: true, summary: `阶段推进到 ${stage}` })
  return { ok: true, stage }
}

// ---------- read / list / docs / parts / part ----------

export function readSet(config, name, what) {
  const dir = setDir(config, name)
  const out = join(dir, 'out')
  const get = (f) => (existsSync(f) ? readFileSync(f, 'utf8') : null)
  switch (what) {
    case 'report': return get(join(out, 'report.txt')) ?? '（还没有构建报告——先 action=build）'
    case 'check': return get(join(out, 'check.json')) ?? '{}'
    case 'bom': return get(join(out, 'parts.csv')) ?? ''
    case 'brief': return get(join(dir, 'brief.md')) ?? ''
    case 'build': return get(join(dir, 'build.mjs')) ?? ''
    case 'versions': {
      const list = readdirSync(versionsDir(dir)).filter((f) => /^v\d+\.json$/.test(f)).sort()
      return JSON.stringify(list.map((f) => { const j = JSON.parse(readFileSync(join(versionsDir(dir), f), 'utf8')); return { v: j.v, ts: j.ts, ok: j.ok, parts: j.stats?.parts, errors: j.errors } }), null, 1)
    }
    default: throw new Error('what 只支持 report/check/bom/brief/build/versions')
  }
}

export { listSets }

const DOCS_MAP = { rubric: 'docs/RUBRIC.md', techniques: 'docs/TECHNIQUES.md', colors: 'docs/COLORS.md', parts: 'docs/PARTS.md', reference: 'docs/REFERENCE.md' }
export function docsText(which) {
  const rel = DOCS_MAP[which]
  if (!rel) throw new Error(`docs 只支持：${Object.keys(DOCS_MAP).join('/')}`)
  return readFileSync(join(pluginRoot(), rel), 'utf8')
}

/** 零件目录搜索（对齐原 CLI parts 命令：全词 AND，退化 OR，最多 80 条）
 *  尺寸写法归一化："brick 1x4" 与零件名里的 "Brick 1 x 4" 视为同一串——工具描述就是这么教 agent 搜的。 */
export async function partsSearch(words) {
  const { CATALOG } = await import(pathToFileURL(join(pluginRoot(), 'engine/catalog.mjs')).href)
  const norm = (s) => String(s || '').toLowerCase().replace(/(\d)\s*[x×*]\s*(\d)/g, '$1x$2')
  const ws = norm(words).split(/\s+/).filter(Boolean)
  if (!ws.length) throw new Error('给点关键词，例如 parts brick 1x4 / parts slope curve / parts bracket')
  const txt = (p) => norm(`${p.id} ${p.name} ${p.cat}`)
  let hits = Object.values(CATALOG).filter((p) => ws.every((w) => txt(p).includes(w)))
  let degraded = false
  if (!hits.length && ws.length > 1) { hits = Object.values(CATALOG).filter((p) => ws.some((w) => txt(p).includes(w))); degraded = true }
  const lines = hits.slice(0, 80).map((p) => `${p.id.padEnd(11)} ${p.name.slice(0, 58).padEnd(58)} ${p.w}×${p.d} · ${p.h}p · ${p.studs.length} studs${p.side?.length ? ` · ${p.side.length} side` : ''}${p.female.length ? '' : ' · no anti-studs'}`)
  const head = hits.length ? (degraded ? `（没有零件同时匹配全部 "${ws.join(' ')}"——以下匹配其中任意词）` : `匹配 ${hits.length} 个：`) : `没有零件匹配 "${words}"——用基础件组合（见 docs TECHNIQUES），或浏览 docs/gallery 的零件图册`
  return head + (lines.length ? '\n' + lines.join('\n') : '') + (hits.length > 80 ? `\n… 还有 ${hits.length - 80} 个，缩小关键词` : '')
}

/** 单零件 ASCII 销位图（对齐原 CLI part 命令，agent 排错刚需） */
export async function partASCII(id) {
  const mod = await import(pathToFileURL(join(pluginRoot(), 'engine/catalog.mjs')).href)
  const p = mod.part(String(id || ''))
  if (!p) throw new Error(`没有零件 ${id}——先用 action=parts 搜关键词`)
  const L = [`${p.id} · ${p.name} · ${p.cat}`, `footprint at rot 0: ${p.w} along x × ${p.d} along z · ${p.h} plates tall (${(p.h / 3).toFixed(2)} bricks)`]
  const cell = (x, z, list) => list.some(([a, b]) => Math.abs(a - x) < 0.05 && Math.abs(b - z) < 0.05)
  const grid = (title, list, mark) => {
    L.push('', `${title}   (top view, x → right, z ↓ = towards the front)`)
    for (let j = 0; j < p.d; j++) {
      let row = '  '
      for (let i = 0; i < p.w; i++) {
        const x = -p.w / 2 + i + 0.5, z = -p.d / 2 + j + 0.5
        const filled = p.cols.some(([a, b]) => Math.abs(a - x) < 0.05 && Math.abs(b - z) < 0.05)
        row += cell(x, z, list) ? ` ${mark} ` : filled ? ' · ' : '   '
      }
      L.push(row)
    }
  }
  grid('studs on top  (o = stud, · = no stud)', p.studs.map((s) => [s[0], s[1]]), 'o')
  grid('anti-studs underneath  (x = takes a stud from below)', p.female, 'x')
  const off = p.studs.filter((s) => !p.cols.some(([a, b]) => Math.abs(a - s[0]) < 0.05 && Math.abs(b - s[1]) < 0.05))
  if (off.length) L.push('', `studs between cells (centred): ${off.map((s) => `(${s[0]}, ${s[1]}) from the centre`).join(', ')} — parts above line up with them, not with the cells`)
  const lowTop = p.studs.filter((s) => Math.abs(s[2] - p.h) > 0.05)
  if (lowTop.length) L.push('', `studs below the top: at ${[...new Set(lowTop.map((s) => s[2]))].join(', ')} plates`)
  if (p.side?.length) {
    const face = (dx, dz) => dz > 0 ? 'front (+z)' : dz < 0 ? 'back (−z)' : dx > 0 ? 'right (+x)' : 'left (−x)'
    L.push('', 'side studs (SNOT) — a tile\'s anti-stud goes exactly on one of these:')
    for (const [x, z, y, dx, dz] of p.side) L.push(`  ${face(dx, dz).padEnd(12)} at x ${x}, z ${z} — ${y} plates above the part's bottom`)
    L.push('  mount with kit.studTile / kit.studCourse, or kit.sideStuds(part) to get one in world space')
  }
  if (!p.female.length) L.push('', '! no anti-studs: this part cannot sit on studs (it hangs on a clip, bar or pin) — kits place such parts')
  return L.join('\n')
}

export { shotsSet }
