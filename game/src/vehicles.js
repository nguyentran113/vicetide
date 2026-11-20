// Every car in Port Solano comes out of one workshop: a two-box
// low-poly body — hull plus cabin — on four wheels that spin with the
// car's speed. Paint it black-and-white and bolt on a light bar and
// the same shape serves as a Solano PD cruiser.
//
// Traffic behaviour is deliberately simple: AI cars hold a lane on
// the grid, cruise at their own pace, and wrap around the map edge
// instead of turning. The player's car gets arcade handling instead —
// eager acceleration, a short reverse, steering that fades in with
// speed so parking-speed wiggles don't spin the car.

import * as THREE from 'three';
import { CITY, TUNING } from './config.js';

const PAINTS = [0xe33f5e, 0x3f7de3, 0xf2c230, 0x39c26a, 0xf2f2f2, 0x8a4fe3, 0xff7a2a, 0x2ad4c2];
const WHEEL_OFFSETS = [
  [-1, -1.5],
  [1, -1.5],
  [-1, 1.5],
  [1, 1.5],
];

export function makeCarMesh(color, police = false) {
  const group = new THREE.Group();

  const hull = new THREE.Mesh(
    new THREE.BoxGeometry(2, 0.7, 4.4),
    new THREE.MeshLambertMaterial({ color: police ? 0xffffff : color }),
  );
  hull.position.y = 0.65;
  group.add(hull);

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.6, 2.1),
    new THREE.MeshLambertMaterial({ color: police ? 0x14213d : 0x223344 }),
  );
  cabin.position.set(0, 1.25, -0.2);
  group.add(cabin);

  if (police) {
    const band = new THREE.Mesh(
      new THREE.BoxGeometry(2.02, 0.3, 4.42),
      new THREE.MeshLambertMaterial({ color: 0x14213d }),
    );
    band.position.y = 0.5;
    group.add(band);

    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.25, 0.5),
      new THREE.MeshBasicMaterial({ color: 0xff2244 }),
    );
    bar.position.set(0, 1.68, -0.2);
    bar.name = 'lightbar'; // the police module strobes this
    group.add(bar);
  }

  const tyreGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 8);
  const tyreMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const wheels = WHEEL_OFFSETS.map(([wx, wz]) => {
    const wheel = new THREE.Mesh(tyreGeo, tyreMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, 0.42, wz);
    group.add(wheel);
    return wheel;
  });
  group.userData.wheels = wheels;
  return group;
}

function placeMesh(car) {
  car.mesh.position.set(car.x, 0, car.z);
  car.mesh.rotation.y = car.angle;
}

function rollWheels(car, dt) {
  const spin = car.speed * dt * 2;
  for (const w of car.mesh.userData.wheels) w.rotation.x += spin;
}

function cruiseStep(car, dt) {
  car.speed += (car.targetSpeed - car.speed) * dt * 0.8;
  if (car.axis === 'z') {
    car.z += Math.cos(car.angle) * car.speed * dt;
    if (car.z > 265) car.z = -255;
    else if (car.z < -260) car.z = 255;
  } else {
    car.x += Math.sin(car.angle) * car.speed * dt;
    if (car.x > 265) car.x = -255;
    else if (car.x < -265) car.x = 255;
  }
  placeMesh(car);
  rollWheels(car, dt);
}

function playerDrive(car, dt, input) {
  if (input.up) car.speed += TUNING.carAccel * dt;
  else if (input.down) car.speed -= TUNING.carAccel * 0.7 * dt;
  else car.speed *= Math.pow(0.4, dt);
  car.speed = Math.max(-TUNING.carReverse, Math.min(TUNING.carMax, car.speed));

  if (Math.abs(car.speed) > 0.3) {
    const steer = (input.left ? 1 : 0) - (input.right ? 1 : 0);
    const grip = Math.min(1, Math.abs(car.speed) / 8);
    car.angle += steer * dt * 1.5 * Math.sign(car.speed) * grip;
  }

  car.x += Math.sin(car.angle) * car.speed * dt;
  car.z += Math.cos(car.angle) * car.speed * dt;
  car.x = Math.max(-262, Math.min(262, car.x));
  car.z = Math.max(-262, Math.min(300, car.z));
  placeMesh(car);
  rollWheels(car, dt);
  return car.speed;
}

export function createVehicles(scene, rng) {
  const cars = [];

  function addCar(x, z, angle, opts = {}) {
    const police = Boolean(opts.police);
    const mesh = makeCarMesh(opts.color ?? PAINTS[rng.int(0, PAINTS.length - 1)], police);
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

  // Parked cars hug the kerbs of whichever avenue they landed on.
  for (let i = 0; i < 16; i++) {
    const avenue = CITY.roads[rng.int(0, CITY.roads.length - 1)];
    addCar(avenue + (rng.next() < 0.5 ? -5.4 : 5.4), rng.range(-230, 170), 0, { parked: true });
  }

  // Rolling traffic: a north–south majority, an east–west minority.
  for (let i = 0; i < 12; i++) {
    const dir = rng.next() < 0.5 ? 1 : -1;
    if (rng.next() < 0.6) {
      const avenue = CITY.roads[rng.int(0, CITY.roads.length - 1)];
      addCar(avenue + dir * 3.4, rng.range(-230, 170), dir > 0 ? 0 : Math.PI, {
        ai: true,
        axis: 'z',
        laneDir: dir,
      });
    } else {
      const street = CITY.roads[rng.int(0, CITY.roads.length - 2)];
      addCar(rng.range(-230, 230), street + dir * 3.4, dir > 0 ? Math.PI / 2 : -Math.PI / 2, {
        ai: true,
        axis: 'x',
        laneDir: dir,
      });
    }
  }

  function update(dt, state) {
    for (const car of cars) {
      if (!car.ai || car.parked || car.police) continue;
      if (car === state.playerCar) continue;
      cruiseStep(car, dt);
    }
  }

  return { cars, addCar, update, drive: playerDrive };
}
