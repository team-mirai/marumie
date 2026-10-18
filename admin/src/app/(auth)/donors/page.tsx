import "server-only";

import { loadDonorsData } from "@/server/contexts/report/presentation/loaders/donors-loader";
import { DonorMasterClient } from "@/client/components/donors/DonorMasterClient";
import { parseDonorType } from "@/server/contexts/report/domain/models/donor";
import { requireRolePage } from "@/server/contexts/auth/presentation/loaders/require-role-page";

interface DonorMasterPageProps {
  searchParams: Promise<{
    q?: string;
    type?: string;
    page?: string;
  }>;
}

export default async function DonorMasterPage({ searchParams }: DonorMasterPageProps) {
  await requireRolePage("political_fund");
  const params = await searchParams;
  const searchQuery = params.q;
  const parsed = params.type ? parseDonorType(params.type) : null;
  const donorType = parsed === null ? undefined : parsed;
  const parsedPage = params.page ? Number.parseInt(params.page, 10) : 1;
  const page = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
  const perPage = 50;

  const data = await loadDonorsData({
    searchQuery,
    donorType,
    page,
    perPage,
  });

  return (
    <DonorMasterClient
      initialDonors={data.donors}
      total={data.total}
      page={data.page}
      perPage={data.perPage}
      searchQuery={searchQuery}
      donorType={donorType}
    />
  );
}
