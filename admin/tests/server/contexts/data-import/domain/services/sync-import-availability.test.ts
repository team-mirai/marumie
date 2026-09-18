import { SyncImportForbiddenError } from "@/server/contexts/data-import/domain/models/organization-sync-import";
import {
  assertSyncImportAllowed,
  isSyncImportAllowed,
} from "@/server/contexts/data-import/domain/services/sync-import-availability";

describe("isSyncImportAllowed", () => {
  it("フラグが無ければ拒否する（デフォルト拒否）", () => {
    expect(isSyncImportAllowed({ dataSyncImportEnabled: undefined, vercelEnv: "preview" })).toBe(
      false,
    );
  });

  it("本番ではフラグがあっても拒否する", () => {
    expect(isSyncImportAllowed({ dataSyncImportEnabled: "true", vercelEnv: "production" })).toBe(
      false,
    );
  });

  it("フラグがあり、かつ非本番なら許可する", () => {
    expect(isSyncImportAllowed({ dataSyncImportEnabled: "true", vercelEnv: "preview" })).toBe(true);
  });

  it("フラグは文字列 true 以外を許可しない", () => {
    for (const value of ["TRUE", "1", "yes", ""]) {
      expect(isSyncImportAllowed({ dataSyncImportEnabled: value, vercelEnv: "preview" })).toBe(
        false,
      );
    }
  });

  it("VERCEL_ENV が無いローカルでもフラグがあれば許可する", () => {
    expect(isSyncImportAllowed({ dataSyncImportEnabled: "true", vercelEnv: undefined })).toBe(true);
  });
});

describe("assertSyncImportAllowed", () => {
  it("許可されない環境では SyncImportForbiddenError を投げる", () => {
    expect(() =>
      assertSyncImportAllowed({ dataSyncImportEnabled: "true", vercelEnv: "production" }),
    ).toThrow(SyncImportForbiddenError);
  });

  it("許可される環境では何も投げない", () => {
    expect(() =>
      assertSyncImportAllowed({ dataSyncImportEnabled: "true", vercelEnv: "preview" }),
    ).not.toThrow();
  });
});
