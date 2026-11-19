// The people of Port Solano: simple three-part figures (legs, torso,
// head) who stroll the sidewalks, sprint away from danger, and fall
// where they are hit. The player character and the mission giver are
// built by the same figure factory, just with a fixed shirt colour.

import * as THREE from 'three';
import { CITY } from './config.js';

const SHIRTS = [0xff5e8a, 0x3fd4e3, 0xffe27a, 0x7dff8a, 0xff9a3f, 0xf2f2f2, 0xb48aff];
const TROUSERS = 0x2b3a55;
const SKIN = 0xf2c49a;

export function makePerson(color) {
  const figure = new THREE.Group();

  const legs = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.8, 0.3),
    new THREE.MeshLambertMaterial({ color: TROUSERS }),
  );
  legs.position.y = 0.4;
  figure.add(legs);

  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(0.65, 0.75, 0.35),
    new THREE.MeshLambertMaterial({ color }),
  );
  torso.position.y = 1.15;
  figure.add(torso);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 8, 6),
    new THREE.MeshLambertMaterial({ color: SKIN }),
  );
  head.position.y = 1.75;
  figure.add(head);

  return figure;
}

export function createPedestrians(scene, rng) {
  const peds = [];

  function addPed(x, z) {
    const shirt = SHIRTS[rng.int(0, SHIRTS.length - 1)];
    const mesh = makePerson(shirt);
    mesh.position.set(x, 0, z);
    scene.add(mesh);
    const ped = {
      mesh,
      x,
      z,
      angle: rng.range(0, Math.PI * 2),
      speed: rng.range(1, 2.2),
      dead: false,
      flee: 0,
      fleeFrom: null,
      axis: rng.next() < 0.5 ? 'x' : 'z',
      road: CITY.roads[rng.int(0, CITY.roads.length - 1)],
      side: rng.next() < 0.5 ? -8.2 : 8.2,
      dir: rng.next() < 0.5 ? 1 : -1,
    };
    peds.push(ped);
    return ped;
  }

  // The starting crowd, spread along the avenue sidewalks.
  for (let i = 0; i < 26; i++) {
    const road = CITY.roads[rng.int(0, CITY.roads.length - 1)];
    const side = rng.next() < 0.5 ? -8.2 : 8.2;
    addPed(road + side, rng.range(-240, 180));
  }

  function stroll(p, dt) {
    if (p.axis === 'z') {
      // Walk the length of one avenue, pinned to its sidewalk.
      p.z += p.dir * p.speed * dt;
      if (p.z > 185 || p.z < -250) p.dir *= -1;
      p.x = p.road + p.side;
      p.angle = p.dir > 0 ? 0 : Math.PI;
    } else {
      p.x += p.dir * p.speed * dt;
      if (p.x > 255 || p.x < -255) p.dir *= -1;
      p.angle = p.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    }
  }

  function update(dt, threat) {
    for (const p of peds) {
      if (p.dead) continue;
      if (threat && Math.hypot(p.x - threat.x, p.z - threat.z) < 16) {
        p.flee = 2;
        // Remember where the danger is: the threat can vanish (heat
        // dies down, car stops) while the pedestrian is still running,
        // and the sprint must not dereference a threat that is gone.
        p.fleeFrom = { x: threat.x, z: threat.z };
      }

      if (p.flee > 0 && p.fleeFrom) {
        // Panic: run directly away from the last seen danger, full sprint.
        p.flee -= dt;
        const away = Math.atan2(p.x - p.fleeFrom.x, p.z - p.fleeFrom.z);
        p.angle = away;
        p.x += Math.sin(away) * 6 * dt;
        p.z += Math.cos(away) * 6 * dt;
      } else {
        stroll(p, dt);
      }

      p.mesh.position.set(p.x, 0, p.z);
      p.mesh.rotation.y = p.angle;
      // A little walking bob, phase-shifted by position so the crowd
      // does not bounce in lockstep.
      p.mesh.position.y = Math.abs(Math.sin(performance.now() * 0.012 + p.x)) * 0.06;
    }
  }

  function kill(p) {
    if (p.dead) return;
    p.dead = true;
    p.mesh.rotation.x = Math.PI / 2;
    p.mesh.position.y = 0.25;
  }

  return { peds, addPed, update, kill };
}
