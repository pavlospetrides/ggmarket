"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Pause, Play } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

const LOOP_SECONDS = 28;
const ORBIT_WORDS = ["PLAY", "TRADE", "UPGRADE", "BUILD"];

const BELL_VERTEX = /* glsl */ `
  varying vec3 vPosition;
  varying vec3 vNormal;
  varying vec3 vView;

  void main() {
    vPosition = position;
    vNormal = normalize(normalMatrix * normal);
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vView = -viewPosition.xyz;
    gl_Position = projectionMatrix * viewPosition;
  }
`;

const BELL_FRAGMENT = /* glsl */ `
  precision highp float;
  varying vec3 vPosition;
  varying vec3 vNormal;
  varying vec3 vView;

  float hash(vec2 point) {
    return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 point) {
    vec2 cell = floor(point);
    vec2 local = fract(point);
    float a = hash(cell);
    float b = hash(cell + vec2(1.0, 0.0));
    float c = hash(cell + vec2(0.0, 1.0));
    float d = hash(cell + vec2(1.0, 1.0));
    vec2 curve = local * local * (3.0 - 2.0 * local);
    return mix(mix(a, b, curve.x), mix(c, d, curve.x), curve.y);
  }

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDirection = normalize(vView);
    float fresnel = pow(1.0 - max(dot(normal, viewDirection), 0.0), 2.4);
    float height = clamp((vPosition.y + 0.40) / 1.40, 0.0, 1.0);
    float angle = atan(vPosition.z, vPosition.x);

    vec3 edge = vec3(0.24, 0.45, 0.92);
    vec3 middle = vec3(0.34, 0.24, 0.88);
    vec3 apex = vec3(0.49, 0.28, 0.95);
    vec3 color = mix(edge, middle, smoothstep(0.0, 0.55, height));
    color = mix(color, apex, smoothstep(0.48, 1.0, height));

    float ribs = abs(fract(angle / 6.2831853 * 18.0) - 0.5) * 2.0;
    float ribLine = smoothstep(0.80, 0.99, ribs);
    float ribMask = smoothstep(0.98, 0.55, height) * smoothstep(-0.02, 0.22, height);
    color *= 1.0 - ribLine * 0.38 * ribMask;

    float front = gl_FrontFacing ? 1.0 : 0.0;
    float band = smoothstep(0.34, 0.02, height);
    float speckle = smoothstep(0.60, 0.88, noise(vec2(angle * 7.0, height * 12.0))) * band;
    color = mix(color, vec3(0.08, 0.08, 0.28), speckle * 0.62 * front);
    color += fresnel * vec3(0.18, 0.52, 0.76);
    color += (1.0 - fresnel) * vec3(0.06, 0.08, 0.28) * (0.4 + 0.6 * height);

    float alpha = 0.48 + fresnel * 0.42 + ribLine * ribMask * 0.16 + speckle * 0.18 * front;
    alpha *= mix(0.25, 1.0, front);
    gl_FragColor = vec4(color, clamp(alpha, 0.0, 0.92));
  }
`;

function Bell() {
  const mesh = useRef<THREE.Mesh>(null);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: BELL_VERTEX,
        fragmentShader: BELL_FRAGMENT,
        uniforms: { uTime: { value: 0 } },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    [],
  );

  useFrame(({ clock }) => {
    const shader = mesh.current?.material as THREE.ShaderMaterial | undefined;
    if (shader) shader.uniforms.uTime.value = clock.elapsedTime;
  });

  useEffect(() => () => material.dispose(), [material]);

  return (
    <mesh ref={mesh} material={material} scale={[1, 0.84, 1]}>
      <sphereGeometry args={[1, 72, 56, 0, Math.PI * 2, 0, 1.98]} />
    </mesh>
  );
}

