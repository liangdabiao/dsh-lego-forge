// The set viewer: one self-contained page per set. Real LDraw geometry, instanced; drag to turn, scroll to zoom;
// Take apart (the bricks burst and drift) and Rebuild (they rain back into place, bottom layer first).
// URL options: ?sheet (six review views in one image) · ?view=hero|front|back|left|right|top · ?only=<tag> · ?still (no intro, no idle spin)
//             ?az=&el= (opening view in degrees — custom review angles) · ?embed=1 (dsh 面板嵌入：拾取/框选/区块秒选 + postMessage 桥)
// lego-forge 分叉说明：上游逻辑原样保留；新增集中在两处——① VIEWS.hero 的 az/el 覆写两行；② 文件尾部的 EMBED 桥
//（拾取、框选、section 秒选、视角上报、工具条 DOM 动态创建）。不嵌入时（直接打开 set.html / shots 渲染）行为与上游一致。
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const SET = window.SET; const Q = new URLSearchParams(location.search);
const SHEET = Q.has('sheet'), STILL = Q.has('still') || SHEET || Q.has('view'), ONLY = Q.get('only');

// ---- renderer, scene, light -------------------------------------------------------------------------------------------------
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: STILL });
renderer.setPixelRatio(Math.min(2, devicePixelRatio)); renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer); scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.add(new THREE.HemisphereLight(0xffffff, 0xb9b2a6, 0.55));
const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02; scene.add(sun, sun.target);
const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 2000);

// ---- geometry --------------------------------------------------------------------------------------------------------------
const bytes = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
function decode(g) {
  if (!g) return null; const P = new Int16Array(bytes(g.pos).buffer), N = new Int8Array(bytes(g.nrm).buffer), ib = bytes(g.idx);
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(Float32Array.from(P, (v) => v / g.q), 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(Float32Array.from(N, (v) => v / 127), 3));
  if (g.col) geo.setAttribute('color', new THREE.BufferAttribute(Float32Array.from(bytes(g.col), (v) => v / 255), 3));
  geo.setIndex(new THREE.BufferAttribute(g.i32 ? new Uint32Array(ib.buffer) : new Uint16Array(ib.buffer), 1)); return geo;
}
/** shrink a part by a hair about its own centre so the seams between bricks read, as they do on a real model */
function seam(geos) { const b = new THREE.Box3(); for (const g of geos) if (g) { g.computeBoundingBox(); b.union(g.boundingBox); } const c = b.getCenter(new THREE.Vector3()), s = b.getSize(new THREE.Vector3()); const k = [s.x, s.y, s.z].map((v) => (v > 0.1 ? (v - 0.018) / v : 1));
  for (const g of geos) if (g) { const P = g.attributes.position.array; for (let i = 0; i < P.length; i += 3) { P[i] = c.x + (P[i] - c.x) * k[0]; P[i + 1] = c.y + (P[i + 1] - c.y) * k[1]; P[i + 2] = c.z + (P[i + 2] - c.z) * k[2]; } g.computeBoundingBox(); } }
const GEO = {}; for (const [id, g] of Object.entries(SET.geo)) { GEO[id] = { main: decode(g.main), deco: decode(g.deco), glass: decode(g.glass), ds: g.ds }; seam([GEO[id].main, GEO[id].deco, GEO[id].glass]); }

