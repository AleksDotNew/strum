export interface AudioMetrics {
  bass: number; // 0..1 (20-150Hz)
  mid: number;  // 0..1 (150-2500Hz)
  high: number; // 0..1 (2500-16000Hz)
  rms: number;  // 0..1
}

export interface VisualPreset {
  id: string;
  name: string;
  description: string;
  render: (engine: any, audio: AudioMetrics, time?: number) => void;
}

export const VISUAL_PRESETS: VisualPreset[] = [
  {
    id: 'neon-glitch',
    name: 'Neon Glitch',
    description: 'High-energy neon strophes, reactive to bass pulses',
    render: (engine, audio, time = 0) => {
      const bassPulse = audio.bass * 2.0;
      let chain = engine.osc(20 + bassPulse * 30, 0.15 + audio.rms * 0.2, 0.8);
      if (typeof chain.color === 'function') {
        chain = chain.color(0.9 + audio.bass * 0.1, 0.1 + audio.mid * 0.3, 0.8 + audio.high * 0.2);
      }
      if (typeof chain.kaleid === 'function') {
        chain = chain.kaleid(2 + Math.floor(audio.bass * 6));
      }
      if (typeof chain.rotate === 'function') {
        chain = chain.rotate(time * 0.2 + bassPulse * 0.3, 0.1);
      }
      if (typeof chain.modulate === 'function') {
        const modSource = typeof engine.osc === 'function' ? engine.osc(10, 0.1, 0) : chain;
        chain = chain.modulate(modSource, 0.2 + audio.rms * 0.6);
      }
      if (typeof chain.out === 'function') {
        chain.out();
      }
    },
  },
  {
    id: 'cyber-tunnel',
    name: 'Cyber Tunnel',
    description: 'Infinite retro cyber tunnel, speed modulated by mid/high',
    render: (engine, audio, time = 0) => {
      const speed = 0.1 + audio.mid * 0.4 + audio.high * 0.3;
      let chain = engine.osc(15 + audio.mid * 10, speed, 1.2);
      if (typeof chain.kaleid === 'function') {
        chain = chain.kaleid(6);
      }
      if (typeof chain.color === 'function') {
        chain = chain.color(0.1 + audio.bass * 0.2, 0.7 + audio.mid * 0.3, 1.0);
      }
      if (typeof chain.rotate === 'function') {
        chain = chain.rotate(time * speed, 0.05);
      }
      if (typeof chain.scroll === 'function') {
        chain = chain.scroll(time * 0.1, audio.bass * 0.3);
      }
      if (typeof chain.out === 'function') {
        chain.out();
      }
    },
  },
  {
    id: 'audio-ripple',
    name: 'Audio Ripple',
    description: 'Concentric wave ripples driven by RMS & bass',
    render: (engine, audio, time = 0) => {
      const freq = 8 + audio.rms * 28 + audio.bass * 16;
      let chain = engine.osc(freq, 0.08, 1.5);
      if (typeof chain.kaleid === 'function') {
        chain = chain.kaleid(8);
      }
      if (typeof chain.color === 'function') {
        chain = chain.color(1.0, 0.4 + audio.mid * 0.5, 0.2 + audio.bass * 0.8);
      }
      if (typeof chain.rotate === 'function') {
        chain = chain.rotate(time * 0.08, 0.03);
      }
      if (typeof chain.modulate === 'function') {
        const mod = typeof engine.osc === 'function' ? engine.osc(4, 0.1, 0) : chain;
        chain = chain.modulate(mod, audio.bass * 0.5 + audio.rms * 0.3);
      }
      if (typeof chain.out === 'function') {
        chain.out();
      }
    },
  },
  {
    id: 'feedback-void',
    name: 'Feedback Void',
    description: 'Hypnotic feedback loop fractal',
    render: (engine, audio, time = 0) => {
      let chain = engine.osc(12 + audio.high * 15, 0.12, 0.9);
      if (typeof chain.kaleid === 'function') {
        chain = chain.kaleid(5);
      }
      if (typeof chain.color === 'function') {
        chain = chain.color(0.5 + audio.high * 0.5, 0.1, 0.7 + audio.mid * 0.3);
      }
      if (typeof chain.rotate === 'function') {
        chain = chain.rotate(time * 0.15 + audio.rms * 0.25, 0.1);
      }
      if (typeof chain.modulate === 'function') {
        const mod = typeof engine.osc === 'function' ? engine.osc(6, 0.2, 0.5) : chain;
        chain = chain.modulate(mod, 0.3 + audio.bass * 0.5);
      }
      if (typeof chain.out === 'function') {
        chain.out();
      }
    },
  },
  {
    id: 'vhs-synthwave',
    name: 'VHS Synthwave',
    description: '80s synth horizon with grid deformation',
    render: (engine, audio, time = 0) => {
      let chain = engine.osc(18 + audio.bass * 16, 0.08 + audio.bass * 0.1, 0.7);
      if (typeof chain.color === 'function') {
        chain = chain.color(1.0, 0.2 + audio.mid * 0.4, 0.7 + audio.high * 0.3);
      }
      if (typeof chain.scroll === 'function') {
        chain = chain.scroll(0, time * (0.1 + audio.bass * 0.25));
      }
      if (typeof chain.rotate === 'function') {
        chain = chain.rotate(0, 0.02);
      }
      if (typeof chain.modulate === 'function') {
        const mod = typeof engine.osc === 'function' ? engine.osc(3, 0.05, 0) : chain;
        chain = chain.modulate(mod, audio.high * 0.4);
      }
      if (typeof chain.out === 'function') {
        chain.out();
      }
    },
  },
  {
    id: 'kinetic-acid',
    name: 'Kinetic Acid',
    description: 'Acid 303 kaleidoscope geometric patterns',
    render: (engine, audio, time = 0) => {
      const segments = 3 + Math.floor(audio.bass * 5);
      let chain = engine.osc(28 + audio.mid * 32, 0.18, 1.1);
      if (typeof chain.kaleid === 'function') {
        chain = chain.kaleid(segments);
      }
      if (typeof chain.color === 'function') {
        chain = chain.color(0.7 + audio.bass * 0.3, 1.0, 0.1 + audio.mid * 0.3);
      }
      if (typeof chain.rotate === 'function') {
        chain = chain.rotate(time * 0.25, 0.15);
      }
      if (typeof chain.modulate === 'function') {
        const mod = typeof engine.osc === 'function' ? engine.osc(8, 0.1, 0.2) : chain;
        chain = chain.modulate(mod, audio.rms * 0.7);
      }
      if (typeof chain.out === 'function') {
        chain.out();
      }
    },
  },
  {
    id: 'liquid-metal',
    name: 'Liquid Metal',
    description: 'Shimmering chromatic fluid distortions',
    render: (engine, audio, time = 0) => {
      let chain = engine.osc(10 + audio.high * 22, 0.1, 1.4);
      if (typeof chain.kaleid === 'function') {
        chain = chain.kaleid(4);
      }
      if (typeof chain.color === 'function') {
        chain = chain.color(0.8, 0.85 + audio.mid * 0.15, 0.9 + audio.high * 0.1);
      }
      if (typeof chain.rotate === 'function') {
        chain = chain.rotate(time * 0.08, 0.04);
      }
      if (typeof chain.modulate === 'function') {
        const mod = typeof engine.osc === 'function' ? engine.osc(5, 0.2, 0.8) : chain;
        chain = chain.modulate(mod, 0.4 + audio.mid * 0.45);
      }
      if (typeof chain.out === 'function') {
        chain.out();
      }
    },
  },
  {
    id: 'wireframe-grid',
    name: 'Wireframe Grid',
    description: 'Perspective wireframe terrain dancing to frequencies',
    render: (engine, audio, time = 0) => {
      let chain = engine.osc(24 + audio.bass * 12, 0.06, 0.5);
      if (typeof chain.kaleid === 'function') {
        chain = chain.kaleid(4);
      }
      if (typeof chain.color === 'function') {
        chain = chain.color(0.1, 0.9 + audio.high * 0.1, 0.6 + audio.mid * 0.3);
      }
      if (typeof chain.scroll === 'function') {
        chain = chain.scroll(time * 0.05, time * 0.05 + audio.bass * 0.15);
      }
      if (typeof chain.rotate === 'function') {
        chain = chain.rotate(time * 0.05, 0.01);
      }
      if (typeof chain.modulate === 'function') {
        const mod = typeof engine.osc === 'function' ? engine.osc(12, 0.1, 0.5) : chain;
        chain = chain.modulate(mod, audio.bass * 0.55);
      }
      if (typeof chain.out === 'function') {
        chain.out();
      }
    },
  },
];

export function getVisualPreset(id: string): VisualPreset | undefined {
  return VISUAL_PRESETS.find((preset) => preset.id === id);
}
