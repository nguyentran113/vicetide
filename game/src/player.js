// Rico, the player character: third-person on-foot movement relative to
// the current facing, plus a pistol shot resolved against the camera's
// aim direction. The mesh is the shared pedestrian figure in a cyan
// shirt, with a gun box and a muzzle-flash sphere parented to it.

import * as THREE from 'three';
import { TUNING } from './config.js';
import { makePerson } from './pedestrians.js';

const WORLD = { x: [-262, 262], z: [-262, 305] };

function clampToWorld(p) {
  p.x = Math.max(WORLD.x[0], Math.min(WORLD.x[1], p.x));
  p.z = Math.max(WORLD.z[0], Math.min(WORLD.z[1], p.z));
}

export function createPlayer(scene) {
  const mesh = makePerson(0x22d4ee);
  scene.add(mesh);

  const gun = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.12, 0.5),
    new THREE.MeshLambertMaterial({ color: 0x181818 }),
  );
  gun.position.set(0.42, 1.25, 0.3);
  mesh.add(gun);

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

    // Move on foot. `heading` is the facing the controls are relative
    // to; the figure turns to face whatever direction it actually walks.
    updateFoot(dt, input, heading) {
      const pace = input.shift ? TUNING.runSpeed : TUNING.walkSpeed;
      let mx = 0;
      let mz = 0;
      if (input.up) {
        mx += Math.sin(heading);
        mz += Math.cos(heading);
      }
      if (input.down) {
        mx -= Math.sin(heading);
        mz -= Math.cos(heading);
      }
      if (input.left) {
        mx += Math.cos(heading);
        mz -= Math.sin(heading);
      }
      if (input.right) {
        mx -= Math.cos(heading);
        mz += Math.sin(heading);
      }
      const len = Math.hypot(mx, mz);
      this.speedNow = len > 0 ? pace : 0;
      if (len > 0) {
        mx /= len;
        mz /= len;
        this.x += mx * pace * dt;
        this.z += mz * pace * dt;
        this.angle = Math.atan2(mx, mz);
      }
      clampToWorld(this);
      const bob = this.speedNow ? Math.abs(Math.sin(performance.now() * 0.014)) * 0.07 : 0;
      mesh.position.set(this.x, bob, this.z);
      mesh.rotation.y = this.angle;
    },

    // Fire the pistol. A target counts as hit when it sits almost
    // exactly along the camera's forward line (a tight cone) and is the
    // nearest such target; a spark marks where the shot landed.
    shoot(scene, camera, targets) {
      flash.visible = true;
      setTimeout(() => {
        flash.visible = false;
      }, 50);

      const aim = new THREE.Vector3();
      camera.getWorldDirection(aim);
      const aimFlat = new THREE.Vector3(aim.x, 0, aim.z).normalize();
      const origin = new THREE.Vector3(this.x, 1.4, this.z);

      let best = null;
      let bestDist = 90;
      for (const t of targets) {
        const to = new THREE.Vector3(t.x - origin.x, 0, t.z - origin.z);
        const dist = to.length();
        if (dist >= bestDist) continue;
        if (to.normalize().dot(aimFlat) > 0.985) {
          best = t;
          bestDist = dist;
        }
      }

      const spark = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xffaa22 }),
      );
      spark.position.copy(
        best ? new THREE.Vector3(best.x, 1, best.z) : origin.clone().add(aim.multiplyScalar(30)),
      );
      scene.add(spark);
      setTimeout(() => scene.remove(spark), 120);
      return best;
    },
  };
  return player;
}