// ---- instances --------------------------------------------------------------------------------------------------------------
// SET.inst: [id, '#rrggbb', alpha, x, y, z, m0..m8, tag] — the LDraw origin of each part and its rotation, in studs (y up)
const items = SET.inst.filter((r) => !ONLY || r[15] === ONLY).map((r, i) => {
  const m = new THREE.Matrix4().set(r[6], r[7], r[8], 0, r[9], r[10], r[11], 0, r[12], r[13], r[14], 0, 0, 0, 0, 1);
  const pos = new THREE.Vector3(r[3], r[4], r[5]); const quat = new THREE.Quaternion().setFromRotationMatrix(m);
  return { id: r[0], hex: r[1], alpha: r[2], home: { pos, quat }, i };
});
const box = new THREE.Box3(); for (const it of items) box.expandByPoint(it.home.pos); for (const it of items) { const b = GEO[it.id].main?.boundingBox; }
// a precise box: every part's geometry bounds
{ box.makeEmpty(); const tmp = new THREE.Box3(), M = new THREE.Matrix4(); for (const it of items) { const g = GEO[it.id].main ?? GEO[it.id].deco ?? GEO[it.id].glass; g.computeBoundingBox(); M.compose(it.home.pos, it.home.quat, new THREE.Vector3(1, 1, 1)); tmp.copy(g.boundingBox).applyMatrix4(M); box.union(tmp); } }
const center = box.getCenter(new THREE.Vector3()); const size = box.getSize(new THREE.Vector3()); const radius = size.length() / 2;
for (const it of items) it.home.pos.sub(new THREE.Vector3(center.x, box.min.y, center.z));   // model stands on y = 0, centred
const groupKey = (it) => `${it.id}|${it.alpha < 1 ? 't' : 'o'}`;
const batches = new Map(); for (const it of items) { const k = groupKey(it); if (!batches.has(k)) batches.set(k, []); batches.get(k).push(it); }
const matO = new THREE.MeshStandardMaterial({ roughness: 0.32, metalness: 0, envMapIntensity: 0.75 });
const matDS = matO.clone(); matDS.side = THREE.DoubleSide;
const matT = new THREE.MeshPhysicalMaterial({ roughness: 0.05, metalness: 0, transparent: true, opacity: 0.55, envMapIntensity: 1.3, depthWrite: false });
const matGlass = new THREE.MeshPhysicalMaterial({ roughness: 0.05, metalness: 0, transparent: true, opacity: 0.5, vertexColors: true, envMapIntensity: 1.3, depthWrite: false });
const matDeco = new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0, vertexColors: true, envMapIntensity: 0.75, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
const meshes = []; const col = new THREE.Color();
for (const [k, list] of batches) {
  const g = GEO[list[0].id]; const trans = k.endsWith('|t');
  if (g.main) { const mesh = new THREE.InstancedMesh(g.main, trans ? matT : g.ds ? matDS : matO, list.length); mesh.castShadow = !trans; mesh.receiveShadow = true; mesh.frustumCulled = false;
    list.forEach((it, j) => { col.set(it.hex); if (trans) col.multiplyScalar(1.0); mesh.setColorAt(j, col); it.slots = [[mesh, j]]; }); if (trans) mesh.renderOrder = 2; scene.add(mesh); meshes.push(mesh); }
  if (g.glass) { const mesh = new THREE.InstancedMesh(g.glass, matGlass, list.length); mesh.renderOrder = 2; mesh.frustumCulled = false; list.forEach((it, j) => { (it.slots ??= []).push([mesh, j]); }); scene.add(mesh); meshes.push(mesh); }
  if (g.deco) { const mesh = new THREE.InstancedMesh(g.deco, matDeco, list.length); mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
    list.forEach((it, j) => { (it.slots ??= []).push([mesh, j]); }); scene.add(mesh); meshes.push(mesh); }
}
const M4 = new THREE.Matrix4(), ONE = new THREE.Vector3(1, 1, 1);
function pose(it, pos, quat, s = 1) { M4.compose(pos, quat, s === 1 ? ONE : new THREE.Vector3(s, s, s)); for (const [mesh, j] of it.slots) mesh.setMatrixAt(j, M4); }
function commit() { for (const m of meshes) m.instanceMatrix.needsUpdate = true; }
for (const it of items) pose(it, it.home.pos, it.home.quat); commit();

// ground: a soft shadow catcher
const ground = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShadowMaterial({ opacity: 0.18 })); ground.rotation.x = -Math.PI / 2; ground.scale.setScalar(radius * 8); ground.receiveShadow = true; scene.add(ground);
sun.position.set(radius * 1.2, radius * 2.2, radius * 1.6); sun.target.position.set(0, size.y * 0.3, 0);
const sc = sun.shadow.camera; sc.left = sc.bottom = -radius * 1.6; sc.right = sc.top = radius * 1.6; sc.near = 0.1; sc.far = radius * 8; sc.updateProjectionMatrix();

