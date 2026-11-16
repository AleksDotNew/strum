import {
  VISUAL_PRESETS,
  getVisualPreset,
  type AudioMetrics,
  type VisualPreset,
} from './visualPresets';

export type { AudioMetrics, VisualPreset };

export interface HydraChainParams {
  freq: number;
  sync: number;
  offset: number;
  kaleid: number;
  color: [number, number, number];
  rotateAngle: number;
  rotateSpeed: number;
  scroll: [number, number];
  modulateAmt: number;
  scale: number;
}

const DEFAULT_PARAMS: HydraChainParams = {
  freq: 10,
  sync: 0.1,
  offset: 0,
  kaleid: 1,
  color: [1, 1, 1],
  rotateAngle: 0,
  rotateSpeed: 0,
  scroll: [0, 0],
  modulateAmt: 0,
  scale: 1,
};

export class HydraChain {
  private engine: HydraEngine;
  private params: HydraChainParams;

  constructor(engine: HydraEngine, initialParams?: Partial<HydraChainParams>) {
    this.engine = engine;
    this.params = { ...DEFAULT_PARAMS, ...initialParams };
  }

  getParams(): HydraChainParams {
    return { ...this.params };
  }

  osc(freq = 10, sync = 0.1, offset = 0): this {
    this.params.freq = freq;
    this.params.sync = sync;
    this.params.offset = offset;
    return this;
  }

  kaleid(n = 4): this {
    this.params.kaleid = Math.max(1, n);
    return this;
  }

  color(r = 1, g = 1, b = 1): this {
    this.params.color = [r, g, b];
    return this;
  }

  modulate(source?: any, amount = 0.1): this {
    this.params.modulateAmt = amount;
    return this;
  }

  rotate(angle = 0, speed = 0): this {
    this.params.rotateAngle = angle;
    this.params.rotateSpeed = speed;
    return this;
  }

  scroll(scrollX = 0, scrollY = 0): this {
    this.params.scroll = [scrollX, scrollY];
    return this;
  }

  scale(amount = 1): this {
    this.params.scale = amount;
    return this;
  }

  out(_target?: any): this {
    this.engine.applyChainParams(this.params);
    return this;
  }
}

const VERTEX_SHADER_SRC = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  v_uv = (a_position + 1.0) * 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER_SRC = `
precision mediump float;
varying vec2 v_uv;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec4 u_audio; // x: bass, y: mid, z: high, w: rms
uniform float u_opacity;

uniform float u_freq;
uniform float u_sync;
uniform float u_offset;
uniform float u_kaleid;
uniform vec3 u_color;
uniform float u_rotate;
uniform vec2 u_scroll;
uniform float u_modulate;

void main() {
  vec2 uv = v_uv;
  vec2 st = (uv - 0.5) * 2.0;
  float aspect = u_resolution.x / max(u_resolution.y, 1.0);
  st.x *= aspect;

  st += u_scroll;

  float cosA = cos(u_rotate);
  float sinA = sin(u_rotate);
  st = vec2(st.x * cosA - st.y * sinA, st.x * sinA + st.y * cosA);

  if (u_kaleid > 1.0) {
    float angle = atan(st.y, st.x);
    float r = length(st);
    float segment = 6.28318530718 / u_kaleid;
    angle = abs(mod(angle, segment) - segment * 0.5);
    st = vec2(cos(angle), sin(angle)) * r;
  }

  if (u_modulate > 0.0) {
    st += vec2(
      sin(st.y * 5.0 + u_time) * 0.1,
      cos(st.x * 5.0 + u_time) * 0.1
    ) * u_modulate;
  }

  float d = length(st);
  float wave = sin(st.x * u_freq + u_time * u_sync + u_offset + d * (u_audio.x * 8.0));
  wave = 0.5 + 0.5 * wave;

  vec3 col = u_color * wave;
  col += vec3(
    sin(u_time * 2.0 + st.y * 3.0) * u_audio.y,
    cos(u_time * 1.5 + st.x * 3.0) * u_audio.z,
    sin(u_time * 3.0 + d * 4.0) * u_audio.x
  ) * 0.35;

  gl_FragColor = vec4(clamp(col, 0.0, 1.0) * u_opacity, u_opacity);
}
`;

export class HydraEngine {
  private canvas: HTMLCanvasElement | null = null;
  private gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
  private ctx2d: CanvasRenderingContext2D | null = null;

