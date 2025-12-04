"use server";

export interface ClearWebappCacheResponse {
  success: boolean;
  message: string;
}

export async function clearWebappCacheAction(): Promise<ClearWebappCacheResponse> {
  const webappUrl = process.env.WEBAPP_URL;
  const refreshToken = process.env.DATA_REFRESH_TOKEN;

  if (!webappUrl) {
    return {
      success: false,
      message: "WEBAPP_URL が設定されていません",
    };
  }

  if (!refreshToken) {
    return {
      success: false,
      message: "DATA_REFRESH_TOKEN が設定されていません",
    };
  }

  try {
    const response = await fetch(`${webappUrl}/api/refresh`, {
      method: "POST",
      headers: {
        "x-refresh-token": refreshToken,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.error || `HTTP ${response.status}`,
      };
    }

    return {
      success: true,
      message: "キャッシュをクリアしました",
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "不明なエラー",
    };
  }
}
