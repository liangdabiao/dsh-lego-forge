// 项目持久化：$DSH_HOME/lego-forge/<集合名>/。
// 每个集合：brief.md + build.mjs（agent 写）+ out/（build 四件套与渲染图）
//          + journal.jsonl（过程时间线）+ versions/vN.json（版本快照）+ vox.json（体素预览）
//          + annotations.json（面板批注队列）+ project.json（元数据：阶段/评分/最近构建）。
// 纪律沿袭家族：原子写（tmp+rename）、路径 assertInside（越界拒绝）、集合名允许中文（仅拒文件系统非法字符）。
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { join, dirname, resolve, sep, extname } from 'node:path'
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, statSync, readdirSync, rmSync, cpSync, appendFileSync } from 'node:fs'

export const dataRoot = () => join(process.env.DSH_HOME || join(homedir(), '.dsh'), 'lego-forge')
export const setsRoot = (config) => {
  const custom = config?.setsRoot && String(config.setsRoot).trim()
  return custom ? resolve(String(custom)) : dataRoot()
}

/** 插件根目录（engine/、viewer/、templates/、examples/、docs/ 的家） */
export const pluginRoot = () => resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** 路径必须落在 base 内（拒绝绝对路径注入/穿越） */
export function assertInside(base, rel) {
  const absBase = resolve(base)
  const target = resolve(absBase, rel)
  if (target !== absBase && !target.startsWith(absBase + sep)) {
    throw new Error(`路径越界：${rel} 必须位于 ${absBase} 内`)
  }
  return target
}

/** 集合名净化：保留中文/字母/数字/空格转连字符；仅拒文件系统非法字符与控制符；截断 64 */
export function sanitizeSetName(value) {
  return String(value || '')
    .trim()
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 64)
    .replace(/[-.]+$/g, '')
}

export function isValidSetName(name) {
  return typeof name === 'string' && name.length > 0 && name.length <= 64 && !/[\\/:*?"<>|\u0000-\u001f]/.test(name) && !name.startsWith('.')
}

export function setDir(config, name) {
  const root = setsRoot(config)
  if (!isValidSetName(name)) throw new Error(`集合名不合法：${name}`)
  return assertInside(root, name)
}

// ---------- 原子写 ----------

export function writeTextAtomic(file, text) {
  mkdirSync(dirname(file), { recursive: true })
  const tmp = `${file}.${process.pid}.tmp`
  writeFileSync(tmp, text)
  renameSync(tmp, file)
}

export function writeJsonAtomic(file, value) {
  writeTextAtomic(file, JSON.stringify(value, null, 1))
}

// ---------- 元数据 / journal / versions / vox ----------

const META_CACHE = new Map() // dir → { mtimeMs, value }

export function readMeta(dir) {
  const file = join(dir, 'project.json')
  if (!existsSync(file)) return null
  const mtimeMs = statSync(file).mtimeMs
  const hit = META_CACHE.get(dir)
  if (hit && hit.mtimeMs === mtimeMs) return hit.value
  let value = null
  try { value = JSON.parse(readFileSync(file, 'utf8')) } catch { value = null }
  META_CACHE.set(dir, { mtimeMs, value })
  return value
}

export function writeMeta(dir, patch) {
  const cur = readMeta(dir) ?? {}
  const next = { ...cur, ...patch, updatedAt: new Date().toISOString() }
  writeJsonAtomic(join(dir, 'project.json'), next)
  return next
}

/** 过程时间线：一行一帧（JSONL 追加），面板时间线的唯一数据源 */
export function journal(dir, entry) {
  const line = JSON.stringify({ ts: new Date().toISOString(), ...entry }) + '\n'
  mkdirSync(dir, { recursive: true })
  appendFileSync(join(dir, 'journal.jsonl'), line)
}

export function readJournal(dir, limit = 200) {
  const file = join(dir, 'journal.jsonl')
  if (!existsSync(file)) return []
  const lines = readFileSync(file, 'utf8').split('\n').filter(Boolean)
  const out = []
  for (const line of lines.slice(-limit)) {
    try { out.push(JSON.parse(line)) } catch { /* 跳过坏行 */ }
  }
  return out
}

/** 版本快照目录：v1, v2, …（每次 build PASS 落一份 inst 摘要 + bom + check 摘要） */
export function versionsDir(dir) { return join(dir, 'versions') }

export function listVersions(dir) {
  const d = versionsDir(dir)
  if (!existsSync(d)) return []
  return readdirSync(d)
    .filter((f) => /^v\d+\.json$/.test(f))
    .map((f) => ({ v: Number(f.slice(1, -5)), file: join(d, f), mtimeMs: statSync(join(d, f)).mtimeMs }))
    .sort((a, b) => a.v - b.v)
}

export function nextVersion(dir) {
  const list = listVersions(dir)
  return (list.length ? list[list.length - 1].v : 0) + 1
}

export function readVersion(dir, v) {
  const file = join(versionsDir(dir), `v${v}.json`)
  if (!existsSync(file)) return null
  try { return JSON.parse(readFileSync(file, 'utf8')) } catch { return null }
}

/** 保留最近 N 个版本（默认 12），返回被清理的版本号 */
export function pruneVersions(dir, keep = 12) {
  const list = listVersions(dir)
  const removed = []
  for (const item of list.slice(0, Math.max(0, list.length - keep))) {
    try { rmSync(item.file) } catch { /* 忽略 */ }
    removed.push(item.v)
  }
  return removed
}

// ---------- 静态产物安全读取（api.js 用） ----------

const ARTIFACT_MIME = {
  '.html': 'text/html; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.csv': 'text/csv; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.ldr': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
}

/** 在集合目录内解析产物相对路径；越界/不存在返回 null。path 需已 decodeURIComponent。 */
export function safeArtifact(config, name, rel) {
  const dir = setDir(config, name)
  let file
  try { file = assertInside(dir, rel) } catch { return null }
  if (!existsSync(file) || !statSync(file).isFile()) return null
  return { file, type: ARTIFACT_MIME[extname(file).toLowerCase()] || 'application/octet-stream' }
}

// ---------- 集合级操作 ----------

export function listSets(config) {
  const root = setsRoot(config)
  if (!existsSync(root)) return []
  return readdirSync(root, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith('.') && !e.name.startsWith('_'))
    .map((e) => {
      const dir = join(root, e.name)
      const meta = readMeta(dir) ?? {}
      const outDir = join(dir, 'out')
      const buildMjs = existsSync(join(dir, 'build.mjs'))
      return {
        name: e.name,
        title: meta.title ?? e.name,
        stage: meta.stage ?? (buildMjs ? 'Brief' : null),
        hasBuild: buildMjs,
        lastBuild: meta.lastBuild ?? null,
        scores: meta.scores ?? null,
        pendingAnnotations: countPending(dir),
        versionCount: listVersions(dir).length,
        hasOut: existsSync(join(outDir, 'set.html')),
        updatedAt: meta.updatedAt ?? null,
      }
    })
    .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))
}

