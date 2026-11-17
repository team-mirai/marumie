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
 * 議員の調研費のページを足すときは、ここに組み合わせを足して同じ枠・見出し・図の描き方を使い回す。
 */
export type OgHeadingVariant = "party" | "group";

const HEADING: Record<
  OgHeadingVariant,
  {
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
  }
> = {
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
};

const TITLE_MAX = 76;

/** 見出しの名前の文字の大きさ。名前が長いほど小さくし、決まった横幅に収める */
function ogTitleSize(name: string, suffix: string, variant: OgHeadingVariant): number {
  const h = HEADING[variant];
  const n = Math.min(
    TITLE_MAX,
    Math.floor(h.titleWidth / ((name.length + suffix.length * h.suffixScale) * 1.04)),
  );
  return Math.round(n * h.titleBoost);
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
  const h = HEADING[variant];
  const titleSize = ogTitleSize(name, suffix, variant);
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