// ---- camera ------------------------------------------------------------------------------------------------------------------
const target = new THREE.Vector3(0, size.y * 0.42, 0);
const fitDist = (fov, aspect) => { const vf = THREE.MathUtils.degToRad(fov) / 2, hf = Math.atan(Math.tan(vf) * aspect); return (radius * 0.92) / Math.sin(Math.min(vf, hf)); };
const VIEWS = { hero: [0.62, 0.42], front: [0, 0.12], back: [Math.PI, 0.12], left: [-Math.PI / 2, 0.12], right: [Math.PI / 2, 0.12], top: [0.0001, 1.5], hero2: [-2.4, 0.5] };
function place(cam, az, el, aspect, k = 1) { const d = fitDist(cam.fov, aspect) * k; cam.position.set(target.x + Math.sin(az) * Math.cos(el) * d, target.y + Math.sin(el) * d, target.z + Math.cos(az) * Math.cos(el) * d); cam.lookAt(target); }
const controls = new OrbitControls(camera, canvas); controls.target.copy(target); controls.enableDamping = true; controls.dampingFactor = 0.08; controls.minDistance = radius * 0.6; controls.maxDistance = radius * 6; controls.maxPolarAngle = Math.PI * 0.49;
controls.autoRotate = !STILL; controls.autoRotateSpeed = 0.6;

function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
// the opening view: the set's own choice (meta.view: [azimuth, elevation] in degrees; meta.focus: a section to frame closer)
if (SET.meta.view) VIEWS.hero = [THREE.MathUtils.degToRad(SET.meta.view[0]), THREE.MathUtils.degToRad(SET.meta.view[1])];
// lego-forge: 显式 az/el 查询参数优先于 meta.view（面板批注的"同角度复渲染"走这里；单位度）
{ const az = parseFloat(Q.get('az')), el = parseFloat(Q.get('el')); if (Number.isFinite(az) && Number.isFinite(el)) VIEWS.hero = [THREE.MathUtils.degToRad(az), THREE.MathUtils.degToRad(el)]; }
let heroK = 1;
if (SET.meta.focus && !ONLY && !SHEET) { const fb = new THREE.Box3(), tmp = new THREE.Box3(), M = new THREE.Matrix4();
  for (const it of items) { if (SET.inst[it.i][15] !== SET.meta.focus) continue; const g = GEO[it.id].main ?? GEO[it.id].deco ?? GEO[it.id].glass; M.compose(it.home.pos, it.home.quat, new THREE.Vector3(1, 1, 1)); tmp.copy(g.boundingBox).applyMatrix4(M); fb.union(tmp); }
  if (!fb.isEmpty()) { const c = fb.getCenter(new THREE.Vector3()); target.lerp(c, 0.35); heroK = Math.max(0.78, Math.min(1, (fb.getSize(new THREE.Vector3()).length() / 2) / radius * 2.2)); } }
const [az0, el0] = VIEWS[Q.get('view') ?? 'hero'] ?? VIEWS.hero; place(camera, az0, el0, camera.aspect, Q.get('view') && Q.get('view') !== 'hero' ? 1 : heroK); controls.target.copy(target); controls.update();

