// Sierra Sol core: New Bot. World = assets/world.js (Mika), economy = assets/economy.js (New Bot 1).
import * as THREE from 'three';
import { buildWorld } from './assets/world.js';
import { initEconomy } from './assets/economy.js';
import { initNPCs } from './assets/npcs.js';
const VERSION = '0.6', SAVE_KEY = 'sierrasol_save_v1';
const $ = id => document.getElementById(id);
const rand = s => () => ((s = (s * 16807) % 2147483647) / 2147483647);
$('ver').textContent = 'v' + VERSION;

// ---------- renderer ----------
const _q = (() => { try { return JSON.parse(localStorage.getItem('sierrasol_settings') || '{}').quality; } catch (e) { return null; } })() || (/iPhone|Android/i.test(navigator.userAgent) ? 'low' : 'high');
const renderer = new THREE.WebGLRenderer({ antialias: _q !== 'low', powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(innerWidth, innerHeight); document.body.prepend(renderer.domElement);
const scene = new THREE.Scene(); scene.fog = new THREE.Fog(0xf3c98b, 250, 1600);
const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.3, 4000);
const hemi = new THREE.HemisphereLight(0xffffff, 0x8a6a40, 1.1); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0d0, 1.6); scene.add(sun);
const settings = (() => { try { return JSON.parse(localStorage.getItem('sierrasol_settings') || '{}'); } catch (e) { return {}; } })();
if (!settings.quality) settings.quality = /iPhone|Android/i.test(navigator.userAgent) ? 'low' : 'high';
function applyQuality() { const lo = settings.quality === 'low'; renderer.setPixelRatio(lo ? 1 : Math.min(devicePixelRatio, 2)); renderer.setSize(innerWidth, innerHeight);
  scene.fog.near = lo ? 150 : 250; scene.fog.far = lo ? 900 : 1600; camera.far = lo ? 1200 : 4000; camera.updateProjectionMatrix();
  const b = document.querySelector('[data-a=quality]'); if (b) b.textContent = 'Graphics: ' + (lo ? 'Low (faster)' : 'High') + (lo !== (_q === 'low') ? ' · reload for full effect' : ''); try { localStorage.setItem('sierrasol_settings', JSON.stringify(settings)); } catch (e) {} }
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });

// ---------- collision ----------
const colliders = [];
const addCol = (x, z, w, d, h = 10) => colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, h });
function hit(x, z, r) { for (const c of colliders) if (x > c.minX - r && x < c.maxX + r && z > c.minZ - r && z < c.maxZ + r) return c; return null; }

// ---------- world ----------
const world = buildWorld({ THREE, scene, addCol, rand });
const H = (x, z) => world.heightAt ? world.heightAt(x, z) : 0, WET = (x, z) => world.isWater ? world.isWater(x, z) : false;

// ---------- hero (original design) ----------
function makeHero() {
  const g = new THREE.Group(), m = c => new THREE.MeshLambertMaterial({ color: c });
  const part = (w, h, d, c, x, y, z) => { const p = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m(c)); p.position.set(x, y, z); g.add(p); return p; };
  part(0.55, 0.7, 0.32, 0xe8742c, 0, 1.25, 0); part(0.2, 0.5, 0.33, 0xf4f1e8, 0, 1.3, 0.01); part(0.36, 0.36, 0.36, 0xe0b48c, 0, 1.8, 0); part(0.4, 0.14, 0.4, 0x7a4a24, 0, 2.02, -0.02);
  const legL = part(0.22, 0.8, 0.25, 0xb89a6a, -0.14, 0.45, 0), legR = part(0.22, 0.8, 0.25, 0xb89a6a, 0.14, 0.45, 0);
  const armL = part(0.16, 0.65, 0.18, 0xe8742c, -0.38, 1.25, 0), armR = part(0.16, 0.65, 0.18, 0xe8742c, 0.38, 1.25, 0);
  g.userData = { legL, legR, armL, armR }; return g;
}
const blobMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false });
const blob = (w, d) => { const m = new THREE.Mesh(new THREE.CircleGeometry(0.5, 16), blobMat); m.scale.set(w, d, 1); m.rotation.x = -Math.PI / 2; scene.add(m); return m; };
const player = { x: world.spawn.x, z: world.spawn.z, y: 0, vy: 0, heading: world.spawn.h || 0, money: 500, health: 100, mode: 'foot', car: null, walk: 0, mesh: makeHero() };
scene.add(player.mesh); player.shadow = blob(0.9, 0.9); player.y = H(player.x, player.z);
const state = { started: false, paused: true, uiOpen: false, wanted: 0, time: 0.35, camYaw: Math.PI, camPitch: 0.25 };

