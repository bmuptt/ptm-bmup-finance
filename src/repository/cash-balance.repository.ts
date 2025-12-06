import { Prisma } from '@prisma/client';
import prisma from '../config/database';
import { CashBalanceRepositoryInterface } from './contracts/cash-balance.repository.interface';
import { UpdateCashBalanceRequest } from '../model';

// Derive the correct transaction client type from the extended Prisma client
type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

class CashBalanceRepository implements CashBalanceRepositoryInterface {
  async getCurrentBalance(): Promise<number> {
    const record = await prisma.cashBalance.findFirst();

    if (!record) {
      return 0;
    }

    return Number(record.balance);
  }

  async updateBalance(
    payload: UpdateCashBalanceRequest,
    userId: number,
  ): Promise<number> {
    return prisma.$transaction<number>(async (tx: TxClient) => {
      return this.updateBalanceWithTx(tx, payload, userId);
    });
  }

  async updateBalanceWithTx(
    tx: TxClient,
    payload: UpdateCashBalanceRequest,
    userId: number,
  ): Promise<number> {
    const { status, value, description } = payload;

    const delta = status ? value : -value;

    // Lock table to prevent concurrent writers from causing race conditions,
    // especially when the first row is being created.
    await tx.$executeRawUnsafe('LOCK TABLE "cash_balance" IN EXCLUSIVE MODE');

    // Try atomic update first using database arithmetic
    const updatedRows = await tx.$queryRaw<
      Array<{ balance: unknown }>
    >`UPDATE "cash_balance" SET "balance" = "balance" + ${delta} RETURNING "balance"`;

    let resultingBalance: number;

    if (updatedRows.length > 0) {
      const row = updatedRows[0];
      if (row == null || row.balance == null) {
        throw new Error('Failed to update cash balance.');
      }
      resultingBalance = Number(row.balance);
    } else {
      // No existing row yet, insert initial balance
      const insertedRows = await tx.$queryRaw<
        Array<{ balance: unknown }>
      >`INSERT INTO "cash_balance" ("balance") VALUES (${delta}) RETURNING "balance"`;

      const row = insertedRows[0];
      if (row == null || row.balance == null) {
        throw new Error('Failed to insert cash balance.');
      }

      resultingBalance = Number(row.balance);
    }

    await tx.historyBalance.create({
      data: {
        status,
        value,
        description,
        created_by: userId,
      },
    });

    return resultingBalance;
  }

  async getHistoryBalance(params: {
    cursor?: number;
    limit: number;
  }): Promise<{
    items: {
      id: number;
      status: boolean;
      value: number;
      description: string;
      created_by: number;
      created_at: string;
    }[];
    nextCursor: number | null;
    hasMore: boolean;
  }> {
    const { cursor, limit } = params;

    const args: Prisma.HistoryBalanceFindManyArgs = {
      orderBy: {
        id: 'desc',
      },
      take: limit + 1,
    };

    if (cursor !== undefined) {
      const whereClause: Prisma.HistoryBalanceWhereInput = {
        id: {
          lt: cursor,
        },
      };
      args.where = whereClause;
    }

    const records = await prisma.historyBalance.findMany(args);

    const hasMore = records.length > limit;
    const itemsSlice = hasMore ? records.slice(0, limit) : records;

    const items = itemsSlice.map((record) => ({
      id: record.id,
      status: record.status,
      value: Number(record.value),
      description: record.description,
      created_by: record.created_by,
      created_at: record.created_at.toISOString(),
    }));

    let nextCursor: number | null = null;

    if (hasMore) {
      const lastItem = items[items.length - 1];
      if (lastItem) {
        nextCursor = lastItem.id;
      }
    }

    return {
      items,
      nextCursor,
      hasMore,
    };
  }
}

export default new CashBalanceRepository();
