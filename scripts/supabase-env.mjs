#!/usr/bin/env node
/**
 * ローカル supabase の接続情報を `supabase status --output json` から取得し、
 * 環境変数として注入した上で後続コマンドを実行するラッパー。
 *
 *   node scripts/supabase-env.mjs <command> [args...]
 *
 * 例: node scripts/supabase-env.mjs tsx prisma/seed.ts
 *
 * 目的:
 * - ANON_KEY / SERVICE_ROLE_KEY を手で .env に転記しなくても seed / E2E が動くようにする
 * - .env に残った古い値や、別プロジェクトの supabase（デフォルトポート 54321）を指す値で
 *   silently 失敗しないよう、起動中の marumie 用 supabase の値で常に上書きする
 *
 * supabase が起動していない場合は、必要な環境変数がすべて既に設定されていればそのまま続行し、
 * そうでなければエラー終了する。
 */
import { spawnSync } from "node:child_process";

const REQUIRED_VARS = [
	"SUPABASE_URL",
	"SUPABASE_ANON_KEY",
	"SUPABASE_SERVICE_ROLE_KEY",
];

const [, , command, ...args] = process.argv;
if (!command) {
	console.error("usage: node scripts/supabase-env.mjs <command> [args...]");
	process.exit(2);
}

function readSupabaseStatus() {
	const result = spawnSync(
		"pnpm",
		["exec", "supabase", "status", "--output", "json"],
		{ encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
	);
	if (result.status !== 0) {
		return { ok: false, error: (result.stderr || result.stdout || "").trim() };
	}
	try {
		return { ok: true, status: JSON.parse(result.stdout) };
	} catch (e) {
		return { ok: false, error: `status の JSON を解釈できません: ${e.message}` };
	}
}

function resolveEnv(status) {
	const missing = ["API_URL", "ANON_KEY", "SERVICE_ROLE_KEY"].filter(
		(key) => !status[key],
	);
	if (missing.length > 0) {
		throw new Error(
			`supabase status に ${missing.join(", ")} がありません。` +
				"supabase/config.toml の [api] enabled が true になっているか確認してください。",
		);
	}
	return {
		SUPABASE_URL: status.API_URL,
		SUPABASE_ANON_KEY: status.ANON_KEY,
		SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY,
		NEXT_PUBLIC_SUPABASE_URL: status.API_URL,
		NEXT_PUBLIC_SUPABASE_ANON_KEY: status.ANON_KEY,
	};
}

const env = { ...process.env };
const result = readSupabaseStatus();

if (result.ok) {
	const resolved = resolveEnv(result.status);
	Object.assign(env, resolved);
	console.error(`🔑 supabase-env: ${resolved.SUPABASE_URL} の接続情報を使用します`);
} else {
	const alreadySet = REQUIRED_VARS.every((key) => env[key]);
	if (!alreadySet) {
		console.error("❌ supabase-env: ローカル supabase の状態を取得できませんでした。");
		console.error("   `pnpm supabase:start` で起動してから再実行してください。");
		if (result.error) console.error(`   (${result.error.split("\n")[0]})`);
		process.exit(1);
	}
	console.error(
		"⚠️  supabase-env: ローカル supabase が起動していないため、既存の環境変数をそのまま使用します。",
	);
}

const child = spawnSync(command, args, { env, stdio: "inherit" });
if (child.error) {
	console.error(`❌ supabase-env: ${command} を起動できません: ${child.error.message}`);
	process.exit(1);
}
process.exit(child.status ?? 1);
