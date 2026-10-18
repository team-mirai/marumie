/**
 * サーバーアクション / Route Handler / 認証後のページが、ロールのガードを通っているかを機械的に検査する（#1772）。
 *
 * サーバーアクションは ID さえ分かればどの画面からでも呼べるので、画面やメニューを隠すだけでは足りない。
 * 「ログインしているか」だけを見るガードでは政治資金担当・調査研究費担当の両方が通ってしまうため、
 * 入口ごとに「どのロールで使える機能か」を宣言させ、宣言の書き忘れをここで落とす（既定で拒否）。
 *
 * 検査する規則: 関数本体の最初の文（"use server" ディレクティブを除く）でガードを呼んでいること。
 * - サーバーアクション（"use server" のファイルの export 関数、関数内 "use server" の関数）→ requireRole
 * - Route Handler（src/app 配下の route.ts の HTTP メソッド）→ requireRoleResponse
 * - 認証後のページ（src/app/(auth) 配下の page.tsx の default export）→ requireRolePage
 *
 * ログイン前・ロール付与前に使う認証フローなど、ロールを問わない入口だけを PUBLIC_ENTRIES に理由付きで列挙する。
 *
 * 調査研究費のデータを変えるサーバーアクションは、閲覧（全議員）より狭い「担当の議員室だけ」に絞るため（#1773）、
 * requireRole ではなく requireResearchFundWriter を最初に呼んでいることも検査する。
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import ts from "typescript";

const ADMIN_ROOT = join(__dirname, "../../../../../..");
const SRC = join(ADMIN_ROOT, "src");

/** ロールを問わない入口。キーは `admin/src` からの相対パス + `#関数名` */
const PUBLIC_ENTRIES: Record<string, string> = {
  "server/contexts/auth/presentation/actions/login.ts#loginWithPassword": "ログイン前に使う",
  "server/contexts/auth/presentation/actions/login-with-google.ts#loginWithGoogle":
    "ログイン前に使う",
  "server/contexts/auth/presentation/actions/logout.ts#logout": "ロールなしのユーザーもログアウトできる必要がある",
  "server/contexts/auth/presentation/actions/request-password-reset.ts#requestPasswordReset":
    "ログイン前に使う",
  "server/contexts/auth/presentation/actions/reset-password.ts#resetPassword":
    "パスワード再設定のリンクから、ロールを問わず使う",
  "server/contexts/auth/presentation/actions/setup-password.ts#setupPassword":
    "招待されたユーザーが初回に使う（ロール付与前でありうる）",
  "server/contexts/auth/presentation/actions/complete-invite-session.ts#completeInviteSession":
    "招待リンクからのセッション確立（ログイン前）",
  "server/contexts/auth/presentation/actions/complete-recovery-session.ts#completeRecoverySession":
    "パスワード再設定リンクからのセッション確立（ログイン前）",
  "server/contexts/auth/presentation/actions/exchange-code-for-session.ts#exchangeCodeForSession":
    "認証コードとセッションの交換（ログイン前）",
  "app/api/auth/callback/route.ts#GET": "認証のコールバック（ログイン前）",
  "app/(auth)/page.tsx#default": "ダッシュボード。データを持たず、どのロールでも開ける",
};

/** 調査研究費のデータを変えるのに research-fund コンテキストの外にあるサーバーアクション */
const RESEARCH_FUND_WRITE_ACTIONS_OUTSIDE_CONTEXT = [
  "server/contexts/shared/presentation/actions/manage-politician.ts#setPoliticianResearchFundPublic",
];

const HTTP_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);

type EntryKind = "action" | "route" | "page";

const GUARDS: Record<EntryKind, readonly string[]> = {
  action: ["requireRole", "requireResearchFundWriter"],
  route: ["requireRoleResponse"],
  page: ["requireRolePage"],
};

interface Entry {
  key: string;
  kind: EntryKind;
  body: ts.Block | undefined;
}

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) return listSourceFiles(abs);
    return /\.tsx?$/.test(entry.name) && !entry.name.endsWith(".d.ts") ? [abs] : [];
  });
}

function hasUseServerDirective(statements: ts.NodeArray<ts.Statement>): boolean {
  for (const statement of statements) {
    if (!ts.isExpressionStatement(statement) || !ts.isStringLiteral(statement.expression)) break;
    if (statement.expression.text === "use server") return true;
  }
  return false;
}

