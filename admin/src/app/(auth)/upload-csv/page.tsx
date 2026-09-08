import "server-only";

import { loadPoliticalOrganizationsData } from "@/server/contexts/shared/presentation/loaders/load-political-organizations-data";
import { uploadCsv } from "@/server/contexts/data-import/presentation/actions/upload-csv";
import { previewCsv } from "@/server/contexts/data-import/presentation/actions/preview-csv";
import CsvUploadClient from "@/client/components/csv-upload/CsvUploadClient";
import { PageHeader } from "@/client/components/layout/PageHeader";

export default async function UploadCsvPage() {
  const organizations = await loadPoliticalOrganizationsData();

  return (
    <div>
      <PageHeader label="Data Import" title="CSVアップロード" />
      <CsvUploadClient
        organizations={organizations}
        uploadAction={uploadCsv}
        previewAction={previewCsv}
      />
    </div>
  );
}
