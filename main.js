// Sierra Sol core: New Bot. World = assets/world.js (Mika), economy = assets/economy.js (New Bot 1).
import * as THREE from 'three';
import { buildWorld } from './assets/world.js';
import { initEconomy } from './assets/economy.js';
const VERSION = '0.1', SAVE_KEY = 'sierrasol_save_v1';
const $ = id => document.getElementById(id);
const rand = s => () => ((s = (s * 16807) % 2147483647) / 2147483647);
$('ver').textContent = 'v' + VERSION;

// ---------- renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(innerWidth, innerHeight); document.body.prepend(renderer.domElement);
const scene = new THREE.Scene(); scene.fog = new THREE.Fog(0xf3c98b, 150, 900);
const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.5, 2500);
const hemi = new THREE.HemisphereLight(0xffffff, 0x8a6a40, 1.1); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0d0, 1.6); scene.add(sun);
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });

// ---------- collision ----------
const colliders = [];
const addCol = (x, z, w, d, h = 10) => colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, h });
function hit(x, z, r) { for (const c of colliders) if (x > c.minX - r && x < c.maxX + r && z > c.minZ - r && z < c.maxZ + r) return c; return null; }

// ---------- world ----------
const world = buildWorld({ THREE, scene, addCol, rand });

// ---------- hero (original design) ----------
function makeHero() {
  const g = new THREE.Group(), m = c => new THREE.MeshLambertMaterial({ color: c });
  const part = (w, h, d, c, x, y, z) => { const p = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m(c)); p.position.set(x, y, z); g.add(p); return p; };
  part(0.55, 0.7, 0.32, 0x2e7d6b, 0, 1.25, 0); part(0.36, 0.36, 0.36, 0xc68a5a, 0, 1.8, 0); part(0.4, 0.1, 0.42, 0x222222, 0, 2.0, 0.02);
  const legL = part(0.22, 0.8, 0.25, 0x3b3f6b, -0.14, 0.45, 0), legR = part(0.22, 0.8, 0.25, 0x3b3f6b, 0.14, 0.45, 0);
  const armL = part(0.16, 0.65, 0.18, 0xc68a5a, -0.38, 1.25, 0), armR = part(0.16, 0.65, 0.18, 0xc68a5a, 0.38, 1.25, 0);
  g.userData = { legL, legR, armL, armR }; return g;
}
const player = { x: world.spawn.x, z: world.spawn.z, y: 0, vy: 0, heading: world.spawn.h || 0, money: 500, health: 100, mode: 'foot', car: null, walk: 0, mesh: makeHero() };
scene.add(player.mesh);
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
  scene.add(g); const v = { x, z, heading: h, speed: 0, color, name: o.name || NAMES[(Math.random() * NAMES.length) | 0], mesh: g, health: 100 };
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

// ---------- car enter/exit ----------
function toggleCar() {
  if (!state.started || state.paused) return;
  if (player.car) { const v = player.car, s = Math.sin(v.heading), c = Math.cos(v.heading); let ex = v.x - c * 2, ez = v.z + s * 2; if (hit(ex, ez, 0.4)) { ex = v.x + c * 2; ez = v.z - s * 2; }
    player.x = ex; player.z = ez; player.car = null; player.mode = 'foot'; player.mesh.visible = true; v.speed *= 0.5; return; }
  let best = null, bd = 5; for (const v of vehicles) { const d = Math.hypot(v.x - player.x, v.z - player.z); if (d < bd) { bd = d; best = v; } }
  if (best) { player.car = best; player.mode = 'car'; player.mesh.visible = false; showMsg(best.name, 1.5); }
}

