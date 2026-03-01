import { MoveLeft } from "lucide-react";
import { Button } from "./ui/button";
import { useNavigate } from "react-router-dom";
import { PATHS } from "@/config/paths";

export const ButtonBack = () => {
  const navigate = useNavigate();
  const handleBack = () => {
    navigate(PATHS.ROOT);
  };
  return (
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
  );
};
