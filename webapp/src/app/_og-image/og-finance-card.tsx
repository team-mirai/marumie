import type { CSSProperties, ReactNode } from "react";
import { type OgAmountPart, formatOgAmount } from "@/app/_og-image/og-amount";
import { OG_FONT_JP, OG_FONT_NUM } from "@/app/_og-image/og-fonts";
import { OG_HEIGHT, OG_WIDTH, buildOgBackgroundSvg, svgDataUri } from "@/app/_og-image/og-frame";
import type { OgSankey } from "@/app/_og-image/og-sankey";

const INK = "#0A0F0D";
const SUB = "#48564F";
const LINE = "#D3E0DB";

/** 見出しの丸（左上）に入れるもの */
export type OgFace =
  | { kind: "logo" }
  | { kind: "photo"; src: string }
  /** 写真が無いときの人型（サイトの見出しと同じ） */
  | { kind: "person" };

interface OgTotal {
  label: string;
  color: string;
  yen: number;
}

/**
 * 見出しの大きさの組み合わせ。政党は横長のロゴと3つの金額の桁が多いので、文字を詰めて金額を小さめにする。
 * 議員（member）は調研費のページで、名前が長い（5文字以上）ときは long の値で「の調研費」を小さくして名前に幅を回す。
 */
export type OgHeadingVariant = "party" | "group" | "member";

interface HeadingSize {
  top: number;
  gap: number;
  /** 金額の区切り線の左右の余白 */
  totalPad: number;
  amountSize: number;
  labelSize: number;
  /** 「の収支」などの後ろの部分の大きさ（名前に対する倍率） */
  suffixScale: number;
  /** 見出しの文字に使える横幅（金額の欄を除く） */
  titleWidth: number;
  /** 文字の大きさの最終的な倍率 */
  titleBoost: number;
  /** 総額の桁が多いときに、総額にかからない幅まで見出しを小さくする（議員は支給・支出が1,000万円を超えうる） */
  fitTotals?: boolean;
}

/** 名前がこの文字数以上なら、long の値を使う */
const LONG_NAME = 5;

const HEADING: Record<OgHeadingVariant, HeadingSize & { long?: Partial<HeadingSize> }> = {
  party: {
    top: 44,
    gap: 18,
    totalPad: 15,
    amountSize: 39,
    labelSize: 17,
    suffixScale: 0.56,
    titleWidth: 518,
    titleBoost: 1.1,
  },
  group: {
    top: 54,
    gap: 26,
    totalPad: 22,
    amountSize: 60,
    labelSize: 20,
    suffixScale: 0.58,
    titleWidth: 512,
    titleBoost: 1,
  },
  member: {
    top: 54,
    gap: 26,
    totalPad: 22,
    amountSize: 60,
    labelSize: 20,
    suffixScale: 0.78,
    titleWidth: 540,
    titleBoost: 1,
    fitTotals: true,
    long: { gap: 22, totalPad: 18, suffixScale: 0.66, titleBoost: 1.03 },
  },
};

function headingSize(variant: OgHeadingVariant, name: string): HeadingSize {
  const { long, ...base } = HEADING[variant];
  return long && name.length >= LONG_NAME ? { ...base, ...long } : base;
}

const TITLE_MAX = 76;
/** 見出しの行の横幅（左右の余白 64px を除く） */
const HEADING_WIDTH = OG_WIDTH - 64 * 2;
/** 丸（顔写真・人型）の大きさ */
const FACE_SIZE = 122;
/** 見出しの文字と総額のあいだに最低限あける幅 */
const TITLE_TOTALS_GAP = 16;

/**
 * 見出しの名前の文字の大きさ。名前が長いほど小さくし、決まった横幅に収める。
 * fitTotals なら、総額の桁が多いときに総額にかからない幅までさらに小さくする
 */
function ogTitleSize(name: string, suffix: string, h: HeadingSize, totals: OgTotal[]): number {
  const em = (name.length + suffix.length * h.suffixScale) * 1.04;
  const size = Math.round(Math.min(TITLE_MAX, Math.floor(h.titleWidth / em)) * h.titleBoost);
  if (!h.fitTotals) return size;
  const room = HEADING_WIDTH - FACE_SIZE - h.gap - totalsWidth(totals, h) - TITLE_TOTALS_GAP;
  return Math.min(size, Math.floor(room / em));
}

