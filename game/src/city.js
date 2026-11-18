// Procedural Port Solano: road grid, sidewalks, varied towers, palms, lamps, beach and sea.
import * as THREE from 'three';
import { CITY } from './config.js';
export function buildCity(scene,rng){
 const mats={road:new THREE.MeshLambertMaterial({color:0x2e2e38}),walk:new THREE.MeshLambertMaterial({color:0xb8a88f}),grass:new THREE.MeshLambertMaterial({color:0x3f9e4d}),sand:new THREE.MeshLambertMaterial({color:0xf2d492}),sea:new THREE.MeshLambertMaterial({color:0x1e90c8}),line:new THREE.MeshBasicMaterial({color:0xf7e08a})};
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(620,420),mats.grass);ground.rotation.x=-Math.PI/2;ground.position.set(0,-0.05,-20);scene.add(ground);
 // roads: vertical + horizontal asphalt strips with dashed centre lines
 for(const x of CITY.roads){const r=new THREE.Mesh(new THREE.PlaneGeometry(14,470),mats.road);r.rotation.x=-Math.PI/2;r.position.set(x,0,-15);scene.add(r);
  for(let z=-240;z<200;z+=16){const d=new THREE.Mesh(new THREE.PlaneGeometry(0.5,7),mats.line);d.rotation.x=-Math.PI/2;d.position.set(x,0.02,z);scene.add(d);}}
 for(const z of CITY.roads.filter(v=>v<190)){const r=new THREE.Mesh(new THREE.PlaneGeometry(560,14),mats.road);r.rotation.x=-Math.PI/2;r.position.set(0,0,z);scene.add(r);
  for(let x=-260;x<260;x+=16){const d=new THREE.Mesh(new THREE.PlaneGeometry(7,0.5),mats.line);d.rotation.x=-Math.PI/2;d.position.set(x,0.02,z);scene.add(d);}}
 // sidewalks along roads
 const walkGeo=new THREE.BoxGeometry(2.2,0.18,470);
 for(const x of CITY.roads)for(const s of[-8.2,8.2]){const w=new THREE.Mesh(walkGeo,mats.walk);w.position.set(x+s,0.09,-15);scene.add(w);}
 // buildings in each block with varied height / colour
 const palette=[0xffd9a0,0xff9e7a,0x7ae7ff,0xf7f0d0,0xffb3c8,0xc8b8ff,0xa0e8b0,0xffe27a];
 const winMat=new THREE.MeshBasicMaterial({color:0xfff6b0});
 for(let bx=-210;bx<=210;bx+=60)for(let bz=-210;bz<=150;bz+=60){
   const n=rng.int(1,3);
   for(let i=0;i<n;i++){const w=rng.range(16,26),d=rng.range(16,26),h=rng.range(12,64);
     const col=palette[rng.int(0,palette.length-1)];
     const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshLambertMaterial({color:col}));
     b.position.set(bx+rng.range(-12,12),h/2,bz+rng.range(-12,12));scene.add(b);
     // lit windows: small bright planes on one face
     for(let wy=3;wy<h-2;wy+=4){const win=new THREE.Mesh(new THREE.PlaneGeometry(1.6,1.6),winMat);win.position.set(b.position.x,wy,b.position.z+d/2+0.06);scene.add(win);}
   }}
 // palm trees + street lamps along streets
 const trunkM=new THREE.MeshLambertMaterial({color:0x8a5a2b}),leafM=new THREE.MeshLambertMaterial({color:0x1fa84f});
 const trunkG=new THREE.CylinderGeometry(0.25,0.4,6,5),leafG=new THREE.ConeGeometry(3,1.6,6);
 for(let i=0;i<70;i++){const x=CITY.roads[rng.int(0,7)]+ (rng.next()<0.5?-10:10),z=rng.range(-250,185);
   const t=new THREE.Mesh(trunkG,trunkM);t.position.set(x,3,z);t.rotation.z=0.08;scene.add(t);
   const l=new THREE.Mesh(leafG,leafM);l.position.set(x+0.4,6.4,z);scene.add(l);}
 const lampM=new THREE.MeshLambertMaterial({color:0x444455}),bulbM=new THREE.MeshBasicMaterial({color:0xffe9a0});
 for(const x of CITY.roads)for(let z=-240;z<190;z+=45){const p=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.12,5,5),lampM);p.position.set(x+7.5,2.5,z);scene.add(p);const b=new THREE.Mesh(new THREE.SphereGeometry(0.4,6,6),bulbM);b.position.set(x+7.5,5.1,z);scene.add(b);}
 // beach + sea + pier
 const sand=new THREE.Mesh(new THREE.PlaneGeometry(620,60),mats.sand);sand.rotation.x=-Math.PI/2;sand.position.set(0,0.01,CITY.beachZ+25);scene.add(sand);
 const sea=new THREE.Mesh(new THREE.PlaneGeometry(620,150),mats.sea);sea.rotation.x=-Math.PI/2;sea.position.set(0,0.02,CITY.seaZ+70);sea.name='sea';scene.add(sea);
 const pierM=new THREE.MeshLambertMaterial({color:0x9a6a3a});
 for(let i=0;i<8;i++){const p=new THREE.Mesh(new THREE.BoxGeometry(3,0.5,10),pierM);p.position.set(150,0.4,CITY.seaZ+10+i*11);scene.add(p);}
 // marina marker boats
 const hullM=new THREE.MeshLambertMaterial({color:0xffffff}),mastM=new THREE.MeshLambertMaterial({color:0x888888});
 for(let i=0;i<5;i++){const g=new THREE.Group();const h=new THREE.Mesh(new THREE.BoxGeometry(3,1.2,8),hullM);h.position.y=0.6;g.add(h);const m=new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.1,7,5),mastM);m.position.y=4;g.add(m);g.position.set(130+i*11,0,CITY.seaZ+18);scene.add(g);}
 return{sea};
}
export function nearestRoad(v){let best=CITY.roads[0],bd=1e9;for(const r of CITY.roads){const d=Math.abs(v-r);if(d<bd){bd=d;best=r;}}return best;}
