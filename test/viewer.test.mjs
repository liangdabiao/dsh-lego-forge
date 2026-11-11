// viewer 页面回归：面板 3D 标签用的就是 viewer/view.html。
// 0.1.0 事故：错误层写成 `display:flex`，[hidden] 的浏览器默认 display:none 被作者样式盖掉，
// 于是「隐藏」的 #err 仍铺满全屏、吃掉 canvas 的一切 pointerdown —— 面板里的
// 单选 / 框选 / 区块秒选 / 拖动全部失效（导出用的 template.html 没有这个层，所以只在面板里坏）。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const html = readFileSync(new URL('../viewer/view.html', import.meta.url), 'utf8')

test('view.html: 错误层默认 display:none，只有去掉 hidden 才浮出', () => {
  assert.match(html, /#err\{[^}]*display:none/, '#err 基础规则必须是 display:none')
  assert.match(html, /#err:not\(\[hidden\]\)\{display:flex\}/, '显示态要单独给 :not([hidden])')
})

test('view.html: 内嵌 3D 页引用白名单里的 /lego-forge/viewer.js', () => {
  assert.match(html, /\/lego-forge\/viewer\.js/)
  assert.match(html, /\/lego-forge\/api\/version/)
})

test('view.html: 面板嵌入态把 dock/credit 让开面板的批注条，缩略预览里交互件全隐藏', () => {
  assert.match(html, /body\.embed \.dock\{bottom:84px\}/, 'dock 要抬到批注条上方')
  assert.match(html, /body\.embed \.credit\{top:54px/, 'credit 别和右上工具条叠字')
  assert.match(html, /body\.embed\.cap \.dock,body\.embed\.cap \.hint,body\.embed\.cap \.credit\{display:none\}/, 'cap 缩略预览里不显示交互件')
  assert.match(html, /classList\.add\('embed'\)/)
  assert.match(html, /classList\.add\('cap'\)/)
})

test('view.html: canvas 覆盖全屏且不吃事件（toolbar 之外无遮挡层）', () => {
  assert.match(html, /#c\{position:fixed;inset:0/)
  assert.match(html, /\.card\{position:fixed;left:24px;top:22px;pointer-events:none\}/)
})
