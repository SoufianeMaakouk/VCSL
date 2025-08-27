import express from "express";
import { WebSocketServer } from "ws";

const app = express();
const PORT = process.env.PORT || 3001;

// WebSocket signaling
const wss = new WebSocketServer({ noServer: true });

wss.on("connection", (ws) => {
  ws.on("message", (msg) => {
    // Broadcast signaling messages to all peers in same room
    const data = JSON.parse(msg);
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === 1) {
        client.send(JSON.stringify(data));
      }
    });
  });
});

// Upgrade HTTP -> WS
const server = app.listen(PORT, () =>
  console.log(`Signaling server running on port ${PORT}`)
);

server.on("upgrade", (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit("connection", ws, req);
  });
});
