// VICETIDE — Port Solano. An original open-world crime game.
//
// This module conducts everything: it builds the renderer, scene and
// cast of systems (city, traffic, crowd, police, missions, HUD,
// audio), owns the run's state — cash, health, wanted level, who is
// driving what — and runs the frame loop. It also owns the four
// staged scenes (?shot=title|drive|foot|chase&seed=N) that the
// hand-in screenshots are photographed from, the title / pause /
// busted / wasted / ending screens, and the localStorage save.

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

// ------------------------------------------------------------ setup

const query = new URLSearchParams(location.search);
const shotMode = query.get('shot');
const seed = Number.parseInt(query.get('seed') ?? '1', 10) || 1;
const rng = createRandom(seed * 7919 + 13);

const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
function fitToWindow() {
  renderer.setSize(innerWidth, innerHeight);
}
addEventListener('resize', fitToWindow);
fitToWindow();

const scene = new THREE.Scene();
scene.background = new THREE.Color(COLORS.sky);
scene.fog = new THREE.Fog(COLORS.fog, 90, 420);

const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 900);

const sunlight = new THREE.DirectionalLight(COLORS.sun, 1.6);
sunlight.position.set(-80, 120, 60);
scene.add(sunlight);
scene.add(new THREE.AmbientLight(0xffc9a0, 0.85));

const city = buildCity(scene, rng);
const traffic = createVehicles(scene, rng);
const crowd = createPedestrians(scene, rng);
const player = createPlayer(scene);
const police = createPolice(scene, traffic);
const missions = createMissions(scene);
const hud = createHud();
const audio = createAudio();

// Marisol Vega, in pink, standing at the foot of her gold beacon.
const marisol = makePerson(0xff5e8a);
marisol.position.set(GIVER.x, 0, GIVER.z);
scene.add(marisol);

// The car the staged drive and chase photographs are taken from.
const heroCar = traffic.addCar(6, 34, Math.PI, { color: 0xe33f5e });

// ------------------------------------------------------------ state

const S = {
  screen: 'title', // title | play | paused | over
  money: 150,
  health: 100,
  wanted: 0,
  hideTime: 0,
  player,
  playerCar: null,
  playerSpeed: 0,
  cars: traffic.cars,
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

function persist() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      money: S.money,
      mission: missions.index + (missions.active ? 0 : 1),
      done: S.phase === 'done',
    }));
  } catch {
    // Private modes and friends: play on without a save.
  }
}

function readSave() {
  try {
    return JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
  } catch {
    return null;
  }
}

function raiseWanted(by) {
  S.wanted = Math.min(5, S.wanted + by);
  S.hideTime = 0;
}

function reward(amount) {
  S.money += amount;
  audio.cash();
  hud.showToast('+$' + amount + ' — job done! Balance $' + S.money);
}

// ------------------------------------------------------------ input

const held = {};
addEventListener('keydown', (e) => {
  held[e.code] = true;
  if (e.code === 'KeyM') hud.showToast(audio.toggleMute() ? '🔇 Muted' : '🔊 Sound on');
  if (e.code === 'KeyP' || e.code === 'Escape') {
    if (S.screen === 'play') {
      S.screen = 'paused';
      showPause();
    } else if (S.screen === 'paused') {
      S.screen = 'play';
      hud.hideScreen();
      hud.hud.style.display = 'block';
    }
  }
  if ((e.code === 'KeyE' || e.code === 'KeyF') && S.screen === 'play') toggleCar();
});
addEventListener('keyup', (e) => { held[e.code] = false; });
renderer.domElement.addEventListener('mousedown', () => {
  if (S.screen === 'play' && !S.playerCar) firePistol();
});

function readKeys() {
  return {
    up: Boolean(held.KeyW || held.ArrowUp),
    down: Boolean(held.KeyS || held.ArrowDown),
    left: Boolean(held.KeyA || held.ArrowLeft),
    right: Boolean(held.KeyD || held.ArrowRight),
    shift: Boolean(held.ShiftLeft || held.ShiftRight),
  };
}

// ------------------------------------------------------ cars & guns

function closestCar(within) {
  let best = null;
  let bestGap = within;
  for (const car of traffic.cars) {
    const gap = Math.hypot(car.x - player.x, car.z - player.z);
    if (gap < bestGap) {
      bestGap = gap;
      best = car;
    }
  }
  return best;
}

function toggleCar() {
  if (S.playerCar) {
    const car = S.playerCar;
    S.playerCar = null;
    player.x = car.x + 2.6;
    player.z = car.z;
    player.mesh.visible = true;
    audio.engine(0, false);
    return;
  }
  const car = closestCar(4.5);
  if (!car) return;
  if (car.parked || car.ai) {
    raiseWanted(car.ai ? 1 : 0.5);
    hud.showToast(car.ai ? '🚗 Car jacked! +wanted' : '🚗 You took a parked car.');
  }
  car.ai = false;
  car.parked = false;
  S.playerCar = car;
  player.mesh.visible = false;
  audio.start();
}

