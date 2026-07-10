/**
 * Shader source for InkField (the D15 instrument). Kept as template-literal
 * strings so the component stays a single tree-shakeable unit with zero new
 * dependencies. WebGL1-compatible GLSL (no `#version`, gl_FragColor, constant
 * loop bounds). See docs/design/BLACKOUT_ROLLOUT.md §"The showpiece — InkField".
 */

/** Fullscreen-triangle vertex shader — three clip-space verts cover the screen. */
export const INKFIELD_VERT = /* glsl */ `
attribute vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

/**
 * Fragment shader: domain-warped fbm over Ashima 2D simplex noise. Silver ink
 * over transparent (alpha carries the pools; the chassis shows through), tinted
 * imperceptibly toward money/loss by the signed bias — never violet, no rainbow.
 */
export const INKFIELD_FRAG = /* glsl */ `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2  uResolution;
uniform float uTime;
uniform vec2  uPointer;    // [0,1], y up
uniform float uScroll;     // normalized scroll drift
uniform float uBias;       // -1..1 (session net result)
uniform float uIntensity;  // 0..1
uniform vec3  uInk;        // silver highlight
uniform vec3  uMoney;      // positive tint
uniform vec3  uLoss;       // negative tint

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                     -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m; m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float fbm(vec2 p) {
  float f = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 5; i++) {
    f += amp * snoise(p);
    p *= 2.02;
    amp *= 0.5;
  }
  return f;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  float aspect = uResolution.x / uResolution.y;
  vec2 p = vec2(uv.x * aspect, uv.y);

  // cursor lean: bend the sampling domain gently toward the pointer
  vec2 ptr = vec2(uPointer.x * aspect, uPointer.y);
  vec2 lean = (ptr - p) * 0.18;

  float t = uTime * 0.035;                 // slow ink
  vec2 drift = vec2(0.0, uScroll * 0.6 + t);

  // domain warp for fluid ink
  vec2 q = p * 2.4 + drift + lean;
  vec2 warp = vec2(fbm(q + vec2(0.0, t)), fbm(q + vec2(5.2, -t)));
  float n = fbm(q + warp * 0.9 + lean);

  float v = n * 0.5 + 0.5;
  v = smoothstep(0.32, 0.86, v);

  // fine printed-paper grain, static so it does not shimmer
  float grain = snoise(p * 240.0) * 0.5 + 0.5;
  v = mix(v, v * (0.85 + 0.3 * grain), 0.14);

  // ink density -> alpha; silver luminance carries the body
  float density = v * (0.14 + 0.5 * uIntensity);
  vec3 ink = uInk * (0.55 + 0.45 * v);

  // data tint: only in the denser ink, and even then barely. Never violet.
  vec3 tint = uBias >= 0.0 ? uMoney : uLoss;
  float tintAmt = clamp(v - 0.15, 0.0, 1.0) * abs(uBias) * (0.18 + 0.22 * uIntensity);
  ink = mix(ink, tint, tintAmt);

  // soft vignette harmonizes with the dot-grid radial mask
  vec2 c = vec2((uv.x - 0.5) * aspect, uv.y - 0.5);
  density *= smoothstep(0.95, 0.20, length(c));

  gl_FragColor = vec4(ink, density);
}
`;
