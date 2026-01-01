import "server-only";
import { redirect } from "next/navigation";
import { loadOrganizations } from "@/server/loaders/load-organizations";

export default async function NotFound() {
  // CIビルド時など、DBが空の場合はルートページにリダイレクト
  let defaultSlug: string | null = null;
  try {
    const result = await loadOrganizations();
    defaultSlug = result.default;
  } catch (error) {
    if (error instanceof Error && error.message === "No political organizations found") {
      defaultSlug = null;
    } else {
      throw error;
    }
  }

  if (defaultSlug) {
    redirect(`/o/${defaultSlug}`);
  } else {
    // 組織が存在しない場合はルートページにリダイレクト
    redirect("/");
  }
}
