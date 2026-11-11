// ============================================================================
// 积木工坊 · 浏览器半边（Client）。
// React 组件挂 main 槽（家族形态）：左项目列表 / 右详情。
// 六个标签：3D 模型（view.html iframe + 版本切换 + 体素/砖块对照 + 框选批注条）/
//          时间线（journal 过程剧场 + 版本对比）/ 审查图 / 报告 / BOM / 批注。
// 3D 里点选/框选 → postMessage 回面板 → 填附言 → POST /api/annotate → 系统提示词注入 + 工具回执捎带。
// 审查图空态可用面板内 3D 截图回传（POST /api/render-callback），不依赖 Playwright。
// ============================================================================
const h = require('react').createElement
const { useState, useEffect, useCallback, useRef } = require('react')

const BASE = '/lego-forge' // = host.js 的 webServer 前缀
const PANEL_ID = 'lego-forge' // = cordis.patch.yml 的 id
const STAGES = ['Brief', 'Blockout', 'Detail', 'Check', 'Review', 'Deliver']
const RUBRIC = [['recognisable', '还原'], ['proportion', '比例'], ['structure', '结构'], ['detail', '细节'], ['colour', '色彩'], ['composition', '构图']]

// 侧栏图标（24×24 积木砖）
function StudioIcon(props) {
  return h('svg', { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', ...props },
    h('rect', { x: 2.5, y: 7, width: 19, height: 13, rx: 2.5, fill: '#e8734a' }),
    h('rect', { x: 5.5, y: 3.5, width: 5, height: 4.5, rx: 1, fill: '#f0906b' }),
    h('rect', { x: 13.5, y: 3.5, width: 5, height: 4.5, rx: 1, fill: '#f0906b' }),
    h('circle', { cx: 9, cy: 13.5, r: 1.6, fill: '#fff', opacity: 0.9 }),
    h('circle', { cx: 15, cy: 13.5, r: 1.6, fill: '#ffe08a', opacity: 0.9 }))
}

// ---------- 数据助手 ----------

async function api(path, body) {
  const res = await fetch(BASE + path, body === undefined
    ? {}
    : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `请求失败（${res.status}）`)
  return data
}
const artifact = (name, file) => `${BASE}/api/artifact/${encodeURIComponent(name)}/${file.split('/').map(encodeURIComponent).join('/')}`
const fmtTime = (ts) => { try { return new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) } catch { return '' } }

const STAGE_CN = { Brief: '构思', Blockout: '骨架', Detail: '细化', Check: '检查', Review: '评审', Deliver: '交付' }
const ACTION_STYLE = {
  build: { label: '构建', bg: '#e6f4ea', fg: '#137333' },
  shots: { label: '渲染', bg: '#e8f0fe', fg: '#1a56db' },
  review: { label: '评审', bg: '#f3e8fd', fg: '#7627bb' },
  annotate: { label: '批注', bg: '#fee9e2', fg: '#c2410c' },
  stage: { label: '阶段', bg: '#fff7e0', fg: '#996c00' },
  new: { label: '新建', bg: '#f1f3f4', fg: '#5f6368' },
  example: { label: '示例', bg: '#f1f3f4', fg: '#5f6368' },
}

// ---------- 小组件 ----------

function Chip({ text, bg, fg, title }) {
  return h('span', { title, style: { fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: bg, color: fg, whiteSpace: 'nowrap' } }, text)
}

function StageChip({ stage }) {
  const i = STAGES.indexOf(stage)
  return h(Chip, { text: `${i + 1}/6 ${STAGE_CN[stage] ?? stage ?? '—'}`, bg: i >= 0 ? '#e8f0fe' : '#f1f3f4', fg: i >= 0 ? '#1a56db' : '#5f6368', title: '六步管线阶段' })
}

function Radar({ scores, size = 96 }) {
  const keys = RUBRIC.map(([k]) => k)
  const cx = size / 2, cy = size / 2, R = size / 2 - 14
  const pt = (i, r) => { const a = -Math.PI / 2 + (i / keys.length) * Math.PI * 2; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] }
  const poly = (r) => keys.map((_, i) => pt(i, r).map((v) => v.toFixed(1)).join(',')).join(' ')
  const val = (k) => Math.max(0, Math.min(10, Number(scores?.[k]) || 0))
  const shape = keys.map((k, i) => pt(i, (val(k) / 10) * R).map((v) => v.toFixed(1)).join(',')).join(' ')
  return h('svg', { width: size, height: size, style: { flexShrink: 0 } },
    [0.25, 0.5, 0.75, 1].map((k) => h('polygon', { key: k, points: poly(R * k), fill: 'none', stroke: '#e3e6ea', strokeWidth: 1 })),
    keys.map((_, i) => h('line', { key: i, x1: cx, y1: cy, x2: pt(i, R)[0], y2: pt(i, R)[1], stroke: '#e3e6ea', strokeWidth: 1 })),
    h('polygon', { points: shape, fill: 'rgba(232,115,74,.35)', stroke: '#e8734a', strokeWidth: 1.5 }),
    keys.map(([k, cn], i) => {
      const [x, y] = pt(i, R + 9)
      return h('text', { key: k, x, y: y + 3, textAnchor: 'middle', fontSize: 9, fill: '#6b6f73' }, `${cn}${scores?.[k] ? ' ' + val(k) : ''}`)
    }))
}

