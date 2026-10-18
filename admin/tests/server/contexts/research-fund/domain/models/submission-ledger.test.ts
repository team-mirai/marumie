import {
  buildSubmissionLedgerCsv,
  isParliamentHouse,
  legalCategoryName,
  legalCategoryNumber,
  receiptImageFilename,
  receiptNumberCell,
  receiptPresenceCell,
  submissionLedgerFilename,
  submissionLedgerHeaders,
  submissionLedgerRow,
  sortSubmissionLedgerEntries,
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
    expect(submissionLedgerRow("representatives", entry, book)).toEqual(["滞在費", "タクシー代", "1200", "2026-04-03", "", "東京タクシー", "東京都千代田区", "国会から事務所へ", "12", "", ""]);
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
    expect(submissionLedgerRow("councillors", noReceipt, book)).toEqual(["滞在費", "タクシー代", "1200", "2026-04-03", "", "", "東京タクシー", "東京都千代田区", "国会から事務所へ", "無", "自動券売機で購入したため", "", "", ""]);
    expect(submissionLedgerRow("councillors", entry, book).slice(9)).toEqual(["有", "", "", "", "tanaka-taro_2026_0012.pdf"]);
  });
});

describe("支出項目", () => {
  test.each([
    ["① 人件費", "人件費"], ["② 光熱水費", "光熱水費"], ["③ 備品・消耗品費", "備品・消耗品費"], ["④ 事務所費", "事務所費"],
    ["⑤ 会議費", "会議費"], ["⑥ 広報紙誌の発行その他の事業費", "広報紙誌の発行その他の事業費"], ["⑦ 調査研究費", "調査研究費"],
    ["⑧ 交通費", "交通費"], ["⑨ 滞在費", "滞在費"], ["⑩ その他の経費", "その他の経費"],
  ])("%s は丸数字と空白を外して %s にする", (legalLabel, expected) => {
    expect(legalCategoryName(legalLabel)).toBe(expected);
    expect(submissionLedgerRow("representatives", { ...entry, legalLabel }, book)[0]).toBe(expected);
    expect(submissionLedgerRow("councillors", { ...entry, legalLabel }, book)[0]).toBe(expected);
  });
  test("全角の空白・空白なしでも外し、丸数字で始まらない区分はそのまま、区分なしは null", () => {
    expect(legalCategoryName("⑨\u3000滞在費")).toBe("滞在費");
    expect(legalCategoryName("⑨滞在費")).toBe("滞在費");
    expect(legalCategoryName("その他")).toBe("その他");
    expect(legalCategoryName(null)).toBeNull();
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
  expect(lines[1]).toBe('"滞在費","A""B,C","1200","2026-04-03","","東京タクシー","東京都千代田区","国会から事務所へ","12","",""');
  expect(lines[2]).toBe("");
});

test("数式として評価される文字で始まる文字列のセルは先頭に ' を付け、金額はそのまま出す", () => {
  const row = submissionLedgerRow("representatives", { ...entry, description: "=1+1", payeeName: "@SUM(A1)", note: "-2+3", amount: -500 }, book);
  expect(row[1]).toBe("'=1+1");
  expect(row[2]).toBe("-500");
  expect(row[5]).toBe("'@SUM(A1)");
  expect(row[7]).toBe("'-2+3");
});

describe("並び順", () => {
  const at = (id: string, legalLabel: string | null, entryDate: string, receiptNumber: number | null = null): SubmissionLedgerEntry => ({ ...entry, id, legalLabel, entryDate, receiptNumber, documentId: receiptNumber === null ? null : `d${id}` });
  const ids = (entries: SubmissionLedgerEntry[]) => entries.map((e) => e.id);

  test("大項目の番号順（① → ⑩）、同じ大項目の中では年月日順に並べる", () => {
    const entries = [
      at("1", "⑩ その他の経費", "2026-04-01"),
      at("2", "② 光熱水費", "2026-05-01"),
      at("3", "⑨ 滞在費", "2026-04-02"),
      at("4", "① 人件費", "2026-06-01"),
      at("5", "② 光熱水費", "2026-04-15"),
      at("6", "③ 備品・消耗品費", "2026-04-01"),
    ];
    expect(ids(sortSubmissionLedgerEntries(entries))).toEqual(["4", "5", "2", "6", "3", "1"]);
  });

  test("支出項目から丸数字を外しても、丸数字の番号順に並べる", () => {
    const labels = ["⑩ その他の経費", "⑥ 広報紙誌の発行その他の事業費", "① 人件費", "④ 事務所費"];
    const entries = labels.map((label, i) => at(String(i + 1), label, "2026-04-01"));
    const lines = buildSubmissionLedgerCsv("councillors", book, entries).slice(1).split("\r\n");
    expect(lines.slice(1, 5).map((line) => line.split(",")[0])).toEqual(['"人件費"', '"事務所費"', '"広報紙誌の発行その他の事業費"', '"その他の経費"']);
  });

  test("文字列の比較ではなく丸数字の番号で並べる", () => {
    expect([..."①②③④⑤⑥⑦⑧⑨⑩"].map((c) => legalCategoryNumber(`${c} 区分`))).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(legalCategoryNumber(null)).toBeNull();
    expect(legalCategoryNumber("その他")).toBeNull();
  });

  test("大項目も年月日も同じなら領収書等番号順（書類なし・未採番は後ろ）、それも同じなら登録順", () => {
    const entries = [
      at("10", "⑨ 滞在費", "2026-04-01"),
      at("9", "⑨ 滞在費", "2026-04-01"),
      at("3", "⑨ 滞在費", "2026-04-01", 20),
      at("4", "⑨ 滞在費", "2026-04-01", 7),
    ];
    expect(ids(sortSubmissionLedgerEntries(entries))).toEqual(["4", "3", "9", "10"]);
  });

  test("大項目を持たない科目の行は最後に年月日順で並べる", () => {
    const entries = [
      at("1", null, "2026-05-01"),
      at("2", "⑩ その他の経費", "2026-12-01"),
      at("3", null, "2026-04-01"),
      at("4", "① 人件費", "2026-04-01"),
    ];
    expect(ids(sortSubmissionLedgerEntries(entries))).toEqual(["4", "2", "3", "1"]);
  });

  test("CSV の行も同じ順に並べる（衆議院・参議院とも）", () => {
    const entries = [at("1", "⑨ 滞在費", "2026-04-01"), at("2", "① 人件費", "2026-05-01")];
    for (const house of ["representatives", "councillors"] as const) {
      const lines = buildSubmissionLedgerCsv(house, book, entries).slice(1).split("\r\n");
      expect([lines[1], lines[2]].map((line) => line.split(",")[0])).toEqual(['"人件費"', '"滞在費"']);
    }
  });
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
