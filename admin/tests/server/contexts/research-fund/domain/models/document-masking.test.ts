import {
  DocumentMaskingPolicy,
  MAX_MASKING_PAGES,
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

  it("初めて止まった書類は印を付けて作り直し待ちに、作り直しても止まった書類は失敗にする", () => {
    const retry = DocumentMaskingPolicy.stalledDestination(null);
    expect(retry.status).toBe("pending");

    const failure = DocumentMaskingPolicy.stalledDestination(retry.error);
    expect(failure).toEqual({
      status: "failed",
      error: "作成が途中で止まりました。ページ数を減らすなどしてから作り直してください",
    });
    expect(failure.error).not.toBe(retry.error);
    expect(failure.error.length).toBeLessThanOrEqual(500);
  });

  it.each([
    ["failed", "理由"],
    ["pending", null],
    ["running", null],
    ["succeeded", null],
  ] as const)("%s の書類で画面に出す理由: %p", (status, expected) => {
    expect(DocumentMaskingPolicy.visibleError(status, "理由")).toBe(expected);
  });

  it("作り直しを受けられる状態の一覧は、受けるかの判定と食い違わない", () => {
    for (const status of ["pending", "running", "succeeded", "failed"] as const)
      expect(DocumentMaskingPolicy.requestableStatuses.includes(status)).toBe(
        DocumentMaskingPolicy.canRequest(status),
      );
  });

  it("作成中の書類の作り直しは却下理由を返し、それ以外は受ける", () => {
    const running = DocumentMaskingPolicy.validateRequest("running");
    expect(running.status === "invalid" && running.errors[0].message).toBe(
      "公開用の版を作成中です。終わってから作り直してください",
    );
    expect(DocumentMaskingPolicy.validateRequest("failed")).toEqual({ status: "valid", value: undefined });
  });

  it.each([
    ["succeeded", true, true],
    ["succeeded", false, false],
    ["pending", true, false],
    ["running", true, false],
    ["failed", true, false],
  ] as const)("%s（版のファイル: %p）の書類は公開に使えるか: %p", (status, hasMaskedVersion, expected) => {
    expect(DocumentMaskingPolicy.isPublishable(status, hasMaskedVersion)).toBe(expected);
    if (expected) expect(status).toBe(DocumentMaskingPolicy.publishableStatus);
  });

  it("黒塗りできるページ数の上限を超えたときだけ却下理由を返す", () => {
    expect(DocumentMaskingPolicy.pageLimitRejection(MAX_MASKING_PAGES)).toBeNull();
    expect(DocumentMaskingPolicy.pageLimitRejection(MAX_MASKING_PAGES + 1)).toBe(
      `${MAX_MASKING_PAGES + 1}ページあり、黒塗りできるページ数の上限（${MAX_MASKING_PAGES}ページ）を超えています`,
    );
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
