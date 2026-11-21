// Keyboard and pointer input. Held keys give a steering vector; one-shot
// presses (start, restart, pause) are queued as bit flags and taken once by
// the loop, so a press between two frames is never lost or counted twice.
// A mouse click sets a walk destination: the thief strolls there on their
// own, which lets the mouse steer while the keyboard rests.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;

const MOVE_KEYS = {
  ArrowUp: [0, -1],
  KeyW: [0, -1],
  ArrowDown: [0, 1],
  KeyS: [0, 1],
  ArrowLeft: [-1, 0],
  KeyA: [-1, 0],
  ArrowRight: [1, 0],
  KeyD: [1, 0],
};
const CONFIRM_KEYS = new Set(['Space', 'Enter']);
const PAUSE_KEYS = new Set(['KeyP', 'Escape']);

export function createInput(canvas) {
  const held = new Set();
  let sprinting = false;
  let actions = 0;
  let destination = null;

  window.addEventListener('keydown', (event) => {
    if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
      sprinting = true;
      event.preventDefault();
      return;
    }
    if (event.code in MOVE_KEYS) {
      held.add(event.code);
      destination = null;
      event.preventDefault();
    } else if (CONFIRM_KEYS.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
      event.preventDefault();
    } else if (PAUSE_KEYS.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
      event.preventDefault();
    }
  });
  window.addEventListener('keyup', (event) => {
    if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') sprinting = false;
    else held.delete(event.code);
  });
  // A key released while the tab is hidden never sends keyup: let go of all of them on blur.
  window.addEventListener('blur', () => {
    held.clear();
    sprinting = false;
  });

  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    destination = {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
    actions |= ACTION_CONFIRM;
  });

  return {
    /** Normalised steering vector from the held keys, or toward the click target. */
    steering(player) {
      let x = 0;
      let y = 0;
      for (const code of held) {
        x += MOVE_KEYS[code][0];
        y += MOVE_KEYS[code][1];
      }
      if (x !== 0 || y !== 0) {
        const length = Math.hypot(x, y);
        return { x: x / length, y: y / length, sprint: sprinting };
      }
      if (destination !== null) {
        const dx = destination.x - player.x;
        const dy = destination.y - player.y;
        const distance = Math.hypot(dx, dy);
        if (distance < 6) {
          destination = null;
          return { x: 0, y: 0, sprint: false };
        }
        return { x: dx / distance, y: dy / distance, sprint: false };
      }
      return { x: 0, y: 0, sprint: false };
    },
    /** True while either Shift key is held. */
    isSprinting() {
      return sprinting;
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
