import "server-only";
import { loadAdminTargets } from "@/server/contexts/shared/presentation/loaders/load-admin-targets";
import { ChangeTargetButton } from "@/client/components/layout/TargetSelector";
import { cn } from "@/client/lib";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PlusCircle } from "@phosphor-icons/react/dist/ssr";
import { PageHeader } from "@/client/components/layout/PageHeader";
import { Button, Card, CardContent } from "@/client/components/ui";
import { BookForm } from "@/client/components/books/BookForm";
import { loadPolitician } from "@/server/contexts/shared/presentation/loaders/load-politicians";
import { loadBooks } from "@/server/contexts/research-fund/presentation/loaders/load-books";

export default async function BooksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const politician = await loadPolitician(id);
  if (!politician) notFound();
  const [books, { currentTarget }] = await Promise.all([loadBooks(id), loadAdminTargets()]);
  return (
    <div>
      <PageHeader label="Books" title="年度帳簿" />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="font-bold">{politician.name}の帳簿一覧</h2>
        <ChangeTargetButton />
        <Link href="/politicians" className="text-sm text-primary-active underline">
          議員一覧へ
        </Link>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        累計は確認済み・公開済みの仕訳を集計しています。
      </p>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {books.map((book) => (
          <Card
            key={book.id}
            className={cn(currentTarget?.key === `book:${book.id}` && "border-ring bg-accent")}
          >
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <h3 className="font-latin text-xl font-bold">{book.financialYear}年度</h3>
                {currentTarget?.key === `book:${book.id}` && (
                  <span className="text-xs font-bold text-primary-active">現在の対象</span>
                )}
                {book.publishedThrough && (
                  <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
                    公開中
                  </span>
                )}
              </div>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">公開範囲</dt>
                  <dd>
                    {book.publishedThrough
                      ? `${book.publishedThrough.replaceAll("-", ".")}まで`
                      : "未公開"}
                  </dd>
                </div>
                {book.asOfDate && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">時点</dt>
                    <dd className="font-latin">{book.asOfDate.replaceAll("-", ".")}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">支給累計</dt>
                  <dd className="font-latin font-semibold">
                    ¥{book.granted.toLocaleString("ja-JP")}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">支出累計</dt>
                  <dd className="font-latin font-semibold">
                    ¥{book.spent.toLocaleString("ja-JP")}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">確認待ち</dt>
                  <dd className="font-bold text-destructive">{book.draftCount}件の下書き</dd>
                </div>
              </dl>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" asChild>
                  <Link href={`/politicians/${id}/books/${book.id}/scan`}>スキャンする</Link>
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/politicians/${id}/books/${book.id}/entries`}>仕訳を確認</Link>
                </Button>
              </div>
              <details className="border-t border-border-soft pt-4">
                <summary className="cursor-pointer text-sm font-bold">帳簿情報を編集</summary>
                <div className="pt-4">
                  <BookForm politicianId={id} book={book} />
                </div>
              </details>
            </CardContent>
          </Card>
        ))}
        <Card className="border-dashed border-disabled-border">
          <CardContent className="space-y-4">
            <h3 className="flex items-center gap-2 font-bold">
              <PlusCircle size={24} />
              新規作成
            </h3>
            <p className="text-sm text-muted-foreground">年度を指定して空の帳簿を作成します。</p>
            <BookForm
              politicianId={id}
              defaultYear={Math.min(
                9999,
                books.length ? books[0].financialYear + 1 : new Date().getFullYear(),
              )}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
