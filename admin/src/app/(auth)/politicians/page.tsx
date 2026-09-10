import "server-only";
import Link from "next/link";
import { Plus } from "@phosphor-icons/react/dist/ssr";
import { PageHeader } from "@/client/components/layout/PageHeader";
import { Button, Card, CardContent } from "@/client/components/ui";
import { cn } from "@/client/lib";
import { DeletePoliticianButton } from "@/client/components/politicians/DeletePoliticianButton";
import { loadPoliticians } from "@/server/contexts/shared/presentation/loaders/load-politicians";

export default async function PoliticiansPage() {
  const politicians = await loadPoliticians();
  return (
    <div>
      <PageHeader
        label="Politicians"
        title="議員一覧"
        actions={
          <Button asChild>
            <Link href="/politicians/new">
              <Plus />
              議員を追加
            </Link>
          </Button>
        }
      />
      {politicians.length === 0 ? (
        <p className="text-muted-foreground">議員が登録されていません</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {politicians.map((p) => (
            <Card key={p.id}>
              <CardContent className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold">{p.name}</h2>
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
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/politicians/${p.id}/books`}>年度帳簿</Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/politicians/${p.id}/edit`}>編集</Link>
                  </Button>
                  <div className="ml-auto">
                    <DeletePoliticianButton id={p.id} name={p.name} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
