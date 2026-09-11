import "server-only";
import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  PublishedAccount,
  PublishedExpenditureGroup,
  PublishedExpense,
  PublishedPartyResearchFund,
  PublishedPoliticianResearchFund,
  PublishedResearchFund,
  PublishedResearchFundPageRef,
} from "@/server/contexts/research-fund/domain/models/published-research-fund";
import type { ResearchFundPoliticianSource } from "@/server/contexts/research-fund/domain/models/research-fund-politician-list";
import type { ResearchFundRepository } from "@/server/contexts/research-fund/domain/repositories/research-fund-repository.interface";
import type { ResearchFundRow } from "@/shared/research-fund/aggregation";

/**
 * 公開ページに出す仕訳の取り出し方。
 *
 * 備考（memo）は公開されない事務所内メモなので、select に含めない
 * （サーバー側にすら読み出さないことで、取り違えて出力する余地を無くす）。
 */
const entrySelect = {
  id: true,
  entryDate: true,
  description: true,
  note: true,
  splitGroup: true,
  documentId: true,
  lines: {
    select: {
      id: true,
      side: true,
      accountKey: true,
      amount: true,
      account: {
        select: { type: true, label: true, legalLabel: true, legalCategoryKey: true },
      },
    },
    orderBy: { id: "asc" as const },
  },
} satisfies Prisma.ResearchFundJournalEntrySelect;

/**
 * 政党ページ A-6 は横棒グラフと KPI しか描かないので、明細（項目名・特記事項・領収書）は取らない。
 * 議員が増えるほど行数が効くため、必要な列だけに絞る。
 */
const summaryEntrySelect = {
  entryDate: true,
  lines: {
    select: {
      side: true,
      accountKey: true,
      amount: true,
      account: {
        select: { type: true, label: true, legalLabel: true, legalCategoryKey: true },
      },
    },
  },
} satisfies Prisma.ResearchFundJournalEntrySelect;

type SummaryLine = Prisma.ResearchFundJournalEntryGetPayload<{
  select: typeof summaryEntrySelect;
}>["lines"][number];

/** 公開の集計に使うのは「借方の費用」と「貸方の調査研究費収入」だけ。相手勘定の普通預金は数えない。 */
const isExpenseLine = <T extends SummaryLine>(line: T) =>
  line.side === "debit" && line.account.type === "expense";
const isGrantLine = <T extends SummaryLine>(line: T) =>
  line.side === "credit" && line.accountKey === "grant-income";

