import React, { useEffect, useRef, useState } from "react";
import Peer from "simple-peer";

export default function App() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const peerRef = useRef<Peer.Instance | null>(null);

  useEffect(() => {
    // get webcam
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((s) => {
      setStream(s);

      // connect websocket to signaling server
      const ws = new WebSocket("https://vcsl.onrender.com");
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("Connected to signaling server");
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "offer") {
          // create peer when receiving offer
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

      // create initiator peer after ws ready
      ws.onopen = () => {
        const peer = new Peer({ initiator: true, trickle: false, stream: s });
        peer.on("signal", (signal) => {
          ws.send(JSON.stringify({ type: "offer", signal }));
        });
        peer.on("stream", (remote) => setRemoteStream(remote));
        peerRef.current = peer;
      };
    });
  }, []);

  return (
    <div style={{ display: "flex", gap: "20px", padding: "20px" }}>
      <div>
        <h2>My Camera</h2>
        {stream && <video autoPlay playsInline muted ref={(v) => v && (v.srcObject = stream)} />}
      </div>
      <div>
        <h2>Remote Camera</h2>
        {remoteStream && <video autoPlay playsInline ref={(v) => v && (v.srcObject = remoteStream)} />}
      </div>
    </div>
  );
}
