import { Book } from "@/server/contexts/research-fund/domain/models/book";

test.each(["1", "42", "9007199254740993"])("正の整数の文字列 %s は ID として受け付ける", (id) => {
  expect(Book.isValidId(id)).toBe(true);
});

test.each(["", "0", "-1", "01", "1.5", "abc", "1; drop"])("ID として不正な %s は受け付けない", (id) => {
  expect(Book.isValidId(id)).toBe(false);
});
