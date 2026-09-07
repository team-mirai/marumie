import { enrichRowsWithMatchingDonors } from "@/server/contexts/report/domain/services/donor-matcher";
import type { IDonorRepository } from "@/server/contexts/report/domain/repositories/donor-repository.interface";
import type { PreviewDonorCsvRow } from "@/server/contexts/report/domain/models/preview-donor-csv-row";
import type { Donor } from "@/server/contexts/report/domain/models/donor";

describe("enrichRowsWithMatchingDonors", () => {
  const mockDonorRepository: jest.Mocked<IDonorRepository> = {
    findByMatchCriteriaBatch: jest.fn(),
  } as unknown as jest.Mocked<IDonorRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createRow = (overrides: Partial<PreviewDonorCsvRow> = {}): PreviewDonorCsvRow => ({
    rowNumber: 1,
    transactionNo: "T2025-0001",
    name: "テスト太郎",
    donorType: "individual",
    address: "東京都渋谷区",
    occupation: "会社員",
    status: "valid",
    errors: [],
    transaction: null,
    matchingDonor: null,
    ...overrides,
  });

  const createDonor = (overrides: Partial<Donor> = {}): Donor => ({
    id: "donor-1",
    name: "テスト太郎",
    donorType: "individual",
    address: "東京都渋谷区",
    occupation: "会社員",
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    ...overrides,
  });

  it("name・address・donorType が一致する既存Donorを matchingDonor に設定する", async () => {
    const donor = createDonor();
    mockDonorRepository.findByMatchCriteriaBatch.mockResolvedValue([donor]);

    const result = await enrichRowsWithMatchingDonors([createRow()], mockDonorRepository);

    expect(result[0].matchingDonor).toEqual({
      id: "donor-1",
      name: "テスト太郎",
      donorType: "individual",
      address: "東京都渋谷区",
    });
  });

  it("一致する既存Donorが無い行の matchingDonor は null になる", async () => {
    mockDonorRepository.findByMatchCriteriaBatch.mockResolvedValue([]);

    const result = await enrichRowsWithMatchingDonors([createRow()], mockDonorRepository);

    expect(result[0].matchingDonor).toBeNull();
  });

  it("address のみが異なる場合は別人として扱う", async () => {
    mockDonorRepository.findByMatchCriteriaBatch.mockResolvedValue([
      createDonor({ address: "大阪府大阪市" }),
    ]);

    const result = await enrichRowsWithMatchingDonors([createRow()], mockDonorRepository);

    expect(result[0].matchingDonor).toBeNull();
  });

  it("address が null の行は address が null の既存Donorと一致する", async () => {
    mockDonorRepository.findByMatchCriteriaBatch.mockResolvedValue([
      createDonor({ id: "donor-2", address: null }),
    ]);

    const result = await enrichRowsWithMatchingDonors(
      [createRow({ address: null })],
      mockDonorRepository,
    );

    expect(result[0].matchingDonor?.id).toBe("donor-2");
  });

  it("donorType が null の行は照合対象にも検索条件にもしない", async () => {
    mockDonorRepository.findByMatchCriteriaBatch.mockResolvedValue([]);

    const row = createRow({ donorType: null, status: "invalid" });
    const result = await enrichRowsWithMatchingDonors([row], mockDonorRepository);

    expect(result[0]).toBe(row);
    expect(mockDonorRepository.findByMatchCriteriaBatch).toHaveBeenCalledWith([]);
  });

  it("同一の照合キーを持つ行は検索条件を1件に集約する", async () => {
    mockDonorRepository.findByMatchCriteriaBatch.mockResolvedValue([]);

    await enrichRowsWithMatchingDonors(
      [createRow(), createRow({ rowNumber: 2, transactionNo: "T2025-0002" })],
      mockDonorRepository,
    );

    expect(mockDonorRepository.findByMatchCriteriaBatch).toHaveBeenCalledWith([
      { name: "テスト太郎", address: "東京都渋谷区", donorType: "individual" },
    ]);
  });

  it("照合キーが異なる行はそれぞれ検索条件に含める", async () => {
    mockDonorRepository.findByMatchCriteriaBatch.mockResolvedValue([]);

    await enrichRowsWithMatchingDonors(
      [createRow(), createRow({ rowNumber: 2, name: "テスト花子" })],
      mockDonorRepository,
    );

    expect(mockDonorRepository.findByMatchCriteriaBatch).toHaveBeenCalledWith([
      { name: "テスト太郎", address: "東京都渋谷区", donorType: "individual" },
      { name: "テスト花子", address: "東京都渋谷区", donorType: "individual" },
    ]);
  });
});
