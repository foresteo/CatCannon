// audio.js — Web Audio API, isolated from canvas/DOM

const Audio = (() => {
  let ctx = null;

  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  }

  // Calls fn(ac) once the AudioContext is guaranteed to be running
  function whenReady(fn) {
    const ac = getCtx();
    if (ac.state === 'running') {
      fn(ac);
    } else {
      ac.resume().then(() => fn(ac));
    }
  }

  function tone(ac, { type = 'triangle', freq = 300, freqEnd, duration = 0.3, gain = 0.6, freqRampTime }) {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.connect(g);
    g.connect(ac.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ac.currentTime);
    if (freqEnd !== undefined) {
      osc.frequency.linearRampToValueAtTime(freqEnd, ac.currentTime + (freqRampTime || duration));
    }
    g.gain.setValueAtTime(gain, ac.currentTime);
    g.gain.linearRampToValueAtTime(0, ac.currentTime + duration);
    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + duration + 0.05);
  }

  function noise(ac, { duration = 0.1, gain = 0.4 }) {
    const bufSize = Math.floor(ac.sampleRate * duration);
    const buf = ac.createBuffer(1, bufSize, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1);
    const src = ac.createBufferSource();
    src.buffer = buf;
    const g = ac.createGain();
    g.gain.setValueAtTime(gain, ac.currentTime);
    g.gain.linearRampToValueAtTime(0, ac.currentTime + duration);
    src.connect(g);
    g.connect(ac.destination);
    src.start(ac.currentTime);
  }

  return {
    // Call on the very first user gesture so context exists and can resume
    init() {
      try { getCtx().resume(); } catch (e) {}
    },

    play(sound, speed = 5) {
      try {
        whenReady(ac => {
          switch (sound) {
            case 'meow': {
              const freq = Math.min(700, 220 + speed * 10);
              tone(ac, { type: 'triangle', freq, freqEnd: freq * 0.5, duration: 0.35, gain: 0.7 });
              break;
            }
            case 'boing':
              tone(ac, { type: 'sine', freq: 180, freqEnd: 520, duration: 0.35, gain: 0.5 });
              break;
            case 'thud':
              noise(ac, { duration: 0.1, gain: 0.5 });
              tone(ac, { type: 'sawtooth', freq: 80, freqEnd: 30, duration: 0.12, gain: 0.4 });
              break;
            case 'bark':
              tone(ac, { type: 'sawtooth', freq: 140, freqEnd: 80, duration: 0.18, gain: 0.55 });
              setTimeout(() => whenReady(a => tone(a, { type: 'sawtooth', freq: 110, freqEnd: 60, duration: 0.12, gain: 0.4 })), 120);
              break;
            case 'whoosh':
              noise(ac, { duration: 0.25, gain: 0.3 });
              break;
            case 'rocket':
              noise(ac, { duration: 0.6, gain: 0.4 });
              tone(ac, { type: 'sawtooth', freq: 80, freqEnd: 250, duration: 0.6, gain: 0.35 });
              break;
            case 'splash':
              noise(ac, { duration: 0.2, gain: 0.55 });
              tone(ac, { type: 'triangle', freq: 700, freqEnd: 200, duration: 0.25, gain: 0.3 });
              break;
            case 'coin':
              tone(ac, { type: 'sine', freq: 900, freqEnd: 1400, duration: 0.1, gain: 0.25 });
              break;
            case 'launch':
              noise(ac, { duration: 0.15, gain: 0.6 });
              tone(ac, { type: 'triangle', freq: 250, freqEnd: 80, duration: 0.25, gain: 0.35 });
              break;
          }
        });
      } catch (e) {}
    },
  };
})();