// ---------- 批注条（3D 标签底部浮动） ----------

function AnnotateBar({ selection, view, onSend, sending, sent }) {
  const [note, setNote] = useState('')
  if (!selection || !selection.count) {
    // 发送成功会清空选择、退回空态：确认文案必须留在这里，否则用户点了「发给 agent」看不到任何反馈
    return h('div', { style: { ...st.annotateBar, justifyContent: 'center', color: sent ? '#137333' : '#9aa0a6', fontWeight: sent ? 600 : 400 } },
      sent
        ? '✓ 批注已记录，已把修改说明填进新对话——发送即可开工'
        : '切到「单选 / 框选 / 区块」模式，在模型上选一片区域并附言，直接指挥 agent 修改')
  }
  const secs = selection.sections || []
  const top = (selection.parts || []).slice(0, 3).map((p) => `${p.id}×${p.count}`).join(' ')
  return h('div', { style: { ...st.annotateBar } },
    h('div', { style: { display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 } },
      h('div', { style: { fontWeight: 700, fontSize: 12 } }, `已选 ${selection.count} 件${secs.length ? ` · ${secs.length} 个区块` : ''}`),
      h('div', { style: { fontSize: 11, color: '#5f6368', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
        `${secs.length ? '区块: ' + secs.slice(0, 4).join(', ') + (secs.length > 4 ? ' …' : '') + ' · ' : ''}${top}${(selection.parts || []).length > 3 ? ` 等 ${selection.parts.length} 种` : ''}${view ? ` · 视角 ${view.azimuth}°/${view.elevation}°` : ''}`)),
    h('input', {
      placeholder: '附言：想让 agent 怎么改？（如「这面墙加两扇拱窗」）', value: note,
      onChange: (e) => setNote(e.target.value), style: { ...st.input, flex: 1, minWidth: 160 },
      onKeyDown: (e) => { if (e.key === 'Enter' && !sending) onSend(note, () => setNote('')) },
    }),
    h('button', { style: st.primaryBtn, disabled: sending, onClick: () => onSend(note, () => setNote('')) }, sending ? '发送中…' : '发给 agent'),
    sent ? h('span', { style: { color: '#137333', fontSize: 11, fontWeight: 600 } }, '✓ 已记录，修改说明已填进新对话') : null)
}

// ---------- 时间线（过程剧场） ----------

function Timeline({ detail, onJump }) {
  const entries = [...(detail.journal || [])].reverse()
  if (!entries.length) return h('div', { style: st.empty }, '还没有过程记录——在对话里让 agent 开始构建，这里会实时长出时间线')
  return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } }, entries.map((e, i) => {
    const a = ACTION_STYLE[e.action] ?? ACTION_STYLE.new
    const ann = e.annotationId ? e.annotationId : null
    return h('div', { key: i, style: { display: 'flex', gap: 8, alignItems: 'flex-start', padding: '7px 10px', background: '#fff', border: '1px solid #e8eaed', borderRadius: 8 } },
      h('span', { style: { fontSize: 11, color: '#9aa0a6', fontFamily: 'Menlo,Consolas,monospace', flexShrink: 0, paddingTop: 2 } }, fmtTime(e.ts)),
      h(Chip, { text: a.label, bg: a.bg, fg: a.fg }),
      h('div', { style: { flex: 1, minWidth: 0 } },
        h('div', { style: { fontSize: 12, lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: e.ok === false ? '#c5221f' : '#1f2124' } }, e.summary || ''),
        e.stage ? h('div', { style: { marginTop: 3 } }, h(StageChip, { stage: e.stage })) : null),
      e.version ? h('button', { style: st.miniBtn, onClick: () => onJump(e.version), title: '在 3D 里查看这一版' }, `看 v${e.version}`) : null,
      ann ? h('span', { style: { fontSize: 10, color: '#c2410c', flexShrink: 0 } }, ann) : null)
  }))
}

// ---------- 版本对比 ----------

