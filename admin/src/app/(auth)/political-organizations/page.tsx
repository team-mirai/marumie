import "server-only";

import Link from "next/link";
import { loadPoliticalOrganizationsData } from "@/server/contexts/shared/presentation/loaders/load-political-organizations-data";
import { DeletePoliticalOrganizationButton } from "@/client/components/political-organizations/DeletePoliticalOrganizationButton";

export default async function PoliticalOrganizationsPage() {
  const organizations = await loadPoliticalOrganizationsData();

  return (
    <div className="bg-primary-panel rounded-xl p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">政治団体一覧</h1>
        <Link
          href="/political-organizations/new"
          className="bg-primary-accent text-white border-0 rounded-lg px-4 py-2.5 font-medium no-underline hover:bg-blue-600 transition-colors duration-200"
        >
          新規作成
        </Link>
      </div>

      {organizations.length === 0 && (
        <div className="text-center py-10">
          <p className="text-primary-muted">政治団体が登録されていません</p>
          <Link
            href="/political-organizations/new"
            className="bg-primary-accent text-white border-0 rounded-lg px-4 py-2.5 font-medium no-underline hover:bg-blue-600 transition-colors duration-200 mt-4 inline-block"
          >
            最初の政治団体を作成
          </Link>
        </div>
      )}

      {organizations.length > 0 && (
        <div className="mt-5">
          <div className="grid gap-3">
            {organizations.map((org) => (
              <div key={org.id} className="bg-primary-input rounded-xl p-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-white mb-2 mt-0">
                      {org.displayName}
                    </h3>
                    {org.description && (
                      <p className="text-primary-muted mb-3 mt-0">
                        {org.description}
                      </p>
                    )}
                    <div className="text-primary-muted text-sm">
                      作成日:{" "}
                      {new Date(org.createdAt).toLocaleDateString("ja-JP")}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/political-organizations/${org.id}`}
                      className="bg-primary-hover text-white no-underline text-sm px-4 py-2 rounded-lg hover:bg-primary-border transition-colors duration-200"
                    >
                      編集
                    </Link>
                    <DeletePoliticalOrganizationButton
                      orgId={BigInt(org.id)}
                      orgName={org.displayName}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
