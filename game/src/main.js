// Shadowstep boot and the one loop: input is read every frame, the manor
// advances in fixed 1/60 s steps (several in a slow frame, none in a fast
// one), and the renderer paints what is there. The game moves between five
// screens: title, play, paused, win and caught.
//
// ?seed=N is accepted for determinism (the floor plan itself is fixed).
// ?shot=start|play|end (with &seed=N) stages that scene instead of running
// the loop, paints it twice and sets window.__shotReady for a screenshot.

import { BEST_KEY, NOISE, PLAYER, STEP, TILE } from './config.js';
import { createManor } from './world.js';
import { createGuards, stepPatrol, updateGuards } from './guards.js';
import { ACTION_CONFIRM, ACTION_PAUSE, createInput } from './input.js';
import { createAudio } from './audio.js';
import {
  SCREEN_CAUGHT,
  SCREEN_PAUSED,
  SCREEN_PLAY,
  SCREEN_TITLE,
  SCREEN_WIN,
  createRenderer,
} from './render.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;
/** Seconds between carpeted footsteps while walking, and while sprinting. */
const STEP_INTERVAL_WALK = 0.38;
const STEP_INTERVAL_SPRINT = 0.26;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 1;
void seed;

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const audio = createAudio();
const renderer = createRenderer(canvas);

const state = {
  manor: createManor(),
  guards: createGuards(),
  player: { x: 0, y: 0 },
  meter: 0,
  seen: false,
  hidden: false,
  sprinting: false,
  alarms: 0,
  relicsTaken: 0,
  noiseTimer: 0,
  stepTimer: 0,
};

function resetRun() {
  state.manor = createManor();
  state.guards = createGuards();
  state.player = { ...state.manor.playerStart };
  state.meter = 0;
  state.seen = false;
  state.hidden = false;
  state.sprinting = false;
  state.alarms = 0;
  state.relicsTaken = 0;
  state.noiseTimer = 0;
  state.stepTimer = 0;
}

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best run then lasts this visit only.
  }
}

/** One fixed step of the heist. `steer` is { x, y, sprint }; returns 'win', 'caught' or ''. */
function stepHeist(dt, steer) {
  const speed = steer.sprint ? PLAYER.sprintSpeed : PLAYER.walkSpeed;
  const moving = steer.x !== 0 || steer.y !== 0;
  state.sprinting = steer.sprint && moving;
  if (moving) {
    const moved = state.manor.slideCircle(
      state.player.x,
      state.player.y,
      PLAYER.radius,
      steer.x * speed * dt,
      steer.y * speed * dt,
    );
    state.player.x = moved.x;
    state.player.y = moved.y;
  }
  state.hidden = state.manor.onShadowRug(state.player.x, state.player.y);

  // Sprinting strides pulse noise: guards inside the radius come to look.
  let noise = null;
  if (state.sprinting) {
    state.noiseTimer -= dt;
    if (state.noiseTimer <= 0) {
      noise = { x: state.player.x, y: state.player.y };
      state.noiseTimer = NOISE.pulseInterval;
      audio.sprintNoise();
    }
  }

  // Footsteps, quiet on the rugs, louder at a sprint.
  if (moving) {
    state.stepTimer -= dt;
    if (state.stepTimer <= 0) {
      audio.footstep(state.sprinting);
      state.stepTimer = state.sprinting ? STEP_INTERVAL_SPRINT : STEP_INTERVAL_WALK;
    }
  }

  const before = state.meter;
  const result = updateGuards(state.guards, dt, {
    x: state.player.x,
    y: state.player.y,
    sprinting: state.sprinting,
    hidden: state.hidden,
  }, state.manor, noise, state.meter);
  state.meter = result.meter;
  state.seen = result.seen;
  if (before < 1 && state.meter >= 1) {
    state.alarms += 1;
    audio.alarmSting();
  } else if (state.seen) {
    audio.spottedBlip();
  }
  if (result.caught) return 'caught';

  // Lift a relic by standing close to it.
  for (const relic of state.manor.relics) {
    if (relic.taken) continue;
    if (Math.hypot(relic.x - state.player.x, relic.y - state.player.y) < PLAYER.pickupRange) {
      relic.taken = true;
      state.relicsTaken += 1;
      audio.relicChime();
    }
  }

  // All three relics lifted: the barred exit opens and the heist is done.
  if (state.relicsTaken === state.manor.relics.length) {
    const door = state.manor.exitDoor;
    if (
      state.player.x > door.x - 4 && state.player.x < door.x + door.width + 4 &&
      state.player.y > door.y - PLAYER.radius && state.player.y < door.y + door.height
    ) {
      audio.exitCreak();
      return 'win';
    }
  }
  return '';
}

