// VICETIDE — an original open-world crime game set in the fictional coastal city of Port Solano.
// Boot, main loop, crime/wanted system, combat, missions, screens, save/continue and screenshot staging.
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

const params=new URLSearchParams(location.search);
const shot=params.get('shot');
const seed=Number.parseInt(params.get('seed')??'1',10)||1;
const rng=createRandom(seed*7919+13);

const canvas=document.getElementById('c');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
function resize(){renderer.setSize(innerWidth,innerHeight);}addEventListener('resize',resize);resize();

const scene=new THREE.Scene();scene.background=new THREE.Color(COLORS.sky);scene.fog=new THREE.Fog(COLORS.fog,90,420);
const camera=new THREE.PerspectiveCamera(62,innerWidth/innerHeight,0.1,900);
const sun=new THREE.DirectionalLight(COLORS.sun,1.6);sun.position.set(-80,120,60);scene.add(sun);scene.add(new THREE.AmbientLight(0xffc9a0,0.85));
const city=buildCity(scene,rng);
const vehicles=createVehicles(scene,rng);
const peds=createPedestrians(scene,rng);
const player=createPlayer(scene);
const police=createPolice(scene,vehicles);
const missions=createMissions(scene);
const hud=createHud();const audio=createAudio();
// Marisol Vega, the mission giver NPC
const giver=makePerson(0xff5e8a);giver.position.set(GIVER.x,0,GIVER.z);scene.add(giver);
const heroCar=vehicles.addCar(6,34,Math.PI,{color:0xe33f5e});

const state={screen:'title',money:150,health:100,wanted:0,crimeHeat:0,hideTime:0,player,playerCar:null,playerSpeed:0,cars:vehicles.cars,bustTimer:0,busted:false,shake:0,phase:'giver',dead:false};
missions.beam.position.set(GIVER.x,20,GIVER.z);missions.ring.position.set(GIVER.x,0.4,GIVER.z);missions.beam.visible=missions.ring.visible=true;

function save(){try{localStorage.setItem(SAVE_KEY,JSON.stringify({money:state.money,mission:missions.index+(missions.active?0:1),done:state.phase==='done'}));}catch{}}
function loadSave(){try{return JSON.parse(localStorage.getItem(SAVE_KEY)||'null');}catch{return null;}}
function addWanted(n){state.wanted=Math.min(5,state.wanted+n);state.hideTime=0;}
function addMoney(n){state.money+=n;audio.cash();hud.showToast('+$'+n+' — job done! Balance $'+state.money);}

// ---------- input ----------
const keys={};let mouseDown=false;
addEventListener('keydown',e=>{keys[e.code]=true;
 if(e.code==='KeyM'){hud.showToast(audio.toggleMute()?'🔇 Muted':'🔊 Sound on');}
 if((e.code==='KeyP'||e.code==='Escape')&&state.screen==='play'){state.screen='paused';showPause();}
 else if((e.code==='KeyP'||e.code==='Escape')&&state.screen==='paused'){state.screen='play';hud.hideScreen();hud.hud.style.display='block';}
 if((e.code==='KeyE'||e.code==='KeyF')&&state.screen==='play')toggleCar();});
addEventListener('keyup',e=>keys[e.code]=false);
canvas.addEventListener('mousedown',()=>{if(state.screen==='play'&&!state.playerCar)doShoot();});
const input=()=>({up:keys.KeyW||keys.ArrowUp,down:keys.KeyS||keys.ArrowDown,left:keys.KeyA||keys.ArrowLeft,right:keys.KeyD||keys.ArrowRight,shift:keys.ShiftLeft||keys.ShiftRight});

function nearestCar(maxD){let best=null,bd=maxD;for(const c of vehicles.cars){const d=Math.hypot(c.x-player.x,c.z-player.z);if(d<bd){bd=d;best=c;}}return best;}
function toggleCar(){if(state.playerCar){const c=state.playerCar;state.playerCar=null;player.x=c.x+2.6;player.z=c.z;player.mesh.visible=true;audio.engine(0,false);}
 else{const c=nearestCar(4.5);if(c){if(!c.parked&&c.ai){/* stealing a moving car is a crime */} if(c.parked||c.ai){addWanted(c.ai?1:0.5);hud.showToast(c.ai?'🚗 Car jacked! +wanted':'🚗 You took a parked car.');}c.ai=false;c.parked=false;state.playerCar=c;player.mesh.visible=false;audio.start();}}}

