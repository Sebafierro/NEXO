"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Building2, LayoutDashboard, LogOut, Menu } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ROLES, type Rol } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

type Props = {
  rol: Rol;
  nombre: string;
  email: string;
};

export function Sidebar({ rol, nombre, email }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);

  const items =
    rol === ROLES.ADMINISTRADOR
      ? [
          { href: "/admin", label: "Resumen", icon: LayoutDashboard },
          { href: "/admin/propiedades", label: "Propiedades", icon: Building2 },
          // TODO: agregar Obligaciones y Pagos cuando existan sus rutas.
        ]
      : [
          { href: "/propietario", label: "Resumen", icon: LayoutDashboard },
          { href: "/propietario/propiedades", label: "Mis propiedades", icon: Building2 },
        ];

  function esActiva(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  async function cerrarSesion() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const iniciales = nombre
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const contenido = (
    <div className="flex h-full flex-col gap-4 py-4">
      <div className="px-6">
        <p className="text-xl font-bold tracking-tight">NEXO</p>
        <p className="text-xs text-muted-foreground">Cartera inmobiliaria</p>
      </div>

      <Separator />

      <nav className="flex-1 space-y-1 px-3">
        {items.map((item) => {
          const activa = esActiva(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setAbierto(false)}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                activa
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <Separator />

      <div className="flex items-center gap-3 px-6">
        <Avatar className="h-9 w-9">
          <AvatarFallback>{iniciales}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{nombre}</p>
          <p className="truncate text-xs text-muted-foreground">{email}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={cerrarSesion} title="Cerrar sesión">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <Sheet open={abierto} onOpenChange={setAbierto}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="fixed left-4 top-4 z-40 lg:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Abrir menú</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Menú</SheetTitle>
          </SheetHeader>
          {contenido}
        </SheetContent>
      </Sheet>

      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r bg-background lg:block">
        {contenido}
      </aside>
    </>
  );
}