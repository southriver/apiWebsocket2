// server.js
const express = require("express");
const path = require("path");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const port = process.env.PORT || 8080;

// serve index.html from the same folder
app.use(express.static(path.join(__dirname)));

// SSE keeps an HTTP response open so the server can push text events.
const sseClients = new Set();

app.get("/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  // EventSource automatically reconnects after a dropped connection.
  res.write("retry: 3000\n\n");
  res.write(`data: ${JSON.stringify("Welcome to the SSE stream!")}\n\n`);
  sseClients.add(res);

  const timer = setInterval(() => {
    res.write(`data: ${JSON.stringify(`Server time: ${new Date().toISOString()}`)}\n\n`);
  }, 3000);

  res.on("close", () => {
    clearInterval(timer);
    sseClients.delete(res);
  });
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
  console.log("Client connected");

  ws.send("✅ Welcome to the WebSocket server!");

  ws.on("message", (message) => {
    console.log("Received:", message.toString());
    // echo message to all connected clients
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(`Echo: ${message}`);
      }
    });
    // The same message reaches SSE listeners through their HTTP stream.
    sseClients.forEach((client) => {
      client.write(`data: ${JSON.stringify(`WebSocket message: ${message}`)}\n\n`);
    });
  });

  ws.on("close", () => {
    console.log("Client disconnected");
  });
});

server.listen(port, () => {
  console.log(`Server running at http://localhost:${server.address().port}`);
});
