// ExpandablePopulation — the canonical Cortexel population voxel hub.
//
// A population renders as a glowing voxel cube (BoxGeometry + unlit MeshBasic,
// dimmed ×0.82 so it self-luminates under bloom without bleaching white) with a
// pulsing halo ring. Clicking/tapping selects it; the owning scene then collapses
// the hub (scale→0, opacity→0) and expands the constituent neurons via its own
// shader uniform. This component is a behavior-preserving extraction of the hub
// previously inlined in STDPScene/CorticalColumnScene, so both can share it.
//
// Pointer events cover touch via React's unified PointerEvents. When
// `reducedMotion` is set, the scale/opacity transitions snap instead of lerp.

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

export interface ExpandablePopulationProps {
  /** Stable population id (used by the owning scene's selection state). */
  id: string;
  position: [number, number, number];
  color: string;
  isSelected: boolean;
  isAnySelected: boolean;
  isHovered: boolean;
  onHover: (hovered: boolean) => void;
  onClick: () => void;
  themeMode: 'dark' | 'light';
  /** Cube edge length (STDP/Cortical hubs use 0.3). */
  size?: number;
  reducedMotion?: boolean;
}

export function ExpandablePopulation({
  position,
  color,
  isSelected,
  isAnySelected,
  isHovered,
  onHover,
  onClick,
  themeMode,
  size = 0.3,
  reducedMotion = false,
}: ExpandablePopulationProps) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const ringRef = useRef<THREE.Mesh>(null!);
  const scaleRef = useRef(1.0);
  const opacityRef = useRef(1.0);

  const colorObj = useMemo(() => new THREE.Color(color), [color]);
  // Population hub = glowing voxel cube; dimmed to glow under bloom without bleach.
  const voxelColor = useMemo(() => colorObj.clone().multiplyScalar(0.82), [colorObj]);
  const ringColor = useMemo(
    () =>
      themeMode === 'light'
        ? colorObj.clone().multiplyScalar(0.8)
        : colorObj.clone().multiplyScalar(1.15), // bloom-safe cap (was 1.25)
    [colorObj, themeMode],
  );
  const ringInner = size * 0.867;
  const ringOuter = size * 1.067;

  useFrame((state, delta) => {
    let targetScale = 1.0;
    let targetOpacity = 1.0;

    if (isSelected) {
      targetScale = 0.0;
      targetOpacity = 0.0;
    } else if (isAnySelected) {
      targetScale = 0.5;
      targetOpacity = 0.05;
    } else if (isHovered) {
      targetScale = 1.25;
      targetOpacity = 1.0;
    }

    const lerp = reducedMotion ? 1.0 : 0.15;
    scaleRef.current += (targetScale - scaleRef.current) * lerp;
    opacityRef.current += (targetOpacity - opacityRef.current) * lerp;

    if (meshRef.current) {
      const breathe = reducedMotion
        ? 1.0
        : 1.0 + Math.sin(state.clock.elapsedTime * 4.0) * 0.06 * (isHovered ? 1.5 : 1.0);
      meshRef.current.scale.setScalar(scaleRef.current * breathe);
      const mat = meshRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = opacityRef.current;
    }

    if (ringRef.current && opacityRef.current > 0.01) {
      const ringMat = ringRef.current.material as THREE.MeshBasicMaterial;
      if (reducedMotion) {
        // Honor prefers-reduced-motion: hold a static halo instead of the
        // continuously expanding/fading pulse.
        ringRef.current.scale.set(scaleRef.current, scaleRef.current, 1);
        ringMat.opacity = opacityRef.current * 0.25;
      } else {
        const ringTime = (state.clock.elapsedTime * 1.5) % 1.0;
        const ringScale = scaleRef.current * (1.0 + ringTime * 1.2);
        ringRef.current.scale.set(ringScale, ringScale, 1);
        ringMat.opacity = opacityRef.current * (1.0 - ringTime) * 0.4;
      }
    }
  });

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(true);
        }}
        onPointerOut={() => {
          onHover(false);
        }}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        <boxGeometry args={[size, size, size]} />
        {/* Opacity is driven imperatively in useFrame (mat.opacity); binding it
            as a JSX prop too would let r3f reconciliation snap it back to a stale
            mount-time value for one frame on any re-render. Single writer only. */}
        <meshBasicMaterial color={voxelColor} transparent toneMapped fog={false} />
      </mesh>

      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[ringInner, ringOuter, 32]} />
        <meshBasicMaterial
          color={ringColor}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
