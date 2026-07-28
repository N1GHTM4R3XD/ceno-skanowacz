import React, { createContext, useContext, useState, useEffect } from "react";
import { UserProfile, Theme, Produkt, SyncMeta } from "../types";
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
  updateProductInfo: (productId: string, newName: string, newImageUrl: string) => Promise<void>;
  updateManualPrice: (productId: string, offerId: string, newPrice: number) => Promise<void>;
  addOfferToProduct: (productId: string, offer: import("../types").Oferta) => Promise<void>;
  removeOfferFromProduct: (productId: string, offerId: string) => Promise<void>;
  updateProfileSettings: (imie: string, email: string, powiadomieniaEmail: boolean, globalneAlerty: boolean, avatarUrl: string | undefined, avatarColor: string) => Promise<void>;
  removeProfile: (token: string) => Promise<void>;
  allTokens: string[];
  syncMeta: SyncMeta | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({});
  const [syncMeta, setSyncMeta] = useState<SyncMeta | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    
    const loadData = () => {
      fetch(`${import.meta.env.BASE_URL}data/tracker-data.json?t=${Date.now()}`, { cache: "no-store" })
        .then((res) => res.json())
        .then((data) => {
          let finalData = data || {};
          try {
            const cacheTsStr = localStorage.getItem("tracker-profiles-cache-ts");
            const cacheDataStr = localStorage.getItem("tracker-profiles-cache");
            if (cacheTsStr && cacheDataStr) {
              const cacheTs = parseInt(cacheTsStr, 10);
              const scraperSyncTs = data?._meta?.ostatnia_synchronizacja
                ? new Date(data._meta.ostatnia_synchronizacja).getTime()
                : 0;
              const cacheIsRecent = !isNaN(cacheTs) && Date.now() - cacheTs < 5 * 60 * 1000;
              const cacheIsNewerThanScraper = cacheTs > scraperSyncTs;
              
              if (cacheIsRecent && cacheIsNewerThanScraper) {
                finalData = JSON.parse(cacheDataStr);
                console.log("Użyto lokalnego cache (nowszy niż dane ze scrapera).");
              } else if (scraperSyncTs > cacheTs) {
                localStorage.removeItem("tracker-profiles-cache");
                localStorage.removeItem("tracker-profiles-cache-ts");
                console.log("Użyto danych ze scrapera (nowsze niż cache).");
              }
            }
          } catch (e) {}

          if (finalData._meta) {
            setSyncMeta(finalData._meta);
          }
          setProfiles(finalData);
          
          // Update selected user profile if token is set
          setProfiles((prevProfiles) => {
            if (selectedToken && prevProfiles[selectedToken]) {
              setUserProfile(prevProfiles[selectedToken]);
            }
            return prevProfiles;
          });
          
          setIsLoaded(true);
        })
        .catch((err) => {
          console.error("Failed to fetch tracker-data.json", err);
          try {
            const cacheDataStr = localStorage.getItem("tracker-profiles-cache");
            if (cacheDataStr) {
              const parsed = JSON.parse(cacheDataStr);
              setProfiles(parsed);
              if (selectedToken && parsed[selectedToken]) {
                setUserProfile(parsed[selectedToken]);
              }
            }
          } catch (e) {}
          setIsLoaded(true);
        });
    };

    // Initial load
    loadData();

    // Poll every 5 minutes
    const intervalId = setInterval(loadData, 5 * 60 * 1000);

    // Refresh on window focus
    const handleFocus = () => {
      // Small delay to prevent spamming
      clearTimeout(timeoutId);
      timeoutId = setTimeout(loadData, 500);
    };
    
    window.addEventListener("focus", handleFocus);
    window.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") handleFocus();
    });

    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("visibilitychange", handleFocus);
    };
  }, [selectedToken]);

  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem("price-tracker-theme");
      if (saved === "jasny" || saved === "ciemny" || saved === "kolorowy") {
        return saved as Theme;
      }
      if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
        return "ciemny";
      }
    } catch (e) {}
    return "jasny";
  });

  const allTokens = Object.keys(profiles).filter((key) => key !== "_meta");

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
    
    try {
      localStorage.setItem("price-tracker-theme", theme);
    } catch (e) {}
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

  const updateProductInfo = async (productId: string, newName: string, newImageUrl: string) => {
    if (!selectedToken) return;
    try {
      const profile = profiles[selectedToken];
      const product = profile.produkty.find(p => p.id === productId);
      if (!product) return;

      const isNameChanged = product.nazwa !== newName;
      const updatedProfile = {
        ...profile,
        produkty: profile.produkty.map(p =>
          p.id === productId ? { 
            ...p, 
            nazwa: newName, 
            zdjecie_url: newImageUrl,
            nazwa_edytowana_recznie: isNameChanged ? true : p.nazwa_edytowana_recznie 
          } : p
        ),
      };

      const newProfiles = { ...profiles, [selectedToken]: updatedProfile };
      await saveDataToGitHub(newProfiles, `Edycja produktu: ${newName}`);
      setProfiles(newProfiles);
      setUserProfile(updatedProfile);
      toast({ title: "Zapisano", description: "Dane produktu zostały zaktualizowane." });
    } catch (err: any) {
      toast({ title: "Błąd zapisu", description: err.message, variant: "destructive" });
      throw err;
    }
  };

  const updateManualPrice = async (productId: string, offerId: string, newPrice: number) => {
    if (!selectedToken) return;
    try {
      const profile = profiles[selectedToken];
      const product = profile.produkty.find(p => p.id === productId);
      if (!product) return;
      
      const oldOffer = product.oferty.find(o => o.id === offerId);
      const oldPrice = oldOffer ? oldOffer.cena : 0;
      
      const updatedOferty = product.oferty.map(o => 
        o.id === offerId ? { ...o, cena: newPrice } : o
      );
      
      const validOffers = updatedOferty.filter(o => o.cena > 0);
      const bestOffer = validOffers.length > 0 
        ? validOffers.reduce((min, o) => (o.cena + (o.koszt_dostawy || 0) < min.cena + (min.koszt_dostawy || 0)) ? o : min, validOffers[0])
        : (updatedOferty.length > 0 ? updatedOferty[0] : null);
        
      const currentTotal = bestOffer ? bestOffer.cena + (bestOffer.koszt_dostawy || 0) : 0;
      
      let updatedHistoria = [...(product.historia || [])];
      const today = new Date().toISOString().split("T")[0];
      const lastHistory = updatedHistoria.length > 0 ? updatedHistoria[updatedHistoria.length - 1] : null;
      
      let trend = product.trend;
      if (!lastHistory || lastHistory.data !== today) {
         updatedHistoria.push({ data: today, cena: currentTotal, zrodlo: "reczne" });
         if (lastHistory) {
           if (currentTotal < lastHistory.cena) trend = "spadek";
           else if (currentTotal > lastHistory.cena) trend = "wzrost";
           else trend = "brak_zmian";
         }
      } else {
         if (lastHistory.cena !== currentTotal) {
            updatedHistoria[updatedHistoria.length - 1] = { ...lastHistory, cena: currentTotal, zrodlo: "reczne" };
            const prevHistory = updatedHistoria.length > 1 ? updatedHistoria[updatedHistoria.length - 2] : null;
            if (prevHistory) {
              if (currentTotal < prevHistory.cena) trend = "spadek";
              else if (currentTotal > prevHistory.cena) trend = "wzrost";
              else trend = "brak_zmian";
            }
         }
      }
      
      const updatedProfile = {
        ...profile,
        produkty: profile.produkty.map(p => 
          p.id === productId ? { ...p, oferty: updatedOferty, historia: updatedHistoria, trend } : p
        )
      };
      
      const newProfiles = { ...profiles, [selectedToken]: updatedProfile };
      await saveDataToGitHub(newProfiles, `Ręczna aktualizacja ceny: ${product.nazwa}`);
      setProfiles(newProfiles);
      setUserProfile(updatedProfile);
      
      if (newPrice < oldPrice && oldPrice !== 0 && product.alert_wlaczony && profile.globalneAlerty) {
        toast({ title: "Spadek ceny!", description: `Ręcznie wprowadzona cena jest niższa od poprzedniej.`, variant: "default" });
      } else {
        toast({ title: "Zapisano", description: "Cena została zaktualizowana ręcznie." });
      }
    } catch (err: any) {
      toast({ title: "Błąd zapisu", description: err.message, variant: "destructive" });
    }
  };

  const addOfferToProduct = async (productId: string, offer: import("../types").Oferta) => {
    if (!selectedToken) return;
    try {
      const profile = profiles[selectedToken];
      const product = profile.produkty.find(p => p.id === productId);
      if (!product) return;
      
      const newOffer = { ...offer, id: "off" + Date.now() + Math.floor(Math.random() * 1000) };
      const updatedProfile = {
        ...profile,
        produkty: profile.produkty.map(p => 
          p.id === productId ? { ...p, oferty: [...p.oferty, newOffer] } : p
        )
      };
      
      const newProfiles = { ...profiles, [selectedToken]: updatedProfile };
      await saveDataToGitHub(newProfiles, `Dodano ofertę do produktu`);
      setProfiles(newProfiles);
      setUserProfile(updatedProfile);
      toast({ title: "Zapisano", description: "Oferta została dodana." });
    } catch (err: any) {
      toast({ title: "Błąd zapisu", description: err.message, variant: "destructive" });
      throw err;
    }
  };

  const removeOfferFromProduct = async (productId: string, offerId: string) => {
    if (!selectedToken) return;
    try {
      const profile = profiles[selectedToken];
      const product = profile.produkty.find(p => p.id === productId);
      if (!product) return;
      
      const updatedProfile = {
        ...profile,
        produkty: profile.produkty.map(p => 
          p.id === productId ? { ...p, oferty: p.oferty.filter(o => o.id !== offerId) } : p
        )
      };
      
      const newProfiles = { ...profiles, [selectedToken]: updatedProfile };
      await saveDataToGitHub(newProfiles, `Usunięto ofertę z produktu`);
      setProfiles(newProfiles);
      setUserProfile(updatedProfile);
      toast({ title: "Zapisano", description: "Oferta została usunięta." });
    } catch (err: any) {
      toast({ title: "Błąd zapisu", description: err.message, variant: "destructive" });
      throw err;
    }
  };

  const updateProfileSettings = async (
    imie: string,
    email: string,
    powiadomieniaEmail: boolean,
    globalneAlerty: boolean,
    avatarUrl: string | undefined,
    avatarColor: string
  ) => {
    if (!selectedToken) return;
    try {
      const updatedProfile = {
        ...profiles[selectedToken],
        imie,
        email,
        powiadomieniaEmail,
        globalneAlerty,
        avatarUrl,
        avatarColor,
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

  const removeProfile = async (token: string) => {
    try {
      const newProfiles = { ...profiles };
      delete newProfiles[token];
      await saveDataToGitHub(newProfiles, `Usunięto profil`);
      setProfiles(newProfiles);
      if (selectedToken === token) {
        setSelectedToken(null);
        setUserProfile(null);
      }
      toast({ title: "Usunięto", description: "Profil został trwale usunięty." });
    } catch (err: any) {
      toast({ title: "Błąd", description: err.message, variant: "destructive" });
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
        updateProductInfo,
        updateProductAlert,
        updateManualPrice,
        addOfferToProduct,
        removeOfferFromProduct,
        updateProfileSettings,
        allTokens,
        syncMeta,
        removeProfile,
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
