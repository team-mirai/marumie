import "server-only";
import { redirect } from "next/navigation";
import { loadOrganizations } from "@/server/contexts/public-finance/presentation/loaders/load-organizations";

export default async function NotFound() {
  const { default: defaultSlug } = await loadOrganizations();

  if (defaultSlug) {
    redirect(`/o/${defaultSlug}`);
  } else {
    // 組織が存在しない場合はルートページにリダイレクト
    redirect("/");
  }
}
