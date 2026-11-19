import "server-only";

import { loadCurrentOrganizationTarget } from "@/server/contexts/shared/presentation/loaders/load-current-organization-target";
import { uploadCsv } from "@/server/contexts/data-import/presentation/actions/upload-csv";
import { previewCsv } from "@/server/contexts/data-import/presentation/actions/preview-csv";
import CsvUploadClient from "@/client/components/csv-upload/CsvUploadClient";
import { PageHeader } from "@/client/components/layout/PageHeader";
import { CurrentTargetBar } from "@/client/components/layout/CurrentTargetBar";
import { TargetRequiredNotice } from "@/client/components/layout/TargetRequiredNotice";
import { requireRolePage } from "@/server/contexts/auth/presentation/loaders/require-role-page";

export default async function UploadCsvPage() {
  await requireRolePage("political_fund");
  const target = await loadCurrentOrganizationTarget();

  if (!target) {
    return <TargetRequiredNotice label="Data Import" title="CSVアップロード" />;
  }

  return (
    <div>
      <PageHeader label="Data Import" title="CSVアップロード" />
      <CurrentTargetBar target={target} note="に取り込まれます" />
      <CsvUploadClient
        key={target.organizationId}
        politicalOrganizationId={target.organizationId}
        uploadAction={uploadCsv}
        previewAction={previewCsv}
      />
    </div>
  );
}