function firePistol() {
  audio.start();
  audio.shot();
  raiseWanted(1);
  const targets = crowd.peds.filter((p) => !p.dead).map((p) => ({ x: p.x, z: p.z, ped: p }));
  const struck = player.shoot(scene, camera, targets);
  if (struck) {
    crowd.kill(struck.ped);
    S.wanted = Math.min(5, S.wanted + 1);
    hud.showToast('You shot a pedestrian!');
  }
  for (const p of crowd.peds) {
    if (Math.hypot(p.x - player.x, p.z - player.z) < 14) p.flee = 2;
  }
}

// ---------------------------------------------------------- screens

function showTitle() {
  S.screen = 'title';
  const saved = readSave();
  hud.showScreen(
    '<h1>VICETIDE</h1>' +
    '<h2>Port Solano · an original open-world crime game</h2>' +
    '<p>' + STORY_INTRO + '</p>' +
    '<p class="keys">🚶 WASD move · Shift run · Mouse click shoot (on foot)<br>' +
    '🚗 E / F enter & exit car · WASD drive · Speedometer bottom-right<br>' +
    '⭐ Crimes raise wanted stars · Hide to cool off · P pause · M mute</p>' +
    '<br><button id="btnNew">▶ NEW GAME</button>' +
    (saved
      ? '<button id="btnCont">↩ CONTINUE ($' + saved.money + ', mission ' + (saved.mission + 1) + ')</button>'
      : ''),
  );
  document.getElementById('btnNew').onclick = () => beginRun(false);
  const contBtn = document.getElementById('btnCont');
  if (contBtn) contBtn.onclick = () => beginRun(true);
}

function showPause() {
  hud.showScreen(
    '<h1>⏸ PAUSED</h1><p>VICETIDE — Port Solano</p>' +
    '<p class="keys">WASD move/drive · E/F car · Click shoot · Shift run · M mute · P resume</p>' +
    '<button id="btnResume">▶ RESUME</button><button id="btnQuit">TITLE</button>',
  );
  document.getElementById('btnResume').onclick = () => {
    S.screen = 'play';
    hud.hideScreen();
  };
  document.getElementById('btnQuit').onclick = () => {
    hud.hud.style.display = 'none';
    showTitle();
  };
}

function respawn() {
  S.health = 100;
  S.wanted = 0;
  S.busted = false;
  S.dead = false;
  S.bustTimer = 0;
  player.x = 0;
  player.z = 26;
  if (S.playerCar) {
    S.playerCar = null;
    player.mesh.visible = true;
  }
  hud.hud.style.display = 'block';
  S.screen = 'play';
  hud.hideScreen();
}

function showEnding(kind) {
  S.screen = 'over';
  hud.hud.style.display = 'none';
  audio.engine(0, false);
  let html;
  if (kind === 'busted') {
    const fine = Math.min(200, S.money);
    S.money -= fine;
    html = '<h1>🚔 BUSTED</h1><p>Solano PD pinned you down. Fine: $' + fine +
      '. Cash left: $' + S.money + '.</p><button id="btnAgain">TRY AGAIN</button>';
  } else if (kind === 'wasted') {
    html = '<h1>💀 WASTED</h1><p>You flatlined on the streets of Port Solano. Cash: $' +
      S.money + '.</p><button id="btnAgain">TRY AGAIN</button>';
  } else {
    html = "<h1>⛵ YOU ESCAPED!</h1><p>Rico boards the last boat out as Port Solano glitters behind him. Marisol's four jobs are done.</p>" +
      '<p>Final cash: <b>$' + S.money + '</b> · All 4 missions complete 🏆</p><button id="btnAgain">PLAY AGAIN</button>';
  }
  hud.showScreen(html);
  document.getElementById('btnAgain').onclick = respawn;
}

function beginRun(useSave) {
  audio.start();
  hud.hideScreen();
  hud.hud.style.display = 'block';
  S.screen = 'play';

  if (useSave) {
    const saved = readSave();
    if (saved) {
      S.money = saved.money;
      const idx = Math.min(3, saved.mission || 0);
      S.phase = 'mission';
      missions.start(idx);
      hud.showToast(MISSIONS[idx].from);
      return;
    }
  }
  S.money = 150;
  S.health = 100;
  S.wanted = 0;
  S.phase = 'giver';
  missions.beam.visible = true;
  missions.ring.visible = true;
  missions.beam.position.set(GIVER.x, 20, GIVER.z);
  missions.ring.position.set(GIVER.x, 0.4, GIVER.z);
  hud.showToast('Find Marisol Vega — follow the gold beam!');
}

// --------------------------------------------------------- missions

