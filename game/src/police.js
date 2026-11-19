// Solano PD: one cruiser per wanted star (up to five). Cruisers spawn
// on a ring around the player, steer straight at him, and try to pin
// his car or corner him on foot — hold a pin long enough and the bust
// lands. Ram him at speed and it costs him health instead.

const MAX_UNITS = 5;
const SPAWN_DISTANCE = 55;
const PIN_DISTANCE = 7;
const RAM_DISTANCE = 3.2;
const BUST_SECONDS = 2.2;

export function createPolice(scene, vehicles) {
  const units = [];

  function spawn(state) {
    const a = Math.random() * Math.PI * 2;
    const car = vehicles.addCar(
      state.player.x + Math.sin(a) * SPAWN_DISTANCE,
      state.player.z + Math.cos(a) * SPAWN_DISTANCE,
      0,
      { police: true, color: 0xffffff },
    );
    car.speed = 0;
    units.push(car);
    return car;
  }

  function dismissExtra() {
    const car = units.pop();
    const i = vehicles.cars.indexOf(car);
    if (i >= 0) vehicles.cars.splice(i, 1);
    car.mesh.visible = false;
  }

  function chase(car, dt, state) {
    const dx = state.player.x - car.x;
    const dz = state.player.z - car.z;
    const dist = Math.hypot(dx, dz);

    // Steer toward the player, capped turn rate so cruisers arc rather
    // than snap onto him.
    const target = Math.atan2(dx, dz);
    let diff = ((target - car.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    const turn = Math.max(-2.2 * dt, Math.min(2.2 * dt, diff));
    car.angle += turn;

    // Flat out while closing in, gentle once alongside (that is what
    // makes the pin possible instead of an endless demolition derby).
    const topSpeed = 26 + state.wanted * 3;
    const goal = dist > 6 ? topSpeed : 4;
    car.speed += (goal - car.speed) * dt * 1.2;
    car.x += Math.sin(car.angle) * car.speed * dt;
    car.z += Math.cos(car.angle) * car.speed * dt;
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = car.angle;

    const bar = car.mesh.getObjectByName('lightbar');
    if (bar) bar.material.color.setHex(Math.floor(performance.now() / 300) % 2 ? 0xff2244 : 0x2266ff);

    return dist;
  }

  function update(dt, state, audio) {
    const want = Math.floor(state.wanted);
    while (units.length < want && units.length < MAX_UNITS) spawn(state);
    while (units.length > want) dismissExtra();

    let pinning = false;
    for (const car of units) {
      const dist = chase(car, dt, state);
      if (dist < PIN_DISTANCE && Math.abs(state.playerSpeed) < 4) pinning = true;
      if (dist < RAM_DISTANCE && Math.abs(state.playerSpeed) > 10) {
        state.health -= 18 * dt;
        state.shake = 0.4;
      }
    }

    // A wail roughly every 1.4 seconds while any unit is active.
    const now = performance.now();
    if (units.length && Math.floor(now / 1400) !== Math.floor((now - dt * 1000) / 1400)) {
      audio.siren();
    }

    if (pinning) {
      state.bustTimer += dt;
      if (state.bustTimer > BUST_SECONDS) state.busted = true;
    } else {
      state.bustTimer = Math.max(0, state.bustTimer - dt);
    }
  }

  return { units, update };
}
