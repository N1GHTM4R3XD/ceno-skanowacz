import React, { useState, useCallback } from "react";
import { useAppContext } from "../context/AppContext";
import { Produkt } from "../types";
import { Bell, ArrowDown, CheckCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AlertsPanelProps {
  mobileMode?: boolean;
}

/** Unique key for an alert — includes the last history date so a new price change
 *  resets the "seen" status automatically. */
function getAlertKey(p: Produkt): string {
  const lastEntry = p.historia?.[p.historia.length - 1];
  return `${p.id}_${lastEntry?.data ?? ""}`;
}

function loadSeenKeys(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem("alerts-seen");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveSeenKeys(keys: Record<string, boolean>) {
  try {
    localStorage.setItem("alerts-seen", JSON.stringify(keys));
  } catch {}
}

export function AlertsPanel({ mobileMode = false }: AlertsPanelProps) {
  const { userProfile } = useAppContext();
  const [seenKeys, setSeenKeys] = useState<Record<string, boolean>>(loadSeenKeys);

  if (!userProfile) return null;

  // Show all products with price drop (regardless of per-product email toggle)
  const activeAlerts = userProfile.produkty.filter(
    (p) => p.trend === "spadek" && userProfile.globalneAlerty
  );

  const unseenAlerts = activeAlerts.filter((p) => !seenKeys[getAlertKey(p)]);
  const unseenCount = unseenAlerts.length;
  const hasUnseen = unseenCount > 0;

  const markAsSeen = useCallback((p: Produkt, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    const updated = { ...seenKeys, [getAlertKey(p)]: true };
    setSeenKeys(updated);
    saveSeenKeys(updated);
  }, [seenKeys]);

  const markAllAsSeen = useCallback((e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    const updated = { ...seenKeys };
    activeAlerts.forEach((p) => { updated[getAlertKey(p)] = true; });
    setSeenKeys(updated);
    saveSeenKeys(updated);
  }, [seenKeys, activeAlerts]);

  const content = (
    <AlertsContent
      activeAlerts={activeAlerts}
      unseenAlerts={unseenAlerts}
      hasUnseen={hasUnseen}
      globalneAlerty={userProfile.globalneAlerty}
      seenKeys={seenKeys}
      waluta={userProfile.produkty[0]?.waluta ?? "PLN"}
      onMarkSeen={markAsSeen}
      onMarkAllSeen={markAllAsSeen}
    />
  );

  if (mobileMode) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="relative flex flex-col items-center justify-center gap-1 min-h-[44px] w-full text-muted-foreground hover:text-foreground transition-colors">
            <span className="relative">
              <Bell className="h-5 w-5" />
              {hasUnseen && (
                <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] rounded-full bg-destructive ring-2 ring-background flex items-center justify-center text-[9px] font-bold text-white px-0.5">
                  {unseenCount > 9 ? "9+" : unseenCount}
                </span>
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
          {hasUnseen && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] rounded-full bg-destructive ring-2 ring-background flex items-center justify-center text-[9px] font-bold text-white px-0.5">
              {unseenCount > 9 ? "9+" : unseenCount}
            </span>
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
  unseenAlerts,
  hasUnseen,
  globalneAlerty,
  seenKeys,
  waluta,
  onMarkSeen,
  onMarkAllSeen,
}: {
  activeAlerts: Produkt[];
  unseenAlerts: Produkt[];
  hasUnseen: boolean;
  globalneAlerty: boolean;
  seenKeys: Record<string, boolean>;
  waluta: string;
  onMarkSeen: (p: Produkt, e?: React.MouseEvent) => void;
  onMarkAllSeen: (e?: React.MouseEvent) => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between px-3 py-2">
        <DropdownMenuLabel className="p-0 text-sm font-semibold">
          Powiadomienia o spadkach cen
          {activeAlerts.length > 0 && (
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
              ({unseenAlerts.length} nowych)
            </span>
          )}
        </DropdownMenuLabel>
        {hasUnseen && (
          <button
            onClick={onMarkAllSeen}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors ml-2 shrink-0"
            title="Oznacz wszystkie jako widziane"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Oznacz wszystkie
          </button>
        )}
      </div>
      <DropdownMenuSeparator className="mt-0" />

      {!globalneAlerty ? (
        <div className="p-4 text-center text-sm text-muted-foreground">
          Alerty globalne są wyłączone w profilu.
        </div>
      ) : activeAlerts.length === 0 ? (
        <div className="p-4 text-center text-sm text-muted-foreground">
          Brak produktów ze spadkiem ceny.
        </div>
      ) : (
        <div className="max-h-[320px] overflow-y-auto divide-y divide-border/50">
          {activeAlerts.map((produkt) => {
            const histLen = produkt.historia?.length || 0;
            const cena_obecna = histLen > 0 ? produkt.historia![histLen - 1].cena : 0;
            const cena_poprzednia = histLen > 1 ? produkt.historia![histLen - 2].cena : cena_obecna;
            const savings = Math.max(0, cena_poprzednia - cena_obecna);
            const isSeen = !!seenKeys[getAlertKey(produkt)];

            return (
              <div
                key={produkt.id}
                className={`relative flex items-start gap-2 px-3 py-3 transition-colors ${
                  isSeen ? "opacity-45" : "hover:bg-accent/30"
                }`}
              >
                {/* Unseen dot */}
                {!isSeen && (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                )}
                {isSeen && <span className="mt-1.5 h-2 w-2 shrink-0" />}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`font-medium text-sm line-clamp-1 ${isSeen ? "text-muted-foreground" : ""}`}>
                      {produkt.nazwa}
                    </span>
                    {isSeen && (
                      <span className="text-[9px] text-muted-foreground shrink-0">widziane</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                    {histLen > 1 && (
                      <span className="line-through">{cena_poprzednia} {produkt.waluta}</span>
                    )}
                    <ArrowDown className="h-3 w-3 text-emerald-500 shrink-0" />
                    <span className="text-emerald-500 font-semibold">
                      {cena_obecna} {produkt.waluta}
                    </span>
                    {savings > 0 && (
                      <span className="ml-auto text-emerald-600 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-400 px-1.5 py-0.5 rounded font-medium whitespace-nowrap">
                        -{savings.toFixed(2)} {produkt.waluta}
                      </span>
                    )}
                  </div>
                </div>

                {/* Mark as seen button */}
                {!isSeen && (
                  <button
                    onClick={(e) => onMarkSeen(produkt, e)}
                    className="shrink-0 mt-0.5 p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    title="Oznacz jako widziane"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {activeAlerts.length > 0 && !hasUnseen && (
        <div className="px-3 py-2 text-center text-xs text-muted-foreground border-t border-border/50">
          Wszystkie alerty zostały oznaczone jako widziane.
        </div>
      )}
    </>
  );
}
