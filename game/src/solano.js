// solano.js — Port Solano's ground plan and skyline (round 5 design).
// The street grid is painted into one big canvas texture (asphalt,
// dashes, kerbs, sand) laid over the world plane, while the towers get
// canvas-drawn facades: a lit-window grid baked per paint colour. That
// keeps the whole city to a few hundred meshes and one texture each
// for ground and glass.

export const GRID = 52;              // distance between road centrelines
export const AVENUES = [-208, -156, -104, -52, 0, 52, 104, 156, 208];
export const STREETS = [-208, -156, -104, -52, 0, 52, 104, 156];
export const BEACH_Z = 184;          // sand starts here
export const SEA_Z = 218;            // water starts here
export const EDGE = 252;             // playable half-extent

const PAINTS = [0xe8b04b, 0xef8354, 0x7fc8bc, 0xf4f1de, 0xe07a5f, 0x81b29a, 0xf2cc8f, 0x9db4db];

function groundTexture() {
  const S = 2048;
  const cv = document.createElement('canvas');
  cv.width = S; cv.height = S;
  const g = cv.getContext('2d');
  const px = (v) => ((v + EDGE + 8) / (2 * (EDGE + 8))) * S;
  const pw = (v) => (v / (2 * (EDGE + 8))) * S;

  g.fillStyle = '#6f7f57';                       // dry coastal grass
  g.fillRect(0, 0, S, S);
  g.fillStyle = '#e9d8a6';                       // the beach
  g.fillRect(0, px(BEACH_Z), S, px(SEA_Z) - px(BEACH_Z));

  // avenues (vertical) and streets (horizontal), pavement then asphalt
  for (const x of AVENUES) {
    g.fillStyle = '#b8b2a7';
    g.fillRect(px(x) - pw(21) / 2, 0, pw(21), px(BEACH_Z));
    g.fillStyle = '#31363d';
    g.fillRect(px(x) - pw(15) / 2, 0, pw(15), px(BEACH_Z));
  }
  for (const z of STREETS) {
    g.fillStyle = '#b8b2a7';
    g.fillRect(0, px(z) - pw(21) / 2, S, pw(21));
    g.fillStyle = '#31363d';
    g.fillRect(0, px(z) - pw(15) / 2, S, pw(15));
  }
  // centre dashes
  g.fillStyle = '#f4d35e';
  for (const x of AVENUES) for (let z = -EDGE; z < BEACH_Z; z += 11) g.fillRect(px(x) - 1.5, px(z), 3, pw(5.5));
  for (const z of STREETS) for (let x = -EDGE; x < EDGE; x += 11) g.fillRect(px(x), px(z) - 1.5, pw(5.5), 3);

  const tex = new (window.__THREE.CanvasTexture)(cv);
  tex.anisotropy = 4;
  tex.colorSpace = window.__THREE.SRGBColorSpace;
  return tex;
}