  private program: WebGLProgram | null = null;
  private quadBuffer: WebGLBuffer | null = null;
  private aPositionLoc = -1;
  private uResolutionLoc: WebGLUniformLocation | null = null;
  private uTimeLoc: WebGLUniformLocation | null = null;
  private uAudioLoc: WebGLUniformLocation | null = null;
  private uOpacityLoc: WebGLUniformLocation | null = null;
  private uFreqLoc: WebGLUniformLocation | null = null;
  private uSyncLoc: WebGLUniformLocation | null = null;
  private uOffsetLoc: WebGLUniformLocation | null = null;
  private uKaleidLoc: WebGLUniformLocation | null = null;
  private uColorLoc: WebGLUniformLocation | null = null;
  private uRotateLoc: WebGLUniformLocation | null = null;
  private uScrollLoc: WebGLUniformLocation | null = null;
  private uModulateLoc: WebGLUniformLocation | null = null;

  private currentPreset: VisualPreset = VISUAL_PRESETS[0];
  private opacity = 1.0;
  private activeParams: HydraChainParams = { ...DEFAULT_PARAMS };

  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private sampleRate = 44100;
  private freqData: Uint8Array | null = null;
  private timeData: Uint8Array | null = null;
  private audioMetrics: AudioMetrics = { bass: 0, mid: 0, high: 0, rms: 0 };

  private running = false;
  private rafId: number | null = null;
  private startTime = 0;

  public readonly s0 = {
    init: (_opts?: any) => {},
  };

  constructor() {
    this.startTime = Date.now();
  }

  init(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;

    const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
    const width = canvas.clientWidth ? Math.floor(canvas.clientWidth * dpr) : (canvas.width || 412);
    const height = canvas.clientHeight ? Math.floor(canvas.clientHeight * dpr) : (canvas.height || 915);
    canvas.width = width;
    canvas.height = height;

    try {
      if (typeof canvas.getContext === 'function') {
        const glCtx = (canvas.getContext('webgl2') || canvas.getContext('webgl')) as
          | WebGLRenderingContext
          | WebGL2RenderingContext
          | null;
        if (glCtx) {
          this.gl = glCtx;
          this.initWebGL();
        } else {
          this.ctx2d = canvas.getContext('2d');
        }
      }
    } catch {
      // Headless / mock context safe fallback
      this.gl = null;
      this.ctx2d = null;
    }
  }

  private initWebGL(): void {
    const gl = this.gl;
    if (!gl) return;

    try {
      const vertShader = this.compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SRC);
      const fragShader = this.compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SRC);
      if (!vertShader || !fragShader) return;

      const program = gl.createProgram();
      if (!program) return;