function dateOf(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export class PrismaResearchFundRepository implements ResearchFundRepository {
  constructor(private prisma: PrismaClient) {}

  async findPublished(slug: string, financialYear: number): Promise<PublishedResearchFund | null> {
    const book = await this.prisma.researchFundBook.findFirst({
      where: { financialYear, politician: { slug } },
      select: {
        financialYear: true,
        publishedThrough: true,
        asOfDate: true,
        nextUpdateNote: true,
        policyComment: true,
        details: true,
        politician: { select: { name: true, slug: true } },
        journalEntries: {
          where: { status: "published" },
          select: entrySelect,
          orderBy: [{ entryDate: "desc" }, { id: "asc" }],
        },
        expenditureGroups: {
          orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
          select: {
            id: true,
            title: true,
            description: true,
            outcomes: {
              orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
              select: { label: true, url: true },
            },
            items: {
              // 未公開の仕訳を成果カードの集計に混ぜない。
              where: { entry: { status: "published" } },
              select: { entry: { select: entrySelect } },
            },
          },
        },
      },
    });
    if (!book) return null;

    const rows: ResearchFundRow[] = [];
    const expenses: PublishedExpense[] = [];
    const accounts: Record<string, PublishedAccount> = {};

    for (const entry of book.journalEntries) {
      const date = dateOf(entry.entryDate);
      for (const line of entry.lines) {
        if (isGrantLine(line)) {
          rows.push({
            date,
            accountKey: line.accountKey,
            amount: line.amount.toNumber(),
            type: "grant",
          });
          continue;
        }
        if (!isExpenseLine(line)) continue;
        accounts[line.accountKey] = accountOf(line);
        rows.push({
          date,
          accountKey: line.accountKey,
          amount: line.amount.toNumber(),
          type: "expense",
        });
        expenses.push({
          id: String(line.id),
          entryId: String(entry.id),
          date,
          accountKey: line.accountKey,
          description: entry.description,
          amount: line.amount.toNumber(),
          note: entry.note,
          splitGroup: entry.splitGroup,
          hasReceipt: entry.documentId !== null,
        });
      }
    }

    const groups: PublishedExpenditureGroup[] = book.expenditureGroups.map((group) => ({
      id: String(group.id),
      title: group.title,
      description: group.description,
      outcomes: group.outcomes.map((outcome) => ({ label: outcome.label, url: outcome.url })),
      entries: group.items.flatMap(({ entry }) =>
        entry.lines.filter(isExpenseLine).map((line) => {
          accounts[line.accountKey] = accountOf(line);
          return {
            entryDate: dateOf(entry.entryDate),
            amount: line.amount.toNumber(),
            accountKey: line.accountKey,
          };
        }),
      ),
    }));

    return {
      politician: book.politician,
      financialYear: book.financialYear,
      asOfDate: book.asOfDate ? dateOf(book.asOfDate) : null,
      nextUpdateNote: book.nextUpdateNote,
      policyComment: book.policyComment,
      details: book.details,
      publishedThrough: book.publishedThrough ? dateOf(book.publishedThrough) : null,
      rows,
      accounts,
      expenses,
      groups,
    };
  }

  async findPublishedByOrganization(
    slug: string,
    financialYear: number,
  ): Promise<PublishedPartyResearchFund | null> {
    const organization = await this.prisma.politicalOrganization.findUnique({
      where: { slug },
      select: {
        slug: true,
        displayName: true,
        politicianMemberships: {
          // 現在所属している議員だけを出す（ended_on が入っていれば離党・任期満了）。
          where: { endedOn: null },
          orderBy: [{ politician: { displayOrder: "asc" } }, { politicianId: "asc" }],
          select: {
            politician: {
              select: {
                name: true,
                slug: true,
                books: {
                  where: { financialYear },
                  select: {
                    asOfDate: true,
                    publishedThrough: true,
                    journalEntries: {
                      where: { status: "published" },
                      select: summaryEntrySelect,
                      orderBy: [{ entryDate: "asc" }, { id: "asc" }],
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!organization || organization.politicianMemberships.length === 0) return null;

    const politicians: PublishedPoliticianResearchFund[] = organization.politicianMemberships.map(
      ({ politician }) => {
        const book = politician.books[0];
        const rows: ResearchFundRow[] = [];
        const accounts: Record<string, PublishedAccount> = {};
        let expenseCount = 0;

        for (const entry of book?.journalEntries ?? []) {
          const date = dateOf(entry.entryDate);
          for (const line of entry.lines) {
            if (isGrantLine(line)) {
              rows.push({
                date,
                accountKey: line.accountKey,
                amount: line.amount.toNumber(),
                type: "grant",
              });
              continue;
            }
            if (!isExpenseLine(line)) continue;
            accounts[line.accountKey] = accountOf(line);
            rows.push({
              date,
              accountKey: line.accountKey,
              amount: line.amount.toNumber(),
              type: "expense",
            });
            expenseCount += 1;
          }
        }

        return {
          politician: { name: politician.name, slug: politician.slug },
          asOfDate: book?.asOfDate ? dateOf(book.asOfDate) : null,
          publishedThrough: book?.publishedThrough ? dateOf(book.publishedThrough) : null,
          rows,
          accounts,
          expenseCount,
        };
      },
    );

    return {
      organization: { slug: organization.slug, displayName: organization.displayName },
      financialYear,
      politicians,
    };
  }

  async findPoliticians(financialYear: number): Promise<ResearchFundPoliticianSource[]> {
    const politicians = await this.prisma.politician.findMany({
      // 帳簿の無い議員はセレクタに出さない（開いても中身が無いため）。
      where: { books: { some: { financialYear } } },
      orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
      select: {
        name: true,
        slug: true,
        books: {
          where: { financialYear },
          select: {
            publishedThrough: true,
            journalEntries: {
              where: { status: "published" },
              select: { entryDate: true },
              orderBy: { entryDate: "asc" },
            },
          },
        },
      },
    });

    return politicians.map((politician) => {
      const book = politician.books[0];
      return {
        slug: politician.slug,
        name: politician.name,
        publishedMonths: (book?.journalEntries ?? []).map((entry) =>
          dateOf(entry.entryDate).slice(0, 7),
        ),
        publishedThrough: book?.publishedThrough ? dateOf(book.publishedThrough).slice(0, 7) : null,
      };
    });
  }

  async findPublishedPageRefs(): Promise<PublishedResearchFundPageRef[]> {
    // 公開する仕訳が 1 件も無い帳簿はページとして中身が無いので sitemap に載せない。
    const books = await this.prisma.researchFundBook.findMany({
      where: { journalEntries: { some: { status: "published" } } },
      select: { financialYear: true, politician: { select: { slug: true } } },
      orderBy: [{ politicianId: "asc" }, { financialYear: "asc" }],
    });

    return books.map((book) => ({
      slug: book.politician.slug,
      financialYear: book.financialYear,
    }));
  }

  async findPublishedReceipt(entryId: string) {
    const entry = await this.prisma.researchFundJournalEntry.findFirst({
      where: { id: BigInt(entryId), status: "published" },
      select: { document: { select: { storageKey: true } } },
    });
    return entry?.document ? { storageKey: entry.document.storageKey } : null;
  }
}

/**
 * 法定区分が未設定の科目（下書き用の「要確認」など）でも法律上の区分に切り替えられるよう、
 * 法定ラベルが空なら科目名で代用する。公開前に21分類へ直す運用なので通常は発生しない。
 */
function accountOf(line: SummaryLine): PublishedAccount {
  return {
    label: line.account.label,
    legalLabel: line.account.legalLabel || line.account.label,
    legalCategoryKey: line.account.legalCategoryKey ?? "",
  };
}
