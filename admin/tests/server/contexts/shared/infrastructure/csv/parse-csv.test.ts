import { parseCsv } from "@/server/contexts/shared/infrastructure/csv/parse-csv";

describe("parseCsv", () => {
  it("カンマと改行でレコードと欄に分ける", () => {
    expect(parseCsv("a,b,c\n1,2,3")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("空文字列は空配列を返す", () => {
    expect(parseCsv("")).toEqual([]);
  });

  it("引用符で囲まれた欄の中の改行を値の一部として保つ", () => {
    expect(parseCsv('a,b,c\n1,"前半\n後半",3\n4,5,6')).toEqual([
      ["a", "b", "c"],
      ["1", "前半\n後半", "3"],
      ["4", "5", "6"],
    ]);
  });

  it("引用符で囲まれた欄の中のカンマを値の一部として扱う", () => {
    expect(parseCsv('a,b\n"x,y",z')).toEqual([
      ["a", "b"],
      ["x,y", "z"],
    ]);
  });

  it("引用符で囲まれた欄の中の \"\" を引用符 1 文字として扱う", () => {
    expect(parseCsv('a,b\n"彼は""はい""と言った",z')).toEqual([
      ["a", "b"],
      ['彼は"はい"と言った', "z"],
    ]);
  });

  it("CRLF の改行をレコードの区切りとして扱い、欄に CR を残さない", () => {
    expect(parseCsv("a,b\r\n1,2\r\n3,4\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
      ["3", "4"],
    ]);
  });

  it("CRLF のファイルで、引用符で囲まれた欄の中の改行はそのまま保つ", () => {
    expect(parseCsv('a,b\r\n"前半\r\n後半",2\r\n')).toEqual([
      ["a", "b"],
      ["前半\r\n後半", "2"],
    ]);
  });

  it("空行は飛ばす", () => {
    expect(parseCsv("a,b\n\n1,2\n   \n3,4\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
      ["3", "4"],
    ]);
  });

  it("末尾の空欄を保つ", () => {
    expect(parseCsv("a,b,c\n1,,")).toEqual([
      ["a", "b", "c"],
      ["1", "", ""],
    ]);
  });
});
