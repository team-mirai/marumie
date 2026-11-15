import { SANKEY_PREVIOUS_BALANCE_LABEL, type SankeyFlow } from "@/client/lib/sankey-flow";
import { formatSankeyPercentage } from "@/client/lib/sankey-percentage";

/** 図の座標系の横幅。SVG の viewBox の幅で、表示幅に合わせて拡大縮小する。 */
const SANKEY_WIDTH = 1200;

// 色に意味：収入＝緑、支出＝赤、残高（現金残高・昨年からの現金残高・未使用）＝グレー
const GREEN = "#2AA693";
const RED = "#DC2626";
const GRAY = "#6B7280";
const HUB_COLOR = "#4F566B";
const INK = "#0B0F0E";
const MUTED = "#5B6470";

export interface SankeyLayoutOptions {
  /** 左右の列の見出し（例：「収入」「支出・残高」） */
  inTitle: string;
  outTitle: string;
  /** SP で全体を表示する背の高い版（合計の柱を長く、間隔と文字を大きく）。画面幅に縮めても読みやすくする */
  tall?: boolean;
  /** 項目名と金額を1行に並べる（項目が多い調研費の図を低くする） */
  inline?: boolean;
  /** 合計の柱の長さの倍率（トップの調研費の図を低くする） */
  hubScale?: number;
}

interface SankeyBandLayout {
  key: string;
  /** ホバーで濃く残すかを決めるキー。先頭はホバーしたときに立てるキー */
  keys: string[];
  d: string;
  color: string;
  opacity: number;
}

interface SankeyNodeLayout {
  key: string;
  keys: string[];
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  /** 右側の列（伸びる向きを右端からにする） */
  right: boolean;
  /** 読み上げ用の「項目名 金額（割合）」 */
  ariaLabel: string;
}

interface SankeyTextSpan {
  text: string;
  x?: number;
  y?: number;
  dx?: number;
  fontSize: number;
  fontWeight: number;
  fill: string;
  /** 金額・割合（数字用の字形で揃える） */
  numeric: boolean;
}

interface SankeyLabelLayout {
  key: string;
  keys: string[];
  anchor: "start" | "end";
  /** ラベルの縁を白くして、下を通る帯の上でも読めるようにする */
  halo: boolean;
  spans: SankeyTextSpan[];
}

interface SankeyTextLayout {
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontWeight: number;
}

interface SankeyLayout {
  width: number;
  height: number;
  headers: SankeyTextLayout[];
  bands: SankeyBandLayout[];
  nodes: SankeyNodeLayout[];
  labels: SankeyLabelLayout[];
  hub: {
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
    title: SankeyTextLayout;
    amount: SankeyTextLayout;
  };
}

/**
 * サンキー図の金額。億・万円で表し、1万円未満は円で出す（例：1億2345万円、3000万円、5,000円）。
 */
export function formatSankeyAmount(yen: number): string {
  if (yen > 0 && yen < 10_000) return `${Math.round(yen).toLocaleString("ja-JP")}円`;
  const man = Math.round(yen / 10_000);
  const oku = Math.floor(man / 10_000);
  const rest = man % 10_000;
  if (oku === 0) return `${rest.toLocaleString("ja-JP")}万円`;
  return `${oku}億${rest ? `${String(rest).padStart(4, "0")}万円` : "円"}`;
}

/**
 * 長い項目名を列の幅（1行の文字数）で折り返す。
 * 「（」の前、「+」の後、「の」の後の順で区切りを探し、無ければ文字数で切る。区切りの前も max を超えれば折り返す。
 */
export function wrapSankeyLabel(label: string, max: number): string[] {
  if (label.length <= max) return [label];
  const paren = label.indexOf("（");
  if (paren > 0) {
    return [
      ...wrapSankeyLabel(label.slice(0, paren), max),
      ...wrapSankeyLabel(label.slice(paren), max),
    ];
  }
  const plus = label.indexOf("+");
  if (plus > 0 && plus < label.length - 1) {
    return [
      ...wrapSankeyLabel(label.slice(0, plus + 1), max),
      ...wrapSankeyLabel(label.slice(plus + 1), max),
    ];
  }
  const no = label.lastIndexOf("の", max - 1);
  if (no > 1) return [label.slice(0, no + 1), ...wrapSankeyLabel(label.slice(no + 1), max)];
  return [label.slice(0, max), ...wrapSankeyLabel(label.slice(max), max)];
}

