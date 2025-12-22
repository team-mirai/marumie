"use client";

interface XmlPreviewProps {
  xml: string;
}

export function XmlPreview({ xml }: XmlPreviewProps) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-medium text-white mb-1">XMLプレビュー</h2>
        <p className="text-sm text-muted-foreground">
          プレビューはUTF-8で表示しています。実際のファイルはShift_JISで出力されます。
        </p>
      </div>
      <pre className="bg-black/30 rounded-lg p-4 text-sm overflow-auto max-h-[420px] whitespace-pre-wrap text-muted-foreground">
        {xml || "プレビューを生成するとここにXMLが表示されます。"}
      </pre>
    </div>
  );
}
