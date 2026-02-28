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
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      >
        Login
      </Button>
    </div>
  );
};
