-- CreateTable
CREATE TABLE "public"."counterparts" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "address" VARCHAR(120) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "counterparts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."transaction_counterparts" (
    "id" BIGSERIAL NOT NULL,
    "transaction_id" BIGINT NOT NULL,
    "counterpart_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transaction_counterparts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "counterparts_name_address_key" ON "public"."counterparts"("name", "address");

-- CreateIndex
CREATE INDEX "idx_transaction_counterparts_transaction" ON "public"."transaction_counterparts"("transaction_id");

-- CreateIndex
CREATE INDEX "idx_transaction_counterparts_counterpart" ON "public"."transaction_counterparts"("counterpart_id");

-- CreateIndex
CREATE UNIQUE INDEX "transaction_counterparts_transaction_id_counterpart_id_key" ON "public"."transaction_counterparts"("transaction_id", "counterpart_id");

-- CreateIndex
CREATE UNIQUE INDEX "transaction_counterparts_transaction_id_key" ON "public"."transaction_counterparts"("transaction_id");

-- AddForeignKey
ALTER TABLE "public"."transaction_counterparts" ADD CONSTRAINT "transaction_counterparts_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transaction_counterparts" ADD CONSTRAINT "transaction_counterparts_counterpart_id_fkey" FOREIGN KEY ("counterpart_id") REFERENCES "public"."counterparts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateFunction: validate_transaction_counterpart
CREATE OR REPLACE FUNCTION validate_transaction_counterpart()
RETURNS TRIGGER AS $$
DECLARE
  v_transaction_type VARCHAR(255);
  v_category_key VARCHAR(255);
  v_allowed_income_categories TEXT[] := ARRAY[
    'income_business',
    'income_loan',
    'income_grant_from_hq',
    'income_other'
  ];
  v_allowed_expense_categories TEXT[] := ARRAY[
    'expense_utility_costs',
    'expense_office_supplies',
    'expense_office_expenses',
    'expense_organizational_activity',
    'expense_election_related',
    'expense_publication',
    'expense_publicity',
    'expense_party_event',
    'expense_other_projects',
    'expense_research',
    'expense_donation_grant',
    'expense_other'
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

-- CreateTrigger: validate_transaction_counterpart_insert
CREATE TRIGGER validate_transaction_counterpart_insert
  BEFORE INSERT OR UPDATE ON "public"."transaction_counterparts"
  FOR EACH ROW
  EXECUTE FUNCTION validate_transaction_counterpart();
