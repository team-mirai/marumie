module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  // テストは tests/ に src/ と同じ階層で置く方針（src/ 配下の *.test.ts は意図的に収集しない）。
  // src/ 配下に置かれたテストは dependency-cruiser の no-tests-in-src ルールで検出される。
  roots: ["<rootDir>/tests"],
  // 単発実行（CI / pnpm verify）では watchman の恩恵が無く、watchman が壊れた環境では
  // jest がテストを 1 件も収集せず exit 0 で素通りするため、常に node crawler で収集する。
  watchman: false,
  testMatch: ["**/*.test.ts", "**/*.test.tsx"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx"],
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
  moduleNameMapper: {
    "^client-only$": "<rootDir>/tests/__mocks__/server-only.js",
    "^server-only$": "<rootDir>/tests/__mocks__/server-only.js",
    "^@/shared/(.*)$": "<rootDir>/../shared/$1",
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  collectCoverageFrom: ["src/**/*.{ts,tsx}", "!src/**/*.d.ts"],
  coverageReporters: ["text", "lcov"],
};
