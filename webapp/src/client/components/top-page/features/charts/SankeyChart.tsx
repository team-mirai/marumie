"use client";
import "client-only";

import { ResponsiveSankey } from "@nivo/sankey";
import { useState } from "react";
import type { MouseEvent } from "react";
import { createPortal } from "react-dom";
import type { SankeyData } from "@/types/sankey";
import InteractiveRect from "./InteractiveRect";
import {
  useMobileDetection,
  useNodeColors,
  useLinkColors,
  useSankeySorting,
} from "./useSankeyHelpers";

// 定数定義
const TEXT = "#1F2937"; // テキスト色

const DIMENSIONS = {
  // ノード幅
  NODE_BASE_WIDTH: 12,
  TOTAL_WIDTH_DESKTOP: 48,
  TOTAL_WIDTH_MOBILE: 24,
  REGULAR_WIDTH_DESKTOP: 36,
  REGULAR_WIDTH_MOBILE: 18,

  // マージン・オフセット
  LABEL_OFFSET_DESKTOP: 16,
  LABEL_OFFSET_MOBILE: 4,
  PERCENTAGE_OFFSET: 0,
  AMOUNT_LABEL_OFFSET: 15,
  TOTAL_LABEL_TOP_OFFSET_DESKTOP: 18,
  TOTAL_LABEL_TOP_OFFSET_MOBILE: 12,
  LINE_HEIGHT: 12,
  MULTI_LINE_OFFSET: 6,

  // フォントサイズ
  FONT_SIZE_DESKTOP: "14.5px",
  FONT_SIZE_MOBILE: "7px",
  FONT_SIZE_SUB_DESKTOP: "11px",
  FONT_SIZE_SUB_MOBILE: "6px",

  // その他
  TSPAN_DY_DESKTOP: 16,
  TSPAN_DY_MOBILE: 10,
  LINE_HEIGHT_SUB_MOBILE: 7,
  CHART_HEIGHT_DESKTOP: 650,
  CHART_HEIGHT_MOBILE: 400,
} as const;

const TEXT_CONFIG = {
  MAX_CHARS_PER_LINE: 7,
  MAX_CHARS_PER_LINE_SUB: 6,
  TOTAL_NODE_ID: "合計",
  TOTAL_LABEL_TOP: "収入支出",
  TOTAL_LABEL_PERCENTAGE: "100%",
  PERCENTAGE_THRESHOLD: 1,
  PERCENTAGE_UNDER_ONE: "<1%",
  CURRENCY_DIVIDER: 10000,
  CURRENCY_UNIT: "万円",
} as const;

const CHART_CONFIG = {
  MARGIN_TOP_DESKTOP: 40,
  MARGIN_TOP_MOBILE: 20,
  MARGIN_HORIZONTAL_DESKTOP: 100,
  MARGIN_HORIZONTAL_MOBILE: 48,
  MARGIN_BOTTOM: 30,
  NODE_THICKNESS: 12,
  NODE_SPACING_DESKTOP: 20,
  NODE_SPACING_MOBILE: 10,
  LINK_OPACITY: 1.0,
  LINK_HOVER_OPACITY: 0.8,
  HOVER_OPACITY: 0.9,
} as const;

interface SankeyNodeWithPosition {
  id: string;
  label?: string;
  nodeType?: string;
  value?: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SankeyChartProps {
  data: SankeyData;
}

const getNodeWidth = (nodeType: string | undefined, isMobile: boolean) => {
  if (nodeType === "total") {
    return !isMobile ? DIMENSIONS.TOTAL_WIDTH_DESKTOP : DIMENSIONS.TOTAL_WIDTH_MOBILE;
  }
  return !isMobile ? DIMENSIONS.REGULAR_WIDTH_DESKTOP : DIMENSIONS.REGULAR_WIDTH_MOBILE;
};

// カスタムノードレイヤー（合計ボックスを太くする）
const CustomNodesLayer = ({ nodes }: { nodes: readonly SankeyNodeWithPosition[] }) => {
  const isMobile = useMobileDetection();
  const { getNodeColor } = useNodeColors();
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    node: SankeyNodeWithPosition | null;
  }>({ visible: false, x: 0, y: 0, node: null });

