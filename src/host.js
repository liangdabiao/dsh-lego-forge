// ============================================================================
// 积木工坊 · Host 半边（Node 主进程，纯 ESM 零构建）。
// 工具：lego_forge（new/build/shots/review/stage/annotations/read/list/example/docs/parts/part）。
// webServer 前缀路由：面板数据面（与工具共用 lib/runner.js、lib/annotate.js，一份逻辑两个入口）。
// 引擎进程内直驱：lib/runner.js 动态 import 集合的 build.mjs，无 CLI 子进程。
// 核心闭环：面板 3D 里点选/框选 → 批注队列 → 系统提示词动态注入 + 工具回执捎带 → agent 改 build.mjs → 面板看新版。
// ============================================================================
import Schema from '@deepseek-ai/schemastery'
import {
  newSet, buildSet, shotsSet, reviewSet, stageSet, readSet, listSets,
  exampleCopy, docsText, partsSearch, partASCII,
} from '../lib/runner.js'
import { pendingText, pendingJson, resolveIds, STAGES, pending, describe } from '../lib/annotate.js'
import { setDir } from '../lib/project.js'
import { exportSet } from '../lib/exporter.js'
import { registerApi } from '../lib/api.js'

export const name = 'lego-forge' // = cordis.patch.yml 的 id

export const inject = ['tools', 'webServer', 'connection']
// systemPrompt 不列入 inject：缺席时只跳过提示词段落，不能让整个插件失活（见 apply 里的能力探测）。

// ---------------------------------------------------------------------------
// 用户配置。setsRoot：集合存放根目录（默认 $DSH_HOME/lego-forge）。
// keepVersions：版本快照保留数（时间线对比用，默认 12）。
// autoRender：build PASS 后是否自动 quick 渲染（需 playwright，默认关——迭代节奏由 skill 控制）。
// ---------------------------------------------------------------------------
export const Config = Schema.object({
  setsRoot: Schema.string().default('').description('集合存放根目录（留空 = $DSH_HOME/lego-forge）'),
  keepVersions: Schema.number().min(3).max(60).default(12).description('保留最近多少个构建版本（面板时间线对比用）'),
  autoRender: Schema.boolean().default(false).description('build 通过后自动渲染 quick 预览图（需要 playwright）'),
})

const configRef = { config: Config }

// 手写参数校验（原生注册工具 dsh 不代验参数，家族既定模式）
function check(args, spec) {
  const problems = []
  for (const key of spec.required || []) {
    if (args?.[key] === undefined) problems.push(`缺少必填参数 ${key}`)
  }
  for (const [key, rule] of Object.entries(spec.properties || {})) {
    const value = args?.[key]
    if (value === undefined) continue
    if (rule.enum && !rule.enum.includes(value)) problems.push(`${key} 只能是 ${rule.enum.join(' / ')} 之一`)
  }
  for (const key of Object.keys(args || {})) {
    if (!spec.properties || !(key in spec.properties)) problems.push(`未知参数 ${key}`)
  }
  if (problems.length) throw new Error(`lego_forge 参数有误：${problems.join('；')}。`)
}

const str = (description, extra = {}) => ({ type: 'string', description, ...extra })
const num = (description, extra = {}) => ({ type: 'number', description, ...extra })
const text = (value) => [{ type: 'text', text: value }]

const OUTPUT = {
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['ok', 'summary'],
    properties: {
      ok: { type: 'boolean' },
      summary: { type: 'string', description: '给模型看的回执' },
      data: { type: 'string', description: '可选：报告/BOM/批注 JSON 等结构化文本' },
    },
  },
  render: (_args, value) => text(value.data ? `${value.summary}\n\n${value.data}` : value.summary),
}

const result = (ok, summary, data = '') => ({ ok, summary, data })

const PANEL_HINT = '用户可在侧栏「积木工坊」面板实时查看 3D 模型、构建时间线，并直接在 3D 里框选区域批注。'
const STAGE_ENUM = ['Brief', 'Blockout', 'Detail', 'Check', 'Review', 'Deliver']

