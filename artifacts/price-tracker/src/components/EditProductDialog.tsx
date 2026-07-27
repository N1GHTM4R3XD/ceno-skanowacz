import React, { useState, useEffect } from "react";
import { useAppContext } from "../context/AppContext";
import { Produkt } from "../types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Image as ImageIcon } from "lucide-react";

interface EditProductDialogProps {
  produkt: Produkt;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditProductDialog({ produkt, open, onOpenChange }: EditProductDialogProps) {
  const { updateProductInfo } = useAppContext();
  const [nazwa, setNazwa] = useState(produkt.nazwa);
  const [zdjecieUrl, setZdjecieUrl] = useState(produkt.zdjecie_url);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setNazwa(produkt.nazwa);
      setZdjecieUrl(produkt.zdjecie_url);
      setError("");
    }
  }, [open, produkt]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nazwa.trim()) {
      setError("Nazwa produktu jest wymagana");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateProductInfo(produkt.id, nazwa.trim(), zdjecieUrl.trim());
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || "Wystąpił błąd podczas zapisu");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edytuj produkt</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="nazwa">Nazwa produktu</Label>
            <Input
              id="nazwa"
              value={nazwa}
              onChange={(e) => setNazwa(e.target.value)}
              placeholder="Wpisz nazwę"
            />
            {error && <p className="text-destructive text-sm mt-1">{error}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="zdjecie_url">URL zdjęcia (opcjonalnie)</Label>
            <Input
              id="zdjecie_url"
              value={zdjecieUrl}
              onChange={(e) => setZdjecieUrl(e.target.value)}
              placeholder="https://..."
            />
            <div className="flex justify-end mt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs h-7 px-2 text-muted-foreground"
                onClick={() => setZdjecieUrl("")}
              >
                <ImageIcon className="w-3 h-3 mr-1" />
                Użyj domyślnej ikony
              </Button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Anuluj
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Zapisywanie..." : "Zapisz"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