function timedOut() {
  hud.showToast('⏰ Too slow! Try the delivery again.');
  missions.timer = missions.current.time;
  player.x = 0;
  player.z = 26;
  if (S.playerCar) {
    S.playerCar = null;
    player.mesh.visible = true;
  }
}

function finishMission() {
  reward(missions.current.reward);
  const finishedIdx = missions.index;
  missions.hide();
  if (finishedIdx >= 3) {
    S.phase = 'done';
    persist();
    showEnding('ending');
    return;
  }
  const next = finishedIdx + 1;
  missions.start(next);
  if (next === 2) {
    // The third job begins at three stars and the heat is welded on.
    S.wanted = 3;
    S.hideTime = -999;
  }
  hud.showToast(MISSIONS[next].from, 6000);
  persist();
}

function missionStep(dt) {
  const px = S.playerCar ? S.playerCar.x : player.x;
  const pz = S.playerCar ? S.playerCar.z : player.z;

  if (S.phase === 'giver') {
    if (Math.hypot(px - GIVER.x, pz - GIVER.z) < 4) {
      S.phase = 'mission';
      missions.start(0);
      hud.showToast(MISSIONS[0].from, 6000);
    }
    return;
  }
  if (S.phase !== 'mission' || !missions.active) return;

  const m = missions.current;
  if (m.need === 'timed') {
    missions.timer -= dt;
    if (missions.timer <= 0) {
      timedOut();
      return;
    }
  }
  if (missions.index === 2) S.wanted = Math.max(S.wanted, 2.6);

  if (Math.hypot(px - m.marker.x, pz - m.marker.z) < 7) {
    if (m.need === 'escape' && S.wanted > 2.5) {
      hud.showToast('Too hot! Shake the police first, then hide here.');
      return;
    }
    finishMission();
  }
}

// ----------------------------------------------------------- update

function drivingMayhem() {
  for (const p of crowd.peds) {
    if (p.dead) continue;
    if (Math.abs(S.playerSpeed) > 4 && Math.hypot(p.x - player.x, p.z - player.z) < 1.9) {
      crowd.kill(p);
      raiseWanted(1);
      S.health -= 2;
      audio.hit();
      hud.showToast('You ran someone over!');
    }
  }
  for (const car of traffic.cars) {
    if (car === S.playerCar) continue;
    if (Math.hypot(car.x - player.x, car.z - player.z) < 3.4 && Math.abs(S.playerSpeed) > 8) {
      S.playerSpeed *= -0.3;
      raiseWanted(0.5);
      S.health -= 3;
      audio.hit();
      S.shake = 0.3;
    }
  }
}

function coolHeat(dt) {
  const welded = S.phase === 'mission' && missions.index === 2;
  if (S.wanted <= 0 || welded) return;
  const watched = police.units.some((c) => Math.hypot(c.x - player.x, c.z - player.z) < 30);
  if (watched) {
    S.hideTime = 0;
    return;
  }
  S.hideTime += dt;
  if (S.hideTime > 7) {
    S.wanted = Math.max(0, S.wanted - 0.5);
    S.hideTime = 0;
    if (S.wanted === 0) hud.showToast('⭐ You lost the police.');
  }
}

function chaseCamera(dt) {
  const anchor = S.playerCar || player;
  const back = S.playerCar ? 10 : 7;
  const up = S.playerCar ? 4.2 : 3.2;
  camera.position.set(
    anchor.x - Math.sin(player.angle) * back,
    up,
    anchor.z - Math.cos(player.angle) * back,
  );
  if (S.shake > 0) {
    S.shake -= dt;
    camera.position.x += (Math.random() - 0.5) * S.shake;
    camera.position.y += (Math.random() - 0.5) * S.shake;
  }
  camera.lookAt(anchor.x, 1.4, anchor.z);
}

