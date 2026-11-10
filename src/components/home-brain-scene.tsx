import { useEffect, useRef } from "react";
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

function createBrainModel() {
  const brain = new THREE.Group();
  const materials = [
    new THREE.MeshPhysicalMaterial({ color: "#c9954d", metalness: 0.48, roughness: 0.3, clearcoat: 0.7, clearcoatRoughness: 0.25, emissive: "#6c3f14", emissiveIntensity: 0.14 }),
    new THREE.MeshPhysicalMaterial({ color: "#dbb36c", metalness: 0.42, roughness: 0.32, clearcoat: 0.72, clearcoatRoughness: 0.22, emissive: "#80501c", emissiveIntensity: 0.12 }),
  ];
  const hemispheres = [
    { geometry: createCortexGeometry(0.4), position: [-0.37, 0, 0] as const, material: materials[0] },
    { geometry: createCortexGeometry(1.8), position: [0.37, 0, 0] as const, material: materials[1] },
  ];

  hemispheres.forEach(({ geometry, position, material }) => {
    const hemisphere = new THREE.Mesh(geometry, material);
    hemisphere.position.set(...position);
    hemisphere.scale.set(0.72, 0.95, 0.62);
    brain.add(hemisphere);
  });

  for (let index = 0; index < 14; index++) {
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
    const fiber = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 36, index % 3 === 0 ? 0.008 : 0.0045, 5, false),
      new THREE.MeshBasicMaterial({ color: index % 3 === 0 ? "#ffdf9a" : "#c99c54", transparent: true, opacity: index % 3 === 0 ? 0.85 : 0.52 }),
    );
    brain.add(fiber);
  }

  neuralNodes.forEach(([x, y], index) => {
    const synapse = new THREE.Mesh(
      new THREE.SphereGeometry(index % 4 === 0 ? 0.027 : 0.016, 12, 12),
      new THREE.MeshStandardMaterial({ color: "#ffdfa0", emissive: "#d99131", emissiveIntensity: 2.8, metalness: 0.25, roughness: 0.22 }),
    );
    synapse.position.set(x, y, surfaceZ(x, y) + 0.015);
    brain.add(synapse);
  });

  const particlePositions = new Float32Array(36 * 3);
  for (let index = 0; index < 36; index++) {
    const angle = index * 2.399;
    const radius = 0.98 + (index % 5) * 0.09;
    particlePositions[index * 3] = Math.cos(angle) * radius;
    particlePositions[index * 3 + 1] = Math.sin(angle * 1.37) * 0.92;
    particlePositions[index * 3 + 2] = Math.sin(angle) * radius * 0.62;
  }
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
  const particles = new THREE.Points(particleGeometry, new THREE.PointsMaterial({ color: "#f4d795", size: 0.035, transparent: true, opacity: 0.66, sizeAttenuation: true }));
  brain.add(particles);

  return brain;
}

export default function HomeBrainScene({ reducedMotion, onReady }: { reducedMotion: boolean; onReady: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = canvas?.parentElement;
    if (!canvas || !container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0, 3.65);

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.4));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;

    scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    const keyLight = new THREE.DirectionalLight("#fff1d0", 2.2);
    keyLight.position.set(-2.5, 3, 4);
    scene.add(keyLight);
    const goldLight = new THREE.PointLight("#ffc76a", 28, 7);
    goldLight.position.set(2, 1, 2);
    scene.add(goldLight);
    const rimLight = new THREE.PointLight("#b78239", 15, 6);
    rimLight.position.set(-2, -1, -1);
    scene.add(rimLight);

    const brain = createBrainModel();
    scene.add(brain);

    const resize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      renderer.render(scene, camera);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();
    onReadyRef.current();

    let animationFrame = 0;
    const animate = (time: number) => {
      const seconds = time * 0.001;
      brain.rotation.y = Math.sin(seconds * 0.28) * 0.09;
      brain.rotation.x = Math.cos(seconds * 0.22) * 0.035;
      brain.position.y = Math.sin(seconds * 0.65) * 0.035;
      renderer.render(scene, camera);
      animationFrame = window.requestAnimationFrame(animate);
    };
    if (!reducedMotion) animationFrame = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      observer.disconnect();
      brain.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
          else object.material.dispose();
        }
        if (object instanceof THREE.Points) {
          object.geometry.dispose();
          object.material.dispose();
        }
      });
      renderer.dispose();
    };
  }, [reducedMotion]);

  return <canvas ref={canvasRef} className="home-brain-canvas" />;
}
