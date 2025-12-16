"use client";
import "client-only";
import { useState } from "react";
import {
  ShadcnButton,
  ShadcnInput,
  ShadcnCard,
  CardHeader,
  CardTitle,
  CardContent,
  Label,
} from "@/client/components/ui";

interface LoginFormProps {
  action: (formData: FormData) => Promise<void>;
  error?: string;
}

export default function LoginForm({ action, error }: LoginFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    try {
      await action(formData);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ShadcnCard className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl">ログイン</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 w-full">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <ShadcnInput id="email" name="email" type="email" required className="bg-input" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <ShadcnInput
              id="password"
              name="password"
              type="password"
              required
              className="bg-input"
            />
          </div>
          <ShadcnButton type="submit" disabled={isLoading} className="mt-4 w-full">
            {isLoading ? "ログイン中..." : "ログイン"}
          </ShadcnButton>
          {error && <div className="text-muted-foreground mt-2">{error}</div>}
        </form>
      </CardContent>
    </ShadcnCard>
  );
}