function doShoot(){audio.start();audio.shot();addWanted(1);
 const targets=peds.peds.filter(p=>!p.dead).map(p=>({x:p.x,z:p.z,ped:p}));
 const hit=player.shoot(scene,camera,targets);
 if(hit){peds.kill(hit.ped);state.wanted=Math.min(5,state.wanted+1);hud.showToast('You shot a pedestrian!');}
 for(const p of peds.peds)if(Math.hypot(p.x-player.x,p.z-player.z)<14)p.flee=2;}

// ---------- screens ----------
function showTitle(){state.screen='title';const s=loadSave();
 hud.showScreen(`<h1>VICETIDE</h1><h2>Port Solano · an original open-world crime game</h2><p>${STORY_INTRO}</p>
 <p class="keys">🚶 WASD move · Shift run · Mouse click shoot (on foot)<br>🚗 E / F enter & exit car · WASD drive · Speedometer bottom-right<br>⭐ Crimes raise wanted stars · Hide to cool off · P pause · M mute</p>
 <br><button id="btnNew">▶ NEW GAME</button>${s?'<button id="btnCont">↩ CONTINUE ($'+s.money+', mission '+(s.mission+1)+')</button>':''}`);
 document.getElementById('btnNew').onclick=()=>startGame(false);
 const cont=document.getElementById('btnCont');if(cont)cont.onclick=()=>startGame(true);}
function showPause(){hud.showScreen(`<h1>⏸ PAUSED</h1><p>VICETIDE — Port Solano</p><p class="keys">WASD move/drive · E/F car · Click shoot · Shift run · M mute · P resume</p><button id="btnResume">▶ RESUME</button><button id="btnQuit">TITLE</button>`);
 document.getElementById('btnResume').onclick=()=>{state.screen='play';hud.hideScreen();};
 document.getElementById('btnQuit').onclick=()=>{hud.hud.style.display='none';showTitle();};}
function showEnd(kind){state.screen='over';hud.hud.style.display='none';audio.engine(0,false);
 const fined=kind==='busted'?Math.min(200,state.money):0;state.money-=fined;
 hud.showScreen(kind==='busted'?`<h1>🚔 BUSTED</h1><p>Solano PD pinned you down. Fine: $${fined}. Cash left: $${state.money}.</p><button id="btnAgain">TRY AGAIN</button>`
  :kind==='wasted'?`<h1>💀 WASTED</h1><p>You flatlined on the streets of Port Solano. Cash: $${state.money}.</p><button id="btnAgain">TRY AGAIN</button>`
  :`<h1>⛵ YOU ESCAPED!</h1><p>Rico boards the last boat out as Port Solano glitters behind him. Marisol's four jobs are done.</p><p>Final cash: <b>$${state.money}</b> · All 4 missions complete 🏆</p><button id="btnAgain">PLAY AGAIN</button>`);
 document.getElementById('btnAgain').onclick=()=>{state.health=100;state.wanted=0;state.busted=false;state.dead=false;state.bustTimer=0;player.x=0;player.z=26;if(state.playerCar){state.playerCar=null;player.mesh.visible=true;}hud.hud.style.display='block';state.screen='play';hud.hideScreen();};}
function startGame(cont){audio.start();hud.hideScreen();hud.hud.style.display='block';state.screen='play';
 if(cont){const s=loadSave();if(s){state.money=s.money;const idx=Math.min(3,s.mission||0);state.phase='mission';missions.start(idx);hud.showToast(MISSIONS[idx].from);return;}}
 state.money=150;state.health=100;state.wanted=0;state.phase='giver';missions.beam.visible=missions.ring.visible=true;missions.beam.position.set(GIVER.x,20,GIVER.z);missions.ring.position.set(GIVER.x,0.4,GIVER.z);
 hud.showToast('Find Marisol Vega — follow the gold beam!');}

