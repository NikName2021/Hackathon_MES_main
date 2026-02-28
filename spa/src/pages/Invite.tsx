import { useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { useInviteToken, usePlayerData } from "@/store/player";

export function InvitePage() {
  const { tokenId } = useParams();
  const storedToken = useInviteToken();
  const data = usePlayerData();

  if (!data) {
    return (
      <main className="relative min-h-screen overflow-hidden">
        <div className="relative z-10 flex min-h-screen items-center justify-center px-6">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-white/70 shadow-2xl shadow-black/40 backdrop-blur sm:p-10">
            Данные не найдены. Проверьте токен и попробуйте снова.
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="relative z-10 flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/40 backdrop-blur sm:p-10">
          <div className="text-xs uppercase tracking-[0.3em] text-orange-300/80">
            Приглашение
          </div>
          <h1 className="mt-3 text-2xl font-semibold">{data.message}</h1>

          <div className="mt-6 grid gap-4 text-sm text-white/80">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-orange-300/80">
                Пользователь
              </div>
              <div className="mt-2 text-lg font-semibold text-white">
                {data.username}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-white/60">Room ID</div>
                <div className="mt-2 font-semibold text-white">
                  {data.room_id}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-white/60">Роль</div>
                <div className="mt-2 font-semibold text-white">
                  {data.role}
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs text-white/60">Invite Token</div>
              <div className="mt-2 font-mono text-xs text-white">
                {storedToken ?? tokenId ?? "—"}
              </div>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="mt-6 inline-flex h-11 border-white/30 bg-white/10 text-white hover:bg-white/20"
          >
            Готово
          </Button>
        </div>
      </div>
    </main>
  );
}
