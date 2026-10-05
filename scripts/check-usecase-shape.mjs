/**
 * usecase の「形」を機械的に検査する（#1624）。
 *
 * ガイド（docs/backend-architecture-guide.md「Usecases の形」）で定めた次の 2 点を検査する:
 *   1. 1 ファイルに 1 クラス
 *   2. public メソッドは `execute` だけ（constructor と private / protected メソッドは可）
 *
 * usecase に操作メソッドを並べると、「この状態でこの操作をしてよいか」の業務ルールが
 * 同じクラスの中で何か所にも重複する。形を機械的に縛ることで、ルールをドメインに置く
 * 以外の選択肢を取りにくくするのが狙い。
 *
 * 既存の違反は KNOWN_VIOLATIONS に列挙してある。リファクタで解消したら該当行を消す
 * （解消済みなのに残っている例外は「もう不要」として検査が落ちるので、消し忘れは起きない）。
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import ts from "typescript";

/** 検査対象のアプリ（リポジトリルートからの相対パス） */
const SCAN_ROOTS = ["admin/src", "webapp/src"];

/**
 * 解消待ちの既存違反。キーはリポジトリルートからの相対パス、値は「何が違反か」。
 * 後続の Issue がリファクタするたびに 1 行ずつ消す。新しい違反をここに足してはいけない。
 */
export const KNOWN_VIOLATIONS = {
  // research-fund: 1 クラスに操作メソッドが並び、業務ルールの判定が重複している
  "admin/src/server/contexts/research-fund/application/usecases/manage-book-usecase.ts":
    "操作メソッドが public に並んでいる（execute が無い）",
  "admin/src/server/contexts/research-fund/application/usecases/manage-journal-review-usecase.ts":
    "操作メソッドが public に並んでいる（execute が無い）",
  "admin/src/server/contexts/research-fund/application/usecases/manage-prompt-usecase.ts":
    "操作メソッドが public に並んでいる（execute が無い）",
  "admin/src/server/contexts/research-fund/application/usecases/manage-scan-usecase.ts":
    "操作メソッドが public に並んでいる（execute が無い）",
  "admin/src/server/contexts/research-fund/application/usecases/process-scan-jobs-usecase.ts":
    "retry() が public",
  "admin/src/server/contexts/research-fund/application/usecases/publish-journal-entries-usecase.ts":
    "操作メソッドが public に並んでいる（execute が無い）",
  "admin/src/server/contexts/research-fund/application/usecases/test-prompt-usecase.ts":
    "listDocuments() が public",
  // report: 1 ファイルに複数クラス / 操作メソッドが public に並んでいる
  "admin/src/server/contexts/report/application/usecases/manage-counterpart-usecase.ts":
    "1 ファイルに複数クラス",
  "admin/src/server/contexts/report/application/usecases/manage-donor-usecase.ts":
    "1 ファイルに複数クラス",
  "admin/src/server/contexts/report/application/usecases/xml-export-usecase.ts":
    "generateFilename() が public",
  // shared / auth
  "admin/src/server/contexts/shared/application/usecases/manage-politician-usecase.ts":
    "操作メソッドが public に並んでいる（execute が無い）",
  "admin/src/server/contexts/auth/application/usecases/get-all-users-usecase.ts":
    "checkPermission() が public",
  // usecase ではなくヘルパー関数が usecases/ に置かれている（配置ごと見直す）
  "admin/src/server/contexts/data-import/application/usecases/read-sync-import-file-text.ts":
    "クラスではなく関数",
};

const USECASE_PATH = /(^|\/)application\/usecases\/[^/]+\.ts$/;

/** `admin/src` 以下を再帰的に歩いて usecase ファイルのリポジトリ相対パスを返す */
export function findUsecaseFiles(repoRoot, scanRoots = SCAN_ROOTS) {
  const found = [];

  const walk = (absDir) => {
    for (const entry of readdirSync(absDir, { withFileTypes: true })) {
      const abs = join(absDir, entry.name);
      if (entry.isDirectory()) {
        walk(abs);
        continue;
      }
      const rel = relative(repoRoot, abs).split(sep).join("/");
      if (USECASE_PATH.test(rel) && !rel.endsWith(".test.ts") && !rel.endsWith(".d.ts")) {
        found.push(rel);
      }
    }
  };

  for (const root of scanRoots) {
    const abs = join(repoRoot, root);
    if (statSync(abs, { throwIfNoEntry: false })?.isDirectory()) walk(abs);
  }
  return found.sort();
}

const memberName = (node) =>
  ts.isIdentifier(node.name) || ts.isStringLiteral(node.name)
    ? node.name.text
    : node.name.getText(node.getSourceFile());

function publicMethodNames(cls, sourceFile) {
  const names = [];
  for (const member of cls.members) {
    if (
      !ts.isMethodDeclaration(member) &&
      !ts.isGetAccessorDeclaration(member) &&
      !ts.isSetAccessorDeclaration(member)
    ) {
      continue;
    }
    if (ts.isPrivateIdentifier(member.name)) continue;
    const modifiers = ts.getCombinedModifierFlags(member);
    if (modifiers & (ts.ModifierFlags.Private | ts.ModifierFlags.Protected)) continue;
    const { line } = sourceFile.getLineAndCharacterOfPosition(member.name.getStart(sourceFile));
    names.push({ name: memberName(member), line: line + 1 });
  }
  return names;
}

/**
 * 1 ファイル分の検査。違反メッセージの配列を返す（空なら合格）。
 * ディスクを触らないので、テストからはソース文字列を直接渡せる。
 */
export function checkUsecaseSource(filePath, sourceText) {
  const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true);

  const classes = [];
  const visit = (node) => {
    if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) classes.push(node);
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  const violations = [];

  if (classes.length === 0) {
    violations.push("usecase はクラスで実装する（1 ファイル 1 クラス）");
  } else if (classes.length > 1) {
    const names = classes.map((cls) => cls.name?.text ?? "(無名クラス)").join(", ");
    violations.push(`1 ファイルに 1 クラスだけ置く（見つかったクラス: ${names}）`);
  }

  for (const cls of classes) {
    const className = cls.name?.text ?? "(無名クラス)";
    const methods = publicMethodNames(cls, sourceFile);
    const extra = methods.filter((m) => m.name !== "execute");
    if (extra.length > 0) {
      const detail = extra.map((m) => `${m.name}() (L${m.line})`).join(", ");
      violations.push(
        `${className} の public メソッドは execute だけにする（余分な public: ${detail}）`,
      );
    }
    if (!methods.some((m) => m.name === "execute")) {
      violations.push(`${className} に public な execute メソッドが無い`);
    }
  }

  return violations;
}

/**
 * リポジトリ全体を検査する。
 * - `violations`: 例外に載っていない違反
 * - `staleExceptions`: もう違反していない（= 削除すべき）例外エントリ
 */
export function checkRepository(repoRoot, { scanRoots, knownViolations = KNOWN_VIOLATIONS } = {}) {
  const files = findUsecaseFiles(repoRoot, scanRoots);
  const violations = [];
  const violatingPaths = new Set();

  for (const file of files) {
    const messages = checkUsecaseSource(file, readFileSync(join(repoRoot, file), "utf8"));
    if (messages.length === 0) continue;
    violatingPaths.add(file);
    if (file in knownViolations) continue;
    violations.push({ file, messages });
  }

  const staleExceptions = Object.keys(knownViolations)
    .filter((file) => !violatingPaths.has(file))
    .sort();

  return { files, violations, staleExceptions };
}
