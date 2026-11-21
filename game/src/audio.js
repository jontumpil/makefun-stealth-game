// Synthesised sound only: every effect is built with WebAudio oscillators
// and filtered noise, so the game ships no audio files at all. The audio
// context is created lazily on the first user gesture (browsers block sound
// before one), and the ambient drone starts with the game.

function makeNoiseBuffer(context) {
  const length = context.sampleRate;
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
  return buffer;
}

export function createAudio() {
  let context = null;
  let noiseBuffer = null;
  let drone = null;
  let muted = false;

  /** Create the context on first use; returns null until a gesture allows it. */
  function ensure() {
    if (context !== null) return context;
    try {
      const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
      if (!AudioContextClass) return null;
      context = new AudioContextClass();
      noiseBuffer = makeNoiseBuffer(context);
    } catch {
      context = null;
    }
    return context;
  }

  function tone(frequency, duration, type, volume, slideTo) {
    const ctx = ensure();
    if (ctx === null || muted) return;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    if (slideTo) oscillator.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + duration);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + duration);
  }

  function noiseBurst(duration, filterFrequency, volume) {
    const ctx = ensure();
    if (ctx === null || muted) return;
    const source = ctx.createBufferSource();
    source.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFrequency;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start();
    source.stop(ctx.currentTime + duration);
  }

  return {
    /** Unlock audio (call from a gesture) and start the low manor drone. */
    unlock() {
      const ctx = ensure();
      if (ctx === null || drone !== null) return;
      if (ctx.state === 'suspended') void ctx.resume();
      const oscillator = ctx.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.value = 55;
      const waver = ctx.createOscillator();
      waver.type = 'sine';
      waver.frequency.value = 0.07;
      const waverGain = ctx.createGain();
      waverGain.gain.value = 4;
      waver.connect(waverGain).connect(oscillator.frequency);
      const gain = ctx.createGain();
      gain.gain.value = 0.035;
      oscillator.connect(gain).connect(ctx.destination);
      oscillator.start();
      waver.start();
      drone = { oscillator, waver, gain };
    },
    /** A soft carpeted footstep; louder and sharper while sprinting. */
    footstep(sprinting) {
      noiseBurst(sprinting ? 0.09 : 0.06, sprinting ? 900 : 420, sprinting ? 0.16 : 0.07);
    },
    /** The louder scuff of a sprinting stride, heard across the wing. */
    sprintNoise() {
      noiseBurst(0.16, 1400, 0.22);
    },
    /** A rising two-note sting when a guard's meter fills. */
    alarmSting() {
      tone(220, 0.35, 'sawtooth', 0.12, 440);
      tone(233, 0.4, 'sawtooth', 0.1, 466);
    },
    /** A short dissonant blip while a guard is watching the thief. */
    spottedBlip() {
      tone(660, 0.12, 'square', 0.05, 520);
    },
    /** A bright chime when a relic is lifted. */
    relicChime() {
      tone(880, 0.5, 'sine', 0.14);
      tone(1318, 0.6, 'sine', 0.1);
    },
    /** A low wooden creak when the barred exit opens. */
    exitCreak() {
      tone(140, 0.7, 'sawtooth', 0.08, 70);
      noiseBurst(0.5, 300, 0.06);
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
  };
}
