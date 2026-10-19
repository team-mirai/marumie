import { requireCronResponse } from "@/server/contexts/auth/presentation/loaders/require-cron-response";

describe("requireCronResponse", () => {
  it("CRON_SECRET と一致する Bearer トークンなら通す", () => {
    expect(requireCronResponse("Bearer secret-value", "secret-value")).toBeNull();
  });

  it.each([
    ["ヘッダーが無い", null],
    ["トークンが違う", "Bearer wrong-value"],
    ["Bearer が付いていない", "secret-value"],
    ["長さが違う", "Bearer secret-value-longer"],
  ])("%s ときは 401 を返す", (_label, authorization) => {
    expect(requireCronResponse(authorization, "secret-value")?.status).toBe(401);
  });

  it.each([
    ["未設定", undefined],
    ["空文字", ""],
  ])("CRON_SECRET が%sなら、何を送っても通さない", (_label, secret) => {
    expect(requireCronResponse("Bearer ", secret)?.status).toBe(401);
    expect(requireCronResponse("Bearer undefined", secret)?.status).toBe(401);
  });
});
