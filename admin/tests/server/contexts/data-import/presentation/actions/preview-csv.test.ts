import { requireRole } from "@/server/contexts/auth/presentation/loaders/require-role";
import { PreviewMfCsvUsecase } from "@/server/contexts/data-import/application/usecases/preview-mf-csv-usecase";
import { previewCsv } from "@/server/contexts/data-import/presentation/actions/preview-csv";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";

jest.mock("@/server/contexts/auth/presentation/loaders/require-role", () => ({
  requireRole: jest.fn(),
}));
jest.mock("@/server/contexts/shared/infrastructure/prisma", () => ({
  prisma: { $disconnect: jest.fn() },
}));

const execute = jest.spyOn(PreviewMfCsvUsecase.prototype, "execute");

function csvFile() {
  return new File(["取引No\n"], "transactions.csv", { type: "text/csv" });
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(requireRole).mockResolvedValue({} as Awaited<ReturnType<typeof requireRole>>);
});

test("プレビューに成功しても、他のリクエストと共有している Prisma クライアントを切断しない", async () => {
  execute.mockResolvedValue({} as Awaited<ReturnType<PreviewMfCsvUsecase["execute"]>>);

  await previewCsv({ file: csvFile(), politicalOrganizationId: "1" });

  expect(execute).toHaveBeenCalledWith({ csvContent: "取引No\n", politicalOrganizationId: "1" });
  expect(prisma.$disconnect).not.toHaveBeenCalled();
});

test("プレビューに失敗しても、共有の Prisma クライアントを切断しない", async () => {
  execute.mockRejectedValue(new Error("CSV の形式が正しくありません"));
  jest.spyOn(console, "error").mockImplementation(() => {});

  await expect(previewCsv({ file: csvFile(), politicalOrganizationId: "1" })).rejects.toThrow(
    "CSV の形式が正しくありません",
  );
  expect(prisma.$disconnect).not.toHaveBeenCalled();
});
