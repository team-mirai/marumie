import {
  buildSubmissionLedgerCsv,
  isParliamentHouse,
  receiptImageFilename,
  receiptNumberCell,
  receiptPresenceCell,
  submissionLedgerFilename,
  submissionLedgerHeaders,
  submissionLedgerRow,
  submissionLedgerWarnings,
  type SubmissionLedgerEntry,
} from "@/server/contexts/research-fund/domain/models/submission-ledger";

const entry: SubmissionLedgerEntry = { id: "1", entryDate: "2026-04-03", source: "scan", legalLabel: "⑨ 滞在費", description: "タクシー代", amount: 1200, payeeName: "東京タクシー", payeeAddress: "東京都千代田区", note: "国会から事務所へ", documentId: "5", receiptNumber: 12, documentMime: "application/pdf", receiptAbsenceReason: null };
const book = { politicianSlug: "tanaka-taro", financialYear: 2026 };
const noReceipt: SubmissionLedgerEntry = { ...entry, id: "2", source: "manual", documentId: null, receiptNumber: null, documentMime: null, receiptAbsenceReason: "自動券売機で購入したため" };

describe("衆議院のフォーマット", () => {
  test("議員課の Excel と同じ列順で並べる", () => {
    expect(submissionLedgerHeaders("representatives")).toEqual([
      "支出項目", "支出の目的", "金額", "年月日", "資金管理団体からの支出",
      "支出を受けた者の氏名（団体にあっては、その名称）", "支出を受けた者の住所（団体にあっては、主たる事務所の所在地）",
      "備考", "領収書等番号・徴難", "領収書等を徴し難かった事情", "メモ",
    ]);
  });
  test("1 仕訳を 1 行にし、決まっていない列は空欄にする", () => {
    expect(submissionLedgerRow("representatives", entry, book)).toEqual(["⑨ 滞在費", "タクシー代", "1200", "2026-04-03", "", "東京タクシー", "東京都千代田区", "国会から事務所へ", "12", "", ""]);
    expect(submissionLedgerRow("representatives", noReceipt, book).slice(8, 10)).toEqual(["徴難", "自動券売機で購入したため"]);
  });
});

describe("参議院のフォーマット", () => {
  test("議員課の Excel と同じ列順で並べる", () => {
    expect(submissionLedgerHeaders("councillors")).toEqual([
      "支出項目", "支出の目的", "金額", "年月日", "1万円超として扱う", "資金管理団体からの支出",
      "支出を受けた者の氏名（団体にあっては、その名称）", "支出を受けた者の住所（団体にあっては、主たる事務所の所在地）",
      "備考", "領収書有無", "領収書等を徴し難かった事情", "メモ", "特記事項", "領収書画像ファイル名",
    ]);
  });
  test("1 仕訳を 1 行にし、決まっていない列は空欄にする", () => {
    expect(submissionLedgerRow("councillors", noReceipt, book)).toEqual(["⑨ 滞在費", "タクシー代", "1200", "2026-04-03", "", "", "東京タクシー", "東京都千代田区", "国会から事務所へ", "無", "自動券売機で購入したため", "", "", ""]);
    expect(submissionLedgerRow("councillors", entry, book).slice(9)).toEqual(["有", "", "", "", "tanaka-taro_2026_0012.pdf"]);
  });
});

test("null の値（区分なし・支払先未設定・特記事項なし）は空欄で出す", () => {
  const row = submissionLedgerRow("representatives", { ...entry, legalLabel: null, payeeName: null, payeeAddress: null, note: null }, book);
  expect([row[0], row[5], row[6], row[7]]).toEqual(["", "", "", ""]);
});

test("CSV は UTF-8 BOM 付き・CRLF で、全セルを引用符で囲み引用符をエスケープする", () => {
  const csv = buildSubmissionLedgerCsv("representatives", book, [{ ...entry, description: 'A"B,C' }]);
  expect(csv.startsWith("﻿\"支出項目\",")).toBe(true);
  const lines = csv.slice(1).split("\r\n");
  expect(lines).toHaveLength(3);
  expect(lines[1]).toBe('"⑨ 滞在費","A""B,C","1200","2026-04-03","","東京タクシー","東京都千代田区","国会から事務所へ","12","",""');
  expect(lines[2]).toBe("");
});

