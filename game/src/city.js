// Port Solano's geometry, raised procedurally when the game loads.
//
// Layout: a carpet of grass, asphalt avenues running north–south the
// whole map, cross-streets running east–west until the beach stops
// them, a jittered tower or three on most blocks with lit windows
// facing south, palms and lamps along the kerbs, and a shoreline —
// sand, a plank pier, moored boats and the sea itself.

import * as THREE from 'three';
import { CITY } from './config.js';

const TOWER_PAINTS = [0xffd9a0, 0xff9e7a, 0x7ae7ff, 0xf7f0d0, 0xffb3c8, 0xc8b8ff, 0xa0e8b0, 0xffe27a];

function matte(color) {
  return new THREE.MeshLambertMaterial({ color });
}

function groundQuad(w, d, material, y = 0) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), material);
  m.rotation.x = -Math.PI / 2;
  m.position.y = y;
  return m;
}

function paintStreets(scene, mats) {
  // Avenues: full-length strips, dashed centre lines, raised kerbs.
  for (const x of CITY.roads) {
    const avenue = groundQuad(14, 470, mats.asphalt);
    avenue.position.set(x, 0, -15);
    scene.add(avenue);

    for (let z = -240; z < 200; z += 16) {
      const dash = groundQuad(0.5, 7, mats.paint, 0.02);
      dash.position.x = x;
      dash.position.z = z;
      scene.add(dash);
    }
    for (const offset of [-8.2, 8.2]) {
      const kerb = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.18, 470), mats.kerb);
      kerb.position.set(x + offset, 0.09, -15);
      scene.add(kerb);
    }
  }
  // Cross-streets: same treatment rotated ninety degrees, but they
  // give up where the sand starts.
  for (const z of CITY.roads) {
    if (z >= 190) continue;
    const street = groundQuad(560, 14, mats.asphalt);
    street.position.set(0, 0, z);
    scene.add(street);
    for (let x = -260; x < 260; x += 16) {
      const dash = groundQuad(7, 0.5, mats.paint, 0.02);
      dash.position.x = x;
      dash.position.z = z;
      scene.add(dash);
    }
  }
}

function raiseTowers(scene, rng, mats) {
  for (let bx = -210; bx <= 210; bx += CITY.block) {
    for (let bz = -210; bz <= 150; bz += CITY.block) {
      const towersHere = rng.int(1, 3);
      for (let i = 0; i < towersHere; i++) {
        const w = rng.range(16, 26);
        const d = rng.range(16, 26);
        const h = rng.range(12, 64);
        const cx = bx + rng.range(-12, 12);
        const cz = bz + rng.range(-12, 12);
        const tower = new THREE.Mesh(
          new THREE.BoxGeometry(w, h, d),
          matte(TOWER_PAINTS[rng.int(0, TOWER_PAINTS.length - 1)]),
        );
        tower.position.set(cx, h / 2, cz);
        scene.add(tower);
        // One column of glowing windows up the sun-facing side.
        for (let wy = 3; wy < h - 2; wy += 4) {
          const win = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), mats.windowGlow);
          win.position.set(cx, wy, cz + d / 2 + 0.06);
          scene.add(win);
        }
      }
    }
  }
}

function plantPalms(scene, rng, mats) {
  const trunkGeo = new THREE.CylinderGeometry(0.25, 0.4, 6, 5);
  const frondsGeo = new THREE.ConeGeometry(3, 1.6, 6);
  for (let i = 0; i < 70; i++) {
    const avenue = CITY.roads[rng.int(0, CITY.roads.length - 1)];
    const x = avenue + (rng.next() < 0.5 ? -10 : 10);
    const z = rng.range(-250, 185);
    const trunk = new THREE.Mesh(trunkGeo, mats.bark);
    trunk.position.set(x, 3, z);
    trunk.rotation.z = 0.08;
    scene.add(trunk);
    const fronds = new THREE.Mesh(frondsGeo, mats.leaves);
    fronds.position.set(x + 0.4, 6.4, z);
    scene.add(fronds);
  }
}

function hangLamps(scene, mats) {
  const poleGeo = new THREE.CylinderGeometry(0.12, 0.12, 5, 5);
  const globeGeo = new THREE.SphereGeometry(0.4, 6, 6);
  for (const x of CITY.roads) {
    for (let z = -240; z < 190; z += 45) {
      const pole = new THREE.Mesh(poleGeo, mats.postMetal);
      pole.position.set(x + 7.5, 2.5, z);
      scene.add(pole);
      const globe = new THREE.Mesh(globeGeo, mats.lampGlow);
      globe.position.set(x + 7.5, 5.1, z);
      scene.add(globe);
    }
  }
}

function buildWaterfront(scene, mats) {
  const sand = groundQuad(620, 60, mats.sand, 0.01);
  sand.position.x = 0;
  sand.position.z = CITY.beachZ + 25;
  scene.add(sand);

  const sea = groundQuad(620, 150, mats.water, 0.02);
  sea.position.x = 0;
  sea.position.z = CITY.seaZ + 70;
  sea.name = 'sea';
  scene.add(sea);

  // The marina pier: eight planks marching out over the water.
  for (let i = 0; i < 8; i++) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(3, 0.5, 10), mats.timber);
    plank.position.set(150, 0.4, CITY.seaZ + 10 + i * 11);
    scene.add(plank);
  }
  // Five little boats at anchor, hull plus mast.
  for (let i = 0; i < 5; i++) {
    const boat = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(3, 1.2, 8), mats.hullPaint);
    hull.position.y = 0.6;
    boat.add(hull);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 7, 5), mats.mastMetal);
    mast.position.y = 4;
    boat.add(mast);
    boat.position.set(130 + i * 11, 0, CITY.seaZ + 18);
    scene.add(boat);
  }
  return sea;
}

export function buildCity(scene, rng) {
  const mats = {
    asphalt: matte(0x2e2e38),
    kerb: matte(0xb8a88f),
    turf: matte(0x3f9e4d),
    sand: matte(0xf2d492),
    water: matte(0x1e90c8),
    paint: new THREE.MeshBasicMaterial({ color: 0xf7e08a }),
    windowGlow: new THREE.MeshBasicMaterial({ color: 0xfff6b0 }),
    bark: matte(0x8a5a2b),
    leaves: matte(0x1fa84f),
    postMetal: matte(0x444455),
    lampGlow: new THREE.MeshBasicMaterial({ color: 0xffe9a0 }),
    timber: matte(0x9a6a3a),
    hullPaint: matte(0xffffff),
    mastMetal: matte(0x888888),
  };

  const lawn = groundQuad(620, 420, mats.turf, -0.05);
  lawn.position.x = 0;
  lawn.position.z = -20;
  scene.add(lawn);

  paintStreets(scene, mats);
  raiseTowers(scene, rng, mats);
  plantPalms(scene, rng, mats);
  hangLamps(scene, mats);
  const sea = buildWaterfront(scene, mats);

  return { sea };
}

// Snap a free coordinate to the closest street line on that axis.
export function nearestRoad(v) {
  let winner = CITY.roads[0];
  for (const r of CITY.roads) {
    if (Math.abs(v - r) < Math.abs(v - winner)) winner = r;
  }
  return winner;
}
