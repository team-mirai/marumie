jest.mock("next/navigation", () => ({
  notFound: jest.fn(),
  redirect: jest.fn(),
}));
jest.mock("@/server/contexts/public-finance/presentation/loaders/load-organizations", () => ({
  loadOrganizations: jest.fn(),
}));
jest.mock(
  "@/server/contexts/public-finance/presentation/loaders/load-transactions-page-data",
  () => ({
    loadTransactionsPageData: jest.fn(),
  }),
);
jest.mock("@/client/components/common/AboutSection", () => ({ __esModule: true, default: () => null }));
jest.mock("@/client/components/common/LinkCardsSection", () => ({ __esModule: true, default: () => null }));
jest.mock("@/client/components/common/AnotherPageLinkSection", () => ({ __esModule: true, default: () => null }));
jest.mock("@/client/components/common/ExplanationSection", () => ({ __esModule: true, default: () => null }));
jest.mock("@/client/components/common/TransparencySection", () => ({ __esModule: true, default: () => null }));
jest.mock("@/client/components/common/FloatingBackButton", () => ({ __esModule: true, default: () => null }));
jest.mock("@/client/components/layout/MainColumn", () => ({ __esModule: true, default: () => null }));
jest.mock(
  "@/client/components/top-page/features/transactions-table/InteractiveTransactionTable",
  () => ({
    __esModule: true,
    default: () => null,
  }),
);

import TransactionsPage, {
  generateMetadata,
} from "@/app/o/[slug]/[year]/transactions/page";
import { notFound } from "next/navigation";
import { loadOrganizations } from "@/server/contexts/public-finance/presentation/loaders/load-organizations";
import { loadTransactionsPageData } from "@/server/contexts/public-finance/presentation/loaders/load-transactions-page-data";

const notFoundMock = jest.mocked(notFound);
const loadOrganizationsMock = loadOrganizations as jest.Mock;
const loadTransactionsPageDataMock = loadTransactionsPageData as jest.Mock;

describe("TransactionsPage (/o/[slug]/[year]/transactions)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    loadOrganizationsMock.mockResolvedValue({
      default: "team-mirai",
      organizations: [{ slug: "team-mirai", displayName: "チームみらい" }],
    });
    loadTransactionsPageDataMock.mockResolvedValue({
      transactions: [],
      total: 0,
      page: 1,
      perPage: 50,
      totalPages: 1,
      politicalOrganizations: [{ slug: "team-mirai", displayName: "チームみらい" }],
      lastUpdatedAt: null,
    });
  });

  describe("generateMetadata", () => {
    it("存在する slug かつ有効な年度でタイトルと説明を生成する", async () => {
      const metadata = await generateMetadata({
        params: Promise.resolve({ slug: "team-mirai", year: "2026" }),
      });
      expect(metadata.title).toBe("チームみらい:全ての出入金 - みらいまる見え政治資金");
      expect(metadata.description).toBe("チームみらいの政治資金取引一覧を表示しています。");
    });

    it("年度が数字でない場合はデフォルトタイトルを返す", async () => {
      const metadata = await generateMetadata({
        params: Promise.resolve({ slug: "team-mirai", year: "invalid-year" }),
      });
      expect(metadata.title).toBe("みらいまる見え政治資金");
      expect(metadata.description).toBeUndefined();
    });

    it("年度が4桁でない場合はデフォルトタイトルを返す", async () => {
      const metadata = await generateMetadata({
        params: Promise.resolve({ slug: "team-mirai", year: "02026" }),
      });
      expect(metadata.title).toBe("みらいまる見え政治資金");
      expect(metadata.description).toBeUndefined();
    });

    it("年度が対象外（VALID_YEARS外）の場合はデフォルトタイトルを返す", async () => {
      const metadata = await generateMetadata({
        params: Promise.resolve({ slug: "team-mirai", year: "2020" }),
      });
      expect(metadata.title).toBe("みらいまる見え政治資金");
      expect(metadata.description).toBeUndefined();
    });

    it("存在しない slug の場合はデフォルトタイトルを返す", async () => {
      const metadata = await generateMetadata({
        params: Promise.resolve({ slug: "unknown-slug", year: "2026" }),
      });
      expect(metadata.title).toBe("みらいまる見え政治資金");
      expect(metadata.description).toBeUndefined();
    });
  });

  it("年度が数字でない場合は notFound() を呼び出す", async () => {
    await TransactionsPage({
      params: Promise.resolve({ slug: "team-mirai", year: "invalid-year" }),
      searchParams: Promise.resolve({}),
    });

    expect(notFoundMock).toHaveBeenCalled();
  });

  it("年度が4桁でない場合（前置ゼロ付き等）は notFound() を呼び出す", async () => {
    await TransactionsPage({
      params: Promise.resolve({ slug: "team-mirai", year: "02026" }),
      searchParams: Promise.resolve({}),
    });

    expect(notFoundMock).toHaveBeenCalled();
  });

  it("年度が対象外（VALID_YEARS外）の場合は notFound() を呼び出す", async () => {
    await TransactionsPage({
      params: Promise.resolve({ slug: "team-mirai", year: "2020" }),
      searchParams: Promise.resolve({}),
    });

    expect(notFoundMock).toHaveBeenCalled();
  });

  it("存在しない slug の場合は notFound() を呼び出す", async () => {
    await TransactionsPage({
      params: Promise.resolve({ slug: "unknown-slug", year: "2026" }),
      searchParams: Promise.resolve({}),
    });

    expect(notFoundMock).toHaveBeenCalled();
  });
});
