// VICETIDE sound: everything is synthesised with WebAudio at runtime —
// engine hum, police sirens, gunshots, the reward chime and a soft pad
// loop. There are no audio files in the game at all.

export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;
  let engineOsc = null;
  let engineGain = null;
  let musicTimer = null;

  // The context can only be created (and resumed) after a user gesture,
  // so every entry point funnels through here first.
  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    } catch {
      return false;
    }
    return true;
  }

  function tone(freq, dur, type = 'sine', vol = 0.2, slide = 0) {
    if (!ensure() || muted) return;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur);
  }

  function noise(dur, vol = 0.3) {
    if (!ensure() || muted) return;
    const len = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = vol;
    src.connect(gain);
    gain.connect(master);
    src.start();
  }

  function startEngine() {
    engineOsc = ctx.createOscillator();
    engineGain = ctx.createGain();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 50;
    engineGain.gain.value = 0;
    engineOsc.connect(engineGain);
    engineGain.connect(master);
    engineOsc.start();
  }

  function startMusic() {
    const melody = [220, 261.6, 329.6, 261.6, 196, 246.9, 293.7, 246.9];
    let step = 0;
    musicTimer = setInterval(() => {
      if (!muted) tone(melody[step++ % melody.length], 1.6, 'triangle', 0.05);
    }, 1800);
  }

  return {
    start() {
      if (!ensure()) return;
      if (ctx.state === 'suspended') ctx.resume();
      if (!engineOsc) startEngine();
      if (!musicTimer) startMusic();
    },
    engine(speed, on) {
      if (!ctx || !engineOsc) return;
      engineGain.gain.value = muted ? 0 : on ? 0.05 + Math.abs(speed) * 0.002 : 0;
      engineOsc.frequency.value = 50 + Math.abs(speed) * 3;
    },
    shot() {
      noise(0.12, 0.35);
      tone(160, 0.08, 'square', 0.15, -100);
    },
    siren() {
      tone(700, 0.35, 'sine', 0.07, 300);
      setTimeout(() => tone(950, 0.35, 'sine', 0.07, -300), 180);
    },
    cash() {
      tone(880, 0.15, 'sine', 0.2);
      setTimeout(() => tone(1320, 0.3, 'sine', 0.2), 110);
    },
    hit() {
      noise(0.06, 0.2);
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    get muted() {
      return muted;
    },
  };
}