function isExported(node: ts.Node): boolean {
  return (
    ts.canHaveModifiers(node) &&
    (ts.getModifiers(node) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
  );
}

function isDefaultExport(node: ts.Node): boolean {
  return (
    ts.canHaveModifiers(node) &&
    (ts.getModifiers(node) ?? []).some((m) => m.kind === ts.SyntaxKind.DefaultKeyword)
  );
}

type FunctionLike = ts.FunctionDeclaration | ts.ArrowFunction | ts.FunctionExpression;

function blockOf(fn: FunctionLike): ts.Block | undefined {
  return fn.body && ts.isBlock(fn.body) ? fn.body : undefined;
}

/** export されている関数宣言と、関数を初期値に持つ export 変数を列挙する */
function exportedFunctions(sourceFile: ts.SourceFile): { name: string; fn: FunctionLike }[] {
  const found: { name: string; fn: FunctionLike }[] = [];
  for (const statement of sourceFile.statements) {
    if (ts.isFunctionDeclaration(statement) && isExported(statement)) {
      found.push({
        name: isDefaultExport(statement) ? "default" : (statement.name?.text ?? "default"),
        fn: statement,
      });
    }
    if (ts.isVariableStatement(statement) && isExported(statement)) {
      for (const decl of statement.declarationList.declarations) {
        const init = decl.initializer;
        if (init && (ts.isArrowFunction(init) || ts.isFunctionExpression(init))) {
          found.push({ name: decl.name.getText(sourceFile), fn: init });
        }
      }
    }
  }
  return found;
}

function collectEntries(): Entry[] {
  const entries: Entry[] = [];

  for (const abs of listSourceFiles(SRC)) {
    const rel = relative(SRC, abs).split(sep).join("/");
    const sourceFile = ts.createSourceFile(abs, readFileSync(abs, "utf8"), ts.ScriptTarget.Latest, true);

    // ファイル単位の "use server": export した関数がすべてサーバーアクションになる
    if (hasUseServerDirective(sourceFile.statements)) {
      for (const { name, fn } of exportedFunctions(sourceFile)) {
        entries.push({ key: `${rel}#${name}`, kind: "action", body: blockOf(fn) });
      }
    }

    // 関数内の "use server": その関数がサーバーアクションになる（ページ内のインラインアクションなど）
    const visit = (node: ts.Node) => {
      if (ts.isFunctionDeclaration(node) || ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
        const body = blockOf(node);
        if (body && hasUseServerDirective(body.statements)) {
          const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
          entries.push({ key: `${rel}#L${line}`, kind: "action", body });
        }
      }
      ts.forEachChild(node, visit);
    };
    if (!hasUseServerDirective(sourceFile.statements)) visit(sourceFile);

    if (/^app\/.*route\.ts$/.test(rel)) {
      for (const { name, fn } of exportedFunctions(sourceFile)) {
        if (HTTP_METHODS.has(name)) entries.push({ key: `${rel}#${name}`, kind: "route", body: blockOf(fn) });
      }
    }

    if (/^app\/\(auth\)\/(.*\/)?page\.tsx$/.test(rel)) {
      for (const { name, fn } of exportedFunctions(sourceFile)) {
        if (name === "default") entries.push({ key: `${rel}#default`, kind: "page", body: blockOf(fn) });
      }
    }
  }

  return entries;
}

/** 最初の文（ディレクティブを除く）で、指定したガードのどれかを呼んでいるか */
function firstStatementCallsGuard(body: ts.Block | undefined, guards: readonly string[]): boolean {
  if (!body) return false;
  const first = body.statements.find(
    (s) => !(ts.isExpressionStatement(s) && ts.isStringLiteral(s.expression)),
  );
  if (!first) return false;

  let found = false;
  const visit = (node: ts.Node) => {
    if (found) return;
    // 関数の中で呼んでいても、その関数が呼ばれるとは限らないので数えない
    if (ts.isArrowFunction(node) || ts.isFunctionExpression(node) || ts.isFunctionDeclaration(node)) return;
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && guards.includes(node.expression.text)) {
      found = true;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(first);
  return found;
}

describe("ロールのガードの網羅", () => {
  const entries = collectEntries();

  it("検査対象の入口を収集できている（収集の取りこぼしで素通りしないための下限）", () => {
    expect(entries.filter((e) => e.kind === "action").length).toBeGreaterThan(50);
    expect(entries.filter((e) => e.kind === "route").length).toBeGreaterThan(5);
    expect(entries.filter((e) => e.kind === "page").length).toBeGreaterThan(30);
  });

  it("ロールを問わない入口を除き、すべてのサーバーアクション / Route Handler / ページが最初にロールのガードを通る", () => {
    const missing = entries
      .filter((entry) => !(entry.key in PUBLIC_ENTRIES))
      .filter((entry) => !firstStatementCallsGuard(entry.body, GUARDS[entry.kind]))
      .map((entry) => `${entry.kind}: ${entry.key}（${GUARDS[entry.kind].join(" / ")} を最初に呼ぶ）`);

    expect(missing).toEqual([]);
  });

  it("調査研究費のサーバーアクションは、担当の議員室だけに書き込めるガード（requireResearchFundWriter）を最初に通る", () => {
    const writeActions = entries.filter(
      (entry) =>
        entry.kind === "action" &&
        (entry.key.startsWith("server/contexts/research-fund/presentation/actions/") ||
          RESEARCH_FUND_WRITE_ACTIONS_OUTSIDE_CONTEXT.includes(entry.key)),
    );
    expect(writeActions.length).toBeGreaterThan(15);

    const missing = writeActions
      .filter((entry) => !firstStatementCallsGuard(entry.body, ["requireResearchFundWriter"]))
      .map((entry) => `${entry.key}（requireResearchFundWriter を最初に呼ぶ）`);
    expect(missing).toEqual([]);
  });

  it("PUBLIC_ENTRIES に、もう存在しない入口が残っていない", () => {
    const keys = new Set(entries.map((entry) => entry.key));
    expect(Object.keys(PUBLIC_ENTRIES).filter((key) => !keys.has(key))).toEqual([]);
  });
});
