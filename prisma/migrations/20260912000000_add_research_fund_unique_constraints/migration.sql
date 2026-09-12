-- research_fund_journal_entries: (book_id, hash) の重複検知を DB 側でも保証する（#1442）
-- research_fund_group_items: 1 仕訳は 1 つの支出群にしか属せない（#1415）
-- いずれも既存の通常インデックスを一意インデックスに置き換える。

-- DropIndex
DROP INDEX "research_fund_journal_entries_book_id_hash_idx";

-- DropIndex
DROP INDEX "research_fund_group_items_entry_id_idx";

-- CreateIndex
CREATE UNIQUE INDEX "research_fund_journal_entries_book_id_hash_key" ON "research_fund_journal_entries"("book_id", "hash");

-- CreateIndex
CREATE UNIQUE INDEX "research_fund_group_items_entry_id_key" ON "research_fund_group_items"("entry_id");
