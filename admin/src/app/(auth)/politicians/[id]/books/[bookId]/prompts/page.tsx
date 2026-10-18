import { PageHeader } from "@/client/components/layout/PageHeader";
import { PromptEditor } from "@/client/components/research-fund/PromptEditor";
import { WriteFieldset } from "@/client/components/research-fund/ResearchFundWriteAccess";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/client/components/ui";
import { loadPrompts } from "@/server/contexts/research-fund/presentation/loaders/load-prompts";
import { requireRolePage } from "@/server/contexts/auth/presentation/loaders/require-role-page";

export default async function PromptsPage({
  params,
}: {
  params: Promise<{ id: string; bookId: string }>;
}) {
  await requireRolePage("research_fund");
  const { id, bookId } = await params;
  const { receipt, addressSearch, testDocuments, target } = await loadPrompts(id, bookId);
  return (
    <>
      <PageHeader
        label="Prompt"
        title="読み取りプロンプト"
        description={`${target.name}の議員室で使うプロンプト。保存すると新しい版になり、過去の版に巻き戻せます。`}
      />
      {/* 選択中のタブは Tabs（クライアント）が保持するので、保存・巻き戻し後の再取得でも切り替わらない */}
      <Tabs defaultValue="receipt" className="gap-6">
        <TabsList aria-label="プロンプトの種類">
          <TabsTrigger value="receipt">領収書の読み取り</TabsTrigger>
          <TabsTrigger value="address-search">支払先の住所検索</TabsTrigger>
        </TabsList>
        <TabsContent value="receipt">
          <WriteFieldset>
            <PromptEditor
              key={`receipt:${receipt.activeVersion}`}
              kind="receipt"
              {...receipt}
              testDocuments={testDocuments}
              target={target}
            />
          </WriteFieldset>
        </TabsContent>
        <TabsContent value="address-search">
          <WriteFieldset>
            <PromptEditor
              key={`address-search:${addressSearch.activeVersion}`}
              kind="address-search"
              {...addressSearch}
              target={target}
            />
          </WriteFieldset>
        </TabsContent>
      </Tabs>
    </>
  );
}