  const handleMouseEnter = (
    event: MouseEvent,
    nodeData: { id: string; label?: string; value?: number },
  ) => {
    // 元のnode情報を再構築（必要な場合）
    const originalNode = nodes.find((n) => n.id === nodeData.id);

    // 支出側（expense, expense-sub）かどうかを判定
    const isExpenseSide =
      originalNode?.nodeType === "expense" || originalNode?.nodeType === "expense-sub";

    setTooltip({
      visible: true,
      // 支出側の場合は左側に、その他は右側に表示
      x: isExpenseSide ? event.pageX - 10 : event.pageX + 10,
      y: event.pageY - 10,
      node:
        originalNode ||
        ({
          id: nodeData.id,
          label: nodeData.label,
          value: nodeData.value,
        } as SankeyNodeWithPosition),
    });
  };

  const handleMouseLeave = () => {
    setTooltip((prev) => ({ ...prev, visible: false }));
  };

  const handleMouseMove = (event: MouseEvent) => {
    if (tooltip.visible && tooltip.node) {
      // 支出側（expense, expense-sub）かどうかを判定
      const isExpenseSide =
        tooltip.node.nodeType === "expense" || tooltip.node.nodeType === "expense-sub";

      setTooltip((prev) => ({
        ...prev,
        // 支出側の場合は左側に、その他は右側に表示
        x: isExpenseSide ? event.pageX - 10 : event.pageX + 10,
        y: event.pageY - 10,
      }));
    }
  };

