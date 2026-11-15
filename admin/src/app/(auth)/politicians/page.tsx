import "server-only";
import { loadAdminTargets } from "@/server/contexts/shared/presentation/loaders/load-admin-targets";
import Link from "next/link";
import { Plus } from "@phosphor-icons/react/dist/ssr";
import { PageHeader } from "@/client/components/layout/PageHeader";
import { Button, Card, CardContent } from "@/client/components/ui";
import { cn } from "@/client/lib";
import { DeletePoliticianButton } from "@/client/components/politicians/DeletePoliticianButton";
import { ResearchFundPublication } from "@/client/components/politicians/ResearchFundPublication";
import { loadPoliticiansWithResearchFundPageUrl } from "@/server/contexts/shared/presentation/loaders/load-politicians";
import { UserRoleModel } from "@/server/contexts/auth/domain/models/user-role";
import { requireRolePage } from "@/server/contexts/auth/presentation/loaders/require-role-page";

export default async function PoliticiansPage() {
  const user = await requireRolePage("research_fund");
  // 議員の登録・編集・削除と調研費の公開切り替えは admin だけ（一覧の閲覧は research_fund でもできる）
  const canManagePoliticians = UserRoleModel.isAdmin(user.roles);
  const [politicians, { currentTarget }] = await Promise.all([
    loadPoliticiansWithResearchFundPageUrl(),
    loadAdminTargets(),
  ]);
  return (
    <div>
      <PageHeader
        label="Politicians"
        title="議員一覧"
        actions={
          canManagePoliticians && (
            <Button asChild>
              <Link href="/politicians/new">
                <Plus />
                議員を追加
              </Link>
            </Button>
          )
        }
      />
      {politicians.length === 0 ? (
        <p className="text-muted-foreground">議員が登録されていません</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {politicians.map((p) => {
            const isCurrentTarget =
              currentTarget?.kind === "research-fund" && currentTarget.politicianId === p.id;
            return (
              <Card
                key={p.id}
                className={cn("min-w-0", isCurrentTarget && "border-ring bg-accent")}
              >
                <CardContent className="flex flex-1 flex-col gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold">{p.name}</h2>
                      {isCurrentTarget && (
                        <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
                          現在の対象：<span className="font-latin">{currentTarget.year}</span>年度
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {p.politicalOrganizationName ?? "無所属（政党なし）"}
                      <span aria-hidden="true"> ・ </span>
                      当選{" "}
                      <span className="font-latin">
                        {p.termStart.slice(0, 7).replaceAll("-", ".")}
                      </span>
                    </p>
                  </div>
                  <ResearchFundPublication
                    id={p.id}
                    isResearchFundPublic={p.isResearchFundPublic}
                    pageUrl={p.researchFundPageUrl}
                    canManage={canManagePoliticians}
                  />
                  <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-border-soft pt-4">
                    <Button size="sm" asChild>
                      <Link href={`/politicians/${p.id}/books`}>年度帳簿</Link>
                    </Button>
                    {canManagePoliticians && (
                      <>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/politicians/${p.id}/edit`}>編集</Link>
                        </Button>
                        <div className="ml-auto">
                          <DeletePoliticianButton id={p.id} name={p.name} />
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