// ---- take apart / rebuild ----------------------------------------------------------------------------------------------------
// state: 'built' | 'apart' | 'rebuilding'. Both motions are closed-form functions of time, so they look the same on every machine.
let state = 'built', t0 = 0; const clock = new THREE.Clock();
const rnd = (i, k) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
items.forEach((it) => {
  const p = it.home.pos; const dir = new THREE.Vector3(p.x, 0, p.z); if (dir.lengthSq() < 1e-4) dir.set(rnd(it.i, 1) - 0.5, 0, rnd(it.i, 2) - 0.5); dir.normalize();
  const sp = 0.8 + rnd(it.i, 3) * 1.4; it.vel = new THREE.Vector3(dir.x * sp * radius * 0.5, (0.4 + rnd(it.i, 4) * 0.9) * radius * 0.45 + (p.y / Math.max(1, size.y)) * radius * 0.3, dir.z * sp * radius * 0.5);
  it.spin = new THREE.Vector3(rnd(it.i, 5) - 0.5, rnd(it.i, 6) - 0.5, rnd(it.i, 7) - 0.5).normalize(); it.rate = 0.6 + rnd(it.i, 8) * 1.6;
  it.drift = new THREE.Vector3(rnd(it.i, 9) - 0.5, rnd(it.i, 10) - 0.5, rnd(it.i, 11) - 0.5).multiplyScalar(radius * 0.02);
});
const tmpP = new THREE.Vector3(), tmpQ = new THREE.Quaternion(), spinQ = new THREE.Quaternion();
function apartPose(it, t) {   // burst out fast, slow to a drift that never quite stops
  const k = 1 - Math.exp(-t * 2.2); tmpP.copy(it.home.pos).addScaledVector(it.vel, k).addScaledVector(it.drift, t);
  spinQ.setFromAxisAngle(it.spin, it.rate * (k * 2.2 + t * 0.15)); tmpQ.copy(it.home.quat).premultiply(spinQ); return [tmpP, tmpQ];
}
const ys = items.map((it) => it.home.pos.y); const yMin = Math.min(...ys), yMax = Math.max(...ys);
const order = items.map((it) => (it.home.pos.y - yMin) / Math.max(1e-6, yMax - yMin) * 0.85 + rnd(it.i, 12) * 0.15);
const REBUILD = 3.2, LAND = 0.55;
function rebuildPose(it, t, from) {   // each brick falls into place in turn, the bottom layer first, and settles with a small bounce
  const start = order[it.i] * (REBUILD - LAND); const k = Math.min(1, Math.max(0, (t - start) / LAND));
  if (k <= 0) return from; const e = k < 1 ? 1 - Math.pow(1 - k, 3) : 1; const bounce = Math.sin(Math.PI * Math.min(1, k * 1.4)) * 0.06 * (1 - k);
  tmpP.copy(from[0]).lerp(it.home.pos, e); tmpP.y += bounce * radius * 0.05; tmpQ.copy(from[1]).slerp(it.home.quat, e); return [tmpP, tmpQ];
}
let apartAt = 0; const snapshot = new Map();
function setState(s) {
  if (s === 'apart') { state = 'apart'; t0 = clock.elapsedTime; }
  if (s === 'rebuilding') { const ta = clock.elapsedTime - t0; for (const it of items) { const [p, q] = state === 'apart' ? apartPose(it, ta) : intro(it); snapshot.set(it, [p.clone(), q.clone()]); } state = 'rebuilding'; t0 = clock.elapsedTime; }
  ui();
}
function intro(it) { const p = it.home.pos.clone(); p.y += radius * 2.2 + rnd(it.i, 13) * radius * 0.6; p.x += (rnd(it.i, 14) - 0.5) * radius * 0.4; p.z += (rnd(it.i, 15) - 0.5) * radius * 0.4; return [p, it.home.quat.clone().premultiply(new THREE.Quaternion().setFromAxisAngle(it.spin, 2))]; }

// ---- UI -------------------------------------------------------------------------------------------------------------------------
const $ = (id) => document.getElementById(id);
$('title').textContent = SET.meta.title; $('sub').textContent = SET.meta.subtitle || ''; $('count').textContent = `${SET.meta.parts.toLocaleString('en-US')} pieces · ${SET.meta.colors} colours`;
document.title = SET.meta.title;
function ui() { $('apart').hidden = state !== 'built'; $('rebuild').hidden = state === 'built'; $('rebuild').disabled = state === 'rebuilding'; }
$('apart').onclick = () => setState('apart'); $('rebuild').onclick = () => setState('rebuilding');
if (SHEET || STILL) document.body.classList.add('still'); if (SHEET) document.body.classList.add('sheet');

