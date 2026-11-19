import { buildAdminPageTitle, isStagingTargetEnv } from "@/client/lib/deploy-environment";

describe("isStagingTargetEnv", () => {
  it("カスタム環境名が staging のときだけ true になる", () => {
    expect(isStagingTargetEnv("staging")).toBe(true);
  });

  it("本番（production）では false", () => {
    expect(isStagingTargetEnv("production")).toBe(false);
  });

  it("PR の Preview（preview）では false", () => {
    expect(isStagingTargetEnv("preview")).toBe(false);
  });

  it("未設定なら false（判定できないときは本番と同じ扱いにする）", () => {
    expect(isStagingTargetEnv(undefined)).toBe(false);
    expect(isStagingTargetEnv("")).toBe(false);
  });

  it("大文字や前後の空白が混じった値は staging とみなさない（明示的な一致のみ）", () => {
    expect(isStagingTargetEnv("Staging")).toBe(false);
    expect(isStagingTargetEnv(" staging ")).toBe(false);
  });
});

describe("buildAdminPageTitle", () => {
  it("ステージングでは [stg] を前置する", () => {
    expect(buildAdminPageTitle("staging")).toBe("[stg] まる見え政治資金 - 管理画面");
  });

  it("本番では接頭辞を付けない", () => {
    expect(buildAdminPageTitle("production")).toBe("まる見え政治資金 - 管理画面");
  });

  it("未設定（ローカル）では本番と同じタイトルになる", () => {
    expect(buildAdminPageTitle(undefined)).toBe("まる見え政治資金 - 管理画面");
  });
});
