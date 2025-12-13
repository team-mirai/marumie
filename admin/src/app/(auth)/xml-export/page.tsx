import { XmlExportClient } from "@/client/components/xml-export/XmlExportClient";
import { loadPoliticalOrganizationsData } from "@/server/contexts/common/presentation/loaders/load-political-organizations-data";

export default async function XmlExportPage() {
  const organizations = await loadPoliticalOrganizationsData();

  return <XmlExportClient organizations={organizations} />;
}
