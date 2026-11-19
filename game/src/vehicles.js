// Cars for Port Solano: a low-poly two-box body on spinning wheels.
// One factory builds every car in the game — parked cars, the AI traffic
// that cruises the grid, the player's ride and (with a light bar and a
// black-and-white paint job) the police cruisers.

import * as THREE from 'three';
import { CITY, TUNING } from './config.js';

const PAINT = [0xe33f5e, 0x3f7de3, 0xf2c230, 0x39c26a, 0xf2f2f2, 0x8a4fe3, 0xff7a2a, 0x2ad4c2];
const WHEEL_SPOTS = [
  [-1, -1.5],
  [1, -1.5],
  [-1, 1.5],
  [1, 1.5],
];

export function makeCarMesh(color, police = false) {
  const car = new THREE.Group();

  const bodyMat = new THREE.MeshLambertMaterial({ color: police ? 0xffffff : color });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.7, 4.4), bodyMat);
  body.position.y = 0.65;
  car.add(body);

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.6, 2.1),
    new THREE.MeshLambertMaterial({ color: police ? 0x14213d : 0x223344 }),
  );
  cabin.position.set(0, 1.25, -0.2);
  car.add(cabin);

  if (police) {
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(2.02, 0.3, 4.42),
      new THREE.MeshLambertMaterial({ color: 0x14213d }),
    );
    stripe.position.y = 0.5;
    car.add(stripe);
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.25, 0.5),
      new THREE.MeshBasicMaterial({ color: 0xff2244 }),
    );
    bar.position.set(0, 1.68, -0.2);
    bar.name = 'lightbar'; // the police module flashes this each frame
    car.add(bar);
  }

  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 8);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const wheels = [];
  for (const [wx, wz] of WHEEL_SPOTS) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, 0.42, wz);
    car.add(wheel);
    wheels.push(wheel);
  }
  car.userData.wheels = wheels;
  return car;
}

function spinWheels(car, dt) {
  for (const w of car.mesh.userData.wheels) w.rotation.x += car.speed * dt * 2;
}

function syncMesh(car) {
  car.mesh.position.set(car.x, 0, car.z);
  car.mesh.rotation.y = car.angle;
}

// Traffic cars drive straight along their lane and wrap around the map
// edge; the grid never turns, which keeps the whole system predictable.
function cruise(car, dt) {
  car.speed += (car.targetSpeed - car.speed) * dt * 0.8;
  if (car.axis === 'z') {
    car.z += Math.cos(car.angle) * car.speed * dt;
    if (car.z > 265) car.z = -255;
    if (car.z < -260) car.z = 255;
  } else {
    car.x += Math.sin(car.angle) * car.speed * dt;
    if (car.x > 265) car.x = -255;
    if (car.x < -265) car.x = 255;
  }
  syncMesh(car);
  spinWheels(car, dt);
}

// Arcade driving for whichever car the player is sitting in: strong
// acceleration, a capped reverse, speed-sensitive steering.
function driveCar(car, dt, input) {
  if (input.up) car.speed += TUNING.carAccel * dt;
  else if (input.down) car.speed -= TUNING.carAccel * 0.7 * dt;
  else car.speed *= Math.pow(0.4, dt); // coast down
  car.speed = Math.max(-TUNING.carReverse, Math.min(TUNING.carMax, car.speed));

  if (Math.abs(car.speed) > 0.3) {
    const steer = (input.left ? 1 : 0) - (input.right ? 1 : 0);
    const authority = Math.min(1, Math.abs(car.speed) / 8);
    car.angle += steer * dt * 1.5 * (car.speed > 0 ? 1 : -1) * authority;
  }

  car.x += Math.sin(car.angle) * car.speed * dt;
  car.z += Math.cos(car.angle) * car.speed * dt;
  car.x = Math.max(-262, Math.min(262, car.x));
  car.z = Math.max(-262, Math.min(300, car.z));
  syncMesh(car);
  spinWheels(car, dt);
  return car.speed;
}

export function createVehicles(scene, rng) {
  const cars = [];

  function addCar(x, z, angle, opts = {}) {
    const police = Boolean(opts.police);
    const color = opts.color ?? PAINT[rng.int(0, PAINT.length - 1)];
    const mesh = makeCarMesh(color, police);
    mesh.position.set(x, 0, z);
    mesh.rotation.y = angle;
    scene.add(mesh);
    const car = {
      mesh,
      x,
      z,
      angle,
      speed: 0,
      police,
      parked: Boolean(opts.parked),
      ai: Boolean(opts.ai),
      health: 100,
      driver: null,
      laneDir: opts.laneDir || 1,
      axis: opts.axis || 'z',
      targetSpeed: opts.targetSpeed || rng.range(9, 15),
    };
    cars.push(car);
    return car;
  }

  // Kerbside parking along the avenues.
  for (let i = 0; i < 16; i++) {
    const road = CITY.roads[rng.int(0, CITY.roads.length - 1)];
    const side = rng.next() < 0.5 ? -5.4 : 5.4;
    addCar(road + side, rng.range(-230, 170), 0, { parked: true });
  }

  // Moving traffic: most of it runs north–south, the rest east–west.
  for (let i = 0; i < 12; i++) {
    const dir = rng.next() < 0.5 ? 1 : -1;
    if (rng.next() < 0.6) {
      const road = CITY.roads[rng.int(0, CITY.roads.length - 1)];
      addCar(road + dir * 3.4, rng.range(-230, 170), dir > 0 ? 0 : Math.PI, {
        ai: true,
        axis: 'z',
        laneDir: dir,
      });
    } else {
      const road = CITY.roads[rng.int(0, CITY.roads.length - 2)];
      addCar(rng.range(-230, 230), road + dir * 3.4, dir > 0 ? Math.PI / 2 : -Math.PI / 2, {
        ai: true,
        axis: 'x',
        laneDir: dir,
      });
    }
  }

  function update(dt, state) {
    for (const car of cars) {
      if (car.parked || car.police || !car.ai) continue;
      if (car === state.playerCar) continue;
      cruise(car, dt);
    }
  }

  return { cars, addCar, update, drive: driveCar };
}
