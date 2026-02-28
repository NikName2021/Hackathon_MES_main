import type { FC } from "react";
import { Settings } from "lucide-react";
import { Button } from "./ui/button";
import { useToken } from "@/store/auth";

interface LoginButtonProps {
  onClick: () => void;
}

export const LoginButton: FC<LoginButtonProps> = ({ onClick }) => {
  const token = useToken();

  return (
    <div>
      <Button
        onClick={onClick}
        variant="outline"
        className="rounded-full border-white/40 bg-white/10 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-black/30 backdrop-blur hover:bg-white/20"
        title={token ? "Настройки / Выход" : "Вход"}
      >
        {token ? <Settings className="h-5 w-5" /> : "Вход"}
      </Button>
    </div>
  );
};