// ---------- vehicles ----------
const vehicles = [], COLORS = [0xd1342b, 0x2b6cd1, 0xf2c14e, 0xeeeeee, 0x1d1d1d, 0x3fa34d, 0xe07a2b];
const NAMES = ['Mesa', 'Coyote', 'Vista', 'Sierra GT', 'Pueblo', 'Sundown'];
function addCar(x, z, h, o = {}) {
  const g = new THREE.Group(), color = o.color ?? COLORS[(Math.random() * COLORS.length) | 0], body = new THREE.MeshLambertMaterial({ color });
  const b = new THREE.Mesh(new THREE.BoxGeometry(2, 0.7, 4.2), body); b.position.y = 0.65; g.add(b);
  const c = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.55, 2.1), new THREE.MeshLambertMaterial({ color: 0x223344 })); c.position.set(0, 1.25, -0.2); g.add(c);
  const wm = new THREE.MeshLambertMaterial({ color: 0x111111 });
  for (const [wx, wz] of [[-1, 1.3], [1, 1.3], [-1, -1.3], [1, -1.3]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.3, 12), wm); w.rotation.z = Math.PI / 2; w.position.set(wx, 0.38, wz); g.add(w); }
  scene.add(g); const v = { x, z, y: H(x, z), heading: h, speed: 0, shadow: blob(2.4, 4.6), drift: 0, color, name: o.name || NAMES[(Math.random() * NAMES.length) | 0], mesh: g, health: 100 };
  vehicles.push(v); return v;
}
for (const s of world.carSpots || []) addCar(s.x, s.z, s.h);

// ---------- input ----------
const input = { mx: 0, my: 0, sprint: false, jump: false, attack: false }, keys = {};
addEventListener('keydown', e => { keys[e.key.toLowerCase()] = true; if (e.key.toLowerCase() === 'f') toggleCar(); });
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
const stick = $('stick'), knob = $('knob'); let stickId = null, lookId = null, lookX = 0, lookY = 0;
stick.addEventListener('touchstart', e => { e.preventDefault(); stickId = e.changedTouches[0].identifier; moveStick(e.changedTouches[0]); }, { passive: false });
function moveStick(t) { const r = stick.getBoundingClientRect(), dx = t.clientX - r.left - 60, dy = t.clientY - r.top - 60, l = Math.min(1, Math.hypot(dx, dy) / 50), a = Math.atan2(dy, dx);
  input.mx = Math.cos(a) * l; input.my = Math.sin(a) * l; knob.style.left = 35 + input.mx * 40 + 'px'; knob.style.top = 35 + input.my * 40 + 'px'; }
addEventListener('touchmove', e => { for (const t of e.changedTouches) { if (t.identifier === stickId) moveStick(t); else if (t.identifier === lookId) { state.camYaw -= (t.clientX - lookX) * 0.008; state.camPitch = Math.max(-0.2, Math.min(1.1, state.camPitch + (t.clientY - lookY) * 0.005)); lookX = t.clientX; lookY = t.clientY; } } }, { passive: false });
addEventListener('touchstart', e => { for (const t of e.changedTouches) if (t.target === renderer.domElement && t.clientX > innerWidth * 0.4 && lookId == null) { lookId = t.identifier; lookX = t.clientX; lookY = t.clientY; } });
addEventListener('touchend', e => { for (const t of e.changedTouches) { if (t.identifier === stickId) { stickId = null; input.mx = input.my = 0; knob.style.left = knob.style.top = '35px'; } if (t.identifier === lookId) lookId = null; } });
const hold = (id, k) => { const el = $(id); el.addEventListener('touchstart', e => { e.preventDefault(); input[k] = true; el.classList.add('on'); }, { passive: false }); el.addEventListener('touchend', () => { input[k] = false; el.classList.remove('on'); }); };
hold('bJump', 'jump'); hold('bSprint', 'sprint'); hold('bAttack', 'attack');
$('bEnter').addEventListener('touchstart', e => { e.preventDefault(); toggleCar(); }, { passive: false }); $('bEnter').addEventListener('click', toggleCar);