// ---- loop -----------------------------------------------------------------------------------------------------------------------
if (!STILL) { for (const it of items) snapshot.set(it, intro(it)); state = 'rebuilding'; t0 = 0; }
ui();
function frame() {
  const t = clock.getElapsedTime();
  if (state === 'apart') { const ta = t - t0; for (const it of items) { const [p, q] = apartPose(it, ta); pose(it, p, q); } commit(); }
  else if (state === 'rebuilding') { const tr = t - t0; for (const it of items) { const [p, q] = rebuildPose(it, tr, snapshot.get(it)); pose(it, p, q); } commit(); if (tr > REBUILD + 0.1) { for (const it of items) pose(it, it.home.pos, it.home.quat); commit(); state = 'built'; ui(); } }
  controls.update(); renderer.render(scene, camera); requestAnimationFrame(frame);
}
function sheet() {   // six views in a 3 × 2 grid, for review
  const W = 1800, H = 1200; renderer.setPixelRatio(1); renderer.setSize(W, H, false); canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  const names = ['hero', 'front', 'right', 'back', 'left', 'top']; renderer.setScissorTest(true); renderer.setClearColor(0xf2f0ea, 1);
  const cam = new THREE.PerspectiveCamera(30, 1.5, 0.1, 2000);
  names.forEach((n, i) => { const x = (i % 3) * 600, y = H - (Math.floor(i / 3) + 1) * 600; renderer.setViewport(x, y, 600, 600); renderer.setScissor(x, y, 600, 600); cam.aspect = 1; cam.updateProjectionMatrix(); place(cam, ...VIEWS[n], 1, 0.94); renderer.render(scene, cam); });
  $('labels').innerHTML = names.map((n, i) => `<span style="left:${(i % 3) * 600 + 12}px;top:${Math.floor(i / 3) * 600 + 10}px">${n}</span>`).join('');
}
if (SHEET) { sheet(); window.__ready = true; } else { frame(); requestAnimationFrame(() => requestAnimationFrame(() => { window.__ready = true; })); }

