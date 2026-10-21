import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: "", ...options });
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Public routes that don't require authentication
  const publicRoutes = ["/login", "/signup", "/auth/callback", "/"];
  const isPublicRoute = publicRoutes.some((route) =>
    request.nextUrl.pathname === route ||
    request.nextUrl.pathname.startsWith(route + "/")
  );

  // API routes are handled by their own auth guards
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return response;
  }

  // Redirect authenticated users away from login/signup
  if (user && isPublicRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Redirect unauthenticated users to login for protected routes
  if (!user && !isPublicRoute) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Enforce workspace isolation: protected routes require a workspace context
  if (user && !isPublicRoute && !request.nextUrl.pathname.startsWith("/api/")) {
    const pathname = request.nextUrl.pathname;

    // Allow access to workspace selection and creation
    if (
      pathname === "/dashboard" ||
      pathname.startsWith("/workspaces/") ||
      pathname.startsWith("/settings/")
    ) {
      return response;
    }

    // Default protected route: redirect to dashboard
    if (!pathname.startsWith("/dashboard")) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*|public/).*)",
  ],
};