test("数式として評価される文字で始まる文字列のセルは先頭に ' を付け、金額はそのまま出す", () => {
  const row = submissionLedgerRow("representatives", { ...entry, description: "=1+1", payeeName: "@SUM(A1)", note: "-2+3", amount: -500 }, book);
  expect(row[1]).toBe("'=1+1");
  expect(row[2]).toBe("-500");
  expect(row[5]).toBe("'@SUM(A1)");
  expect(row[7]).toBe("'-2+3");
});

test("仕訳が無くても見出し行だけの CSV を出す", () => {
  expect(buildSubmissionLedgerCsv("councillors", book, []).slice(1).split("\r\n")).toHaveLength(2);
});

test("ファイル名に年度と院を入れる", () => {
  expect(submissionLedgerFilename("representatives", 2026)).toBe("research_fund_ledger_2026_representatives.csv");
  expect(submissionLedgerFilename("councillors", 2026)).toBe("research_fund_ledger_2026_councillors.csv");
});

test.each([["representatives", true], ["councillors", true], ["", false], ["house", false]])("院の指定 %j は %s", (value, expected) => {
  expect(isParliamentHouse(value)).toBe(expected);
});

describe("領収書等番号・領収書有無・領収書画像ファイル名（#1685）", () => {
  const unnumbered = { ...entry, receiptNumber: null };
  test("領収書等番号・徴難は、書類ありなら番号（未採番なら空欄）、書類なしなら 徴難", () => {
    expect(receiptNumberCell(entry)).toBe("12");
    expect(receiptNumberCell(unnumbered)).toBeNull();
    expect(receiptNumberCell(noReceipt)).toBe("徴難");
    expect(receiptNumberCell({ ...noReceipt, receiptAbsenceReason: null })).toBe("徴難");
  });
  test("領収書有無は、書類ありなら 有（未採番でも）、書類なしなら 無", () => {
    expect(receiptPresenceCell(entry)).toBe("有");
    expect(receiptPresenceCell(unnumbered)).toBe("有");
    expect(receiptPresenceCell(noReceipt)).toBe("無");
  });
  test.each([["image/jpeg", "tanaka-taro_2026_0001.jpg"], ["image/png", "tanaka-taro_2026_0001.png"], ["application/pdf", "tanaka-taro_2026_0001.pdf"]])("%s の書類の画像ファイル名は %s", (documentMime, expected) => {
    expect(receiptImageFilename({ ...entry, receiptNumber: 1, documentMime }, book)).toBe(expected);
  });
  test("番号は 4 桁にゼロ埋めし、4 桁を超えてもそのまま出す", () => {
    expect(receiptImageFilename({ ...entry, receiptNumber: 123 }, book)).toBe("tanaka-taro_2026_0123.pdf");
    expect(receiptImageFilename({ ...entry, receiptNumber: 12345 }, book)).toBe("tanaka-taro_2026_12345.pdf");
  });
  test("書類なし・未採番・拡張子の分からない書類の画像ファイル名は空欄", () => {
    expect(receiptImageFilename(noReceipt, book)).toBeNull();
    expect(receiptImageFilename(unnumbered, book)).toBeNull();
    expect(receiptImageFilename({ ...entry, documentMime: "image/gif" }, book)).toBeNull();
  });
});

describe("submissionLedgerWarnings", () => {
  test("支払先が未設定の仕訳と、書類も徴し難かった事情もない仕訳を挙げる", () => {
    const noPayee = { ...entry, id: "3", payeeName: null, payeeAddress: null };
    const missing = { ...noReceipt, id: "4", receiptAbsenceReason: null };
    const both = { ...missing, id: "5", payeeName: null, payeeAddress: null };
    expect(submissionLedgerWarnings([entry, noReceipt, noPayee, missing, both])).toEqual([
      { entry: noPayee, issues: ["payee-missing"] },
      { entry: missing, issues: ["receipt-missing"] },
      { entry: both, issues: ["payee-missing", "receipt-missing"] },
    ]);
  });
  test("書類が未採番の仕訳を挙げる", () => {
    const unnumbered = { ...entry, id: "6", receiptNumber: null };
    expect(submissionLedgerWarnings([entry, noReceipt, unnumbered])).toEqual([
      { entry: unnumbered, issues: ["receipt-number-missing"] },
    ]);
  });
});
