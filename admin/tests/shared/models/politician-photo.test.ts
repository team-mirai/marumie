import {
  POLITICIAN_PHOTO_MAX_BYTES,
  PoliticianPhoto,
} from "@/shared/models/politician-photo";

const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]);
const webp = new Uint8Array([...Buffer.from("RIFF"), 0, 0, 0, 0, ...Buffer.from("WEBP")]);

describe("PoliticianPhoto.validate", () => {
  it.each([
    [jpeg, "image/jpeg"],
    [png, "image/png"],
    [webp, "image/webp"],
  ])("先頭バイトから形式を判定する", (bytes, mime) => {
    expect(PoliticianPhoto.validate(bytes)).toEqual({ status: "valid", mime });
  });

  it("空のファイルはエラー", () => {
    expect(PoliticianPhoto.validate(new Uint8Array())).toMatchObject({ status: "invalid" });
  });

  it("対応していない形式はエラー", () => {
    expect(PoliticianPhoto.validate(new Uint8Array(Buffer.from("%PDF-1.7")))).toMatchObject({
      status: "invalid",
      message: "顔写真は JPEG・PNG・WebP の画像にしてください",
    });
  });

  it("上限を超えるとエラー", () => {
    const bytes = new Uint8Array(POLITICIAN_PHOTO_MAX_BYTES + 1);
    bytes.set(jpeg);
    expect(PoliticianPhoto.validate(bytes)).toMatchObject({
      status: "invalid",
      message: "顔写真は3MB以下の画像にしてください",
    });
  });

  it("上限ちょうどは受け付ける", () => {
    const bytes = new Uint8Array(POLITICIAN_PHOTO_MAX_BYTES);
    bytes.set(jpeg);
    expect(PoliticianPhoto.validate(bytes).status).toBe("valid");
  });
});

describe("PoliticianPhoto.buildPath", () => {
  it("議員ごとのディレクトリに形式の拡張子で置く", () => {
    expect(PoliticianPhoto.buildPath("12", "image/webp", "uuid")).toBe(
      "politicians/12/uuid.webp",
    );
  });
});
