/**
 * ドメインモデル貧血のうち、機械的に検出できる形を検査する（#2126）。
 *
 * ガイド（docs/backend-architecture-guide.md「ドメインモデル貧血」）で定めた形のうち、
 * 誤検知がほぼ無いものだけをここで検査する。残りはレビュー（CodeRabbit / /review）で見る。
 *
 * 検査 1: 呼ばれないドメイン
 *   ドメイン層（`{admin,webapp}/src/server/contexts/{コンテキスト}/domain/`）が export する
 *   関数・`interface + const` のメソッド・クラスの public メソッドが、本番コード（`src/` と
 *   リポジトリ直下の `shared/`）のどこからも参照されず、テストからしか呼ばれていない状態。
 *   ドメインに判定を書いたのに usecase や画面が別の実装で同じ判定をしている、という
 *   「ルールの二重化」の典型的な痕跡なので、新しく作らせない。
 *
 * 参照の解決は TypeScript の型チェッカーで行う（名前の文字列一致ではない）ので、
 * 同名のメソッドが別のモデルにあっても取り違えない。
 *
 * 検査 2: 却下理由の持ち直し
 *   ドメインが定義したエラーコード（ドメイン層のファイルに書かれた `RF_INVALID_DATE` のような
 *   大文字スネークケースの文字列、または `*_ERROR_CODES.X`）を、presentation / client / app が
 *   `switch` や対応表で受け、別の文言を返している状態。ドメインが返した却下理由が画面に届かず、
 *   対応表に無いコードは汎用エラーになる。`error.message` をそのまま返す分岐は対象外。
 *
 * 既存の違反は KNOWN_VIOLATIONS に列挙してある。後続の Issue で解消したら該当行を消す
 * （解消済みなのに残っている例外は「もう不要」として検査が落ちるので、消し忘れは起きない）。
 */
import { dirname, join, relative, sep } from "node:path";
import ts from "typescript";

/** 検査対象のアプリ（リポジトリルートからの相対パス） */
const APPS = ["admin", "webapp"];

/**
 * 解消待ちの既存違反。キーは「検査名:ファイル#シンボル」、値は「何が違反か」。
 * 後続の Issue がリファクタするたびに 1 行ずつ消す。新しい違反をここに足してはいけない。
 */
export const KNOWN_VIOLATIONS = {
  "unused-domain:admin/src/server/contexts/report/domain/models/donation-transaction.ts#PersonalDonationTransaction.toRow":
    "個人寄附の明細行の組み立てが、本番では同じファイルの別の箇所に重複して書かれている",
  "unused-domain:admin/src/server/contexts/report/domain/models/expense-transaction.ts#PersonnelExpenseSection.shouldOutputSheet":
    "人件費シートの出力判定が本番から呼ばれていない",
  "unused-domain:admin/src/server/contexts/report/domain/models/report-data.ts#ReportData.validate":
    "報告書データ全体の検証が本番から呼ばれず、テストだけが通っている",
  "unused-domain:admin/src/server/contexts/research-fund/domain/models/journal-posting.ts#JournalPosting.validate":
    "仕訳の貸借検証が本番から呼ばれず、テストだけが通っている",
  "unused-domain:webapp/src/server/contexts/public-finance/domain/models/monthly-aggregation.ts#calculateBalance":
    "月次収支の差額計算が本番から呼ばれず、テストだけが通っている",
  "unused-domain:webapp/src/server/contexts/public-finance/domain/models/monthly-aggregation.ts#isValidYearMonthFormat":
    "年月の形式検証が本番から呼ばれていない",
  "unused-domain:webapp/src/server/contexts/shared/domain/models/sankey-data.ts#SankeyData.empty":
    "空のサンキーデータの生成が本番から呼ばれていない",
  "remapped-rejection:admin/src/client/components/counterparts/AddressInput.tsx#getErrorMessage":
    "住所検索のレート制限の文言を、ドメインではなく画面が組み立てている",
};

const DOMAIN_PATH = /(^|\/)src\/server\/contexts\/[^/]+\/domain\/.+\.tsx?$/;
const isTestFile = (rel) => /\.(test|spec)\.tsx?$/.test(rel) || /(^|\/)tests\//.test(rel);
const isDeclarationFile = (rel) => rel.endsWith(".d.ts");

