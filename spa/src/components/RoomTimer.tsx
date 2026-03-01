import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { getRoomTimer } from "@/api";

type RoomTimerProps = {
  roomId: string;
};

/** Парсинг времени старта как UTC (бэкенд отдаёт с суффиксом Z; без Z трактуем как UTC) */
function parseStartedAt(iso: string): number {
  const s = String(iso).trim();
  if (!s) return 0;
  const asUtc = /[Zz+-]$/.test(s) ? s : s.replace(/\.\d+$/, "") + "Z";
  return new Date(asUtc).getTime();
}

/** Всегда формат 00:00:00 (с начала отсчёта) */
function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

const POLL_INTERVAL_MS = 5000;

export function RoomTimer({ roomId }: RoomTimerProps) {
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const fetchTimer = useCallback(() => {
    if (!roomId) return;
    getRoomTimer(roomId)
      .then((res) => {
        const at = res.timer_started_at ?? null;
        setStartedAt((prev) => prev ?? at);
        if (at) {
          const start = parseStartedAt(at);
          setElapsed(Date.now() - start);
        }
      })
      .catch(() => {});
  }, [roomId]);

  useEffect(() => {
    fetchTimer();
    const id = setInterval(fetchTimer, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchTimer]);

  useEffect(() => {
    if (!startedAt) return;
    const start = parseStartedAt(startedAt);
    const tick = () => setElapsed(Date.now() - start);
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  if (!startedAt) return null;

  const timerNode = (
    <div
      className="fixed left-4 top-4 z-[99999] rounded-lg border border-white/15 bg-black/40 px-3 py-1.5 text-lg font-medium tabular-nums text-white shadow-lg backdrop-blur sm:left-6 sm:top-6 sm:px-4 sm:py-2 sm:text-xl"
      aria-live="polite"
      aria-label={`Таймер: ${formatElapsed(elapsed)}`}
    >
      {formatElapsed(elapsed)}
    </div>
  );

  return createPortal(timerNode, document.body);
}
