import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  type Rol,
  DASHBOARD_POR_ROL,
  RUTAS_PERMITIDAS,
  normalizarRol,
} from "@/lib/roles";

// Proxy: corre antes de cada request, refresca la sesión (vía @supabase/ssr)
// y bloquea el acceso por rol según el Custom JWT Claim `app_metadata.rol`.
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresca la sesión si es necesario y expone el usuario autenticado.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Página pública: login.
  if (pathname === "/login") {
    if (user) {
      const rol = normalizarRol(user.app_metadata?.rol ?? user.user_metadata?.rol);
      return NextResponse.redirect(new URL(DASHBOARD_POR_ROL[rol], request.url));
    }
    return supabaseResponse;
  }

  // Sin sesión -> login (con recordatorio de la ruta de destino).
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  const rol: Rol = normalizarRol(user.app_metadata?.rol ?? user.user_metadata?.rol);

  // Bloqueo por rol: un PROPIETARIO no puede entrar a /admin y viceversa.
  const rutaProtegida = Object.entries(RUTAS_PERMITIDAS).find(
    ([base]) => pathname === base || pathname.startsWith(`${base}/`)
  );

  if (rutaProtegida && !rutaProtegida[1].includes(rol)) {
    return NextResponse.redirect(new URL(DASHBOARD_POR_ROL[rol], request.url));
  }

  // Usuario autenticado en la raíz -> dashboard de su rol.
  if (pathname === "/") {
    return NextResponse.redirect(new URL(DASHBOARD_POR_ROL[rol], request.url));
  }

  return supabaseResponse;
}