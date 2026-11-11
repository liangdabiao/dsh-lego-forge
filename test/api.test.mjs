// api.js 单测：mock ctx/req/res 走真实 handler——鉴权放行、sets 列表、annotate 入队、产物安全读取。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { registerApi, requestRejection } from '../lib/api.js'

const config = { setsRoot: mkdtempSync(join(tmpdir(), 'lego-forge-api-')) }
const captured = []
const ctx = {
  get: () => null, // 无 connection 服务 → 放行（0.2.x 宿主已 token 鉴权）
  webServer: { register: (x) => captured.push(x) },
}
registerApi(ctx, { config })
const handler = captured[0].handler
assert.equal(captured[0].path, '/lego-forge')

function mockReq(method, url, headers = {}, body) {
  const chunks = body ? [Buffer.from(JSON.stringify(body))] : []
  return {
    method, url, headers,
    on(ev, cb) { if (ev === 'data') chunks.forEach((c) => cb(c)); if (ev === 'end') cb() },
  }
}
function mockRes() {
  const res = { statusCode: 0, headers: {}, body: null }
  res.writeHead = (s, h) => { res.statusCode = s; Object.assign(res.headers, h) }
  res.end = (b) => { res.body = b?.toString() ?? '' }
  return res
}

test('未注册鉴权服务时放行；/api/health 可用', async () => {
  const res = mockRes()
  await handler(mockReq('GET', '/lego-forge/api/health'), res)
  assert.equal(res.statusCode, 200)
  assert.deepEqual(JSON.parse(res.body), { ok: true, plugin: 'lego-forge' })
})

test('requestRejection 有服务时按其返回拦截', () => {
  const ctx2 = { get: () => ({ requestRejection: () => 401 }) }
  assert.equal(requestRejection(ctx2, { headers: {} }), 401)
  const ctx3 = { get: () => ({}) }
  assert.equal(requestRejection(ctx3, { headers: {} }), false)
})

test('annotate POST 入队 + GET /api/set 能读到', async () => {
  mkdirSync(join(config.setsRoot, 'demo'), { recursive: true })
  writeFileSync(join(config.setsRoot, 'demo/build.mjs'), 'x')
  let res = mockRes()
  await handler(mockReq('POST', '/lego-forge/api/annotate', { 'content-type': 'application/json', host: 'x' }, {
    name: 'demo', annotation: { kind: 'section', sections: ['roof'], note: '屋顶换色', count: 12 },
  }), res)
  assert.equal(res.statusCode, 200)
  const ann = JSON.parse(res.body).annotation
  assert.equal(ann.note, '屋顶换色')

  res = mockRes()
  await handler(mockReq('GET', '/lego-forge/api/set?name=demo'), res)
  const detail = JSON.parse(res.body)
  assert.equal(detail.annotations.length, 1)
  assert.equal(detail.annotations[0].status, 'pending')
})

test('api/version 无版本快照时 404；annotate resolve', async () => {
  let res = mockRes()
  await handler(mockReq('GET', '/lego-forge/api/version?name=demo'), res)
  assert.equal(res.statusCode, 404)

  res = mockRes()
  await handler(mockReq('GET', '/lego-forge/api/set?name=demo'), res)
  const id = JSON.parse(res.body).annotations[0].id
  res = mockRes()
  await handler(mockReq('POST', '/lego-forge/api/annotate/resolve', { 'content-type': 'application/json', host: 'x' }, { name: 'demo', ids: [id] }), res)
  assert.equal(JSON.parse(res.body).resolved, 1)
})

test('artifact 路径穿越被拒绝', async () => {
  const res = mockRes()
  await handler(mockReq('GET', '/lego-forge/api/artifact/demo/..%2F..%2Fsecret.txt'), res)
  assert.equal(res.statusCode, 404)
})

test('集合名不存在时 404/报错不炸进程', async () => {
  const res = mockRes()
  await handler(mockReq('GET', '/lego-forge/api/set?name=不存在'), res)
  assert.ok(res.statusCode >= 400)
})

test('render-callback 把面板截图存进 preview，GET /api/set 可见；非法载荷被拒', async () => {
  mkdirSync(join(config.setsRoot, 'demo'), { recursive: true })
  writeFileSync(join(config.setsRoot, 'demo/build.mjs'), 'x')
  const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), Buffer.from('body')])
  const image = 'data:image/png;base64,' + png.toString('base64')
  let res = mockRes()
  await handler(mockReq('POST', '/lego-forge/api/render-callback', { 'content-type': 'application/json', host: 'x' }, { name: 'demo', view: 'hero', image }), res)
  assert.equal(res.statusCode, 200)
  assert.equal(JSON.parse(res.body).file, 'preview/panel-hero.png')

  res = mockRes()
  await handler(mockReq('GET', '/lego-forge/api/set?name=demo'), res)
  assert.ok(JSON.parse(res.body).images.includes('preview/panel-hero.png'))

  res = mockRes()
  await handler(mockReq('POST', '/lego-forge/api/render-callback', { 'content-type': 'application/json', host: 'x' }, { name: 'demo', view: 'hero', image: 'data:text/plain,xx' }), res)
  assert.equal(res.statusCode, 400)
})

test('GET /api/set 带 hasVox：没有体素快照时面板据此禁用「体素对照」开关', async () => {
  // 没有 vox.json（还没 build 或体素超上限）
  let res = mockRes()
  await handler(mockReq('GET', '/lego-forge/api/set?name=demo'), res)
  assert.equal(JSON.parse(res.body).hasVox, false)

  // build 落过 vox.json
  writeFileSync(join(config.setsRoot, 'demo/vox.json'), '{"meta":{},"geo":{},"inst":[]}')
  res = mockRes()
  await handler(mockReq('GET', '/lego-forge/api/set?name=demo'), res)
  assert.equal(JSON.parse(res.body).hasVox, true)
})
