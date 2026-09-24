export const MAN_YEN = 10000;
const OKU_YEN = 100000000;

// 目盛り幅の下限（100円）。金額が極端に小さい場合や全て0の場合でも軸が潰れないようにする
const MIN_TICK_INTERVAL = 100;

export type AmountUnit = "円" | "万円" | "億円";

interface SymmetricYAxisScale {
  min: number;
  max: number;
  tickInterval: number;
}

/**
 * 値の桁（log10）をもとに 1 / 2 / 5 / 10 のキリのよい刻み幅を求める
 * 例: 3,200円 → 5,000円 / 12,000,000円 → 20,000,000円
 */
export function calcNiceTickInterval(value: number): number {
  const target = Math.abs(value);
  if (!Number.isFinite(target) || target <= MIN_TICK_INTERVAL) {
    return MIN_TICK_INTERVAL;
  }

  const magnitude = 10 ** Math.floor(Math.log10(target));
  const normalized = target / magnitude; // 1以上10未満
  if (normalized <= 1) return magnitude;
  if (normalized <= 2) return magnitude * 2;
  if (normalized <= 5) return magnitude * 5;
  return magnitude * 10;
}

/**
 * 0 を中心に上下対称なY軸レンジを返す
 * ApexCharts の tickAmount: 4（0の上下に2目盛りずつ）を前提に、
 * 目盛り位置がキリのよい値になるよう max = tickInterval * 2 とする
 */
export function calcSymmetricYAxisScale(
  maxAbsValue: number,
  marginRatio = 1.2,
): SymmetricYAxisScale {
  const tickInterval = calcNiceTickInterval((Math.abs(maxAbsValue) * marginRatio) / 2);
  return {
    min: -tickInterval * 2,
    max: tickInterval * 2,
    tickInterval,
  };
}

/** 金額の大きさに応じた表示単位を決める */
export function pickAmountUnit(value: number): AmountUnit {
  const absValue = Math.abs(value);
  if (absValue >= OKU_YEN) return "億円";
  if (absValue >= MAN_YEN) return "万円";
  return "円";
}

/** 指定単位に換算した数値部分を返す（単位そのものは含まない） */
export function formatAmountIn(value: number, unit: AmountUnit): string {
  const divisor = unit === "億円" ? OKU_YEN : unit === "万円" ? MAN_YEN : 1;
  const converted = value / divisor;
  // 10未満のときだけ小数第1位まで表示する（0.3万円 など）
  const fractionDigits = Math.abs(converted) >= 10 ? 0 : 1;
  return Number(converted.toFixed(fractionDigits)).toLocaleString("ja-JP", {
    maximumFractionDigits: fractionDigits,
  });
}
