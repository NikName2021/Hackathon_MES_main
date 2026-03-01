import { useEffect, useState } from "react";
import {useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioWidget } from "@/components/RadioWidget";
import { RoomTimer } from "@/components/RoomTimer";
import { GameEndedOverlay } from "@/components/GameEndedOverlay";
import SchemeCanvas from "@/roles/components/equipment/SchemeCanvas";
import { useRoomGameSocket } from "@/hooks/useRoomGameSocket";
import {
  getCanvasState,
  setCanvasBackgroundUrl,
  setCanvasObjects,
} from "@/store/canvas";
import { useRoomId, useRoomInvites } from "@/store/room";
import { setGameSummary } from "@/store/gameSummary";
import { getSimulationState, getRoomState, postEndGame } from "@/api";


const ROLE_LABELS: Record<string, string> = {
  dispatcher: "Диспетчер",
  rtp: "Руководитель тушения пожара",
  headquarters: "Штаб",
  by1: "Боевой участок 1",
  by2: "Боевой участок 2",
};

export const RoomPage = () => {
  const { roomId: paramRoomId } = useParams();
  const storedRoomId = useRoomId();
  const invites = useRoomInvites();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const roomCode = paramRoomId ?? storedRoomId ?? "—";
  const wsRoomId = roomCode && roomCode !== "—" ? roomCode : null;
  const { remoteState, gameEnded } = useRoomGameSocket(wsRoomId);
  const [endGameLoading, setEndGameLoading] = useState(false);
  const [placedItems, setPlacedItems] = useState<any[]>([]);
  const [zoom, setZoom] = useState(1);

  const buildIssues = (
    canvasObjects: any[],
    items: any[],
    backgroundUrl: string | null,
  ) => {
    const issues: string[] = [];
    if (!backgroundUrl) {
      issues.push("Не загружен фон схемы.");
    }
    if (!canvasObjects?.length) {
      issues.push("На схеме отсутствуют объекты обстановки.");
    }
    const hasFire = Array.isArray(canvasObjects)
      ? canvasObjects.some((obj) => obj?.type === "fire")
      : false;
    if (!hasFire) {
      issues.push("Не обозначен очаг пожара.");
    }
    const hasZones = Array.isArray(canvasObjects)
      ? canvasObjects.some((obj) =>
          ["line", "rect", "circle"].includes(String(obj?.type)),
        )
      : false;
    if (!hasZones) {
      issues.push("Не нанесены линии или зоны обстановки.");
    }
    if (!items?.length) {
      issues.push("Не размещены силы и средства на схеме.");
    }
    return issues;
  };

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      window.setTimeout(
        () => setCopiedKey((current) => (current === key ? null : current)),
        1200,
      );
    } catch {
      prompt("Скопируйте ссылку вручную:", text);
    }
  }

  /** Применяем состояние сцены (как у РТП): расстановка техники, зум, фон, объекты канваса */
  const applySceneState = (
    state: {
      placedItems?: unknown[];
      zoom?: number;
      canvasBackground?: string | null;
      canvasObjects?: unknown[];
      canvasObjectsProvided?: boolean;
    } | null
  ) => {
    if (!state) return;
    const items = Array.isArray(state.placedItems) ? state.placedItems : [];
    setPlacedItems(items);
    if (typeof state.zoom === "number") setZoom(state.zoom);
    if (state.canvasBackground !== undefined) {
      setCanvasBackgroundUrl(state.canvasBackground ?? null);
    }
    if (Array.isArray(state.canvasObjects)) {
      setCanvasObjects(state.canvasObjects as any);
    }
  };

  useEffect(() => {
    applySceneState(remoteState);
  }, [remoteState]);

  /** При открытии комнаты администратором — загружаем текущее состояние сцены из БД (как у РТП), чтобы схема и расстановка были синхронизированы */
  useEffect(() => {
    if (!wsRoomId) return;
    getRoomState(wsRoomId)
      .then((res) => {
        const state = res?.state;
        if (state && typeof state === "object") {
          applySceneState({
            placedItems: (state as { placedItems?: unknown[] }).placedItems,
            zoom: (state as { zoom?: number }).zoom,
            canvasBackground: (state as { canvasBackground?: string | null }).canvasBackground,
            canvasObjects: (state as { canvasObjects?: unknown[] }).canvasObjects,
          });
        }
      })
      .catch(() => {});
  }, [wsRoomId]);

  const handleEndGame = async () => {
    if (!wsRoomId || endGameLoading) return;
    setEndGameLoading(true);
    try {
      const canvas = getCanvasState();
      let dispatches: any[] = [];
      try {
        const sim = await getSimulationState(wsRoomId);
        dispatches = sim.dispatcher_dispatches ?? [];
      } catch {
        dispatches = [];
      }
      setGameSummary({
        roomId: wsRoomId,
        endedAt: new Date().toISOString(),
        invites,
        placedItems,
        zoom,
        canvasBackground: canvas.backgroundUrl,
        canvasObjects: canvas.objects,
        issues: buildIssues(canvas.objects, placedItems, canvas.backgroundUrl),
        dispatches,
      });
      await postEndGame(wsRoomId).catch(() => {});
    } finally {
      setEndGameLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden">
      {wsRoomId && <GameEndedOverlay roomId={wsRoomId} gameEnded={gameEnded} />}
      {roomCode && roomCode !== "—" && <RoomTimer roomId={roomCode} />}
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 px-6 py-14">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/40 backdrop-blur sm:p-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--accent-light)] font-medium">
                Оперативный штаб
              </p>
              <h1 className="mt-3 text-3xl font-semibold">Комната создана</h1>
              <p className="mt-3 text-sm text-white/70">
                Передайте участникам их персональные ссылки для входа в комнату.
              </p>
            </div>
            <div className="flex flex-col items-start gap-3 md:items-end">
              <Button
                size="lg"
                className="h-11 min-w-[200px] bg-gradient-to-r from-red-600 via-orange-600 to-amber-500 text-white shadow-lg shadow-orange-500/30 hover:from-red-500 hover:via-orange-500 hover:to-amber-400"
                onClick={handleEndGame}
                disabled={endGameLoading}
              >
                {endGameLoading ? "Завершение…" : "Закончить игру"}
              </Button>
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 px-5 py-4">
                <div className="text-xs text-white/60">Код комнаты</div>
                <div className="mt-1 text-lg font-semibold tracking-widest">
                  {roomCode}
                </div>
                <div className="mt-4 text-xs text-white/60">Ваша роль</div>
                <div className="mt-1 text-sm font-semibold text-[var(--accent-light)]">
                  Администратор
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4">
          <div className="mt-4">
            <SchemeCanvas
              placedItems={placedItems}
              onPlace={() => {}}
              onMove={() => {}}
              onRemove={() => {}}
              onScaleChange={() => {}}
              onRotationChange={() => {}}
              readOnly
              zoom={zoom}
            />
          </div>
          {invites.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-white/70">
              Нет данных по приглашениям.
            </div>
          ) : (
            invites.map((invite) => (
              <div
                key={`${invite.role}-${invite.invite_token}`}
                className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-black/20 backdrop-blur"
              >
                <div className="flex flex-col gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-[var(--accent-light)] font-medium">
                      Роль
                    </p>
                    <div className="mt-2 text-lg font-semibold">
                      {ROLE_LABELS[invite.role] ?? invite.role}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-[var(--accent-light)] font-medium">
                      Токен
                    </p>
                    <div className="mt-2 text-sm font-semibold text-white/90">
                      {invite.invite_token}
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Input
                      value={invite.url}
                      readOnly
                      onFocus={(event) => event.currentTarget.select()}
                      className="h-11 border-white/20 bg-white/95 text-slate-900"
                    />
                    <Button
                      size="lg"
                      variant="outline"
                      className="h-11 min-w-[150px] border-white/30 bg-white/10 text-white hover:bg-white/20"
                      onClick={() => copy(invite.url, invite.invite_token)}
                    >
                      {copiedKey === invite.invite_token
                        ? "Скопировано"
                        : "Скопировать"}
                    </Button>
                  </div>
                  <p className="text-xs text-white/60">
                    Скопируйте ссылку и передайте её участнику.
                  </p>
                </div>
              </div>
            ))
          )}
        </section>

        {roomCode && roomCode !== "—" && (
          <>
            <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/20 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--accent-light)] font-medium">
                Схема действий
              </p>
              <p className="mt-2 text-sm text-white/70">
                Наблюдение за тем, как участники размещают силы и средства на
                схеме.
              </p>

              <div className="mt-4">
                <SchemeCanvas
                  placedItems={placedItems}
                  onPlace={() => {}}
                  onMove={() => {}}
                  onRemove={() => {}}
                  onScaleChange={() => {}}
                  onRotationChange={() => {}}
                  readOnly
                  zoom={zoom}
                  roomId={roomCode}
                />
              </div>

            </section>
            <section className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--accent-light)] font-medium">
                Рация
              </p>
              <p className="mt-2 text-sm text-white/70">
                Кнопка «Рация» внизу справа — подключение к каналу комнаты.
                После подключения вы увидите список участников и того, кто
                сейчас говорит.
              </p>
            </section>
            <RadioWidget roomId={roomCode} identity="admin" isAdmin={true} />
          </>
        )}
      </div>
    </main>
  );
};
