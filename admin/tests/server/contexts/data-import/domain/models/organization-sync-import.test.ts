import {
  isSyncImportStorageKey,
  SYNC_IMPORT_MAX_FILE_BYTES,
  validateSyncImportFileSize,
} from "@/server/contexts/data-import/domain/models/organization-sync-import";

describe("validateSyncImportFileSize", () => {
  it("上限ちょうどまでは受け付ける", () => {
    expect(validateSyncImportFileSize(73 * 1024 * 1024)).toBeNull();
    expect(validateSyncImportFileSize(SYNC_IMPORT_MAX_FILE_BYTES)).toBeNull();
  });

  it("上限を超えると、サイズと上限が分かる理由を返す", () => {
    expect(validateSyncImportFileSize(SYNC_IMPORT_MAX_FILE_BYTES + 1)).toBe(
      "ファイルが大きすぎます（200.0MB）。取り込めるのは 200MB までです",
    );
  });

  it("空のファイルは受け付けない", () => {
    expect(validateSyncImportFileSize(0)).toBe("ファイルが空です");
    expect(validateSyncImportFileSize(Number.NaN)).toBe("ファイルが空です");
  });
});

describe("isSyncImportStorageKey", () => {
  it("サーバーが発行する形（UUID + .json）だけを受け付ける", () => {
    expect(isSyncImportStorageKey("0f8fad5b-d9cb-469f-a165-70867728950e.json")).toBe(true);
    expect(isSyncImportStorageKey("../private-receipts/0f8fad5b.json")).toBe(false);
    expect(isSyncImportStorageKey("0f8fad5b-d9cb-469f-a165-70867728950e.json/x")).toBe(false);
    expect(isSyncImportStorageKey("")).toBe(false);
  });
});
