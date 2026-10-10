import "server-only";
import { revalidateTag } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // Check for refresh token
    const refreshToken = request.headers.get("x-refresh-token");
    const expectedToken = process.env.DATA_REFRESH_TOKEN;

    if (!expectedToken) {
      console.error("DATA_REFRESH_TOKEN not configured");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    if (!refreshToken || refreshToken !== expectedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    revalidateTag("transactions-page-data", "max");
    revalidateTag("transactions-for-csv", "max");
    revalidateTag("top-page-data", "max");
    revalidateTag("organizations", "max");
    // 調研費（admin の公開画面から呼ばれる）。公開ページの loader がこのタグでキャッシュする。
    // "max" は古いデータを返しつつ裏で作り直す方式で、sitemap も loader のキャッシュも同じタグで無効化されるため、
    // 公開直後に sitemap が作り直されると loader から公開前の一覧を受け取って固まってしまう。
    // 即時に失効させ、次のアクセスで最新の公開状態を読み直させる。
    revalidateTag("research-fund-page-data", { expire: 0 });

    return NextResponse.json({
      success: true,
      message: "Cache refreshed successfully",
    });
  } catch (error) {
    console.error("Cache refresh error:", error);
    return NextResponse.json({ error: "Failed to refresh cache" }, { status: 500 });
  }
}
