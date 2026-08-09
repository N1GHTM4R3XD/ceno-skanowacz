import React, { useMemo, useState } from "react";
import { Produkt } from "../types";
import { useAppContext } from "../context/AppContext";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  ReferenceLine,
  Dot,
} from "recharts";
import { format, parseISO } from "date-fns";
import { pl } from "date-fns/locale";
import { ExternalLink, Truck, Edit2, Check, X, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface ProductDetailsProps {
  produkt: Produkt;
}

export function ProductDetails({ produkt }: ProductDetailsProps) {
  const { updateManualPrice, addOfferToProduct, removeOfferFromProduct } = useAppContext();
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);
  const [manualPrice, setManualPrice] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddOffer, setShowAddOffer] = useState(false);
  const [newOffer, setNewOffer] = useState({ sklep: "", url: "", cena: "", koszt_dostawy: "", darmowa_dostawa_z: "" });

  const handleAddOfferSubmit = async () => {
    if (!newOffer.sklep || !newOffer.url) return;
    setIsSubmitting(true);
    try {
      await addOfferToProduct(produkt.id, {
        sklep: newOffer.sklep,
        url: newOffer.url,
        cena: parseFloat(newOffer.cena.replace(",", ".")) || 0,
        koszt_dostawy: newOffer.koszt_dostawy ? parseFloat(newOffer.koszt_dostawy.replace(",", ".")) : null,
        darmowa_dostawa_z: newOffer.darmowa_dostawa_z || null,
        wymaga_recznego_sprawdzenia: false,
      });
      setShowAddOffer(false);
      setNewOffer({ sklep: "", url: "", cena: "", koszt_dostawy: "", darmowa_dostawa_z: "" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteOffer = async (offerId: string) => {
    if (!window.confirm("Czy na pewno chcesz usunąć tę ofertę?")) return;
    setIsSubmitting(true);
    try {
      await removeOfferFromProduct(produkt.id, offerId);
    } finally {
      setIsSubmitting(false);
    }
  };

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
    const sorted = [...(produkt.historia || [])].sort(
      (a, b) => new Date(a.data).getTime() - new Date(b.data).getTime()
    );
    return sorted.map((entry, i) => {
      const prev = i > 0 ? sorted[i - 1].cena : null;
      let direction: "spadek" | "wzrost" | "brak_zmian" | "first" = "first";
      if (prev !== null) {
        if (entry.cena < prev) direction = "spadek";
        else if (entry.cena > prev) direction = "wzrost";
        else direction = "brak_zmian";
      }
      return {
        ...entry,
        direction,
        formattedDate: format(parseISO(entry.data), 'd MMM', { locale: pl }),
        fullDate: format(parseISO(entry.data), 'd MMMM yyyy', { locale: pl }),
      };
    });
  }, [produkt.historia]);

  const chartTrend = produkt.trend;
  const gradientId = `grad-${produkt.id}`;
  const gradientColor =
    chartTrend === "spadek"
      ? "#10b981" // emerald-500
      : chartTrend === "wzrost"
      ? "#ef4444" // red-500
      : "#6b7280"; // gray-500

  const renderDot = (props: any) => {
    const { cx, cy, payload } = props;
    const color =
      payload.direction === "spadek"
        ? "#10b981"
        : payload.direction === "wzrost"
        ? "#ef4444"
        : "#6b7280";
    return <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={4} fill={color} stroke="none" />;
  };

  const historyList = useMemo(() => {
    if (!produkt.historia) return [];
    return [...produkt.historia].sort(
      (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
    );
  }, [produkt.historia]);

  const sortedOffers = useMemo(() => {
    if (!produkt.oferty) return [];
    const baseWaluta = produkt.waluta || 'PLN';
    return [...produkt.oferty].sort((a, b) => {
      const aBase = !a.waluta || a.waluta === baseWaluta;
      const bBase = !b.waluta || b.waluta === baseWaluta;
      if (aBase && !bBase) return -1;
      if (!aBase && bBase) return 1;
      return (a.cena + (a.koszt_dostawy || 0)) - (b.cena + (b.koszt_dostawy || 0));
    });
  }, [produkt.oferty, produkt.waluta]);

  return (
    <div className="p-4 space-y-6">
      {/* Oferty Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold">Wszystkie oferty</h4>
          <Button variant="ghost" size="sm" onClick={() => setShowAddOffer(!showAddOffer)} className="h-7 px-2 text-xs">
             <Plus className="w-3.5 h-3.5 mr-1" /> Dodaj ofertę
          </Button>
        </div>
        
        {showAddOffer && (
          <div className="p-3 border rounded-lg bg-muted/20 space-y-3 mb-4">
            <h5 className="text-xs font-semibold">Nowa oferta</h5>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="space-y-1">
                <Label className="text-[10px]">Sklep *</Label>
                <Input className="h-7 text-xs" value={newOffer.sklep} onChange={(e) => setNewOffer({...newOffer, sklep: e.target.value})} placeholder="np. Amazon" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Cena</Label>
                <Input className="h-7 text-xs" type="number" step="0.01" value={newOffer.cena} onChange={(e) => setNewOffer({...newOffer, cena: e.target.value})} placeholder="0.00" />
              </div>
              <div className="space-y-1 col-span-2">
                <Label className="text-[10px]">URL *</Label>
                <Input className="h-7 text-xs" value={newOffer.url} onChange={(e) => setNewOffer({...newOffer, url: e.target.value})} placeholder="https://..." />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Koszt dostawy</Label>
                <Input className="h-7 text-xs" type="number" step="0.01" value={newOffer.koszt_dostawy} onChange={(e) => setNewOffer({...newOffer, koszt_dostawy: e.target.value})} placeholder="0.00" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Darmowa dostawa od</Label>
                <Input className="h-7 text-xs" value={newOffer.darmowa_dostawa_z} onChange={(e) => setNewOffer({...newOffer, darmowa_dostawa_z: e.target.value})} placeholder="np. od 100 zł" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-2">
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowAddOffer(false)}>Anuluj</Button>
              <Button size="sm" className="h-7 text-xs" disabled={isSubmitting || !newOffer.sklep || !newOffer.url} onClick={handleAddOfferSubmit}>
                Zapisz
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {sortedOffers.map((oferta, index) => {
            const isBaseCurrency = !oferta.waluta || oferta.waluta === (produkt.waluta || 'PLN');
            const isBest = index === 0 && isBaseCurrency;
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
                        <span>Dostawa: {oferta.koszt_dostawy} {oferta.waluta || produkt.waluta}</span>
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
                            {totalPrice} {oferta.waluta || produkt.waluta}
                          </div>
                        )}
                      </div>
                    )
                  ) : (
                    <div className="font-bold text-sm">
                      {totalPrice} {oferta.waluta || produkt.waluta}
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-0.5 justify-end">
                    <a
                      href={oferta.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] font-medium text-primary hover:underline flex items-center gap-1"
                    >
                      Przejdź do sklepu <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                    {sortedOffers.length > 1 && (
                      <button
                        onClick={() => handleDeleteOffer(oferta.id)}
                        disabled={isSubmitting}
                        className="text-muted-foreground hover:text-destructive transition-colors ml-1"
                        title="Usuń ofertę"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
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
        <div className="h-[130px] w-full -ml-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={gradientColor} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={gradientColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="formattedDate"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                dy={10}
              />
              <YAxis domain={["dataMin - 5", "dataMax + 5"]} hide />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    const dirColor =
                      d.direction === "spadek"
                        ? "#10b981"
                        : d.direction === "wzrost"
                        ? "#ef4444"
                        : "#6b7280";
                    const dirLabel =
                      d.direction === "spadek"
                        ? "↓ Spadek"
                        : d.direction === "wzrost"
                        ? "↑ Wzrost"
                        : d.direction === "first"
                        ? "Pierwsza cena"
                        : "Bez zmian";
                    return (
                      <div className="bg-popover text-popover-foreground border border-border shadow-md rounded-md p-2 text-xs">
                        <div className="font-medium mb-1">{d.fullDate}</div>
                        <div className="font-bold text-sm">{d.cena} {produkt.waluta}</div>
                        <div style={{ color: dirColor }} className="text-[10px] mt-0.5 font-medium">{dirLabel}</div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="cena"
                stroke={gradientColor}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                dot={renderDot}
                activeDot={{ r: 5, strokeWidth: 0 }}
                isAnimationActive={true}
                animationDuration={600}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      )}
    </div>
  );
}