// ---------- missions ----------
function missionTick(dt){const px=state.playerCar?state.playerCar.x:player.x,pz=state.playerCar?state.playerCar.z:player.z;
 if(state.phase==='giver'){if(Math.hypot(px-GIVER.x,pz-GIVER.z)<4){state.phase='mission';missions.start(0);hud.showToast(MISSIONS[0].from,6000);}return;}
 if(state.phase!=='mission'||!missions.active)return;
 const m=missions.current;
 if(m.need==='timed'){missions.timer-=dt;if(missions.timer<=0){hud.showToast('⏰ Too slow! Try the delivery again.');missions.timer=m.time;player.x=0;player.z=26;if(state.playerCar){state.playerCar=null;player.mesh.visible=true;}return;}}
 if(Math.hypot(px-m.marker.x,pz-m.marker.z)<7){
  if(m.need==='escape'&&state.wanted>2.5){hud.showToast('Too hot! Shake the police first, then hide here.');return;}
  addMoney(m.reward);const done=missions.index;missions.hide();
  if(done>=3){state.phase='done';save();showEnd('ending');return;}
  const next=done+1;missions.start(next);
  if(next===2){state.wanted=3;state.hideTime=-999;}
  hud.showToast(MISSIONS[next].from,6000);save();}
 if(missions.index===2)state.wanted=Math.max(state.wanted,2.6); // heat stays on during M3 until you reach the garage cooled
}

// ---------- per-frame update ----------
let camAngle=Math.PI;
function update(dt){const inp=input();
 if(state.playerCar){state.playerSpeed=vehicles.drive(state.playerCar,dt,inp);player.x=state.playerCar.x;player.z=state.playerCar.z;player.angle=state.playerCar.angle;camAngle=player.angle+Math.PI;audio.engine(state.playerSpeed,true);
  // running over pedestrians / crashing
  for(const p of peds.peds){if(!p.dead&&Math.abs(state.playerSpeed)>4&&Math.hypot(p.x-player.x,p.z-player.z)<1.9){peds.kill(p);addWanted(1);state.health-=2;audio.hit();hud.showToast('You ran someone over!');}}
  for(const c of vehicles.cars){if(c!==state.playerCar&&Math.hypot(c.x-player.x,c.z-player.z)<3.4&&Math.abs(state.playerSpeed)>8){state.playerSpeed*=-0.3;addWanted(0.5);state.health-=3;audio.hit();state.shake=0.3;}}
 } else {state.playerSpeed=player.speedNow;camAngle=player.angle+Math.PI;player.updateFoot(dt,inp,player.angle);audio.engine(0,false);}
 vehicles.update(dt,state);
 const threat=state.wanted>0||Math.abs(state.playerSpeed)>15?{x:player.x,z:player.z}:null;
 peds.update(dt,threat);
 police.update(dt,state,audio);
 // wanted decay when hidden from police
 const copNear=police.units.some(c=>Math.hypot(c.x-player.x,c.z-player.z)<30);
 if(state.wanted>0&&missions.index!==2||state.wanted>0&&state.phase!=='mission'){if(!copNear){state.hideTime+=dt;if(state.hideTime>7){state.wanted=Math.max(0,state.wanted-0.5);state.hideTime=0;if(state.wanted===0)hud.showToast('⭐ You lost the police.');}}else state.hideTime=0;}
 if(state.health<100&&state.wanted===0)state.health=Math.min(100,state.health+dt*2);
 missionTick(dt);
 // camera: chase / follow
 const target=state.playerCar||player;const dist=state.playerCar?10:7,height=state.playerCar?4.2:3.2;
 const cx=target.x-Math.sin(camAngle)*0+ -Math.sin(player.angle)*dist*-1; // behind player heading
 const bx=target.x-Math.sin(player.angle)*-dist, bz=target.z-Math.cos(player.angle)*-dist;
 camera.position.set(target.x+Math.sin(player.angle)*-dist, height, target.z+Math.cos(player.angle)*-dist);
 if(state.shake>0){state.shake-=dt;camera.position.x+=(Math.random()-0.5)*state.shake;camera.position.y+=(Math.random()-0.5)*state.shake;}
 camera.lookAt(target.x,1.4,target.z);
 if(city.sea)city.sea.position.y=0.02+Math.sin(performance.now()*0.001)*0.05;
 missions.beam.rotation.y+=dt;missions.ring.rotation.z+=dt;
 hud.update(state,missions.active?missions:(state.phase==='giver'?{active:true,current:{title:'Meet Marisol Vega',text:'Go to the gold beam by the palms to meet marina fixer Marisol Vega.',marker:GIVER},timer:0}:null));
 if(state.busted)showEnd('busted'); else if(state.health<=0&&!state.dead){state.dead=true;showEnd('wasted');}
}

