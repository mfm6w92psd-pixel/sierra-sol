// economy.js: OWNED BY NEW BOT 1. Original shops, gym, garages and safe houses for Sierra Sol.
// No GTA / San Andreas / Rockstar names, characters, gangs, brands or likenesses.
// Contract: export initEconomy(ctx) -> { update(dt), getState(), setState(obj), reset() }
// ctx = { THREE, scene, player, state, addCol, showMsg, cities, isBusy() }. Money is player.money.
// player: { x, z, y, heading, money, health, car (null or vehicle), mode:'foot'|'car' }. Set state.uiOpen = true while a menu is open (pauses controls).
// Optional hook in main.js updateFoot, if you want gym Stamina to speed up sprint:
//   const spd = (input.sprint || keys['shift'] ? 8 * (economy.sprintMultiplier?.() || 1) : 4) * l;
// Optional minimap: for (const s of economy.stores) draw s.icon at (s.x, s.z). Buyable safe houses are included.
// Buildings sit on empty city lots (same layout as world.js rand(11)). Triggers are in the lot, not on streets.

export function initEconomy(ctx) {
  const { THREE, scene, player, state, addCol, showMsg, cities, isBusy } = ctx;
  const eco = makeEconomy(THREE);
  return eco.init({ scene, player, state, addCol, showMsg, cities, isBusy });
}

