import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppContext } from "../context/AppContext";
import { ThemeSwitcher } from "../components/ThemeSwitcher";
import { AvatarPicker } from "../components/AvatarPicker";
import { Wallet, TrendingDown, Plus, X, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_AVATAR_COLOR } from "../data/avatarOptions";

function getInitial(name: string) {
  return name.charAt(0).toUpperCase();
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const cardVariant = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 280, damping: 26 } },
};

export function ProfilePicker() {
  const { profiles, allTokens, selectUser, addProfile } = useAppContext();
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(DEFAULT_AVATAR_COLOR);
  const [error, setError] = useState("");

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      setError("Podaj imię.");
      return;
    }
    if (trimmed.length > 30) {
      setError("Imię może mieć max. 30 znaków.");
      return;
    }
    addProfile(trimmed, newColor);
    setNewName("");
    setNewColor(DEFAULT_AVATAR_COLOR);
    setError("");
    setShowForm(false);
  };

  const handleCancel = () => {
    setShowForm(false);
    setNewName("");
    setNewColor(DEFAULT_AVATAR_COLOR);
    setError("");
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-4 sm:px-8">
        <div className="flex items-center gap-2 text-primary font-bold text-xl tracking-tight">
          <div className="bg-primary text-primary-foreground p-1.5 rounded-lg">
            <Wallet className="h-5 w-5" />
          </div>
          Price Tracker
        </div>
        <ThemeSwitcher />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-16">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
            Kto obserwuje ceny?
          </h1>
          <p className="text-muted-foreground text-base">
            {allTokens.length === 0
              ? "Nie ma jeszcze żadnych profili. Dodaj pierwszy!"
              : "Wybierz swój profil, aby zobaczyć listę produktów."}
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-5 w-full max-w-lg"
        >
          {allTokens.map((token) => {
            const profile = profiles[token];
            const dropCount = profile.produkty.filter((p) => p.trend === "spadek").length;
            const avatarColor = profile.avatarColor ?? DEFAULT_AVATAR_COLOR;

            return (
              <motion.button
                key={token}
                variants={cardVariant}
                onClick={() => selectUser(token)}
                className="group flex flex-col items-center gap-3 p-5 sm:p-6 rounded-2xl border bg-card shadow-sm hover:shadow-lg hover:border-primary/40 transition-all duration-200 cursor-pointer min-h-[140px] sm:min-h-[158px]"
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.96 }}
              >
                <div
                  className="w-16 h-16 sm:w-18 sm:h-18 rounded-full flex items-center justify-center text-white text-2xl sm:text-3xl font-bold shadow-md transition-transform duration-200 group-hover:scale-105 flex-shrink-0"
                  style={{ backgroundColor: avatarColor, width: "4rem", height: "4rem" }}
                >
                  {getInitial(profile.imie)}
                </div>
                <span className="text-base sm:text-lg font-semibold text-center leading-tight">
                  {profile.imie}
                </span>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>{profile.produkty.length} prod.</span>
                  {dropCount > 0 && (
                    <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-medium">
                      <TrendingDown className="w-3 h-3" />
                      {dropCount}
                    </span>
                  )}
                </div>
              </motion.button>
            );
          })}

          {/* Add profile tile */}
          <motion.button
            variants={cardVariant}
            onClick={() => setShowForm(true)}
            className="flex flex-col items-center justify-center gap-2 p-5 rounded-2xl border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/40 transition-all duration-200 cursor-pointer min-h-[140px] sm:min-h-[158px] text-muted-foreground hover:text-primary"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
          >
            <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center">
              <Plus className="w-6 h-6" />
            </div>
            <span className="text-sm font-medium text-center">Dodaj profil</span>
          </motion.button>
        </motion.div>
      </div>

      {/* Add profile modal */}
      <AnimatePresence>
        {showForm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
              onClick={handleCancel}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 24 }}
              transition={{ type: "spring" as const, stiffness: 300, damping: 28 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 bg-card border rounded-2xl shadow-2xl p-6 max-w-sm mx-auto"
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2 font-semibold text-lg">
                  <UserPlus className="w-5 h-5 text-primary" />
                  Nowy profil
                </div>
                <button
                  onClick={handleCancel}
                  className="rounded-full p-1.5 hover:bg-muted transition-colors text-muted-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="new-name">Imię</Label>
                  <Input
                    id="new-name"
                    placeholder="np. Mama, Tata, Ja…"
                    value={newName}
                    onChange={(e) => { setNewName(e.target.value); setError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                    autoFocus
                    className={error ? "border-destructive" : ""}
                  />
                  {error && <p className="text-xs text-destructive">{error}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label>Awatar</Label>
                  <AvatarPicker
                    selected={newColor}
                    onChange={setNewColor}
                    name={newName || "?"}
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <Button variant="outline" className="flex-1" onClick={handleCancel}>
                  Anuluj
                </Button>
                <Button className="flex-1" onClick={handleAdd}>
                  Dodaj profil
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
