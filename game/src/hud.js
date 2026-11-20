// The heads-up display. Half of it is DOM — cash, stars, health bar,
// objective banner, speedometer, toast line, crosshair, and the
// full-screen card that carries the title / pause / ending text. The
// other half is a 2D canvas minimap, redrawn each frame around the
// player: grass, sand and sea, the street grid, every car (police in
// red), the gold mission marker, and the player as a cyan arrow
// turned to his heading.

import { CITY } from './config.js';

const MAP_PX = 190;
const PX_PER_UNIT = MAP_PX / 560; // a 560-unit window on the world

export function createHud() {
  const el = (id) => document.getElementById(id);
  const hud = el('hud');
  const moneyEl = el('money');
  const starsEl = el('stars');
  const healthEl = el('healthBar');
  const objectiveEl = el('objective');
  const speedoEl = el('speedo');
  const toastEl = el('toast');
  const crossEl = el('cross');
  const screenEl = el('screen');
  const cardEl = el('card');
  const mapCtx = el('minimap').getContext('2d');

  let toastTimeout = null;
  function showToast(msg, ms = 3200) {
    toastEl.textContent = msg;
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => { toastEl.textContent = ''; }, ms);
  }

  function showScreen(html) {
    screenEl.style.display = 'flex';
    cardEl.innerHTML = html;
  }

  function hideScreen() {
    screenEl.style.display = 'none';
  }

  const toMapX = (state, x) => MAP_PX / 2 + (x - state.player.x) * PX_PER_UNIT;
  const toMapY = (state, z) => MAP_PX / 2 + (z - state.player.z) * PX_PER_UNIT;

  function blip(state, x, z, color, radius) {
    mapCtx.fillStyle = color;
    mapCtx.beginPath();
    mapCtx.arc(toMapX(state, x), toMapY(state, z), radius, 0, 7);
    mapCtx.fill();
  }

  function paintMinimap(state, mission) {
    mapCtx.fillStyle = '#1d4d2b';
    mapCtx.fillRect(0, 0, MAP_PX, MAP_PX);
    mapCtx.fillStyle = '#f2d492';
    mapCtx.fillRect(0, toMapY(state, CITY.beachZ), MAP_PX, 60 * PX_PER_UNIT);
    mapCtx.fillStyle = '#1e90c8';
    mapCtx.fillRect(0, toMapY(state, CITY.seaZ), MAP_PX, 80);

    mapCtx.strokeStyle = '#3a3a46';
    mapCtx.lineWidth = 5;
    for (const r of CITY.roads) {
      mapCtx.beginPath();
      mapCtx.moveTo(toMapX(state, r), 0);
      mapCtx.lineTo(toMapX(state, r), MAP_PX);
      mapCtx.stroke();
      mapCtx.beginPath();
      mapCtx.moveTo(0, toMapY(state, r));
      mapCtx.lineTo(MAP_PX, toMapY(state, r));
      mapCtx.stroke();
    }

    for (const c of state.cars) blip(state, c.x, c.z, c.police ? '#ff3344' : '#cccccc', c.police ? 3.5 : 2);
    if (mission && mission.active) {
      blip(state, mission.current.marker.x, mission.current.marker.z, '#ffd23f', 4.5);
    }

    mapCtx.save();
    mapCtx.translate(MAP_PX / 2, MAP_PX / 2);
    mapCtx.rotate(state.player.angle);
    mapCtx.fillStyle = '#22d4ee';
    mapCtx.beginPath();
    mapCtx.moveTo(0, -8);
    mapCtx.lineTo(5, 6);
    mapCtx.lineTo(-5, 6);
    mapCtx.closePath();
    mapCtx.fill();
    mapCtx.restore();
  }

  function objectiveHtml(mission) {
    if (!mission || !mission.active) {
      return 'Free roam — find Marisol Vega (gold marker) or explore Port Solano.';
    }
    let html = '<b>' + mission.current.title + '</b><br>' + mission.current.text;
    if (mission.timer > 0) html += ' · ⏱ ' + Math.ceil(mission.timer) + 's';
    return html;
  }

  function update(state, mission) {
    moneyEl.textContent = '$' + state.money;
    const lit = Math.floor(state.wanted);
    starsEl.textContent = '★'.repeat(lit) + '☆'.repeat(5 - lit);
    healthEl.style.width = Math.max(0, state.health) + '%';
    healthEl.style.background = state.health > 35 ? '#3fe35e' : '#e33';
    objectiveEl.innerHTML = objectiveHtml(mission);
    speedoEl.style.display = state.playerCar ? 'block' : 'none';
    if (state.playerCar) {
      speedoEl.textContent = Math.round(Math.abs(state.playerSpeed) * 3.6) + ' km/h';
    }
    crossEl.style.display = !state.playerCar && state.screen === 'play' ? 'block' : 'none';
    paintMinimap(state, mission);
  }

  return { hud, showToast, showScreen, hideScreen, update };
}
