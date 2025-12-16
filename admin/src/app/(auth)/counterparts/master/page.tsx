import "server-only";

import { loadCounterpartsData } from "@/server/contexts/report/presentation/loaders/counterparts-loader";
import { CounterpartMasterClient } from "@/client/components/counterparts/CounterpartMasterClient";

interface CounterpartMasterPageProps {
  searchParams: Promise<{
    q?: string;
    page?: string;
  }>;
}

export default async function CounterpartMasterPage({ searchParams }: CounterpartMasterPageProps) {
  const params = await searchParams;
  const searchQuery = params.q;
  const parsedPage = params.page ? Number.parseInt(params.page, 10) : 1;
  const page = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
  const perPage = 50;

  const data = await loadCounterpartsData({
    searchQuery,
    page,
    perPage,
  });

  return (
    <CounterpartMasterClient
      initialCounterparts={data.counterparts}
      total={data.total}
      page={data.page}
      perPage={data.perPage}
      searchQuery={searchQuery}
    />
  );
}
