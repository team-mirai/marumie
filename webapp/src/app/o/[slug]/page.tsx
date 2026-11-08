import "server-only";
import { notFound, redirect } from "next/navigation";
import { loadOrganizations } from "@/server/contexts/public-finance/presentation/loaders/load-organizations";

const DEFAULT_YEAR = 2026;

interface OrgPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function OrgPage({ params }: OrgPageProps) {
  const { slug } = await params;

  // slugの妥当性をチェック
  const { organizations } = await loadOrganizations();
  const isValidSlug = organizations.some((org) => org.slug === slug);

  if (!isValidSlug) {
    notFound();
    return;
  }

  // デフォルト年度にリダイレクト
  redirect(`/o/${slug}/${DEFAULT_YEAR}`);
}
