import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Room,
  RoomEvent,
  LocalAudioTrack,
  RemoteAudioTrack,
  createLocalAudioTrack,
  type Track,
} from "livekit-client";

const tokenServerUrl =
  (import.meta.env.VITE_TOKEN_SERVER_URL as string) || "";

type ConnectionState = "disconnected" | "connecting" | "connected";

type RadioWidgetProps = {
  roomId: string;
  identity: string;
  isAdmin?: boolean;
};

export function RadioWidget({
  roomId,
  identity,
  isAdmin = false,
}: RadioWidgetProps) {
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("disconnected");
  const [error, setError] = useState<string | null>(null);
  const [isHoldingPtt, setIsHoldingPtt] = useState(false);
  const [currentHolder, setCurrentHolder] = useState<string | null>(null);
  const [participants, setParticipants] = useState<string[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const roomRef = useRef<Room | null>(null);
  const micTrackRef = useRef<LocalAudioTrack | null>(null);
  const identityRef = useRef<string | null>(null);
  /** Когда канал занят, показываем пользователю «в эфире», но микрофон не публикуем (обманка). */
  const fakePttRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingContextRef = useRef<AudioContext | null>(null);
  const recordingDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const recordingSourcesRef = useRef<MediaStreamAudioSourceNode[]>([]);

  const initMicTrack = useCallback(async () => {
    if (micTrackRef.current) return micTrackRef.current;
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      throw new Error("Доступ к микрофону недоступен (HTTPS или localhost)");
    }
    const track = await createLocalAudioTrack();
    track.mute();
    micTrackRef.current = track;
    return track;
  }, []);

  useEffect(() => {
    if (connectionState !== "connected" || !tokenServerUrl) return;
    let cancelled = false;
    const poll = async () => {
      while (!cancelled) {
        try {
          const res = await fetch(`${tokenServerUrl}/ptt/status`);
          if (res.ok) {
            const data = await res.json();
            if (!cancelled) setCurrentHolder(data.holder || null);
          }
        } catch {
          /* ignore */
        }
        await new Promise((r) => setTimeout(r, 1000));
      }
    };
    poll();
    return () => {
      cancelled = true;
    };
  }, [connectionState]);

  const connect = useCallback(async () => {
    if (!tokenServerUrl.trim()) {
      setError("Сервер рации не настроен (VITE_TOKEN_SERVER_URL)");
      return;
    }
    setError(null);
    setConnectionState("connecting");
    if (roomRef.current) {
      try {
        await roomRef.current.disconnect();
        await new Promise((r) => setTimeout(r, 500));
      } catch {
        /* ignore */
      }
      roomRef.current = null;
    }

    try {
      const normalizedIdentity = identity.trim().toLowerCase().replace(/\s+/g, "_") || "user";
      const params = new URLSearchParams({
        identity: normalizedIdentity,
        room: roomId.trim() || "radio-room",
      });
      const res = await fetch(`${tokenServerUrl}/token?${params.toString()}`);
      if (!res.ok) throw new Error("Не удалось получить токен рации");
      const data = await res.json();
      const connectUrl =
        data.url ||
        (import.meta.env.VITE_LIVEKIT_WS_URL as string) ||
        "";

      const room = new Room({
        adaptiveStream: true,
        disconnectOnPageLeave: false,
      });

      room.on(RoomEvent.Disconnected, () => {
        fakePttRef.current = false;
        setConnectionState("disconnected");
        setParticipants([]);
        setIsHoldingPtt(false);
        setCurrentHolder(null);
      });

      room.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === "audio") {
          const el = (track as RemoteAudioTrack).attach();
          el.autoplay = true;
          el.play().catch(() => {});
        }
      });

      await room.connect(connectUrl, data.token);

      identityRef.current = room.localParticipant.identity;
      roomRef.current = room;
      setConnectionState("connected");

      const updateParticipants = () => {
        const ids = [
          room.localParticipant.identity,
          ...Array.from(room.remoteParticipants.values()).map((p) => p.identity),
        ];
        setParticipants(ids);
      };
      updateParticipants();
      room.on(RoomEvent.ParticipantConnected, updateParticipants);
      room.on(RoomEvent.ParticipantDisconnected, updateParticipants);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка подключения рации");
      setConnectionState("disconnected");
      roomRef.current = null;
    }
  }, [roomId, identity]);

  const disconnect = useCallback(async () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    setIsRecording(false);
    recordingContextRef.current?.close().catch(() => {});
    recordingContextRef.current = null;
    recordingDestinationRef.current = null;
    recordingSourcesRef.current = [];
    recordingChunksRef.current = [];
    try {
      if (identityRef.current && tokenServerUrl) {
        await fetch(`${tokenServerUrl}/ptt/release`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identity: identityRef.current }),
        });
      }
    } catch {
      /* ignore */
    }
    if (micTrackRef.current) {
      micTrackRef.current.stop();
      micTrackRef.current = null;
    }
    if (roomRef.current) {
      try {
        await roomRef.current.disconnect();
      } catch {
        /* ignore */
      }
      roomRef.current = null;
    }
    identityRef.current = null;
    fakePttRef.current = false;
    setIsHoldingPtt(false);
    setCurrentHolder(null);
    setParticipants([]);
    setConnectionState("disconnected");
  }, []);

  const requestPtt = useCallback(async () => {
    if (!identityRef.current || !tokenServerUrl) return;
    try {
      const res = await fetch(`${tokenServerUrl}/ptt/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identity: identityRef.current }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.granted) {
        fakePttRef.current = false;
        setIsHoldingPtt(true);
        setCurrentHolder(identityRef.current);
        const track = await initMicTrack();
        if (roomRef.current) {
          const lp = roomRef.current.localParticipant;
          const hasAudio =
            lp.audioTrackPublications && lp.audioTrackPublications.size > 0;
          if (!hasAudio) await lp.publishTrack(track);
          track.unmute();
        }
      } else {
        // Канал занят: показываем пользователю «в эфире» (анимация, кнопка), но микрофон не публикуем
        fakePttRef.current = true;
        setIsHoldingPtt(true);
        setCurrentHolder(data.holder || null);
      }
    } catch (e) {
      setError("Не удалось включить микрофон");
    }
  }, [initMicTrack]);

  const releasePtt = useCallback(async () => {
    if (fakePttRef.current) {
      fakePttRef.current = false;
      setIsHoldingPtt(false);
      return;
    }
    if (!identityRef.current || !tokenServerUrl) return;
    try {
      await fetch(`${tokenServerUrl}/ptt/release`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identity: identityRef.current }),
      });
    } catch {
      /* ignore */
    }
    setIsHoldingPtt(false);
    if (micTrackRef.current) micTrackRef.current.mute();
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "Space" && connectionState === "connected") {
        e.preventDefault();
        if (!isHoldingPtt) requestPtt();
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space" && connectionState === "connected") {
        e.preventDefault();
        if (isHoldingPtt) releasePtt();
      }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [connectionState, isHoldingPtt, requestPtt, releasePtt]);

  const handlePttDown = () => {
    if (!isHoldingPtt) requestPtt();
  };
  const handlePttUp = () => {
    if (isHoldingPtt) releasePtt();
  };

  const addTrackToRecording = useCallback(
    (ctx: AudioContext, dest: MediaStreamAudioDestinationNode, mediaStreamTrack: MediaStreamTrack) => {
      try {
        const source = ctx.createMediaStreamSource(new MediaStream([mediaStreamTrack]));
        source.connect(dest);
        recordingSourcesRef.current.push(source);
      } catch {
        /* ignore */
      }
    },
    []
  );

  const startRecording = useCallback(() => {
    const room = roomRef.current;
    if (!room || isRecording) return;

    const ctx = new AudioContext({ sampleRate: 48000 });
    const dest = ctx.createMediaStreamDestination();
    recordingContextRef.current = ctx;
    recordingDestinationRef.current = dest;
    recordingSourcesRef.current = [];
    recordingChunksRef.current = [];

    room.remoteParticipants.forEach((participant) => {
      participant.audioTrackPublications.forEach((pub) => {
        const track = pub.track;
        if (track?.mediaStreamTrack) addTrackToRecording(ctx, dest, track.mediaStreamTrack);
      });
    });

    room.localParticipant.audioTrackPublications.forEach((pub) => {
      const track = pub.track;
      if (track?.mediaStreamTrack) addTrackToRecording(ctx, dest, track.mediaStreamTrack);
    });

    const mixStream = dest.stream;

    const finishRecording = () => {
      const blob = new Blob(recordingChunksRef.current, { type: "audio/webm" });
      if (blob.size > 0) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `radio-${roomId}-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}.webm`;
        a.click();
        URL.revokeObjectURL(url);
      }
      recordingSourcesRef.current = [];
      recordingContextRef.current = null;
      recordingDestinationRef.current = null;
      recordingChunksRef.current = [];
      ctx.close().catch(() => {});
    };

    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(mixStream, { mimeType: "audio/webm;codecs=opus", audioBitsPerSecond: 128000 });
    } catch {
      recorder = new MediaRecorder(mixStream);
    }
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordingChunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      finishRecording();
    };

    recorder.start(500);
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
  }, [roomId, isRecording, addTrackToRecording]);

  useEffect(() => {
    if (!isRecording) return;
    const room = roomRef.current;
    const ctx = recordingContextRef.current;
    const dest = recordingDestinationRef.current;
    if (!room || !ctx || !dest) return;

    const onTrackSubscribed = (track: Track) => {
      if (track.kind === "audio") {
        const mt = (track as RemoteAudioTrack).mediaStreamTrack;
        if (mt) addTrackToRecording(ctx, dest, mt);
      }
    };

    room.on(RoomEvent.TrackSubscribed, onTrackSubscribed);
    return () => {
      room.off(RoomEvent.TrackSubscribed, onTrackSubscribed);
    };
  }, [isRecording, addTrackToRecording]);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
      mediaRecorderRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const isConnected = connectionState === "connected";
  const myIdentity = identityRef.current;

  if (!tokenServerUrl) {
    return null;
  }

  return (
    <div className="radio-widget">
      {isAdmin && isConnected && (
        <div className="radio-widget-admin-panel">
          <div className="radio-widget-admin-row">
            <span className="radio-widget-admin-label">Говорит сейчас:</span>
            <span className="radio-widget-admin-value">
              {currentHolder
                ? currentHolder === myIdentity
                  ? "Вы"
                  : currentHolder
                : "никто"}
            </span>
          </div>
          <div className="radio-widget-admin-participants">
            <span className="radio-widget-admin-label">Участники рации:</span>
            <ul className="radio-widget-participants-list">
              {participants.map((id) => (
                <li key={id}>
                  {id === myIdentity ? `${id} (вы)` : id}
                  {currentHolder === id && (
                    <span className="radio-widget-badge">в эфире</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <div className="radio-widget-admin-recording">
            {!isRecording ? (
              <button
                type="button"
                className="radio-widget-btn radio-widget-btn-record"
                onClick={startRecording}
                title="Записать эфир рации и сохранить файл"
              >
                🎙️ Начать запись
              </button>
            ) : (
              <button
                type="button"
                className="radio-widget-btn radio-widget-btn-stop"
                onClick={stopRecording}
                title="Остановить запись и скачать файл"
              >
                ⏹ Остановить и сохранить
              </button>
            )}
          </div>
        </div>
      )}

      <div
        className={`radio-widget-bubble ${expanded ? "radio-widget-bubble-expanded" : ""}`}
        role="region"
        aria-label="Рация"
      >
        <button
          type="button"
          className="radio-widget-toggle"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
        >
          <span className="radio-widget-icon">📻</span>
          <span className="radio-widget-title">Рация</span>
          {isConnected && (
            <span className="radio-widget-dot" title="Подключено" />
          )}
        </button>

        {expanded && (
          <div className="radio-widget-content">
            <p className="radio-widget-hint">
              Удерживайте кнопку или клавишу <kbd>Пробел</kbd>, чтобы говорить.
              Один говорит — остальные слышат.
            </p>

            {!isConnected ? (
              <div className="radio-widget-connect">
                <button
                  type="button"
                  className="radio-widget-btn radio-widget-btn-primary"
                  onClick={connect}
                  disabled={connectionState === "connecting"}
                >
                  {connectionState === "connecting"
                    ? "Подключение…"
                    : "Подключиться к рации"}
                </button>
              </div>
            ) : (
              <>
                {!isAdmin && (
                  <div className="radio-widget-status">
                    {isHoldingPtt ? "В эфире" : "Микрофон выключен"}
                  </div>
                )}
                <button
                  type="button"
                  className={`radio-widget-ptt ${isHoldingPtt ? "radio-widget-ptt-active" : ""}`}
                  onMouseDown={handlePttDown}
                  onMouseUp={handlePttUp}
                  onMouseLeave={handlePttUp}
                >
                  {isHoldingPtt ? "Говорите…" : "Удерживайте, чтобы говорить"}
                  <span className="radio-widget-ptt-hint">или клавиша Пробел</span>
                </button>
                <button
                  type="button"
                  className="radio-widget-btn radio-widget-btn-outline"
                  onClick={disconnect}
                >
                  Отключиться
                </button>
              </>
            )}

            {error && (
              <div className="radio-widget-error" role="alert">
                {error}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{radioWidgetCss}</style>
    </div>
  );
}

const radioWidgetCss = `
.radio-widget {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  z-index: 1000;
  font-family: inherit;
}

.radio-widget-admin-panel {
  position: absolute;
  bottom: 100%;
  right: 0;
  margin-bottom: 0.5rem;
  padding: 1rem;
  min-width: 220px;
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 1rem;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
}

.radio-widget-admin-row {
  margin-bottom: 0.75rem;
  font-size: 0.875rem;
}

.radio-widget-admin-label {
  color: rgba(255, 255, 255, 0.6);
  margin-right: 0.35rem;
}

.radio-widget-admin-value {
  color: #e2e8f0;
  font-weight: 500;
}

.radio-widget-admin-participants {
  margin-top: 0.5rem;
}

.radio-widget-participants-list {
  list-style: none;
  padding: 0;
  margin: 0.35rem 0 0;
  font-size: 0.8rem;
  color: #e2e8f0;
}

.radio-widget-participants-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.35rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.radio-widget-participants-list li:last-child {
  border-bottom: none;
}

.radio-widget-badge {
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  background: rgba(34, 197, 94, 0.2);
  border: 1px solid rgba(34, 197, 94, 0.6);
  color: #86efac;
  font-size: 0.7rem;
}

.radio-widget-admin-recording {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.radio-widget-btn-record {
  width: 100%;
  background: rgba(234, 179, 8, 0.2);
  border: 1px solid rgba(234, 179, 8, 0.6);
  color: #fde047;
  cursor: pointer;
}

.radio-widget-btn-record:hover {
  background: rgba(234, 179, 8, 0.3);
}

.radio-widget-btn-stop {
  width: 100%;
  background: rgba(239, 68, 68, 0.25);
  border: 1px solid rgba(248, 113, 113, 0.6);
  color: #fca5a5;
  cursor: pointer;
  animation: radio-widget-recording-pulse 1.5s ease-in-out infinite;
}

.radio-widget-btn-stop:hover {
  background: rgba(239, 68, 68, 0.35);
}

@keyframes radio-widget-recording-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.85; }
}

.radio-widget-bubble {
  width: 68px;
  height: 68px;
  border-radius: 50%;
  background: linear-gradient(135deg, #01315c 0%, #0a5a9e 100%);
  border: 2px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 20px rgba(1, 67, 123, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: box-shadow 0.2s, transform 0.2s;
}

.radio-widget-bubble:hover {
  box-shadow: 0 6px 24px rgba(1, 67, 123, 0.6);
}

.radio-widget-bubble-expanded {
  width: auto;
  height: auto;
  min-width: 280px;
  max-width: 320px;
  border-radius: 1.25rem;
  padding: 1rem;
  flex-direction: column;
  align-items: stretch;
  gap: 0.75rem;
}

.radio-widget-toggle {
  width: 100%;
  height: 100%;
  border: none;
  background: none;
  color: #fff;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.15rem;
  padding: 0;
  border-radius: inherit;
}

.radio-widget-bubble-expanded .radio-widget-toggle {
  flex-direction: row;
  justify-content: flex-start;
  padding: 0.25rem 0;
  margin-bottom: 0.25rem;
}

.radio-widget-icon {
  font-size: 1.75rem;
}

.radio-widget-title {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.95;
}

.radio-widget-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #22c55e;
  margin-left: auto;
  box-shadow: 0 0 8px #22c55e;
}

.radio-widget-content {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.radio-widget-hint {
  margin: 0;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.4;
}

.radio-widget-hint kbd {
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.25);
  font-size: 0.75rem;
}

.radio-widget-status {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.8);
}

.radio-widget-connect {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.radio-widget-btn {
  padding: 0.5rem 1rem;
  border-radius: 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: opacity 0.2s;
}

.radio-widget-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.radio-widget-btn-primary {
  background: linear-gradient(135deg, #01315c 0%, #0a5a9e 100%);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.radio-widget-btn-outline {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.25);
}

.radio-widget-btn-outline:hover {
  background: rgba(255, 255, 255, 0.18);
}

.radio-widget-ptt {
  padding: 0.75rem 1rem;
  border-radius: 999px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  background: rgba(0, 0, 0, 0.2);
  color: #fff;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  transition: transform 0.08s, box-shadow 0.08s, border-color 0.08s, background 0.08s;
}

.radio-widget-ptt:active {
  transform: scale(0.98);
}

.radio-widget-ptt-active {
  border-color: #22c55e;
  background: rgba(34, 197, 94, 0.25);
  box-shadow: 0 0 20px rgba(34, 197, 94, 0.5);
}

.radio-widget-ptt-hint {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.7);
}

.radio-widget-error {
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  background: rgba(220, 38, 38, 0.15);
  border: 1px solid rgba(248, 113, 113, 0.5);
  color: #fecaca;
  font-size: 0.8rem;
}
`;
