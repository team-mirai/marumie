const constructorMock = jest.fn();

jest.mock("@prisma/client", () => ({
  PrismaClient: class {
    constructor(options: unknown) {
      constructorMock(options);
    }
  },
}));

// NODE_ENV は型定義上 readonly なので、テストでの差し替えはキャスト経由で行う
const setNodeEnv = (value: string | undefined) => {
  (process.env as Record<string, string | undefined>).NODE_ENV = value;
};

const loadPrisma = (nodeEnv: string) => {
  jest.resetModules();
  constructorMock.mockClear();
  setNodeEnv(nodeEnv);
  // 前回のモジュール読み込みが残したグローバルキャッシュを持ち越さない
  delete (globalThis as { prisma?: unknown }).prisma;
  require("@/server/contexts/shared/infrastructure/prisma");
  return constructorMock.mock.calls[0][0] as { log: string[] };
};

describe("prisma client", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    setNodeEnv(originalNodeEnv);
    delete (globalThis as { prisma?: unknown }).prisma;
  });

  it("本番ではクエリログを出さない", () => {
    expect(loadPrisma("production").log).toEqual([]);
  });

  it("開発ではクエリログを出す", () => {
    expect(loadPrisma("development").log).toEqual(["query"]);
  });

  it("テストではクエリログを出す", () => {
    expect(loadPrisma("test").log).toEqual(["query"]);
  });
});
