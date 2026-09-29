-- ============================================
-- 調研費の費用カテゴリーを見直し後の20分類に差し替える
-- ============================================
-- 移動費の3分類（タクシー代・電車・バス代・高速・駐車代）を「交通費」に統合し、
-- 「印刷・広報費」を「宣伝広報費」と「印刷費」に分ける。
-- 分類の定義は docs/reference/design_handoff_choken/01_データモデル.md の20分類表が正。
--
-- 旧分類からの対応:
--   taxi / public-transport / tolls-parking → transportation（交通費）
--   printing-pr → advertising（宣伝広報費。印刷費への振り分けはしない）
-- 旧キーは別の意味で使い回さない。
--
-- 仕訳行が key を FK で参照しているため、
-- 新しい科目を入れる → 仕訳行を付け替える → 旧科目を消す の順に行う。
-- 仕訳の hash は科目を含まない（JournalEntryHash）ので再計算は不要。
-- 仕訳の件数・金額は変わらない。調研費の仕訳が無い環境でもそのまま流せる。

-- 1. 費用の20分類を upsert する（表示順は資産・収入・要確認の後ろに続ける）
INSERT INTO "research_fund_accounts" ("key", "label", "type", "legal_category_key", "legal_label", "display_order", "updated_at")
VALUES
  ('pc-electronics',      'PC・電子機器',       'expense', 'equipment-supplies',  '③ 備品・消耗品費',                4,  NOW()),
  ('stationery-supplies', '文房具・備品',       'expense', 'equipment-supplies',  '③ 備品・消耗品費',                5,  NOW()),
  ('transportation',      '交通費',             'expense', 'stay',                '⑨ 滞在費',                        6,  NOW()),
  ('airfare',             '航空券代',           'expense', 'stay',                '⑨ 滞在費',                        7,  NOW()),
  ('housing',             '住居費',             'expense', 'stay',                '⑨ 滞在費',                        8,  NOW()),
  ('telecom-it',          '通信・IT利用料',     'expense', 'office',              '④ 事務所費',                      9,  NOW()),
  ('lodging',             '宿泊費',             'expense', 'stay',                '⑨ 滞在費',                        10, NOW()),
  ('books-newspapers',    '新聞・書籍代',       'expense', 'research',            '⑦ 調査研究費',                    11, NOW()),
  ('advertising',         '宣伝広報費',         'expense', 'publicity',           '⑥ 広報紙誌の発行その他の事業費',  12, NOW()),
  ('trip-arrangement',    '出張手配費',         'expense', 'stay',                '⑨ 滞在費',                        13, NOW()),
  ('utilities',           '光熱水費',           'expense', 'utilities',           '② 光熱水費',                      14, NOW()),
  ('hospitality',         '来客対応費',         'expense', 'exchange',            '⑤ 交流費',                        15, NOW()),
  ('membership-fees',     '会費',               'expense', 'research',            '⑦ 調査研究費',                    16, NOW()),
  ('postage',             '郵送・信書費',       'expense', 'office',              '④ 事務所費',                      17, NOW()),
  ('meetings',            '会議費',             'expense', 'research',            '⑦ 調査研究費',                    18, NOW()),
  ('bank-fees',           '手数料',             'expense', 'office',              '④ 事務所費',                      19, NOW()),
  ('printing',            '印刷費',             'expense', 'office',              '④ 事務所費',                      20, NOW()),
  ('misc',                'その他',             'expense', 'other-expenses',      '⑩ その他の経費',                  21, NOW()),
  ('personnel',           '人件費',             'expense', 'personnel',           '① 人件費',                        22, NOW()),
  ('donation',            '寄附',               'expense', 'donation',            '⑧ 寄附',                          23, NOW())
ON CONFLICT ("key") DO UPDATE SET
  "label" = EXCLUDED."label",
  "type" = EXCLUDED."type",
  "legal_category_key" = EXCLUDED."legal_category_key",
  "legal_label" = EXCLUDED."legal_label",
  "display_order" = EXCLUDED."display_order",
  "updated_at" = NOW();

-- 2. 旧分類を使っている仕訳行を新しい分類へ付け替える
UPDATE "research_fund_journal_lines"
SET "account_key" = 'transportation', "updated_at" = NOW()
WHERE "account_key" IN ('taxi', 'public-transport', 'tolls-parking');

UPDATE "research_fund_journal_lines"
SET "account_key" = 'advertising', "updated_at" = NOW()
WHERE "account_key" = 'printing-pr';

-- 3. 旧分類を消す（参照する仕訳行は 2 で無くなっている）
DELETE FROM "research_fund_accounts"
WHERE "key" IN ('taxi', 'public-transport', 'tolls-parking', 'printing-pr');
