import { Input } from "@/components/ui/input";

export function JoinPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-72 w-[28rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-red-600/40 via-orange-500/30 to-amber-400/30 blur-3xl" />
        <div className="absolute bottom-0 left-12 h-64 w-64 rounded-full bg-gradient-to-br from-orange-500/20 via-red-500/20 to-amber-300/30 blur-3xl" />
        <div className="absolute inset-0 opacity-40 [background-image:repeating-linear-gradient(135deg,rgba(255,255,255,0.07)_0,rgba(255,255,255,0.07)_8px,transparent_8px,transparent_16px)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.12),_transparent_60%)]" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/40 backdrop-blur sm:p-10">
          <Input
            autoFocus
            placeholder="Введите код комнаты"
            className="h-12 rounded-xl border-white/20 bg-white/95 text-base text-slate-900 placeholder:text-slate-500"
          />
        </div>
      </div>
    </main>
  );
}
