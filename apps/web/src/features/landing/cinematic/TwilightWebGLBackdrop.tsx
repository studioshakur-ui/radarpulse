import React, { useEffect, useRef } from "react";
import { Renderer, Camera, Transform, Geometry, Program, Mesh } from "ogl";
import { useLandingMotionStore } from "@/features/landing/cinematic/landingMotionStore";

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

/**
 * Map the ZipPinnedStage progress to a "focus" point and intensity.
 * This is the core of the "ZipHQ background choreography":
 * - the backdrop remains subtle, but it clearly *moves with the narrative*
 * - no flashy transitions, just controlled shifts of focus + saturation
 */
function focusFromProgress(progress: number) {
  const p = clamp01(progress);
  const steps = 4;
  const raw = p * steps;
  const idx = Math.min(steps - 1, Math.floor(raw));
  const t = raw - idx;

  // Anchors in "p-space" (centered) used by the shader.
  // Keep them tight to avoid nausea and to maintain readability.
  const anchors: Array<[number, number]> = [
    [0.15, 0.05], // INCOMING
    [-0.05, 0.12], // DEDUP
    [0.22, -0.02], // EVIDENCE
    [0.06, -0.14], // DECISION
  ];

  const a = anchors[idx];
  const b = anchors[Math.min(steps - 1, idx + 1)];

  const ease = t * t * (3 - 2 * t); // smoothstep
  const x = a[0] + (b[0] - a[0]) * ease;
  const y = a[1] + (b[1] - a[1]) * ease;

  // Slightly increase intensity as the user advances.
  const intensity = 0.28 + 0.18 * p;

  return { x, y, step: idx, intensity, progress: p };
}

/**
 * Minimal OGL shader backdrop, now *scroll-driven*.
 *
 * Goals:
 * - subtle, lux, non-gimmicky
 * - stays readable under content (we add a veil layer)
 * - avoids pure black
 * - reacts to ZipPinnedStage progress (background choreography)
 */
export function TwilightWebGLBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new Renderer({
      canvas,
      dpr: clamp(window.devicePixelRatio || 1, 1, 2),
      alpha: true,
      antialias: true,
      premultipliedAlpha: true,
    });

    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);

    const camera = new Camera(gl, { fov: 45 });
    camera.position.z = 2;

    const scene = new Transform();

    const geometry = new Geometry(gl, {
      position: {
        size: 3,
        data: new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]),
      },
      uv: {
        size: 2,
        data: new Float32Array([0, 0, 2, 0, 0, 2]),
      },
    });

    const program = new Program(gl, {
      transparent: true,
      vertex: /* glsl */ `
        attribute vec3 position;
        attribute vec2 uv;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragment: /* glsl */ `
        precision highp float;
        varying vec2 vUv;

        uniform float uTime;
        uniform vec2 uRes;
        uniform float uProgress;
        uniform float uIntensity;
        uniform vec2 uFocus;

        // cheap hash
        float hash(vec2 p) {
          p = fract(p * vec2(123.34, 456.21));
          p += dot(p, p + 45.32);
          return fract(p.x * p.y);
        }

        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(a, b, u.x) +
                 (c - a) * u.y * (1.0 - u.x) +
                 (d - b) * u.x * u.y;
        }

        float fbm(vec2 p) {
          float v = 0.0;
          float a = 0.5;
          for (int i = 0; i < 5; i++) {
            v += a * noise(p);
            p *= 2.02;
            a *= 0.5;
          }
          return v;
        }

        void main() {
          vec2 uv = vUv;
          vec2 p = (uv - 0.5);
          p.x *= uRes.x / uRes.y;

          float t = uTime * 0.10;

          // flow field (slow)
          float n1 = fbm(p * 2.0 + vec2(t, -t));
          float n2 = fbm(p * 3.0 + vec2(-t * 0.7, t * 0.9));
          float swirl = smoothstep(0.0, 1.0, n1) * 0.6 + n2 * 0.4;

          // palette: lavender / orchid / mist
          vec3 c1 = vec3(0.965, 0.958, 0.995); // mist
          vec3 c2 = vec3(0.70, 0.52, 0.93);    // violet
          vec3 c3 = vec3(0.90, 0.80, 0.98);    // orchid mist

          // Scroll-driven saturation: more "tech premium" as progress increases
          float sat = mix(0.22, 0.42, smoothstep(0.0, 1.0, uProgress));

          vec3 col = mix(c1, c2, swirl);
          col = mix(col, c3, smoothstep(-0.2, 0.8, p.y + 0.15));
          col = mix(vec3(0.985, 0.985, 0.995), col, sat);

          // Focus blob follows the narrative (uFocus is in p-space)
          float r = length(p - uFocus);
          float glow = exp(-r * 3.2);
          col += vec3(0.35, 0.20, 0.55) * glow * uIntensity;

          // Soft vignette (keep readable; never dark)
          float v = smoothstep(1.25, 0.22, length(p));
          col = mix(vec3(0.992, 0.992, 0.998), col, v);

          // Alpha tuned for readability
          float a = mix(0.55, 0.70, smoothstep(0.0, 1.0, uProgress));
          gl_FragColor = vec4(col, a);
        }
      `,
      uniforms: {
        uTime: { value: 0 },
        uRes: { value: [1, 1] },
        uProgress: { value: 0 },
        uIntensity: { value: 0.28 },
        uFocus: { value: [0.15, 0.05] },
      },
    });

    const mesh = new Mesh(gl, { geometry, program });
    mesh.setParent(scene);

    let raf = 0;
    const onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setSize(w, h);
      program.uniforms.uRes.value = [w, h];
    };

    const tick = (ms: number) => {
      program.uniforms.uTime.value = ms / 1000;

      // Read scroll state without re-rendering React.
      const { stageProgress } = useLandingMotionStore.getState();
      const f = focusFromProgress(stageProgress);
      program.uniforms.uProgress.value = f.progress;
      program.uniforms.uIntensity.value = f.intensity;
      program.uniforms.uFocus.value = [f.x, f.y];

      renderer.render({ scene, camera });
      raf = requestAnimationFrame(tick);
    };

    onResize();
    window.addEventListener("resize", onResize, { passive: true });
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      <canvas ref={canvasRef} className="h-full w-full" />
      {/* readability veil: keep content crisp, even with a richer backdrop */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/28 via-white/12 to-white/22" />
    </div>
  );
}
