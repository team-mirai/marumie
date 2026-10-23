/**
 * 前回の本番デプロイ（release タグ）から今回デプロイするコミットまでに変わった
 * 直接依存パッケージを、Markdown の一覧にして出力する（#1830）。
 *
 * Deploy Production ワークフローが job summary に書き出すために使う。
 * 依存の更新を自動マージに寄せても、デプロイのタイミングで「何がどう変わったか」を
 * 一か所で確認できるようにするのが狙い。
 *
 * 見るのは各 package.json に書かれた直接依存だけで、lockfile の中だけの変更（推移的な依存）は見ない。
 *
 * 使い方: node scripts/dependency-diff.mjs [比較先の ref（既定: HEAD）]
 * 出力は標準出力。一覧を作れなかった場合も、その旨を Markdown で出して終了コード 0 で終わる
 * （本番デプロイを止めないため）。
 */
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

/** 一覧の対象にする package.json（表示名 → リポジトリルートからのパス） */
export const PACKAGE_FILES = [
  { label: "ルート", path: "package.json" },
  { label: "webapp", path: "webapp/package.json" },
  { label: "admin", path: "admin/package.json" },
];

/** 一覧の対象にする依存の種類 */
export const DEPENDENCY_FIELDS = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
];

/** デプロイ成功時に Deploy Production ワークフローが付けるタグ（release-YYYYMMDD-HHMMSS） */
export const RELEASE_TAG_PATTERN = /^release-\d{8}-\d{6}$/;

/**
 * タグ名の一覧から、直近の release タグを返す。無ければ null。
 * タグ名は JST の日時なので、名前順の最後が直近のデプロイになる。
 */
export function findLatestReleaseTag(tags) {
  const releaseTags = tags.filter((tag) => RELEASE_TAG_PATTERN.test(tag)).sort();
  return releaseTags.at(-1) ?? null;
}

/**
 * バージョン指定（"^6.19.1", "~1.2", "2.5.15", "npm:foo@^3.0.0" など）から major を取り出す。
 * 数字で始まるバージョンが読み取れない指定（"workspace:*", "latest", git URL など）は null。
 */
export function parseMajor(spec) {
  if (typeof spec !== "string") return null;
  const versionPart = spec.startsWith("npm:") ? spec.slice(spec.lastIndexOf("@") + 1) : spec;
  const match = versionPart.trim().match(/^[\^~>=<v\s]*(\d+)(?:\.(\d+))?/);
  if (!match) return null;
  return Number(match[1]);
}

/** 変更前後の major がどちらも読み取れて、かつ異なるときだけ major 更新とみなす */
export function isMajorUpdate(before, after) {
  const beforeMajor = parseMajor(before);
  const afterMajor = parseMajor(after);
  return beforeMajor !== null && afterMajor !== null && beforeMajor !== afterMajor;
}

/**
 * 2 つの package.json（パース済みのオブジェクト。存在しなければ null）を比べて、
 * 直接依存の追加・削除・バージョン変更を返す。並びは依存の種類 → パッケージ名の順。
 */
export function diffDependencies(beforePkg, afterPkg) {
  const changes = [];
  for (const field of DEPENDENCY_FIELDS) {
    const before = beforePkg?.[field] ?? {};
    const after = afterPkg?.[field] ?? {};
    const names = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
    for (const name of names) {
      const from = before[name] ?? null;
      const to = after[name] ?? null;
      if (from === to) continue;
      const kind = from === null ? "added" : to === null ? "removed" : "changed";
      changes.push({
        field,
        name,
        from,
        to,
        kind,
        major: kind === "changed" && isMajorUpdate(from, to),
      });
    }
  }
  return changes;
}

const escapeCell = (text) => String(text).replaceAll("|", "\\|");

const formatVersion = (spec) => (spec === null ? "（なし）" : `\`${escapeCell(spec)}\``);

const formatChangeKind = (change) => {
  if (change.kind === "added") return "追加";
  if (change.kind === "removed") return "削除";
  return change.major ? "⚠️ **major**" : "更新";
};

