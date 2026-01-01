-- CreateEnum
CREATE TYPE "DonorType" AS ENUM ('individual', 'corporation', 'political_organization');

-- CreateTable
CREATE TABLE "public"."donors" (
    "id" BIGSERIAL NOT NULL,
    "donor_type" "DonorType" NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "address" VARCHAR(120),
    "occupation" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "donors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."transaction_donors" (
    "id" BIGSERIAL NOT NULL,
    "transaction_id" BIGINT NOT NULL,
    "donor_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transaction_donors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "donors_name_address_donor_type_key" ON "public"."donors"("name", "address", "donor_type");

-- CreateIndex
CREATE INDEX "idx_transaction_donors_transaction" ON "public"."transaction_donors"("transaction_id");

-- CreateIndex
CREATE INDEX "idx_transaction_donors_donor" ON "public"."transaction_donors"("donor_id");

-- CreateIndex
CREATE UNIQUE INDEX "transaction_donors_transaction_id_donor_id_key" ON "public"."transaction_donors"("transaction_id", "donor_id");

-- CreateIndex
CREATE UNIQUE INDEX "transaction_donors_transaction_id_key" ON "public"."transaction_donors"("transaction_id");

-- AddForeignKey
ALTER TABLE "public"."transaction_donors" ADD CONSTRAINT "transaction_donors_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transaction_donors" ADD CONSTRAINT "transaction_donors_donor_id_fkey" FOREIGN KEY ("donor_id") REFERENCES "public"."donors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateFunction: validate_transaction_donor
CREATE OR REPLACE FUNCTION validate_transaction_donor()
RETURNS TRIGGER AS $$
DECLARE
  v_transaction_type VARCHAR(255);
  v_category_key VARCHAR(255);
  v_donor_type VARCHAR(50);
  v_allowed_categories TEXT[] := ARRAY[
    'individual-donations',
    'specific-individual-donations',
    'corporate-donations',
    'political-donations',
    'mediated-donations',
    'party-income',
    'mediated-party-income'
  ];
  -- donor_type制限があるカテゴリ
  v_individual_only_categories TEXT[] := ARRAY[
    'individual-donations',
    'specific-individual-donations'
  ];
  v_corporation_only_categories TEXT[] := ARRAY[
    'corporate-donations'
  ];
  v_political_org_only_categories TEXT[] := ARRAY[
    'political-donations'
  ];
BEGIN
  -- 取引情報を取得
  SELECT transaction_type, category_key
  INTO v_transaction_type, v_category_key
  FROM "public"."transactions"
  WHERE id = NEW.transaction_id;

  -- donor情報を取得
  SELECT donor_type::TEXT
  INTO v_donor_type
  FROM "public"."donors"
  WHERE id = NEW.donor_id;

  -- donor_typeの妥当性チェック
  IF v_donor_type NOT IN ('individual', 'corporation', 'political_organization') THEN
    RAISE EXCEPTION 'Unknown donor_type: %', v_donor_type;
  END IF;

  -- 収入取引のみ許可
  IF v_transaction_type != 'income' THEN
    RAISE EXCEPTION 'Donor can only be assigned to income transactions, not: %', v_transaction_type;
  END IF;

  -- カテゴリが許可リストに含まれているかチェック
  IF NOT (v_category_key = ANY(v_allowed_categories)) THEN
    RAISE EXCEPTION 'Donor cannot be assigned to this income transaction category: %', v_category_key;
  END IF;

  -- donor_type制限があるカテゴリの整合性チェック
  IF v_category_key = ANY(v_individual_only_categories) THEN
    IF v_donor_type != 'individual' THEN
      RAISE EXCEPTION 'Category "%" requires donor_type "individual", but got "%"', v_category_key, v_donor_type;
    END IF;
  ELSIF v_category_key = ANY(v_corporation_only_categories) THEN
    IF v_donor_type != 'corporation' THEN
      RAISE EXCEPTION 'Category "%" requires donor_type "corporation", but got "%"', v_category_key, v_donor_type;
    END IF;
  ELSIF v_category_key = ANY(v_political_org_only_categories) THEN
    IF v_donor_type != 'political_organization' THEN
      RAISE EXCEPTION 'Category "%" requires donor_type "political_organization", but got "%"', v_category_key, v_donor_type;
    END IF;
  END IF;
  -- mediated-donations, party-income, mediated-party-income は任意のdonor_typeを許可

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- CreateTrigger: validate_transaction_donor_insert
CREATE TRIGGER validate_transaction_donor_insert
  BEFORE INSERT OR UPDATE ON "public"."transaction_donors"
  FOR EACH ROW
  EXECUTE FUNCTION validate_transaction_donor();

-- CreateFunction: validate_donor_occupation
CREATE OR REPLACE FUNCTION validate_donor_occupation()
RETURNS TRIGGER AS $$
BEGIN
  -- 個人の場合はoccupationが必須
  IF NEW.donor_type = 'individual' THEN
    IF NEW.occupation IS NULL OR TRIM(NEW.occupation) = '' THEN
      RAISE EXCEPTION 'Occupation is required for individual donors';
    END IF;
  -- 法人・政治団体の場合はoccupationはNULLであるべき
  ELSIF NEW.donor_type IN ('corporation', 'political_organization') THEN
    IF NEW.occupation IS NOT NULL THEN
      RAISE EXCEPTION 'Occupation must be NULL for non-individual donors';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- CreateTrigger: validate_donor_occupation_insert
CREATE TRIGGER validate_donor_occupation_insert
  BEFORE INSERT OR UPDATE ON "public"."donors"
  FOR EACH ROW
  EXECUTE FUNCTION validate_donor_occupation();

-- CreateFunction: validate_donor_address
CREATE OR REPLACE FUNCTION validate_donor_address()
RETURNS TRIGGER AS $$
BEGIN
  -- 住所が未入力の場合は警告（NOTICEレベル）
  IF NEW.address IS NULL OR TRIM(NEW.address) = '' THEN
    RAISE NOTICE 'Address is empty for donor: %. This may cause issues when generating reports.', NEW.name;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- CreateTrigger: validate_donor_address_insert
CREATE TRIGGER validate_donor_address_insert
  BEFORE INSERT OR UPDATE ON "public"."donors"
  FOR EACH ROW
  EXECUTE FUNCTION validate_donor_address();
