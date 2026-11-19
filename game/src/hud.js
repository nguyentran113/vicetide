// The HUD: DOM panels for cash, wanted stars, health, the current
// objective and the speedometer, plus a 2D-canvas minimap that tracks
// the player through Port Solano — roads, beach and sea, traffic,
// police, and the gold mission marker.

import { CITY } from './config.js';

const MAP_SIZE = 190;
const MAP_SCALE = MAP_SIZE / 560; // the map shows a 560-unit window

export function createHud() {
  const byId = (id) => document.getElementById(id);
  const hud = byId('hud');
  const moneyEl = byId('money');
  const starsEl = byId('stars');
  const healthEl = byId('healthBar');
  const objectiveEl = byId('objective');
  const speedoEl = byId('speedo');
  const toastEl = byId('toast');
  const crossEl = byId('cross');
  const screenEl = byId('screen');
  const cardEl = byId('card');
  const map = byId('minimap').getContext('2d');

  let toastTimer = null;
  function showToast(msg, ms = 3200) {
    toastEl.textContent = msg;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.textContent = '';
    }, ms);
  }

  function showScreen(html) {
    screenEl.style.display = 'flex';
    cardEl.innerHTML = html;
  }

  function hideScreen() {
    screenEl.style.display = 'none';
  }

  // World → map coordinates, centred on the player.
  function mapX(state, x) {
    return MAP_SIZE / 2 + (x - state.player.x) * MAP_SCALE;
  }
  function mapY(state, z) {
    return MAP_SIZE / 2 + (z - state.player.z) * MAP_SCALE;
  }

  function dot(state, x, z, color, radius) {
    map.fillStyle = color;
    map.beginPath();
    map.arc(mapX(state, x), mapY(state, z), radius, 0, 7);
    map.fill();
  }

  function drawMinimap(state, mission) {
    map.fillStyle = '#1d4d2b';
    map.fillRect(0, 0, MAP_SIZE, MAP_SIZE);
    // Sand, then sea, along the southern shore.
    map.fillStyle = '#f2d492';
    map.fillRect(0, mapY(state, CITY.beachZ), MAP_SIZE, 60 * MAP_SCALE);
    map.fillStyle = '#1e90c8';
    map.fillRect(0, mapY(state, CITY.seaZ), MAP_SIZE, 80);

    map.strokeStyle = '#3a3a46';
    map.lineWidth = 5;
    for (const r of CITY.roads) {
      map.beginPath();
      map.moveTo(mapX(state, r), 0);
      map.lineTo(mapX(state, r), MAP_SIZE);
      map.stroke();
      map.beginPath();
      map.moveTo(0, mapY(state, r));
      map.lineTo(MAP_SIZE, mapY(state, r));
      map.stroke();
    }

    for (const c of state.cars) {
      if (c.police) dot(state, c.x, c.z, '#ff3344', 3.5);
      else dot(state, c.x, c.z, '#cccccc', 2);
    }
    if (mission && mission.active) {
      dot(state, mission.current.marker.x, mission.current.marker.z, '#ffd23f', 4.5);
    }

    // The player is an arrow at the centre, turned to his heading.
    map.save();
    map.translate(MAP_SIZE / 2, MAP_SIZE / 2);
    map.rotate(state.player.angle);
    map.fillStyle = '#22d4ee';
    map.beginPath();
    map.moveTo(0, -8);
    map.lineTo(5, 6);
    map.lineTo(-5, 6);
    map.closePath();
    map.fill();
    map.restore();
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
    const stars = Math.floor(state.wanted);
    starsEl.textContent = '★'.repeat(stars) + '☆'.repeat(5 - stars);
    healthEl.style.width = Math.max(0, state.health) + '%';
    healthEl.style.background = state.health > 35 ? '#3fe35e' : '#e33';
    objectiveEl.innerHTML = objectiveHtml(mission);
    speedoEl.style.display = state.playerCar ? 'block' : 'none';
    if (state.playerCar) {
      speedoEl.textContent = Math.round(Math.abs(state.playerSpeed) * 3.6) + ' km/h';
    }
    crossEl.style.display = !state.playerCar && state.screen === 'play' ? 'block' : 'none';
    drawMinimap(state, mission);
  }

  return { hud, showToast, showScreen, hideScreen, update };
}