// ---------- messages ----------
let msgT = 0; function showMsg(t, d = 2.5) { $('msg').textContent = t; $('msg').classList.add('show'); msgT = d; }

// ---------- economy ----------
const economy = initEconomy({ THREE, scene, player, state, addCol, showMsg, cities: world.cities, isBusy: () => state.uiOpen });
const npcs = initNPCs({ THREE, scene, world, player, vehicles, state, showMsg, settings });
let lastPunch = false;
function updatePunch() { const p = input.attack && !player.car, edge = p && !lastPunch; lastPunch = p; if (!edge) return;
  for (const n of npcs.list) { const d = Math.hypot(n.x - player.x, n.z - player.z); if (n.mode === 'down' || d > 1.9 || Math.cos(Math.atan2(n.x - player.x, n.z - player.z) - player.heading) < 0.3) continue;
    n.mode = 'down'; n.t = 4 + Math.random() * 2; n.fall = 0; n.vx = Math.sin(player.heading) * 4; n.vz = Math.cos(player.heading) * 4;
    if (Math.random() < 0.4) { const c = 5 + ((Math.random() * 30) | 0); player.money += c; showMsg(`Pow!  +$${c}`, 1.2); } else showMsg('Pow!', 0.8);
    for (const q of npcs.list) if (q !== n && q.mode !== 'down' && Math.hypot(q.x - n.x, q.z - n.z) < 30) { const a = Math.atan2(q.x - n.x, q.z - n.z); q.mode = 'flee'; q.t = 4; q.vx = Math.sin(a) * 4.5; q.vz = Math.cos(a) * 4.5; }
    break; } }

// ---------- car enter/exit ----------
function toggleCar() {
  if (!state.started || state.paused) return;
  if (player.car) { const v = player.car, s = Math.sin(v.heading), c = Math.cos(v.heading); let ex = v.x - c * 2, ez = v.z + s * 2; if (hit(ex, ez, 0.4)) { ex = v.x + c * 2; ez = v.z - s * 2; }
    player.x = ex; player.z = ez; player.car = null; player.mode = 'foot'; player.mesh.visible = true; v.speed *= 0.5; return; }
  let best = null, bd = 5; for (const v of vehicles) { const d = Math.hypot(v.x - player.x, v.z - player.z); if (d < bd) { bd = d; best = v; } }
  if (best) { if (best.ai) { best.ai = null; showMsg('Took a ' + best.name, 1.5); } player.car = best; player.mode = 'car'; player.mesh.visible = false; showMsg(best.name, 1.5); }
}

