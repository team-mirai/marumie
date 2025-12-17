"use client";
import "client-only";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Label,
  Textarea,
} from "@/client/components/ui";

interface PoliticalOrganizationFormData {
  displayName: string;
  orgName: string;
  slug: string;
  description: string;
}

interface PoliticalOrganizationFormProps {
  initialData?: Partial<PoliticalOrganizationFormData>;
  onSubmit: (data: PoliticalOrganizationFormData) => Promise<{ success: boolean }>;
  submitButtonText: string;
  title: string;
}

export function PoliticalOrganizationForm({
  initialData = { displayName: "", orgName: "", slug: "", description: "" },
  onSubmit,
  submitButtonText,
  title,
}: PoliticalOrganizationFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<PoliticalOrganizationFormData>({
    displayName: initialData.displayName || "",
    orgName: initialData.orgName || "",
    slug: initialData.slug || "",
    description: initialData.description || "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.displayName.trim() || !formData.slug.trim()) return;

    try {
      setIsLoading(true);
      setError(null);
      const result = await onSubmit(formData);
      if (result.success) {
        router.push("/political-organizations");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <Card>
      <CardHeader>
        <div className="mb-2">
          <Link
            href="/political-organizations"
            className="text-muted-foreground no-underline hover:text-foreground transition-colors"
          >
            ← 政治団体一覧に戻る
          </Link>
        </div>
        <CardTitle className="text-2xl">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="text-destructive mb-4 p-3 bg-destructive/10 rounded-lg border border-destructive/30">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="displayName">
              表示名 <span className="text-destructive">*</span>
            </Label>
            <Input
              type="text"
              id="displayName"
              name="displayName"
              value={formData.displayName}
              onChange={handleInputChange}
              className="bg-input max-w-md"
              placeholder="表示名を入力してください"
              disabled={isLoading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="orgName">正式名称（任意）</Label>
            <Input
              type="text"
              id="orgName"
              name="orgName"
              value={formData.orgName}
              onChange={handleInputChange}
              className="bg-input max-w-md"
              placeholder="正式名称を入力してください"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">
              スラッグ <span className="text-destructive">*</span>
            </Label>
            <Input
              type="text"
              id="slug"
              name="slug"
              value={formData.slug}
              onChange={handleInputChange}
              className="bg-input max-w-md"
              placeholder="team-mirai"
              disabled={isLoading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">説明（任意）</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="bg-input max-w-md min-h-24 resize-y"
              placeholder="政治団体の説明を入力してください"
              disabled={isLoading}
            />
          </div>

          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={isLoading || !formData.displayName.trim() || !formData.slug.trim()}
            >
              {isLoading ? "処理中..." : submitButtonText}
            </Button>

            <Button variant="outline" asChild>
              <Link href="/political-organizations">キャンセル</Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
