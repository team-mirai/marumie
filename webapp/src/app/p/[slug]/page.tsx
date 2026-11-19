import "server-only";
import { redirect } from "next/navigation";

const DEFAULT_YEAR = 2026;

/** 年度なしの URL は既定の年度へ寄せる（/o/[slug] と同じ挙動）。 */
export default async function PoliticianYearRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/p/${encodeURIComponent(slug)}/${DEFAULT_YEAR}`);
}
