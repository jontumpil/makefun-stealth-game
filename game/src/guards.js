// The manor guards: patrol routes, wall-blocked vision cones, the detection
// meter, and how a guard reacts to a noise. A guard walks its waypoints in
// order, pausing briefly at each one. When it sees the thief its suspicion
// grows; on a shadow rug the thief is almost invisible unless very close.
// Sprinting footsteps are heard inside the noise radius and pull nearby
// guards to investigate the sound. A full meter raises the alarm and every
// guard chases; a guard that reaches the thief catches them.

import { GUARD, NOISE, SENSE, TILE } from './config.js';

export const MODE_PATROL = 'patrol';
export const MODE_INVESTIGATE = 'investigate';
export const MODE_CHASE = 'chase';

/** Patrol routes, one guard per wing, as tile coordinates. */
const ROUTES = [
  // West wing: loops the lower floor and the rug corner, clear of the wall blocks.
  [[2, 13], [7, 13], [7, 6], [2, 6]],
  // Great hall: a long loop past the hall relic and the central rugs.
  [[12, 13], [19, 13], [19, 5], [12, 5]],
  // East wing: mirrors the west wing's loop.
  [[24, 13], [29, 13], [29, 6], [24, 6]],
];

/** Seconds a guard waits at each waypoint before walking on. */
const WAYPOINT_PAUSE = 1.2;

function tileToPoint(col, row) {
  return { x: col * TILE + TILE / 2, y: row * TILE + TILE / 2 };
}

function angleDifference(a, b) {
  let diff = a - b;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

/** Build the guards from the routes above, each mid-way along its first leg. */
export function createGuards() {
  return ROUTES.map((route, index) => {
    const points = route.map(([col, row]) => tileToPoint(col, row));
    const start = points[index % points.length];
    const next = points[(index + 1) % points.length];
    return {
      x: start.x,
      y: start.y,
      facing: Math.atan2(next.y - start.y, next.x - start.x),
      route: points,
      waypoint: (index + 1) % points.length,
      pause: 0,
      mode: MODE_PATROL,
      investigate: null,
      investigateLeft: 0,
      lastSeen: null,
      unseenFor: 0,
    };
  });
}

/**
 * Walk one guard along its patrol route only (no seeing, no investigating):
 * used to stage the title screen's living backdrop.
 */
export function stepPatrol(guard, dt, manor) {
  if (guard.pause > 0) {
    guard.pause -= dt;
    return;
  }
  const target = guard.route[guard.waypoint];
  if (walkToward(guard, target, GUARD.patrolSpeed, dt, manor)) {
    guard.waypoint = (guard.waypoint + 1) % guard.route.length;
    guard.pause = WAYPOINT_PAUSE;
  }
}

/**
 * The polygon of what one guard can see right now: a fan of rays from the
 * guard's eyes, each stopped by the first wall it meets (or the cone range).
 */
export function visionPolygon(guard, manor) {
  const points = [{ x: guard.x, y: guard.y }];
  for (let i = 0; i <= GUARD.coneRays; i += 1) {
    const angle = guard.facing - GUARD.coneHalfAngle + (2 * GUARD.coneHalfAngle * i) / GUARD.coneRays;
    const reach = manor.rayDistance(guard.x, guard.y, angle, GUARD.coneRange);
    points.push({ x: guard.x + Math.cos(angle) * reach, y: guard.y + Math.sin(angle) * reach });
  }
  return points;
}

/** True when the guard can see the point (x, y): in range, inside the cone, line clear. */
export function guardSeesPoint(guard, x, y, manor) {
  const dx = x - guard.x;
  const dy = y - guard.y;
  const distance = Math.hypot(dx, dy);
  if (distance > GUARD.coneRange) return false;
  if (Math.abs(angleDifference(Math.atan2(dy, dx), guard.facing)) > GUARD.coneHalfAngle) return false;
  return !manor.lineBlocked(guard.x, guard.y, x, y);
}

function walkToward(guard, target, speed, dt, manor) {
  const dx = target.x - guard.x;
  const dy = target.y - guard.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 2) return true;
  const step = Math.min(distance, speed * dt);
  const moved = manor.slideCircle(guard.x, guard.y, GUARD.radius, (dx / distance) * step, (dy / distance) * step);
  guard.x = moved.x;
  guard.y = moved.y;
  guard.facing = Math.atan2(dy, dx);
  return distance - step < 2;
}

/**
 * Advance every guard one step and update the shared detection meter.
 * `player` carries x, y, sprinting and hidden flags; `noise` is either null
 * or { x, y } for a footstep pulse heard this step. Returns the meter (0..1),
 * whether any guard sees the thief, and whether the thief was caught.
 */
export function updateGuards(guards, dt, player, manor, noise, meter) {
  let seen = false;
  let caught = false;

  for (const guard of guards) {
    const sees = guardSeesPoint(guard, player.x, player.y, manor);
    if (sees) {
      seen = true;
      guard.lastSeen = { x: player.x, y: player.y };
      guard.unseenFor = 0;
    } else {
      guard.unseenFor += dt;
    }

    if (guard.mode === MODE_CHASE) {
      const target = guard.lastSeen ?? { x: player.x, y: player.y };
      walkToward(guard, target, GUARD.chaseSpeed, dt, manor);
      if (Math.hypot(player.x - guard.x, player.y - guard.y) < GUARD.catchRange) caught = true;
      if (guard.unseenFor > GUARD.alarmCooldown) {
        guard.mode = MODE_PATROL;
        guard.investigate = null;
      }
      continue;
    }

    if (noise && guard.mode !== MODE_INVESTIGATE) {
      const distance = Math.hypot(noise.x - guard.x, noise.y - guard.y);
      if (distance < NOISE.sprintRadius) {
        guard.mode = MODE_INVESTIGATE;
        guard.investigate = { x: noise.x, y: noise.y };
        guard.investigateLeft = GUARD.investigateTime;
      }
    }

    if (guard.mode === MODE_INVESTIGATE) {
      guard.investigateLeft -= dt;
      const arrived = walkToward(guard, guard.investigate, GUARD.investigateSpeed, dt, manor);
      if (arrived || guard.investigateLeft <= 0) {
        guard.mode = MODE_PATROL;
        guard.investigate = null;
      }
      continue;
    }

    // Patrol: walk to the next waypoint, pause, then take the following one.
    stepPatrol(guard, dt, manor);
  }

  // The meter fills while any guard sees the thief, faster up close and while
  // sprinting, far slower on a shadow rug; it drains while nobody sees them.
  if (seen) {
    let rate = SENSE.baseRate;
    let closest = Infinity;
    for (const guard of guards) {
      if (guardSeesPoint(guard, player.x, player.y, manor)) {
        closest = Math.min(closest, Math.hypot(player.x - guard.x, player.y - guard.y));
      }
    }
    const closeness = 1 - Math.min(1, closest / GUARD.coneRange);
    if (player.hidden && closest > SENSE.rugBlindRange) rate *= SENSE.rugMultiplier;
    if (player.sprinting) rate *= SENSE.sprintMultiplier;
    meter = Math.min(1, meter + rate * (0.35 + 0.65 * closeness) * dt);
  } else {
    meter = Math.max(0, meter - SENSE.decayRate * dt);
  }

  if (meter >= 1) {
    for (const guard of guards) {
      guard.mode = MODE_CHASE;
      guard.unseenFor = 0;
    }
  }

  return { meter, seen, caught };
}
