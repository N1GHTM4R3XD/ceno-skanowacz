import React from "react";
import { Link, useLocation } from "wouter";
import { Activity, History, User } from "lucide-react";
import { AlertsPanel } from "./AlertsPanel";

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { path: "/", label: "Dashboard", icon: <Activity className="h-5 w-5" /> },
  { path: "/historia", label: "Historia", icon: <History className="h-5 w-5" /> },
  { path: "/profil", label: "Profil", icon: <User className="h-5 w-5" /> },
];

export function BottomNav() {
  const [location] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden safe-area-pb">
      <div className="flex items-stretch h-16">
        {navItems.map(({ path, label, icon }) => {
          const isActive = location === path;
          return (
            <Link
              key={path}
              href={path}
              className={`flex-1 flex flex-col items-center justify-center gap-1 min-h-[44px] transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className={`transition-transform ${isActive ? "scale-110" : ""}`}>
                {icon}
              </span>
              <span className="text-[10px] font-medium leading-none">{label}</span>
            </Link>
          );
        })}

        {/* Alerts slot */}
        <div className="flex-1 flex flex-col items-center justify-center gap-1 min-h-[44px]">
          <AlertsPanel mobileMode />
        </div>
      </div>
    </nav>
  );
}
