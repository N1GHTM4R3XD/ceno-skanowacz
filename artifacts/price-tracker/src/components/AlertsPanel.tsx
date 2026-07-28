import React from "react";
import { useAppContext } from "../context/AppContext";
import { Produkt } from "../types";
import { Bell, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AlertsPanelProps {
  mobileMode?: boolean;
}

export function AlertsPanel({ mobileMode = false }: AlertsPanelProps) {
  const { userProfile } = useAppContext();

  if (!userProfile) return null;

  // Show all products with price drop regardless of per-product email toggle
  const activeAlerts = userProfile.produkty.filter(
    (p) => p.trend === "spadek" && userProfile.globalneAlerty
  );

  const hasAlerts = activeAlerts.length > 0;

  const content = (
    <AlertsContent
      activeAlerts={activeAlerts}
      hasAlerts={hasAlerts}
      globalneAlerty={userProfile.globalneAlerty}
    />
  );

  if (mobileMode) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="relative flex flex-col items-center justify-center gap-1 min-h-[44px] w-full text-muted-foreground hover:text-foreground transition-colors">
            <span className="relative">
              <Bell className="h-5 w-5" />
              {hasAlerts && (
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />
              )}
            </span>
            <span className="text-[10px] font-medium leading-none">Alerty</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top" className="w-80 mb-2">
          {content}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full w-10 h-10">
          <Bell className="h-5 w-5 text-muted-foreground" />
          {hasAlerts && (
            <span className="absolute top-2 right-2.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        {content}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AlertsContent({
  activeAlerts,
  hasAlerts,
  globalneAlerty,
}: {
  activeAlerts: Produkt[];
  hasAlerts: boolean;
  globalneAlerty: boolean;
}) {
  return (
    <>
      <DropdownMenuLabel>Powiadomienia o spadkach cen</DropdownMenuLabel>
      <DropdownMenuSeparator />
      {!globalneAlerty ? (
        <div className="p-4 text-center text-sm text-muted-foreground">
          Alerty globalne są wyłączone w profilu.
        </div>
      ) : !hasAlerts ? (
        <div className="p-4 text-center text-sm text-muted-foreground">
          Brak nowych alertów.
        </div>
      ) : (
        <div className="max-h-[300px] overflow-y-auto">
          {activeAlerts.map((produkt) => {
            const histLen = produkt.historia?.length || 0;
            const cena_obecna = histLen > 0 ? produkt.historia![histLen - 1].cena : 0;
            // Jeśli historia ma tylko 1 wpis, oznacza to, że nie mamy wprost zapisanej poprzedniej ceny, 
            // ale jeśli trend to "spadek", musiała spaść. W ramach fallbacku można użyć ceny z najlepszej oferty,
            // ale bezpieczniej po prostu wyświetlić obecną. Idealnie by było mieć minimum 2 wpisy dla "spadku".
            const cena_poprzednia = histLen > 1 ? produkt.historia![histLen - 2].cena : cena_obecna;
            const savings = Math.max(0, cena_poprzednia - cena_obecna);
            
            return (
              <DropdownMenuItem
                key={produkt.id}
                className="flex flex-col items-start gap-1 p-3 cursor-default focus:bg-accent/50"
              >
                <span className="font-medium text-sm line-clamp-1">{produkt.nazwa}</span>
                <div className="flex items-center gap-2 text-xs text-muted-foreground w-full">
                  {histLen > 1 && (
                    <span className="line-through">
                      {cena_poprzednia} {produkt.waluta}
                    </span>
                  )}
                  <ArrowDown className="h-3 w-3 text-emerald-500" />
                  <span className="text-emerald-500 font-semibold">
                    {cena_obecna} {produkt.waluta}
                  </span>
                  {savings > 0 && (
                    <span className="ml-auto text-emerald-600 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-400 px-1.5 py-0.5 rounded font-medium">
                      -{savings.toFixed(2)} {produkt.waluta}
                    </span>
                  )}
                </div>
              </DropdownMenuItem>
            );
          })}
        </div>
      )}
    </>
  );
}
