// annotate.js 单测：入队/销账/回执文案/清洗。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { enqueue, pending, pendingText, pendingJson, resolveIds, listAll } from '../lib/annotate.js'

test('批注入队→拉取→销账 全链路', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lego-forge-test-'))
  const a = enqueue(dir, 'corner-bakery', {
    kind: 'region',
    bbox: { x0: -4.0, y0: 0, z0: 2.33333, x1: 8, y1: 15, z1: 10 },
    sections: ['front-wall', 'shopfront'],
    parts: [{ id: '3001', color: '#b0a06f', count: 23 }, { id: null, color: 'x', count: 1 }],
    count: 23,
    view: { azimuth: 35.55, elevation: 'bad' },
    note: '这面墙太空了，加两扇拱窗',
  })
  assert.equal(a.kind, 'region')
  assert.equal(a.status, 'pending')
  assert.equal(a.bbox.z0, 2.33)                 // 坐标保留两位
  assert.deepEqual(a.sections, ['front-wall', 'shopfront'])
  assert.equal(a.parts.length, 1)               // 无 id 的零件被剔除
  assert.equal(a.view, null)                    // elevation 非数→整个 view 丢弃
  assert.ok(pending(dir).length === 1)
  const text = pendingText(dir)
  assert.ok(text.includes('面板批注'))
  assert.ok(text.includes('这面墙太空了'))
  assert.ok(text.includes('front-wall'))
  const json = JSON.parse(pendingJson(dir))
  assert.equal(json[0].id, a.id)
  const n = resolveIds(dir, [a.id])
  assert.equal(n, 1)
  assert.equal(pending(dir).length, 0)
  assert.equal(pendingText(dir), '')
  assert.equal(listAll(dir)[0].status, 'resolved')
})

test('非法 kind 归一为 region；note 截断 500', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lego-forge-test-'))
  const a = enqueue(dir, 'x', { kind: 'hack', note: 'n'.repeat(900) })
  assert.equal(a.kind, 'region')
  assert.equal(a.note.length, 500)
})