// ---------- update ----------
const camFwd = () => [Math.sin(state.camYaw + Math.PI), Math.cos(state.camYaw + Math.PI)];
function updateFoot(dt) {
  let mx = input.mx + ((keys['d'] ? 1 : 0) - (keys['a'] ? 1 : 0)), my = input.my + ((keys['s'] ? 1 : 0) - (keys['w'] ? 1 : 0));
  const l = Math.min(1, Math.hypot(mx, my)), [fx, fz] = camFwd();
  if (l > 0.1) { const rx = -fz, rz = fx, dx = (fx * -my + rx * mx), dz = (fz * -my + rz * mx), n = Math.hypot(dx, dz) || 1;
    const spd = (input.sprint || keys['shift'] ? 8 * (economy.sprintMultiplier?.() || 1) : 4) * l; let nx = player.x + dx / n * spd * dt, nz = player.z + dz / n * spd * dt;
    const ok = (x, z) => !hit(x, z, 0.35) && !WET(x, z) && H(x, z) - player.y < 1.2;
    if (ok(nx, player.z)) player.x = nx; if (ok(player.x, nz)) player.z = nz;
    player.heading = Math.atan2(dx, dz); player.walk += dt * spd * 1.6; } else player.walk *= 0.8;
  const g = H(player.x, player.z), onG = player.y <= g + 0.05;
  if ((input.jump || keys[' ']) && onG) player.vy = 5.5;
  player.vy -= 15 * dt; player.y += player.vy * dt; if (player.y <= g) { player.y = g; player.vy = 0; }
  const u = player.mesh.userData, s = Math.sin(player.walk) * 0.6; u.legL.rotation.x = s; u.legR.rotation.x = -s; u.armL.rotation.x = -s; u.armR.rotation.x = input.attack ? -1.6 : s;
}
function updateCar(v, dt) {
  const mine = v === player.car; let thr = 0, steer = 0, hand = false;
  if (mine) { const my = input.my + ((keys['s'] ? 1 : 0) - (keys['w'] ? 1 : 0)), mx = input.mx + ((keys['d'] ? 1 : 0) - (keys['a'] ? 1 : 0)); thr = Math.max(-1, Math.min(1, -my * 1.3)); steer = -Math.max(-1, Math.min(1, mx * 1.2)); hand = input.sprint || keys[' ']; }
  else if (v.ai) { const t = v.ai; const dx = t.tx - v.x, dz = t.tz - v.z; if (Math.hypot(dx, dz) < 8) nextWaypoint(v); let d = Math.atan2(dx, dz) - v.heading; d = Math.atan2(Math.sin(d), Math.cos(d)); steer = Math.max(-1, Math.min(1, d * 2)); thr = v.speed < t.cruise * (1 - Math.min(0.6, Math.abs(d))) ? 0.6 : 0;
    if (Math.hypot(player.x - v.x, player.z - v.z) < 7 && Math.cos(Math.atan2(player.x - v.x, player.z - v.z) - v.heading) > 0.7) { thr = 0; v.speed *= 0.9; } }
  const onRd = world.onRoad ? !!world.onRoad(v.x, v.z) : true, max = (v.top || 42) * (onRd ? 1 : 0.6);
  if (thr * v.speed < -0.5) v.speed += thr * 32 * dt; else v.speed += thr * (16 - Math.abs(v.speed) * 0.25) * dt;
  if (thr === 0) v.speed *= Math.pow(onRd ? 0.6 : 0.35, dt); if (hand) v.speed *= Math.pow(0.25, dt);
  v.speed = Math.max(-12, Math.min(max, v.speed));
  const grip = Math.min(1, Math.abs(v.speed) / 6) / (1 + Math.abs(v.speed) / 45);
  v.heading += steer * dt * 2.4 * grip * Math.sign(v.speed || 1) * (hand ? 1.6 : 1);
  v.drift += ((hand && Math.abs(v.speed) > 12 ? steer * 0.5 : 0) - v.drift) * Math.min(1, dt * 3);
  const dir = v.heading - v.drift, nx = v.x + Math.sin(dir) * v.speed * dt, nz = v.z + Math.cos(dir) * v.speed * dt, ng = H(nx, nz);
  let blocked = hit(nx, nz, 1.2) || WET(nx, nz) || ng - v.y > 2.5; if (!blocked) for (const o of vehicles) if (o !== v && Math.hypot(o.x - nx, o.z - nz) < 3.2) { blocked = true; if (mine && Math.abs(v.speed) > 8) o.speed += v.speed * 0.5; break; }
  if (blocked) { if (mine && Math.abs(v.speed) > 14) { v.health -= Math.abs(v.speed) * 0.5; showMsg('Crash!', 0.8); } v.speed *= -0.25; } else { v.x = nx; v.z = nz; }
  const gy = H(v.x, v.z); v.y += (gy - v.y) * Math.min(1, dt * 12);
  const fx = Math.sin(v.heading) * 2, fz = Math.cos(v.heading) * 2, pitch = Math.atan2(H(v.x + fx, v.z + fz) - H(v.x - fx, v.z - fz), 4);
  v.mesh.position.set(v.x, v.y, v.z); v.mesh.rotation.set(0, v.heading, 0); v.mesh.rotateX(-pitch);
  v.shadow.position.set(v.x, v.y + 0.05, v.z); v.shadow.rotation.z = v.heading;
  if (mine) { player.x = v.x; player.z = v.z; player.y = v.y; player.heading = v.heading; }
}
// ---------- traffic along roads ----------
function nextWaypoint(v) { const segs = world.roads; let best = null, bd = 1e9; const ax = v.ai.tx, az = v.ai.tz;
  for (let k = 0; k < 40; k++) { const r = segs[(Math.random() * segs.length) | 0]; for (const [x, z] of [[r.x1, r.z1], [r.x2, r.z2]]) { const d = Math.hypot(x - ax, z - az); if (d > 20 && d < bd && Math.cos(Math.atan2(x - ax, z - az) - v.heading) > 0.2) { bd = d; best = [x, z]; } } }
  if (!best || bd > 1500) best = [v.x + Math.sin(v.heading + Math.PI) * 50, v.z + Math.cos(v.heading + Math.PI) * 50]; v.ai.tx = best[0]; v.ai.tz = best[1]; }
