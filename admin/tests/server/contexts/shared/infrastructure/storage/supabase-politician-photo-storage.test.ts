import { createClient } from "@supabase/supabase-js";
import { SupabasePoliticianPhotoStorage } from "@/server/contexts/shared/infrastructure/storage/supabase-politician-photo-storage";

jest.mock("@supabase/supabase-js", () => ({ createClient: jest.fn() }));

const upload = jest.fn();
const from = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  upload.mockResolvedValue({ data: {}, error: null });
  from.mockReturnValue({ upload });
  jest.mocked(createClient).mockReturnValue({ storage: { from } } as never);
  jest.replaceProperty(process, "env", {
    ...process.env,
    SUPABASE_URL: "https://storage.example.test",
    SUPABASE_SERVICE_ROLE_KEY: "test-key",
    PUBLISHED_ASSET_BUCKET: "",
  });
});
afterEach(() => jest.restoreAllMocks());

const bytes = new Uint8Array([1, 2, 3]);

test("バケット名が未設定なら supabase/config.toml と同名の published-assets を使う", async () => {
  await SupabasePoliticianPhotoStorage.fromEnv().upload("politicians/1/a.png", bytes, "image/png");
  expect(from).toHaveBeenCalledWith("published-assets");
});

test("PUBLISHED_ASSET_BUCKET が設定されていれば前後の空白を落としてその値を使う", async () => {
  process.env.PUBLISHED_ASSET_BUCKET = " assets ";
  await SupabasePoliticianPhotoStorage.fromEnv().upload("politicians/1/a.png", bytes, "image/png");
  expect(from).toHaveBeenCalledWith("assets");
});

test("アップロードに失敗したら published-assets バケットの作成を案内する", async () => {
  jest.spyOn(console, "error").mockImplementation(() => {});
  upload.mockResolvedValue({ data: null, error: new Error("Bucket not found") });
  await expect(
    SupabasePoliticianPhotoStorage.fromEnv().upload("politicians/1/a.png", bytes, "image/png"),
  ).rejects.toThrow('Storage バケット "published-assets" が作成されているか確認してください');
});
