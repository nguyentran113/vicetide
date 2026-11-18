// Cars: low-poly meshes, arcade driving physics, AI traffic following the road grid, parked cars.
import * as THREE from 'three';
import { CITY, TUNING } from './config.js';
const CAR_COLORS=[0xe33f5e,0x3f7de3,0xf2c230,0x39c26a,0xf2f2f2,0x8a4fe3,0xff7a2a,0x2ad4c2];
export function makeCarMesh(color,police=false){
 const g=new THREE.Group();
 const body=new THREE.Mesh(new THREE.BoxGeometry(2,0.7,4.4),new THREE.MeshLambertMaterial({color:police?0xffffff:color}));body.position.y=0.65;g.add(body);
 const cabin=new THREE.Mesh(new THREE.BoxGeometry(1.7,0.6,2.1),new THREE.MeshLambertMaterial({color:police?0x14213d:0x223344}));cabin.position.set(0,1.25,-0.2);g.add(cabin);
 if(police){const stripe=new THREE.Mesh(new THREE.BoxGeometry(2.02,0.3,4.42),new THREE.MeshLambertMaterial({color:0x14213d}));stripe.position.y=0.5;g.add(stripe);
  const bar=new THREE.Mesh(new THREE.BoxGeometry(1.2,0.25,0.5),new THREE.MeshBasicMaterial({color:0xff2244}));bar.position.set(0,1.68,-0.2);bar.name='lightbar';g.add(bar);}
 const wg=new THREE.CylinderGeometry(0.42,0.42,0.3,8),wm=new THREE.MeshLambertMaterial({color:0x111111});
 const wheels=[];
 for(const [x,z] of[[-1,-1.5],[1,-1.5],[-1,1.5],[1,1.5]]){const w=new THREE.Mesh(wg,wm);w.rotation.z=Math.PI/2;w.position.set(x,0.42,z);g.add(w);wheels.push(w);}
 g.userData.wheels=wheels;return g;
}
export function createVehicles(scene,rng){
 const cars=[];
 function addCar(x,z,angle,opts={}){const police=!!opts.police;const mesh=makeCarMesh(opts.color??CAR_COLORS[rng.int(0,CAR_COLORS.length-1)],police);mesh.position.set(x,0,z);mesh.rotation.y=angle;scene.add(mesh);
  const car={mesh,x,z,angle,speed:0,police,parked:!!opts.parked,ai:!!opts.ai,health:100,driver:null,laneDir:opts.laneDir||1,axis:opts.axis||'z',targetSpeed:opts.targetSpeed||rng.range(9,15)};cars.push(car);return car;}
 // parked cars along streets
 for(let i=0;i<16;i++){const x=CITY.roads[rng.int(0,7)]+(rng.next()<0.5?-5.4:5.4);addCar(x,rng.range(-230,170),0,{parked:true});}
 // moving traffic on vertical + horizontal roads
 for(let i=0;i<12;i++){const vert=rng.next()<0.6;if(vert){const road=CITY.roads[rng.int(0,7)],dir=rng.next()<0.5?1:-1;addCar(road+dir*3.4,rng.range(-230,170),dir>0?0:Math.PI,{ai:true,axis:'z',laneDir:dir});}
  else{const road=CITY.roads[rng.int(0,6)],dir=rng.next()<0.5?1:-1;addCar(rng.range(-230,230),road+dir*3.4,dir>0?Math.PI/2:-Math.PI/2,{ai:true,axis:'x',laneDir:dir});}}
 return{cars,addCar,
  update(dt,state){for(const car of cars){if(car.parked||car===state.playerCar||car.police)continue;if(!car.ai)continue;
    car.speed+= (car.targetSpeed-car.speed)*dt*0.8;
    if(car.axis==='z'){car.z+=Math.cos(car.angle)*car.speed*dt; if(car.z>265){car.z=-255;} if(car.z<-260){car.z=255;}}
    else{car.x+=Math.sin(car.angle)*car.speed*dt; if(car.x>265)car.x=-255; if(car.x<-265)car.x=255;}
    car.mesh.position.set(car.x,0,car.z);car.mesh.rotation.y=car.angle;
    for(const w of car.mesh.userData.wheels)w.rotation.x+=car.speed*dt*2;}},
  drive(car,dt,input){ // arcade physics for the player-driven car
   if(input.up)car.speed+=TUNING.carAccel*dt; else if(input.down)car.speed-=TUNING.carAccel*0.7*dt; else car.speed*=Math.pow(0.4,dt);
   car.speed=Math.max(-TUNING.carReverse,Math.min(TUNING.carMax,car.speed));
   if(Math.abs(car.speed)>0.3){const steer=(input.left?1:0)-(input.right?1:0);car.angle+=steer*dt*1.5*(car.speed>0?1:-1)*Math.min(1,Math.abs(car.speed)/8);}
   car.x+=Math.sin(car.angle)*car.speed*dt; car.z+=Math.cos(car.angle)*car.speed*dt;
   car.x=Math.max(-262,Math.min(262,car.x)); car.z=Math.max(-262,Math.min(300,car.z));
   car.mesh.position.set(car.x,0,car.z);car.mesh.rotation.y=car.angle;
   for(const w of car.mesh.userData.wheels)w.rotation.x+=car.speed*dt*2; return car.speed;}
 };
}
