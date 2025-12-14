-- CreateTable
CREATE TABLE "organization_report_profiles" (
    "id" BIGSERIAL NOT NULL,
    "political_organization_id" BIGINT NOT NULL,
    "financial_year" INTEGER NOT NULL,
    "official_name" VARCHAR(120),
    "official_name_kana" VARCHAR(120),
    "office_address" VARCHAR(80),
    "office_address_building" VARCHAR(60),
    "details" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_report_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organization_report_profiles_political_organization_id_fina_key" ON "organization_report_profiles"("political_organization_id", "financial_year");

-- AddForeignKey
ALTER TABLE "organization_report_profiles" ADD CONSTRAINT "organization_report_profiles_political_organization_id_fkey" FOREIGN KEY ("political_organization_id") REFERENCES "political_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
