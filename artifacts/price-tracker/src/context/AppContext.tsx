import React, { createContext, useContext, useState, useEffect } from "react";
import { UserProfile, Theme, Produkt } from "../types";
import { saveDataToGitHub } from "../lib/github";
import { useToast } from "@/hooks/use-toast";

interface AppContextType {
  profiles: Record<string, UserProfile>;
  selectedToken: string | null;
  userProfile: UserProfile | null;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  selectUser: (token: string) => void;
  clearUser: () => void;
  addProfile: (imie: string, avatarColor: string) => Promise<void>;
  addProduct: (product: Omit<Produkt, "id">) => Promise<void>;
  removeProduct: (productId: string) => Promise<void>;
  updateProductAlert: (productId: string, alert_wlaczony: boolean) => Promise<void>;
  updateProfileSettings: (email: string, powiadomieniaEmail: boolean, globalneAlerty: boolean) => Promise<void>;
  updateAvatarColor: (color: string) => Promise<void>;
  allTokens: string[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({});
  const [isLoaded, setIsLoaded] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/tracker-data.json`)
      .then((res) => res.json())
      .then((data) => {
        setProfiles(data || {});
        setIsLoaded(true);
      })
      .catch((err) => {
        console.error("Failed to fetch tracker-data.json", err);
        setIsLoaded(true);
      });
  }, []);
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [theme, setTheme] = useState<Theme>("jasny");

  const allTokens = Object.keys(profiles);

  const selectUser = (token: string) => {
    if (profiles[token]) {
      setSelectedToken(token);
      setUserProfile(JSON.parse(JSON.stringify(profiles[token])));
    }
  };

  const clearUser = () => {
    setSelectedToken(null);
    setUserProfile(null);
  };

  const addProfile = async (imie: string, avatarColor: string) => {
    try {
      const token = `${imie.toLowerCase().replace(/\s+/g, "")}${Date.now().toString(36)}`;
      const newProfile: UserProfile = {
        imie,
        email: "",
        powiadomieniaEmail: false,
        globalneAlerty: true,
        avatarColor,
        produkty: [],
      };
      const newProfiles = { ...profiles, [token]: newProfile };
      await saveDataToGitHub(newProfiles, `Dodano profil: ${imie}`);
      setProfiles(newProfiles);
      toast({ title: "Zapisano", description: "Profil został dodany." });
    } catch (err: any) {
      toast({ title: "Błąd zapisu", description: err.message, variant: "destructive" });
      throw err;
    }
  };

  const addProduct = async (product: Omit<Produkt, "id">) => {
    if (!selectedToken) return;
    try {
      const newProduct: Produkt = {
        ...product,
        id: `p${Date.now().toString(36)}`,
      };
      const updatedProfile = {
        ...profiles[selectedToken],
        produkty: [...profiles[selectedToken].produkty, newProduct],
      };
      const newProfiles = { ...profiles, [selectedToken]: updatedProfile };
      await saveDataToGitHub(newProfiles, `Dodano produkt: ${product.nazwa}`);
      setProfiles(newProfiles);
      setUserProfile(updatedProfile);
      toast({ title: "Zapisano", description: "Produkt został dodany." });
    } catch (err: any) {
      toast({ title: "Błąd zapisu", description: err.message, variant: "destructive" });
      throw err;
    }
  };

  const removeProduct = async (productId: string) => {
    if (!selectedToken) return;
    try {
      const updatedProfile = {
        ...profiles[selectedToken],
        produkty: profiles[selectedToken].produkty.filter((p) => p.id !== productId),
      };
      const newProfiles = { ...profiles, [selectedToken]: updatedProfile };
      await saveDataToGitHub(newProfiles, `Usunięto produkt`);
      setProfiles(newProfiles);
      setUserProfile(updatedProfile);
      toast({ title: "Zapisano", description: "Produkt został usunięty." });
    } catch (err: any) {
      toast({ title: "Błąd zapisu", description: err.message, variant: "destructive" });
      throw err;
    }
  };

  // Apply theme class to document
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("dark", "colorful");
    if (theme === "ciemny") root.classList.add("dark");
    else if (theme === "kolorowy") root.classList.add("colorful");
  }, [theme]);

  const updateProductAlert = async (productId: string, alert_wlaczony: boolean) => {
    if (!selectedToken) return;
    try {
      const updatedProfile = {
        ...profiles[selectedToken],
        produkty: profiles[selectedToken].produkty.map((p) =>
          p.id === productId ? { ...p, alert_wlaczony } : p
        ),
      };
      const newProfiles = { ...profiles, [selectedToken]: updatedProfile };
      await saveDataToGitHub(newProfiles, `Zmieniono alert dla produktu`);
      setProfiles(newProfiles);
      setUserProfile(updatedProfile);
      toast({ title: "Zapisano", description: "Zmieniono ustawienia alertu." });
    } catch (err: any) {
      toast({ title: "Błąd zapisu", description: err.message, variant: "destructive" });
      throw err;
    }
  };

  const updateProfileSettings = async (
    email: string,
    powiadomieniaEmail: boolean,
    globalneAlerty: boolean
  ) => {
    if (!selectedToken) return;
    try {
      const updatedProfile = {
        ...profiles[selectedToken],
        email,
        powiadomieniaEmail,
        globalneAlerty,
      };
      const newProfiles = { ...profiles, [selectedToken]: updatedProfile };
      await saveDataToGitHub(newProfiles, `Zaktualizowano ustawienia profilu`);
      setProfiles(newProfiles);
      setUserProfile(updatedProfile);
      toast({ title: "Zapisano", description: "Ustawienia zostały zaktualizowane." });
    } catch (err: any) {
      toast({ title: "Błąd zapisu", description: err.message, variant: "destructive" });
      throw err;
    }
  };

  const updateAvatarColor = async (color: string) => {
    if (!selectedToken) return;
    try {
      const updatedProfile = {
        ...profiles[selectedToken],
        avatarColor: color,
      };
      const newProfiles = { ...profiles, [selectedToken]: updatedProfile };
      await saveDataToGitHub(newProfiles, `Zmieniono kolor awatara`);
      setProfiles(newProfiles);
      setUserProfile(updatedProfile);
      toast({ title: "Zapisano", description: "Kolor awatara został zaktualizowany." });
    } catch (err: any) {
      toast({ title: "Błąd zapisu", description: err.message, variant: "destructive" });
      throw err;
    }
  };

  if (!isLoaded) {
    return <div className="flex h-screen items-center justify-center">Ładowanie...</div>;
  }

  return (
    <AppContext.Provider
      value={{
        profiles,
        selectedToken,
        userProfile,
        theme,
        setTheme,
        selectUser,
        clearUser,
        addProfile,
        addProduct,
        removeProduct,
        updateProductAlert,
        updateProfileSettings,
        updateAvatarColor,
        allTokens,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
}
