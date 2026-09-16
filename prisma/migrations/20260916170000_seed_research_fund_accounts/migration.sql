-- ============================================
-- 調研費の科目マスタ（固定マスタ）を投入する
-- ============================================
-- schema と一緒に配れるよう、シーダー（prisma/seeds/researchFundAccounts.ts）から
-- マイグレーションへ移した。以後、科目の追加・ラベル変更・法定区分の見直しは
-- 新しいマイグレーションを追加して行う。
--
-- 法定区分の出典: 衆議院「調査研究広報滞在費の使途の報告及び公開並びに残額の返還に関する規程 概要」
-- 第一・2「報告書における支出項目」および参考「報告書への記載項目」
-- https://www.shugiin.go.jp/internet/itdb_annai.nsf/html/statics/housei/pdf/kihodogaiyou.pdf
--
-- 費用の定義・代表例は docs/reference/design_handoff_choken/01_データモデル.md の21分類表が正。
--
-- 既に科目が入っている環境でも流せるよう upsert する。
-- 仕訳行が key を FK で参照しているため削除は行わない。
-- updated_at は Prisma の @updatedAt 由来で DB 側にデフォルトがないので明示的に入れる。
INSERT INTO "research_fund_accounts" ("key", "label", "type", "legal_category_key", "legal_label", "display_order", "updated_at")
VALUES
  -- 資産・収入
  ('bank',                '普通預金',           'asset',   NULL,                  NULL,                              0,  NOW()),
  ('cash',                '現金',               'asset',   NULL,                  NULL,                              1,  NOW()),
  ('grant-income',        '調査研究費収入',     'income',  NULL,                  NULL,                              2,  NOW()),
  -- 未確定の下書き用。確認済にする前に21分類のいずれかへ変更する。
  ('needs-review',        '要確認',             'expense', NULL,                  NULL,                              3,  NOW()),
  -- 費用（調研費カテゴリ 21分類）
  ('pc-electronics',      'PC・電子機器',       'expense', 'equipment-supplies',  '③ 備品・消耗品費',                4,  NOW()),
  ('stationery-supplies', '文房具・備品',       'expense', 'equipment-supplies',  '③ 備品・消耗品費',                5,  NOW()),
  ('taxi',                'タクシー代',         'expense', 'stay',                '⑨ 滞在費',                        6,  NOW()),
  ('airfare',             '航空券代',           'expense', 'stay',                '⑨ 滞在費',                        7,  NOW()),
  ('housing',             '住居費',             'expense', 'stay',                '⑨ 滞在費',                        8,  NOW()),
  ('public-transport',    '電車・バス代',       'expense', 'stay',                '⑨ 滞在費',                        9,  NOW()),
  ('telecom-it',          '通信・IT利用料',     'expense', 'office',              '④ 事務所費',                      10, NOW()),
  ('lodging',             '宿泊費',             'expense', 'stay',                '⑨ 滞在費',                        11, NOW()),
  ('books-newspapers',    '新聞・書籍代',       'expense', 'research',            '⑦ 調査研究費',                    12, NOW()),
  ('printing-pr',         '印刷・広報費',       'expense', 'publicity',           '⑥ 広報紙誌の発行その他の事業費',  13, NOW()),
  ('trip-arrangement',    '出張手配費',         'expense', 'stay',                '⑨ 滞在費',                        14, NOW()),
  ('utilities',           '光熱水費',           'expense', 'utilities',           '② 光熱水費',                      15, NOW()),
  ('hospitality',         '来客対応費',         'expense', 'exchange',            '⑤ 交流費',                        16, NOW()),
  ('membership-fees',     '会費',               'expense', 'research',            '⑦ 調査研究費',                    17, NOW()),
  ('postage',             '郵送・信書費',       'expense', 'office',              '④ 事務所費',                      18, NOW()),
  ('tolls-parking',       '高速・駐車代',       'expense', 'stay',                '⑨ 滞在費',                        19, NOW()),
  ('meetings',            '会議費',             'expense', 'research',            '⑦ 調査研究費',                    20, NOW()),
  ('bank-fees',           '手数料',             'expense', 'office',              '④ 事務所費',                      21, NOW()),
  ('misc',                'その他',             'expense', 'other-expenses',      '⑩ その他の経費',                  22, NOW()),
  ('personnel',           '人件費',             'expense', 'personnel',           '① 人件費',                        23, NOW()),
  ('donation',            '寄附',               'expense', 'donation',            '⑧ 寄附',                          24, NOW())
ON CONFLICT ("key") DO UPDATE SET
  "label" = EXCLUDED."label",
  "type" = EXCLUDED."type",
  "legal_category_key" = EXCLUDED."legal_category_key",
  "legal_label" = EXCLUDED."legal_label",
  "display_order" = EXCLUDED."display_order",
  "updated_at" = NOW();
