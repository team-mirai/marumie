import { PromptEditor } from "@/client/components/research-fund/PromptEditor";
import { loadPrompts } from "@/server/contexts/research-fund/presentation/loaders/load-prompts";

export default async function PromptsPage({
  params,
}: {
  params: Promise<{ id: string; bookId: string }>;
}) {
  const { id, bookId } = await params;
  const data = await loadPrompts(id, bookId);
  return <PromptEditor key={`${data.activeVersion}`} {...data} />;
}