let trafficT = 0;
function updateTraffic(dt) { if ((trafficT -= dt) > 0) return; trafficT = 1;
  for (const v of [...vehicles]) if (v.ai && v !== player.car && Math.hypot(v.x - player.x, v.z - player.z) > 450) { scene.remove(v.mesh); scene.remove(v.shadow); vehicles.splice(vehicles.indexOf(v), 1); }
  if (vehicles.filter(v => v.ai).length >= 14) return;
  const near = world.roads.filter(r => { const d = Math.hypot((r.x1 + r.x2) / 2 - player.x, (r.z1 + r.z2) / 2 - player.z); return d > 80 && d < 350; }); if (!near.length) return;
  const r = near[(Math.random() * near.length) | 0], t = 0.2 + Math.random() * 0.6, x = r.x1 + (r.x2 - r.x1) * t, z = r.z1 + (r.z2 - r.z1) * t;
  if (hit(x, z, 1.5) || WET(x, z) || vehicles.some(o => Math.hypot(o.x - x, o.z - z) < 10)) return;
  const fwd = Math.random() < 0.5, h = Math.atan2(fwd ? r.x2 - r.x1 : r.x1 - r.x2, fwd ? r.z2 - r.z1 : r.z1 - r.z2), side = (r.w || 14) / 4;
  const v = addCar(x + Math.cos(h) * -side, z - Math.sin(h) * -side, h); v.ai = { tx: fwd ? r.x2 : r.x1, tz: fwd ? r.z2 : r.z1, cruise: 12 + Math.random() * 8 }; v.speed = v.ai.cruise;
}
let camD = 6;
function updateCamera(dt) {
  const t = player.car ? { x: player.car.x, z: player.car.z, d: 9 + Math.abs(player.car.speed) * 0.06, h: 3.5 } : { x: player.x, z: player.z, d: 5.5, h: 2.2 };
  if (player.car && Math.abs(player.car.speed) > 3 && lookId == null) { const want = player.car.heading + Math.PI; let d = want - state.camYaw; d = Math.atan2(Math.sin(d), Math.cos(d)); state.camYaw += d * Math.min(1, dt * (2.5 + Math.abs(player.car.speed) * 0.08)); }
  const cy = Math.cos(state.camPitch); let d = t.d, ty = player.y + 1.5;
  for (let k = 1; k <= 8; k++) { const f = k / 8, sx = t.x + Math.sin(state.camYaw) * d * cy * f, sz = t.z + Math.cos(state.camYaw) * d * cy * f, sy = ty + (t.h - 1.5 + Math.sin(state.camPitch) * d) * f;
    const lx = Math.cos(state.camYaw) * 2.5, lz = -Math.sin(state.camYaw) * 2.5, gh = Math.max(H(sx, sz), H(sx + lx, sz + lz), H(sx - lx, sz - lz));
    if (gh + 1.6 > sy) { d = Math.max(2.2, d * (k - 1) / 8); break; } }
  camD += (d - camD) * Math.min(1, dt * (d < camD ? 20 : 3));
  const x = t.x + Math.sin(state.camYaw) * camD * cy, z = t.z + Math.cos(state.camYaw) * camD * cy, hMax = Math.max(H(x, z), H(x + 2, z), H(x - 2, z), H(x, z + 2), H(x, z - 2), H((x + t.x) / 2, (z + t.z) / 2));
  camera.position.set(x, Math.max(hMax + 2, ty + (t.h - 1.5) + Math.sin(state.camPitch) * camD), z); camera.lookAt(t.x, ty, t.z);
}
function updateSky(dt) {
  state.time = (state.time + dt / 600) % 1; const a = state.time * Math.PI * 2, day = Math.max(0, Math.sin(a));
  sun.position.set(player.x + Math.cos(a) * 300, Math.sin(a) * 300 + 20, player.z + 100); sun.intensity = 0.2 + day * 1.5; hemi.intensity = 0.35 + day * 0.8;
  const c = new THREE.Color(0x14203a).lerp(new THREE.Color(0x9fd0f0), day); scene.background = c; scene.fog.color.copy(c);
}
const mini = $('mini').getContext('2d');
function drawMini() {
  mini.clearRect(0, 0, 120, 120); mini.save(); mini.beginPath(); mini.arc(60, 60, 59, 0, 7); mini.clip(); mini.translate(60, 60); mini.rotate(state.camYaw + Math.PI);
  if (world.mapCanvas) { const k = 120 / 60, px = (player.x + world.size) / 12, pz = (player.z + world.size) / 12; mini.drawImage(world.mapCanvas, px - 30, pz - 30, 60, 60, -60 * 1.0, -60 * 1.0, 120, 120); }
  else { const S = 0.12; mini.strokeStyle = '#999'; mini.lineWidth = 2; for (const r of world.roads) { mini.beginPath(); mini.moveTo((r.x1 - player.x) * S, (r.z1 - player.z) * S); mini.lineTo((r.x2 - player.x) * S, (r.z2 - player.z) * S); mini.stroke(); } }
  mini.restore(); mini.save(); mini.translate(60, 60); mini.rotate(state.camYaw + Math.PI - player.heading + Math.PI);
  mini.fillStyle = '#ff0'; mini.strokeStyle = '#000'; mini.beginPath(); mini.moveTo(0, -7); mini.lineTo(5, 5); mini.lineTo(-5, 5); mini.closePath(); mini.fill(); mini.stroke(); mini.restore();
}
function openMap() { if (!world.mapCanvas || !state.started) return; state.uiOpen = true; const c = $('bigmap'), g = c.getContext('2d'); g.drawImage(world.mapCanvas, 0, 0);
  const px = (player.x + world.size) / 12, pz = (player.z + world.size) / 12; g.fillStyle = '#ff0'; g.strokeStyle = '#000'; g.lineWidth = 3; g.beginPath(); g.arc(px, pz, 12, 0, 7); g.fill(); g.stroke();
  $('mapview').classList.remove('hidden'); $('hud').classList.add('hidden'); }
