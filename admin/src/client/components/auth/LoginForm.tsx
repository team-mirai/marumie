"use client";
import "client-only";
import { useState } from "react";

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
    <div className="card !p-8 w-full">
      <h1 className="mb-6 text-2xl font-bold">ログイン</h1>
      <form onSubmit={handleSubmit} className="grid gap-4 w-full">
        <label className="w-full">
          <div className="muted mb-2">Email</div>
          <input className="input w-full" name="email" type="email" required />
        </label>
        <label className="w-full">
          <div className="muted mb-2">Password</div>
          <input className="input w-full" name="password" type="password" required />
        </label>
        <button className="button mt-4 w-full" type="submit" disabled={isLoading}>
          {isLoading ? "ログイン中..." : "ログイン"}
        </button>
        {error && <div className="muted mt-2">{error}</div>}
      </form>
    </div>
  );
}
