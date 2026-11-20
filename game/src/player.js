// Rico Marín, the player's avatar: the standard citizen figure in a
// cyan shirt, a pistol glued to his right hand and a muzzle flash that
// blinks when he fires. On foot he walks (or runs) relative to the
// camera-side heading he is given, turning to face his own motion.
// Shooting is a flat aim test — a target falls if it sits inside a
// narrow cone around the camera's forward direction and is the
// closest thing in that cone.

import * as THREE from 'three';
import { TUNING } from './config.js';
import { makePerson } from './pedestrians.js';

const BOUNDS = { xMin: -262, xMax: 262, zMin: -262, zMax: 305 };

export function createPlayer(scene) {
  const mesh = makePerson(0x22d4ee);
  scene.add(mesh);

  const pistol = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.12, 0.5),
    new THREE.MeshLambertMaterial({ color: 0x181818 }),
  );
  pistol.position.set(0.42, 1.25, 0.3);
  mesh.add(pistol);

  const flash = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 6, 6),
    new THREE.MeshBasicMaterial({ color: 0xffcc33 }),
  );
  flash.position.set(0.42, 1.25, 0.65);
  flash.visible = false;
  mesh.add(flash);

  const player = {
    mesh,
    flash,
    x: 0,
    z: 26,
    angle: Math.PI,
    speedNow: 0,

    updateFoot(dt, input, heading) {
      const pace = input.shift ? TUNING.runSpeed : TUNING.walkSpeed;
      // Build the wish-direction from the four keys, in heading space.
      let wx = 0;
      let wz = 0;
      if (input.up) { wx += Math.sin(heading); wz += Math.cos(heading); }
      if (input.down) { wx -= Math.sin(heading); wz -= Math.cos(heading); }
      if (input.left) { wx += Math.cos(heading); wz -= Math.sin(heading); }
      if (input.right) { wx -= Math.cos(heading); wz += Math.sin(heading); }

      const mag = Math.hypot(wx, wz);
      this.speedNow = mag > 0 ? pace : 0;
      if (mag > 0) {
        this.x += (wx / mag) * pace * dt;
        this.z += (wz / mag) * pace * dt;
        this.angle = Math.atan2(wx, wz);
      }
      this.x = Math.max(BOUNDS.xMin, Math.min(BOUNDS.xMax, this.x));
      this.z = Math.max(BOUNDS.zMin, Math.min(BOUNDS.zMax, this.z));

      const bob = this.speedNow ? Math.abs(Math.sin(performance.now() * 0.014)) * 0.07 : 0;
      mesh.position.set(this.x, bob, this.z);
      mesh.rotation.y = this.angle;
    },

    shoot(sceneArg, camera, targets) {
      flash.visible = true;
      setTimeout(() => { flash.visible = false; }, 50);

      const viewDir = new THREE.Vector3();
      camera.getWorldDirection(viewDir);
      viewDir.y = 0;
      viewDir.normalize();
      const from = { x: this.x, z: this.z };

      let victim = null;
      let victimDist = 90;
      for (const t of targets) {
        const dx = t.x - from.x;
        const dz = t.z - from.z;
        const dist = Math.hypot(dx, dz);
        if (dist >= victimDist || dist === 0) continue;
        const alignment = (dx / dist) * viewDir.x + (dz / dist) * viewDir.z;
        if (alignment > 0.985) {
          victim = t;
          victimDist = dist;
        }
      }

      const spark = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xffaa22 }),
      );
      if (victim) spark.position.set(victim.x, 1, victim.z);
      else spark.position.set(from.x + viewDir.x * 30, 1.4, from.z + viewDir.z * 30);
      sceneArg.add(spark);
      setTimeout(() => sceneArg.remove(spark), 120);
      return victim;
    },
  };
  return player;
}
