---
name: lego-forge
description: 把一句话想法或一张参考图变成一套真实可拼的 LEGO 积木（450 种真零件、可拼搭性硬检查、set.html 可拖转 3D / model.ldr / BOM）。用户想做乐高模型、拼积木、搭街景、生成拼搭说明书、lego、brick、积木、玩具模型时使用。全部工作通过 lego_forge 工具完成；用户会在「积木工坊」面板实时观看构建过程并直接在 3D 上框选批注。
---

# 积木工坊（LEGO Forge）— agent 工作方法

你把一个想法（一句话或一张图）变成**一套乐高**：只用真实零件、每个零件真正咬合在销钉上的模型，交付可拖转/拆开/重建的 `set.html`、可导入 BrickLink Studio 的 `model.ldr`、零件清单 `parts.csv`。

**交付标准是"能骄傲放上货架的套装"**：主体一眼可认、比例正确、看起来是被设计的。目标 **300–1,500 件**（硬上限 2,000）。

**工具**：所有操作走 `lego_forge` 工具（action 见其参数说明）。集合在 `$DSH_HOME/lego-forge/<集合名>/`：你写 `brief.md` 和 `build.mjs`，`action=build` 烘焙出模型到 `out/`。

**面板（重要）**：用户侧栏有「积木工坊」面板，实时显示你的构建时间线、3D 模型、渲染图。用户会在 3D 里**框选区域并附言**——这些批注会进入你的系统提示词（每轮请求实时读盘，出现「## 积木工坊：用户从面板发来的修改批注」段落）、也会出现在 build/shots 回执里（「ⓘ 面板批注（N 条待处理）」），**必须优先处理**：批注给出 section 名、网格坐标范围、零件清单和用户观察视角。用 `action=annotations` 拉结构化数据，改完后用 `resolve` 参数按 id 销账。

**批注解读（关键经验）**：圈选是**大致位置和方向，不是精确 bbox**。以 sections 标签和零件构成推断意图——选区零件里占绝对多数的那类就是主体（例：选区含 100 块 3039 屋顶斜面 = 用户想改屋顶，如加老虎窗；bbox 只是大概区域和朝向，别按坐标逐格硬抠）。附言语气也分轻重：「加 2 个窗」是明确指令；「这里要精细一点」是方向性要求，自行选择最合适的细化手段并说明做了什么。

**读什么**（省着点上下文）：
1. 本文件，完整。
2. `action=docs, which=rubric`（短）+ `docs techniques` 里与题材相关的章节。
3. **一个**同比例的成例：`action=example, name=cottage`（人仔比例场景）或 `retro-computer`（展示比例物件），读它的 build.mjs、看它的 out/hero.png。
4. 零件**不要整表打印**——搜索：`action=parts, query="slope curve"`；单零件销位：`action=part, id=3001`。颜色：`docs colors`。
5. **卡住才读** `docs reference`（九个官方街景实测数字 + 三级查阅法）。

---

## 0. 渲染不是可选项

评审回路（第 5 步）是"通过检查"到"看着对"的必经之路。`action=shots` 需要 Playwright（首次约 100MB Chromium，一次性；Windows 无 GPU 自动落 CPU 软渲染，图是正确的只是慢）。若 shots 返回 needsPlaywright/blocked：**停下来问用户**——① 允许安装 Playwright；② 请用户开「积木工坊」→「审查图」标签点「用面板渲染出图」，由面板 3D 截图回传存盘，不装 Chromium 也能出图；③ 请用户直接开「3D 模型」标签亲眼看（面板不依赖 Playwright）。**没看过渲染图的集合不许交付。**

处理面板批注时，用批注附带的视角复渲染对照：`action=shots, name=…, az=<view.azimuth>, el=<view.elevation>`——从用户正在看的角度出图。

## 1. 六步管线——按序执行

### 第 1 步 · Brief（至多一轮提问）
`action=new` 建集合 → 填 `brief.md`：主体一句话 + **比例**（§3）+ **3–5 个签名特征**（让主体可认的那几样）+ 尺寸（占格 stud × 高 plate × 目标件数）+ **4–8 色**（§4）+ 主动舍弃项。

**提问纪律**：请求做不了（"整座城市"）→ 给出缩小方案让用户确认；答案会显著改变结果且推不出来（"一台电脑"是 80 年代米色台式机还是现代笔记本？）→ 问。所有问题**一条消息**问完，每个带你的默认方案。请求清晰就不问。总共至多两轮。

