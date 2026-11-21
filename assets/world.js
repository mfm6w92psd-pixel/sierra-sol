// world.js: OWNED BY MIKA. The state of Sierra Sol, all original.
// Contract: export buildWorld(ctx) -> { spawn:{x,z,h}, cities:[{name,x,z,r}], roads:[{x1,z1,x2,z2,w}], size, carSpots:[{x,z,h}],
//                                       heightAt(x,z), isWater(x,z), onRoad(x,z), places:[{name,x,z,kind}], mapCanvas, seaLevel }
// ctx = { THREE, scene, addCol(x,z,w,d,h), rand(seed) }. size = half-width of the square map (world spans -size..size).
// heightAt(x,z) is the ground/road height to stand or drive on (hills, mountains, beaches); 0 = sea level. isWater -> deep sea.
// Layout (north = -z): Porto Sol, a coastal city in the south-east with beaches and an airport; Neon Mesa in the north-east desert;
// Bayhaven in the north-west forest beside Halcyon Bay; Mount Talon (480 m) in the south-west; villages Dry Creek, Pinewood, Saltmarsh.
const SIZE = 6000, CELL = 20, GN = (2 * SIZE) / CELL + 1;
const ss = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const hash = (i, j) => { const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s - Math.floor(s); };
const vnoise = (x, z) => { const i = Math.floor(x), j = Math.floor(z), fx = x - i, fz = z - j, u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  return lerp(lerp(hash(i, j), hash(i + 1, j), u), lerp(hash(i, j + 1), hash(i + 1, j + 1), u), v) * 2 - 1; };
const fbm = (x, z) => vnoise(x, z) * 0.55 + vnoise(x * 2.1 + 5.2, z * 2.1 - 1.3) * 0.28 + vnoise(x * 4.3 - 2.7, z * 4.3 + 8.1) * 0.12 + vnoise(x * 8.7, z * 8.7) * 0.05;

// towns: half-size r, flat ground height h, street spacing, building height range
const CITIES = [
  { name: 'Porto Sol', x: 2500, z: 2500, r: 700, h: 3, grid: 100, hMin: 10, hMax: 120, palette: [0xf2e6d0, 0xe8b9a0, 0x9fd3d6, 0xf5f5ee, 0xd6c3e8, 0xb9d9a8] },
  { name: 'Neon Mesa', x: 2700, z: -3100, r: 500, h: 16, grid: 100, hMin: 12, hMax: 150, palette: [0xe9c46a, 0xf4a261, 0xe76f51, 0x8ecae6, 0xf1e3c8, 0xc77dff] },
  { name: 'Bayhaven', x: -3000, z: -2300, r: 520, h: 22, grid: 100, hMin: 8, hMax: 70, palette: [0xc9b79c, 0x8d6e63, 0xb0bec5, 0xe0d6c3, 0x7f9c8a, 0xa1887f] },
];
const VILLAGES = [
  { name: 'Dry Creek', x: 300, z: -1500, r: 170, h: 0, grid: 85, hMin: 4, hMax: 9, palette: [0xe3c9a0, 0xd4a373, 0xc9ada7] },
  { name: 'Pinewood', x: -3100, z: 600, r: 170, h: 0, grid: 85, hMin: 4, hMax: 10, palette: [0x8d6e63, 0xa1887f, 0xbcaaa4] },
  { name: 'Saltmarsh', x: 3900, z: -400, r: 170, h: 0, grid: 85, hMin: 4, hMax: 9, palette: [0xe0f2f1, 0xb2dfdb, 0xfff3e0] },
];
const AIRPORT = { name: 'Sol International Airport', x: 700, z: 4000, hx: 900, hz: 260, h: 0 };
const TALON = { name: 'Mount Talon', x: -2600, z: 3000, H: 480, R: 1100 };
// highways (control points, Catmull-Rom smoothed); each end sits inside a town's flat ground
const HIGHWAYS = [
  { name: 'Route 1 Coast Hwy', pts: [[2950, 1850], [3500, 900], [3900, -100], [3900, -700], [3600, -1800], [3100, -2550]] },
  { name: 'Route 9 Desert Hwy', pts: [[2250, -3050], [1300, -2300], [300, -1650], [-300, -1700], [-1500, -2100], [-2450, -2250]] },
  { name: 'Route 5 Valley Hwy', pts: [[300, -1350], [500, -400], [1200, 700], [1900, 1700], [2000, 2100]] },
  { name: 'Route 7 Forest Hwy', pts: [[-3000, -1750], [-3200, -900], [-3100, 450], [-3000, 1300], [-1500, 1900], [0, 2300], [1850, 2600]] },
  { name: 'Airport Rd', pts: [[2000, 3050], [1700, 3400], [1100, 3750]] },
  { name: 'Talon Summit Rd', pts: [[-2950, 1450], [-2250, 1850], [-1950, 2650], [-2300, 3350], [-2950, 3400], [-3250, 2900], [-2950, 2500], [-2600, 2650], [-2580, 3000]] },
];