  return (
    <>
      <g>
        {nodes.map((node: SankeyNodeWithPosition) => {
          const width = getNodeWidth(node.nodeType, isMobile);
          const x = node.x - (width - DIMENSIONS.NODE_BASE_WIDTH) / 2;
          const color = getNodeColor(node.nodeType, "fill", node.label);

          return (
            <InteractiveRect
              key={node.id}
              id={node.id}
              label={node.label}
              x={x}
              y={node.y}
              width={width}
              height={node.height}
              fill={color}
              value={node.value}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              onMouseMove={handleMouseMove}
            />
          );
        })}
      </g>
      {tooltip.visible &&
        tooltip.node &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            style={{
              position: "absolute",
              left: tooltip.x,
              top: tooltip.y,
              background: "rgba(255, 255, 255, 0.85)",
              padding: "11px 16px",
              border: "1px solid #64748B",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: "700",
              fontFamily: "'Noto Sans JP', sans-serif",
              lineHeight: "1.31",
              color: "#4B5563",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              zIndex: 30, // headerのz-40(4000)より低く設定
              pointerEvents: "none",
              minWidth: "max-content",
              // 支出側の場合は右側を基準に配置
              transform:
                tooltip.node?.nodeType === "expense" || tooltip.node?.nodeType === "expense-sub"
                  ? "translateX(-100%)"
                  : "none",
            }}
          >
            <div style={{ marginBottom: "3px", fontWeight: "700" }}>
              {tooltip.node.label || tooltip.node.id}
            </div>
            <div style={{ fontSize: "14px", fontWeight: "700", color: "#1E293B" }}>
              ¥{Math.round(tooltip.node.value || 0).toLocaleString("ja-JP")}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};

// カスタムラベルレイヤー（プライマリ + セカンダリ）
const calculatePercentageText = (nodeValue?: number, totalValue?: number) => {
  if (!nodeValue || !totalValue || totalValue === 0) {
    return "";
  }

  const percentage = (nodeValue / totalValue) * 100;
  return percentage < TEXT_CONFIG.PERCENTAGE_THRESHOLD
    ? TEXT_CONFIG.PERCENTAGE_UNDER_ONE
    : `${Math.round(percentage)}%`;
};

const renderTotalNodeLabels = (
  node: SankeyNodeWithPosition,
  _boxColor: string,
  percentageY: number,
  isMobile: boolean,
) => {
  const elements = [];

  // 上のラベル：「収入支出\n100%」
  elements.push(
    <text
      key={`${node.id}-top`}
      x={node.x + node.width / 2}
      y={
        percentageY -
        (!isMobile
          ? DIMENSIONS.TOTAL_LABEL_TOP_OFFSET_DESKTOP
          : DIMENSIONS.TOTAL_LABEL_TOP_OFFSET_MOBILE)
      }
      textAnchor="middle"
      dominantBaseline="text-after-edge"
      fill={TEXT}
      fontSize={!isMobile ? "14.5px" : "8px"}
      fontWeight="bold"
    >
      <tspan x={node.x + node.width / 2} dy="0">
        {TEXT_CONFIG.TOTAL_LABEL_TOP}
      </tspan>
      <tspan
        x={node.x + node.width / 2}
        dy={!isMobile ? DIMENSIONS.TSPAN_DY_DESKTOP : DIMENSIONS.TSPAN_DY_MOBILE}
      >
        {TEXT_CONFIG.TOTAL_LABEL_PERCENTAGE}
      </tspan>
    </text>,
  );

  // 下のラベル：金額
  const amountText = node.value
    ? `${Math.round(node.value / TEXT_CONFIG.CURRENCY_DIVIDER).toLocaleString(
        "ja-JP",
      )}${TEXT_CONFIG.CURRENCY_UNIT}`
    : "";
  if (amountText) {
    elements.push(
      <text
        key={`${node.id}-bottom`}
        x={node.x + node.width / 2}
        y={node.y + node.height + DIMENSIONS.AMOUNT_LABEL_OFFSET}
        textAnchor="middle"
        dominantBaseline="text-before-edge"
        fill={TEXT}
        fontSize={!isMobile ? "14.5px" : "8px"}
        fontWeight="bold"
      >
        {amountText}
      </text>,
    );
  }

  return elements;
};

// ラベルを複数行に分割する関数
const splitLabel = (label: string, maxCharsPerLine: number): string[] => {
  const N = maxCharsPerLine;

  // N文字以下の場合は1行で表示
  if (label.length <= N) {
    return [label];
  }

  // 「その他」から始まるケースの特別対応：「その他」が1行目、それ以降が2行目
  if (label.startsWith("その他")) {
    return ["その他", label.substring(3)];
  }

  // 「昨年からの現金残高」の特別対応：「昨年からの」と「現金残高」に分割
  if (label === "昨年からの現金残高") {
    return ["昨年からの", "現金残高"];
  }

  if (label === "安野貴博の政治団体からの寄附") {
    return ["安野貴博の", "政治団体からの", "寄附"];
  }

  // 特殊ケース：N+1文字（7文字）の場合は N-2, 3 に分割
  if (label.length === N + 1) {
    return [label.substring(0, N - 2), label.substring(N - 2)];
  }

  // 特殊ケース：N+2文字（8文字）の場合は N-1, 3 に分割
  if (label.length === N + 2) {
    return [label.substring(0, N - 1), label.substring(N - 1)];
  }

  // 残りのケースは2行に分割
  const textToSplit =
    label.length >= N * 2 + 1
      ? `${label.substring(0, N * 2 - 1)}…` // 長すぎる場合は省略
      : label; // 通常ケース

  return [textToSplit.substring(0, N), textToSplit.substring(N)];
};

const renderPercentageLabel = (
  node: SankeyNodeWithPosition,
  percentageText: string,
  boxColor: string,
  percentageY: number,
  isMobile: boolean,
  getPercentageTextColor: (nodeLabel?: string, boxColor?: string) => string,
) => {
  if (!percentageText) {
    return null;
  }

  const textColor = getPercentageTextColor(node.label, boxColor);

  return (
    <text
      key={`${node.id}-percentage`}
      x={node.x + node.width / 2}
      y={percentageY}
      textAnchor="middle"
      dominantBaseline="text-after-edge"
      fill={textColor}
      fontSize={!isMobile ? "14.5px" : "8px"}
      fontWeight="bold"
    >
      {percentageText}
    </text>
  );
};

const renderPrimaryLabel = (
  node: SankeyNodeWithPosition,
  x: number,
  textAnchor: "start" | "middle" | "end" | "inherit",
  isMobile: boolean,
) => {
  const label = node.label || node.id;
  const isSubcategory = node.nodeType === "income-sub" || node.nodeType === "expense-sub";

  const fontSize = !isMobile
    ? isSubcategory
      ? DIMENSIONS.FONT_SIZE_SUB_DESKTOP
      : DIMENSIONS.FONT_SIZE_DESKTOP
    : isSubcategory
      ? DIMENSIONS.FONT_SIZE_SUB_MOBILE
      : DIMENSIONS.FONT_SIZE_MOBILE;

  // 行を決定
  const maxChars = isSubcategory
    ? TEXT_CONFIG.MAX_CHARS_PER_LINE_SUB
    : TEXT_CONFIG.MAX_CHARS_PER_LINE;
  const lines = splitLabel(label, maxChars);

  // 1行の場合
  if (lines.length === 1) {
    return (
      <text
        key={`${node.id}-primary`}
        x={x}
        y={node.y + node.height / 2}
        textAnchor={textAnchor as "start" | "middle" | "end"}
        dominantBaseline="middle"
        fill={TEXT}
        fontSize={fontSize}
        fontWeight="bold"
      >
        {lines[0]}
      </text>
    );
  }

  // 複数行の場合
  const lineHeight = isSubcategory
    ? isMobile
      ? DIMENSIONS.LINE_HEIGHT_SUB_MOBILE
      : DIMENSIONS.LINE_HEIGHT
    : isMobile
      ? 10 // モバイルでのメインカテゴリ行間
      : 16; // デスクトップでのメインカテゴリ行間
  const totalTextHeight = (lines.length - 1) * lineHeight;

  return (
    <text
      key={`${node.id}-primary`}
      x={x}
      y={node.y + node.height / 2 - totalTextHeight / 2}
      textAnchor={textAnchor}
      fill={TEXT}
      fontSize={fontSize}
      fontWeight="bold"
      dominantBaseline="middle"
    >
      {lines.map((line, index) => (
        <tspan key={`${node.id}-${index}`} x={x} dy={index === 0 ? 0 : lineHeight}>
          {line}
        </tspan>
      ))}
    </text>
  );
};

// カスタムラベルレイヤー（プライマリ + セカンダリ）
const CustomLabelsLayer = ({ nodes }: { nodes: readonly SankeyNodeWithPosition[] }) => {
  const isMobile = useMobileDetection();
  const { getNodeColor, getPercentageTextColor } = useNodeColors();

  // 全体の合計値を計算（合計ノードの値を使用）
  const totalValue = nodes.find((node) => node.label === TEXT_CONFIG.TOTAL_NODE_ID)?.value || 0;

  return (
    <g>
      {nodes.map((node: SankeyNodeWithPosition) => {
        // ノードタイプで収入・支出を判定
        const isLeft = node.nodeType === "income" || node.nodeType === "income-sub";
        const x = isLeft
          ? node.x - (!isMobile ? DIMENSIONS.LABEL_OFFSET_DESKTOP : DIMENSIONS.LABEL_OFFSET_MOBILE)
          : node.x +
            node.width +
            (!isMobile ? DIMENSIONS.LABEL_OFFSET_DESKTOP : DIMENSIONS.LABEL_OFFSET_MOBILE);
        const textAnchor = isLeft ? "end" : "start";
        const percentageY = node.y - DIMENSIONS.PERCENTAGE_OFFSET;
        const percentageText = calculatePercentageText(node.value, totalValue);
        const boxColor = getNodeColor(node.nodeType, "box", node.label);
        const elements = [];

        if (node.nodeType === "total") {
          elements.push(...renderTotalNodeLabels(node, boxColor, percentageY, isMobile));
        } else if (percentageText) {
          const percentageLabel = renderPercentageLabel(
            node,
            percentageText,
            boxColor,
            percentageY,
            isMobile,
            getPercentageTextColor,
          );
          if (percentageLabel) {
            elements.push(percentageLabel);
          }
        }

        if (node.nodeType !== "total") {
          elements.push(renderPrimaryLabel(node, x, textAnchor, isMobile));
        }

        return elements;
      })}
    </g>
  );
};

export default function SankeyChart({ data }: SankeyChartProps) {
  const isMobile = useMobileDetection();
  const { getNodeColor } = useNodeColors();

  // 空データの場合はダミーデータを渡す
  const safeData = data?.nodes && data?.links ? data : { nodes: [], links: [] };
  const { processLinksWithColors } = useLinkColors(safeData);
  const { sortNodes, sortLinks } = useSankeySorting(safeData);

  // データが空または不正な場合の早期リターン
  if (!data || !data.nodes || !data.links || data.nodes.length === 0 || data.links.length === 0) {
    return (
      <div
        style={{
          height: 300,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#6B7280",
          fontSize: "14px",
        }}
      >
        データがありません
      </div>
    );
  }

  // ソートされたデータを取得
  const sortedNodes = sortNodes(data.nodes);
  const processedLinks = processLinksWithColors();
  const nodeOrder = sortedNodes.map((n) => n.id);
  const sortedLinks = sortLinks(processedLinks, nodeOrder);

  const processedData = {
    ...data,
    nodes: sortedNodes,
    links: sortedLinks,
  };

  return (
    <div
      style={{
        height: !isMobile ? DIMENSIONS.CHART_HEIGHT_DESKTOP : DIMENSIONS.CHART_HEIGHT_MOBILE,
      }}
      className="sankey-container !mb-0"
      role="img"
      aria-label="政治資金の収支フロー図"
      aria-describedby="sankey-chart-description"
    >
      <div id="sankey-chart-description" className="sr-only">
        政治資金の収入から支出へのお金の流れを示すサンキーダイアグラムです。
      </div>
      <style jsx global>{`
        .sankey-container svg path:hover {
          opacity: ${CHART_CONFIG.HOVER_OPACITY} !important;
        }
        .sankey-container svg text {
          white-space: pre-line;
        }
      `}</style>
      <ResponsiveSankey
        data={processedData}
        label={(node) => {
          return (node as { label?: string; id: string }).label || (node as { id: string }).id;
        }}
        margin={{
          top: !isMobile ? CHART_CONFIG.MARGIN_TOP_DESKTOP : CHART_CONFIG.MARGIN_TOP_MOBILE,
          right: !isMobile
            ? CHART_CONFIG.MARGIN_HORIZONTAL_DESKTOP
            : CHART_CONFIG.MARGIN_HORIZONTAL_MOBILE,
          bottom: CHART_CONFIG.MARGIN_BOTTOM,
          left: !isMobile
            ? CHART_CONFIG.MARGIN_HORIZONTAL_DESKTOP
            : CHART_CONFIG.MARGIN_HORIZONTAL_MOBILE,
        }}
        align="center"
        colors={(node) =>
          getNodeColor(
            (node as { nodeType?: string }).nodeType,
            "light",
            (node as { label?: string }).label,
          )
        }
        valueFormat={(v) => `¥${Math.round(v as number).toLocaleString("ja-JP")}`}
        nodeOpacity={1}
        nodeBorderWidth={0}
        nodeThickness={CHART_CONFIG.NODE_THICKNESS}
        nodeSpacing={
          !isMobile ? CHART_CONFIG.NODE_SPACING_DESKTOP : CHART_CONFIG.NODE_SPACING_MOBILE
        }
        sort="input"
        linkOpacity={CHART_CONFIG.LINK_OPACITY}
        linkHoverOpacity={CHART_CONFIG.LINK_OPACITY}
        enableLinkGradient={true}
        enableLabels={false}
        isInteractive={false}
        layers={["links", CustomNodesLayer, CustomLabelsLayer]}
        theme={{
          labels: {
            text: {
              fontSize: !isMobile ? DIMENSIONS.FONT_SIZE_DESKTOP : DIMENSIONS.FONT_SIZE_MOBILE,
              fontWeight: "bold",
            },
          },
        }}
      />
    </div>
  );
}