/**
 * 一覧の Markdown を組み立てる。
 * sections は PACKAGE_FILES の順に { label, path, changes } を並べたもの。
 */
export function renderMarkdown({ baseTag, baseSha, headSha, sections }) {
  const lines = ["## 依存パッケージの変更（前回の本番デプロイから）", ""];
  lines.push(
    `比較: \`${baseTag}\`（${baseSha.slice(0, 7)}）→ 今回デプロイするコミット（${headSha.slice(0, 7)}）`,
  );
  lines.push("");
  lines.push("package.json の直接依存だけを比べています（lockfile の中だけの変更は含みません）。");
  lines.push("");

  const total = sections.reduce((sum, section) => sum + section.changes.length, 0);
  if (total === 0) {
    lines.push("直接依存パッケージの変更はありません。");
    return `${lines.join("\n")}\n`;
  }

  const majorCount = sections.reduce(
    (sum, section) => sum + section.changes.filter((change) => change.major).length,
    0,
  );
  lines.push(
    majorCount > 0
      ? `変更 ${total} 件（うち major 更新 ${majorCount} 件）`
      : `変更 ${total} 件（major 更新なし）`,
  );

  for (const section of sections) {
    if (section.changes.length === 0) continue;
    lines.push("");
    lines.push(`### ${section.label}（\`${section.path}\`）`);
    lines.push("");
    lines.push("| パッケージ | 種類 | 変更前 | 変更後 | 区分 |");
    lines.push("| --- | --- | --- | --- | --- |");
    for (const change of section.changes) {
      lines.push(
        `| \`${escapeCell(change.name)}\` | ${change.field} | ${formatVersion(change.from)} | ${formatVersion(change.to)} | ${formatChangeKind(change)} |`,
      );
    }
  }
  return `${lines.join("\n")}\n`;
}

// ---------------------------------------------------------------------------
// git からの読み出し（ここから下はワークフローから実行したときだけ使う）
// ---------------------------------------------------------------------------

const git = (args) => execFileSync("git", args, { encoding: "utf8" }).trim();

/** ref 時点の package.json を読む。その時点でファイルが無ければ null */
function readPackageJsonAt(ref, path) {
  let text;
  try {
    text = execFileSync("git", ["show", `${ref}:${path}`], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return null;
  }
  return JSON.parse(text);
}

function buildReport(headRef) {
  const tags = git(["tag", "--list", "release-*"]).split("\n").filter(Boolean);
  const baseTag = findLatestReleaseTag(tags);
  if (baseTag === null) {
    return [
      "## 依存パッケージの変更（前回の本番デプロイから）",
      "",
      "前回の本番デプロイの release タグ（`release-YYYYMMDD-HHMMSS`）が無いため、比較できません。",
      "このデプロイが成功すると release タグが付き、次回から一覧が出ます。",
      "",
    ].join("\n");
  }

  const baseSha = git(["rev-parse", `${baseTag}^{commit}`]);
  const headSha = git(["rev-parse", `${headRef}^{commit}`]);
  const sections = PACKAGE_FILES.map(({ label, path }) => ({
    label,
    path,
    changes: diffDependencies(readPackageJsonAt(baseSha, path), readPackageJsonAt(headSha, path)),
  }));
  return renderMarkdown({ baseTag, baseSha, headSha, sections });
}

function main() {
  const headRef = process.argv[2] ?? "HEAD";
  try {
    process.stdout.write(buildReport(headRef));
  } catch (error) {
    // 一覧を作れなくても本番デプロイは止めない。理由だけ summary に残す
    const message = error instanceof Error ? error.message : String(error);
    process.stdout.write(
      [
        "## 依存パッケージの変更（前回の本番デプロイから）",
        "",
        "一覧を作れませんでした（デプロイは続行します）。",
        "",
        "```",
        message,
        "```",
        "",
      ].join("\n"),
    );
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
