-- 支給仕訳の摘要を正式名称に合わせて「調査研究費 N月分」から「調査研究広報滞在費 N月分」に変える。
-- 対象は支給（source = 'grant'）で、摘要が自動生成の書式のままの仕訳だけ。
-- 摘要の置き換えのみで、件数・金額・日付・ステータスは変更しない。
--
-- hash は摘要をハッシュ入力に含むため、置換後の値で再計算する
-- （admin の JournalEntryHash.generate と同じく JSON.stringify([entryDate, amount, description, null])
--   の文字列を組み立て、SHA-256 の hex を格納する。支給は書類を持たないので documentId は常に null）。
-- 再計算しないと、支給の日付を編集したときに作り直される hash と食い違う。
-- 旧摘要で計算した値と一致しない hash（シード由来など）は、組み立てが異なるので触らない。

WITH grant_entries AS (
  SELECT
    e.id,
    e.hash,
    to_json(to_char(e.entry_date, 'YYYY-MM-DD'))::text AS date_json,
    (
      SELECT trunc(sum(l.amount))::bigint::text
      FROM research_fund_journal_lines l
      WHERE l.entry_id = e.id AND l.side = 'credit'
    ) AS amount_text,
    e.description AS old_description,
    regexp_replace(e.description, '^調査研究費 ', '調査研究広報滞在費 ') AS new_description
  FROM research_fund_journal_entries e
  WHERE e.source = 'grant'
    AND e.description ~ '^調査研究費 ([1-9]|1[0-2])月分$'
)
UPDATE research_fund_journal_entries e
SET
  description = g.new_description,
  hash = CASE
    WHEN g.hash = encode(sha256(convert_to(
      '[' || g.date_json || ',' || g.amount_text || ',' || to_json(g.old_description)::text || ',null]',
      'UTF8'
    )), 'hex')
    THEN encode(sha256(convert_to(
      '[' || g.date_json || ',' || g.amount_text || ',' || to_json(g.new_description)::text || ',null]',
      'UTF8'
    )), 'hex')
    ELSE g.hash
  END
FROM grant_entries g
WHERE e.id = g.id;
