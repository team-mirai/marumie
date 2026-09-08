"use client";
import "client-only";

import { useId, useRef, useState, type DragEvent } from "react";
import { UploadSimple } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/client/components/ui";
import { cn } from "@/client/lib";

interface CsvDropzoneProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
  /** 対応形式・上限サイズなどの注記（Poppins 11px） */
  note: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * CSV ファイルのドロップゾーン（ハンドオフ「5. CSVアップロード」）。
 * ドラッグ＆ドロップと「ファイルを選択」ボタンの両方で同じ hidden input に載せる。
 */
export function CsvDropzone({ file, onFileChange, disabled = false, note }: CsvDropzoneProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (disabled) return;
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const dropped = e.dataTransfer.files?.[0] ?? null;
    if (!dropped) return;
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    onFileChange(dropped);
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: ドロップ先の領域。操作は内側の button / input が担う
    <div
      data-slot="csv-dropzone"
      data-dragging={isDragging || undefined}
      onDragOver={handleDragOver}
      onDragEnter={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "flex flex-col items-center rounded-lg border-[1.5px] border-dashed border-primary bg-accent px-6 py-12 text-center transition-colors duration-150 ease-out",
        isDragging && "border-primary-active bg-teal-soft/30",
        disabled && "opacity-100 border-disabled-border bg-secondary",
      )}
    >
      <UploadSimple aria-hidden className="size-9 text-primary-active" />
      <p className="mt-2.5 text-sm font-bold text-foreground">CSVファイルをドラッグ＆ドロップ</p>
      <p className="mt-1 text-xs text-muted-foreground">または</p>
      <Button
        type="button"
        variant="outline"
        className="mt-3.5 text-[13px]"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        ファイルを選択
      </Button>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept=".csv,text/csv"
        aria-label="CSVファイル"
        className="sr-only"
        disabled={disabled}
        onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
      />
      <p className="font-latin mt-3.5 text-[11px] text-subtle-foreground">{note}</p>
      {file && (
        <p className="mt-3 text-[13px] text-foreground" data-slot="csv-dropzone-file">
          <span className="font-bold">{file.name}</span>
          <span className="font-latin ml-2 text-xs text-muted-foreground">
            {formatFileSize(file.size)}
          </span>
        </p>
      )}
    </div>
  );
}
