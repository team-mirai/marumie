/**
 * usecase の形の検査（scripts/check-usecase-shape.mjs）のテスト。
 *
 * `pnpm check:usecase-shape` が実行するのはこのファイル。リポジトリ全体の検査自体を
 * テストとして書いてあるので、違反する usecase を足すと `pnpm verify` と CI が落ちる。
 */
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import {
  checkRepository,
  checkUsecaseSource,
  findUsecaseFiles,
  KNOWN_VIOLATIONS,
} from "./check-usecase-shape.mjs";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const dummyPath = "admin/src/server/contexts/x/application/usecases/do-something-usecase.ts";

// ---------------------------------------------------------------------------
// リポジトリ全体の検査
// ---------------------------------------------------------------------------

test("admin / webapp の usecase が形のルールを守っている", () => {
  const { files, violations } = checkRepository(repoRoot);
  assert.ok(files.length > 0, "usecase ファイルが 1 件も見つからない（検査が空振りしている）");
  assert.deepEqual(
    violations,
    [],
    `usecase の形のルール違反:\n${violations
      .map((v) => `  ${v.file}\n    - ${v.messages.join("\n    - ")}`)
      .join("\n")}\n` +
      "docs/backend-architecture-guide.md「Usecases の形」を参照。" +
      "既存の違反をやむを得ず残す場合はメンテナに相談すること（勝手に例外へ足さない）。",
  );
});

test("解消済みの例外は KNOWN_VIOLATIONS から削除されている", () => {
  const { staleExceptions } = checkRepository(repoRoot);
  assert.deepEqual(
    staleExceptions,
    [],
    `もう違反していない例外が残っている。scripts/check-usecase-shape.mjs の KNOWN_VIOLATIONS から該当行を削除すること:\n${staleExceptions
      .map((f) => `  ${f}`)
      .join("\n")}`,
  );
});

test("findUsecaseFiles は admin と webapp の両方を拾う", () => {
  const files = findUsecaseFiles(repoRoot);
  assert.ok(files.some((f) => f.startsWith("admin/src/")));
  assert.ok(files.some((f) => f.startsWith("webapp/src/")));
  assert.ok(files.every((f) => f.endsWith(".ts") && !f.endsWith(".test.ts")));
});

test("KNOWN_VIOLATIONS は理由付きで列挙されている", () => {
  for (const [file, reason] of Object.entries(KNOWN_VIOLATIONS)) {
    assert.ok(typeof reason === "string" && reason.length > 0, `${file} の理由が空`);
  }
});

// ---------------------------------------------------------------------------
// 1 ファイル分の検査
// ---------------------------------------------------------------------------

test("public が execute だけなら合格（private / #private は可）", () => {
  const source = `
    export class DoSomethingUsecase {
      constructor(private repository: Repo) {}
      async execute(id: string) {
        return this.normalize(await this.repository.find(id));
      }
      private normalize(x: Entity) {
        return x;
      }
      #secret() {}
    }
  `;
  assert.deepEqual(checkUsecaseSource(dummyPath, source), []);
});

test("public メソッドを execute 以外に足すと落ちる", () => {
  const source = `
    export class DoSomethingUsecase {
      async execute(id: string) {}
      async remove(id: string) {}
    }
  `;
  const violations = checkUsecaseSource(dummyPath, source);
  assert.equal(violations.length, 1);
  assert.match(violations[0], /public メソッドは execute だけ/);
  assert.match(violations[0], /remove\(\)/);
});

test("public な getter も execute 以外なら落ちる", () => {
  const source = `
    export class DoSomethingUsecase {
      async execute() {}
      get entries() {
        return [];
      }
    }
  `;
  assert.match(checkUsecaseSource(dummyPath, source)[0], /entries\(\)/);
});

test("1 ファイルに複数クラスがあると落ちる", () => {
  const source = `
    export class GetThingUsecase {
      async execute() {}
    }
    export class CreateThingUsecase {
      async execute() {}
    }
  `;
  const violations = checkUsecaseSource(dummyPath, source);
  assert.equal(violations.length, 1);
  assert.match(violations[0], /1 ファイルに 1 クラスだけ/);
  assert.match(violations[0], /GetThingUsecase, CreateThingUsecase/);
});

test("execute が無いと落ちる", () => {
  const source = `
    export class DoSomethingUsecase {
      constructor(private repository: Repo) {}
      private helper() {}
    }
  `;
  assert.match(checkUsecaseSource(dummyPath, source)[0], /public な execute メソッドが無い/);
});

test("protected メソッドは public として数えない", () => {
  const source = `
    export class DoSomethingUsecase {
      async execute() {}
      protected hook() {}
    }
  `;
  assert.deepEqual(checkUsecaseSource(dummyPath, source), []);
});

test("クラスが無いファイルは落ちる", () => {
  const source = `
    export async function doSomething(id: string) {
      return id;
    }
  `;
  assert.match(checkUsecaseSource(dummyPath, source)[0], /クラスで実装する/);
});

test("関数の中に隠したクラスも検査される", () => {
  const source = `
    export function build() {
      class HiddenUsecase {
        async execute() {}
        async remove() {}
      }
      return HiddenUsecase;
    }
  `;
  assert.match(checkUsecaseSource(dummyPath, source)[0], /public メソッドは execute だけ/);
});
