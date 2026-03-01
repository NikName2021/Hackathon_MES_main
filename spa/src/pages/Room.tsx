import { useState } from "react";
import { useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioWidget } from "@/components/RadioWidget";
import { RoomTimer } from "@/components/RoomTimer";
import { useRoomId, useRoomInvites } from "@/store/room";

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

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      window.setTimeout(
        () => setCopiedKey((current) => (current === key ? null : current)),
        1200
      );
    } catch {
      prompt("Скопируйте ссылку вручную:", text);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      {roomCode && roomCode !== "—" && <RoomTimer roomId={roomCode} />}
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 px-6 py-14">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/40 backdrop-blur sm:p-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--accent-light)] font-medium">
                Оперативный штаб
              </p>
              <h1 className="mt-3 text-3xl font-semibold">
                Комната создана
              </h1>
              <p className="mt-3 text-sm text-white/70">
                Передайте участникам их персональные ссылки для входа в комнату.
              </p>
            </div>
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
        </section>

        <section className="grid gap-4">
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
            <section className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--accent-light)] font-medium">
                Рация
              </p>
              <p className="mt-2 text-sm text-white/70">
                Кнопка «Рация» внизу справа — подключение к каналу комнаты. После подключения вы увидите список участников и того, кто сейчас говорит.
              </p>
            </section>
            <RadioWidget roomId={roomCode} identity="admin" isAdmin={true} />
          </>
        )}
      </div>
    </main>
  );
};
