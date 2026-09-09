module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  // テストは tests/ に src/ と同じ階層で置く方針（src/ 配下の *.test.ts は意図的に収集しない）。
  // src/ 配下に置かれたテストは dependency-cruiser の no-tests-in-src ルールで検出される。
  roots: ["<rootDir>/tests"],
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
