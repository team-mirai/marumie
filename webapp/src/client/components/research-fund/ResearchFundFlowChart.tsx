"use client";
import "client-only";
import { useState } from "react";
import CategoryModeTabs from "@/client/components/research-fund/CategoryModeTabs";
import SankeyChart from "@/client/components/top-page/features/charts/SankeyChart";
import type {
  ResearchFundCategoryMode,
  ResearchFundPageData,
} from "@/server/contexts/research-fund/domain/models/research-fund-page";

/** B-1 のサンキー。区分トグルで詳細／法律上を切り替える。 */
export default function ResearchFundFlowChart({
  sankey,
}: {
  sankey: ResearchFundPageData["sankey"];
}) {
  const [mode, setMode] = useState<ResearchFundCategoryMode>("detailed");
  const data = sankey[mode];

  return (
    <div>
      <CategoryModeTabs value={mode} onChange={setMode} />
      <div className="md:mx-0 -mx-3 mb-0">
        {data.nodes.length > 0 ? (
          <SankeyChart
            data={data}
            ariaLabel="調査研究費の使いみちの流れ図"
            ariaDescription="調査研究費の支給から使いみちへのお金の流れを示すサンキーダイアグラムです。"
          />
        ) : (
          <div className="mx-4 text-gray-500">公開中の調査研究費のデータがありません</div>
        )}
      </div>
    </div>
  );
}
