# 积木工坊 · dsh-lego-forge

DeepSeek Harness（[dsh](https://www.npmjs.com/package/@deepseek-ai/dsh)）插件：把一句话想法变成一套**真实可拼的 LEGO 积木模型**。agent 写 `build.mjs` 烘焙出模型（450+ 种真零件、可拼搭性硬检查、逐销验证连接），产出 `set.html` 3D、`model.ldr`、`parts.csv` 与交付 ZIP；你在面板的 3D 里框选一块区域附言批注，agent 下一轮优先处理，改完销账。引擎、零件几何与构建方法论源自 [lego-forge](https://github.com/ericfu-tianchi/lego-forge)（MIT），LDraw 零件几何 © LDraw.org (CC BY 2.0)。

![效果示例：日式庭院 / 树屋 / F1 赛车 / 街角面包店](docs/showcase.jpg)

## 装上以后有什么

| 能力 | 说明 |
|---|---|
| `lego_forge` 工具（13 个 action） | `new` 新建集合 · `build` 构建并硬检查 · `shots` 渲染审查图 · `review` 提交评分 · `stage` 推进管线 · `annotations` 拉取/销账批注 · `read` 读产物 · `list` 列集合 · `example` 拷官方示例 · `docs` 技法/色表/零件/基准 · `parts` 搜零件 · `part` 查零件销位 · `export` 打包交付 ZIP |
| 侧栏「积木工坊」面板 | 六个标签：3D 模型（版本切换、体素对照、框选批注）、时间线（journal + 版本对比）、审查图、报告、BOM、批注；头部一键「⬇ 导出 ZIP」 |
| 框选批注闭环 | 3D 里点选/框选/区块秒选 + 附言 → `annotations.json` 队列 + 系统提示词注入，agent 在后续请求里优先看到并处理，处理完 `annotations` 销账。框选是大致位置和方向，以 sections 标签和零件构成推断意图 |
| 版本与交付 | 每次 build PASS 存版本快照（默认保留 12 份）；Deliver 时把 out/ 交付物打包成 ZIP（毫秒级 STORE，无压缩） |

## 使用

对话里直接说：

- 「做一个街角面包店的乐高模型」——agent 走 Brief → Blockout → Detail → Check → Review → Deliver 六步管线，最后给你 ZIP
- 「白金汉宫的柱廊再精致一点」——你在面板 3D 里框选后直接说，批注自动进入队列
- 「这个零件 3039 是什么？有没有弧面砖？」——查零件库
- 「列出我的积木集合」「把上次的卡车导出 ZIP」

或打开侧栏「积木工坊」：看 3D、拖时间线对比版本、在模型上框一块区域写附言、下载交付 ZIP。

## 审查图（可选 Playwright）

`shots` 用 Playwright 起 headless Chromium 截六视图 / 主视图 / 参考图对比。Playwright 是**可选依赖**，未安装或 GPU 探针失败时不会报错中断：面板「审查图」标签提供「用面板渲染出图」按钮，直接由面板里的 3D 视图截图回传存盘，干净机器不装 Chromium 也能出图。装浏览器：`npx playwright install chromium`。

## 数据

全部在本机 `$DSH_HOME/lego-forge/<集合名>/`（默认 `~/.dsh/lego-forge/`），不污染用户工作目录：

| 文件 | 内容 |
|---|---|
| `brief.md` + `build.mjs` | 设计简报与构建脚本（agent 写） |
| `out/` | `set.html` 3D、`model.ldr`、`parts.csv`、`report.txt`、`check.json`、渲染图、`export/*.zip` |
| `versions/` | 每次 PASS 的版本快照（默认保留 12 份） |
| `annotations.json` | 面板批注队列（pending → resolved） |
| `journal.jsonl` | 过程时间线（面板时间线数据源） |
| `project.json` | 元数据：阶段/评分/最近构建 |

可在 `cordis.patch.yml` 配置：

| 配置项 | 默认 | 说明 |
|---|---|---|
| `setsRoot` | 空（= `$DSH_HOME/lego-forge`） | 集合存放根目录 |
| `keepVersions` | 12 | 时间线保留的版本数 |
| `autoRender` | false | build 通过后自动快速渲染（需要 Playwright） |

## 安装

要求 Node 22.19+ 或 24+，DSH `>=0.2.1-rc.2 <0.3.0`。

```bash
# 从 npm 安装（发布后）
dsh plugin --profile web add dsh-lego-forge

# 从本仓库直装（安装时会跑 prepare 钩子自动构建 dist/client.js）
dsh plugin --profile web add github:liangdabiao/dsh-lego-forge

# 本地开发调试
dsh plugin --profile web add link:$PWD
```

## 自检

```bash
npm install && npm test
```

- `npm test`：29 个单测（批注队列/导出 ZIP 结构/宿主 apply 与提示词注入/路径安全/连接性检查/viewer 嵌入桥），零网络依赖
- `npm run build`：`client.js` → `dist/client.js`（ModuleLoader 包装，id = 包名，产物三自检：require 白名单 / 无动态 import / 单文件）
- `npm run build:viewer`：`viewer/src` → `viewer/dist`（three 内联）。改了 viewer 源码必须重跑，并重新 build 集合——已导出的 `set.html` 内嵌的是构建时刻的 viewer

## 常见问题

**面板打开是空的？**
新建集合还没 build 时没有版本快照可看，在对话里说「build 一下 <集合名>」即可。这是脚手架阶段的正常状态，不是错误。

**shots 出不了图？**
运行 `npx playwright install chromium` 后重试；或用面板审查图标签的「用面板渲染出图」，无需 Chromium。

**build 报「not connected」？**
检查器按销逐个验证连接：悬挑零件必须有下方销，或骑跨在受撑行上（比如窗台技法：一块板两行深，一行落在墙上）。看 `out/report.txt` 的错误清单修因不修症。

**改了面板/工具没生效？**
`dist/client.js` 是构建产物，改完源码要 `npm run build`（npm install 时 prepare 钩子会自动跑）。

## 开发

```bash
git clone https://github.com/liangdabiao/dsh-lego-forge.git
cd dsh-lego-forge && npm install
npm test
dsh plugin --profile web add link:$PWD   # 本地调试
```

| 目录 | 说明 |
|---|---|
| `lib/` | Host 半边：`runner.js`（build/shots/annotations）、`exporter.js`（ZIP）、`api.js`（面板接口）、`project.js`（集合持久化与路径安全） |
| `engine/` | 上游 lego-forge 引擎逐字节搬运（Model/kit/checker/零件几何），除 viewer 嵌入桥外不改上游逻辑 |
| `viewer/` | 面板与 set.html 共用的 3D 视图（`src/` 源码；`dist/` 是运行时产物，随仓库提交） |
| `client.js` → `dist/` | 浏览器半边源码与 esbuild 产物（`dist/` 不入库，npm install 时 prepare 自动构建） |
| `docs/` | 技法（TECHNIQUES）/色表（COLORS）/零件表（PARTS）/评分标准（RUBRIC）/官方基准（REFERENCE） |
| `examples/` | cottage、retro-computer 两个官方示例（含现成渲染，可当范本读） |
| `test/` | node:test 单测，零 dsh 依赖 |

## License

[MIT](LICENSE)。`engine/`、`docs/` 与构建方法论源自 [lego-forge](https://github.com/ericfu-tianchi/lego-forge)（MIT）；LDraw 零件几何 © LDraw.org (CC BY 2.0)。

## 更新日志

- **0.1.4**（2026-11-11）沉淀批注解读经验进插件 + GitHub 首发：
  - 系统提示词注入的批注引导与 SKILL.md 均明确：**框选是大致位置和方向，不是精确 bbox**——以 sections 标签和零件构成推断意图（选区里占多数的零件类型就是主体），bbox 只用于确认大概区域
  - SKILL.md 新增「老虎窗」实测技法：手写屋顶层（山花封板通铺全宽作连接基石）+ 老虎窗位跳铺斜面立壁架开窗
  - 发布整理：`.gitignore` 锚定根 `dist/`（`viewer/dist` 是运行时产物，随仓库提交）、新增 `prepare` 钩子（git 直装自动构建）、README 按家族插件规范重写
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
- **0.1.0** 初版：`lego_forge` 工具（13 个 action）+ 六标签面板 + 3D 框选批注闭环 + Playwright 审查图。
