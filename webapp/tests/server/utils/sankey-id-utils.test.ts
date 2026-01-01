import { createSafariCompatibleId } from "@/server/utils/sankey-id-utils";

describe("createSafariCompatibleId", () => {
  it("should keep alphanumeric characters unchanged", () => {
    expect(createSafariCompatibleId("abc123")).toBe("abc123");
    expect(createSafariCompatibleId("ABC")).toBe("ABC");
    expect(createSafariCompatibleId("test-id")).toBe("test-id");
    expect(createSafariCompatibleId("test_id")).toBe("test_id");
  });

  it("should convert Japanese characters to hash", () => {
    const result = createSafariCompatibleId("寄附");
    expect(result).not.toBe("寄附");
    expect(result).toMatch(/^_[a-z0-9]+_[a-z0-9]+$/);
  });

  it("should convert spaces to hash", () => {
    const result = createSafariCompatibleId("test id");
    expect(result).not.toBe("test id");
    expect(result).toContain("test");
    expect(result).toContain("id");
    expect(result).toMatch(/_[a-z0-9]+/);
  });

  it("should handle mixed content", () => {
    const result = createSafariCompatibleId("income-寄附-123");
    expect(result).toContain("income-");
    expect(result).toContain("-123");
    expect(result).not.toContain("寄附");
  });

  it("should produce consistent results for same input", () => {
    const input = "政治活動費";
    const result1 = createSafariCompatibleId(input);
    const result2 = createSafariCompatibleId(input);
    expect(result1).toBe(result2);
  });

  it("should handle empty string", () => {
    expect(createSafariCompatibleId("")).toBe("");
  });

  it("should handle special characters", () => {
    const result = createSafariCompatibleId("test@#$%");
    expect(result).toContain("test");
    expect(result).not.toContain("@");
    expect(result).not.toContain("#");
    expect(result).not.toContain("$");
    expect(result).not.toContain("%");
  });

  it("should produce different hashes for different characters", () => {
    const result1 = createSafariCompatibleId("あ");
    const result2 = createSafariCompatibleId("い");
    expect(result1).not.toBe(result2);
  });
});
