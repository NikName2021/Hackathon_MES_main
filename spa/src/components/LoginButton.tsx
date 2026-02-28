import type { FC } from "react";
import { Button } from "./ui/button";

interface LoginButtonProps {
  onClick: () => void;
}

export const LoginButton: FC<LoginButtonProps> = ({ onClick }) => {
  return (
    <div>
      <Button
        onClick={onClick}
        variant="outline"
        className="rounded-full border-white/40 bg-white/10 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-black/30 backdrop-blur hover:bg-white/20"
      >
        Login
      </Button>
    </div>
  );
};
