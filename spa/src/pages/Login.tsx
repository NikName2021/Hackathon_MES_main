import { Input } from "@/components/ui/input";

export const LoginPage = () => {

    return (
        <main className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
            <div className="relative z-10 flex min-h-screen items-center justify-center px-6">
                <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/40 backdrop-blur sm:p-10 flex flex-col gap-5">
                <Input
                    autoFocus
                    placeholder="Введите Логин"
                    className="h-12 rounded-xl border-white/20 bg-white/95 text-base text-slate-900 placeholder:text-slate-500"
                />
                <Input
                    autoFocus
                    placeholder="Введите Пароль"
                    className="h-12 rounded-xl border-white/20 bg-white/95 text-base text-slate-900 placeholder:text-slate-500"
                />
                </div>
            </div>
        </main>
    );
}