import { discloseReceipt } from "@/server/contexts/research-fund/domain/models/research-fund-receipt-publication";

describe("discloseReceipt", () => {
  const expense = {
    id: "1",
    hasReceipt: true,
    receiptReady: true,
    receiptMime: "application/pdf",
  };

  it("領収書を公開している間は、領収書の情報をそのまま返す", () => {
    expect(discloseReceipt(expense, true)).toEqual(expense);
  });

  it("領収書の公開を止めている間は、書類が付いていても領収書なしとして返す", () => {
    expect(discloseReceipt(expense, false)).toEqual({
      id: "1",
      hasReceipt: false,
      receiptReady: false,
      receiptMime: null,
    });
  });

  it("公開を止めても元の明細は書き換えない", () => {
    discloseReceipt(expense, false);

    expect(expense.hasReceipt).toBe(true);
  });
});
