import type { BulkUnassignCounterpartInput } from "@/server/contexts/report/presentation/actions/bulk-unassign-counterpart";

describe("BulkUnassignCounterpartInput", () => {
  describe("入力バリデーション", () => {
    it("空の取引IDリストは無効", () => {
      const input: BulkUnassignCounterpartInput = {
        transactionIds: [],
      };
      expect(input.transactionIds).toHaveLength(0);
    });

    it("有効な取引IDリストを受け付ける", () => {
      const input: BulkUnassignCounterpartInput = {
        transactionIds: ["1", "2", "3"],
      };
      expect(input.transactionIds).toHaveLength(3);
      expect(input.transactionIds).toEqual(["1", "2", "3"]);
    });

    it("単一の取引IDを受け付ける", () => {
      const input: BulkUnassignCounterpartInput = {
        transactionIds: ["123"],
      };
      expect(input.transactionIds).toHaveLength(1);
      expect(input.transactionIds[0]).toBe("123");
    });
  });
});
