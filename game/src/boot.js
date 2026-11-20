// boot.js — Vicetide's conductor (round 5 design).
// Wires the city, Rico, traffic, the law, Marisol's jobs, the HUD and
// the synth together; owns the heat score, the camera, gunfire, the
// bust sequence, saves, and the staged ?shot= scenes the dossier
// screenshots are captured from.

import * as THREE from 'three';
import { makeRng } from './rng.js';
import { buildSolano, resolveCollisions } from './solano.js';
import { createHero } from './hero.js';
import { createFolk } from './folk.js';
import { createTraffic, driveStep } from './wheels.js';
import { createLaw } from './law.js';
import { createJobs } from './jobs.js';
import { createFace } from './face.js';
import { createSound } from './sound.js';

const params = new URLSearchParams(location.search);
const shotName = params.get('shot');
const seed = params.get('seed') || 'vicetide-1';
const rng = makeRng('solano/' + seed);
window.__shotReady = false;

// ---------- renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf2a65a);
scene.fog = new THREE.Fog(0xf2a65a, 160, 540);
const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 1000);

const sun = new THREE.DirectionalLight(0xffe3b3, 1.45);
sun.position.set(-90, 150, 130);
scene.add(sun);
scene.add(new THREE.HemisphereLight(0xbfd9ff, 0x8a6f4d, 1.0));

// ---------- world & cast ----------
const world = buildSolano(THREE, scene, rng);
const hero = createHero(THREE, scene);
hero.setPose(6, 122, Math.PI);
const folk = createFolk(THREE, scene, rng, world);
const traffic = createTraffic(THREE, scene, rng, world);
const law = createLaw(THREE, scene, world, rng);
const jobs = createJobs(world);
const face = createFace();
const sound = createSound();

for (const c of traffic.list) c.mesh.userData = { kind: 'car', car: c };
for (const w of folk.list) w.mesh.userData = { kind: 'folk' };

const marker = new THREE.Mesh(
  new THREE.CylinderGeometry(1.7, 1.7, 30, 14, 1, true),
  new THREE.MeshBasicMaterial({ color: 0xffd23e, transparent: true, opacity: 0.38, side: THREE.DoubleSide, depthWrite: false })
);
marker.position.y = 15;
scene.add(marker);

// ---------- game state ----------
const SAVE_KEY = 'vicetide-save-round5';
let mode = 'title';                    // 'title' | 'foot' | 'car'
let money = 150;
let heat = 0;
let paused = false;
let playerCar = null;
let camYaw = Math.PI;
let camPitch = 0.3;
let elapsed = 0;
let crimeCooldown = 0;
let lastShotAt = -1;
let peakStars = 0;
let shotCruise = 0;                    // held speed during staged shots

const titleCard = document.getElementById('titleCard');
const pausedEl = document.getElementById('paused');
const bustedEl = document.getElementById('busted');
const crossEl = document.getElementById('cross');

function starCount() {
  const lock = jobs.heatLock();
  if (lock !== null) return lock;
  if (heat <= 0) return 0;
  return Math.min(5, 1 + Math.floor(heat / 30));
}
function reportCrime(points) {
  if (jobs.heatLock() !== null) return;
  heat = Math.min(150, heat + points);
}
function playerPos() { return mode === 'car' && playerCar ? playerCar.pos : hero.pos; }
function playerSpeed() {
  if (mode === 'car' && playerCar) return playerCar.speed;
  return hero.speed;
}

function saveGame() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      money, job: jobs.state.jobIndex, x: hero.pos.x, z: hero.pos.z,
    }));
  } catch (e) { /* storage unavailable */ }
}
function readSave() {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { return null; }
}

function startGame(fromSave) {
  const s = fromSave ? readSave() : null;
  money = s ? s.money : 150;
  jobs.start(s ? s.job : 0);
  hero.setPose(s ? s.x : 6, s ? s.z : 122, Math.PI);
  hero.mesh.visible = true;
  heat = 0;
  law.clear();
  mode = 'foot';
  titleCard.style.display = 'none';
  face.showHud();
  sound.pad(false);
  sound.unlock();
  face.toast(s ? 'Welcome back to Port Solano' : 'Port Solano. Make it yours, Rico');
}

// ---------- input ----------
const keys = {};
window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  sound.unlock();
  if ((e.code === 'KeyP' || e.code === 'Escape') && (mode === 'foot' || mode === 'car') && !shotName) {
    paused = !paused;
    pausedEl.hidden = !paused;
  }
  if (e.code === 'KeyE' && !paused && (mode === 'foot' || mode === 'car')) tryInteract();
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });

