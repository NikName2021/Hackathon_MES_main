import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { PATHS } from "@/config/paths";

type AppShellProps = {
  children: ReactNode;
};

const ACCENT = "#01437b";
const ACCENT_LIGHT = "#0a5a9e";

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute -top-32 left-1/2 h-72 w-[28rem] -translate-x-1/2 rounded-full blur-3xl opacity-50"
          style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_LIGHT} 50%, #0d7cc4 100%)` }}
        />
        <div
          className="absolute bottom-0 left-12 h-64 w-64 rounded-full blur-3xl opacity-30"
          style={{ background: ACCENT }}
        />
        <div className="absolute inset-0 opacity-40 [background-image:repeating-linear-gradient(135deg,rgba(255,255,255,0.06)_0,rgba(255,255,255,0.06)_8px,transparent_8px,transparent_16px)]" />
        <div
          className="absolute inset-0 opacity-90"
          style={{
            background: `radial-gradient(ellipse 80% 50% at 50% 0%, ${ACCENT}22, transparent 55%), radial-gradient(circle at bottom right, ${ACCENT}18, transparent 45%)`,
          }}
        />
      </div>
      <header className="relative z-20 border-b border-white/10 bg-slate-950/80 backdrop-blur-md">
        <div className="mx-auto grid h-20 max-w-[1600px] grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 sm:px-6">
          <Link to={PATHS.ROOT} className="flex min-w-0 items-center justify-self-start focus:outline-none focus:ring-2 focus:ring-white/30 rounded-lg px-2 py-1">
            <img src="/logo.svg" alt="Логотип" className="h-12 w-auto max-w-[220px] object-contain sm:h-14 sm:max-w-[260px]" />
          </Link>
          <Link to={PATHS.ROOT} className="text-xl font-semibold tracking-tight text-white hover:text-white/90 transition-colors sm:text-2xl focus:outline-none focus:ring-2 focus:ring-white/30 rounded px-2 py-1">
            ТП-Симулятор
          </Link>
          <div className="justify-self-end" aria-hidden />
        </div>
      </header>
      <div className="relative z-10 min-h-screen">{children}</div>
    </div>
  );
}
