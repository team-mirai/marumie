import "server-only";

import { loadPoliticalOrganizationsData } from "@/server/contexts/shared/presentation/loaders/load-political-organizations-data";
import { previewDonorCsv } from "@/server/contexts/report/presentation/actions/preview-donor-csv";
import { importDonorCsv } from "@/server/contexts/report/presentation/actions/import-donor-csv";
import DonorCsvImportClient from "@/client/components/donor-csv-import/DonorCsvImportClient";

export default async function ImportDonorsPage() {
  const organizations = await loadPoliticalOrganizationsData();

  return (
    <div className="bg-card rounded-xl p-4">
      <h1 className="text-2xl font-bold text-white mb-6">寄付者一括インポート</h1>
      <DonorCsvImportClient
        organizations={organizations}
        previewAction={previewDonorCsv}
        importAction={importDonorCsv}
      />
    </div>
  );
}
