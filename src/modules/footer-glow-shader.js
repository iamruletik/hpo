// The gradient-bands shader from gradient-bands.html, mounted into the
// Designer's .footer-scene__glow box in place of footer_grad.webm.
//
// Replacing the video is the point: that was 204kB of VP9 holding a decoder
// session for what is a procedural gradient, and it played from load to unload
// whether or not the footer was on screen. The canvas costs one WebGL context
// and only runs while the footer is actually visible.
//
// TUNING: flip SHOW_CONTROLS back to true to put the panel on screen with a
// live readout of every value. Settle on numbers, paste them into PRESETS,
// flip it off again — that is the whole intended lifecycle of the panel.
const SHOW_CONTROLS = false;

// 991px matches the Designer's medium breakpoint and the @media edge already
// used in footer-scene.css, so the shader flips over at the same width the
// footer's own layout does.
const MOBILE_QUERY = '(max-width: 991px)';

// Tuned per breakpoint rather than scaled from one set: the mobile canvas is
// far narrower for the same 11 bands, so the bands sit closer together and
// need a wider core and a stronger halo to read as separate at all.
const PRESETS = {
  desktop: { speed: 1.62, core: 0.11, coreW: 0.057, core2: 0.34, core2W: 0.17, halo: 0.18, edge: 0.84, dens: 1.14 },
  mobile: { speed: 1.48, core: 0.15, coreW: 0.135, core2: 0.46, core2W: 0.183, halo: 0.35, edge: 1.12, dens: 0.97 },
};

// null picks a fresh random seed every load, so the phase jitter differs each
// visit while the 11 colours stay fixed. Set a number here to pin one exact
// arrangement — the panel prints the current seed alongside the other values.
const SEED = null;

// Not devicePixelRatio — the core line is still ~12px wide at 1x, and the glow
// is a soft gradient where the extra samples buy nothing but fill rate.
const SCALE = 1.0;

const GLOW = '.footer-scene__glow';
const BG_VIDEO = '.footer-scene__bg-video';

const VERT = `
attribute vec2 a;
void main() { gl_Position = vec4(a, 0.0, 1.0); }
`;

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2  uRes;
uniform float uTime;
uniform float uSeed;
uniform float uCore;    // strength of the thin centre line
uniform float uCoreW;   // width of that line, as a fraction of the band's own width
uniform float uCore2;   // strength of the second, wider core sitting under the thin one
uniform float uCore2W;  // width of that second core
uniform float uHalo;    // weight of the wide sideways fade — the bulk of the colour
uniform float uEdge;    // global horizontal falloff exponent, 0 = off, 1 = linear
uniform float uDens;    // overall colour density

