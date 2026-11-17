import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { calculateSankeyFinancialSummary } from "@/client/lib/sankey-financial-summary";
import { toSankeyFlow } from "@/client/lib/sankey-flow";
import { GREEN, RED, type SankeyLayoutOptions, layoutSankey } from "@/client/lib/sankey-layout";
import { type OgFace, OgFinanceCard, type OgHeadingVariant } from "@/app/_og-image/og-finance-card";
import { loadOgFonts } from "@/app/_og-image/og-fonts";
import { OG_HEIGHT, OG_WIDTH, TOP_OG_IMAGE_PATH, ogPatternIndex } from "@/app/_og-image/og-frame";
import { type OgBox, fitSankeyToBox } from "@/app/_og-image/og-sankey";
import { SANKEY_UNUSED_LABEL, type SankeyData } from "@/types/sankey";

/** シェア用の画像の HTTP ヘッダー。サイトのページの作り直し（5分）と同じ間隔で CDN に持たせる */
const OG_IMAGE_HEADERS = {
  "Content-Type": "image/png",
  "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=86400",
};

interface OgChartConfig {
  /**
   * 図（帯・棒・ラベル）を収める枠。見出しの下端に少し入りこませ、入りこんだぶんの帯と棒はぼかして見出しを読めるようにする。
   * 下端は「まる見え政治資金」の文字の上まで
   */
  box: OgBox;
  /** 右端の列のラベルの下端の上限（右下のロゴと「まる見え政治資金」にかからない高さ） */
  labelBottomLimit: number;
  /** 画像は縮めて描くので、サイトより項目名を大きめに組む */
  labelScale: number;
  /** サイトの図と同じ組み立て方（議員ページは「支出」の下に各費目、右端に「未使用・未処理」） */
  flow: Parameters<typeof toSankeyFlow>[1];
  titles: Pick<SankeyLayoutOptions, "inTitle" | "outTitle">;
  /** 見出しの右の2つの総額のラベル（左が入ってきたお金、右が使ったお金） */
  totalLabels: [string, string];
}

const POLITICAL_FUND = {
  flow: {},
  titles: { inTitle: "収入", outTitle: "支出・残高" },
  totalLabels: ["収入", "支出"],
} satisfies Pick<OgChartConfig, "flow" | "titles" | "totalLabels">;

const CHART: Record<OgHeadingVariant, OgChartConfig> = {
  party: {
    ...POLITICAL_FUND,
    box: { x: 64, y: 170, width: 1072, height: 360 },
    labelBottomLimit: 468,
    labelScale: 1.3,
  },
  group: {
    ...POLITICAL_FUND,
    box: { x: 64, y: 186, width: 1072, height: 344 },
    labelBottomLimit: 468,
    labelScale: 1.3,
  },
  // 議員の調研費は右端の区分が多いので、区分名を大きめに組み、ラベルの下端を少し上げる
  member: {
    flow: { balanceLabel: SANKEY_UNUSED_LABEL, groupExpensesAs: "支出" },
    titles: { inTitle: "支給", outTitle: "支出・未使用" },
    totalLabels: ["支給", "支出"],
    box: { x: 64, y: 172, width: 1072, height: 358 },
    labelBottomLimit: 452,
    labelScale: 1.5,
  },
};
const LABEL_OFFSET = 24;
/** 右端の列の棒の右端の上限（右下のロゴの左端より手前） */
const COLUMN_RIGHT_LIMIT = 990;
const FADE_TOP: [number, number, number] = [132, 168, 196];

interface FinanceOgImageInput {
  /** 外周の模様を決めるページのキー（例：`o/team-mirai/2026`） */
  key: string;
  variant: OgHeadingVariant;
  face: OgFace;
  /** 見出し（例：「チームみらいの収支」「安野貴博の政治団体」）。最後の「の」から後ろを小さく描く */
  title: string;
  /** サイトの「詳細の区分」の図と同じデータ */
  sankey: SankeyData;
  /**
   * 見出しの右の2つの総額（円）。サイトの見出しと同じ数字にする（議員ページは支給総額・支出総額）。
   * 渡さなければ図のデータの収入と支出の合計にする
   */
  totals?: { in: number; out: number };
}

