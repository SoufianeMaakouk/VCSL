import React, { useEffect, useRef, useState } from "react";
import Peer from "simple-peer";

export default function App() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [currentSign, setCurrentSign] = useState<string>("");

  const wsRef = useRef<WebSocket | null>(null);
  const peerRef = useRef<Peer.Instance | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    // get webcam
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((s) => {
      setStream(s);

      // connect websocket to signaling server
      const ws = new WebSocket("wss://your-video-signaling-server"); // Replace with your signaling server
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

      // --- Start MediaRecorder for live audio ---
      const recorder = new MediaRecorder(s);
      recorder.ondataavailable = async (e) => {
        if (e.data.size > 0) {
          const arrayBuffer = await e.data.arrayBuffer();
          const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

          try {
            const res = await fetch("https://web-production-3fb7.up.railway.app/ws", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ audio: base64Audio }),
            });
            const data = await res.json();
            setCurrentSign(data.sign); // Use this to animate your 3D avatar
          } catch (err) {
            console.error("Translator error:", err);
          }
        }
      };
      recorder.start(1000); // Send every 1 second
      mediaRecorderRef.current = recorder;
    });

    return () => {
      mediaRecorderRef.current?.stop();
      wsRef.current?.close();
      peerRef.current?.destroy();
    };
  }, []);

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
        {currentSign && (
          <p style={{ marginTop: "10px", fontSize: "18px" }}>
            Translation: <strong>{currentSign}</strong>
          </p>
        )}
      </div>
    </div>
  );
}
