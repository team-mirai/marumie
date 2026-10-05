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
  const entry: PublishableEntry = { id: "1", status: "approved", entryDate: "2026-08-13", rowCount: 1 };

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
