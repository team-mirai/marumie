-- BS科目「未払金/未払費用」を「未払金」「未払費用」に分割したことに伴い、
-- 既存の取引の勘定科目を「未払費用」へ機械的に変換する。
-- 科目名の置き換えのみで、件数・金額・取引種別（income / expense）は変更しない。

UPDATE transactions
SET debit_account = '未払費用'
WHERE debit_account = '未払金/未払費用';

UPDATE transactions
SET credit_account = '未払費用'
WHERE credit_account = '未払金/未払費用';