interface ColumnNode {
  key: string;
  keys: string[];
  label: string;
  value: number;
  color: string;
  /** 以下は place で決める */
  y: number;
  nh: number;
  inY: number;
  outY: number;
}

interface SubLink {
  parent: ColumnNode;
  node: ColumnNode;
  value: number;
}

function curve(x1: number, a1: number, b1: number, x2: number, a2: number, b2: number): string {
  const m = (x1 + x2) / 2;
  return `M${x1} ${a1}C${m} ${a1} ${m} ${a2} ${x2} ${a2}L${x2} ${b2}C${m} ${b2} ${m} ${b1} ${x1} ${b1}Z`;
}

function columnNode(key: string, label: string, value: number, color: string): ColumnNode {
  return { key, keys: [key], label, value, color, y: 0, nh: 0, inY: 0, outY: 0 };
}

/** 内訳の列を作る。同じ名前の内訳は1つのノードにまとめ、親ごとの帯でつなぐ。 */
function buildSubColumn(
  parents: { node: ColumnNode; subs?: { label: string; value: number }[] }[],
  prefix: string,
  color: string,
) {
  const nodes: ColumnNode[] = [];
  const byLabel = new Map<string, ColumnNode>();
  const links: SubLink[] = [];
  for (const { node: parent, subs } of parents) {
    for (const sub of subs ?? []) {
      let node = byLabel.get(sub.label);
      if (!node) {
        node = columnNode(`${prefix}:${sub.label}`, sub.label, 0, color);
        byLabel.set(sub.label, node);
        nodes.push(node);
      }
      node.value += sub.value;
      // 親をホバーしたら内訳も、内訳をホバーしたら親も濃く残す
      if (!node.keys.includes(parent.key)) node.keys.push(parent.key);
      if (!parent.keys.includes(node.key)) parent.keys.push(node.key);
      links.push({ parent, node, value: sub.value });
    }
  }
  return { nodes, links };
}

/**
 * サンキー図を組む（収入の内訳 → 収入 → 合計 → 支出・残高 → 支出の内訳）。
 * 列の位置は固定で、外側の列はラベルの高さぶんの枠をノードごとに取ってからノードを置き、ラベルがノードの真横に来るようにする。
 * 収入側に内訳が無ければ3〜4列を横幅いっぱいに均等に、左右とも内訳が無ければ合計を中央に左右対称に置く。
 */
