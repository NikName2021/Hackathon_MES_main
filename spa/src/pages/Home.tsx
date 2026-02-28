import { Link, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { PATHS } from "@/config/paths";
import { LoginButton } from "@/components/LoginButton";

export function HomePage() {
  const navigate = useNavigate();
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="absolute top-4 right-4 z-50">
        <LoginButton onClick={() => navigate(PATHS.LOGIN)} />
      </div>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-80 w-[34rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-red-600/45 via-orange-500/35 to-amber-400/35 blur-3xl" />
        <div className="absolute -bottom-32 right-10 h-72 w-72 rounded-full bg-gradient-to-br from-orange-500/25 via-red-500/20 to-amber-300/30 blur-3xl" />
        <div className="absolute inset-0 opacity-40 [background-image:repeating-linear-gradient(135deg,rgba(255,255,255,0.08)_0,rgba(255,255,255,0.08)_8px,transparent_8px,transparent_16px)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.14),_transparent_60%)]" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-12">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/40 backdrop-blur sm:p-10">
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              size="lg"
              className="h-12 px-8 text-base bg-gradient-to-r from-red-600 via-orange-600 to-amber-500 text-white shadow-lg shadow-orange-500/30 hover:from-red-500 hover:via-orange-500 hover:to-amber-400"
              asChild
            >
              <Link to={PATHS.ROOM + "/1"}>Создать комнату</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 px-8 text-base border-white/40 bg-white/10 text-white hover:bg-white/20"
              asChild
            >
              <Link to={PATHS.JOIN}>Присоединиться к комнате</Link>
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