/** 総額の欄の横幅の見積もり（区切り線の左右の余白と、金額の数字・単位の幅） */
function totalsWidth(totals: OgTotal[], h: HeadingSize): number {
  return totals.reduce((sum, total) => {
    const amount = formatOgAmount(total.yen).reduce((w, part) => {
      if (part.kind === "num") {
        // Poppins の太字の数字はおよそ 0.64em、カンマは 0.28em
        const commas = part.text.split(",").length - 1;
        return w + ((part.text.length - commas) * 0.64 + commas * 0.28) * h.amountSize;
      }
      if (part.kind === "oku") return w + h.amountSize * 0.6;
      return w + h.labelSize * 1.04 + 4;
    }, 0);
    const label = (total.label.length * 1.16 + 0.6) * h.labelSize + 9;
    return sum + h.totalPad * 2 + Math.max(amount, label);
  }, 0);
}

interface OgFinanceCardProps {
  /** 外周の模様の番号（ogPatternIndex） */
  pattern: number;
  variant: OgHeadingVariant;
  face: OgFace;
  /** 見出しの大きく描く部分（例：「チームみらい」） */
  name: string;
  /** 見出しの後ろの部分（例：「の収支」） */
  suffix: string;
  totals: OgTotal[];
  sankey: OgSankey;
  /** チームみらいのロゴ（data URI） */
  logoSrc: string;
}

const abs = (style: CSSProperties): CSSProperties => ({
  position: "absolute",
  display: "flex",
  ...style,
});

/**
 * 収支のシェア用画像（R6）。外周のグラデーションの枠、見出し（丸・名前・金額）、サンキー図、右下のロゴと「まる見え政治資金」。
 * next/og（satori）で描く前提で、要素はすべて flex と絶対配置で組む。
 */
export function OgFinanceCard({
  pattern,
  variant,
  face,
  name,
  suffix,
  totals,
  sankey,
  logoSrc,
}: OgFinanceCardProps) {
  const h = headingSize(variant, name);
  const titleSize = ogTitleSize(name, suffix, h, totals);
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        width: OG_WIDTH,
        height: OG_HEIGHT,
        fontFamily: OG_FONT_JP,
        color: INK,
      }}
    >
      <img
        src={svgDataUri(buildOgBackgroundSvg(pattern))}
        width={OG_WIDTH}
        height={OG_HEIGHT}
        style={abs({ left: 0, top: 0 })}
        alt=""
      />
      <div
        style={abs({
          left: 0,
          top: 0,
          width: OG_WIDTH,
          height: OG_HEIGHT,
          border: "2px solid rgba(255,255,255,0.6)",
        })}
      />
      <div
        style={abs({
          left: 26,
          top: 26,
          width: 1148,
          height: 578,
          borderRadius: 26,
          background: "#fff",
          boxShadow: "0 0 0 1.5px rgba(255,255,255,0.9), 0 20px 40px -24px rgba(10,60,52,0.42)",
        })}
      />
      <img
        src={svgDataUri(sankey.svg)}
        width={OG_WIDTH}
        height={OG_HEIGHT}
        style={abs({ left: 0, top: 0 })}
        alt=""
      />
      {sankey.texts.map((t, i) => (
        <div
          key={i}
          style={abs({
            top: t.y - t.fontSize / 2,
            ...(t.anchor === "end" ? { right: OG_WIDTH - t.x } : { left: t.x }),
            height: t.fontSize,
            alignItems: "center",
            fontSize: t.fontSize,
            fontWeight: t.fontWeight,
            lineHeight: 1,
            color: t.fill,
            whiteSpace: "nowrap",
            ...(t.halo ? { textShadow: halo(t.halo / 2) } : {}),
          })}
        >
          {t.text}
        </div>
      ))}
      <div
        style={abs({
          left: 64,
          right: 64,
          top: h.top,
          height: 122,
          alignItems: "center",
        })}
      >
        <Face face={face} variant={variant} logoSrc={logoSrc} />
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            marginLeft: h.gap,
            fontSize: titleSize,
            fontWeight: 900,
            lineHeight: 1,
            letterSpacing: titleSize * 0.03,
            whiteSpace: "nowrap",
          }}
        >
          {name}
          <span
            style={{
              fontSize: titleSize * h.suffixScale,
              letterSpacing: titleSize * h.suffixScale * 0.05,
              marginLeft: titleSize * h.suffixScale * 0.04,
            }}
          >
            {suffix}
          </span>
        </div>
        <div style={{ display: "flex", marginLeft: "auto", alignItems: "stretch" }}>
          {totals.map((total) => (
            <Total
              key={total.label}
              total={total}
              pad={h.totalPad}
              amountSize={h.amountSize}
              labelSize={h.labelSize}
            />
          ))}
        </div>
      </div>
      <img
        src={logoSrc}
        width={172}
        height={147}
        style={abs({ right: 10, bottom: 4, objectFit: "contain" })}
        alt=""
      />
      <div
        style={abs({
          right: 221 - 40 * 0.14,
          bottom: 42,
          fontSize: 40,
          fontWeight: 800,
          lineHeight: 1,
          letterSpacing: 40 * 0.14,
          whiteSpace: "nowrap",
        })}
      >
        まる見え政治資金
      </div>
    </div>
  );
}

