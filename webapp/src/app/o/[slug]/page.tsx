import "server-only";
import { redirect } from "next/navigation";
import { loadOrganizations } from "@/server/contexts/public-finance/presentation/loaders/load-organizations";
import { PublishedFiscalYears } from "@/server/contexts/public-finance/domain/models/published-fiscal-years";

interface OrgPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function OrgPage({ params }: OrgPageProps) {
  const { slug } = await params;

  // slugの妥当性をチェックし、必要に応じてデフォルトslugを使用
  const { default: defaultSlug, organizations } = await loadOrganizations();
  const validSlug = organizations.some((org) => org.slug === slug) ? slug : defaultSlug;

  // デフォルト年度にリダイレクト
  redirect(`/o/${validSlug}/${PublishedFiscalYears.defaultYear}`);
}