function VersionCompare({ detail, name }) {
  const versions = detail.versions || []
  const [a, setA] = useState(null); const [b, setB] = useState(null)
  const [diff, setDiff] = useState(null)
  const load = useCallback(async (va, vb) => {
    if (!va || !vb || va === vb) { setDiff(null); return }
    try {
      const [da, db] = await Promise.all([
        api(`/api/version?name=${encodeURIComponent(name)}&v=${va}&light=1`),
        api(`/api/version?name=${encodeURIComponent(name)}&v=${vb}&light=1`),
      ])
      const bomA = new Map((da.bom || []).map((r) => [`${r.id}|${r.color}`, r.qty]))
      const bomB = new Map((db.bom || []).map((r) => [`${r.id}|${r.color}`, r.qty]))
      const added = [], removed = [], changed = []
      for (const [k, q] of bomB) { const qa = bomA.get(k); if (qa === undefined) added.push([k, q]); else if (qa !== q) changed.push([k, qa, q]) }
      for (const [k, q] of bomA) if (!bomB.has(k)) removed.push([k, q])
      added.sort((x, y) => y[1] - x[1]); removed.sort((x, y) => y[1] - x[1])
      setDiff({
        parts: [da.stats?.parts ?? 0, db.stats?.parts ?? 0],
        errors: [da.errors ?? 0, db.errors ?? 0],
        ok: [da.ok, db.ok],
        added, removed, changed,
      })
    } catch (e) { setDiff({ error: e.message }) }
  }, [name])
  const sel = (value, onChange, ph, other) => h('select', {
    value: value ?? '',
    onChange: (e) => { const v = e.target.value ? Number(e.target.value) : null; onChange(v); load(other ?? value, v) },
    style: st.input,
  },
    h('option', { value: '' }, ph), versions.map((v) => h('option', { key: v.v, value: v.v }, `v${v.v} · ${v.parts ?? '?'} 件 · ${v.ok ? 'PASS' : 'FAIL'}`)))
  return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
    h('div', { style: { display: 'flex', gap: 8, alignItems: 'center' } },
      h('span', { style: { fontSize: 12, color: '#5f6368' } }, '对比'), sel(a, setA, '旧版本', b), h('span', { style: { color: '#9aa0a6' } }, '→'), sel(b, setB, '新版本', a)),
    diff && !diff.error ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
      h('div', { style: { display: 'flex', gap: 12, fontSize: 12 } },
        h('span', null, `零件 ${diff.parts[0]} → `, h('b', null, diff.parts[1]), `（${diff.parts[1] - diff.parts[0] >= 0 ? '+' : ''}${diff.parts[1] - diff.parts[0]}）`),
        h('span', null, `错误 ${diff.errors[0]} → `, h('b', { style: { color: diff.errors[1] === 0 ? '#137333' : '#c5221f' } }, diff.errors[1]))),
      h(DiffList, { title: `新增 ${diff.added.length} 种`, rows: diff.added.map(([k, q]) => [k, '', `+${q}`]) }),
      h(DiffList, { title: `移除 ${diff.removed.length} 种`, rows: diff.removed.map(([k, q]) => [k, '', `−${q}`]) }),
      h(DiffList, { title: `数量变化 ${diff.changed.length} 种`, rows: diff.changed.map(([k, qa, qb]) => [k, String(qa), `→ ${qb}`]) }),
    ) : diff?.error ? h('div', { style: st.empty }, diff.error) : h('div', { style: { fontSize: 11, color: '#9aa0a6' } }, '选两个版本看零件级差异'))
}
function DiffList({ title, rows }) {
  if (!rows.length) return null
  return h('div', null,
    h('div', { style: { fontSize: 11, fontWeight: 700, color: '#5f6368', marginBottom: 3 } }, title),
    h('div', { style: { fontFamily: 'Menlo,Consolas,monospace', fontSize: 11, color: '#3c4043', lineHeight: 1.6 } },
      rows.slice(0, 10).map(([k, a, b], i) => h('div', { key: i }, `${k.split('|')[0]} ${k.split('|')[1] || ''}  ${a ? `${a} ` : ''}${b}`)),
      rows.length > 10 ? h('div', { style: { color: '#9aa0a6' } }, `… 还有 ${rows.length - 10} 行`) : null))
}

// ---------- 批注标签页 ----------

function Annotations({ detail, name, onChanged }) {
  const list = detail.annotations || []
  const pending = list.filter((a) => a.status === 'pending')
  const resolved = list.filter((a) => a.status === 'resolved').slice(-8).reverse()
  const resolve = async (id) => { try { await api('/api/annotate/resolve', { name, ids: [id] }); onChanged() } catch { /* 静默 */ } }
  const card = (a) => h('div', { key: a.id, style: { background: '#fff', border: '1px solid #e8eaed', borderRadius: 8, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 4 } },
    h('div', { style: { display: 'flex', gap: 8, alignItems: 'center' } },
      h(Chip, { text: a.kind === 'section' ? '区块' : a.kind === 'region' ? '区域' : '零件', bg: '#fee9e2', fg: '#c2410c' }),
      h('span', { style: { fontSize: 11, color: '#9aa0a6', fontFamily: 'Menlo,Consolas,monospace' } }, fmtTime(a.createdAt)),
      a.sections?.length ? h('span', { style: { fontSize: 11, color: '#1a56db' } }, a.sections.join(', ')) : null,
      a.status === 'pending' ? h('button', { style: { ...st.miniBtn, marginLeft: 'auto' }, onClick: () => resolve(a.id) }, '标记已处理') : h('span', { style: { marginLeft: 'auto', fontSize: 11, color: '#137333' } }, '✓ 已处理')),
    a.note ? h('div', { style: { fontSize: 12, fontWeight: 600 } }, `「${a.note}」`) : null,
    h('div', { style: { fontSize: 11, color: '#5f6368', fontFamily: 'Menlo,Consolas,monospace' } },
      `${a.count ?? '—'} 件${a.bbox ? ` · x[${a.bbox.x0}..${a.bbox.x1}] y[${a.bbox.y0}..${a.bbox.y1}] z[${a.bbox.z0}..${a.bbox.z1}]` : ''}${a.view ? ` · 视角 ${a.view.azimuth}°/${a.view.elevation}°` : ''}`))
  return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
    h('div', { style: { fontSize: 12, color: '#5f6368', background: '#fff7e0', border: '1px solid #f3e3b3', borderRadius: 8, padding: '8px 10px', lineHeight: 1.5 } },
      '在「3D 模型」标签把查看模式切到 单选 / 框选 / 区块，选一片区域写附言发给 agent；批注会随 agent 下一次构建自动送达，处理后自动销账。'),
    pending.length ? h('div', { style: { fontSize: 11, fontWeight: 700, color: '#c2410c' } }, `待处理 ${pending.length}`) : h('div', { style: { fontSize: 12, color: '#137333' } }, '没有待处理的批注'),
    ...pending.map(card),
    resolved.length ? h('div', { style: { fontSize: 11, fontWeight: 700, color: '#5f6368', marginTop: 6 } }, '最近已处理') : null,
    ...resolved.map(card))
}

