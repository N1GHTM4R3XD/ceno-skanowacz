import React, { useState } from "react";
import { useAppContext } from "../context/AppContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { AvatarPicker } from "../components/AvatarPicker";
import { User, Mail, Bell, ShieldAlert, Save, Info, Palette, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DEFAULT_AVATAR_COLOR } from "../data/avatarOptions";

export function Profil() {
  const { userProfile, updateProfileSettings, updateAvatarColor, selectedToken, removeProfile } = useAppContext();
  const { toast } = useToast();

  const [imie, setImie] = useState(userProfile?.imie || "");
  const [email, setEmail] = useState(userProfile?.email || "");
  const [avatarUrl, setAvatarUrl] = useState(userProfile?.avatarUrl || "");
  const [emailAlerts, setEmailAlerts] = useState(userProfile?.powiadomieniaEmail || false);
  const [globalAlerts, setGlobalAlerts] = useState(userProfile?.globalneAlerty ?? true);
  const [avatarColor, setAvatarColor] = useState(
    userProfile?.avatarColor || DEFAULT_AVATAR_COLOR
  );
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!userProfile) return null;

  const handleSave = () => {
    updateProfileSettings(imie, email, emailAlerts, globalAlerts, avatarUrl);
    updateAvatarColor(avatarColor);
    toast({
      title: "Zapisano zmiany",
      description: "Twoje ustawienia profilu zostały zaktualizowane.",
      duration: 3000,
    });
  };

  const handleDeleteProfile = async () => {
    if (!selectedToken) return;
    setIsDeleting(true);
    try {
      await removeProfile(selectedToken);
    } catch {
      setIsDeleting(false);
      setConfirmDeleteOpen(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-12">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Ustawienia profilu</h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          Zarządzaj swoimi danymi i preferencjami powiadomień.
        </p>
      </div>

      {/* User data card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <User className="w-5 h-5 text-primary" />
            Dane użytkownika
          </CardTitle>
          <CardDescription>Twój profil w Price Tracker.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Imię</Label>
            <Input value={imie} onChange={(e) => setImie(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Identyfikator profilu</Label>
            <Input value={selectedToken || ""} disabled className="bg-muted font-mono text-sm" />
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="w-3 h-3 flex-shrink-0" />
              Identyfikator generowany automatycznie przy tworzeniu profilu.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Adres e-mail do powiadomień</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9"
                placeholder="twoj@email.pl"
              />
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="w-3 h-3 flex-shrink-0" />
              Powiadomienia o spadkach cen będą wysyłane na ten adres.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Avatar card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Palette className="w-5 h-5 text-primary" />
            Awatar
          </CardTitle>
          <CardDescription>Zmień kolor swojego awatara na ekranie wyboru profilu.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-1.5">
            <Label>Własne zdjęcie profilowe (URL)</Label>
            <Input
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://... (zostaw puste aby używać kolorowego kółka z literą)"
            />
            {avatarUrl && (
              <div className="mt-3">
                <p className="text-xs text-muted-foreground mb-2">Podgląd:</p>
                <img src={avatarUrl} alt="Avatar" className="w-16 h-16 rounded-full object-cover shadow-sm border" />
              </div>
            )}
          </div>
          
          <div className="border-t pt-5">
            <h4 className="text-sm font-medium mb-3">Kolor bazowy (używany, gdy brak zdjęcia)</h4>
            <AvatarPicker
              selected={avatarColor}
              onChange={setAvatarColor}
              name={imie}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notifications card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Bell className="w-5 h-5 text-primary" />
            Powiadomienia
          </CardTitle>
          <CardDescription>
            Dwa poziomy kontroli: globalny przełącznik dla całego profilu oraz
            osobny przełącznik przy każdym produkcie.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Global switch */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                <Label className="text-sm font-semibold">Alerty globalne</Label>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Główny wyłącznik. Gdy wyłączone — żadne powiadomienia nie są aktywne,
                niezależnie od ustawień per-produkt.
              </p>
            </div>
            <Switch
              checked={globalAlerts}
              onCheckedChange={setGlobalAlerts}
              className="data-[state=checked]:bg-primary flex-shrink-0"
            />
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label className="text-sm font-semibold">Powiadomienia e-mail</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Mail wysyłany, gdy globalny przełącznik jest włączony ORAZ alert
                  danego produktu jest włączony.
                </p>
              </div>
              <Switch
                checked={emailAlerts}
                onCheckedChange={setEmailAlerts}
                className="data-[state=checked]:bg-primary flex-shrink-0"
                disabled={!globalAlerts}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="bg-muted/30 border-t py-4">
          <Button
            onClick={handleSave}
            className="w-full sm:w-auto ml-auto flex items-center gap-2 min-h-[44px]"
          >
            <Save className="w-4 h-4" />
            Zapisz ustawienia
          </Button>
        </CardFooter>
      </Card>

      {/* Delete profile card */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-destructive">
            <Trash2 className="w-5 h-5" />
            Usuń profil
          </CardTitle>
          <CardDescription>
            Trwale usuwa profil i wszystkie obserwowane produkty. Tej operacji nie można cofnąć.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            className="flex items-center gap-2 min-h-[44px]"
            onClick={() => setConfirmDeleteOpen(true)}
          >
            <Trash2 className="w-4 h-4" />
            Usuń profil
          </Button>
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć profil?</AlertDialogTitle>
            <AlertDialogDescription>
              Profil <strong>{userProfile.imie}</strong> oraz wszystkie{" "}
              <strong>{userProfile.produkty.length}</strong> obserwowanych produktów zostaną
              trwale usunięte. Tej operacji nie można cofnąć.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Anuluj</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={isDeleting}
              onClick={handleDeleteProfile}
              className="min-h-[40px]"
            >
              {isDeleting ? "Usuwanie..." : "Tak, usuń profil"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
