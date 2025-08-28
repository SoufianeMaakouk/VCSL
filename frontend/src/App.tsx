import React, { useEffect, useRef, useState } from "react";
import Peer from "simple-peer";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";

const Avatar = ({ sign }: { sign: string }) => {
  const gltf = useGLTF("/assets/avatar.glb");
  // Here you can trigger animations based on sign
  // For simplicity, we'll just render the model
  return <primitive object={gltf.scene} scale={1} />;
};

export default function App() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [sign, setSign] = useState<string>("");

  const wsRef = useRef<WebSocket | null>(null);
  const peerRef = useRef<Peer.Instance | null>(null);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((s) => {
      setStream(s);

      // Connect to signaling server (replace with your backend URL)
      const ws = new WebSocket("wss://vcsl.onrender.com");
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("Connected to signaling server");

        const peer = new Peer({ initiator: true, trickle: false, stream: s });
        peer.on("signal", (signal) => ws.send(JSON.stringify({ type: "offer", signal })));
        peer.on("stream", (remote) => setRemoteStream(remote));
        peerRef.current = peer;
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "offer") {
          const peer = new Peer({ initiator: false, trickle: false, stream: s });
          peer.on("signal", (signal) => ws.send(JSON.stringify({ type: "answer", signal })));
          peer.on("stream", (remote) => setRemoteStream(remote));
          peer.signal(data.signal);
          peerRef.current = peer;
        } else if (data.type === "answer" && peerRef.current) {
          peerRef.current.signal(data.signal);
        }
      };
    });
  }, []);

  // --- Whisper + Translator integration ---
  const callTranslator = async (audioBlob: Blob) => {
    try {
      // Convert audio to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      // Send to Whisper service
      const ws = new WebSocket("wss://web-production-3fb7.up.railway.app/ws");
      ws.onopen = () => ws.send(base64Audio);

      ws.onmessage = async (event) => {
        const recognizedText = event.data;
        // Call Translator API
        const res = await fetch("https://translator-service-production-dce4.up.railway.app/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: recognizedText }),
        });
        const data = await res.json();
        setSign(data.sign);
      };
    } catch (err) {
      console.error("Translation error:", err);
      setSign("⚠️ Translator service unreachable");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", padding: "20px" }}>
      <div style={{ display: "flex", gap: "20px" }}>
        <div>
          <h2>My Camera</h2>
          {stream && <video autoPlay playsInline muted ref={(v) => v && (v.srcObject = stream)} />}
        </div>
        <div>
          <h2>Remote Camera</h2>
          {remoteStream && <video autoPlay playsInline ref={(v) => v && (v.srcObject = remoteStream)} />}
        </div>
      </div>

      <div style={{ height: "400px" }}>
        <h2>3D Avatar Translation</h2>
        <Canvas>
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} />
          <Avatar sign={sign} />
          <OrbitControls />
        </Canvas>
        <p style={{ marginTop: "10px", fontSize: "18px" }}>
          Translation: <strong>{sign}</strong>
        </p>
      </div>
    </div>
  );
}
