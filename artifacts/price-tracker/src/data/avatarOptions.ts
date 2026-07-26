export interface AvatarOption {
  color: string;
  label: string;
}

export const AVATAR_OPTIONS: AvatarOption[] = [
  { color: "#7C3AED", label: "Fioletowy" },
  { color: "#2563EB", label: "Niebieski" },
  { color: "#0891B2", label: "Cyjan" },
  { color: "#059669", label: "Zielony" },
  { color: "#D97706", label: "Pomarańczowy" },
  { color: "#DC2626", label: "Czerwony" },
  { color: "#DB2777", label: "Różowy" },
  { color: "#374151", label: "Szary" },
];

export const DEFAULT_AVATAR_COLOR = AVATAR_OPTIONS[0].color;
