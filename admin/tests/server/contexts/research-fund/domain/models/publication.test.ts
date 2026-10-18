import {
  Publication,
  type PublishableEntry,
} from "@/server/contexts/research-fund/domain/models/publication";

test("公開範囲を公開した仕訳の最新月末まで進める", () => {
  expect(Publication.advancePublishedThrough(null, ["2026-08-13", "2026-07-01"])).toBe("2026-08-31");
  expect(Publication.advancePublishedThrough("2026-06-30", ["2026-02-08"])).toBe("2026-06-30");
  expect(Publication.advancePublishedThrough("2026-06-30", ["2026-07-31"])).toBe("2026-07-31");
});

test("うるう年の2月と12月の月末を暦どおりに求める", () => {
  expect(Publication.advancePublishedThrough(null, ["2028-02-01"])).toBe("2028-02-29");
  expect(Publication.advancePublishedThrough(null, ["2026-02-01"])).toBe("2026-02-28");
  expect(Publication.advancePublishedThrough(null, ["2026-12-25"])).toBe("2026-12-31");
});

test("公開する仕訳が無ければ公開範囲は変えない", () => {
  expect(Publication.advancePublishedThrough("2026-06-30", [])).toBe("2026-06-30");
  expect(Publication.advancePublishedThrough(null, [])).toBeNull();
});

test("取り下げ後の公開範囲は、残った公開中の仕訳の最新月末を超えない", () => {
  expect(Publication.retreatPublishedThrough("2027-04-30", "2026-09-12")).toBe("2026-09-30");
  expect(Publication.retreatPublishedThrough("2026-09-30", "2026-09-01")).toBe("2026-09-30");
  expect(Publication.retreatPublishedThrough("2026-08-31", "2026-09-01")).toBe("2026-08-31");
  expect(Publication.retreatPublishedThrough(null, "2026-09-01")).toBeNull();
});

test("取り下げ後に公開中の仕訳が残っていなければ公開範囲は未設定", () => {
  expect(Publication.retreatPublishedThrough("2026-09-30", null)).toBeNull();
  expect(Publication.retreatPublishedThrough(null, null)).toBeNull();
});

test("公開する仕訳を選んでいない・IDが不正な選び方は受け付けない", () => {
  expect(Publication.selectionRejection([])).toBe("公開する仕訳を選んでください");
  expect(Publication.selectionRejection(["1", "0"])).toBe("仕訳IDが不正です");
  expect(Publication.selectionRejection(["1; drop"])).toBe("仕訳IDが不正です");
  expect(Publication.selectionRejection(["1", "23"])).toBeNull();
});

describe("仕訳を公開してよいか", () => {
  const entry: PublishableEntry = {
    id: "1",
    status: "approved",
    entryDate: "2026-08-13",
    description: "視察先への移動",
    document: null,
    rowCount: 1,
  };

  test("確認済で費用1行に射影できる仕訳は公開できる", () => {
    expect(Publication.entryRejection(entry)).toBeNull();
  });

  test.each(["draft", "published"] as const)("%s の仕訳は公開できない", (status) => {
    expect(Publication.entryRejection({ ...entry, status })).toBe(
      "確認済の仕訳だけを公開できます。下書きは先に確認済にしてください",
    );
  });

  test("チェックリストに出ない仕訳（費用1行に射影できない仕訳）は公開できない", () => {
    expect(Publication.entryRejection({ ...entry, rowCount: 2 })).toBe(
      "この画面で公開できない仕訳が含まれています。画面を再読み込みしてください",
    );
  });
});

describe("書類の公開用の版による公開の可否（#1803）", () => {
  test("書類の無い仕訳は公開できる", () => {
    expect(Publication.documentRejection(null)).toBeNull();
  });

  test("公開用の版が作成済みの書類なら公開できる", () => {
    expect(
      Publication.documentRejection({ maskingStatus: "succeeded", hasMaskedVersion: true }),
    ).toBeNull();
  });

  test.each([
    ["未作成", { maskingStatus: "pending", hasMaskedVersion: false }, "まだ作られていません"],
    ["作り直しの依頼中（前の版が残っている）", { maskingStatus: "pending", hasMaskedVersion: true }, "まだ作られていません"],
    ["作成中", { maskingStatus: "running", hasMaskedVersion: false }, "作成中です"],
    ["失敗（前の版が残っている）", { maskingStatus: "failed", hasMaskedVersion: true }, "作成に失敗しています"],
    ["作成済みなのに版のファイルが無い", { maskingStatus: "succeeded", hasMaskedVersion: false }, "まだ作られていません"],
  ] as const)("%s の書類が付いた仕訳は公開できない", (_label, document, message) => {
    expect(Publication.documentRejection(document)).toContain(message);
  });

  test("確認済の仕訳でも、公開用の版が無い書類が付いていれば公開できない", () => {
    expect(
      Publication.entryRejection({
        id: "1",
        status: "approved",
        entryDate: "2026-08-13",
        description: "視察先への移動",
        document: { maskingStatus: "running", hasMaskedVersion: false },
        rowCount: 1,
      }),
    ).toBe("書類の公開用の版を作成中です。できあがるまで公開できません");
  });
});
