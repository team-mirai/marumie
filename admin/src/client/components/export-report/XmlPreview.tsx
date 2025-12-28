"use client";

import { useState } from "react";
import { Button } from "@/client/components/ui";

interface XmlPreviewProps {
  xml: string;
}

export function XmlPreview({ xml }: XmlPreviewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(xml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-white">XMLプレビュー</h2>
        <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
          {copied ? "コピーしました" : "コピー"}
        </Button>
      </div>
      <pre className="bg-black/30 rounded-lg p-4 text-sm overflow-auto h-[calc(100vh-28rem)] whitespace-pre-wrap text-muted-foreground">
        {xml || "プレビューを生成するとここにXMLが表示されます。"}
      </pre>
    </div>
  );
}
