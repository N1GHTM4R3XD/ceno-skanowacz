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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { AvatarPicker } from "../components/AvatarPicker";
import { User, Mail, Bell, ShieldAlert, Save, Info, Palette } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DEFAULT_AVATAR_COLOR } from "../data/avatarOptions";

export function Profil() {
  const { userProfile, updateProfileSettings, updateAvatarColor, selectedToken } = useAppContext();
  const { toast } = useToast();

  const [email, setEmail] = useState(userProfile?.email || "");
  const [emailAlerts, setEmailAlerts] = useState(userProfile?.powiadomieniaEmail || false);
  const [globalAlerts, setGlobalAlerts] = useState(userProfile?.globalneAlerty ?? true);
  const [avatarColor, setAvatarColor] = useState(
    userProfile?.avatarColor || DEFAULT_AVATAR_COLOR
  );

  if (!userProfile) return null;

  const handleSave = () => {
    updateProfileSettings(email, emailAlerts, globalAlerts);
    updateAvatarColor(avatarColor);
    toast({
      title: "Zapisano zmiany",
      description: "Twoje ustawienia profilu zostały zaktualizowane.",
      duration: 3000,
    });
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
            <Input value={userProfile.imie} disabled className="bg-muted" />
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
        <CardContent>
          <AvatarPicker
            selected={avatarColor}
            onChange={setAvatarColor}
            name={userProfile.imie}
          />
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

          <div className="bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300 p-3 rounded-lg flex gap-2.5 text-xs border border-blue-100 dark:border-blue-900">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              Wysyłka e-maili jest w fazie przygotowania. Ustawienia są zapisywane w interfejsie,
              ale e-maile nie są jeszcze fizycznie wysyłane.
            </p>
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
    </div>
  );
}