$('mini').addEventListener('click', openMap); $('mapview').addEventListener('click', () => { $('mapview').classList.add('hidden'); $('hud').classList.remove('hidden'); state.uiOpen = false; });
addEventListener('keydown', e => { if (e.key.toLowerCase() === 'm') openMap(); });
function placeName() { const r = world.onRoad && world.onRoad(player.x, player.z); for (const c of world.places || world.cities) if (c.r && Math.abs(player.x - c.x) < c.r + 40 && Math.abs(player.z - c.z) < c.r + 40) return c.name; if (r) return r.name;
  if (world.places) { const m = world.places.find(p => p.kind === 'mountain'); if (m && Math.hypot(player.x - m.x, player.z - m.z) < 900) return m.name; } return 'Countryside'; }

// ---------- save / load ----------
function readSave() { try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); return s && Number.isFinite(s.x) && Number.isFinite(s.z) ? s : null; } catch (e) { return null; } }
function saveGame(silent) { const c = player.car; try { localStorage.setItem(SAVE_KEY, JSON.stringify({ x: player.x, z: player.z, money: player.money, health: player.health, time: state.time, car: c ? { color: c.color, name: c.name, h: c.heading } : null, eco: economy.getState(), at: Date.now() })); } catch (e) { return; }
  refreshContinue(); if (!silent) showMsg('Game saved'); }
