import type { ResearchFundPoliticianProfileView } from "@/server/contexts/research-fund/domain/models/research-fund-page";
import type { PoliticianHouse } from "@/shared/models/politician";

/**
 * 組織セレクタの「調査研究費」グループに並べる議員。
 *
 * 政治資金（政治団体）と並べて1箇所で切り替えられるようにするためのもので、
 * 公開状況（「2026年2-8月分を公開中」）まで含めて渡す。
 * published の仕訳がある議員だけが入る。
 */
export interface ResearchFundPoliticianEntry {
  slug: string;
  name: string;
  /** ふりがな。未登録なら null（年度をまたいで並べ直すときに使う） */
  nameKana: string | null;
  /** 「2026年2-8月分を公開中」 */
  statusLabel: string;
  /** admin で顔写真を登録しているか（ヘッダーのメニューの丸アイコンに使う） */
  hasPhoto: boolean;
}

/**
 * 議員ページの前後の切り替え・「他の議員の調研費を見る」に並べる、調研費を公開中の議員。
 * 並びはふりがなの五十音順。
 */
export interface ResearchFundPoliticianCard {
  slug: string;
  name: string;
  /** 「衆議院議員・比例東京（東京7区）」。院も選挙区も未登録なら null */
  title: string | null;
  hasPhoto: boolean;
}

/**
 * 公開状況を判定する前の、その年度に帳簿を持つ議員。
 * セレクタに出すか・公開範囲の表記は usecase で決める。
 */
export interface ResearchFundPoliticianSource {
  slug: string;
  name: string;
  /** ふりがな。未登録なら null（並び順に使う） */
  nameKana: string | null;
  house: PoliticianHouse | null;
  constituency: string | null;
  hasPhoto: boolean;
  /** published の仕訳がある月（YYYY-MM）。重複していてよい */
  publishedMonths: string[];
  /** 何月分まで公開したか（YYYY-MM）。未設定なら null */
  publishedThrough: string | null;
}

/**
 * 調研費を非公開のまま「準備中」として議員一覧（トップ・メニュー・フッター・「他の議員」）にグレーで出す議員。
 * ページは開けないのでリンクにしない。並びはふりがなの五十音順で、公開中の議員の後ろに置く。
 */
export interface ResearchFundComingSoonPolitician {
  slug: string;
  name: string;
  /** ふりがな。未登録なら null（並び順に使う） */
  nameKana: string | null;
  hasPhoto: boolean;
  /** 添え書き（例: 「宇佐美議員室は業務逼迫のため、12月中旬を目処に公開予定です。」）。無ければ null */
  note: string | null;
}

/** 「準備中」の議員のページ（/p/{slug}/{年度}）に出す、プロフィールと添え書き */
export interface ResearchFundComingSoonPage {
  politician: ResearchFundPoliticianProfileView;
  /** 添え書き。無ければ null */
  note: string | null;
  /** 下部の「調研費のデータについて」の本文（既定文） */
  dataNote: string;
}
