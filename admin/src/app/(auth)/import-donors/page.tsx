import "server-only";

import { loadPoliticalOrganizationsData } from "@/server/contexts/shared/presentation/loaders/load-political-organizations-data";
import { previewDonorCsv } from "@/server/contexts/report/presentation/actions/preview-donor-csv";
import { importDonorCsv } from "@/server/contexts/report/presentation/actions/import-donor-csv";
import DonorCsvImportClient from "@/client/components/donor-csv-import/DonorCsvImportClient";
import { PageHeader } from "@/client/components/layout/PageHeader";

export default async function ImportDonorsPage() {
  const organizations = await loadPoliticalOrganizationsData();

  return (
    <div>
      <PageHeader label="Donor Import" title="寄付者一括インポート" />
      <div className="bg-card rounded-xl p-4">
        <DonorCsvImportClient
          organizations={organizations}
          previewAction={previewDonorCsv}
          importAction={importDonorCsv}
        />
      </div>
    </div>
  );
}
