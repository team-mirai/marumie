"use client";
import { useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Plus, Trash } from "@phosphor-icons/react/dist/ssr";
import { Button, Card, CardContent, Input, Label, NativeSelect } from "@/client/components/ui";
import {
  POLITICIAN_HOUSE_LABELS,
  POLITICIAN_HOUSES,
  type Politician,
  type PoliticianInput,
} from "@/shared/models/politician";
import { savePolitician } from "@/server/contexts/shared/presentation/actions/manage-politician";

export function PoliticianForm({
  politician,
  organizations,
}: {
  politician?: Politician;
  organizations: { id: string; displayName: string }[];
}) {
  const router = useRouter();
  const [data, setData] = useState<PoliticianInput>(
    politician
      ? {
          name: politician.name,
          slug: politician.slug,
          termStart: politician.termStart,
          politicalOrganizationId: politician.politicalOrganizationId,
          nameKana: politician.nameKana,
          house: politician.house,
          constituency: politician.constituency,
          profileUrl: politician.profileUrl,
          websiteUrl: politician.websiteUrl,
          snsUrls: politician.snsUrls,
        }
      : {
          name: "",
          slug: "",
          termStart: "",
          politicalOrganizationId: "",
          nameKana: "",
          house: "",
          constituency: "",
          profileUrl: "",
          websiteUrl: "",
          snsUrls: [],
        },
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Card>
      <CardContent>
        <form
          noValidate
          className="space-y-5"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setError(null);
            try {
              const result = await savePolitician(politician?.id ?? null, data);
              if (!result.success) {
                setError(result.error);
                toast.error(result.error);
                return;
              }
              toast.success(politician ? "議員を更新しました" : "議員を作成しました");
              router.push("/politicians");
              router.refresh();
            } catch {
              const message = "保存に失敗しました。もう一度お試しください";
              setError(message);
              toast.error(message);
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
          {(
            [
              { key: "name", label: "氏名", type: "text" },
              { key: "slug", label: "スラッグ", type: "text" },
              { key: "termStart", label: "当選日（支給の起点）", type: "date" },
            ] as const
          ).map((field) => (
            <div key={field.key} className="space-y-2">
              <Label htmlFor={field.key}>
                {field.label} <span className="text-destructive">*</span>
              </Label>
              <Input
                id={field.key}
                type={field.type}
                required
                disabled={busy}
                value={data[field.key]}
                onChange={(event) => setData({ ...data, [field.key]: event.target.value })}
                className="max-w-md"
              />
            </div>
          ))}
          <div className="space-y-2">
            <Label htmlFor="organization">所属（任意）</Label>
            <NativeSelect
              id="organization"
              disabled={busy}
              value={data.politicalOrganizationId}
              onChange={(event) =>
                setData({ ...data, politicalOrganizationId: event.target.value })
              }
              className="max-w-md"
            >
              <option value="">無所属（政党なし）</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.displayName}
                </option>
              ))}
            </NativeSelect>
            <Link
              className="text-sm text-primary-active underline"
              href="/political-organizations/new"
            >
              政党を新規作成
            </Link>
          </div>
          <fieldset className="space-y-5 border-t border-border-soft pt-5">
            <legend className="text-sm font-bold">プロフィール（任意・公開サイトに表示）</legend>
            <div className="space-y-2">
              <Label htmlFor="nameKana">ふりがな</Label>
              <Input
                id="nameKana"
                disabled={busy}
                placeholder="みねしま ゆうや"
                value={data.nameKana}
                onChange={(event) => setData({ ...data, nameKana: event.target.value })}
                className="max-w-md"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="house">院</Label>
              <NativeSelect
                id="house"
                disabled={busy}
                value={data.house}
                onChange={(event) =>
                  setData({ ...data, house: event.target.value as PoliticianInput["house"] })
                }
                className="max-w-md"
              >
                <option value="">未設定</option>
                {POLITICIAN_HOUSES.map((house) => (
                  <option key={house} value={house}>
                    {POLITICIAN_HOUSE_LABELS[house]}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="constituency">選挙区</Label>
              <Input
                id="constituency"
                disabled={busy}
                placeholder="比例東京（東京7区）"
                value={data.constituency}
                onChange={(event) => setData({ ...data, constituency: event.target.value })}
                className="max-w-md"
              />
            </div>
            {(
              [
                {
                  key: "profileUrl",
                  label: "プロフィールページ（チームみらい公式サイト）の URL",
                  placeholder: "https://team-mir.ai/member/...",
                },
                { key: "websiteUrl", label: "公式サイトの URL", placeholder: "https://" },
              ] as const
            ).map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={field.key}>{field.label}</Label>
                <Input
                  id={field.key}
                  type="url"
                  disabled={busy}
                  placeholder={field.placeholder}
                  value={data[field.key]}
                  onChange={(event) => setData({ ...data, [field.key]: event.target.value })}
                  className="max-w-md"
                />
              </div>
            ))}
            <SnsUrlsField
              urls={data.snsUrls}
              disabled={busy}
              onChange={(snsUrls) => setData({ ...data, snsUrls })}
            />
          </fieldset>
          <div className="flex gap-3">
            <Button type="submit" disabled={busy}>
              {busy ? "保存中..." : politician ? "更新" : "作成"}
            </Button>
            <Button variant="outline" asChild>
              <Link href="/politicians">キャンセル</Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/** SNS の URL を表示順どおりに並べる欄。空の欄は保存時に詰める */
function SnsUrlsField({
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
            variant="outline"
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
