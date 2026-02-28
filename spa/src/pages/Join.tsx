import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { getInviteRoom } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PATHS } from "@/config/paths";
import { ButtonBack } from "@/components/ButtonBack";

export function JoinPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [inviteToken, setInviteToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const {tokenId} = useParams()
  const handleJoin = async () => {
    setError("");
    setLoading(true);

    const token = tokenId ? tokenId : inviteToken
    try {
      if (!token.trim() || !username.trim()) {
        setError("Некорректный логин или пароль");
        return;
      }
      if (token.trim().length > 33) {
        setError("длина токена не превышает 33 символа");
        return;
      }
      if (username.trim().length > 15) {
        setError("длина логина не превышает 15 символов");
        return;
      }
      console.log(token, username)
      await getInviteRoom(token, username);
      navigate(PATHS.INVITE.replace(":tokenId", token));
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
          <ButtonBack />
          <div className="text-xs uppercase tracking-[0.3em] text-[var(--accent-light)] font-medium">
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
              placeholder="Логин"
              className="h-12 rounded-xl border-white/20 bg-white/95 text-base text-slate-900 placeholder:text-slate-500"
            />
            <Input
              value={tokenId ? tokenId : inviteToken}
              onChange={(event) => setInviteToken(event.target.value)}
              disabled = {!!tokenId}
              placeholder="Токен"
              className="h-12 rounded-xl border-white/20 bg-white/95 text-base text-slate-900 placeholder:text-slate-500"
            />
          </div>

          {error && <div className="mt-4 text-sm text-red-200">{error}</div>}

          <Button
            type="button"
            size="lg"
            onClick={handleJoin}
            className="mt-6 h-12 w-full text-base text-white shadow-lg hover:opacity-95 transition-opacity"
            style={{ background: "linear-gradient(135deg, var(--accent-dark) 0%, var(--accent-light) 100%)", boxShadow: "0 4px 20px var(--accent-muted)" }}
            disabled={loading}
          >
            {loading ? "Подключаем..." : "Подключиться"}
          </Button>
        </div>
      </div>
    </main>
  );
}
