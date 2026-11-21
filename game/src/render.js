// Drawing only: the manor floor, its rugs and walls, relics and the barred
// exit, the guards with their vision cones, the thief, the HUD, and the
// title, win and caught screens. Nothing here changes the game state.

import { COLS, PALETTE, ROWS, TILE, VIEW } from './config.js';
import { visionPolygon } from './guards.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_WIN = 'win';
export const SCREEN_CAUGHT = 'caught';

function drawManorFloor(ctx, manor) {
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const x = col * TILE;
      const y = row * TILE;
      if (manor.isWallTile(col, row)) continue;
      ctx.fillStyle = (col + row) % 2 === 0 ? PALETTE.floorWood : PALETTE.floorWoodDark;
      ctx.fillRect(x, y, TILE, TILE);
      if (manor.isRugTile(col, row)) {
        ctx.fillStyle = PALETTE.rug;
        ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
        ctx.strokeStyle = PALETTE.rugEdge;
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 4, y + 4, TILE - 8, TILE - 8);
        ctx.fillStyle = PALETTE.rugPattern;
        ctx.beginPath();
        ctx.arc(x + TILE / 2, y + TILE / 2, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function drawWalls(ctx, manor) {
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      if (!manor.isWallTile(col, row)) continue;
      const x = col * TILE;
      const y = row * TILE;
      ctx.fillStyle = PALETTE.wall;
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = PALETTE.wallTop;
      ctx.fillRect(x, y, TILE, 5);
    }
  }
}

