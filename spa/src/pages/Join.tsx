import { Input } from "@/components/ui/input";

export function JoinPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <Input
        autoFocus
        placeholder="Введите код комнаты"
        className="w-full max-w-sm"
      />
    </main>
  );
}
