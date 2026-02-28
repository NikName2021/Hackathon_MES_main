import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Room,
  RoomEvent,
  LocalAudioTrack,
  RemoteAudioTrack,
  createLocalAudioTrack,
} from "livekit-client";

const tokenServerUrl =
  import.meta.env.VITE_TOKEN_SERVER_URL || "http://khokhlovkirill.com:3001";

// WebSocket URL LiveKit будет получен от токен-сервера

type ConnectionState = "disconnected" | "connecting" | "connected";

export const App: React.FC = () => {
  const [name, setName] = useState("");
  const [roomName, setRoomName] = useState("radio-room");
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("disconnected");
  const [error, setError] = useState<string | null>(null);
  const [isHoldingPtt, setIsHoldingPtt] = useState(false);
  const [currentHolder, setCurrentHolder] = useState<string | null>(null);
  const [participants, setParticipants] = useState<string[]>([]);

  const roomRef = useRef<Room | null>(null);
  const micTrackRef = useRef<LocalAudioTrack | null>(null);
  const identityRef = useRef<string | null>(null);

  // Poll PTT status to update current holder indicator
  useEffect(() => {
    if (connectionState !== "connected") return;
    let cancelled = false;

    const poll = async () => {
      while (!cancelled) {
        try {
          const res = await fetch(`${tokenServerUrl}/ptt/status`);
          if (res.ok) {
            const data = await res.json();
            if (!cancelled) {
              setCurrentHolder(data.holder || null);
            }
          }
        } catch {
          // ignore polling errors
        }
        await new Promise((r) => setTimeout(r, 1000));
      }
    };

    poll();
    return () => {
      cancelled = true;
    };
  }, [connectionState]);

  const initMicTrack = useCallback(async () => {
    if (micTrackRef.current) return micTrackRef.current;

    // Проверяем поддержку доступа к микрофону в браузере
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      throw new Error(
        "Браузер не дает доступ к микрофону. Откройте страницу по HTTPS или с устройства по адресу localhost, а также проверьте настройки приватности."
      );
    }

    try {
      const track = await createLocalAudioTrack();
      track.mute();
      micTrackRef.current = track;
      return track;
    } catch (e: any) {
      console.error("Не удалось создать аудиотрек:", e);
      throw new Error(
        e?.message ||
          "Не удалось получить доступ к микрофону. Проверьте разрешения браузера."
      );
    }
  }, []);

  const handleConnect = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      if (!name.trim()) {
        setError("Введите имя");
        return;
      }

      setConnectionState("connecting");
      
      // Закрываем предыдущее соединение, если оно существует
      if (roomRef.current) {
        try {
          console.log("Closing previous connection...");
          await roomRef.current.disconnect();
          // Даем время серверу очистить сессию
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (e) {
          console.warn("Error closing previous connection:", e);
        }
        roomRef.current = null;
      }
      
      try {
        // Нормализуем identity (lowercase) для избежания конфликтов
        const normalizedIdentity = name.trim().toLowerCase();
        const params = new URLSearchParams({
          identity: normalizedIdentity,
          room: roomName.trim() || "radio-room",
        });
        const res = await fetch(`${tokenServerUrl}/token?${params.toString()}`);
        if (!res.ok) {
          throw new Error("Не удалось получить токен");
        }
        const data = await res.json();
        console.log("Token received, connecting to LiveKit...");

        // Используем URL WebSocket из ответа токен-сервера или из env
        const connectUrl =
          data.url ||
          import.meta.env.VITE_LIVEKIT_WS_URL ||
          "ws://khokhlovkirill.com:7880";

        console.log("=== LiveKit Connection Debug ===");
        console.log("Original URL from token server:", data.url);
        console.log("Using URL for LiveKit connect:", connectUrl);
        console.log("Token length:", data.token?.length || 0);
        console.log("Room name:", data.roomName);
        console.log("Identity:", normalizedIdentity);
        
        const room = new Room({
          autoSubscribe: true,
          // Настройки для улучшения подключения
          adaptiveStream: true,
          dynacast: true,
          disconnectOnPageLeave: false,
        });
        
        // Добавляем обработчики событий перед подключением
        room.on(RoomEvent.Connected, () => {
          console.log("✅ Connected to room successfully");
        });
        
        room.on(RoomEvent.Disconnected, (reason) => {
          console.log("❌ Disconnected from room:", reason);
          setError(`Отключено: ${reason || "Неизвестная причина"}`);
          setConnectionState("disconnected");
        });
        
        room.on(RoomEvent.Reconnecting, () => {
          console.log("🔄 Reconnecting...");
        });
        
        room.on(RoomEvent.Reconnected, () => {
          console.log("✅ Reconnected");
        });
        
        room.on(RoomEvent.ConnectionQualityChanged, (quality, participant) => {
          console.log("Connection quality:", quality, participant?.identity);
        });
        
        // Добавляем обработчик для отслеживания состояния подключения
        let connectionStarted = false;
        room.on(RoomEvent.SignalConnected, () => {
          console.log("🔌 Signal connection established");
          connectionStarted = true;
        });
        
        // Диагностика WebRTC соединения
        room.on(RoomEvent.MediaDevicesError, (error: Error) => {
          console.error("❌ Media Devices Error:", error);
        });
        
        room.on(RoomEvent.LocalTrackPublished, (publication, participant) => {
          console.log("📤 Local track published:", publication.kind);
        });
        
        room.on(
          RoomEvent.TrackSubscribed,
          (track, publication, participant) => {
            console.log(
              "📥 Track subscribed:",
              track.kind,
              "from",
              participant.identity
            );
            // Автоматически воспроизводим входящий аудиотрек
            if (track.kind === "audio") {
              const audioTrack = track as RemoteAudioTrack;
              const el = audioTrack.attach();
              el.autoplay = true;
              el.playsInline = true;
              // На некоторых браузерах нужен явный вызов play()
              el.play().catch((err) => {
                console.warn("Не удалось автоматически проиграть аудио:", err);
              });
            }
          }
        );
        
        // Подключаемся с увеличенным таймаутом (30 секунд для WebRTC)
        console.log("🚀 Starting connection...");
        const connectStartTime = Date.now();
        
        try {
          await Promise.race([
            (async () => {
              try {
                await room.connect(connectUrl, data.token);
                const connectTime = Date.now() - connectStartTime;
                console.log(`✅ Connection successful in ${connectTime}ms`);
              } catch (err: any) {
                const connectTime = Date.now() - connectStartTime;
                console.error(`❌ Connection failed after ${connectTime}ms:`, err);
                throw err;
              }
            })(),
            new Promise((_, reject) => 
              setTimeout(() => {
                const connectTime = Date.now() - connectStartTime;
                console.error(`⏱️ Connection timeout after ${connectTime}ms`);
                reject(new Error(`Таймаут подключения (30 сек). Проверьте, что LiveKit сервер запущен и доступен по адресу ${httpUrl}`));
              }, 30000)
            )
          ]);
        } catch (connectError: any) {
          console.error("❌ Final connection error:", connectError);
          // Если это не наш таймаут, пробрасываем оригинальную ошибку
          if (connectError.message && !connectError.message.includes("Таймаут")) {
            throw new Error(connectError.message || "Ошибка подключения к LiveKit");
          }
          throw connectError;
        }

        identityRef.current = room.localParticipant.identity;
        roomRef.current = room;
        setConnectionState("connected");

        const updateParticipants = () => {
          const ids = [
            room.localParticipant.identity,
            ...Array.from(room.remoteParticipants.values()).map(
              (p) => p.identity
            ),
          ];
          setParticipants(ids);
        };

        updateParticipants();
        room.on(RoomEvent.ParticipantConnected, updateParticipants);
        room.on(RoomEvent.ParticipantDisconnected, updateParticipants);
        room.on(RoomEvent.Disconnected, () => {
          setConnectionState("disconnected");
          setParticipants([]);
          setIsHoldingPtt(false);
          setCurrentHolder(null);
        });
      } catch (err: any) {
        console.error("Connection error:", err);
        setError(err.message || "Ошибка подключения");
        setConnectionState("disconnected");
        // Очищаем ссылки при ошибке
        if (roomRef.current) {
          roomRef.current = null;
        }
        identityRef.current = null;
      }
    },
    [name, roomName]
  );

  const cleanupConnection = useCallback(async () => {
    try {
      if (identityRef.current) {
        await fetch(`${tokenServerUrl}/ptt/release`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identity: identityRef.current }),
        });
      }
    } catch {
      // ignore
    }

    if (micTrackRef.current) {
      micTrackRef.current.stop();
      micTrackRef.current = null;
    }
    
    if (roomRef.current) {
      try {
        console.log("Disconnecting from room...");
        await roomRef.current.disconnect();
        // Даем время серверу очистить сессию
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (e) {
        console.warn("Error during disconnect:", e);
      }
      roomRef.current = null;
    }
    
    identityRef.current = null;
    setIsHoldingPtt(false);
    setCurrentHolder(null);
    setParticipants([]);
    setConnectionState("disconnected");
  }, []);

  const requestPtt = useCallback(async () => {
    if (!identityRef.current) return;
    try {
      const res = await fetch(`${tokenServerUrl}/ptt/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identity: identityRef.current }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.granted) {
        setIsHoldingPtt(true);
        setCurrentHolder(identityRef.current);
        const track = await initMicTrack();
        if (roomRef.current && !roomRef.current.localParticipant.isSpeaking) {
          const localParticipant = roomRef.current.localParticipant;

          // В новых версиях LiveKit нет метода getTracks(),
          // поэтому проверяем, опубликован ли уже аудиотрек через audioTrackPublications.
          const hasPublishedAudio =
            localParticipant.audioTrackPublications &&
            localParticipant.audioTrackPublications.size > 0;

          if (!hasPublishedAudio) {
            await localParticipant.publishTrack(track);
          }

          track.unmute();
        }
      } else {
        setIsHoldingPtt(false);
        setCurrentHolder(data.holder || null);
      }
    } catch (e: any) {
      console.error("PTT request error:", e);
      setError(
        e?.message ||
          "Не удалось включить микрофон. Проверьте разрешения браузера и протокол (нужен HTTPS или localhost)."
      );
    }
  }, [initMicTrack, setError]);

  const releasePtt = useCallback(async () => {
    if (!identityRef.current) return;
    try {
      await fetch(`${tokenServerUrl}/ptt/release`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identity: identityRef.current }),
      });
    } catch {
      // ignore
    }
    setIsHoldingPtt(false);
    if (micTrackRef.current) {
      micTrackRef.current.mute();
    }
  }, []);

  // Keyboard controls: Space for PTT
  useEffect(() => {
    const downHandler = (e: KeyboardEvent) => {
      if (e.code === "Space" && connectionState === "connected") {
        e.preventDefault();
        if (!isHoldingPtt) {
          requestPtt();
        }
      }
    };
    const upHandler = (e: KeyboardEvent) => {
      if (e.code === "Space" && connectionState === "connected") {
        e.preventDefault();
        if (isHoldingPtt) {
          releasePtt();
        }
      }
    };
    window.addEventListener("keydown", downHandler);
    window.addEventListener("keyup", upHandler);
    return () => {
      window.removeEventListener("keydown", downHandler);
      window.removeEventListener("keyup", upHandler);
    };
  }, [connectionState, isHoldingPtt, requestPtt, releasePtt]);

  const handlePttMouseDown = () => {
    if (!isHoldingPtt) {
      requestPtt();
    }
  };

  const handlePttMouseUp = () => {
    if (isHoldingPtt) {
      releasePtt();
    }
  };

  const isConnected = connectionState === "connected";
  const myIdentity = identityRef.current;

  return (
    <div className="app">
      <header className="header">
        <h1>LiveKit PTT Radio</h1>
        <p className="subtitle">
          Один говорит — остальные слушают. Зажмите кнопку или пробел, чтобы
          говорить.
        </p>
      </header>

      <main className="content">
        <section className="card">
          <h2>Подключение</h2>
          <form className="form" onSubmit={handleConnect}>
            <label className="field">
              <span>Ваш позывной</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Например, Alpha1"
                disabled={isConnected || connectionState === "connecting"}
              />
            </label>

            <label className="field">
              <span>Комната</span>
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                disabled={isConnected || connectionState === "connecting"}
              />
            </label>

            <div className="buttons">
              {!isConnected ? (
                <button
                  type="submit"
                  className="btn primary"
                  disabled={connectionState === "connecting"}
                >
                  {connectionState === "connecting"
                    ? "Подключение..."
                    : "Войти"}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn"
                  onClick={cleanupConnection}
                >
                  Выйти
                </button>
              )}
            </div>

            {error && <div className="error">{error}</div>}
          </form>
        </section>

        <section className="card">
          <h2>Рация</h2>
          {!isConnected ? (
            <p>Сначала подключитесь к комнате.</p>
          ) : (
            <>
              <div className="ptt-status">
                <div>
                  <span className="label">Говорит сейчас:</span>
                  <span className="value">
                    {currentHolder
                      ? currentHolder === myIdentity
                        ? "Вы"
                        : currentHolder
                      : "никто"}
                  </span>
                </div>
                <div>
                  <span className="label">Вы:</span>
                  <span className="value">
                    {isHoldingPtt ? "В эфире" : "Микрофон выключен"}
                  </span>
                </div>
              </div>

              <button
                type="button"
                className={`ptt-button ${
                  isHoldingPtt ? "ptt-button-active" : ""
                }`}
                onMouseDown={handlePttMouseDown}
                onMouseUp={handlePttMouseUp}
                onMouseLeave={handlePttMouseUp}
              >
                {isHoldingPtt ? "Говорите..." : "Нажмите и удерживайте, чтобы говорить"}
                <span className="ptt-hint">или удерживайте пробел</span>
              </button>
            </>
          )}
        </section>

        <section className="card">
          <h2>Участники</h2>
          {!isConnected ? (
            <p>Нет подключений.</p>
          ) : participants.length === 0 ? (
            <p>Только вы в комнате.</p>
          ) : (
            <ul className="list">
              {participants.map((id) => (
                <li key={id}>
                  <span>{id === myIdentity ? `${id} (вы)` : id}</span>
                  {currentHolder === id && (
                    <span className="badge">в эфире</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
};

