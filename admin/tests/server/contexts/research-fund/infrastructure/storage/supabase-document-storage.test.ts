import type { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseDocumentStorage } from "@/server/contexts/research-fund/infrastructure/storage/supabase-document-storage";

describe("SupabaseDocumentStorage", () => {
  const bucket = {
    upload: jest.fn(),
    download: jest.fn(),
    createSignedUrl: jest.fn(),
    remove: jest.fn(),
  };
  const from = jest.fn(() => bucket);
  const client = { storage: { from } } as unknown as SupabaseClient;
  const storage = new SupabaseDocumentStorage(client, "private-receipts");
  beforeEach(() => {
    jest.clearAllMocks();
    bucket.upload.mockResolvedValue({ data: {}, error: null });
    bucket.createSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://storage.example/signed" },
      error: null,
    });
    bucket.remove.mockResolvedValue({ data: [], error: null });
    bucket.download.mockResolvedValue({
      data: new Blob([new Uint8Array([1, 2, 3])]),
      error: null,
    });
  });
  it.each(["image/jpeg", "image/png", "application/pdf"])(
    "uploads %s without overwriting existing objects",
    async (mime) => {
      const bytes = new Uint8Array([1, 2]);
      const result = await storage.upload(bytes, mime);
      expect(result).toMatchObject({ status: "valid", value: expect.any(String) });
      if (result.status !== "valid") throw new Error("unexpected validation error");
      expect(bucket.upload).toHaveBeenCalledWith(result.value, bytes, {
        contentType: mime,
        upsert: false,
      });
      expect(from).toHaveBeenCalledWith("private-receipts");
      expect(await storage.upload(bytes, mime)).not.toEqual(result);
    },
  );
  it.each(["text/plain", "image/svg+xml", "image/gif", ""])(
    "rejects %s without contacting storage",
    async (mime) => {
      expect(await storage.upload(new Uint8Array([1]), mime)).toMatchObject({
        status: "invalid",
        errors: [{ code: "RF_INVALID_DOCUMENT" }],
      });
      expect(from).not.toHaveBeenCalled();
    },
  );
  it("rejects empty files", async () => {
    expect(await storage.upload(new Uint8Array(), "application/pdf")).toMatchObject({
      status: "invalid",
    });
    expect(from).not.toHaveBeenCalled();
  });
  it.each([1, 300, 604800])("creates expiring signed URLs (%s seconds)", async (expiresIn) => {
    expect(await storage.createSignedUrl("key", expiresIn)).toEqual({
      status: "valid",
      value: "https://storage.example/signed",
    });
    expect(bucket.createSignedUrl).toHaveBeenCalledWith("key", expiresIn);
  });
  it("rejects invalid expiry without contacting storage", async () => {
    expect(await storage.createSignedUrl("key", 0)).toMatchObject({ status: "invalid" });
    expect(from).not.toHaveBeenCalled();
  });
  it("downloads the original bytes for extraction", async () => {
    expect(await storage.download("key")).toEqual({
      status: "valid",
      value: new Uint8Array([1, 2, 3]),
    });
    expect(bucket.download).toHaveBeenCalledWith("key");
  });
  it.each([
    { data: null, error: new Error("denied") },
    { data: null, error: null },
  ])("reports download failures", async (response) => {
    bucket.download.mockResolvedValue(response);
    await expect(storage.download("key")).rejects.toThrow("原本");
  });
  it("removes only the requested key", async () => {
    await storage.remove("key");
    expect(bucket.remove).toHaveBeenCalledWith(["key"]);
  });
  it("reports upload errors", async () => {
    bucket.upload.mockResolvedValue({ error: new Error("denied") });
    await expect(storage.upload(new Uint8Array([1]), "image/png")).rejects.toThrow("アップロード");
  });
  it.each([
    { data: null, error: new Error("denied") },
    { data: null, error: null },
  ])("reports signing failures", async (response) => {
    bucket.createSignedUrl.mockResolvedValue(response);
    await expect(storage.createSignedUrl("key", 60)).rejects.toThrow("署名URL");
  });
  it("reports cleanup failures", async () => {
    bucket.remove.mockResolvedValue({ error: new Error("denied") });
    await expect(storage.remove("key")).rejects.toThrow("削除");
  });
  it("requires an explicit bucket name", () => {
    expect(() => new SupabaseDocumentStorage(client, " ")).toThrow("バケット");
  });
});
