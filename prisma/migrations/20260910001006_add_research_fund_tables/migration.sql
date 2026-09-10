-- CreateEnum
CREATE TYPE "ResearchFundBookStatus" AS ENUM ('preparing', 'active', 'closed');

-- CreateEnum
CREATE TYPE "ResearchFundAccountType" AS ENUM ('asset', 'income', 'expense');

-- CreateEnum
CREATE TYPE "ResearchFundEntryStatus" AS ENUM ('draft', 'approved', 'published');

-- CreateEnum
CREATE TYPE "ResearchFundEntrySource" AS ENUM ('scan', 'manual', 'grant');

-- CreateEnum
CREATE TYPE "ResearchFundJournalSide" AS ENUM ('debit', 'credit');

-- CreateEnum
CREATE TYPE "ResearchFundScanJobStatus" AS ENUM ('queued', 'running', 'succeeded', 'failed');

-- CreateTable
CREATE TABLE "politicians" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "term_start" DATE NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "tenant_id" BIGINT,

    CONSTRAINT "politicians_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "politician_org_memberships" (
    "id" BIGSERIAL NOT NULL,
    "politician_id" BIGINT NOT NULL,
    "political_organization_id" BIGINT NOT NULL,
    "started_on" DATE NOT NULL,
    "ended_on" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "politician_org_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_fund_books" (
    "id" BIGSERIAL NOT NULL,
    "politician_id" BIGINT NOT NULL,
    "financial_year" INTEGER NOT NULL,
    "status" "ResearchFundBookStatus" NOT NULL DEFAULT 'preparing',
    "published_through" DATE,
    "as_of_date" DATE,
    "next_update_note" TEXT,
    "policy_comment" TEXT,
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "research_fund_books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_fund_accounts" (
    "key" VARCHAR(50) NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "type" "ResearchFundAccountType" NOT NULL,
    "legal_category_key" VARCHAR(50),
    "legal_label" VARCHAR(100),
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "research_fund_accounts_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "research_fund_journal_entries" (
    "id" BIGSERIAL NOT NULL,
    "book_id" BIGINT NOT NULL,
    "entry_date" DATE NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "status" "ResearchFundEntryStatus" NOT NULL DEFAULT 'draft',
    "source" "ResearchFundEntrySource" NOT NULL,
    "document_id" BIGINT,
    "split_group" VARCHAR(255),
    "note" TEXT,
    "memo" TEXT,
    "published_at" TIMESTAMP(3),
    "created_by_id" TEXT,
    "hash" VARCHAR(255) NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "research_fund_journal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_fund_journal_lines" (
    "id" BIGSERIAL NOT NULL,
    "entry_id" BIGINT NOT NULL,
    "side" "ResearchFundJournalSide" NOT NULL,
    "account_key" VARCHAR(50) NOT NULL,
    "amount" DECIMAL(12,0) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "research_fund_journal_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_fund_documents" (
    "id" BIGSERIAL NOT NULL,
    "book_id" BIGINT NOT NULL,
    "batch_id" BIGINT,
    "storage_key" VARCHAR(255) NOT NULL,
    "masked_key" VARCHAR(255),
    "mime" VARCHAR(100) NOT NULL,
    "original_filename" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "research_fund_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_fund_scan_batches" (
    "id" BIGSERIAL NOT NULL,
    "book_id" BIGINT NOT NULL,
    "uploaded_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "research_fund_scan_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_fund_scan_jobs" (
    "id" BIGSERIAL NOT NULL,
    "batch_id" BIGINT NOT NULL,
    "document_id" BIGINT NOT NULL,
    "status" "ResearchFundScanJobStatus" NOT NULL DEFAULT 'queued',
    "prompt_id" BIGINT NOT NULL,
    "model" VARCHAR(100) NOT NULL,
    "raw_json" JSONB,
    "error" TEXT,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "research_fund_scan_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_fund_prompts" (
    "id" BIGSERIAL NOT NULL,
    "politician_id" BIGINT NOT NULL,
    "version" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "research_fund_prompts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_fund_expenditure_groups" (
    "id" BIGSERIAL NOT NULL,
    "book_id" BIGINT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "research_fund_expenditure_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_fund_group_items" (
    "group_id" BIGINT NOT NULL,
    "entry_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "research_fund_group_items_pkey" PRIMARY KEY ("group_id","entry_id")
);

-- CreateTable
CREATE TABLE "research_fund_group_outcomes" (
    "id" BIGSERIAL NOT NULL,
    "group_id" BIGINT NOT NULL,
    "label" VARCHAR(255) NOT NULL,
    "url" VARCHAR(2048),
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "research_fund_group_outcomes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "politicians_slug_key" ON "politicians"("slug");

-- CreateIndex
CREATE INDEX "politicians_tenant_id_idx" ON "politicians"("tenant_id");

-- CreateIndex
CREATE INDEX "politician_org_memberships_politician_id_idx" ON "politician_org_memberships"("politician_id");

-- CreateIndex
CREATE INDEX "politician_org_memberships_political_organization_id_idx" ON "politician_org_memberships"("political_organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "research_fund_books_politician_id_financial_year_key" ON "research_fund_books"("politician_id", "financial_year");

-- CreateIndex
CREATE INDEX "research_fund_journal_entries_book_id_status_entry_date_idx" ON "research_fund_journal_entries"("book_id", "status", "entry_date" DESC);

-- CreateIndex
CREATE INDEX "research_fund_journal_entries_book_id_hash_idx" ON "research_fund_journal_entries"("book_id", "hash");

-- CreateIndex
CREATE INDEX "research_fund_journal_entries_document_id_idx" ON "research_fund_journal_entries"("document_id");

-- CreateIndex
CREATE INDEX "research_fund_journal_lines_entry_id_idx" ON "research_fund_journal_lines"("entry_id");

-- CreateIndex
CREATE INDEX "research_fund_journal_lines_account_key_idx" ON "research_fund_journal_lines"("account_key");

-- CreateIndex
CREATE INDEX "research_fund_documents_book_id_idx" ON "research_fund_documents"("book_id");

-- CreateIndex
CREATE INDEX "research_fund_documents_batch_id_idx" ON "research_fund_documents"("batch_id");

-- CreateIndex
CREATE INDEX "research_fund_scan_batches_book_id_idx" ON "research_fund_scan_batches"("book_id");

-- CreateIndex
CREATE INDEX "research_fund_scan_jobs_batch_id_status_idx" ON "research_fund_scan_jobs"("batch_id", "status");

-- CreateIndex
CREATE INDEX "research_fund_scan_jobs_document_id_idx" ON "research_fund_scan_jobs"("document_id");

-- CreateIndex
CREATE INDEX "research_fund_scan_jobs_prompt_id_idx" ON "research_fund_scan_jobs"("prompt_id");

-- CreateIndex
CREATE INDEX "research_fund_prompts_politician_id_is_active_idx" ON "research_fund_prompts"("politician_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "research_fund_prompts_politician_id_version_key" ON "research_fund_prompts"("politician_id", "version");

-- CreateIndex
CREATE INDEX "research_fund_expenditure_groups_book_id_idx" ON "research_fund_expenditure_groups"("book_id");

-- CreateIndex
CREATE INDEX "research_fund_group_items_entry_id_idx" ON "research_fund_group_items"("entry_id");

-- CreateIndex
CREATE INDEX "research_fund_group_outcomes_group_id_idx" ON "research_fund_group_outcomes"("group_id");

-- AddForeignKey
ALTER TABLE "politicians" ADD CONSTRAINT "politicians_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "politician_org_memberships" ADD CONSTRAINT "politician_org_memberships_politician_id_fkey" FOREIGN KEY ("politician_id") REFERENCES "politicians"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "politician_org_memberships" ADD CONSTRAINT "politician_org_memberships_political_organization_id_fkey" FOREIGN KEY ("political_organization_id") REFERENCES "political_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_fund_books" ADD CONSTRAINT "research_fund_books_politician_id_fkey" FOREIGN KEY ("politician_id") REFERENCES "politicians"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_fund_journal_entries" ADD CONSTRAINT "research_fund_journal_entries_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "research_fund_books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_fund_journal_entries" ADD CONSTRAINT "research_fund_journal_entries_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "research_fund_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_fund_journal_entries" ADD CONSTRAINT "research_fund_journal_entries_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_fund_journal_lines" ADD CONSTRAINT "research_fund_journal_lines_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "research_fund_journal_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_fund_journal_lines" ADD CONSTRAINT "research_fund_journal_lines_account_key_fkey" FOREIGN KEY ("account_key") REFERENCES "research_fund_accounts"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_fund_documents" ADD CONSTRAINT "research_fund_documents_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "research_fund_books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_fund_documents" ADD CONSTRAINT "research_fund_documents_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "research_fund_scan_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_fund_scan_batches" ADD CONSTRAINT "research_fund_scan_batches_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "research_fund_books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_fund_scan_batches" ADD CONSTRAINT "research_fund_scan_batches_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_fund_scan_jobs" ADD CONSTRAINT "research_fund_scan_jobs_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "research_fund_scan_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_fund_scan_jobs" ADD CONSTRAINT "research_fund_scan_jobs_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "research_fund_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_fund_scan_jobs" ADD CONSTRAINT "research_fund_scan_jobs_prompt_id_fkey" FOREIGN KEY ("prompt_id") REFERENCES "research_fund_prompts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_fund_prompts" ADD CONSTRAINT "research_fund_prompts_politician_id_fkey" FOREIGN KEY ("politician_id") REFERENCES "politicians"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_fund_prompts" ADD CONSTRAINT "research_fund_prompts_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_fund_expenditure_groups" ADD CONSTRAINT "research_fund_expenditure_groups_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "research_fund_books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_fund_group_items" ADD CONSTRAINT "research_fund_group_items_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "research_fund_expenditure_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_fund_group_items" ADD CONSTRAINT "research_fund_group_items_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "research_fund_journal_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_fund_group_outcomes" ADD CONSTRAINT "research_fund_group_outcomes_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "research_fund_expenditure_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