const STRAND_VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uLength;
  uniform float uPhase;
  uniform float uAmplitude;
  varying float vProgress;
  varying vec3 vNormal;
  varying vec3 vView;
  varying float vWorldY;

  void main() {
    vec3 point = position;
    float progress = clamp(-point.y / uLength, 0.0, 1.0);
    float amplitude = progress * progress * uAmplitude;
    point.x += sin(uTime * 1.18 + progress * 7.0 + uPhase) * amplitude;
    point.z += cos(uTime * 0.92 + progress * 6.2 + uPhase * 1.3) * amplitude;
    vProgress = progress;
    vWorldY = (modelMatrix * vec4(point, 1.0)).y;
    vNormal = normalize(normalMatrix * normal);
    vec4 viewPosition = modelViewMatrix * vec4(point, 1.0);
    vView = -viewPosition.xyz;
    gl_Position = projectionMatrix * viewPosition;
  }
`;

const STRAND_FRAGMENT = /* glsl */ `
  precision highp float;
  uniform vec3 uTop;
  uniform vec3 uTip;
  uniform float uOpacity;
  varying float vProgress;
  varying vec3 vNormal;
  varying vec3 vView;
  varying float vWorldY;

  void main() {
    float fresnel = pow(1.0 - max(dot(normalize(vNormal), normalize(vView)), 0.0), 1.6);
    float lowerFade = smoothstep(-2.0, -0.76, vWorldY);
    float upperFade = smoothstep(-0.18, -0.58, vWorldY);
    vec3 color = mix(uTop, uTip, vProgress) + fresnel * 0.20;
    float alpha = ((1.0 - vProgress * 0.9) * uOpacity + fresnel * 0.1) * lowerFade * upperFade;
    gl_FragColor = vec4(color, clamp(alpha, 0.0, 1.0));
  }
