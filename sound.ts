/* Tiny WebAudio synth for game feedback sounds — no assets needed. */

let ctx: AudioContext | null = null;

function ensureCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

export function unlockAudio() {
  ensureCtx();
}

function tone(
  freq: number,
  start: number,
  dur: number,
  type: OscillatorType = "sine",
  vol = 0.14,
) {
  const c = ensureCtx();
  if (!c) return;
  try {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = freq;
    const t0 = c.currentTime + start;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(c.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  } catch {
    /* ignore */
  }
}

export type Sfx = "tap" | "reveal" | "go" | "vote" | "suspense" | "win" | "lose";

export function isMuted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem("spy-sounds") === "0";
  } catch {
    return false;
  }
}

export function setMuted(m: boolean) {
  try {
    localStorage.setItem("spy-sounds", m ? "0" : "1");
  } catch {
    /* ignore */
  }
}

export function playSfx(name: Sfx) {
  if (isMuted()) return;
  switch (name) {
    case "tap":
      tone(660, 0, 0.08, "triangle", 0.12);
      break;
    case "reveal":
      tone(440, 0, 0.12, "sine", 0.12);
      tone(880, 0.1, 0.2, "sine", 0.12);
      break;
    case "go":
      tone(523, 0, 0.12, "triangle", 0.15);
      tone(784, 0.13, 0.24, "triangle", 0.15);
      break;
    case "vote":
      tone(392, 0, 0.07, "square", 0.07);
      tone(523, 0.08, 0.1, "square", 0.07);
      break;
    case "suspense":
      tone(196, 0, 0.32, "sine", 0.14);
      tone(147, 0.28, 0.55, "sine", 0.14);
      break;
    case "win":
      [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.2, "triangle", 0.16));
      break;
    case "lose":
      [400, 320, 240].forEach((f, i) => tone(f, i * 0.14, 0.24, "sawtooth", 0.07));
      break;
  }
}
