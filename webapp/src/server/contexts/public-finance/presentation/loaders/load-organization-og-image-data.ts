import "server-only";

import type { SankeyData } from "@/types/sankey";
import { loadOrganizationPhotoUrl } from "@/server/contexts/public-finance/presentation/loaders/load-organization-photo-url";
import { loadOrganizations } from "@/server/contexts/public-finance/presentation/loaders/load-organizations";
import { loadTopPageData } from "@/server/contexts/public-finance/presentation/loaders/load-top-page-data";

interface OrganizationOgImageData {
  displayName: string;
  /** サイトの「詳細の区分」の図のデータ */
  friendly: SankeyData;
  /** 代表者の顔写真の画像。未登録・取得できないときは null */
  photo: Uint8Array | null;
}

/**
 * 政党・政治団体ページのシェア用画像に描くデータ。団体が無い・図のデータが取れないときは null を返す。
 * 図のデータはページと同じ引数で loadTopPageData から取り、ページと同じキャッシュ（admin の公開で作り直される）を使う。
 */
export async function loadOrganizationOgImageData(
  slug: string,
  financialYear: number,
  options: { withPhoto: boolean },
): Promise<OrganizationOgImageData | null> {
  const { organizations } = await loadOrganizations();
  const organization = organizations.find((org) => org.slug === slug);
  if (!organization) return null;

  const data = await loadTopPageData({ slugs: [slug], page: 1, perPage: 6, financialYear });
  if (!data?.friendly) return null;

  const photo =
    options.withPhoto && organization.hasPhoto ? await fetchPhoto(slug).catch(() => null) : null;
  return { displayName: organization.displayName, friendly: data.friendly, photo };
}

async function fetchPhoto(slug: string): Promise<Uint8Array | null> {
  const url = await loadOrganizationPhotoUrl(slug);
  if (!url) return null;
  const response = await fetch(url, { cache: "no-store" });
  return response.ok ? new Uint8Array(await response.arrayBuffer()) : null;
}