**只有文字**：先自查资料写下真实物的比例（宽:深:高）、材质颜色、让人记住的细节，再写 brief。有图工具就看 2-3 张照片。
**有参考图**：先量像素比例（宽:深:高 → studs）、数窗口/柱子/层数、记颜色，写下看不见的部分（背面）怎么处理。参考图存进集合目录，第 5 步对照用。

### 第 2 步 · Blockout
build.mjs 只搭大块：`m.box(...)` 摆正占格与高度，场景先铺 `kit.base`。`action=build` → `action=quick渲染` 看剪影。**此刻改比例最便宜。**有图就 `action=shots, ref=<图>, view=front` 出 compare.png 对照。
（quick 渲染 = `action=shots, quick=true`，hero+front 双 640px 图，秒级。）

### 第 3 步 · Detail
**从最完整的 kit 起步**——建筑 `kit.building`、车 `kit.vehicle`、电器盒子 `kit.casing`，家具/植物/人仔各有 kit，一次调用得到正确结构，再定制成"这一个"主体。然后按 section 建（`m.section('tower', …)`），签名特征精雕，加质感与生活气（§5）。找不到零件就 `action=parts` 搜。

### 第 4 步 · Check——必须 PASS
`action=build` 跑检查器，**0 错误**才能继续。每条消息带"哪里（build.mjs 行号 + 网格坐标）+ 怎么办"，修因不修症（"not connected" 通常是高了一板、站在光滑 tile 上、或站在斜坡的斜面上）。

### 第 5 步 · Review——批判性地看自己的渲染图
`action=shots` 出 sheet（六视图）+ hero。**每轮都打开看。**调单处用 quick，轮次结算用完整 shots；特写 `only=<section>`；对照参考 `ref=<图>`。
1. **先批评**：在 brief.md 写 ≥5 条具体问题（"左墙是 10×12 的空白面""塔比门还窄"）。默认有个严苛的乐高设计师在盯着。
2. **再评分**：`action=review, scores={"recognisable":…,…}, critiques="…"`——按 rubric 六行（含 caps 封顶：大空白墙 Detail ≤5）。面板会画雷达图。
3. **先修最低行**。每行 ≥7 才交付，**至多 3 轮**；到期带着诚实的弱点说明交付。

**不许早停**：交付 = check PASS + ≥300 件 + ≥2 轮书面批评 + 签名特征全部建成。某个 kit 调用失败就简化那一个特征继续——绝不交付 blockout。

### 第 6 步 · Deliver
告诉用户：产物路径（`out/set.html` 双击即看，面板 3D 标签也能看）；`model.ldr` 可导入 BrickLink Studio 得拼搭步骤和购买清单；说明拖转/拆开/重建玩法。**面板批注还有待处理的，先处理完再交付。**

**导出（交付必做）**：调 `action=export, name=<集合名>` 把 set.html / model.ldr / parts.csv / report.txt / 全部渲染图打包成 ZIP（落在 `<集合>/out/export/<slug>-v<版号>.zip`，面板详情页「⬇ 导出 ZIP」按钮下载的是同一个包）。把 ZIP 路径写给用户——out/ 里的散文件用户不方便取，ZIP 才是交付物。

---

## 2. 坐标系
```
        −z (back)
          ↑
 −x  ←  (set)  →  +x          x, z: studs（占格列）       y: plates，向上（1 砖 = 3 板）
          ↓                    零件的 x, z = 占格最小角；y = 底面高度
        +z (front: 朝默认相机)
```
- `rot` 绕自身中心每次转 1/4 圈（0–3）。2×4 砖 rot 1 时占格变 4×2。
- 零件落在下方零件顶面：砖 y=3 坐在砖 y=0 上；板 y=1 坐在板 y=0 上。
- **正面 = +z**，最有趣的一面朝这。一切"面向"统一：**rot 0 朝前(+z)、1 朝右(+x)、2 朝后(−z)、3 朝左(−x)**。左墙的窗是 rot 3。
- `box()` 从 x 到 x+w−1：前墙是 z+d−1 行，后墙 z 行，左墙 x 列，右墙 x+w−1 列。
- 半格（x=2.5）只允许出现在跳板（15573/87580）钉位上。

