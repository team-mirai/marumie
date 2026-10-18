"use client";
import "client-only";
import { useState } from "react";
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
} from "@/client/components/ui";
import { togglePoliticianAssignment } from "@/client/lib";

interface AssignmentDialogProps {
  user: { id: string; email: string; assignedPoliticianIds: string[] };
  /** 担当として選べる議員 */
  politicians: readonly { id: string; name: string }[];
  /** 選んだ担当をまとめて保存する。失敗したらエラーメッセージを返す */
  onSave: (politicianIds: string[]) => Promise<{ ok: true } | { ok: false; error: string }>;
  onClose: () => void;
}

/**
 * 担当する議員を選び直すモーダル。
 * 担当の議員室にだけ調査研究費を書き込める（閲覧は research_fund ロールがあれば全議員室）。
 * 選び終えてから「保存」でまとめて反映し、キャンセルすれば何も変えない。
 */
export function AssignmentDialog({ user, politicians, onSave, onClose }: AssignmentDialogProps) {
  const [selected, setSelected] = useState<string[]>(user.assignedPoliticianIds);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = (open: boolean) => {
    if (!open && !isSaving) onClose();
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const result = await onSave(selected);
      if (result.ok) {
        onClose();
      } else {
        setError(result.error);
      }
    } catch (e) {
      console.error("Error updating assignments:", e);
      setError(e instanceof Error ? e.message : "不明なエラー");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] w-[calc(100vw-2rem)] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>担当議員の変更</DialogTitle>
          <DialogDescription className="font-latin">{user.email}</DialogDescription>
        </DialogHeader>

        {politicians.length === 0 ? (
          <p className="text-sm text-muted-foreground">議員が登録されていません</p>
        ) : (
          <div className="flex flex-col gap-2">
            {politicians.map((politician) => {
              const id = `assignment-dialog-politician-${politician.id}`;
              return (
                <div key={politician.id} className="flex items-center gap-1.5">
                  <Checkbox
                    id={id}
                    aria-label={`${user.email} の担当議員: ${politician.name}`}
                    checked={selected.includes(politician.id)}
                    onCheckedChange={(checked) =>
                      setSelected((prev) =>
                        togglePoliticianAssignment(
                          prev,
                          politician.id,
                          checked === true,
                          politicians,
                        ),
                      )
                    }
                    disabled={isSaving}
                  />
                  <Label htmlFor={id} className="font-normal">
                    {politician.name}
                  </Label>
                </div>
              );
            })}
          </div>
        )}

        {error && (
          <p role="alert" className="text-sm text-destructive">
            担当の更新に失敗しました: {error}
          </p>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
            キャンセル
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving || politicians.length === 0}
          >
            {isSaving ? "保存中..." : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
