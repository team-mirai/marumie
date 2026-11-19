"use client";
import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowsMerge } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  NativeSelect,
} from "@/client/components/ui";
import type { Payee } from "@/server/contexts/research-fund/domain/models/payee";
import {
  type PayeeAlias,
  payeeAliasFromName,
} from "@/server/contexts/research-fund/domain/models/payee-alias";
import {
  type PayeeMergeCandidate,
  payeeMergeAddedAliases,
  payeeMergeRejection,
} from "@/server/contexts/research-fund/domain/models/payee-merge";
import { mergePayees } from "@/server/contexts/research-fund/presentation/actions/manage-payees";
import type { AdminTarget } from "@/server/contexts/shared/domain/models/admin-target";

function candidateLabel(candidate: Pick<Payee, "name" | "address">) {
  return candidate.address ? `${candidate.name}（${candidate.address}）` : candidate.name;
}

/**
 * 支払先の詳細ページから、同じ議員の別の支払先（統合元）を選んでいま見ている支払先に統合する。
 * 統合元を選ぶと、移る仕訳の件数と統合先に加わる表記を見せ、「統合する」を押すまでは何も変えない。
 * インボイス登録番号が食い違う支払先は、理由を見せて統合させない
 */
export function PayeeMergeButton({
  payee,
  aliases,
  candidates,
  target,
}: {
  payee: Payee;
  aliases: readonly Pick<PayeeAlias, "name">[];
  /** 同じ議員の、この支払先以外の支払先 */
  candidates: readonly PayeeMergeCandidate[];
  target: Extract<AdminTarget, { kind: "research-fund" }>;
}) {
  const router = useRouter();
  const fieldId = useId();
  const [open, setOpen] = useState(false);
  const [sourceId, setSourceId] = useState("");
  const [pending, startTransition] = useTransition();
  const source = candidates.find((candidate) => candidate.id === sourceId) ?? null;
  const rejection = source ? payeeMergeRejection(payee, source) : null;
  const addedAliases = source
    ? payeeMergeAddedAliases(
        source,
        aliases.flatMap((alias) => payeeAliasFromName(alias.name) ?? []),
      )
    : [];

  function changeOpen(value: boolean) {
    if (pending) return;
    setOpen(value);
    if (!value) setSourceId("");
  }

  function merge() {
    if (!source) return;
    startTransition(async () => {
      try {
        const result = await mergePayees(target.politicianId, target.bookId, payee.id, source.id);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success(
          result.movedEntryCount > 0
            ? `支払先「${source.name}」を統合し、${result.movedEntryCount}件の仕訳を「${payee.name}」に紐づけました`
            : `支払先「${source.name}」を「${payee.name}」に統合しました`,
        );
        setOpen(false);
        setSourceId("");
        router.refresh();
      } catch {
        toast.error("通信に失敗しました。再度お試しください");
      }
    });
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <ArrowsMerge size={13} />
        統合
      </Button>
      <Dialog open={open} onOpenChange={changeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>「{payee.name}」に支払先を統合</DialogTitle>
            <DialogDescription>
              同じ相手の支払先を選ぶと、その支払先をこの支払先にまとめます。名称・郵便番号・住所・インボイス登録番号はこの支払先のものが残ります。
            </DialogDescription>
          </DialogHeader>
          {candidates.length === 0 ? (
            <p className="text-sm text-muted-foreground">統合できる支払先はありません。</p>
          ) : (
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${fieldId}-source`}>統合する支払先</Label>
              <NativeSelect
                id={`${fieldId}-source`}
                wrapperClassName="w-full"
                value={sourceId}
                disabled={pending}
                onChange={(e) => setSourceId(e.target.value)}
              >
                <option value="">選択してください</option>
                {candidates.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidateLabel(candidate)}
                  </option>
                ))}
              </NativeSelect>
            </div>
          )}
          {source &&
            (rejection ? (
              <p role="alert" className="text-sm text-destructive">
                {rejection}
              </p>
            ) : (
              <div className="flex flex-col gap-2 text-sm">
                <p>
                  {source.entryCount > 0
                    ? `すべての帳簿で「${source.name}」に紐づいている${source.entryCount}件の仕訳が、この支払先に紐づきます。仕訳の金額・日付・科目・状態は変わりません。`
                    : `「${source.name}」に紐づいている仕訳はありません。`}
                </p>
                {addedAliases.length > 0 ? (
                  <div>
                    <p>
                      次の表記がこの支払先に加わり、以後この表記の書類はこの支払先に紐づきます。
                    </p>
                    <ul className="mt-1 list-disc pl-5">
                      {addedAliases.map((alias) => (
                        <li key={alias.normalizedName}>{alias.name}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p>この支払先に加わる表記はありません（すべて記録済みです）。</p>
                )}
                <p>「{source.name}」は一覧から消えます。この操作は取り消せません。</p>
              </div>
            ))}
          <DialogFooter>
            <Button variant="outline" disabled={pending} onClick={() => changeOpen(false)}>
              キャンセル
            </Button>
            <Button disabled={pending || !source || rejection !== null} onClick={merge}>
              {pending ? "統合中..." : "統合する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
