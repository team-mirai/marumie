import {
  DocumentMaskingPolicy,
  MASKING_MAX_RUNNING,
  MASKING_STALE_MS,
} from "@/server/contexts/research-fund/domain/models/document-masking";

describe("DocumentMaskingPolicy", () => {
  it("作成中が上限に達していれば新たに着手しない", () => {
    expect(DocumentMaskingPolicy.claimableCount(0)).toBe(MASKING_MAX_RUNNING);
    expect(DocumentMaskingPolicy.claimableCount(MASKING_MAX_RUNNING)).toBe(0);
    expect(DocumentMaskingPolicy.claimableCount(MASKING_MAX_RUNNING + 1)).toBe(0);
  });

  it("失効の判定は関数の実行時間の上限（300 秒）より長く待つ", () => {
    const now = new Date("2026-10-18T10:00:00Z");
    expect(DocumentMaskingPolicy.staleBefore(now).getTime()).toBe(now.getTime() - MASKING_STALE_MS);
    expect(MASKING_STALE_MS).toBeGreaterThan(300_000);
  });

  it("止まった書類を作り直しの対象に戻す印と、作り直しても止まったときの失敗理由は別の文言にする", () => {
    const { retryNote, failure } = DocumentMaskingPolicy.staleOutcome;
    expect(retryNote).not.toBe(failure);
    expect(failure.length).toBeLessThanOrEqual(500);
  });

  it.each([
    ["pending", true],
    ["running", false],
    ["succeeded", true],
    ["failed", true],
  ] as const)("%s の書類の作り直しを受けるか: %p", (status, expected) => {
    expect(DocumentMaskingPolicy.canRequest(status)).toBe(expected);
  });

  it("失敗の理由は空なら既定の文言にし、500 文字までにする", () => {
    expect(DocumentMaskingPolicy.errorMessage("  ")).toBe("公開用の版の作成に失敗しました");
    expect(DocumentMaskingPolicy.errorMessage("a".repeat(501))).toHaveLength(500);
  });
});
