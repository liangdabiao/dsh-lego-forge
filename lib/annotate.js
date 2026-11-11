// 面板批注队列：用户在 3D 里点选/框选/秒选 section 后，面板 POST 到 /api/annotate 落盘；
// agent 侧三条可见通道：systemPrompt 动态段落（每轮请求实时读盘）、lego_forge 工具回执捎带、
// action=annotations 显式拉取；处理完用 resolve 销账。
// 协议见方案：{ kind: region|parts|section, bbox(集合坐标系), sections[], parts[], view{az,el}, note }
import { join } from 'node:path'
import { readAnnotations, writeJsonAtomic, journal } from './project.js'

const STAGES = ['Brief', 'Blockout', 'Detail', 'Check', 'Review', 'Deliver']
export { STAGES }

const fmtN = (v) => (typeof v === 'number' ? Math.round(v * 10) / 10 : v)

/** 人类可读描述（工具回执用）：一句话让 agent 知道用户指了哪、说了什么 */
export function describe(a) {
  const bits = []
  if (a.sections?.length) bits.push(`涉及 section: ${a.sections.join(', ')}`)
  if (a.bbox) {
    const b = a.bbox
    bits.push(`范围 x[${fmtN(b.x0)}..${fmtN(b.x1)}] y[${fmtN(b.y0)}..${fmtN(b.y1)}] z[${fmtN(b.z0)}..${fmtN(b.z1)}]（stud/plate，正面 +z）`)
  }
  if (a.parts?.length) bits.push(`${a.parts.slice(0, 5).map((p) => `${p.id}(${p.color})×${p.count}`).join(' ')}${a.parts.length > 5 ? ` 等 ${a.parts.length} 种零件` : ''}，共 ${a.count ?? '?'} 件`)
  if (a.view) bits.push(`用户观察视角 az=${fmtN(a.view.azimuth)}° el=${fmtN(a.view.elevation)}°`)
  return bits.join(' · ')
}

/** 批注队列文件路径下的读写；写入带原子性（project.writeJsonAtomic） */
function queueFile(dir) { return join(dir, 'annotations.json') }

export function listAll(dir) { return readAnnotations(dir) }

export function pending(dir) { return listAll(dir).filter((a) => a.status === 'pending') }

let seq = 0
export function enqueue(dir, set, input) {
  const list = listAll(dir)
  seq = (seq + 1) % 10000
  const annotation = {
    id: `an_${Date.now().toString(36)}_${seq}`,
    set,
    kind: ['region', 'parts', 'section'].includes(input.kind) ? input.kind : 'region',
    bbox: sanitizeBbox(input.bbox),
    sections: Array.isArray(input.sections) ? input.sections.slice(0, 20).map(String) : [],
    parts: sanitizeParts(input.parts),
    count: Number.isFinite(input.count) ? input.count : (input.parts?.length ?? 0),
    view: sanitizeView(input.view),
    note: String(input.note ?? '').slice(0, 500),
    status: 'pending',
    createdAt: new Date().toISOString(),
    resolvedAt: null,
  }
  list.push(annotation)
  // 队列上限 200：已 resolve 的最旧的先出
  const over = list.length - 200
  if (over > 0) list.splice(0, over)
  writeJsonAtomic(queueFile(dir), list)
  journal(dir, { action: 'annotate', set, ok: true, summary: `面板批注 ${annotation.id}：${describe(annotation)}`, annotationId: annotation.id })
  return annotation
}

export function resolveIds(dir, ids) {
  const list = listAll(dir)
  const want = new Set(ids.map(String))
  let n = 0
  for (const a of list) {
    if (a.status === 'pending' && want.has(a.id)) { a.status = 'resolved'; a.resolvedAt = new Date().toISOString(); n++ }
  }
  if (n) writeJsonAtomic(queueFile(dir), list)
  return n
}

/** 工具回执里的「待处理批注」文案段；无批注返回空串 */
export function pendingText(dir) {
  const list = pending(dir)
  if (!list.length) return ''
  const lines = list.slice(-5).map((a, i) => {
    const note = a.note ? `「${a.note}」` : '（无附言）'
    return `  ${i + 1}. ${describe(a)} — 用户说：${note}`
  })
  return `\n\nⓘ 面板批注（${list.length} 条待处理，处理完用 action=annotations 的 resolve 参数销账）：\n${lines.join('\n')}`
}

/** 结构化 JSON（action=annotations 的 data 字段），agent 直接可解析 */
export function pendingJson(dir) {
  const list = pending(dir)
  if (!list.length) return ''
  return JSON.stringify(list.map(({ id, kind, bbox, sections, parts, count, view, note, createdAt }) => ({ id, kind, bbox, sections, parts, count, view, note, createdAt })), null, 1)
}

// ---------- 清洗 ----------

function sanitizeBbox(b) {
  if (!b || typeof b !== 'object') return null
  const out = {}
  for (const k of ['x0', 'y0', 'z0', 'x1', 'y1', 'z1']) {
    const v = Number(b[k])
    if (Number.isFinite(v)) out[k] = Math.round(v * 100) / 100
  }
  return Object.keys(out).length >= 2 ? out : null
}

function sanitizeParts(parts) {
  if (!Array.isArray(parts)) return []
  return parts.slice(0, 60).map((p) => ({
    id: String(p.id ?? '').slice(0, 20),
    color: String(p.color ?? '').slice(0, 40),
    count: Number.isFinite(p.count) ? p.count : 1,
  })).filter((p) => p.id)
}

function sanitizeView(v) {
  if (!v || typeof v !== 'object') return null
  const azimuth = Number(v.azimuth), elevation = Number(v.elevation)
  if (!Number.isFinite(azimuth) || !Number.isFinite(elevation)) return null
  return { azimuth: Math.round(azimuth * 10) / 10, elevation: Math.round(elevation * 10) / 10 }
}
