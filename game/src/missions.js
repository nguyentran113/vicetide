// The story of VICETIDE: four jobs for marina fixer Marisol Vega.
// Each entry names its map marker, the payout, and the completion rule
// the mission tracker in main.js enforces:
//   reach  — just get to the marker
//   timed  — get there before the countdown runs out
//   escape — get there with the wanted level cooled down first

import * as THREE from 'three';

export const MISSIONS = [
  {
    title: 'M1 · The Sunken Parcel',
    text: 'Meet Marisol Vega by the palms, then collect her parcel at the west warehouse.',
    from: 'Marisol: "Rico, the tide took my parcel to the west warehouse. Bring it back — no questions."',
    reward: 250,
    marker: { x: -186, z: -126 },
    need: 'reach',
  },
  {
    title: 'M2 · Golden Hour Delivery',
    text: 'Deliver the parcel to the rooftop café on the east side before the timer runs out!',
    from: 'Marisol: "A buyer waits east. Golden hour waits for nobody — drive!"',
    reward: 400,
    marker: { x: 186, z: 66 },
    need: 'timed',
    time: 75,
  },
  {
    title: 'M3 · Heat on the Boulevard',
    text: 'You are at 3 stars! Shake the police and reach the hideout garage downtown.',
    from: 'Marisol: "That delivery was hot! Lose the heat, then hide in the downtown garage."',
    reward: 600,
    marker: { x: -6, z: -66 },
    need: 'escape',
  },
  {
    title: 'M4 · Last Boat Out',
    text: 'Final run: reach the marina pier and board the last boat out of Port Solano.',
    from: 'Marisol: "One last run, Rico. The boat at the marina leaves tonight. Go!"',
    reward: 1000,
    marker: { x: 150, z: 262 },
    need: 'reach',
  },
];

export const STORY_INTRO =
  "Port Solano, golden hour. You are Rico Marín, a broke wheelman. Marina fixer Marisol Vega offers four jobs that could buy your way out — or put you in cuffs. Steal rides, dodge the Solano PD, and catch the last boat out.";

// The gold beacon pair (a translucent pillar plus a ground ring) that
// marks wherever the current job wants the player to go.
export function createMissions(scene) {
  const beamMaterial = new THREE.MeshBasicMaterial({
    color: 0xffd23f,
    transparent: true,
    opacity: 0.4,
    side: THREE.DoubleSide,
  });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 40, 10, 1, true), beamMaterial);
  beam.position.y = 20;
  scene.add(beam);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(3, 0.3, 8, 20),
    new THREE.MeshBasicMaterial({ color: 0xffd23f }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.4;
  scene.add(ring);

  const tracker = {
    beam,
    ring,
    index: 0,
    timer: 0,
    active: false,
    start(i) {
      this.index = i;
      this.active = true;
      const m = MISSIONS[i];
      this.timer = m.time || 0;
      beam.position.set(m.marker.x, 20, m.marker.z);
      ring.position.set(m.marker.x, 0.4, m.marker.z);
      beam.visible = true;
      ring.visible = true;
    },
    hide() {
      beam.visible = false;
      ring.visible = false;
      this.active = false;
    },
    get current() {
      return MISSIONS[this.index];
    },
  };
  return tracker;
}