// ==============================================================================================================================
// lego-forge 嵌入桥（?embed=1 且确在 iframe 内才激活）：拾取 / 框选 / 区块秒选 / 视角上报 / postMessage。
// 设计约束：不碰上游渲染逻辑；选择只动 instanceColor（可逐位还原）；坐标系换算在发送前完成——
// viewer 把模型居中时减掉了 (center.x, box.min.y, center.z)，发回 build 坐标要加回来，agent 拿到的数字直接可用。
// ==============================================================================================================================
const EMBED = Q.get('embed') === '1' && !SHEET && window.parent !== window;
if (EMBED) {
  const tagOf = (it) => SET.inst[it.i][15] || '';
  const post = (type, payload) => { try { window.parent.postMessage({ source: 'lego-forge-viewer', type, payload }, '*'); } catch { /* 跨域拆除时静默 */ } };

  // —— 每件的世界包围盒（框选与批注 bbox 共用；几何真包围盒，含旋转）——
  const itemBox = new Map();
  { const gBox = new THREE.Box3();
    for (const it of items) {
      const g = GEO[it.id].main ?? GEO[it.id].deco ?? GEO[it.id].glass; g.computeBoundingBox();
      M4.compose(it.home.pos, it.home.quat, ONE); gBox.copy(g.boundingBox).applyMatrix4(M4);
      itemBox.set(it, [[gBox.min.x, gBox.min.y, gBox.min.z], [gBox.max.x, gBox.max.y, gBox.max.z]]);
    } }

  // —— mesh/instanceId → item 反查表（raycast 用）——
  const byInstance = new Map();
  for (const it of items) for (const [mesh, j] of it.slots) {
    if (!byInstance.has(mesh)) byInstance.set(mesh, new Map());
    byInstance.get(mesh).set(j, it);
  }

  // —— 选择状态与高亮（instanceColor 精确还原）——
  const selected = new Set();
  const hi = new THREE.Color(0xff8a3d);
  function highlight(it, on) {
    for (const [mesh, j] of it.slots) {
      if (!mesh.instanceColor) continue;
      mesh.setColorAt(j, on ? hi : col.set(it.hex));
      mesh.instanceColor.needsUpdate = true;
    }
  }
  function clearSelection() { for (const it of selected) highlight(it, false); selected.clear(); sendSelection(); }
  function setSelection(list) {
    for (const it of selected) if (!list.includes(it)) highlight(it, false);
    selected.clear(); for (const it of list) { selected.add(it); highlight(it, true); }
    sendSelection();
  }
  function sendSelection() {
    if (!selected.size) { post('selection', { kind: 'none', count: 0, sections: [], parts: [], bbox: null }); renderChip(); return; }
    const list = [...selected];
    const sections = [...new Set(list.map(tagOf).filter(Boolean))];
    const counts = new Map();
    let bb = [[Infinity, Infinity, Infinity], [-Infinity, -Infinity, -Infinity]];
    for (const it of list) {
      const k = `${it.id}|${it.hex}`; const e = counts.get(k) ?? { id: it.id, color: it.hex, count: 0 }; e.count++; counts.set(k, e);
      const [lo, hiB] = itemBox.get(it);
      for (let a = 0; a < 3; a++) { bb[0][a] = Math.min(bb[0][a], lo[a]); bb[1][a] = Math.max(bb[1][a], hiB[a]); }
    }
    // viewer 坐标 → build 坐标：加回居中偏移（x/z 加 center，y 加 box.min.y）
    const bbox = {
      x0: +(bb[0][0] + center.x).toFixed(2), y0: +(bb[0][1] + box.min.y).toFixed(2), z0: +(bb[0][2] + center.z).toFixed(2),
      x1: +(bb[1][0] + center.x).toFixed(2), y1: +(bb[1][1] + box.min.y).toFixed(2), z1: +(bb[1][2] + center.z).toFixed(2),
    };
    post('selection', {
      kind: mode === 'section' ? 'section' : (mode === 'box' ? 'region' : 'parts'),
      count: list.length, sections, bbox,
      parts: [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 60),
    });
    renderChip();
  }

  // —— 视角上报（与 meta.view 同语义：azimuth/elevation，度）——
  function currentView() {
    const dx = camera.position.x - target.x, dy = camera.position.y - target.y, dz = camera.position.z - target.z;
    return { azimuth: +(THREE.MathUtils.radToDeg(Math.atan2(dx, dz))).toFixed(1), elevation: +(THREE.MathUtils.radToDeg(Math.atan2(dy, Math.hypot(dx, dz)))).toFixed(1) };
  }
  let viewTimer = 0;
  const reportView = () => { clearTimeout(viewTimer); viewTimer = setTimeout(() => post('view', currentView()), 250); };
  controls.addEventListener('end', reportView);

  // —— 工具条 DOM（动态创建，不依赖模板改动；模板保持上游原样）——
  const bar = document.createElement('div');
  bar.style.cssText = 'position:fixed;top:14px;right:14px;z-index:30;display:flex;gap:6px;align-items:center;font:12px -apple-system,"PingFang SC",Helvetica,sans-serif;user-select:none';
  const MODES = [['off', '浏览', '自由拖转（默认）'], ['single', '单选', '单击选一个零件'], ['box', '框选', '拖一个矩形框住一批零件'], ['section', '区块', '点一下选中整个 section（build.mjs 里 m.section 的范围）']];
  let mode = 'off';
  const buttons = MODES.map(([m, label, title]) => {
    const b = document.createElement('button'); b.textContent = label; b.title = title; b.dataset.m = m;
    b.style.cssText = 'font:inherit;font-weight:600;border:0;border-radius:999px;padding:7px 13px;background:rgba(31,33,36,.82);color:#fff;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.14)';
    b.onclick = () => setMode(m); return b;
  });
  const chip = document.createElement('span');
  chip.style.cssText = 'font:inherit;font-weight:600;border-radius:999px;padding:7px 12px;background:rgba(255,138,61,.92);color:#fff;display:none';
  const esc = document.createElement('span');
  esc.textContent = 'Esc 清除'; esc.style.cssText = 'font:inherit;color:#6b6f73;padding:0 4px';
  bar.append(...buttons, chip, esc); document.body.appendChild(bar);
  function renderChip() {
    if (!selected.size) { chip.style.display = 'none'; return; }
    const secs = [...new Set([...selected].map(tagOf).filter(Boolean))];
    chip.textContent = `已选 ${selected.size} 件${secs.length ? ` · ${secs.length} 个区块` : ''}`;
    chip.style.display = '';
  }
  const hint = document.querySelector('.hint');
  const tip = document.createElement('div');
  tip.style.cssText = 'position:fixed;z-index:31;pointer-events:none;display:none;font:12px Menlo,Consolas,monospace;background:rgba(31,33,36,.9);color:#fff;border-radius:8px;padding:6px 9px;white-space:nowrap';
  document.body.appendChild(tip);
  function setMode(m) {
    mode = m; clearSelection();
    for (const b of buttons) b.style.background = b.dataset.m === m ? '#e8734a' : 'rgba(31,33,36,.82)';
    if (hint) hint.textContent = m === 'off' ? 'Drag to turn · scroll to zoom'
      : m === 'single' ? '单击零件选中 · Esc 清除'
      : m === 'box' ? '按住左键拖一个矩形 · Esc 清除'
      : '单击一处选中整个区块 · Esc 清除';
    tip.style.display = 'none';
  }

  // —— 拾取与框选交互 ——
  const ray = new THREE.Raycaster(); const ndc = new THREE.Vector2();
  const rectOf = (ev) => { const r = canvas.getBoundingClientRect(); return [((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1]; };
  // 逐实例射线：手动摆一块 scratch Mesh 到各实例位姿再射（等价复刻 InstancedMesh.raycast）。
  // 不直接用 ray.intersectObjects(meshes)：r170 的该路径在本机（headless swiftshader 与真机 alike）实测对
  // 本项目的量化几何全部落空，而同几何体+同实例矩阵的普通 Mesh 逐个射全部命中——绕开它，一次点击最多
  // 几千次包围球快速拒绝，代价可忽略。
  const scratch = new THREE.Mesh(new THREE.BufferGeometry(), matO);
  const pickM = new THREE.Matrix4();
  function pick(ev) {
    const [nx, ny] = rectOf(ev); ndc.set(nx, ny); ray.setFromCamera(ndc, camera);
    let bestOpaque = null, bestAny = null, dOpaque = Infinity, dAny = Infinity;
    for (const m of meshes) {
      const instMap = byInstance.get(m);
      scratch.geometry = m.geometry; scratch.material = m.material;
      for (let j = 0; j < m.count; j++) {
        m.getMatrixAt(j, pickM);
        scratch.matrixWorld.copy(pickM);
        const hs = ray.intersectObject(scratch, false);
        if (!hs.length) continue;
        const it = instMap.get(j);
        if (!it) continue;
        if (hs[0].distance < dAny) { dAny = hs[0].distance; bestAny = it; }
        if (it.alpha >= 1 && hs[0].distance < dOpaque) { dOpaque = hs[0].distance; bestOpaque = it; }
      }
    }
    return bestOpaque ?? bestAny;
  }
  // 框选：对每件的世界包围盒 8 角做屏幕投影，与拖拽矩形求交（几千件毫秒级）
  const corner = new THREE.Vector3();
  function screenBoxOf(it) {
    const [lo, hiB] = itemBox.get(it);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let a = 0; a < 8; a++) {
      corner.set(a & 1 ? hiB[0] : lo[0], a & 2 ? hiB[1] : lo[1], a & 4 ? hiB[2] : lo[2]).project(camera);
      const sx = (corner.x + 1) / 2 * innerWidth, sy = (1 - corner.y) / 2 * innerHeight;
      x0 = Math.min(x0, sx); y0 = Math.min(y0, sy); x1 = Math.max(x1, sx); y1 = Math.max(y1, sy);
    }
    return [x0, y0, x1, y1];
  }
  let drag = null; const lasso = document.createElement('div');
  lasso.style.cssText = 'position:fixed;z-index:29;border:1.5px dashed #e8734a;background:rgba(232,115,74,.12);display:none;pointer-events:none';
  document.body.appendChild(lasso);

  canvas.addEventListener('pointerdown', (ev) => {
    if (ev.button !== 0 || mode === 'off') return;
    if (mode === 'box') { ev.stopPropagation(); controls.enabled = false; drag = [ev.clientX, ev.clientY]; lasso.style.display = ''; return; }
    drag = [ev.clientX, ev.clientY, true];   // 单/区块：先记起点，抬起时位移小才算点击
  }, true);
  canvas.addEventListener('pointermove', (ev) => {
    if (mode === 'box' && drag) {
      const [x, y] = drag; const x0 = Math.min(x, ev.clientX), y0 = Math.min(y, ev.clientY), x1 = Math.max(x, ev.clientX), y1 = Math.max(y, ev.clientY);
      lasso.style.left = x0 + 'px'; lasso.style.top = y0 + 'px'; lasso.style.width = (x1 - x0) + 'px'; lasso.style.height = (y1 - y0) + 'px';
      return;
    }
    if (mode === 'single' || mode === 'section') {
      const it = pick(ev);
      if (it) { tip.style.display = ''; tip.style.left = (ev.clientX + 14) + 'px'; tip.style.top = (ev.clientY + 12) + 'px';
        tip.textContent = `${it.id} ${it.hex}${tagOf(it) ? ` · ${tagOf(it)}` : ''}`; }
      else tip.style.display = 'none';
    }
  }, true);
  addEventListener('pointerup', (ev) => {
    if (!drag) return;
    if (mode === 'box') {
      lasso.style.display = 'none'; controls.enabled = true;
      const [x, y] = drag; drag = null;
      const x0 = Math.min(x, ev.clientX), y0 = Math.min(y, ev.clientY), x1 = Math.max(x, ev.clientX), y1 = Math.max(y, ev.clientY);
      if (x1 - x0 < 6 && y1 - y0 < 6) return;
      const hit = [];
      for (const it of items) {
        const [sx0, sy0, sx1, sy1] = screenBoxOf(it);
        if (sx1 >= x0 && sx0 <= x1 && sy1 >= y0 && sy0 <= y1) hit.push(it);
      }
      setSelection(hit);
      return;
    }
    const [x, y, isClick] = drag; drag = null;
    if (!isClick || Math.hypot(ev.clientX - x, ev.clientY - y) > 5) return;
    const it = pick(ev);
    if (!it) { clearSelection(); return; }
    if (mode === 'section') {
      const tag = tagOf(it);
      setSelection(tag ? items.filter((u) => tagOf(u) === tag) : [it]);
    } else setSelection([it]);
  }, true);
  addEventListener('keydown', (ev) => { if (ev.key === 'Escape') clearSelection(); });

  // 用户一开始转动就停掉开场自动旋转（框选需要稳定画面）
  controls.addEventListener('start', () => { controls.autoRotate = false; });

  setMode('off');
  post('ready', { title: SET.meta.title, parts: SET.meta.parts, view: currentView() });
  post('view', currentView());   // 面板需要立即拿到初始视角（此后由 controls end 事件续报）
  // 入站：面板发送批注成功后要求清除选择高亮；或请求一张当前视角的 PNG（无 Playwright 兜底）
  addEventListener('message', (ev) => {
    const d = ev.data
    if (d?.source !== 'lego-forge-host') return;
    if (d.type === 'clear') clearSelection();
    if (d.type === 'capture') {
      const v = ['hero', 'front', 'back', 'left', 'right', 'top'].includes(d.payload?.view) ? d.payload.view : 'hero';
      try {
        controls.autoRotate = false;
        if (state !== 'built') { for (const it of items) pose(it, it.home.pos, it.home.quat); commit(); state = 'built'; }
        const [az, el] = VIEWS[v] ?? VIEWS.hero;
        place(camera, az, el, camera.aspect, v === 'hero' ? heroK : 1);
        controls.update();
        const prevColor = renderer.getClearColor(new THREE.Color()), prevAlpha = renderer.getClearAlpha();
        renderer.setClearColor(0xf2f0ea, 1);
        renderer.render(scene, camera);       // 同步渲染后立刻读回，绕开 preserveDrawingBuffer=false
        const dataUrl = canvas.toDataURL('image/png');
        renderer.setClearColor(prevColor, prevAlpha);
        post('capture', { view: v, dataUrl });
      } catch (e) { post('capture-error', { message: String(e?.message ?? e) }); }
    }
  });
}
