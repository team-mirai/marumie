import "server-only";
import { notFound, redirect } from "next/navigation";
import { loadOrganizations } from "@/server/contexts/public-finance/presentation/loaders/load-organizations";

export default async function HomePage() {
  const { default: defaultSlug } = await loadOrganizations();

  if (defaultSlug) {
    redirect(`/o/${defaultSlug}`);
  } else {
    notFound();
  }
}
