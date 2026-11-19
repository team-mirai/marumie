-- research_fund_scan_jobs: 下書き仕訳を LLM に読み直させるときのフリーテキスト指示を保存する（#1544）
-- 通常スキャンでは NULL。既存行は NULL のままで、既存データの UPDATE は行わない。

-- AlterTable
ALTER TABLE "research_fund_scan_jobs" ADD COLUMN "reread_instruction" TEXT;
