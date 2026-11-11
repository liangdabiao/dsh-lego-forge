// 面板数据面：/lego-forge 前缀路由（原生 req/res）。
// 与工具共享 lib 层（一份逻辑两个入口：面板按钮与模型工具走同一份 runner/annotate）。
// 每请求鉴权三件套（沿袭家族 0.2.x 事实）：connection.requestRejection + Origin↔Host 同源 + sec-fetch-site。
import { createReadStream, statSync, existsSync, readFileSync } from 'node:fs'
import { join, extname } from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  listSets, setDir, readMeta, readJournal, listVersions, readVersion,
  safeArtifact, deleteSet, pluginRoot, listImages, savePanelImage, journal,
} from './project.js'
import { listAll, enqueue, resolveIds } from './annotate.js'
import { readJson } from './http.js'

const BASE = '/lego-forge'
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8' }

/** 每请求鉴权：web 服务不替插件路由鉴权。0.2.x 宿主已 token 鉴权，服务缺席时放行（fail-closed 会把面板永久 403） */
export function requestRejection(ctx, req) {
  const connection = ctx.get('connection')
  if (typeof connection?.requestRejection !== 'function') return false
  return connection.requestRejection({ headers: req.headers })
}

function json(res, status, value) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(JSON.stringify(value))
}

/** 插件静态白名单文件：viewer 产物与 view.html（只允许这几个固定路径，杜绝任意读） */
const PLUGIN_FILES = {
  '/view.html': join(pluginRoot(), 'viewer/view.html'),
  '/viewer.js': join(pluginRoot(), 'viewer/dist/viewer.js'),
}

export function registerApi(ctx, configRef) {
  return ctx.webServer.register({
    kind: 'prefix',
    path: BASE,
    async handler(req, res) {
      try {
        const rejection = requestRejection(ctx, req)
        if (typeof rejection === 'number') return json(res, rejection, { error: '未授权' })
        const url = new URL(req.url, 'http://x')
        let path = url.pathname.slice(BASE.length) || '/'
        try { path = decodeURIComponent(path) } catch { /* 保留原样（中文集合名） */ }
        const config = configRef.config

        if (path === '/api/health' && req.method === 'GET') return json(res, 200, { ok: true, plugin: 'lego-forge' })

        if (path === '/api/sets' && req.method === 'GET') return json(res, 200, { sets: listSets(config), base: BASE })

        if (path === '/api/set' && req.method === 'GET') {
          const name = url.searchParams.get('name') || ''
          const dir = setDir(config, name)
          if (!readMeta(dir) && !existsSync(join(dir, 'build.mjs'))) return json(res, 404, { error: `集合不存在：${name}` })
          const versions = listVersions(dir).map((x) => {
            const head = readVersion(dir, x.v)
            return { v: x.v, ts: head?.ts, ok: head?.ok, parts: head?.stats?.parts ?? null, errors: head?.errors ?? null, title: head?.title }
          })
          return json(res, 200, {
            name, meta: readMeta(dir), journal: readJournal(dir, 200),
            versions: versions.reverse(), annotations: listAll(dir),
            images: listImages(dir),
            // 面板据此决定「体素对照」能不能点：没有体素快照时不要给一个点了就 404 的开关
            hasVox: existsSync(join(dir, 'vox.json')),
          })
        }

        if (path === '/api/export' && req.method === 'GET') {
          // 一键导出：打包 out/ 交付物为 ZIP，以附件形式流式回传（面板「导出 ZIP」按钮直链这里）
          const name = url.searchParams.get('name') || ''
          const { exportSet } = await import(pathToFileURL(join(pluginRoot(), 'lib/exporter.js')).href)
          const out = exportSet(config, name)
          const zipPath = join(setDir(config, name), 'out', out.file)
          res.writeHead(200, {
            'content-type': 'application/zip',
            'content-length': out.bytes,
            // filename 兜底 ASCII；filename*（RFC 5987）让中文标题在浏览器下载框里正常显示
            'content-disposition': `attachment; filename="${out.download}"; filename*=UTF-8''${encodeURIComponent(out.nameBase)}`,
            'cache-control': 'no-store',
          })
          if (req.method === 'HEAD') return res.end()
          createReadStream(zipPath).pipe(res)
          return
        }

        if (path === '/api/set/new' && req.method === 'POST') {
          const body = await readJson(req)
          const { newSet } = await import(pathToFileURL(join(pluginRoot(), 'lib/runner.js')).href)
          const out = newSet(config, String(body.name || ''), body.title)
          return json(res, 200, { ok: true, name: out.name })
        }

        if (path === '/api/version' && req.method === 'GET') {
          const name = url.searchParams.get('name') || ''
          const dir = setDir(config, name)
          const v = url.searchParams.get('v')
          let data = v ? readVersion(dir, Number(v)) : null
          if (!data) {
            const list = listVersions(dir)
            if (!list.length) return json(res, 404, { error: '还没有版本快照（先 build）' })
            data = readVersion(dir, list[list.length - 1].v)
          }
          // light=1：对比/时间线用，不组装几何（省几 MB 传输）
          if (url.searchParams.get('light')) return json(res, 200, data)
          return json(res, 200, await composeSet(name, data))
        }

        if (path === '/api/vox' && req.method === 'GET') {
          const dir = setDir(config, url.searchParams.get('name') || '')
          const file = join(dir, 'vox.json')
          if (!existsSync(file)) return json(res, 404, { error: '没有体素快照' })
          return json(res, 200, JSON.parse(readFileSync(file, 'utf8')))
        }

        if (path === '/api/annotate' && req.method === 'POST') {
          const body = await readJson(req)
          const dir = setDir(config, String(body.name || ''))
          if (!readMeta(dir) && !existsSync(join(dir, 'build.mjs'))) return json(res, 404, { error: `集合不存在：${body.name}` })
          const annotation = enqueue(dir, String(body.name), body.annotation ?? body)
          return json(res, 200, { ok: true, annotation })
        }

        if (path === '/api/annotate/resolve' && req.method === 'POST') {
          const body = await readJson(req)
          const dir = setDir(config, String(body.name || ''))
          const ids = Array.isArray(body.ids) ? body.ids : [body.id]
          const n = resolveIds(dir, ids)
          return json(res, 200, { ok: true, resolved: n })
        }

        if (path === '/api/render-callback' && req.method === 'POST') {
          const body = await readJson(req)
          const name = String(body.name || '')
          const dir = setDir(config, name)
          if (!readMeta(dir) && !existsSync(join(dir, 'build.mjs'))) return json(res, 404, { error: `集合不存在：${name}` })
          const file = savePanelImage(dir, String(body.view || 'hero'), body.image)
          journal(dir, { action: 'shots', ok: true, summary: `面板渲染出图 ${file}`, source: 'panel' })
          return json(res, 200, { ok: true, file })
        }

        if (path === '/api/set/delete' && req.method === 'POST') {
          const body = await readJson(req)
          deleteSet(config, String(body.name || ''))
          return json(res, 200, { ok: true })
        }

        if (path === '/api/colors' && req.method === 'GET') {
          // BOM 表上色用：LEGO 色名 → hex（engine/colors.mjs 直出）
          const { COLORS } = await import(pathToFileURL(join(pluginRoot(), 'engine/colors.mjs')).href)
          const map = {}
          for (const [name, entry] of Object.entries(COLORS)) map[name.toLowerCase()] = entry[1]
          return json(res, 200, map)
        }

        // 插件静态白名单（view.html / viewer.js）
        const staticFile = PLUGIN_FILES[path]
        if (staticFile && existsSync(staticFile) && (req.method === 'GET' || req.method === 'HEAD')) {
          return sendFile(res, staticFile, MIME[extname(staticFile).toLowerCase()] || 'application/octet-stream')
        }

        // 集合产物：/api/artifact/<集合名>/out/...（safeArtifact 限定在集合目录内）
        if (path.startsWith('/api/artifact/')) {
          const rel = path.slice('/api/artifact/'.length)
          const slash = rel.indexOf('/')
          if (slash <= 0) return json(res, 400, { error: 'bad artifact path' })
          const name = rel.slice(0, slash)
          const hit = safeArtifact(config, name, rel.slice(slash + 1))
          if (!hit) return json(res, 404, { error: 'not found' })
          if (req.method === 'HEAD') { res.writeHead(200, { 'content-length': statSync(hit.file).size }); return res.end() }
          if (req.method !== 'GET') return json(res, 405, { error: '只接受 GET' })
          return sendFile(res, hit.file, hit.type)
        }

        json(res, 404, { error: 'not found' })
      } catch (err) {
        const status = typeof err?.status === 'number' ? err.status : 500
        json(res, status, { error: err?.message || '内部错误' })
      }
    },
  })
}

