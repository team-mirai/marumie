import { PageHeader } from "@/client/components/layout/PageHeader";

export default function Home() {
  return (
    <div>
      <PageHeader label="Dashboard" title="ダッシュボード" />
      <div className="bg-card rounded-xl p-4">
        <p className="text-muted-foreground">Use the left navigation to manage data.</p>
      </div>
    </div>
  );
}
