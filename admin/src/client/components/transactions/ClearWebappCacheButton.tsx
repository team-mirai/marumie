"use client";

import { useState } from "react";
import { clearWebappCacheAction } from "@/server/contexts/shared/presentation/actions/clear-webapp-cache";

export function ClearWebappCacheButton() {
  const [clearing, setClearing] = useState(false);

  const handleClearCache = async () => {
    if (clearing) return;

    setClearing(true);
    try {
      const result = await clearWebappCacheAction();
      if (result.success) {
        alert(result.message);
      } else {
        alert(`エラー: ${result.message}`);
      }
    } catch (error) {
      alert(`エラー: ${error instanceof Error ? error.message : "不明なエラー"}`);
    } finally {
      setClearing(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClearCache}
      disabled={clearing}
      className={`bg-blue-600 text-white border-0 rounded-lg px-4 py-2.5 font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
        clearing ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-700 cursor-pointer"
      }`}
    >
      {clearing ? "クリア中..." : "ウェブアプリのキャッシュをクリア"}
    </button>
  );
}
