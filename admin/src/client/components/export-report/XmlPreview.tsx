"use client";

import { useState } from "react";
import { Button } from "@/client/components/ui";

interface XmlPreviewProps {
  xml: string;
}

export function XmlPreview({ xml }: XmlPreviewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(xml);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-white">XMLプレビュー</h2>
        <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
          {copied ? "コピーしました" : "コピー"}
        </Button>
      </div>
      <pre className="bg-black/30 rounded-lg p-4 text-sm overflow-auto flex-1 min-h-[300px] max-h-[600px] whitespace-pre-wrap text-muted-foreground">
        {xml || "プレビューを生成するとここにXMLが表示されます。"}
      </pre>
    </div>
  );
}
