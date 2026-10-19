import "server-only";

import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

/**
 * Vercel Cron から呼ばれる Route Handler 用のガード（#1812）。
 *
 * Vercel Cron は `Authorization: Bearer <CRON_SECRET>` を付けて呼ぶので、それと一致するときだけ通す。
 * CRON_SECRET が未設定なら誰が呼んでも通さない（設定漏れで入口が開いたままにならないように）。
 * 通さないときは 401 の NextResponse を返し、通過した場合は null を返す。
 */
export function requireCronResponse(
  authorization: string | null,
  secret: string | undefined = process.env.CRON_SECRET,
): NextResponse | null {
  if (!secret || !authorization || !safeEqual(authorization, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }
  return null;
}

function safeEqual(actual: string, expected: string): boolean {
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
