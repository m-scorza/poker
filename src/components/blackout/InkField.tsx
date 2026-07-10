/**
 * InkField — the D15 data-reactive WebGL shader instrument (the campaign
 * showpiece). A living ink-light field on the INK MONO chassis: slow fluid
 * grain that leans toward the cursor, drifts with scroll, and tints
 * imperceptibly toward --money / --loss with a signed `bias` (the consumer
 * derives it from the session's net result). Monochrome silver-on-near-black
 * at rest; chromatic only through the data bias, and even then barely. Never
 * violet (D3: the signature never touches data — and this IS data).
 *
 * Instrument, not decoration (D15's scoped exception to D8). It renders a
 * <canvas> filling its parent; nothing imports it yet — the landing hero wave
 * consumes it later. Spec: docs/design/BLACKOUT_ROLLOUT.md §"The showpiece".
 *
 * Perf budget (hard): DPR capped at 1.5; rAF paused when off-screen
 * (IntersectionObserver) or tab-hidden (visibilitychange); uniforms updated
 * in-loop without allocations; context loss falls back to static grain.
 *
 * Fallback (hard): no WebGL, `prefers-reduced-motion`, or body[data-motion=off]
 * renders the static SVG-turbulence grain treatment (same visual weight, zero
 * JS animation) — the same data-URI the pixel reference uses.
 */
import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { INKFIELD_VERT, INKFIELD_FRAG } from './inkfield.glsl';

interface InkFieldProps {
  /** -1..1 signed session net result. <0 leans loss, >0 leans money. */
  bias?: number;
  /** 0..1 overall presence of the ink. Subtle by default. */
  intensity?: number;
  className?: string;
}

const MAX_DPR = 1.5;

/** Silver ink + the two data tints, as 0..1 rgb triples (tokens.css values). */
const INK: readonly [number, number, number] = [201 / 255, 205 / 255, 214 / 255]; // #C9CDD6
const MONEY: readonly [number, number, number] = [52 / 255, 217 / 255, 140 / 255]; // #34D98C
const LOSS: readonly [number, number, number] = [255 / 255, 84 / 255, 104 / 255]; // #FF5468

/** Static SVG fractal-noise grain — the fallback treatment (pixel reference). */
const GRAIN_URI =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.04 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

function prefersStaticMedia(): boolean {
  if (typeof window === 'undefined') return true;
  const reduced =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const motionOff =
    typeof document !== 'undefined' && document.body?.dataset.motion === 'off';
  return reduced || motionOff;
}

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
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

