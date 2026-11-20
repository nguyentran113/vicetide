// All of VICETIDE's sound is manufactured live with WebAudio — there
// is not a single audio file in the game. One master gain feeds the
// speakers; on top of it sit a sawtooth engine voice whose pitch
// tracks road speed, a slow triangle-wave music loop, and a handful
// of one-shot effects (gunshot, siren wail, cash chime, thud) built
// from oscillators and shaped noise.
//
// Browsers refuse to start an AudioContext before a user gesture, so
// nothing is built until the first start() call, and every effect
// re-checks that the context exists before touching it.

export function createAudio() {
  let ac = null;
  let bus = null;
  let isMuted = false;
  let engineNode = null;
  let engineLevel = null;
  let musicClock = null;

  function boot() {
    if (ac) return true;
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      ac = new Ctor();
      bus = ac.createGain();
      bus.gain.value = 0.5;
      bus.connect(ac.destination);
    } catch {
      return false;
    }
    return true;
  }

  function blip(freq, dur, shape = 'sine', vol = 0.2, glide = 0) {
    if (!boot() || isMuted) return;
    const t = ac.currentTime;
    const osc = ac.createOscillator();
    const amp = ac.createGain();
    osc.type = shape;
    osc.frequency.setValueAtTime(freq, t);
    if (glide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + glide), t + dur);
    amp.gain.setValueAtTime(vol, t);
    amp.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(amp);
    amp.connect(bus);
    osc.start(t);
    osc.stop(t + dur);
  }

  function burst(dur, vol = 0.3) {
    if (!boot() || isMuted) return;
    const frames = Math.floor(ac.sampleRate * dur);
    const buffer = ac.createBuffer(1, frames, ac.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) samples[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    const src = ac.createBufferSource();
    src.buffer = buffer;
    const amp = ac.createGain();
    amp.gain.value = vol;
    src.connect(amp);
    amp.connect(bus);
    src.start();
  }

  function startEngineVoice() {
    engineNode = ac.createOscillator();
    engineLevel = ac.createGain();
    engineNode.type = 'sawtooth';
    engineNode.frequency.value = 50;
    engineLevel.gain.value = 0;
    engineNode.connect(engineLevel);
    engineLevel.connect(bus);
    engineNode.start();
  }

  function startMusicLoop() {
    const line = [220, 261.6, 329.6, 261.6, 196, 246.9, 293.7, 246.9];
    let step = 0;
    musicClock = setInterval(() => {
      if (!isMuted) blip(line[step++ % line.length], 1.6, 'triangle', 0.05);
    }, 1800);
  }

  return {
    start() {
      if (!boot()) return;
      if (ac.state === 'suspended') ac.resume();
      if (!engineNode) startEngineVoice();
      if (!musicClock) startMusicLoop();
    },
    engine(speed, running) {
      if (!ac || !engineNode) return;
      engineLevel.gain.value = isMuted ? 0 : running ? 0.05 + Math.abs(speed) * 0.002 : 0;
      engineNode.frequency.value = 50 + Math.abs(speed) * 3;
    },
    shot() {
      burst(0.12, 0.35);
      blip(160, 0.08, 'square', 0.15, -100);
    },
    siren() {
      blip(700, 0.35, 'sine', 0.07, 300);
      setTimeout(() => blip(950, 0.35, 'sine', 0.07, -300), 180);
    },
    cash() {
      blip(880, 0.15, 'sine', 0.2);
      setTimeout(() => blip(1320, 0.3, 'sine', 0.2), 110);
    },
    hit() {
      burst(0.06, 0.2);
    },
    toggleMute() {
      isMuted = !isMuted;
      if (bus) bus.gain.value = isMuted ? 0 : 0.5;
      return isMuted;
    },
    get muted() {
      return isMuted;
    },
  };
}
