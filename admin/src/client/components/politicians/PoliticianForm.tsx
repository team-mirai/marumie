"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent, Input, Label, NativeSelect } from "@/client/components/ui";
import type { Politician, PoliticianInput } from "@/shared/models/politician";
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
    politician ?? { name: "", slug: "", termStart: "", politicalOrganizationId: "" },
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
                return;
              }
              router.push("/politicians");
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
