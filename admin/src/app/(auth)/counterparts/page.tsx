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

  // TODO: マルチテナント対応後はURLパラメータからtenantIdを取得する
  const tenantId = BigInt(1); // 固定値: sample-party

  const data = await loadCounterpartsData({
    tenantId,
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
