import { PageHeader } from "@/client/components/layout/PageHeader";
import { PromptEditor } from "@/client/components/research-fund/PromptEditor";
import { loadPrompts } from "@/server/contexts/research-fund/presentation/loaders/load-prompts";

export default async function PromptsPage({
  params,
}: {
  params: Promise<{ id: string; bookId: string }>;
}) {
  const { id, bookId } = await params;
  const { receipt, addressSearch, testDocuments, target } = await loadPrompts(id, bookId);
  return (
    <>
      <PageHeader
        label="Prompt"
        title="読み取りプロンプト"
        description={`${target.name}の議員室で使うプロンプト。保存すると新しい版になり、過去の版に巻き戻せます。`}
      />
      <div className="flex flex-col gap-10">
        <PromptEditor
          key={`receipt:${receipt.activeVersion}`}
          kind="receipt"
          {...receipt}
          testDocuments={testDocuments}
          target={target}
        />
        <PromptEditor
          key={`address-search:${addressSearch.activeVersion}`}
          kind="address-search"
          {...addressSearch}
          target={target}
        />
      </div>
    </>
  );
}
