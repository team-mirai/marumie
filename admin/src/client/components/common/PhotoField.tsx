"use client";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { UserCircle } from "@phosphor-icons/react/dist/ssr";
import { Button, Card, CardContent, Label } from "@/client/components/ui";
import {
  POLITICIAN_PHOTO_MAX_BYTES,
  POLITICIAN_PHOTO_TYPES,
} from "@/shared/models/politician-photo";

/** cacheWarning は保存後に公開サイト（まる見え）のキャッシュを更新できなかったときの理由 */
type PhotoActionResult =
  | { success: true; cacheWarning?: string | null }
  | { success: false; error: string };

/**
 * 顔写真（議員・政治団体の代表者）の登録・差し替え・削除。保存はフォームとは別に、選んだ時点で行う。
 * upload / remove には対象の ID を bind したサーバーアクションを渡す
 */
export function PhotoField({
  label,
  photoUrl,
  hasPhoto,
  upload,
  remove,
}: {
  label: string;
  /** 今の写真のプレビュー用 URL。取得できなかったときは null */
  photoUrl: string | null;
  hasPhoto: boolean;
  upload: (formData: FormData) => Promise<PhotoActionResult>;
  remove: () => Promise<PhotoActionResult>;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<PhotoActionResult>, successMessage: string) => {
    setBusy(true);
    setError(null);
    try {
      const result = await action();
      if (!result.success) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      if (result.cacheWarning)
        toast.warning(`${successMessage}が、まる見えの更新に失敗しました: ${result.cacheWarning}`);
      else toast.success(successMessage);
      router.refresh();
    } catch {
      const message = "顔写真を保存できませんでした。もう一度お試しください";
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const onSelect = (file: File) => {
    // 大きすぎるファイルは送る前に止める（サーバーでも同じ上限で検証する）
    if (file.size > POLITICIAN_PHOTO_MAX_BYTES) {
      const message = "顔写真は3MB以下の画像にしてください";
      setError(message);
      toast.error(message);
      return;
    }
    const formData = new FormData();
    formData.append("photo", file);
    void run(() => upload(formData), hasPhoto ? "顔写真を差し替えました" : "顔写真を登録しました");
  };

  return (
    <Card className="mb-6">
      <CardContent className="space-y-3">
        <Label>{label}</Label>
        <div className="flex items-center gap-5">
          {photoUrl ? (
            // 署名 URL は一時的なので next/image の最適化は通さない
            <img
              src={photoUrl}
              alt="今の顔写真"
              className="size-28 rounded-lg border border-border object-cover"
            />
          ) : (
            <div className="flex size-28 items-center justify-center rounded-lg border border-border-soft text-disabled-foreground">
              <UserCircle size={48} />
              <span className="sr-only">
                {hasPhoto ? "顔写真を表示できませんでした" : "顔写真は未登録です"}
              </span>
            </div>
          )}
          <div className="space-y-2">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => fileInput.current?.click()}
              >
                {busy ? "保存中..." : hasPhoto ? "写真を差し替える" : "写真をアップロード"}
              </Button>
              {hasPhoto && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={busy}
                  onClick={() => void run(remove, "顔写真を削除しました")}
                >
                  写真を削除
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">JPEG・PNG・WebP、3MBまで</p>
          </div>
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <input
          ref={fileInput}
          type="file"
          accept={Object.keys(POLITICIAN_PHOTO_TYPES).join(",")}
          aria-label="顔写真のファイル"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            // 同じファイルを選び直しても onChange が起きるように、選択を毎回空に戻す
            event.target.value = "";
            if (file) onSelect(file);
          }}
        />
      </CardContent>
    </Card>
  );
}
