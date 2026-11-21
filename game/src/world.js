// The manor floor plan: three wings seen from above, read from a tile map.
//   '#' wall   '.' wooden floor   'r' indigo shadow rug   'R' relic
//   'P' thief's entrance          'E' barred exit door (south, centre)
// The west wing holds one relic, the great hall one, the east wing one. Two
// interior divider walls split the wings, each with two door gaps, and a few
// freestanding wall blocks break sight lines inside the wings.

import { COLS, ROWS, TILE } from './config.js';

const PLAN = [
  '################################',
  '#rrr.....#............#.....rrr#',
  '#rrr.....#............#.....rrr#',
  '#...R....#............#.....rR.#',
  '#........#............#........#',
  '#..##....#............#...##...#',
  '#........#............#........#',
  '#..............................#',
  '#........#............#........#',
  '#..rr....#....rrrr....#..rr....#',
  '#..rr....#....rrrr....#..rr....#',
  '#........#............#........#',
  '#........#............#........#',
  '#...............R..............#',
  '#........#............#........#',
  '#........#............#........#',
  '#........#.....P......#........#',
  '###############EE###############',
];

export const TILE_WALL = '#';
export const TILE_RUG = 'r';

function tileAt(col, row) {
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return TILE_WALL;
  return PLAN[row][col];
}

function tileCentre(col, row) {
  return { x: col * TILE + TILE / 2, y: row * TILE + TILE / 2 };
}

/** Read the plan once into sets and lists the rest of the game uses. */
export function createManor() {
  const walls = new Set();
  const rugs = new Set();
  const relics = [];
  let playerStart = { x: TILE * 15 + TILE / 2, y: TILE * 16 + TILE / 2 };
  let exitDoor = { x: TILE * 15, y: TILE * 17, width: TILE * 2, height: TILE };

  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const mark = PLAN[row][col];
      const key = `${col},${row}`;
      if (mark === TILE_WALL) walls.add(key);
      else if (mark === TILE_RUG) rugs.add(key);
      else if (mark === 'R') relics.push({ ...tileCentre(col, row), taken: false });
      else if (mark === 'P') playerStart = tileCentre(col, row);
      else if (mark === 'E') {
        // The exit door spans both E tiles; keep the leftmost tile as its origin.
        if (exitDoor.width === TILE * 2 && col === 15) exitDoor = { x: col * TILE, y: row * TILE, width: TILE * 2, height: TILE };
      }
    }
  }

  /** True when the tile at (col, row) is solid wall. */
  function isWallTile(col, row) {
    return walls.has(`${col},${row}`);
  }

  /** True when the point (x, y) in pixels sits inside a wall tile. */
  function isWallAt(x, y) {
    return isWallTile(Math.floor(x / TILE), Math.floor(y / TILE));
  }

  /** True when the tile at (col, row) is an indigo shadow rug. */
  function isRugTile(col, row) {
    return rugs.has(`${col},${row}`);
  }

  /** True when the point (x, y) stands on a shadow rug. */
  function onShadowRug(x, y) {
    return isRugTile(Math.floor(x / TILE), Math.floor(y / TILE));
  }

  /**
   * Move a circle of `radius` from (x, y) by (dx, dy), sliding along walls:
   * the x step is kept only when it stays clear, then the y step likewise.
   */
  function slideCircle(x, y, radius, dx, dy) {
    let nextX = x;
    let nextY = y;
    if (!circleBlocked(x + dx, y, radius)) nextX = x + dx;
    if (!circleBlocked(nextX, y + dy, radius)) nextY = y + dy;
    return { x: nextX, y: nextY };
  }

  /** True when a circle of `radius` centred at (x, y) overlaps any wall tile. */
  function circleBlocked(x, y, radius) {
    const left = Math.floor((x - radius) / TILE);
    const right = Math.floor((x + radius) / TILE);
    const top = Math.floor((y - radius) / TILE);
    const bottom = Math.floor((y + radius) / TILE);
    for (let row = top; row <= bottom; row += 1) {
      for (let col = left; col <= right; col += 1) {
        if (!isWallTile(col, row)) continue;
        const nearestX = Math.max(col * TILE, Math.min(x, col * TILE + TILE));
        const nearestY = Math.max(row * TILE, Math.min(y, row * TILE + TILE));
        const ox = x - nearestX;
        const oy = y - nearestY;
        if (ox * ox + oy * oy < radius * radius) return true;
      }
    }
    return false;
  }

  /**
   * March from (x0, y0) toward (x1, y1) in small steps; true when a wall tile
   * blocks the straight line between the two points.
   */
  function lineBlocked(x0, y0, x1, y1) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const distance = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.ceil(distance / 6));
    for (let i = 1; i < steps; i += 1) {
      if (isWallAt(x0 + (dx * i) / steps, y0 + (dy * i) / steps)) return true;
    }
    return false;
  }

  /**
   * How far a ray from (x, y) along `angle` travels before it hits a wall or
   * runs out to `maxDistance`. Steps of 6 px keep the cone edge honest.
   */
  function rayDistance(x, y, angle, maxDistance) {
    const stepX = Math.cos(angle) * 6;
    const stepY = Math.sin(angle) * 6;
    let travelled = 0;
    while (travelled < maxDistance) {
      travelled += 6;
      if (isWallAt(x + stepX * (travelled / 6), y + stepY * (travelled / 6))) return travelled;
    }
    return maxDistance;
  }

  return {
    walls,
    rugs,
    relics,
    playerStart,
    exitDoor,
    isWallTile,
    isWallAt,
    isRugTile,
    onShadowRug,
    slideCircle,
    circleBlocked,
    lineBlocked,
    rayDistance,
  };
}
