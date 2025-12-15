import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

async function hashCredentials(credentials: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(credentials);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function middleware(request: NextRequest) {
  const basicAuthSecret = process.env.BASIC_AUTH_SECRET;

  // ベーシック認証の環境変数がない場合は認証をスキップ
  if (!basicAuthSecret) {
    return NextResponse.next();
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

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
