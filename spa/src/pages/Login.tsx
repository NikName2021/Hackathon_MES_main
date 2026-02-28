import { useState } from "react";

import { loginRequest } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginPage() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await loginRequest(login, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка входа");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden">

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/40 backdrop-blur sm:p-10"
        >
          <div className="text-xs uppercase tracking-[0.3em] text-orange-300/80">
            Вход
          </div>
          <h1 className="mt-3 text-2xl font-semibold">Доступ в систему</h1>

          <div className="mt-6 grid gap-4">
            <Input
              value={login}
              onChange={(event) => setLogin(event.target.value)}
              placeholder="Логин"
              autoComplete="username"
              className="h-12 rounded-xl border-white/20 bg-white/95 text-base text-slate-900 placeholder:text-slate-500"
            />
            <Input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Пароль"
              type="password"
              autoComplete="current-password"
              className="h-12 rounded-xl border-white/20 bg-white/95 text-base text-slate-900 placeholder:text-slate-500"
            />
          </div>

          {error && (
            <div className="mt-4 text-sm text-red-200">{error}</div>
          )}

          <Button
            type="submit"
            size="lg"
            className="mt-6 h-12 w-full bg-gradient-to-r from-red-600 via-orange-600 to-amber-500 text-base text-white shadow-lg shadow-orange-500/30 hover:from-red-500 hover:via-orange-500 hover:to-amber-400"
            disabled={loading}
          >
            {loading ? "Входим..." : "Войти"}
          </Button>
        </form>
      </div>
    </main>
  );
}
