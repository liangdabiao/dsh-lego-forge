// runner.js 端到端：拷官方示例 cottage → buildSet 全流程（引擎进程内直驱）→ 产物/版本/体素/journal 齐活。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { exampleCopy, buildSet, readSet, docsText, partsSearch, partASCII } from '../lib/runner.js'
import { listSets, readMeta, listVersions, readJournal } from '../lib/project.js'

const root = join(fileURLToPath(import.meta.url), '..', '..')

test('cottage 端到端：example → build → 产物/版本/体素/journal', { timeout: 120_000 }, async () => {
  // viewer bundle 是 export 的依赖（set.html 内嵌）；缺就先构建
  if (!existsSync(join(root, 'viewer/dist/viewer.js'))) {
    execFileSync(process.execPath, [join(root, 'scripts/build-viewer.mjs')], { cwd: root, stdio: 'pipe' })
  }
  const config = { setsRoot: mkdtempSync(join(tmpdir(), 'lego-forge-sets-')), keepVersions: 12 }
  const ex = exampleCopy(config, 'cottage', 'cot-test')
  assert.ok(existsSync(join(ex.dir, 'build.mjs')))
  assert.ok(existsSync(join(ex.dir, 'out/hero.png')))   // 示例自带渲染

  const out = await buildSet(config, 'cot-test')
  assert.equal(out.ok, true, `cottage 应当 0 错误通过：\n${out.summary}`)
  assert.ok(out.parts >= 250, `cottage 应有 ~282 件，实际 ${out.parts}`)
  assert.ok(out.version >= 1)

  const dir = ex.dir
  for (const f of ['set.html', 'model.ldr', 'parts.csv', 'report.txt', 'check.json']) {
    assert.ok(existsSync(join(dir, 'out', f)), `缺产物 ${f}`)
  }
  const html = readFileSync(join(dir, 'out/set.html'), 'utf8')
  assert.ok(html.includes('window.SET='), 'set.html 应内嵌 SET 数据')
  assert.ok(html.includes('lego-forge-viewer'), 'set.html 应内嵌分叉 viewer（postMessage 桥标识）')

  // 版本快照 + 体素快照
  const vs = listVersions(dir)
  assert.equal(vs.length, 1)
  const v = JSON.parse(readFileSync(vs[0].file, 'utf8'))
  assert.ok(Array.isArray(v.inst) && v.inst.length > 250)
  assert.ok(Array.isArray(v.bom) && v.bom.length > 5)
  assert.ok(v.inst.every((r) => r.length === 16), 'inst 行应为 16 元（id,hex,alpha,xyz,m9,tag）')
  const vox = JSON.parse(readFileSync(join(dir, 'vox.json'), 'utf8'))
  assert.equal(vox.meta.voxels, true)
  assert.ok(vox.inst.length > 100, '体素快照应有可观单元数')
  assert.ok(vox.inst.every((r) => r[15] !== undefined), '体素也带 section tag')

  // journal + meta
  const journal = readJournal(dir)
  assert.ok(journal.some((e) => e.action === 'example'))
  assert.ok(journal.some((e) => e.action === 'build' && e.ok === true))
  assert.equal(readMeta(dir).lastBuild.ok, true)

  // readSet
  assert.ok(readSet(config, 'cot-test', 'report').startsWith('PASS'))
  assert.ok(readSet(config, 'cot-test', 'bom').includes('part,name,colour,quantity'))
  assert.ok(readSet(config, 'cot-test', 'build').includes('export default function build'))

  // listSets 汇总
  const sets = listSets(config)
  const row = sets.find((s) => s.name === 'cot-test')
  assert.equal(row.lastBuild.ok, true)
  assert.ok(row.versionCount >= 1)
  assert.ok(row.hasOut)
})

test('docs/parts/part 只读查询', async () => {
  assert.ok(docsText('rubric').toLowerCase().includes('recognisable'))
  const hits = await partsSearch('brick 1x4')
  assert.ok(hits.includes('3010'), '1x4 砖应是 3010')
  await assert.rejects(() => partsSearch(''), /关键词/)
  const ascii = await partASCII('3001')
  assert.ok(ascii.includes('3001') && ascii.includes('studs on top'))
  await assert.rejects(() => partASCII('999999'), /没有零件/)
})

test('build 失败路径：语法错误的 build.mjs 返回 threw', { timeout: 60_000 }, async () => {
  const config = { setsRoot: mkdtempSync(join(tmpdir(), 'lego-forge-sets-')) }
  const ex = exampleCopy(config, 'cottage', 'bad-set')
  const { writeFileSync } = await import('node:fs')
  writeFileSync(join(ex.dir, 'build.mjs'), 'export default function build() { throw new Error("boom") }')
  const out = await buildSet(config, 'bad-set')
  assert.equal(out.ok, false)
  assert.equal(out.threw, true)
  assert.ok(out.summary.includes('boom'))
})
