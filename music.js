(() => {
  'use strict';

  // Original background music, synthesized live with the Web Audio API.
  // One chiptune theme (C - Am - F - G) is rearranged for each destination.
  const STEPS_PER_BAR = 16;
  const BARS = 4;
  const LOOP = STEPS_PER_BAR * BARS;
  const LOOKAHEAD = 0.14;
  const TICK_MS = 25;
  const VOLUME = 0.16;
  const _ = null;

  // Chord tones as semitones above the song root (C).
  const CHORDS = [[0, 4, 7], [-3, 0, 4], [5, 9, 12], [7, 11, 14]];
  const BASS = [0, -3, 5, 7];

  // Melodies are semitones above middle C, one entry per sixteenth note.
  const MELODY_A = [
    16, _, 19, _, 24, _, 19, _, 16, _, _, 14, 12, _, _, _,
    12, _, 16, _, 21, _, 19, _, 16, _, _, _, _, _, _, _,
    17, _, 21, _, 24, _, 21, _, 17, _, 19, _, 21, _, _, _,
    19, _, 17, _, 14, _, 11, _, 14, _, _, _, 7, _, _, _,
  ];
  const MELODY_B = [
    24, _, _, 23, 24, _, 19, _, 16, _, 19, _, 24, _, _, _,
    21, _, _, 19, 21, _, 16, _, 12, _, 16, _, 21, _, _, _,
    17, _, 19, _, 21, _, 24, _, 26, _, 24, _, 21, _, _, _,
    19, _, _, _, 23, _, _, _, 26, _, 23, _, 19, _, _, _,
  ];

  const THEMES = {
    Earth: { bpm: 112, transpose: 0, lead: 'square', leadLevel: 0.07, cutoff: 2600, arp: 'square', kick: true, snare: true, hats: 2, bassOctaves: true },
    Moon: { bpm: 92, transpose: -3, lead: 'triangle', leadLevel: 0.1, cutoff: 1500, arp: 'sine', kick: false, snare: false, hats: 4, bassOctaves: false },
    Mars: { bpm: 118, transpose: 2, lead: 'sawtooth', leadLevel: 0.05, cutoff: 1800, arp: 'triangle', kick: true, snare: true, hats: 2, bassOctaves: true, heavy: true },
    Sun: { bpm: 132, transpose: 4, lead: 'square', leadLevel: 0.065, cutoff: 3400, arp: 'square', kick: true, snare: true, hats: 1, bassOctaves: true, sparkle: true },
  };

  let context = null;
  let master = null;
  let musicBus = null;
  let noise = null;
  let timer = 0;
  let step = 0;
  let nextTime = 0;
  let loopCount = 0;
  let theme = THEMES.Earth;
  let pendingTheme = null;
  let playing = false;

  const frequency = midi => 440 * 2 ** ((midi - 69) / 12);

  function setup() {
    if (context || !window.AudioContext) return Boolean(context);
    context = new window.AudioContext();
    master = context.createGain();
    master.gain.value = VOLUME;
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.ratio.value = 4;
    musicBus = context.createGain();
    musicBus.connect(master).connect(compressor).connect(context.destination);
    const length = Math.floor(context.sampleRate * 0.5);
    noise = context.createBuffer(1, length, context.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    return true;
  }

  function voice(type, midi, time, length, level, cutoff = 0) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency(midi), time);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(level, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(level * 0.55, time + Math.min(0.12, length * 0.5));
    gain.gain.exponentialRampToValueAtTime(0.0001, time + length);
    let out = gain;
    if (cutoff) {
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = cutoff;
      gain.connect(filter);
      out = filter;
    }
    oscillator.connect(gain);
    out.connect(musicBus);
    oscillator.start(time);
    oscillator.stop(time + length + 0.02);
  }

  function kick(time, level = 0.5) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(150, time);
    oscillator.frequency.exponentialRampToValueAtTime(42, time + 0.13);
    gain.gain.setValueAtTime(level, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.16);
    oscillator.connect(gain).connect(musicBus);
    oscillator.start(time);
    oscillator.stop(time + 0.18);
  }

  function hiss(time, length, level, type, cutoff) {
    const source = context.createBufferSource();
    source.buffer = noise;
    const filter = context.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = cutoff;
    const gain = context.createGain();
    gain.gain.setValueAtTime(level, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + length);
    source.connect(filter).connect(gain).connect(musicBus);
    source.start(time);
    source.stop(time + length + 0.02);
  }

  function noteLength(melody, index, stepTime) {
    let span = 1;
    while (span < 4 && melody[(index + span) % LOOP] === null) span++;
    return span * stepTime * 0.92;
  }

  function schedule(index, time) {
    const stepTime = 60 / theme.bpm / 4;
    const bar = Math.floor(index / STEPS_PER_BAR);
    const beat = index % STEPS_PER_BAR;
    const root = 60 + theme.transpose;
    const chord = CHORDS[bar];
    const melody = loopCount % 2 ? MELODY_B : MELODY_A;

    // Lead melody
    const note = melody[index];
    if (note !== null) voice(theme.lead, root + note, time, noteLength(melody, index, stepTime), theme.leadLevel, theme.cutoff);

    // Arpeggio through the chord tones
    const arpNote = chord[[0, 1, 2, 1][beat % 4]] + (beat >= 8 ? 12 : 0);
    voice(theme.arp, root + arpNote, time, stepTime * 0.8, 0.022, 1600);

    // Bass on eighth notes, jumping an octave on the off-beats
    if (beat % 2 === 0) {
      const octave = theme.bassOctaves && beat % 4 === 2 ? 12 : 0;
      voice('triangle', root - 24 + BASS[bar] + octave, time, stepTime * 1.7, theme.heavy ? 0.16 : 0.12);
    }

    // Drums
    if (theme.kick && (beat === 0 || beat === 8 || (theme.heavy && beat === 10))) kick(time);
    if (theme.snare && (beat === 4 || beat === 12)) hiss(time, 0.12, 0.13, 'bandpass', 1800);
    if (beat % theme.hats === 0) hiss(time, beat === 14 ? 0.14 : 0.04, 0.035, 'highpass', 7000);

    // A twinkle on top for the Sun arrangement
    if (theme.sparkle && beat === 15 && bar === 3) {
      [0, 4, 7, 12].forEach((offset, i) => voice('sine', root + 24 + offset, time + i * stepTime / 2, 0.25, 0.03));
    }
  }

  function tick() {
    while (nextTime < context.currentTime + LOOKAHEAD) {
      if (step === 0 && pendingTheme) {
        theme = pendingTheme;
        pendingTheme = null;
      }
      schedule(step, nextTime);
      nextTime += 60 / theme.bpm / 4;
      step = (step + 1) % LOOP;
      if (step === 0) loopCount++;
    }
  }

  function start() {
    if (playing || !setup()) return;
    playing = true;
    if (context.state === 'suspended') context.resume().catch(() => {});
    master.gain.cancelScheduledValues(context.currentTime);
    master.gain.setValueAtTime(0.0001, context.currentTime);
    master.gain.exponentialRampToValueAtTime(VOLUME, context.currentTime + 1.5);
    step = 0;
    loopCount = 0;
    nextTime = context.currentTime + 0.1;
    timer = window.setInterval(tick, TICK_MS);
    tick();
  }

  function stop() {
    if (!playing) return;
    playing = false;
    window.clearInterval(timer);
    timer = 0;
    const now = context.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
  }

  function setTheme(destination) {
    const next = THEMES[destination] || THEMES.Earth;
    if (next === theme || next === pendingTheme) return;
    if (playing) pendingTheme = next;
    else theme = next;
  }

  // Lower the music under a fanfare, then bring it back.
  function duck(seconds = 2) {
    if (!playing) return;
    const now = context.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(VOLUME * 0.25, now + 0.08);
    master.gain.setValueAtTime(VOLUME * 0.25, now + seconds);
    master.gain.linearRampToValueAtTime(VOLUME, now + seconds + 1.2);
  }

  document.addEventListener('visibilitychange', () => {
    if (!context || !playing) return;
    if (document.hidden) context.suspend().catch(() => {});
    else {
      context.resume().catch(() => {});
      nextTime = Math.max(nextTime, context.currentTime + 0.1);
    }
  });

  window.SpaceportMusic = { start, stop, setTheme, duck, get playing() { return playing; } };
})();
