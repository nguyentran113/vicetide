// folk.js — the pedestrians of Port Solano (round 5 design).
// Each walker owns a straight pavement beat: a fixed line (an avenue
// kerb or a street kerb), a direction and a pace. They stroll end to
// end, turn around, and sprint away at right angles when danger — a
// gunshot or a car on the pavement — comes close.

const SHIRTS = [0xf4f1de, 0xef8354, 0x7fc8bc, 0xe07a5f, 0x81b29a, 0xf2cc8f, 0x9db4db, 0xd1495b];

export function createFolk(THREE, scene, rng, world) {
  const skinTones = [0xd99e73, 0xa0663a, 0xf0c8a0, 0x7a4a26];
  const walkers = [];

  function buildPerson(shirtHex, skinHex) {
    const g = new THREE.Group();
    const legs = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.8, 0.34),
      new THREE.MeshLambertMaterial({ color: 0x44484f })
    );
    legs.position.y = 0.4;
    const torso = new THREE.Mesh(
      new THREE.BoxGeometry(0.82, 0.9, 0.44),
      new THREE.MeshLambertMaterial({ color: shirtHex })
    );
    torso.position.y = 1.24;
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.31, 9, 7),
      new THREE.MeshLambertMaterial({ color: skinHex })
    );
    head.position.y = 2.0;
    g.add(legs, torso, head);
    return g;
  }

  for (let i = 0; i < 22; i++) {
    const mesh = buildPerson(rng.pick(SHIRTS), rng.pick(skinTones));
    scene.add(mesh);
    const alongAvenue = rng.chance(0.55);
    const w = {
      mesh,
      pos: mesh.position,
      alongAvenue,
      line: 0,          // fixed coordinate on the cross axis
      t: 0,             // position along the beat
      lo: 0, hi: 0,
      dir: rng.chance(0.5) ? 1 : -1,
      pace: rng.range(1.1, 2.1),
      phase: rng.range(0, 6),
      fleeT: 0,
      fleeX: 0, fleeZ: 0,
      down: false,
    };
    if (alongAvenue) {
      const a = rng.pick(world.avenues);
      w.line = a + (rng.chance(0.5) ? 10.4 : -10.4);
      w.lo = -232; w.hi = 172;
      w.t = rng.range(w.lo, w.hi);
    } else {
      const s = rng.pick(world.streets);
      w.line = s + (rng.chance(0.5) ? 10.4 : -10.4);
      w.lo = -232; w.hi = 232;
      w.t = rng.range(w.lo, w.hi);
    }
    place(w);
    walkers.push(w);
  }

  function place(w) {
    if (w.alongAvenue) w.pos.set(w.line, 0, w.t);
    else w.pos.set(w.t, 0, w.line);
  }

  return {
    list: walkers,
    scare(x, z, radius) {
      for (const w of walkers) {
        if (w.down) continue;
        const dx = w.pos.x - x;
        const dz = w.pos.z - z;
        if (dx * dx + dz * dz < radius * radius) {
          w.fleeT = rng.range(2, 3.4);
          const len = Math.hypot(dx, dz) || 1;
          w.fleeX = dx / len; w.fleeZ = dz / len;
        }
      }
    },
    update(dt, time) {
      for (const w of walkers) {
        if (w.down) continue;
        if (w.fleeT > 0) {
          w.fleeT -= dt;
          w.pos.x += w.fleeX * 6.4 * dt;
          w.pos.z += w.fleeZ * 6.4 * dt;
          w.mesh.rotation.y = Math.atan2(w.fleeX, w.fleeZ);
        } else {
          w.t += w.dir * w.pace * dt;
          if (w.t > w.hi) { w.t = w.hi; w.dir = -1; }
          if (w.t < w.lo) { w.t = w.lo; w.dir = 1; }
          place(w);
          w.mesh.rotation.y = w.alongAvenue
            ? (w.dir > 0 ? 0 : Math.PI)
            : (w.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
        }
        w.mesh.position.y = Math.abs(Math.sin(time * 7 + w.phase)) * 0.05;
      }
    },
    knockDownNear(x, z, radius) {
      for (const w of walkers) {
        const dx = w.pos.x - x;
        const dz = w.pos.z - z;
        if (!w.down && dx * dx + dz * dz < radius * radius) {
          w.down = true;
          w.mesh.rotation.x = -Math.PI / 2;
          w.mesh.position.y = 0.3;
          return w;
        }
      }
      return null;
    },
  };
}