function sendFile(res, file, type) {
  res.writeHead(200, { 'content-type': type, 'content-length': statSync(file).size, 'cache-control': 'no-cache' })
  createReadStream(file).pipe(res)
}

// ---------- 版本快照 → viewer SET 组装 ----------
// 版本 JSON 存盘时是精简的（inst+bom+check，无几何）；这里按用到的零件 id 现场补 geo，
// 组装成 viewer.js 期望的 { meta, geo, inst } 形状。与 set.html 内嵌的 SET 同构。

let catalogMod = null
async function catalog() {
  if (!catalogMod) catalogMod = await import(pathToFileURL(join(pluginRoot(), 'engine/catalog.mjs')).href)
  return catalogMod
}

async function composeSet(name, data) {
  const { part: partDef } = await catalog()
  const ids = [...new Set(data.inst.map((r) => r[0]))]
  const geo = {}
  for (const id of ids) {
    const file = join(pluginRoot(), 'engine/parts/geo', id + '.json')
    if (!existsSync(file)) continue
    try {
      const g = JSON.parse(readFileSync(file, 'utf8'))
      if (partDef(id)?.ds) g.ds = true
      geo[id] = g
    } catch { /* 缺几何的零件跳过（viewer 按 GEO[id] 为空处理会崩——直接剔除该实例更稳） */ }
  }
  const inst = data.inst.filter((r) => geo[r[0]])
  return {
    meta: {
      title: data.title ?? name,
      subtitle: `v${data.v} · ${data.ok ? 'PASS' : 'FAIL'} · ${new Date(data.ts).toLocaleString('zh-CN')}`,
      parts: inst.length, colors: data.stats?.colors ?? new Set(inst.map((r) => r[1])).size,
      focus: null, view: null,
    },
    geo, inst,
  }
}