// ---------- screenshot staging ----------
function stageShot(name){hud.hud.style.display='block';state.screen='play';hud.hideScreen();
 if(name==='title'){hud.hud.style.display='none';showTitle();camera.position.set(40,26,150);camera.lookAt(0,10,-40);return;}
 if(name==='drive'){state.playerCar=heroCar;heroCar.x=3.4;heroCar.z=-40;heroCar.angle=0;heroCar.speed=16;heroCar.mesh.position.set(3.4,0,-40);heroCar.mesh.rotation.y=0;player.mesh.visible=false;player.x=3.4;player.z=-40;player.angle=0;state.playerSpeed=16;state.money=650;missions.start(1);missions.timer=52;state.phase='mission';
  const ahead=vehicles.cars.find(c=>c.ai);if(ahead){ahead.x=-3.4;ahead.z=-14;ahead.angle=0;ahead.mesh.position.set(-3.4,0,-14);ahead.mesh.rotation.y=0;}
  camera.position.set(3.4,4.2,-52);camera.lookAt(3.4,1.2,-30);hud.update(state,missions);return;}
 if(name==='foot'){player.x=8;player.z=8;player.angle=Math.PI*0.8;player.mesh.position.set(8,0,8);player.mesh.rotation.y=player.angle;state.money=400;missions.start(0);state.phase='mission';
  for(let i=0;i<8;i++){const p=peds.peds[i];if(p){p.x=4+i*1.6;p.z=14+((i%3)*2);p.mesh.position.set(p.x,0,p.z);}}
  camera.position.set(8+Math.sin(player.angle)*-8,3.4,8+Math.cos(player.angle)*-8);camera.lookAt(8,1.3,8);hud.update(state,missions);return;}
 if(name==='chase'){state.wanted=4;state.playerCar=heroCar;heroCar.x=-30;heroCar.z=183.4;heroCar.angle=Math.PI/2;heroCar.speed=24;heroCar.mesh.position.set(-30,0,183.4);heroCar.mesh.rotation.y=Math.PI/2;player.mesh.visible=false;player.x=-30;player.z=183.4;player.angle=Math.PI/2;state.playerSpeed=24;state.money=1250;state.health=62;missions.start(3);state.phase='mission';
  const copSpots=[[-13,183.4],[-3,177.6],[-38,177.9]];
  for(const [cx,cz] of copSpots){const c=vehicles.addCar(cx,cz,Math.PI/2,{police:true});c.angle=Math.PI/2;c.mesh.rotation.y=Math.PI/2;police.units.push(c);}
  camera.position.set(-44,4.5,183.4);camera.lookAt(-16,1.2,183.4);hud.update(state,missions);return;}
}
if(shot){stageShot(shot);let frames=0;(function paint(){renderer.render(scene,camera);if(++frames>=3)window.__shotReady=true;else requestAnimationFrame(paint);})();}
else{showTitle();let last=performance.now();(function loop(now){requestAnimationFrame(loop);const dt=Math.min(0.05,(now-last)/1000);last=now;if(state.screen==='play')update(dt);else if(state.screen==='title'){camera.position.set(Math.sin(now*0.00008)*70,26,120);camera.lookAt(0,12,-30);}renderer.render(scene,camera);})(performance.now());}
