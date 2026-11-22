import "server-only";

import type { OrganizationKind } from "@/server/contexts/public-finance/domain/models/organization-kind";
import { POLITICIAN_PHOTO_MAX_BYTES } from "@/shared/models/politician-photo";
import type { SankeyData } from "@/types/sankey";
import { loadOrganizationPhotoUrl } from "@/server/contexts/public-finance/presentation/loaders/load-organization-photo-url";
import { loadOrganizations } from "@/server/contexts/public-finance/presentation/loaders/load-organizations";
import { loadTopPageData } from "@/server/contexts/public-finance/presentation/loaders/load-top-page-data";

interface OrganizationOgImageData {
  displayName: string;
  /** 政党か、それ以外の政治団体か（トップページ・メニュー・ページと同じ基準） */
  kind: OrganizationKind;
  /** サイトの「詳細の区分」の図のデータ */
  friendly: SankeyData;
  /** 代表者の顔写真の画像。政党（見出しはロゴ）・未登録・取得できないときは null */
  photo: Uint8Array | null;
}

/**
 * 政党・政治団体ページのシェア用画像に描くデータ。団体が無い・図のデータが取れないときは null を返す。
 * 図のデータはページと同じ引数で loadTopPageData から取り、ページと同じキャッシュ（admin の公開で作り直される）を使う。
 */
export async function loadOrganizationOgImageData(
  slug: string,
  financialYear: number,
): Promise<OrganizationOgImageData | null> {
  const { organizations } = await loadOrganizations();
  const organization = organizations.find((org) => org.slug === slug);
  if (!organization) return null;

  const data = await loadTopPageData({ slugs: [slug], page: 1, perPage: 6, financialYear });
  if (!data?.friendly) return null;

  // 政党の画像は見出しにロゴを描くので、写真は取りに行かない
  const photo =
    organization.kind === "group" && organization.hasPhoto
      ? await fetchPhoto(slug).catch(() => null)
      : null;
  return {
    displayName: organization.displayName,
    kind: organization.kind,
    friendly: data.friendly,
    photo,
  };
}

/** ストレージが応答しないときに、画像の生成ごと待ち続けないための上限 */
const PHOTO_FETCH_TIMEOUT_MS = 3000;

/** 代表者の顔写真を取る。取れない・時間がかかりすぎる・登録の上限（3MB）より大きいときは null（人型にする） */
async function fetchPhoto(slug: string): Promise<Uint8Array | null> {
  const url = await loadOrganizationPhotoUrl(slug);
  if (!url) return null;
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(PHOTO_FETCH_TIMEOUT_MS),
  });
  if (!response.ok) return null;
  if (Number(response.headers.get("content-length") ?? 0) > POLITICIAN_PHOTO_MAX_BYTES) return null;
  const bytes = new Uint8Array(await response.arrayBuffer());
  return bytes.byteLength <= POLITICIAN_PHOTO_MAX_BYTES ? bytes : null;
}
