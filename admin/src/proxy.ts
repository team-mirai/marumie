import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { getMaintenanceHtml } from "@/client/templates/maintenance-html";

async function hashCredentials(credentials: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(credentials);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function performBasicAuth(request: NextRequest): Promise<NextResponse | null> {
  const basicAuthSecret = process.env.BASIC_AUTH_SECRET;

  // ベーシック認証の環境変数がない場合は認証をスキップ
  if (!basicAuthSecret) {
    return null;
  }

  const authorizationHeader = request.headers.get("authorization");

  if (!authorizationHeader?.startsWith("Basic ")) {
    return new NextResponse("Authentication required", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Secure Area"',
      },
    });
  }

  const base64Credentials = authorizationHeader.split(" ")[1];
  const credentials = atob(base64Credentials);

  // id:passwordの形式でハッシュ化
  const hashedCredentials = await hashCredentials(credentials);

  if (hashedCredentials !== basicAuthSecret) {
    return new NextResponse("Invalid credentials", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Secure Area"',
      },
    });
  }

  return null;
}

// publicパス以外は全て認証を必須とする（セキュアデフォルト）
export async function proxy(request: NextRequest): Promise<NextResponse> {
  // メンテナンスモードチェック
  const isMaintenanceMode = process.env.MAINTENANCE_MODE === "true";
  if (isMaintenanceMode) {
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

  // PKCEフローでのパスワードリセット: codeパラメータがルートURLに来た場合は/loginにリダイレクト
  const code = request.nextUrl.searchParams.get("code");
  if (code && request.nextUrl.pathname === "/") {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("code", code);
    return NextResponse.redirect(loginUrl);
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        response = NextResponse.next({
          request: { headers: request.headers },
        });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, {
            ...options,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 7,
            path: "/",
          });
        }
      },
    },
  });

  const publicPaths = [
    "/login",
    "/forgot-password",
    "/auth/callback",
    "/auth/setup",
    "/auth/reset-password",
  ];
  const isPublicPath = publicPaths.some((path) => request.nextUrl.pathname.startsWith(path));

  // publicパスの場合はbasic認証を実行
  if (isPublicPath) {
    const basicAuthResponse = await performBasicAuth(request);
    if (basicAuthResponse) {
      return basicAuthResponse;
    }
  }

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 認証が必要なパス（publicパス以外）で未認証の場合はログインへリダイレクト
    if (!isPublicPath && !user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // ログイン済みでログイン用ページに来たらTopへリダイレクト
    if (user && request.nextUrl.pathname.startsWith("/login")) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  } catch {
    // 認証エラー時はpublicパス以外はログインへリダイレクト
    if (!isPublicPath) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
