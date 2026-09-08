"use client";

import { useState } from "react";
import { Check, Copy } from "@phosphor-icons/react/dist/ssr";
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
        <h2 className="text-base font-bold text-foreground">XMLプレビュー</h2>
        <Button type="button" variant="outline" size="sm" className="text-xs" onClick={handleCopy}>
          {copied ? <Check /> : <Copy />}
          {copied ? "コピーしました" : "コピー"}
        </Button>
      </div>
      <pre className="min-h-[300px] max-h-[600px] flex-1 overflow-auto rounded-lg border border-border-soft bg-background p-4 font-latin text-xs leading-relaxed whitespace-pre-wrap text-foreground">
        {xml || "プレビューを生成するとここにXMLが表示されます。"}
      </pre>
    </div>
  );
}
