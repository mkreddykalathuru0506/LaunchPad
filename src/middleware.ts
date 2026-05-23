import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const role = (req.nextauth.token?.role as string | undefined) ?? null;
    const path = req.nextUrl.pathname;

    if (path.startsWith("/admin") && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/forbidden", req.url));
    }
    if (path.startsWith("/team") && role !== "MANAGER" && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/forbidden", req.url));
    }
    if (path.startsWith("/work") && !["VERIFIER", "MANAGER", "ADMIN"].includes(role ?? "")) {
      return NextResponse.redirect(new URL("/forbidden", req.url));
    }
    if (path.startsWith("/me") && role !== "CANDIDATE") {
      return NextResponse.redirect(new URL("/forbidden", req.url));
    }
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: { signIn: "/login" },
  }
);

export const config = {
  matcher: ["/me/:path*", "/work/:path*", "/team/:path*", "/admin/:path*"],
};
