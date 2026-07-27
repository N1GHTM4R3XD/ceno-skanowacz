import React, { useState } from "react";
import { useAppContext } from "../context/AppContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { PackagePlus, Plus, Trash2 } from "lucide-react";
import { Kategoria, Oferta } from "../types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AddProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FormState {
  nazwa: string;
  zdjecie_url: string;
  kategoria: string;
  alert_wlaczony: boolean;
  oferty: Array<{
    sklep: string;
    url: string;
    cena: string;
    koszt_dostawy: string;
  }>;
}

const getEmptyFormState = (): FormState => ({
  nazwa: "",
  zdjecie_url: "",
  kategoria: "Inne",
  alert_wlaczony: true,
  oferty: [
    { sklep: "", url: "", cena: "", koszt_dostawy: "" }
  ],
});

function getShopNameFromUrl(url: string) {
  try {
    const u = new URL(url);
    let hostname = u.hostname.replace('www.', '');
    return hostname.charAt(0).toUpperCase() + hostname.slice(1);
  } catch {
    return "Sklep internetowy";
  }
}

export function AddProductDialog({ open, onOpenChange }: AddProductDialogProps) {
  const { addProduct } = useAppContext();
  const [form, setForm] = useState<FormState>(getEmptyFormState());
  const [errors, setErrors] = useState<Partial<FormState>>({});
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTakingLong, setIsTakingLong] = useState(false);

  React.useEffect(() => {
    if (open) {
      setForm(getEmptyFormState());
      setErrors({});
      setIsAdvancedMode(false);
      setIsSubmitting(false);
      setIsTakingLong(false);
    }
  }, [open]);

  const set = (field: keyof FormState, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const validate = (): boolean => {
    const errs: any = {};
    if (!form.nazwa.trim()) errs.nazwa = "Podaj nazwę produktu.";
    
    const ofertyErrs = form.oferty.map(o => {
      const err: any = {};
      if (!o.url.trim()) err.url = "Podaj URL";
      
      if (isAdvancedMode) {
        if (!o.sklep.trim()) err.sklep = "Podaj sklep";
        const cenaNum = parseFloat(o.cena.replace(",", "."));
        if (!o.cena.trim() || isNaN(cenaNum) || cenaNum < 0) err.cena = "Błędna cena";
      }
      return err;
    });

    if (ofertyErrs.some(e => Object.keys(e).length > 0)) {
      errs.oferty = ofertyErrs;
    }

    if (isAdvancedMode && !form.kategoria) errs.kategoria = "Wybierz kategorię";

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    
    setIsSubmitting(true);
    setIsTakingLong(false);
    const longTimer = setTimeout(() => setIsTakingLong(true), 3000);
    
    const oferty: Oferta[] = form.oferty.map((o, index) => {
      let cena = parseFloat(o.cena.replace(",", "."));
      let dostawaStr = o.koszt_dostawy.trim().replace(",", ".");
      let dostawa: number | null = dostawaStr === "" ? null : parseFloat(dostawaStr);
      if (dostawa !== null && isNaN(dostawa)) dostawa = null;
      let sklep = o.sklep.trim();

      if (!isAdvancedMode) {
        cena = 0;
        dostawa = null;
        sklep = getShopNameFromUrl(o.url);
      }

      return {
        id: `off${Date.now()}${index}`,
        sklep,
        url: o.url.trim(),
        cena: isNaN(cena) ? null : cena,
        koszt_dostawy: dostawa,
        darmowa_dostawa_z: dostawa === 0 ? "" : null,
      };
    });

    try {
      await addProduct({
        nazwa: form.nazwa.trim(),
        zdjecie_url: isAdvancedMode ? form.zdjecie_url.trim() : "",
        kategoria: (isAdvancedMode ? form.kategoria : "Inne") as Kategoria,
        waluta: "PLN",
        trend: "brak_zmian",
        alert_wlaczony: form.alert_wlaczony,
        oferty,
      });
      
      setForm(getEmptyFormState());
      setErrors({});
      setIsAdvancedMode(false);
      onOpenChange(false);
    } catch (error) {
      // Błąd jest już obsługiwany przez toast w AppContext
    } finally {
      clearTimeout(longTimer);
      setIsSubmitting(false);
      setIsTakingLong(false);
    }
  };

  const handleClose = () => {
    setForm(getEmptyFormState());
    setErrors({});
    setIsAdvancedMode(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PackagePlus className="w-5 h-5 text-primary" />
              Dodaj produkt
            </div>
            <div className="flex items-center gap-2 mt-1 mr-4">
              <Label htmlFor="advanced-mode" className="text-xs text-muted-foreground cursor-pointer">
                Zaawansowane
              </Label>
              <Switch
                id="advanced-mode"
                checked={isAdvancedMode}
                onCheckedChange={setIsAdvancedMode}
                className="scale-75 data-[state=checked]:bg-primary"
              />
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="prod-nazwa">Nazwa produktu *</Label>
            <Input
              id="prod-nazwa"
              placeholder="np. Ekspres do kawy DeLonghi"
              value={form.nazwa}
              onChange={(e) => { set("nazwa", e.target.value); setErrors((p) => ({ ...p, nazwa: "" })); }}
              className={errors.nazwa ? "border-destructive" : ""}
            />
            {errors.nazwa && <p className="text-xs text-destructive">{errors.nazwa}</p>}
          </div>

          {isAdvancedMode && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="prod-kategoria">Kategoria *</Label>
                <Select 
                  value={form.kategoria} 
                  onValueChange={(val) => { set("kategoria", val); setErrors((p: any) => ({ ...p, kategoria: "" })); }}
                >
                  <SelectTrigger id="prod-kategoria" className={(errors as any).kategoria ? "border-destructive" : ""}>
                    <SelectValue placeholder="Wybierz kategorię..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Elektronika">Elektronika</SelectItem>
                    <SelectItem value="Dom i AGD">Dom i AGD</SelectItem>
                    <SelectItem value="Odzież">Odzież</SelectItem>
                    <SelectItem value="Sport">Sport</SelectItem>
                    <SelectItem value="Zabawki/Dzieci">Zabawki/Dzieci</SelectItem>
                    <SelectItem value="Inne">Inne</SelectItem>
                  </SelectContent>
                </Select>
                {(errors as any).kategoria && <p className="text-xs text-destructive">{(errors as any).kategoria}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prod-img">Link do zdjęcia (opcjonalnie)</Label>
                <Input
                  id="prod-img"
                  type="url"
                  placeholder="https://…"
                  value={form.zdjecie_url}
                  onChange={(e) => set("zdjecie_url", e.target.value)}
                />
              </div>
            </>
          )}

          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <Label>Sklepy i linki ({form.oferty.length})</Label>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-7 text-xs" 
                onClick={() => set("oferty", [...form.oferty, { sklep: "", url: "", cena: "", koszt_dostawy: "" }])}
              >
                <Plus className="w-3 h-3 mr-1" /> Dodaj link
              </Button>
            </div>
            
            <div className="space-y-3 max-h-[30vh] overflow-y-auto p-1">
              {form.oferty.map((o, i) => {
                const oErr = (errors as any).oferty?.[i] || {};
                return (
                  <div key={i} className="p-3 border rounded-md relative bg-muted/20 space-y-2">
                    {form.oferty.length > 1 && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute right-1 top-1 w-6 h-6 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          const newOffers = [...form.oferty];
                          newOffers.splice(i, 1);
                          set("oferty", newOffers);
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                    
                    {isAdvancedMode ? (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Sklep *</Label>
                            <Input 
                              className={`h-8 text-xs ${oErr.sklep ? 'border-destructive' : ''}`}
                              placeholder="np. Allegro" 
                              value={o.sklep}
                              onChange={e => {
                                const newOffers = [...form.oferty];
                                newOffers[i].sklep = e.target.value;
                                set("oferty", newOffers);
                              }}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">URL *</Label>
                            <Input 
                              className={`h-8 text-xs ${oErr.url ? 'border-destructive' : ''}`}
                              placeholder="https://..." 
                              value={o.url}
                              onChange={e => {
                                const newOffers = [...form.oferty];
                                newOffers[i].url = e.target.value;
                                set("oferty", newOffers);
                              }}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Cena *</Label>
                            <Input 
                              type="number"
                              className={`h-8 text-xs ${oErr.cena ? 'border-destructive' : ''}`}
                              placeholder="0.00" 
                              value={o.cena}
                              onChange={e => {
                                const newOffers = [...form.oferty];
                                newOffers[i].cena = e.target.value;
                                set("oferty", newOffers);
                              }}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Dostawa</Label>
                            <Input 
                              type="number"
                              className="h-8 text-xs"
                              placeholder="0.00" 
                              value={o.koszt_dostawy}
                              onChange={e => {
                                const newOffers = [...form.oferty];
                                newOffers[i].koszt_dostawy = e.target.value;
                                set("oferty", newOffers);
                              }}
                            />
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="space-y-1 pr-6">
                        <Label className="text-xs">Link do oferty *</Label>
                        <Input 
                          className={`h-8 text-xs ${oErr.url ? 'border-destructive' : ''}`}
                          placeholder="Wklej pełny adres URL (np. https://allegro.pl/...)" 
                          value={o.url}
                          onChange={e => {
                            const newOffers = [...form.oferty];
                            newOffers[i].url = e.target.value;
                            set("oferty", newOffers);
                          }}
                        />
                        {oErr.url && <p className="text-[10px] text-destructive">{oErr.url}</p>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div>
              <p className="text-sm font-medium">Alert cenowy</p>
              <p className="text-xs text-muted-foreground">Powiadamiaj o spadkach ceny</p>
            </div>
            <Switch
              checked={form.alert_wlaczony}
              onCheckedChange={(v) => set("alert_wlaczony", v)}
              className="data-[state=checked]:bg-primary"
            />
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4 items-center">
          <div className="flex-1 flex items-center justify-start text-sm text-muted-foreground w-full">
            {isTakingLong && (
              <span className="flex items-center gap-2 animate-pulse text-primary font-medium">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Synchronizowanie z bazą, to może chwilę potrwać...
              </span>
            )}
          </div>
          <Button type="button" variant="ghost" onClick={handleClose} disabled={isSubmitting}>
            Anuluj
          </Button>
          <Button type="button" disabled={isSubmitting} onClick={handleSubmit}>
            {isSubmitting ? "Zapisywanie..." : "Dodaj produkt"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
