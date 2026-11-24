"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Living water: one full-screen quad and a small fragment shader (no models, no textures) that
 * draws light moving on the lake in Tejjora's lake and cream. Used in exactly two places:
 * Mezbaan's header and the 360° tour hero.
 *
 * - Client-only, and three.js is imported inside the effect, so it never enters a page bundle.
 * - Renders nothing with reduced motion, without WebGL, or if anything throws: the parent's CSS
 *   gradient is the designed fallback, and the canvas only fades in after its first frame.
 * - Pauses when offscreen or the tab is hidden; caps at ~30 fps; scales its buffer down.
 */

type Variant = "panel" | "hero";

const PRESETS: Record<Variant, { scale: number; intensity: number; speed: number; maxDpr: number }> = {
  panel: { scale: 1, intensity: 1, speed: 1, maxDpr: 1.5 },
  hero: { scale: 0.55, intensity: 0.85, speed: 0.7, maxDpr: 1 },
};

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision mediump float;
  uniform float uTime;
  uniform vec2 uRes;
  uniform float uIntensity;
  uniform vec3 uDeep;
  uniform vec3 uShallow;
  uniform vec3 uLight;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p *= 2.03;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 uv = vUv;
    float aspect = uRes.x / max(uRes.y, 1.0);
    float t = uTime;
    // A lake seen at a low angle: rows compress towards the horizon at the top.
    float depth = 1.0 / (0.32 + (1.0 - uv.y) * 1.25);
    vec2 q = vec2((uv.x - 0.5) * aspect * depth * 1.4, depth * 2.6 + t * 0.09);
    float swell = fbm(q * 1.15 + vec2(t * 0.035, 0.0));
    float ripple = fbm(q * 2.6 + swell * 1.6 - vec2(t * 0.05, t * 0.02));
    // Light on the water: thin bright filaments where the ripple field folds.
    float filament = 1.0 - abs(ripple - 0.5) * 7.0;
    filament = clamp(filament, 0.0, 1.0);
    filament = pow(filament, 6.0);
    float glint = pow(clamp((ripple - 0.58) * 3.2, 0.0, 1.0), 3.0);
    float sky = smoothstep(0.35, 1.0, uv.y);
    vec3 color = mix(uDeep, uShallow, clamp(sky * 0.85 + swell * 0.35, 0.0, 1.0));
    color += uLight * (filament * 0.22 + glint * 0.55) * uIntensity * (0.35 + 0.65 * sky);
    // A faint waterline glow where the light lies on the horizon.
    color += uLight * 0.06 * uIntensity * exp(-pow((uv.y - 0.82) * 9.0, 2.0));
    float vignette = 1.0 - 0.32 * length((uv - vec2(0.5, 0.55)) * vec2(1.0, 1.25));
    gl_FragColor = vec4(color * vignette, 1.0);
  }
`;

function webglAvailable() {
  try {
    const probe = document.createElement("canvas");
    return Boolean(probe.getContext("webgl2") ?? probe.getContext("webgl"));
  } catch {
    return false;
  }
}

export function LakeAmbient({ variant = "panel", className }: { variant?: Variant; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !webglAvailable()) return;

    const preset = PRESETS[variant];
    let disposed = false;
    let frame = 0;
    let cleanup = () => {};

    void import("three")
      .then((THREE) => {
        if (disposed) return;
        const renderer = new THREE.WebGLRenderer({ canvas, alpha: false, antialias: false, powerPreference: "low-power", preserveDrawingBuffer: false });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, preset.maxDpr) * preset.scale);
        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        const uniforms = {
          uTime: { value: Math.random() * 40 },
          uRes: { value: new THREE.Vector2(1, 1) },
          uIntensity: { value: preset.intensity },
          uDeep: { value: new THREE.Color("#011f26") },
          uShallow: { value: new THREE.Color("#0d4f5c") },
          uLight: { value: new THREE.Color("#fbf3cf") },
        };
        const geometry = new THREE.PlaneGeometry(2, 2);
        const material = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms, depthTest: false, depthWrite: false });
        scene.add(new THREE.Mesh(geometry, material));

        const resize = () => {
          const { width, height } = canvas.getBoundingClientRect();
          if (!width || !height) return;
          renderer.setSize(width, height, false);
          uniforms.uRes.value.set(width, height);
        };
        resize();
        const resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(canvas);

        let visible = true;
        const intersection = new IntersectionObserver(([entry]) => {
          visible = entry?.isIntersecting ?? true;
          if (visible) schedule();
        });
        intersection.observe(canvas);

        let last = 0;
        let first = true;
        const loop = (now: number) => {
          frame = 0;
          if (disposed || !visible || document.hidden) return;
          // ~30 fps: water this slow gains nothing from more, and batteries notice.
          if (now - last >= 32) {
            uniforms.uTime.value += (last ? Math.min(now - last, 100) : 16) * 0.001 * preset.speed;
            last = now;
            renderer.render(scene, camera);
            if (first) {
              first = false;
              setReady(true);
            }
          }
          schedule();
        };
        function schedule() {
          if (!frame && !disposed) frame = requestAnimationFrame(loop);
        }
        const onVisibility = () => {
          if (!document.hidden) {
            last = 0;
            schedule();
          }
        };
        document.addEventListener("visibilitychange", onVisibility);
        schedule();

        cleanup = () => {
          cancelAnimationFrame(frame);
          document.removeEventListener("visibilitychange", onVisibility);
          resizeObserver.disconnect();
          intersection.disconnect();
          geometry.dispose();
          material.dispose();
          renderer.dispose();
          renderer.forceContextLoss();
        };
      })
      .catch(() => {
        // The CSS fallback stays; an enhancement must never surface an error.
      });

    return () => {
      disposed = true;
      cleanup();
    };
  }, [variant]);

  return <canvas ref={canvasRef} className={`tj-lake-ambient${className ? ` ${className}` : ""}`} data-ready={ready ? "true" : "false"} aria-hidden="true" />;
}