function facadeTexture(THREE, baseHex) {
  const cv = document.createElement('canvas');
  cv.width = 128; cv.height = 256;
  const g = cv.getContext('2d');
  const base = '#' + baseHex.toString(16).padStart(6, '0');
  g.fillStyle = base; g.fillRect(0, 0, 128, 256);
  g.fillStyle = 'rgba(0,0,0,0.16)'; g.fillRect(0, 0, 128, 10);
  let n = (baseHex ^ 0x5eed) >>> 0;
  const rnd = () => { n = (Math.imul(n ^ (n << 13), 0x2545f491) >>> 0); return (n >>> 8) / 16777216; };
  for (let r = 0; r < 13; r++) {
    for (let c = 0; c < 5; c++) {
      const lit = rnd() < 0.42;
      g.fillStyle = lit ? '#ffe9a8' : 'rgba(28,38,54,0.85)';
      g.fillRect(10 + c * 23, 16 + r * 18, 13, 10);
    }
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildSolano(THREE, scene, rng) {
  window.__THREE = THREE;
  const colliders = [];

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(2 * (EDGE + 8), 2 * (EDGE + 8)),
    new THREE.MeshLambertMaterial({ map: groundTexture() })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, 0);
  scene.add(ground);

  // sea: a separate sheet so boot.js can bob it
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(2 * (EDGE + 8), 190),
    new THREE.MeshLambertMaterial({ color: 0x146b8a })
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(0, 0.12, SEA_Z + 95);
  sea.name = 'solano-sea';
  scene.add(sea);

  // towers, one to three per block, set back from the kerbs
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x5b5348 });
  for (let i = 0; i < AVENUES.length - 1; i++) {
    for (let j = 0; j < STREETS.length; j++) {
      const cx = (AVENUES[i] + AVENUES[i + 1]) / 2;
      const cz = j < STREETS.length - 1 ? (STREETS[j] + STREETS[j + 1]) / 2 : 174;
      if (cz > 168) continue;
      const towers = rng.int(1, 3);
      for (let k = 0; k < towers; k++) {
        const w = rng.range(13, 24);
        const d = rng.range(13, 24);
        const h = rng.range(15, 66);
        const paint = rng.pick(PAINTS);
        const mat = new THREE.MeshLambertMaterial({ map: facadeTexture(THREE, paint) });
        const tower = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        const tx = cx + rng.jitter(7);
        const tz = cz + rng.jitter(7);
        tower.position.set(tx, h / 2, tz);
        scene.add(tower);
        const cap = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, 1.6, d * 0.7), roofMat);
        cap.position.set(tx, h + 0.8, tz);
        scene.add(cap);
        colliders.push({ x: tx, z: tz, hw: w / 2 + 0.5, hd: d / 2 + 0.5 });
      }
    }
  }

  // palms: a fringe along the sand plus scattered kerbside ones
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8a6844 });
  const frondMat = new THREE.MeshLambertMaterial({ color: 0x2e933c });
  const trunkGeo = new THREE.CylinderGeometry(0.16, 0.3, 6.4, 6);
  const frondGeo = new THREE.ConeGeometry(3.1, 1.5, 7);
  const addPalm = (x, z, tilt) => {
    const palm = new THREE.Group();
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 3.2;
    trunk.rotation.z = tilt;
    palm.add(trunk);
    const crown = new THREE.Mesh(frondGeo, frondMat);
    crown.scale.y = 0.5;
    crown.position.set(Math.sin(tilt) * -3.4, 6.6, 0);
    palm.add(crown);
    palm.position.set(x, 0, z);
    scene.add(palm);
  };
  for (let x = -240; x <= 240; x += 21) addPalm(x + rng.jitter(4), BEACH_Z + 6 + rng.jitter(3), rng.jitter(0.09));
  for (let i = 0; i < 26; i++) {
    const a = rng.pick(AVENUES);
    addPalm(a + (rng.chance(0.5) ? 10.6 : -10.6), rng.range(-235, 160), rng.jitter(0.09));
  }

  // street lamps along the avenues
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x3c4148 });
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffd9a0 });
  const poleGeo = new THREE.CylinderGeometry(0.11, 0.11, 5.6, 5);
  const bulbGeo = new THREE.SphereGeometry(0.42, 6, 6);
  for (const x of AVENUES) {
    for (let z = -228; z < 176; z += 47) {
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(x + 8.6, 2.8, z);
      scene.add(pole);
      const bulb = new THREE.Mesh(bulbGeo, bulbMat);
      bulb.position.set(x + 8.6, 5.7, z);
      scene.add(bulb);
    }
  }

  // pier and marina, south-east shore
  const woodMat = new THREE.MeshLambertMaterial({ color: 0x9a6a3a });
  for (let i = 0; i < 9; i++) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.45, 10), woodMat);
    plank.position.set(148, 0.5, 222 + i * 10.5);
    scene.add(plank);
  }
  const hullPaints = [0xffffff, 0xef8354, 0x7fc8bc, 0xf2cc8f, 0xe07a5f];
  for (let i = 0; i < 5; i++) {
    const boat = new THREE.Group();
    const hull = new THREE.Mesh(
      new THREE.BoxGeometry(3.4, 1.25, 8.6),
      new THREE.MeshLambertMaterial({ color: hullPaints[i] })
    );
    hull.position.y = 0.55;
    boat.add(hull);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 7.4, 5), poleMat);
    mast.position.y = 4.4;
    boat.add(mast);
    boat.position.set(122 + i * 15, 0.1, 252 + (i % 2) * 9);
    scene.add(boat);
  }

  // Marisol's pier café: a striped kiosk at the pier root
  const kiosk = new THREE.Group();
  const kBody = new THREE.Mesh(new THREE.BoxGeometry(6, 3.2, 5), new THREE.MeshLambertMaterial({ color: 0xf4f1de }));
  kBody.position.y = 1.6;
  kiosk.add(kBody);
  const kRoof = new THREE.Mesh(new THREE.ConeGeometry(5.4, 2, 4), new THREE.MeshLambertMaterial({ color: 0xe07a5f }));
  kRoof.position.y = 4.2;
  kRoof.rotation.y = Math.PI / 4;
  kiosk.add(kRoof);
  kiosk.position.set(138, 0, 196);
  scene.add(kiosk);
  colliders.push({ x: 138, z: 196, hw: 3.6, hd: 3.1 });

  return {
    sea,
    colliders,
    marisol: { x: 132, z: 196 },
    avenues: AVENUES,
    streets: STREETS,
    beachZ: BEACH_Z,
    seaZ: SEA_Z,
    edge: EDGE,
  };
}

// Push a circle (x,z,r) out of every building AABB it overlaps.
export function resolveCollisions(pos, radius, colliders) {
  for (const c of colliders) {
    const dx = pos.x - c.x;
    const dz = pos.z - c.z;
    const px = c.hw + radius - Math.abs(dx);
    if (px <= 0) continue;
    const pz = c.hd + radius - Math.abs(dz);
    if (pz <= 0) continue;
    if (px < pz) pos.x = c.x + (dx >= 0 ? c.hw + radius : -c.hw - radius);
    else pos.z = c.z + (dz >= 0 ? c.hd + radius : -c.hd - radius);
  }
  pos.x = Math.max(-EDGE, Math.min(EDGE, pos.x));
  pos.z = Math.max(-EDGE, Math.min(340, pos.z));
}
