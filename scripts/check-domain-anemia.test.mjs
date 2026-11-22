/**
 * ドメインモデル貧血の検査（scripts/check-domain-anemia.mjs）のテスト。
 *
 * `pnpm check:domain-anemia` が実行するのはこのファイル。リポジトリ全体の検査自体を
 * テストとして書いてあるので、新しい違反を足すと `pnpm verify` と CI が落ちる。
 */
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import {
  checkRepository,
  collectDomainBehaviors,
  collectDomainErrorCodes,
  findRemappedRejections,
  isDomainFile,
  isProductionFile,
  isRemapScope,
  KNOWN_VIOLATIONS,
} from "./check-domain-anemia.mjs";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const parse = (source, fileName = "x.ts") =>
  ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true);

// ---------------------------------------------------------------------------
// リポジトリ全体の検査
// ---------------------------------------------------------------------------

const repository = checkRepository(repoRoot);

test("admin / webapp に新しいドメインモデル貧血が無い", () => {
  assert.ok(
    repository.behaviorCount > 0,
    "ドメインの振る舞いが 1 件も見つからない（検査が空振りしている）",
  );
  assert.deepEqual(
    repository.violations,
    [],
    `ドメインモデル貧血:\n${repository.violations
      .map((v) => `  ${v.file}:${v.line} ${v.name}（${v.key.split(":")[0]}）`)
      .join("\n")}\n` +
      "docs/backend-architecture-guide.md「4.5 ドメインモデル貧血」を参照。\n" +
      "  unused-domain: ドメインの判定を本番コードから呼ぶ（不要なら消す）。テストだけが呼んでいる状態にしない\n" +
      "  remapped-rejection: ドメインが返した却下理由（message）をそのまま返す。文言を変えたいならドメインの文言を直す\n" +
      "既存の違反をやむを得ず残す場合はメンテナに相談すること（勝手に例外へ足さない）。",
  );
});

test("解消済みの例外は KNOWN_VIOLATIONS から削除されている", () => {
  assert.deepEqual(
    repository.staleExceptions,
    [],
    `もう違反していない例外が残っている。scripts/check-domain-anemia.mjs の KNOWN_VIOLATIONS から該当行を削除すること:\n${repository.staleExceptions
      .map((k) => `  ${k}`)
      .join("\n")}`,
  );
});

