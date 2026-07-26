import React, { useState } from "react";
import { useAppContext } from "../context/AppContext";
import { format, parseISO } from "date-fns";
import { pl } from "date-fns/locale";
import { ArrowDownRight, ArrowUpRight, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HistoryEntry {
  produktNazwa: string;
  produktId: string;
  data: string;
  cena: number;
  waluta: string;
  zmiana?: number;
}

function TrendBadge({ zmiana, waluta }: { zmiana?: number; waluta: string }) {
  if (zmiana === undefined) return <span className="text-muted-foreground text-xs">–</span>;
  if (zmiana < 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
        <ArrowDownRight className="w-3 h-3 shrink-0" />
        {zmiana} {waluta}
      </span>
    );
  if (zmiana > 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-red-500 font-semibold text-xs">
        <ArrowUpRight className="w-3 h-3 shrink-0" />
        +{zmiana} {waluta}
      </span>
    );
  return <span className="text-muted-foreground text-xs">bez zmian</span>;
}

export function Historia() {
  const { userProfile } = useAppContext();
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  if (!userProfile) return null;

  const allHistory: HistoryEntry[] = [];

  userProfile.produkty.forEach((produkt) => {
    const sortedChronological = [...produkt.historia].sort(
      (a, b) => new Date(a.data).getTime() - new Date(b.data).getTime()
    );
    sortedChronological.forEach((wpis, index) => {
      const zmiana =
        index > 0 ? wpis.cena - sortedChronological[index - 1].cena : undefined;
      allHistory.push({
        produktNazwa: produkt.nazwa,
        produktId: produkt.id,
        data: wpis.data,
        cena: wpis.cena,
        waluta: produkt.waluta,
        zmiana,
      });
    });
  });

  allHistory.sort((a, b) => {
    const diff = new Date(a.data).getTime() - new Date(b.data).getTime();
    return sortOrder === "desc" ? -diff : diff;
  });

  return (
    <div className="space-y-5 pb-12 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Historia zmian</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Wszystkie zarejestrowane zmiany cen Twoich produktów.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))}
          className="w-fit min-h-[44px]"
        >
          <ArrowUpDown className="w-4 h-4 mr-2" />
          {sortOrder === "desc" ? "Najnowsze pierwsze" : "Najstarsze pierwsze"}
        </Button>
      </div>

      {allHistory.length === 0 ? (
        <div className="text-center py-16 border border-dashed rounded-xl bg-muted/30">
          <p className="text-muted-foreground">Brak danych historycznych.</p>
        </div>
      ) : (
        <>
          {/* Mobile: card rows */}
          <div className="sm:hidden space-y-2">
            {allHistory.map((entry, i) => (
              <div
                key={`${entry.produktId}-${entry.data}-${i}`}
                className="bg-card border rounded-xl px-4 py-3 flex flex-col gap-1"
              >
                <span className="font-medium text-sm leading-tight line-clamp-1">
                  {entry.produktNazwa}
                </span>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{format(parseISO(entry.data), "d MMM yyyy", { locale: pl })}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-foreground">
                      {entry.cena} {entry.waluta}
                    </span>
                    <TrendBadge zmiana={entry.zmiana} waluta={entry.waluta} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden sm:block bg-card border rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
                <tr>
                  <th className="px-5 py-3 font-medium">Data</th>
                  <th className="px-5 py-3 font-medium">Produkt</th>
                  <th className="px-5 py-3 font-medium text-right">Cena</th>
                  <th className="px-5 py-3 font-medium text-right">Zmiana</th>
                </tr>
              </thead>
              <tbody>
                {allHistory.map((entry, i) => (
                  <tr
                    key={`${entry.produktId}-${entry.data}-${i}`}
                    className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-5 py-3 whitespace-nowrap text-muted-foreground">
                      {format(parseISO(entry.data), "d MMM yyyy", { locale: pl })}
                    </td>
                    <td className="px-5 py-3 font-medium">{entry.produktNazwa}</td>
                    <td className="px-5 py-3 text-right font-medium">
                      {entry.cena} {entry.waluta}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <TrendBadge zmiana={entry.zmiana} waluta={entry.waluta} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
