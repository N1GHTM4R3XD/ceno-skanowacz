import React, { useState } from "react";
import { useAppContext } from "../context/AppContext";
import { ProductCard } from "../components/ProductCard";
import { AddProductDialog } from "../components/AddProductDialog";
import { Activity, TrendingDown, BellRing, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

export function Dashboard() {
  const { userProfile } = useAppContext();
  const [addOpen, setAddOpen] = useState(false);

  if (!userProfile) return null;

  const totalProducts = userProfile.produkty.length;
  const priceDrops = userProfile.produkty.filter((p) => p.trend === "spadek").length;
  const activeAlerts = userProfile.produkty.filter((p) => p.alert_wlaczony).length;

  return (
    <div className="space-y-6 pb-12">
      <section className="space-y-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Cześć, {userProfile.imie}!
          </h1>
          <p className="text-muted-foreground mt-1">Oto Twój osobisty przegląd cen.</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card border rounded-xl p-3 sm:p-4 flex items-center gap-3 shadow-sm">
            <div className="p-2 sm:p-3 bg-primary/10 text-primary rounded-lg flex-shrink-0">
              <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground font-medium leading-tight">Produkty</p>
              <p className="text-xl sm:text-2xl font-bold">{totalProducts}</p>
            </div>
          </div>

          <div className="bg-card border rounded-xl p-3 sm:p-4 flex items-center gap-3 shadow-sm">
            <div className="p-2 sm:p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg flex-shrink-0">
              <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground font-medium leading-tight">Spadki</p>
              <p className="text-xl sm:text-2xl font-bold">{priceDrops}</p>
            </div>
          </div>

          <div className="bg-card border rounded-xl p-3 sm:p-4 flex items-center gap-3 shadow-sm">
            <div className="p-2 sm:p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg flex-shrink-0">
              <BellRing className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground font-medium leading-tight">Alerty</p>
              <p className="text-xl sm:text-2xl font-bold">{activeAlerts}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg sm:text-xl font-bold">
            Twoja lista {totalProducts > 0 ? `(${totalProducts})` : ""}
          </h2>
          <Button
            onClick={() => setAddOpen(true)}
            size="sm"
            className="flex items-center gap-1.5 min-h-[40px]"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden xs:inline">Dodaj produkt</span>
            <span className="xs:hidden">Dodaj</span>
          </Button>
        </div>

        {totalProducts === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-2xl bg-muted/20 text-center gap-4"
          >
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
              <Plus className="w-7 h-7 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">Brak produktów na liście</p>
              <p className="text-sm text-muted-foreground">
                Dodaj pierwszy produkt, żeby zacząć śledzić ceny.
              </p>
            </div>
            <Button onClick={() => setAddOpen(true)} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-1.5" />
              Dodaj produkt
            </Button>
          </motion.div>
        ) : (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {userProfile.produkty.map((produkt) => (
              <ProductCard key={produkt.id} produkt={produkt} />
            ))}
          </motion.div>
        )}
      </section>

      <AddProductDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
