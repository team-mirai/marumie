import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { RECEIPT_CATEGORIES } from "@/server/contexts/research-fund/domain/models/receipt-categories";

const migrationSql = readFileSync(
  resolve(
    __dirname,
    "../../../../../../../prisma/migrations/20260929100000_revise_research_fund_expense_categories/migration.sql",
  ),
  "utf-8",
);

// 20分類を入れた後に表示名だけを変えたマイグレーション（UPDATE ... SET "label" = ... WHERE "key" = ...）
const labelRenameSqls = ["20260930100000_rename_research_fund_housing_label"].map((name) =>
  readFileSync(resolve(__dirname, `../../../../../../../prisma/migrations/${name}/migration.sql`), "utf-8"),
);
const renamedLabels = new Map(
  labelRenameSqls.flatMap((sql) =>
    [...sql.matchAll(/SET "label" = '([^']+)'[\s\S]*?WHERE "key" = '([a-z-]+)'/g)].map(
      ([, label, key]) => [key, label] as const,
    ),
  ),
);

describe("調研費の費用カテゴリー", () => {
  it("見直し後の20分類を表示順どおりに持つ", () => {
    expect(Object.values(RECEIPT_CATEGORIES).map((category) => category.label)).toEqual([
      "PC・電子機器",
      "文房具・備品",
      "交通費",
      "航空券代",
      "宿舎費",
      "通信・IT利用料",
      "宿泊費",
      "新聞・書籍代",
      "宣伝広報費",
      "出張手配費",
      "光熱水費",
      "来客対応費",
      "会費",
      "郵送・信書費",
      "会議費",
      "手数料",
      "印刷費",
      "その他",
      "人件費",
      "寄附",
    ]);
  });

  it("科目マスタのマイグレーションと同じキー・表示名・表示順になっている", () => {
    const rows = [...migrationSql.matchAll(/\('([a-z-]+)',\s*'([^']+)',\s*'expense',.*?(\d+),\s*NOW\(\)\)/g)];
    expect(
      rows.map(([, key, label, order]) => [key, renamedLabels.get(key) ?? label, Number(order)]),
    ).toEqual(
      Object.entries(RECEIPT_CATEGORIES).map(([key, { label }], index) => [key, label, index + 4]),
    );
  });

  it("旧分類のキーを持たない", () => {
    for (const key of ["taxi", "public-transport", "tolls-parking", "printing-pr"]) {
      expect(RECEIPT_CATEGORIES).not.toHaveProperty(key);
    }
  });
});
