#!/usr/bin/env node
/**
 * sync-import（/sync-import）の動作確認用に、同期用エクスポートと同じ形式の JSON を生成する。
 * 実運用サイズ（70,000 取引・約 70MB）のファイルが取り込めることをローカルだけで確かめるためのもの。
 *
 *   node scripts/generate-sync-import-fixture.mjs <organizationSlug> <取引件数> > fixture.json
 *
 * 例: node scripts/generate-sync-import-fixture.mjs sample-party 70000 > /tmp/sync-import-70000.json
 *
 * 取引先・寄付者は件数の 1/10 程度の種類を使い回す（新規作成の件数も確認内容に出る）。
 * 書き出し側（/api/export-organization-sync）と同じく 2 スペースでインデントする。
 *
 * ローカルでの確認手順:
 *   1. pnpm supabase:start && pnpm db:reset
 *      （supabase/config.toml の sync-imports バケットが作られる。config を変えたら supabase を再起動する）
 *   2. node scripts/generate-sync-import-fixture.mjs sample-party 70000 > /tmp/sync-import-70000.json
 *   3. cd admin && pnpm build && DATA_SYNC_IMPORT_ENABLED=true node ../scripts/supabase-env.mjs pnpm start --port 3001
 *   4. foo@example.com でログインし /sync-import で 2 のファイルを選ぶ。
 *      確認内容に「取引 70,000 件を取り込み」と出て、slug を入力して置き換えると同じ件数が取り込まれる
 */

const [, , organizationSlug, countArg] = process.argv;
const transactionCount = Number(countArg);
if (!organizationSlug || !Number.isInteger(transactionCount) || transactionCount < 0) {
	console.error(
		"usage: node scripts/generate-sync-import-fixture.mjs <organizationSlug> <取引件数>",
	);
	process.exit(2);
}

const now = new Date().toISOString();
const partyCount = Math.max(1, Math.floor(transactionCount / 10));

function buildTransaction(index) {
	const isIncome = index % 3 === 0;
	const partyIndex = index % partyCount;
	const amount = `${(index % 100000) + 1000}.00`;
	const month = String((index % 12) + 1).padStart(2, "0");
	const day = String((index % 28) + 1).padStart(2, "0");
	return {
		transactionNo: `fixture-${index + 1}`,
		transactionDate: `2025-${month}-${day}`,
		financialYear: 2025,
		transactionType: isIncome ? "income" : "expense",
		debitAccount: isIncome ? "普通預金" : "備品・消耗品費",
		debitSubAccount: null,
		debitDepartment: null,
		debitPartner: isIncome ? null : `取引先${partyIndex}`,
		debitTaxCategory: isIncome ? null : "課税仕入 10%",
		debitAmount: amount,
		creditAccount: isIncome ? "個人からの寄附" : "普通預金",
		creditSubAccount: null,
		creditDepartment: null,
		creditPartner: isIncome ? `寄付者${partyIndex}` : null,
		creditTaxCategory: null,
		creditAmount: amount,
		description: `動作確認用の取引 ${index + 1}`,
		memo: null,
		friendlyCategory: null,
		categoryKey: isIncome ? "individual-donations" : "equipment-supplies",
		label: "",
		hash: "",
		isGrantExpenditure: false,
		createdAt: now,
		updatedAt: now,
		counterpart: isIncome
			? null
			: {
					name: `動作確認用取引先${partyIndex}`,
					postalCode: "1000001",
					address: `東京都千代田区千代田${partyIndex}`,
				},
		donor: isIncome
			? {
					donorType: "individual",
					name: `動作確認用寄付者${partyIndex}`,
					address: `東京都千代田区千代田${partyIndex}`,
					occupation: "会社員",
				}
			: null,
	};
}

const transactions = Array.from({ length: transactionCount }, (_, index) =>
	buildTransaction(index),
);
const counterparts = new Set(
	transactions.filter((t) => t.counterpart).map((t) => t.counterpart.name),
);
const donors = new Set(transactions.filter((t) => t.donor).map((t) => t.donor.name));

const file = {
	meta: {
		formatVersion: 1,
		exportedAt: now,
		sourceEnvironment: "fixture",
		latestMigrationName: null,
		organizationSlug,
		counts: {
			transactions: transactions.length,
			counterparts: counterparts.size,
			donors: donors.size,
			balanceSnapshots: 1,
			organizationReportProfiles: 1,
		},
	},
	transactions,
	balanceSnapshots: [
		{ snapshotDate: "2025-12-31", balance: "1234567.00", createdAt: now, updatedAt: now },
	],
	organizationReportProfiles: [
		{
			financialYear: 2025,
			officialName: "動作確認用の政治団体",
			officialNameKana: "どうさかくにんようのせいじだんたい",
			officeAddress: "東京都千代田区千代田1-1",
			officeAddressBuilding: null,
			details: {},
			createdAt: now,
			updatedAt: now,
		},
	],
};

process.stdout.write(JSON.stringify(file, null, 2));
