// world.js: OWNED BY MIKA. Placeholder from New Bot so the game runs; replace freely.
// Contract: export buildWorld(ctx) -> { spawn:{x,z,h}, cities:[{name,x,z,r}], roads:[{x1,z1,x2,z2,w}], size, carSpots:[{x,z,h}] }
// ctx = { THREE, scene, addCol(x,z,w,d,h), rand(seed) }. Use ctx.addCol for anything solid. Ground height is 0 for now.
export function buildWorld({ THREE, scene, addCol, rand }) {
  const size = 3000, r = rand(7);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(size * 2, size * 2), new THREE.MeshLambertMaterial({ color: 0xc9b07a }));
  ground.rotation.x = -Math.PI / 2; scene.add(ground);
  const cities = [{ name: 'Porto Sol', x: 0, z: 0, r: 260 }, { name: 'Bayhaven', x: -1400, z: -1100, r: 220 }, { name: 'Neon Mesa', x: 1500, z: -900, r: 220 }];
  const roads = [], road = new THREE.MeshLambertMaterial({ color: 0x333338, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const addRoad = (x1, z1, x2, z2, w = 14) => { roads.push({ x1, z1, x2, z2, w }); const L = Math.hypot(x2 - x1, z2 - z1), m = new THREE.Mesh(new THREE.PlaneGeometry(w, L), road);
    m.rotation.x = -Math.PI / 2; m.rotation.z = -Math.atan2(x2 - x1, z2 - z1); m.position.set((x1 + x2) / 2, 0.06, (z1 + z2) / 2); scene.add(m); };
  const bmat = [0xe8d5b0, 0xd98c6a, 0x9bc4c9, 0xf0f0e8, 0xb7a3c9].map(c => new THREE.MeshLambertMaterial({ color: c }));
  for (const c of cities) {
    for (let g = -c.r; g <= c.r; g += 80) { addRoad(c.x - c.r, c.z + g, c.x + c.r, c.z + g); addRoad(c.x + g, c.z - c.r, c.x + g, c.z + c.r); }
    for (let i = -c.r + 40; i < c.r; i += 80) for (let j = -c.r + 40; j < c.r; j += 80) {
      const w = 30 + r() * 25, d = 30 + r() * 25, h = 8 + r() * (c.name === 'Neon Mesa' ? 60 : 35), x = c.x + i, z = c.z + j;
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bmat[(r() * bmat.length) | 0]); b.position.set(x, h / 2, z); scene.add(b); addCol(x, z, w, d, h);
    }
  }
  addRoad(cities[0].x - 260, 0, cities[1].x + 220, cities[1].z, 18); addRoad(cities[0].x + 260, 0, cities[2].x - 220, cities[2].z, 18);
  const carSpots = [[-17, 15, 0], [63, -5, 0], [-5, -17, 1.57], [25, 63, 1.57], [-97, 30, 0]].map(([x, z, h]) => ({ x, z, h }));
  return { spawn: { x: -22, z: 4, h: 0 }, cities, roads, size, carSpots };
}