/** 帯の上でも読めるよう、文字の縁を白くする（satori は paint-order を使えないので影を8方向に重ねる） */
function halo(w: number): string {
  const d = Math.max(1, Math.round(w * 10) / 10);
  const dirs = [
    [d, 0],
    [-d, 0],
    [0, d],
    [0, -d],
    [d, d],
    [-d, d],
    [d, -d],
    [-d, -d],
  ];
  return dirs.map(([x, y]) => `${x}px ${y}px 0 #fff`).join(", ");
}

function Face({
  face,
  variant,
  logoSrc,
}: {
  face: OgFace;
  variant: OgHeadingVariant;
  logoSrc: string;
}) {
  if (face.kind === "logo" || variant === "party") {
    return (
      <img
        src={logoSrc}
        width={86}
        height={74}
        style={{ flexShrink: 0, objectFit: "contain" }}
        alt=""
      />
    );
  }
  const circle: CSSProperties = {
    display: "flex",
    flexShrink: 0,
    width: 122,
    height: 122,
    borderRadius: 61,
    overflow: "hidden",
    background: "#fff",
    boxShadow:
      "0 0 0 4px #fff, 0 0 0 5px rgba(15,132,114,0.14), 0 18px 28px -16px rgba(10,60,52,0.6)",
  };
  let inner: ReactNode;
  if (face.kind === "photo") {
    inner = <img src={face.src} width={122} height={122} style={{ objectFit: "cover" }} alt="" />;
  } else {
    inner = (
      <svg
        viewBox="0 0 24 24"
        width={122}
        height={122}
        style={{ marginTop: 22 }}
        fill="#B8C1BE"
        aria-hidden="true"
      >
        <circle cx="12" cy="9" r="5" />
        <path d="M2 24c0-6 4.5-9.5 10-9.5S22 18 22 24z" />
      </svg>
    );
  }
  return <div style={circle}>{inner}</div>;
}

function Total({
  total,
  pad,
  amountSize,
  labelSize,
}: {
  total: OgTotal;
  pad: number;
  amountSize: number;
  labelSize: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        paddingLeft: pad,
        marginLeft: pad,
        borderLeft: `1px solid ${LINE}`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          fontSize: labelSize,
          fontWeight: 800,
          lineHeight: 1,
          letterSpacing: labelSize * 0.16,
          color: SUB,
          whiteSpace: "nowrap",
        }}
      >
        <div
          style={{
            width: labelSize * 0.6,
            height: labelSize * 0.6,
            borderRadius: 3,
            background: total.color,
            marginRight: 9,
          }}
        />
        {total.label}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          marginTop: 11,
          fontFamily: OG_FONT_NUM,
          fontSize: amountSize,
          fontWeight: 700,
          lineHeight: 0.92,
          letterSpacing: amountSize * -0.015,
          whiteSpace: "nowrap",
          color: INK,
        }}
      >
        {formatOgAmount(total.yen).map((part, i) => (
          <AmountPart key={i} part={part} amountSize={amountSize} labelSize={labelSize} />
        ))}
      </div>
    </div>
  );
}

function AmountPart({
  part,
  amountSize,
  labelSize,
}: {
  part: OgAmountPart;
  amountSize: number;
  labelSize: number;
}) {
  if (part.kind === "num") return <span>{part.text}</span>;
  if (part.kind === "oku") {
    return (
      <span
        style={{
          fontFamily: OG_FONT_JP,
          fontSize: amountSize * 0.5,
          fontWeight: 800,
          marginLeft: amountSize * 0.5 * 0.04,
          marginRight: amountSize * 0.5 * 0.06,
        }}
      >
        {part.text}
      </span>
    );
  }
  return (
    <span
      style={{
        fontFamily: OG_FONT_JP,
        fontSize: labelSize,
        fontWeight: 800,
        letterSpacing: labelSize * 0.04,
        marginLeft: 4,
      }}
    >
      {part.text}
    </span>
  );
}
