// HUD: DOM panels + 2D canvas minimap (roads, player arrow, cars, police, mission marker).
import { CITY } from './config.js';
export function createHud(){
 const el=id=>document.getElementById(id);
 const hud=el('hud'),money=el('money'),stars=el('stars'),health=el('healthBar'),objective=el('objective'),speedo=el('speedo'),toast=el('toast'),cross=el('cross'),screen=el('screen'),card=el('card');
 const mm=el('minimap').getContext('2d');
 let toastTimer=null;
 function showToast(msg,ms=3200){toast.textContent=msg;clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.textContent='',ms);}
 function showScreen(html){screen.style.display='flex';card.innerHTML=html;}
 function hideScreen(){screen.style.display='none';}
 function drawMinimap(state,mission){const S=190,cx=S/2,cy=S/2,scale=S/560;
  mm.fillStyle='#1d4d2b';mm.fillRect(0,0,S,S);
  mm.fillStyle='#f2d492';mm.fillRect(0,cy+(195-state.player.z)*scale,S,60*scale);
  mm.fillStyle='#1e90c8';mm.fillRect(0,cy+(245-state.player.z)*scale,S,80);
  mm.strokeStyle='#3a3a46';mm.lineWidth=5;
  for(const r of CITY.roads){mm.beginPath();mm.moveTo(cx+(r-state.player.x)*scale,0);mm.lineTo(cx+(r-state.player.x)*scale,S);mm.stroke();mm.beginPath();mm.moveTo(0,cy+(r-state.player.z)*scale);mm.lineTo(S,cy+(r-state.player.z)*scale);mm.stroke();}
  const dot=(x,z,col,r=3)=>{mm.fillStyle=col;mm.beginPath();mm.arc(cx+(x-state.player.x)*scale,cy+(z-state.player.z)*scale,r,0,7);mm.fill();};
  for(const c of state.cars)if(!c.police)dot(c.x,c.z,'#cccccc',2);
  for(const c of state.cars)if(c.police)dot(c.x,c.z,'#ff3344',3.5);
  if(mission&&mission.active)dot(mission.current.marker.x,mission.current.marker.z,'#ffd23f',4.5);
  // player arrow
  mm.save();mm.translate(cx,cy);mm.rotate(state.player.angle);mm.fillStyle='#22d4ee';mm.beginPath();mm.moveTo(0,-8);mm.lineTo(5,6);mm.lineTo(-5,6);mm.closePath();mm.fill();mm.restore();}
 return{hud,showToast,showScreen,hideScreen,
  update(state,mission){money.textContent='$'+state.money;
   stars.textContent='★'.repeat(Math.floor(state.wanted))+'☆'.repeat(5-Math.floor(state.wanted));
   health.style.width=Math.max(0,state.health)+'%';health.style.background=state.health>35?'#3fe35e':'#e33';
   objective.innerHTML=mission&&mission.active?('<b>'+mission.current.title+'</b><br>'+mission.current.text+(mission.timer>0?(' · ⏱ '+Math.ceil(mission.timer)+'s'):'')):'Free roam — find Marisol Vega (gold marker) or explore Port Solano.';
   speedo.style.display=state.playerCar?'block':'none';if(state.playerCar)speedo.textContent=Math.round(Math.abs(state.playerSpeed)*3.6)+' km/h';
   cross.style.display=!state.playerCar&&state.screen==='play'?'block':'none';
   drawMinimap(state,mission);}};
}
