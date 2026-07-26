import React from "react";
import { AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotFound() {
  const searchParams = window.location.search;
  const token = new URLSearchParams(searchParams).get("u");

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full shadow-lg border-border">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <CardTitle className="text-2xl">Nie znaleziono profilu</CardTitle>
          <CardDescription className="text-base mt-2">
            Niestety, nie mogliśmy załadować Twojego osobistego panelu.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4 pt-4">
          <p className="text-sm text-muted-foreground">
            Wymagany jest poprawny identyfikator w adresie URL. Sprawdź, czy link, z którego korzystasz, jest kompletny.
          </p>
          
          <div className="bg-muted p-3 rounded-md text-left text-sm mt-4">
            <p className="font-medium mb-1">Przykłady poprawnych linków:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li><code className="bg-background px-1 py-0.5 rounded border border-border">/?u=mama123</code></li>
              <li><code className="bg-background px-1 py-0.5 rounded border border-border">/?u=tata456</code></li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
