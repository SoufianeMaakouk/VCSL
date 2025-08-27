import React, { useState, useEffect, useRef } from "react";
import Avatar from "./Avatar";

export default function App() {
  const [sign, setSign] = useState<string>("idle");
  const audioRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Ask for microphone access
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      audioRef.current = stream;
      startStreamingAudio(stream);
    });
  }, []);

  const startStreamingAudio = (stream: MediaStream) => {
    const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });

    mediaRecorder.ondataavailable = async (e) => {
      if (e.data.size > 0) {
        const formData = new FormData();
        formData.append("audio", e.data, "audio.webm");

        try {
          // Send audio blob to your backend
          const res = await fetch("YOUR_BACKEND_ENDPOINT/audio_translate", {
            method: "POST",
            body: formData,
          });

          const data = await res.json();

          // Map returned translation to avatar animation
          if (data.sign.toLowerCase().includes("hello")) setSign("hello");
          else if (data.sign.toLowerCase().includes("yes")) setSign("yes");
          else if (data.sign.toLowerCase().includes("no")) setSign("no");
          else setSign("idle");
        } catch (err) {
          console.error("Error translating audio:", err);
          setSign("idle");
        }
      }
    };

    mediaRecorder.start(1000); // send audio chunks every 1 second
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Live Sign Language Avatar</h1>
      <p>Speak and watch the avatar sign in real time!</p>
      <Avatar animationKey={sign} />
    </div>
  );
}
