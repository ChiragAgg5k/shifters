'use client'

import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei'
import * as THREE from 'three'

interface Race3DVisualizationProps {
  raceState: any
}

const AGENT_COLORS = [
  '#f97373', '#ef4444', '#dc2626', '#fb923c', '#facc15',
  '#fda4af', '#fecaca', '#f97316', '#ea580c', '#991b1b',
  '#b91c1c', '#fbbf24', '#fee2e2', '#7f1d1d', '#f87171'
]

// --- Main Scene Component ---
function Scene({ raceState }: { raceState: any }) {
  if (!raceState?.environment?.track?.coordinates) {
    return null; // Guard clause
  }

  const scaledCurve = useMemo(() => {
    const coords = raceState.environment.track.coordinates;
    const minX = Math.min(...coords.map((c: any) => c.x));
    const maxX = Math.max(...coords.map((c: any) => c.x));
    const minY = Math.min(...coords.map((c: any) => c.y));
    const maxY = Math.max(...coords.map((c: any) => c.y));
    
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const scale = 150 / Math.max(maxX - minX, maxY - minY);
    
    const points = coords.map((c: any) => 
      new THREE.Vector3(
        (c.x - centerX) * scale,
        0,
        (c.y - centerY) * scale
      )
    );
    return new THREE.CatmullRomCurve3(points, true, 'catmullrom', 0.5);
  }, [raceState.environment.track.coordinates]);

  return (
    <>
      <ambientLight intensity={1} />
      <directionalLight 
        position={[100, 100, 50]} 
        intensity={2}
        castShadow
        shadow-mapSize-width={4096}
        shadow-mapSize-height={4096}
      />
      <Environment preset="sunset" />

      <Track curve={scaledCurve} />
      
      {raceState.agents.map((agent: any, index: number) => (
        <Vehicle 
          key={agent.id} 
          agent={agent} 
          index={index}
          curve={scaledCurve}
          trackLength={raceState.environment.track.length}
        />
      ))}

      <PerspectiveCamera makeDefault position={[0, 120, 120]} fov={60} />
      <OrbitControls minDistance={30} maxDistance={300} />
    </>
  )
}

// --- Track Component ---
function Track({ curve }: { curve: THREE.CatmullRomCurve3 }) {
  const trackGeometry = useMemo(() => {
    const points = curve.getPoints(512);
    const shape = new THREE.Shape();
    shape.moveTo(0, -4);
    shape.lineTo(0, 4);
    const extrudeSettings = {
      steps: 512,
      extrudePath: curve,
      bevelEnabled: false,
    };
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, [curve]);

  return (
    <group>
      <mesh geometry={trackGeometry} receiveShadow>
        <meshStandardMaterial color="#404040" roughness={0.8} metalness={0.1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[1000, 1000]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
    </group>
  );
}

// --- Bike Component ---
function Bike({ color, finished }: { color: string; finished: boolean }) {
  return (
    <group position={[0, 0, 0]}>
      {/* Bike frame */}
      <mesh castShadow position={[0, 0, 0]}>
        <boxGeometry args={[0.3, 0.5, 2.2]} />
        <meshStandardMaterial 
          color={finished ? '#4ade80' : color}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
      {/* Front wheel */}
      <mesh castShadow position={[0, 0.25, -1]}>
        <cylinderGeometry args={[0.25, 0.25, 0.08, 32]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      {/* Rear wheel */}
      <mesh castShadow position={[0, 0.25, 1]}>
        <cylinderGeometry args={[0.25, 0.25, 0.08, 32]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      {/* Seat */}
      <mesh castShadow position={[0, 0.6, 0.3]}>
        <boxGeometry args={[0.2, 0.1, 0.4]} />
        <meshStandardMaterial color="#000000" />
      </mesh>
    </group>
  );
}

// --- Car Component ---
function Car({ color, finished }: { color: string; finished: boolean }) {
  return (
    <group position={[0, 0, 0]}>
      <mesh castShadow position={[0, 0, 0]}>
        <boxGeometry args={[1.5, 0.6, 3]} />
        <meshStandardMaterial 
          color={finished ? '#4ade80' : color}
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>
      <mesh position={[0, 0.5, -0.3]} castShadow>
        <boxGeometry args={[1, 0.4, 1.2]} />
        <meshStandardMaterial color="#000000" />
      </mesh>
    </group>
  );
}

// --- Vehicle Component ---
function Vehicle({ agent, index, curve, trackLength }: { agent: any; index: number; curve: THREE.CatmullRomCurve3; trackLength: number }) {
  const vehicleRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (vehicleRef.current) {
      const progress = Math.max(0, Math.min(1, agent.position / trackLength));
      const point = curve.getPointAt(progress);
      const tangent = curve.getTangentAt(progress).normalize();

      // Position vehicle directly on the track
      vehicleRef.current.position.copy(point.setY(0.3));
      
      // Orient vehicle along the track direction
      const lookAtPoint = point.clone().add(tangent.multiplyScalar(5));
      lookAtPoint.y = 0.3;
      vehicleRef.current.lookAt(lookAtPoint);
    }
  });

  const color = AGENT_COLORS[index % AGENT_COLORS.length];

  return (
    <group ref={vehicleRef} position={[0, 0, 0]}>
      {agent.vehicleType === 'bike' ? (
        <Bike color={color} finished={agent.finished} />
      ) : (
        <Car color={color} finished={agent.finished} />
      )}
    </group>
  );
}

// --- Main Visualization Component ---
export function Race3DVisualization({ raceState }: Race3DVisualizationProps) {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden" style={{ height: '600px' }}>
      <Canvas shadows>
        <Scene raceState={raceState} />
      </Canvas>
    </div>
  )
}
