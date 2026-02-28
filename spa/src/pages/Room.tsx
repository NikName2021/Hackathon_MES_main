import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const DEFAULT_ROOM_ID = "ROOM-1234";
const FALLBACK_BASE_URL = "http://localhost:5173";

type Role = "DISPATCHER" | "RTP" | "NSH";

const INVITES: { role: Role; label: string; token: string }[] = [
  { role: "DISPATCHER", label: "Диспетчер (Д)", token: "TOKEN-D-AAAA" },
  {
    role: "RTP",
    label: "Руководитель тушения пожара (РТП)",
    token: "TOKEN-RTP-BBBB",
  },
  { role: "NSH", label: "Начальник штаба (НШ)", token: "TOKEN-NSH-CCCC" },
];

export const RoomPage = () => {
  const { roomId } = useParams();
  const [copiedRole, setCopiedRole] = useState<Role | null>(null);

  const roomCode = roomId ?? DEFAULT_ROOM_ID;
  const baseUrl =
    typeof window === "undefined" ? FALLBACK_BASE_URL : window.location.origin;

  const links = useMemo(
    () =>
      INVITES.map((invite) => ({
        ...invite,
        url: `${baseUrl}/join?room=${encodeURIComponent(
          roomCode
        )}&role=${encodeURIComponent(invite.role)}&token=${encodeURIComponent(
          invite.token
        )}`,
      })),
    [baseUrl, roomCode]
  );

  async function copy(text: string, role: Role) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedRole(role);
      window.setTimeout(
        () => setCopiedRole((current) => (current === role ? null : current)),
        1200
      );
    } catch {
      prompt("Скопируйте ссылку вручную:", text);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 right-10 h-80 w-80 rounded-full bg-gradient-to-br from-red-600/35 via-orange-500/25 to-amber-400/30 blur-3xl" />
        <div className="absolute bottom-0 left-8 h-72 w-72 rounded-full bg-gradient-to-br from-orange-500/25 via-red-500/20 to-amber-300/30 blur-3xl" />
        <div className="absolute inset-0 opacity-40 [background-image:repeating-linear-gradient(135deg,rgba(255,255,255,0.08)_0,rgba(255,255,255,0.08)_8px,transparent_8px,transparent_16px)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.12),_transparent_60%)]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 px-6 py-14">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/40 backdrop-blur sm:p-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-orange-300/80">
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
              <div className="mt-1 text-sm font-semibold text-orange-300">
                Администратор
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4">
          {links.map((link) => (
            <div
              key={link.role}
              className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-black/20 backdrop-blur"
            >
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-orange-300/80">
                    Роль
                  </p>
                  <div className="mt-2 text-lg font-semibold">{link.label}</div>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Input
                    value={link.url}
                    readOnly
                    onFocus={(event) => event.currentTarget.select()}
                    className="h-11 border-white/20 bg-white/95 text-slate-900"
                  />
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-11 min-w-[150px] border-white/30 bg-white/10 text-white hover:bg-white/20"
                    onClick={() => copy(link.url, link.role)}
                  >
                    {copiedRole === link.role ? "Скопировано" : "Скопировать"}
                  </Button>
                </div>
                <p className="text-xs text-white/60">
                  Скопируйте ссылку и передайте её участнику.
                </p>
              </div>
            </div>
          ))}
        </section>

        <p className="text-xs text-white/50">
          Заглушка: ссылки и токены — константы. Позже код комнаты и токены будут
          генерироваться и проверяться на бэкенде.
        </p>
      </div>
    </main>
  );
};