## 3. 比例——选一个，全程一致
- **人仔比例**（场景/建筑/带人的车）：人仔 2×1 stud、含发 ~13 plate 高。门 1×4×6（18 plate）；一层 18–24 plate；车宽 4–6 stud；树 20–35 plate。
- **展示比例**（物件即套装：电脑/相机/吉他）：细节都要真零件砌出（小物件常 1:2–1:1）。1 stud=8mm；每个签名细节 ≥2 stud 宽。
- **微缩比例**（整个街区/大船）：1 stud≈1–2m；窗变 tile 和格栅，不放人。
- 混比例是人像最常见死因。活物用人仔/注塑件（`kit.minifig`、`action=parts, query="animal"`）——"我的猫坐沙发上"是人仔比例房间+一只注塑猫，不是砖雕猫。
- **站位高度**：y 永远是"你放零件的那个顶面"的标高——底座顶（g）、底座上加铺板 g+1、加砖 g+3。

## 4. 颜色
4–8 色：一主色（主体材质）+一两副色+一两点缀色（门/招牌/花，省着用）。对照实物选最近的乐高色（`docs colors`；gray/brown 等别名可用）：石头 Tan/Light Bluish Gray/Dark Tan；木 Reddish Brown/Dark Tan；屋顶 Dark Bluish Gray/Reddish Brown/Dark Red；玻璃 Trans Clear。底座用中性色衬托主体。

## 5. 什么让套装"看起来被设计过"
1. **签名特征精确**：比例位置都对——错了其他全白搭。
2. **剪影与比例**：对照实物，真实比值，只在零件逼你时压缩。
3. **没有死面**：大墙用窗、壁柱（1×1 圆砖）、檐口、变色勒脚、格栅打破；地面/路面/桌面**铺 tile**；草地/屋顶留 stud 当质感。官方街景基准：**1.13 plate/砖、17.6% tile**。立面平就退一板出檐，胜过任何贴花。
4. **零件多样性**：坡/弧/圆件。全是基础砖看着像 blockout（<25% 特殊件检查器警告；好套装 25–50%）。
5. **生活气**（人仔比例）：1–3 个人仔各做一件读得懂的事，几株植物，一两件道具。不要人群。
6. **一个结构**：万物连接；人仔通道 ≥2 stud 宽；人仔两侧各留 1 stud（胳膊）、头顶 4 砖内不放东西。（只有车可以停在自己的轮子上。）
7. **经济**：`box(..., {hollow:true})` 空心、楼板用大板、看不见的地方不填实。

自问顺序（第一个 no 就停）：**缩略图能认出主体吗 → 体量成比例吗 → 有一个主角两个配角吗 → 有安静的表面吗 → 重复的母题随功能变化吗**。

## 6. build.mjs API
```js
export default function build({ Model, kit }) {
  const m = new Model({ title: 'Corner Bakery', subtitle: '…', budget: [600, 1500] });
  const g = kit.base(m, { w: 32, d: 24, color: 'Dark Bluish Gray' });   // 返回顶面标高
  m.section('shop', () => {
    m.box(4, g, 6, 16, 10, 18, 'Tan', { hollow: true });                // 空心墙 16×10、18 板高
    kit.door(m, { x: 10, y: g, z: 15, color: 'Dark Green' });           // 自己开洞
    kit.window(m, { x: 5, y: g + 6, z: 15, size: '1x2x3' });
    m.box(4, g + 18, 6, 16, 10, 1, 'Dark Bluish Gray', { kind: 'plate' });
    kit.roof(m, { x: 4, y: g + 19, z: 6, w: 16, d: 10, color: 'Reddish Brown' });
  });
  kit.minifig(m, { x: 22, y: g, z: 18, torso: 'apron', shirt: 'White', face: 'smile', hair: 'bob', hairColor: 'Dark Brown' });
  return m;
}
```
| 调用 | 作用 |
|---|---|
| `new Model({ title, subtitle, budget:[min,max], focus, view })` | `focus:'<section>'` 开场聚焦某区块；`view:[方位角°,仰角°]` 开场视角（默认 [35,24]） |
| `m.part(id, x, y, z, color, rot)` | 任意真零件（`action=parts` 找） |
| `m.brick/plate/tile('1x4', x, y, z, color, rot)` | 按尺寸名放基础件；rot 0 长边沿 x，rot 1 沿 z |
| `m.box(x,y,z,w,d,h,color,{hollow,kind,top})` | 体素填墙，自动错缝。h 是 3 的倍数用砖；`kind:'plate'` 楼板、`'tile'` 光滑地面；`hollow` 1 stud 厚墙；`top:'plate'` 实心盖（上面要建更窄体量/烟囱时必须） |
| `m.cut(x,y,z,w,d,h)` | 删已填体素（门窗洞）：先 box 后 cut；kit 自己开洞 |
| `m.section(tag, fn)` | 打标签（检查消息定位；面板里按区块秒选；`shots only=<tag>` 单渲） |
| `m.rigid(fn)` | 刚体组——SNOT 已被检查器逐销验证，**不要用它遮错** |