export function InkField({ bias = 0, intensity = 0.5, className }: InkFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // props read live in the render loop without restarting it or per-frame state
  const biasRef = useRef(bias);
  const intensityRef = useRef(intensity);
  biasRef.current = bias;
  intensityRef.current = intensity;

  // static-grain if reduced-motion / data-motion=off, or if WebGL is unavailable
  const [staticPref, setStaticPref] = useState(prefersStaticMedia);
  const [glUnavailable, setGlUnavailable] = useState(false);
  const fallback = staticPref || glUnavailable;

  // watch reduced-motion + body[data-motion] so the mode tracks runtime changes
  useEffect(() => {
    const sync = () => setStaticPref(prefersStaticMedia());
    const mq =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;
    mq?.addEventListener('change', sync);
    const mo = new MutationObserver(sync);
    if (document.body) mo.observe(document.body, { attributes: true, attributeFilter: ['data-motion'] });
    return () => {
      mq?.removeEventListener('change', sync);
      mo.disconnect();
    };
  }, []);

  useEffect(() => {
    if (fallback) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const opts: WebGLContextAttributes = {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      powerPreference: 'low-power',
    };
    const gl = (canvas.getContext('webgl', opts) ||
      canvas.getContext('experimental-webgl', opts)) as WebGLRenderingContext | null;
    if (!gl) {
      setGlUnavailable(true);
      return;
    }

    const vert = compile(gl, gl.VERTEX_SHADER, INKFIELD_VERT);
    const frag = compile(gl, gl.FRAGMENT_SHADER, INKFIELD_FRAG);
    const program = gl.createProgram();
    if (!vert || !frag || !program) {
      setGlUnavailable(true);
      return;
    }
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      setGlUnavailable(true);
      return;
    }
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);

    const uResolution = gl.getUniformLocation(program, 'uResolution');
    const uTime = gl.getUniformLocation(program, 'uTime');
    const uPointer = gl.getUniformLocation(program, 'uPointer');
    const uScroll = gl.getUniformLocation(program, 'uScroll');
    const uBias = gl.getUniformLocation(program, 'uBias');
    const uIntensity = gl.getUniformLocation(program, 'uIntensity');
    // colors are constant for the mount — set once, never re-allocated in loop
    gl.uniform3f(gl.getUniformLocation(program, 'uInk'), INK[0], INK[1], INK[2]);
    gl.uniform3f(gl.getUniformLocation(program, 'uMoney'), MONEY[0], MONEY[1], MONEY[2]);
    gl.uniform3f(gl.getUniformLocation(program, 'uLoss'), LOSS[0], LOSS[1], LOSS[2]);

    // live, mutated-in-place state (no per-frame allocation)
    const ptr = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
    const scroll = { v: 0, target: 0 };
    let elapsed = 0;
    let last = 0;
    let raf = 0;
    let running = false;
    let visible = true;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uResolution, canvas.width, canvas.height);
    };

    const frame = (now: number) => {
      if (!running) return;
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
      last = now;
      elapsed += dt;

      // lerp pointer + scroll toward their targets (smooth cursor lean / drift)
      ptr.x += (ptr.tx - ptr.x) * 0.06;
      ptr.y += (ptr.ty - ptr.y) * 0.06;
      scroll.v += (scroll.target - scroll.v) * 0.05;

      gl.uniform1f(uTime, elapsed);
      gl.uniform2f(uPointer, ptr.x, ptr.y);
      gl.uniform1f(uScroll, scroll.v);
      gl.uniform1f(uBias, Math.max(-1, Math.min(1, biasRef.current)));
      gl.uniform1f(uIntensity, Math.max(0, Math.min(1, intensityRef.current)));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (running) return;
      running = true;
      last = 0;
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };
    // rAF runs only while on-screen AND the tab is visible
    const evaluate = () => {
      if (visible && !document.hidden) start();
      else stop();
    };

    const onPointer = (e: PointerEvent) => {
      ptr.tx = e.clientX / window.innerWidth;
      ptr.ty = 1 - e.clientY / window.innerHeight; // flip to gl_FragCoord (y up)
    };
    const onScroll = () => {
      scroll.target = (window.scrollY || 0) / Math.max(1, window.innerHeight);
    };
    const onVisibility = () => evaluate();
    const onLost = (e: Event) => {
      e.preventDefault();
      stop();
      setGlUnavailable(true);
    };

    const io = new IntersectionObserver(
      (entries) => {
        visible = entries[0]?.isIntersecting ?? true;
        evaluate();
      },
      { threshold: 0 },
    );
    io.observe(canvas);

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    window.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    canvas.addEventListener('webglcontextlost', onLost);

    resize();
    onScroll();
    evaluate();

    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('webglcontextlost', onLost);
      gl.deleteProgram(program);
      gl.deleteShader(vert);
      gl.deleteShader(frag);
      gl.deleteBuffer(buffer);
    };
  }, [fallback]);

  const base: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    display: 'block',
  };

  if (fallback) {
    // static grain, weighted toward the data tint — zero JS animation
    const b = Math.max(-1, Math.min(1, bias));
    const clampedIntensity = Math.max(0, Math.min(1, intensity));
    const tint = b >= 0 ? '52, 217, 140' : '255, 84, 104';
    const tintAlpha = Math.abs(b) * 0.05 * (0.5 + clampedIntensity);
    const style: React.CSSProperties = {
      ...base,
      opacity: 0.4 + 0.4 * clampedIntensity,
      backgroundImage: `radial-gradient(ellipse 80% 60% at 50% 35%, rgba(${tint}, ${tintAlpha}), transparent 70%), ${GRAIN_URI}`,
      maskImage: 'radial-gradient(ellipse 90% 70% at 50% 35%, black, transparent)',
      WebkitMaskImage: 'radial-gradient(ellipse 90% 70% at 50% 35%, black, transparent)',
    };
    return (
      <div
        aria-hidden="true"
        data-inkfield="static"
        className={clsx('bk-inkfield', 'bk-inkfield--static', className)}
        style={style}
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      data-inkfield="webgl"
      className={clsx('bk-inkfield', className)}
      style={base}
    />
  );
}

export default InkField;
