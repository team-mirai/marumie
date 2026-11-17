import "server-only";
import Image from "next/image";
import type { ReactNode } from "react";
import { AboutCard } from "@/client/components/about/AboutParts";
import RevealHeadingText from "@/client/components/common/RevealHeadingText";

interface Feature {
  no: string;
  title: ReactNode;
  /** 見出しと本文の間に置くもの（タグの並びなど） */
  extra?: ReactNode;
  body: string;
  image: { src: string; alt: string; background: string; position?: string };
}

const FEATURE_TAGS = ["月ごとの収支", "貸借対照表", "すべての出入金"];

const FEATURES: Feature[] = [
  {
    no: "01",
    title: "収支の全体像をつかみやすく",
    body: "サンキー図と呼ばれる図を使い、お金の流れについてボリュームを視覚的に見やすくすることで、収支における各項目の割合が一目でわかるようになっています。",
    image: {
      src: "/about/feat1-sankey.webp",
      alt: "収入から合計を経て支出と残高へ流れる、緑と赤のサンキー図のイメージ",
      background: "bg-[#ECECEC]",
    },
  },
  {
    no: "02",
    title: (
      <>
        収支報告書にない情報まで
        <wbr />
        見られる
      </>
    ),
    extra: (
      <ul
        aria-label="収支報告書にない、公開している情報"
        className="m-0 flex list-none flex-wrap gap-2 p-0"
      >
        {FEATURE_TAGS.map((tag) => (
          <li
            key={tag}
            className="inline-flex h-[30px] items-center whitespace-nowrap rounded-full bg-[#E2F6F3] px-3.5 text-[13px] font-bold text-[#0F8472]"
          >
            {tag}
          </li>
        ))}
      </ul>
    ),
    body: "月ごとの収支、貸借対照表、1件ずつの出入金まで公開しています。クラウド会計と連携して、取引のデータをそのまま取り込んでいるためです。",
    image: {
      src: "/about/feat2-dashboard2.webp",
      alt: "ノートパソコンの画面の前に、サンキー図・棒グラフ・一覧・折れ線グラフのカードが浮かんでいるイメージ",
      background: "bg-[#F5F8F7]",
    },
  },
  {
    no: "03",
    title: (
      <>
        デジタル連携で
        <wbr />
        ミスやエラーを起こりにくく
      </>
    ),
    body: "銀行口座やカードをつないで取引をすべてデータで残して記録するため、ミスが起こりにくいです。",
    image: {
      src: "/about/feat3-cards2.webp",
      alt: "ミント・ベージュ・ピンク・ブルーのカードが重なって浮かんでいるイメージ",
      background: "bg-[#D6D6D3]",
      position: "object-[50%_45%]",
    },
  },
  {
    no: "04",
    title: "年に1度ではなく、いつでも公開",
    body: "仕訳さえ済めば、その時点の収支をいつでも公開できます。このサイトも、仕訳が済みしだい随時公開しています（現状は不定期の更新です）。",
    image: {
      src: "/about/feat4-calendar2.webp",
      alt: "1月から12月までの月ごとのカレンダーが重なって並ぶイメージ",
      background: "bg-[#E5E7EB]",
    },
  },
];

const OLD_REPORT_POINTS = [
  {
    title: "公開は年に1回",
    note: "1年分の収支をまとめて翌年3月末までに提出し、総務省や都道府県の選挙管理委員会が翌年11月末ごろに公開します。",
  },
  {
    title: "約1年弱のタイムラグあり",
    note: "年末に使ったお金でも、外から見えるまでに約1年弱。年の初めに使ったお金は、さらに時間がかかります。",
  },
  {
    title: "PDF・表形式",
    note: "届出先ごとにPDFで公開され、データベースにはなっていないため、横断して調べたり集計したりするのに手間がかかります。",
  },
];

/**
 * 「まる見え政治資金・4つの特徴」。特徴ごとに画像と文を左右交互に並べ（SP は文の下に画像）、
 * 最後にこれまでの政治資金収支報告書の公開のされ方をグレーの囲みで出す。
 */