`;

function createStrandGeometry(length: number, thickness: number, curl: number) {
  const segments = 28;
  const radialSegments = 5;
  const spine = Array.from({ length: segments + 1 }, (_, index) => {
    const progress = index / segments;
    return new THREE.Vector3(
      Math.sin(progress * 3) * curl * progress,
      -progress * length,
      Math.cos(progress * 2) * curl * progress,
    );
  });
  const curve = new THREE.CatmullRomCurve3(spine);
  const frames = curve.computeFrenetFrames(segments, false);
  const positions: number[] = [];
  const indices: number[] = [];

  for (let index = 0; index <= segments; index += 1) {
    const progress = index / segments;
    const point = curve.getPointAt(progress);
    const radius = thickness * (1 - Math.pow(progress, 0.75));
    const normal = frames.normals[index];
    const binormal = frames.binormals[index];
    for (let side = 0; side <= radialSegments; side += 1) {
      const angle = (side / radialSegments) * Math.PI * 2;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      positions.push(
        point.x + (cos * normal.x + sin * binormal.x) * radius,
        point.y + (cos * normal.y + sin * binormal.y) * radius,
        point.z + (cos * normal.z + sin * binormal.z) * radius,
      );
    }
  }

  for (let row = 0; row < segments; row += 1) {
    for (let side = 0; side < radialSegments; side += 1) {
      const current = row * (radialSegments + 1) + side;
      const next = current + radialSegments + 1;
      indices.push(current, next, current + 1, next, next + 1, current + 1);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

type StrandProps = {
  angle: number;
  phase: number;
  radius: number;
  length: number;
  thickness: number;
  curl: number;
  amplitude: number;
  opacity: number;
};

function Strand({ angle, phase, radius, length, thickness, curl, amplitude, opacity }: StrandProps) {
  const mesh = useRef<THREE.Mesh>(null);
  const geometry = useMemo(() => createStrandGeometry(length, thickness, curl), [curl, length, thickness]);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: STRAND_VERTEX,
        fragmentShader: STRAND_FRAGMENT,
        uniforms: {
          uTime: { value: 0 },
          uLength: { value: length },
          uPhase: { value: phase },
          uAmplitude: { value: amplitude },
          uTop: { value: new THREE.Color("#9db8ff") },
          uTip: { value: new THREE.Color("#856cf4") },
          uOpacity: { value: opacity },
        },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    [amplitude, length, opacity, phase],
  );

  useFrame(({ clock }) => {
    const shader = mesh.current?.material as THREE.ShaderMaterial | undefined;
    if (shader) shader.uniforms.uTime.value = clock.elapsedTime;
  });

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  return (
    <mesh
      ref={mesh}
      geometry={geometry}
      material={material}
      position={[Math.cos(angle) * radius, -0.24, Math.sin(angle) * radius]}
    />
  );
}

function Jellyfish({ compact }: { compact: boolean }) {
  const group = useRef<THREE.Group>(null);
  const strandCount = compact ? 12 : 20;
  const armCount = compact ? 4 : 7;
  const strands = useMemo(
    () => Array.from({ length: strandCount }, (_, index) => ({ angle: (index / strandCount) * Math.PI * 2, phase: index * 0.54 })),
    [strandCount],
  );
  const arms = useMemo(
    () => Array.from({ length: armCount }, (_, index) => ({ angle: (index / armCount) * Math.PI * 2, phase: index * 1.04 + 0.4 })),
    [armCount],
  );

  useFrame(({ clock }) => {
    if (!group.current) return;
    const elapsed = clock.elapsedTime;
    group.current.rotation.y = -(elapsed / LOOP_SECONDS) * Math.PI * 2;
    group.current.position.y = Math.sin(elapsed * 0.52) * 0.07;
    const pulse = Math.sin(elapsed * 1.35);
    group.current.scale.set(1 + pulse * 0.035, 1 - pulse * 0.045, 1 + pulse * 0.035);
  });

  return (
    <group ref={group}>
      <Bell />
      <mesh position={[0, 0.16, 0]}>
        <sphereGeometry args={[0.48, 24, 24]} />
        <meshBasicMaterial color="#637cff" transparent opacity={0.36} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      {strands.map((strand, index) => (
        <Strand key={`strand-${index}`} {...strand} radius={0.82} length={4.1} thickness={0.014} curl={0.05} amplitude={0.46} opacity={0.5} />
      ))}
      {arms.map((arm, index) => (
        <Strand key={`arm-${index}`} {...arm} radius={0.22} length={2.1} thickness={0.06} curl={0.14} amplitude={0.3} opacity={0.68} />
      ))}
    </group>
  );
}

function JellyfishCanvas({ compact, paused }: { compact: boolean; paused: boolean }) {
  return (
    <Canvas
      aria-hidden="true"
      dpr={compact ? 1 : [1, 1.5]}
      flat
      frameloop={paused ? "demand" : "always"}
      gl={{ alpha: true, antialias: !compact, powerPreference: "high-performance" }}
      camera={{ position: [0, 0.35, 6], fov: 34 }}
    >
      <ambientLight intensity={1} />
      <Jellyfish compact={compact} />
    </Canvas>
  );
}

export function JellyfishHeroBackground() {
  const [userPaused, setUserPaused] = useState(false);
  const [compact, setCompact] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const compactQuery = window.matchMedia("(max-width: 767px)");
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      setCompact(compactQuery.matches);
      setReducedMotion(motionQuery.matches);
    };
    sync();
    compactQuery.addEventListener("change", sync);
    motionQuery.addEventListener("change", sync);
    return () => {
      compactQuery.removeEventListener("change", sync);
      motionQuery.removeEventListener("change", sync);
    };
  }, []);

  const paused = userPaused || reducedMotion;

  return (
    <div className={`jellyfish-hero-background${paused ? " is-paused" : ""}`} data-testid="jellyfish-hero-background">
      <div className="jellyfish-orbit" aria-hidden="true">
        <div className="jellyfish-orbit-stage">
          {ORBIT_WORDS.map((word, index) => (
            <span
              className="jellyfish-orbit-word"
              key={word}
              style={{ "--word-index": index } as React.CSSProperties}
            >
              {word}
            </span>
          ))}
        </div>
      </div>
      <div className="jellyfish-canvas"><JellyfishCanvas compact={compact} paused={paused} /></div>
      <span className="jellyfish-glow" />
      <span className="jellyfish-grain" />
      <button
        type="button"
        className="jellyfish-motion-toggle"
        aria-label={userPaused ? "Play hero animation" : "Pause hero animation"}
        aria-pressed={userPaused}
        onClick={() => setUserPaused((value) => !value)}
      >
        {userPaused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
        <span>{userPaused ? "Play motion" : "Pause motion"}</span>
      </button>
    </div>
  );
}
