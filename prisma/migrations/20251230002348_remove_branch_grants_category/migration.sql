-- UpdateFunction: validate_transaction_counterpart
-- Remove 'branch-grants-expenses' from allowed expense categories
-- This category is being deprecated in favor of using 'donations-grants-expenses' with a grant flag
CREATE OR REPLACE FUNCTION validate_transaction_counterpart()
RETURNS TRIGGER AS $$
DECLARE
  v_transaction_type VARCHAR(255);
  v_category_key VARCHAR(255);
  v_allowed_income_categories TEXT[] := ARRAY[
    'publication-income',
    'loans',
    'grants',
    'other-income'
  ];
  v_allowed_expense_categories TEXT[] := ARRAY[
    'utilities',
    'equipment-supplies',
    'office-expenses',
    'organizational-activities',
    'election-expenses',
    'publication-expenses',
    'advertising-expenses',
    'fundraising-party-expenses',
    'other-business-expenses',
    'research-expenses',
    'donations-grants-expenses',
    'other-expenses'
  ];
BEGIN
  -- 取引情報を取得
  SELECT transaction_type, category_key
  INTO v_transaction_type, v_category_key
  FROM "public"."transactions"
  WHERE id = NEW.transaction_id;

  -- 収入取引のチェック
  IF v_transaction_type = 'income' THEN
    IF NOT (v_category_key = ANY(v_allowed_income_categories)) THEN
      RAISE EXCEPTION 'Counterpart cannot be assigned to this income transaction category: %', v_category_key;
    END IF;
  -- 支出取引のチェック
  ELSIF v_transaction_type = 'expense' THEN
    IF NOT (v_category_key = ANY(v_allowed_expense_categories)) THEN
      RAISE EXCEPTION 'Counterpart cannot be assigned to this expense transaction category: %', v_category_key;
    END IF;
  ELSE
    RAISE EXCEPTION 'Counterpart can only be assigned to income or expense transactions, not: %', v_transaction_type;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Migrate existing branch-grants-expenses transactions to donations-grants-expenses
UPDATE "public"."transactions"
SET category_key = 'donations-grants-expenses'
WHERE category_key = 'branch-grants-expenses';
