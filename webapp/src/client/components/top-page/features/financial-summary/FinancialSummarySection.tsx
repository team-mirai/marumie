import { formatAmount } from "@/client/lib/financial-calculator";
import type { SankeyData } from "@/types/sankey";
import FinancialSummaryCard from "./FinancialSummaryCard";
import BalanceDetailCard from "./BalanceDetailCard";

interface FinancialSummarySectionProps {
  sankeyData: SankeyData | null;
}

// sankeyDataからノード名で金額を取得するヘルパー関数群
function createSankeyDataHelper(sankeyData: SankeyData) {
  const { nodes, links } = sankeyData;

  // ノード名とタイプから金額を取得（そのノードへの流入合計）
  const getNodeValue = (nodeName: string, nodeType?: string): number => {
    const node = nodes.find((n) => n.label === nodeName && (!nodeType || n.nodeType === nodeType));
    if (!node) return 0;

    return links
      .filter((link) => link.target === node.id)
      .reduce((sum, link) => sum + link.value, 0);
  };

  // 2つのノード間のリンク値を取得
  const getLinkValueBetween = (
    sourceNodeName: string,
    targetNodeName: string,
    sourceNodeType?: string,
    targetNodeType?: string,
  ): number => {
    const sourceNode = nodes.find(
      (n) => n.label === sourceNodeName && (!sourceNodeType || n.nodeType === sourceNodeType),
    );
    const targetNode = nodes.find(
      (n) => n.label === targetNodeName && (!targetNodeType || n.nodeType === targetNodeType),
    );

    if (!sourceNode || !targetNode) return 0;

    return links
      .filter((link) => link.source === sourceNode.id && link.target === targetNode.id)
      .reduce((sum, link) => sum + link.value, 0);
  };

  return { getNodeValue, getLinkValueBetween };
}

// sankeyDataから財務データを計算する関数
function calculateFinancialData(sankeyData: SankeyData | null) {
  if (!sankeyData?.links || !sankeyData?.nodes) {
    return { income: 0, expense: 0, balance: 0 };
  }

  const helper = createSankeyDataHelper(sankeyData);

  // 収入の計算（合計ノードへの流入）
  const income = helper.getNodeValue("合計");

  // 現金残高の計算（「合計」から「現金残高」への流出）
  const currentBalance = helper.getLinkValueBetween("合計", "現金残高", undefined, "expense");

  // 支出の計算（収入総額から現金残高を引いた値）
  const expense = income - currentBalance;

  return { income, expense, balance: currentBalance };
}

// sankeyDataから収支詳細データを計算する関数
function calculateBalanceDetailData(sankeyData: SankeyData | null) {
  if (!sankeyData?.links || !sankeyData?.nodes) {
    return { balance: 0, cashBalance: 0, unpaidExpense: 0 };
  }

  const helper = createSankeyDataHelper(sankeyData);

  // 現金残高の合計値を取得（合計から現金残高への流入）
  const cashBalanceTotal = helper.getLinkValueBetween("合計", "現金残高", undefined, "expense");

  // 収支の値を取得（現金残高から収支への流出）
  const balanceValue = helper.getLinkValueBetween("現金残高", "収支", "expense", "expense-sub");

  // 未払費用の値を取得（現金残高から未払費用への流出）
  const unpaidExpenseValue = helper.getLinkValueBetween(
    "現金残高",
    "未払費用",
    "expense",
    "expense-sub",
  );

  return {
    balance: balanceValue,
    cashBalance: cashBalanceTotal,
    unpaidExpense: unpaidExpenseValue,
  };
}

export default function FinancialSummarySection({ sankeyData }: FinancialSummarySectionProps) {
  // 財務データを計算
  const financialData = calculateFinancialData(sankeyData);
  const balanceDetailData = calculateBalanceDetailData(sankeyData);

  return (
    <div className="flex flex-col md:flex-row gap-2 items-center">
      <FinancialSummaryCard
        className="w-full md:flex-1"
        title="収入総額"
        amount={formatAmount(financialData.income)}
        titleColor="#238778"
        amountColor="#1F2937"
      />

      <FinancialSummaryCard
        className="w-full md:flex-1"
        title="支出総額"
        amount={formatAmount(financialData.expense)}
        titleColor="#DC2626"
        amountColor="#1F2937"
      />

      <BalanceDetailCard
        className="w-full md:w-auto"
        balance={formatAmount(balanceDetailData.balance)}
        cashBalance={formatAmount(balanceDetailData.cashBalance)}
        unpaidExpense={formatAmount(balanceDetailData.unpaidExpense)}
      />
    </div>
  );
}
