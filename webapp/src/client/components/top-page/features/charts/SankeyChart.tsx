"use client";
import "client-only";

import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { toSankeyFlow } from "@/client/lib/sankey-flow";
import { layoutSankey, type SankeyLayoutOptions } from "@/client/lib/sankey-layout";
import { layoutSankeySp, type SankeySpLayoutOptions } from "@/client/lib/sankey-layout-sp";
import { type SankeyData, SANKEY_UNUSED_LABEL } from "@/types/sankey";

/**
 * 図の種類。列の見出し・残高の名前・形が変わる。
 * - political-fund：政党・政治団体（収入の内訳 → 収入 → 合計 → 支出 → 支出の内訳 ＋ 現金残高）
 * - research-fund：議員ページの調研費（公費から支給 → 合計 → 支出 → 各費目 ＋ 未使用）
 * - research-fund-summary：トップの所属議員の調研費（支給 → 合計 → 各費目・未使用。項目名と金額を1行に並べ、低めに描く）
 */
type SankeyVariant = "political-fund" | "research-fund" | "research-fund-summary";

const RESEARCH_FUND_TITLES = { inTitle: "支給", outTitle: "支出・未使用" };

const VARIANTS: Record<
  SankeyVariant,
  {
    flow: Parameters<typeof toSankeyFlow>[1];
    layout: SankeyLayoutOptions;
    /** SP の3列の図（spLayout="columns"）の見せ方 */
    sp: SankeySpLayoutOptions;
  }
> = {
  "political-fund": {
    flow: {},
    layout: { inTitle: "収入", outTitle: "支出・残高" },
    sp: { inTitle: "収入", outTitle: "支出・残高" },
  },
  "research-fund": {
    flow: { balanceLabel: SANKEY_UNUSED_LABEL, groupExpensesAs: "支出" },
    layout: RESEARCH_FUND_TITLES,
    sp: RESEARCH_FUND_TITLES,
  },
  "research-fund-summary": {
    flow: { balanceLabel: SANKEY_UNUSED_LABEL },
    layout: { ...RESEARCH_FUND_TITLES, inline: true, hubScale: 0.65 },
    // トップの調研費はほかの図より背を低く詰める
    sp: { ...RESEARCH_FUND_TITLES, heightScale: 0.75 },
  },
};

/**
 * SP（≤640px）での見せ方。
 * - tall：PC と同じ5列の図を、文字と間隔を大きくした背の高い版で画面幅いっぱいに出す（政党ページ・トップの政党・政治団体のカード）
 * - columns：内訳を親にまとめた「収入 → 合計 → 支出・残高」の3列の図を出す（政治団体・議員ページ、トップの所属議員の調研費）
 */
type SankeySpLayout = "tall" | "columns";

/** SP の判定。CSS の min-[641px]（width >= 641px）のちょうど裏返しにし、ズームで幅が小数になっても CSS と同じ側を選ぶ */
const SP_QUERY = "(width < 641px)";