export function layoutSankey(flow: SankeyFlow, options: SankeyLayoutOptions): SankeyLayout {
  const { tall = false, inline = false, hubScale = 1 } = options;
  const W = SANKEY_WIDTH;
  const HEAD = 56;
  const HUB = (tall ? 620 : inline ? 340 : 440) * hubScale;
  const NW = 12;
  const HW = 44;
  let HX = (W - HW) / 2;
  const X = { L2: tall ? 228 : 255, L1: 410, R1: W - 410 - NW, R2: W - 220 - NW };
  // 支出・残高が収入より多いデータもあるので、帯が合計の柱に収まるよう大きい側で縮尺を決める
  const outTotal =
    flow.expenses.reduce((sum, item) => sum + item.value, 0) + (flow.balance?.value ?? 0);
  const scale = Math.max(flow.total, outTotal);
  const PX = scale > 0 ? HUB / scale : 0;
  const G1 = tall ? 26 : inline ? 6 : 18;
  const MINH = 6;
  const MINB = 3;
  const GO = tall ? 14 : 8;

  // 割合は収入の合計に対して。収入が0円のときは支出・残高の合計に対して出す
  const pct = (v: number) =>
    formatSankeyPercentage(v, flow.total > 0 ? flow.total : outTotal) || "0%";
  const amountText = (v: number) => `${formatSankeyAmount(v)}　${pct(v)}`;

  // 列を組み立てる
  const L1 = flow.incomes.map((item, i) =>
    columnNode(
      `i${i}`,
      item.label,
      item.value,
      item.label === SANKEY_PREVIOUS_BALANCE_LABEL ? GRAY : GREEN,
    ),
  );
  const left = buildSubColumn(
    L1.map((node, i) => ({ node, subs: flow.incomes[i].subs })),
    "l",
    GREEN,
  );
  const R1 = flow.expenses.map((item, i) => columnNode(`o${i}`, item.label, item.value, RED));
  const right = buildSubColumn(
    R1.map((node, i) => ({ node, subs: flow.expenses[i].subs })),
    "r",
    RED,
  );
  if (flow.balance) R1.push(columnNode("cash", flow.balance.label, flow.balance.value, GRAY));
  const L2 = left.nodes;
  const R2 = right.nodes;

  const noL2 = L2.length === 0;
  const noR2 = R2.length === 0;
  if (noL2) {
    X.L1 = 220;
    HX = 470;
    X.R1 = 720;
    X.R2 = W - 220 - NW;
  }
  if (noL2 && noR2) {
    X.L1 = 320;
    HX = (W - HW) / 2;
    X.R1 = W - 320 - NW;
    X.L2 = X.L1 - 200;
    X.R2 = X.R1 + 200;
  }

  // ラベル：項目名は大きく太字、金額と割合は小さく。列の幅に収まるよう折り返す
  const NMF = tall ? 23 : 19;
  const NLH = tall ? 28 : 23;
  const AMF = tall ? 16 : 13;
  const ALH = tall ? 21 : 18;
  const labelHeight = (node: ColumnNode, max: number) => {
    const lines = wrapSankeyLabel(node.label, max).length;
    return inline && lines === 1 ? NLH : lines * NLH + ALH;
  };
  const nodeHeight = (node: ColumnNode) => Math.max(node.value * PX, MINH);
  const slot = (node: ColumnNode, max: number) =>
    Math.max(nodeHeight(node), labelHeight(node, max));
  const columnHeight = (arr: ColumnNode[], gap: number, max: number) =>
    arr.reduce((sum, node) => sum + slot(node, max), 0) + gap * Math.max(arr.length - 1, 0);
  const maxL1 = noL2 ? 10 : 7;
  const maxR1 = noR2 ? 10 : 7;
  // 左端の内訳は一段階目の帯を短くして空いたぶん、間隔を少し広げる
  const GOL = tall ? GO : GO + 4;
  const hL1 = columnHeight(L1, G1, maxL1);
  const hL2 = columnHeight(L2, GOL, 10);
  const hR1 = columnHeight(R1, G1, maxR1);
  const hR2 = columnHeight(R2, GO, 10);
  const MAXH = Math.max(HUB, hL1, hL2, hR1, hR2);
  const C = HEAD + MAXH / 2;
  const TOP = C - HUB / 2;
  const place = (arr: ColumnNode[], gap: number, height: number, max: number) => {
    let y = C - height / 2;
    for (const node of arr) {
      const s = slot(node, max);
      node.nh = nodeHeight(node);
      node.y = y + (s - node.nh) / 2;
      node.inY = node.y;
      node.outY = node.y;
      y += s + gap;
    }
  };
  place(L1, G1, hL1, maxL1);
  place(L2, GOL, hL2, 10);
  place(R1, G1, hR1, maxR1);
  place(R2, GO, hR2, 10);

  // 帯：金額がごく小さい帯も見えるよう太さに下限を設け、細い帯は色を濃くする。太らせた分は中心をそろえて上下に振り分ける
  const bands: SankeyBandLayout[] = [];
  const band = (
    key: string,
    keys: string[],
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    v: number,
    color: string,
    opacity: number,
  ) => {
    const t0 = v * PX;
    const t = Math.max(t0, MINB);
    const dy = (t0 - t) / 2;
    const thin = t0 < MINB * 2;
    bands.push({
      key,
      keys,
      d: curve(x1, y1 + dy, y1 + dy + t, x2, y2 + dy, y2 + dy + t),
      color,
      opacity: thin ? Math.max(opacity, 0.5) : opacity,
    });
  };
  // 収入の内訳 → 収入
  left.links.forEach(({ parent, node, value }, i) => {
    band(
      `a${i}`,
      [node.key, parent.key],
      X.L2 + NW,
      node.outY,
      X.L1,
      parent.inY,
      value,
      GREEN,
      0.14,
    );
    node.outY += value * PX;
    parent.inY += value * PX;
  });
  // 収入 → 合計
  let hy = TOP;
  for (const node of L1) {
    band(`b${node.key}`, node.keys, X.L1 + NW, node.outY, HX, hy, node.value, node.color, 0.2);
    node.outY += node.value * PX;
    hy += node.value * PX;
  }
  // 合計 → 支出・残高
  hy = TOP;
  for (const node of R1) {
    const isBalance = node.color === GRAY;
    band(
      `c${node.key}`,
      node.keys,
      HX + HW,
      hy,
      X.R1,
      node.inY,
      node.value,
      node.color,
      isBalance ? 0.2 : 0.16,
    );
    hy += node.value * PX;
    node.inY += node.value * PX;
  }
  // 支出 → 支出の内訳
  right.links.forEach(({ parent, node, value }, i) => {
    band(`d${i}`, [node.key, parent.key], X.R1 + NW, parent.outY, X.R2, node.inY, value, RED, 0.12);
    parent.outY += value * PX;
    node.inY += value * PX;
  });

  const nodes: SankeyNodeLayout[] = [];
  const pushNodes = (arr: ColumnNode[], x: number, isRight: boolean) => {
    for (const node of arr) {
      nodes.push({
        key: node.key,
        keys: node.keys,
        x,
        y: node.y,
        width: NW,
        height: node.nh,
        color: node.color,
        right: isRight,
        ariaLabel: `${node.label} ${formatSankeyAmount(node.value)}（${pct(node.value)}）`,
      });
    }
  };
  pushNodes(L2, X.L2, false);
  pushNodes(L1, X.L1, false);
  pushNodes(R1, X.R1, true);
  pushNodes(R2, X.R2, true);

  // ラベル（重なりを避けて上から順に積む）
  const labels: SankeyLabelLayout[] = [];
  let maxY = HEAD + MAXH;
  const column = (
    arr: ColumnNode[],
    x: number,
    anchor: "start" | "end",
    halo: boolean,
    max: number,
    size: "normal" | "small" | "large" = "normal",
  ) => {
    // small：一番外側の内訳の列は項目名を少し小さく。large：左端の内訳の列は空いた横幅を使って金額も少し大きく
    const nameSize = size === "small" ? (NMF * 17) / 19 : NMF;
    const amountSize = size === "large" ? (AMF * 14) / 13 : AMF;
    let prev = Number.NEGATIVE_INFINITY;
    for (const node of arr) {
      const names = wrapSankeyLabel(node.label, max);
      const amount = amountText(node.value);
      const oneLine = inline && names.length === 1;
      const H = oneLine ? NLH : names.length * NLH + ALH;
      const top = Math.max(node.y + node.nh / 2 - H / 2, prev + (oneLine ? 2 : 6));
      prev = top + H;
      maxY = Math.max(maxY, prev);
      const name = (text: string, y: number): SankeyTextSpan => ({
        text,
        x,
        y,
        fontSize: nameSize,
        fontWeight: 800,
        fill: INK,
        numeric: false,
      });
      const value = {
        text: amount,
        fontSize: amountSize,
        fontWeight: 600,
        fill: MUTED,
        numeric: true,
      };
      labels.push({
        key: node.key,
        keys: node.keys,
        anchor,
        halo,
        spans: oneLine
          ? [name(names[0], top + NLH / 2), { ...value, dx: 12 }]
          : [
              ...names.map((line, i) => name(line, top + NLH / 2 + i * NLH)),
              { ...value, x, y: top + names.length * NLH + ALH / 2 + 1 },
            ],
      });
    }
  };
  if (tall) column(L2, X.L2 - 14, "end", false, 10, "small");
  else column(L2, X.L2 - 20, "end", false, 10, "large");
  if (noL2) column(L1, X.L1 - 14, "end", false, 10);
  else column(L1, X.L1 - 10, "end", true, 7);
  if (noR2) column(R1, X.R1 + NW + 14, "start", false, 10);
  else column(R1, X.R1 + NW + 10, "start", true, 7);
  column(R2, X.R2 + NW + 14, "start", false, 10, "small");

  const TOTY = tall ? 36 : 30;
  const height = Math.ceil(Math.max(maxY, TOP + HUB + TOTY) + 32);
  const headerSize = tall ? 24 : 17;
  const header = (x: number, text: string): SankeyTextLayout => ({
    text,
    x,
    y: headerSize + 2,
    fontSize: headerSize,
    fontWeight: 800,
  });

  return {
    width: W,
    height,
    headers: [
      header((X.L2 + X.L1 + NW) / 2, options.inTitle),
      header((X.R1 + X.R2 + NW) / 2, options.outTitle),
    ],
    bands,
    nodes,
    labels,
    hub: {
      x: HX,
      y: TOP,
      width: HW,
      height: HUB,
      color: HUB_COLOR,
      title: {
        text: "合計",
        x: HX + HW / 2,
        y: TOP - 14,
        fontSize: tall ? 22 : 17,
        fontWeight: 900,
      },
      amount: {
        text: formatSankeyAmount(flow.total),
        x: HX + HW / 2,
        y: TOP + HUB + TOTY,
        fontSize: tall ? 26 : 20,
        fontWeight: 800,
      },
    },
  };
}
