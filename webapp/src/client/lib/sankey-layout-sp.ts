import { SANKEY_PREVIOUS_BALANCE_LABEL, type SankeyFlow } from "@/client/lib/sankey-flow";
import {
  estimateTextWidth,
  formatSankeyAmount,
  GRAY,
  GREEN,
  HUB_COLOR,
  IN_TITLE_COLOR,
  INK,
  MUTED,
  outTitleSpans,
  RED,
  type SankeyBandLayout,
  type SankeyHeaderLayout,
  type SankeyLabelLayout,
  type SankeyLabelText,
  type SankeyLayout,
  type SankeyNodeLayout,
  sankeyPill,
} from "@/client/lib/sankey-layout";
import { formatSankeyPercentage } from "@/client/lib/sankey-percentage";

/** SP の3列の図の座標系の横幅。SP の画面幅に近い幅にして、文字をほぼ等倍で読めるようにする。 */
const SANKEY_SP_WIDTH = 400;

/** 項目名の1行の文字数 */
const LABEL_MAX_CHARS = 8;

/** 隣り合うラベルの最小の間隔。ノードの間隔をこれ以上にして、小さな項目が続いてもラベルがノードの真横からずれないようにする */
const LABEL_GAP = 6;

/** 帯の太さの下限（PC の図と同じ）。金額がごく小さい帯も見えるようにする */
const MIN_BAND = 3;

export interface SankeySpLayoutOptions {
  /** 左右の列の見出し（例：「収入」「支出・残高」） */
  inTitle: string;
  outTitle: string;
  /**
   * 合計の柱の長さの倍率。1 未満の低めの図（トップの調研費）は、ラベルの行送りと文字も詰め、
   * 右の列のラベルを「項目名 → 金額 → 割合」の1行にする（右の列を左へ寄せて幅をとる）
   */
  heightScale?: number;
}

/**
 * SP の図の項目名を最大2行に分ける。「+」があればその後で、無ければ max 文字で区切る。
 * 2行目も max 文字を超えるときは末尾を「…」で詰め、画面幅からはみ出さないようにする（全文は読み上げに含める）。
 */
export function wrapSankeySpLabel(label: string, max: number): string[] {
  if (label.length <= max) return [label];
  const plus = label.indexOf("+");
  const cut = plus > 0 && plus < label.length - 1 && plus < max ? plus + 1 : max;
  const first = label.slice(0, cut);
  const rest = label.slice(cut);
  return [first, rest.length > max ? `${rest.slice(0, max - 1)}…` : rest];
}

interface SpColumnNode {
  key: string;
  label: string;
  value: number;
  color: string;
  bandOpacity: number;
  y: number;
  height: number;
}

function curve(x1: number, a1: number, b1: number, x2: number, a2: number, b2: number): string {
  const m = (x1 + x2) / 2;
  return `M${x1} ${a1}C${m} ${a1} ${m} ${a2} ${x2} ${a2}L${x2} ${b2}C${m} ${b2} ${m} ${b1} ${x1} ${b1}Z`;
}

/**
 * SP 用の3列のサンキー図を組む（収入（左）→ 合計 → 支出・残高（右））。内訳は親の項目にまとめる。
 * 各ノードに「帯の太さ」と「ラベルの高さ」の大きいほうの枠を取ってノードを枠の中央に置き、ラベルがノードの真横に来るようにする。
 */
