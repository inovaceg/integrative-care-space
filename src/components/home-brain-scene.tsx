import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

const neuralNodes = [
  [-0.77, 0.42], [-0.54, 0.66], [-0.24, 0.49], [0.04, 0.71], [0.35, 0.59], [0.64, 0.42],
  [-0.68, 0.04], [-0.39, 0.17], [-0.08, 0.31], [0.24, 0.13], [0.54, 0.2], [0.77, 0.02],
  [-0.56, -0.31], [-0.26, -0.18], [0.06, -0.39], [0.38, -0.28], [0.65, -0.37],
];

function createCortexGeometry(seed: number) {
  const geometry = new THREE.SphereGeometry(1, 72, 56);
  const positions = geometry.attributes.position;
  const vertex = new THREE.Vector3();
  for (let i = 0; i < positions.count; i++) {
    vertex.fromBufferAttribute(positions, i);
    const latitude = Math.atan2(vertex.y, vertex.x);
    const longitude = Math.asin(vertex.z);
    const folds = Math.sin(latitude * 15 + seed) * Math.sin(longitude * 12 + seed * 1.7) * 0.027
      + Math.sin(latitude * 27 - longitude * 9 + seed) * 0.012;
    const factor = 1 + folds;
    positions.setXYZ(i, vertex.x * factor, vertex.y * factor, vertex.z * factor);
  }
  geometry.computeVertexNormals();
  return geometry;
}

function surfaceZ(x: number, y: number) {
  return 0.63 * Math.sqrt(Math.max(0.04, 1 - (x / 1.04) ** 2 - (y / 1.04) ** 2)) + 0.035;
}

function NeuralFibers() {
  const fibers = useMemo(() => Array.from({ length: 14 }, (_, index) => {
    const side = index % 2 === 0 ? -1 : 1;
    const lane = Math.floor(index / 2);
    const start = side < 0 ? -0.83 + lane * 0.105 : 0.15 + lane * 0.105;
    const points = Array.from({ length: 24 }, (_, pointIndex) => {
      const t = pointIndex / 23;
      const x = start + Math.sin(t * Math.PI) * 0.055;
      const y = -0.74 + t * 1.48 + Math.sin(t * Math.PI * 2 + index) * 0.075;
      return new THREE.Vector3(x, y, surfaceZ(x, y));
    });
    const curve = new THREE.CatmullRomCurve3(points);
    return new THREE.TubeGeometry(curve, 36, index % 3 === 0 ? 0.008 : 0.0045, 5, false);
  }), []);
  return <group>{fibers.map((geometry, index) => <mesh key={index} geometry={geometry}><meshBasicMaterial color={index % 3 === 0 ? "#ffdf9a" : "#c99c54"} transparent opacity={index % 3 === 0 ? 0.85 : 0.52} /></mesh>)}</group>;
}

function NeuralSynapses() {
  const positions = useMemo(() => neuralNodes.map(([x, y]) => new THREE.Vector3(x, y, surfaceZ(x, y) + 0.015)), []);
  return <group>{positions.map((position, index) => <mesh key={index} position={position}><sphereGeometry args={[index % 4 === 0 ? 0.027 : 0.016, 12, 12]} /><meshStandardMaterial color="#ffdfa0" emissive="#d99131" emissiveIntensity={2.8} metalness={0.25} roughness={0.22} /></mesh>)}</group>;
}

function FloatingParticles() {
  const particles = useRef<THREE.Group>(null);
  const points = useMemo(() => Array.from({ length: 36 }, (_, index) => {
    const angle = index * 2.399;
    const radius = 0.98 + (index % 5) * 0.09;
    return [Math.cos(angle) * radius, Math.sin(angle * 1.37) * 0.92, Math.sin(angle) * radius * 0.62] as const;
  }), []);
  return <group ref={particles}>{points.map(([x, y, z], index) => <mesh key={index} position={[x, y, z]}><sphereGeometry args={[index % 7 === 0 ? 0.018 : 0.009, 8, 8]} /><meshBasicMaterial color="#f4d795" transparent opacity={index % 3 === 0 ? 0.82 : 0.4} /></mesh>)}</group>;
}

function BrainModel({ reducedMotion }: { reducedMotion: boolean }) {
  const brain = useRef<THREE.Group>(null);
  const leftGeometry = useMemo(() => createCortexGeometry(0.4), []);
  const rightGeometry = useMemo(() => createCortexGeometry(1.8), []);

  useFrame((state, delta) => {
    if (!brain.current || reducedMotion) return;
    brain.current.rotation.y = THREE.MathUtils.damp(brain.current.rotation.y, Math.sin(state.clock.elapsedTime * 0.28) * 0.09, 2.2, delta);
    brain.current.rotation.x = THREE.MathUtils.damp(brain.current.rotation.x, Math.cos(state.clock.elapsedTime * 0.22) * 0.035, 2.2, delta);
    brain.current.position.y = Math.sin(state.clock.elapsedTime * 0.65) * 0.035;
  });

  return (
    <group ref={brain}>
      <mesh geometry={leftGeometry} position={[-0.37, 0, 0]} scale={[0.72, 0.95, 0.62]}>
        <meshPhysicalMaterial color="#c9954d" metalness={0.48} roughness={0.3} clearcoat={0.7} clearcoatRoughness={0.25} emissive="#6c3f14" emissiveIntensity={0.14} />
      </mesh>
      <mesh geometry={rightGeometry} position={[0.37, 0, 0]} scale={[0.72, 0.95, 0.62]}>
        <meshPhysicalMaterial color="#dbb36c" metalness={0.42} roughness={0.32} clearcoat={0.72} clearcoatRoughness={0.22} emissive="#80501c" emissiveIntensity={0.12} />
      </mesh>
      <NeuralFibers />
      <NeuralSynapses />
      <FloatingParticles />
    </group>
  );
}

export default function HomeBrainScene({ reducedMotion, onReady }: { reducedMotion: boolean; onReady: () => void }) {
  return (
    <Canvas onCreated={onReady} camera={{ position: [0, 0, 3.65], fov: 38 }} dpr={[1, 1.4]} frameloop={reducedMotion ? "demand" : "always"} gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}>
      <ambientLight intensity={0.85} />
      <directionalLight position={[-2.5, 3, 4]} intensity={2.2} color="#fff1d0" />
      <pointLight position={[2, 1, 2]} intensity={28} color="#ffc76a" distance={7} />
      <pointLight position={[-2, -1, -1]} intensity={15} color="#b78239" distance={6} />
      <BrainModel reducedMotion={reducedMotion} />
    </Canvas>
  );
}
