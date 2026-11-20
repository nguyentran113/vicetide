// Port Solano's shared facts, in one place so every module agrees.
//
// Streets run on a coarse grid: avenues and cross-streets both sit on
// the coordinates in CITY.roads, city blocks fill the squares between
// them, and the map's southern rim is beach, then open water. Speeds
// are world units per second. The palette is a late-afternoon one —
// the whole city is lit like the last hour before sunset.

export const SAVE_KEY = 'vicetide-save-v1';

export const CITY = {
  block: 60,
  roads: [-240, -180, -120, -60, 0, 60, 120, 180],
  min: -270,
  max: 270,
  beachZ: 195,
  seaZ: 245,
};

export const TUNING = {
  walkSpeed: 7,
  runSpeed: 12,
  carAccel: 22,
  carMax: 38,
  carReverse: 10,
  policeMax: 40,
};

// The fixer who hands Rico his four jobs waits by the marina palms.
export const GIVER = { name: 'Marisol Vega', x: 8, z: 20 };

export const COLORS = { sky: 0xffb36b, fog: 0xf2a56b, sun: 0xffd9a0 };
