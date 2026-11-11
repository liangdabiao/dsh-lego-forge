// Host 半边装配测试：插件形态、服务注入方式、工具回执文案。
// 最有价值的一条：仿真 Cordis 的 ctx 代理——未在 inject 里声明的服务，读取即抛
// "cannot get property ... without inject"。0.1.0 就是直接读 ctx.systemPrompt 导致
// 整个插件不激活（plugin_manager 报 1 entry did not activate）。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const tmp = mkdtempSync(join(tmpdir(), 'lego-forge-host-'))
process.env.DSH_HOME = tmp

const host = await import('../src/host.js')
const { newSet } = await import('../lib/runner.js')
const { enqueue } = await import('../lib/annotate.js')
const { setDir } = await import('../lib/project.js')

/** 仿真宿主 ctx：只有 inject 里声明的服务可读，其余像 Cordis 一样抛错 */
function makeCtx({ withSystemPrompt = true } = {}) {
  const rec = { tools: [], routes: [], sections: [], deferred: [] }
  const build = (allowSystemPrompt) => {
    const real = {
      tools: { register: (t) => { rec.tools.push(t); return () => {} } },
      webServer: { register: (r) => { rec.routes.push(r); return () => {} } },
      connection: {},
      effect: (fn) => { const d = fn(); return () => { if (typeof d === 'function') d() } },
      inject: (deps, cb) => { rec.deferred.push(deps); if (!withSystemPrompt) return {}; cb(build(true)) },
      get: () => undefined,
    }
    if (allowSystemPrompt) real.systemPrompt = { section: (s) => { rec.sections.push(s); return () => {} } }
    return new Proxy(real, {
      get(target, prop) {
        if (typeof prop === 'symbol' || prop in target) return target[prop]
        throw new Error(`cannot get property "${String(prop)}" without inject`)
      },
    })
  }
  return { ctx: build(false), rec }
}

test('apply：工具/路由注册，systemPrompt 走可选注入而非直接读 ctx', () => {
  const { ctx, rec } = makeCtx()
  assert.doesNotThrow(() => host.apply(ctx, host.Config({})))
  assert.deepEqual(host.inject, ['tools', 'webServer', 'connection'])
  assert.equal(rec.tools[0].name, 'lego_forge')
  assert.equal(rec.routes[0].path, '/lego-forge')
  assert.equal(rec.routes[0].kind, 'prefix')
  assert.deepEqual(rec.deferred, [['systemPrompt']])
  assert.equal(rec.sections.length, 1)
  assert.equal(rec.sections[0].name, 'lego-forge:annotations')
  assert.equal(typeof rec.sections[0].text, 'function')
})

test('apply：宿主没有 systemPrompt 服务时插件仍激活（不抛、工具与路由照常注册）', () => {
  const { ctx, rec } = makeCtx({ withSystemPrompt: false })
  assert.doesNotThrow(() => host.apply(ctx, host.Config({})))
  assert.equal(rec.tools.length, 1)
  assert.equal(rec.routes.length, 1)
  assert.equal(rec.sections.length, 0)
})

test('系统提示词段落：无批注返回空串，有批注时带 id/附言/坐标', () => {
  const { ctx, rec } = makeCtx()
  host.apply(ctx, host.Config({}))
  const text = rec.sections[0].text
  assert.equal(text(), '')

  const name = '提示词测试'
  newSet(host.Config({}), name, 'Prompt Test')
  enqueue(setDir(host.Config({}), name), name, {
    kind: 'region',
    bbox: { x0: 1, y0: 10, z0: 2, x1: 8, y1: 16, z1: 6 },
    sections: ['cottage'],
    parts: [{ id: '3039', color: '#6C6E68', count: 12 }],
    count: 12,
    view: { azimuth: 35.5, elevation: 24.1 },
    note: '屋顶换成深色',
  })
  const body = text()
  assert.match(body, /积木工坊：用户从面板发来的修改批注/)
  assert.match(body, /屋顶换成深色/)
  assert.match(body, /an_/)
  assert.match(body, /3039/)
})

test('stage 回执不出现 undefined（stageSet 只返回 stage，没有 summary 字段）', async () => {
  const cfg = host.Config({})
  const name = '回执测试'
  newSet(cfg, name, 'Receipt Test')
  const out = await host.legoForgeTool.execute.call(host.legoForgeTool, { action: 'stage', name, stage: 'Detail' })
  assert.equal(out.ok, true)
  assert.doesNotMatch(out.summary, /undefined/)
  assert.match(out.summary, /阶段已推进到 Detail/)
})

test('parts 回执：摘要与正文不重复表头，且 1x4 能匹配零件名里的 "1 x 4"', async () => {
  const out = await host.legoForgeTool.execute.call(host.legoForgeTool, { action: 'parts', query: 'brick 1x4' })
  assert.equal(out.ok, true)
  assert.match(out.summary, /匹配 3 个/)
  assert.ok(!out.data.startsWith('匹配'), '正文不该再把表头写一遍')
  assert.match(out.data, /3010/)
  assert.match(out.data, /Brick 1 x 4/)
})

test('build 失败时回执与 data 都不出现 undefined，data 里带错误详情', async () => {
  const cfg = host.Config({})
  const name = '坏脚本'
  newSet(cfg, name, 'Broken')
  const { writeFileSync } = await import('node:fs')
  writeFileSync(join(setDir(cfg, name), 'build.mjs'), 'export default function () { throw new Error("boom") }\n')
  const out = await host.legoForgeTool.execute.call(host.legoForgeTool, { action: 'build', name })
  assert.equal(out.ok, false)
  assert.doesNotMatch(out.summary, /undefined/)
  assert.match(out.summary, /构建未通过/)
  assert.match(out.data, /boom/)
})

test.after(() => rmSync(tmp, { recursive: true, force: true }))
