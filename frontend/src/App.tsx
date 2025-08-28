import React, { useEffect, useRef, useState } from "react";
import Peer from "simple-peer";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

export default function App() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [sign, setSign] = useState<string>("");
  const [avatar, setAvatar] = useState<THREE.Group | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const peerRef = useRef<Peer.Instance | null>(null);
  const whisperWsRef = useRef<WebSocket | null>(null);
  const avatarSceneRef = useRef<HTMLDivElement | null>(null);

  // Initialize Three.js scene
  useEffect(() => {
    if (!avatarSceneRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    camera.position.z = 2;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(300, 300);
    avatarSceneRef.current.appendChild(renderer.domElement);

    const light = new THREE.HemisphereLight(0xffffff, 0x444444);
    light.position.set(0, 20, 0);
    scene.add(light);

    const loader = new GLTFLoader();
    loader.load("/assets/avatar.glb", (gltf) => {
      const model = gltf.scene;
      model.scale.set(1, 1, 1);
      scene.add(model);
      setAvatar(model);
    });

    const animate = function () {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();
  }, []);

  // Video call + signaling server
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((s) => {
      setStream(s);

      const ws = new WebSocket("wss://vcsl.onrender.com/ws"); // Signaling server
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("Connected to signaling server");

        const peer = new Peer({ initiator: true, trickle: false, stream: s });
        peer.on("signal", (signal) => {
          ws.send(JSON.stringify({ type: "offer", signal }));
        });
        peer.on("stream", (remote) => setRemoteStream(remote));
        peerRef.current = peer;
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "offer") {
          const peer = new Peer({ initiator: false, trickle: false, stream: s });
          peer.on("signal", (signal) => {
            ws.send(JSON.stringify({ type: "answer", signal }));
          });
          peer.on("stream", (remote) => setRemoteStream(remote));
          peer.signal(data.signal);
          peerRef.current = peer;
        } else if (data.type === "answer" && peerRef.current) {
          peerRef.current.signal(data.signal);
        }
      };
    });
  }, []);

  // Initialize Whisper service WebSocket
  useEffect(() => {
    const ws = new WebSocket("wss://web-production-3fb7.up.railway.app/ws");
    whisperWsRef.current = ws;
    ws.onmessage = async (event) => {
      const text = event.data;
      console.log("Transcribed text:", text);

      // Call translator service
      try {
        const res = await fetch(
          "https://translator-service-production-dce4.up.railway.app/translate",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text }),
          }
        );
        const data = await res.json();
        setSign(data.sign);

        // TODO: Trigger 3D avatar animation based on data.sign
        if (avatar) {
          avatar.rotation.y += 0.1; // Example animation
        }
      } catch (err) {
        console.error("Translator error:", err);
      }
    };
  }, [avatar]);

  // Capture audio chunks and send to Whisper
  useEffect(() => {
    if (!stream || !whisperWsRef.current) return;
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const processor = audioContext.createScriptProcessor(4096, 1, 1);

    processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      const buffer = new Float32Array(inputData);
      const bytes = new Uint8Array(buffer.buffer);
      if (whisperWsRef.current.readyState === WebSocket.OPEN) {
        whisperWsRef.current.send(btoa(String.fromCharCode(...bytes)));
      }
    };

    source.connect(processor);
    processor.connect(audioContext.destination);
  }, [stream]);

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
        <div>
          <h2>3D Avatar</h2>
          <div ref={avatarSceneRef}></div>
          {sign && <p>Sign: {sign}</p>}
        </div>
      </div>
    </div>
  );
}
