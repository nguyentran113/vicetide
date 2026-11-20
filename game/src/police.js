// Solano PD. The department fields one cruiser per wanted star, up
// to five. A fresh cruiser materialises on a ring around the player,
// homes in with a capped turn rate (so it sweeps in an arc instead of
// snapping onto him), and has two ways to hurt him: ram him while he
// is moving fast, which costs health, or pin him while he is nearly
// stopped — hold the pin for a couple of seconds and he is busted.
// When the stars fall, the extra cruisers are simply stood down.

const FLEET_CAP = 5;
const RING_RADIUS = 55;
const PIN_RANGE = 7;
const RAM_RANGE = 3.2;
const PIN_SECONDS = 2.2;

export function createPolice(scene, vehicles) {
  const units = [];

  function dispatch(state) {
    const bearing = Math.random() * Math.PI * 2;
    const car = vehicles.addCar(
      state.player.x + Math.sin(bearing) * RING_RADIUS,
      state.player.z + Math.cos(bearing) * RING_RADIUS,
      0,
      { police: true, color: 0xffffff },
    );
    car.speed = 0;
    units.push(car);
  }

  function standDown() {
    const car = units.pop();
    const at = vehicles.cars.indexOf(car);
    if (at >= 0) vehicles.cars.splice(at, 1);
    // Take the cruiser out of the world entirely. Merely hiding it
    // would leave one invisible car in the scene graph for every
    // stood-down unit, forever — over a long session of rising and
    // falling heat that adds up to a street full of ghosts.
    scene.remove(car.mesh);
  }

  // Drive one cruiser at the player; returns the gap that remains.
  function pursue(car, dt, state) {
    const dx = state.player.x - car.x;
    const dz = state.player.z - car.z;
    const gap = Math.hypot(dx, dz);

    const desired = Math.atan2(dx, dz);
    let swing = ((desired - car.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    swing = Math.max(-2.2 * dt, Math.min(2.2 * dt, swing));
    car.angle += swing;

    // Sprint while closing, creep while alongside — creeping is what
    // turns a chase into a pin instead of a demolition derby.
    const ceiling = 26 + state.wanted * 3;
    const goal = gap > 6 ? ceiling : 4;
    car.speed += (goal - car.speed) * dt * 1.2;
    car.x += Math.sin(car.angle) * car.speed * dt;
    car.z += Math.cos(car.angle) * car.speed * dt;
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = car.angle;

    const bar = car.mesh.getObjectByName('lightbar');
    if (bar) bar.material.color.setHex(Math.floor(performance.now() / 300) % 2 ? 0xff2244 : 0x2266ff);
    return gap;
  }

  function update(dt, state, audio) {
    const stars = Math.floor(state.wanted);
    while (units.length < stars && units.length < FLEET_CAP) dispatch(state);
    while (units.length > stars) standDown();

    let pinning = false;
    for (const car of units) {
      const gap = pursue(car, dt, state);
      if (gap < PIN_RANGE && Math.abs(state.playerSpeed) < 4) pinning = true;
      if (gap < RAM_RANGE && Math.abs(state.playerSpeed) > 10) {
        state.health -= 18 * dt;
        state.shake = 0.4;
      }
    }

    // One wail per ~1.4 s of wall time while anyone is on the chase.
    const now = performance.now();
    if (units.length && Math.floor(now / 1400) !== Math.floor((now - dt * 1000) / 1400)) {
      audio.siren();
    }

    if (pinning) {
      state.bustTimer += dt;
      if (state.bustTimer > PIN_SECONDS) state.busted = true;
    } else {
      state.bustTimer = Math.max(0, state.bustTimer - dt);
    }
  }

  return { units, update };
}
