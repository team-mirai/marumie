import { cn, formatCurrency, layoutResearchFundSankey } from "@/client/lib";
import type { ResearchFundCategoryTotal } from "@/shared/research-fund/aggregation";

/**
 * 公開の before / after を並べて見せるための簡易サンキー。
 * 図（リボンとノード）だけを幅 100% の SVG で描き、末端のラベルは SVG の外に HTML で重ねる。
 * ラベルを SVG の中に置くと画面幅に応じて文字まで拡大され、管理画面の他のテキストと釣り合わなくなるため。
 */
export function ResearchFundSankey({
  granted,
  categories,
}: {
  granted: number;
  categories: readonly ResearchFundCategoryTotal[];
}) {
  const layout = layoutResearchFundSankey(granted, categories);
  if (!layout)
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        公開済みの支給・支出がまだありません
      </p>
    );
  return (
    // 下の余白は SVG の外に置いた「支給 ¥…」ラベルの分。
    <div className="flex gap-2 pb-6">
      <div className="@container relative min-w-0 flex-1">
        {/*
          高さは幅なり（viewBox の縦横比 168/412 = 40.78%）だが、カードが狭いと図が潰れて
          末端のラベルが重なるので、layout が費目数から出した下限（px）までしか縮めない。
          下限に当たったときだけ縦に伸ばすため preserveAspectRatio は none にする
          （ノードの幅は横方向の倍率で決まるので変わらない）。
        */}
        <svg
          viewBox={layout.viewBox}
          preserveAspectRatio="none"
          className="block w-full"
          style={{ height: `max(${layout.minHeight}px, 40.78cqw)` }}
          role="img"
          aria-label={`支給 ${formatCurrency(granted)} の使いみち`}
        >
          {layout.bands.map((band) => (
            <path
              key={band.key}
              d={band.ribbon}
              className={band.kind === "unused" ? "fill-muted" : "fill-primary"}
              opacity={band.kind === "unused" ? 0.55 : 0.28}
            />
          ))}
          <rect {...layout.grantNode} className="fill-primary" />
          {layout.bands.map((band) => (
            <rect
              key={band.key}
              {...band.node}
              className={cn(
                band.kind === "unused" ? "fill-muted stroke-disabled-border" : "fill-primary",
              )}
              strokeWidth={band.kind === "unused" ? 1 : 0}
            />
          ))}
        </svg>
        <p
          className="absolute top-full mt-1.5 whitespace-nowrap text-[11px] leading-tight text-foreground"
          style={{ left: `${layout.grantLabelLeftPercent}%` }}
        >
          支給 <span className="font-latin">{formatCurrency(granted)}</span>
        </p>
      </div>
      {/*
        ラベルは必ず 1 行に収める（費目名が長ければ省略する）。折り返して 2 行になると
        layoutResearchFundSankey が前提にしている 1 行分の最小間隔では足りず、また重なってしまうため。
      */}
      <ul className="relative w-40 shrink-0 text-[11px] leading-tight">
        {layout.bands.map((band) => (
          <li
            key={band.key}
            className={cn(
              "absolute flex w-full -translate-y-1/2 items-baseline gap-1",
              band.kind === "unused" ? "text-muted-foreground" : "text-foreground",
            )}
            style={{ top: `${band.labelTopPercent}%` }}
          >
            <span className="min-w-0 truncate" title={band.label}>
              {band.label}
            </span>
            <span className="font-latin shrink-0">{formatCurrency(band.amount)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