      gl.attachShader(program, vertShader);
      gl.attachShader(program, fragShader);
      gl.linkProgram(program);

      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        gl.deleteProgram(program);
        return;
      }

      this.program = program;
      this.aPositionLoc = gl.getAttribLocation(program, 'a_position');
      this.uResolutionLoc = gl.getUniformLocation(program, 'u_resolution');
      this.uTimeLoc = gl.getUniformLocation(program, 'u_time');
      this.uAudioLoc = gl.getUniformLocation(program, 'u_audio');
      this.uOpacityLoc = gl.getUniformLocation(program, 'u_opacity');
      this.uFreqLoc = gl.getUniformLocation(program, 'u_freq');
      this.uSyncLoc = gl.getUniformLocation(program, 'u_sync');
      this.uOffsetLoc = gl.getUniformLocation(program, 'u_offset');
      this.uKaleidLoc = gl.getUniformLocation(program, 'u_kaleid');
      this.uColorLoc = gl.getUniformLocation(program, 'u_color');
      this.uRotateLoc = gl.getUniformLocation(program, 'u_rotate');
      this.uScrollLoc = gl.getUniformLocation(program, 'u_scroll');
      this.uModulateLoc = gl.getUniformLocation(program, 'u_modulate');

      const quadBuffer = gl.createBuffer();
      if (quadBuffer) {
        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
        const quadVertices = new Float32Array([
          -1, -1,
           1, -1,
          -1,  1,
          -1,  1,
           1, -1,
           1,  1,
        ]);
        gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);
        this.quadBuffer = quadBuffer;
      }
    } catch {
      // Safe fallback if WebGL fails
    }
  }

  private compileShader(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  setPreset(id: string): void {
    const preset = getVisualPreset(id);
    if (preset) {
      this.currentPreset = preset;
    }
  }

  getCurrentPreset(): VisualPreset {
    return this.currentPreset;
  }

  setOpacity(val: number): void {
    this.opacity = Math.max(0, Math.min(1, val));
  }

  getOpacity(): number {
    return this.opacity;
  }

  connectAudio(audioContext: AudioContext, sourceNode?: AudioNode): void {
    this.audioContext = audioContext;
    this.sampleRate = audioContext.sampleRate || 44100;
    try {
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.8;
      if (sourceNode && typeof sourceNode.connect === 'function') {
        sourceNode.connect(analyser);
      }
      this.analyserNode = analyser;
      this.freqData = new Uint8Array(analyser.frequencyBinCount);
      this.timeData = new Uint8Array(analyser.fftSize);
    } catch (e) {
      console.warn('HydraEngine: Failed to connect audio analyser', e);
    }
  }

  getAnalyserNode(): AnalyserNode | null {
    return this.analyserNode;
  }

  updateAudio(metrics: AudioMetrics): void {
    this.audioMetrics = {
      bass: Math.max(0, Math.min(1, metrics.bass)),
      mid: Math.max(0, Math.min(1, metrics.mid)),
      high: Math.max(0, Math.min(1, metrics.high)),
      rms: Math.max(0, Math.min(1, metrics.rms)),
    };
  }

  getAudioMetrics(): AudioMetrics {
    if (this.analyserNode && this.freqData) {
      try {
        this.analyserNode.getByteFrequencyData(this.freqData as any);
        const nyquist = this.sampleRate / 2;
        const binCount = this.freqData.length;

        // Bass: 20-150 Hz
        const bassStart = Math.max(0, Math.floor((20 / nyquist) * binCount));
        const bassEnd = Math.max(bassStart + 1, Math.ceil((150 / nyquist) * binCount));
        let bassSum = 0;
        for (let i = bassStart; i < Math.min(bassEnd, binCount); i++) {
          bassSum += this.freqData[i];
        }
        const bass = bassSum / (Math.max(1, bassEnd - bassStart) * 255);

        // Mid: 150-2500 Hz
        const midStart = bassEnd;
        const midEnd = Math.max(midStart + 1, Math.ceil((2500 / nyquist) * binCount));
        let midSum = 0;
        for (let i = midStart; i < Math.min(midEnd, binCount); i++) {
          midSum += this.freqData[i];
        }
        const mid = midSum / (Math.max(1, midEnd - midStart) * 255);

        // High: 2500-16000 Hz
        const highStart = midEnd;
        const highEnd = Math.max(highStart + 1, Math.ceil((16000 / nyquist) * binCount));
        let highSum = 0;
        for (let i = highStart; i < Math.min(highEnd, binCount); i++) {
          highSum += this.freqData[i];
        }
        const high = highSum / (Math.max(1, highEnd - highStart) * 255);

        // RMS from time domain data
        let rms = 0;
        if (this.timeData && typeof this.analyserNode.getByteTimeDomainData === 'function') {
          this.analyserNode.getByteTimeDomainData(this.timeData as any);
          let sumSq = 0;
          for (let i = 0; i < this.timeData.length; i++) {
            const norm = (this.timeData[i] - 128) / 128;
            sumSq += norm * norm;
          }
          rms = Math.min(1, Math.sqrt(sumSq / this.timeData.length));
        } else {
          let sumSq = 0;
          for (let i = 0; i < binCount; i++) {
            const norm = this.freqData[i] / 255;
            sumSq += norm * norm;
          }
          rms = Math.min(1, Math.sqrt(sumSq / binCount));
        }

        this.audioMetrics = {
          bass: Math.min(1, Math.max(0, bass)),
          mid: Math.min(1, Math.max(0, mid)),
          high: Math.min(1, Math.max(0, high)),
          rms: Math.min(1, Math.max(0, rms)),
        };
      } catch {
        // Keep existing metrics on error
      }
    }

    return { ...this.audioMetrics };
  }

  applyChainParams(params: HydraChainParams): void {
    this.activeParams = { ...params };
  }

  // Hydra Chaining DSL entry points
  osc(freq?: number, sync?: number, offset?: number): HydraChain {
    const chain = new HydraChain(this);
    return chain.osc(freq, sync, offset);
  }

  kaleid(n?: number): HydraChain {
    const chain = new HydraChain(this);
    return chain.kaleid(n);
  }

  color(r?: number, g?: number, b?: number): HydraChain {
    const chain = new HydraChain(this);
    return chain.color(r, g, b);
  }

  modulate(source?: any, amount?: number): HydraChain {
    const chain = new HydraChain(this);
    return chain.modulate(source, amount);
  }

  rotate(angle?: number, speed?: number): HydraChain {
    const chain = new HydraChain(this);
    return chain.rotate(angle, speed);
  }

  scroll(scrollX?: number, scrollY?: number): HydraChain {
    const chain = new HydraChain(this);
    return chain.scroll(scrollX, scrollY);
  }

  scale(amount?: number): HydraChain {
    const chain = new HydraChain(this);
    return chain.scale(amount);
  }

  out(target?: any): HydraChain {
    const chain = new HydraChain(this);
    return chain.out(target);
  }

  renderFrame(time?: number): void {
    const t = typeof time === 'number' ? time : (Date.now() - this.startTime) * 0.001;
    const metrics = this.getAudioMetrics();

    try {
      this.currentPreset.render(this, metrics, t);
    } catch (e) {
      console.warn('HydraEngine: preset render failed', e);
    }

    if (!this.canvas) return;

    // Mobile canvas sizing check
    if (this.canvas.clientWidth && this.canvas.clientHeight) {
      const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
      const targetW = Math.floor(this.canvas.clientWidth * dpr);
      const targetH = Math.floor(this.canvas.clientHeight * dpr);
      if (this.canvas.width !== targetW || this.canvas.height !== targetH) {
        this.canvas.width = targetW;
        this.canvas.height = targetH;
      }
    }

    // WebGL render pass
    const gl = this.gl;
    if (gl && this.program && this.quadBuffer) {
      try {
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        gl.useProgram(this.program);

        gl.uniform2f(this.uResolutionLoc, this.canvas.width, this.canvas.height);
        gl.uniform1f(this.uTimeLoc, t);
        gl.uniform4f(this.uAudioLoc, metrics.bass, metrics.mid, metrics.high, metrics.rms);
        gl.uniform1f(this.uOpacityLoc, this.opacity);

        gl.uniform1f(this.uFreqLoc, this.activeParams.freq);
        gl.uniform1f(this.uSyncLoc, this.activeParams.sync);
        gl.uniform1f(this.uOffsetLoc, this.activeParams.offset);
        gl.uniform1f(this.uKaleidLoc, this.activeParams.kaleid);
        gl.uniform3f(
          this.uColorLoc,
          this.activeParams.color[0],
          this.activeParams.color[1],
          this.activeParams.color[2]
        );
        gl.uniform1f(this.uRotateLoc, this.activeParams.rotateAngle);
        gl.uniform2f(this.uScrollLoc, this.activeParams.scroll[0], this.activeParams.scroll[1]);
        gl.uniform1f(this.uModulateLoc, this.activeParams.modulateAmt);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
        if (this.aPositionLoc >= 0) {
          gl.enableVertexAttribArray(this.aPositionLoc);
          gl.vertexAttribPointer(this.aPositionLoc, 2, gl.FLOAT, false, 0, 0);
        }

        gl.drawArrays(gl.TRIANGLES, 0, 6);
      } catch {
        // Ignore render errors in test / headless
      }
      return;
    }

    // 2D Canvas fallback
    if (this.ctx2d) {
      try {
        const ctx = this.ctx2d;
        const w = this.canvas.width || 412;
        const h = this.canvas.height || 915;
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.fillStyle = '#05050f';
        ctx.fillRect(0, 0, w, h);

        const cx = w / 2;
        const cy = h / 2;
        const r = Math.floor(this.activeParams.color[0] * 255);
        const g = Math.floor(this.activeParams.color[1] * 255);
        const b = Math.floor(this.activeParams.color[2] * 255);
        const radius = Math.min(w, h) * (0.2 + metrics.bass * 0.3);

        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.lineWidth = 4 + metrics.rms * 10;
        ctx.stroke();
        ctx.restore();
      } catch {
        // Ignore fallback errors in test
      }
    }
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.startTime = Date.now();

    const loop = () => {
      if (!this.running) return;
      const now = Date.now();
      const elapsed = (now - this.startTime) * 0.001;
      this.renderFrame(elapsed);

      const raf =
        typeof globalThis.requestAnimationFrame === 'function'
          ? globalThis.requestAnimationFrame
          : (cb: FrameRequestCallback) => setTimeout(cb, 16) as unknown as number;

      this.rafId = raf(loop);
    };

    const raf =
      typeof globalThis.requestAnimationFrame === 'function'
        ? globalThis.requestAnimationFrame
        : (cb: FrameRequestCallback) => setTimeout(cb, 16) as unknown as number;

    this.rafId = raf(loop);
  }

  stop(): void {
    this.running = false;
    if (this.rafId !== null) {
      const caf =
        typeof globalThis.cancelAnimationFrame === 'function'
          ? globalThis.cancelAnimationFrame
          : (id: number) => clearTimeout(id as any);
      caf(this.rafId);
      this.rafId = null;
    }
  }

  destroy(): void {
    this.stop();
    if (this.gl && this.program) {
      try {
        this.gl.deleteProgram(this.program);
      } catch {}
    }
    if (this.gl && this.quadBuffer) {
      try {
        this.gl.deleteBuffer(this.quadBuffer);
      } catch {}
    }
    this.gl = null;
    this.program = null;
    this.quadBuffer = null;
    this.ctx2d = null;
    this.canvas = null;
    this.analyserNode = null;
    this.audioContext = null;
    this.freqData = null;
    this.timeData = null;
  }
}

export const hydraEngine = new HydraEngine();
