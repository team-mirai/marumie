import "server-only";
import type { PoliticianPhotoRepository } from "@/server/contexts/research-fund/domain/repositories/politician-photo-repository.interface";
import type { PoliticianPhotoStorage } from "@/server/contexts/research-fund/domain/repositories/politician-photo-storage.interface";
import { canViewResearchFundPage } from "@/server/contexts/research-fund/domain/services/research-fund-page-access";
import { parsePoliticianPathSegment } from "@/shared/research-fund/preview-path";

/** 署名URLの有効期限（秒）。開いてすぐ表示する用途なので短くする。 */
const SIGNED_URL_EXPIRES_IN = 300;

interface GetPoliticianPhotoUrlParams {
  /** 議員ページの URL の slug の区間。プレビュー URL ならプレビュー用の文字列を含む */
  pathSlug: string;
  /** RESEARCH_FUND_PREVIEW_SECRET。未設定なら null */
  previewSecret: string | null;
}

export class GetPoliticianPhotoUrlUsecase {
  constructor(
    private repository: PoliticianPhotoRepository,
    private storage: PoliticianPhotoStorage,
  ) {}

  /**
   * 議員の顔写真の署名URL。議員ページを開ける議員（調研費を公開中、またはプレビュー URL）の写真だけを返す。
   * 開けない議員・写真が未登録の議員は null を返し、非公開の議員の写真が漏れないようにする。
   */
  async execute({ pathSlug, previewSecret }: GetPoliticianPhotoUrlParams): Promise<string | null> {
    const { slug, previewToken } = parsePoliticianPathSegment(pathSlug);
    const source = await this.repository.findPhoto(slug);
    if (!source?.photoPath) return null;
    const canView = canViewResearchFundPage({
      slug,
      isPublic: source.isPublic,
      previewToken,
      previewSecret,
    });
    if (!canView) return null;
    return await this.storage.createSignedUrl(source.photoPath, SIGNED_URL_EXPIRES_IN);
  }
}
