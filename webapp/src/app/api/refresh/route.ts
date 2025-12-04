import "server-only";
import { revalidatePath, revalidateTag } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  console.log("🔄 WEBAPP CACHE REFRESH API CALLED - Starting refresh process");

  try {
    // Check for refresh token
    const refreshToken = request.headers.get("x-refresh-token");
    const expectedToken = process.env.DATA_REFRESH_TOKEN;

    console.log("🔑 Received token:", refreshToken?.slice(0, 8) + "...");
    console.log("🔑 Expected token:", expectedToken?.slice(0, 8) + "...");

    if (!expectedToken) {
      console.error("DATA_REFRESH_TOKEN not configured");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 },
      );
    }

    if (!refreshToken || refreshToken !== expectedToken) {
      console.error("Token mismatch or missing token");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    revalidateTag("transactions-page-data");
    revalidateTag("transactions-for-csv");
    revalidateTag("top-page-data");

    revalidatePath("/transactions");
    revalidatePath("/");

    console.log("✅ WEBAPP CACHE REFRESH COMPLETED SUCCESSFULLY");
    return NextResponse.json({
      success: true,
      message: "Cache refreshed successfully",
    });
  } catch (error) {
    console.error("Cache refresh error:", error);
    return NextResponse.json(
      { error: "Failed to refresh cache" },
      { status: 500 },
    );
  }
}
