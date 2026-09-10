"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, Input, Label, Textarea } from "@/client/components/ui";
import type { Book, BookMetadata } from "@/server/contexts/research-fund/domain/models/book";
import {
  createBook,
  updateBook,
} from "@/server/contexts/research-fund/presentation/actions/manage-book";

export function BookForm({
  politicianId,
  book,
  defaultYear,
}: {
  politicianId: string;
  book?: Book;
  defaultYear?: number;
}) {
  const router = useRouter();
  const [year, setYear] = useState(String(defaultYear ?? new Date().getFullYear()));
  const [data, setData] = useState<BookMetadata>(
    book ?? { asOfDate: "", nextUpdateNote: "", policyComment: "" },
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prefix = book ? `book-${book.id}` : "new-book";
  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        setError(null);
        try {
          const result = book
            ? await updateBook(politicianId, book.id, data)
            : await createBook(politicianId, Number(year));
          if (!result.success) {
            setError(result.error);
            return;
          }
          toast.success(book ? "帳簿情報を保存しました" : "帳簿を作成しました");
          router.refresh();
        } catch {
          setError("保存に失敗しました。もう一度お試しください");
        } finally {
          setBusy(false);
        }
      }}
    >
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {book ? (
        <>
          <div className="space-y-2">
            <Label htmlFor={`${prefix}-date`}>時点の日付</Label>
            <Input
              id={`${prefix}-date`}
              type="date"
              disabled={busy}
              value={data.asOfDate}
              onChange={(e) => setData({ ...data, asOfDate: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${prefix}-next`}>次回更新の案内</Label>
            <Input
              id={`${prefix}-next`}
              disabled={busy}
              value={data.nextUpdateNote}
              onChange={(e) => setData({ ...data, nextUpdateNote: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${prefix}-policy`}>活用方針</Label>
            <Textarea
              id={`${prefix}-policy`}
              disabled={busy}
              value={data.policyComment}
              onChange={(e) => setData({ ...data, policyComment: e.target.value })}
            />
          </div>
        </>
      ) : (
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-year`}>
            年度 <span className="text-destructive">*</span>
          </Label>
          <Input
            id={`${prefix}-year`}
            type="number"
            min={1900}
            max={9999}
            step={1}
            required
            disabled={busy}
            value={year}
            onChange={(e) => setYear(e.target.value)}
          />
        </div>
      )}
      <Button type="submit" disabled={busy}>
        {busy ? "保存中..." : book ? "帳簿情報を保存" : "帳簿を作成"}
      </Button>
    </form>
  );
}
