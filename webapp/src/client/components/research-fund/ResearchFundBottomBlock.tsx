import "server-only";
import { DATA_NOTE_LINK_CLASS } from "@/client/components/common/DataNotesSection";
import SiteBottomBlock from "@/client/components/common/SiteBottomBlock";

interface Props {
  /** 「調研費のデータについて」の本文（帳簿の説明文、無ければ既定文） */
  dataNote: string;
}

/** 議員ページの下部の共通ブロック。データについては議員ページ用の項目（このサイト・調研費のデータ・免責事項）にする。 */
export default function ResearchFundBottomBlock({ dataNote }: Props) {
  return (
    <SiteBottomBlock
      dataNotes={[
        {
          title: "まる見え政治資金について",
          body: (
            <>
              本プロジェクトは、チームみらいによって政治資金の透明化を目的に開発されたオープンソースソフトウェアです。すでにオープンソースで
              <a
                href="https://github.com/team-mirai-volunteer/marumie"
                target="_blank"
                rel="noopener noreferrer"
                className={DATA_NOTE_LINK_CLASS}
              >
                こちらのGitHub
              </a>
              にて無償公開中であり、政党や所属を問わず利用可能な形で提供しております。開発コミュニティにご興味のある方は
              <a
                href="https://action.team-mir.ai/missions/join-slack"
                target="_blank"
                rel="noopener noreferrer"
                className={DATA_NOTE_LINK_CLASS}
              >
                アクションボード
              </a>
              からSlackにご参加ください。
            </>
          ),
        },
        { title: "調研費のデータについて", body: dataNote },
        {
          title: "免責事項",
          body: "本サイトで公開するデータは、可能な限り正確かつ最新の情報を反映するよう努めていますが、現時点においてはその正確性・完全性・即時性について保証するものではありません。今後は、これらの側面について一層踏み込んだ公開を目指してまいります。最終的な収支は、別途公開される「政治資金収支報告書」「選挙運動費用収支報告書」並びに「調査研究広報滞在費に係る使途等報告書」をご確認ください。",
        },
      ]}
    />
  );
}
