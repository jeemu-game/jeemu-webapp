// The fire, as sound: a real fireplace recording (public/tonight/fire.mp3), looped without a gap through Web Audio.
// Browsers only allow sound after a tap or click, so it starts from the "Sound" button, never by itself.
// setLevel(0..1) follows the fire in the story: full while people play, softer as it burns down to embers.
// available(): resolves true only if the recording is actually there (the button stays hidden until then).

const URL_ = `${import.meta.env.BASE_URL}tonight/fire.mp3`;
let ctx = null, gain = null, src = null, buffer = null, level = 1, on = false, checked = null;

export function available() {
  if (!checked) {
    checked = fetch(URL_, { method: 'HEAD' })
      .then((r) => r.ok && /audio|mpeg|octet/.test(r.headers.get('content-type') || ''))
      .catch(() => false);
  }
  return checked;
}

const volume = () => 0.18 + 0.5 * level;   // quiet: it's a room tone, not a soundtrack

export async function startFire() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  if (!ctx) { ctx = new AC(); gain = ctx.createGain(); gain.gain.value = 0; gain.connect(ctx.destination); }
  await ctx.resume();
  on = true;
  try {
    if (!buffer) buffer = await ctx.decodeAudioData(await (await fetch(URL_)).arrayBuffer());
  } catch (_) { on = false; return false; }
  if (!src) { src = ctx.createBufferSource(); src.buffer = buffer; src.loop = true; src.connect(gain); src.start(); }
  gain.gain.cancelScheduledValues(ctx.currentTime);
  gain.gain.setTargetAtTime(volume(), ctx.currentTime, 0.8);   // fade in
  return true;
}

export function stopFire() {
  on = false;
  if (!ctx) return;
  gain.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
  setTimeout(() => { if (!on) ctx.suspend(); }, 1500);
}

export function setLevel(x) {
  const next = Math.max(0, Math.min(1, x));
  if (Math.abs(next - level) < 0.02) return;   // called every frame while scrolling: only act on real changes
  level = next;
  if (on && ctx) gain.gain.setTargetAtTime(volume(), ctx.currentTime, 1.5);
}
