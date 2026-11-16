import "server-only";
import { DISCLAIMER_NOTE } from "@/client/components/common/DataNotesSection";
import SiteBottomBlock from "@/client/components/common/SiteBottomBlock";

interface Props {
  /** 「調研費のデータについて」の本文（帳簿の説明文、無ければ既定文） */
  dataNote: string;
  /** データについての見出しの付け方。議員ページは "member"、議員の出入金ページは既定の "page" */
  notesVariant?: "page" | "member";
}

/** 議員ページの下部の共通ブロック。データについては議員ページ用の項目（調研費のデータ・免責事項）にする。 */
export default function ResearchFundBottomBlock({ dataNote, notesVariant }: Props) {
  return (
    <SiteBottomBlock
      dataNotes={[{ title: "調研費のデータについて", body: dataNote }, DISCLAIMER_NOTE]}
      notesVariant={notesVariant}
    />
  );
}
