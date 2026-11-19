// Port Solano, built procedurally at load time: a grid of asphalt
// streets with dashed centre lines and sidewalks, a tower on most
// blocks, palms and street lamps along the kerbs, and the beach, sea,
// pier and marina that close the south side of the map.

import * as THREE from 'three';
import { CITY } from './config.js';

const BUILDING_COLORS = [0xffd9a0, 0xff9e7a, 0x7ae7ff, 0xf7f0d0, 0xffb3c8, 0xc8b8ff, 0xa0e8b0, 0xffe27a];

function lambert(color) {
  return new THREE.MeshLambertMaterial({ color });
}

function flatPlane(width, depth, material) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), material);
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

function layRoads(scene, mats) {
  // North–south avenues run the full height of the map.
  for (const x of CITY.roads) {
    const strip = flatPlane(14, 470, mats.road);
    strip.position.set(x, 0, -15);
    scene.add(strip);
    for (let z = -240; z < 200; z += 16) {
      const dash = flatPlane(0.5, 7, mats.line);
      dash.position.set(x, 0.02, z);
      scene.add(dash);
    }
    // A sidewalk hugs each side of the avenue.
    for (const side of [-8.2, 8.2]) {
      const walk = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.18, 470), mats.walk);
      walk.position.set(x + side, 0.09, -15);
      scene.add(walk);
    }
  }
  // East–west streets stop before the beach.
  for (const z of CITY.roads) {
    if (z >= 190) continue;
    const strip = flatPlane(560, 14, mats.road);
    strip.position.set(0, 0, z);
    scene.add(strip);
    for (let x = -260; x < 260; x += 16) {
      const dash = flatPlane(7, 0.5, mats.line);
      dash.position.set(x, 0.02, z);
      scene.add(dash);
    }
  }
}

function raiseBuildings(scene, rng, mats) {
  // One to three towers per block, jittered inside the block, with a
  // column of lit windows pasted on the south face of each.
  for (let bx = -210; bx <= 210; bx += CITY.block) {
    for (let bz = -210; bz <= 150; bz += CITY.block) {
      const count = rng.int(1, 3);
      for (let i = 0; i < count; i++) {
        const w = rng.range(16, 26);
        const d = rng.range(16, 26);
        const h = rng.range(12, 64);
        const color = BUILDING_COLORS[rng.int(0, BUILDING_COLORS.length - 1)];
        const tower = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lambert(color));
        const tx = bx + rng.range(-12, 12);
        const tz = bz + rng.range(-12, 12);
        tower.position.set(tx, h / 2, tz);
        scene.add(tower);
        for (let wy = 3; wy < h - 2; wy += 4) {
          const win = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), mats.window);
          win.position.set(tx, wy, tz + d / 2 + 0.06);
          scene.add(win);
        }
      }
    }
  }
}

function plantPalms(scene, rng, mats) {
  const trunkGeo = new THREE.CylinderGeometry(0.25, 0.4, 6, 5);
  const crownGeo = new THREE.ConeGeometry(3, 1.6, 6);
  for (let i = 0; i < 70; i++) {
    const road = CITY.roads[rng.int(0, CITY.roads.length - 1)];
    const x = road + (rng.next() < 0.5 ? -10 : 10);
    const z = rng.range(-250, 185);
    const trunk = new THREE.Mesh(trunkGeo, mats.trunk);
    trunk.position.set(x, 3, z);
    trunk.rotation.z = 0.08;
    scene.add(trunk);
    const crown = new THREE.Mesh(crownGeo, mats.leaf);
    crown.position.set(x + 0.4, 6.4, z);
    scene.add(crown);
  }
}

function raiseLamps(scene, mats) {
  const poleGeo = new THREE.CylinderGeometry(0.12, 0.12, 5, 5);
  const bulbGeo = new THREE.SphereGeometry(0.4, 6, 6);
  for (const x of CITY.roads) {
    for (let z = -240; z < 190; z += 45) {
      const pole = new THREE.Mesh(poleGeo, mats.lampPost);
      pole.position.set(x + 7.5, 2.5, z);
      scene.add(pole);
      const bulb = new THREE.Mesh(bulbGeo, mats.lampBulb);
      bulb.position.set(x + 7.5, 5.1, z);
      scene.add(bulb);
    }
  }
}

function buildShore(scene, mats) {
  const sand = flatPlane(620, 60, mats.sand);
  sand.position.set(0, 0.01, CITY.beachZ + 25);
  scene.add(sand);

  const sea = flatPlane(620, 150, mats.sea);
  sea.position.set(0, 0.02, CITY.seaZ + 70);
  sea.name = 'sea';
  scene.add(sea);

  // A short wooden pier reaches into the water by the marina.
  for (let i = 0; i < 8; i++) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(3, 0.5, 10), mats.pier);
    plank.position.set(150, 0.4, CITY.seaZ + 10 + i * 11);
    scene.add(plank);
  }
  // Moored boats: a hull and a mast, bobbing at anchor (they share the
  // sea mesh's gentle swell because they sit at the same waterline).
  for (let i = 0; i < 5; i++) {
    const boat = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(3, 1.2, 8), mats.hull);
    hull.position.y = 0.6;
    boat.add(hull);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 7, 5), mats.mast);
    mast.position.y = 4;
    boat.add(mast);
    boat.position.set(130 + i * 11, 0, CITY.seaZ + 18);
    scene.add(boat);
  }
  return sea;
}

export function buildCity(scene, rng) {
  const mats = {
    road: lambert(0x2e2e38),
    walk: lambert(0xb8a88f),
    grass: lambert(0x3f9e4d),
    sand: lambert(0xf2d492),
    sea: lambert(0x1e90c8),
    line: new THREE.MeshBasicMaterial({ color: 0xf7e08a }),
    window: new THREE.MeshBasicMaterial({ color: 0xfff6b0 }),
    trunk: lambert(0x8a5a2b),
    leaf: lambert(0x1fa84f),
    lampPost: lambert(0x444455),
    lampBulb: new THREE.MeshBasicMaterial({ color: 0xffe9a0 }),
    pier: lambert(0x9a6a3a),
    hull: lambert(0xffffff),
    mast: lambert(0x888888),
  };

  const ground = flatPlane(620, 420, mats.grass);
  ground.position.set(0, -0.05, -20);
  scene.add(ground);

  layRoads(scene, mats);
  raiseBuildings(scene, rng, mats);
  plantPalms(scene, rng, mats);
  raiseLamps(scene, mats);
  const sea = buildShore(scene, mats);

  return { sea };
}

// The road coordinate nearest to an arbitrary value on one axis.
export function nearestRoad(v) {
  let best = CITY.roads[0];
  let bestDist = Infinity;
  for (const r of CITY.roads) {
    const d = Math.abs(v - r);
    if (d < bestDist) {
      bestDist = d;
      best = r;
    }
  }
  return best;
}
