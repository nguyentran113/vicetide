// wheels.js — everything with four wheels in Port Solano (round 5).
// Cars are boxy two-tone builds on cylinder tyres. Civilian traffic
// thinks in grid waypoints: drive to the next junction in your lane,
// then roll a die to turn. The player's car uses a simple arcade
// model — throttle, brake/reverse, speed-sensitive steering, drag.

const CAR_PAINTS = [0xd1495b, 0x30638c, 0xe8b04b, 0x4f772d, 0xf4f1de, 0x7d8597, 0xef8354, 0x22223b];

export function makeCarMesh(THREE, paintHex, isCop) {
  const g = new THREE.Group();
  const paint = new THREE.MeshLambertMaterial({ color: paintHex });
  const dark = new THREE.MeshLambertMaterial({ color: 0x1d2126 });
  const glass = new THREE.MeshLambertMaterial({ color: 0x9fd8e8 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.62, 4.5), paint);
  body.position.y = 0.62;
  g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 2.3), glass);
  cabin.position.set(0, 1.2, -0.25);
  g.add(cabin);
  const tyreGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 10);
  for (const [tx, tz] of [[-1.0, 1.45], [1.0, 1.45], [-1.0, -1.45], [1.0, -1.45]]) {
    const tyre = new THREE.Mesh(tyreGeo, dark);
    tyre.rotation.z = Math.PI / 2;
    tyre.position.set(tx, 0.42, tz);
    g.add(tyre);
  }
  const lampGeo = new THREE.BoxGeometry(0.42, 0.18, 0.08);
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xfff3b0 });
  for (const lx of [-0.62, 0.62]) {
    const lamp = new THREE.Mesh(lampGeo, lampMat);
    lamp.position.set(lx, 0.72, -2.26);
    g.add(lamp);
  }
  let lightbar = null;
  if (isCop) {
    lightbar = new THREE.Group();
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.2, 0.5),
      new THREE.MeshBasicMaterial({ color: 0xff2a2a }));
    red.position.x = -0.36;
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.2, 0.5),
      new THREE.MeshBasicMaterial({ color: 0x2a6bff }));
    blue.position.x = 0.36;
    lightbar.add(red, blue);
    lightbar.position.set(0, 1.6, -0.25);
    lightbar.userData = { red, blue };
    g.add(lightbar);
  }
  return { group: g, lightbar };
}

function laneOffset(headingAngle) {
  // right-hand traffic: offset to the right of the travel direction
  return { x: Math.cos(headingAngle) * 3.6, z: -Math.sin(headingAngle) * 3.6 };
}

export function createTraffic(THREE, scene, rng, world) {
  const cars = [];
  const junctions = [];
  for (const x of world.avenues) for (const z of world.streets) junctions.push({ x, z });

  function nearestJunction(x, z) {
    let best = junctions[0];
    let bd = Infinity;
    for (const j of junctions) {
      const d = (j.x - x) * (j.x - x) + (j.z - z) * (j.z - z);
      if (d < bd) { bd = d; best = j; }
    }
    return best;
  }

  function spawnCar() {
    const { group } = makeCarMesh(THREE, rng.pick(CAR_PAINTS), false);
    scene.add(group);
    const start = rng.pick(junctions);
    const car = {
      mesh: group,
      pos: group.position,
      heading: rng.pick([0, Math.PI, Math.PI / 2, -Math.PI / 2]),
      speed: 0,
      cruise: rng.range(8, 11.5),
      target: null,
      isPlayer: false,
      isCop: false,
      honk: 0,
    };
    car.pos.set(start.x, 0, start.z);
    pickNext(car);
    snapToLane(car);
    cars.push(car);
    return car;
  }

  function pickNext(car) {
    const here = nearestJunction(car.pos.x, car.pos.z);
    const options = junctions.filter((j) =>
      (j.x === here.x || j.z === here.z) &&
      Math.abs(j.x - here.x) + Math.abs(j.z - here.z) === 52);
    const straight = options.filter((j) =>
      Math.sign(j.x - here.x) === Math.round(Math.sin(car.heading)) &&
      Math.sign(j.z - here.z) === Math.round(Math.cos(car.heading)));
    car.target = (straight.length && rng.chance(0.62)) ? straight[0] : rng.pick(options.length ? options : [here]);
    if (car.target) {
      const dx = car.target.x - here.x;
      const dz = car.target.z - here.z;
      if (dx !== 0 || dz !== 0) car.heading = Math.atan2(dx, dz);
    }
  }

  function snapToLane(car) {
    if (!car.target) return;
    const off = laneOffset(car.heading);
    car.pos.x += off.x * 0; // lane applied continuously in update instead
  }

  for (let i = 0; i < 13; i++) spawnCar();

  return {
    list: cars,
    remove(car) {
      const i = cars.indexOf(car);
      if (i >= 0) cars.splice(i, 1);
    },
    update(dt, obstacles) {
      for (const car of cars) {
        if (!car.target) pickNext(car);
        const off = laneOffset(car.heading);
        const tx = car.target.x + off.x;
        const tz = car.target.z + off.z;
        const dx = tx - car.pos.x;
        const dz = tz - car.pos.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 3) { pickNext(car); continue; }
        const want = Math.atan2(dx, dz);
        let diff = want - car.heading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        car.heading += Math.max(-dt * 2.2, Math.min(dt * 2.2, diff));

        let goal = car.cruise;
        for (const o of obstacles) {
          const ox = o.x - car.pos.x;
          const oz = o.z - car.pos.z;
          const ahead = ox * Math.sin(car.heading) + oz * Math.cos(car.heading);
          const side = Math.abs(ox * Math.cos(car.heading) - oz * Math.sin(car.heading));
          if (ahead > 0 && ahead < 7 && side < 2.2) { goal = 0; break; }
        }
        car.speed += (goal - car.speed) * Math.min(1, dt * 2.4);
        car.pos.x += Math.sin(car.heading) * car.speed * dt;
        car.pos.z += Math.cos(car.heading) * car.speed * dt;
        car.mesh.rotation.y = car.heading;
      }
    },
  };
}

// Arcade driving for whichever car the player is sitting in.
export function driveStep(car, input, dt) {
  const ACCEL = 15;
  const BRAKE = 26;
  const TOP = 33;          // ≈119 km/h
  const REV = 9;
  if (input.up) car.speed += ACCEL * dt;
  else if (input.down) car.speed -= (car.speed > 0.5 ? BRAKE : ACCEL * 0.7) * dt;
  else car.speed -= car.speed * 0.35 * dt;               // engine drag
  car.speed -= car.speed * Math.abs(car.speed) * 0.006 * dt * 10; // aero drag
  car.speed = Math.max(-REV, Math.min(TOP, car.speed));
  if (Math.abs(car.speed) < 0.04 && !input.up && !input.down) car.speed = 0;
  const steer = (input.left ? 1 : 0) - (input.right ? 1 : 0);
  const grip = Math.min(1, Math.abs(car.speed) / 7);
  car.heading += steer * grip * dt * 1.55 * (car.speed < 0 ? -1 : 1) * Math.min(1, Math.abs(car.speed) / TOP + 0.25);
  car.pos.x += Math.sin(car.heading) * car.speed * dt;
  car.pos.z += Math.cos(car.heading) * car.speed * dt;
  car.mesh.rotation.y = car.heading;
  return car.speed;
}
