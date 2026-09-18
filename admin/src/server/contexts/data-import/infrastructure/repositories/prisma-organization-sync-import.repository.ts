import "server-only";

import type { DonorType, Prisma, PrismaClient, TransactionType } from "@prisma/client";
import type {
  SyncExportCounterpart,
  SyncExportDonor,
  SyncExportTransaction,
} from "@/server/contexts/shared/domain/models/organization-sync-export";
import {
  collectDistinctCounterpartsAndDonors,
  serializeCounterpartKey,
  serializeDonorKey,
  SyncImportOrganizationNotFoundError,
  type SyncImportCounterpartKey,
  type SyncImportDonorKey,
  toCounterpartKey,
  toDonorKey,
} from "@/server/contexts/data-import/domain/models/organization-sync-import";
import type {
  IOrganizationSyncImportRepository,
  ReplaceOrganizationSyncDataInput,
  ReplaceOrganizationSyncDataResult,
  SyncImportTargetOrganization,
} from "@/server/contexts/data-import/domain/repositories/organization-sync-import-repository.interface";

/** Prisma のクライアント（トランザクション中とそれ以外のどちらでも同じ読み出しを使う）。 */
type ReadClient = Prisma.TransactionClient | PrismaClient;

/**
 * 1 文あたり PostgreSQL のバインド変数上限（65535）を超えないための分割サイズ。
 * 最も列数の多い取引（20 列超）に合わせて小さめに取る。
 */
const INSERT_CHUNK_SIZE = 1000;
/** `name IN (...)` で引くときの分割サイズ。 */
const LOOKUP_CHUNK_SIZE = 5000;

/** 団体まるごとの置き換えは既定の 5 秒では終わらないので、余裕を持たせる。 */
const REPLACE_TRANSACTION_TIMEOUT_MS = 300_000;
const REPLACE_TRANSACTION_MAX_WAIT_MS = 15_000;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

/** `@db.Date` のカラムは UTC 0 時の Date として扱う（書き出し側と対称）。 */
function toDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

/**
 * 直前に自分で作った ID 対応表を引く。引けないのは実装の不整合なので、
 * 中途半端な紐づけを入れずにトランザクションごと失敗させる。
 */
function resolveId<T>(idByKey: Map<string, T>, key: string, label: string): T {
  const id = idByKey.get(key);
  if (id === undefined) {
    throw new Error(`同期データの取り込み中に ${label} の ID を解決できませんでした`);
  }
  return id;
}

function toTransactionCreateInput(
  transaction: SyncExportTransaction,
  politicalOrganizationId: bigint,
): Prisma.TransactionCreateManyInput {
  return {
    politicalOrganizationId,
    transactionNo: transaction.transactionNo,
    transactionDate: toDateOnly(transaction.transactionDate),
    financialYear: transaction.financialYear,
    // パーサーが現在の enum の値であることを検証済み。
    transactionType: transaction.transactionType as TransactionType,
    debitAccount: transaction.debitAccount,
    debitSubAccount: transaction.debitSubAccount,
    debitDepartment: transaction.debitDepartment,
    debitPartner: transaction.debitPartner,
    debitTaxCategory: transaction.debitTaxCategory,
    debitAmount: transaction.debitAmount,
    creditAccount: transaction.creditAccount,
    creditSubAccount: transaction.creditSubAccount,
    creditDepartment: transaction.creditDepartment,
    creditPartner: transaction.creditPartner,
    creditTaxCategory: transaction.creditTaxCategory,
    creditAmount: transaction.creditAmount,
    description: transaction.description,
    memo: transaction.memo,
    friendlyCategory: transaction.friendlyCategory,
    categoryKey: transaction.categoryKey,
    label: transaction.label,
    hash: transaction.hash,
    isGrantExpenditure: transaction.isGrantExpenditure,
    createdAt: new Date(transaction.createdAt),
    updatedAt: new Date(transaction.updatedAt),
  };
}

export class PrismaOrganizationSyncImportRepository implements IOrganizationSyncImportRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findOrganizationBySlug(slug: string): Promise<SyncImportTargetOrganization | null> {
    const organization = await this.prisma.politicalOrganization.findUnique({
      where: { slug },
      select: { id: true, displayName: true },
    });

    if (!organization) return null;

