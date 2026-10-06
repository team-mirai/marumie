/**
 * 調研費のエンティティ ID（議員・帳簿・仕訳・支出群・書類）の形。
 *
 * ID は DB の自動採番で、画面やリンクからは文字列で渡ってくる。0 始まり・負数・小数・空文字を
 * そのままリポジトリに渡すと、型変換で別の行を引いたり例外になるので、入口でこの判定で弾く。
 */

/** 1 以上の整数の文字列（先頭の 0 を許さない） */
const SERIAL_ID_FORMAT = /^[1-9]\d*$/;

/** bigint カラムの上限（PostgreSQL の bigint = 符号付き 64bit 整数） */
const MAX_BIGINT_ID = BigInt("9223372036854775807");

/** 自動採番の ID の形か */
export function isSerialId(value: string): boolean {
  return SERIAL_ID_FORMAT.test(value);
}

/**
 * bigint カラムの自動採番の ID の形か。桁数で先に絞ってから BigInt に読み、
 * 桁数の多い入力で無駄に大きな BigInt を作らないようにする。
 */
export function isBigIntId(value: string): boolean {
  return isSerialId(value) && value.length <= 19 && BigInt(value) <= MAX_BIGINT_ID;
}
