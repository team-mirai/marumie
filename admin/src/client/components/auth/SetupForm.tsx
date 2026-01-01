"use client";
import "client-only";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  Label,
} from "@/client/components/ui";

interface SetupFormProps {
  userEmail: string;
  setupPasswordAction: (
    password: string,
  ) => Promise<{ ok: boolean; error?: string; redirectTo?: string }>;
}

export default function SetupForm({ userEmail, setupPasswordAction }: SetupFormProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("パスワードが一致しません");
      return;
    }

    if (password.length < 6) {
      setError("パスワードは6文字以上で設定してください");
      return;
    }

    setIsLoading(true);

    try {
      const result = await setupPasswordAction(password);
      if (result.ok) {
        router.push(result.redirectTo ?? "/");
      } else {
        setError(result.error ?? "パスワードの設定に失敗しました");
      }
    } catch (error) {
      console.error("Setup error:", error);
      setError(
        `パスワードの設定に失敗しました: ${
          error instanceof Error ? error.message : "不明なエラー"
        }`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl">アカウント設定</CardTitle>
        <CardDescription>
          アカウント設定中: <strong>{userEmail}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">パスワード</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="パスワードを入力"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">パスワード（確認）</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="パスワードを再入力"
              />
            </div>
          </div>

          {error && <div className="text-destructive text-sm text-center">{error}</div>}

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? "設定中..." : "設定完了"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