export function deleteSet(config, name) {
  const dir = setDir(config, name)
  if (!existsSync(dir)) throw new Error(`集合不存在：${name}`)
  rmSync(dir, { recursive: true, force: true })
  META_CACHE.delete(dir)
}

// ---------- 批注计数（annotate.js 的轻量前端，避免循环依赖） ----------

export function readAnnotations(dir) {
  const file = join(dir, 'annotations.json')
  if (!existsSync(file)) return []
  try { return JSON.parse(readFileSync(file, 'utf8')) } catch { return [] }
}

export function countPending(dir) {
  return readAnnotations(dir).filter((a) => a.status === 'pending').length
}

/** 拷目录树（new/example 用），目标必须不存在 */
export function copyTree(src, dest) {
  if (existsSync(dest)) throw new Error(`目标已存在：${dest}`)
  mkdirSync(dirname(dest), { recursive: true })
  cpSync(src, dest, { recursive: true })
}

/** 面板渲染兜底：接收 viewer 截出的 PNG data URL，存到 out/preview/panel-<view>.png。
 *  只允许固定视角名 + 校验 PNG 魔数，杜绝任意文件名写入与超大载荷。 */
const PANEL_VIEWS = new Set(['hero', 'front', 'back', 'left', 'right', 'top'])
export function savePanelImage(dir, view, dataUrl) {
  const v = PANEL_VIEWS.has(String(view)) ? String(view) : 'hero'
  const prefix = 'data:image/png;base64,'
  const bad = (msg) => Object.assign(new Error(msg), { status: 400 })
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith(prefix)) throw bad('截图数据不是 PNG data URL')
  if (dataUrl.length > 16 * 1024 * 1024) throw bad('截图数据过大（上限 12MB）')
  let buf
  try { buf = Buffer.from(dataUrl.slice(prefix.length), 'base64') } catch { throw bad('截图数据 base64 非法') }
  const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  if (buf.length < 8 || !buf.subarray(0, 8).equals(png)) throw bad('截图数据不是合法 PNG')
  if (buf.length > 12 * 1024 * 1024) throw bad('截图数据过大（上限 12MB）')
  const preview = join(dir, 'out', 'preview')
  mkdirSync(preview, { recursive: true })
  writeFileSync(join(preview, `panel-${v}.png`), buf)
  return `preview/panel-${v}.png`
}

/** 收集 out/ 与 out/preview/ 下的渲染图（审查图标签页用），返回相对 out/ 的路径 */
export function listImages(dir) {
  const outDir = join(dir, 'out')
  const images = []
  const scan = (base, prefix) => {
    if (!existsSync(base)) return
    for (const e of readdirSync(base, { withFileTypes: true })) {
      if (e.isDirectory()) { if (e.name === 'preview') scan(join(base, e.name), `${prefix}${e.name}/`) }
      else if (/\.(png|jpg)$/i.test(e.name)) images.push(`${prefix}${e.name}`)
    }
  }
  scan(outDir, '')
  return images.sort()
}