/** 本番コード（参照を数える対象）か。`{app}/src` とリポジトリ直下の `shared/` */
export function isProductionFile(rel) {
  if (isTestFile(rel) || isDeclarationFile(rel)) return false;
  return /^(admin|webapp)\/src\//.test(rel) || rel.startsWith("shared/");
}

export function isDomainFile(rel) {
  return DOMAIN_PATH.test(rel) && !isTestFile(rel) && !isDeclarationFile(rel);
}

const toRel = (repoRoot, fileName) => relative(repoRoot, fileName).split(sep).join("/");

const hasExport = (node) =>
  (ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Export) !== 0;

const isFunctionLike = (node) =>
  node &&
  (ts.isArrowFunction(node) || ts.isFunctionExpression(node) || ts.isMethodDeclaration(node));

const propName = (node, sourceFile) =>
  ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isPrivateIdentifier(node)
    ? node.text
    : node.getText(sourceFile);

/**
 * ドメインファイルが export する「振る舞い」を列挙する。
 * - `export function foo()` / `export const foo = () => ...`
 * - `export const Model = { method() {}, other: () => ... }` の各メンバー
 * - `export class Service { method() {} }` の public メソッド
 * 型・定数・データは対象外（呼ばれるかどうかを問う意味が無い）。
 */
export function collectDomainBehaviors(sourceFile) {
  const behaviors = [];
  const push = (name, nameNode, declaration) => {
    const { line } = sourceFile.getLineAndCharacterOfPosition(nameNode.getStart(sourceFile));
    behaviors.push({ name, line: line + 1, nameNode, declaration });
  };

  for (const statement of sourceFile.statements) {
    if (!hasExport(statement)) continue;

    if (ts.isFunctionDeclaration(statement) && statement.name) {
      push(statement.name.text, statement.name, statement);
      continue;
    }

    if (ts.isVariableStatement(statement)) {
      for (const decl of statement.declarationList.declarations) {
        if (!ts.isIdentifier(decl.name) || !decl.initializer) continue;
        let init = decl.initializer;
        while (ts.isAsExpression(init) || ts.isSatisfiesExpression?.(init) || ts.isParenthesizedExpression(init)) {
          init = init.expression;
        }
        if (isFunctionLike(init)) {
          push(decl.name.text, decl.name, decl);
        } else if (ts.isObjectLiteralExpression(init)) {
          for (const prop of init.properties) {
            if (ts.isMethodDeclaration(prop) && prop.name) {
              push(`${decl.name.text}.${propName(prop.name, sourceFile)}`, prop.name, prop);
            } else if (ts.isPropertyAssignment(prop) && isFunctionLike(prop.initializer)) {
              push(`${decl.name.text}.${propName(prop.name, sourceFile)}`, prop.name, prop);
            }
          }
        }
      }
      continue;
    }

    if (ts.isClassDeclaration(statement) && statement.name) {
      for (const member of statement.members) {
        if (!ts.isMethodDeclaration(member) || !member.name) continue;
        if (ts.isPrivateIdentifier(member.name)) continue;
        const flags = ts.getCombinedModifierFlags(member);
        if (flags & (ts.ModifierFlags.Private | ts.ModifierFlags.Protected)) continue;
        push(`${statement.name.text}.${propName(member.name, sourceFile)}`, member.name, member);
      }
    }
  }
  return behaviors;
}

// ---------------------------------------------------------------------------
// 検査 2: 却下理由の持ち直し
// ---------------------------------------------------------------------------

const CODE_PATTERN = /^[A-Z][A-Z0-9]*(_[A-Z0-9]+)+$/;

/** 持ち直しを探す範囲（ドメインの却下理由を画面へ渡す層） */
export function isRemapScope(rel) {
  if (!isProductionFile(rel)) return false;
  return /\/src\/server\/contexts\/[^/]+\/presentation\//.test(rel) || /^(admin|webapp)\/src\/(client|app)\//.test(rel);
}

