// project.js 单测：集合名净化（中文保留/非法字符剔除）、assertInside 越界拒绝、listImages。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { sanitizeSetName, isValidSetName, assertInside, listImages } from '../lib/project.js'

test('sanitizeSetName 保留中文、剔除文件系统非法字符', () => {
  assert.equal(sanitizeSetName('街角面包店'), '街角面包店')
  assert.equal(sanitizeSetName('corner bakery'), 'corner-bakery')
  assert.equal(sanitizeSetName('a/b\\c:d*e?f"g<h>i|j'), 'a-b-c-d-e-f-g-h-i-j')
  assert.equal(sanitizeSetName('  .hidden. '), 'hidden')
  assert.equal(sanitizeSetName(''), '')
  assert.equal(sanitizeSetName('x'.repeat(100)).length, 64)
})

test('isValidSetName 拒绝非法名', () => {
  assert.equal(isValidSetName('街角面包店'), true)
  assert.equal(isValidSetName('a/b'), false)
  assert.equal(isValidSetName('.dot'), false)
  assert.equal(isValidSetName(''), false)
  assert.equal(isValidSetName('x'.repeat(65)), false)
})

test('assertInside 拒绝路径穿越', () => {
  const base = mkdtempSync(join(tmpdir(), 'lego-forge-test-'))
  assert.equal(assertInside(base, 'a/b.txt'), join(base, 'a/b.txt'))
  assert.throws(() => assertInside(base, '../outside.txt'))
  assert.throws(() => assertInside(base, 'a/../../outside.txt'))
  assert.throws(() => assertInside(base, 'C:/elsewhere/x'))
})

test('listImages 收集 out/ 与 out/preview/ 的图', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lego-forge-test-'))
  mkdirSync(join(dir, 'out/preview'), { recursive: true })
  writeFileSync(join(dir, 'out/hero.png'), '')
  writeFileSync(join(dir, 'out/report.txt'), '')
  writeFileSync(join(dir, 'out/preview/quick.png'), '')
  assert.deepEqual(listImages(dir), ['hero.png', 'preview/quick.png'])
})

test('savePanelImage：合法 PNG 落盘可被 listImages 看到；非法视角/载荷被拒', async () => {
  const { savePanelImage } = await import('../lib/project.js')
  const dir = mkdtempSync(join(tmpdir(), 'lego-forge-test-'))
  const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), Buffer.from('fake-png-body')])
  const url = 'data:image/png;base64,' + png.toString('base64')
  assert.equal(savePanelImage(dir, 'front', url), 'preview/panel-front.png')
  assert.deepEqual(listImages(dir), ['preview/panel-front.png'])
  assert.equal(savePanelImage(dir, '../evil', url), 'preview/panel-hero.png')  // 视角名白名单归一
  assert.throws(() => savePanelImage(dir, 'hero', 'data:text/plain,xx'), /PNG data URL/)
  assert.throws(() => savePanelImage(dir, 'hero', 'data:image/png;base64,' + Buffer.from('notpng').toString('base64')), /合法 PNG/)
  assert.deepEqual(listImages(dir), ['preview/panel-front.png', 'preview/panel-hero.png'].sort())
})
