"use client";
import { useEffect, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CaretDown, CaretUp, Plus } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import {
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Input,
  Label,
  NativeSelect,
  Tabs,
  TabsList,
  TabsTrigger,
  Textarea,
} from "@/client/components/ui";
import { DuplicateDocumentWarning } from "@/client/components/research-fund/DuplicateDocumentWarning";
import {
  JournalBulkActionBar,
  type BulkAction,
} from "@/client/components/research-fund/JournalBulkActionBar";
import { JournalCreateForm } from "@/client/components/research-fund/JournalCreateForm";
import { JournalEditor } from "@/client/components/research-fund/JournalEditor";
import { JournalList, JournalStatusPill } from "@/client/components/research-fund/JournalList";
import { PayeeLinkDialog } from "@/client/components/research-fund/PayeeLinkDialog";
import {
  settlementRejection,
  summarizeUnsettledAdvances,
} from "@/server/contexts/research-fund/domain/models/advance";
import { todayInJst } from "@/server/contexts/research-fund/domain/models/calendar-date";
import type { DuplicateDocuments } from "@/server/contexts/research-fund/domain/models/duplicate-document";
import {
  isAccountUnconfirmed,
  type JournalEdit,
  type ReviewAccount,
  type ReviewEntry,
} from "@/server/contexts/research-fund/domain/models/journal-review";
import {
  isPayeeUnset,
  payeeSearchQueryFromEntries,
  type PayeeFormInput,
  type PayeeSummary,
} from "@/server/contexts/research-fund/domain/models/payee";
import { isReceiptMissing } from "@/server/contexts/research-fund/domain/models/receipt-absence";
import {
  previewReread,
  REREAD_INSTRUCTION_MAX_LENGTH,
} from "@/server/contexts/research-fund/domain/models/scan-reread";
import type { AdminTarget } from "@/server/contexts/shared/domain/models/admin-target";
import { mutateJournalReview } from "@/server/contexts/research-fund/presentation/actions/manage-journal-review";
import { rereadScanDocuments } from "@/server/contexts/research-fund/presentation/actions/reread-scan-documents";
import { cn } from "@/client/lib";

