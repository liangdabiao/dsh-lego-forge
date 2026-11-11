# 积木工坊 · dsh-lego-forge

把一句话想法变成一套真实可拼的 LEGO 积木模型。引擎、零件几何与构建方法论源自 [lego-forge](https://github.com/ericfu-tianchi/lego-forge)（MIT），LDraw 零件几何 © LDraw.org (CC BY 2.0)。

## 它做什么

- **agent 侧**：一个 `lego_forge` 工具，12 个 action（`new` / `build` / `shots` / `review` / `stage` / `annotations` / `read` / `list` / `example` / `docs` / `parts` / `part`）。agent 写 `build.mjs`，宿主进程内直驱引擎，产出 `set.html` 3D、`model.ldr`、`parts.csv`、`report.txt` 与版本快照。
- **面板侧**：侧栏「积木工坊」六个标签——3D 模型（版本切换、体素对照、框选批注）、时间线（journal + 版本对比）、审查图、报告、BOM、批注。
- **闭环**：在 3D 里点选 / 框选 / 区块秒选一块区域，附言提交；批注进入 `annotations.json` 队列，同时通过系统提示词注入让 agent 在后续请求里优先看到并处理，处理完由 `annotations` action 销账。

## 安装

需要 Node 22.19+ 或 24+，DSH `>=0.2.1-rc.2 <0.3.0`。从 GitHub 克隆后本地安装：

```bash
git clone https://github.com/liangdabiao/dsh-lego-forge.git
cd dsh-lego-forge && npm install   # prepare 钩子会自动构建 dist/client.js
```

然后把该目录作为本地插件装进 DSH 即可；`npm pack` 会先执行 `prepack` 重建浏览器产物。

数据落在 `$DSH_HOME/lego-forge/<集合名>/`，不污染用户工作目录。可在 `cordis.patch.yml` 配置：

| 配置项 | 默认 | 说明 |
|---|---|---|
| `setsRoot` | 空（= `$DSH_HOME/lego-forge`） | 集合存放根目录 |
| `keepVersions` | 12 | 时间线保留的版本数 |
| `autoRender` | false | build 通过后自动快速渲染（需要 Playwright） |

## 审查图

`action=shots` 用 Playwright 起 headless Chromium 截六视图 / 主视图 / 参考图对比。Playwright 是**可选依赖**，未安装或 GPU 探针失败时不会报错中断：面板「审查图」标签提供「用面板渲染出图」按钮，直接由面板里的 3D 视图截图回传存盘，干净机器不装 Chromium 也能出图。

## 开发

```bash
npm test              # 单元测试
npm run build         # client.js → dist/client.js（ModuleLoader 包装，id = package.json name）
npm run build:viewer  # viewer/src/viewer.js → viewer/dist/viewer.js（three 内联）
```

改了 `viewer/src/viewer.js` 后必须重跑 `build:viewer`；已经导出的 `out/set.html` 内嵌的是构建时刻的 viewer，历史集合需重新 `build` 才会带上新渲染逻辑。

`engine/` 与 `docs/` 是从上游逐字节搬运的，除 `viewer` 的嵌入桥外不改动上游逻辑。

## 更新日志

- **0.1.4**（2026-11-11）沉淀批注解读经验进插件：
  - 系统提示词注入的批注引导与 SKILL.md 均明确：**框选是大致位置和方向，不是精确 bbox**——以 sections 标签和零件构成推断意图（选区里占多数的零件类型就是主体），bbox 只用于确认大概区域
  - SKILL.md 新增「老虎窗」实测技法：手写屋顶层（山花封板通铺全宽作连接基石）+ 老虎窗位跳铺斜面立壁架开窗
- **0.1.3**（2026-11-11）补上缺失的导出功能：
  - `lego_forge` 新增 `action=export`：把 out/ 交付物（set.html / model.ldr / parts.csv / report.txt / check.json / 全部渲染图）打包成 ZIP（`out/export/<标题>-v<版号>.zip`），零依赖 STORE 打包（无压缩，毫秒级）
  - 面板：详情页头部新增「⬇ 导出 ZIP」一键下载（`GET /api/export?name=` 以 attachment 流式回传）；BOM 页新增 set.html / model.ldr / parts.csv 三个单独下载链接
  - SKILL.md Deliver 步骤明确：交付时必须 `action=export` 并把 ZIP 路径告诉用户（out/ 散文件用户取不到，ZIP 才是交付物）
  - 修复导出按钮引入的面板空白（两处旧变量名残留：`le` → `hasModel`；BomTab 未解构 `name` 落到 `window.name` 恒为空，下载链接永不渲染）
- **0.1.2**（2026-11-10）面板状态机与嵌入排版修复（真 Chromium 端到端复测）：
  - **新建但还没 build 的集合不再弹「加载失败：还没有版本快照」**：面板不再给没有版本快照的集合挂 3D iframe（`view.html` 会去 `/api/version` 拿数据，拿不到只能报错），改为空态引导「在对话里说 build 一下 XXX」。这是脚手架阶段的正常状态，不是错误。
  - 「体素（设计意图）」开关按 `/api/set` 新增的 `hasVox` 禁用，没有体素快照时不再点了就 404。
  - 发完批注后「✓ 已记录」的确认文案被 iframe 的 `clear` 回执立刻抹掉（`selection` 消息里 count=0 也会复位 `sent`）；改为只在真的选中时才复位。
  - 审查图卡片被 grid 的 stretch 拉成贯穿整屏的白条（`alignContent/alignItems: start`）。
  - 嵌入态排版：viewer 自己的 Take apart/Rebuild 被面板批注条压住、LDraw 版权行与右上工具条叠字；`body.embed` 把 dock 抬到批注条上方、credit 下移，`body.embed.cap`（审查图缩略预览）里交互件全部隐藏。
- **0.1.1**（2026-11-10）安装后实测修复：
  - **面板 3D 里点选/框选/区块秒选全部失效**：`viewer/view.html` 的 `#err` 错误层写成 `display:flex`，盖掉了 `[hidden]` 的默认 `display:none`，于是永远铺满全屏、吃掉 canvas 的一切 pointerdown。改为默认 `display:none` + `#err:not([hidden]){display:flex}`。导出用的 `template.html` 没有这一层，所以只有面板里坏。
  - **插件装不上（1 entry did not activate）**：`apply` 里直接读 `ctx.systemPrompt`，未在 `inject` 声明的服务会被 Cordis 代理抛 `cannot get property "systemPrompt" without inject`。改为 `ctx.inject(['systemPrompt'], …)` 可选注入——宿主没有该服务时插件照常激活，只是少了批注提示词段。
  - `stage` 回执打印 `undefined`（`stageSet` 只返回 `stage`，回执却拼了 `summary`）。
  - `build` 因 `build.mjs` 抛错/没返回 Model 而失败时，回执打印 `undefined`（runner 的早退分支缺 `line`）。
  - `parts` 回执把表头打两遍（summary 与 data 都含第一行）。
  - `parts` 搜索对尺寸写法敏感：`brick 1x4` 匹配不到零件名里的 `Brick 1 x 4`（工具描述却正是这么教 agent 搜的）。现在把 `1x4 / 1 x 4 / 1×4` 归一化。
  - `shots` 在缺 Playwright / 环境阻断时，引导话术被重复渲染两遍。
- **0.1.0** 初版：`lego_forge` 工具（12 个 action）+ 六标签面板 + 3D 框选批注闭环 + Playwright 审查图。


