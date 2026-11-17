import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { calculateSankeyFinancialSummary } from "@/client/lib/sankey-financial-summary";
import { toSankeyFlow } from "@/client/lib/sankey-flow";
import { GREEN, RED, layoutSankey } from "@/client/lib/sankey-layout";
import { type OgFace, OgFinanceCard, type OgHeadingVariant } from "@/app/_og-image/og-finance-card";
import { loadOgFonts } from "@/app/_og-image/og-fonts";
import { OG_HEIGHT, OG_WIDTH, TOP_OG_IMAGE_PATH, ogPatternIndex } from "@/app/_og-image/og-frame";
import { type OgBox, fitSankeyToBox } from "@/app/_og-image/og-sankey";
import type { SankeyData } from "@/types/sankey";

/** シェア用の画像の HTTP ヘッダー。サイトのページの作り直し（5分）と同じ間隔で CDN に持たせる */
const OG_IMAGE_HEADERS = {
  "Content-Type": "image/png",
  "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=86400",
};

/**
 * 図（帯・棒・ラベル）を収める枠。見出しの下端に少し入りこませ、入りこんだぶんの帯と棒はぼかして見出しを読めるようにする。
 * 下端は「まる見え政治資金」の文字の上まで
 */
const SANKEY_BOX: Record<OgHeadingVariant, OgBox> = {
  party: { x: 64, y: 170, width: 1072, height: 360 },
  group: { x: 64, y: 186, width: 1072, height: 344 },
};
/** 右端の列のラベルの下端の上限（右下のロゴと「まる見え政治資金」にかからない高さ） */
const LABEL_BOTTOM_LIMIT = 468;
const LABEL_OFFSET = 24;
/** 右端の列の棒の右端の上限（右下のロゴの左端より手前） */
const COLUMN_RIGHT_LIMIT = 990;
const FADE_TOP: [number, number, number] = [132, 168, 196];
/** 画像は縮めて描くので、サイトより項目名を大きめに組む */
const LABEL_SCALE = 1.3;

interface FinanceOgImageInput {
  /** 外周の模様を決めるページのキー（例：`o/team-mirai/2026`） */
  key: string;
  variant: OgHeadingVariant;
  face: OgFace;
  /** 見出し（例：「チームみらいの収支」「安野貴博の政治団体」）。最後の「の」から後ろを小さく描く */
  title: string;
  /** サイトの「詳細の区分」の図と同じデータ */
  sankey: SankeyData;
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
  const flow = toSankeyFlow(input.sankey);
  if (flow.incomes.length === 0 && flow.expenses.length === 0 && !flow.balance) return null;
  const layout = layoutSankey(flow, {
    inTitle: "収入",
    outTitle: "支出・残高",
    nameOnly: true,
    labelScale: LABEL_SCALE,
  });
  const sankey = fitSankeyToBox(layout, SANKEY_BOX[input.variant], {
    labelBottomLimit: LABEL_BOTTOM_LIMIT,
    labelOffset: LABEL_OFFSET,
    columnRightLimit: COLUMN_RIGHT_LIMIT,
    fadeTop: FADE_TOP,
  });
  const summary = calculateSankeyFinancialSummary(input.sankey);
  const totals = [
    { label: "収入", color: GREEN, yen: summary.income },
    { label: "支出", color: RED, yen: summary.expense },
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

/** トップの画像（データに依存しない既定の画像）を返す */
export async function topOgImageResponse(): Promise<Response> {
  const body = await readPublic(TOP_OG_IMAGE_PATH.slice(1));
  return new Response(new Uint8Array(body), { status: 200, headers: OG_IMAGE_HEADERS });
}
