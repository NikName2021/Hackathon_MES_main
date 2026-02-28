import { useState } from "react";
import { MoveLeft } from "lucide-react";
import { loginRequest } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { PATHS } from "@/config/paths";
import { useToken } from "@/store/auth";
export function LoginPage() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isChangeToken, setIsChangeToken] = useState<boolean>(false);

  const token = useToken();
  const navigate = useNavigate();
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

  const handleBack = () => {
    navigate(PATHS.ROOT);
  };

  const changeLogin = () => {
    setLogin("");
    setPassword("");
    setIsChangeToken(true);
  };

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="relative z-10 flex min-h-screen items-center justify-center px-6">
        {token && !isChangeToken ? (
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/40 backdrop-blur sm:p-10">
            <div className="flex justify-start">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                className="mb-6 inline-flex h-9 gap-2 border-white/30 bg-white/10 text-white hover:bg-white/20"
              >
                <MoveLeft className="h-4 w-4" />
                Назад
              </Button>
            </div>
            <div className="text-xs uppercase tracking-[0.3em] text-orange-300/80">
              Доступ
            </div>
            <h1 className="mt-3 text-2xl font-semibold">Вы вошли в систему</h1>
            <p className="mt-3 text-sm text-white/70">
              Можете продолжить работу или войти под другим аккаунтом.
            </p>
            <Button
              onClick={changeLogin}
              variant="outline"
              className="mt-6 inline-flex h-11 gap-2 border-white/30 bg-white/10 px-5 text-white hover:bg-white/20"
            >
              Войти в другой аккаунт
            </Button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/40 backdrop-blur sm:p-10"
          >
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              className="mb-4 inline-flex h-9 gap-2 border-white/30 bg-white/10 text-white hover:bg-white/20"
            >
              <MoveLeft className="h-4 w-4" />
              Назад
            </Button>
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

            {error && <div className="mt-4 text-sm text-red-200">{error}</div>}

            <Button
              type="submit"
              size="lg"
              className="mt-6 h-12 w-full bg-gradient-to-r from-red-600 via-orange-600 to-amber-500 text-base text-white shadow-lg shadow-orange-500/30 hover:from-red-500 hover:via-orange-500 hover:to-amber-400"
              disabled={loading}
            >
              {loading ? "Входим..." : "Войти"}
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
