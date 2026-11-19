import { isBigIntId, isSerialId } from "@/server/contexts/research-fund/domain/models/entity-id";

describe("isSerialId", () => {
  test.each(["1", "42", "9007199254740993"])(
    "正の整数の文字列 %s は ID として受け付ける",
    (id) => {
      expect(isSerialId(id)).toBe(true);
    },
  );

  test.each(["", "0", "00", "-1", "01", "1.5", "+1", "abc", "1; drop", " 1", "1 ", "１"])(
    "ID として不正な %j は受け付けない",
    (id) => {
      expect(isSerialId(id)).toBe(false);
    },
  );
});

describe("isBigIntId", () => {
  test("bigint の上限ちょうどまで受け付け、超えたら受け付けない", () => {
    expect(isBigIntId("9223372036854775807")).toBe(true);
    expect(isBigIntId("9223372036854775808")).toBe(false);
    // 20桁以上は桁数で弾く（BigInt に読む前に落とす）
    expect(isBigIntId("10000000000000000000")).toBe(false);
  });

  test.each(["", "0", "01", "-1", "1.5", "abc"])("ID として不正な %j は受け付けない", (id) => {
    expect(isBigIntId(id)).toBe(false);
  });
});
