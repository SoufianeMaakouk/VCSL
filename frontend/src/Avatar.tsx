import React, { useRef, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useGLTF, useAnimations } from "@react-three/drei";

interface AvatarProps {
  animationKey: string;
}

function AvatarModel({ animationKey }: AvatarProps) {
  const group = useRef<THREE.Group>(null!);
  const { scene, animations } = useGLTF("/assets/avatar.glb") as any;
  const { actions, mixer } = useAnimations(animations, group);

  useEffect(() => {
    Object.values(actions).forEach((a) => a.stop());
    if (actions[animationKey]) {
      actions[animationKey].reset().fadeIn(0.2).play();
    } else if (actions["idle"]) {
      actions["idle"].reset().fadeIn(0.2).play();
    }
  }, [animationKey, actions]);

  useFrame((state, delta) => mixer.update(delta));

  return <primitive ref={group} object={scene} />;
}

export default function Avatar({ animationKey }: AvatarProps) {
  return (
    <Canvas style={{ width: "300px", height: "400px" }}>
      <ambientLight intensity={0.8} />
      <directionalLight position={[0, 10, 10]} intensity={0.8} />
      <AvatarModel animationKey={animationKey} />
      <OrbitControls enableZoom={false} />
    </Canvas>
  );
}
