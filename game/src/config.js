// VICETIDE — shared tuning and layout constants for Port Solano.
// Everything the other modules need to agree on lives here: where the
// streets run, how fast things move, who hands out the jobs, and the
// colours of the golden-hour sky.

export const SAVE_KEY = 'vicetide-save-v1';

// The street plan. Roads sit on both axes at these coordinates; the city
// blocks fill the gaps between them. The beach and the sea close the
// southern edge of the map.
export const CITY = {
  block: 60,
  roads: [-240, -180, -120, -60, 0, 60, 120, 180],
  min: -270,
  max: 270,
  beachZ: 195,
  seaZ: 245,
};

// Movement tuning, in world units per second.
export const TUNING = {
  walkSpeed: 7,
  runSpeed: 12,
  carAccel: 22,
  carMax: 38,
  carReverse: 10,
  policeMax: 40,
};

// Marisol Vega waits near the marina palms and hands out the story jobs.
export const GIVER = { name: 'Marisol Vega', x: 8, z: 20 };

// Golden-hour palette for sky, fog and sunlight.
export const COLORS = { sky: 0xffb36b, fog: 0xf2a56b, sun: 0xffd9a0 };
