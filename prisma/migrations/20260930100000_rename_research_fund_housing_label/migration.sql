-- 調研費の費目「住居費」の表示名を「宿舎費」に変える。
-- 中身は議員宿舎の使用料なので分類の意味は変わらない。キー（housing）・法定区分・表示順は変更しない。
-- 仕訳行はキーを参照しているので、ラベルの変更だけで仕訳の付け替えは要らない。仕訳の件数・金額は変わらない。

UPDATE "research_fund_accounts"
SET "label" = '宿舎費', "updated_at" = NOW()
WHERE "key" = 'housing';
