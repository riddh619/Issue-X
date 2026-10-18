import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/* ─── Continuous Swirling Particle Storm ─── */
function StormParticles({ count = 2600 }) {
  const meshRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Distribute particles with an open center "eye of the storm" so text is crystal clear
  const particles = useMemo(() => {
    const arr = [];
    for (let i = 0; i < count; i++) {
      // Radius >= 1.2 ensures center eye is clear of heavy particle clusters
      const radius = Math.random() * 3.8 + 1.2;
      const angle = Math.random() * Math.PI * 2;
      const speed = (Math.random() * 0.35 + 0.15) * (Math.random() > 0.5 ? 1 : -1);
      const y = (Math.random() - 0.5) * 3.2;
      const ySpeed = (Math.random() - 0.5) * 0.25;
      const scale = Math.random() * 0.018 + 0.005;
      const drift = Math.random() * 0.4;
      arr.push({ radius, angle, speed, y, ySpeed, scale, drift, baseRadius: radius });
    }
    return arr;
  }, [count]);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();

    for (let i = 0; i < count; i++) {
      const p = particles[i];
      p.angle += p.speed * 0.012;
      p.y += p.ySpeed * 0.004;
      p.radius = p.baseRadius + Math.sin(t * 0.5 + i) * p.drift;

      // Spiral inward effect
      const spiralFactor = Math.sin(t * 0.3 + p.angle * 2) * 0.12;
      const r = p.radius + spiralFactor;

      const x = Math.cos(p.angle) * r;
      const z = Math.sin(p.angle) * r;
      const y = p.y + Math.sin(t * 0.8 + i * 0.01) * 0.25;

      // Keep y bounded
      if (p.y > 2.5) p.ySpeed = -Math.abs(p.ySpeed);
      if (p.y < -2.5) p.ySpeed = Math.abs(p.ySpeed);

      dummy.position.set(x, y, z);
      dummy.scale.setScalar(p.scale * (1 + Math.sin(t * 2 + i) * 0.25));
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial color="#c9aaff" transparent opacity={0.42} />
    </instancedMesh>
  );
}

/* ─── Continuous Glowing Ring Vortex Trails ─── */
function VortexRings() {
  const groupRef = useRef();

  useFrame(({ clock }) => {
    if (groupRef.current) {
      const t = clock.getElapsedTime();
      groupRef.current.rotation.y = t * 0.15;
      groupRef.current.rotation.x = Math.sin(t * 0.1) * 0.08;
    }
  });

  const rings = useMemo(() => {
    return [
      { radius: 2.3, tube: 0.007, color: '#c9aaff', opacity: 0.30, rotX: 0.3, rotZ: 0.2 },
      { radius: 2.9, tube: 0.005, color: '#8399ff', opacity: 0.22, rotX: -0.2, rotZ: 0.5 },
      { radius: 3.5, tube: 0.004, color: '#b3e1ff', opacity: 0.18, rotX: 0.5, rotZ: -0.3 },
      { radius: 1.8, tube: 0.008, color: '#ffccfd', opacity: 0.25, rotX: -0.4, rotZ: 0.1 },
      { radius: 4.0, tube: 0.003, color: '#c9aaff', opacity: 0.12, rotX: 0.1, rotZ: 0.6 },
    ];
  }, []);

  return (
    <group ref={groupRef}>
      {rings.map((ring, i) => (
        <mesh key={i} rotation={[ring.rotX, 0, ring.rotZ]}>
          <torusGeometry args={[ring.radius, ring.tube, 16, 100]} />
          <meshBasicMaterial color={ring.color} transparent opacity={ring.opacity} />
        </mesh>
      ))}
    </group>
  );
}

/* ─── Continuous Inner Glow Core ─── */
function GlowCore() {
  const meshRef = useRef();

  useFrame(({ clock }) => {
    if (meshRef.current) {
      const t = clock.getElapsedTime();
      meshRef.current.scale.setScalar(1 + Math.sin(t * 1.5) * 0.12);
      meshRef.current.material.opacity = 0.09 + Math.sin(t * 2) * 0.03;
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.75, 32, 32]} />
      <meshBasicMaterial color="#c9aaff" transparent opacity={0.09} />
    </mesh>
  );
}

/* ─── Continuous Secondary Particle Layer (Dust) ─── */
function DustParticles({ count = 380 }) {
  const pointsRef = useRef();

  const [positions, sizes] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const sz = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = Math.random() * 5 + 1.2;
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
      sz[i] = Math.random() * 1.8 + 0.4;
    }
    return [pos, sz];
  }, [count]);

  useFrame(({ clock }) => {
    if (pointsRef.current) {
      const t = clock.getElapsedTime();
      pointsRef.current.rotation.y = t * 0.05;
      pointsRef.current.rotation.x = Math.sin(t * 0.08) * 0.03;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.025}
        color="#b3e1ff"
        transparent
        opacity={0.35}
        sizeAttenuation
      />
    </points>
  );
}

/* ─── Main Storm Scene (Continuous Motion) ─── */
export default function StormScene() {
  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      zIndex: 0,
      pointerEvents: 'none',
    }}>
      <Canvas
        camera={{ position: [0, 0, 6], fov: 60 }}
        dpr={[1, 1.5]}
        style={{ background: 'transparent' }}
        gl={{ alpha: true, antialias: true }}
      >
        <ambientLight intensity={0.3} />
        <StormParticles count={2400} />
        <VortexRings />
        <GlowCore />
        <DustParticles count={380} />
      </Canvas>
    </div>
  );
}
