import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refresca la sesión de Supabase en cada request (Server Components no
 * pueden escribir cookies, así que este paso es obligatorio en el
 * middleware para mantener la sesión viva).
 *
 * También aplica una primera barrera de protección para rutas privadas.
 * Esta barrera es solo una redirección de conveniencia: la verificación
 * de autorización real (rol admin) se hace siempre en el servidor dentro
 * de cada página protegida, consultando la tabla `profiles` mediante RLS.
 */
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
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPrivateRoute =
    path.startsWith("/perfil") || path.startsWith("/admin") || path.startsWith("/laboratorio");

  if (!user && isPrivateRoute) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("next", path);
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}
