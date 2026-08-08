// TEMPORARY preview module — replaces the hero background <video> in-place
// with a canvas running a WebGL shader, for visual comparison. Delete this
// file + its wiring in main.js once the preview isn't needed anymore.
//
// Shader source lifted as-is from bent-sheet.html (repo root).

const VERTEX_SHADER = `
attribute vec2 a_pos;
void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }`;

const FRAGMENT_SHADER = `
precision highp float;

uniform vec2  u_res;
uniform float u_time;

#define SPEED  0.75
#define SLOPE  1.05
#define THICK  0.70
#define IOR    1.50

mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

float sdBox(vec2 p, vec2 b, float r){
  vec2 d = abs(p) - b;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r;
}

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i),              hash(i + vec2(1, 0)), u.x),
             mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}

void meshPt(vec2 p, vec2 c, float sigma, vec3 col, inout vec3 acc, inout float wsum){
  vec2 r = p - c;
  float w = exp(-dot(r, r) / (sigma * sigma));
  float l = dot(col, vec3(0.299, 0.587, 0.114));
  vec3 c2 = col * (0.45 + 1.45 * w) + vec3(1.0) * (w * w * l * 0.55);
  acc += c2 * w;
  wsum += w;
}

vec3 bg(vec2 p, float t){
  p = rot(0.14 * sin(t * 0.09)) * (p + 0.28 * vec2(sin(t * 0.14), cos(t * 0.11)));

  vec3 acc = vec3(0.0);
  float ws = 1e-4;

  meshPt(p, vec2(-0.65, 0.45) + 0.22 * vec2(sin(t * 0.31), cos(t * 0.24)),
         0.55, vec3(1.00, 0.40, 0.10), acc, ws);
  meshPt(p, vec2(-0.20, 0.05) + 0.18 * vec2(cos(t * 0.27), sin(t * 0.21)),
         0.45, vec3(0.55, 0.10, 0.02), acc, ws);

  meshPt(p, vec2(0.60, 0.60) + 0.24 * vec2(sin(t * 0.22 + 2.0), cos(t * 0.29)),
         0.55, vec3(0.00, 0.50, 0.58), acc, ws);
  meshPt(p, vec2(0.55, -0.55) + 0.20 * vec2(cos(t * 0.26 + 1.0), sin(t * 0.33)),
         0.50, vec3(0.02, 0.14, 0.40), acc, ws);
  meshPt(p, vec2(0.15, -0.15) + 0.16 * vec2(sin(t * 0.35 + 4.0), cos(t * 0.19)),
         0.35, vec3(0.10, 0.65, 0.72), acc, ws);

  meshPt(p, vec2(0.05, 0.20) + 0.26 * vec2(sin(t * 0.24 + 1.7), cos(t * 0.20 + 0.6)),
         0.34, vec3(0.06, 0.62, 0.34), acc, ws);
  meshPt(p, vec2(-0.10, -0.35) + 0.22 * vec2(cos(t * 0.29 + 3.4), sin(t * 0.23 + 2.2)),
         0.30, vec3(0.10, 0.55, 0.28), acc, ws);
  meshPt(p, vec2(-0.40, 0.15) + 0.18 * vec2(sin(t * 0.31 + 5.2), cos(t * 0.26 + 1.1)),
         0.24, vec3(0.95, 0.70, 0.25), acc, ws);
  meshPt(p, vec2(0.45, -0.30) + 0.20 * vec2(cos(t * 0.22 + 2.8), sin(t * 0.28 + 4.6)),
         0.28, vec3(0.22, 0.10, 0.48), acc, ws);

  meshPt(p, vec2(0.05, 0.55) + 0.30 * vec2(cos(t * 0.18 + 3.0), sin(t * 0.25)),
         0.50, vec3(0.0), acc, ws);
  meshPt(p, vec2(-0.45, -0.55) + 0.28 * vec2(sin(t * 0.23 + 5.0), cos(t * 0.30)),
         0.55, vec3(0.0), acc, ws);
  meshPt(p, vec2(0.85, 0.00) + 0.20 * vec2(sin(t * 0.28), cos(t * 0.22 + 2.5)),
         0.50, vec3(0.0), acc, ws);
  meshPt(p, vec2(-0.05, -0.20) + 0.35 * vec2(cos(t * 0.21 + 1.3), sin(t * 0.27 + 4.1)),
         0.55, vec3(0.0), acc, ws);

  vec3 col = acc / ws;

  float bal = col.r / (col.r + col.b + 1e-3);
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  float seam = 1.0 - smoothstep(0.0, 0.26, abs(bal - 0.5));
  col *= 1.0 - 0.80 * seam * smoothstep(0.04, 0.18, lum);

  float edge = smoothstep(1.05, 0.52, length(p * vec2(0.80, 1.05)));
  col *= edge;

  float l = dot(col, vec3(0.299, 0.587, 0.114));
  col = clamp(mix(vec3(l), col, 1.55), 0.0, 1.0);
  col = col * col * (3.0 - 2.0 * col);
  col = mix(col, col * col * (3.0 - 2.0 * col), 0.5);

  return col;
}

void fold(vec2 p, float t, float ang, vec2 off, float curv, float w0, float amp, float seed,
          inout float h){
  vec2 q = rot(ang) * (p - off);
  float s = q.y - curv * q.x * q.x;
  s += 0.06 * (vnoise(vec2(q.x * 1.6 + seed * 3.1, t * 0.45)) - 0.5) * 2.0;
  float w = w0 * (0.16 + 0.95 * vnoise(vec2(q.x * 1.1 + seed, t * 0.30)));
  float a = amp * smoothstep(0.22, 0.58, vnoise(vec2(q.x * 0.8 + seed * 2.7, t * 0.24)));
  h += a * exp(-s * s / (w * w));
}

float sheetH(vec2 p, float t){
  vec2 w = p + 0.50 * vec2(vnoise(p * 0.7 + vec2(0.0,  t * 0.28)) - 0.5,
                           vnoise(p * 0.7 + vec2(4.7, -t * 0.24)) - 0.5) * 2.0;

  float h = 0.0;
  h += 0.14 * sin(w.x * 1.6 + t * 0.50);
  h += 0.12 * sin(w.y * 1.4 - t * 0.40 + 1.7);
  h += 0.10 * vnoise(w * 1.3 + t * 0.20);

  vec2 c1 = vec2(0.50 * sin(t * 0.33),  0.40 * cos(t * 0.26));
  vec2 r1 = p - c1;
  h += 0.32 * exp(-dot(r1, r1) / 0.25);

  vec2 c2 = vec2(-0.55 * cos(t * 0.21), -0.35 * sin(t * 0.29));
  vec2 r2 = p - c2;
  h -= 0.27 * exp(-dot(r2, r2) / 0.30);

  {
    vec2 fq = rot(0.85 + 0.07 * sin(t * 0.18)) *
              (p - vec2(0.22 - 0.12 * sin(t * 0.15), 0.12 + 0.08 * cos(t * 0.13)));
    float band = smoothstep(0.48, 0.30, abs(fq.y));
    float curl = 0.50 + 0.35 * sin(fq.x * 2.2 + t * 0.40)
               + 0.15 * vnoise(vec2(fq.x * 1.6, t * 0.35));
    h += band * curl * 0.42;
  }

  fold(p, t, -0.50 + 0.10 * sin(t * 0.19), vec2(-0.10, 0.25 + 0.06 * sin(t * 0.23)),
       0.35,  0.090,  0.90, 1.0, h);
  fold(p, t,  0.55 + 0.09 * cos(t * 0.22), vec2( 0.20, 0.50),
       -0.45, 0.100, -0.75, 4.2, h);
  fold(p, t,  1.20 + 0.08 * sin(t * 0.17), vec2( 0.10, -0.40 + 0.05 * cos(t * 0.21)),
       0.20,  0.075,  0.80, 8.9, h);

  return h;
}

vec3 sheetN(vec2 p, float t, out float h0){
  float e = 1.8 / u_res.y;
  h0 = sheetH(p, t);
  float hx = sheetH(p + vec2(e, 0.0), t);
  float hy = sheetH(p + vec2(0.0, e), t);
  return normalize(vec3((h0 - hx) / e * SLOPE, (h0 - hy) / e * SLOPE, 1.0));
}

vec3 env(vec3 R, float t){
  vec3 L1 = normalize(vec3(cos(t * 0.30) * 0.7, 0.70, 0.45 + 0.20 * sin(t * 0.26)));
  vec3 L2 = normalize(vec3(-0.55, -0.35 + 0.30 * cos(t * 0.28), 0.60));

  vec3 c = vec3(0.0);
  c += vec3(1.00, 0.82, 0.55) * pow(max(dot(R, L1), 0.0), 20.0)  * 1.25;
  c += vec3(0.12, 0.45, 0.95) * pow(max(dot(R, L2), 0.0), 12.0)  * 0.55;
  c += vec3(1.00, 0.97, 0.92) * pow(max(dot(R, L1), 0.0), 450.0) * 6.0;
  return c;
}

void main(){
  vec2 p = (gl_FragCoord.xy * 2.0 - u_res) / u_res.y;
  float t = u_time * SPEED;

  float h0;
  vec3 n = sheetN(p, t, h0);
  vec3 I = vec3(0.0, 0.0, -1.0);

  float F = 0.035 + 0.965 * pow(1.0 - max(n.z, 0.0), 8.0);

  float thick = THICK * (0.50 + 0.85 * clamp(h0 * 0.55 + 0.5, 0.0, 1.0));

  vec3 col;
  {
    // Chromatic dispersion originally sampled bg() three times (once per
    // channel at its own IOR). Blue is now mirror-extrapolated from
    // red/green instead of sampled directly — red and blue sit at
    // symmetric +/-0.065 IOR offsets around green, so bg() being roughly
    // linear across that small a gap makes colB = colG + (colG - colR) a
    // close stand-in for a real third sample, for 1/3 less of the most
    // expensive part of this shader (each bg() call is 13 gradient points).
    vec3 rr = refract(I, n, 1.0 / (IOR - 0.065));
    vec3 rg = refract(I, n, 1.0 / IOR);
    vec3 colAtR = bg(p + rr.xy / max(-rr.z, 0.35) * thick, t);
    vec3 colAtG = bg(p + rg.xy / max(-rg.z, 0.35) * thick, t);
    col.r = colAtR.r;
    col.g = colAtG.g;
    col.b = clamp(colAtG.b + (colAtG.b - colAtR.b), 0.0, 1.0);
  }

  col *= (1.0 - F * 0.55);

  float mx = max(col.r, max(col.g, col.b));
  vec3 tint = mix(vec3(1.0), col / max(mx, 0.12), smoothstep(0.05, 0.30, mx));
  col += env(reflect(I, n), t) * F * tint;

  col += col * col * 0.40;
  col *= 1.0 - 0.24 * dot(p * vec2(0.60, 0.82), p * vec2(0.60, 0.82));
  col = max(col - 0.014, 0.0);
  col = pow(col, vec3(0.4545));
  gl_FragColor = vec4(col, 1.0);
}
`;

