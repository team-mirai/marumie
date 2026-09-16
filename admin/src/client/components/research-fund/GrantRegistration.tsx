"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { PageHeader } from "@/client/components/layout/PageHeader";
import { Card, CardContent, Button, Input } from "@/client/components/ui";
import { grantEntryDate } from "@/server/contexts/research-fund/domain/models/grant-registration";
import type { ScheduledGrant } from "@/server/contexts/research-fund/domain/models/grant-schedule";
import type { AdminTarget } from "@/server/contexts/shared/domain/models/admin-target";
import { registerGrant } from "@/server/contexts/research-fund/presentation/actions/register-grant";

/** 月末日。date 入力の max に使い、その月に属さない日付を選べなくする。 */
function lastDayOf(month: string) {
  const end = new Date(`${month}-01T00:00:00.000Z`);
  end.setUTCMonth(end.getUTCMonth() + 1, 0);
  return end.toISOString().slice(0, 10);
}

function noteOf(grant: ScheduledGrant, termStart: string) {
  if (grant.month === termStart.slice(0, 7))
    return `${termStart.replaceAll("-", ".")} 当選・初月分${grant.amount < 1_000_000 ? "（日割）" : ""}`;
  return grant.status === "available" ? "振込を確認したら支給日を入れて登録" : "";
}

export function GrantRegistration({
  grants,
  termStart,
  target,
}: {
  grants: readonly ScheduledGrant[];
  termStart: string;
  financialYear: number;
  target: Extract<AdminTarget, { kind: "research-fund" }>;
}) {
  const router = useRouter();
  const [pendingMonth, setPendingMonth] = useState<string | null>(null);
  // 支給日を変えた月だけ持つ。未入力の月は既定日（当選月は当選日、それ以外は1日）で登録する。
  const [entryDates, setEntryDates] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function register(month: string, entryDate: string) {
    setPendingMonth(month);
    startTransition(async () => {
      try {
        const result = await registerGrant(target.politicianId, target.bookId, month, entryDate);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success(`${Number(month.slice(5, 7))}月分の支給を確認済で登録しました`);
        router.refresh();
      } catch {
        toast.error("通信に失敗しました。再度お試しください");
      } finally {
        setPendingMonth(null);
      }
    });
  }

  return (
    <>
      <PageHeader
        label="Grants"
        title="支給の登録"
        description={`${target.name}・${target.year}年 — 毎月振り込まれる100万円を、支給日を指定して収入仕訳にします。`}
      />
      <Card className="mb-4 max-w-3xl">
        <CardContent className="flex flex-wrap items-center gap-x-8 gap-y-4 p-6">
          <div>
            <div className="text-xs text-muted-foreground">支給日</div>
            <div className="text-sm font-bold">月ごとに入力（初期値は1日）</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">金額</div>
            <div className="font-latin text-sm font-bold">¥1,000,000</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">仕訳の型</div>
            <div className="text-[13px]">借方 普通預金 ／ 貸方 調査研究費収入</div>
          </div>
        </CardContent>
      </Card>
      <Card className="max-w-3xl">
        <CardContent className="p-6">
          <ul>
            {grants.map((grant) => {
              const defaultDate = grantEntryDate(grant.month, termStart);
              const entryDate = entryDates[grant.month] ?? defaultDate;
              return (
                <li
                  key={grant.month}
                  className="flex items-center gap-4 border-b border-border-soft py-3 last:border-b-0"
                >
                  <span className="font-latin w-14 text-sm font-bold">
                    {Number(grant.month.slice(5, 7))}月
                  </span>
                  <span className="font-latin w-28 text-[13px]">
                    ¥{grant.amount.toLocaleString("ja-JP")}
                  </span>
                  {grant.status === "available" ? (
                    <Input
                      type="date"
                      aria-label={`${Number(grant.month.slice(5, 7))}月分の支給日`}
                      className="font-latin w-40 flex-none"
                      value={entryDate}
                      min={defaultDate}
                      max={lastDayOf(grant.month)}
                      disabled={pending}
                      onChange={(event) =>
                        setEntryDates((current) => ({
                          ...current,
                          [grant.month]: event.target.value,
                        }))
                      }
                    />
                  ) : (
                    <span className="w-40 flex-none" />
                  )}
                  <span className="flex-1 text-xs text-muted-foreground">
                    {noteOf(grant, termStart)}
                  </span>
                  {grant.status === "registered" && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-hover">
                      <CheckCircle size={15} weight="fill" />
                      登録済み
                    </span>
                  )}
                  {grant.status === "available" && (
                    <Button
                      size="xs"
                      disabled={pending}
                      onClick={() => register(grant.month, entryDate)}
                    >
                      {pending && pendingMonth === grant.month ? "登録中…" : "この月を登録"}
                    </Button>
                  )}
                  {grant.status === "upcoming" && (
                    <span className="text-xs text-disabled-foreground">未到来</span>
                  )}
                </li>
              );
            })}
          </ul>
          {grants.length === 0 && (
            <p className="p-4 text-center text-sm text-muted-foreground">
              この年度に支給のある月はありません
            </p>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            支給日の初期値はその月の1日（当選月は当選日）です。実際の入金日に合わせて変更できます。
            登録した支給は下書きを経ずに「確認済」で作成されます（振込は機械的なため）。公開は公開画面から。
          </p>
        </CardContent>
      </Card>
    </>
  );
}
