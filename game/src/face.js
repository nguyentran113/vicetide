// face.js — everything drawn over the 3D view (round 5 design).
// Cash, stars, speedo and the current objective are plain DOM; the
// minimap is a 2D canvas sketch of the grid redrawn each frame with
// blips for Rico, the job marker and any cruisers in range.

export function createFace() {
  const el = (id) => document.getElementById(id);
  const hud = el('hud');
  const moneyEl = el('money');
  const starsEl = el('stars');
  const speedEl = el('speed');
  const objEl = el('objective');
  const toastEl = el('toast');
  const bustEl = el('bustfill');
  const map = el('minimap');
  const mctx = map.getContext('2d');
  let toastTimer = null;

  return {
    showHud() { hud.hidden = false; },
    hideHud() { hud.hidden = true; },
    money(n) { moneyEl.textContent = '$' + Math.max(0, Math.round(n)).toLocaleString('en-US'); },
    stars(n) {
      starsEl.textContent = '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n);
      starsEl.style.opacity = n > 0 ? '1' : '0.25';
    },
    speed(kmh) {
      if (kmh === null) { speedEl.textContent = ''; return; }
      speedEl.textContent = Math.round(Math.abs(kmh)) + ' km/h';
    },
    objective(text) { if (objEl.textContent !== text) objEl.textContent = text; },
    toast(text, ms = 3400) {
      toastEl.textContent = text;
      toastEl.classList.add('show');
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toastEl.classList.remove('show'), ms);
    },
    bust(frac) { bustEl.style.width = (frac * 100).toFixed(0) + '%'; },
    map(world, player, marker, cops) {
      const S = map.width;
      const half = world.edge + 8;
      const toPx = (v) => ((v + half) / (2 * half)) * S;
      mctx.fillStyle = 'rgba(24,34,40,0.88)';
      mctx.fillRect(0, 0, S, S);
      mctx.fillStyle = '#e9d8a6';
      mctx.fillRect(0, toPx(world.beachZ), S, toPx(world.seaZ) - toPx(world.beachZ));
      mctx.fillStyle = '#146b8a';
      mctx.fillRect(0, toPx(world.seaZ), S, S - toPx(world.seaZ));
      mctx.strokeStyle = 'rgba(220,225,230,0.5)';
      mctx.lineWidth = 2;
      for (const x of world.avenues) {
        mctx.beginPath(); mctx.moveTo(toPx(x), 0); mctx.lineTo(toPx(x), toPx(world.beachZ)); mctx.stroke();
      }
      for (const z of world.streets) {
        mctx.beginPath(); mctx.moveTo(0, toPx(z)); mctx.lineTo(S, toPx(z)); mctx.stroke();
      }
      const blip = (x, z, color, r) => {
        mctx.fillStyle = color;
        mctx.beginPath();
        mctx.arc(toPx(x), toPx(z), r, 0, Math.PI * 2);
        mctx.fill();
      };
      for (const cop of cops) blip(cop.pos.x, cop.pos.z, '#5b8cff', 3);
      if (marker) {
        const pulse = 4.5 + Math.sin(performance.now() / 240) * 1.4;
        blip(marker.x, marker.z, '#ffd23e', pulse);
      }
      blip(player.x, player.z, '#ffffff', 4);
    },
  };
}
