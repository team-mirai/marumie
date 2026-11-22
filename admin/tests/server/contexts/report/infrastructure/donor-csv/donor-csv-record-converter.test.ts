import { DonorCsvRecordConverter } from "@/server/contexts/report/infrastructure/donor-csv/donor-csv-record-converter";
import type { DonorCsvRecord } from "@/server/contexts/report/domain/models/donor-csv-record";

describe("DonorCsvRecordConverter", () => {
  const converter = new DonorCsvRecordConverter();

  const record = (overrides: Partial<DonorCsvRecord> = {}): DonorCsvRecord => ({
    rowNumber: 1,
    transaction_no: " T1 ",
    name: " 山田太郎 ",
    donorType: "individual",
    address: " 東京都 ",
    occupation: " 会社員 ",
    ...overrides,
  });

  it("寄付者の値を画面からの登録と同じルールで正規化する", () => {
    expect(converter.convert(record())).toMatchObject({
      rowNumber: 1,
      transactionNo: "T1",
      name: "山田太郎",
      donorType: "individual",
      address: "東京都",
      occupation: "会社員",
      status: "valid",
    });
  });

  it("空の住所・職業は null にする", () => {
    expect(converter.convert(record({ address: "  ", occupation: "" }))).toMatchObject({
      address: null,
      occupation: null,
    });
  });

  it("個人以外に入力された職業は、画面からの登録と同じく保存しない", () => {
    expect(
      converter.convert(record({ donorType: "corporation", occupation: "会社員" })),
    ).toMatchObject({ donorType: "corporation", occupation: null });
  });

  it("種別が読み取れない行は種別を null にし、職業は残す", () => {
    expect(converter.convert(record({ donorType: "unknown" }))).toMatchObject({
      donorType: null,
      occupation: "会社員",
    });
  });
});