// ---------------------------------------------------------------------------
// 工具：lego_forge
// ---------------------------------------------------------------------------
export const legoForgeTool = {
  name: 'lego_forge',
  description:
    '把一句话想法或一张参考图变成一套真实可拼的 LEGO 积木（450 种真零件、可拼搭性硬检查、set.html 3D / model.ldr / BOM）。' +
    '用户想「做乐高模型/拼积木/搭街景/生成拼搭说明书」时使用。工作目录 $DSH_HOME/lego-forge/<集合名>/：brief.md + build.mjs（你写）→ action=build 出模型。' +
    '六步管线：Brief → Blockout（只搭大块看剪影）→ Detail（kit.building/vehicle/minifig 起步）→ Check（0 错误硬门槛）→ Review（看渲染图按 RUBRIC 六行打分，每行 ≥7 才交付）→ Deliver。' +
    '面板回执里出现的「面板批注」是用户在 3D 里框选的区域+附言，必须优先处理。',
  parameters: {
    type: 'object',
    additionalProperties: false,
    required: ['action'],
    properties: {
      action: str('new 建集合；build 构建并检查；shots 渲染审查图；review 提交 RUBRIC 评分；stage 推进管线阶段；annotations 拉/销面板批注；read 读产物；list 列集合；example 拷官方示例；docs 打印参考文档；parts 搜零件；part 单零件销位图；export 打包交付物为 ZIP（set.html/model.ldr/parts.csv/渲染图）', { enum: ['new', 'build', 'shots', 'review', 'stage', 'annotations', 'read', 'list', 'example', 'docs', 'parts', 'part', 'export'] }),
      name: str('集合名（可中文，如 corner-bakery / 街角面包店）'),
      title: str('new 可选：展示标题'),
      as: str('example 可选：拷入后的新集合名'),
      view: str('shots 可选：hero/front/back/left/right/top（默认 hero）'),
      only: str('shots 可选：只渲染某个 section（tag）'),
      ref: str('shots 可选：参考图绝对路径，生成左参考右渲染的 compare.png'),
      quick: str('shots 可选：true=快速双视图（迭代循环用，出图快），默认 false 出六视图+主视图', { enum: ['true', 'false'] }),
      az: num('shots 可选：自定义方位角（度，配合 el）——处理面板批注时用批注里的 view.azimuth'),
      el: num('shots 可选：自定义仰角（度）'),
      scores: str('review 必填：RUBRIC 六行分数对象，键 recognisable/proportion/structure/detail/colour/composition，每行 1-10'),
      critiques: str('review 必填：≥5 条具体批评（写进 brief.md 的 Review log）'),
      stage: str('stage 必填：管线阶段', { enum: STAGE_ENUM }),
      resolve: str('annotations 可选：要销账的批注 id（逗号分隔）；缺省=列出全部待处理'),
      what: str('read 必填：report 检查报告 / check 结构化检查 / bom 零件清单 / brief / build 构建脚本 / versions 版本历史', { enum: ['report', 'check', 'bom', 'brief', 'build', 'versions'] }),
      which: str('docs 必填：rubric 评分标准 / techniques 拼搭技法 / colors 色表 / parts 零件表 / reference 官方街景基准', { enum: ['rubric', 'techniques', 'colors', 'parts', 'reference'] }),
      query: str('parts 必填：搜索关键词（空格分词，如 "brick 1x4"、"slope curve"、"bracket"）'),
      id: str('part 必填：零件 id（如 3001）'),
    },
  },
  timeoutMs: 300_000,
  output: OUTPUT,
  async execute(args) {
    check(args, this.parameters)
    const cfg = configRef.config
    try {
      if (args.action === 'new') {
        if (!args.name) throw new Error('new 需要 name（集合名）')
        const out = newSet(cfg, args.name, args.title)
        return result(true,
          `已创建集合「${out.title}」（${out.name}）：brief.md + build.mjs 脚手架已生成。下一步：把 brief 填进 brief.md（主体一句话/比例/3-5 个签名特征/尺寸/4-8 色/主动舍弃项），然后写 build.mjs 从 Blockout 开始。${PANEL_HINT}`)
      }

      if (args.action === 'build') {
        if (!args.name) throw new Error('build 需要 name（集合名）')
        const out = await buildSet(cfg, args.name)
        const annotations = pendingText(setDir(cfg, args.name))
        const tail = out.ok
          ? ` 下一步：action=shots 看渲染图再自评（没看过渲染图的集合不许交付）。`
          : ` 读 data 字段里的错误清单修因不修症，改完重新 build。`
        return result(out.ok,
          `「${args.name}」${out.line}。${tail}${annotations}`,
          out.ok ? '' : out.summary.slice(0, 5500))
      }

      if (args.action === 'shots') {
        if (!args.name) throw new Error('shots 需要 name（集合名）')
        const out = await shotsSet({
          config: cfg, name: args.name, view: args.view, only: args.only,
          ref: args.ref, quick: args.quick === 'true', az: args.az, el: args.el,
        })
        const annotations = out.ok ? pendingText(setDir(cfg, args.name)) : ''
        // needsPlaywright / blocked 的引导话术已经在 summary 里，别再塞进 data（渲染会重复一遍）
        return result(out.ok, `${out.summary}${annotations}`)
      }

      if (args.action === 'review') {
        if (!args.name) throw new Error('review 需要 name（集合名）')
        let scores
        try { scores = typeof args.scores === 'string' ? JSON.parse(args.scores) : args.scores } catch { throw new Error('scores 要是 JSON 对象，如 {"recognisable":8,"proportion":6,...}') }
        if (!args.critiques) throw new Error('review 需要 critiques（≥5 条具体批评）——先看渲染图再评分')
        const out = reviewSet(cfg, args.name, scores, args.critiques)
        return result(out.ok, `「${args.name}」${out.summary}`)
      }

      if (args.action === 'export') {
        if (!args.name) throw new Error('export 需要 name（集合名）')
        const out = exportSet(cfg, args.name)
        const kb = (out.bytes / 1024).toFixed(0)
        return result(true,
          `「${args.name}」已导出：${out.download}（${out.entries.length} 个文件，${kb} KB）。` +
          `文件在 ${setDir(cfg, args.name)}\\out\\${out.file.replace('/', '\\')}；` +
          `面板「积木工坊」详情页的「导出 ZIP」按钮可一键下载（同款 ZIP）。`)
      }

      if (args.action === 'stage') {
        if (!args.name || !args.stage) throw new Error('stage 需要 name 和 stage')
        const out = stageSet(cfg, args.name, args.stage)
        return result(true, `「${args.name}」阶段已推进到 ${out.stage}。面板时间线已同步。`)
      }

      if (args.action === 'annotations') {
        if (!args.name) throw new Error('annotations 需要 name（集合名）')
        const dir = setDir(cfg, args.name)
        if (args.resolve) {
          const ids = String(args.resolve).split(',').map((s) => s.trim()).filter(Boolean)
          const n = resolveIds(dir, ids)
          return result(true, `已销账 ${n} 条批注（${ids.join(', ')}）。修改完成后记得 build 一次让面板看到新版。`)
        }
        const json = pendingJson(dir)
        if (!json) return result(true, `「${args.name}」当前没有待处理的面板批注。`)
        return result(true, `「${args.name}」有待处理批注（结构化数据在 data 字段）：`, json)
      }

      if (args.action === 'read') {
        if (!args.name || !args.what) throw new Error('read 需要 name 和 what')
        const data = readSet(cfg, args.name, args.what)
        if (!data || data === '{}' || data === '') return result(true, `「${args.name}」的 ${args.what} 为空（可能还没构建）`)
        return result(true, `「${args.name}」的 ${args.what}：`, data.slice(0, 30000))
      }

      if (args.action === 'list') {
        const sets = listSets(cfg)
        if (!sets.length) return result(true, '还没有任何集合。用 action=new 创建，或 action=example 拷一个官方范本（cottage / retro-computer）。')
        const lines = sets.map((s) => {
          const score = s.scores ? ` · 评分 ${Object.values(s.scores).join('/')}` : ''
          const ann = s.pendingAnnotations ? ` · ⓘ${s.pendingAnnotations} 条面板批注待处理` : ''
          const build = s.lastBuild ? ` · 上次构建 ${s.lastBuild.ok ? 'PASS' : 'FAIL'} ${s.lastBuild.parts} 件` : ''
          return `  ${s.name} — ${s.title}（${s.stage ?? '—'}${build}${score}${ann}${s.versionCount ? ` · ${s.versionCount} 版` : ''}）`
        })
        return result(true, `共 ${sets.length} 个集合：\n${lines.join('\n')}${PANEL_HINT}`)
      }

      if (args.action === 'example') {
        if (!args.name) throw new Error(`example 需要 name：cottage / retro-computer`)
        const out = exampleCopy(cfg, args.name, args.as)
        return result(true, `已拷入官方示例 ${args.name} → 集合「${out.name}」（含 build.mjs 与现成渲染）。先读它的 build.mjs 学技法，再 action=build 复现，然后开始改造成用户要的。${PANEL_HINT}`)
      }

      if (args.action === 'docs') {
        if (!args.which) throw new Error(`docs 需要 which：rubric / techniques / colors / parts / reference`)
        return result(true, `${args.which} 文档：`, docsText(args.which).slice(0, 30000))
      }

      if (args.action === 'parts') {
        const data = await partsSearch(args.query)
        // 摘要取第一行，正文去掉这一行——否则渲染时 summary + data 会把表头打两遍
        const [head, ...rest] = data.split('\n')
        return result(true, head, rest.join('\n').trim())
      }

      if (args.action === 'part') {
        if (!args.id) throw new Error('part 需要 id（零件编号，如 3001）')
        return result(true, `零件 ${args.id}：`, await partASCII(args.id))
      }

      throw new Error(`未知 action：${args.action}`)
    } catch (err) {
      return result(false, `✗ ${err?.message || err}`)
    }
  },
}

