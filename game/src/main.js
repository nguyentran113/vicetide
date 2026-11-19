// VICETIDE — an original open-world crime game set in the fictional
// coastal city of Port Solano. This module is the conductor: it boots
// the renderer and the world, owns the game state, reads the keyboard,
// and runs the crime/wanted system, the mission tracker, the screens
// (title, pause, busted, wasted, ending), the save file, and the staged
// screenshot scenes the hand-in screenshots were captured from.

import * as THREE from 'three';
import { SAVE_KEY, GIVER, COLORS } from './config.js';
import { createRandom } from './random.js';
import { buildCity } from './city.js';
import { createVehicles } from './vehicles.js';
import { createPedestrians, makePerson } from './pedestrians.js';
import { createPolice } from './police.js';
import { createPlayer } from './player.js';
import { createMissions, MISSIONS, STORY_INTRO } from './missions.js';
import { createHud } from './hud.js';
import { createAudio } from './audio.js';

// ---------------------------------------------------------------- boot

const params = new URLSearchParams(location.search);
const shotName = params.get('shot');
const seed = Number.parseInt(params.get('seed') ?? '1', 10) || 1;
const rng = createRandom(seed * 7919 + 13);

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
function resize() {
  renderer.setSize(innerWidth, innerHeight);
}
addEventListener('resize', resize);
resize();

const scene = new THREE.Scene();
scene.background = new THREE.Color(COLORS.sky);
scene.fog = new THREE.Fog(COLORS.fog, 90, 420);

const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 900);

const sun = new THREE.DirectionalLight(COLORS.sun, 1.6);
sun.position.set(-80, 120, 60);
scene.add(sun);
scene.add(new THREE.AmbientLight(0xffc9a0, 0.85));

const city = buildCity(scene, rng);
const vehicles = createVehicles(scene, rng);
const peds = createPedestrians(scene, rng);
const player = createPlayer(scene);
const police = createPolice(scene, vehicles);
const missions = createMissions(scene);
const hud = createHud();
const audio = createAudio();

// Marisol Vega herself, standing where the gold beacon points at the
// start of a new game.
const giver = makePerson(0xff5e8a);
giver.position.set(GIVER.x, 0, GIVER.z);
scene.add(giver);

// The hero car used by the staged drive/chase screenshots.
const heroCar = vehicles.addCar(6, 34, Math.PI, { color: 0xe33f5e });

// ------------------------------------------------------------- state

const state = {
  screen: 'title', // title | play | paused | over
  money: 150,
  health: 100,
  wanted: 0,
  crimeHeat: 0,
  hideTime: 0,
  player,
  playerCar: null,
  playerSpeed: 0,
  cars: vehicles.cars,
  bustTimer: 0,
  busted: false,
  shake: 0,
  phase: 'giver', // giver | mission | done
  dead: false,
};
missions.beam.position.set(GIVER.x, 20, GIVER.z);
missions.ring.position.set(GIVER.x, 0.4, GIVER.z);
missions.beam.visible = true;
missions.ring.visible = true;

function saveGame() {
  try {
    const data = {
      money: state.money,
      mission: missions.index + (missions.active ? 0 : 1),
      done: state.phase === 'done',
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    /* storage may be unavailable; the game plays on regardless */
  }
}

function loadSave() {
  try {
    return JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
  } catch {
    return null;
  }
}

function addWanted(n) {
  state.wanted = Math.min(5, state.wanted + n);
  state.hideTime = 0;
}

function payOut(n) {
  state.money += n;
  audio.cash();
  hud.showToast('+$' + n + ' — job done! Balance $' + state.money);
}

// ------------------------------------------------------------- input

const keys = {};
addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'KeyM') {
    hud.showToast(audio.toggleMute() ? '🔇 Muted' : '🔊 Sound on');
  }
  if (e.code === 'KeyP' || e.code === 'Escape') {
    if (state.screen === 'play') {
      state.screen = 'paused';
      showPause();
    } else if (state.screen === 'paused') {
      state.screen = 'play';
      hud.hideScreen();
      hud.hud.style.display = 'block';
    }
  }
  if ((e.code === 'KeyE' || e.code === 'KeyF') && state.screen === 'play') toggleCar();
});
addEventListener('keyup', (e) => {
  keys[e.code] = false;
});
canvas.addEventListener('mousedown', () => {
  if (state.screen === 'play' && !state.playerCar) doShoot();
});

