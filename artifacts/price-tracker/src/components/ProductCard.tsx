import React, { useState } from "react";
import { Produkt } from "../types";
import { useAppContext } from "../context/AppContext";
import {
  ArrowDownRight,
  ArrowUpRight,
  ArrowRight,
  ExternalLink,
  Bell,
  BellOff,
  ChevronDown,
  ChevronUp,
  Trash2,
  Package,
  Laptop,
  Home,
  Shirt,
  Dumbbell,
  Baby
} from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { ProductDetails } from "./ProductDetails";

interface ProductCardProps {
  produkt: Produkt;
}

export function ProductCard({ produkt }: ProductCardProps) {
  const { theme, updateProductAlert, userProfile, removeProduct } = useAppContext();
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Zabezpieczenie przed pustymi ofertami
  const oferty = produkt.oferty || [];
  const hasOffers = oferty.length > 0;
  
  // Znajdź najtańszą ofertę (cena + dostawa), preferując te, które mają cenę > 0 i nie wymagają ręcznego sprawdzenia
  const validOffers = oferty.filter(o => !o.wymaga_recznego_sprawdzenia && o.cena > 0);
  const bestOffer = validOffers.length > 0 
    ? validOffers.reduce((min, o) => (o.cena + o.koszt_dostawy < min.cena + min.koszt_dostawy) ? o : min, validOffers[0])
    : (hasOffers ? oferty[0] : null);

  const currentTotal = bestOffer ? bestOffer.cena + bestOffer.koszt_dostawy : 0;
  const previousTotal = produkt.historia && produkt.historia.length > 0 
    ? produkt.historia[produkt.historia.length - 1].cena // zakładamy najnowszą historię jako poprzednią, albo trzeba obliczyć trend, uprośćmy
    : currentTotal; 
    
  // Uprawniony trend
  const trend = produkt.trend;

  const getCategoryIcon = () => {
    switch (produkt.kategoria) {
      case "Elektronika": return <Laptop className="w-12 h-12 text-muted-foreground opacity-50" />;
      case "Dom i AGD": return <Home className="w-12 h-12 text-muted-foreground opacity-50" />;
      case "Odzież": return <Shirt className="w-12 h-12 text-muted-foreground opacity-50" />;
      case "Sport": return <Dumbbell className="w-12 h-12 text-muted-foreground opacity-50" />;
      case "Zabawki/Dzieci": return <Baby className="w-12 h-12 text-muted-foreground opacity-50" />;
      default: return <Package className="w-12 h-12 text-muted-foreground opacity-50" />;
    }
  };

  const isPriceDrop = trend === "spadek";
  const isPriceIncrease = trend === "wzrost";
  const isAlertActive = produkt.alert_wlaczony && userProfile?.globalneAlerty;

  // Można by wyliczać z historii
  const percentChange = 0; // Pomijamy skomplikowane liczenie % dla uproszczenia w tym widoku
  const formattedPercent = "";

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.25 }}
      >
        <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 border-border/50 group h-full flex flex-col bg-card relative">
          {/* "Cena spadła" badge */}
          {isPriceDrop && isAlertActive && (
            <div className="absolute top-3 left-3 z-10">
              <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white border-0 shadow-sm">
                Cena spadła!
              </Badge>
            </div>
          )}

          {/* Delete button */}
          <button
            onClick={() => setConfirmDelete(true)}
            className="absolute top-3 right-3 z-10 w-7 h-7 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white opacity-0 group-hover:opacity-100 hover:bg-destructive transition-all duration-200"
            title="Usuń produkt"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <div
            className={`aspect-video w-full overflow-hidden bg-muted relative flex items-center justify-center ${
              theme === "kolorowy" ? "p-1 colorful-card-header" : ""
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-10" />
            {produkt.zdjecie_url ? (
              <img
                src={produkt.zdjecie_url}
                alt={produkt.nazwa}
                className="w-full h-full object-cover rounded-t-[calc(var(--radius)-1px)] group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              getCategoryIcon()
            )}
          </div>

          <CardHeader className="p-4 pb-2">
            <h3 className="font-semibold text-base sm:text-lg leading-tight line-clamp-2" title={produkt.nazwa}>
              {produkt.nazwa}
            </h3>
          </CardHeader>

          <CardContent className="p-4 pt-0 flex-grow">
            {bestOffer ? (
              <>
                <div className="flex items-end gap-2 mb-1">
                  {bestOffer.wymaga_recznego_sprawdzenia ? (
                    <Badge variant="outline" className="text-sm border-orange-200 bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:border-orange-800 dark:text-orange-400 mb-1">
                      <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                      Sprawdź ręcznie
                    </Badge>
                  ) : (
                    <>
                      <span className="text-3xl font-bold tracking-tight text-foreground">
                        {bestOffer.cena > 0 ? bestOffer.cena : "---"}
                      </span>
                      <span className="text-sm font-medium text-muted-foreground pb-1">
                        {bestOffer.cena > 0 ? produkt.waluta : ""}
                      </span>
                    </>
                  )}
                </div>
                
                <div className="text-xs text-muted-foreground mt-1 mb-2">
                  w {bestOffer.sklep} 
                  {bestOffer.koszt_dostawy > 0 ? ` (+${bestOffer.koszt_dostawy} dostawa)` : ' (Darmowa dostawa)'}
                  {oferty.length > 1 && ` i ${oferty.length - 1} innych`}
                </div>
                
                <div className="flex items-center gap-2 mt-1">
                  {isPriceDrop && (
                <Badge
                  variant="outline"
                  className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800 text-xs"
                >
                  <ArrowDownRight className="w-3 h-3 mr-0.5" />
                  {formattedPercent}
                </Badge>
              )}
              {isPriceIncrease && (
                <Badge
                  variant="outline"
                  className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-800 text-xs"
                >
                  <ArrowUpRight className="w-3 h-3 mr-0.5" />
                  {formattedPercent}
                </Badge>
              )}
                {trend === "brak_zmian" && (
                  <Badge variant="outline" className="text-muted-foreground text-xs">
                    <ArrowRight className="w-3 h-3 mr-0.5" />
                    Bez zmian
                  </Badge>
                )}
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground mt-2">Brak ofert.</div>
            )}
          </CardContent>

          <CardFooter className="p-4 flex flex-col gap-3 border-t bg-muted/20">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <Switch
                  id={`alert-${produkt.id}`}
                  checked={produkt.alert_wlaczony}
                  onCheckedChange={(v) => updateProductAlert(produkt.id, v)}
                  className="data-[state=checked]:bg-primary"
                />
                <Label
                  htmlFor={`alert-${produkt.id}`}
                  className="text-xs font-medium cursor-pointer flex items-center gap-1"
                >
                  {produkt.alert_wlaczony ? (
                    <Bell className="w-3 h-3 text-primary" />
                  ) : (
                    <BellOff className="w-3 h-3 text-muted-foreground" />
                  )}
                  <span className={produkt.alert_wlaczony ? "text-primary" : "text-muted-foreground"}>
                    Alert mailowy
                  </span>
                </Label>
              </div>

              {bestOffer && (
                <a
                  href={bestOffer.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-medium text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
                >
                  Sklep
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors pt-2 border-t border-border/50 min-h-[36px]"
            >
              {expanded ? (
                <>
                  Mniej informacji <ChevronUp className="w-3 h-3" />
                </>
              ) : (
                <>
                  Więcej informacji <ChevronDown className="w-3 h-3" />
                </>
              )}
            </button>
          </CardFooter>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden bg-background border-t"
              >
                <ProductDetails produkt={produkt} />
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>

      {/* Delete confirmation */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usuń produkt</AlertDialogTitle>
            <AlertDialogDescription>
              Na pewno usunąć <strong>{produkt.nazwa}</strong>? Tej operacji nie można cofnąć.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Anuluj</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={isDeleting}
              onClick={async () => {
                setIsDeleting(true);
                try {
                  await removeProduct(produkt.id);
                } catch (e) {
                  setIsDeleting(false);
                  setConfirmDelete(false);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Usuwanie..." : "Usuń"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