// ---------- update ----------
const camFwd = () => [Math.sin(state.camYaw + Math.PI), Math.cos(state.camYaw + Math.PI)];
function updateFoot(dt) {
  let mx = input.mx + ((keys['d'] ? 1 : 0) - (keys['a'] ? 1 : 0)), my = input.my + ((keys['s'] ? 1 : 0) - (keys['w'] ? 1 : 0));
  const l = Math.min(1, Math.hypot(mx, my)), [fx, fz] = camFwd();
  if (l > 0.1) { const rx = -fz, rz = fx, dx = (fx * -my + rx * mx), dz = (fz * -my + rz * mx), n = Math.hypot(dx, dz) || 1;
    const spd = (input.sprint || keys['shift'] ? 8 : 4) * l; let nx = player.x + dx / n * spd * dt, nz = player.z + dz / n * spd * dt;
    if (!hit(nx, player.z, 0.35)) player.x = nx; if (!hit(player.x, nz, 0.35)) player.z = nz;
    player.heading = Math.atan2(dx, dz); player.walk += dt * spd * 1.6; } else player.walk *= 0.8;
  if ((input.jump || keys[' ']) && player.y === 0) player.vy = 5.5;
  player.vy -= 15 * dt; player.y = Math.max(0, player.y + player.vy * dt); if (player.y === 0) player.vy = 0;
  const u = player.mesh.userData, s = Math.sin(player.walk) * 0.6; u.legL.rotation.x = s; u.legR.rotation.x = -s; u.armL.rotation.x = -s; u.armR.rotation.x = input.attack ? -1.6 : s;
}
function updateCar(v, dt) {
  const mine = v === player.car; let thr = 0, steer = 0;
  if (mine) { const my = input.my + ((keys['s'] ? 1 : 0) - (keys['w'] ? 1 : 0)), mx = input.mx + ((keys['d'] ? 1 : 0) - (keys['a'] ? 1 : 0)); thr = -my; steer = -mx; }
  const max = 38; v.speed += thr * (thr * v.speed < 0 ? 30 : 14) * dt; v.speed *= mine && thr === 0 ? 0.985 : mine ? 1 : 0.95; v.speed = Math.max(-10, Math.min(max, v.speed));
  if (mine && (input.sprint || keys[' '])) v.speed *= 0.94;
  v.heading += steer * dt * 2.2 * Math.min(1, Math.abs(v.speed) / 8) * Math.sign(v.speed || 1);
  const nx = v.x + Math.sin(v.heading) * v.speed * dt, nz = v.z + Math.cos(v.heading) * v.speed * dt;
  if (hit(nx, nz, 1.2)) { if (Math.abs(v.speed) > 12) { v.health -= Math.abs(v.speed) * 0.6; if (mine) showMsg('Crash!', 0.8); } v.speed *= -0.3; } else { v.x = nx; v.z = nz; }
  v.mesh.position.set(v.x, 0, v.z); v.mesh.rotation.y = v.heading;
  if (mine) { player.x = v.x; player.z = v.z; player.heading = v.heading; }
}
function updateCamera(dt) {
  const t = player.car ? { x: player.car.x, z: player.car.z, d: 9, h: 3.5 } : { x: player.x, z: player.z, d: 5.5, h: 2.2 };
  if (player.car && Math.abs(player.car.speed) > 3 && lookId == null) { const want = player.car.heading + Math.PI; let d = want - state.camYaw; d = Math.atan2(Math.sin(d), Math.cos(d)); state.camYaw += d * Math.min(1, dt * 2.5); }
  const cy = Math.cos(state.camPitch), x = t.x + Math.sin(state.camYaw) * t.d * cy, z = t.z + Math.cos(state.camYaw) * t.d * cy;
  camera.position.set(x, player.y + t.h + Math.sin(state.camPitch) * t.d, z); camera.lookAt(t.x, player.y + 1.5, t.z);
}
function updateSky(dt) {
  state.time = (state.time + dt / 600) % 1; const a = state.time * Math.PI * 2, day = Math.max(0, Math.sin(a));
  sun.position.set(player.x + Math.cos(a) * 300, Math.sin(a) * 300 + 20, player.z + 100); sun.intensity = 0.2 + day * 1.5; hemi.intensity = 0.35 + day * 0.8;
  const c = new THREE.Color(0x14203a).lerp(new THREE.Color(0x9fd0f0), day); scene.background = c; scene.fog.color.copy(c);
}
const mini = $('mini').getContext('2d');
function drawMini() {
  const S = 0.12; mini.clearRect(0, 0, 120, 120); mini.save(); mini.translate(60, 60); mini.rotate(state.camYaw + Math.PI);
  mini.strokeStyle = '#999'; mini.lineWidth = 2; for (const r of world.roads) { mini.beginPath(); mini.moveTo((r.x1 - player.x) * S, (r.z1 - player.z) * S); mini.lineTo((r.x2 - player.x) * S, (r.z2 - player.z) * S); mini.stroke(); }
  mini.restore(); mini.fillStyle = '#ff0'; mini.beginPath(); mini.arc(60, 60, 4, 0, 7); mini.fill();
}
function placeName() { for (const c of world.cities) if (Math.hypot(player.x - c.x, player.z - c.z) < c.r + 40) return c.name; return 'Countryside'; }