// What the HUD should describe as "the current objective": the active
// mission if there is one, otherwise the walk to Marisol's beacon.
function objectiveForHud() {
  if (missions.active) return missions;
  if (S.phase === 'giver') {
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

function stepWorld(dt) {
  const input = readKeys();

  if (S.playerCar) {
    S.playerSpeed = traffic.drive(S.playerCar, dt, input);
    player.x = S.playerCar.x;
    player.z = S.playerCar.z;
    player.angle = S.playerCar.angle;
    audio.engine(S.playerSpeed, true);
    drivingMayhem();
  } else {
    player.updateFoot(dt, input, player.angle);
    // Sample the speed after the step: the police pin and ram tests
    // below are judging the frame that just happened.
    S.playerSpeed = player.speedNow;
    audio.engine(0, false);
  }

  traffic.update(dt, S);
  const danger = S.wanted > 0 || Math.abs(S.playerSpeed) > 15 ? { x: player.x, z: player.z } : null;
  crowd.update(dt, danger);
  police.update(dt, S, audio);

  coolHeat(dt);
  if (S.health < 100 && S.wanted === 0) S.health = Math.min(100, S.health + dt * 2);

  missionStep(dt);
  chaseCamera(dt);

  if (city.sea) city.sea.position.y = 0.02 + Math.sin(performance.now() * 0.001) * 0.05;
  missions.beam.rotation.y += dt;
  missions.ring.rotation.z += dt;

  hud.update(S, objectiveForHud());

  if (S.busted) showEnding('busted');
  else if (S.health <= 0 && !S.dead) {
    S.dead = true;
    showEnding('wasted');
  }
}

// ------------------------------------------- staged screenshot scenes
// The hand-in photographs are taken from these four fixed setups
// (?shot=title|drive|foot|chase). They are cover art: keep the poses
// deliberate and stable, and re-shoot rather than re-posing.

function poseShot(name) {
  hud.hud.style.display = 'block';
  S.screen = 'play';
  hud.hideScreen();

  if (name === 'title') {
    hud.hud.style.display = 'none';
    showTitle();
    camera.position.set(40, 26, 150);
    camera.lookAt(0, 10, -40);
    return;
  }

  if (name === 'drive') {
    S.playerCar = heroCar;
    Object.assign(heroCar, { x: 3.4, z: -40, angle: 0, speed: 16 });
    heroCar.mesh.position.set(3.4, 0, -40);
    heroCar.mesh.rotation.y = 0;
    player.mesh.visible = false;
    player.x = 3.4;
    player.z = -40;
    player.angle = 0;
    S.playerSpeed = 16;
    S.money = 650;
    missions.start(1);
    missions.timer = 52;
    S.phase = 'mission';
    const trafficAhead = traffic.cars.find((c) => c.ai);
    if (trafficAhead) {
      trafficAhead.x = -3.4;
      trafficAhead.z = -14;
      trafficAhead.angle = 0;
      trafficAhead.mesh.position.set(-3.4, 0, -14);
      trafficAhead.mesh.rotation.y = 0;
    }
    camera.position.set(3.4, 4.2, -52);
    camera.lookAt(3.4, 1.2, -30);
    hud.update(S, missions);
    return;
  }

  if (name === 'foot') {
    player.x = 8;
    player.z = 8;
    player.angle = Math.PI * 0.8;
    player.mesh.position.set(8, 0, 8);
    player.mesh.rotation.y = player.angle;
    S.money = 400;
    missions.start(0);
    S.phase = 'mission';
    for (let i = 0; i < 8; i++) {
      const p = crowd.peds[i];
      if (!p) continue;
      p.x = 4 + i * 1.6;
      p.z = 14 + (i % 3) * 2;
      p.mesh.position.set(p.x, 0, p.z);
    }
    camera.position.set(8 - Math.sin(player.angle) * 8, 3.4, 8 - Math.cos(player.angle) * 8);
    camera.lookAt(8, 1.3, 8);
    hud.update(S, missions);
    return;
  }

  if (name === 'chase') {
    S.wanted = 4;
    S.playerCar = heroCar;
    Object.assign(heroCar, { x: -30, z: 183.4, angle: Math.PI / 2, speed: 24 });
    heroCar.mesh.position.set(-30, 0, 183.4);
    heroCar.mesh.rotation.y = Math.PI / 2;
    player.mesh.visible = false;
    player.x = -30;
    player.z = 183.4;
    player.angle = Math.PI / 2;
    S.playerSpeed = 24;
    S.money = 1250;
    S.health = 62;
    missions.start(3);
    S.phase = 'mission';
    const copPoses = [
      [-13, 183.4],
      [-3, 177.6],
      [-38, 177.9],
    ];
    for (const [cx, cz] of copPoses) {
      const cop = traffic.addCar(cx, cz, Math.PI / 2, { police: true });
      cop.angle = Math.PI / 2;
      cop.mesh.rotation.y = Math.PI / 2;
      police.units.push(cop);
    }
    camera.position.set(-44, 4.5, 183.4);
    camera.lookAt(-16, 1.2, 183.4);
    hud.update(S, missions);
    return;
  }
}

// ------------------------------------------------------------ loops

if (shotMode) {
  poseShot(shotMode);
  let painted = 0;
  (function paintFrame() {
    renderer.render(scene, camera);
    if (++painted >= 3) window.__shotReady = true;
    else requestAnimationFrame(paintFrame);
  })();
} else {
  showTitle();
  let previous = performance.now();
  (function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - previous) / 1000);
    previous = now;
    if (S.screen === 'play') stepWorld(dt);
    else if (S.screen === 'title') {
      camera.position.set(Math.sin(now * 0.00008) * 70, 26, 120);
      camera.lookAt(0, 12, -30);
    }
    renderer.render(scene, camera);
  })(performance.now());
}