    return { id: organization.id.toString(), displayName: organization.displayName };
  }

  async countTransactions(politicalOrganizationId: string): Promise<number> {
    return this.prisma.transaction.count({
      where: { politicalOrganizationId: BigInt(politicalOrganizationId) },
    });
  }

  async countBalanceSnapshots(politicalOrganizationId: string): Promise<number> {
    return this.prisma.balanceSnapshot.count({
      where: { politicalOrganizationId: BigInt(politicalOrganizationId) },
    });
  }

  async findExistingCounterpartKeys(
    keys: SyncImportCounterpartKey[],
  ): Promise<SyncImportCounterpartKey[]> {
    const existing = await findCounterpartIdsByKey(this.prisma, keys);
    return keys.filter((key) => existing.has(serializeCounterpartKey(key)));
  }

  async findExistingDonorKeys(keys: SyncImportDonorKey[]): Promise<SyncImportDonorKey[]> {
    const existing = await findDonorIdsByKey(this.prisma, keys);
    return keys.filter((key) => existing.has(serializeDonorKey(key)));
  }

  async replaceOrganizationSyncData(
    input: ReplaceOrganizationSyncDataInput,
  ): Promise<ReplaceOrganizationSyncDataResult> {
    const { file } = input;
    const politicalOrganizationId = BigInt(input.politicalOrganizationId);

    return this.prisma.$transaction(
      async (tx) => {
        const organization = await tx.politicalOrganization.findUnique({
          where: { id: politicalOrganizationId },
          select: { tenantId: true },
        });

        if (!organization) {
          throw new SyncImportOrganizationNotFoundError(
            `Political organization not found: ${input.politicalOrganizationId}`,
          );
        }

        // 1. 既存の取引と残高を消す。取引の紐づけ（transaction_counterparts /
        //    transaction_donors）は onDelete: Cascade で一緒に消える。
        const { count: deletedTransactionCount } = await tx.transaction.deleteMany({
          where: { politicalOrganizationId },
        });
        await tx.balanceSnapshot.deleteMany({ where: { politicalOrganizationId } });

        // 2. 取引先・寄付者は他団体と共有されうるので消さない。
        //    自然キーで既存を再利用し、無いものだけ、この団体のテナントを付けて作る。
        const { counterparts, donors } = collectDistinctCounterpartsAndDonors(file);
        const counterpartResult = await ensureCounterparts(tx, counterparts, organization.tenantId);
        const donorResult = await ensureDonors(tx, donors, organization.tenantId);

        // 3. 取引を入れる。紐づけの INSERT には transactions の category_key を見る
        //    DB トリガーがあるため、必ず取引を先に入れる。
        for (const transactionChunk of chunk(file.transactions, INSERT_CHUNK_SIZE)) {
          await tx.transaction.createMany({
            data: transactionChunk.map((transaction) =>
              toTransactionCreateInput(transaction, politicalOrganizationId),
            ),
          });
        }

        // createMany は ID を返さないので、自然キー (団体, transaction_no) で引き直す。
        const insertedTransactions = await tx.transaction.findMany({
          where: { politicalOrganizationId },
          select: { id: true, transactionNo: true },
        });
        const transactionIdByNo = new Map(
          insertedTransactions.map((transaction) => [transaction.transactionNo, transaction.id]),
        );

        // 4. 取引先・寄付者の紐づけを入れる。
        const counterpartLinks = file.transactions.flatMap((transaction) =>
          transaction.counterpart
            ? [
                {
                  transactionId: resolveId(
                    transactionIdByNo,
                    transaction.transactionNo,
                    `取引 ${transaction.transactionNo}`,
                  ),
                  counterpartId: resolveId(
                    counterpartResult.idByKey,
                    serializeCounterpartKey(toCounterpartKey(transaction.counterpart)),
                    `取引 ${transaction.transactionNo} の取引先`,
                  ),
                },
              ]
            : [],
        );
        for (const linkChunk of chunk(counterpartLinks, INSERT_CHUNK_SIZE)) {
          await tx.transactionCounterpart.createMany({ data: linkChunk });
        }

        const donorLinks = file.transactions.flatMap((transaction) =>
          transaction.donor
            ? [
                {
                  transactionId: resolveId(
                    transactionIdByNo,
                    transaction.transactionNo,
                    `取引 ${transaction.transactionNo}`,
                  ),
                  donorId: resolveId(
                    donorResult.idByKey,
                    serializeDonorKey(toDonorKey(transaction.donor)),
                    `取引 ${transaction.transactionNo} の寄付者`,
                  ),
                },
              ]
            : [],
        );
        for (const linkChunk of chunk(donorLinks, INSERT_CHUNK_SIZE)) {
          await tx.transactionDonor.createMany({ data: linkChunk });
        }

        // 5. 残高を入れ直す。
        for (const snapshotChunk of chunk(file.balanceSnapshots, INSERT_CHUNK_SIZE)) {
          await tx.balanceSnapshot.createMany({
            data: snapshotChunk.map((snapshot) => ({
              politicalOrganizationId,
              snapshotDate: toDateOnly(snapshot.snapshotDate),
              balance: snapshot.balance,
              createdAt: new Date(snapshot.createdAt),
              updatedAt: new Date(snapshot.updatedAt),
            })),
          });
        }

        // 6. 報告書プロフィールは団体 × 年度で上書きする
        //    （ファイルに無い年度はこの環境の内容を残す）。
        for (const profile of file.organizationReportProfiles) {
          const values = {
            officialName: profile.officialName,
            officialNameKana: profile.officialNameKana,
            officeAddress: profile.officeAddress,
            officeAddressBuilding: profile.officeAddressBuilding,
            details: profile.details as Prisma.InputJsonValue,
            updatedAt: new Date(profile.updatedAt),
          };

          await tx.organizationReportProfile.upsert({
            where: {
              politicalOrganizationId_financialYear: {
                politicalOrganizationId,
                financialYear: profile.financialYear,
              },
            },
            create: {
              politicalOrganizationId,
              financialYear: profile.financialYear,
              createdAt: new Date(profile.createdAt),
              ...values,
            },
            update: values,
          });
        }

        return {
          deletedTransactionCount,
          importedTransactionCount: file.transactions.length,
          createdCounterpartCount: counterpartResult.createdCount,
          createdDonorCount: donorResult.createdCount,
          importedBalanceSnapshotCount: file.balanceSnapshots.length,
          upsertedReportProfileCount: file.organizationReportProfiles.length,
        };
      },
      {
        timeout: REPLACE_TRANSACTION_TIMEOUT_MS,
        maxWait: REPLACE_TRANSACTION_MAX_WAIT_MS,
      },
    );
  }
}