function refreshContinue() { $('btnContinue').style.display = readSave() ? '' : 'none'; }
function loadGame() { const s = readSave(); if (!s) return false; Object.assign(player, { x: s.x, z: s.z, y: 0, money: Number.isFinite(s.money) ? s.money : 500, health: s.health || 100 }); state.time = s.time ?? 0.35;
  player.y = H(player.x, player.z); if (player.car) toggleCar(); if (s.car) { const v = addCar(s.x, s.z, s.car.h || 0, s.car); player.car = v; player.mode = 'car'; player.mesh.visible = false; }
  if (s.eco) economy.setState(s.eco); showMsg('Game loaded', 2); return true; }
function newGame() { if (player.car) { player.car = null; player.mesh.visible = true; } Object.assign(player, { x: world.spawn.x, z: world.spawn.z, y: H(world.spawn.x, world.spawn.z), money: 500, health: 100 }); economy.reset(); if (!vehicles.some(v => Math.hypot(v.x - player.x, v.z - player.z) < 25)) { let cx = player.x + 6, cz = player.z; for (let a = 0; a < 16 && (hit(cx, cz, 1.6) || WET(cx, cz)); a++) { cx = player.x + Math.cos(a) * (6 + a); cz = player.z + Math.sin(a) * (6 + a); } addCar(cx, cz, player.heading); } showMsg('Welcome to Sierra Sol. Walk up to a car and tap CAR.', 4); }
setInterval(() => { if (state.started && !state.paused) saveGame(true); }, 60000);
addEventListener('pagehide', () => state.started && saveGame(true));
document.addEventListener('visibilitychange', () => { if (document.hidden && state.started) { saveGame(true); setPause(true); } });

// ---------- menus ----------
function setPause(p) { state.paused = p; $('pause').classList.toggle('hidden', !p); }
$('bPause').addEventListener('click', () => setPause(true));
$('pause').addEventListener('click', e => { const a = e.target.dataset.a; if (!a) return; if (a === 'resume') setPause(false); if (a === 'save') { saveGame(); setPause(false); } if (a === 'load') { loadGame(); setPause(false); }
  if (a === 'quality') { settings.quality = settings.quality === 'low' ? 'high' : 'low'; applyQuality(); return; }
  if (a === 'quit') { saveGame(true); state.started = false; $('pause').classList.add('hidden'); $('hud').classList.add('hidden'); $('start').classList.remove('hidden'); } });
function begin(cont) { if (!(cont && loadGame())) newGame(); $('start').classList.add('hidden'); $('hud').classList.remove('hidden'); state.started = true; setPause(false); last = performance.now(); }
applyQuality();
$('btnNew').addEventListener('click', () => begin(false)); $('btnContinue').addEventListener('click', () => begin(true)); refreshContinue();

// ---------- loop ----------
let last = performance.now();
function loop(now) {
  requestAnimationFrame(loop); const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (state.started && !state.paused && !state.uiOpen) {
    if (player.car) updateCar(player.car, dt); else updateFoot(dt);
    for (const v of vehicles) if (v !== player.car && (v.ai || Math.abs(v.speed) > 0.01)) updateCar(v, dt);
    updateTraffic(dt); npcs.update(dt); updatePunch();
    economy.update(dt);
  }
  player.mesh.position.set(player.x, player.y, player.z); player.mesh.rotation.y = player.heading; player.shadow.visible = !player.car; player.shadow.position.set(player.x, H(player.x, player.z) + 0.05, player.z);
  updateSky(state.started ? dt : 0); updateCamera(dt);
  if (state.started) { if ((msgT -= dt) <= 0) $('msg').classList.remove('show'); $('money').textContent = '$' + player.money.toLocaleString(); $('hp').firstElementChild.style.width = player.health + '%'; $('stars').textContent = '★'.repeat(state.wanted); $('bSprint').textContent = player.car ? 'BRAKE' : 'RUN'; $('place').textContent = placeName() + (player.car ? `  ·  ${Math.round(Math.abs(player.car.speed) * 3.6)} km/h` : ''); drawMini(); }
  renderer.render(scene, camera);
}
requestAnimationFrame(loop);
window.__game = { camera, npcs, player, state, vehicles, world, saveGame, loadGame, toggleCar };
