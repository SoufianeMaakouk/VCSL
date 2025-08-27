import React, { useRef, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";

interface AvatarProps {
  animationKey: string; // Animation to play
}

function AvatarModel({ animationKey }: AvatarProps) {
  const group = useRef<THREE.Group>(null!);
  const { scene, animations } = useGLTF("/assets/avatar.glb") as any;

  useEffect(() => {
    const mixer = new THREE.AnimationMixer(scene);

    // Find animation by name
    const clip = animations.find(
      (a: any) => a.name.toLowerCase() === animationKey.toLowerCase()
    );

    if (clip) {
      const action = mixer.clipAction(clip);
      action.reset().fadeIn(0.2).play();
    }

    const clock = new THREE.Clock();

    const animate = () => {
      requestAnimationFrame(animate);
      mixer.update(clock.getDelta());
    };
    animate();
  }, [animationKey, scene, animations]);

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