/**
 * 取引先の一意制約 (name, address) はテナントをまたぐグローバル制約なので、
 * 照合はテナントを見ずに行う。`name IN (...)` で絞ってから address まで含めて突き合わせる。
 */
async function findCounterpartIdsByKey(
  client: ReadClient,
  keys: SyncImportCounterpartKey[],
): Promise<Map<string, bigint>> {
  const idByKey = new Map<string, bigint>();
  const names = [...new Set(keys.map((key) => key.name))];

  for (const nameChunk of chunk(names, LOOKUP_CHUNK_SIZE)) {
    const rows = await client.counterpart.findMany({
      where: { name: { in: nameChunk } },
      select: { id: true, name: true, address: true },
    });
    for (const row of rows) {
      idByKey.set(serializeCounterpartKey({ name: row.name, address: row.address }), row.id);
    }
  }

  return idByKey;
}

/** 寄付者の一意制約 (name, address, donor_type) も同様にグローバル制約。 */
async function findDonorIdsByKey(
  client: ReadClient,
  keys: SyncImportDonorKey[],
): Promise<Map<string, bigint>> {
  const idByKey = new Map<string, bigint>();
  const names = [...new Set(keys.map((key) => key.name))];

  for (const nameChunk of chunk(names, LOOKUP_CHUNK_SIZE)) {
    const rows = await client.donor.findMany({
      where: { name: { in: nameChunk } },
      select: { id: true, name: true, address: true, donorType: true },
    });
    for (const row of rows) {
      idByKey.set(
        serializeDonorKey({ donorType: row.donorType, name: row.name, address: row.address }),
        row.id,
      );
    }
  }

  return idByKey;
}

interface EnsureResult {
  idByKey: Map<string, bigint>;
  createdCount: number;
}

/**
 * ファイルの取引先を自然キーで引き当て、無いものだけ作って ID 対応表を返す。
 * 既存の取引先は他団体でも使われているので、郵便番号などの属性は書き換えない。
 */
async function ensureCounterparts(
  tx: Prisma.TransactionClient,
  counterparts: SyncExportCounterpart[],
  tenantId: bigint | null,
): Promise<EnsureResult> {
  const idByKey = await findCounterpartIdsByKey(tx, counterparts.map(toCounterpartKey));
  const missing = counterparts.filter(
    (counterpart) => !idByKey.has(serializeCounterpartKey(toCounterpartKey(counterpart))),
  );

  for (const missingChunk of chunk(missing, INSERT_CHUNK_SIZE)) {
    await tx.counterpart.createMany({
      data: missingChunk.map((counterpart) => ({
        name: counterpart.name,
        postalCode: counterpart.postalCode,
        address: counterpart.address,
        tenantId,
      })),
    });
  }

  if (missing.length > 0) {
    const created = await findCounterpartIdsByKey(tx, missing.map(toCounterpartKey));
    for (const [key, id] of created) idByKey.set(key, id);
  }

  return { idByKey, createdCount: missing.length };
}

/** 寄付者も同じく、自然キーで既存を再利用し、無いものだけ作る。 */
async function ensureDonors(
  tx: Prisma.TransactionClient,
  donors: SyncExportDonor[],
  tenantId: bigint | null,
): Promise<EnsureResult> {
  const idByKey = await findDonorIdsByKey(tx, donors.map(toDonorKey));
  const missing = donors.filter((donor) => !idByKey.has(serializeDonorKey(toDonorKey(donor))));

  for (const missingChunk of chunk(missing, INSERT_CHUNK_SIZE)) {
    await tx.donor.createMany({
      data: missingChunk.map((donor) => ({
        // パーサーが現在の enum の値であることを検証済み。
        donorType: donor.donorType as DonorType,
        name: donor.name,
        address: donor.address,
        occupation: donor.occupation,
        tenantId,
      })),
    });
  }

  if (missing.length > 0) {
    const created = await findDonorIdsByKey(tx, missing.map(toDonorKey));
    for (const [key, id] of created) idByKey.set(key, id);
  }

  return { idByKey, createdCount: missing.length };
}
