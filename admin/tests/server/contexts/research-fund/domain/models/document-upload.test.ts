import {
  DOCUMENT_UPLOAD_MAX_BYTES,
  DocumentUploadKey,
  documentUploadSizeError,
  validateUploadedDocument,
} from "@/server/contexts/research-fund/domain/models/document-upload";

const UUID = "9d0b7a52-3a8e-4f0e-9a51-1f2b3c4d5e6f";
const owner = { politicianId: "2", userId: "user-1" };
const PDF = new TextEncoder().encode("%PDF-1.7\n");

describe("documentUploadSizeError", () => {
  it("accepts up to the limit", () => {
    expect(documentUploadSizeError(1)).toBeNull();
    expect(documentUploadSizeError(DOCUMENT_UPLOAD_MAX_BYTES)).toBeNull();
  });
  it("rejects files over the limit with the limit in the message", () => {
    expect(documentUploadSizeError(DOCUMENT_UPLOAD_MAX_BYTES + 1, "scan.pdf")).toBe(
      "1ファイル20MBまでです（scan.pdf）",
    );
  });
  it.each([0, -1, Number.NaN])("rejects an empty or broken size (%s)", (size) => {
    expect(documentUploadSizeError(size)).toBe("空のファイルはアップロードできません");
  });
});

describe("DocumentUploadKey", () => {
  it("accepts a key issued under the owner's prefix", () => {
    expect(DocumentUploadKey.prefix(owner)).toBe("uploads/2/user-1/");
    expect(DocumentUploadKey.belongsTo(`uploads/2/user-1/${UUID}`, owner)).toBe(true);
  });
  it.each([
    ["a registered original", UUID],
    ["another user's upload", `uploads/2/user-2/${UUID}`],
    ["another politician's upload", `uploads/3/user-1/${UUID}`],
    ["a path escaping the prefix", `uploads/2/user-1/../../${UUID}`],
    ["a nested path", `uploads/2/user-1/${UUID}/x`],
    ["a non-UUID name", "uploads/2/user-1/receipt.pdf"],
  ])("rejects %s", (_, key) => {
    expect(DocumentUploadKey.belongsTo(key, owner)).toBe(false);
  });
});

describe("validateUploadedDocument", () => {
  it("returns the detected format", () => {
    expect(validateUploadedDocument(PDF)).toEqual({ status: "valid", value: "application/pdf" });
  });
  it("rejects unsupported content", () => {
    expect(validateUploadedDocument(new TextEncoder().encode("hello"))).toMatchObject({
      status: "invalid",
      errors: [{ code: "RF_INVALID_DOCUMENT" }],
    });
  });
  it("rejects content over the size limit", () => {
    const bytes = new Uint8Array(DOCUMENT_UPLOAD_MAX_BYTES + 1);
    bytes.set(PDF);
    expect(validateUploadedDocument(bytes)).toMatchObject({
      status: "invalid",
      errors: [{ message: "1ファイル20MBまでです" }],
    });
  });
  it("rejects empty content", () => {
    expect(validateUploadedDocument(new Uint8Array())).toMatchObject({ status: "invalid" });
  });
});
