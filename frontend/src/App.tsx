import React, { useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, useAnimations } from "@react-three/drei";

export default function App() {
  const [sign, setSign] = useState<string>("");
  const audioRef = useRef<MediaStream | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // --- Avatar component ---
  const Avatar = ({ animationKey }: { animationKey: string }) => {
    const { scene, animations } = useGLTF("/assets/avatar.glb") as any;
    const { actions } = useAnimations(animations, scene as any);

    useEffect(() => {
      if (animationKey && actions[animationKey]) {
        actions[animationKey].reset().fadeIn(0.2).play();
        // Stop after 2 seconds (adjust as needed)
        setTimeout(() => actions[animationKey].fadeOut(0.2), 2000);
      }
    }, [animationKey, actions]);

    return <primitive object={scene} />;
  };

  const [currentAnimation, setCurrentAnimation] = useState<string>("");

  // --- Capture microphone ---
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      audioRef.current = stream;

      // Setup WebSocket or API to stream audio to Whisper
      const ws = new WebSocket("wss://your-whisper-backend.example.com");
      wsRef.current = ws;

      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorder.ondataavailable = (e) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(e.data); // send audio chunk
        }
      };

      mediaRecorder.start(1000); // send audio every second

      ws.onmessage = (msg) => {
        const data = JSON.parse(msg.data);
        const text: string = data.transcript?.toLowerCase() || "";
        setSign(text);

        // Map text to animation key
        if (text.includes("hello")) setCurrentAnimation("hello");
        else if (text.includes("thank you")) setCurrentAnimation("thank_you");
        else if (text.includes("yes")) setCurrentAnimation("yes");
        else if (text.includes("no")) setCurrentAnimation("no");
      };
    });
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Canvas camera={{ position: [0, 1, 3] }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <Avatar animationKey={currentAnimation} />
        <OrbitControls />
      </Canvas>

      <div style={{ position: "absolute", bottom: 20, left: 20, fontSize: 18 }}>
        Live transcription: <strong>{sign}</strong>
      </div>
    </div>
  );
}