renderer.domElement.addEventListener('click', () => {
  sound.unlock();
  if (mode === 'foot' && !shotName && document.pointerLockElement !== renderer.domElement) {
    renderer.domElement.requestPointerLock();
  }
});
window.addEventListener('mousemove', (e) => {
  if (document.pointerLockElement === renderer.domElement && mode === 'foot') {
    camYaw -= e.movementX * 0.0026;
    camPitch = Math.max(0.05, Math.min(0.9, camPitch + e.movementY * 0.002));
  }
});
window.addEventListener('mousedown', (e) => {
  if (e.button === 0 && mode === 'foot' && !paused && !shotName) shoot();
});
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function tryInteract() {
  if (mode === 'foot') {
    let best = null;
    let bd = 3.8;
    for (const car of traffic.list) {
      const d = Math.hypot(car.pos.x - hero.pos.x, car.pos.z - hero.pos.z);
      if (d < bd) { bd = d; best = car; }
    }
    if (!best) return;
    traffic.remove(best);
    playerCar = best;
    best.isPlayer = true;
    best.speed = 0;
    hero.mesh.visible = false;
    mode = 'car';
    let witnessed = false;
    for (const cop of law.list) {
      if (Math.hypot(cop.pos.x - hero.pos.x, cop.pos.z - hero.pos.z) < 48) witnessed = true;
    }
    if (witnessed) { reportCrime(25); face.toast('Carjacked in front of the law!'); }
    crossEl.hidden = true;
  } else if (mode === 'car' && playerCar) {
    const side = { x: Math.cos(playerCar.heading) * 2.4, z: -Math.sin(playerCar.heading) * 2.4 };
    hero.setPose(playerCar.pos.x + side.x, playerCar.pos.z + side.z, playerCar.heading);
    resolveCollisions(hero.pos, 0.7, world.colliders);
    hero.mesh.visible = true;
    playerCar.isPlayer = false;
    traffic.list.push(playerCar);
    playerCar = null;
    mode = 'foot';
  }
}

// ---------- gunfire ----------
const raycaster = new THREE.Raycaster();
function shoot() {
  if (elapsed - lastShotAt < 0.18) return;
  lastShotAt = elapsed;
  sound.shot();
  folk.scare(hero.pos.x, hero.pos.z, 16);
  raycaster.setFromCamera({ x: 0, y: 0 }, camera);
  raycaster.far = 110;
  const targets = [];
  for (const c of traffic.list) targets.push(c.mesh);
  for (const c of law.list) targets.push(c.mesh);
  for (const w of folk.list) targets.push(w.mesh);
  if (playerCar) targets.push(playerCar.mesh);
  const hits = raycaster.intersectObjects(targets, true);
  if (!hits.length) return;
  let node = hits[0].object;
  while (node && !node.userData.kind) node = node.parent;
  if (!node) return;
  const point = hits[0].point;
  if (node.userData.kind === 'car') {
    const car = node.userData.car;
    if (car && car !== playerCar) { car.speed = 0; reportCrime(12); }
    folk.scare(point.x, point.z, 13);
  } else if (node.userData.kind === 'cop') {
    reportCrime(16);
  } else if (node.userData.kind === 'folk') {
    if (folk.knockDownNear(point.x, point.z, 2.2)) {
      reportCrime(35);
      face.toast('You shot a pedestrian!');
    }
  }
}

// ---------- bust ----------
function doBusted() {
  bustedEl.hidden = false;
  setTimeout(() => { bustedEl.hidden = true; }, 1500);
  money = Math.max(0, money - 150);
  heat = 0;
  peakStars = 0;
  law.clear();
  law.resetBust();
  if (mode === 'car' && playerCar) {
    playerCar.isPlayer = false;
    traffic.list.push(playerCar);
    playerCar = null;
  }
  hero.mesh.visible = true;
  hero.setPose(10, 96, Math.PI);
  mode = 'foot';
  face.toast('BUSTED — $150 fine. The PD keeps the change');
  saveGame();
}

// ---------- camera ----------
const camTarget = new THREE.Vector3();
function updateCamera(dt) {
  if (mode === 'title') {
    const t = elapsed * 0.06;
    camera.position.set(Math.sin(t) * 130, 60, 262 + Math.cos(t) * 22);
    camera.lookAt(0, 6, 30);
    return;
  }
  const p = playerPos();
  if (mode === 'car' && playerCar) {
    const back = 10.5;
    camTarget.set(
      p.x - Math.sin(playerCar.heading) * back,
      4.1,
      p.z - Math.cos(playerCar.heading) * back
    );
    camera.position.lerp(camTarget, Math.min(1, dt * 5));
    camera.lookAt(p.x + Math.sin(playerCar.heading) * 7, 1.4, p.z + Math.cos(playerCar.heading) * 7);
  } else {
    if (hero.speed > 0.6 && document.pointerLockElement !== renderer.domElement) {
      let diff = hero.heading - camYaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      camYaw += diff * Math.min(1, dt * 2.6);
    }
    const dist = 7.6;
    camTarget.set(
      p.x - Math.sin(camYaw) * dist,
      2.1 + camPitch * 5.2,
      p.z - Math.cos(camYaw) * dist
    );
    camera.position.lerp(camTarget, Math.min(1, dt * 8));
    camera.lookAt(p.x + Math.sin(camYaw) * 4, 1.7, p.z + Math.cos(camYaw) * 4);
  }
}

