import { ResponseError } from '../config/response-error';
import { config } from '../config/environment';
import settingMemberRepository from '../repository/setting-member.repository';
import membershipDuesRepository from '../repository/membership-dues.repository';
import cashBalanceRepository from '../repository/cash-balance.repository';
import { MembershipDues } from '@prisma/client';
import prisma from '../config/database';
import { PayDuesRequest } from '../model/membership-dues.model';
import { FINANCE_CONSTANTS } from '../constants/finance.constant';
import { deleteFile } from '../utils/file.util';

class MembershipDuesService {
  async updateStatus(payload: PayDuesRequest, userId: number) {
    const { member_id, period_year, period_month, status } = payload;

    return prisma.$transaction(async (tx) => {
      const existing = await membershipDuesRepository.findOne(member_id, period_year, period_month);

      if (status === 'paid') {
        if (existing) {
          // If already paid, throw error
          throw new ResponseError(400, 'Membership dues for this period is already paid');
        }

        const duesAmount = FINANCE_CONSTANTS.DEFAULT_IURAN_AMOUNT;
        const autoNote = `Membership Dues Payment - Member ${member_id} - ${period_month}/${period_year}`;

        await membershipDuesRepository.createWithTx(tx, {
          member_id,
          period_year,
          period_month,
          amount: duesAmount,
          paid_at: new Date(),
          proof_file_path: null, // No proof file for direct payment
          note: autoNote,
          created_by: userId,
        });

        await cashBalanceRepository.updateBalanceWithTx(tx, {
          status: true,
          value: Number(duesAmount),
          description: autoNote,
        }, userId);

        return { message: 'Membership dues marked as paid', amount: duesAmount };
      } else {
        // status === 'unpaid'
        if (!existing) {
          throw new ResponseError(404, 'Membership dues record not found');
        }

        // Delete existing proof file if exists
        if (existing.proof_file_path) {
          deleteFile(existing.proof_file_path);
        }

        await membershipDuesRepository.deleteWithTx(tx, existing.id);
        
        const duesAmount = FINANCE_CONSTANTS.DEFAULT_IURAN_AMOUNT;
        const autoNote = `Membership Dues Reversal - Member ${member_id} - ${period_month}/${period_year}`;

        await cashBalanceRepository.updateBalanceWithTx(tx, {
          status: false,
          value: Number(duesAmount),
          description: autoNote,
        }, userId);

        return { message: 'Membership dues marked as unpaid', amount: -duesAmount };
      }
    });
  }

  async updateProofById(id: number, status_file: number, file_path: string | undefined, userId: number) {
    return prisma.$transaction(async (tx) => {
      const existing = await membershipDuesRepository.findById(id);
      if (!existing) {
        throw new ResponseError(404, 'Membership dues record not found');
      }

      if (status_file === 0) {
        return { message: 'No file changes', path: existing.proof_file_path ?? null };
      }

      if (status_file === 1) {
        if (existing.proof_file_path) {
          deleteFile(existing.proof_file_path);
        }

        await membershipDuesRepository.updateWithTx(tx, existing.id, {
          proof_file_path: file_path ?? null,
          updated_by: userId,
        });

        return { message: file_path ? 'Proof file updated' : 'Proof file deleted', path: file_path ?? null };
      }

      throw new ResponseError(400, 'Invalid status_file');
    });
  }

