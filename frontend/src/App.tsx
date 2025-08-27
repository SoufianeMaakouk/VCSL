import React, { useState, useEffect } from "react";
import Avatar from "./Avatar";

export default function App() {
  const [sign, setSign] = useState<string>("idle");

  // Function to call translator API
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

      // Map translation to animation name
      if (data.sign.toLowerCase().includes("hello")) setSign("hello");
      else if (data.sign.toLowerCase().includes("yes")) setSign("yes");
      else if (data.sign.toLowerCase().includes("no")) setSign("no");
      else setSign("idle"); // fallback
    } catch (err) {
      console.error("Translator error:", err);
      setSign("idle");
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Live Sign Language Avatar</h1>
      <input
        type="text"
        placeholder="Type something..."
        onKeyDown={(e) => {
          if (e.key === "Enter") callTranslator((e.target as HTMLInputElement).value);
        }}
      />
      <div style={{ marginTop: "20px" }}>
        <Avatar animationKey={sign} />
      </div>
    </div>
  );
}
