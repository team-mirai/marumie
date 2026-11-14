"use client";
import { ArrowDown, ArrowUp, Plus, Trash } from "@phosphor-icons/react/dist/ssr";
import { Button, Input, Label } from "@/client/components/ui";

/** SNS の URL を表示順どおりに並べる欄。空の欄は保存時に詰める */
export function SnsUrlsField({
  urls,
  disabled,
  onChange,
}: {
  urls: string[];
  disabled: boolean;
  onChange: (urls: string[]) => void;
}) {
  const move = (from: number, to: number) => {
    const next = [...urls];
    [next[from], next[to]] = [next[to], next[from]];
    onChange(next);
  };
  return (
    <div className="space-y-2">
      <Label>SNS の URL（上から順に表示）</Label>
      {urls.map((url, index) => (
        // 並べ替えで入力中の欄がずれないよう、位置をキーにする（値は親が持つ）
        <div key={index} className="flex max-w-xl items-center gap-2">
          <Input
            type="url"
            aria-label={`SNS の URL（${index + 1}件目）`}
            disabled={disabled}
            placeholder="https://x.com/..."
            value={url}
            onChange={(event) =>
              onChange(urls.map((value, i) => (i === index ? event.target.value : value)))
            }
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="上へ"
            disabled={disabled || index === 0}
            onClick={() => move(index, index - 1)}
          >
            <ArrowUp />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="下へ"
            disabled={disabled || index === urls.length - 1}
            onClick={() => move(index, index + 1)}
          >
            <ArrowDown />
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="icon"
            aria-label="削除"
            disabled={disabled}
            onClick={() => onChange(urls.filter((_, i) => i !== index))}
          >
            <Trash />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => onChange([...urls, ""])}
      >
        <Plus />
        SNS を追加
      </Button>
    </div>
  );
}
