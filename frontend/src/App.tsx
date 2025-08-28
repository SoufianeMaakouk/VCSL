// src/App.tsx
import React, { useEffect, useRef, useState } from "react";
import Peer from "simple-peer";

export default function App() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [sign, setSign] = useState<string>("");

  const wsRef = useRef<WebSocket | null>(null);
  const whisperRef = useRef<WebSocket | null>(null);
  const peerRef = useRef<Peer.Instance | null>(null);

  useEffect(() => {
    // get webcam + mic
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((s) => {
      setStream(s);

      // ---- Connect signaling server ----
      const ws = new WebSocket("https://vcsl.onrender.com");
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

      // ---- Connect Whisper service ----
      const whisperWS = new WebSocket("wss://web-production-3fb7.up.railway.app/ws"); // ✅ Your deployed Whisper
      whisperWS.onopen = () => {
        console.log("Connected to Whisper service");
        startMicStreaming(s, whisperWS);
      };
      whisperWS.onmessage = (event) => {
        console.log("Whisper result:", event.data);
        setSign(event.data); // Show transcription OR map to avatar
      };
      whisperRef.current = whisperWS;
    });
  }, []);

  // --- Send mic audio to Whisper ---
  const startMicStreaming = (stream: MediaStream, ws: WebSocket) => {
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const processor = audioContext.createScriptProcessor(4096, 1, 1);

    source.connect(processor);
    processor.connect(audioContext.destination);

    processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      const int16Data = float32ToInt16(inputData);
      const base64 = arrayBufferToBase64(int16Data.buffer);
      ws.send(base64);
    };
  };

  const float32ToInt16 = (buffer: Float32Array) => {
    let l = buffer.length;
    const buf = new Int16Array(l);
    while (l--) {
      buf[l] = Math.min(1, buffer[l]) * 0x7fff;
    }
    return buf;
  };

  const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    let binary = "";
    let bytes = new Uint8Array(buffer);
    let chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      let sub = bytes.subarray(i, i + chunk);
      binary += String.fromCharCode.apply(null, sub as unknown as number[]);
    }
    return btoa(binary);
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
        <h3>Live Transcription → Avatar</h3>
        {sign && (
          <p style={{ marginTop: "10px", fontSize: "18px" }}>
            Whisper: <strong>{sign}</strong>
          </p>
        )}
      </div>
    </div>
  );
}