// ---------- 主面板 ----------

function StudioPanel() {
  const [sets, setSets] = useState([])
  const [name, setName] = useState(null)
  const [detail, setDetail] = useState(null)
  const [tab, setTab] = useState('model')
  const [ver, setVer] = useState(null)          // null = 最新
  const [vox, setVox] = useState(false)         // 体素/砖块对照
  const [selection, setSelection] = useState(null)
  const [view, setView] = useState(null)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [colors, setColors] = useState({})
  const [bom, setBom] = useState(null)
  const [report, setReport] = useState(null)
  const [zoom, setZoom] = useState(null)
  const [newName, setNewName] = useState('')
  const [err, setErr] = useState('')
  const [capturing, setCapturing] = useState(false)
  const iframeRef = useRef(null)

  const loadSets = useCallback(async () => {
    try { const d = await api('/api/sets'); setSets(d.sets || []); if (!name && d.sets?.length) setName(d.sets[0].name) } catch { /* 宿主未就绪 */ }
  }, [name])

  const loadDetail = useCallback(async (n) => {
    if (!n) return
    try {
      const d = await api(`/api/set?name=${encodeURIComponent(n)}`)
      setDetail(d); setErr('')
    } catch (e) { setDetail(null); setErr(e.message) }
  }, [])

  useEffect(() => { loadSets(); api('/api/colors').then(setColors).catch(() => {}) }, [])           // eslint-disable-line
  useEffect(() => { setDetail(null); setVer(null); setVox(false); setSelection(null); setSent(false); setTab('model'); setBom(null); setReport(null); loadDetail(name) }, [name])  // eslint-disable-line
  useEffect(() => {
    const t = setInterval(() => { loadSets(); if (name) loadDetail(name) }, 6000)
    return () => clearInterval(t)
  }, [name, loadSets, loadDetail])                                                                 // eslint-disable-line

  // iframe 桥：选择 / 视角 / 面板截图回传
  useEffect(() => {
    const onMsg = (ev) => {
      const d = ev.data
      if (d?.source !== 'lego-forge-viewer') return
      if (d.type === 'selection') {
        setSelection(d.payload)
        // 只有「真的选中了东西」才复位确认文案：发完批注面板会给 iframe 发 clear，
        // iframe 回一条 count=0 的 selection，若在这里一律 setSent(false)，确认提示刚出现就被抹掉。
        if (d.payload?.count) setSent(false)
      }
      if (d.type === 'view') setView(d.payload)
      if (d.type === 'capture') {
        (async () => {
          try {
            await api('/api/render-callback', { name, view: d.payload?.view || 'hero', image: d.payload?.dataUrl })
            await loadDetail(name)
          } catch (e) { setErr(e.message) }
          setCapturing(false)
        })()
      }
      if (d.type === 'capture-error') { setErr(`面板截图失败：${d.payload?.message || '未知原因'}`); setCapturing(false) }
    }
    addEventListener('message', onMsg)
    return () => removeEventListener('message', onMsg)
  }, [name, loadDetail])

  const sendAnnotation = async (note, done) => {
    if (!name || !selection?.count) return
    setSending(true)
    const sel = { ...selection }
    try {
      await api('/api/annotate', { name, annotation: { ...sel, view, note: note.trim() } })
      iframeRef.current?.contentWindow?.postMessage({ source: 'lego-forge-host', type: 'clear' }, '*')
      setSelection(null); setSent(true); done?.(); loadDetail(name)
      // 批注入队后直接跳到对话，把修改说明填好（圈选是大致意图，结构化数据走 annotations 拉取）
      const where = sel.sections?.length ? `区块 ${sel.sections.join('/')}` : `${sel.count} 件零件`
      const ask = note.trim() || '按圈选区域优化'
      jumpToChat(`积木工坊「${name}」收到新面板批注（${where}）：「${ask}」。` +
        `请先 action=annotations 拉取结构化数据（bbox / 零件清单 / 视角），` +
        `按批注修改 build.mjs，build 通过后 shots 渲染对照，最后 resolve 销账批注并向用户汇报。`)
    } catch (e) { setErr(e.message) }
    setSending(false)
  }

  // 无 Playwright 兜底：让 iframe 里的 viewer 截当前视角，回传 data URL 交给 Host 存盘。
  const capture = (view) => {
    const frame = iframeRef.current
    if (!frame) { setErr('3D 预览还没就绪，等它出现后再点一次'); return }
    setErr(''); setCapturing(true)
    frame.contentWindow?.postMessage({ source: 'lego-forge-host', type: 'capture', payload: { view } }, '*')
  }

  // 跳到对话框：把说明填进新对话输入框（不自动发送）。宿主缺 uiWorkspace 时静默降级（批注仍入队）。
  const jumpToChat = (prompt) => {
    try { appCtx?.uiWorkspace?.startSession(undefined, { prompt, whenDraftExists: 'replace' }) } catch { /* 宿主未就绪 */ }
  }

  const createSet = async () => {
    const n = newName.trim(); if (!n) return
    try {
      await api('/api/set/new', { name: n }); setNewName(''); loadSets(); setName(n)
      // 新建后直接跳到对话，把拼搭任务说明填好
      jumpToChat(`请完成积木工坊新拼搭「${n}」：集合和 brief.md 模板已在面板建好。` +
        `先填 brief.md（主体一句话、比例、3-5 个签名特征、尺寸、4-8 色、主动舍弃项），` +
        `再写 build.mjs 按 Brief → Blockout → Detail → Check → Review → Deliver 六步管线构建，` +
        `PASS 后 shots 渲染自评，最后 action=export 打包交付。`)
    } catch (e) { setErr(e.message) }
  }
  const deleteSet = async () => {
    if (!name || !confirm(`删除集合「${name}」及其全部产物？不可恢复。`)) return
    try { await api('/api/set/delete', { name }); setDetail(null); setName(null); loadSets() } catch (e) { setErr(e.message) }
  }

  const loadBom = async () => {
    if (bom) return
    try {
      const res = await fetch(artifact(name, 'out/parts.csv'))
      const csv = await res.text()
      const rows = csv.split('\n').filter(Boolean).slice(1).map((line) => { const m = line.match(/^([^,]+),"([^"]*)",([^,]+),(\d+)$/); return m ? { id: m[1], name: m[2], color: m[3], qty: Number(m[4]) } : null }).filter(Boolean)
      setBom(rows)
    } catch { setBom([]) }
  }
  const loadReport = async () => {
    if (report) return
    try { const res = await fetch(artifact(name, 'out/report.txt')); setReport(await res.text()) } catch { setReport('（读取失败）') }
  }
  useEffect(() => { if (tab === 'bom') loadBom(); if (tab === 'report') loadReport() }, [tab])     // eslint-disable-line

  const meta = detail?.meta ?? {}
  const versions = detail?.versions ?? []
  const latest = versions[0]?.v ?? null
  const activeV = ver ?? latest
  // 没有版本快照就不该挂 3D iframe：view.html 会去 /api/version 拿数据，拿不到只会甩一句
  // 「加载失败：还没有版本快照」——可这是「刚新建、还没 build」的正常状态，不是错误。
  const hasModel = Boolean(activeV)
  const hasVox = Boolean(detail?.hasVox)
  const pendingCount = (detail?.annotations ?? []).filter((a) => a.status === 'pending').length
  const frameSrc = name && hasModel
    ? `${BASE}/view.html?set=${encodeURIComponent(name)}&v=${activeV}&embed=1${vox && hasVox ? '&data=vox' : ''}`
    : null

  return h('div', { style: { display: 'flex', height: '100%', minHeight: 0, fontFamily: '-apple-system,"PingFang SC","Helvetica Neue",sans-serif', color: '#1f2124' } },
    // ---- 左：项目列表 ----
    h('div', { style: { width: 218, borderRight: '1px solid #e8eaed', display: 'flex', flexDirection: 'column', background: '#fafafa', flexShrink: 0 } },
      h('div', { style: { padding: '10px 12px 6px', fontWeight: 700, fontSize: 13 } }, '集合'),
      h('div', { style: { flex: 1, overflowY: 'auto', padding: '0 8px', display: 'flex', flexDirection: 'column', gap: 4 } },
        sets.length ? sets.map((s) => h('div', {
          key: s.name, onClick: () => setName(s.name),
          style: { padding: '8px 10px', borderRadius: 8, cursor: 'pointer', background: s.name === name ? '#ffe3d6' : 'transparent', border: s.name === name ? '1px solid #f3b7a0' : '1px solid transparent' },
        },
          h('div', { style: { fontWeight: 600, fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 } },
            h('span', { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 } }, s.title || s.name),
            s.pendingAnnotations ? h('span', { style: { background: '#c2410c', color: '#fff', borderRadius: 999, fontSize: 10, padding: '1px 6px', fontWeight: 700 } }, `ⓘ${s.pendingAnnotations}`) : null),
          h('div', { style: { display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' } },
            h(StageChip, { stage: s.stage }),
            s.lastBuild ? h(Chip, { text: s.lastBuild.ok ? `PASS ${s.lastBuild.parts}` : 'FAIL', bg: s.lastBuild.ok ? '#e6f4ea' : '#fce8e6', fg: s.lastBuild.ok ? '#137333' : '#c5221f' }) : null,
            s.versionCount ? h('span', { style: { fontSize: 10, color: '#9aa0a6' } }, `${s.versionCount} 版`) : null)))
          : h('div', { style: st.empty }, '还没有集合。在对话里说「帮我做一个乐高…」，或在下面输入名字新建。')),
      h('div', { style: { padding: 8, borderTop: '1px solid #e8eaed', display: 'flex', gap: 6 } },
        h('input', { placeholder: '新建拼搭名…', value: newName, onChange: (e) => setNewName(e.target.value), style: { ...st.input, flex: 1, minWidth: 0 }, onKeyDown: (e) => { if (e.key === 'Enter') createSet() } }),
        h('button', { style: st.miniBtn, onClick: createSet }, '新建'))),
    // ---- 右：详情 ----
    h('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: '#f6f7f8' } },
      name ? [
        // 头部
        h('div', { key: 'head', style: { padding: '10px 14px', background: '#fff', borderBottom: '1px solid #e8eaed', display: 'flex', gap: 12, alignItems: 'center' } },
          h('div', { style: { minWidth: 0, flex: 1 } },
            h('div', { style: { fontWeight: 700, fontSize: 15, display: 'flex', gap: 8, alignItems: 'center' } },
              h('span', { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, meta.title || name),
              meta.stage ? h(StageChip, { stage: meta.stage }) : null,
              meta.lastBuild ? h(Chip, { text: meta.lastBuild.ok ? `PASS · ${meta.lastBuild.parts} 件` : `FAIL · ${meta.lastBuild.errors} 错误`, bg: meta.lastBuild.ok ? '#e6f4ea' : '#fce8e6', fg: meta.lastBuild.ok ? '#137333' : '#c5221f' }) : null),
            h('div', { style: { fontSize: 11, color: '#9aa0a6', marginTop: 2 } },
              `${name} · ${versions.length} 个版本${meta.lastBuild ? ` · 最近构建 ${fmtTime(meta.lastBuild.ts)}` : ''}`)),
          meta.scores ? h(Radar, { scores: meta.scores }) : null,
          // 导出/下载按钮组：ZIP 一键打包 + 三个交付物分别下载（都构建完成后才出现）
          hasModel ? h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' } },
            h('a', {
              href: `${BASE}/api/export?name=${encodeURIComponent(name)}`, download: '',
              title: '打包 set.html / model.ldr / parts.csv / 渲染图为 ZIP 下载',
              style: { ...st.miniBtn, textDecoration: 'none', fontWeight: 700, color: '#b0603a', borderColor: '#f3b7a0' },
            }, '⬇ 导出 ZIP'),
            ...[['set.html', 'set.html', '3D 页面：双击即看，拖转 / 拆开 / 重建'],
              ['model.ldr', 'model.ldr', '导入 BrickLink Studio / LeoCAD：拼搭步骤 + 购买清单'],
              ['parts.csv', 'parts.csv', '零件清单（每种零件 × 颜色 × 数量）']].map(([f, label, tip]) =>
              h('a', { key: f, href: artifact(name, `out/${f}`), download: f, title: tip, style: { ...st.miniBtn, textDecoration: 'none' } }, `⬇ ${label}`))) : null,
          h('button', { style: st.miniBtn, onClick: () => { loadSets(); loadDetail(name) } }, '刷新'),
          h('button', { style: { ...st.miniBtn, color: '#c5221f' }, onClick: deleteSet }, '删除')),
        // 标签条
        h('div', { key: 'tabs', style: { display: 'flex', gap: 2, padding: '6px 14px 0', background: '#fff', borderBottom: '1px solid #e8eaed' } },
          [['model', '3D 模型'], ['timeline', '时间线'], ['images', `审查图${detail?.images?.length ? ` ${detail.images.length}` : ''}`], ['report', '报告'], ['bom', 'BOM'], ['notes', `批注${pendingCount ? ` ⓘ${pendingCount}` : ''}`]].map(([k, label]) =>
            h('div', {
              key: k, onClick: () => setTab(k),
              style: { padding: '7px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: tab === k ? '#e8734a' : '#5f6368', borderBottom: tab === k ? '2px solid #e8734a' : '2px solid transparent' },
            }, label))),
        err ? h('div', { key: 'err', style: { padding: '6px 14px', fontSize: 12, color: '#c5221f', background: '#fce8e6' } }, err) : null,
        // 内容区
        h('div', { key: 'body', style: { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' } },
          tab === 'model' ? h(ModelTab, {
            frameSrc, versions, activeV, ver, setVer, vox, setVox, hasVox, hasModel, name,
            selection, view, sending, sent, onSend: sendAnnotation, iframeRef, latest,
          })
            : tab === 'timeline' ? h('div', { style: { ...st.pane, overflowY: 'auto' } },
              h(Timeline, { detail, onJump: (v) => { setVer(v); setVox(false); setTab('model') } }),
              h('div', { style: { marginTop: 14 } }, h(VersionCompare, { detail, name })))
            : tab === 'images' ? h(ImagesTab, { detail, name, onZoom: setZoom, frameSrc, iframeRef, capturing, onCapture: capture, hasModel: versions.length > 0 })
            : tab === 'report' ? h('pre', { style: { ...st.pane, overflow: 'auto', margin: 0, font: '12px/1.55 Menlo,Consolas,monospace', whiteSpace: 'pre-wrap', color: '#3c4043' } }, report ?? '加载中…')
            : tab === 'bom' ? h(BomTab, { bom, colors, name })
            : h('div', { style: { ...st.pane, overflowY: 'auto' } }, h(Annotations, { detail, name, onChanged: () => loadDetail(name) }))),
      ] : h('div', { style: { ...st.empty, margin: 'auto' } },
        h('div', { style: { fontSize: 15, fontWeight: 700, marginBottom: 8 } }, '积木工坊'),
        h('div', null, '左侧新建集合，或在对话里说「帮我做一个乐高街景」。agent 构建时，这里会实时直播全过程。'))),
    // 大图浮层
    zoom ? h('div', { onClick: () => setZoom(null), style: { position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' } },
      h('img', { src: zoom, style: { maxWidth: '92%', maxHeight: '92%', borderRadius: 8 } })) : null)
}

function ModelTab({ frameSrc, versions, activeV, ver, setVer, vox, setVox, hasVox, hasModel, name, selection, view, sending, sent, onSend, iframeRef, latest }) {
  return h('div', { style: { flex: 1, minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column' } },
    h('div', { style: { display: 'flex', gap: 6, alignItems: 'center', padding: '6px 10px', background: '#fff', borderBottom: '1px solid #e8eaed', flexWrap: 'wrap' } },
      h('span', { style: { fontSize: 11, color: '#5f6368' } }, '版本'),
      h('select', {
        value: ver ?? '', disabled: !versions.length,
        onChange: (e) => setVer(e.target.value ? Number(e.target.value) : null),
        style: { ...st.input, padding: '3px 8px', fontSize: 12, opacity: versions.length ? 1 : .5 },
      },
        h('option', { value: '' }, latest ? `最新 v${latest}` : '（还没有构建）'),
        [...versions].reverse().map((v) => h('option', { key: v.v, value: v.v }, `v${v.v} · ${v.parts ?? '?'} 件 · ${v.ok ? 'PASS' : 'FAIL'}`))),
      h('label', {
        title: hasVox ? '并排看设计意图（体素）与砌出来的砖块' : '这个集合还没有体素快照——build 一次后才有',
        style: { display: 'flex', gap: 4, alignItems: 'center', fontSize: 11, color: hasVox ? '#5f6368' : '#bdc1c6', cursor: hasVox ? 'pointer' : 'not-allowed' },
      },
        h('input', { type: 'checkbox', checked: vox && hasVox, disabled: !hasVox, onChange: (e) => setVox(e.target.checked) }), '体素（设计意图）'),
      hasModel ? h('span', { style: { fontSize: 11, color: '#9aa0a6' } }, '拖转 · 滚轮缩放 · Take apart / Rebuild') : null),
    frameSrc ? h('iframe', {
      key: frameSrc, ref: iframeRef, src: frameSrc,
      style: { flex: 1, width: '100%', border: 0, background: '#f2f0ea' },
      allow: 'clipboard-write',
    }) : h('div', { style: { ...st.empty, padding: 32, textAlign: 'center', margin: 'auto', maxWidth: 460 } },
      h('div', { style: { fontSize: 13, fontWeight: 700, color: '#5f6368', marginBottom: 8 } }, hasModel ? '3D 预览加载中…' : '还没有可看的模型'),
      h('div', null, hasModel
        ? '正在准备 3D 视图…'
        : `「${name}」在面板里只建了脚手架（brief.md + build.mjs）。在对话里说「build 一下 ${name}」，第一次构建完成后这里会自动出现 3D 模型、版本选择与批注工具。`)),
    hasModel ? h(AnnotateBar, { selection, view, onSend: onSend, sending, sent }) : null)
}

function ImagesTab({ detail, name, onZoom, frameSrc, iframeRef, capturing, onCapture, hasModel }) {
  const images = detail?.images ?? []
  const [view, setView] = useState('hero')
  const [show, setShow] = useState(!images.length)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    setReady(false)
    const onReady = (ev) => {
      if (ev.data?.source === 'lego-forge-viewer' && ev.data.type === 'ready') setReady(true)
    }
    addEventListener('message', onReady)
    return () => removeEventListener('message', onReady)
  }, [frameSrc])
  const label = (f) => f.replace('preview/', '').replace('.png', '').replace('.jpg', '')
  const VIEWS = ['hero', 'front', 'back', 'left', 'right', 'top']
  const disabled = capturing || !hasModel || (show && !ready)
  const btnText = !hasModel ? '还没 build，无 3D 可截'
    : capturing ? '生成中…' : (show && !ready) ? '3D 加载中…' : show ? '截取当前视角' : '用面板渲染出图'
  const toolbar = h('div', { style: { display: 'flex', gap: 8, alignItems: 'center', padding: '8px 12px', background: '#fff', borderBottom: '1px solid #e8eaed', flexWrap: 'wrap' } },
    h('span', { style: { fontSize: 11, color: '#5f6368' } }, '面板渲染：不装 Chromium 也能出审查图'),
    h('select', { value: view, onChange: (e) => setView(e.target.value), style: { ...st.input, padding: '3px 8px', fontSize: 12 } },
      VIEWS.map((v) => h('option', { key: v, value: v }, v))),
    h('button', { style: st.primaryBtn, disabled, onClick: () => show ? onCapture(view) : setShow(true) }, btnText),
    images.length ? h('button', { style: { ...st.primaryBtn, background: '#f1f3f4', color: '#3c4043' }, onClick: () => setShow(!show) }, show ? '收起 3D 预览' : '展开 3D 预览') : null)
  const preview = show && frameSrc
    ? h('iframe', { key: 'capture-' + frameSrc, ref: iframeRef, src: frameSrc + '&cap=1',
      style: { width: '100%', height: 260, border: 0, background: '#f2f0ea', flexShrink: 0 }, allow: 'clipboard-write' })
    : null
  const grid = images.length
    ? h('div', { style: { ...st.pane, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 10, alignContent: 'start', alignItems: 'start' } },
      images.map((f) => h('div', { key: f, onClick: () => onZoom(artifact(name, `out/${f}`)), style: { background: '#fff', border: '1px solid #e8eaed', borderRadius: 8, overflow: 'hidden', cursor: 'zoom-in' } },
        h('img', { src: artifact(name, `out/${f}`), style: { width: '100%', display: 'block', background: '#f2f0ea' }, loading: 'lazy' }),
        h('div', { style: { fontSize: 11, fontWeight: 600, padding: '5px 8px', color: '#5f6368' } }, label(f)))))
    : h('div', { style: { ...st.empty, padding: 16 } }, hasModel
      ? '还没有渲染图。等下面的 3D 预览出现后，选好视角点「截取当前视角」即可存盘；也可让 agent 执行 shots 出六视图。'
      : '还没有渲染图——先在对话里让 agent build 一次，再用面板渲染出图。')
  return h('div', { style: { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' } }, toolbar, preview, grid)
}

function BomTab({ bom, colors, name }) {
  if (!bom) return h('div', { style: st.empty }, '加载中…')
  if (!bom.length) return h('div', { style: st.empty }, '还没有 BOM——先 build 一次')
  const total = bom.reduce((s, r) => s + r.qty, 0)
  const swatch = (color) => {
    const hex = colors[String(color).toLowerCase()]
    return h('span', { title: color, style: { display: 'inline-block', width: 12, height: 12, borderRadius: 3, background: hex ?? '#d5d8dc', border: '1px solid rgba(0,0,0,.15)', marginRight: 6, verticalAlign: '-2px' } })
  }
  return h('div', { style: { ...st.pane, overflowY: 'auto' } },
    h('div', { style: { fontSize: 12, color: '#5f6368', marginBottom: 8 } }, `共 ${bom.length} 种零件 · ${total} 件——model.ldr 可导入 BrickLink Studio 生成拼搭步骤与购买清单`),
    name ? h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 } },
      [['set.html', '3D 页面（双击即看）'], ['model.ldr', 'model.ldr（BrickLink Studio）'], ['parts.csv', 'parts.csv（零件清单）']].map(([f, label]) =>
        h('a', { key: f, href: artifact(name, `out/${f}`), download: f, title: `下载 ${f}`, style: { ...st.miniBtn, textDecoration: 'none' } }, `⬇ ${label}`))) : null,
    h('table', { style: { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, fontSize: 12 } },
      h('thead', null, h('tr', { style: { textAlign: 'left', color: '#5f6368', borderBottom: '1px solid #e8eaed' } },
        h('th', { style: { padding: '6px 10px' } }, '色'), h('th', null, '零件 id'), h('th', null, '名称'), h('th', null, '颜色'), h('th', { style: { textAlign: 'right' } }, '数量'))),
      h('tbody', null, bom.map((r, i) => h('tr', { key: i, style: { borderBottom: '1px solid #f1f3f4' } },
        h('td', { style: { padding: '5px 10px' } }, swatch(r.color)),
        h('td', { style: { fontFamily: 'Menlo,Consolas,monospace' } }, r.id),
        h('td', { style: { color: '#5f6368' } }, r.name),
        h('td', null, r.color),
        h('td', { style: { textAlign: 'right', fontWeight: 700 } }, r.qty))))))
}

// ---------- 样式 ----------
const st = {
  input: { padding: '6px 10px', border: '1px solid #d9d9de', borderRadius: 8, background: '#fff', color: '#1a1a1a', outline: 'none', fontSize: 12 },
  miniBtn: { font: 'inherit', fontSize: 11, fontWeight: 600, border: '1px solid #d9d9de', borderRadius: 999, padding: '4px 10px', background: '#fff', cursor: 'pointer', color: '#3c4043', whiteSpace: 'nowrap' },
  primaryBtn: { font: 'inherit', fontSize: 12, fontWeight: 700, border: 0, borderRadius: 999, padding: '7px 16px', background: '#e8734a', color: '#fff', cursor: 'pointer', whiteSpace: 'nowrap' },
  empty: { padding: 24, fontSize: 12, color: '#9aa0a6', lineHeight: 1.7 },
  pane: { flex: 1, minHeight: 0, padding: 12 },
  annotateBar: {
    position: 'absolute', left: 12, right: 12, bottom: 12, zIndex: 20,
    display: 'flex', gap: 8, alignItems: 'center', padding: '9px 12px',
    background: 'rgba(255,255,255,.96)', border: '1px solid #e0e3e7', borderRadius: 12,
    boxShadow: '0 8px 24px rgba(0,0,0,.14)', backdropFilter: 'blur(6px)', fontSize: 12,
  },
}

// ---------- 挂载 ----------
let appCtx = null            // 宿主 ctx：面板组件用它调 uiWorkspace 跳到对话框
exports.inject = ['slots', 'uiWorkspace']
exports.apply = (ctx) => {
  appCtx = ctx
  ctx.slots.inject('sidebar.panellist', () =>
    ctx.slots.register({ name: 'sidebar.panellist', id: PANEL_ID, order: 9, label: () => '积木工坊' }, StudioIcon))
  ctx.slots.inject('main', () =>
    ctx.slots.register({ name: 'main', key: PANEL_ID }, StudioPanel))
}