function drawRelics(ctx, manor) {
  for (const relic of manor.relics) {
    if (relic.taken) continue;
    ctx.fillStyle = PALETTE.relicGlow;
    ctx.beginPath();
    ctx.arc(relic.x, relic.y, 20, 0, Math.PI * 2);
    ctx.fill();
    // A small golden idol: diamond body on a plinth.
    ctx.fillStyle = PALETTE.relic;
    ctx.beginPath();
    ctx.moveTo(relic.x, relic.y - 11);
    ctx.lineTo(relic.x + 8, relic.y);
    ctx.lineTo(relic.x, relic.y + 11);
    ctx.lineTo(relic.x - 8, relic.y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff3c4';
    ctx.beginPath();
    ctx.arc(relic.x, relic.y - 2, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawExit(ctx, manor) {
  const door = manor.exitDoor;
  ctx.fillStyle = PALETTE.exit;
  ctx.fillRect(door.x, door.y, door.width, door.height);
  ctx.fillStyle = PALETTE.exitBar;
  ctx.fillRect(door.x, door.y + 8, door.width, 6);
  ctx.fillRect(door.x, door.y + 24, door.width, 6);
  ctx.fillStyle = PALETTE.relic;
  ctx.font = 'bold 13px ' + 'system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('EXIT', door.x + door.width / 2, door.y - 6);
}

function drawGuard(ctx, guard, manor, alarmed) {
  const cone = visionPolygon(guard, manor);
  ctx.fillStyle = alarmed ? PALETTE.coneAlert : PALETTE.cone;
  ctx.beginPath();
  ctx.moveTo(cone[0].x, cone[0].y);
  for (let i = 1; i < cone.length; i += 1) ctx.lineTo(cone[i].x, cone[i].y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = PALETTE.coneEdge;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Lantern light at the guard's chest, then the guard: cloak, hood, facing tick.
  ctx.fillStyle = 'rgba(242, 201, 76, 0.25)';
  ctx.beginPath();
  ctx.arc(guard.x, guard.y, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.guard;
  ctx.beginPath();
  ctx.arc(guard.x, guard.y, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.guardDark;
  ctx.beginPath();
  ctx.arc(guard.x, guard.y, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PALETTE.guard;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  ctx.lineTo(guard.x + Math.cos(guard.facing) * 20, guard.y + Math.sin(guard.facing) * 20);
  ctx.stroke();
}

function drawThief(ctx, player, hidden) {
  if (hidden) {
    ctx.fillStyle = 'rgba(107, 95, 168, 0.35)';
    ctx.beginPath();
    ctx.arc(player.x, player.y, 19, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = PALETTE.playerShadow;
  ctx.beginPath();
  ctx.arc(player.x, player.y, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.player;
  ctx.beginPath();
  ctx.arc(player.x, player.y, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2b2620';
  ctx.beginPath();
  ctx.arc(player.x, player.y - 2, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawHud(ctx, state) {
  const taken = state.manor.relics.filter((relic) => relic.taken).length;
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(10, 10, 300, 62);
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`Relics  ${taken} / ${state.manor.relics.length}`, 22, 34);
  ctx.font = '14px system-ui, sans-serif';
  const status = state.meter >= 1 ? 'SPOTTED — RUN!' : state.hidden ? 'HIDDEN in shadow' : state.seen ? 'SEEN — break line of sight!' : 'Unseen';
  ctx.fillStyle = state.meter >= 1 || state.seen ? PALETTE.danger : state.hidden ? PALETTE.safe : PALETTE.muted;
  ctx.fillText(status, 22, 56);

  // Detection meter: a bar that fills amber, then red.
  ctx.fillStyle = '#241a10';
  ctx.fillRect(10, 78, 300, 12);
  ctx.fillStyle = state.meter >= 1 ? PALETTE.danger : '#e8b23a';
  ctx.fillRect(10, 78, 300 * state.meter, 12);
  ctx.strokeStyle = PALETTE.muted;
  ctx.lineWidth = 1;
  ctx.strokeRect(10, 78, 300, 12);

  ctx.fillStyle = PALETTE.muted;
  ctx.font = '13px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('WASD / arrows move · Shift sprint (noisy) · P pause', VIEW.width - 14, 28);
  if (taken === state.manor.relics.length) {
    ctx.fillStyle = PALETTE.relic;
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText('All relics taken — reach the barred EXIT!', VIEW.width - 14, 52);
  }
}

function drawOverlay(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(8, 6, 4, 0.72)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = 'bold 64px Georgia, serif';
  ctx.fillText(title, VIEW.width / 2, 250);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '20px system-ui, sans-serif';
  lines.forEach((line, index) => {
    ctx.fillText(line, VIEW.width / 2, 310 + index * 32);
  });
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  /** Fix the backing store to the logical view: CSS stretches it to the window. */
  function fitCanvas() {
    if (canvas.width !== VIEW.width || canvas.height !== VIEW.height) {
      canvas.width = VIEW.width;
      canvas.height = VIEW.height;
    }
  }

  function draw(state, screen) {
    fitCanvas();
    const scale = Math.min(canvas.width / VIEW.width, canvas.height / VIEW.height);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.fillStyle = PALETTE.backdrop;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);

    drawManorFloor(ctx, state.manor);
    drawRelics(ctx, state.manor);
    drawExit(ctx, state.manor);
    for (const guard of state.guards) drawGuard(ctx, guard, state.manor, state.meter >= 1);
    drawThief(ctx, state.player, state.hidden);
    drawWalls(ctx, state.manor);
    drawHud(ctx, state);

    if (screen === SCREEN_TITLE) {
      drawOverlay(ctx, 'SHADOWSTEP', [
        'A lantern-lit manor. Three wings, three relics, one barred door.',
        'Stay out of the lantern cones. Shadow rugs hide you — unless a guard is close.',
        'Sprinting is fast and loud: guards come to investigate the noise.',
        'WASD or arrows to move · hold Shift to sprint · click to walk there · P to pause',
        'Press Space or click to begin the heist.',
      ], PALETTE.relic);
    } else if (screen === SCREEN_PAUSED) {
      drawOverlay(ctx, 'PAUSED', ['Press P or Space to keep sneaking.'], PALETTE.text);
    } else if (screen === SCREEN_WIN) {
      drawOverlay(ctx, 'CLEAN GETAWAY', [
        'Every relic lifted, every guard left watching the shadows.',
        'Press Space to run the manor again.',
      ], PALETTE.safe);
    } else if (screen === SCREEN_CAUGHT) {
      drawOverlay(ctx, 'CAUGHT', [
        'A lantern found you, and the manor woke up.',
        'Press Space to try the heist again.',
      ], PALETTE.danger);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  return { draw };
}
