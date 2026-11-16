import { SANKEY_PREVIOUS_BALANCE_LABEL, type SankeyFlow } from "@/client/lib/sankey-flow";
import { formatSankeyPercentage } from "@/client/lib/sankey-percentage";

/** 図の座標系の横幅。SVG の viewBox の幅で、表示幅に合わせて拡大縮小する。 */
const SANKEY_WIDTH = 1200;

// 色に意味：収入＝緑、支出＝赤、残高（現金残高・昨年からの現金残高・未使用）＝グレー
export const GREEN = "#2AA693";
export const RED = "#DC2626";
export const GRAY = "#6B7280";
export const HUB_COLOR = "#4F566B";
export const INK = "#0B0F0E";
export const MUTED = "#5B6470";

export interface SankeyLayoutOptions {
  /** 左右の列の見出し（例：「収入」「支出・残高」） */
  inTitle: string;
  outTitle: string;
  /** SP で全体を表示する背の高い版（合計の柱を長く、間隔と文字を大きく）。画面幅に縮めても読みやすくする */
  tall?: boolean;
  /** 項目名と金額を1行に並べる（項目が多い調研費の図を低くする） */
  inline?: boolean;
  /** 合計の柱の長さの倍率（トップの調研費の図を高くする） */
  hubScale?: number;
  /**
   * 左右とも内訳が無い図で、左の帯（収入 → 合計）を80%の幅に縮め、空いた幅を支出側のラベルに使う。
   * 支出側のラベルも政党の図に近い大きさにする（トップの調研費）
   */
  narrowIn?: boolean;
}

export interface SankeyBandLayout {
  key: string;
  /** ホバーで濃く残すかを決めるキー。先頭はホバーしたときに立てるキー */
  keys: string[];
  d: string;
  color: string;
  opacity: number;
}

export interface SankeyNodeLayout {
  key: string;
  keys: string[];
  x: number;
  y: number;
  width: number;
  height: number;
  /** 角の丸み */
  rx: number;
  color: string;
  /** 右側の列（伸びる向きを右端からにする） */
  right: boolean;
  /** 読み上げ用の「項目名 金額（割合）」 */
  ariaLabel: string;
}

/** ラベルの1行ぶんの文字（縦は y を中心にそろえる） */
export interface SankeyLabelText {
  text: string;
  x: number;
  y: number;
  anchor: "start" | "end";
  fontSize: number;
  fontWeight: number;
  fill: string;
  /** 金額・割合（数字用の字形で揃える） */
  numeric: boolean;
  /** 縁を白くする太さ（下を通る帯の上でも読めるようにする）。無ければ縁取りしない */
  halo?: number;
}

/** 割合を囲むグレーのピル。文字は中央に置く */
export interface SankeyPillLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  text: string;
  textFill: string;
  fontSize: number;
}

export interface SankeyLabelLayout {
  key: string;
  keys: string[];
  texts: SankeyLabelText[];
  pills: SankeyPillLayout[];
}

export interface SankeyTextLayout {
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontWeight: number;
}

/** 列の見出し（「収入」「支出・残高」など）。部分ごとに色を変える */
export interface SankeyHeaderLayout extends SankeyTextLayout {
  anchor: "start" | "middle" | "end";
  letterSpacing: string;
  spans: { text: string; fill: string }[];
}

export interface SankeyLayout {
  /** viewBox。左右の余白を詰めて切り出すので、左端（x）が 0 とは限らない */
  x: number;
  width: number;
  height: number;
  headers: SankeyHeaderLayout[];
  bands: SankeyBandLayout[];
  nodes: SankeyNodeLayout[];
  labels: SankeyLabelLayout[];
  hub: {
    x: number;
    y: number;
    width: number;
    height: number;
    rx: number;
    color: string;
    /** 柱の上の「合計」と金額（2段）。SP の3列の図では出さない */
    title: SankeyTextLayout | null;
    amount: SankeyTextLayout | null;
  };
}

/** 収入の見出しの緑（帯・ノードの緑より濃くして文字として読みやすくする） */
export const IN_TITLE_COLOR = "#0F8472";
/** 割合のピル：赤（注意・エラーの色）や緑（ブランド色）と意味が重ならないよう、収入・支出とも同じグレー。1%未満はさらにうすく */
const PILL_BG = "#F3F4F6";
const PILL_FG = "#374151";
const PILL_FG_MUTED = "#9CA3AF";
/** 項目名の（）内の補足の色 */
const SUB_INK = "#374151";