/**
 * Stage one deterministic screenshot scene and return the screen to draw.
 * start: the title over a live manor, guards mid-patrol. play: mid-heist,
 * the thief hidden on a west-wing rug beside a relic, one relic already
 * lifted, the meter half full. end: the getaway, all relics lifted, the
 * thief at the barred exit.
 */
function stageShot(name) {
  resetRun();
  if (name === 'play') {
    state.manor.relics[0].taken = true;
    state.relicsTaken = 1;
    state.player = { x: 2 * TILE + TILE / 2, y: 2 * TILE + TILE / 2 };
    for (const guard of state.guards) {
      for (let i = 0; i < 8 / STEP; i += 1) stepPatrol(guard, STEP, state.manor);
    }
    state.meter = 0.45;
    state.hidden = true;
    return SCREEN_PLAY;
  }
  if (name === 'end') {
    for (const relic of state.manor.relics) relic.taken = true;
    state.relicsTaken = state.manor.relics.length;
    const door = state.manor.exitDoor;
    state.player = { x: door.x + door.width / 2, y: door.y - PLAYER.radius - 2 };
    return SCREEN_WIN;
  }
  for (const guard of state.guards) {
    for (let i = 0; i < 3 / STEP; i += 1) stepPatrol(guard, STEP, state.manor);
  }
  return SCREEN_TITLE;
}

function runShot(name) {
  const screen = stageShot(name);
  let painted = 0;
  function paint() {
    renderer.draw(state, screen);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  // Screen readers (and anyone watching the page's text) hear the screen changes.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    resetRun();
    accumulator = 0;
    screen = SCREEN_PLAY;
    audio.unlock();
    announce('Playing. Three relics, three wings, one barred exit.');
  }

  function finishRun(outcome) {
    screen = outcome === 'win' ? SCREEN_WIN : SCREEN_CAUGHT;
    if (state.relicsTaken > best) {
      best = state.relicsTaken;
      saveBest(best);
    }
    announce(outcome === 'win'
      ? `Clean getaway. ${state.relicsTaken} relics, ${state.alarms} alarms.`
      : `Caught. ${state.relicsTaken} relics lifted.`);
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_CONFIRM) {
      audio.unlock();
      if (screen === SCREEN_TITLE || screen === SCREEN_WIN || screen === SCREEN_CAUGHT) startGame();
      else if (screen === SCREEN_PAUSED) screen = SCREEN_PLAY;
    } else if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE) {
      // The title backdrop stays alive: guards patrol on the fixed step, so
      // the manor moves at the same pace on any display.
      while (accumulator >= STEP) {
        for (const guard of state.guards) stepPatrol(guard, STEP, state.manor);
        accumulator -= STEP;
      }
    } else if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP) {
        const outcome = stepHeist(STEP, input.steering(state.player));
        accumulator -= STEP;
        if (outcome !== '') {
          finishRun(outcome);
          break;
        }
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(state, screen);
  }

  // Leaving the tab pauses a running heist rather than letting guards close in unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Shadowstep. Press Space or click to begin the heist.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
