import type { SankeyData } from "@/types/sankey";

interface SankeyFinancialSummary {
  /** 収入総額（「合計」ノードへの流入） */
  income: number;
  /** 支出総額（収入総額から現金残高を引いた値） */
  expense: number;
  /** 収支・現金残高（「合計」から「現金残高」への流出） */
  balance: number;
}

/**
 * サンキー図のデータから、見出しカードに出す収入総額・支出総額・収支（現金残高）を求める。
 * 集計はサーバーで済んでいるので、ノードとリンクから読み取るだけにする。
 */
export function calculateSankeyFinancialSummary(
  sankeyData: SankeyData | null,
): SankeyFinancialSummary {
  if (!sankeyData?.links || !sankeyData?.nodes) {
    return { income: 0, expense: 0, balance: 0 };
  }

  const { nodes, links } = sankeyData;
  const totalNode = nodes.find((n) => n.label === "合計");
  const cashNode = nodes.find((n) => n.label === "現金残高" && n.nodeType === "expense");

  const income = totalNode
    ? links.filter((link) => link.target === totalNode.id).reduce((sum, l) => sum + l.value, 0)
    : 0;
  const balance =
    totalNode && cashNode
      ? links
          .filter((link) => link.source === totalNode.id && link.target === cashNode.id)
          .reduce((sum, l) => sum + l.value, 0)
      : 0;

  return { income, expense: income - balance, balance };
}
