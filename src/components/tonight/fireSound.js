// The fire, as sound: made live with the Web Audio API (no recording, so nothing to license and no audible loop).
//   a low roar: filtered noise that breathes slowly
//   crackles:   very short bright bursts, in little clusters, at random
//   pops:       now and then a lower, longer knock, like a log settling
// Browsers only allow sound after a tap or click, so this starts from the "Sound" button, never by itself.
// setLevel(0..1) follows the fire in the story: full while people play, quieter as it burns down to embers.

let ctx = null, master = null, roarGain = null, noise = null, timer = 0, level = 1, on = false;

function noiseBuffer(c) {
  const b = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i += 1) d[i] = Math.random() * 2 - 1;
  return b;
}

function build() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  ctx = new AC();
  noise = noiseBuffer(ctx);
  master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);

  // roar: looping noise through a low-pass, with a slow random "breathing" on its level
  const src = ctx.createBufferSource(); src.buffer = noise; src.loop = true;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; lp.Q.value = 0.3;
  const lp2 = ctx.createBiquadFilter(); lp2.type = 'lowpass'; lp2.frequency.value = 900;
  roarGain = ctx.createGain(); roarGain.gain.value = 0.16;
  src.connect(lp).connect(lp2).connect(roarGain).connect(master); src.start();
  return true;
}

// one crackle (bright, ~2-12 ms) or pop (lower, ~20-60 ms) at time `at`
function burst(at, pop) {
  const s = ctx.createBufferSource(); s.buffer = noise;
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass';
  bp.frequency.value = pop ? 500 + Math.random() * 700 : 1800 + Math.random() * 3800; bp.Q.value = pop ? 2.5 : 1.2;
  const g = ctx.createGain(); const peak = (pop ? 0.5 : 0.22) * (0.25 + Math.random() * 0.75);
  const len = pop ? 0.02 + Math.random() * 0.04 : 0.002 + Math.random() * 0.01;
  g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(peak, at + 0.0015); g.gain.exponentialRampToValueAtTime(0.0001, at + len + 0.03);
  s.connect(bp).connect(g).connect(master);
  s.start(at, Math.random() * 1.9); s.stop(at + len + 0.05);
}

// look 0.25 s ahead every 0.1 s and scatter crackles in it; a calmer fire crackles less
function schedule() {
  if (!ctx) return;
  const now = ctx.currentTime, until = now + 0.25, rate = 2 + 9 * level;   // crackles per second
  let t = now + 0.02;
  while (t < until) {
    t += -Math.log(1 - Math.random()) / rate;
    if (t >= until) break;
    const cluster = Math.random() < 0.3 ? 2 + Math.floor(Math.random() * 4) : 1;
    for (let k = 0; k < cluster; k += 1) burst(t + k * (0.01 + Math.random() * 0.05), false);
    if (Math.random() < 0.035 * (0.4 + level)) burst(t + 0.03, true);
  }
  // the roar breathes
  roarGain.gain.setTargetAtTime((0.1 + 0.08 * Math.random()) * (0.35 + 0.65 * level), now, 0.4);
}

export function startFire() {
  if (!ctx && !build()) return false;
  ctx.resume();
  on = true;
  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.setTargetAtTime(0.9, ctx.currentTime, 0.6);   // fade in
  if (!timer) timer = setInterval(schedule, 100);
  return true;
}

export function stopFire() {
  on = false;
  if (!ctx) return;
  master.gain.setTargetAtTime(0, ctx.currentTime, 0.25);   // fade out, then stop scheduling
  clearInterval(timer); timer = 0;
  setTimeout(() => { if (!on) ctx.suspend(); }, 1200);
}

export function setLevel(x) { level = Math.max(0, Math.min(1, x)); }
export const fireOn = () => on;
