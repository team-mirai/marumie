"use client";

import { useState } from "react";
import { clearWebappCacheAction } from "@/server/contexts/shared/presentation/actions/clear-webapp-cache";
import { Button } from "@/client/components/ui";

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
    <Button type="button" onClick={handleClearCache} disabled={clearing}>
      {clearing ? "クリア中..." : "ウェブアプリのキャッシュをクリア"}
    </Button>
  );
}
