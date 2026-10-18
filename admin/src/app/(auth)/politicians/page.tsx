import "server-only";
import { loadAdminTargets } from "@/server/contexts/shared/presentation/loaders/load-admin-targets";
import Link from "next/link";
import { Plus } from "@phosphor-icons/react/dist/ssr";
import { PageHeader } from "@/client/components/layout/PageHeader";
import { Button, Card, CardContent } from "@/client/components/ui";
import { cn } from "@/client/lib";
import { DeletePoliticianButton } from "@/client/components/politicians/DeletePoliticianButton";
import { ResearchFundPublicSwitch } from "@/client/components/politicians/ResearchFundPublicSwitch";
import { loadPoliticians } from "@/server/contexts/shared/presentation/loaders/load-politicians";
import { UserRoleModel } from "@/server/contexts/auth/domain/models/user-role";
import { requireRolePage } from "@/server/contexts/auth/presentation/loaders/require-role-page";

export default async function PoliticiansPage() {
  const user = await requireRolePage("research_fund");
  // 議員の登録・編集・削除は admin だけ（一覧の閲覧と公開切り替えは research_fund でもできる）
  const canManagePoliticians = UserRoleModel.isAdmin(user.roles);
  const [politicians, { currentTarget }] = await Promise.all([
    loadPoliticians(),
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
          {politicians.map((p) => (
            <Card
              key={p.id}
              className={cn(
                currentTarget?.kind === "research-fund" &&
                  currentTarget.politicianId === p.id &&
                  "border-ring bg-accent",
              )}
            >
              <CardContent className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold">{p.name}</h2>
                  {currentTarget?.kind === "research-fund" &&
                    currentTarget.politicianId === p.id && (
                      <p className="text-xs font-bold text-primary-active">
                        現在の対象：{currentTarget.year}年度
                      </p>
                    )}
                  <p className="font-latin text-sm text-muted-foreground">/{p.slug}</p>
                </div>
                <span
                  className={cn(
                    "inline-block rounded-full px-3 py-1 text-xs",
                    p.politicalOrganizationId
                      ? "bg-accent text-accent-foreground"
                      : "bg-secondary text-muted-foreground",
                  )}
                >
                  {p.politicalOrganizationName ?? "無所属（政党なし）"}
                </span>
                <p className="text-sm text-muted-foreground">
                  当選{" "}
                  <span className="font-latin">{p.termStart.slice(0, 7).replaceAll("-", ".")}</span>
                </p>
                <ResearchFundPublicSwitch id={p.id} isResearchFundPublic={p.isResearchFundPublic} />
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" size="sm" asChild>
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
          ))}
        </div>
      )}
    </div>
  );
}
