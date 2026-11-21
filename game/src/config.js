// Shadowstep tuning: every number and colour in one place. The manor is a fixed
// 1280x720 logical floor plan; the renderer scales it to the window, so no rule
// below depends on the screen size.

export const VIEW = { width: 1280, height: 720 };
export const TILE = 40;
export const COLS = 32;
export const ROWS = 18;

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display rate. */
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 13,
  walkSpeed: 168,
  sprintSpeed: 268,
  pickupRange: 30,
};

export const GUARD = {
  radius: 14,
  patrolSpeed: 78,
  chaseSpeed: 152,
  investigateSpeed: 112,
  coneRange: 252,
  /** Half of the vision cone's opening angle, in radians (about 35 degrees). */
  coneHalfAngle: 0.61,
  /** How many rays draw the cone polygon. */
  coneRays: 26,
  /** How close a guard must get to catch the thief. */
  catchRange: 26,
  /** Seconds a guard keeps investigating a noise before giving up. */
  investigateTime: 4,
  /** Seconds of lost sight before the alarm cools down. */
  alarmCooldown: 3,
};

export const NOISE = {
  /** Radius, in pixels, inside which sprinting footsteps are heard. */
  sprintRadius: 235,
  /** Seconds between noise pulses while sprinting. */
  pulseInterval: 0.28,
};

export const SENSE = {
  /** Detection meter fill per second at point blank, standing in the open. */
  baseRate: 0.85,
  /** Multiplier while the thief stands on a shadow rug (unless very close). */
  rugMultiplier: 0.12,
  /** Inside this distance a rug no longer hides the thief. */
  rugBlindRange: 72,
  /** Multiplier while sprinting (louder, easier to spot). */
  sprintMultiplier: 1.45,
  /** Meter drain per second while unseen. */
  decayRate: 0.35,
};

export const RELIC_COUNT = 3;

export const PALETTE = {
  backdrop: '#0d0a08',
  floorWood: '#3a2a1a',
  floorWoodDark: '#322416',
  floorStone: '#2e2a26',
  wall: '#171009',
  wallTop: '#4a341d',
  rug: '#2e3270',
  rugEdge: '#4a4fa8',
  rugPattern: '#23265c',
  cone: 'rgba(242, 201, 76, 0.20)',
  coneEdge: 'rgba(242, 201, 76, 0.55)',
  coneAlert: 'rgba(229, 83, 75, 0.28)',
  guard: '#c8b28a',
  guardDark: '#8a744e',
  player: '#ece7d8',
  playerShadow: '#6b5fa8',
  relic: '#f2c94c',
  relicGlow: 'rgba(242, 201, 76, 0.35)',
  exit: '#7a5a28',
  exitBar: '#3a2c14',
  text: '#f0ead8',
  muted: '#a89a7c',
  danger: '#e5534b',
  safe: '#7fc97f',
  panel: 'rgba(13, 10, 8, 0.82)',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best (fewest alarms) run is kept between visits, this browser only. */
export const BEST_KEY = 'shadowstep.best';
