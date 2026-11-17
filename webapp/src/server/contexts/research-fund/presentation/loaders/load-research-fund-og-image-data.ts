import "server-only";

import { POLITICIAN_PHOTO_MAX_BYTES } from "@/shared/models/politician-photo";
import type { SankeyData } from "@/types/sankey";
import { loadPoliticianPhotoUrl } from "@/server/contexts/research-fund/presentation/loaders/load-politician-photo-url";
import { loadResearchFundPageByPath } from "@/server/contexts/research-fund/presentation/loaders/load-research-fund-page-by-path";

interface ResearchFundOgImageData {
  /** 議員の slug（プレビュー用の文字列を含まない） */
  slug: string;
  name: string;
  /** サイトの議員ページの「詳細の区分」の図のデータ */
  sankey: SankeyData;
  /** 支給総額・支出総額（サイトの見出しと同じ数字） */
  totals: { in: number; out: number };
  /** 議員の顔写真の画像。未登録・取得できないときは null */
  photo: Uint8Array | null;
}

/**
 * 議員の調研費ページのシェア用画像に描くデータ。ページが開けない（議員・年が無い、プレビュー用の文字列が合わない）ときは null を返す。
 * ページと同じ loadResearchFundPageByPath で引くので、公開していない議員はプレビュー URL でしか取れず、
 * データは admin の公開で作り直されるページと同じキャッシュを使う。
 */
export async function loadResearchFundOgImageData(
  pathSlug: string,
  financialYear: number,
): Promise<ResearchFundOgImageData | null> {
  const page = await loadResearchFundPageByPath({ pathSlug, financialYear });
  if (!page) return null;
  const { data } = page;

  const photo = data.politician.hasPhoto ? await fetchPhoto(pathSlug).catch(() => null) : null;
  return {
    slug: data.politician.slug,
    name: data.politician.name,
    sankey: data.sankey.detailed,
    totals: { in: data.kpi.granted, out: data.kpi.spent },
    photo,
  };
}

/** ストレージが応答しないときに、画像の生成ごと待ち続けないための上限 */
const PHOTO_FETCH_TIMEOUT_MS = 3000;

/** 顔写真を取る。取れない・時間がかかりすぎる・登録の上限（3MB）より大きいときは null（人型にする） */
async function fetchPhoto(pathSlug: string): Promise<Uint8Array | null> {
  const url = await loadPoliticianPhotoUrl(pathSlug);
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
