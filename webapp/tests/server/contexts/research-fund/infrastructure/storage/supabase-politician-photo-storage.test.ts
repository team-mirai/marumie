import { createClient } from "@supabase/supabase-js";
import { SupabasePoliticianPhotoStorage } from "@/server/contexts/research-fund/infrastructure/storage/supabase-politician-photo-storage";

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
    PUBLISHED_ASSET_BUCKET: "",
  });
});
afterEach(() => jest.restoreAllMocks());

test("バケット名が未設定なら admin と同じ published-assets から読む", async () => {
  await SupabasePoliticianPhotoStorage.fromEnv()?.createSignedUrl("politicians/1/a.png", 300);
  expect(from).toHaveBeenCalledWith("published-assets");
});

test("PUBLISHED_ASSET_BUCKET が設定されていれば前後の空白を落としてその値を使う", async () => {
  process.env.PUBLISHED_ASSET_BUCKET = " assets ";
  await SupabasePoliticianPhotoStorage.fromEnv()?.createSignedUrl("politicians/1/a.png", 300);
  expect(from).toHaveBeenCalledWith("assets");
});
