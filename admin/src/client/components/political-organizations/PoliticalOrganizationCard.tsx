import Link from "next/link";
import { Button } from "@/client/components/ui";
import { formatDate } from "@/client/lib";
import { DeletePoliticalOrganizationButton } from "@/client/components/political-organizations/DeletePoliticalOrganizationButton";
import type { PoliticalOrganization } from "@/shared/models/political-organization";

interface PoliticalOrganizationCardProps {
  organization: PoliticalOrganization;
}

/**
 * 政治団体一覧の 1 団体カード。
 * 白・黒 1px 枠・角丸 8px・padding 22px 26px（ハンドオフ「3. 政治団体一覧」）。
 * E2E がカードを「h3 の祖先で class に border を含む div」として探すため、
 * ルート要素は div のまま `border` クラスを保持すること。
 */
export function PoliticalOrganizationCard({ organization }: PoliticalOrganizationCardProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-5 rounded-lg border border-border bg-card px-[26px] py-[22px]">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <h3 className="text-[17px] font-bold leading-snug tracking-[0.04em] text-foreground">
            {organization.displayName}
          </h3>
          <span className="font-latin inline-block rounded-full bg-accent px-3 py-0.5 text-[11px] font-bold leading-[1.6] text-accent-foreground">
            {organization.slug}
          </span>
        </div>
        {organization.description && (
          <p className="mt-2 text-[13px] text-muted-foreground">{organization.description}</p>
        )}
        <div className="font-latin mt-2.5 text-xs text-subtle-foreground">
          作成日: {formatDate(organization.createdAt)}
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button variant="outline" size="sm" className="text-xs" asChild>
          <Link href={`/political-organizations/${organization.id}`}>編集</Link>
        </Button>
        <DeletePoliticalOrganizationButton
          orgId={BigInt(organization.id)}
          orgName={organization.displayName}
        />
      </div>
    </div>
  );
}