/** ドメイン層のファイルに書かれたエラーコードらしい文字列（`RF_INVALID_DATE` など）を集める */
export function collectDomainErrorCodes(sourceFile) {
  const codes = new Set();
  const visit = (node) => {
    if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && CODE_PATTERN.test(node.text)) {
      codes.add(node.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return codes;
}

const isMessageLiteral = (node) =>
  !!node && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateExpression(node));

/** `case "RF_X":` / `case RF_ERROR_CODES.X:` / `{ RF_X: "..." }` / `{ [RF_ERROR_CODES.X]: "..." }` のコードを返す */
function codeOf(expression, sourceFile, domainCodes) {
  if (!expression) return null;
  if ((ts.isStringLiteral(expression) || ts.isIdentifier(expression)) && domainCodes.has(expression.text)) {
    return expression.text;
  }
  if (ts.isPropertyAccessExpression(expression) && /ERROR_CODES$/.test(expression.expression.getText(sourceFile))) {
    return expression.getText(sourceFile);
  }
  return null;
}

function enclosingName(node, sourceFile) {
  for (let cur = node.parent; cur; cur = cur.parent) {
    if ((ts.isFunctionDeclaration(cur) || ts.isMethodDeclaration(cur)) && cur.name) return cur.name.getText(sourceFile);
    if (ts.isVariableDeclaration(cur) && ts.isIdentifier(cur.name)) return cur.name.text;
  }
  const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return `L${line + 1}`;
}

/**
 * ドメインのエラーコードを受けて、文言を自前で返している箇所を探す。
 * - `switch (x.code) { case "RF_X": return "..."; }`
 * - `const messages = { RF_X: "...", ... }`
 * 分岐が `error.message` などの式を返すだけなら持ち直しではないので対象外。
 */
export function findRemappedRejections(sourceFile, domainCodes) {
  const found = [];
  const push = (node, codes) => {
    if (codes.length === 0) return;
    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    found.push({ name: enclosingName(node, sourceFile), line: line + 1, codes });
  };

  const visit = (node) => {
    if (ts.isSwitchStatement(node)) {
      const codes = [];
      for (const clause of node.caseBlock.clauses) {
        if (!ts.isCaseClause(clause)) continue;
        const code = codeOf(clause.expression, sourceFile, domainCodes);
        if (!code) continue;
        const returnsLiteral = clause.statements.some(
          (s) => ts.isReturnStatement(s) && isMessageLiteral(s.expression),
        );
        if (returnsLiteral) codes.push(code);
      }
      push(node, codes);
    }
    if (ts.isObjectLiteralExpression(node)) {
      const codes = [];
      for (const prop of node.properties) {
        if (!ts.isPropertyAssignment(prop) || !isMessageLiteral(prop.initializer)) continue;
        const key = ts.isComputedPropertyName(prop.name) ? prop.name.expression : prop.name;
        const code = codeOf(key, sourceFile, domainCodes);
        if (code) codes.push(code);
      }
      push(node, codes);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return found;
}

/** シンボルを alias の先まで辿り、宣言ノードを返す */
function declarationsOf(checker, symbol) {
  if (!symbol) return [];
  let target = symbol;
  if (target.flags & ts.SymbolFlags.Alias) {
    try {
      target = checker.getAliasedSymbol(target);
    } catch {
      return [];
    }
  }
  return target.declarations ?? [];
}

/**
 * クラスのメソッドが interface 経由で呼ばれる場合（`implements` したドメインサービス）、
 * 呼び出し側の参照は interface のメンバーに解決される。その場合も「使われている」と数えるため、
 * 実装しているメソッドの宣言をあわせて返す。
 */
function implementationsOf(declaration) {
  const parent = declaration.parent;
  if (!parent || !(ts.isInterfaceDeclaration(parent) || ts.isTypeLiteralNode(parent))) return [];
  return parent.__implementedBy ?? [];
}

function linkImplementations(program, checker) {
  for (const sourceFile of program.getSourceFiles()) {
    if (sourceFile.isDeclarationFile) continue;
    const visit = (node) => {
      if (ts.isClassDeclaration(node) && node.heritageClauses) {
        for (const clause of node.heritageClauses) {
          if (clause.token !== ts.SyntaxKind.ImplementsKeyword) continue;
          for (const typeNode of clause.types) {
            const type = checker.getTypeAtLocation(typeNode);
            for (const prop of type.getProperties()) {
              const own = node.members.find(
                (m) => m.name && !ts.isPrivateIdentifier(m.name) && propName(m.name, sourceFile) === prop.name,
              );
              if (!own) continue;
              for (const decl of prop.declarations ?? []) {
                (decl.parent.__implementedBy ??= []).push(own);
              }
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }
}

function loadProgram(repoRoot, app) {
  const configPath = join(repoRoot, app, "tsconfig.json");
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, dirname(configPath));
  const rootNames = parsed.fileNames.filter((f) => !f.includes(`${sep}.next${sep}`));
  return ts.createProgram({
    rootNames,
    options: { ...parsed.options, noEmit: true, incremental: false },
  });
}

/**
 * 本番コードから参照されている宣言ノードの集合を作る。
 * 宣言自身の名前は参照に数えない。また、宣言の本体の中からの参照（再帰）も数えない。
 */
function collectProductionReferences(repoRoot, program, checker) {
  const used = new Set();
  for (const sourceFile of program.getSourceFiles()) {
    if (sourceFile.isDeclarationFile) continue;
    const rel = toRel(repoRoot, sourceFile.fileName);
    if (!isProductionFile(rel)) continue;

    const visit = (node) => {
      if (ts.isIdentifier(node) || ts.isPrivateIdentifier(node)) {
        const parent = node.parent;
        const isOwnName = parent && "name" in parent && parent.name === node && !ts.isPropertyAccessExpression(parent);
        if (!isOwnName) {
          let symbol = checker.getSymbolAtLocation(node);
          // `{ validate } = Model` の分割代入は、右辺のプロパティを参照したと数える
          if (parent && ts.isBindingElement(parent) && ts.isObjectBindingPattern(parent.parent)) {
            const objType = checker.getTypeAtLocation(parent.parent);
            const key = parent.propertyName ?? parent.name;
            if (ts.isIdentifier(key)) symbol = objType.getProperty(key.text) ?? symbol;
          }
          for (const decl of declarationsOf(checker, symbol)) {
            if (decl.getSourceFile() === sourceFile && decl.pos <= node.pos && node.end <= decl.end) {
              continue; // 自分自身の本体からの参照
            }
            used.add(decl);
            for (const impl of implementationsOf(decl)) used.add(impl);
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }
  return used;
}

/**
 * リポジトリ全体を検査する。
 * - `behaviors`: 検査したドメインの振る舞いの数
 * - `violations`: 例外に載っていない違反（`{ key, file, line, name }`）
 * - `staleExceptions`: もう違反していない（= 削除すべき）例外エントリ
 */
export function checkRepository(repoRoot, { apps = APPS, knownViolations = KNOWN_VIOLATIONS } = {}) {
  const unused = new Map();
  let behaviorCount = 0;
  const domainCodes = new Set();

  for (const app of apps) {
    const program = loadProgram(repoRoot, app);
    const checker = program.getTypeChecker();
    linkImplementations(program, checker);
    const used = collectProductionReferences(repoRoot, program, checker);

    const appFiles = program
      .getSourceFiles()
      .map((sourceFile) => ({ sourceFile, rel: toRel(repoRoot, sourceFile.fileName) }))
      .filter(({ rel }) => rel.startsWith(`${app}/`));
    for (const { sourceFile, rel } of appFiles) {
      if (isDomainFile(rel)) for (const code of collectDomainErrorCodes(sourceFile)) domainCodes.add(code);
    }
    for (const { sourceFile, rel } of appFiles) {
      if (!isRemapScope(rel)) continue;
      for (const remap of findRemappedRejections(sourceFile, domainCodes)) {
        const key = `remapped-rejection:${rel}#${remap.name}`;
        unused.set(key, { key, file: rel, line: remap.line, name: `${remap.name}（${remap.codes.join(", ")}）` });
      }
    }

    for (const { sourceFile, rel } of appFiles) {
      if (!isDomainFile(rel)) continue;
      for (const behavior of collectDomainBehaviors(sourceFile)) {
        behaviorCount += 1;
        if (used.has(behavior.declaration)) continue;
        // 変数宣言の関数・オブジェクトのメンバーは、名前の宣言ノードに解決されることがある
        if (used.has(behavior.nameNode)) continue;
        const key = `unused-domain:${rel}#${behavior.name}`;
        unused.set(key, { key, file: rel, line: behavior.line, name: behavior.name });
      }
    }
    domainCodes.clear();
  }

  const violations = [...unused.values()]
    .filter((v) => !(v.key in knownViolations))
    .sort((a, b) => a.key.localeCompare(b.key));
  const staleExceptions = Object.keys(knownViolations)
    .filter((key) => !unused.has(key))
    .sort();

  return { behaviorCount, violations, staleExceptions };
}
