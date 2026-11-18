// Procedural WebAudio: engine hum, sirens, gunshots, reward chime, soft synth pad. No audio files.
export function createAudio(){let ctx=null,master=null,muted=false,engineOsc=null,engineGain=null,musicTimer=null;
 function ensure(){if(ctx)return true;try{ctx=new (window.AudioContext||window.webkitAudioContext)();master=ctx.createGain();master.gain.value=0.5;master.connect(ctx.destination);}catch{return false;}return true;}
 function tone(f,dur,type='sine',vol=0.2,slide=0){if(!ensure()||muted)return;const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.value=f;if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,f+slide),ctx.currentTime+dur);g.gain.setValueAtTime(vol,ctx.currentTime);g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+dur);o.connect(g);g.connect(master);o.start();o.stop(ctx.currentTime+dur);}
 function noise(dur,vol=0.3){if(!ensure()||muted)return;const len=ctx.sampleRate*dur,b=ctx.createBuffer(1,len,ctx.sampleRate),d=b.getChannelData(0);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*(1-i/len);const s=ctx.createBufferSource();s.buffer=b;const g=ctx.createGain();g.gain.value=vol;s.connect(g);g.connect(master);s.start();}
 return{start(){if(!ensure())return;if(ctx.state==='suspended')ctx.resume();
   if(!engineOsc){engineOsc=ctx.createOscillator();engineGain=ctx.createGain();engineOsc.type='sawtooth';engineOsc.frequency.value=50;engineGain.gain.value=0;engineOsc.connect(engineGain);engineGain.connect(master);engineOsc.start();}
   if(!musicTimer){const notes=[220,261.6,329.6,261.6,196,246.9,293.7,246.9];let i=0;musicTimer=setInterval(()=>{if(!muted)tone(notes[i++%notes.length],1.6,'triangle',0.05);},1800);}},
  engine(speed,on){if(!ctx||!engineOsc)return;engineGain.gain.value=muted?0:(on?0.05+Math.abs(speed)*0.002:0);engineOsc.frequency.value=50+Math.abs(speed)*3;},
  shot(){noise(0.12,0.35);tone(160,0.08,'square',0.15,-100);},
  siren(){tone(700,0.35,'sine',0.07,300);setTimeout(()=>tone(950,0.35,'sine',0.07,-300),180);},
  cash(){tone(880,0.15,'sine',0.2);setTimeout(()=>tone(1320,0.3,'sine',0.2),110);},
  hit(){noise(0.06,0.2);},
  toggleMute(){muted=!muted;if(master)master.gain.value=muted?0:0.5;return muted;},get muted(){return muted;}};}