function readInput() {
  return {
    up: Boolean(keys.KeyW || keys.ArrowUp),
    down: Boolean(keys.KeyS || keys.ArrowDown),
    left: Boolean(keys.KeyA || keys.ArrowLeft),
    right: Boolean(keys.KeyD || keys.ArrowRight),
    shift: Boolean(keys.ShiftLeft || keys.ShiftRight),
  };
}

// -------------------------------------------------------- cars & guns

function nearestCar(maxDist) {
  let best = null;
  let bestDist = maxDist;
  for (const c of vehicles.cars) {
    const d = Math.hypot(c.x - player.x, c.z - player.z);
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return best;
}

function toggleCar() {
  if (state.playerCar) {
    // Step out beside the car and hand it back to the world.
    const car = state.playerCar;
    state.playerCar = null;
    player.x = car.x + 2.6;
    player.z = car.z;
    player.mesh.visible = true;
    audio.engine(0, false);
    return;
  }
  const car = nearestCar(4.5);
  if (!car) return;
  if (car.parked || car.ai) {
    // Taking a parked car is petty; jacking a moving one is a crime.
    addWanted(car.ai ? 1 : 0.5);
    hud.showToast(car.ai ? '🚗 Car jacked! +wanted' : '🚗 You took a parked car.');
  }
  car.ai = false;
  car.parked = false;
  state.playerCar = car;
  player.mesh.visible = false;
  audio.start();
}

function doShoot() {
  audio.start();
  audio.shot();
  addWanted(1);
  const targets = peds.peds.filter((p) => !p.dead).map((p) => ({ x: p.x, z: p.z, ped: p }));
  const hit = player.shoot(scene, camera, targets);
  if (hit) {
    peds.kill(hit.ped);
    state.wanted = Math.min(5, state.wanted + 1);
    hud.showToast('You shot a pedestrian!');
  }
  // Everyone nearby runs for it.
  for (const p of peds.peds) {
    if (Math.hypot(p.x - player.x, p.z - player.z) < 14) p.flee = 2;
  }
}

// ------------------------------------------------------------ screens

function showTitle() {
  state.screen = 'title';
  const saved = loadSave();
  const continueBtn = saved
    ? '<button id="btnCont">↩ CONTINUE ($' + saved.money + ', mission ' + (saved.mission + 1) + ')</button>'
    : '';
  hud.showScreen(
    '<h1>VICETIDE</h1>' +
      '<h2>Port Solano · an original open-world crime game</h2>' +
      '<p>' + STORY_INTRO + '</p>' +
      '<p class="keys">🚶 WASD move · Shift run · Mouse click shoot (on foot)<br>' +
      '🚗 E / F enter & exit car · WASD drive · Speedometer bottom-right<br>' +
      '⭐ Crimes raise wanted stars · Hide to cool off · P pause · M mute</p>' +
      '<br><button id="btnNew">▶ NEW GAME</button>' +
      continueBtn,
  );
  document.getElementById('btnNew').onclick = () => startGame(false);
  const cont = document.getElementById('btnCont');
  if (cont) cont.onclick = () => startGame(true);
}

function showPause() {
  hud.showScreen(
    '<h1>⏸ PAUSED</h1><p>VICETIDE — Port Solano</p>' +
      '<p class="keys">WASD move/drive · E/F car · Click shoot · Shift run · M mute · P resume</p>' +
      '<button id="btnResume">▶ RESUME</button><button id="btnQuit">TITLE</button>',
  );
  document.getElementById('btnResume').onclick = () => {
    state.screen = 'play';
    hud.hideScreen();
  };
  document.getElementById('btnQuit').onclick = () => {
    hud.hud.style.display = 'none';
    showTitle();
  };
}

function resetAfterEnd() {
  state.health = 100;
  state.wanted = 0;
  state.busted = false;
  state.dead = false;
  state.bustTimer = 0;
  player.x = 0;
  player.z = 26;
  if (state.playerCar) {
    state.playerCar = null;
    player.mesh.visible = true;
  }
  hud.hud.style.display = 'block';
  state.screen = 'play';
  hud.hideScreen();
}

function showEnd(kind) {
  state.screen = 'over';
  hud.hud.style.display = 'none';
  audio.engine(0, false);
  let html;
  if (kind === 'busted') {
    const fined = Math.min(200, state.money);
    state.money -= fined;
    html =
      '<h1>🚔 BUSTED</h1><p>Solano PD pinned you down. Fine: $' + fined +
      '. Cash left: $' + state.money + '.</p><button id="btnAgain">TRY AGAIN</button>';
  } else if (kind === 'wasted') {
    html =
      '<h1>💀 WASTED</h1><p>You flatlined on the streets of Port Solano. Cash: $' +
      state.money + '.</p><button id="btnAgain">TRY AGAIN</button>';
  } else {
    html =
      "<h1>⛵ YOU ESCAPED!</h1><p>Rico boards the last boat out as Port Solano glitters behind him. Marisol's four jobs are done.</p>" +
      '<p>Final cash: <b>$' + state.money + '</b> · All 4 missions complete 🏆</p><button id="btnAgain">PLAY AGAIN</button>';
  }
  hud.showScreen(html);
  document.getElementById('btnAgain').onclick = resetAfterEnd;
}

function startGame(continueSave) {
  audio.start();
  hud.hideScreen();
  hud.hud.style.display = 'block';
  state.screen = 'play';

  if (continueSave) {
    const saved = loadSave();
    if (saved) {
      state.money = saved.money;
      const idx = Math.min(3, saved.mission || 0);
      state.phase = 'mission';
      missions.start(idx);
      hud.showToast(MISSIONS[idx].from);
      return;
    }
  }
  state.money = 150;
  state.health = 100;
  state.wanted = 0;
  state.phase = 'giver';
  missions.beam.visible = true;
  missions.ring.visible = true;
  missions.beam.position.set(GIVER.x, 20, GIVER.z);
  missions.ring.position.set(GIVER.x, 0.4, GIVER.z);
  hud.showToast('Find Marisol Vega — follow the gold beam!');
}

// ----------------------------------------------------------- missions

function failTimedMission() {
  hud.showToast('⏰ Too slow! Try the delivery again.');
  missions.timer = missions.current.time;
  player.x = 0;
  player.z = 26;
  if (state.playerCar) {
    state.playerCar = null;
    player.mesh.visible = true;
  }
}

function completeMission() {
  const m = missions.current;
  payOut(m.reward);
  const doneIndex = missions.index;
  missions.hide();
  if (doneIndex >= 3) {
    state.phase = 'done';
    saveGame();
    showEnd('ending');
    return;
  }
  const next = doneIndex + 1;
  missions.start(next);
  if (next === 2) {
    // The boulevard job starts hot and stays hot.
    state.wanted = 3;
    state.hideTime = -999;
  }
  hud.showToast(MISSIONS[next].from, 6000);
  saveGame();
}

function missionTick(dt) {
  const px = state.playerCar ? state.playerCar.x : player.x;
  const pz = state.playerCar ? state.playerCar.z : player.z;

  if (state.phase === 'giver') {
    if (Math.hypot(px - GIVER.x, pz - GIVER.z) < 4) {
      state.phase = 'mission';
      missions.start(0);
      hud.showToast(MISSIONS[0].from, 6000);
    }
    return;
  }
  if (state.phase !== 'mission' || !missions.active) return;

  const m = missions.current;
  if (m.need === 'timed') {
    missions.timer -= dt;
    if (missions.timer <= 0) {
      failTimedMission();
      return;
    }
  }
  // Mission 3 pins the heat: the wanted level cannot fall below the
  // chase until the garage is reached with the police shaken off.
  if (missions.index === 2) state.wanted = Math.max(state.wanted, 2.6);

  if (Math.hypot(px - m.marker.x, pz - m.marker.z) < 7) {
    if (m.need === 'escape' && state.wanted > 2.5) {
      hud.showToast('Too hot! Shake the police first, then hide here.');
      return;
    }
    completeMission();
  }
}

// ------------------------------------------------------------- update

function driveCollisions() {
  // Running people down is loud, costly and very illegal.
  for (const p of peds.peds) {
    if (p.dead) continue;
    if (Math.abs(state.playerSpeed) > 4 && Math.hypot(p.x - player.x, p.z - player.z) < 1.9) {
      peds.kill(p);
      addWanted(1);
      state.health -= 2;
      audio.hit();
      hud.showToast('You ran someone over!');
    }
  }
  // Trading paint with traffic.
  for (const c of vehicles.cars) {
    if (c === state.playerCar) continue;
    if (Math.hypot(c.x - player.x, c.z - player.z) < 3.4 && Math.abs(state.playerSpeed) > 8) {
      state.playerSpeed *= -0.3;
      addWanted(0.5);
      state.health -= 3;
      audio.hit();
      state.shake = 0.3;
    }
  }
}

function wantedDecay(dt) {
  // During mission 3 the heat is locked on; everywhere else, staying
  // out of sight of any cruiser bleeds the stars away half at a time.
  const heatLocked = state.phase === 'mission' && missions.index === 2;
  if (state.wanted <= 0 || heatLocked) return;
  const copNear = police.units.some((c) => Math.hypot(c.x - player.x, c.z - player.z) < 30);
  if (copNear) {
    state.hideTime = 0;
    return;
  }
  state.hideTime += dt;
  if (state.hideTime > 7) {
    state.wanted = Math.max(0, state.wanted - 0.5);
    state.hideTime = 0;
    if (state.wanted === 0) hud.showToast('⭐ You lost the police.');
  }
}

function followCamera(dt) {
  const target = state.playerCar || player;
  const dist = state.playerCar ? 10 : 7;
  const height = state.playerCar ? 4.2 : 3.2;
  // Sit behind the player's heading and look at his position.
  camera.position.set(
    target.x - Math.sin(player.angle) * dist,
    height,
    target.z - Math.cos(player.angle) * dist,
  );
  if (state.shake > 0) {
    state.shake -= dt;
    camera.position.x += (Math.random() - 0.5) * state.shake;
    camera.position.y += (Math.random() - 0.5) * state.shake;
  }
  camera.lookAt(target.x, 1.4, target.z);
}

function hudMission() {
  if (missions.active) return missions;
  if (state.phase === 'giver') {
    // Before the first job, the "mission" is simply meeting Marisol.
    return {
      active: true,
      current: {
        title: 'Meet Marisol Vega',
        text: 'Go to the gold beam by the palms to meet marina fixer Marisol Vega.',
        marker: GIVER,
      },
      timer: 0,
    };
  }
  return null;
}

function update(dt) {
  const input = readInput();

  if (state.playerCar) {
    state.playerSpeed = vehicles.drive(state.playerCar, dt, input);
    player.x = state.playerCar.x;
    player.z = state.playerCar.z;
    player.angle = state.playerCar.angle;
    audio.engine(state.playerSpeed, true);
    driveCollisions();
  } else {
    // Read the speed after the step, not before: the police pin/ram
    // checks below judge this frame's movement, not last frame's.
    player.updateFoot(dt, input, player.angle);
    state.playerSpeed = player.speedNow;
    audio.engine(0, false);
  }

  vehicles.update(dt, state);
  const threat =
    state.wanted > 0 || Math.abs(state.playerSpeed) > 15 ? { x: player.x, z: player.z } : null;
  peds.update(dt, threat);
  police.update(dt, state, audio);

  wantedDecay(dt);
  if (state.health < 100 && state.wanted === 0) {
    state.health = Math.min(100, state.health + dt * 2);
  }

  missionTick(dt);
  followCamera(dt);

  if (city.sea) city.sea.position.y = 0.02 + Math.sin(performance.now() * 0.001) * 0.05;
  missions.beam.rotation.y += dt;
  missions.ring.rotation.z += dt;

  hud.update(state, hudMission());

  if (state.busted) showEnd('busted');
  else if (state.health <= 0 && !state.dead) {
    state.dead = true;
    showEnd('wasted');
  }
}

// ------------------------------------------- staged screenshot scenes
// The four hand-in screenshots were captured from these exact setups
// (?shot=title|drive|foot|chase). Keep them stable: they are the
// game's cover art, not a test fixture.

function stageShot(name) {
  hud.hud.style.display = 'block';
  state.screen = 'play';
  hud.hideScreen();

  if (name === 'title') {
    hud.hud.style.display = 'none';
    showTitle();
    camera.position.set(40, 26, 150);
    camera.lookAt(0, 10, -40);
    return;
  }

  if (name === 'drive') {
    state.playerCar = heroCar;
    Object.assign(heroCar, { x: 3.4, z: -40, angle: 0, speed: 16 });
    heroCar.mesh.position.set(3.4, 0, -40);
    heroCar.mesh.rotation.y = 0;
    player.mesh.visible = false;
    player.x = 3.4;
    player.z = -40;
    player.angle = 0;
    state.playerSpeed = 16;
    state.money = 650;
    missions.start(1);
    missions.timer = 52;
    state.phase = 'mission';
    const ahead = vehicles.cars.find((c) => c.ai);
    if (ahead) {
      ahead.x = -3.4;
      ahead.z = -14;
      ahead.angle = 0;
      ahead.mesh.position.set(-3.4, 0, -14);
      ahead.mesh.rotation.y = 0;
    }
    camera.position.set(3.4, 4.2, -52);
    camera.lookAt(3.4, 1.2, -30);
    hud.update(state, missions);
    return;
  }

  if (name === 'foot') {
    player.x = 8;
    player.z = 8;
    player.angle = Math.PI * 0.8;
    player.mesh.position.set(8, 0, 8);
    player.mesh.rotation.y = player.angle;
    state.money = 400;
    missions.start(0);
    state.phase = 'mission';
    for (let i = 0; i < 8; i++) {
      const p = peds.peds[i];
      if (!p) continue;
      p.x = 4 + i * 1.6;
      p.z = 14 + (i % 3) * 2;
      p.mesh.position.set(p.x, 0, p.z);
    }
    camera.position.set(8 - Math.sin(player.angle) * 8, 3.4, 8 - Math.cos(player.angle) * 8);
    camera.lookAt(8, 1.3, 8);
    hud.update(state, missions);
    return;
  }

  if (name === 'chase') {
    state.wanted = 4;
    state.playerCar = heroCar;
    Object.assign(heroCar, { x: -30, z: 183.4, angle: Math.PI / 2, speed: 24 });
    heroCar.mesh.position.set(-30, 0, 183.4);
    heroCar.mesh.rotation.y = Math.PI / 2;
    player.mesh.visible = false;
    player.x = -30;
    player.z = 183.4;
    player.angle = Math.PI / 2;
    state.playerSpeed = 24;
    state.money = 1250;
    state.health = 62;
    missions.start(3);
    state.phase = 'mission';
    const copSpots = [
      [-13, 183.4],
      [-3, 177.6],
      [-38, 177.9],
    ];
    for (const [cx, cz] of copSpots) {
      const cop = vehicles.addCar(cx, cz, Math.PI / 2, { police: true });
      cop.angle = Math.PI / 2;
      cop.mesh.rotation.y = Math.PI / 2;
      police.units.push(cop);
    }
    camera.position.set(-44, 4.5, 183.4);
    camera.lookAt(-16, 1.2, 183.4);
    hud.update(state, missions);
    return;
  }
}

// --------------------------------------------------------- main loop

if (shotName) {
  stageShot(shotName);
  let frames = 0;
  (function paint() {
    renderer.render(scene, camera);
    if (++frames >= 3) window.__shotReady = true;
    else requestAnimationFrame(paint);
  })();
} else {
  showTitle();
  let last = performance.now();
  (function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (state.screen === 'play') update(dt);
    else if (state.screen === 'title') {
      // A slow orbital pan over the city behind the title card.
      camera.position.set(Math.sin(now * 0.00008) * 70, 26, 120);
      camera.lookAt(0, 12, -30);
    }
    renderer.render(scene, camera);
  })(performance.now());
}