  async getList(params: {
    page?: number;
    limit?: number;
    period_year: number;
    search?: string;
    token?: string;
    cursor?: number;
  }) {
    const { page = 1, limit = 10, period_year, search, token, cursor } = params;

    // 1. Fetch members from external service
    // If cursor is provided, or it's intended to use load-more endpoint (which is preferred for ID desc sorting)
    // We will use the new load-more endpoint if possible.
    // However, to maintain backward compatibility or if specific pagination object is needed, we need to decide.
    // The user request implies replacing/using the new service for this.
    // The load-more service returns ordered by ID desc, which matches our requirement.
    
    let members;
    let meta: { nextCursor: number | null; hasMore: boolean; limit: number; totalItems?: number; totalPages?: number; currentPage?: number } | undefined;
    let paginationLegacy;

    // Logic to choose between cursor-based or legacy pagination
    // The user wants to prioritize the load-more endpoint (cursor-based) over the legacy list endpoint.
    // However, if specific legacy page > 1 is requested without cursor, we might still need legacy.
    // BUT, if page=1 (default) and no cursor, we should prefer the new endpoint.
    
    // If cursor is provided OR (page is 1/undefined AND cursor is undefined), use Load More.
    // Only use legacy list if page > 1 AND cursor is undefined.
    const useCursorPagination = cursor !== undefined || (page === 1 && cursor === undefined);

    if (useCursorPagination) { 
        const result = await settingMemberRepository.getMembersLoadMore({
            limit,
            ...(search ? { search } : {}),
            ...(cursor !== undefined ? { cursor } : {}),
            ...(token ? { token } : {})
        });
        members = result.data;
        meta = result.meta;
    } else {
        // Fallback to old list method if needed (though user wants to use the new service)
        const result = await settingMemberRepository.getMembersList({
          page,
          per_page: limit,
          ...(search ? { search } : {}),
          ...(token ? { token } : {}),
          order_field: 'id',
          order_dir: 'desc',
        });
        members = result.data;
        paginationLegacy = result.pagination;
    }

    // Map legacy pagination to meta if meta is missing
    if (!meta && paginationLegacy) {
        meta = {
            nextCursor: null,
            hasMore: paginationLegacy.currentPage < paginationLegacy.totalPages,
            limit: paginationLegacy.itemsPerPage,
            totalItems: paginationLegacy.totalItems,
            totalPages: paginationLegacy.totalPages,
            currentPage: paginationLegacy.currentPage
        };
    }

    if (!members || members.length === 0) {
      return {
        items: [],
        meta: meta || {
            nextCursor: null,
            hasMore: false,
            limit
        },
        ...(paginationLegacy ? { pagination: paginationLegacy } : {})
      };
    }

    const memberIds = members.map((m) => m.id);

    // 2. Fetch dues for these members and the specific year
    const dues = await membershipDuesRepository.findByMemberIdsAndYear(memberIds, period_year);

    // 3. Map dues to members
    const duesMap = new Map<number, Map<number, MembershipDues>>();

    dues.forEach((d) => {
      if (!duesMap.has(d.member_id)) {
        duesMap.set(d.member_id, new Map());
      }
      duesMap.get(d.member_id)?.set(d.period_month, d);
    });

    // 4. Construct enriched response
    const items = members.map((member) => {
      const memberDuesMap = duesMap.get(member.id);
      const months = [];
      for (let m = 1; m <= 12; m++) {
        const d = memberDuesMap?.get(m);
        
        // If data exists in DB, it means it's paid
        const isPaid = !!d;
        const status = isPaid ? 'paid' : 'unpaid';

        months.push({
          month: m,
          status: status,
          amount: (isPaid && d) ? Number(d.amount) : 0,
          id: d ? d.id : null,
        });
      }

      return {
        member: {
          id: member.id,
          name: member.name,
          photo: member.photo,
        },
        months: months,
      };
    });

    return {
      items,
      meta: meta || {
          nextCursor: null,
          hasMore: false,
          limit
      },
      // Include legacy pagination if available, though meta is preferred now
      ...(paginationLegacy ? { pagination: paginationLegacy } : {})
    };
  }

  async getDetailById(id: number, token?: string) {
    const existing = await membershipDuesRepository.findById(id);
    if (!existing) {
      throw new ResponseError(404, 'Membership dues record not found');
    }

    const member = await settingMemberRepository.getMemberById(existing.member_id, token);
    if (!member) {
      throw new ResponseError(404, 'Member not found for this membership dues');
    }

    const dueDate = new Date(existing.period_year, existing.period_month - 1, 1).toISOString();
    const proofPublicUrl = existing.proof_file_path
      ? (existing.proof_file_path.startsWith('http')
          ? existing.proof_file_path
          : (() => {
              const p = String(existing.proof_file_path).replace(/\\/g, '/');
              const idx = p.indexOf('/storage/');
              const tail = idx >= 0 ? p.substring(idx + 1) : (p.startsWith('storage/') ? p : null);
              return tail ? `${config.APP_URL}/${tail.replace(/^\//,'')}` : null;
            })()
        )
      : null;

    return {
      success: true,
      data: {
        membership_dues: {
          id: existing.id,
          member_id: existing.member_id,
          amount: Number(existing.amount),
          status: 'paid',
          due_date: dueDate,
          created_at: existing.created_at.toISOString(),
          updated_at: existing.updated_at.toISOString(),
          ...(proofPublicUrl ? { proof_file_path: proofPublicUrl } : {}),
        },
        member: {
          id: member.id,
          name: member.name,
          username: member.username,
          gender: member.gender,
          birthdate: member.birthdate,
          address: member.address,
          phone: member.phone,
          photo: member.photo,
          active: member.active,
        },
      },
      message: 'Membership dues detail retrieved successfully',
    };
  }
}

export default new MembershipDuesService();
