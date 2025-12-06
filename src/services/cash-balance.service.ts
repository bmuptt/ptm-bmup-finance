import {
  CashBalanceResponse,
  HistoryBalanceListResponse,
  UpdateCashBalanceRequest,
  ExternalUserDetails,
} from '../model';
import cashBalanceRepository from '../repository/cash-balance.repository';
import externalUserRepository from '../repository/external-user.repository';

class CashBalanceService {
  async getCashBalance(): Promise<CashBalanceResponse> {
    const balance = await cashBalanceRepository.getCurrentBalance();

    return {
      balance,
    };
  }

  async updateCashBalance(
    payload: UpdateCashBalanceRequest,
    userId: number,
  ): Promise<CashBalanceResponse> {
    const balance = await cashBalanceRepository.updateBalance(payload, userId);

    return {
      balance,
    };
  }

  async getHistoryBalance(params: {
    cursor?: number | undefined;
    limit?: number | undefined;
    token?: string | undefined;
  }): Promise<HistoryBalanceListResponse> {
    const effectiveLimit = params.limit ?? 10;

    const result = await cashBalanceRepository.getHistoryBalance(
      params.cursor !== undefined
        ? {
            cursor: params.cursor,
            limit: effectiveLimit,
          }
        : {
            limit: effectiveLimit,
          },
    );

    // Enrich items with external user details for created_by
    const userIds = Array.from(new Set(result.items.map((it) => it.created_by)))
      .filter((id) => typeof id === 'number');

    let users: ExternalUserDetails[] = [];
    if (userIds.length > 0) {
      try {
        users = await externalUserRepository.getUsersByIds(userIds, params.token);
      } catch {
        // Per rules, avoid console logs; silently skip enrich if external fails
        users = [];
      }
    }

    const userMap = new Map<number, ExternalUserDetails>();
    users.forEach((u) => {
      if (typeof u.id === 'number') {
        userMap.set(u.id, u);
      }
    });

    const enrichedItems = result.items.map((item) => ({
      ...item,
      created_by_user: userMap.get(item.created_by) ?? null,
    }));

    return {
      items: enrichedItems,
      next_cursor: result.nextCursor,
      has_more: result.hasMore,
    };
  }
}

export default new CashBalanceService();
