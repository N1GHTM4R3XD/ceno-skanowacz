import React, { useMemo } from "react";
import { Produkt } from "../types";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import { format, parseISO } from "date-fns";
import { pl } from "date-fns/locale";
import { ExternalLink, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ProductDetailsProps {
  produkt: Produkt;
}

export function ProductDetails({ produkt }: ProductDetailsProps) {
  const chartData = useMemo(() => {
    // Ensure data is sorted by date ascending for the chart
    return [...(produkt.historia || [])].sort(
      (a, b) => new Date(a.data).getTime() - new Date(b.data).getTime()
    ).map(entry => ({
      ...entry,
      formattedDate: format(parseISO(entry.data), 'd MMM', { locale: pl }),
      fullDate: format(parseISO(entry.data), 'd MMMM yyyy', { locale: pl })
    }));
  }, [produkt.historia]);

  const historyList = useMemo(() => {
    if (!produkt.historia) return [];
    return [...produkt.historia].sort(
      (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
    );
  }, [produkt.historia]);

  const sortedOffers = useMemo(() => {
    if (!produkt.oferty) return [];
    return [...produkt.oferty].sort(
      (a, b) => (a.cena + a.koszt_dostawy) - (b.cena + b.koszt_dostawy)
    );
  }, [produkt.oferty]);

  return (
    <div className="p-4 space-y-6">
      {/* Oferty Section */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold">Wszystkie oferty</h4>
        <div className="space-y-2">
          {sortedOffers.map((oferta, index) => {
            const isBest = index === 0;
            const isFreeDelivery = oferta.koszt_dostawy === 0;
            const totalPrice = oferta.cena + oferta.koszt_dostawy;
            
            return (
              <div 
                key={oferta.id} 
                className={`flex items-center justify-between p-3 rounded-lg border ${isBest ? 'border-primary/50 bg-primary/5' : 'border-border/50 bg-muted/10'}`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{oferta.sklep}</span>
                    {isBest && <Badge variant="default" className="text-[10px] h-4 px-1.5">Najlepsza</Badge>}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                    <Truck className="w-3.5 h-3.5" />
                    {isFreeDelivery ? (
                      <span className="text-emerald-500 dark:text-emerald-400 font-medium">
                        Darmowa dostawa {oferta.darmowa_dostawa_z && `(${oferta.darmowa_dostawa_z})`}
                      </span>
                    ) : (
                      <span>Dostawa: {oferta.koszt_dostawy} {produkt.waluta}</span>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-1">
                  {oferta.wymaga_recznego_sprawdzenia ? (
                    <Badge variant="outline" className="text-[10px] border-orange-200 bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:border-orange-800 dark:text-orange-400 mt-1 mb-1">
                      Sprawdź ręcznie
                    </Badge>
                  ) : (
                    <div className="font-bold text-sm">
                      {totalPrice} {produkt.waluta}
                    </div>
                  )}
                  <a
                    href={oferta.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] font-medium text-primary hover:underline flex items-center gap-1"
                  >
                    Przejdź do sklepu <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
            );
          })}
          {sortedOffers.length === 0 && (
            <div className="text-sm text-muted-foreground py-2 text-center">Brak dodanych ofert</div>
          )}
        </div>
      </div>

      {produkt.historia && produkt.historia.length > 0 && (
      <div className="space-y-2">
        <h4 className="text-sm font-semibold flex items-center justify-between">
          <span>Historia cen</span>
          <span className="text-xs font-normal text-muted-foreground">3 miesiące</span>
        </h4>
        <div className="h-[120px] w-full -ml-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
              <XAxis 
                dataKey="formattedDate" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                dy={10}
              />
              <YAxis 
                domain={['dataMin - 50', 'dataMax + 50']} 
                hide 
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-popover text-popover-foreground border border-border shadow-md rounded-md p-2 text-xs">
                        <div className="font-medium mb-1">{payload[0].payload.fullDate}</div>
                        <div className="font-bold">{payload[0].value} {produkt.waluta}</div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line
                type="monotone"
                dataKey="cena"
                stroke={produkt.trend === "spadek" ? "hsl(142.1, 76.2%, 36.3%)" : "hsl(215.4, 16.3%, 46.9%)"}
                strokeWidth={2}
                dot={{ r: 3, fill: "currentColor", strokeWidth: 0 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      )}
    </div>
  );
}
