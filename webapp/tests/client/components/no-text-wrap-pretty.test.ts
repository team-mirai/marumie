import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Safari（WebKit）は text-wrap: pretty を段落全体の行の長さをそろえる形で解釈し、
 * 日本語の本文がすべての行で枠の右端より手前で折り返してしまう（#2103）。
 * Chromium だけの E2E では気づけないので、webapp/src に付け直していないかをここで検出する。
 */
const SRC_DIR = join(__dirname, "../../../src");
const PRETTY_PATTERN = /text-wrap:\s*pretty|\btext-pretty\b|textWrap:\s*["']pretty["']/;

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return listSourceFiles(path);
    return /\.(tsx?|css)$/.test(entry.name) ? [path] : [];
  });
}

describe("text-wrap: pretty を使わない", () => {
  it("webapp/src のどこにも text-wrap: pretty（Tailwind の text-pretty を含む）が無い", () => {
    const offenders = listSourceFiles(SRC_DIR).filter((file) => PRETTY_PATTERN.test(readFileSync(file, "utf8")));
    expect(offenders).toEqual([]);
  });
});
