// Police AI: cruisers spawn with wanted level, chase and ram the player, bust on a sustained pin.
import * as THREE from 'three';
export function createPolice(scene,vehicles){
 const units=[];
 function spawn(state){const a=Math.random()*Math.PI*2,d=55;const car=vehicles.addCar(state.player.x+Math.sin(a)*d,state.player.z+Math.cos(a)*d,0,{police:true,color:0xffffff});car.speed=0;units.push(car);return car;}
 return{units,
  update(dt,state,audio){const want=Math.floor(state.wanted);
   while(units.length<want&&units.length<5)spawn(state);
   while(units.length>want){const c=units.pop();const i=vehicles.cars.indexOf(c);if(i>=0)vehicles.cars.splice(i,1);c.mesh.visible=false;}
   let pinning=false;
   for(const c of units){const dx=state.player.x-c.x,dz=state.player.z-c.z,dist=Math.hypot(dx,dz);
    const target=Math.atan2(dx,dz);let diff=((target-c.angle+Math.PI*3)%(Math.PI*2))-Math.PI;
    c.angle+=Math.max(-2.2*dt,Math.min(2.2*dt,diff));
    const top=26+state.wanted*3;c.speed+=((dist>6?top:4)-c.speed)*dt*1.2;
    c.x+=Math.sin(c.angle)*c.speed*dt;c.z+=Math.cos(c.angle)*c.speed*dt;
    c.mesh.position.set(c.x,0,c.z);c.mesh.rotation.y=c.angle;
    const bar=c.mesh.getObjectByName('lightbar');if(bar)bar.material.color.setHex(Math.floor(performance.now()/300)%2?0xff2244:0x2266ff);
    if(dist<7&&Math.abs(state.playerSpeed)<4)pinning=true;
    if(dist<3.2&&Math.abs(state.playerSpeed)>10){state.health-=18*dt;state.shake=0.4;}
   }
   if(units.length&&Math.floor(performance.now()/1400)!==Math.floor((performance.now()-dt*1000)/1400))audio.siren();
   if(pinning){state.bustTimer+=dt;if(state.bustTimer>2.2)state.busted=true;}else state.bustTimer=Math.max(0,state.bustTimer-dt);
  }};
}
