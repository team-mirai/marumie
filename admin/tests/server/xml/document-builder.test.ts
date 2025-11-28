import { buildSyushiFlagSection } from "@/server/xml/document-builder";

const extractMask = (xml: string): string => {
  const match = xml.match(/<SYUUSHI_UMU>(.*?)<\/SYUUSHI_UMU>/);

  if (!match) {
    throw new Error("SYUUSHI_UMU tag not found in generated XML");
  }

  return match[1];
};

const countOnes = (mask: string) =>
  Array.from(mask).filter((char) => char === "1").length;

describe("buildSyushiFlagSection", () => {
  it("returns the default mask with 第14号様式(6) flagged", () => {
    const mask = extractMask(buildSyushiFlagSection());

    expect(mask).toHaveLength(51);
    expect(mask[5]).toBe("1");
    expect(countOnes(mask)).toBe(1);
  });

  it("marks provided forms and ignores unknown form IDs", () => {
    const mask = extractMask(
      buildSyushiFlagSection(["SYUUSHI07_02", "UNKNOWN", "SYUUSHI08"]),
    );

    expect(mask[1]).toBe("1");
    expect(mask[20]).toBe("1");
    expect(countOnes(mask)).toBe(2);
  });
});

