import "server-only";

import { loadCurrentOrganizationTarget } from "@/server/contexts/shared/presentation/loaders/load-current-organization-target";
import { previewDonorCsv } from "@/server/contexts/report/presentation/actions/preview-donor-csv";
import { importDonorCsv } from "@/server/contexts/report/presentation/actions/import-donor-csv";
import DonorCsvImportClient from "@/client/components/donor-csv-import/DonorCsvImportClient";
import { PageHeader } from "@/client/components/layout/PageHeader";
import { CurrentTargetBar } from "@/client/components/layout/CurrentTargetBar";
import { TargetRequiredNotice } from "@/client/components/layout/TargetRequiredNotice";

export default async function ImportDonorsPage() {
  const target = await loadCurrentOrganizationTarget();

  if (!target) {
    return <TargetRequiredNotice label="Donor Import" title="寄付者一括インポート" />;
  }

  return (
    <div>
      <PageHeader label="Donor Import" title="寄付者一括インポート" />
      <CurrentTargetBar target={target} note="に取り込まれます" />
      <DonorCsvImportClient
        key={target.organizationId}
        politicalOrganizationId={target.organizationId}
        previewAction={previewDonorCsv}
        importAction={importDonorCsv}
      />
    </div>
  );
}
