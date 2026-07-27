export type Trend = "spadek" | "wzrost" | "brak_zmian";

export interface HistoriaZnak {
  data: string;
  cena: number;
}

export interface Oferta {
  id: string; // Wygenerowane lub nazwa sklepu
  sklep: string;
  url: string;
  cena: number;
  koszt_dostawy: number | null;
  darmowa_dostawa_z: string | null;
  wymaga_recznego_sprawdzenia?: boolean;
  nazwa_ze_sklepu?: string;
  historia?: HistoriaZnak[];
}

export type Kategoria = "Elektronika" | "Dom i AGD" | "Odzież" | "Sport" | "Zabawki/Dzieci" | "Inne";

export interface Produkt {
  id: string;
  nazwa: string;
  zdjecie_url: string;
  kategoria?: Kategoria;
  waluta: string;
  trend: Trend;
  alert_wlaczony: boolean;
  oferty: Oferta[];
  historia?: HistoriaZnak[]; // opcjonalna ogólna historia najniższej ceny
}

export interface UserProfile {
  imie: string;
  email: string;
  powiadomieniaEmail: boolean;
  globalneAlerty: boolean;
  avatarColor?: string;
  produkty: Produkt[];
}

export interface MockData {
  [key: string]: UserProfile;
}

export type Theme = "jasny" | "ciemny" | "kolorowy";
