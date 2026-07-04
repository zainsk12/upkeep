// client/src/utils/notificationSound.js
//
// Optional, subtle "new notification" chime (Module 6). Synthesised with the Web
// Audio API so there is NO binary asset to bundle and NO external request (works
// under the app's strict CSP). Two soft sine tones with a quick fade — pleasant,
// short, and quiet.
//
// Autoplay policy: browsers keep an AudioContext SUSPENDED until the user has
// interacted with the page, so this can never blast sound on a cold load. We
// create the context lazily and, if it's still suspended (no gesture yet),
// resume() is attempted and the play simply no-ops on rejection. Every path is
// wrapped so a browser without Web Audio (or a blocked context) degrades to
// silence instead of throwing.

let audioCtx = null;

/** Lazily get (or create) the shared AudioContext. Returns null if unsupported. */
function getContext() {
  if (audioCtx) return audioCtx;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
    return audioCtx;
  } catch {
    return null;
  }
}

/**
 * Play the notification chime. Safe to call anytime — silently does nothing if
 * audio is unavailable or the context can't be unlocked yet.
 */
export function playNotificationSound() {
  const ctx = getContext();
  if (!ctx) return;

  const start = (t0) => {
    try {
      // Master gain envelope — gentle attack + decay so it never clicks.
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.09, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.32);
      gain.connect(ctx.destination);

      // Two-note motif (a pleasant rising interval).
      [
        { freq: 660, at: 0.0 },
        { freq: 880, at: 0.12 },
      ].forEach(({ freq, at }) => {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, t0 + at);
        osc.connect(gain);
        osc.start(t0 + at);
        osc.stop(t0 + at + 0.2);
      });
    } catch {
      /* ignore — degrade to silence */
    }
  };

  try {
    if (ctx.state === "suspended") {
      // Needs a prior user gesture to resume; if none has happened, this rejects
      // and we stay silent (no error surfaced).
      ctx.resume().then(() => start(ctx.currentTime)).catch(() => {});
    } else {
      start(ctx.currentTime);
    }
  } catch {
    /* ignore */
  }
}
