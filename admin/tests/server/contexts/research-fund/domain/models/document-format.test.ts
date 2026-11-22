import {
  DOCUMENT_MIME_TYPES,
  DocumentFormat,
} from "@/server/contexts/research-fund/domain/models/document-format";

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const PDF = new TextEncoder().encode("%PDF-1.7\n");

describe("DOCUMENT_MIME_TYPES", () => {
  it("lists JPEG, PNG and PDF", () => {
    expect(DOCUMENT_MIME_TYPES).toEqual(["image/jpeg", "image/png", "application/pdf"]);
  });
});

describe("DocumentFormat.isSupported", () => {
  it.each(DOCUMENT_MIME_TYPES)("accepts %s", (mime) => {
    expect(DocumentFormat.isSupported(mime)).toBe(true);
  });
  it.each(["image/gif", "image/svg+xml", "", "constructor", "toString"])("rejects %s", (mime) => {
    expect(DocumentFormat.isSupported(mime)).toBe(false);
  });
});

describe("DocumentFormat.extension", () => {
  it.each([
    ["image/jpeg", "jpg"],
    ["image/png", "png"],
    ["application/pdf", "pdf"],
    ["image/gif", null],
  ])("returns the extension of %s", (mime, extension) => {
    expect(DocumentFormat.extension(mime)).toBe(extension);
  });
});

describe("DocumentFormat.detect", () => {
  it.each([
    [JPEG, "image/jpeg"],
    [PNG, "image/png"],
    [PDF, "application/pdf"],
    [new TextEncoder().encode("GIF89a"), null],
    [new TextEncoder().encode("<svg/>"), null],
    [new Uint8Array([0xff, 0xd8]), null],
    [new Uint8Array(), null],
  ])("detects the format from the leading bytes", (bytes, mime) => {
    expect(DocumentFormat.detect(bytes)).toBe(mime);
  });
});

describe("DocumentFormat.unsupportedReason", () => {
  it("returns null for a supported format", () => {
    expect(DocumentFormat.unsupportedReason("application/pdf", "upload")).toBeNull();
  });
  it.each([
    ["upload", "JPG・PNG・PDFのみアップロードできます"],
    ["extraction", "JPG・PNG・PDFのみ読み取れます"],
    ["masking", "JPG・PNG・PDFのみ公開用の版を作れます"],
  ] as const)("returns the reason for %s", (operation, message) => {
    expect(DocumentFormat.unsupportedReason("image/gif", operation)).toBe(message);
  });
});

describe("DocumentFormat.validate", () => {
  it("returns the supported MIME", () => {
    expect(DocumentFormat.validate("image/png", "extraction")).toEqual({
      status: "valid",
      value: "image/png",
    });
  });
  it.each([
    ["extraction", "JPG・PNG・PDFのみ読み取れます"],
    ["masking", "JPG・PNG・PDFのみ公開用の版を作れます"],
  ] as const)("rejects an unsupported format for %s", (operation, message) => {
    expect(DocumentFormat.validate("image/gif", operation)).toMatchObject({
      status: "invalid",
      errors: [{ code: "RF_INVALID_DOCUMENT", message }],
    });
  });
});
