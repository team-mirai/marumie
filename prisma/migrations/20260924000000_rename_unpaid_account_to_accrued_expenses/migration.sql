-- BS科目「未払金/未払費用」を「未払金」「未払費用」に分割したことに伴い、
-- 既存の取引の勘定科目を「未払費用」へ機械的に変換する。
-- 科目名の置き換えのみで、件数・金額・取引種別（income / expense）は変更しない。
--
-- hash は勘定科目をハッシュ入力に含むため、置換後の値で再計算する
-- （admin の PreviewTransaction.generateHash と同じ入力・順序・整形で
--   JSON 文字列を組み立て、SHA-256 の hex を格納する）。
-- 再計算しないと、次回インポート時に同じ仕訳が skip ではなく update と判定される。

UPDATE transactions
SET
  debit_account = CASE WHEN debit_account = '未払金/未払費用' THEN '未払費用' ELSE debit_account END,
  credit_account = CASE WHEN credit_account = '未払金/未払費用' THEN '未払費用' ELSE credit_account END,
  hash = encode(
    sha256(
      convert_to(
        '{"category_key":' || to_json(category_key)::text
          || ',"credit_account":' || to_json(CASE WHEN credit_account = '未払金/未払費用' THEN '未払費用' ELSE credit_account END)::text
          || ',"credit_amount":' || trunc(credit_amount)::bigint::text
          || ',"credit_sub_account":' || to_json(coalesce(credit_sub_account, ''))::text
          || ',"debit_account":' || to_json(CASE WHEN debit_account = '未払金/未払費用' THEN '未払費用' ELSE debit_account END)::text
          || ',"debit_amount":' || trunc(debit_amount)::bigint::text
          || ',"debit_sub_account":' || to_json(coalesce(debit_sub_account, ''))::text
          || ',"description":' || to_json(coalesce(description, ''))::text
          || ',"friendly_category":' || to_json(coalesce(friendly_category, ''))::text
          || ',"label":' || to_json(label)::text
          || ',"transaction_date":' || to_json(to_char(transaction_date, 'YYYY-MM-DD'))::text
          || ',"transaction_no":' || to_json(transaction_no)::text
          || ',"transaction_type":' || to_json(transaction_type::text)::text
          || '}',
        'UTF8'
      )
    ),
    'hex'
  )
WHERE debit_account = '未払金/未払費用'
   OR credit_account = '未払金/未払費用';
