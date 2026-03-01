import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import SchemeCanvas from "@/roles/components/equipment/SchemeCanvas";
import { PATHS } from "@/config/paths";
import { useGameSummary } from "@/store/gameSummary";
import { setCanvasBackgroundUrl, setCanvasObjects } from "@/store/canvas";
import { getDispatcherActionsByRoom } from "@/api";
import type { DispatcherActionItem } from "@/api";

const ROLE_LABELS: Record<string, string> = {
  dispatcher: "Диспетчер",
  rtp: "Руководитель тушения пожара",
  headquarters: "Штаб",
  by1: "Боевой участок 1",
  by2: "Боевой участок 2",
};

export const GameResultPage = () => {
  const summary = useGameSummary();
  const navigate = useNavigate();
  const [dispatcherActions, setDispatcherActions] = useState<DispatcherActionItem[]>([]);

  useEffect(() => {
    if (!summary) return;
    setCanvasBackgroundUrl(summary.canvasBackground ?? null);
    setCanvasObjects(summary.canvasObjects ?? []);
  }, [summary]);

  useEffect(() => {
    if (!summary?.roomId) return;
    getDispatcherActionsByRoom(summary.roomId)
      .then(setDispatcherActions)
      .catch(() => setDispatcherActions([]));
  }, [summary?.roomId]);

  const endedAt = useMemo(() => {
    if (!summary?.endedAt) return "Не указано";
    const date = new Date(summary.endedAt);
    return Number.isNaN(date.getTime())
      ? summary.endedAt
      : date.toLocaleString("ru-RU");
  }, [summary?.endedAt]);

  if (!summary) {
    return (
      <main className="relative min-h-screen overflow-hidden">
        <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-6 px-6 py-14 text-center">
          <h1 className="text-3xl font-semibold">Итоги игры</h1>
          <p className="text-white/70">
            Итоги сформированы. Симуляция завершена.
          </p>
          <Button
            size="lg"
            className="h-12 min-w-[220px]  from-red-600 via-orange-600 to-amber-500 text-white shadow-lg shadow-orange-500/30 hover:from-red-500 hover:via-orange-500 hover:to-amber-400"
            onClick={() => navigate(PATHS.ROOT)}
          >
            На главную
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-14">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/40 backdrop-blur sm:p-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--accent-light)] font-medium">
                Итоги сессии
              </p>
              <h1 className="mt-3 text-3xl font-semibold">Игра завершена</h1>
              <p className="mt-3 text-sm text-white/70">
                Комната: <span className="font-semibold text-white">{summary.roomId ?? "—"}</span>
              </p>
              <p className="text-sm text-white/70">
                Время завершения: <span className="text-white">{endedAt}</span>
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                variant="outline"
                className="h-11 min-w-[180px] border-white/30 bg-white/10 text-white hover:bg-white/20"
                onClick={() => navigate(PATHS.ROOM_ID.replace(":roomId", summary.roomId ?? ""))}
                disabled={!summary.roomId}
              >
                Вернуться в комнату
              </Button>
              <Button
                size="lg"
                className="h-11 min-w-[180px] bg-gradient-to-r from-red-600 via-orange-600 to-amber-500 text-white shadow-lg shadow-orange-500/30 hover:from-red-500 hover:via-orange-500 hover:to-amber-400"
                onClick={() => navigate(PATHS.ROOT)}
              >
                На главную
              </Button>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/30 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--accent-light)] font-medium">
              Финальная схема
            </p>
            <p className="mt-2 text-sm text-white/70">
              Итоговое расположение сил, средств и зоны обстановки.
            </p>
            <div className="mt-4">
              <SchemeCanvas
                placedItems={summary.placedItems ?? []}
                onPlace={() => {}}
                onMove={() => {}}
                onRemove={() => {}}
                onScaleChange={() => {}}
                onRotationChange={() => {}}
                readOnly
                zoom={summary.zoom ?? 1}
              />
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-black/20 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--accent-light)] font-medium">
                Сводка сессии
              </p>
              <div className="mt-4 grid gap-3 text-sm text-white/80">
                <div className="flex items-center justify-between">
                  <span>Ролей в сессии</span>
                  <span className="font-semibold text-white">{summary.invites.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Объекты на схеме</span>
                  <span className="font-semibold text-white">{summary.canvasObjects.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Размещено техники</span>
                  <span className="font-semibold text-white">{summary.placedItems.length}</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-black/20 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--accent-light)] font-medium">
                Высылка техники
              </p>
              <p className="mt-1 text-xs text-white/60">Машины, отправленные диспетчером</p>
              {summary.dispatches.length === 0 ? (
                <p className="mt-2 text-xs text-white/50">Нет записей</p>
              ) : (
                <div className="mt-2 overflow-x-auto">
                  <table className="min-w-full text-xs text-white/80">
                    <thead>
                      <tr className="text-white/50">
                        <th className="pb-1 pr-2 font-medium">Машина</th>
                        <th className="pb-1 pr-2 font-medium">Кол.</th>
                        <th className="pb-1 font-medium">мин</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.dispatches.map((d, i) => (
                        <tr key={`${d.vehicleId}-${d.sentAt}-${i}`} className="border-t border-white/5">
                          <td className="py-1 pr-2">{d.vehicleName}</td>
                          <td className="py-1 pr-2">{d.count}</td>
                          <td className="py-1">{d.etaMinutes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-black/20 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--accent-light)] font-medium">
                Ошибки и замечания
              </p>
              {summary.issues.length === 0 ? (
                <p className="mt-3 text-sm text-white/70">
                  Критических ошибок не зафиксировано.
                </p>
              ) : (
                <ul className="mt-3 list-disc pl-5 text-sm text-white/80">
                  {summary.issues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/30 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--accent-light)] font-medium">
            Журнал диспетчера
          </p>
          <p className="mt-2 text-sm text-white/70">
            Протокол действий диспетчера — все записи по комнате.
          </p>
          <div className="mt-4 overflow-x-auto">
            {dispatcherActions.length === 0 ? (
              <p className="py-3 text-sm text-white/60">
                Записей пока нет.
              </p>
            ) : (
              <table className="min-w-full text-left text-sm text-white/80">
                <thead>
                  <tr className="text-white/60">
                    <th className="pb-3 pr-4 font-medium">Позывной</th>
                    <th className="pb-3 pr-4 font-medium">Действие</th>
                    <th className="pb-3 font-medium">Время</th>
                  </tr>
                </thead>
                <tbody>
                  {dispatcherActions.map((a) => (
                    <tr key={a.id} className="border-t border-white/10">
                      <td className="py-3 pr-4">{a.call_sign}</td>
                      <td className="py-3 pr-4">{a.action}</td>
                      <td className="py-3">
                        {a.date
                          ? new Date(a.date).toLocaleTimeString("ru-RU", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </main>
  );
};
