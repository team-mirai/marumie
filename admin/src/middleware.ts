import { type NextRequest, NextResponse } from "next/server";
import { getMaintenanceHtml } from "@/lib/maintenance-html";

const EXCLUDED_PATHS = ["/_next/static", "/_next/image", "/favicon.ico", "/robots.txt"];

function isExcludedPath(pathname: string): boolean {
  return EXCLUDED_PATHS.some((path) => pathname.startsWith(path));
}

export function middleware(request: NextRequest) {
  const isMaintenanceMode = process.env.MAINTENANCE_MODE === "true";

  if (!isMaintenanceMode) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  if (isExcludedPath(pathname)) {
    return NextResponse.next();
  }

  const maintenanceMessage = process.env.MAINTENANCE_MESSAGE;
  const html = getMaintenanceHtml(maintenanceMessage);

  return new NextResponse(html, {
    status: 503,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Retry-After": "3600",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt).*)"],
};