function buildHeightGrid(flats) {
  const g = new Float32Array(GN * GN);
  for (let j = 0; j < GN; j++) for (let i = 0; i < GN; i++) {
    const x = -SIZE + i * CELL, z = -SIZE + j * CELL;
    const desert = ss(-700, 700, x) * ss(800, -1300, z);
    let h = 40 + fbm(x / 1500, z / 1500) * 150 * (1 - 0.8 * desert) + desert * (8 * Math.sin(x / 90 + Math.sin(z / 140) * 2) + 10 * fbm(x / 400, z / 400));
    h += 320 * ss(-4600, -5900, z) * (0.6 + 0.4 * fbm(x / 600, 3)) + 300 * ss(-4900, -5900, x) * (0.6 + 0.4 * fbm(7, z / 600));   // ranges framing the north and west edges
    const dT = Math.hypot(x - TALON.x, z - TALON.z); if (dT < TALON.R * 1.6) h += TALON.H * Math.exp(-Math.pow(dT / (TALON.R * 0.55), 2)) * (1 + 0.08 * fbm(x / 200, z / 200));
    // sea: east and south coasts, plus Halcyon Bay cutting in from the north-west
    const coast = Math.min(4700 + 200 * Math.sin(z / 650) - x, 4750 + 220 * Math.sin(x / 700) - z, Math.hypot(x + 3300, z + 4300) - 1100 - 120 * Math.sin(Math.atan2(z + 4300, x + 3300) * 5));
    if (coast < 0) h = Math.max(-30, -1.5 + coast * 0.05);
    else h = Math.max(1.2, lerp(1.2, Math.max(h, 14), ss(0, 380, coast)));
    for (const f of flats) { const dx = Math.max(0, Math.abs(x - f.x) - f.hx), dz = Math.max(0, Math.abs(z - f.z) - f.hz), d = Math.hypot(dx, dz); if (d < f.blend) h = lerp(f.h, h, ss(0, f.blend, d)); }
    g[j * GN + i] = h;
  }
  return g;
}

