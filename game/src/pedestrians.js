// The citizens of Port Solano. Each is three boxes and a sphere —
// legs, torso, head — in a bright shirt. They amble along the
// sidewalks in straight lines, bounce off the ends of their beat, and
// sprint directly away from anything frightening. A hit pedestrian
// tips over where he stands and stays there.
//
// The same figure factory dresses the player and Marisol Vega; they
// just get to pick their shirt colour first.

import * as THREE from 'three';
import { CITY } from './config.js';

const SHIRT_CHOICES = [0xff5e8a, 0x3fd4e3, 0xffe27a, 0x7dff8a, 0xff9a3f, 0xf2f2f2, 0xb48aff];
const PANTS = 0x2b3a55;
const SKIN_TONE = 0xf2c49a;

export function makePerson(color) {
  const figure = new THREE.Group();

  const legs = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.8, 0.3),
    new THREE.MeshLambertMaterial({ color: PANTS }),
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
    new THREE.MeshLambertMaterial({ color: SKIN_TONE }),
  );
  head.position.y = 1.75;
  figure.add(head);

  return figure;
}

export function createPedestrians(scene, rng) {
  const peds = [];

  function addPed(x, z) {
    const mesh = makePerson(SHIRT_CHOICES[rng.int(0, SHIRT_CHOICES.length - 1)]);
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

  for (let i = 0; i < 26; i++) {
    const avenue = CITY.roads[rng.int(0, CITY.roads.length - 1)];
    addPed(avenue + (rng.next() < 0.5 ? -8.2 : 8.2), rng.range(-240, 180));
  }

  function walkBeat(p, dt) {
    if (p.axis === 'z') {
      p.z += p.dir * p.speed * dt;
      if (p.z > 185 || p.z < -250) p.dir = -p.dir;
      p.x = p.road + p.side;
      p.angle = p.dir > 0 ? 0 : Math.PI;
    } else {
      p.x += p.dir * p.speed * dt;
      if (p.x > 255 || p.x < -255) p.dir = -p.dir;
      p.angle = p.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    }
  }

  function update(dt, threat) {
    for (const p of peds) {
      if (p.dead) continue;

      if (threat && Math.hypot(p.x - threat.x, p.z - threat.z) < 16) {
        p.flee = 2;
        // Keep a snapshot of the danger's position. The scare may end
        // mid-sprint (the car stops, the heat dies) and the runner
        // still needs somewhere to be running *from*.
        p.fleeFrom = { x: threat.x, z: threat.z };
      }

      if (p.flee > 0 && p.fleeFrom) {
        p.flee -= dt;
        const heading = Math.atan2(p.x - p.fleeFrom.x, p.z - p.fleeFrom.z);
        p.angle = heading;
        p.x += Math.sin(heading) * 6 * dt;
        p.z += Math.cos(heading) * 6 * dt;
      } else {
        walkBeat(p, dt);
      }

      p.mesh.position.set(p.x, Math.abs(Math.sin(performance.now() * 0.012 + p.x)) * 0.06, p.z);
      p.mesh.rotation.y = p.angle;
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