function subscribeSp(onChange: () => void) {
  const media = window.matchMedia(SP_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function useIsSp() {
  return useSyncExternalStore(
    subscribeSp,
    () => window.matchMedia(SP_QUERY).matches,
    () => false,
  );
}

/** 図が画面に入ったら true にする（ノードが伸びて帯が左から現れる動きの合図） */
function useInView<T extends Element>() {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, inView };
}

const HALO = {
  stroke: "#fff",
  strokeLinejoin: "round",
  paintOrder: "stroke",
} as const;
const NUMERIC_STYLE = { fontVariantNumeric: "tabular-nums" } as const;
/**
 * 図の文字の書体。デザイン（v9）と同じくヒラギノを先に使い、無い環境では Noto Sans JP にする。
 * Noto Sans JP の太字（800）は、ヒラギノの太字（W6）よりかなり太く見えるため。
 */
const FONT_STYLE = {
  fontFamily:
    '"Hiragino Kaku Gothic ProN", var(--font-noto-sans-jp), "Noto Sans JP", system-ui, sans-serif',
} as const;

interface SankeyChartProps {
  data: SankeyData;
  variant?: SankeyVariant;
  /** 図の内容を説明する読み上げ用のラベル。政治資金以外の図でも使えるように差し替えられる。 */
  ariaLabel?: string;
  /** 図の詳細（何から何へのお金の流れか）を説明する読み上げ用テキスト。ariaLabel と食い違わないよう合わせて差し替える。 */
  ariaDescription?: string;
  /** SP での見せ方（既定は背の高い版の全体表示） */
  spLayout?: SankeySpLayout;
}

/**
 * 収支の流れのサンキー図。列の見出し、各項目の名前と「金額　割合」を常に出す。
 * 項目にホバー（キーボードではフォーカス）すると、その項目につながる帯・ノード・ラベルだけを濃く残す。
 */
export default function SankeyChart({
  data,
  variant = "political-fund",
  ariaLabel = "政治資金の収支フロー図",
  ariaDescription = "政治資金の収入から支出へのお金の流れを示すサンキーダイアグラムです。",
  spLayout = "tall",
}: SankeyChartProps) {
  // 同じページに図を複数並べても読み上げの説明が混ざらないよう、id を図ごとに分ける
  const descriptionId = useId();
  const isSp = useIsSp();
  const { ref, inView } = useInView<HTMLDivElement>();
  // ホバーが外れても、キーボードのフォーカスがある項目の強調は残す
  const [hovered, setHovered] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const hot = hovered ?? focused;

  const layout = useMemo(() => {
    const config = VARIANTS[variant];
    const flow = toSankeyFlow(data, config.flow);
    // 収入が0円でも支出・残高があれば描く
    if (flow.incomes.length === 0 && flow.expenses.length === 0 && !flow.balance) return null;
    if (isSp && spLayout === "columns") return layoutSankeySp(flow, config.sp);
    return layoutSankey(flow, { ...config.layout, tall: isSp });
  }, [data, variant, isSp, spLayout]);

  if (!layout) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-[#6B7280]">
        データがありません
      </div>
    );
  }

  const isHot = (keys: string[]) => hot !== null && keys.includes(hot);
  const hover = (key: string) => ({
    onMouseEnter: () => setHovered(key),
    onMouseLeave: () => setHovered(null),
  });
  const hotClass = (keys: string[]) => (isHot(keys) ? " is-hot" : "");

  return (
    <div ref={ref} className={`sankey-chart${inView ? " is-in" : ""}`}>
      {/* biome-ignore lint/a11y/useSemanticElements: SVG の中では fieldset を使えないので、図全体を role="group" でまとめる */}
      <svg
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        className={`block h-auto w-full overflow-visible${hot ? " has-hover" : ""}`}
        style={FONT_STYLE}
        role="group"
        aria-label={ariaLabel}
        aria-describedby={descriptionId}
      >
        {layout.headers.map((header) => (
          <text
            key={header.text}
            x={header.x}
            y={header.y}
            textAnchor={header.anchor}
            fontSize={header.fontSize}
            fontWeight={header.fontWeight}
            fill={header.fill}
            letterSpacing={header.letterSpacing}
          >
            {header.text}
          </text>
        ))}
        {layout.bands.map((band) => (
          <path
            key={band.key}
            className={`band band-in${hotClass(band.keys)}`}
            d={band.d}
            fill={band.color}
            fillOpacity={isHot(band.keys) ? 0.42 : band.opacity}
            {...hover(band.keys[0])}
          />
        ))}
        {layout.nodes.map((node) => (
          // biome-ignore lint/a11y/noInteractiveElementToNoninteractiveRole: 項目は「項目名 金額（割合）」の画像として読み上げ、キーボードでもたどってつながる帯を強調できるようにする
          <rect
            key={node.key}
            className={`node grow${node.right ? " r" : ""}${hotClass(node.keys)}`}
            x={node.x}
            y={node.y}
            width={node.width}
            height={node.height}
            rx={node.rx}
            fill={node.color}
            role="img"
            aria-label={node.ariaLabel}
            tabIndex={0}
            onFocus={() => setFocused(node.key)}
            onBlur={() => setFocused(null)}
            {...hover(node.key)}
          />
        ))}
        {/* ラベルの内容はノードの読み上げに含めるので、重ねて読まない */}
        {/* biome-ignore lint/a11y/noAriaHiddenOnFocusable: SVG の g・text はフォーカスを受けない（誤検知） */}
        <g aria-hidden="true">
          {layout.labels.map((label) => (
            <text
              key={label.key}
              className={`lbl${hotClass(label.keys)}`}
              textAnchor={label.anchor}
            >
              {label.spans.map((span, i) => (
                <tspan
                  key={i}
                  x={span.x}
                  y={span.y}
                  dx={span.dx}
                  dominantBaseline="middle"
                  fontSize={span.fontSize}
                  fontWeight={span.fontWeight}
                  fill={span.fill}
                  style={span.numeric ? NUMERIC_STYLE : undefined}
                  {...(label.halo ? { ...HALO, strokeWidth: label.halo } : {})}
                >
                  {span.text}
                </tspan>
              ))}
            </text>
          ))}
        </g>
        <g>
          <rect
            className="node"
            x={layout.hub.x}
            y={layout.hub.y}
            width={layout.hub.width}
            height={layout.hub.height}
            rx={layout.hub.rx}
            fill={layout.hub.color}
          />
          {[layout.hub.title, layout.hub.amount].map((text, i) =>
            text ? (
              <text
                key={text.text}
                x={text.x}
                y={text.y}
                textAnchor="middle"
                fontSize={text.fontSize}
                fontWeight={text.fontWeight}
                fill="#0B0F0E"
                style={i === 1 ? NUMERIC_STYLE : undefined}
              >
                {text.text}
              </text>
            ) : null,
          )}
        </g>
      </svg>
      <p id={descriptionId} className="sr-only">
        {ariaDescription}
      </p>
      <style jsx global>{`
        .sankey-chart .band {
          transition:
            fill-opacity 0.35s,
            opacity 0.35s cubic-bezier(0.2, 0.7, 0.1, 1),
            clip-path 1.6s cubic-bezier(0.65, 0, 0.35, 1) 0.2s;
        }
        .sankey-chart .node {
          outline: none;
          transition:
            opacity 0.35s cubic-bezier(0.2, 0.7, 0.1, 1),
            transform 1.4s cubic-bezier(0.65, 0, 0.35, 1);
        }
        .sankey-chart .lbl {
          transition: opacity 0.35s cubic-bezier(0.2, 0.7, 0.1, 1);
        }
        .sankey-chart .has-hover .band,
        .sankey-chart .has-hover .lbl,
        .sankey-chart .has-hover .node {
          opacity: 0.22;
        }
        .sankey-chart .has-hover .is-hot {
          opacity: 1 !important;
        }
        .sankey-chart .grow {
          transform-box: fill-box;
          transform-origin: left center;
          transform: scaleX(0);
        }
        .sankey-chart .grow.r {
          transform-origin: right center;
        }
        .sankey-chart.is-in .grow {
          transform: none;
        }
        .sankey-chart .band-in {
          clip-path: inset(0 100% 0 0);
        }
        .sankey-chart.is-in .band-in {
          clip-path: inset(0 0 0 0);
        }
        @media (prefers-reduced-motion: reduce) {
          .sankey-chart .grow,
          .sankey-chart .band-in {
            transform: none;
            clip-path: none;
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
