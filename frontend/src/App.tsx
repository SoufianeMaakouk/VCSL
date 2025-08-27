import React, { useEffect, useRef, useState } from "react";
import Peer from "simple-peer";
import Avatar from "./Avatar";

const SIGN_ANIMATIONS: Record<string, string> = {
  "👋 (HELLO sign)": "hello",
  "🙏 (HOW ARE YOU sign)": "howAreYou",
  "🤟 (THANK YOU sign)": "thankYou",
  "👍 (YES sign)": "yes",
  "👎 (NO sign)": "no",
};

export default function App() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [sign, setSign] = useState<string>("idle");

  const wsRef = useRef<WebSocket | null>(null);
  const peerRef = useRef<Peer.Instance | null>(null);

  // --- Video call setup ---
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((s) => {
      setStream(s);

      const ws = new WebSocket("wss://your-signaling-server"); // replace with signaling server
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

  // --- Translator function ---
  const callTranslator = async (text: string) => {
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
      setSign(SIGN_ANIMATIONS[data.sign] || "idle");
    } catch (err) {
      console.error("Translator error:", err);
      setSign("idle");
    }
  };

  return (
    <div style={{ display: "flex", gap: "20px" }}>
      <div>
        <h2>My Camera</h2>
        {stream && <video autoPlay playsInline muted ref={(v) => v && (v.srcObject = stream)} />}
        <h2>Remote Camera</h2>
        {remoteStream && <video autoPlay playsInline ref={(v) => v && (v.srcObject = remoteStream)} />}
        <div>
          <button onClick={() => callTranslator("hello")}>Translate "hello"</button>
        </div>
      </div>

      <Avatar animationKey={sign} />
    </div>
  );
}
