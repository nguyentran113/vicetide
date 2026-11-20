// jobs.js — Marisol Vega's chain of favours (round 5 design).
// Four jobs, each a short list of legs. Every job opens with a brief
// at Marisol's pier café; legs are reached by driving or walking into
// their marker. Job 3 pins the wanted level at three stars from the
// moment the brief ends until the last leg is done — the heat lock.

export function createJobs(world) {
  const M = world.marisol;
  const jobs = [
    {
      name: 'Shore Leave',
      pay: 200,
      legs: [
        { at: M, label: 'Meet Marisol Vega at the pier café' },
        { at: { x: 156, z: 236 }, label: 'Take Marisol to the marina pontoons' },
      ],
    },
    {
      name: 'Warm Cargo',
      pay: 350,
      legs: [
        { at: M, label: 'Marisol has another favour — hear her out' },
        { at: { x: -156, z: -104 }, label: 'Collect the crate from the uptown depot' },
        { at: { x: 104, z: 156 }, label: 'Drop the crate at the beach club', timer: 150 },
      ],
    },
    {
      name: 'Pinned Heat',
      pay: 500,
      lockHeat: 3,
      legs: [
        { at: M, label: 'One risky run — see Marisol first' },
        { at: { x: -208, z: 156 }, label: 'Reach the south-west lookout with the heat pinned', timer: 120 },
      ],
    },
    {
      name: 'The Solano Send-Off',
      pay: 800,
      legs: [
        { at: M, label: 'The last job. Marisol is waiting' },
        { at: { x: -52, z: -208 }, label: 'Hit the north checkpoint' },
        { at: { x: 208, z: -52 }, label: 'Hit the east checkpoint' },
        { at: { x: 148, z: 208 }, label: 'Bring it home to the pier', timer: 180 },
      ],
    },
  ];

  const state = {
    jobIndex: 0,        // next job to run (== jobs.length when all done)
    legIndex: 0,
    legTimer: null,     // seconds left on the current leg, if timed
    done: false,
  };

  function currentLeg() {
    if (state.done || state.jobIndex >= jobs.length) return null;
    return jobs[state.jobIndex].legs[state.legIndex];
  }

  return {
    state,
    jobs,
    currentLeg,
    heatLock() {
      if (state.done || state.jobIndex >= jobs.length) return null;
      const job = jobs[state.jobIndex];
      if (!job.lockHeat) return null;
      return state.legIndex > 0 ? job.lockHeat : null;   // lock starts after the brief
    },
    objective() {
      const leg = currentLeg();
      if (!leg) return 'Free roam — Port Solano is yours, Rico';
      const job = jobs[state.jobIndex];
      let text = `${job.name}: ${leg.label}`;
      if (state.legTimer !== null && state.legIndex > 0) text += ` — ${Math.ceil(state.legTimer)}s`;
      return text;
    },
    marker() {
      const leg = currentLeg();
      return leg ? leg.at : null;
    },
    start(savedIndex) {
      state.jobIndex = Math.min(savedIndex || 0, jobs.length);
      state.legIndex = 0;
      state.done = state.jobIndex >= jobs.length;
      const leg = currentLeg();
      state.legTimer = leg && leg.timer ? leg.timer : null;
    },
    // Call every frame. events: {rewarded(amount, jobName), failed(reason), legDone()}
    update(dt, pos, events) {
      const leg = currentLeg();
      if (!leg) return;
      if (state.legTimer !== null && state.legIndex > 0) {
        state.legTimer -= dt;
        if (state.legTimer <= 0) {
          state.legIndex = 0;
          state.legTimer = jobs[state.jobIndex].legs[0].timer || null;
          events.failed(`Out of time — the ${jobs[state.jobIndex].name} job resets`);
          return;
        }
      }
      const dx = pos.x - leg.at.x;
      const dz = pos.z - leg.at.z;
      if (dx * dx + dz * dz > 64) return;               // 8-unit reach
      const job = jobs[state.jobIndex];
      state.legIndex += 1;
      if (state.legIndex >= job.legs.length) {
        state.jobIndex += 1;
        state.legIndex = 0;
        state.done = state.jobIndex >= jobs.length;
        const next = currentLeg();
        state.legTimer = next && next.timer ? next.timer : null;
        events.rewarded(job.pay, job.name);
      } else {
        const next = job.legs[state.legIndex];
        state.legTimer = next.timer || null;
        events.legDone(job.name);
      }
    },
  };
}
