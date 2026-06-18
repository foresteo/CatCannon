// audio.js — Web Audio API, isolated from canvas/DOM

const Audio = (() => {
  let ctx = null;

  function ensureCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function playTone({ type = 'triangle', freq = 300, freqEnd, duration = 0.18, gain = 0.3, freqRampTime }) {
    try {
      const ac = ensureCtx();
      const osc = ac.createOscillator();
      const gainNode = ac.createGain();
      osc.connect(gainNode);
      gainNode.connect(ac.destination);

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ac.currentTime);
      if (freqEnd !== undefined) {
        osc.frequency.linearRampToValueAtTime(freqEnd, ac.currentTime + (freqRampTime || duration));
      }

      gainNode.gain.setValueAtTime(gain, ac.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);

      osc.start(ac.currentTime);
      osc.stop(ac.currentTime + duration + 0.02);
    } catch (e) { /* ignore */ }
  }

  function playNoise({ duration = 0.1, gain = 0.2 }) {
    try {
      const ac = ensureCtx();
      const bufSize = Math.floor(ac.sampleRate * duration);
      const buf = ac.createBuffer(1, bufSize, ac.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1);
      const src = ac.createBufferSource();
      src.buffer = buf;
      const gainNode = ac.createGain();
      gainNode.gain.setValueAtTime(gain, ac.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
      src.connect(gainNode);
      gainNode.connect(ac.destination);
      src.start();
    } catch (e) { /* ignore */ }
  }

  return {
    play(sound, speed = 5) {
      switch (sound) {
        case 'meow': {
          const freq = Math.min(600, 180 + speed * 8);
          playTone({ type: 'triangle', freq, freqEnd: freq * 0.6, duration: 0.18, gain: 0.25 });
          break;
        }
        case 'boing':
          playTone({ type: 'sine', freq: 180, freqEnd: 420, duration: 0.3, gain: 0.3 });
          break;
        case 'thud':
          playNoise({ duration: 0.08, gain: 0.3 });
          playTone({ type: 'sawtooth', freq: 80, freqEnd: 40, duration: 0.1, gain: 0.2 });
          break;
        case 'bark':
          playTone({ type: 'sawtooth', freq: 120, freqEnd: 80, duration: 0.15, gain: 0.35 });
          setTimeout(() => playTone({ type: 'sawtooth', freq: 100, freqEnd: 60, duration: 0.1, gain: 0.25 }), 100);
          break;
        case 'whoosh':
          playNoise({ duration: 0.2, gain: 0.15 });
          break;
        case 'rocket':
          playNoise({ duration: 0.5, gain: 0.25 });
          playTone({ type: 'sawtooth', freq: 60, freqEnd: 200, duration: 0.5, gain: 0.2 });
          break;
        case 'splash':
          playNoise({ duration: 0.15, gain: 0.35 });
          playTone({ type: 'triangle', freq: 600, freqEnd: 200, duration: 0.2, gain: 0.15 });
          break;
        case 'coin':
          playTone({ type: 'sine', freq: 880, freqEnd: 1200, duration: 0.08, gain: 0.15 });
          break;
        case 'launch':
          playNoise({ duration: 0.12, gain: 0.4 });
          playTone({ type: 'triangle', freq: 200, freqEnd: 80, duration: 0.2, gain: 0.2 });
          break;
      }
    },
  };
})();
