import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { getInviteRoom } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PATHS } from "@/config/paths";

export function JoinPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [inviteToken, setInviteToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    setError("");
    setLoading(true);
    try {
      await getInviteRoom(inviteToken, username);
      navigate(PATHS.INVITE.replace(":tokenId", inviteToken));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка входа");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="relative z-10 flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/40 backdrop-blur sm:p-10">
          <div className="text-xs uppercase tracking-[0.3em] text-orange-300/80">
            Приглашение
          </div>
          <h1 className="mt-3 text-2xl font-semibold">
            Присоединиться к комнате
          </h1>

          <div className="mt-6 grid gap-4">
            <Input
              autoFocus
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Имя"
              className="h-12 rounded-xl border-white/20 bg-white/95 text-base text-slate-900 placeholder:text-slate-500"
            />
            <Input
              value={inviteToken}
              onChange={(event) => setInviteToken(event.target.value)}
              placeholder="Токен"
              className="h-12 rounded-xl border-white/20 bg-white/95 text-base text-slate-900 placeholder:text-slate-500"
            />
          </div>

          {error && <div className="mt-4 text-sm text-red-200">{error}</div>}

          <Button
            type="button"
            size="lg"
            onClick={handleJoin}
            className="mt-6 h-12 w-full bg-gradient-to-r from-red-600 via-orange-600 to-amber-500 text-base text-white shadow-lg shadow-orange-500/30 hover:from-red-500 hover:via-orange-500 hover:to-amber-400"
            disabled={loading}
          >
            {loading ? "Подключаем..." : "Подключиться"}
          </Button>
        </div>
      </div>
    </main>
  );
}
