import React from "react";
import { Check } from "lucide-react";
import { AVATAR_OPTIONS } from "../data/avatarOptions";

interface AvatarPickerProps {
  selected: string;
  onChange: (color: string) => void;
  name?: string;
}

export function AvatarPicker({ selected, onChange, name = "Użytkownik" }: AvatarPickerProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        {/* Preview */}
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-sm flex-shrink-0 transition-colors duration-200"
          style={{ backgroundColor: selected }}
        >
          {name.charAt(0).toUpperCase() || "?"}
        </div>
        <span className="text-sm text-muted-foreground">Wybierz kolor awatara</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {AVATAR_OPTIONS.map((option) => (
          <button
            key={option.color}
            type="button"
            onClick={() => onChange(option.color)}
            title={option.label}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            style={{ backgroundColor: option.color }}
          >
            {selected === option.color && (
              <Check className="w-4 h-4 text-white drop-shadow" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
