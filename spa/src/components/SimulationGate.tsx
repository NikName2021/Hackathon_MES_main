import { useCallback, useEffect, useState } from "react";
import { getSimulationState } from "@/api";
import type { SimulationStateResponse } from "@/api";

const ROLE_DISPATCHER = "Диспетчер";
const ROLE_RTP = "РТП";
const ROLE_HEADQUARTERS = "штаб";
const ROLE_BY1 = "БУ1";
const ROLE_BY2 = "БУ2";

const POLL_MS = 3000;

function parseSentAt(s: string): number {
  const t = String(s).trim();
  if (!t) return 0;
  const withZ = /[Zz+-]$/.test(t) ? t : t.replace(/\.\d+$/, "") + "Z";
  return new Date(withZ).getTime();
}

/** Вычисляет время прибытия первой техники (мс) */
function getFirstArrivalMs(state: SimulationStateResponse): number | null {
  const list = state.dispatcher_dispatches;
  if (!list?.length) return null;
  let min = Infinity;
  for (const d of list) {
    const sent = parseSentAt(d.sentAt);
    const etaMs = (d.etaMinutes || 0) * 60 * 1000;
    const arrival = sent + etaMs;
    if (arrival < min) min = arrival;
  }
  return min === Infinity ? null : min;
}

/** Оставшиеся миллисекунды до прибытия (не меньше 0) */
function remainingMs(arrivalMs: number): number {
  return Math.max(0, arrivalMs - Date.now());
}

/** Формат MM:SS для обратного отсчёта */
function formatCountdown(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

type SimulationGateProps = {
  roomId: string;
  role: string;
  children: React.ReactNode;
};

export function SimulationGate({ roomId, role, children }: SimulationGateProps) {
  const [state, setState] = useState<SimulationStateResponse | null>(null);
  /** Оставшееся время до прибытия в мс — обновляется раз в секунду для обратного отсчёта */
  const [remainingMsState, setRemainingMsState] = useState<number | null>(null);

  const fetchState = useCallback(() => {
    if (!roomId) return;
    getSimulationState(roomId)
      .then(setState)
      .catch(() => setState(null));
  }, [roomId]);

  useEffect(() => {
    fetchState();
    const id = setInterval(fetchState, POLL_MS);
    return () => clearInterval(id);
  }, [fetchState]);

  useEffect(() => {
    if (!state || role !== ROLE_RTP) return;
    const arrival = getFirstArrivalMs(state);
    if (arrival == null) return;
    const update = () => setRemainingMsState(remainingMs(arrival));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [state, role]);

  if (!state) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-white/70">Загрузка состояния симуляции…</p>
      </div>
    );
  }

  if (role === ROLE_DISPATCHER) {
    return <>{children}</>;
  }

  const simulationStarted = Boolean(state.timer_started_at);
  const hasDispatches = state.dispatcher_dispatches?.length > 0;
  const firstArrivalMs = getFirstArrivalMs(state);
  const arrived = firstArrivalMs != null && Date.now() >= firstArrivalMs;

  if (!simulationStarted || (!hasDispatches && role !== ROLE_DISPATCHER)) {
    return (
      <div className="relative z-10 flex min-h-[60vh] flex-col items-center justify-center rounded-2xl border border-white/10 bg-slate-900/60 p-8 text-center backdrop-blur">
        <p className="text-xl font-medium text-white">
          Ожидается вызов и запуск функций
        </p>
        <p className="mt-2 text-sm text-white/70">
          Действия заблокированы до начала симуляции и высылки техники
          диспетчером.
        </p>
      </div>
    );
  }

  if (hasDispatches && !arrived) {
    if (role === ROLE_RTP && firstArrivalMs != null) {
      const left = remainingMsState ?? remainingMs(firstArrivalMs);
      const display = formatCountdown(left);
      return (
        <div className="relative z-10 flex min-h-[60vh] flex-col items-center justify-center rounded-2xl border border-white/10 bg-slate-900/60 p-8 text-center backdrop-blur">
          <p className="text-lg font-medium text-white">
            Ожидание прибытия техники
          </p>
          <p className="mt-4 text-4xl font-bold tabular-nums text-orange-400">
            До прибытия техники: {display}
          </p>
          <p className="mt-1 text-sm text-white/50">мин : сек</p>
          <p className="mt-2 text-sm text-white/60">
            После прибытия откроются все активные функции
          </p>
        </div>
      );
    }
    return (
      <div className="relative z-10 flex min-h-[60vh] flex-col items-center justify-center rounded-2xl border border-white/10 bg-slate-900/60 p-8 text-center backdrop-blur">
        <p className="text-xl font-medium text-white">
          Ожидается вызов и запуск функций
        </p>
        <p className="mt-2 text-sm text-white/70">
          Ожидание прибытия техники. Действия заблокированы.
        </p>
      </div>
    );
  }

  const headquartersCreated = Boolean(state.headquarters_created);
  const combatSectionsAdded = Number(state.combat_sections_added) || 0;

  if (role === ROLE_HEADQUARTERS && !headquartersCreated) {
    return (
      <div className="relative z-10 flex min-h-[60vh] flex-col items-center justify-center rounded-2xl border border-white/10 bg-slate-900/60 p-8 text-center backdrop-blur">
        <p className="text-xl font-medium text-white">
          Ожидаем добавления в группы от РТП
        </p>
        <p className="mt-2 text-sm text-white/70">
          Действия заблокированы до нажатия РТП кнопки «Создание штаба».
        </p>
      </div>
    );
  }

  if (role === ROLE_BY1 && combatSectionsAdded < 1) {
    return (
      <div className="relative z-10 flex min-h-[60vh] flex-col items-center justify-center rounded-2xl border border-white/10 bg-slate-900/60 p-8 text-center backdrop-blur">
        <p className="text-xl font-medium text-white">
          Ожидаем добавления в группу от Штаба
        </p>
        <p className="mt-2 text-sm text-white/70">
          Действия заблокированы до добавления Штабом первого боевого участка.
        </p>
      </div>
    );
  }

  if (role === ROLE_BY2 && combatSectionsAdded < 2) {
    return (
      <div className="relative z-10 flex min-h-[60vh] flex-col items-center justify-center rounded-2xl border border-white/10 bg-slate-900/60 p-8 text-center backdrop-blur">
        <p className="text-xl font-medium text-white">
          Ожидаем добавления в группу от Штаба
        </p>
        <p className="mt-2 text-sm text-white/70">
          Действия заблокированы до добавления Штабом второго боевого участка.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
