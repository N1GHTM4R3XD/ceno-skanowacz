import React from "react";
import { useAppContext } from "../context/AppContext";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { AlertsPanel } from "./AlertsPanel";
import { Link, useLocation } from "wouter";
import { Activity, History, User, Wallet, ChevronDown } from "lucide-react";
import { mockData } from "../data/mockData";

export function Header() {
  const { userProfile, clearUser, selectedToken } = useAppContext();
  const [location] = useLocation();

  if (!userProfile) return null;

  const getLinkClass = (path: string) => {
    const isActive = location === path;
    return `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors min-h-[44px] ${
      isActive
        ? "bg-primary/10 text-primary"
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
    }`;
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container mx-auto max-w-5xl px-4 h-14 sm:h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 text-primary font-bold text-base sm:text-lg tracking-tight flex-shrink-0"
        >
          <div className="bg-primary text-primary-foreground p-1.5 rounded-lg">
            <Wallet className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <span className="hidden xs:inline">Price Tracker</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
          <Link href="/" className={getLinkClass("/")}>
            <Activity className="h-4 w-4" />
            <span>Dashboard</span>
          </Link>
          <Link href="/historia" className={getLinkClass("/historia")}>
            <History className="h-4 w-4" />
            <span>Historia</span>
          </Link>
          <Link href="/profil" className={getLinkClass("/profil")}>
            <User className="h-4 w-4" />
            <span>Profil</span>
          </Link>
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {/* Alerts bell — desktop only (mobile uses BottomNav) */}
          <span className="hidden md:flex">
            <AlertsPanel />
          </span>

          <ThemeSwitcher />

          {/* Change profile button */}
          <button
            onClick={clearUser}
            className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg border text-xs sm:text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors min-h-[36px] sm:min-h-[40px]"
            title="Zmień profil"
          >
            {userProfile.avatarUrl ? (
              <img 
                src={userProfile.avatarUrl} 
                alt="Avatar" 
                className="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-cover flex-shrink-0 border border-border" 
              />
            ) : (
              <span
                className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-white text-[10px] sm:text-xs font-bold flex-shrink-0"
                style={{ backgroundColor: userProfile.avatarColor ?? "#7C3AED" }}
              >
                {userProfile.imie.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="hidden sm:inline">{userProfile.imie}</span>
            <ChevronDown className="h-3 w-3 opacity-60" />
          </button>
        </div>
      </div>
    </header>
  );
}
