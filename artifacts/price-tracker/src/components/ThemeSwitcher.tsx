import React from "react";
import { useAppContext } from "../context/AppContext";
import { Sun, Moon, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeSwitcher() {
  const { theme, setTheme } = useAppContext();

  const cycleTheme = () => {
    if (theme === "jasny") setTheme("ciemny");
    else setTheme("jasny");
  };

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={cycleTheme}
      className="rounded-full w-10 h-10 transition-colors"
      title={`Zmień motyw (obecny: ${theme})`}
    >
      {theme === "jasny" && <Sun className="h-5 w-5 text-amber-500" />}
      {theme === "ciemny" && <Moon className="h-5 w-5 text-blue-400" />}
      <span className="sr-only">Przełącz motyw</span>
    </Button>
  );
}