function compileShader(gl, type, src) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader));
  }
  return shader;
}

// Cap devicePixelRatio for this shader specifically — it's expensive
// per-pixel (multiple full background evaluations per fragment for chromatic
// dispersion, each with ~12 gradient points), so rendering it at full
// retina resolution over a large hero area is a lot of GPU work every frame.
const MAX_DPR = 1;

// Render at a fraction of the viewport's pixel size and let the browser
// upscale the canvas via CSS — cost scales with pixel count, so this is the
// single biggest lever. 0.65 is soft on a moving, already-blurry background
// without looking obviously low-res.
const RENDER_SCALE = 0.65;

// Ambient background motion doesn't need 60/120hz — cap the actual draw
// calls to ~30fps. requestAnimationFrame still fires at display refresh
// rate (needed so the visibility check below stays responsive) but frames
// in between are skipped.
const TARGET_FPS = 30;
const FRAME_INTERVAL_MS = 1000 / TARGET_FPS;

export function initHeroShaderPreview() {
  const video = document.querySelector('.hero-background-video');
  if (!video) return;

  const canvas = document.createElement('canvas');
  // position:fixed takes it out of the video's old layout box entirely and
  // sizes it to the actual browser viewport, regardless of how big the
  // hero section/video container itself is.
  canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;display:block;';

  // antialias off: the canvas already renders below native resolution and
  // gets CSS-upscaled (see RENDER_SCALE), which softens edges on its own —
  // MSAA on top of that is paying for smoothing nobody sees.
  const gl = canvas.getContext('webgl', { antialias: false });
  if (!gl) {
    console.warn('[Hero Shader Preview] WebGL not available');
    return;
  }

  // Appended to <body> directly, not left in the video's old spot — that
  // spot sits inside .hero-video-embed, which hero-video-parallax.js applies
  // a scroll-scrubbed transform to. Any transformed ancestor becomes the
  // containing block for position:fixed descendants, so leaving the canvas
  // nested in there dragged it along with the parallax instead of staying
  // anchored to the real viewport.
  video.remove();
  document.body.prepend(canvas);

  const program = gl.createProgram();
  gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER));
  gl.attachShader(program, compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER));
  gl.linkProgram(program);
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const posLocation = gl.getAttribLocation(program, 'a_pos');
  gl.enableVertexAttribArray(posLocation);
  gl.vertexAttribPointer(posLocation, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(program, 'u_res');
  const uTime = gl.getUniformLocation(program, 'u_time');

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR) * RENDER_SCALE;
    canvas.width = Math.max(1, Math.round(window.innerWidth * dpr));
    canvas.height = Math.max(1, Math.round(window.innerHeight * dpr));
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  window.addEventListener('resize', resize);
  resize();

  // The canvas is position:fixed to the viewport, not scoped to the hero
  // section, so without this it keeps paying full shader cost forever —
  // even scrolled ten sections down with the hero nowhere on screen.
  let heroVisible = true;
  const sectionHero = document.querySelector('.section_hero');
  if (sectionHero) {
    new IntersectionObserver(([entry]) => {
      heroVisible = entry.isIntersecting;
    }, { rootMargin: '200px' }).observe(sectionHero);
  }

  let lastDrawMs = 0;
  function frame(ms) {
    requestAnimationFrame(frame);
    if (!heroVisible) return;
    if (ms - lastDrawMs < FRAME_INTERVAL_MS) return;
    lastDrawMs = ms;

    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, ms * 0.001);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  requestAnimationFrame(frame);
}