/** 文字の横幅の目安（全角＝1文字ぶん、半角＝0.6文字ぶん） */
export function estimateTextWidth(text: string, fontSize: number): number {
  let width = 0;
  for (const c of text) width += (c.codePointAt(0) ?? 0) < 0x80 ? 0.6 : 1;
  return width * fontSize;
}

/** 割合のピル。1%未満（mute）は文字をさらにうすく */
export function sankeyPill(
  text: string,
  x: number,
  centerY: number,
  fontSize: number,
  padding: { x: number; y: number },
  mute: boolean,
): SankeyPillLayout {
  const height = Math.round(fontSize + padding.y);
  return {
    x,
    y: centerY - height / 2,
    width: estimateTextWidth(text, fontSize) + padding.x,
    height,
    fill: PILL_BG,
    text,
    textFill: mute ? PILL_FG_MUTED : PILL_FG,
    fontSize,
  };
}

/** 列の見出しの「支出・残高」を、「支出」の部分だけ赤にする（「・残高」「・未使用」は ink のまま） */
export function outTitleSpans(title: string, ink: string): { text: string; fill: string }[] {
  const k = title.indexOf("・");
  return k > 0
    ? [
        { text: title.slice(0, k), fill: RED },
        { text: title.slice(k), fill: ink },
      ]
    : [{ text: title, fill: RED }];
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

/** （）内の補足の文字の大きさの倍率 */
const SUB_SCALE = 0.7;

/**
 * 項目名を行に分ける。（）内の補足は70%の大きさの行にし、なるべく1行に収める（ごちゃっとした印象を減らす）。
 */
function wrapNameLines(label: string, max: number): { text: string; sub: boolean }[] {
  const paren = label.indexOf("（");
  if (paren <= 0) return wrapSankeyLabel(label, max).map((text) => ({ text, sub: false }));
  return [
    ...wrapSankeyLabel(label.slice(0, paren), max).map((text) => ({ text, sub: false })),
    ...wrapSankeyLabel(label.slice(paren), Math.floor(max / SUB_SCALE)).map((text) => ({
      text,
      sub: true,
    })),
  ];
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
 * 区分の切り替えなどで入れ替わる図どうしでそろえる値。
 * 内訳の列の有無（列の位置）、図の上下の高さ（合計の柱の位置と図の高さ）、左右の切り出し。
 */
interface SankeyLock {
  hasL2: boolean;
  hasR2: boolean;
  maxH: number;
  below: number;
  minX: number;
  maxX: number;
}

const NO_LOCK: Omit<SankeyLock, "hasL2" | "hasR2"> = {
  maxH: 0,
  below: 0,
  minX: Number.POSITIVE_INFINITY,
  maxX: Number.NEGATIVE_INFINITY,
};

const hasSubs = (items: SankeyFlow["incomes"]) =>
  items.some((item) => (item.subs ?? []).length > 0);

/**
 * サンキー図を組む（収入の内訳 → 収入 → 合計 → 支出・残高 → 支出の内訳）。
 * 列の位置は固定で、外側の列はラベルの高さぶんの枠をノードごとに取ってからノードを置き、ラベルがノードの真横に来るようにする。
 * 収入側に内訳が無ければ3〜4列を横幅いっぱいに均等に、左右とも内訳が無ければ合計を中央に左右対称に置く。
 *
 * alternatives には、切り替えて同じ場所に出すほかの図（もう一方の区分、ほかの議員）を渡す。
 * すべてを測って大きいほうに合わせ、切り替えても合計の柱の位置と大きさ、図の高さが変わらないようにする。
 */
export function layoutSankey(
  flow: SankeyFlow,
  options: SankeyLayoutOptions,
  alternatives: SankeyFlow[] = [],
): SankeyLayout {
  const all = [flow, ...alternatives];
  const base: SankeyLock = {
    ...NO_LOCK,
    hasL2: all.some((f) => hasSubs(f.incomes)),
    hasR2: all.some((f) => hasSubs(f.expenses)),
  };
  const lock = alternatives.reduce<SankeyLock>((acc, alt) => {
    const m = buildSankey(alt, options, base).metrics;
    return {
      ...acc,
      maxH: Math.max(acc.maxH, m.maxH),
      below: Math.max(acc.below, m.below),
      minX: Math.min(acc.minX, m.minX),
      maxX: Math.max(acc.maxX, m.maxX),
    };
  }, base);
  return buildSankey(flow, options, lock).layout;
}

function buildSankey(flow: SankeyFlow, options: SankeyLayoutOptions, lock: SankeyLock) {
  const { tall = false, inline = false, hubScale = 1 } = options;
  const W = SANKEY_WIDTH;
  const HEAD = 56;
  const HUB = (tall ? 620 : inline ? 340 : 440) * hubScale;
  const NW = 14.4;
  const HW = 44;
  let HX = (W - HW) / 2;
  // 一段階目（収入の内訳 → 収入）の帯は短めに。PC は左右の余白を埋めるよう、左の2列を左へ・右の2列を右へ寄せる
  const X = tall
    ? { L2: 228, L1: 440, R1: W - 440 - NW, R2: W - 220 - NW }
    : { L2: 212, L1: 407, R1: W - 412 - NW, R2: W - 192 - NW };
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
  const pctBase = flow.total > 0 ? flow.total : outTotal;
  const pct = (v: number) => formatSankeyPercentage(v, pctBase) || "0%";

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

  // 内訳の列の有無は、切り替える図のどれかにあれば「ある」として列の位置をそろえる
  const noL2 = L2.length === 0 && !lock.hasL2;
  const noR2 = R2.length === 0 && !lock.hasR2;
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
  // 左の帯（収入 → 合計）の幅を80%に。合計から右を左へ寄せ、空いた幅を支出側のラベルに使う
  const narrowIn = !!options.narrowIn && noL2 && noR2;
  if (narrowIn) {
    const shift = Math.round((HX - X.L1 - NW) * 0.2);
    HX -= shift;
    X.R1 -= shift;
    X.R2 -= shift;
  }

  // ラベル：項目名は大きく太字、金額と割合は小さく。列の幅に収まるよう折り返す
  const NMF = tall ? 23 : 19;
  const NLH = tall ? 28 : 23;
  const AMF = tall ? 16 : 13;
  const ALH = tall ? 21 : 18;
  // （）内の補足の行の行送り
  const PLH = NLH * 0.78;
  const linesHeight = (lines: { sub: boolean }[]) =>
    lines.reduce((sum, line) => sum + (line.sub ? PLH : NLH), 0);
  // 項目名と金額を1行に並べるか。項目が1つだけの列（調研費の「公費から支給」など）は2行に分けて大きく見せる
  const isOneLine = (lineCount: number, single: boolean) => inline && lineCount === 1 && !single;
  const labelHeight = (node: ColumnNode, max: number, single: boolean) => {
    const lines = wrapNameLines(node.label, max);
    return isOneLine(lines.length, single) ? NLH : linesHeight(lines) + ALH;
  };
  const nodeHeight = (node: ColumnNode) => Math.max(node.value * PX, MINH);
  const slot = (node: ColumnNode, max: number, single: boolean) =>
    Math.max(nodeHeight(node), labelHeight(node, max, single));
  const columnHeight = (arr: ColumnNode[], gap: number, max: number, single = false) =>
    arr.reduce((sum, node) => sum + slot(node, max, single), 0) + gap * Math.max(arr.length - 1, 0);
  const maxL1 = noL2 ? 10 : 7;
  const maxR1 = noR2 ? 10 : 7;
  const singleL1 = noL2 && L1.length === 1;
  // 左端の内訳は一段階目の帯を短くして空いたぶん、間隔を少し広げる
  const GOL = tall ? GO : GO + 4;
  const hL1 = columnHeight(L1, G1, maxL1, singleL1);
  const hL2 = columnHeight(L2, GOL, 10);
  const hR1 = columnHeight(R1, G1, maxR1);
  const hR2 = columnHeight(R2, GO, 10);
  // 切り替える図のうち一番高い図に合わせ、合計の柱の位置を動かさない
  const MAXH = Math.max(HUB, hL1, hL2, hR1, hR2, lock.maxH);
  const C = HEAD + MAXH / 2;
  const TOP = C - HUB / 2;
  const place = (arr: ColumnNode[], gap: number, height: number, max: number, single = false) => {
    let y = C - height / 2;
    for (const node of arr) {
      const s = slot(node, max, single);
      node.nh = nodeHeight(node);
      node.y = y + (s - node.nh) / 2;
      node.inY = node.y;
      node.outY = node.y;
      y += s + gap;
    }
  };
  place(L1, G1, hL1, maxL1, singleL1);
  place(L2, GOL, hL2, 10);
  place(R1, G1, hR1, maxR1);
  place(R2, GO, hR2, 10);

  // 帯：金額がごく小さい帯も見えるよう太さに下限を設ける。太らせた分は中心をそろえて上下に振り分ける。
  // 細い帯も色の濃さは変えない（細い帯だけ濃くなると、色が変わって見えるため）
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
    bands.push({
      key,
      keys,
      d: curve(x1, y1 + dy, y1 + dy + t, x2, y2 + dy, y2 + dy + t),
      color,
      opacity,
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
        rx: 3,
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

  // ラベル（重なりを避けて上から順に積む）。帯の上に重なる内側の列は縁を白くする
  const HALO = 5;
  const labels: SankeyLabelLayout[] = [];
  let maxY = HEAD + MAXH;
  // ラベルのおおよその横幅から、左右に残る余白を測る（あとで viewBox を詰めて、図をカードの幅いっぱいに広げる）
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  const extend = (x: number, anchor: "start" | "end", width: number) => {
    minX = Math.min(minX, anchor === "end" ? x - width : x);
    maxX = Math.max(maxX, anchor === "end" ? x : x + width);
  };
  const column = (
    arr: ColumnNode[],
    x: number,
    anchor: "start" | "end",
    halo: number | undefined,
    max: number,
    size: "normal" | "small" | "large" = "normal",
    single = false,
  ) => {
    // small：一番外側の内訳の列は項目名を少し小さく。large：左端の内訳の列は空いた横幅を使って金額も少し大きく。
    // 左の帯を縮めた図の支出側の列は、政党の図に近い大きさにする
    const wide = narrowIn && arr === R1;
    const nameSize = (size === "small" ? (NMF * 17) / 19 : NMF) * (wide ? 0.92 : 1);
    const amountSize = (size === "large" ? (AMF * 14) / 13 : AMF) * (wide ? 1.08 : 1);
    const oneLineHeight = NLH * (wide ? 0.96 : 1);
    const pillSize = amountSize * 0.92;
    let prev = Number.NEGATIVE_INFINITY;
    for (const node of arr) {
      const lines = wrapNameLines(node.label, max);
      const amount = formatSankeyAmount(node.value);
      const percent = pct(node.value);
      // 1%未満は割合のピルだけうすくし、名前・金額はほかと同じ色にする
      const mute = pctBase > 0 && node.value / pctBase < 0.01;
      const amountWidth = estimateTextWidth(amount, amountSize) + 6;
      const pillWidth = estimateTextWidth(percent, pillSize) + 12;
      const rowWidth = amountWidth + pillWidth;
      const oneLine = isOneLine(lines.length, single);
      const namesHeight = linesHeight(lines);
      const H = oneLine ? oneLineHeight : namesHeight + ALH;
      const top = Math.max(node.y + node.nh / 2 - H / 2, prev + (oneLine ? 2 : 6));
      prev = top + H;
      maxY = Math.max(maxY, prev);
      const nameWidth = (line: { text: string; sub: boolean }) =>
        estimateTextWidth(line.text, line.sub ? nameSize * SUB_SCALE : nameSize);
      const texts: SankeyLabelText[] = [];
      // 金額とピル：始点から右へ「金額 → ピル」の順に並べる
      const amountRow = (xa: number, yc: number) => {
        texts.push({
          text: amount,
          x: xa,
          y: yc,
          anchor: "start",
          fontSize: amountSize,
          fontWeight: 600,
          fill: MUTED,
          numeric: true,
          halo,
        });
        return [sankeyPill(percent, xa + amountWidth, yc, pillSize, { x: 12, y: 7 }, mute)];
      };
      if (oneLine) {
        const width = nameWidth(lines[0]);
        const total = width + 12 + rowWidth;
        const x0 = anchor === "end" ? x - total : x;
        const yc = top + oneLineHeight / 2;
        extend(x, anchor, total);
        texts.push({
          text: lines[0].text,
          x: x0,
          y: yc,
          anchor: "start",
          fontSize: nameSize,
          fontWeight: 800,
          fill: INK,
          numeric: false,
          halo,
        });
        labels.push({
          key: node.key,
          keys: node.keys,
          texts,
          pills: amountRow(x0 + width + 12, yc),
        });
        continue;
      }
      extend(x, anchor, Math.max(rowWidth, ...lines.map(nameWidth)));
      let y = top;
      for (const line of lines) {
        const lh = line.sub ? PLH : NLH;
        texts.push({
          text: line.text,
          x,
          y: y + lh / 2,
          anchor,
          fontSize: line.sub ? nameSize * SUB_SCALE : nameSize,
          fontWeight: line.sub ? 700 : 800,
          fill: line.sub ? SUB_INK : INK,
          numeric: false,
          halo,
        });
        y += lh;
      }
      const pills = amountRow(anchor === "end" ? x - rowWidth : x, top + namesHeight + ALH / 2 + 1);
      labels.push({ key: node.key, keys: node.keys, texts, pills });
    }
  };
  if (tall) column(L2, X.L2 - 14, "end", undefined, 10, "small");
  else column(L2, X.L2 - 20, "end", undefined, 10, "large");
  // 1段階目のラベルは、合計から見て外側（収入はバーの左、支出はバーの右）に置く
  if (noL2) column(L1, X.L1 - 14, "end", undefined, 10, "normal", singleL1);
  else column(L1, X.L1 - 10, "end", HALO, 7);
  if (noR2) column(R1, X.R1 + NW + 14, "start", undefined, 10);
  else column(R1, X.R1 + NW + 10, "start", HALO, 7);
  column(R2, X.R2 + NW + 14, "start", undefined, 10, "small");

  // 区分を切り替えても図の高さが変わらないよう、切り替える図の合計の柱より下の高さの大きいほうに合わせる
  const height = Math.max(Math.ceil(Math.max(maxY, TOP + HUB) + 32), Math.ceil(C + lock.below));
  const headerSize = tall ? 27 : 19;
  const header = (x: number, text: string, spans: SankeyHeaderLayout["spans"]) => ({
    text,
    x,
    y: headerSize + 2,
    fontSize: headerSize,
    fontWeight: 800,
    anchor: "middle" as const,
    letterSpacing: ".08em",
    spans,
  });
  // 左右の余白を詰める（ラベルの外側に16の余白を残して切り出す。図の中身は動かさない）
  const vx = Math.min(
    Number.isFinite(minX) ? Math.max(0, Math.floor(minX - 16)) : 0,
    Number.isFinite(lock.minX) ? lock.minX : W,
  );
  const vr = Math.max(
    Number.isFinite(maxX) ? Math.min(W, Math.ceil(maxX + 16)) : W,
    Number.isFinite(lock.maxX) ? lock.maxX : 0,
  );
  const totalSize = tall ? 24 : 18;

  const layout: SankeyLayout = {
    x: vx,
    width: vr - vx,
    height,
    headers: [
      header((X.L2 + X.L1 + NW) / 2, options.inTitle, [
        { text: options.inTitle, fill: IN_TITLE_COLOR },
      ]),
      header((X.R1 + X.R2 + NW) / 2, options.outTitle, outTitleSpans(options.outTitle, INK)),
    ],
    bands,
    nodes,
    labels,
    hub: {
      x: HX,
      y: TOP,
      width: HW,
      height: HUB,
      rx: 6,
      color: HUB_COLOR,
      // 「合計」と金額を柱の上に2段で置く
      title: {
        text: "合計",
        x: HX + HW / 2,
        y: TOP - (totalSize + 18),
        fontSize: tall ? 22 : 17,
        fontWeight: 800,
      },
      amount: {
        text: formatSankeyAmount(flow.total),
        x: HX + HW / 2,
        y: TOP - 12,
        fontSize: totalSize,
        fontWeight: 700,
      },
    },
  };
  return {
    layout,
    metrics: { maxH: MAXH, below: height - C, minX: vx, maxX: vr },
  };
}