const int   N   = 11;
const float FN  = 11.0;
const float TAU = 6.28318;
const float JIT  = 0.35;   // radians of phase jitter; >1.0 starts to break the cancellation
const float FADE = 0.20;   // vertical fade width, FIXED — not scaled by height,
                           // otherwise short bands get hard edges and tall ones go mushy

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float t = uTime;

  // Four brand colours cycled across the eleven bands, FIXED and never touched
  // by the seed. 11 % 4 == 3, so the cycle does not close on itself and the
  // first and last band differ — an 8- or 12-band field would put teal at both
  // ends. Heights, widths and intensities are unchanged from the original set.
  //
  //   TEAL #00CEAC   BLUE #0D96D3   RED #EF5236   PEACH #F6A091
  vec3  bc[N];
  float bh[N], bw[N], bi[N];

  vec3 TEAL  = vec3(0.000, 0.808, 0.675);
  vec3 BLUE  = vec3(0.051, 0.588, 0.827);
  vec3 RED   = vec3(0.937, 0.322, 0.212);
  vec3 PEACH = vec3(0.965, 0.627, 0.569);

  bc[0]=TEAL;  bh[0]=0.62; bw[0]=0.115; bi[0]=0.34;
  bc[1]=BLUE;  bh[1]=0.80; bw[1]=0.130; bi[1]=0.32;
  bc[2]=RED;   bh[2]=0.55; bw[2]=0.105; bi[2]=0.30;
  bc[3]=PEACH; bh[3]=0.70; bw[3]=0.120; bi[3]=0.33;
  bc[4]=TEAL;  bh[4]=0.92; bw[4]=0.100; bi[4]=0.44;
  bc[5]=BLUE;  bh[5]=0.60; bw[5]=0.125; bi[5]=0.36;
  bc[6]=RED;   bh[6]=0.74; bw[6]=0.108; bi[6]=0.31;
  bc[7]=PEACH; bh[7]=0.86; bw[7]=0.132; bi[7]=0.38;
  bc[8]=TEAL;  bh[8]=0.66; bw[8]=0.112; bi[8]=0.37;
  bc[9]=BLUE;  bh[9]=0.90; bw[9]=0.102; bi[9]=0.42;
  bc[10]=RED;  bh[10]=0.58;bw[10]=0.128;bi[10]=0.33;

  // subtractive accumulation. every band contributes absorption, so where two
  // bands overlap you get their real mix instead of the later one winning.
  vec3 absorb = vec3(0.0);

  // Global horizontal falloff. Was smoothstep(uEdge, 1.0, x), which only faded
  // inside a narrow rim near the very edge and left the middle flat — this
  // ramps continuously from centre to both edges, which is what reads as the
  // shader itself getting less visible.
  //
  // uEdge is the exponent: 0 disables the falloff, 1 is linear, higher pulls
  // the colour tighter to the centre.
  //
  // Computed once rather than per band — it only depends on uv.x, so it is the
  // same for all eleven iterations. Applied to absorption, not to the final
  // colour: fading absorbed light takes the edges back toward white, whereas
  // fading the output would drag them toward grey.
  float x = abs(uv.x - 0.5) * 2.0;                     // 0 centre .. 1 either edge
  float edge = pow(max(1.0 - x, 0.0), uEdge);

  for (int i = 0; i < N; i++) {
    float fi = float(i);

    float cx = (fi + 0.5) / FN;        // even across the container width

    // Low-discrepancy jitter. NOT fract(sin(dot(...))) — at seed*78.233 the sin
    // argument runs into the thousands, where float24's mantissa step is ~1e-3,
    // so neighbouring bands get neighbouring "random" values and sync up.
    float j1 = (fract(fi * 0.6180339887 + uSeed       ) - 0.5) * JIT;
    float j2 = (fract(fi * 0.7548776662 + uSeed * 1.7 ) - 0.5) * JIT;
    float j3 = (fract(fi * 0.8191725134 + uSeed * 2.3 ) - 0.5) * JIT;

    // Phase offset is a WHOLE number of cycles across the field. sum of
    // sin(x - 2*pi*i/N) over evenly spaced i is zero, so the bands' brightness
    // cancels in aggregate: the wave still travels, the total never pulses.
    // Sharing one phase slope (the old cx*7.4) made them dip together — that
    // collective dip drove absorb toward 0, and exp(-0) is white.
    float p = cx * TAU;
    float wave = sin(t * 0.48 - p * 1.0 + j1);
    float slow = sin(t * 0.21 - p * 2.0 + j2);
    float fast = sin(t * 0.95 - p * 3.0 + j3);

    float wob = 0.78 + 0.24 * wave + 0.14 * slow + 0.05 * fast;  // 0.42 .. 1.14
    float h   = bh[i] * wob;

    float in_ = bi[i] * (0.90 + 0.10 * wob);   // weak coupling: strong coupling strobes

    float d     = uv.x - cx;
    float halo  = exp(-pow(d / bw[i], 2.0));               // wide sideways fade
    float core  = exp(-pow(d / (bw[i] * uCoreW), 2.0));    // thin centre line
    float core2 = exp(-pow(d / (bw[i] * uCore2W), 2.0));   // wider core beneath it
    float g     = halo * uHalo + core * 0.85 * uCore + core2 * 0.85 * uCore2;

    float v = 1.0 - smoothstep(h - FADE, h + 0.02, uv.y);

    absorb += (1.0 - bc[i]) * clamp(g * v * in_, 0.0, 1.0) * edge;
  }

  vec3 col = exp(-absorb * uDens);                        // Beer–Lambert, never clips
  col += (hash(gl_FragCoord.xy) - 0.5) * (1.6 / 255.0);   // dither: kills 8-bit banding
  gl_FragColor = vec4(col, 1.0);
}
`;

function compile(gl, type, src) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
  return shader;
}

function buildControls(state, onChange) {
  const panel = document.createElement('div');
  panel.className = 'footer-glow-controls';

  // Kept so a breakpoint flip can push the new preset back into the inputs
  // instead of leaving the sliders showing the outgoing set's numbers.
  const rows = [];

  const row = (label, key, min, max, scale, digits = 2) => {
    const wrap = document.createElement('label');
    const input = document.createElement('input');
    const out = document.createElement('output');

    input.type = 'range';
    input.min = min;
    input.max = max;

    const sync = () => {
      input.value = Math.round(state[key] * scale);
      out.textContent = state[key].toFixed(digits);
    };

    input.oninput = () => {
      state[key] = input.value / scale;
      out.textContent = state[key].toFixed(digits);
      onChange();
    };

    sync();
    rows.push(sync);
    wrap.append(label, input, out);
    panel.append(wrap);
  };

  const toggle = document.createElement('button');
  const reroll = document.createElement('button');
  const readout = document.createElement('code');
  const fps = document.createElement('span');

  toggle.textContent = state.running ? 'pause' : 'play';
  toggle.onclick = () => {
    state.running = !state.running;
    toggle.textContent = state.running ? 'pause' : 'play';
    state.last = performance.now();
  };

  reroll.textContent = 'reroll';
  reroll.onclick = () => {
    state.seed = Math.random();
    onChange();
  };

  panel.append(toggle, reroll);
  row('speed', 'speed', 0, 300, 100);
  row('core', 'core', 0, 150, 100);
  // 1..40 over a /1000 scale gives 0.001..0.040 — the useful range sits low,
  // and a /100 scale would only offer four usable steps.
  row('coreW', 'coreW', 1, 200, 1000, 3);
  row('core2', 'core2', 0, 150, 100);
  row('core2W', 'core2W', 1, 500, 1000, 3);
  row('halo', 'halo', 0, 150, 100);
  // Exponent now, not a start point — the useful range runs past 1.0.
  row('edge', 'edge', 0, 400, 100);
  row('dens', 'dens', 40, 220, 100);
  panel.append(fps, readout);

  document.body.append(panel);

  // The line to hand back: paste it straight into PRESETS.
  return {
    sync: () => rows.forEach((refresh) => refresh()),
    update(currentFps) {
      fps.textContent = `${currentFps} fps`;
      readout.textContent =
        `speed: ${state.speed.toFixed(2)}, core: ${state.core.toFixed(2)}, ` +
        `coreW: ${state.coreW.toFixed(3)}, core2: ${state.core2.toFixed(2)}, ` +
        `core2W: ${state.core2W.toFixed(3)}, halo: ${state.halo.toFixed(2)}, ` +
        `edge: ${state.edge.toFixed(2)}, dens: ${state.dens.toFixed(2)}, ` +
        `seed: ${state.seed.toFixed(6)}`;
    },
  };
}

export function initFooterGlowShader() {
  const glow = document.querySelector(GLOW);
  if (!glow) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'footer-glow__canvas';
  canvas.setAttribute('aria-hidden', 'true');

  // preserveDrawingBuffer keeps the last frame alive while paused, so a
  // composite that lands without a redraw doesn't show a cleared buffer.
  const gl = canvas.getContext('webgl', {
    antialias: false,
    alpha: false,
    powerPreference: 'low-power',
    preserveDrawingBuffer: true,
  });

  // No WebGL: leave the video and the Designer's background image alone. The
  // fallback is whatever was already there.
  if (!gl) return;

  glow.append(canvas);
  // Only once the context exists — otherwise a failed init leaves an empty box.
  glow.querySelector(BG_VIDEO)?.remove();

  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'a');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(prog, 'uRes');
  const uTime = gl.getUniformLocation(prog, 'uTime');
  const uSeed = gl.getUniformLocation(prog, 'uSeed');
  const uCore = gl.getUniformLocation(prog, 'uCore');
  const uCoreW = gl.getUniformLocation(prog, 'uCoreW');
  const uCore2 = gl.getUniformLocation(prog, 'uCore2');
  const uCore2W = gl.getUniformLocation(prog, 'uCore2W');
  const uHalo = gl.getUniformLocation(prog, 'uHalo');
  const uEdge = gl.getUniformLocation(prog, 'uEdge');
  const uDens = gl.getUniformLocation(prog, 'uDens');

  // The default clear colour is transparent black; with alpha:false that
  // composites as OPAQUE BLACK, and any cleared frame is a visible flash on a
  // white footer.
  gl.clearColor(1.0, 1.0, 1.0, 1.0);

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = matchMedia(MOBILE_QUERY);
  const preset = () => (mobile.matches ? PRESETS.mobile : PRESETS.desktop);

  const state = {
    t: 0,
    seed: SEED ?? Math.random(),
    running: !reduced,
    last: performance.now(),
    ...preset(),
  };

  function draw() {
    if (gl.isContextLost()) return;
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, state.t);
    gl.uniform1f(uSeed, state.seed);
    gl.uniform1f(uCore, state.core);
    gl.uniform1f(uCoreW, state.coreW);
    gl.uniform1f(uCore2, state.core2);
    gl.uniform1f(uCore2W, state.core2W);
    gl.uniform1f(uHalo, state.halo);
    gl.uniform1f(uEdge, state.edge);
    gl.uniform1f(uDens, state.dens);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function resize() {
    const w = Math.round(canvas.clientWidth * SCALE);
    const h = Math.round(canvas.clientHeight * SCALE);
    if (w === canvas.width && h === canvas.height) return;
    if (!w || !h) return;
    // Assigning width/height CLEARS the drawing buffer — redraw in the same
    // task or the compositor can show the cleared buffer first.
    canvas.width = w;
    canvas.height = h;
    gl.viewport(0, 0, w, h);
    draw();
  }

  const controls = SHOW_CONTROLS ? buildControls(state, draw) : null;

  // Crossing 991px swaps the whole preset. Not a resize listener — matchMedia
  // fires only on the transition, so nothing runs during an ordinary drag.
  mobile.addEventListener('change', () => {
    Object.assign(state, preset());
    controls?.sync();
    draw();
  });

  // The footer is the last thing on the page, so without this the shader burns
  // a rAF loop and a live WebGL context for the entire time the user is
  // anywhere above it.
  let onScreen = false;
  new IntersectionObserver(
    ([entry]) => {
      onScreen = entry.isIntersecting;
      if (onScreen) {
        state.last = performance.now();
        resize();
        draw();
      }
    },
    { rootMargin: '10%' }
  ).observe(glow);

  let frames = 0;
  let fpsClock = state.last;

  function loop(now) {
    requestAnimationFrame(loop);

    const elapsed = (now - state.last) / 1000;
    state.last = now;

    if (!onScreen || !state.running) return;

    state.t += Math.min(elapsed, 0.05) * state.speed;
    draw();

    frames++;
    if (now - fpsClock > 1000) {
      controls?.update(frames);
      frames = 0;
      fpsClock = now;
    }
  }

  new ResizeObserver(resize).observe(canvas);
  resize();
  draw();
  requestAnimationFrame(loop);

  // A lost context leaves a blank canvas until it is rebuilt.
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    state.running = false;
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    state.last = performance.now();
    draw();
  });
}
