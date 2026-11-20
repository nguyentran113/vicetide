// hero.js — Rico, the player character on foot (round 5 design).
// Built from a handful of boxes: boots, jeans, a teal overshirt and a
// red snapback. Movement is heading-based: the caller feeds a desired
// move direction in world space and Rico turns toward it at a capped
// rate, which keeps the third-person camera swing smooth.

export function createHero(THREE, scene) {
  const g = new THREE.Group();

  const denim = new THREE.MeshLambertMaterial({ color: 0x2d4a7a });
  const shirt = new THREE.MeshLambertMaterial({ color: 0x0e7c86 });
  const skin = new THREE.MeshLambertMaterial({ color: 0xd99e73 });
  const capMat = new THREE.MeshLambertMaterial({ color: 0xc0392b });

  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.85, 0.38), denim);
  legL.position.set(-0.21, 0.43, 0);
  const legR = legL.clone();
  legR.position.x = 0.21;
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.95, 0.5), shirt);
  torso.position.y = 1.32;
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.8, 0.3), shirt);
  armL.position.set(-0.6, 1.3, 0);
  const armR = armL.clone();
  armR.position.x = 0.6;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8), skin);
  head.position.y = 2.12;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.38, 0.18, 10), capMat);
  cap.position.y = 2.36;
  const brim = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.34), capMat);
  brim.position.set(0, 2.3, 0.48);

  g.add(legL, legR, torso, armL, armR, head, cap, brim);
  scene.add(g);

  const hero = {
    mesh: g,
    pos: g.position,
    heading: Math.PI,          // facing the sea (south) at spawn
    speed: 0,
    down: false,               // knocked down by a car or a bullet scare
    downT: 0,
    walkPhase: 0,
    setPose(x, z, heading) {
      g.position.set(x, 0, z);
      if (heading !== undefined) this.heading = heading;
      g.rotation.y = this.heading;
    },
    // move: {x,z} normalised wish direction, or null. Returns speed.
    update(dt, move, sprint) {
      if (this.down) {
        this.downT -= dt;
        if (this.downT <= 0) { this.down = false; g.rotation.x = 0; g.position.y = 0; }
        this.speed = 0;
        return 0;
      }
      const target = move ? (sprint ? 8.6 : 4.6) : 0;
      this.speed += (target - this.speed) * Math.min(1, dt * 9);
      if (move) {
        const want = Math.atan2(move.x, move.z);
        let diff = want - this.heading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        this.heading += Math.max(-dt * 11, Math.min(dt * 11, diff));
        g.position.x += Math.sin(this.heading) * this.speed * dt;
        g.position.z += Math.cos(this.heading) * this.speed * dt;
      }
      g.rotation.y = this.heading;
      this.walkPhase += dt * this.speed * 1.9;
      const swing = Math.sin(this.walkPhase) * 0.5 * Math.min(1, this.speed / 4);
      legL.rotation.x = swing;
      legR.rotation.x = -swing;
      armL.rotation.x = -swing * 0.8;
      armR.rotation.x = swing * 0.8;
      return this.speed;
    },
    knockDown() {
      if (this.down) return;
      this.down = true;
      this.downT = 1.6;
      g.rotation.x = -Math.PI / 2;
      g.position.y = 0.35;
    },
  };
  return hero;
}
