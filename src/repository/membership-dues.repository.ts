import prisma from '../config/database';
import { Prisma } from '@prisma/client';

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

class MembershipDuesRepository {
  async getList(params: {
    cursor?: number;
    limit: number;
    member_id?: number;
    period_year?: number;
    period_month?: number;
  }) {
    const { cursor, limit, member_id, period_year, period_month } = params;

    const where: Prisma.MembershipDuesWhereInput = {};

    if (member_id) where.member_id = member_id;
    if (period_year) where.period_year = period_year;
    if (period_month) where.period_month = period_month;

    const items = await prisma.membershipDues.findMany({
      take: limit + 1, // Fetch one extra to check if there are more items
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      where,
      orderBy: {
        id: 'desc',
      },
    });

    let has_more = false;
    let next_cursor: number | null = null;

    if (items.length > limit) {
      has_more = true;
      items.pop(); // Remove the extra item
    }

    if (has_more && items.length > 0) {
      const lastItem = items[items.length - 1];
      if (lastItem) {
        next_cursor = lastItem.id;
      }
    }

    return {
      items,
      next_cursor,
      has_more,
    };
  }

  async findByMemberIdsAndYear(memberIds: number[], period_year: number) {
    return prisma.membershipDues.findMany({
      where: {
        member_id: { in: memberIds },
        period_year,
      },
      orderBy: [
        { member_id: 'asc' },
        { period_month: 'asc' },
      ],
    });
  }

  async findOne(member_id: number, period_year: number, period_month: number) {
    return prisma.membershipDues.findUnique({
      where: {
        member_id_period_year_period_month: {
          member_id,
          period_year,
          period_month,
        },
      },
    });
  }

  async findById(id: number) {
    return prisma.membershipDues.findUnique({
      where: { id },
    });
  }

  async createWithTx(tx: TxClient, data: Prisma.MembershipDuesUncheckedCreateInput) {
    return tx.membershipDues.create({
      data,
    });
  }

  async updateWithTx(tx: TxClient, id: number, data: Prisma.MembershipDuesUncheckedUpdateInput) {
    return tx.membershipDues.update({
      where: { id },
      data,
    });
  }

  async deleteWithTx(tx: TxClient, id: number) {
    return tx.membershipDues.delete({
      where: { id },
    });
  }
}

export default new MembershipDuesRepository();
