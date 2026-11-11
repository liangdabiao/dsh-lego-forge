// viewer 打包：viewer/src/viewer.js → viewer/dist/viewer.js（IIFE 单文件，three 内联）。
// export.mjs 在构建产物时把这个文件内嵌进 set.html，view.html 通过 /lego-forge/viewer.js 加载同一份。
// 改动 viewer 源码后必须重跑本脚本 + 重新 build 集合（set.html 里嵌的是构建时刻的 viewer）。
import { build } from 'esbuild'
import { readFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

mkdirSync(join(root, 'viewer/dist'), { recursive: true })
await build({
  entryPoints: [join(root, 'viewer/src/viewer.js')],
  outfile: join(root, 'viewer/dist/viewer.js'),
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'chrome120',
  minify: !process.argv.includes('--dev'),
  sourcemap: false,
  logLevel: 'info',
  define: { 'process.env.NODE_ENV': '"production"' },
})

const kb = (Buffer.byteLength(readFileSync(join(root, 'viewer/dist/viewer.js'))) / 1024).toFixed(1)
console.log(`[build-viewer] viewer/dist/viewer.js ${kb} KB`)