// ---------- per-frame simulation ----------
function step(dt) {
  world.sea.position.y = 0.12 + Math.sin(elapsed * 0.8) * 0.05;
  const obstacles = [{ x: hero.pos.x, z: hero.pos.z }];
  for (const cop of law.list) obstacles.push({ x: cop.pos.x, z: cop.pos.z });
  if (playerCar) obstacles.push({ x: playerCar.pos.x, z: playerCar.pos.z });
  traffic.update(dt, obstacles);
  folk.update(dt, elapsed);

  if (mode === 'title') { updateCamera(dt); return; }

  const stars = starCount();
  peakStars = Math.max(peakStars, stars);
  crimeCooldown = Math.max(0, crimeCooldown - dt);

  if (mode === 'foot') {
    const f = { x: Math.sin(camYaw), z: Math.cos(camYaw) };
    const r = { x: -Math.cos(camYaw), z: Math.sin(camYaw) };
    const move = { x: 0, z: 0 };
    if (keys.KeyW) { move.x += f.x; move.z += f.z; }
    if (keys.KeyS) { move.x -= f.x; move.z -= f.z; }
    if (keys.KeyD) { move.x += r.x; move.z += r.z; }
    if (keys.KeyA) { move.x -= r.x; move.z -= r.z; }
    const len = Math.hypot(move.x, move.z);
    hero.update(dt, len > 0 ? { x: move.x / len, z: move.z / len } : null, !!keys.ShiftLeft);
    resolveCollisions(hero.pos, 0.7, world.colliders);
    // traffic can knock Rico down
    for (const car of traffic.list) {
      if (car.speed > 3 && Math.hypot(car.pos.x - hero.pos.x, car.pos.z - hero.pos.z) < 2.1) {
        hero.knockDown();
        folk.scare(hero.pos.x, hero.pos.z, 10);
      }
    }
  } else if (mode === 'car' && playerCar) {
    if (shotName) {
      playerCar.speed = shotCruise;
      playerCar.pos.x += Math.sin(playerCar.heading) * playerCar.speed * dt;
      playerCar.pos.z += Math.cos(playerCar.heading) * playerCar.speed * dt;
      playerCar.mesh.rotation.y = playerCar.heading;
    } else {
      const before = { x: playerCar.pos.x, z: playerCar.pos.z };
      driveStep(playerCar, {
        up: !!keys.KeyW, down: !!keys.KeyS, left: !!keys.KeyA, right: !!keys.KeyD,
      }, dt);
      resolveCollisions(playerCar.pos, 1.7, world.colliders);
      const shove = Math.hypot(playerCar.pos.x - before.x, playerCar.pos.z - before.z);
      if (shove > 0.45 && Math.abs(playerCar.speed) > 6 && crimeCooldown === 0) {
        reportCrime(14);
        crimeCooldown = 1.2;
        playerCar.speed *= 0.4;
        folk.scare(playerCar.pos.x, playerCar.pos.z, 11);
      }
      // ramming traffic
      for (const car of traffic.list) {
        const d = Math.hypot(car.pos.x - playerCar.pos.x, car.pos.z - playerCar.pos.z);
        if (d < 3.6 && d > 0.01) {
          car.speed = Math.min(car.speed, Math.abs(playerCar.speed) * 0.4);
          if (Math.abs(playerCar.speed) > 7 && crimeCooldown === 0) {
            reportCrime(18);
            crimeCooldown = 1.2;
            folk.scare(car.pos.x, car.pos.z, 12);
          }
        }
      }
      if (folk.knockDownNear(playerCar.pos.x, playerCar.pos.z, Math.abs(playerCar.speed) > 5 ? 2.4 : 0)) {
        reportCrime(40);
        face.toast('You ran someone down!');
      }
    }
    hero.pos.copy(playerCar.pos);
  }

  // the law
  for (const cop of law.list) {
    if (!cop.mesh.userData.kind) cop.mesh.userData = { kind: 'cop' };
    resolveCollisions(cop.pos, 1.6, world.colliders);
  }
  // in the staged chase scene the cruisers hold their composed
  // formation instead of converging (they would leave the frame)
  const bust = shotName === 'chase'
    ? 0
    : law.update(dt, elapsed, playerPos(), playerSpeed(), stars);
  if (bust >= 1) { doBusted(); return; }

  // heat cools when nobody is watching
  let seen = false;
  for (const cop of law.list) {
    if (Math.hypot(cop.pos.x - playerPos().x, cop.pos.z - playerPos().z) < 62) seen = true;
  }
  if (!seen && jobs.heatLock() === null) {
    const before = heat;
    heat = Math.max(0, heat - 6 * dt);
    if (before > 0 && heat === 0 && peakStars >= 2) {
      face.toast('You lost the heat');
      peakStars = 0;
    }
  }

  // jobs
  jobs.update(dt, playerPos(), {
    rewarded(amount, name) {
      money += amount;
      face.toast(`${name} complete — +$${amount}`);
      sound.chime();
      saveGame();
    },
    failed(reason) { face.toast(reason); },
    legDone() { sound.chime(); },
  });
  const mark = jobs.marker();
  if (mark) {
    marker.visible = true;
    marker.position.x = mark.x;
    marker.position.z = mark.z;
    marker.rotation.y = elapsed * 0.8;
  } else marker.visible = false;

  // HUD + audio
  face.money(money);
  face.stars(starCount());
  face.speed(mode === 'car' ? playerSpeed() * 3.6 : null);
  face.objective(jobs.objective());
  face.bust(law.bustProgress());
  face.map(world, playerPos(), mark, law.list);
  crossEl.hidden = !(mode === 'foot' && document.pointerLockElement === renderer.domElement);
  sound.engine(mode === 'car', Math.abs(playerSpeed()) / 33);
  sound.siren(starCount() > 0 && law.list.length > 0);

  updateCamera(dt);
}

