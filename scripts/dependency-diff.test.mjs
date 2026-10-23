/**
 * 本番デプロイ時の依存パッケージ一覧（scripts/dependency-diff.mjs）のテスト。
 *
 * `pnpm test:dependency-diff` が実行する。
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  diffDependencies,
  findLatestReleaseTag,
  isMajorUpdate,
  parseMajor,
  renderMarkdown,
} from "./dependency-diff.mjs";

// ---------------------------------------------------------------------------
// findLatestReleaseTag
// ---------------------------------------------------------------------------

test("findLatestReleaseTag は名前順で最後の release タグを返す", () => {
  const tags = ["v.1.0.0", "release-20261001-120000", "release-20261015-090000", "foo"];
  assert.equal(findLatestReleaseTag(tags), "release-20261015-090000");
});

test("findLatestReleaseTag は release タグが無ければ null（v.1.0.0 などの別系統は数えない）", () => {
  assert.equal(findLatestReleaseTag([]), null);
  assert.equal(findLatestReleaseTag(["v.1.0.0", "release-foo"]), null);
});

// ---------------------------------------------------------------------------
// parseMajor / isMajorUpdate
// ---------------------------------------------------------------------------

test("parseMajor はよくあるバージョン指定から major を読み取る", () => {
  assert.equal(parseMajor("^6.19.1"), 6);
  assert.equal(parseMajor("~1.2"), 1);
  assert.equal(parseMajor("2.5.15"), 2);
  assert.equal(parseMajor("^5"), 5);
  assert.equal(parseMajor(">=18.0.0"), 18);
  assert.equal(parseMajor("npm:@scope/pkg@^3.1.0"), 3);
});

test("parseMajor は読み取れない指定に null を返す", () => {
  assert.equal(parseMajor("workspace:*"), null);
  assert.equal(parseMajor("latest"), null);
  assert.equal(parseMajor("github:owner/repo"), null);
  assert.equal(parseMajor(null), null);
});

test("isMajorUpdate は major が変わったときだけ true", () => {
  assert.equal(isMajorUpdate("^5.0.0", "^6.0.0"), true);
  assert.equal(isMajorUpdate("^5.0.0", "^5.9.0"), false);
  assert.equal(isMajorUpdate("latest", "^6.0.0"), false);
});

// ---------------------------------------------------------------------------
// diffDependencies
// ---------------------------------------------------------------------------

test("diffDependencies は追加・削除・更新を依存の種類ごとに返す", () => {
  const before = {
    dependencies: { a: "^1.0.0", b: "^2.0.0", c: "^3.0.0" },
    devDependencies: { d: "1.0.0" },
  };
  const after = {
    dependencies: { a: "^1.1.0", c: "^3.0.0", e: "^1.0.0" },
    devDependencies: { d: "2.0.0" },
  };
  assert.deepEqual(diffDependencies(before, after), [
    { field: "dependencies", name: "a", from: "^1.0.0", to: "^1.1.0", kind: "changed", major: false },
    { field: "dependencies", name: "b", from: "^2.0.0", to: null, kind: "removed", major: false },
    { field: "dependencies", name: "e", from: null, to: "^1.0.0", kind: "added", major: false },
    { field: "devDependencies", name: "d", from: "1.0.0", to: "2.0.0", kind: "changed", major: true },
  ]);
});

test("diffDependencies は変更が無ければ空", () => {
  const pkg = { dependencies: { a: "^1.0.0" } };
  assert.deepEqual(diffDependencies(pkg, structuredClone(pkg)), []);
});

test("diffDependencies は前回 package.json が無かった場合、すべて追加として扱う", () => {
  assert.deepEqual(diffDependencies(null, { dependencies: { a: "^1.0.0" } }), [
    { field: "dependencies", name: "a", from: null, to: "^1.0.0", kind: "added", major: false },
  ]);
});

// ---------------------------------------------------------------------------
// renderMarkdown
// ---------------------------------------------------------------------------

const base = {
  baseTag: "release-20261001-120000",
  baseSha: "1111111aaaaaaa",
  headSha: "2222222bbbbbbb",
};

test("renderMarkdown は変更が無ければその旨を出す", () => {
  const markdown = renderMarkdown({
    ...base,
    sections: [{ label: "ルート", path: "package.json", changes: [] }],
  });
  assert.match(markdown, /release-20261001-120000/);
  assert.match(markdown, /直接依存パッケージの変更はありません/);
  assert.doesNotMatch(markdown, /\| パッケージ/);
});

test("renderMarkdown はアプリごとに表を出し、major 更新を見分けられる", () => {
  const markdown = renderMarkdown({
    ...base,
    sections: [
      { label: "ルート", path: "package.json", changes: [] },
      {
        label: "webapp",
        path: "webapp/package.json",
        changes: diffDependencies(
          { dependencies: { next: "^15.0.0", zod: "^3.1.0" } },
          { dependencies: { next: "^16.0.0", zod: "^3.2.0" } },
        ),
      },
      {
        label: "admin",
        path: "admin/package.json",
        changes: diffDependencies({}, { devDependencies: { jest: "^30.0.0" } }),
      },
    ],
  });
  assert.doesNotMatch(markdown, /### ルート/);
  assert.match(markdown, /### webapp（`webapp\/package.json`）/);
  assert.match(markdown, /### admin（`admin\/package.json`）/);
  assert.match(markdown, /変更 3 件（うち major 更新 1 件）/);
  assert.match(
    markdown,
    /\| `next` \| dependencies \| `\^15\.0\.0` \| `\^16\.0\.0` \| ⚠️ \*\*major\*\* \|/,
  );
  assert.match(markdown, /\| `zod` \| dependencies \| `\^3\.1\.0` \| `\^3\.2\.0` \| 更新 \|/);
  assert.match(markdown, /\| `jest` \| devDependencies \| （なし） \| `\^30\.0\.0` \| 追加 \|/);
});
