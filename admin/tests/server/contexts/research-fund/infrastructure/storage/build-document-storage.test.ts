import { createClient } from "@supabase/supabase-js";
import { buildDocumentStorage } from "@/server/contexts/research-fund/infrastructure/storage/build-document-storage";

jest.mock("@supabase/supabase-js", () => ({ createClient: jest.fn() }));

const from = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  from.mockReturnValue({
    createSignedUrl: jest
      .fn()
      .mockResolvedValue({ data: { signedUrl: "https://storage.example.test/signed" }, error: null }),
  });
  jest.mocked(createClient).mockReturnValue({ storage: { from } } as never);
  jest.replaceProperty(process, "env", {
    ...process.env,
    SUPABASE_URL: "https://storage.example.test",
    SUPABASE_SERVICE_ROLE_KEY: "test-key",
    RESEARCH_FUND_DOCUMENT_BUCKET: "",
  });
});
afterEach(() => jest.restoreAllMocks());

test.each(["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"])("%s がなければ組み立てない", (key) => {
  process.env[key] = "";
  expect(() => buildDocumentStorage()).toThrow("領収書ストレージが未設定です");
  expect(createClient).not.toHaveBeenCalled();
});

test("バケット名が未設定なら supabase/config.toml と同名の既定バケットを使う", async () => {
  await buildDocumentStorage().createSignedUrl("receipts/3", 300);
  expect(createClient).toHaveBeenCalledWith("https://storage.example.test", "test-key", {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  expect(from).toHaveBeenCalledWith("private-receipts");
});

test("バケット名が設定されていれば前後の空白を落としてその値を使う", async () => {
  process.env.RESEARCH_FUND_DOCUMENT_BUCKET = " receipts ";
  await buildDocumentStorage().createSignedUrl("receipts/3", 300);
  expect(from).toHaveBeenCalledWith("receipts");
});
