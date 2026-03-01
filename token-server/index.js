import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { AccessToken } from "livekit-server-sdk";

dotenv.config();

const app = express();
// Настройка CORS для разрешения запросов из браузера
app.use(cors({
  origin: true, // Разрешить все источники
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// dev-режим LiveKit использует devkey / secret
const apiKey = process.env.LIVEKIT_API_KEY || "devkey";
const apiSecret = process.env.LIVEKIT_API_SECRET || "secret";
const host = process.env.LIVEKIT_HOST || "http://livekit:7880";
// WebSocket URL для клиента (должен быть доступен из браузера)
const wsUrl = process.env.LIVEKIT_WS_URL || "ws://khokhlovkirill.com:7880";

// In-memory Push-To-Talk mutex (single room demo)
let currentHolder = null;

app.get("/token", async (req, res) => {
  const identity = req.query.identity;
  const roomName = req.query.room || "radio-room";

  if (!identity) {
    return res.status(400).json({ error: "identity is required" });
  }

  try {
    // Нормализуем identity (lowercase) для избежания конфликтов
    const normalizedIdentity = identity.toLowerCase().trim();
    
    const at = new AccessToken(apiKey, apiSecret, {
      identity: normalizedIdentity,
      // Устанавливаем TTL токена (6 часов)
      ttl: '6h',
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      // Разрешаем переподключение
      canUpdateOwnMetadata: true,
    });

    const token = await at.toJwt();
    res.json({
      token,
      url: wsUrl, // WebSocket URL для клиента
      roomName,
    });
  } catch (e) {
    console.error("Failed to create token", e);
    res.status(500).json({ error: "failed to create token" });
  }
});

// Request Push-To-Talk ownership
app.post("/ptt/request", (req, res) => {
  const identity = req.body?.identity;
  if (!identity) {
    return res.status(400).json({ error: "identity is required" });
  }

  if (!currentHolder || currentHolder === identity) {
    currentHolder = identity;
    return res.json({ granted: true, holder: currentHolder });
  }

  return res.json({ granted: false, holder: currentHolder });
});

// Release Push-To-Talk ownership
app.post("/ptt/release", (req, res) => {
  const identity = req.body?.identity;
  if (!identity) {
    return res.status(400).json({ error: "identity is required" });
  }

  if (currentHolder === identity) {
    currentHolder = null;
  }

  return res.json({ ok: true, holder: currentHolder });
});

// Get current status
app.get("/ptt/status", (_req, res) => {
  res.json({ holder: currentHolder });
});

const port = process.env.PORT || 3001;
// Слушаем на всех интерфейсах (0.0.0.0), чтобы быть доступным из браузера
app.listen(port, '0.0.0.0', () => {
  console.log(`Token/PTT server listening on 0.0.0.0:${port}`);
});

