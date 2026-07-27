import React, { useMemo, useState } from "react";
import { Produkt } from "../types";
import { useAppContext } from "../context/AppContext";
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
import { ExternalLink, Truck, Edit2, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ProductDetailsProps {
  produkt: Produkt;
}

export function ProductDetails({ produkt }: ProductDetailsProps) {
  const { updateManualPrice } = useAppContext();
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);
  const [manualPrice, setManualPrice] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleManualPriceSubmit = async (offerId: string) => {
    const numPrice = parseFloat(manualPrice.replace(",", "."));
    if (isNaN(numPrice) || numPrice < 0) return;
    
    setIsSubmitting(true);
    try {
      await updateManualPrice(produkt.id, offerId, numPrice);
      setEditingOfferId(null);
      setManualPrice("");
    } finally {
      setIsSubmitting(false);
    }
  };
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
      (a, b) => (a.cena + (a.koszt_dostawy || 0)) - (b.cena + (b.koszt_dostawy || 0))
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
            const totalPrice = oferta.cena + (oferta.koszt_dostawy || 0);
            
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
                  {oferta.koszt_dostawy !== null || oferta.darmowa_dostawa_z ? (
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                      <Truck className="w-3.5 h-3.5" />
                      {oferta.koszt_dostawy === 0 ? (
                        <span className="text-emerald-500 dark:text-emerald-400 font-medium">
                          Darmowa dostawa
                        </span>
                      ) : oferta.koszt_dostawy !== null ? (
                        <span>Dostawa: {oferta.koszt_dostawy} {produkt.waluta}</span>
                      ) : (
                        <span className="text-emerald-500 dark:text-emerald-400 font-medium">
                          {oferta.darmowa_dostawa_z}
                        </span>
                      )}
                    </div>
                  ) : null}
                </div>
                
                <div className="flex flex-col items-end gap-1">
                  {oferta.wymaga_recznego_sprawdzenia ? (
                    editingOfferId === oferta.id ? (
                      <div className="flex items-center gap-1 mt-1 mb-1">
                        <Input 
                          type="text" 
                          value={manualPrice}
                          onChange={(e) => setManualPrice(e.target.value)}
                          className="h-6 w-16 text-[10px] px-1 text-center"
                          placeholder="Cena"
                          autoFocus
                          onKeyDown={(e) => e.key === 'Enter' && handleManualPriceSubmit(oferta.id)}
                        />
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-6 w-6" 
                          onClick={() => handleManualPriceSubmit(oferta.id)}
                          disabled={isSubmitting}
                        >
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-6 w-6" 
                          onClick={() => setEditingOfferId(null)}
                          disabled={isSubmitting}
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 mt-1 mb-1">
                        <Badge variant="outline" className="text-[10px] border-orange-200 bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:border-orange-800 dark:text-orange-400 cursor-help" title={oferta.cena === 0 ? "Sklep blokuje automatyczne odczytywanie. Wpisz cenę ręcznie." : "Cena została podana ręcznie."}>
                          {oferta.cena === 0 ? "Sprawdź ręcznie" : "Cena wpisana ręcznie"}
                        </Badge>
                        <button 
                          onClick={() => {
                            setEditingOfferId(oferta.id);
                            setManualPrice(oferta.cena > 0 ? oferta.cena.toString() : "");
                          }}
                          className="text-muted-foreground hover:text-primary transition-colors p-1"
                          title="Wpisz cenę ręcznie"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {oferta.cena > 0 && (
                          <div className="font-bold text-sm ml-1 text-foreground">
                            {totalPrice} {produkt.waluta}
                          </div>
                        )}
                      </div>
                    )
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
