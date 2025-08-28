import React, { useEffect, useRef, useState } from "react";
import Peer from "simple-peer";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

export default function App() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [sign, setSign] = useState<string>("");

  const wsRef = useRef<WebSocket | null>(null);
  const peerRef = useRef<Peer.Instance | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const avatarRef = useRef<any>(null); // Three.js avatar
  const sceneRef = useRef<THREE.Scene | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);

  // --- Video call + audio capture ---
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((s) => {
      setStream(s);

      // Setup MediaRecorder for live audio chunks
      const mediaRecorder = new MediaRecorder(s);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          const formData = new FormData();
          formData.append("audio", event.data, "chunk.wav");

          try {
            const res = await fetch(
              "https://translator-service-production-dce4.up.railway.app/audio_translate",
              { method: "POST", body: formData }
            );
            const data = await res.json();
            setSign(data.sign);

            // Animate avatar based on sign
            animateAvatar(data.sign);
          } catch (err) {
            console.error("Translator error:", err);
            setSign("⚠️ Translator service unreachable");
          }
        }
      };

      mediaRecorder.start(1000); // 1 second chunks

      // --- Simple-Peer setup for video call ---
      const ws = new WebSocket("wss://your-signaling-server");
      wsRef.current = ws;

      ws.onopen = () => {
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

  // --- Three.js Avatar Setup ---
  useEffect(() => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 2;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById("avatarContainer")?.appendChild(renderer.domElement);

    const light = new THREE.AmbientLight(0xffffff, 1);
    scene.add(light);

    const loader = new GLTFLoader();
    loader.load("/assets/avatar.glb", (gltf) => {
      const avatar = gltf.scene;
      scene.add(avatar);
      avatarRef.current = avatar;

      if (gltf.animations.length > 0) {
        const mixer = new THREE.AnimationMixer(avatar);
        mixerRef.current = mixer;
      }
    });

    sceneRef.current = scene;

    const animate = () => {
      requestAnimationFrame(animate);
      if (mixerRef.current) mixerRef.current.update(0.01);
      renderer.render(scene, camera);
    };
    animate();
  }, []);

  // --- Animate avatar based on sign ---
  const animateAvatar = (sign: string) => {
    if (!mixerRef.current || !avatarRef.current) return;

    // Example: map sign text to GLB animation name
    const animationName = sign.toLowerCase().includes("hello") ? "Hello" : null;

    if (animationName) {
      const clip = THREE.AnimationClip.findByName(avatarRef.current.animations, animationName);
      if (clip) {
        const action = mixerRef.current.clipAction(clip);
        action.reset().play();
      }
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

      <div>
        <p style={{ marginTop: "10px", fontSize: "18px" }}>
          Translation: <strong>{sign}</strong>
        </p>
      </div>

      <div id="avatarContainer" style={{ width: "400px", height: "400px" }} />
    </div>
  );
}