export function buildWorld({ THREE, scene, addCol, rand }) {
  const r = rand(11), root = new THREE.Group(); root.name = 'world'; scene.add(root);
  // town ground heights follow the land around them
  const towns = [...CITIES, ...VILLAGES];
  const flats = [...towns.map(t => ({ x: t.x, z: t.z, hx: t.r + 30, hz: t.r + 30, blend: 260, h: t.h })), { x: AIRPORT.x, z: AIRPORT.z, hx: AIRPORT.hx, hz: AIRPORT.hz, blend: 200, h: 3 }];
  // villages take the height of the raw land under them
  { const raw = buildHeightGrid([]); const at = (x, z) => raw[Math.round((z + SIZE) / CELL) * GN + Math.round((x + SIZE) / CELL)];
    for (const v of VILLAGES) v.h = Math.max(3, at(v.x, v.z)); flats.forEach((f, k) => { if (k >= CITIES.length && k < towns.length) f.h = towns[k].h; }); }
  const G = buildHeightGrid(flats);
  const baseAt = (x, z) => { const fx = Math.min(GN - 1.001, Math.max(0, (x + SIZE) / CELL)), fz = Math.min(GN - 1.001, Math.max(0, (z + SIZE) / CELL)), i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j;
    return lerp(lerp(G[j * GN + i], G[j * GN + i + 1], u), lerp(G[(j + 1) * GN + i], G[(j + 1) * GN + i + 1], u), v); };

  // ---------- highways: smoothed centre lines with gentle grades ----------
  const HW = 20, roadSegs = [], RS = [];   // RS: per-sample road data for heightAt
  const cr = (p0, p1, p2, p3, t) => { const t2 = t * t, t3 = t2 * t; return [0, 1].map(k => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)); };
  const highways = HIGHWAYS.map(hw => {
    const P = hw.pts, S = [];
    for (let k = 0; k < P.length - 1; k++) { const p0 = P[Math.max(0, k - 1)], p1 = P[k], p2 = P[k + 1], p3 = P[Math.min(P.length - 1, k + 2)], L = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]), n = Math.ceil(L / 10);
      for (let s = 0; s < n; s++) S.push(cr(p0, p1, p2, p3, s / n)); }
    S.push(P[P.length - 1]);
    let H = S.map(([x, z]) => baseAt(x, z));
    for (let pass = 0; pass < 3; pass++) { const W = 14, o = H.slice(); for (let i = 0; i < H.length; i++) { let a = 0, c = 0; for (let k = -W; k <= W; k++) { const q = o[Math.min(H.length - 1, Math.max(0, i + k))]; a += q; c++; } H[i] = a / c; } }
    H = H.map((h, i) => Math.max(2, h, i < 3 || i > H.length - 4 ? baseAt(...S[i]) : 0));   // ends meet the town ground exactly
    for (let i = 0; i < 3; i++) H[i] = baseAt(...S[i]); for (let i = H.length - 3; i < H.length; i++) H[i] = baseAt(...S[i]);
    const isSummit = /Summit/.test(hw.name), w = isSummit ? 12 : HW;
    return { name: hw.name, S, H, w };
  });
  // spatial grid of highway segments
  const GC = 80, grid = new Map(), key = (i, j) => i * 100000 + j;
  highways.forEach((h, hi) => { for (let i = 0; i < h.S.length - 1; i++) { const [ax, az] = h.S[i], [bx, bz] = h.S[i + 1], m = h.w / 2 + 50;
    for (let gi = Math.floor((Math.min(ax, bx) - m) / GC); gi <= Math.floor((Math.max(ax, bx) + m) / GC); gi++) for (let gj = Math.floor((Math.min(az, bz) - m) / GC); gj <= Math.floor((Math.max(az, bz) + m) / GC); gj++) {
      const k = key(gi, gj); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(hi, i); } } });
  const nearHwy = (x, z) => { const L = grid.get(key(Math.floor(x / GC), Math.floor(z / GC))); if (!L) return null; let best = null;
    for (let n = 0; n < L.length; n += 2) { const h = highways[L[n]], i = L[n + 1], [ax, az] = h.S[i], [bx, bz] = h.S[i + 1], dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2)), d = Math.hypot(x - ax - t * dx, z - az - t * dz);
      if (!best || d < best.d) best = { d, h: lerp(h.H[i], h.H[i + 1], t), hw: h }; }
    return best; };
  const inTown = (x, z) => towns.find(t => Math.abs(x - t.x) <= t.r && Math.abs(z - t.z) <= t.r);
  const heightAt = (x, z) => {
    const t = inTown(x, z); if (t) return t.h;
    const b = baseAt(x, z), q = nearHwy(x, z); if (!q) return b;
    const edge = q.hw.w / 2 + 2; if (q.d <= edge) return q.h;
    return q.d < edge + 45 ? lerp(q.h, b, ss(0, 45, q.d - edge)) : b;
  };
  const isWater = (x, z) => baseAt(x, z) < 0.2 && !inTown(x, z);

  // ---------- terrain mesh ----------
  const RN = 240, tg = new THREE.PlaneGeometry(2 * SIZE, 2 * SIZE, RN, RN); tg.rotateX(-Math.PI / 2);
  const TP = tg.attributes.position, tc = new Float32Array(TP.count * 3), C = new THREE.Color();
  const cSand = new THREE.Color(0xe6d3a3), cDesert = new THREE.Color(0xd9b77e), cGrass = new THREE.Color(0x6fa84f), cForest = new THREE.Color(0x3f7a3a), cRock = new THREE.Color(0x8b7d6b), cSnow = new THREE.Color(0xf3f5f8), cSeabed = new THREE.Color(0xc2b28a);
  for (let i = 0; i < TP.count; i++) {
    const x = TP.getX(i), z = TP.getZ(i); let y = heightAt(x, z); const q = nearHwy(x, z); if (q && q.d < q.hw.w / 2 + 30) y = Math.min(y, q.h) - 0.5; if (inTown(x, z)) y -= 0.3;
    TP.setY(i, y); const b = baseAt(x, z), desert = ss(-700, 700, x) * ss(800, -1300, z);
    if (b < 0.2) C.copy(cSeabed); else if (b < 6) C.copy(cSand);
    else { C.copy(cGrass).lerp(cForest, ss(-500, -2500, x) * 0.8 + 0.2 * ss(60, 160, b)).lerp(cDesert, desert); if (b > 170) C.lerp(cRock, ss(170, 280, b)); if (b > 360) C.lerp(cSnow, ss(360, 420, b)); }
    tc.set([C.r, C.g, C.b], i * 3);
  }
  tg.setAttribute('color', new THREE.BufferAttribute(tc, 3)); tg.computeVertexNormals();
  const terrain = new THREE.Mesh(tg, new THREE.MeshLambertMaterial({ vertexColors: true })); terrain.receiveShadow = true; root.add(terrain);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(4 * SIZE, 4 * SIZE), new THREE.MeshLambertMaterial({ color: 0x2f8fc4, transparent: true, opacity: 0.85 }));
  sea.rotation.x = -Math.PI / 2; sea.position.y = 0; root.add(sea);

  // ---------- highway ribbons ----------
  const rtex = (() => { const c = document.createElement('canvas'); c.width = 128; c.height = 128; const x = c.getContext('2d');
    x.fillStyle = '#38383c'; x.fillRect(0, 0, 128, 128); x.fillStyle = '#eee'; x.fillRect(3, 0, 4, 128); x.fillRect(121, 0, 4, 128);
    x.fillStyle = '#f2c01e'; x.fillRect(60, 0, 3, 128); x.fillRect(65, 0, 3, 128); x.fillStyle = '#ddd'; x.fillRect(33, 0, 3, 64); x.fillRect(92, 0, 3, 64);
    const t = new THREE.CanvasTexture(c); t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; })();
  const rmat = new THREE.MeshLambertMaterial({ map: rtex, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 });
  for (const h of highways) {
    const pos = [], uv = [], idx = []; let along = 0;
    for (let i = 0; i < h.S.length; i++) {
      const a = h.S[Math.max(0, i - 1)], b = h.S[Math.min(h.S.length - 1, i + 1)], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1, nx = -dz / l, nz = dx / l;
      if (i) along += Math.hypot(h.S[i][0] - h.S[i - 1][0], h.S[i][1] - h.S[i - 1][1]);
      const [x, z] = h.S[i], y = h.H[i] + 0.12;
      pos.push(x - nx * h.w / 2, y, z - nz * h.w / 2, x + nx * h.w / 2, y, z + nz * h.w / 2); uv.push(0, along / 20, 1, along / 20);
      if (i) { const v = i * 2; idx.push(v - 2, v, v - 1, v - 1, v, v + 1); }
      if (i % 2 === 0 && i < h.S.length - 1) roadSegs.push({ x1: x, z1: z, x2: h.S[Math.min(h.S.length - 1, i + 2)][0], z2: h.S[Math.min(h.S.length - 1, i + 2)][1], w: h.w, name: h.name });
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, rmat); m.receiveShadow = true; root.add(m);
  }

  // ---------- towns: street grid, sidewalk plate, buildings ----------
  const plateMat = new THREE.MeshLambertMaterial({ color: 0xb8b4aa }), streetMat = new THREE.MeshLambertMaterial({ color: 0x3a3a3e, polygonOffset: true, polygonOffsetFactor: -1 });
  const winTex = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 64, 128); x.fillStyle = '#6d8296';
    for (let j = 6; j < 128; j += 16) for (let i = 6; i < 64; i += 14) x.fillRect(i, j, 8, 9); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const bGeo = new THREE.BoxGeometry(1, 1, 1); bGeo.translate(0, 0.5, 0);
  const blds = []; const streetSegs = [], carSpots = [];
  for (const t of towns) {
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(2 * t.r + 40, 2 * t.r + 40), plateMat); plate.rotation.x = -Math.PI / 2; plate.position.set(t.x, t.h + 0.02, t.z); root.add(plate);
    const SW = t.grid > 90 ? 16 : 12, lines = []; for (let g = -t.r; g <= t.r + 1; g += t.grid) lines.push(g);
    for (const g of lines) for (const ns of [0, 1]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(ns ? SW : 2 * t.r + SW, ns ? 2 * t.r + SW : SW), streetMat); m.rotation.x = -Math.PI / 2;
      m.position.set(t.x + (ns ? g : 0), t.h + 0.06 + ns * 0.01, t.z + (ns ? 0 : g)); root.add(m);
      streetSegs.push(ns ? { x1: t.x + g, z1: t.z - t.r, x2: t.x + g, z2: t.z + t.r, w: SW } : { x1: t.x - t.r, z1: t.z + g, x2: t.x + t.r, z2: t.z + g, w: SW });
    }
    for (let a = 0; a < lines.length - 1; a++) for (let b = 0; b < lines.length - 1; b++) {
      const bx0 = t.x + lines[a] + SW / 2 + 4, bx1 = t.x + lines[a + 1] - SW / 2 - 4, bz0 = t.z + lines[b] + SW / 2 + 4, bz1 = t.z + lines[b + 1] - SW / 2 - 4;
      const cx = (bx0 + bx1) / 2, cz = (bz0 + bz1) / 2, centre = 1 - Math.max(Math.abs(cx - t.x), Math.abs(cz - t.z)) / t.r;
      if (r() < 0.08) { carSpots.push({ x: bx0 - SW / 2 - 4 + 3, z: cz, h: 0 }); continue; }   // the odd empty lot / plaza
      const split = (bx1 - bx0) > 50 && r() < 0.7 ? 2 : 1;
      for (let s = 0; s < split; s++) for (let s2 = 0; s2 < split; s2++) {
        const w = (bx1 - bx0) / split - 4, d = (bz1 - bz0) / split - 4, x = bx0 + (s + 0.5) * (bx1 - bx0) / split, z = bz0 + (s2 + 0.5) * (bz1 - bz0) / split;
        const hgt = t.hMin + (t.hMax - t.hMin) * Math.pow(r(), 1.6) * (0.35 + 0.65 * centre * centre);
        blds.push({ x, z, w, d, h: hgt, y: t.h, c: t.palette[(r() * t.palette.length) | 0] }); addCol(x, z, w, d, hgt + t.h);
      }
    }
    for (let k = 0; k < 6; k++) { const g = lines[1 + ((r() * (lines.length - 2)) | 0)]; carSpots.push({ x: t.x + g + 4, z: t.z - t.r + 60 + r() * (2 * t.r - 120), h: 0 }); }
  }
  { const im = new THREE.InstancedMesh(bGeo, new THREE.MeshLambertMaterial({ map: winTex }), blds.length), M = new THREE.Matrix4(), col = new THREE.Color();
    blds.forEach((b, i) => { M.makeScale(b.w, b.h, b.d).setPosition(b.x, b.y, b.z); im.setMatrixAt(i, M); im.setColorAt(i, col.set(b.c)); });
    im.castShadow = im.receiveShadow = true; root.add(im); }

  // ---------- airport ----------
  { const A = AIRPORT, ap = new THREE.Mesh(new THREE.PlaneGeometry(2 * A.hx, 2 * A.hz), new THREE.MeshLambertMaterial({ color: 0x9a9a92 })); ap.rotation.x = -Math.PI / 2; ap.position.set(A.x, 3.03, A.z); root.add(ap);
    const rc = document.createElement('canvas'); rc.width = 512; rc.height = 64; const x = rc.getContext('2d'); x.fillStyle = '#2f2f33'; x.fillRect(0, 0, 512, 64); x.fillStyle = '#fff'; for (let i = 30; i < 480; i += 40) x.fillRect(i, 30, 22, 4); x.fillRect(4, 8, 14, 48); x.fillRect(494, 8, 14, 48);
    const rt = new THREE.CanvasTexture(rc); rt.colorSpace = THREE.SRGBColorSpace;
    const rw = new THREE.Mesh(new THREE.PlaneGeometry(2 * A.hx - 80, 60), new THREE.MeshLambertMaterial({ map: rt, polygonOffset: true, polygonOffsetFactor: -1 })); rw.rotation.x = -Math.PI / 2; rw.position.set(A.x, 3.08, A.z + 60); root.add(rw);
    const term = new THREE.Mesh(new THREE.BoxGeometry(260, 22, 70), new THREE.MeshLambertMaterial({ color: 0xdfe6ea })); term.position.set(A.x + 300, 3 + 11, A.z - 180); root.add(term); addCol(A.x + 300, A.z - 180, 260, 70, 25);
    const tw = new THREE.Mesh(new THREE.CylinderGeometry(6, 8, 45, 10), new THREE.MeshLambertMaterial({ color: 0xcfd8dc })); tw.position.set(A.x + 480, 3 + 22.5, A.z - 160); root.add(tw); addCol(A.x + 480, A.z - 160, 16, 16, 50); }

  // ---------- trees: pines in the north-west forest and hills, palms on the south coast, cacti in the desert ----------
  { const P = [], Pa = [], Ca = [], rr = rand(23);
    for (let k = 0; k < 60000 && P.length + Pa.length + Ca.length < 5200; k++) {
      const x = (rr() * 2 - 1) * (SIZE - 200), z = (rr() * 2 - 1) * (SIZE - 200), b = baseAt(x, z); if (b < 1.5 || inTown(x, z)) continue;
      if (Math.abs(x - AIRPORT.x) < AIRPORT.hx + 40 && Math.abs(z - AIRPORT.z) < AIRPORT.hz + 40) continue;
      const q = nearHwy(x, z); if (q && q.d < q.hw.w / 2 + 12) continue; const y = heightAt(x, z);
      const desert = ss(-700, 700, x) * ss(800, -1300, z), forest = ss(0, -2500, x) * 0.7 + (1 - desert) * 0.25;
      if (b < 7 && z > 1500 && rr() < 0.5) Pa.push([x, y, z, 0.8 + rr() * 0.5]);
      else if (desert > 0.6) { if (rr() < 0.18) Ca.push([x, y, z, 0.7 + rr() * 0.7]); }
      else if (b < 380 && rr() < forest) P.push([x, y, z, 0.7 + rr() * 0.8]);
    }
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), T = new THREE.Vector3();
    const inst = (geo, matl, list, yOff) => { const im = new THREE.InstancedMesh(geo, matl, list.length); list.forEach(([x, y, z, s], i) => im.setMatrixAt(i, M.compose(T.set(x, y + yOff * s, z), Q, S.set(s, s, s)))); root.add(im); };
    inst(new THREE.ConeGeometry(3.4, 12, 7), new THREE.MeshLambertMaterial({ color: 0x2e5e30 }), P, 8); inst(new THREE.CylinderGeometry(0.45, 0.6, 3, 5), new THREE.MeshLambertMaterial({ color: 0x5b4030 }), P, 1.5);
    inst(new THREE.CylinderGeometry(0.35, 0.55, 11, 6), new THREE.MeshLambertMaterial({ color: 0x8a6a4a }), Pa, 5.5); inst(new THREE.SphereGeometry(3.2, 7, 4), new THREE.MeshLambertMaterial({ color: 0x3f8f3a }), Pa, 11.5);
    inst(new THREE.CylinderGeometry(0.8, 0.9, 5, 7), new THREE.MeshLambertMaterial({ color: 0x4f8a3a }), Ca, 2.5);
  }

  // ---------- town name boards at each highway end ----------
  const board = (text, x, z, y, ang) => { const c = document.createElement('canvas'); c.width = 512; c.height = 128; const g = c.getContext('2d'); g.fillStyle = '#0b6b3a'; g.fillRect(0, 0, 512, 128); g.strokeStyle = '#fff'; g.lineWidth = 6; g.strokeRect(8, 8, 496, 112);
    g.fillStyle = '#fff'; g.font = 'bold 54px sans-serif'; g.textAlign = 'center'; g.fillText(text, 256, 84); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const grp = new THREE.Group(); grp.position.set(x, y, z); grp.rotation.y = ang; root.add(grp);
    for (const back of [0, 1]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(10, 2.5), new THREE.MeshBasicMaterial({ map: t })); m.position.set(0, 4.5, back ? -0.03 : 0.03); m.rotation.y = back ? Math.PI : 0; grp.add(m); }
    for (const sx of [-4, 4]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.25, 4.5, 0.25), new THREE.MeshLambertMaterial({ color: 0x888888 })); p.position.set(sx, 2.25, 0); grp.add(p); } };
  for (const h of highways) for (const end of [0, 1]) {
    const i = end ? h.S.length - 1 : 0, j = end ? h.S.length - 30 : 29, [x, z] = h.S[i], t = inTown(x, z); if (!t) continue;
    const [px, pz] = h.S[j], dx = x - px, dz = z - pz, l = Math.hypot(dx, dz), sx = px + (-dz / l) * (h.w / 2 + 4), sz = pz + (dx / l) * (h.w / 2 + 4);
    board(t.name, sx, sz, heightAt(sx, sz), Math.atan2(dx, dz) + Math.PI);
  }

  // ---------- map picture for the full map / minimap (1 px = 12 units) ----------
  const mapCanvas = document.createElement('canvas'); mapCanvas.width = mapCanvas.height = 1000;
  { const g = mapCanvas.getContext('2d'), img = g.createImageData(1000, 1000);
    for (let py = 0; py < 1000; py++) for (let px = 0; px < 1000; px++) { const x = -SIZE + px * 12, z = -SIZE + py * 12, b = baseAt(x, z), desert = ss(-700, 700, x) * ss(800, -1300, z);
      if (b < 0.2) C.set(0x2f7fb8); else if (b < 6) C.copy(cSand); else { C.copy(cGrass).lerp(cForest, ss(-500, -2500, x) * 0.8).lerp(cDesert, desert); if (b > 170) C.lerp(cRock, ss(170, 280, b)); if (b > 360) C.lerp(cSnow, ss(360, 420, b)); C.multiplyScalar(0.85 + 0.15 * Math.min(1, b / 300)); }
      const o = (py * 1000 + px) * 4; img.data[o] = C.r * 255; img.data[o + 1] = C.g * 255; img.data[o + 2] = C.b * 255; img.data[o + 3] = 255; }
    g.putImageData(img, 0, 0); const P = (x, z) => [(x + SIZE) / 12, (z + SIZE) / 12];
    g.fillStyle = '#9a9a92'; g.fillRect(...P(AIRPORT.x - AIRPORT.hx, AIRPORT.z - AIRPORT.hz), 2 * AIRPORT.hx / 12, 2 * AIRPORT.hz / 12);
    for (const t of towns) { g.fillStyle = '#8f8f8f'; g.fillRect(...P(t.x - t.r, t.z - t.r), 2 * t.r / 12, 2 * t.r / 12); g.strokeStyle = '#5a5a5a'; g.lineWidth = 1; for (const s of streetSegs) { g.beginPath(); g.moveTo(...P(s.x1, s.z1)); g.lineTo(...P(s.x2, s.z2)); g.stroke(); } }
    g.lineCap = 'round'; for (const h of highways) { g.strokeStyle = /Summit|Airport/.test(h.name) ? '#f2f2f2' : '#ffcc33'; g.lineWidth = /Summit|Airport/.test(h.name) ? 3 : 5; g.beginPath(); h.S.forEach(([x, z], i) => i ? g.lineTo(...P(x, z)) : g.moveTo(...P(x, z))); g.stroke(); }
    g.textAlign = 'center'; g.font = 'bold 26px sans-serif'; g.lineWidth = 5; g.strokeStyle = 'rgba(0,0,0,.7)'; g.fillStyle = '#fff';
    for (const t of CITIES) { g.strokeText(t.name, P(t.x, t.z)[0], P(t.x, t.z)[1] - t.r / 12 - 10); g.fillText(t.name, P(t.x, t.z)[0], P(t.x, t.z)[1] - t.r / 12 - 10); }
    g.font = 'bold 18px sans-serif'; for (const p of [...VILLAGES, { name: 'Mount Talon ▲', x: TALON.x, z: TALON.z + 40 }, { name: '✈ Airport', x: AIRPORT.x, z: AIRPORT.z + 330 }, { name: 'Halcyon Bay', x: -3300, z: -4300 }])
      { const [a, b] = P(p.x, p.z - (p.r || 0) - 60); g.strokeText(p.name, a, b); g.fillText(p.name, a, b); } }

  const onRoad = (x, z) => { const q = nearHwy(x, z); if (q && q.d <= q.hw.w / 2) return { name: q.hw.name, h: q.h };
    const t = inTown(x, z); if (t) for (const s of streetSegs) if (Math.abs(s.x1 - s.x2) < 1 ? Math.abs(x - s.x1) <= s.w / 2 && z >= s.z1 && z <= s.z2 : Math.abs(z - s.z1) <= s.w / 2 && x >= s.x1 && x <= s.x2) return { name: t.name, h: t.h };
    return null; };
  const ps = CITIES[0];
  const cities = CITIES.map(t => ({ name: t.name, x: t.x, z: t.z, r: t.r, h: t.h }));
  const places = [...cities.map(c => ({ ...c, kind: 'city' })), ...VILLAGES.map(v => ({ name: v.name, x: v.x, z: v.z, r: v.r, h: v.h, kind: 'village' })),
    { name: AIRPORT.name, x: AIRPORT.x, z: AIRPORT.z, kind: 'airport' }, { name: TALON.name, x: -2580, z: 3000, kind: 'mountain' }];
  return { root, spawn: { x: ps.x + 8, z: ps.z + 30, h: 0 }, cities, places, roads: [...roadSegs, ...streetSegs], highways: highways.map(h => ({ name: h.name, pts: h.S, w: h.w })),
    size: SIZE, carSpots, heightAt, isWater, onRoad, mapCanvas, seaLevel: 0 };
}