// ---------------------------------------------------------------------------
// 注册
// ---------------------------------------------------------------------------
/** 待处理面板批注的动态系统提示词：text 每次组装提示词时实时读盘，无批注返回空串。
 *  section({name, order, text}) 的签名依据 dsh-tools/lib/index.js 与官方 practices 的
 *  "Add prompt text with ctx.systemPrompt.section()"。 */
function pendingSection(config) {
  const sets = listSets(config).filter((s) => s.pendingAnnotations > 0)
  if (!sets.length) return ''
  const blocks = sets.map((s) => {
    const list = pending(setDir(config, s.name))
    const lines = list.slice(-5).map((a) => `  - ${a.id}：${a.note ? `「${a.note}」` : '（无附言）'} ${describe(a)}`).join('\n')
    return `「${s.name}」${list.length} 条待处理：\n${lines}`
  })
  return `## 积木工坊：用户从面板发来的修改批注\n${blocks.join('\n\n')}\n` +
    `这些是用户在 3D 里框选区域后写下的修改要求，优先级高于你自己的造型判断。` +
    `重要：框选是**大致位置和方向，不是精确 bbox**——以 sections 标签和零件构成推断用户意图` +
    `（例：选区里 100 块屋顶斜面 = 想在屋顶加老虎窗/改屋顶，而不是在墙上打洞；零件清单里占绝对多数的那类就是主体），` +
    `bbox 只用来确认大概区域和朝向。` +
    `先用 lego_forge 的 action=annotations 拉取结构化数据（bbox / sections / parts / 视角），改对应 build.mjs 后 build 一次，` +
    `最后用 action=annotations 的 resolve 参数按 id 销账。`
}

export function apply(ctx, config) {
  configRef.config = config
  ctx.tools.register(legoForgeTool)
  ctx.effect(() => registerApi(ctx, configRef), `${name}: routes`)
  // systemPrompt 走 ctx.inject 可选注入：宿主没有该服务时这段提示词不挂，但插件照常激活。
  // 注意不能直接读 ctx.systemPrompt —— 未在 inject 里声明的服务，Cordis 的 ctx 代理会抛
  // "cannot get property "systemPrompt" without inject"，整个插件都不激活（0.1.0 实测就栽在这）。
  // 也不宜写进顶层 inject：那是「必需依赖」，缺服务的 profile 里插件会直接不加载。
  ctx.inject(['systemPrompt'], (sp) => {
    sp.effect(() => sp.systemPrompt.section({
      name: `${name}:annotations`,
      order: 117,
      text: () => pendingSection(configRef.config),
    }), `${name}: pending annotations`)
  })
}