export function layoutSankeySp(flow: SankeyFlow, options: SankeySpLayoutOptions): SankeyLayout {
  const heightScale = options.heightScale ?? 1;
  const W = SANKEY_SP_WIDTH;
  const TOP = 34;
  const HUB = 320 * heightScale;
  const NW = 12;
  const HW = 8;
  // 低めの図はラベルの行送りと文字も少し詰め、右の列のラベルは1行で並べる
  const compact = heightScale < 1;
  const X = compact ? { L: 0, H: 112, R: 196 } : { L: 0, H: 136, R: 246 };
  // 支出・残高が収入より多いデータもあるので、帯が合計の柱に収まるよう大きい側で縮尺を決める
  const outTotal =
    flow.expenses.reduce((sum, item) => sum + item.value, 0) + (flow.balance?.value ?? 0);
  const scale = Math.max(flow.total, outTotal);
  const PX = scale > 0 ? HUB / scale : 0;
  const LHN = compact ? 14 : 16;
  const LHA = compact ? 13 : 16;
  const FN = compact ? 13 : 14;
  const FA = compact ? 10.5 : 11;

  // 割合は収入の合計に対して。収入が0円のときは支出・残高の合計に対して出す
  const pctBase = flow.total > 0 ? flow.total : outTotal;
  const pct = (v: number) => formatSankeyPercentage(v, pctBase) || "0%";

  const node = (
    key: string,
    label: string,
    value: number,
    color: string,
    bandOpacity: number,
  ): SpColumnNode => ({ key, label, value, color, bandOpacity, y: 0, height: 0 });
  const lefts = flow.incomes.map((item, i) =>
    item.label === SANKEY_PREVIOUS_BALANCE_LABEL
      ? node(`i${i}`, item.label, item.value, GRAY, 0.18)
      : node(`i${i}`, item.label, item.value, GREEN, 0.22),
  );
  const rights = flow.expenses.map((item, i) => node(`o${i}`, item.label, item.value, RED, 0.16));
  if (flow.balance) rights.push(node("cash", flow.balance.label, flow.balance.value, GRAY, 0.18));

  const labelHeight = (n: SpColumnNode, oneLine: boolean) =>
    oneLine ? LHN + 3 : wrapSankeySpLabel(n.label, LABEL_MAX_CHARS).length * LHN + LHA;
  const nodeHeight = (n: SpColumnNode) => Math.max(n.value * PX, 2);
  const slot = (n: SpColumnNode, oneLine: boolean) =>
    Math.max(nodeHeight(n), labelHeight(n, oneLine));
  const columnHeight = (arr: SpColumnNode[], gap: number, oneLine: boolean) =>
    arr.reduce((sum, n) => sum + slot(n, oneLine), 0) + gap * Math.max(arr.length - 1, 0);
  const gapL = lefts.length > 1 ? LABEL_GAP : 0;
  const gapR = rights.length > 4 ? LABEL_GAP : 12;
  const sumL = columnHeight(lefts, gapL, false);
  const sumR = columnHeight(rights, gapR, compact);
  // ラベルの枠の合計が合計の柱より長ければ、柱を下げて上下の余白をそろえる
  const HT = TOP + Math.max(0, (Math.max(sumL, sumR) - HUB) / 2);

  const bands: SankeyBandLayout[] = [];
  const nodes: SankeyNodeLayout[] = [];
  // 帯：太さに下限を設け、太らせた分は中心をそろえて上下に振り分ける。細い帯も色の濃さは変えない（PC の図と同じ）
  const pushBand = (
    key: string,
    n: SpColumnNode,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
  ) => {
    const t0 = n.value * PX;
    const t = Math.max(t0, MIN_BAND);
    const dy = (t0 - t) / 2;
    bands.push({
      key,
      keys: [n.key],
      d: curve(x1, y1 + dy, y1 + dy + t, x2, y2 + dy, y2 + dy + t),
      color: n.color,
      opacity: n.bandOpacity,
    });
  };
  const pushNode = (n: SpColumnNode, x: number, right: boolean) => {
    nodes.push({
      key: n.key,
      keys: [n.key],
      x,
      y: n.y,
      width: NW,
      height: n.height,
      rx: 2,
      color: n.color,
      right,
      ariaLabel: `${n.label} ${formatSankeyAmount(n.value)}（${pct(n.value)}）`,
    });
  };
  // 左：収入 → 合計
  let y = HT + HUB / 2 - sumL / 2;
  let hy = HT;
  for (const n of lefts) {
    n.height = nodeHeight(n);
    n.y = y + (slot(n, false) - n.height) / 2;
    pushBand(`b${n.key}`, n, X.L + NW, n.y, X.H, hy);
    pushNode(n, X.L, false);
    y += slot(n, false) + gapL;
    hy += n.value * PX;
  }
  // 右：合計 → 支出の項目・残高
  y = HT + HUB / 2 - sumR / 2;
  hy = HT;
  for (const n of rights) {
    n.height = nodeHeight(n);
    n.y = y + (slot(n, compact) - n.height) / 2;
    pushBand(`c${n.key}`, n, X.H + HW, hy, X.R, n.y);
    pushNode(n, X.R, true);
    y += slot(n, compact) + gapR;
    hy += n.value * PX;
  }

  // ラベル（項目名は最大2行＋「金額　割合」）。ノードの真横に置き、前のラベルと重なるときだけ下げる
  const HALO = 4;
  const labels: SankeyLabelLayout[] = [];
  const text = (
    value: string,
    x: number,
    y: number,
    fontSize: number,
    fontWeight: number,
    fill: string,
    numeric: boolean,
  ): SankeyLabelText => ({
    text: value,
    x,
    y,
    anchor: "start",
    fontSize,
    fontWeight,
    fill,
    numeric,
    halo: HALO,
  });
  const column = (arr: SpColumnNode[], x: number, oneLine: boolean) => {
    // 見出し（収入／支出・残高）の下から並べ、見出しと重ねない
    let last = 20;
    for (const n of arr) {
      if (oneLine) {
        // 1行：項目名 → 金額 → 割合（グレーのピル。1%未満はさらにうすく）
        const cy = Math.max(n.y + n.height / 2, last + LHN / 2 + 3);
        last = cy + LHN / 2;
        const amount = formatSankeyAmount(n.value);
        const xa = x + estimateTextWidth(n.label, FN) + 6;
        const mute = pctBase > 0 && n.value / pctBase < 0.01;
        labels.push({
          key: n.key,
          keys: [n.key],
          texts: [
            text(n.label, x, cy, FN, 800, INK, false),
            text(amount, xa, cy, FA, 600, MUTED, true),
          ],
          pills: [
            sankeyPill(
              pct(n.value),
              xa + estimateTextWidth(amount, FA) + 5,
              cy,
              FA * 0.92,
              { x: 10, y: 6 },
              mute,
            ),
          ],
        });
        continue;
      }
      const names = wrapSankeySpLabel(n.label, LABEL_MAX_CHARS);
      const height = names.length * LHN + LHA;
      const center = Math.max(n.y + n.height / 2, last + height / 2 + LABEL_GAP);
      last = center + height / 2;
      const top = center - height / 2;
      labels.push({
        key: n.key,
        keys: [n.key],
        texts: [
          ...names.map((name, i) => text(name, x, top + LHN / 2 + i * LHN, FN, 800, INK, false)),
          text(
            `${formatSankeyAmount(n.value)}　${pct(n.value)}`,
            x,
            top + names.length * LHN + LHA / 2,
            FA,
            600,
            MUTED,
            true,
          ),
        ],
        pills: [],
      });
    }
    return last;
  };
  const endR = column(rights, X.R + NW + 8, compact);
  const endL = column(lefts, X.L + NW + 6, false);

  // 見出し：収入（支給）は緑、支出側は「支出」の部分だけ赤。
  // 低めの図は少し大きくし、「支出」だけを右の列の位置に置く
  const header = (
    x: number,
    anchor: "start" | "end",
    spans: SankeyHeaderLayout["spans"],
  ): SankeyHeaderLayout => ({
    text: spans.map((span) => span.text).join(""),
    x,
    y: compact ? 13 : 12,
    fontSize: compact ? 14 : 12,
    fontWeight: 800,
    anchor,
    letterSpacing: ".1em",
    spans,
  });
  const inHeader = header(0, "start", [{ text: options.inTitle, fill: IN_TITLE_COLOR }]);
  const outHeader = compact
    ? header(X.R, "start", outTitleSpans(options.outTitle, MUTED).slice(0, 1))
    : header(W, "end", outTitleSpans(options.outTitle, MUTED));

  return {
    x: 0,
    width: W,
    height: Math.ceil(Math.max(HT + HUB, endR, endL) + 12),
    headers: [inHeader, outHeader],
    bands,
    nodes,
    labels,
    hub: {
      x: X.H,
      y: HT,
      width: HW,
      height: HUB,
      rx: 3,
      color: HUB_COLOR,
      title: null,
      amount: null,
    },
  };
}
