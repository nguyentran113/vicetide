// law.js — Port Solano PD and the wanted meter (round 5 design).
// Wanted level is derived from a heat score in boot.js; this module
// owns the cruisers themselves. They spawn on the grid a few blocks
// out, home in on the player's last known position, and crowd the
// player: stay slow inside their ring for long enough and the bust
// meter fills.

import { makeCarMesh } from './wheels.js';

export function createLaw(THREE, scene, world, rng) {
  const cops = [];
  let bust = 0;

  function spawnCop(playerPos) {
    const { group, lightbar } = makeCarMesh(THREE, 0xf4f1de, true);
    scene.add(group);
    // nearest junction at least ~70 units away from the player
    let bx = world.avenues[0];
    let bz = world.streets[0];
    let bd = -1;
    for (const x of world.avenues) {
      for (const z of world.streets) {
        const d = Math.hypot(x - playerPos.x, z - playerPos.z);
        if (d > 65 && d < 120 && d > bd) { bd = d; bx = x; bz = z; }
      }
    }
    const cop = {
      mesh: group,
      pos: group.position,
      heading: 0,
      speed: 0,
      isCop: true,
      isPlayer: false,
      lightbar,
      topSpeed: 29.5,
    };
    cop.pos.set(bx + rng.jitter(3), 0, bz + rng.jitter(3));
    cop.heading = Math.atan2(playerPos.x - cop.pos.x, playerPos.z - cop.pos.z);
    cops.push(cop);
    return cop;
  }

  function despawn(cop) {
    scene.remove(cop.mesh);
    const i = cops.indexOf(cop);
    if (i >= 0) cops.splice(i, 1);
  }

  return {
    list: cops,
    bustProgress() { return bust; },
    resetBust() { bust = 0; },
    clear() { while (cops.length) despawn(cops[0]); bust = 0; },
    update(dt, time, playerPos, playerSpeed, stars) {
      const wanted = stars > 0 ? Math.min(2 + stars, 5) : 0;
      while (cops.length < wanted) spawnCop(playerPos);
      while (cops.length > Math.max(wanted, 0)) despawn(cops[cops.length - 1]);
      if (stars === 0) bust = Math.max(0, bust - dt * 2);

      let crowding = false;
      for (const cop of cops) {
        const dx = playerPos.x - cop.pos.x;
        const dz = playerPos.z - cop.pos.z;
        const dist = Math.hypot(dx, dz);
        const want = Math.atan2(dx, dz);
        let diff = want - cop.heading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        cop.heading += Math.max(-dt * 2.6, Math.min(dt * 2.6, diff));
        let goal = cop.topSpeed;
        if (dist < 9) goal = Math.max(0, (dist - 5.5)) * 2.2;
        if (dist < 4.2) goal = 0;
        cop.speed += (goal - cop.speed) * Math.min(1, dt * 2.8);
        cop.pos.x += Math.sin(cop.heading) * cop.speed * dt;
        cop.pos.z += Math.cos(cop.heading) * cop.speed * dt;
        cop.mesh.rotation.y = cop.heading;
        if (cop.lightbar) {
          const phase = Math.floor(time * 5.5) % 2 === 0;
          cop.lightbar.userData.red.material.color.setHex(phase ? 0xff2a2a : 0x571010);
          cop.lightbar.userData.blue.material.color.setHex(phase ? 0x101057 : 0x2a6bff);
        }
        if (dist < 7.5) crowding = true;
      }
      if (crowding && Math.abs(playerSpeed) < 2.4 && stars >= 2) {
        bust = Math.min(1, bust + dt / 2.2);
      } else {
        bust = Math.max(0, bust - dt * 0.8);
      }
      return bust;
    },
  };
}
