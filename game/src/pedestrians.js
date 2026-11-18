// Pedestrians: simple articulated figures strolling sidewalks; they flee danger and fall when hit/shot.
import * as THREE from 'three';
import { CITY } from './config.js';
const SHIRTS=[0xff5e8a,0x3fd4e3,0xffe27a,0x7dff8a,0xff9a3f,0xf2f2f2,0xb48aff];
export function makePerson(color){const g=new THREE.Group();
 const legs=new THREE.Mesh(new THREE.BoxGeometry(0.55,0.8,0.3),new THREE.MeshLambertMaterial({color:0x2b3a55}));legs.position.y=0.4;g.add(legs);
 const torso=new THREE.Mesh(new THREE.BoxGeometry(0.65,0.75,0.35),new THREE.MeshLambertMaterial({color}));torso.position.y=1.15;g.add(torso);
 const head=new THREE.Mesh(new THREE.SphereGeometry(0.24,8,6),new THREE.MeshLambertMaterial({color:0xf2c49a}));head.position.y=1.75;g.add(head);return g;}
export function createPedestrians(scene,rng){
 const peds=[];
 function addPed(x,z){const mesh=makePerson(SHIRTS[rng.int(0,SHIRTS.length-1)]);mesh.position.set(x,0,z);scene.add(mesh);
  const ped={mesh,x,z,angle:rng.range(0,Math.PI*2),speed:rng.range(1,2.2),dead:false,flee:0,axis:rng.next()<0.5?'x':'z',road:CITY.roads[rng.int(0,7)],side:rng.next()<0.5?-8.2:8.2,dir:rng.next()<0.5?1:-1};peds.push(ped);return ped;}
 for(let i=0;i<26;i++){const road=CITY.roads[rng.int(0,7)];addPed(road+(rng.next()<0.5?-8.2:8.2),rng.range(-240,180));}
 return{peds,addPed,update(dt,threat){for(const p of peds){if(p.dead)continue;
   let sp=p.speed,ang=p.angle;
   if(threat&&Math.hypot(p.x-threat.x,p.z-threat.z)<16){p.flee=2;}
   if(p.flee>0){p.flee-=dt;sp=6;const dx=p.x-threat.x,dz=p.z-threat.z;ang=Math.atan2(dx,dz);}
   else if(p.axis==='z'){p.z+=p.dir*sp*dt;if(p.z>185||p.z<-250)p.dir*=-1;p.x=p.road+p.side;ang=p.dir>0?0:Math.PI;}
   else{p.x+=p.dir*sp*dt;if(p.x>255||p.x<-255)p.dir*=-1;ang=p.dir>0?Math.PI/2:-Math.PI/2;}
   if(p.flee>0){p.x+=Math.sin(ang)*sp*dt;p.z+=Math.cos(ang)*sp*dt;}
   p.angle=ang;p.mesh.position.set(p.x,0,p.z);p.mesh.rotation.y=ang;
   p.mesh.position.y=Math.abs(Math.sin(performance.now()*0.012+p.x))*0.06;}},
  kill(p){if(p.dead)return;p.dead=true;p.mesh.rotation.x=Math.PI/2;p.mesh.position.y=0.25;}};
}