function makeEconomy(THREE) {
  let _scene = null;
  const SHIRTS = [
    { id: 'ember', name: 'Sunset Orange', color: 0xe8742c, price: 0 },
    { id: 'lagoon', name: 'Lagoon Teal', color: 0x2e7d6b, price: 40 },
    { id: 'coral', name: 'Coral Red', color: 0xe05a4f, price: 40 },
    { id: 'gold', name: 'Mesa Gold', color: 0xf0c14e, price: 40 },
    { id: 'ink', name: 'Night Ink', color: 0x1c1c28, price: 45 },
    { id: 'cloud', name: 'Cloud White', color: 0xf4f1ea, price: 40 },
    { id: 'violet', name: 'Violet Dusk', color: 0x7b4fb2, price: 45 },
    { id: 'tide', name: 'Ocean Tide', color: 0x2a6f97, price: 40 },
    { id: 'sand', name: 'Sand Beige', color: 0xd8c3a5, price: 40 },
  ];
  const PANTS = [
    { id: 'indigo', name: 'Harbor Indigo', color: 0x3b3f6b, price: 50 },
    { id: 'khaki', name: 'Stone Khaki', color: 0xb89a6a, price: 0 },
    { id: 'charcoal', name: 'Charcoal', color: 0x2a2a32, price: 50 },
    { id: 'moss', name: 'Forest Moss', color: 0x3d5c45, price: 50 },
    { id: 'bone', name: 'Bone White', color: 0xe8e4dc, price: 55 },
    { id: 'clay', name: 'Rust Clay', color: 0x8a3e2f, price: 55 },
  ];
  const HATS = [
    { id: 'none', name: 'No hat', price: 0 },
    { id: 'cap', name: 'Sol Cap', price: 80 },
    { id: 'brim', name: 'Sun Brim', price: 90 },
    { id: 'beanie', name: 'Ridge Beanie', price: 85 },
    { id: 'band', name: 'Trail Band', price: 70 },
  ];
  const GLASSES = [
    { id: 'none', name: 'No shades', price: 0 },
    { id: 'slim', name: 'Slim Frames', price: 60 },
    { id: 'round', name: 'Round Specs', price: 75 },
    { id: 'dark', name: 'Night Shades', price: 120 },
  ];
  const HAIRCUTS = [
    { id: 'none', name: 'Clean Shave', price: 25 },
    { id: 'crop', name: 'Close Crop', price: 35 },
    { id: 'wave', name: 'Wavy Top', price: 45 },
    { id: 'slick', name: 'Slick Back', price: 45 },
    { id: 'sweep', name: 'Long Sweep', price: 55 },
    { id: 'spike', name: 'Spike Ridge', price: 50 },
  ];
  const HAIR_COLORS = [
    { id: 'ink', name: 'Ink Black', color: 0x1b1b1b, price: 30 },
    { id: 'cocoa', name: 'Cocoa', color: 0x3b2314, price: 30 },
    { id: 'rust', name: 'Rust Brown', color: 0x6b3a1f, price: 30 },
    { id: 'honey', name: 'Honey', color: 0xd8b26e, price: 40 },
    { id: 'silver', name: 'Silver', color: 0x9a9a9a, price: 45 },
    { id: 'frost', name: 'Frost Blond', color: 0xf3e6b8, price: 45 },
  ];
  const SNACKS = [
    { id: 'chew', icon: '🍋', name: 'Citrus Chew', desc: '+15 health', price: 8, heal: 15 },
    { id: 'mix', icon: '🥜', name: 'Trail Mix', desc: '+25 health', price: 15, heal: 25 },
    { id: 'sandwich', icon: '🥪', name: 'Sol Sandwich', desc: '+40 health', price: 22, heal: 40 },
    { id: 'soup', icon: '🍲', name: 'Thermos Soup', desc: '+50 health', price: 28, heal: 50 },
    { id: 'meal', icon: '🍱', name: 'Full Meal', desc: 'Full health', price: 40, heal: 100 },
  ];
  const SPRAYS = [
    { id: 'red', name: 'Canyon Red', color: 0xd1342b },
    { id: 'blue', name: 'Bay Blue', color: 0x2b6cd1 },
    { id: 'gold', name: 'Sol Gold', color: 0xf2c14e },
    { id: 'white', name: 'Pearl White', color: 0xeeeeee },
    { id: 'black', name: 'Night Black', color: 0x1d1d1d },
    { id: 'green', name: 'Pine Green', color: 0x3fa34d },
    { id: 'orange', name: 'Mesa Orange', color: 0xe07a2b },
    { id: 'violet', name: 'Dusk Violet', color: 0x7b4fb2 },
  ];

  // Empty-lot centres from world.js (rand(11)), trigger sits toward the west sidewalk of the lot.
  const STORES = [
    { id: 'ps-clothes', kind: 'clothes', name: 'Tide & Twill', city: 'Porto Sol', icon: '👕', x: 2434, z: 2850, color: 0xff6b8a, sign: '#c4456a' },
    { id: 'ps-barber', kind: 'barber', name: 'Coral Shear', city: 'Porto Sol', icon: '✂️', x: 2134, z: 2550, color: 0x3ec1d3, sign: '#1a8a99' },
    { id: 'ps-food', kind: 'food', name: 'Harbor Nibble', city: 'Porto Sol', icon: '🥤', x: 2534, z: 2750, color: 0xf0c14e, sign: '#c4921a' },
    { id: 'ps-gym', kind: 'gym', name: 'Breakwater Gym', city: 'Porto Sol', icon: '💪', x: 2134, z: 2250, color: 0xff7a1a, sign: '#c45a10' },
    { id: 'ps-garage', kind: 'garage', name: 'Sol Motor Works', city: 'Porto Sol', icon: '🔧', x: 2734, z: 2250, color: 0x4a6fa5, sign: '#2c4a78' },
    { id: 'ps-house', kind: 'house', name: 'Seabrook House', city: 'Porto Sol', icon: '🏠', x: 2334, z: 2550, color: 0x8fbc8f, sign: '#3d6b45', price: 0 },
    { id: 'nm-clothes', kind: 'clothes', name: 'Dune Thread', city: 'Neon Mesa', icon: '👕', x: 2734, z: -2850, color: 0xe9c46a, sign: '#b8860b' },
    { id: 'nm-barber', kind: 'barber', name: 'Mesa Clip', city: 'Neon Mesa', icon: '✂️', x: 2934, z: -2850, color: 0xc77dff, sign: '#7a3cb0' },
    { id: 'nm-food', kind: 'food', name: 'Cactus Mart', city: 'Neon Mesa', icon: '🥤', x: 2534, z: -2950, color: 0xe76f51, sign: '#b1452c' },
    { id: 'nm-gym', kind: 'gym', name: 'Ridgeline Gym', city: 'Neon Mesa', icon: '💪', x: 2534, z: -2750, color: 0xff7a1a, sign: '#c45a10' },
    { id: 'nm-garage', kind: 'garage', name: 'Heatwave Autos', city: 'Neon Mesa', icon: '🔧', x: 2234, z: -3250, color: 0x4a6fa5, sign: '#2c4a78' },
    { id: 'nm-house', kind: 'house', name: 'Mesa Loft', city: 'Neon Mesa', icon: '🏠', x: 2534, z: -3150, color: 0xf4a261, sign: '#c46b2b', price: 2800 },
    { id: 'bh-clothes', kind: 'clothes', name: 'Pine & Linen', city: 'Bayhaven', icon: '👕', x: -2986, z: -2570, color: 0x7f9c8a, sign: '#4a6b58' },
    { id: 'bh-barber', kind: 'barber', name: 'Grove Shear', city: 'Bayhaven', icon: '✂️', x: -3286, z: -2070, color: 0x8d6e63, sign: '#5c4038' },
    { id: 'bh-food', kind: 'food', name: 'Bay Basket', city: 'Bayhaven', icon: '🥤', x: -3286, z: -2270, color: 0xb0bec5, sign: '#5d6a70' },
    { id: 'bh-gym', kind: 'gym', name: 'Timber Gym', city: 'Bayhaven', icon: '💪', x: -3286, z: -1970, color: 0xff7a1a, sign: '#c45a10' },
    { id: 'bh-garage', kind: 'garage', name: 'Cedar Bay Garage', city: 'Bayhaven', icon: '🔧', x: -2686, z: -2170, color: 0x4a6fa5, sign: '#2c4a78' },
    { id: 'bh-house', kind: 'house', name: 'Halcyon Cottage', city: 'Bayhaven', icon: '🏠', x: -3086, z: -2370, color: 0xc9b79c, sign: '#7a6a52', price: 3200 },
  ];

  const DEFAULT = { shirt: 'ember', pants: 'khaki', hat: 'none', glasses: 'none', hair: 'crop', hairColor: 'ink', stamina: 0, muscle: 0 };
  const look = { ...DEFAULT };
  const owned = {};
  for (const s of STORES) if (s.kind === 'house') owned[s.id] = s.price === 0;
  let stored = null, storedMesh = null;
  let parts = null, gymHold = 0, gymMode = 'cardio', gymReps = 0;

  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const sprintMultiplier = () => 1 + look.stamina / 100 * 0.35;
  const okId = (list, id, fb) => list.some(i => i.id === id) ? id : fb;

  function sanitize(s = {}) {
    return {
      shirt: okId(SHIRTS, s.shirt, DEFAULT.shirt),
      pants: okId(PANTS, s.pants, DEFAULT.pants),
      hat: okId(HATS, s.hat, DEFAULT.hat),
      glasses: okId(GLASSES, s.glasses, DEFAULT.glasses),
      hair: okId(HAIRCUTS, s.hair, DEFAULT.hair),
      hairColor: okId(HAIR_COLORS, s.hairColor, DEFAULT.hairColor),
      stamina: clamp(+s.stamina || 0, 0, 100),
      muscle: clamp(+s.muscle || 0, 0, 100),
    };
  }

  function getState() {
    return {
      ...look,
      owned: { ...owned },
      stored: stored ? { color: stored.color, name: stored.name, heading: stored.heading, health: stored.health, garageId: stored.garageId } : null,
    };
  }
  function setState(obj) {
    if (!obj || typeof obj !== 'object') return getState();
    Object.assign(look, sanitize({ ...look, ...obj }));
    if (obj.owned && typeof obj.owned === 'object') {
      for (const s of STORES) if (s.kind === 'house') owned[s.id] = obj.owned[s.id] != null ? !!obj.owned[s.id] : s.price === 0;
    }
    if ('stored' in obj) applyStored(obj.stored);
    applyLook();
    paintHouses();
    return getState();
  }
  function reset() {
    Object.assign(look, { ...DEFAULT });
    for (const s of STORES) if (s.kind === 'house') owned[s.id] = s.price === 0;
    applyStored(null);
    applyLook();
    paintHouses();
    return getState();
  }

  function box(w, h, d, color, x = 0, y = 0, z = 0) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));
    m.position.set(x, y, z); return m;
  }
  function cyl(rt, rb, h, color, x, y, z, seg = 8) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), new THREE.MeshLambertMaterial({ color }));
    m.position.set(x, y, z); return m;
  }

  function prepPlayer(player) {
    const g = player.mesh; if (!g || parts) return;
    const ch = g.children, u = g.userData || {};
    const torso = ch[0], head = ch[1], cap = ch[2];
    if (cap) cap.visible = false;
    const shirtMeshes = [torso].filter(Boolean);
    const pantsMeshes = [u.legL, u.legR].filter(Boolean);
    for (const m of shirtMeshes) if (m.material) m.material = m.material.clone();
    for (const m of pantsMeshes) if (m.material) m.material = m.material.clone();
    const acc = new THREE.Group(); acc.name = 'ecoAcc'; g.add(acc);
    parts = { torso, head, cap, shirtMeshes, pantsMeshes, acc, armL: u.armL, armR: u.armR };
  }

  function applyLook() {
    if (!parts) return;
    const shirt = SHIRTS.find(s => s.id === look.shirt) || SHIRTS[0];
    const pants = PANTS.find(s => s.id === look.pants) || PANTS[0];
    const hairC = (HAIR_COLORS.find(s => s.id === look.hairColor) || HAIR_COLORS[0]).color;
    for (const m of parts.shirtMeshes) m.material.color.setHex(shirt.color);
    for (const m of parts.pantsMeshes) m.material.color.setHex(pants.color);
    const mus = 1 + look.muscle / 100 * 0.16;
    if (parts.torso) parts.torso.scale.set(mus, 1 + look.muscle / 100 * 0.06, 1 + look.muscle / 100 * 0.12);
    if (parts.armL) parts.armL.scale.set(mus, 1, mus);
    if (parts.armR) parts.armR.scale.set(mus, 1, mus);
    const acc = parts.acc; while (acc.children.length) acc.remove(acc.children[0]);
    const hy = 1.98;
    if (look.hair !== 'none') {
      if (look.hair === 'crop') {
        acc.add(box(0.38, 0.08, 0.38, hairC, 0, hy + 0.02, 0));
        acc.add(box(0.36, 0.14, 0.08, hairC, 0, hy - 0.12, 0.16));
      } else if (look.hair === 'wave') {
        acc.add(box(0.4, 0.14, 0.4, hairC, 0, hy + 0.06, 0.02));
        acc.add(box(0.38, 0.16, 0.1, hairC, 0, hy - 0.1, 0.17));
      } else if (look.hair === 'slick') {
        acc.add(box(0.36, 0.1, 0.42, hairC, 0, hy + 0.04, -0.04));
        acc.add(box(0.34, 0.18, 0.08, hairC, 0, hy - 0.12, 0.17));
      } else if (look.hair === 'sweep') {
        acc.add(box(0.4, 0.12, 0.4, hairC, 0, hy + 0.04, 0));
        acc.add(box(0.36, 0.36, 0.1, hairC, 0, hy - 0.2, 0.19));
        acc.add(box(0.34, 0.3, 0.08, hairC, 0, hy - 0.26, -0.16));
      } else if (look.hair === 'spike') {
        acc.add(box(0.16, 0.28, 0.16, hairC, 0, hy + 0.16, 0));
        acc.add(box(0.34, 0.1, 0.34, hairC, 0, hy + 0.02, 0));
        acc.add(box(0.34, 0.14, 0.08, hairC, 0, hy - 0.12, 0.16));
      }
    }
    if (look.hat === 'cap') {
      acc.add(cyl(0.24, 0.24, 0.12, 0x1d3557, 0, hy + 0.1, 0, 10));
      acc.add(box(0.22, 0.04, 0.18, 0x1d3557, 0, hy + 0.06, 0.22));
    } else if (look.hat === 'brim') {
      acc.add(cyl(0.26, 0.22, 0.14, 0x3d5a40, 0, hy + 0.1, 0, 10));
      acc.add(cyl(0.36, 0.36, 0.04, 0x3d5a40, 0, hy + 0.04, 0, 10));
    } else if (look.hat === 'beanie') {
      acc.add(cyl(0.23, 0.25, 0.18, 0x2b2d42, 0, hy + 0.1, 0, 10));
    } else if (look.hat === 'band') {
      acc.add(box(0.4, 0.06, 0.08, 0xe05a4f, 0, hy - 0.06, 0.14));
    }
    if (look.glasses !== 'none') {
      const gcol = look.glasses === 'dark' ? 0x111111 : 0x222233;
      const lens = look.glasses === 'dark' ? 0x1a1a14 : 0x223344;
      const zw = 0.2, gy = hy - 0.16;
      if (look.glasses === 'round') {
        const l1 = cyl(0.07, 0.07, 0.03, lens, -0.09, gy, zw, 8); l1.rotation.x = Math.PI / 2; acc.add(l1);
        const l2 = cyl(0.07, 0.07, 0.03, lens, 0.09, gy, zw, 8); l2.rotation.x = Math.PI / 2; acc.add(l2);
      } else {
        acc.add(box(0.14, 0.06, 0.03, lens, -0.1, gy, zw));
        acc.add(box(0.14, 0.06, 0.03, lens, 0.1, gy, zw));
      }
      acc.add(box(0.06, 0.02, 0.02, gcol, 0, gy + 0.01, zw));
    }
  }

  function makeSign(text, bg, w = 6.4, h = 1.5) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 128; const x = c.getContext('2d');
    x.fillStyle = bg; x.fillRect(0, 0, 512, 128);
    x.fillStyle = '#fff'; x.font = 'bold 48px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    let font = 48; x.font = 'bold ' + font + 'px sans-serif';
    while (font > 28 && x.measureText(text).width > 480) { font -= 2; x.font = 'bold ' + font + 'px sans-serif'; }
    x.fillText(text, 256, 68);
    const t = new THREE.CanvasTexture(c); if (THREE.SRGBColorSpace) t.colorSpace = THREE.SRGBColorSpace;
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t }));
  }

  function cityH(name, cities, x, z) {
    const c = (cities || []).find(t => t.name === name);
    const w = (typeof window !== 'undefined' && window.__game && window.__game.world) || null;
    if (w && w.heightAt) return w.heightAt(x, z);
    return c ? c.h : 0;
  }

  function buildStore(scene, s, addCol, cities) {
    const gy = cityH(s.city, cities, s.x, s.z);
    s.gy = gy;
    const g = new THREE.Group(); g.position.set(s.x, gy, s.z); g.rotation.y = -Math.PI / 2; g.name = s.id;
    const bx = 0, bz = -4.2;
    if (s.kind === 'gym') {
      g.add(box(8.2, 5.4, 6.2, 0x3a3a40, bx, 2.7, bz));
      g.add(box(8.4, 0.3, 6.4, 0xff7a1a, bx, 5.5, bz));
      const bar = cyl(0.18, 0.18, 2.4, 0x222, bx - 1.8, 1.2, bz + 2.6, 6); bar.rotation.z = Math.PI / 2; g.add(bar);
      g.add(cyl(0.45, 0.45, 0.3, 0x222, bx - 2.8, 1.2, bz + 2.6, 8));
      g.add(cyl(0.45, 0.45, 0.3, 0x222, bx - 0.8, 1.2, bz + 2.6, 8));
    } else if (s.kind === 'barber') {
      g.add(box(6.2, 4.4, 5.0, 0xf4f1ea, bx, 2.2, bz));
      g.add(cyl(0.12, 0.12, 2.4, 0xffffff, bx + 2.6, 2.0, bz + 2.6, 10));
      g.add(box(0.26, 0.5, 0.26, 0xff3b3b, bx + 2.6, 2.6, bz + 2.6));
      g.add(box(0.26, 0.5, 0.26, 0x3b7bff, bx + 2.6, 1.6, bz + 2.6));
    } else if (s.kind === 'food') {
      g.add(box(6.4, 4.0, 5.0, 0xf7f1e1, bx, 2.0, bz));
      g.add(box(6.8, 0.25, 2.0, s.color, bx, 3.2, bz + 2.2));
      g.add(box(1.2, 1.4, 0.8, 0xeee, bx - 1.6, 0.9, bz + 2.6));
    } else if (s.kind === 'garage') {
      g.add(box(10, 5.2, 8, 0x5a6270, bx, 2.6, bz - 0.4));
      g.add(box(10.2, 0.35, 8.2, 0xc9a227, bx, 5.3, bz - 0.4));
      g.add(box(3.6, 3.2, 0.12, 0x1a1a1a, bx, 1.7, bz + 3.6));
    } else if (s.kind === 'house') {
      g.add(box(7.2, 4.0, 6.0, s.color, bx, 2.0, bz));
      const roof = box(7.8, 1.6, 6.6, 0x6b3a2a, bx, 4.6, bz); roof.scale.set(1, 1, 1); g.add(roof);
      g.add(box(1.6, 0.2, 1.8, 0x8a6a4a, bx, 0.15, bz + 3.4));
    } else {
      g.add(box(6.6, 4.4, 5.2, s.color, bx, 2.2, bz));
      g.add(box(6.8, 0.2, 1.8, 0xffcf3c, bx, 3.4, bz + 2.3));
    }
    g.add(box(1.5, 2.2, 0.12, 0x2a1a12, bx, 1.1, bz + 2.55));
    const sign = makeSign(s.name.toUpperCase(), s.sign, s.kind === 'garage' ? 9 : 6.6, 1.3);
    sign.position.set(bx, s.kind === 'gym' || s.kind === 'garage' ? 5.95 : (s.kind === 'house' ? 5.6 : 4.85), bz + 2.7); g.add(sign);
    const back = sign.clone(); back.rotation.y = Math.PI; back.position.z = bz - 2.7; g.add(back);
    scene.add(g);
    // Building sits east of the west-facing trigger (face = -PI/2). Collider covers the stall, not the doorway trigger.
    const cx = s.x + 4.2, cz = s.z;
    const bw = s.kind === 'garage' ? 10.2 : 8.4, bd = s.kind === 'garage' ? 8.2 : 6.4;
    if (addCol) addCol(cx, cz, bw, bd, 7);
    const mk = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3.6, 6), new THREE.MeshLambertMaterial({ color: 0xeeeeee }));
    pole.position.y = 1.8; mk.add(pole);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.62, 12, 10), new THREE.MeshLambertMaterial({ color: s.color, emissive: s.color, emissiveIntensity: 0.45 }));
    ball.position.y = 3.8; mk.add(ball);
    mk.position.set(s.x, gy, s.z); scene.add(mk);
    s.mesh = g; s.marker = mk;
  }

  function paintHouses() {
    for (const s of STORES) {
      if (s.kind !== 'house' || !s.marker) continue;
      const ball = s.marker.children[1];
      if (ball && ball.material) ball.material.color.setHex(owned[s.id] ? 0x3ddc84 : 0xffcf3c);
    }
  }

  // ----- stored car -----
  function applyStored(data) {
    if (storedMesh) {
      if (storedMesh.parent) storedMesh.parent.remove(storedMesh);
      storedMesh = null;
    }
    stored = data && data.name ? { color: data.color, name: data.name, heading: data.heading || 0, health: data.health || 100, garageId: data.garageId || null } : null;
  }
  function hideVehicle(v) {
    if (!v) return;
    if (v.mesh) {
      v.mesh.visible = false;
      if (v.mesh.parent) v.mesh.parent.remove(v.mesh);
    }
    const list = window.__game && window.__game.vehicles;
    if (list) {
      const i = list.indexOf(v);
      if (i >= 0) list.splice(i, 1);
    }
  }
  function makeCar(x, z, heading, o) {
    const g = new THREE.Group(), color = o.color ?? 0xd1342b, body = new THREE.MeshLambertMaterial({ color });
    const b = new THREE.Mesh(new THREE.BoxGeometry(2, 0.7, 4.2), body); b.position.y = 0.65; g.add(b);
    const c = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.55, 2.1), new THREE.MeshLambertMaterial({ color: 0x223344 })); c.position.set(0, 1.25, -0.2); g.add(c);
    const wm = new THREE.MeshLambertMaterial({ color: 0x111111 });
    for (const [wx, wz] of [[-1, 1.3], [1, 1.3], [-1, -1.3], [1, -1.3]]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.3, 12), wm); w.rotation.z = Math.PI / 2; w.position.set(wx, 0.38, wz); g.add(w);
    }
    const gy = (window.__game && window.__game.world && window.__game.world.heightAt) ? window.__game.world.heightAt(x, z) : 0;
    g.position.set(x, gy, z); g.rotation.y = heading;
    (_scene || (window.__game && window.__game.scene)).add(g);
    const v = { x, z, heading, speed: 0, color, name: o.name || 'Mesa', mesh: g, health: o.health || 100 };
    const list = window.__game && window.__game.vehicles;
    if (list) list.push(v);
    return v;
  }
  function respray(v, color) {
    if (!v) return;
    v.color = color;
    const body = v.mesh && v.mesh.children && v.mesh.children[0];
    if (body && body.material && body.material.color) body.material.color.setHex(color);
  }

  // ----- UI -----
  const css = `
#ecoUI{position:fixed;inset:0;z-index:9998;background:rgba(8,10,25,.9);color:#fff;font-family:system-ui,-apple-system,sans-serif;display:flex;flex-direction:column;
  padding:max(10px,env(safe-area-inset-top)) max(10px,env(safe-area-inset-right)) 10px max(10px,env(safe-area-inset-left));pointer-events:auto}
#ecoUI .hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;gap:8px;flex:none}
#ecoUI .tt{font-size:18px;font-weight:800}#ecoUI .tt b{color:#ffcf3c}
#ecoUI .cash{color:#3ddc84;font-weight:800;font-size:16px;margin-right:8px}
#ecoUI .x{font-size:20px;width:44px;height:44px;border-radius:22px;border:1px solid rgba(255,255,255,.4);background:rgba(255,255,255,.1);color:#fff}
#ecoUI .tabs{display:flex;gap:6px;margin-bottom:6px;flex-wrap:wrap;flex:none}
#ecoUI .tab{height:36px;padding:0 12px;border-radius:18px;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.08);color:#fff;font-weight:700;font-size:13px}
#ecoUI .tab.on{background:#ffcf3c;color:#1a1400;border-color:#ffcf3c}
#ecoUI .body{flex:1;touch-action:pan-y;overscroll-behavior:contain;overflow-y:auto;-webkit-overflow-scrolling:touch}
#ecoUI .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px;align-content:start}
#ecoUI .it{background:rgba(255,255,255,.08);border-radius:12px;padding:10px;display:flex;flex-direction:column;gap:3px;min-height:80px;border:2px solid transparent}
#ecoUI .it.on{border-color:#ffcf3c}
#ecoUI .sw{width:28px;height:28px;border-radius:6px;border:1px solid #fff6}
#ecoUI .nm{font-weight:700;font-size:14px}#ecoUI .ds{font-size:12px;opacity:.75;flex:1}
#ecoUI .buy{margin-top:4px;height:38px;border-radius:10px;border:0;font-weight:800;font-size:14px;background:#3ddc84;color:#04210f}
#ecoUI .buy.no{background:#555;color:#ccc}#ecoUI .buy.have{background:#3cc8ff;color:#021a24}
#ecoUI .toast{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);background:#000c;padding:8px 14px;border-radius:10px;font-size:14px;opacity:0;transition:opacity .2s;pointer-events:none}
#ecoUI .toast.on{opacity:1}
#ecoUI .gym{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;min-height:100%;padding:2px 0}
#ecoUI .stat{display:flex;gap:14px;font-size:14px}#ecoUI .stat b{color:#ffcf3c}
#ecoUI .bar{width:min(420px,80vw);height:12px;background:#0008;border-radius:8px;overflow:hidden;border:1px solid #fff3}
#ecoUI .bar>i{display:block;height:100%;width:0;background:linear-gradient(90deg,#3ddc84,#ffcf3c)}
#ecoUI .hold{width:min(260px,70vw);height:60px;border-radius:14px;border:0;font-weight:800;font-size:18px;background:#ff7a1a;color:#fff;flex:none;touch-action:none}
#ecoUI .hold:active,#ecoUI .hold.down{background:#ffcf3c;color:#1a1400}
#ecoUI .hint{font-size:12px;opacity:.75;text-align:center;max-width:70vw}
#ecoUI .card{background:rgba(255,255,255,.08);border-radius:16px;padding:16px 18px;width:min(460px,100%);margin:auto}
#ecoUI .row{display:flex;justify-content:space-between;margin-top:8px;font-size:15px}#ecoUI .row b{color:#3ddc84}
#ecoUI .btns{display:flex;gap:8px;margin-top:14px;flex-wrap:wrap}
#ecoUI .btns button{flex:1;min-width:110px;height:44px;border-radius:10px;border:0;font-weight:800;font-size:15px}
#ecoUI .go{background:#3ddc84;color:#04210f}#ecoUI .alt{background:#3cc8ff;color:#021a24}#ecoUI .no{background:#555;color:#ccc}
@media (max-height:420px){#ecoUI{padding:6px 10px}#ecoUI .tt{font-size:16px}#ecoUI .hold{height:52px;font-size:16px}#ecoUI .gym{gap:4px}#ecoUI .card{padding:10px 14px}}
#ecoPrompt{position:fixed;left:50%;bottom:132px;transform:translateX(-50%);z-index:12;pointer-events:none;display:none;
  background:rgba(8,10,25,.88);color:#fff;border:2px solid #ffcf3c;border-radius:16px;padding:10px 18px;font-weight:800;font-size:15px;
  text-align:center;max-width:80vw;text-shadow:1px 1px 0 #000;font-family:system-ui,-apple-system,sans-serif}
#ecoPrompt.on{display:block;pointer-events:auto;touch-action:manipulation}
`;

  const tap = (el, fn) => {
    let sx = 0, sy = 0, moved = false;
    el.addEventListener('touchstart', e => { const t = e.touches[0]; sx = t.clientX; sy = t.clientY; moved = false; }, { passive: true });
    el.addEventListener('touchmove', e => { const t = e.touches[0]; if (Math.hypot(t.clientX - sx, t.clientY - sy) > 10) moved = true; }, { passive: true });
    el.addEventListener('touchend', e => { e.preventDefault(); e.stopPropagation(); if (!moved) fn(e); });
    el.addEventListener('click', e => { e.stopPropagation(); fn(e); });
  };

  function openMenu({ store, player, showMsg, onClose, onSave }) {
    if (document.getElementById('ecoUI')) return null;
    if (!document.getElementById('ecoCSS')) { const st = document.createElement('style'); st.id = 'ecoCSS'; st.textContent = css; document.head.appendChild(st); }
    const o = document.createElement('div'); o.id = 'ecoUI';
    const kindTabs = store.kind === 'clothes' ? [['shirt', 'Shirts'], ['pants', 'Pants'], ['hat', 'Hats'], ['glasses', 'Shades']]
      : store.kind === 'barber' ? [['hair', 'Cuts'], ['hairColor', 'Color']]
      : store.kind === 'gym' ? [['gym', 'Workout']]
      : store.kind === 'food' ? [['food', 'Snacks']]
      : store.kind === 'garage' ? [['garage', 'Garage']]
      : [['house', 'Home']];
    let tab = kindTabs[0][0], toastT = 0, holding = false, raf = 0, iv = 0, last = performance.now();
    o.innerHTML = `<div class="hd"><div class="tt">${store.icon} <b>${store.name.toUpperCase()}</b></div><div><span class="cash"></span><button class="x" type="button">✕</button></div></div>
      <div class="tabs"></div><div class="body"></div><div class="toast"></div>`;
    const body = o.querySelector('.body'), cash = o.querySelector('.cash'), toast = o.querySelector('.toast'), tabs = o.querySelector('.tabs');
    const say = t => { toast.textContent = t; toast.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => toast.classList.remove('on'), 1400); };
    let closed = false;
    const onKey = e => { if (e.key === 'Escape') { e.preventDefault(); close(); } };
    const close = () => {
      if (closed) return; closed = true;
      holding = false; if (raf) cancelAnimationFrame(raf); clearInterval(iv);
      removeEventListener('keydown', onKey);
      o.remove(); onClose();
    };
    tap(o.querySelector('.x'), close);
    addEventListener('keydown', onKey);
    body.addEventListener('touchmove', e => e.stopPropagation(), { passive: true });
    o.addEventListener('touchmove', e => { if (e.target.closest && e.target.closest('.body')) return; e.preventDefault(); }, { passive: false });

    const lists = { shirt: SHIRTS, pants: PANTS, hat: HATS, glasses: GLASSES, hair: HAIRCUTS, hairColor: HAIR_COLORS };

    function buyLook(item, key) {
      const wearing = look[key] === item.id;
      if (wearing && item.price === 0) return say('Already using this');
      if (wearing) return say('Already wearing this');
      if (item.price > 0 && player.money < item.price) return say(`Need $${item.price - player.money} more`);
      if (item.price > 0) player.money -= item.price;
      look[key] = item.id; applyLook();
      say(item.price ? `Got ${item.name}  -$${item.price}` : `Took off`);
      showMsg(item.price ? `${item.name}  -$${item.price}` : item.name, 1.4);
      render();
    }

    function tickGym(dt) {
      const bar = body.querySelector('#stBar');
      const holdBtn = body.querySelector('#stHold');
      const isHeld = holding || !!(holdBtn && holdBtn.classList.contains('down'));
      if (!isHeld) gymHold = Math.max(0, gymHold - dt * 1.6);
      else {
        gymHold += dt * 0.9;
        if (gymHold >= 1) {
          gymHold = 0; gymReps++;
          if (gymMode === 'cardio') look.stamina = clamp(look.stamina + 4, 0, 100);
          else { look.muscle = clamp(look.muscle + 4, 0, 100); applyLook(); }
          const st = body.querySelector('#stSt'), mu = body.querySelector('#stMu');
          if (st) st.textContent = Math.round(look.stamina);
          if (mu) mu.textContent = Math.round(look.muscle);
          const bolds = body.querySelectorAll('.stat b');
          if (bolds[2]) bolds[2].textContent = sprintMultiplier().toFixed(2) + '×';
          say(gymMode === 'cardio' ? 'Stamina up!' : 'Muscle up!');
        }
      }
      if (bar) bar.style.width = (clamp(gymHold, 0, 1) * 100) + '%';
    }

    function renderGym() {
      body.innerHTML = `<div class="gym">
        <div class="tabs" style="margin:0"><button class="tab${gymMode === 'cardio' ? ' on' : ''}" data-m="cardio" type="button">Cardio · Stamina</button><button class="tab${gymMode === 'weights' ? ' on' : ''}" data-m="weights" type="button">Weights · Muscle</button></div>
        <div class="stat">Stamina <b id="stSt">${Math.round(look.stamina)}</b> · Muscle <b id="stMu">${Math.round(look.muscle)}</b> · Sprint <b>${sprintMultiplier().toFixed(2)}×</b></div>
        <div class="hint">${gymMode === 'cardio' ? 'Hold the pad to run in place. Each rep raises Stamina (faster sprint once hooked up).' : 'Hold the pad through a lift. Each rep adds a little Muscle and fills out your torso and arms.'}</div>
        <div class="bar"><i id="stBar"></i></div>
        <button class="hold" id="stHold" type="button">${gymMode === 'cardio' ? 'HOLD TO SPRINT' : 'HOLD TO LIFT'}</button>
        <div class="hint">Free to use · ${gymReps} reps this visit</div>
      </div>`;
      body.querySelectorAll('[data-m]').forEach(b => tap(b, () => { gymMode = b.dataset.m; gymHold = 0; render(); }));
      const btn = body.querySelector('#stHold');
      const down = e => { try { e.preventDefault(); e.stopPropagation(); } catch (_) {} holding = true; btn.classList.add('down'); };
      const up = e => { try { e && e.preventDefault(); } catch (_) {} holding = false; btn.classList.remove('down'); };
      for (const ev of ['mousedown', 'pointerdown']) btn.addEventListener(ev, down);
      for (const ev of ['mouseup', 'pointerup', 'pointercancel', 'mouseleave']) btn.addEventListener(ev, up);
      btn.addEventListener('touchstart', down, { passive: false }); btn.addEventListener('touchend', up, { passive: false }); btn.addEventListener('touchcancel', up, { passive: false });
    }

    function renderFood() {
      const grid = document.createElement('div'); grid.className = 'grid';
      for (const it of SNACKS) {
        const full = player.health >= 100, afford = player.money >= it.price;
        const d = document.createElement('div'); d.className = 'it';
        d.innerHTML = `<div class="nm">${it.icon} ${it.name}</div><div class="ds">${it.desc}</div>
          <button class="buy${full || !afford ? ' no' : ''}" type="button">$${it.price}</button>`;
        tap(d.querySelector('.buy'), () => {
          if (player.health >= 100) return say('Already at full health');
          if (player.money < it.price) return say(`Need $${it.price - player.money} more`);
          player.money -= it.price;
          player.health = Math.min(100, player.health + it.heal);
          say(`Ate ${it.name}`); showMsg(`${it.name}  +${it.heal} HP`, 1.5); render();
        });
        grid.appendChild(d);
      }
      body.innerHTML = ''; body.appendChild(grid);
    }

    function repairCost(v) { if (!v || v.health >= 100) return 0; return Math.max(25, Math.round((100 - v.health) * 2)); }

    function renderGarage() {
      const v = player.car;
      const cost = repairCost(v);
      const card = document.createElement('div'); card.className = 'card';
      const hp = v ? Math.round(v.health) : 0;
      card.innerHTML = `<div class="nm">${v ? v.name : 'No car in the bay'}</div>
        <div class="ds">${v ? `Health ${hp}%` : 'Drive a car in to repair, respray or store it.'}</div>
        ${v ? `<div class="row"><span>Repair</span><b>${cost ? '$' + cost : 'Already fixed'}</b></div>` : ''}
        <div class="row"><span>Stored</span><b>${stored ? stored.name : 'Empty bay'}</b></div>
        <div class="btns">
          <button class="${v && cost && player.money >= cost ? 'go' : 'no'}" data-a="repair" type="button">Repair</button>
          <button class="${v ? 'alt' : 'no'}" data-a="spray" type="button">Respray $80</button>
          <button class="${v && !stored ? 'go' : 'no'}" data-a="store" type="button">Store car</button>
          <button class="${stored && !v ? 'alt' : 'no'}" data-a="take" type="button">Take car</button>
        </div>
        <div class="grid" id="sprays" style="margin-top:10px;display:none"></div>`;
      body.innerHTML = ''; body.appendChild(card);
      card.querySelectorAll('[data-a]').forEach(b => tap(b, () => {
        const a = b.dataset.a;
        if (a === 'repair') {
          if (!player.car) return say('Drive a car in first');
          const c = repairCost(player.car); if (!c) return say('Already fixed');
          if (player.money < c) return say(`Need $${c - player.money} more`);
          player.money -= c; player.car.health = 100; say('Car repaired'); showMsg('Car repaired', 1.4); render();
        } else if (a === 'spray') {
          if (!player.car) return say('Drive a car in first');
          const box = card.querySelector('#sprays');
          box.style.display = box.style.display === 'none' ? 'grid' : 'none';
          if (box.style.display === 'grid' && !box.childElementCount) {
            for (const sp of SPRAYS) {
              const d = document.createElement('div'); d.className = 'it';
              d.innerHTML = `<div class="sw" style="background:#${sp.color.toString(16).padStart(6, '0')}"></div><div class="nm">${sp.name}</div>
                <button class="buy" type="button">$80</button>`;
              tap(d.querySelector('.buy'), () => {
                if (!player.car) return say('No car');
                if (player.money < 80) return say(`Need $${80 - player.money} more`);
                player.money -= 80; respray(player.car, sp.color);
                say(`Resprayed ${sp.name}`); showMsg(`${sp.name} respray`, 1.4); render();
              });
              box.appendChild(d);
            }
          }
        } else if (a === 'store') {
          if (!player.car) return say('Drive a car in first');
          if (stored) return say('Bay is full — take the stored car first');
          const car = player.car, gapi = window.__game;
          if (gapi && gapi.toggleCar) gapi.toggleCar();
          stored = { color: car.color, name: car.name, heading: car.heading, health: car.health, garageId: store.id };
          hideVehicle(car);
          say(`Stored ${stored.name}`); showMsg(`Stored ${stored.name}`, 1.6); render();
        } else if (a === 'take') {
          if (!stored) return say('Nothing stored');
          if (player.car) return say('Exit your current car first');
          const v2 = makeCar(store.x - 6, store.z, stored.heading, stored);
          const gapi = window.__game;
          if (gapi) { player.car = v2; player.mode = 'car'; if (player.mesh) player.mesh.visible = false; }
          say(`Took the ${stored.name}`); showMsg(`Took the ${stored.name}`, 1.6);
          stored = null; render();
        }
      }));
    }

    function renderHouse() {
      const isOwned = !!owned[store.id], price = store.price || 0;
      const card = document.createElement('div'); card.className = 'card';
      card.innerHTML = `<div class="nm">${store.name}</div><div class="ds">${store.city} safe house</div>
        ${isOwned
          ? `<div class="row"><span>Status</span><b>Yours</b></div><div class="ds">Rest here to heal and save your game.</div>`
          : `<div class="row"><span>Price</span><b>$${price.toLocaleString()}</b></div><div class="row"><span>Your cash</span><span>$${player.money.toLocaleString()}</span></div>`}
        <div class="btns">${isOwned
          ? `<button class="go" data-a="rest" type="button">Rest & save</button>`
          : `<button class="${player.money >= price ? 'go' : 'no'}" data-a="buy" type="button">Buy for $${price.toLocaleString()}</button>`}</div>`;
      body.innerHTML = ''; body.appendChild(card);
      card.querySelectorAll('[data-a]').forEach(b => tap(b, () => {
        const a = b.dataset.a;
        if (a === 'buy') {
          if (owned[store.id]) return say('Already yours');
          if (player.money < price) return say(`Need $${price - player.money} more`);
          player.money -= price; owned[store.id] = true; paintHouses();
          say(`You own ${store.name}`); showMsg(`Bought ${store.name}`, 2); render();
        } else if (a === 'rest') {
          if (!owned[store.id]) return say('Buy it first');
          player.health = 100;
          if (typeof onSave === 'function') onSave();
          else if (window.__game && window.__game.saveGame) window.__game.saveGame();
          say('Rested — health full, game saved'); showMsg('Rested. Game saved.', 2);
        }
      }));
    }

    function render() {
      cash.textContent = '$' + (player.money | 0);
      tabs.innerHTML = '';
      for (const [id, label] of kindTabs) {
        const b = document.createElement('button'); b.className = 'tab' + (tab === id ? ' on' : ''); b.textContent = label; b.type = 'button';
        tap(b, () => { tab = id; render(); }); tabs.appendChild(b);
      }
      if (tab === 'gym') return renderGym();
      if (tab === 'food') return renderFood();
      if (tab === 'garage') return renderGarage();
      if (tab === 'house') return renderHouse();
      const list = lists[tab] || [];
      const grid = document.createElement('div'); grid.className = 'grid';
      for (const it of list) {
        const on = look[tab] === it.id;
        const afford = it.price <= 0 || player.money >= it.price;
        const d = document.createElement('div'); d.className = 'it' + (on ? ' on' : '');
        const sw = it.color != null ? `<div class="sw" style="background:#${it.color.toString(16).padStart(6, '0')}"></div>` : '';
        d.innerHTML = `${sw}<div class="nm">${it.name}</div><div class="ds">${on ? 'Wearing' : (it.price ? '$' + it.price : 'Free')}</div>
          <button class="buy${on ? ' have' : afford ? '' : ' no'}" type="button">${on ? (it.price ? 'Wearing' : 'Using') : (it.price ? '$' + it.price : 'Take off')}</button>`;
        tap(d.querySelector('.buy'), () => buyLook(it, tab));
        grid.appendChild(d);
      }
      body.innerHTML = ''; body.appendChild(grid);
    }

    const loop = now => { raf = requestAnimationFrame(loop); const dt = Math.min(0.05, (now - last) / 1000); last = now; if (tab === 'gym') tickGym(dt); };
    raf = requestAnimationFrame(loop);
    iv = setInterval(() => { const now = performance.now(); const dt = Math.min(0.05, (now - last) / 1000); last = now; if (tab === 'gym') tickGym(dt); }, 50);
    document.body.appendChild(o); render();
    return { close };
  }

  function init({ scene, player, state, addCol, showMsg, cities, isBusy }) {
    if (!scene || !player) throw new Error('initEconomy needs { scene, player }');
    _scene = scene;
    prepPlayer(player);
    applyLook();
    for (const s of STORES) buildStore(scene, s, addCol, cities);
    paintHouses();

    let ui = null, inside = null;
    if (!document.getElementById('ecoCSS')) { const st = document.createElement('style'); st.id = 'ecoCSS'; st.textContent = css; document.head.appendChild(st); }
    let prompt = document.getElementById('ecoPrompt');
    if (!prompt) { prompt = document.createElement('div'); prompt.id = 'ecoPrompt'; document.body.appendChild(prompt); }

    const busy = () => !!(isBusy && isBusy()) || !!ui || !!document.getElementById('ecoUI') || (state && state.paused);
    const radius = s => s.kind === 'garage' ? 8 : 4.5;
    const canUse = s => s.kind === 'garage' || player.mode !== 'car';

    function openStore(s) {
      if (!s || ui || document.getElementById('ecoUI')) return;
      if (state) state.uiOpen = true;
      hidePrompt();
      ui = openMenu({
        store: s, player, showMsg,
        onSave: () => { if (window.__game && window.__game.saveGame) window.__game.saveGame(); },
        onClose: () => { ui = null; if (state) state.uiOpen = false; },
      });
    }
    function hidePrompt() { prompt.classList.remove('on'); prompt.textContent = ''; }
    function showPrompt(s) {
      prompt.textContent = `Tap to enter ${s.name}`;
      prompt.classList.add('on');
      prompt.onclick = () => openStore(s);
    }

    function update() {
      if (state && !state.started) { hidePrompt(); return; }
      if (ui || !player) return;
      const px = player.x, pz = player.z;
      const hit = STORES.find(s => Math.hypot(s.x - px, s.z - pz) < radius(s) && canUse(s)) || null;
      if (!hit) { inside = null; hidePrompt(); return; }
      const fresh = hit !== inside;
      inside = hit;
      if (busy()) { hidePrompt(); return; }
      if (fresh) openStore(hit);
      else showPrompt(hit);
    }

    addEventListener('keydown', e => {
      if ((e.key === 'e' || e.key === 'E') && inside && !ui && !busy()) { e.preventDefault(); openStore(inside); }
    });

    const stores = STORES.map(s => ({ x: s.x, z: s.z, name: s.name, kind: s.kind, icon: s.icon, city: s.city, id: s.id }));
    const api = {
      update,
      getState, setState, reset,
      getEconomyState: getState, setEconomyState: setState,
      sprintMultiplier,
      stores,
      open: id => { const s = STORES.find(t => t.id === id || t.name === id); if (s) openStore(s); },
      close: () => { if (ui && ui.close) ui.close(); },
    };
    if (typeof window !== 'undefined') window.__economy = api;
    return api;
  }

  return { init };
}
