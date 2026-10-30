"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DASHBOARD_POR_ROL, normalizarRol } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function iniciarSesion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCargando(true);
    setError(null);

    const supabase = createClient();
    const { data, error: errorAuth } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (errorAuth) {
      setError(errorAuth.message);
      setCargando(false);
      return;
    }

    const rol = normalizarRol(
      data.user?.app_metadata?.rol ?? data.user?.user_metadata?.rol,
    );
    const destino = searchParams.get("next") ?? DASHBOARD_POR_ROL[rol];

    // TODO: validar que `next` no apunte a una ruta de mayor privilegio que el rol.
    router.push(destino);
    router.refresh();
  }

  return (
    <Card className="w-full shadow-xl backdrop-blur supports-[backdrop-filter]:bg-card/95">
      <CardHeader className="space-y-2 text-center">
        <CardTitle className="text-3xl font-bold tracking-tight">NEXO</CardTitle>
        <CardDescription className="text-base">
          Gestión integral de cartera inmobiliaria
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={iniciarSesion} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input
              id="email"
              type="email"
              placeholder="tu@correo.cl"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="h-10"
            />
          </div>

          {error ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2">
              <p className="text-sm font-medium text-destructive">{error}</p>
            </div>
          ) : null}

          <Button type="submit" className="w-full h-10" disabled={cargando}>
            {cargando ? "Ingresando..." : "Ingresar"}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            ¿No tienes cuenta? Contacta al administrador.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