test("KNOWN_VIOLATIONS は検査名付きのキーと理由で列挙されている", () => {
  for (const [key, reason] of Object.entries(KNOWN_VIOLATIONS)) {
    assert.match(key, /^(unused-domain|remapped-rejection):(admin|webapp)\/src\/.+#.+$/);
    assert.ok(typeof reason === "string" && reason.length > 0, `${key} の理由が空`);
  }
});

// ---------------------------------------------------------------------------
// 新しい違反を足すと落ちる（一時ディレクトリに最小のアプリを作って検査する）
// ---------------------------------------------------------------------------

const fixtureRoot = mkdtempSync(join(tmpdir(), "domain-anemia-"));
after(() => rmSync(fixtureRoot, { recursive: true, force: true }));

function writeFixture(files) {
  const root = mkdtempSync(join(fixtureRoot, "repo-"));
  const all = {
    "admin/tsconfig.json": JSON.stringify({
      compilerOptions: {
        strict: true,
        module: "esnext",
        moduleResolution: "bundler",
        target: "es2022",
        noEmit: true,
        paths: { "@/*": ["./src/*"] },
      },
      include: ["**/*.ts"],
    }),
    ...files,
  };
  for (const [rel, content] of Object.entries(all)) {
    const abs = join(root, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content);
  }
  return root;
}

const MODEL = "admin/src/server/contexts/x/domain/models/entry.ts";
const modelSource = `
export interface Entry { debit: number; credit: number }
export const Entry = {
  validate(entry: Entry): string | null {
    return entry.debit === entry.credit ? null : "貸借が一致しません";
  },
  total: (entry: Entry) => entry.debit,
};
export function isBalanced(entry: Entry) { return Entry.validate(entry) === null; }
`;

test("ドメインの判定がテストからしか呼ばれていないと unused-domain で落ちる", () => {
  const root = writeFixture({
    [MODEL]: modelSource,
    "admin/src/server/contexts/x/application/usecases/save-entry-usecase.ts": `
      import { Entry } from "@/server/contexts/x/domain/models/entry";
      export class SaveEntryUsecase {
        async execute(entry: Entry) {
          // ドメインの validate を呼ばず、同じ判定を書き直している
          if (entry.debit !== entry.credit) throw new Error("貸借が一致しません");
          return Entry.total(entry);
        }
      }
    `,
    "admin/tests/server/contexts/x/domain/models/entry.test.ts": `
      import { Entry, isBalanced } from "@/server/contexts/x/domain/models/entry";
      Entry.validate({ debit: 1, credit: 1 });
      isBalanced({ debit: 1, credit: 1 });
    `,
  });
  const { violations } = checkRepository(root, { apps: ["admin"], knownViolations: {} });
  assert.deepEqual(
    violations.map((v) => v.key),
    [`unused-domain:${MODEL}#isBalanced`],
  );
});

test("ドメインの判定を本番コードから呼べば合格する（同じファイルの中からの呼び出しも数える）", () => {
  const root = writeFixture({
    [MODEL]: modelSource,
    "admin/src/server/contexts/x/application/usecases/save-entry-usecase.ts": `
      import { Entry, isBalanced } from "@/server/contexts/x/domain/models/entry";
      export class SaveEntryUsecase {
        async execute(entry: Entry) {
          if (!isBalanced(entry)) throw new Error("NG");
          return Entry.total(entry);
        }
      }
    `,
  });
  const { violations } = checkRepository(root, { apps: ["admin"], knownViolations: {} });
  assert.deepEqual(violations, []);
});

test("interface 経由で呼ばれるドメインサービスのメソッドは使われていると数える", () => {
  const root = writeFixture({
    "admin/src/server/contexts/x/domain/services/matcher.ts": `
      export interface Matcher { match(a: string): boolean }
      export class ExactMatcher implements Matcher {
        match(a: string) { return a === "x"; }
      }
    `,
    "admin/src/server/contexts/x/presentation/loaders/load.ts": `
      import { ExactMatcher, type Matcher } from "@/server/contexts/x/domain/services/matcher";
      const matcher: Matcher = new ExactMatcher();
      export const load = () => matcher.match("x");
    `,
  });
  const { violations } = checkRepository(root, { apps: ["admin"], knownViolations: {} });
  assert.deepEqual(violations, []);
});

test("ドメインの却下理由を action が別の文言に書き直すと remapped-rejection で落ちる", () => {
  const action = "admin/src/server/contexts/x/presentation/actions/save-entry.ts";
  const root = writeFixture({
    "admin/src/server/contexts/x/domain/types/validation.ts": `
      export const X_ERROR_CODES = { UNBALANCED: "X_UNBALANCED", FUTURE_DATE: "X_FUTURE_DATE" } as const;
    `,
    [action]: `
      import { X_ERROR_CODES } from "@/server/contexts/x/domain/types/validation";
      export function toMessage(error: { code: string; message: string }) {
        switch (error.code) {
          case "X_UNBALANCED":
            return "貸借を確認してください";
          case X_ERROR_CODES.FUTURE_DATE:
            return error.message;
          default:
            return "エラーが発生しました";
        }
      }
    `,
  });
  const { violations } = checkRepository(root, { apps: ["admin"], knownViolations: {} });
  assert.deepEqual(
    violations.map((v) => v.key),
    [`remapped-rejection:${action}#toMessage`],
  );
});

test("例外に載っていても違反が解消していれば staleExceptions に出る", () => {
  const root = writeFixture({
    [MODEL]: `export const Entry = { total: (n: number) => n };`,
    "admin/src/app/page.ts": `
      import { Entry } from "@/server/contexts/x/domain/models/entry";
      export default () => Entry.total(1);
    `,
  });
  const stale = `unused-domain:${MODEL}#Entry.total`;
  const { violations, staleExceptions } = checkRepository(root, {
    apps: ["admin"],
    knownViolations: { [stale]: "解消済み" },
  });
  assert.deepEqual(violations, []);
  assert.deepEqual(staleExceptions, [stale]);
});

// ---------------------------------------------------------------------------
// 部品
// ---------------------------------------------------------------------------

test("collectDomainBehaviors は関数・interface + const のメソッド・クラスの public メソッドを拾い、型や定数は拾わない", () => {
  const sourceFile = parse(`
    export type Kind = "a" | "b";
    export const LIMIT = 10;
    export const KINDS = ["a", "b"] as const;
    export function isKind(x: string) { return x === "a"; }
    export const normalize = (x: string) => x.trim();
    export const Model = {
      validate(x: string) { return x; },
      create: (x: string) => x,
      LABEL: "ラベル",
    } as const;
    export class Service {
      constructor() {}
      run() {}
      private helper() {}
      #secret() {}
    }
    function internal() {}
  `);
  assert.deepEqual(
    collectDomainBehaviors(sourceFile).map((b) => b.name),
    ["isKind", "normalize", "Model.validate", "Model.create", "Service.run"],
  );
});

test("findRemappedRejections は error.message を返すだけの分岐や技術的なコードを拾わない", () => {
  const domainCodes = new Set(["RF_INVALID_DATE"]);
  const sourceFile = parse(`
    function a(e: { code: string; message: string }) {
      switch (e.code) {
        case "RF_INVALID_DATE": return e.message;
        case "NETWORK_ERROR": return "通信に失敗しました";
      }
    }
    const messages = { RF_INVALID_DATE: "日付が不正です" };
  `);
  assert.deepEqual(findRemappedRejections(sourceFile, domainCodes), [
    { name: "messages", line: 8, codes: ["RF_INVALID_DATE"] },
  ]);
});

test("collectDomainErrorCodes は大文字スネークケースの文字列だけを集める", () => {
  const codes = collectDomainErrorCodes(
    parse(`export const C = { A: "RF_INVALID_DATE", B: "draft", C: "OK" } as const;`),
  );
  assert.deepEqual([...codes], ["RF_INVALID_DATE"]);
});

test("パスの分類", () => {
  assert.ok(isDomainFile("admin/src/server/contexts/report/domain/models/report-data.ts"));
  assert.ok(!isDomainFile("admin/src/server/contexts/report/application/usecases/a.ts"));
  assert.ok(isProductionFile("admin/src/app/page.tsx"));
  assert.ok(isProductionFile("shared/models/transaction.ts"));
  assert.ok(!isProductionFile("admin/tests/server/a.test.ts"));
  assert.ok(isRemapScope("admin/src/server/contexts/report/presentation/actions/a.ts"));
  assert.ok(isRemapScope("admin/src/client/components/a.tsx"));
  assert.ok(!isRemapScope("admin/src/server/contexts/report/infrastructure/repositories/a.ts"));
});
