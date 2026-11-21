// Sierra Sol pedestrians: Mika. Original townsfolk who walk the sidewalks and crosswalks of every city and village,
// dodge cars, and get knocked over when hit.
// export initNPCs({ THREE, scene, world, player, vehicles, state, showMsg, settings }) -> { update(dt), list, reset() }
// Car forward = (sin heading, cos heading), as in main.js.
export function initNPCs({ THREE, scene, world, player, vehicles = [], state = {}, showMsg = () => {}, settings = {} }) {
  const H = (x, z) => (world.heightAt ? world.heightAt(x, z) : 0);
  // sidewalk lattice for each town: x/z values at the street edges (both sides of every street)
  const towns = (world.places || world.cities || []).filter(p => p.kind === 'city' || p.kind === 'village' || !p.kind).map(p => {
    const grid = p.kind === 'village' ? 85 : 100, SW = grid > 90 ? 16 : 12, o = SW / 2 + 2.5, xs = [], zs = [];
    for (let g = -p.r; g <= p.r + 1; g += grid) { for (const s of [-o, o]) { const v = g + s; if (v >= -p.r - 1 && v <= p.r + 1) { xs.push(p.x + v); zs.push(p.z + v); } } }
    return { ...p, xs, zs };
  });
  const SKIN = [0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0x5c3a21, 0xffdbac], HAIR = [0x1b1b1b, 0x3b2314, 0x7a4a24, 0xc9a15b, 0x8a8a8a, 0xb23a2a];
  const SHIRT = [0x2a9d8f, 0xe76f51, 0x264653, 0xf4a261, 0x8ecae6, 0xffffff, 0xd62828, 0x6a4c93, 0xf1fa8c, 0x9c6644, 0xe9edc9, 0x3a86ff];
  const PANTS = [0x22223b, 0x4a4e69, 0xc2b280, 0x6b705c, 0x1d3557, 0x7f5539, 0x2b2d42];
  const mats = new Map(), M = c => { if (!mats.has(c)) mats.set(c, new THREE.MeshLambertMaterial({ color: c })); return mats.get(c); };
  const box = (w, h, d, dy) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(0, dy, 0); return g; };
  const G = { torso: box(0.5, 0.62, 0.28, 0), head: box(0.26, 0.28, 0.26, 0.14), hair: box(0.28, 0.1, 0.28, 0.3), leg: box(0.19, 0.78, 0.2, -0.39), arm: box(0.13, 0.6, 0.14, -0.3) };
  const pick = a => a[(Math.random() * a.length) | 0];
  function makePerson() {
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
    const skin = M(pick(SKIN)), shirt = M(pick(SHIRT)), pants = M(pick(PANTS)), s = 0.88 + Math.random() * 0.22;
    const torso = new THREE.Mesh(G.torso, shirt); torso.position.y = 1.12; body.add(torso);
    const head = new THREE.Mesh(G.head, skin); head.position.y = 1.43; body.add(head);
    if (Math.random() < 0.85) { const hr = new THREE.Mesh(G.hair, M(pick(HAIR))); hr.position.y = 1.43; body.add(hr); }
    const legL = new THREE.Mesh(G.leg, pants), legR = new THREE.Mesh(G.leg, pants); legL.position.set(-0.12, 0.8, 0); legR.position.set(0.12, 0.8, 0);
    const armL = new THREE.Mesh(G.arm, shirt), armR = new THREE.Mesh(G.arm, shirt); armL.position.set(-0.33, 1.4, 0); armR.position.set(0.33, 1.4, 0);
    body.add(legL, legR, armL, armR); root.scale.setScalar(s); scene.add(root);
    return { root, body, legL, legR, armL, armR };
  }
  const MAX = () => (settings.quality === 'low' ? 18 : 36);
  const list = [];   // {mesh, town, i, j, ti, tj, x, z, h, spd, phase, mode:'walk'|'flee'|'down', t, vx, vz}
  const nodePos = (t, i, j) => [t.xs[i], t.zs[j]];
  function chooseNext(p) {
    const t = p.town, opts = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([a, b]) => t.xs[p.i + a] !== undefined && t.zs[p.j + b] !== undefined);
    const fwd = opts.filter(([a, b]) => a === p.di && b === p.dj), [a, b] = fwd.length && Math.random() < 0.7 ? fwd[0] : pick(opts);
    p.di = a; p.dj = b; p.ti = p.i + a; p.tj = p.j + b;
  }
  function spawnIn(t, near) {
    // only nodes within reach of the player, so tries rarely miss
    const R = 35 + 115 * Math.pow(Math.random(), 1.7), ii = [], jj = []; t.xs.forEach((x, i) => { if (Math.abs(x - player.x) < R) ii.push(i); }); t.zs.forEach((z, j) => { if (Math.abs(z - player.z) < R) jj.push(j); });
    if (!ii.length || !jj.length) return;
    for (let k = 0; k < 16; k++) {
      const i = pick(ii), j = pick(jj), [x, z] = nodePos(t, i, j), d = Math.hypot(x - player.x, z - player.z);
      if (d < (near ? 8 : 25) || d > 150 || (world.isWater && world.isWater(x, z))) continue;
      const p = { mesh: makePerson(), town: t, i, j, di: 0, dj: 0, x, z, h: 0, spd: 1.1 + Math.random() * 0.6, phase: Math.random() * 6, mode: 'walk', t: 0, vx: 0, vz: 0 };
      // start part-way along a sidewalk so groups don't all stand on corners
      chooseNext(p); const [tx, tz] = nodePos(t, p.ti, p.tj), f = Math.random() * 0.9; p.x += (tx - x) * f; p.z += (tz - z) * f;
      list.push(p); return p;
    }
  }
  function remove(p) { scene.remove(p.mesh.root); list.splice(list.indexOf(p), 1); }
  function knock(p, v) {
    const sp = Math.abs(v.speed || 0); p.mode = 'down'; p.t = 4 + Math.random() * 2; p.fall = 0;
    p.vx = Math.sin(v.heading) * sp * 0.6 + (p.x - v.x) * 2; p.vz = Math.cos(v.heading) * sp * 0.6 + (p.z - v.z) * 2;
    for (const q of list) if (q !== p && q.mode !== 'down' && Math.hypot(q.x - p.x, q.z - p.z) < 30) { q.mode = 'flee'; q.t = 4; const a = Math.atan2(q.x - p.x, q.z - p.z); q.vx = Math.sin(a) * 4.5; q.vz = Math.cos(a) * 4.5; }
    if (v === player.car && typeof state.wanted === 'number') { if (state.wanted < 1) showMsg('Hit a pedestrian! The police noticed.', 2.5); state.wanted = Math.min(5, Math.max(state.wanted, 1)); }
  }
  let spawnT = 0;
  function update(dt) {
    // which towns are near the player
    const near = towns.filter(t => Math.abs(player.x - t.x) < t.r + 180 && Math.abs(player.z - t.z) < t.r + 180);
    for (let k = list.length - 1; k >= 0; k--) { const p = list[k]; if (Math.hypot(p.x - player.x, p.z - player.z) > 200 || !near.includes(p.town)) remove(p); }
    if ((spawnT -= dt) <= 0 && near.length) { spawnT = 0.1; const max = Math.round(MAX() * (near.some(t => t.kind === 'village') && !near.some(t => t.kind === 'city') ? 0.4 : 1));
      // fill fast when the street is empty (first visit, after a teleport), then top up one at a time
      for (let n = list.length < max / 2 ? 6 : 1; n > 0 && list.length < max; n--) spawnIn(pick(near), list.length < max / 2); }
    for (const p of list) {
      const m = p.mesh;
      if (p.mode === 'down') {
        p.fall = Math.min(1, p.fall + dt * 4); p.x += p.vx * dt; p.z += p.vz * dt; p.vx *= Math.max(0, 1 - dt * 3); p.vz *= Math.max(0, 1 - dt * 3);
        m.body.rotation.x = -Math.PI / 2 * p.fall; m.body.position.y = 0.15 * p.fall;
        if ((p.t -= dt) <= 0) { p.mode = 'flee'; p.t = 3; m.body.rotation.x = 0; m.body.position.y = 0; const a = Math.random() * 6.28; p.vx = Math.sin(a) * 4; p.vz = Math.cos(a) * 4; }
      } else {
        // look for cars about to hit us
        for (const v of vehicles) {
          const dx = p.x - v.x, dz = p.z - v.z, d = Math.hypot(dx, dz), sp = Math.abs(v.speed || 0); if (d > 16 || sp < 2) continue;
          if (d < 1.9 + sp * 0.02) { knock(p, v); break; }
          const fx = Math.sin(v.heading) * Math.sign(v.speed), fz = Math.cos(v.heading) * Math.sign(v.speed), ahead = dx * fx + dz * fz, side = dx * fz - dz * fx;
          if (ahead > 0 && ahead < 4 + sp * 0.5 && Math.abs(side) < 3 && p.mode !== 'flee') { const s = side >= 0 ? 1 : -1; p.mode = 'flee'; p.t = 1.2; p.vx = fz * s * 5.5; p.vz = -fx * s * 5.5; }
        }
        if (p.mode === 'down') continue;
        let mvx, mvz, spd;
        if (p.mode === 'flee') { mvx = p.vx; mvz = p.vz; spd = Math.hypot(mvx, mvz); if ((p.t -= dt) <= 0) { p.mode = 'walk'; // rejoin nearest sidewalk node
            let bi = 0, bj = 0; p.town.xs.forEach((x, i) => { if (Math.abs(x - p.x) < Math.abs(p.town.xs[bi] - p.x)) bi = i; }); p.town.zs.forEach((z, j) => { if (Math.abs(z - p.z) < Math.abs(p.town.zs[bj] - p.z)) bj = j; }); p.i = p.ti = bi; p.j = p.tj = bj; } }
        else { const [tx, tz] = nodePos(p.town, p.ti, p.tj), dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz);
          if (d < 0.3) { p.i = p.ti; p.j = p.tj; chooseNext(p); }
          spd = p.spd; mvx = d > 0 ? dx / d * spd : 0; mvz = d > 0 ? dz / d * spd : 0; }
        // the player on foot gently pushes people aside
        if (!player.car) { const dx = p.x - player.x, dz = p.z - player.z, d = Math.hypot(dx, dz); if (d < 0.7 && d > 0.001) { p.x += dx / d * (0.7 - d); p.z += dz / d * (0.7 - d); } }
        p.x += mvx * dt; p.z += mvz * dt; if (spd > 0.1) m.root.rotation.y = Math.atan2(mvx, mvz);
        p.phase += dt * spd * 3.2; const sw = Math.sin(p.phase) * Math.min(0.9, 0.35 + spd * 0.12);
        m.legL.rotation.x = sw; m.legR.rotation.x = -sw; m.armL.rotation.x = -sw * 0.8; m.armR.rotation.x = sw * 0.8;
      }
      m.root.position.set(p.x, H(p.x, p.z), p.z);
    }
  }
  function reset() { while (list.length) remove(list[0]); }
  return { update, list, reset };
}