// ---------- staged shots for the dossier ----------
function stageShot(name) {
  if (name === 'title') {
    mode = 'title';
    return;
  }
  titleCard.style.display = 'none';
  face.showHud();
  jobs.start(0);
  if (name === 'drive' || name === 'chase') {
    const car = traffic.list[0];
    traffic.remove(car);
    playerCar = car;
    car.isPlayer = true;
    hero.mesh.visible = false;
    mode = 'car';
    if (name === 'drive') {
      car.pos.set(55.6, 0, 46);
      car.heading = Math.PI;
      shotCruise = 16;
      jobs.state.jobIndex = 1;              // show M2 objective in the HUD
    } else {
      car.pos.set(3.6, 0, 26);
      car.heading = Math.PI;
      shotCruise = 15;
      heat = 100;                            // four stars
      jobs.state.jobIndex = 3;
      law.update(0.05, 0, car.pos, 15, 4);
      law.update(0.05, 0, car.pos, 15, 4);
      const c0 = law.list[0];
      const c1 = law.list[1];
      if (c0) { c0.pos.set(-0.5, 0, 27.5); c0.heading = Math.PI; }
      if (c1) { c1.pos.set(8, 0, 28.5); c1.heading = Math.PI; }
    }
    car.speed = shotCruise;
    car.mesh.rotation.y = car.heading;
    hero.pos.copy(car.pos);
    // snap the camera straight into framing — no lerp-in from origin;
    // the chase scene sits wider so both cruisers flank the player car
    const snapBack = name === 'chase' ? 15 : 11;
    const snapHeight = name === 'chase' ? 5.6 : 4.4;
    camera.position.set(
      car.pos.x - Math.sin(car.heading) * snapBack,
      snapHeight,
      car.pos.z - Math.cos(car.heading) * snapBack
    );
    camera.lookAt(car.pos.x + Math.sin(car.heading) * 7, 1.4, car.pos.z + Math.cos(car.heading) * 7);
  } else if (name === 'foot') {
    mode = 'foot';
    hero.setPose(10.4, 64, Math.PI);
    camYaw = Math.PI;
    jobs.state.jobIndex = 0;
    camera.position.set(hero.pos.x - Math.sin(camYaw) * 7.6, 3.9, hero.pos.z - Math.cos(camYaw) * 7.6);
    camera.lookAt(hero.pos.x + Math.sin(camYaw) * 4, 1.7, hero.pos.z + Math.cos(camYaw) * 4);
  }
  face.money(money);
  face.stars(starCount());
  face.objective(jobs.objective());
}

if (shotName) {
  stageShot(shotName);
  setTimeout(() => { window.__shotReady = true; }, 1400);
} else {
  const existing = readSave();
  document.getElementById('btnContinue').style.display = existing ? '' : 'none';
  document.getElementById('btnNew').addEventListener('click', () => startGame(false));
  document.getElementById('btnContinue').addEventListener('click', () => startGame(true));
  sound.pad(true);
}

// ---------- main loop ----------
const clock = new THREE.Clock();
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05);
  elapsed += dt;
  if (!paused) step(dt);
  renderer.render(scene, camera);
}
frame();
