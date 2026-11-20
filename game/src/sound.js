// sound.js — a pocket WebAudio synth for Vicetide (round 5 design).
// No audio files: the engine is a detuned saw pair behind a lowpass,
// the siren a square wave whose pitch a slow LFO rocks between two
// tones, gunshots are shaped noise bursts, and the title screen gets
// a soft three-note pad. Everything starts lazily on first input,
// because browsers refuse audio before a gesture.

export function createSound() {
  let ac = null;
  let engineOsc = null;
  let engineSub = null;
  let engineGain = null;
  let engineFilter = null;
  let sirenOsc = null;
  let sirenGain = null;
  let sirenLfo = null;
  let padNodes = [];

  function ensure() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return true; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ac = new AC();
    return true;
  }

  function startEngine() {
    if (!ensure() || engineOsc) return;
    engineOsc = ac.createOscillator();
    engineOsc.type = 'sawtooth';
    engineSub = ac.createOscillator();
    engineSub.type = 'square';
    engineFilter = ac.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 320;
    engineGain = ac.createGain();
    engineGain.gain.value = 0;
    engineOsc.connect(engineFilter);
    engineSub.connect(engineFilter);
    engineFilter.connect(engineGain);
    engineGain.connect(ac.destination);
    engineOsc.start();
    engineSub.start();
  }

  return {
    unlock() { ensure(); },
    pad(on) {
      if (!ensure()) return;
      if (on && padNodes.length === 0) {
        for (const f of [196, 246.9, 293.7]) {
          const o = ac.createOscillator();
          o.type = 'triangle';
          o.frequency.value = f;
          const gn = ac.createGain();
          gn.gain.value = 0.028;
          o.connect(gn); gn.connect(ac.destination);
          o.start();
          padNodes.push(o, gn);
        }
      } else if (!on) {
        for (const n of padNodes) { try { n.stop ? n.stop() : n.disconnect(); } catch (e) { /* already stopped */ } }
        padNodes = [];
      }
    },
    engine(on, speedNorm) {
      if (on) startEngine();
      if (!engineOsc) return;
      const t = ac.currentTime;
      if (on) {
        const f = 52 + speedNorm * 165;
        engineOsc.frequency.setTargetAtTime(f, t, 0.06);
        engineSub.frequency.setTargetAtTime(f * 0.5 + 1.5, t, 0.06);
        engineFilter.frequency.setTargetAtTime(280 + speedNorm * 900, t, 0.08);
        engineGain.gain.setTargetAtTime(0.05 + speedNorm * 0.075, t, 0.09);
      } else {
        engineGain.gain.setTargetAtTime(0, t, 0.1);
      }
    },
    siren(on) {
      if (!ensure()) return;
      if (on && !sirenOsc) {
        sirenOsc = ac.createOscillator();
        sirenOsc.type = 'square';
        sirenOsc.frequency.value = 780;
        sirenLfo = ac.createOscillator();
        sirenLfo.type = 'triangle';
        sirenLfo.frequency.value = 0.55;
        const lfoGain = ac.createGain();
        lfoGain.gain.value = 170;
        sirenLfo.connect(lfoGain);
        lfoGain.connect(sirenOsc.frequency);
        sirenGain = ac.createGain();
        sirenGain.gain.value = 0.016;
        sirenOsc.connect(sirenGain);
        sirenGain.connect(ac.destination);
        sirenOsc.start();
        sirenLfo.start();
      } else if (!on && sirenOsc) {
        try { sirenOsc.stop(); sirenLfo.stop(); } catch (e) { /* noop */ }
        sirenOsc = null; sirenLfo = null;
      }
    },
    shot() {
      if (!ensure()) return;
      const dur = 0.14;
      const buffer = ac.createBuffer(1, ac.sampleRate * dur, ac.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      const src = ac.createBufferSource();
      src.buffer = buffer;
      const gn = ac.createGain();
      gn.gain.value = 0.22;
      const flt = ac.createBiquadFilter();
      flt.type = 'highpass';
      flt.frequency.value = 320;
      src.connect(flt); flt.connect(gn); gn.connect(ac.destination);
      src.start();
    },
    chime() {
      if (!ensure()) return;
      const o = ac.createOscillator();
      o.type = 'sine';
      o.frequency.value = 880;
      const gn = ac.createGain();
      gn.gain.setValueAtTime(0.09, ac.currentTime);
      gn.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.5);
      o.connect(gn); gn.connect(ac.destination);
      o.start();
      o.stop(ac.currentTime + 0.55);
      const o2 = ac.createOscillator();
      o2.type = 'sine';
      o2.frequency.value = 1318;
      const g2 = ac.createGain();
      g2.gain.setValueAtTime(0.07, ac.currentTime + 0.09);
      g2.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.6);
      o2.connect(g2); g2.connect(ac.destination);
      o2.start(ac.currentTime + 0.09);
      o2.stop(ac.currentTime + 0.65);
    },
  };
}
