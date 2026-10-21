import { CsvFormatError } from "@/server/contexts/report/domain/errors/donor-csv-error";
import { DonorCsvLoader } from "@/server/contexts/report/infrastructure/donor-csv/donor-csv-loader";

describe("DonorCsvLoader", () => {
  const loader = new DonorCsvLoader();
  const header = "取引No,寄付者名,寄付者種別,住所,職業";

  it("各行をレコードとして読み、行番号を振る", () => {
    const result = loader.load(
      [header, "T1,山田太郎,個人,東京都千代田区1-1,会社員", "T2,佐藤花子,個人,大阪府大阪市1-1,自営業"].join(
        "\n",
      ),
    );

    expect(result).toEqual([
      {
        rowNumber: 1,
        transaction_no: "T1",
        name: "山田太郎",
        donorType: "個人",
        address: "東京都千代田区1-1",
        occupation: "会社員",
      },
      {
        rowNumber: 2,
        transaction_no: "T2",
        name: "佐藤花子",
        donorType: "個人",
        address: "大阪府大阪市1-1",
        occupation: "自営業",
      },
    ]);
  });

  it("欄の中に改行を含むCSVを1件として読み、行番号はレコード単位で数える", () => {
    const result = loader.load(
      [
        header,
        'T1,山田太郎,個人,"東京都千代田区1-1\nテストビル3階",会社員',
        "T2,佐藤花子,個人,大阪府大阪市1-1,自営業",
      ].join("\r\n"),
    );

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      rowNumber: 1,
      transaction_no: "T1",
      address: "東京都千代田区1-1\nテストビル3階",
      occupation: "会社員",
    });
    expect(result[1]).toMatchObject({ rowNumber: 2, transaction_no: "T2", occupation: "自営業" });
  });

  it("行数上限は物理行ではなくレコード数で判定する", () => {
    const rows = Array.from({ length: 1000 }, (_, i) => `T${i},"名前\n${i}",個人,住所,職業`);

    expect(loader.load([header, ...rows].join("\n"))).toHaveLength(1000);
    expect(() => loader.load([header, ...rows, "T1000,名前,個人,住所,職業"].join("\n"))).toThrow(
      CsvFormatError,
    );
  });

  it("必須列が欠けていればエラーにする", () => {
    expect(() => loader.load("取引No,寄付者名\nT1,山田太郎")).toThrow(CsvFormatError);
  });
});
