// 导出：把集合的交付物（set.html / model.ldr / parts.csv / report.txt / 渲染图）打包成 ZIP。
// 零依赖：STORE 方式（不压缩）的 zip writer——产物本来就是 png/html，压缩率低，store 换来的是
// 60 行无依赖实现 + 打包毫秒级完成。out/export/<slug>.zip 落盘一份，API 再以附件流式回传。
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { setDir, journal, listImages, readMeta } from './project.js'
import { slug } from '../engine/export.mjs'

// ---------- CRC32 ----------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()
const crc32 = (buf) => {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

const dosTime = (d) => ({
  time: ((d.getHours() & 0x1f) << 11) | ((d.getMinutes() & 0x3f) << 5) | ((d.getSeconds() / 2) & 0x1f),
  date: (((d.getFullYear() - 1980) & 0x7f) << 9) | (((d.getMonth() + 1) & 0xf) << 5) | (d.getDate() & 0x1f),
})

/** 打包一组 { name, data:Buffer } 成 ZIP（全部 STORE，不压缩） */
export function makeZip(entries, when = new Date()) {
  const { time, date } = dosTime(when)
  const locals = [], centrals = []
  let offset = 0
  for (const { name, data } of entries) {
    const nameBuf = Buffer.from(name, 'utf8')
    const crc = crc32(data)
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)             // version needed
    local.writeUInt16LE(0x0800, 6)         // flags: UTF-8 names
    local.writeUInt16LE(0, 8)              // method: store
    local.writeUInt16LE(time, 10)
    local.writeUInt16LE(date, 12)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(data.length, 18)
    local.writeUInt32LE(data.length, 22)
    local.writeUInt16LE(nameBuf.length, 26)
    local.writeUInt16LE(0, 28)
    locals.push(local, nameBuf, data)
    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4)           // version made by
    central.writeUInt16LE(20, 6)           // version needed
    central.writeUInt16LE(0x0800, 8)
    central.writeUInt16LE(0, 10)
    central.writeUInt16LE(time, 12)
    central.writeUInt16LE(date, 14)
    central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(data.length, 20)
    central.writeUInt32LE(data.length, 24)
    central.writeUInt16LE(nameBuf.length, 28)
    central.writeUInt16LE(0, 30)           // extra
    central.writeUInt16LE(0, 32)           // comment
    central.writeUInt16LE(0, 34)           // disk start
    central.writeUInt16LE(0, 36)           // internal attrs
    central.writeUInt32LE(0, 38)           // external attrs
    central.writeUInt32LE(offset, 42)
    centrals.push(central, nameBuf)
    offset += 30 + nameBuf.length + data.length
  }
  const cd = Buffer.concat(centrals)
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0)
  eocd.writeUInt16LE(0, 4)
  eocd.writeUInt16LE(0, 6)
  eocd.writeUInt16LE(entries.length, 8)
  eocd.writeUInt16LE(entries.length, 10)
  eocd.writeUInt32LE(cd.length, 12)
  eocd.writeUInt32LE(offset, 16)
  eocd.writeUInt16LE(0, 20)
  return Buffer.concat([...locals, cd, eocd])
}

const CORE = ['set.html', 'model.ldr', 'parts.csv', 'report.txt', 'check.json']

/**
 * 打包一个集合：out/ 的核心产物 + 全部渲染图 → out/export/<slug>-v<latest>.zip
 * @returns { ok, file（相对 out/ 的 zip 路径）, download（下载名）, bytes, entries }
 */
export function exportSet(config, name) {
  const dir = setDir(config, name)
  const outDir = join(dir, 'out')
  if (!existsSync(join(outDir, 'set.html'))) {
    throw new Error('还没有可导出的产物——先 build 一次（out/set.html 不存在）')
  }
  const entries = []
  for (const f of CORE) {
    const p = join(outDir, f)
    if (existsSync(p)) entries.push({ name: f, data: readFileSync(p) })
  }
  for (const rel of listImages(dir)) {
    const p = join(outDir, rel)
    if (existsSync(p)) entries.push({ name: rel, data: readFileSync(p) })
  }
  const versionsDir = join(dir, 'versions')
  let v = 0
  try { v = Math.max(0, ...readdirSync(versionsDir).map((f) => parseInt(f, 10) || 0)) } catch { /* 无版本目录 */ }
  const title = String(readMeta(dir)?.title || name)
  const download = `${slug(title) || 'lego-set'}-v${v || 1}.zip`
  const nameBase = `${title}-v${v || 1}.zip`
  const zip = makeZip(entries)
  const dest = join(outDir, 'export')
  mkdirSync(dest, { recursive: true })
  writeFileSync(join(dest, download), zip)
  journal(dir, { action: 'export', set: name, ok: true, summary: `导出 ${download}（${entries.length} 个文件，${(zip.length / 1024).toFixed(0)} KB）` })
  return { ok: true, file: `export/${download}`, download, nameBase, bytes: zip.length, entries: entries.map((e) => e.name) }
}
