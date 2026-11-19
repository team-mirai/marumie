import { sortFooterPoliticiansByKana } from "@/client/lib/footer-navigation";
import { buildPoliticianMenuItems } from "@/client/lib/header-navigation";

/** 「現時点で公開している収支」の内訳の1区分（政党・議員の調研費・議員の政治団体） */
export interface AboutPublishedCategory<T> {
  label: string;
  items: T[];
}

export interface AboutPublishedParty {
  slug: string;
  name: string;
}

export interface AboutPublishedPolitician {
  slug: string;
  name: string;
  /** 顔写真の URL。未登録なら null */
  photoUrl: string | null;
}

export interface AboutPublishedGroup {
  slug: string;
  /** 代表者の名前と政治団体の正式名（例: 「安野貴博（デジタル民主主義を考える会）」） */
  label: string;
  hasPhoto: boolean;
}

export interface AboutPublishedSummary {
  total: number;
  parties: AboutPublishedCategory<AboutPublishedParty>;
  politicians: AboutPublishedCategory<AboutPublishedPolitician>;
  groups: AboutPublishedCategory<AboutPublishedGroup>;
}

interface OrganizationSource {
  slug: string;
  displayName: string;
  orgName: string | null;
  hasPhoto: boolean;
}

interface PoliticianSource {
  slug: string;
  name: string;
  nameKana: string | null;
  hasPhoto: boolean;
}

/**
 * 「まる見え政治資金とは」の「現時点で公開している収支」を、公開中のデータから数える。
 * 議員の調研費は年度をまたいで 1 人 1 件に数え、フッターと同じくふりがなの五十音順に並べる。
 */
export function buildAboutPublishedSummary(
  parties: readonly OrganizationSource[],
  groups: readonly OrganizationSource[],
  politiciansByYear: Readonly<Record<number, readonly PoliticianSource[]>>,
): AboutPublishedSummary {
  const politicians = sortFooterPoliticiansByKana(
    buildPoliticianMenuItems(politiciansByYear, { kind: "other" }),
    politiciansByYear,
  ).map(({ slug, name, photoUrl }) => ({ slug, name, photoUrl }));

  return {
    total: parties.length + politicians.length + groups.length,
    parties: {
      label: "政党",
      items: parties.map((party) => ({ slug: party.slug, name: party.displayName })),
    },
    politicians: { label: "議員の調研費", items: politicians },
    groups: {
      label: "議員の政治団体",
      items: groups.map((group) => ({
        slug: group.slug,
        label: group.orgName ? `${group.displayName}（${group.orgName}）` : group.displayName,
        hasPhoto: group.hasPhoto,
      })),
    },
  };
}

/** 読み上げ用の内訳（例: 「14（政党1、議員の調研費12、議員の政治団体1）」）。0 件の区分は省く */
export function describeAboutPublishedSummary(summary: AboutPublishedSummary): string {
  const breakdown = [summary.parties, summary.politicians, summary.groups]
    .filter((category) => category.items.length > 0)
    .map((category) => `${category.label}${category.items.length}`)
    .join("、");
  return breakdown ? `${summary.total}（${breakdown}）` : String(summary.total);
}
