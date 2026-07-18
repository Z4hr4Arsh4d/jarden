// Procedural ambient audio. No audio files: everything here is synthesised with Web Audio,
// which means no assets, no licensing, and — the real reason — the music can *listen* to
// the simulation. It brightens at dawn, thins out at night, and hushes in a cold snap.
//
// The notes are locked to a pentatonic scale, so nothing it plays can ever clash. That's
// what keeps generative music from turning into wallpaper noise or a novelty.

const PENTATONIC = [0, 2, 4, 7, 9];          // scale degrees, in semitones
const ROOT = 220;                            // A3
const midi = (semi) => ROOT * Math.pow(2, semi / 12);

export class Audio {
  constructor() {
    this.ctx = null;
    this.on = false;
    this.master = null;
    this.padGain = null;
    this.filter = null;
    this.noteT = 0;
    this.voices = [];
  }

  /** Must be called from a real user gesture — browsers block audio otherwise. */
  start() {
    if (this.ctx) { this.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = 0.0;
    this.master.connect(ctx.destination);

    // a long delay used as a cheap, warm reverb
    const delay = ctx.createDelay(2);
    delay.delayTime.value = 0.38;
    const fb = ctx.createGain();
    fb.gain.value = 0.34;
    const wet = ctx.createGain();
    wet.gain.value = 0.30;
    delay.connect(fb); fb.connect(delay);
    delay.connect(wet); wet.connect(this.master);
    this.wet = delay;

    this.filter = ctx.createBiquadFilter();
    this.filter.type = "lowpass";
    this.filter.frequency.value = 700;
    this.filter.Q.value = 0.6;
    this.filter.connect(this.master);
    this.filter.connect(delay);

    // the pad: three slightly detuned voices = a soft, breathing chord
    this.padGain = ctx.createGain();
    this.padGain.gain.value = 0.16;
    this.padGain.connect(this.filter);
    for (const [semi, detune] of [[0, -4], [7, 3], [12, 6]]) {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = midi(semi) / 2;
      o.detune.value = detune;
      const g = ctx.createGain();
      g.gain.value = 0.33;
      o.connect(g); g.connect(this.padGain);
      o.start();
      this.voices.push({ o, g });
    }

    // a slow LFO on the filter so the pad never sits still
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.05;
    const lfoAmt = ctx.createGain();
    lfoAmt.gain.value = 180;
    lfo.connect(lfoAmt);
    lfoAmt.connect(this.filter.frequency);
    lfo.start();

    this.on = true;
    this.master.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 2.5);   // fade in
  }

  resume() {
    if (!this.ctx) return;
    this.ctx.resume();
    this.on = true;
    this.master.gain.linearRampToValueAtTime(0.5, this.ctx.currentTime + 0.8);
  }

  mute() {
    if (!this.ctx) return;
    this.on = false;
    this.master.gain.linearRampToValueAtTime(0.0, this.ctx.currentTime + 0.6);
  }

  toggle() { this.on ? this.mute() : (this.ctx ? this.resume() : this.start()); return this.on; }

  /** One soft plucked note — the melody, such as it is. */
  _note(semi, when = 0, vol = 0.10, dur = 2.2) {
    const ctx = this.ctx;
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator();
    o.type = "triangle";
    o.frequency.value = midi(semi);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.04);          // gentle attack
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);   // long tail
    o.connect(g); g.connect(this.filter);
    o.start(t);
    o.stop(t + dur + 0.1);
  }

  /** Let the music follow the jar: brighter by day, sparse and low at night. */
  update(world, dt) {
    if (!this.on || !this.ctx) return;
    const sun = world.sun;

    // the filter opens with the sun — dawn literally brightens the sound
    const target = 420 + sun * 1500;
    this.filter.frequency.setTargetAtTime(target, this.ctx.currentTime, 1.5);

    // weather colours the pad
    const w = world.weather.key;
    const padVol = w === "cold" ? 0.10 : w === "heat" ? 0.20 : 0.16;
    this.padGain.gain.setTargetAtTime(padVol, this.ctx.currentTime, 2);

    // notes fall more often in daylight, and rarely at night
    this.noteT -= dt;
    if (this.noteT <= 0) {
      this.noteT = (sun > 0.15 ? 1.6 : 3.4) + Math.random() * 2.4;
      const octave = Math.random() < 0.3 ? 12 : 0;
      const semi = PENTATONIC[(Math.random() * PENTATONIC.length) | 0] + octave;
      this._note(semi, 0, 0.05 + sun * 0.06, 2 + Math.random() * 1.6);
      if (Math.random() < 0.25) {                            // an occasional soft harmony
        const s2 = PENTATONIC[(Math.random() * PENTATONIC.length) | 0] + 12;
        this._note(s2, 0.28, 0.035, 1.8);
      }
    }
  }

  // ---- little sounds for the things you do ----
  sfx(kind) {
    if (!this.ctx || !this.on) return;
    const ctx = this.ctx, t = ctx.currentTime;
    if (kind === "plant") {
      this._note(PENTATONIC[(Math.random() * 3) | 0] + 12, 0, 0.13, 1.1);
    } else if (kind === "water") {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(900, t);
      o.frequency.exponentialRampToValueAtTime(320, t + 0.16);   // a droplet's downward blip
      g.gain.setValueAtTime(0.14, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      o.connect(g); g.connect(this.filter);
      o.start(t); o.stop(t + 0.25);
    } else if (kind === "bug" || kind === "pred") {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "square";
      o.frequency.setValueAtTime(kind === "bug" ? 620 : 330, t);
      o.frequency.exponentialRampToValueAtTime(kind === "bug" ? 900 : 240, t + 0.08);
      g.gain.setValueAtTime(0.05, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      o.connect(g); g.connect(this.filter);
      o.start(t); o.stop(t + 0.15);
    } else if (kind === "deny") {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(180, t);
      g.gain.setValueAtTime(0.07, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
      o.connect(g); g.connect(this.master);
      o.start(t); o.stop(t + 0.16);
    } else if (kind === "thrive") {
      [0, 4, 7, 12].forEach((s, i) => this._note(s, i * 0.13, 0.11, 2.6));  // a little fanfare
    }
  }
}

export const audio = new Audio();