export default function AboutFeaturesSection() {
  return (
    <AboutCard labelledBy="about-feat">
      <div className="flex flex-col gap-2.5 pb-2">
        <span className="text-[13px] font-bold tracking-[0.04em] text-[#238778]">
          まる見え政治資金・4つの特徴
        </span>
        <h2
          id="about-feat"
          data-reveal="mask"
          className="m-0 text-[20px] font-black leading-[1.4] text-black min-[641px]:text-[27px]"
        >
          <RevealHeadingText>これまでの収支報告書との違い</RevealHeadingText>
        </h2>
      </div>

      {FEATURES.map((feature, index) => (
        <div
          key={feature.no}
          data-reveal
          className={`flex flex-wrap items-center gap-5 py-7 min-[641px]:gap-14 min-[641px]:py-12 ${
            index % 2 === 1 ? "flex-row-reverse" : ""
          }`}
        >
          {/* SP は文を先に、画像をその下に出す */}
          <div
            className={`relative order-2 aspect-[4/3] min-w-0 flex-[1_1_340px] overflow-hidden rounded-[20px] min-[641px]:order-none ${feature.image.background}`}
          >
            <Image
              src={feature.image.src}
              alt={feature.image.alt}
              fill
              sizes="(min-width: 1080px) 480px, (min-width: 641px) 50vw, 100vw"
              className={`object-cover ${feature.image.position ?? ""}`}
            />
          </div>
          <div className="order-1 flex min-w-0 flex-[1_1_340px] flex-col gap-3.5 min-[641px]:order-none">
            {/* 番号と見出しの間は詰める（6px） */}
            <span className="font-num -mb-2 text-[clamp(44px,4.6vw,64px)] font-bold leading-none tracking-[-0.02em] text-[#30BCA7]">
              {feature.no}
            </span>
            <h3 className="m-0 break-keep text-[20px] font-extrabold leading-[1.4] text-black [overflow-wrap:anywhere] [text-wrap:balance] min-[641px]:text-[26px]">
              {feature.title}
            </h3>
            {feature.extra}
            <p className="m-0 text-[15px] leading-[1.9] text-[#374151] [text-wrap:pretty]">
              {feature.body}
            </p>
          </div>
        </div>
      ))}

      <div className="grid grid-cols-1 gap-y-3.5 rounded-[20px] bg-[#F3F4F6] p-[clamp(20px,3vw,36px)] min-[641px]:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] min-[641px]:gap-x-8">
        <span className="text-[13px] font-bold tracking-[0.04em] text-[#6B7280] min-[641px]:col-start-1">
          これまで
        </span>
        <h3 className="m-0 -mt-1.5 text-[18px] font-extrabold leading-[1.4] text-black min-[641px]:col-start-1 min-[641px]:text-[20px]">
          政治資金収支報告書
        </h3>
        <ul className="m-0 flex list-none flex-col gap-2 p-0 min-[641px]:col-start-1">
          {OLD_REPORT_POINTS.map((point) => (
            <li
              key={point.title}
              className="relative pl-[18px] text-[15px] leading-[1.6] text-[#1F2937] before:absolute before:left-0.5 before:top-[0.62em] before:size-2 before:rounded-full before:bg-[#9CA3AF] before:content-[''] not-first:mt-1.5"
            >
              <b>{point.title}</b>
              <span className="mt-0.5 block text-[13px] leading-[1.7] text-[#4B5563]">
                {point.note}
              </span>
            </li>
          ))}
        </ul>
        <figure className="relative m-0 flex items-center justify-center overflow-hidden rounded-xl bg-white min-[641px]:col-start-2 min-[641px]:row-span-4 min-[641px]:row-start-1 min-[641px]:min-h-[220px]">
          <Image
            src="/about/feat4-houkokusho.webp"
            alt="従来の政治資金収支報告書の例（デジタル民主主義を考える会・2024年）"
            width={1200}
            height={857}
            sizes="(min-width: 641px) 40vw, 100vw"
            className="block h-full max-h-[240px] w-full object-contain p-3 min-[641px]:max-h-[300px]"
          />
        </figure>
      </div>
    </AboutCard>
  );
}