const statuses = { all: "すべて", draft: "下書き", approved: "確認済", published: "公開中" };
export function JournalReview({
  entries,
  accounts,
  advancers,
  payees,
  duplicates,
  target,
  initialStatus,
}: {
  entries: ReviewEntry[];
  accounts: ReviewAccount[];
  /** 同じ議員室で過去に入力された立替者（入力欄の候補） */
  advancers: string[];
  /** 帳簿の議員の支払先（紐づけの候補）。別の議員の支払先は含まない */
  payees: PayeeSummary[];
  /** 書類 ID → 同じ書類を二重にスキャンした可能性のある相手の書類 */
  duplicates: DuplicateDocuments;
  target: Extract<AdminTarget, { kind: "research-fund" }>;
  /** スキャン画面の「完了分を確認へ」から下書きタブを開くための初期値 */
  initialStatus?: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(
    initialStatus && Object.hasOwn(statuses, initialStatus) ? initialStatus : "all",
  );
  const [month, setMonth] = useState("");
  const [advancer, setAdvancer] = useState("");
  const [unsettledOnly, setUnsettledOnly] = useState(false);
  const [payeeUnsetOnly, setPayeeUnsetOnly] = useState(false);
  const [receiptMissingOnly, setReceiptMissingOnly] = useState(false);
  const [linkingChecked, setLinkingChecked] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checked, setChecked] = useState<readonly string[]>([]);
  const [creating, setCreating] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [discardingChecked, setDiscardingChecked] = useState(false);
  const [unpublishing, setUnpublishing] = useState(false);
  const [numbering, setNumbering] = useState(false);
  const [rereading, setRereading] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assigned, setAssigned] = useState("");
  const [settling, setSettling] = useState(false);
  const [settledAt, setSettledAt] = useState("");
  const [today, setToday] = useState("");
  const [pending, startTransition] = useTransition();
  const monthly = entries.filter((e) => !month || e.entryDate.slice(5, 7) === month);
  // 立替の絞り込み。既存の月・状態の絞り込みと組み合わせられる（タブの件数もこの絞り込みの中で数える）。
  const filtered = monthly.filter(
    (e) =>
      (!unsettledOnly || (e.advancedBy !== null && e.settledAt === null)) &&
      (advancer === "" || e.advancedBy === advancer) &&
      (!payeeUnsetOnly || isPayeeUnset(e)) &&
      (!receiptMissingOnly || isReceiptMissing(e)),
  );
  const visible = filtered.filter((e) => status === "all" || e.status === status);
  // 支給も支出と同じく選べる。支給日の修正と確認済に戻す操作だけを許す（詳細側で制限する）。
  const selected = visible.find((e) => e.id === selectedId) ?? visible[0] ?? null;
  const index = visible.findIndex((e) => e.id === selected?.id);
  // まとめて操作できるのは、いま表示している支出だけ（支給・返還は立替情報を持てないので対象外）。
  // 公開中も選べる：立替者の設定と精算は公開内容を変えない事務所内の操作で、精算できるのは
  // 金額が確定した確認済・公開中だけ。状態を変える操作（確認済にする・破棄など）は
  // 選んだ仕訳の状態に応じてボタンを出し分ける。
  const checkable = visible.filter((e) => e.source !== "grant");
  const checkedEntries = checkable.filter((e) => checked.includes(e.id));
  const allChecked = checkable.length > 0 && checkedEntries.length === checkable.length;
  // 確認済にする・読み直すは下書きだけ、下書きに戻すは確認済だけに使える。
  // 混ぜて選んだときは一部だけに適用されないよう、両方に使える破棄だけを許す。
  const checkedKind = checkedEntries.every((e) => e.status === "draft")
    ? "draft"
    : checkedEntries.every((e) => e.status === "approved")
      ? "approved"
      : "mixed";
  // 読み直しは書類単位。選んでいない同じ書類の下書きも作り直し、確認済・公開中を含む書類は外す。
  const reread = previewReread(checkedEntries, entries);
  // 立替者の設定・解除は未精算なら状態を問わない。精算は確認済・公開中の未精算の立替だけ。
  // 破棄は公開中と精算済を含められない。いずれも「全件か無し」なので、全件に使えるときだけ出す。
  // 精算済は中身を変えられない（金額・立替者の変更と破棄、下書きに戻すのを禁じる）。
  const allUnsettled =
    checkedEntries.length > 0 && checkedEntries.every((e) => e.settledAt === null);
  const assignable = allUnsettled;
  const settlable =
    checkedEntries.length > 0 && checkedEntries.every((e) => settlementRejection(e) === null);
  const unsettleable =
    checkedEntries.length > 0 && checkedEntries.every((e) => e.settledAt !== null);
  const discardable = allUnsettled && checkedEntries.every((e) => e.status !== "published");
  const revertable = checkedKind === "approved" && allUnsettled;
  // 確認ダイアログに出す、選んだ立替の立替者ごとの合計額
  const settlementTotals = summarizeUnsettledAdvances(checkedEntries);
  // 精算日の下限。立て替えた日より前に精算することはないので、選んだ仕訳の最も新しい日付。
  const settlementMin = checkedEntries.reduce(
    (max, e) => (e.entryDate > max ? e.entryDate : max),
    "",
  );
  // 選んだ仕訳の支払先が 1 つに揃っていれば、まとめて紐づけるダイアログの初期値にする。
  const checkedPayeeIds = new Set(checkedEntries.map((e) => e.payeeId));
  const checkedPayeeId = checkedPayeeIds.size === 1 ? [...checkedPayeeIds][0] : null;
  // 支払先が未設定の支出の件数（帳簿全体）。絞り込みの目安にする。
  const payeeUnsetCount = entries.filter(isPayeeUnset).length;
  // 書類も徴し難かった事情もない支出の件数（帳簿全体）。議員課への提出前に埋める目安にする。
  const receiptMissingCount = entries.filter(isReceiptMissing).length;
  // 領収書等番号を振る対象になる書類の数（公開中の仕訳が紐づく未採番の書類。帳簿全体）。
  const unnumberedDocumentCount = new Set(
    entries.flatMap((e) =>
      e.status === "published" && e.documentId !== null && e.receiptNumber === null
        ? [e.documentId]
        : [],
    ),
  ).size;
  const payeeNames = new Map(payees.map((p) => [p.id, p.name]));
  // 帳簿全体の未精算（立替者ごとの件数と合計額）。絞り込みに関わらず帳簿の全件で数える。
  const unsettledSummary = summarizeUnsettledAdvances(entries);
  // 立替者の絞り込みの選択肢。この帳簿に実際に入力されている立替者だけを出す。
  const bookAdvancers = [
    ...new Set(entries.flatMap((e) => (e.advancedBy === null ? [] : [e.advancedBy]))),
  ].sort((a, b) => a.localeCompare(b, "ja"));
  function allowLeave() {
    return (
      !document.querySelector('[data-journal-dirty="true"]') ||
      window.confirm("未保存の変更を破棄して移動しますか？")
    );
  }
  function select(id: string) {
    if (id !== selected?.id && !pending && allowLeave()) setSelectedId(id);
  }
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (
        pending ||
        creating ||
        rereading ||
        linkingChecked ||
        discarding ||
        discardingChecked ||
        unpublishing ||
        numbering ||
        event.defaultPrevented ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        (event.key !== "ArrowUp" && event.key !== "ArrowDown")
      )
        return;
      const element = event.target;
      if (
        element instanceof HTMLElement &&
        element.closest(
          'input, textarea, select, button, a, [role="combobox"], [role="tab"], [contenteditable="true"], [role="dialog"]',
        )
      )
        return;
      const next = visible[index + (event.key === "ArrowDown" ? 1 : -1)];
      if (next) {
        event.preventDefault();
        select(next.id);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  function toggle(id: string) {
    setChecked((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  }
  function approveChecked() {
    const targets = checkedEntries.map((e) => ({ id: e.id, updatedAt: e.updatedAt }));
    startTransition(async () => {
      try {
        const result = await mutateJournalReview(target.politicianId, target.bookId, {
          type: "approve-many",
          targets,
        });
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        const { approved = 0, skipped = 0 } = result.approved ?? {};
        toast.success(
          skipped > 0
            ? `${approved}件を確認済にしました（科目が要確認の${skipped}件は下書きのまま残しました）`
            : `${approved}件を確認済にしました`,
        );
        setChecked([]);
        router.refresh();
      } catch {
        toast.error("通信に失敗しました。再度お試しください");
      }
    });
  }
  function discardChecked() {
    const targets = checkedEntries.map((e) => ({ id: e.id, updatedAt: e.updatedAt }));
    startTransition(async () => {
      try {
        const result = await mutateJournalReview(target.politicianId, target.bookId, {
          type: "discard-many",
          targets,
        });
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success(`${result.discarded ?? 0}件の仕訳を破棄しました`);
        setDiscardingChecked(false);
        setChecked([]);
        router.refresh();
      } catch {
        toast.error("通信に失敗しました。再度お試しください");
      }
    });
  }
  function revertChecked() {
    const targets = checkedEntries.map((e) => ({ id: e.id, updatedAt: e.updatedAt }));
    startTransition(async () => {
      try {
        const result = await mutateJournalReview(target.politicianId, target.bookId, {
          type: "revert-many-to-draft",
          targets,
        });
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success(`${result.reverted ?? 0}件の仕訳を下書きに戻しました`);
        setChecked([]);
        router.refresh();
      } catch {
        toast.error("通信に失敗しました。再度お試しください");
      }
    });
  }
  function rereadChecked() {
    const entryIds = checkedEntries.map((e) => e.id);
    startTransition(async () => {
      try {
        const result = await rereadScanDocuments(target.politicianId, target.bookId, {
          entryIds,
          instruction,
        });
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success(
          result.excludedCount > 0
            ? `${result.documentCount}件の書類を読み直し待ちに追加しました（確認済・公開中の仕訳を含む${result.excludedCount}件の書類は対象外です）`
            : `${result.documentCount}件の書類を読み直し待ちに追加しました`,
          { description: "スキャン画面の「処理する」で読み直しが進みます" },
        );
        setRereading(false);
        setInstruction("");
        setChecked([]);
        router.push(`/politicians/${target.politicianId}/books/${target.bookId}/scan`);
      } catch {
        toast.error("通信に失敗しました。再度お試しください");
      }
    });
  }
  /**
   * 立替者をまとめて設定・解除する（1 件の編集も選択 1 件として同じ経路で送る）。
   * 立替情報は公開内容を変えないので、公開中の仕訳でも送れる。
   */
  function assignAdvancedBy(entriesToSet: readonly ReviewEntry[], advancedBy: string) {
    const targets = entriesToSet.map((e) => ({ id: e.id, updatedAt: e.updatedAt }));
    startTransition(async () => {
      try {
        const result = await mutateJournalReview(target.politicianId, target.bookId, {
          type: "set-advanced-by",
          targets,
          advancedBy,
        });
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        const { updated = 0, advancedBy: saved = null } = result.advance ?? {};
        toast.success(
          saved === null
            ? `${updated}件の立替者を解除しました`
            : `${updated}件の立替者を「${saved}」にしました`,
        );
        setAssigning(false);
        setAssigned("");
        setChecked([]);
        router.refresh();
      } catch {
        toast.error("通信に失敗しました。再度お試しください");
      }
    });
  }
  /**
   * 立替をまとめて精算済にする（1 件の立替者の欄からの精算も選択 1 件として同じ経路で送る）。
   * 精算日の検証と精算できる条件はサーバー側（usecase とドメイン）で判定する。
   */
  function settle(entriesToSettle: readonly ReviewEntry[], date: string) {
    const targets = entriesToSettle.map((e) => ({ id: e.id, updatedAt: e.updatedAt }));
    startTransition(async () => {
      try {
        const result = await mutateJournalReview(target.politicianId, target.bookId, {
          type: "settle-many",
          targets,
          settledAt: date,
        });
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        const { settled = 0, settledAt: saved = date } = result.settlement ?? {};
        toast.success(`${settled}件の立替を精算済（${saved.replaceAll("-", ".")}）にしました`);
        setSettling(false);
        setChecked([]);
        router.refresh();
      } catch {
        toast.error("通信に失敗しました。再度お試しください");
      }
    });
  }
  function unsettle(entriesToUnsettle: readonly ReviewEntry[]) {
    const targets = entriesToUnsettle.map((e) => ({ id: e.id, updatedAt: e.updatedAt }));
    startTransition(async () => {
      try {
        const result = await mutateJournalReview(target.politicianId, target.bookId, {
          type: "unsettle-many",
          targets,
        });
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success(`${result.unsettled ?? 0}件を未精算に戻しました`);
        setChecked([]);
        router.refresh();
      } catch {
        toast.error("通信に失敗しました。再度お試しください");
      }
    });
  }
  /**
   * 支払先をまとめて紐づける・外す（1 件の支払先の欄からも、同じ書類の仕訳を含めて同じ経路で送る）。
   * 支払先は公開内容を変えないので、公開中の仕訳でも送れる。紐づけ元は「手動」として記録される。
   */
  function linkPayee(entriesToLink: readonly ReviewEntry[], payeeId: string | null) {
    const targets = entriesToLink.map((e) => ({ id: e.id, updatedAt: e.updatedAt }));
    startTransition(async () => {
      try {
        const result = await mutateJournalReview(target.politicianId, target.bookId, {
          type: "set-payee",
          targets,
          payeeId,
        });
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        const { updated = 0, payee = null } = result.payeeLink ?? {};
        toast.success(
          payee === null
            ? `${updated}件の支払先を外しました`
            : `${updated}件の支払先を「${payee.name}」にしました`,
        );
        setLinkingChecked(false);
        setChecked([]);
        router.refresh();
      } catch {
        toast.error("通信に失敗しました。再度お試しください");
      }
    });
  }
  function createPayeeAndLink(entriesToLink: readonly ReviewEntry[], input: PayeeFormInput) {
    const targets = entriesToLink.map((e) => ({ id: e.id, updatedAt: e.updatedAt }));
    startTransition(async () => {
      try {
        const result = await mutateJournalReview(target.politicianId, target.bookId, {
          type: "create-payee-and-link",
          targets,
          payee: input,
        });
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        const { updated = 0, payee = null } = result.payeeLink ?? {};
        toast.success(`支払先「${payee?.name ?? input.name}」を作成し、${updated}件に紐づけました`);
        setLinkingChecked(false);
        setChecked([]);
        router.refresh();
      } catch {
        toast.error("通信に失敗しました。再度お試しください");
      }
    });
  }
  /** 帳簿の未採番の書類に領収書等番号を振る（採番済みの番号は変えない） */
  function assignReceiptNumbers() {
    startTransition(async () => {
      try {
        const result = await mutateJournalReview(target.politicianId, target.bookId, {
          type: "assign-receipt-numbers",
        });
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        const assigned = result.receiptNumbers?.assigned ?? 0;
        toast.success(
          assigned > 0
            ? `${assigned}件の書類に領収書等番号を振りました`
            : "番号を振る書類はありませんでした",
        );
        setNumbering(false);
        router.refresh();
      } catch {
        toast.error("通信に失敗しました。再度お試しください");
      }
    });
  }
  /** 書類の無い支出の徴し難かった事情を保存する（空欄なら削除）。公開内容は変えないので公開中の仕訳でも送れる */
  function saveReceiptAbsenceReason(entry: ReviewEntry, reason: string) {
    startTransition(async () => {
      try {
        const result = await mutateJournalReview(target.politicianId, target.bookId, {
          type: "set-receipt-absence-reason",
          id: entry.id,
          updatedAt: entry.updatedAt,
          reason,
        });
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success(
          result.receiptAbsence?.receiptAbsenceReason == null
            ? "徴し難かった事情を削除しました"
            : "徴し難かった事情を保存しました",
        );
        router.refresh();
      } catch {
        toast.error("通信に失敗しました。再度お試しください");
      }
    });
  }
  function create(input: JournalEdit) {
    startTransition(async () => {
      try {
        const result = await mutateJournalReview(target.politicianId, target.bookId, {
          type: "create",
          input,
        });
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success("下書きを作成しました");
        if (result.id) {
          setStatus("all");
          setMonth("");
          setSelectedId(result.id);
          setChecked([]);
        }
        setCreating(false);
        router.refresh();
      } catch {
        toast.error("通信に失敗しました。再度お試しください");
      }
    });
  }
  /**
   * 選んだ仕訳を保存する（approve なら確認済にもする）。編集ビューで立替者を変えていれば
   * （advancedBy が null でなければ）、仕訳の保存が成功したあとに続けて立替者も送る。
   * 立替者の更新も画面の持つ更新時刻で同時更新を検出するので、仕訳の保存が返す保存後の更新時刻で送る。
   */
  function save(input: JournalEdit, approve: boolean, advancedBy: string | null) {
    if (!selected) return;
    const entry = selected;
    const done = approve ? "確認済にしました" : "保存しました";
    startTransition(async () => {
      try {
        const result = await mutateJournalReview(target.politicianId, target.bookId, {
          type: "save",
          id: entry.id,
          updatedAt: entry.updatedAt,
          input,
          approve,
        });
        if (!result.success) {
          toast.error(
            result.error,
            advancedBy === null ? undefined : { description: "立替者の変更も保存していません" },
          );
          return;
        }
        if (advancedBy === null) toast.success(done);
        else
          await saveAdvancedByAfter(
            entry,
            result.saved?.updatedAt ?? entry.updatedAt,
            advancedBy,
            done,
          );
        router.refresh();
      } catch {
        toast.error("通信に失敗しました。再度お試しください");
      }
    });
  }
  /** 仕訳の保存に続けて立替者を送る。失敗したら、仕訳は保存済みで立替者だけが失敗したと分かるように出す */
  async function saveAdvancedByAfter(
    entry: ReviewEntry,
    updatedAt: string,
    advancedBy: string,
    done: string,
  ) {
    const failed = `仕訳は${done.replace(/しました$/, "")}しましたが、立替者を保存できませんでした`;
    try {
      const result = await mutateJournalReview(target.politicianId, target.bookId, {
        type: "set-advanced-by",
        targets: [{ id: entry.id, updatedAt }],
        advancedBy,
      });
      if (!result.success) {
        toast.error(failed, { description: result.error });
        return;
      }
      const saved = result.advance?.advancedBy ?? null;
      toast.success(
        saved === null
          ? `${done}（立替者を解除しました）`
          : `${done}（立替者を「${saved}」にしました）`,
      );
    } catch {
      toast.error(failed, { description: "通信に失敗しました。再度お試しください" });
    }
  }
  function unpublish() {
    if (!selected) return;
    startTransition(async () => {
      try {
        const result = await mutateJournalReview(target.politicianId, target.bookId, {
          type: "unpublish",
          id: selected.id,
          updatedAt: selected.updatedAt,
        });
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success("確認済に戻しました。修正して改めて公開できます");
        if (result.cacheWarning)
          toast.warning(
            `確認済に戻しましたが、まる見えの更新に失敗しました: ${result.cacheWarning}`,
          );
        setUnpublishing(false);
        router.refresh();
      } catch {
        toast.error("通信に失敗しました。再度お試しください");
      }
    });
  }
  function revertToDraft() {
    if (!selected || !allowLeave()) return;
    startTransition(async () => {
      try {
        const result = await mutateJournalReview(target.politicianId, target.bookId, {
          type: "revert-to-draft",
          id: selected.id,
          updatedAt: selected.updatedAt,
        });
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success("下書きに戻しました");
        router.refresh();
      } catch {
        toast.error("通信に失敗しました。再度お試しください");
      }
    });
  }
  function discard() {
    if (!selected) return;
    startTransition(async () => {
      try {
        const result = await mutateJournalReview(target.politicianId, target.bookId, {
          type: "discard",
          id: selected.id,
          updatedAt: selected.updatedAt,
        });
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success("仕訳を破棄しました");
        setDiscarding(false);
        router.refresh();
      } catch {
        toast.error("通信に失敗しました。再度お試しください");
      }
    });
  }
  // 二重スキャンの警告は下書きにだけ出す（確認済にする前に気づけるように）
  const duplicatesOf = (entry: ReviewEntry) =>
    entry.status === "draft" && entry.documentId !== null
      ? (duplicates[entry.documentId] ?? [])
      : [];
  const documentUrl = selected?.documentId
    ? `/api/research-fund/documents/${selected.documentId}?bookId=${target.bookId}&politicianId=${target.politicianId}`
    : undefined;
  // 絞り込みを変えるときは、未保存の変更を確認してから選択とチェックを外す
  function changeFilter(apply: () => void) {
    if (!allowLeave()) return;
    apply();
    setSelectedId(null);
    setChecked([]);
  }
  const unsettledCount = unsettledSummary.reduce((sum, row) => sum + row.count, 0);
  const unsettledTotal = unsettledSummary.reduce((sum, row) => sum + row.total, 0);
  // まとめて操作バーのボタン（表示条件を満たすものだけ。並び順のまま右端が primary）
  const bulkActions = (
    [
      { shown: true, label: "選択を解除", variant: "outline", onSelect: () => setChecked([]) },
      {
        shown: true,
        label: "支払先をまとめて設定",
        variant: "outline",
        onSelect: () => {
          if (allowLeave()) setLinkingChecked(true);
        },
      },
      {
        shown: assignable,
        label: "立替者をまとめて設定",
        variant: "outline",
        onSelect: () => {
          if (allowLeave()) {
            setAssigned("");
            setAssigning(true);
          }
        },
      },
      {
        shown: unsettleable,
        label: "まとめて未精算に戻す",
        variant: "outline",
        onSelect: () => unsettle(checkedEntries),
      },
      {
        shown: checkedKind === "draft",
        label: "LLMで読み直す",
        variant: "outline",
        onSelect: () => {
          if (allowLeave()) setRereading(true);
        },
      },
      {
        shown: discardable,
        label: "まとめて破棄",
        variant: "destructive",
        onSelect: () => {
          if (allowLeave()) setDiscardingChecked(true);
        },
      },
      {
        shown: revertable,
        label: "まとめて下書きに戻す",
        variant: "default",
        onSelect: () => {
          if (allowLeave()) revertChecked();
        },
      },
      {
        shown: settlable,
        label: "まとめて精算",
        variant: "default",
        onSelect: () => {
          if (allowLeave()) {
            const jst = todayInJst(new Date());
            setToday(jst);
            setSettledAt(jst);
            setSettling(true);
          }
        },
      },
      {
        shown: checkedKind === "draft",
        label: "まとめて確認済にする",
        variant: "default",
        onSelect: approveChecked,
      },
    ] satisfies (BulkAction & { shown: boolean })[]
  ).filter((action) => action.shown);
  return (
    <div className="flex flex-col gap-2.5 xl:h-[calc(100vh-2.5rem)]">
      <div className="flex min-h-9 flex-wrap items-center gap-3">
        <h1 className="text-lg font-bold tracking-[0.04em]">仕訳の確認・編集</h1>
        <span className="text-xs text-muted-foreground">
          {target.name}・<span className="font-latin">{target.year}</span>年
        </span>
        <div className="ml-auto flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            disabled={pending}
            onClick={() => {
              if (allowLeave()) setNumbering(true);
            }}
          >
            領収書等番号を振る
          </Button>
          <Button
            size="sm"
            className="text-xs"
            disabled={pending}
            onClick={() => {
              if (allowLeave()) setCreating(true);
            }}
          >
            <Plus aria-hidden />
            手動で仕訳を作成
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Tabs
          value={status}
          onValueChange={(value) => {
            if (!pending) changeFilter(() => setStatus(value));
          }}
        >
          <TabsList aria-label="仕訳の状態" className="h-8">
            {Object.entries(statuses).map(([key, label]) => (
              <TabsTrigger key={key} value={key} className="flex-none px-3.5 text-xs">
                {label}{" "}
                <span className="font-latin">
                  {filtered.filter((e) => key === "all" || e.status === key).length}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <span aria-hidden className="mx-1 h-5 w-px bg-border-soft" />
        <NativeSelect
          aria-label="月"
          value={month}
          disabled={pending}
          className="h-8 text-xs"
          onChange={(e) => {
            const value = e.target.value;
            changeFilter(() => setMonth(value));
          }}
        >
          <option value="">すべての月</option>
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i} value={String(i + 1).padStart(2, "0")}>
              {i + 1}月
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          aria-label="立替者で絞り込み"
          value={advancer}
          disabled={pending}
          className="h-8 text-xs"
          onChange={(e) => {
            const value = e.target.value;
            changeFilter(() => setAdvancer(value));
          }}
        >
          <option value="">すべての立替者</option>
          {bookAdvancers.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </NativeSelect>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-muted-foreground">要対応</span>
          <FilterChip
            pressed={payeeUnsetOnly}
            tone={payeeUnsetCount > 0 ? "destructive" : "none"}
            disabled={pending}
            onClick={() => changeFilter(() => setPayeeUnsetOnly((current) => !current))}
          >
            支払先 未設定 <span className="font-latin font-bold">{payeeUnsetCount}</span>
          </FilterChip>
          <FilterChip
            pressed={receiptMissingOnly}
            tone={receiptMissingCount > 0 ? "destructive" : "none"}
            disabled={pending}
            onClick={() => changeFilter(() => setReceiptMissingOnly((current) => !current))}
          >
            書類も事情もない <span className="font-latin font-bold">{receiptMissingCount}</span>
          </FilterChip>
          {(unsettledSummary.length > 0 || unsettledOnly) && (
            <FilterChip
              pressed={unsettledOnly}
              tone="primary"
              disabled={pending}
              title={unsettledSummary
                .map(
                  (row) =>
                    `${row.advancedBy}：¥${row.total.toLocaleString("ja-JP")}（${row.count}件）`,
                )
                .join("\n")}
              onClick={() => changeFilter(() => setUnsettledOnly((current) => !current))}
            >
              未精算の立替{" "}
              <span className="font-bold">
                <span className="font-latin">{unsettledCount}</span>件{" "}
                <span className="font-latin">¥{unsettledTotal.toLocaleString("ja-JP")}</span>
              </span>
            </FilterChip>
          )}
        </div>
      </div>
      <div className="grid gap-3 xl:min-h-0 xl:flex-1 xl:grid-cols-[minmax(0,1fr)_400px] min-[1440px]:grid-cols-[minmax(0,1fr)_452px]">
        <JournalList
          visible={visible}
          entries={entries}
          selectedId={selected?.id ?? null}
          checked={checked}
          checkable={checkable}
          pending={pending}
          payeeNames={payeeNames}
          isDuplicated={(entry) => duplicatesOf(entry).length > 0}
          onSelect={select}
          onToggle={toggle}
          onToggleAll={() => setChecked(allChecked ? [] : checkable.map((e) => e.id))}
          overlay={
            checkedEntries.length > 0 && (
              <JournalBulkActionBar
                count={checkedEntries.length}
                mixed={checkedKind === "mixed"}
                pending={pending}
                actions={bulkActions}
              />
            )
          }
        />
        <Card className="gap-0 overflow-hidden py-0 xl:min-h-0">
          {selected ? (
            <>
              <div className="flex shrink-0 items-center gap-3 border-b border-border-soft px-3.5 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-[14.5px] font-bold">{selected.description}</h2>
                    <JournalStatusPill status={selected.status} />
                  </div>
                  <p className="font-latin text-[11px] text-muted-foreground">
                    {index + 1} / {visible.length}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="前へ"
                  disabled={pending || index <= 0}
                  onClick={() => select(visible[index - 1].id)}
                >
                  <CaretUp aria-hidden />
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="次へ"
                  disabled={pending || index >= visible.length - 1}
                  onClick={() => select(visible[index + 1].id)}
                >
                  <CaretDown aria-hidden />
                </Button>
              </div>
              <JournalEditor
                key={`${selected.id}:${selected.updatedAt}`}
                entry={selected}
                entries={entries}
                accounts={accounts}
                advancers={advancers}
                payees={payees}
                target={target}
                documentUrl={documentUrl}
                banner={
                  <DuplicateDocumentWarning
                    duplicates={duplicatesOf(selected)}
                    bookId={target.bookId}
                    politicianId={target.politicianId}
                    className="rounded-md border border-destructive px-2.5 py-1.5"
                  />
                }
                pending={pending}
                allowLeave={allowLeave}
                onSave={save}
                onDiscard={() => setDiscarding(true)}
                onUnpublish={() => setUnpublishing(true)}
                onRevertToDraft={revertToDraft}
                // 事務所内の管理の更新後は router.refresh() で編集フォームが作り直されるので、
                // 仕訳の編集フォームに未保存の変更があるときは、どの操作でも先に確認する
                onSetAdvancedBy={(advancedBy) => {
                  if (allowLeave()) assignAdvancedBy([selected], advancedBy);
                }}
                onSettle={(date) => {
                  if (allowLeave()) settle([selected], date);
                }}
                onUnsettle={() => {
                  if (allowLeave()) unsettle([selected]);
                }}
                onSaveReceiptAbsenceReason={(reason) => {
                  if (allowLeave()) saveReceiptAbsenceReason(selected, reason);
                }}
                onLinkPayee={(targets, payeeId) => {
                  if (allowLeave()) linkPayee(targets, payeeId);
                }}
                onCreatePayee={(targets, input) => {
                  if (allowLeave()) createPayeeAndLink(targets, input);
                }}
              />
            </>
          ) : (
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">
                仕訳を作成すると、ここで確認できます。
              </p>
            </CardContent>
          )}
        </Card>
      </div>
      <Dialog
        open={creating}
        onOpenChange={(open) => {
          if (!pending && (open || allowLeave())) setCreating(open);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>手動で仕訳を作成</DialogTitle>
            <DialogDescription>領収書なしの支出を下書きとして登録します。</DialogDescription>
          </DialogHeader>
          <JournalCreateForm
            accounts={accounts.filter((a) => !isAccountUnconfirmed(a.key))}
            year={target.year}
            pending={pending}
            onCreate={create}
          />
        </DialogContent>
      </Dialog>
      <Dialog
        open={rereading}
        onOpenChange={(open) => {
          if (!pending) setRereading(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>LLMで読み直しますか？</DialogTitle>
            <DialogDescription>
              選んだ下書きの書類を、指示を添えて読み直します。読み直しは書類ごとに行い、
              その書類から作られた下書きはすべて、読み直した結果に置き換わります（選んでいない下書きも含みます）。
              備考・特記事項や支出群への所属は引き継がれません（立替者は、その書類の下書きで 1
              種類だけなら引き継ぎます）。
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="reread-instruction">どう読み直すか</Label>
            <Textarea
              id="reread-instruction"
              value={instruction}
              maxLength={REREAD_INSTRUCTION_MAX_LENGTH}
              rows={4}
              disabled={pending}
              placeholder="例：会議室代と来客用のお茶代は異なるから、これらは別の科目として入れ直してください"
              onChange={(e) => setInstruction(e.target.value)}
            />
          </div>
          <ul className="list-disc pl-5 text-sm text-muted-foreground">
            <li>
              読み直す書類：
              <span className="font-latin">{reread.documentCount}</span>
              件（作り直す下書き
              <span className="font-latin">{reread.draftCount}</span>件）
            </li>
            {reread.excludedDocumentCount > 0 && (
              <li className="text-destructive">
                確認済・公開中の仕訳を含む書類
                <span className="font-latin">{reread.excludedDocumentCount}</span>
                件は対象外です（その仕訳は消えません）
              </li>
            )}
            {reread.mixedAdvancerDocumentCount > 0 && (
              <li className="text-destructive">
                立替者が混ざっている書類
                <span className="font-latin">{reread.mixedAdvancerDocumentCount}</span>
                件は立替者を引き継げません（読み直したあとに入れ直してください）
              </li>
            )}
            {reread.withoutDocumentCount > 0 && (
              <li>
                書類の紐づかない下書き
                <span className="font-latin">{reread.withoutDocumentCount}</span>
                件は対象外です
              </li>
            )}
            <li>読み直しはスキャン画面で進み、失敗したときは元の下書きが残ります</li>
          </ul>
          <DialogFooter>
            <Button variant="outline" disabled={pending} onClick={() => setRereading(false)}>
              キャンセル
            </Button>
            <Button
              disabled={pending || reread.documentCount === 0 || instruction.trim().length === 0}
              onClick={rereadChecked}
            >
              読み直す
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={numbering}
        onOpenChange={(open) => {
          if (!pending) setNumbering(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>領収書等番号を振りますか？</DialogTitle>
            <DialogDescription>
              公開中の仕訳が紐づく未採番の書類（
              <span className="font-latin">{unnumberedDocumentCount}</span>
              件）に、仕訳の日付の早い順で番号を振ります。
              すでに振った番号は変わらず、新しい番号は帳簿内の最大の番号の続きから振ります。
              振った番号は後から変更できません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" disabled={pending} onClick={() => setNumbering(false)}>
              キャンセル
            </Button>
            <Button disabled={pending} onClick={assignReceiptNumbers}>
              番号を振る
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={unpublishing}
        onOpenChange={(open) => {
          if (!pending) setUnpublishing(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>確認済に戻しますか？</DialogTitle>
            <DialogDescription>
              「{selected?.description}
              」は「調研費まる見え」の公開ページから消えます。
              修正したあと、公開画面から改めて公開してください。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" disabled={pending} onClick={() => setUnpublishing(false)}>
              キャンセル
            </Button>
            <Button disabled={pending} onClick={unpublish}>
              確認済に戻す
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={discarding}
        onOpenChange={(open) => {
          if (!pending) setDiscarding(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>仕訳を破棄しますか？</DialogTitle>
            <DialogDescription>
              「{selected?.description}
              」を削除します。この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" disabled={pending} onClick={() => setDiscarding(false)}>
              キャンセル
            </Button>
            <Button variant="destructive" disabled={pending} onClick={discard}>
              破棄する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={discardingChecked}
        onOpenChange={(open) => {
          if (!pending) setDiscardingChecked(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>選んだ仕訳を破棄しますか？</DialogTitle>
            <DialogDescription>
              選択中の{checkedEntries.length}
              件の仕訳を削除します。この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => setDiscardingChecked(false)}
            >
              キャンセル
            </Button>
            <Button variant="destructive" disabled={pending} onClick={discardChecked}>
              破棄する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={assigning}
        onOpenChange={(open) => {
          if (!pending) setAssigning(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>立替者をまとめて設定しますか？</DialogTitle>
            <DialogDescription>
              選択中の{checkedEntries.length}
              件に同じ立替者を設定します。空欄のまま設定すると立替を解除します
              （調研費口座からの直接支出になります）。立替は事務所内の管理情報なので、公開ページの内容は変わりません。
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="assign-advanced-by">立替者</Label>
            <Input
              id="assign-advanced-by"
              list="assign-advancers"
              maxLength={255}
              disabled={pending}
              value={assigned}
              placeholder="立て替えた人（空欄なら立替なし）"
              onChange={(e) => setAssigned(e.target.value)}
            />
            <datalist id="assign-advancers">
              {advancers.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={pending} onClick={() => setAssigning(false)}>
              キャンセル
            </Button>
            <Button disabled={pending} onClick={() => assignAdvancedBy(checkedEntries, assigned)}>
              設定する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <PayeeLinkDialog
        // 開くたびに選んだ仕訳の支払先から選び直せるよう、開閉で作り直す
        key={`payee-link:${linkingChecked}`}
        open={linkingChecked}
        onOpenChange={setLinkingChecked}
        description={`選択中の${checkedEntries.length}件に同じ支払先を紐づけます。支払先は議員課に提出する帳簿に使う情報で、公開ページの内容は変わりません。`}
        payees={payees}
        currentPayeeId={checkedPayeeId}
        target={target}
        defaultSearchQuery={payeeSearchQueryFromEntries(checkedEntries)}
        pending={pending}
        onLink={(payeeId) => linkPayee(checkedEntries, payeeId)}
        onCreate={(input) => createPayeeAndLink(checkedEntries, input)}
      />
      <Dialog
        open={settling}
        onOpenChange={(open) => {
          if (!pending) setSettling(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>選んだ立替を精算済にしますか？</DialogTitle>
            <DialogDescription>
              選択中の{checkedEntries.length}
              件の立替を、指定した精算日で精算済にします。
              調研費口座から立替者へ移した額と、下の合計額が合っているか確認してください。
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="settle-date">精算日</Label>
            <Input
              id="settle-date"
              type="date"
              required
              min={settlementMin}
              max={today || undefined}
              disabled={pending}
              value={settledAt}
              onChange={(e) => setSettledAt(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              未来の日付と、仕訳の日付（{settlementMin}
              ）より前の日付は指定できません
            </p>
          </div>
          <ul className="list-disc pl-5 text-sm">
            {settlementTotals.map((row) => (
              <li key={row.advancedBy}>
                {row.advancedBy}：
                <span className="font-latin font-bold">¥{row.total.toLocaleString("ja-JP")}</span>
                <span className="ml-1 text-muted-foreground">
                  （<span className="font-latin">{row.count}</span>件）
                </span>
              </li>
            ))}
          </ul>
          <DialogFooter>
            <Button variant="outline" disabled={pending} onClick={() => setSettling(false)}>
              キャンセル
            </Button>
            <Button
              disabled={pending || settledAt === ""}
              onClick={() => settle(checkedEntries, settledAt)}
            >
              精算済にする
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const chipTones = {
  destructive: {
    off: "border-destructive bg-card text-destructive hover:bg-destructive-hover",
    on: "border-destructive bg-destructive text-destructive-foreground",
  },
  primary: {
    off: "border-primary bg-accent text-accent-foreground hover:bg-card",
    on: "border-primary bg-primary text-primary-foreground",
  },
  none: {
    off: "border-disabled-border bg-card text-subtle-foreground hover:bg-background",
    on: "border-subtle-foreground bg-subtle-foreground text-primary-foreground",
  },
};
/** ツールバーの要対応チップ（押すと絞り込みを ON/OFF する） */
function FilterChip({
  pressed,
  tone,
  disabled,
  title,
  onClick,
  children,
}: {
  pressed: boolean;
  tone: keyof typeof chipTones;
  disabled: boolean;
  title?: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      disabled={disabled}
      title={title}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-xs transition-colors duration-150 ease-out outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed",
        chipTones[tone][pressed ? "on" : "off"],
      )}
    >
      {children}
    </button>
  );
}
