"use client";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/client/components/ui";
import { deletePolitician } from "@/server/contexts/shared/presentation/actions/manage-politician";

export function DeletePoliticianButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        削除
      </Button>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!busy) setOpen(value);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{name} を削除しますか？</DialogTitle>
            <DialogDescription>
              年度帳簿・仕訳・領収書・公開ページもすべて削除されます。この操作は取り消せません。公開済みのデータがある場合は、削除ではなく非公開化を検討してください。
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" disabled={busy} onClick={() => setOpen(false)}>
              キャンセル
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError(null);
                try {
                  const result = await deletePolitician(id);
                  if (!result.success) {
                    setError(result.error);
                    toast.error(result.error);
                    return;
                  }
                  toast.success("議員を削除しました");
                  setOpen(false);
                  router.refresh();
                } catch {
                  const message = "削除に失敗しました。もう一度お試しください";
                  setError(message);
                  toast.error(message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "削除中..." : "削除する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
