import React, { createContext, useContext, useState, useEffect } from "react";
import { UserProfile, Theme, Produkt } from "../types";
import { useToast } from "@/hooks/use-toast";

interface AppContextType {
  profiles: Record<string, UserProfile>;
  selectedToken: string | null;
  userProfile: UserProfile | null;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  selectUser: (token: string) => void;
  clearUser: () => void;
  addProfile: (imie: string, avatarColor: string) => void;
  addProduct: (product: Omit<Produkt, "id">) => void;
  removeProduct: (productId: string) => void;
  updateProductAlert: (productId: string, alert_wlaczony: boolean) => void;
  updateProfileSettings: (email: string, powiadomieniaEmail: boolean, globalneAlerty: boolean) => void;
  updateAvatarColor: (color: string) => void;
  allTokens: string[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({});
  const [isLoaded, setIsLoaded] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetch("/data/tracker-data.json")
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

  const warnUnsavedChanges = () => {
    toast({
      title: "Tymczasowy zapis",
      description: "Zmiany widoczne są tylko w przeglądarce i nie zostaną trwale zapisane na serwerze (wymaga GitHub Actions).",
      variant: "destructive",
    });
  };

  const addProfile = (imie: string, avatarColor: string) => {
    const token = `${imie.toLowerCase().replace(/\s+/g, "")}${Date.now().toString(36)}`;
    const newProfile: UserProfile = {
      imie,
      email: "",
      powiadomieniaEmail: false,
      globalneAlerty: true,
      avatarColor,
      produkty: [],
    };
    setProfiles((prev) => ({ ...prev, [token]: newProfile }));
    warnUnsavedChanges();
  };

  const addProduct = (product: Omit<Produkt, "id">) => {
    if (!selectedToken) return;
    const newProduct: Produkt = {
      ...product,
      id: `p${Date.now().toString(36)}`,
    };
    setUserProfile((prev) => {
      if (!prev) return prev;
      return { ...prev, produkty: [...prev.produkty, newProduct] };
    });
    setProfiles((prev) => {
      if (!prev[selectedToken]) return prev;
      return {
        ...prev,
        [selectedToken]: {
          ...prev[selectedToken],
          produkty: [...prev[selectedToken].produkty, newProduct],
        },
      };
    });
    warnUnsavedChanges();
  };

  const removeProduct = (productId: string) => {
    if (!selectedToken) return;
    setUserProfile((prev) => {
      if (!prev) return prev;
      return { ...prev, produkty: prev.produkty.filter((p) => p.id !== productId) };
    });
    setProfiles((prev) => {
      if (!prev[selectedToken]) return prev;
      return {
        ...prev,
        [selectedToken]: {
          ...prev[selectedToken],
          produkty: prev[selectedToken].produkty.filter((p) => p.id !== productId),
        },
      };
    });
    warnUnsavedChanges();
  };

  // Apply theme class to document
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("dark", "colorful");
    if (theme === "ciemny") root.classList.add("dark");
    else if (theme === "kolorowy") root.classList.add("colorful");
  }, [theme]);

  const updateProductAlert = (productId: string, alert_wlaczony: boolean) => {
    setUserProfile((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        produkty: prev.produkty.map((p) =>
          p.id === productId ? { ...p, alert_wlaczony } : p
        ),
      };
    });
    warnUnsavedChanges();
  };

  const updateProfileSettings = (
    email: string,
    powiadomieniaEmail: boolean,
    globalneAlerty: boolean
  ) => {
    setUserProfile((prev) => {
      if (!prev) return prev;
      return { ...prev, email, powiadomieniaEmail, globalneAlerty };
    });
    if (selectedToken) {
      setProfiles((prev) => ({
        ...prev,
        [selectedToken]: {
          ...prev[selectedToken],
          email,
          powiadomieniaEmail,
          globalneAlerty,
        },
      }));
    }
    warnUnsavedChanges();
  };

  const updateAvatarColor = (color: string) => {
    setUserProfile((prev) => {
      if (!prev) return prev;
      return { ...prev, avatarColor: color };
    });
    if (selectedToken) {
      setProfiles((prev) => ({
        ...prev,
        [selectedToken]: { ...prev[selectedToken], avatarColor: color },
      }));
    }
    warnUnsavedChanges();
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