**kit 速查**（全部经过验证，别重造）：`kit.building`（完整建筑，可 `shop:{sign,awning,glazing}` 变店面，返回楼层标高）、`kit.base`、`kit.window/door`（自开洞）、`kit.roof`（45° 双坡，脊向偶数 stud，返回顶标高）、`kit.tree/pine/bush/flower/palm`、`kit.lamp`、`kit.bench/fence/flowerBed`、`kit.water`（先水后岛）、`kit.rocks`（**永不用阶梯矩形造岩石**）、`kit.island`、`kit.roundTower`、`kit.wheels`（返回车身标高；车可以停着）、`kit.vehicle`（完整车，返回 cabSeat/bed）、`kit.casing`（展示比例电器壳）、`kit.minifig`（`sit:true` 坐姿；`kit.chair/sofa/bench` 返回坐席坐标直接展开传给它）、`kit.table/bookshelf/rug`、`kit.sign`（A–Z 银字招牌，SNOT 侧贴）、`kit.panel`（光滑面板/屏幕）、`kit.studTile/studCourse/sideRow/sideStuds`（自装 SNOT）、`kit.stairs`、`kit.awning`、`kit.snowman`。

**SNOT 要点**：侧销砖是铰链。规则：一行 y 必须是砖层底（y, y+3…）；该处墙 1 stud 厚且上方还有 ≥1 板压住；瓷砖凸出墙面 1 板，前面留空。检查器逐销验证侧销——挂偏半格必挂。常用侧销件：`4733`（四面）、`47905/26604`（两面）、`87087/11211`（单面）、`30414/2434`（长排）、`22885/32952/67329`（双课程）、`99780/99781/2436a/21731`（支架）。`action=parts, query="side"` 列全。真套装约百分之一的零件用 SNOT，用在"这面必须光滑/这个细节必须朝侧面"的地方。

**老虎窗（屋顶开窗，实测技法）**：kit.roof 无法打洞。做法：整条屋顶自己手写——按 kit.roof 同构铺前后坡（3039 每层 z 退 1 stud 升 3 板，rot 0/2 分朝前后）、屋脊用 3043、**山花封板必须通铺全宽**（`m.box(x, y+k*3, z+k+2, W, D-4-2k, 3, 山墙色)`——它既是封板也是各层斜面的连接基石，拆段必断连接）；在老虎窗的 x 列跳铺前坡下两层斜面，改立壁架（两侧砖柱 + 前裙，立在檐口带销位上）、前裙上放 1×2×2 白窗、顶盖深灰平顶。壁架凸出立面 1–2 stud 都行，检查器以底面销位判连接。

## 7. 检查器消息
- **passes through**：两件同空间。移开；或 part 与 box 同格（先 box 后 cut）。拱洞下/斜坡低侧按柱判定天然放行。
- **not connected**：那组零件列在消息里。悬空/站在 tile 上/站在斜面上/卡在两板之间/销位没对齐。精确坐在下方销钉上。
- **no anti-studs**：夹子/杆类坐不了销钉。换件或交给 kit。
- **off the stud grid / between plate levels**：x,z 整 stud（跳板除外）、y 整 plate。
- 预算/特殊件占比/主色数的警告关乎品质，认真对待。

## 8. 禁忌
- 不发明零件或 id：只用 `action=parts` 列得出来的。
- 不让主体裸浮：场景铺底座；物件自己有脚/底。
- 不满填实心砖；不堆 2,000 件填充料。
- **不跳过看渲染图**。检查器证明拼得出来，不证明好看。
- 面板批注不回：用户框了区域等半天没反应是最差的体验。回执里出现「ⓘ 面板批注」立即处理并 resolve。

## 9. 面板协作（积木工坊专属）
- 你每次 `action=build/shots/review/stage`，面板时间线实时长一帧；build 通过会存版本快照（面板可回看任意版本 3D、做零件级 diff）。
- build PASS 后的面板「体素（设计意图）」开关能看到你 box 声明的体素 vs pack 后的真实砖——利用它自查体量。
- 用户批注的 `bbox` 是 build 坐标系（x/z stud、y plate、正面 +z），`sections` 直接对应 `m.section` 的 tag——按 tag 改对应代码段即可。
- 汇报进展时给用户指路：「面板 → 积木工坊 可实时查看；框选区域可直接批注修改」。
