// Player: third-person on-foot movement, entering/exiting cars, pistol shooting with raycast + muzzle flash.
import * as THREE from 'three';
import { TUNING } from './config.js';
import { makePerson } from './pedestrians.js';
export function createPlayer(scene){
 const mesh=makePerson(0x22d4ee);scene.add(mesh);
 const gun=new THREE.Mesh(new THREE.BoxGeometry(0.12,0.12,0.5),new THREE.MeshLambertMaterial({color:0x181818}));gun.position.set(0.42,1.25,0.3);mesh.add(gun);
 const flash=new THREE.Mesh(new THREE.SphereGeometry(0.22,6,6),new THREE.MeshBasicMaterial({color:0xffcc33}));flash.position.set(0.42,1.25,0.65);flash.visible=false;mesh.add(flash);
 return{mesh,flash,x:0,z:26,angle:Math.PI,speedNow:0,
  updateFoot(dt,input,cameraAngle){const run=input.shift?TUNING.runSpeed:TUNING.walkSpeed;let mx=0,mz=0;
   if(input.up){mx+=Math.sin(cameraAngle);mz+=Math.cos(cameraAngle);} if(input.down){mx-=Math.sin(cameraAngle);mz-=Math.cos(cameraAngle);}
   if(input.left){mx+=Math.cos(cameraAngle);mz-=Math.sin(cameraAngle);} if(input.right){mx-=Math.cos(cameraAngle);mz+=Math.sin(cameraAngle);}
   const len=Math.hypot(mx,mz);this.speedNow=len>0?run:0;
   if(len>0){mx/=len;mz/=len;this.x+=mx*run*dt;this.z+=mz*run*dt;this.angle=Math.atan2(mx,mz);}
   this.x=Math.max(-262,Math.min(262,this.x));this.z=Math.max(-262,Math.min(305,this.z));
   mesh.position.set(this.x,Math.abs(Math.sin(performance.now()*0.014))*(this.speedNow?0.07:0),this.z);mesh.rotation.y=this.angle;},
  shoot(scene,camera,targets){flash.visible=true;setTimeout(()=>flash.visible=false,50);
   const dir=new THREE.Vector3();camera.getWorldDirection(dir);
   const origin=new THREE.Vector3(this.x,1.4,this.z);
   let best=null,bd=90;for(const t of targets){const to=new THREE.Vector3(t.x-origin.x,0,t.z-origin.z);const d=to.length();const dot=to.normalize().dot(new THREE.Vector3(dir.x,0,dir.z).normalize());if(dot>0.985&&d<bd){bd=d;best=t;}}
   // spark at hit point
   const spark=new THREE.Mesh(new THREE.SphereGeometry(0.3,6,6),new THREE.MeshBasicMaterial({color:0xffaa22}));const hp=best?new THREE.Vector3(best.x,1,best.z):origin.clone().add(dir.multiplyScalar(30));spark.position.copy(hp);scene.add(spark);setTimeout(()=>scene.remove(spark),120);
   return best;}
 };
}
