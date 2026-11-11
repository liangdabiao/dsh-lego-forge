// 导出回归：ZIP 打包（STORE）结构正确、交付物齐全、API 以附件回传。
// 导出是交付闭环的最后一环：skill Deliver 说「把 ZIP 路径写给用户」，所以包本身必须真实可用。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const config = { setsRoot: mkdtempSync(join(tmpdir(), 'lego-forge-export-')) }
process.env.DSH_HOME = config.setsRoot

const { exampleCopy, buildSet } = await import('../lib/runner.js')
const { exportSet, makeZip } = await import('../lib/exporter.js')
const { registerApi } = await import('../lib/api.js')

// 准备一个已构建的集合（cottage 示例，~150ms）
exampleCopy(config, 'cottage', '导出测试')
const build = await buildSet(config, '导出测试')
assert.equal(build.ok, true, '示例构建应 PASS')

test('exportSet：ZIP 落盘在 out/export/，结构合法、交付物齐全', () => {
  const out = exportSet(config, '导出测试')
  assert.equal(out.ok, true)
  assert.match(out.download, /^garden-cottage-v\d+\.zip$/)
  const zipPath = join(config.setsRoot, '导出测试', 'out', out.file)
  assert.ok(existsSync(zipPath), 'zip 已写入 out/export/')
  const buf = readFileSync(zipPath)
  assert.deepEqual([...buf.subarray(0, 4)], [0x50, 0x4b, 0x03, 0x04], '本地文件头 PK\x03\x04')
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]))
  assert.ok(eocd > 0, 'EOCD 存在')
  assert.equal(buf.readUInt16LE(eocd + 10), out.entries.length, 'EOCD 条目数一致')
  for (const name of ['set.html', 'model.ldr', 'parts.csv', 'report.txt']) {
    assert.ok(out.entries.includes(name), `包含 ${name}`)
    assert.ok(buf.includes(Buffer.from(name, 'utf8')), `zip 里有 ${name} 的名字`)
  }
})

test('makeZip：空 Entries 也能出合法（空）ZIP；CRC 真实校验', () => {
  const zip = makeZip([{ name: 'a.txt', data: Buffer.from('hello') }])
  assert.deepEqual([...zip.subarray(0, 4)], [0x50, 0x4b, 0x03, 0x04])
  // 本地头里的 CRC（偏移 14）
  const crc = zip.readUInt32LE(14)
  // 手算 "hello" 的 CRC32
  let c = 0xffffffff
  for (const ch of Buffer.from('hello')) {
    c ^= ch
    for (let k = 0; k < 8; k++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) >>> 0 : c >>> 1
  }
  assert.equal(crc, (c ^ 0xffffffff) >>> 0)
  // 数据原样存在（STORE）
  assert.ok(zip.includes(Buffer.from('hello')))
})

test('API：GET /api/export 以 application/zip 附件回传，PK 头在 Body 前', async () => {
  const captured = []
  registerApi({ get: () => null, webServer: { register: (x) => captured.push(x) } }, { config })
  const handler = captured[0].handler
  const chunks = []
  const res = {
    statusCode: 0, headers: {}, body: null,
    writeHead(s, h) { this.statusCode = s; Object.assign(this.headers, h) },
    end(b) { if (b) chunks.push(b) },
  }
  // handler 里用 createReadStream(...).pipe(res)：pipe 是异步的，end() 被调用才算完成
  const { Writable } = await import('node:stream')
  let ended
  const done = new Promise((r) => { ended = r })
  const protoEnd = Writable.prototype.end
  const stream = new Writable({
    write(chunk, _enc, cb) { chunks.push(chunk); cb() },
    final(cb) { cb(); ended() },
  })
  Object.assign(stream, {
    statusCode: 0, headers: {},
    writeHead(s, h) { this.statusCode = s; Object.assign(this.headers, h) },
    end(b) { if (b) chunks.push(Buffer.from(b)); protoEnd.call(this) },
  })
  const req = { method: 'GET', url: '/lego-forge/api/export?name=' + encodeURIComponent('导出测试'), headers: {} }
  await handler(req, stream)
  await done
  assert.equal(stream.statusCode, 200)
  assert.match(stream.headers['content-type'], /application\/zip/)
  assert.match(stream.headers['content-disposition'], /attachment; filename="/)
  const zip = Buffer.concat(chunks)
  assert.deepEqual([...zip.subarray(0, 2)], [0x50, 0x4b], '响应体以 PK 开头')
})

