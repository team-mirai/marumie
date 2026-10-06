import {
  buildSubmissionLedgerCsv,
  isParliamentHouse,
  submissionLedgerFilename,
  submissionLedgerHeaders,
  submissionLedgerRow,
  submissionLedgerWarnings,
  type SubmissionLedgerEntry,
} from "@/server/contexts/research-fund/domain/models/submission-ledger";

const entry: SubmissionLedgerEntry = { id: "1", entryDate: "2026-04-03", source: "scan", legalLabel: "⑨ 滞在費", description: "タクシー代", amount: 1200, payeeName: "東京タクシー", payeeAddress: "東京都千代田区", note: "国会から事務所へ", documentId: "5", receiptAbsenceReason: null };
const noReceipt: SubmissionLedgerEntry = { ...entry, id: "2", source: "manual", documentId: null, receiptAbsenceReason: "自動券売機で購入したため" };

describe("衆議院のフォーマット", () => {
  test("議員課の Excel と同じ列順で並べる", () => {
    expect(submissionLedgerHeaders("representatives")).toEqual([
      "支出項目", "支出の目的", "金額", "年月日", "資金管理団体からの支出",
      "支出を受けた者の氏名（団体にあっては、その名称）", "支出を受けた者の住所（団体にあっては、主たる事務所の所在地）",
      "備考", "領収書等番号・徴難", "領収書等を徴し難かった事情", "メモ",
    ]);
  });
  test("1 仕訳を 1 行にし、決まっていない列は空欄にする", () => {
    expect(submissionLedgerRow("representatives", entry)).toEqual(["⑨ 滞在費", "タクシー代", "1200", "2026-04-03", "", "東京タクシー", "東京都千代田区", "国会から事務所へ", "", "", ""]);
    expect(submissionLedgerRow("representatives", noReceipt)[9]).toBe("自動券売機で購入したため");
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
    expect(submissionLedgerRow("councillors", noReceipt)).toEqual(["⑨ 滞在費", "タクシー代", "1200", "2026-04-03", "", "", "東京タクシー", "東京都千代田区", "国会から事務所へ", "", "自動券売機で購入したため", "", "", ""]);
  });
});

test("null の値（区分なし・支払先未設定・特記事項なし）は空欄で出す", () => {
  const row = submissionLedgerRow("representatives", { ...entry, legalLabel: null, payeeName: null, payeeAddress: null, note: null });
  expect([row[0], row[5], row[6], row[7]]).toEqual(["", "", "", ""]);
});

test("CSV は UTF-8 BOM 付き・CRLF で、全セルを引用符で囲み引用符をエスケープする", () => {
  const csv = buildSubmissionLedgerCsv("representatives", [{ ...entry, description: 'A"B,C' }]);
  expect(csv.startsWith("﻿\"支出項目\",")).toBe(true);
  const lines = csv.slice(1).split("\r\n");
  expect(lines).toHaveLength(3);
  expect(lines[1]).toBe('"⑨ 滞在費","A""B,C","1200","2026-04-03","","東京タクシー","東京都千代田区","国会から事務所へ","","",""');
  expect(lines[2]).toBe("");
});

test("仕訳が無くても見出し行だけの CSV を出す", () => {
  expect(buildSubmissionLedgerCsv("councillors", []).slice(1).split("\r\n")).toHaveLength(2);
});

test("ファイル名に年度と院を入れる", () => {
  expect(submissionLedgerFilename("representatives", 2026)).toBe("research_fund_ledger_2026_representatives.csv");
  expect(submissionLedgerFilename("councillors", 2026)).toBe("research_fund_ledger_2026_councillors.csv");
});

test.each([["representatives", true], ["councillors", true], ["", false], ["house", false]])("院の指定 %j は %s", (value, expected) => {
  expect(isParliamentHouse(value)).toBe(expected);
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
});
