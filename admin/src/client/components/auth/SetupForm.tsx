"use client";
import "client-only";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label } from "@/client/components/ui";

interface SetupFormProps {
  userEmail: string;
  setupPasswordAction: (
    password: string,
  ) => Promise<{ ok: boolean; error?: string; redirectTo?: string }>;
}

/**
 * パスワード設定フォーム（初期セットアップ・パスワード再設定で共用）。
 * カード・見出しは呼び出し側の PublicAuthCard が持ち、ここはフォーム本体のみを描く。
 */
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
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <p className="text-[13px] text-muted-foreground">
        対象アカウント:{" "}
        <span className="font-latin font-semibold text-foreground">{userEmail}</span>
      </p>
      <div className="space-y-2">
        <Label htmlFor="password">パスワード</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
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
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          placeholder="パスワードを再入力"
        />
      </div>

      {error && (
        <p role="alert" className="text-center text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" disabled={isLoading} className="mt-2 w-full">
        {isLoading ? "設定中..." : "設定完了"}
      </Button>
    </form>
  );
}