/** 見出しを、大きく描く名前と、小さく描く最後の「の〜」に分ける。「の」が無ければ全体を名前にする */
export function splitOgTitle(title: string): { name: string; suffix: string } {
  const cut = title.lastIndexOf("の");
  return cut > 0
    ? { name: title.slice(0, cut), suffix: title.slice(cut) }
    : { name: title, suffix: "" };
}

/**
 * 顔写真の画像を img の src に渡せる data URI にする。画像の生成（satori）が読める PNG・JPEG だけを通し、
 * それ以外（WebP など）は null を返す（呼び出し側で人型にする）
 */
export function ogPhotoDataUri(bytes: Uint8Array): string | null {
  const starts = (sig: number[]) => sig.every((b, i) => bytes[i] === b);
  const mime = starts([0x89, 0x50, 0x4e, 0x47])
    ? "image/png"
    : starts([0xff, 0xd8, 0xff])
      ? "image/jpeg"
      : null;
  return mime ? `data:${mime};base64,${Buffer.from(bytes).toString("base64")}` : null;
}

const readPublic = (path: string) => readFile(join(process.cwd(), "public", path));

/**
 * 収支のシェア用画像（1200×630 の PNG）を作る。
 * 図はサイトの「詳細の区分」と同じ区分・同じ帯の形で、区分名だけを出す（金額・割合は出さない）。
 * 図に描くものが無いときは null を返す（呼び出し側でトップの画像にする）。
 */
export async function renderFinanceOgImage(input: FinanceOgImageInput): Promise<Response | null> {
  const chart = CHART[input.variant];
  const flow = toSankeyFlow(input.sankey, chart.flow);
  if (flow.incomes.length === 0 && flow.expenses.length === 0 && !flow.balance) return null;
  const layout = layoutSankey(flow, {
    ...chart.titles,
    nameOnly: true,
    labelScale: chart.labelScale,
  });
  const sankey = fitSankeyToBox(layout, chart.box, {
    labelBottomLimit: chart.labelBottomLimit,
    labelOffset: LABEL_OFFSET,
    columnRightLimit: COLUMN_RIGHT_LIMIT,
    fadeTop: FADE_TOP,
  });
  const amounts = input.totals ?? summaryTotals(input.sankey);
  const totals = [
    { label: chart.totalLabels[0], color: GREEN, yen: amounts.in },
    { label: chart.totalLabels[1], color: RED, yen: amounts.out },
  ];

  const { name, suffix } = splitOgTitle(input.title);
  const text = [
    input.title,
    "まる見え政治資金億万円",
    ...totals.map((t) => t.label),
    ...sankey.texts.map((t) => t.text),
  ].join("");
  const [fonts, logo] = await Promise.all([
    loadOgFonts(text),
    readPublic("logos/team-mirai-logo.svg"),
  ]);
  const logoSrc = `data:image/svg+xml;base64,${logo.toString("base64")}`;

  const image = new ImageResponse(
    <OgFinanceCard
      pattern={ogPatternIndex(input.key)}
      variant={input.variant}
      face={input.face}
      name={name}
      suffix={suffix}
      totals={totals}
      sankey={sankey}
      logoSrc={logoSrc}
    />,
    { width: OG_WIDTH, height: OG_HEIGHT, fonts },
  );
  // ImageResponse は描画を遅らせて行うので、失敗をここで拾えるよう描き終えてから返す
  const body = await image.arrayBuffer();
  return new Response(body, { status: 200, headers: OG_IMAGE_HEADERS });
}

function summaryTotals(sankey: SankeyData): { in: number; out: number } {
  const summary = calculateSankeyFinancialSummary(sankey);
  return { in: summary.income, out: summary.expense };
}

/** トップの画像（データに依存しない既定の画像）を返す */
export async function topOgImageResponse(): Promise<Response> {
  const body = await readPublic(TOP_OG_IMAGE_PATH.slice(1));
  return new Response(new Uint8Array(body), { status: 200, headers: OG_IMAGE_HEADERS });
}
