import type { ReactNode } from "react";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-72 w-[28rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-red-600/40 via-orange-500/30 to-amber-400/30 blur-3xl" />
        <div className="absolute bottom-0 left-12 h-64 w-64 rounded-full bg-gradient-to-br from-orange-500/20 via-red-500/20 to-amber-300/30 blur-3xl" />
        <div className="absolute inset-0 opacity-40 [background-image:repeating-linear-gradient(135deg,rgba(255,255,255,0.07)_0,rgba(255,255,255,0.07)_8px,transparent_8px,transparent_16px)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.12),_transparent_60%)]" />
      </div>
      <div className="relative z-10 min-h-screen">{children}</div>
    </div>
  );
}
