"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2,
  ClipboardCheck,
  CreditCard,
  FileScan,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  Scale,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ETIQUETA_ROL, ROLES, type Rol } from "@/lib/roles";
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

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
};

// Menú lateral según el rol del JWT (app_metadata.rol).
// El Proxy ya bloquea el acceso directo a rutas de otros roles.
const NAV_POR_ROL: Record<Rol, NavItem[]> = {
  [ROLES.ADMINISTRADOR]: [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/usuarios", label: "Usuarios", icon: Users },
    {
      href: "/admin/propiedades",
      label: "Cartera / Propiedades",
      icon: Building2,
    },
    {
      href: "/admin/liquidaciones",
      label: "Aprobación Liquidaciones",
      icon: ClipboardCheck,
    },
  ],
  [ROLES.EJECUTIVO]: [
    { href: "/ejecutivo", label: "Dashboard", icon: LayoutDashboard },
    {
      href: "/ejecutivo/documentos",
      label: "Carga Documentos OCR",
      icon: FileScan,
    },
    { href: "/ejecutivo/conciliacion", label: "Conciliación", icon: Scale },
    {
      href: "/ejecutivo/liquidaciones",
      label: "Generar Liquidaciones",
      icon: Receipt,
    },
  ],
  [ROLES.PROPIETARIO]: [
    { href: "/propietario", label: "Resumen", icon: LayoutDashboard },
    {
      href: "/propietario/propiedades",
      label: "Mis propiedades",
      icon: Building2,
    },
    {
      href: "/propietario/liquidaciones",
      label: "Mis liquidaciones",
      icon: Receipt,
    },
  ],
  [ROLES.ARRENDATARIO]: [
    { href: "/arrendatario", label: "Mis obligaciones", icon: CreditCard },
    { href: "/arrendatario/pagos", label: "Historial de pagos", icon: History },
  ],
};

// TODO: agrupar el menú en secciones (Operación / Gestión / Cuenta) cuando
// exista la tabla de liquidaciones con sus estados de aprobación.
type Props = {
  rol: Rol;
  nombre: string;
  email: string;
};

export function Sidebar({ rol, nombre, email }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);

  const items = NAV_POR_ROL[rol];

  // Gana el prefijo más específico: evita que /admin y /admin/usuarios
  // queden marcados como activos a la vez.
  const hrefActivo = items
    .map((item) => item.href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];

  const esActiva = (href: string) => href === hrefActivo;

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
              aria-current={activa ? "page" : undefined}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                activa
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
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
          <p className="truncate text-xs text-muted-foreground">
            {ETIQUETA_ROL[rol]}
            {email ? ` · ${email}` : ""}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={cerrarSesion}
          title="Cerrar sesión"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <Sheet open={abierto} onOpenChange={setAbierto}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="fixed left-4 top-4 z-40 lg:hidden"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Abrir menú</span>
          </Button>
        </SheetTrigger>
        <SheetContent
          side="left"
          className="w-72 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Menú</SheetTitle>
          </SheetHeader>
          {contenido}
        </SheetContent>
      </Sheet>

      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:block">
        {contenido}
      </aside>
    </>
  );
}