// ---------- save / load ----------
function readSave() { try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); return s && Number.isFinite(s.x) && Number.isFinite(s.z) ? s : null; } catch (e) { return null; } }
function saveGame(silent) { const c = player.car; try { localStorage.setItem(SAVE_KEY, JSON.stringify({ x: player.x, z: player.z, money: player.money, health: player.health, time: state.time, car: c ? { color: c.color, name: c.name, h: c.heading } : null, eco: economy.getState(), at: Date.now() })); } catch (e) { return; }
  refreshContinue(); if (!silent) showMsg('Game saved'); }
function refreshContinue() { $('btnContinue').style.display = readSave() ? '' : 'none'; }
function loadGame() { const s = readSave(); if (!s) return false; Object.assign(player, { x: s.x, z: s.z, y: 0, money: Number.isFinite(s.money) ? s.money : 500, health: s.health || 100 }); state.time = s.time ?? 0.35;
  if (player.car) toggleCar(); if (s.car) { const v = addCar(s.x, s.z, s.car.h || 0, s.car); player.car = v; player.mode = 'car'; player.mesh.visible = false; }
  if (s.eco) economy.setState(s.eco); showMsg('Game loaded', 2); return true; }
function newGame() { Object.assign(player, { x: world.spawn.x, z: world.spawn.z, y: 0, money: 500, health: 100 }); economy.reset(); showMsg('Welcome to Sierra Sol. Walk up to a car and tap CAR.', 4); }
setInterval(() => { if (state.started && !state.paused) saveGame(true); }, 60000);
addEventListener('pagehide', () => state.started && saveGame(true));
document.addEventListener('visibilitychange', () => { if (document.hidden && state.started) { saveGame(true); setPause(true); } });

// ---------- menus ----------
function setPause(p) { state.paused = p; $('pause').classList.toggle('hidden', !p); }
$('bPause').addEventListener('click', () => setPause(true));
$('pause').addEventListener('click', e => { const a = e.target.dataset.a; if (!a) return; if (a === 'resume') setPause(false); if (a === 'save') { saveGame(); setPause(false); } if (a === 'load') { loadGame(); setPause(false); }
  if (a === 'quit') { saveGame(true); state.started = false; $('pause').classList.add('hidden'); $('hud').classList.add('hidden'); $('start').classList.remove('hidden'); } });
function begin(cont) { if (!(cont && loadGame())) newGame(); $('start').classList.add('hidden'); $('hud').classList.remove('hidden'); state.started = true; setPause(false); last = performance.now(); }
$('btnNew').addEventListener('click', () => begin(false)); $('btnContinue').addEventListener('click', () => begin(true)); refreshContinue();

// ---------- loop ----------
let last = performance.now();
function loop(now) {
  requestAnimationFrame(loop); const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (state.started && !state.paused && !state.uiOpen) {
    if (player.car) updateCar(player.car, dt); else updateFoot(dt);
    for (const v of vehicles) if (v !== player.car && Math.abs(v.speed) > 0.01) updateCar(v, dt);
    economy.update(dt);
  }
  player.mesh.position.set(player.x, player.y, player.z); player.mesh.rotation.y = player.heading;
  updateSky(state.started ? dt : 0); updateCamera(dt);
  if (state.started) { if ((msgT -= dt) <= 0) $('msg').classList.remove('show'); $('money').textContent = '$' + player.money.toLocaleString(); $('hp').firstElementChild.style.width = player.health + '%'; $('stars').textContent = '★'.repeat(state.wanted); $('place').textContent = placeName(); drawMini(); }
  renderer.render(scene, camera);
}
requestAnimationFrame(loop);
window.__game = { player, state, vehicles, world, saveGame, loadGame, toggleCar };
